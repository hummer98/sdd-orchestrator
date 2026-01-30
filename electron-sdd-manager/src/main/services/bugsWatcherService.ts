/**
 * BugsWatcherService
 * Watches .kiro/bugs directory for changes and notifies renderer
 * Requirements: 6.5
 *
 * Aligned with SpecsWatcherService: watches specific directories directly
 * instead of filtering .kiro/ parent directory.
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
  /** Base path for worktrees bugs directory */
  private worktreeBugsBaseDir: string;
  /** Tracks all currently watched paths to prevent duplicate monitoring */
  private watchedPaths: Set<string> = new Set();

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.worktreeBugsBaseDir = path.join(projectPath, '.kiro', 'worktrees', 'bugs');
  }

  /**
   * Extract bug name from file path
   * Supports:
   * - Main: .kiro/bugs/{bugName}/... -> bugName
   * - Worktree: .kiro/worktrees/bugs/{bugName}/.kiro/bugs/{bugName}/... -> bugName
   */
  private extractBugName(filePath: string): string | undefined {
    // Try standard bugs path first
    const bugsDir = path.join(this.projectPath, '.kiro', 'bugs');
    const relativePath = path.relative(bugsDir, filePath);
    const parts = relativePath.split(path.sep);

    // First part should be the bug folder name
    if (parts.length > 0 && parts[0] !== '..' && parts[0] !== '.') {
      return parts[0];
    }

    // Try worktrees/bugs path
    // Pattern: .kiro/worktrees/bugs/{bugName}/.kiro/bugs/{bugName}/...
    const worktreeRelativePath = path.relative(this.worktreeBugsBaseDir, filePath);
    const worktreeParts = worktreeRelativePath.split(path.sep);

    // Expected structure: {worktreeId}/.kiro/bugs/{bugName}/...
    // worktreeParts[0] = worktreeId (same as bugName)
    // worktreeParts[1] = .kiro
    // worktreeParts[2] = bugs
    // worktreeParts[3] = bugName
    if (worktreeParts.length >= 4 &&
        worktreeParts[0] !== '..' &&
        worktreeParts[1] === '.kiro' &&
        worktreeParts[2] === 'bugs') {
      return worktreeParts[3];
    }

    return undefined;
  }

  /**
   * Start watching the bugs directory
   * file-watcher-root-monitoring: Root monitoring approach
   *
   * Monitors:
   * - .kiro/bugs/
   * - .kiro/worktrees/bugs/
   *
   * With exclusion patterns:
   * - runtime directories
   * - .git directories
   * - logs directories
   * - .log files
   */
  async start(): Promise<void> {
    if (this.watcher) {
      logger.warn('[BugsWatcherService] Watcher already running');
      return;
    }

    const bugsDir = path.join(this.projectPath, '.kiro', 'bugs');

    // Root monitoring: Watch both main and worktrees directories
    const watchPaths: string[] = [bugsDir, this.worktreeBugsBaseDir];

    logger.info('[BugsWatcherService] Starting root monitoring', { watchPaths });

    // Track all initial watch paths
    for (const watchPath of watchPaths) {
      this.watchedPaths.add(watchPath);
    }

    this.watcher = chokidar.watch(watchPaths, {
      ignoreInitial: true,
      persistent: true,
      depth: undefined, // Monitor all levels
      ignored: [
        '**/runtime/**',
        '**/.git/**',
        '**/logs/**',
        '**/*.log',
      ],
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
        logger.info('[BugsWatcherService] Watcher ready');
      });
  }

  /**
   * Handle file system events with debouncing
   * file-watcher-root-monitoring: Extension filtering for .json and .md only
   */
  private handleEvent(type: BugsChangeEvent['type'], filePath: string): void {
    // Extension filtering: only process .json and .md files (and directories)
    if (type !== 'addDir' && type !== 'unlinkDir') {
      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.json' && ext !== '.md') {
        logger.debug('[BugsWatcherService] Ignoring non-.json/.md file', { filePath, ext });
        return;
      }
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

      // Unwatch all tracked paths before closing
      for (const watchedPath of this.watchedPaths) {
        this.watcher.unwatch(watchedPath);
      }

      await this.watcher.close();
      this.watcher = null;
    }

    // Clear watchedPaths Set
    this.watchedPaths.clear();

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
      // Unwatch all tracked paths before closing
      for (const watchedPath of this.watchedPaths) {
        this.watcher.unwatch(watchedPath);
      }

      await this.watcher.close();
      this.watcher = null;
    }

    // Clear watchedPaths Set
    this.watchedPaths.clear();

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Start new watcher with the new path
    logger.info('[BugsWatcherService] Starting new watcher', { newWatchPath });

    // Track the new watch path
    this.watchedPaths.add(newWatchPath);

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
