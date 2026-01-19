/**
 * SpecWatcherService
 * Handles file watching and dispatching spec change events
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10
 */

import type { SpecMetadata } from '../types';
import type { SpecsChangeEvent } from '../types/electron';
import type { SpecSyncService } from './specSyncService';

/**
 * Dependencies for SpecWatcherService initialization
 */
export interface SpecWatcherServiceDeps {
  syncService: SpecSyncService;
  getSelectedSpec: () => SpecMetadata | null;
  updateSpecMetadata: (specId: string) => Promise<void>;
  /**
   * spec-worktree-early-creation: Callback to reload spec list
   * Called on addDir/unlinkDir events (new spec added or spec deleted)
   */
  reloadSpecs: () => Promise<void>;
}

/**
 * Service for watching spec file changes
 */
export class SpecWatcherService {
  private deps: SpecWatcherServiceDeps | null = null;
  private watcherCleanup: (() => void) | null = null;
  private _isWatching = false;

  /**
   * Get watching status
   * Requirement 4.10: isWatching state management
   */
  get isWatching(): boolean {
    return this._isWatching;
  }

  /**
   * Initialize service with dependencies
   * Requirement 4.1: init method to inject service/store references
   */
  init(deps: SpecWatcherServiceDeps): void {
    this.deps = deps;
  }

  /**
   * Start watching for spec changes
   * Requirement 4.2: startWatching to register onSpecsChanged listener
   */
  async startWatching(): Promise<void> {
    if (!this.deps) {
      console.warn('[specWatcherService] Not initialized');
      return;
    }

    // Clean up existing listener if any
    if (this.watcherCleanup) {
      this.watcherCleanup();
      this.watcherCleanup = null;
    }

    try {
      // Register change event listener
      this.watcherCleanup = window.electronAPI.onSpecsChanged((event) => {
        this.handleSpecsChanged(event);
      });

      this._isWatching = true;
      console.log('[specWatcherService] Started watching');
    } catch (error) {
      console.error('[specWatcherService] Failed to start watching:', error);
    }
  }

  /**
   * Stop watching for spec changes
   * Requirement 4.3: stopWatching to unregister listener and stop watcher
   */
  async stopWatching(): Promise<void> {
    if (this.watcherCleanup) {
      this.watcherCleanup();
      this.watcherCleanup = null;
    }

    try {
      await window.electronAPI.stopSpecsWatcher();
      this._isWatching = false;
      console.log('[specWatcherService] Stopped watching');
    } catch (error) {
      console.error('[specWatcherService] Failed to stop watching:', error);
    }
  }

  /**
   * Handle specs changed event
   * Routes to appropriate sync method based on file type
   * spec-worktree-early-creation: Also handles addDir/unlinkDir for spec list updates
   */
  private handleSpecsChanged(event: SpecsChangeEvent): void {
    if (!this.deps) {
      return;
    }

    console.log('[specWatcherService] Specs changed:', event);

    // spec-worktree-early-creation: Handle spec directory add/remove events
    // These events indicate a new spec was created or an existing spec was deleted
    // Reload the entire spec list to reflect the change
    if (event.type === 'addDir' || event.type === 'unlinkDir') {
      console.log('[specWatcherService] Spec directory added/removed, reloading specs:', event.type, event.specId);
      this.deps.reloadSpecs().catch((error) => {
        console.error('[specWatcherService] Failed to reload specs:', error);
      });
      return;
    }

    // Ignore events without specId
    if (!event.specId) {
      return;
    }

    const selectedSpec = this.deps.getSelectedSpec();
    const isSelectedSpecChanged = selectedSpec && event.specId === selectedSpec.name;

    if (isSelectedSpecChanged && event.path) {
      // Dispatch to appropriate handler based on file name
      const fileName = event.path.split('/').pop() || '';
      this.dispatchByFileName(fileName);
    } else if (event.specId) {
      // Non-selected spec changed, only update metadata
      // Requirement 4.9: Non-selected spec changes only trigger updateSpecMetadata
      this.deps.updateSpecMetadata(event.specId);
    }
  }

  /**
   * Dispatch to appropriate sync method based on file name
   * Requirements 4.4, 4.5, 4.6, 4.7, 4.8
   */
  private dispatchByFileName(fileName: string): void {
    if (!this.deps) {
      return;
    }

    console.log('[specWatcherService] Dispatching for file:', fileName);

    // Requirement 4.4: spec.json changes
    if (fileName === 'spec.json') {
      this.deps.syncService.updateSpecJson();
      return;
    }

    // Requirement 4.5: artifact changes
    if (fileName === 'requirements.md') {
      this.deps.syncService.updateArtifact('requirements');
      return;
    }
    if (fileName === 'design.md') {
      this.deps.syncService.updateArtifact('design');
      return;
    }
    if (fileName === 'research.md') {
      this.deps.syncService.updateArtifact('research');
      return;
    }

    // Requirement 4.6: tasks.md changes (both updateArtifact and syncTaskProgress)
    if (fileName === 'tasks.md') {
      this.deps.syncService.updateArtifact('tasks');
      this.deps.syncService.syncTaskProgress();
      return;
    }

    // Requirement 4.7: document-review-*.md changes
    if (fileName.startsWith('document-review-')) {
      this.deps.syncService.syncDocumentReviewState();
      return;
    }

    // Requirement 4.8: inspection-*.md changes
    if (fileName.startsWith('inspection-')) {
      this.deps.syncService.syncInspectionState();
      return;
    }

    // Unknown file, update spec.json as fallback
    console.log('[specWatcherService] Unknown file changed, updating spec.json as fallback:', fileName);
    this.deps.syncService.updateSpecJson();
  }
}

/** Singleton instance */
export const specWatcherService = new SpecWatcherService();
