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
import { normalizeInspectionState, hasPassed } from '../../renderer/types/inspection';
import type { WorktreeConfig } from '../../renderer/types/worktree';

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

    // spec-phase-auto-update: Check inspection and deploy completion when spec.json changes
    if ((type === 'change' || type === 'add') && fileName === 'spec.json' && specId) {
      this.checkInspectionCompletion(filePath, specId).catch((error) => {
        logger.error('[SpecsWatcherService] Failed to check inspection completion', { error, specId });
      });
      this.checkDeployCompletion(filePath, specId).catch((error) => {
        logger.error('[SpecsWatcherService] Failed to check deploy completion', { error, specId });
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
   * spec-phase-auto-update Task 5: Check inspection completion and update phase
   * Detects GO judgment from spec.json.inspection and updates phase to inspection-complete
   * Requirements: 2.1, 5.1
   */
  private async checkInspectionCompletion(specJsonPath: string, specId: string): Promise<void> {
    if (!this.fileService) {
      logger.debug('[SpecsWatcherService] FileService not available, skipping inspection completion check');
      return;
    }

    try {
      const specJsonContent = await readFile(specJsonPath, 'utf-8');
      const specJson = JSON.parse(specJsonContent);

      // Skip if already at or past inspection-complete
      if (specJson.phase === 'inspection-complete' || specJson.phase === 'deploy-complete') {
        logger.debug('[SpecsWatcherService] Phase already at or past inspection-complete', { specId, phase: specJson.phase });
        return;
      }

      // Check if phase is at implementation-complete (required to proceed)
      if (specJson.phase !== 'implementation-complete') {
        logger.debug('[SpecsWatcherService] Phase not at implementation-complete, skipping inspection check', { specId, phase: specJson.phase });
        return;
      }

      // Check inspection state for GO judgment using normalized inspection state
      // Supports all formats: new (rounds/result), legacy (roundDetails/passed), very old (status/report)
      const normalizedState = normalizeInspectionState(specJson.inspection);
      if (!normalizedState) {
        logger.debug('[SpecsWatcherService] No inspection data found or invalid format', { specId });
        return;
      }

      if (!hasPassed(normalizedState)) {
        logger.debug('[SpecsWatcherService] Inspection not passed (no GO judgment)', { specId });
        return;
      }

      // Update phase to inspection-complete
      const specPath = path.dirname(specJsonPath);
      logger.info('[SpecsWatcherService] Inspection passed (GO), updating phase to inspection-complete', { specId, previousPhase: specJson.phase });
      const result = await this.fileService.updateSpecJsonFromPhase(specPath, 'inspection-complete', { skipTimestamp: true });

      if (!result.ok) {
        logger.error('[SpecsWatcherService] Failed to update spec.json phase to inspection-complete', { specId, error: result.error });
      }
    } catch (error) {
      logger.error('[SpecsWatcherService] Failed to check inspection completion', { specId, error });
    }
  }

  /**
   * spec-phase-auto-update Task 6: Check deploy completion
   * Note: deploy_completed フラグは廃止。/commit コマンドが直接 phase: 'deploy-complete' を設定するため、
   * このメソッドは後方互換性のために残しているが、実質的には何もしない。
   * Requirements: 2.2, 5.2
   */
  private async checkDeployCompletion(_specJsonPath: string, specId: string): Promise<void> {
    // deploy_completed フラグは廃止。phase は /commit コマンドで直接設定される。
    // このメソッドは後方互換性のために残すが、何もしない。
    logger.debug('[SpecsWatcherService] checkDeployCompletion called but no-op (deploy_completed flag deprecated)', { specId });
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

  /**
   * git-worktree-support Task 7.1: Get watch path for file monitoring
   * Returns the specs directory path based on worktree configuration
   * Requirements: 8.1, 8.2
   *
   * @param _specId - Spec ID (not used currently but kept for interface compatibility)
   * @param worktreeConfig - Optional worktree configuration from spec.json
   * @returns Absolute path to the specs directory to watch
   */
  getWatchPath(_specId: string, worktreeConfig?: WorktreeConfig): string {
    if (worktreeConfig) {
      // Resolve worktree path relative to main project
      const worktreePath = path.resolve(this.projectPath, worktreeConfig.path);
      return path.join(worktreePath, '.kiro', 'specs');
    }
    // Default: main project specs directory
    return path.join(this.projectPath, '.kiro', 'specs');
  }

  /**
   * git-worktree-support Task 7.1: Reset watch path to a new location
   * Closes the current watcher and creates a new one for the specified path
   * Requirements: 8.1, 8.2
   *
   * @param specId - Spec ID for logging purposes
   * @param newWatchPath - New absolute path to watch
   */
  async resetWatchPath(specId: string, newWatchPath: string): Promise<void> {
    logger.info('[SpecsWatcherService] Resetting watch path', { specId, newWatchPath });

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
    logger.info('[SpecsWatcherService] Starting new watcher', { newWatchPath });

    this.watcher = chokidar.watch(newWatchPath, {
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
        logger.info('[SpecsWatcherService] New watcher ready', { specId, newWatchPath });
      });
  }

  /**
   * git-worktree-support Task 7.1: Check for worktree field changes in spec.json
   * Called when spec.json changes to detect worktree field additions/removals
   * Requirements: 8.1, 8.2
   *
   * @param specJsonPath - Path to spec.json
   * @param specId - Spec ID
   */
  private async checkWorktreeChange(specJsonPath: string, specId: string): Promise<void> {
    try {
      const specJsonContent = await readFile(specJsonPath, 'utf-8');
      const specJson = JSON.parse(specJsonContent);

      // Get the watch path based on worktree config
      const newWatchPath = this.getWatchPath(specId, specJson.worktree);

      // Compare with current watch path - this could be enhanced to track per-spec paths
      logger.debug('[SpecsWatcherService] Worktree change check', { specId, hasWorktree: !!specJson.worktree, newWatchPath });
    } catch (error) {
      logger.error('[SpecsWatcherService] Failed to check worktree change', { specId, error });
    }
  }
}
