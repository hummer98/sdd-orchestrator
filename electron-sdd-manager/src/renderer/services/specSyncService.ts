/**
 * SpecSyncService
 * Handles file sync operations for spec stores
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */

import type { SpecMetadata, SpecDetail, ArtifactInfo, TaskProgress, SpecJson, ParallelTaskInfo } from '../types';
import { getLatestInspectionReportFile, normalizeInspectionState } from '../types/inspection';
import type { ArtifactType } from '../stores/spec/types';
import { parseTasksContent } from '@shared/utils/taskParallelParser';

/**
 * Callbacks for SpecSyncService initialization
 */
export interface SpecSyncServiceCallbacks {
  getSelectedSpec: () => SpecMetadata | null;
  getSpecDetail: () => SpecDetail | null;
  setSpecJson: (specJson: SpecJson) => void;
  setArtifact: (type: ArtifactType, info: ArtifactInfo | null) => void;
  setTaskProgress: (progress: TaskProgress | null) => void;
  setParallelTaskInfo: (info: ParallelTaskInfo | null) => void;
  updateSpecMetadata: (specId: string) => Promise<void>;
  editorSyncCallback: (specPath: string, artifact: ArtifactType) => Promise<void>;
}

/**
 * Service for syncing spec file changes to stores
 */
export class SpecSyncService {
  private callbacks: SpecSyncServiceCallbacks | null = null;

