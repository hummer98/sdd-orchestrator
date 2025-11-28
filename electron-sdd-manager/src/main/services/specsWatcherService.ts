/**
 * SpecsWatcherService
 * Watches .kiro/specs directory for changes and notifies renderer
 */

import * as chokidar from 'chokidar';
import * as path from 'path';
import { logger } from './logger';

export type SpecsChangeEvent = {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  path: string;
  specId?: string;
};

export type SpecsChangeCallback = (event: SpecsChangeEvent) => void;

/**
 * Service for watching .kiro/specs directory changes
 */
export class SpecsWatcherService {
  private watcher: chokidar.FSWatcher | null = null;
  private projectPath: string;
  private callbacks: SpecsChangeCallback[] = [];
  private debounceTimer: NodeJS.Timeout | null = null;
  private debounceMs = 300;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Extract spec ID from file path
   * e.g., /project/.kiro/specs/my-feature/spec.json -> my-feature
   */
  private extractSpecId(filePath: string): string | undefined {
    const specsDir = path.join(this.projectPath, '.kiro', 'specs');
    const relativePath = path.relative(specsDir, filePath);
    const parts = relativePath.split(path.sep);

    // First part should be the spec folder name
    if (parts.length > 0 && parts[0] !== '..' && parts[0] !== '.') {
      return parts[0];
    }
    return undefined;
  }

  /**
   * Start watching the specs directory
   */
  start(): void {
    if (this.watcher) {
      logger.warn('[SpecsWatcherService] Watcher already running');
      return;
    }

    const specsDir = path.join(this.projectPath, '.kiro', 'specs');
    logger.info('[SpecsWatcherService] Starting watcher', { specsDir });

    this.watcher = chokidar.watch(specsDir, {
      ignoreInitial: true,
      persistent: true,
      depth: 2, // Watch spec folders and their immediate contents
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
        logger.error('[SpecsWatcherService] Watcher error', { error: message });
      })
      .on('ready', () => {
        logger.info('[SpecsWatcherService] Watcher ready');
      });
  }

  /**
   * Handle file system events with debouncing
   */
  private handleEvent(type: SpecsChangeEvent['type'], filePath: string): void {
    const specId = this.extractSpecId(filePath);

    logger.debug('[SpecsWatcherService] File event', { type, filePath, specId });

    // Debounce to avoid multiple rapid events
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      const event: SpecsChangeEvent = { type, path: filePath, specId };
      this.callbacks.forEach((cb) => cb(event));
    }, this.debounceMs);
  }

  /**
   * Register a callback for spec changes
   */
  onChange(callback: SpecsChangeCallback): void {
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
      logger.info('[SpecsWatcherService] Stopping watcher');
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
