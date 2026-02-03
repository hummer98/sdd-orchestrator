/**
 * ProjectFileWatcherService
 *
 * project-config-editor Task 2.1: 外部変更監視サービス
 * Requirements: 5.1
 *
 * Watches:
 * - CLAUDE.md at project root
 * - .kiro/steering/*.md files
 *
 * Features:
 * - Debounced change events (300ms)
 * - Project path switching support
 * - Clean start/stop lifecycle
 */

import * as chokidar from 'chokidar';
import * as path from 'path';
import { projectLogger as logger } from './projectLogger';

export type ProjectFileChangeCallback = (filePath: string) => void;

/**
 * Service for watching project configuration files (CLAUDE.md, steering files)
 */
export class ProjectFileWatcherService {
  private watcher: chokidar.FSWatcher | null = null;
  private projectPath: string | null = null;
  private callbacks: ProjectFileChangeCallback[] = [];
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private debounceMs = 300;

  /**
   * Start watching project files
   * @param projectPath - Project root path
   */
  async start(projectPath: string): Promise<void> {
    // Stop existing watcher if running
    if (this.watcher) {
      await this.stop();
    }

    this.projectPath = projectPath;

    // Paths to watch
    const watchPaths = [
      path.join(projectPath, 'CLAUDE.md'),
      path.join(projectPath, '.kiro', 'steering', '*.md'),
    ];

    logger.info('[ProjectFileWatcherService] Starting watcher', { projectPath, watchPaths });

    this.watcher = chokidar.watch(watchPaths, {
      ignoreInitial: true,
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    this.watcher.on('change', (filePath: string) => {
      this.handleFileChange(filePath);
    });

    this.watcher.on('add', (filePath: string) => {
      this.handleFileChange(filePath);
    });

    this.watcher.on('unlink', (filePath: string) => {
      this.handleFileChange(filePath);
    });

    this.watcher.on('error', (error: unknown) => {
      logger.error('[ProjectFileWatcherService] Watcher error', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  /**
   * Stop watching
   */
  async stop(): Promise<void> {
    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Close watcher
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }

    this.projectPath = null;
    logger.info('[ProjectFileWatcherService] Stopped');
  }

  /**
   * Register a change callback
   * @param callback - Callback to invoke on file change
   */
  onChange(callback: ProjectFileChangeCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Check if watcher is running
   */
  isRunning(): boolean {
    return this.watcher !== null;
  }

  /**
   * Get current project path being watched
   */
  getProjectPath(): string | null {
    return this.projectPath;
  }

  /**
   * Handle file change with debouncing
   * @param filePath - Changed file path
   */
  private handleFileChange(filePath: string): void {
    // Cancel existing timer for this file
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounced timer
    const timer = setTimeout(() => {
      this.debounceTimers.delete(filePath);
      this.notifyCallbacks(filePath);
    }, this.debounceMs);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Notify all registered callbacks
   * @param filePath - Changed file path
   */
  private notifyCallbacks(filePath: string): void {
    logger.debug('[ProjectFileWatcherService] File changed', { filePath });

    for (const callback of this.callbacks) {
      try {
        callback(filePath);
      } catch (error) {
        logger.error('[ProjectFileWatcherService] Callback error', {
          filePath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}
