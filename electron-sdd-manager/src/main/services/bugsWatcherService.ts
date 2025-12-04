/**
 * BugsWatcherService
 * Watches .kiro/bugs directory for changes and notifies renderer
 * Requirements: 6.5
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
  private debounceTimer: NodeJS.Timeout | null = null;
  private debounceMs = 300;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
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
   */
  start(): void {
    if (this.watcher) {
      logger.warn('[BugsWatcherService] Watcher already running');
      return;
    }

    const bugsDir = path.join(this.projectPath, '.kiro', 'bugs');
    logger.info('[BugsWatcherService] Starting watcher', { bugsDir });

    this.watcher = chokidar.watch(bugsDir, {
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
        logger.info('[BugsWatcherService] Watcher ready');
      });
  }

  /**
   * Handle file system events with debouncing
   */
  private handleEvent(type: BugsChangeEvent['type'], filePath: string): void {
    const bugName = this.extractBugName(filePath);

    logger.debug('[BugsWatcherService] File event', { type, filePath, bugName });

    // Debounce to avoid multiple rapid events
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      const event: BugsChangeEvent = { type, path: filePath, bugName };
      this.callbacks.forEach((cb) => cb(event));
    }, this.debounceMs);
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

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    this.callbacks = [];
  }

  /**
   * Check if watcher is running
   */
  isRunning(): boolean {
    return this.watcher !== null;
  }
}
