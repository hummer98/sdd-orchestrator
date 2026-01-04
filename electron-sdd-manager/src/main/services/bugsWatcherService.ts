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
   * Check if a path is within the bugs directory
   * e.g., /project/.kiro/bugs/my-bug/report.md -> true
   * e.g., /project/.kiro/specs/my-spec/spec.json -> false
   */
  private isWithinBugsDir(filePath: string): boolean {
    const bugsDir = path.join(this.projectPath, '.kiro', 'bugs');
    const relativePath = path.relative(bugsDir, filePath);
    // If the relative path starts with '..' it means filePath is outside bugsDir
    return !relativePath.startsWith('..');
  }

  /**
   * Extract bug name from file path
   * e.g., /project/.kiro/bugs/my-bug/report.md -> my-bug
   */
  private extractBugName(filePath: string): string | undefined {
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
}
