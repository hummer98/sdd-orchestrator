/**
 * SpecsWatcherService
 * Watches .kiro/specs directory for changes and notifies renderer
 * Also monitors tasks.md for completion and updates spec.json phase
 */

import * as chokidar from 'chokidar';
import * as path from 'path';
import { readFile } from 'fs/promises';
import { logger } from './logger';
import type { FileService } from './fileService';

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
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private debounceMs = 300;
  private fileService: FileService | null = null;

  constructor(projectPath: string, fileService?: FileService) {
    this.projectPath = projectPath;
    this.fileService = fileService ?? null;
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

    // Check if tasks.md was modified and handle completion detection
    const fileName = path.basename(filePath);
    if ((type === 'change' || type === 'add') && fileName === 'tasks.md' && specId) {
      this.checkTaskCompletion(filePath, specId).catch((error) => {
        logger.error('[SpecsWatcherService] Failed to check task completion', { error, specId });
      });
    }

    // Debounce per file path to avoid dropping concurrent events for different files
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(filePath);
      const event: SpecsChangeEvent = { type, path: filePath, specId };
      this.callbacks.forEach((cb) => cb(event));
    }, this.debounceMs);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Check if all tasks in tasks.md are complete and update spec.json phase
   * This runs in the main process, independent of renderer state
   */
  private async checkTaskCompletion(tasksFilePath: string, specId: string): Promise<void> {
    if (!this.fileService) {
      logger.debug('[SpecsWatcherService] FileService not available, skipping task completion check');
      return;
    }

    try {
      // Read tasks.md content
      const content = await readFile(tasksFilePath, 'utf-8');

      // Parse task checkboxes (same logic as specStore)
      const completedMatches = content.match(/^- \[x\]/gim) || [];
      const pendingMatches = content.match(/^- \[ \]/gm) || [];
      const total = completedMatches.length + pendingMatches.length;
      const completed = completedMatches.length;

      if (total === 0) {
        logger.debug('[SpecsWatcherService] No tasks found in tasks.md', { specId });
        return;
      }

      const isAllComplete = completed === total;
      logger.debug('[SpecsWatcherService] Task completion check', { specId, completed, total, isAllComplete });

      if (!isAllComplete) {
        return;
      }

      // Read current spec.json to check phase
      const specPath = path.dirname(tasksFilePath);
      const specJsonPath = path.join(specPath, 'spec.json');

      try {
        const specJsonContent = await readFile(specJsonPath, 'utf-8');
        const specJson = JSON.parse(specJsonContent);

        if (specJson.phase === 'implementation-complete') {
          logger.debug('[SpecsWatcherService] Phase already implementation-complete', { specId });
          return;
        }

        // Update phase to implementation-complete
        logger.info('[SpecsWatcherService] All tasks complete, updating phase to implementation-complete', { specId, previousPhase: specJson.phase });
        const result = await this.fileService.updateSpecJsonFromPhase(specPath, 'impl-complete', { skipTimestamp: true });

        if (!result.ok) {
          logger.error('[SpecsWatcherService] Failed to update spec.json phase', { specId, error: result.error });
        }
      } catch (error) {
        logger.error('[SpecsWatcherService] Failed to read spec.json', { specId, error });
      }
    } catch (error) {
      logger.error('[SpecsWatcherService] Failed to read tasks.md', { specId, error });
    }
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