  /**
   * Initialize service with callbacks
   * Requirement 3.1: init method to inject store callbacks
   */
  init(callbacks: SpecSyncServiceCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Update spec.json only (no artifact reload, except for inspection)
   * Requirement 3.2: updateSpecJson for spec.json-only updates
   * Bug fix: inspection-tab-not-displayed - Also reload inspection artifact when spec.json has inspection field
   */
  async updateSpecJson(): Promise<void> {
    if (!this.callbacks) {
      console.warn('[specSyncService] Not initialized');
      return;
    }

    const selectedSpec = this.callbacks.getSelectedSpec();
    if (!selectedSpec) {
      return;
    }

    try {
      // spec-path-ssot-refactor: Use spec.name instead of spec.path
      console.log('[specSyncService] updateSpecJson:', selectedSpec.name);
      const specJson = await window.electronAPI.readSpecJson(selectedSpec.name);

      // Update spec.json in store
      this.callbacks.setSpecJson(specJson);

      // Bug fix: inspection-tab-not-displayed
      // Bug fix: inspection-state-data-model - normalize inspection state
      // Also reload inspection artifact if spec.json has inspection field
      const normalizedInspection = normalizeInspectionState(specJson.inspection);
      const reportFile = getLatestInspectionReportFile(normalizedInspection);
      if (reportFile) {
        try {
          // spec-path-ssot-refactor: Use (specName, filename) instead of full path
          const content = await window.electronAPI.readArtifact(selectedSpec.name, reportFile);
          this.callbacks.setArtifact(`${reportFile.replace('.md', '')}` as ArtifactType, { exists: true, updatedAt: null, content });
          console.log('[specSyncService] updateSpecJson: Loaded inspection artifact', reportFile);
        } catch {
          this.callbacks.setArtifact(`${reportFile.replace('.md', '')}` as ArtifactType, null);
          console.log('[specSyncService] updateSpecJson: Inspection file not found', reportFile);
        }
      }

      // Also update metadata in list
      await this.callbacks.updateSpecMetadata(selectedSpec.name);

      console.log('[specSyncService] updateSpecJson completed:', selectedSpec.name);
    } catch (error) {
      console.error('[specSyncService] Failed to update spec.json:', error);
    }
  }

  /**
   * Update single artifact only (no spec.json reload)
   * Requirement 3.3: updateArtifact for single artifact updates
   * Requirement 3.6: Recalculate taskProgress when tasks artifact changes
   */
  async updateArtifact(artifact: ArtifactType): Promise<void> {
    if (!this.callbacks) {
      console.warn('[specSyncService] Not initialized');
      return;
    }

    const selectedSpec = this.callbacks.getSelectedSpec();
    if (!selectedSpec) {
      return;
    }

    try {
      // spec-path-ssot-refactor: Use spec.name instead of spec.path
      console.log('[specSyncService] updateArtifact:', { spec: selectedSpec.name, artifact });

      let artifactInfo: ArtifactInfo | null = null;

      try {
        // spec-path-ssot-refactor: Use (specName, filename) instead of full path
        const content = await window.electronAPI.readArtifact(selectedSpec.name, `${artifact}.md`);
        artifactInfo = { exists: true, updatedAt: null, content };
      } catch {
        artifactInfo = null;
      }

      // Update artifact in store
      this.callbacks.setArtifact(artifact, artifactInfo);

      // Recalculate task progress if tasks.md changed
      if (artifact === 'tasks' && artifactInfo?.content) {
        const taskProgress = this.calculateTaskProgress(artifactInfo.content);
        this.callbacks.setTaskProgress(taskProgress);
        console.log('[specSyncService] Task progress recalculated:', taskProgress);
      }

      // Sync editor if callback is provided
      // spec-path-ssot-refactor: Use spec.name instead of spec.path
      await this.callbacks.editorSyncCallback(selectedSpec.name, artifact);

      console.log('[specSyncService] updateArtifact completed:', { spec: selectedSpec.name, artifact });
    } catch (error) {
      console.error('[specSyncService] Failed to update artifact:', error);
    }
  }

  /**
   * Sync document review state from file system
   * Requirement 3.4: syncDocumentReviewState for document-review-*.md sync
   */
  async syncDocumentReviewState(): Promise<void> {
    if (!this.callbacks) {
      console.warn('[specSyncService] Not initialized');
      return;
    }

    const selectedSpec = this.callbacks.getSelectedSpec();
    if (!selectedSpec) {
      return;
    }

    try {
      // spec-path-ssot-refactor: Use spec.name instead of spec.path
      console.log('[specSyncService] syncDocumentReviewState:', selectedSpec.name);

      // Sync file system state to spec.json
      await window.electronAPI.syncDocumentReview(selectedSpec.name);

      // Re-read spec.json to get updated state
      const specJson = await window.electronAPI.readSpecJson(selectedSpec.name);

      // Update specJson in store
      this.callbacks.setSpecJson(specJson);

      console.log('[specSyncService] syncDocumentReviewState completed:', selectedSpec.name);
    } catch (error) {
      console.error('[specSyncService] Failed to sync documentReview state:', error);
    }
  }

  /**
   * Sync inspection state and load inspection artifact
   * Requirement 3.5: syncInspectionState for inspection-*.md sync
   */
  async syncInspectionState(): Promise<void> {
    if (!this.callbacks) {
      console.warn('[specSyncService] Not initialized');
      return;
    }

    const selectedSpec = this.callbacks.getSelectedSpec();
    if (!selectedSpec) {
      return;
    }

    try {
      // spec-path-ssot-refactor: Use spec.name instead of spec.path
      console.log('[specSyncService] syncInspectionState:', selectedSpec.name);

      // Re-read spec.json to get current inspection field
      const specJson = await window.electronAPI.readSpecJson(selectedSpec.name);

      // Update specJson in store
      this.callbacks.setSpecJson(specJson);

      // Load inspection artifact if exists
      // Bug fix: inspection-state-data-model - normalize inspection state
      const normalizedInspection = normalizeInspectionState(specJson.inspection);
      const reportFile = getLatestInspectionReportFile(normalizedInspection);
      if (reportFile) {
        try {
          // spec-path-ssot-refactor: Use (specName, filename) instead of full path
          const content = await window.electronAPI.readArtifact(selectedSpec.name, reportFile);
          this.callbacks.setArtifact(`${reportFile.replace('.md', '')}` as ArtifactType, { exists: true, updatedAt: null, content });
          console.log('[specSyncService] Loaded inspection artifact:', reportFile);
        } catch {
          this.callbacks.setArtifact(`${reportFile.replace('.md', '')}` as ArtifactType, null);
          console.log('[specSyncService] Inspection file not found:', reportFile);
        }
      }

      console.log('[specSyncService] syncInspectionState completed:', selectedSpec.name);
    } catch (error) {
      console.error('[specSyncService] Failed to sync inspection state:', error);
    }
  }

  /**
   * Sync task progress and auto-fix phase if needed
   * Requirement 3.7: syncTaskProgress for task progress calculation
   * Requirement 3.8: Auto-fix phase to implementation-complete when all tasks done
   */
  async syncTaskProgress(): Promise<void> {
    if (!this.callbacks) {
      console.warn('[specSyncService] Not initialized');
      return;
    }

    const selectedSpec = this.callbacks.getSelectedSpec();
    const specDetail = this.callbacks.getSpecDetail();
    if (!selectedSpec || !specDetail) {
      return;
    }

    try {
      console.log('[specSyncService] syncTaskProgress:', selectedSpec.name);

      const tasksArtifact = specDetail.artifacts.tasks;
      if (!tasksArtifact?.content) {
        return;
      }

      // Calculate task progress
      const taskProgress = this.calculateTaskProgress(tasksArtifact.content);
      this.callbacks.setTaskProgress(taskProgress);

      // Calculate parallel task info
      const parseResult = parseTasksContent(tasksArtifact.content);
      this.callbacks.setParallelTaskInfo({
        parallelTasks: parseResult.parallelTasks,
        totalTasks: parseResult.totalTasks,
        groups: parseResult.groups,
      });

      // Auto-fix phase if all tasks complete
      // spec-path-ssot-refactor: Use spec.name instead of spec.path
      if (taskProgress.total > 0) {
        const isAllComplete = taskProgress.completed === taskProgress.total;
        const currentPhase = specDetail.specJson.phase;

        if (isAllComplete && currentPhase !== 'implementation-complete') {
          console.log('[specSyncService] Auto-fixing phase to implementation-complete');
          try {
            await window.electronAPI.syncSpecPhase(selectedSpec.name, 'impl-complete', {
              skipTimestamp: true,
            });
            const updatedSpecJson = await window.electronAPI.readSpecJson(selectedSpec.name);
            this.callbacks.setSpecJson(updatedSpecJson);
          } catch (error) {
            console.error('[specSyncService] Failed to auto-fix phase:', error);
          }
        }
      }

      console.log('[specSyncService] syncTaskProgress completed:', { spec: selectedSpec.name, taskProgress });
    } catch (error) {
      console.error('[specSyncService] Failed to sync task progress:', error);
    }
  }

  /**
   * Calculate task progress from tasks.md content
   */
  private calculateTaskProgress(content: string): TaskProgress {
    const completedMatches = content.match(/^- \[x\]/gim) || [];
    const pendingMatches = content.match(/^- \[ \]/gm) || [];
    const total = completedMatches.length + pendingMatches.length;
    const completed = completedMatches.length;

    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }
}

/** Singleton instance */
export const specSyncService = new SpecSyncService();
