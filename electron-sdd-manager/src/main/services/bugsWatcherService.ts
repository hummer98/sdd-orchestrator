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
import { access, constants, readdir } from 'fs/promises';
import { logger } from './logger';
import type { BugsChangeEvent } from '../../renderer/types';
import type { BugWorktreeConfig } from '../../renderer/types/bugJson';
import {
  detectWorktreeAddition,
  buildWorktreeEntityPath,
} from './worktreeWatcherUtils';

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
  /** Debounce timers for worktree additions (500ms) */
  private worktreeAdditionTimers: Map<string, NodeJS.Timeout> = new Map();
  private worktreeAdditionDebounceMs = 500;

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
   * Aligned with SpecsWatcherService: watches specific directories directly
   *
   * Main bugs: .kiro/bugs/{bugName}/**
   * Worktree bugs: .kiro/worktrees/bugs/{bugName}/.kiro/bugs/{bugName}/**
   * Worktree base: .kiro/worktrees/bugs/ (for detecting new worktrees)
   */
  async start(): Promise<void> {
    if (this.watcher) {
      logger.warn('[BugsWatcherService] Watcher already running');
      return;
    }

    const bugsDir = path.join(this.projectPath, '.kiro', 'bugs');

    // Watch main bugs directory AND worktrees base directory for dynamic additions
    const watchPaths: string[] = [bugsDir, this.worktreeBugsBaseDir];

    // Check if worktree bugs base directory exists
    // If exists, also add paths for existing worktree's own bug
    // Pattern: .kiro/worktrees/bugs/{bugName}/.kiro/bugs/{bugName}/** (same bugName)
    try {
      await access(this.worktreeBugsBaseDir, constants.F_OK);

      // Read worktree directories and add specific paths
      const worktreeDirs = await readdir(this.worktreeBugsBaseDir, { withFileTypes: true });

      for (const dir of worktreeDirs) {
        if (dir.isDirectory()) {
          const bugName = dir.name;
          // Only watch the bug that matches the worktree name
          const worktreeBugPath = buildWorktreeEntityPath(this.projectPath, 'bugs', bugName);
          try {
            await access(worktreeBugPath, constants.F_OK);
            watchPaths.push(worktreeBugPath);
            logger.debug('[BugsWatcherService] Adding worktree bug path', { bugName, worktreeBugPath });
          } catch {
            // Bug directory doesn't exist yet in worktree, skip
            logger.debug('[BugsWatcherService] Worktree bug path not found, skipping', { bugName, worktreeBugPath });
          }
        }
      }

      logger.info('[BugsWatcherService] Worktree bugs directory found', {
        worktreeBugsBaseDir: this.worktreeBugsBaseDir,
        worktreeCount: worktreeDirs.filter(d => d.isDirectory()).length,
      });
    } catch {
      logger.debug('[BugsWatcherService] Worktree bugs directory not found, will watch for creation', { worktreeBugsBaseDir: this.worktreeBugsBaseDir });
    }

    logger.info('[BugsWatcherService] Starting watcher with 2-tier monitoring', { watchPaths });

    this.watcher = chokidar.watch(watchPaths, {
      ignoreInitial: true,
      persistent: true,
      depth: 2, // Sufficient for {bugName}/*.{md,json}
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
   * 2-tier monitoring for worktree additions/removals
   */
  private handleEvent(type: BugsChangeEvent['type'], filePath: string): void {
    const bugName = this.extractBugName(filePath);

    logger.debug('[BugsWatcherService] File event', { type, filePath, bugName });

    // 2-tier monitoring - detect worktree additions/removals
    if (type === 'addDir') {
      const entityName = detectWorktreeAddition(this.worktreeBugsBaseDir, filePath);
      if (entityName) {
        logger.info('[BugsWatcherService] Worktree addition detected', { entityName, dirPath: filePath });
        this.handleWorktreeAddition(filePath).catch((error) => {
          logger.error('[BugsWatcherService] Failed to handle worktree addition', { error, entityName });
        });
        // Don't propagate addDir event for worktree base directory
        return;
      }
    } else if (type === 'unlinkDir') {
      const entityName = detectWorktreeAddition(this.worktreeBugsBaseDir, filePath);
      if (entityName) {
        logger.info('[BugsWatcherService] Worktree removal detected', { entityName, dirPath: filePath });
        this.handleWorktreeRemoval(filePath);
        // Don't propagate unlinkDir event for worktree base directory
        return;
      }
    }

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
   * Handle worktree directory addition
   * Dynamically adds inner bug path to monitoring after debounce wait
   * and triggers callback to refresh bugs list
   */
  private async handleWorktreeAddition(dirPath: string): Promise<void> {
    if (!this.watcher) {
      logger.warn('[BugsWatcherService] Watcher not running, cannot add worktree path');
      return;
    }

    const entityName = detectWorktreeAddition(this.worktreeBugsBaseDir, dirPath);
    if (!entityName) {
      logger.debug('[BugsWatcherService] Could not extract entity name from worktree path', { dirPath });
      return;
    }

    // Clear existing timer for this worktree
    const existingTimer = this.worktreeAdditionTimers.get(entityName);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Debounce to wait for directory structure creation (500ms)
    const timer = setTimeout(async () => {
      this.worktreeAdditionTimers.delete(entityName);

      const innerBugPath = buildWorktreeEntityPath(this.projectPath, 'bugs', entityName);

      // Check if inner bug path exists
      try {
        await access(innerBugPath, constants.F_OK);

        // Add to watcher
        this.watcher?.add(innerBugPath);
        logger.info('[BugsWatcherService] Added worktree inner bug path to watcher', { entityName, innerBugPath });

        // Trigger callback to refresh bugs list (aligned with SpecsWatcherService)
        const event: BugsChangeEvent = { type: 'addDir', path: innerBugPath, bugName: entityName };
        this.callbacks.forEach((cb) => cb(event));
        logger.debug('[BugsWatcherService] Triggered callback for worktree bug addition', { entityName });
      } catch {
        logger.debug('[BugsWatcherService] Worktree inner bug path not yet ready', { entityName, innerBugPath });
      }
    }, this.worktreeAdditionDebounceMs);

    this.worktreeAdditionTimers.set(entityName, timer);
  }

  /**
   * Handle worktree directory removal
   * Removes inner bug path from monitoring and triggers callback to refresh bugs list
   */
  private handleWorktreeRemoval(dirPath: string): void {
    if (!this.watcher) {
      logger.warn('[BugsWatcherService] Watcher not running, cannot remove worktree path');
      return;
    }

    const entityName = detectWorktreeAddition(this.worktreeBugsBaseDir, dirPath);
    if (!entityName) {
      logger.debug('[BugsWatcherService] Could not extract entity name from worktree path', { dirPath });
      return;
    }

    // Clear any pending addition timer
    const existingTimer = this.worktreeAdditionTimers.get(entityName);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.worktreeAdditionTimers.delete(entityName);
    }

    const innerBugPath = buildWorktreeEntityPath(this.projectPath, 'bugs', entityName);

    // Remove from watcher
    this.watcher.unwatch(innerBugPath);
    logger.info('[BugsWatcherService] Removed worktree inner bug path from watcher', { entityName, innerBugPath });

    // Trigger callback to refresh bugs list (aligned with SpecsWatcherService)
    const event: BugsChangeEvent = { type: 'unlinkDir', path: innerBugPath, bugName: entityName };
    this.callbacks.forEach((cb) => cb(event));
    logger.debug('[BugsWatcherService] Triggered callback for worktree bug removal', { entityName });
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

    // spec-path-ssot-refactor: Clear worktree addition timers
    for (const timer of this.worktreeAdditionTimers.values()) {
      clearTimeout(timer);
    }
    this.worktreeAdditionTimers.clear();

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
