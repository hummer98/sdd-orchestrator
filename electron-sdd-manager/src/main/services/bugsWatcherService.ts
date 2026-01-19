/**
 * BugsWatcherService
 * Watches .kiro/bugs directory for changes and notifies renderer
 * Requirements: 6.5
 *
 * Bug fix: bugs-tab-list-not-updating
 * Changed to watch .kiro/ parent directory to detect bugs/ directory creation
 * when it doesn't exist at watcher start time.
 */

import * as chokidar from 'chokidar';
import * as path from 'path';
import { logger } from './logger';
import type { BugsChangeEvent } from '../../renderer/types';
import type { BugWorktreeConfig } from '../../renderer/types/bugJson';

export type BugsChangeCallback = (event: BugsChangeEvent) => void;

/**
 * Service for watching .kiro/bugs directory changes
 */
export class BugsWatcherService {
  private watcher: chokidar.FSWatcher | null = null;
  private projectPath: string;
  private callbacks: BugsChangeCallback[] = [];
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private debounceMs = 300;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Check if a path is within bugs directory (main or worktree)
   * Supports:
   * - Main: .kiro/bugs/{bugName}/...
   * - Worktree: .kiro/worktrees/bugs/{bugName}/.kiro/bugs/{bugName}/...
   *
   * Requirements: 4.1 (bugs-worktree-directory-mode)
   */
  private isWithinBugsDir(filePath: string): boolean {
    // Check main bugs directory: .kiro/bugs/
    const mainBugsDir = path.join(this.projectPath, '.kiro', 'bugs');
    const mainRelative = path.relative(mainBugsDir, filePath);
    if (!mainRelative.startsWith('..')) {
      return true;
    }

    // Check worktree bugs directory: .kiro/worktrees/bugs/{bugName}/.kiro/bugs/{bugName}/
    const worktreeMatch = this.matchWorktreeBugsPath(filePath);
    return worktreeMatch !== null;
  }

  /**
   * Match worktree bugs path pattern
   * Pattern: .kiro/worktrees/bugs/{bugName}/.kiro/bugs/{bugName}/...
   *
   * @returns bugName if matched, null otherwise
   */
  private matchWorktreeBugsPath(filePath: string): string | null {
    const kiroDir = path.join(this.projectPath, '.kiro');
    const relativePath = path.relative(kiroDir, filePath);

    // Pattern: worktrees/bugs/{bugName}/.kiro/bugs/{bugName}/...
    const parts = relativePath.split(path.sep);
    // Minimum: worktrees/bugs/{bugName}/.kiro/bugs/{bugName} = 6 parts
    if (parts.length >= 6 &&
        parts[0] === 'worktrees' &&
        parts[1] === 'bugs' &&
        parts[3] === '.kiro' &&
        parts[4] === 'bugs' &&
        parts[2] === parts[5]) {
      return parts[2]; // bugName
    }
    return null;
  }

  /**
   * Extract bug name from file path
   * Supports:
   * - Main: .kiro/bugs/{bugName}/... -> bugName
   * - Worktree: .kiro/worktrees/bugs/{bugName}/.kiro/bugs/{bugName}/... -> bugName
   *
   * Requirements: 4.2 (bugs-worktree-directory-mode)
   */
  private extractBugName(filePath: string): string | undefined {
    // First, try worktree path pattern
    const worktreeBugName = this.matchWorktreeBugsPath(filePath);
    if (worktreeBugName) {
      return worktreeBugName;
    }

    // Fall back to main bugs directory
    const bugsDir = path.join(this.projectPath, '.kiro', 'bugs');
    const relativePath = path.relative(bugsDir, filePath);
    const parts = relativePath.split(path.sep);

    // First part should be the bug folder name
    if (parts.length > 0 && parts[0] !== '..' && parts[0] !== '.') {
      return parts[0];
    }
    return undefined;
  }

  /**
   * Start watching the bugs directory
   *
   * Bug fix: bugs-tab-list-not-updating
   * Watch .kiro/ parent directory instead of .kiro/bugs/ directly.
   * This allows detecting bugs/ directory creation when it doesn't exist initially.
   * Events are filtered to only process paths within .kiro/bugs/.
   */
  start(): void {
    if (this.watcher) {
      logger.warn('[BugsWatcherService] Watcher already running');
      return;
    }

    // Watch .kiro/ directory to detect bugs/ creation even if it doesn't exist
    const kiroDir = path.join(this.projectPath, '.kiro');
    const bugsDir = path.join(kiroDir, 'bugs');
    logger.info('[BugsWatcherService] Starting watcher', { kiroDir, bugsDir });

    this.watcher = chokidar.watch(kiroDir, {
      ignoreInitial: true,
      persistent: true,
      depth: 3, // .kiro/ -> bugs/ -> {bug-name}/ -> files (3 levels deep)
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100,
      },
      // Only watch bugs directory and its contents
      ignored: (filePath: string) => {
        // Don't ignore .kiro directory itself
        if (filePath === kiroDir) {
          return false;
        }
        // Don't ignore bugs directory or anything under it
        if (this.isWithinBugsDir(filePath)) {
          return false;
        }
        // Ignore everything else under .kiro (specs, steering, settings, etc.)
        return true;
      },
    });

    this.watcher
      .on('add', (filePath) => this.handleEvent('add', filePath))
      .on('change', (filePath) => this.handleEvent('change', filePath))
      .on('unlink', (filePath) => this.handleEvent('unlink', filePath))
      .on('addDir', (dirPath) => this.handleEvent('addDir', dirPath))
      .on('unlinkDir', (dirPath) => this.handleEvent('unlinkDir', dirPath))
      .on('error', (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('[BugsWatcherService] Watcher error', { error: message });
      })
      .on('ready', () => {
        logger.info('[BugsWatcherService] Watcher ready');
      });
  }

  /**
   * Handle file system events with debouncing
   *
   * Bug fix: bugs-tab-list-not-updating
   * Filter out events for paths outside .kiro/bugs/
   */
  private handleEvent(type: BugsChangeEvent['type'], filePath: string): void {
    // Filter: only process events within .kiro/bugs/
    if (!this.isWithinBugsDir(filePath)) {
      logger.debug('[BugsWatcherService] Ignoring event outside bugs dir', { type, filePath });
      return;
    }

    const bugName = this.extractBugName(filePath);

    logger.debug('[BugsWatcherService] File event', { type, filePath, bugName });

    // Debounce per file path to avoid dropping concurrent events for different files
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(filePath);
      const event: BugsChangeEvent = { type, path: filePath, bugName };
      this.callbacks.forEach((cb) => cb(event));
    }, this.debounceMs);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Register a callback for bug changes
   */
  onChange(callback: BugsChangeCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Remove all callbacks
   */
  clearCallbacks(): void {
    this.callbacks = [];
  }

  /**
   * Stop watching
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      logger.info('[BugsWatcherService] Stopping watcher');
      await this.watcher.close();
      this.watcher = null;
    }

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    this.callbacks = [];
  }

  /**
   * Check if watcher is running
   */
  isRunning(): boolean {
    return this.watcher !== null;
  }

  // ============================================================
  // bugs-worktree-support Task 14.1: worktreeモード時の監視パス切り替え
  // Requirements: 3.7
  // ============================================================

  /**
   * Get watch path for file monitoring
   * Returns the bugs directory path based on worktree configuration
   *
   * @param _bugId - Bug ID (not used currently but kept for interface compatibility)
   * @param worktreeConfig - Optional worktree configuration from bug.json
   * @returns Absolute path to the bugs directory to watch
   */
  getWatchPath(_bugId: string, worktreeConfig?: BugWorktreeConfig): string {
    if (worktreeConfig) {
      // Resolve worktree path relative to main project
      const worktreePath = path.resolve(this.projectPath, worktreeConfig.path);
      return path.join(worktreePath, '.kiro', 'bugs');
    }
    // Default: main project bugs directory
    return path.join(this.projectPath, '.kiro', 'bugs');
  }

  /**
   * Reset watch path to a new location
   * Closes the current watcher and creates a new one for the specified path
   *
   * @param bugId - Bug ID for logging purposes
   * @param newWatchPath - New absolute path to watch
   */
  async resetWatchPath(bugId: string, newWatchPath: string): Promise<void> {
    logger.info('[BugsWatcherService] Resetting watch path', { bugId, newWatchPath });

    // Close existing watcher if running
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Start new watcher with the new path
    logger.info('[BugsWatcherService] Starting new watcher', { newWatchPath });

    this.watcher = chokidar.watch(newWatchPath, {
      ignoreInitial: true,
      persistent: true,
      depth: 2, // Watch bug folders and their immediate contents
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100,
      },
    });

    this.watcher
      .on('add', (filePath) => this.handleEvent('add', filePath))
      .on('change', (filePath) => this.handleEvent('change', filePath))
      .on('unlink', (filePath) => this.handleEvent('unlink', filePath))
      .on('addDir', (dirPath) => this.handleEvent('addDir', dirPath))
      .on('unlinkDir', (dirPath) => this.handleEvent('unlinkDir', dirPath))
      .on('error', (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('[BugsWatcherService] Watcher error', { error: message });
      })
      .on('ready', () => {
        logger.info('[BugsWatcherService] New watcher ready', { bugId, newWatchPath });
      });
  }
}
