/**
 * SpecDetailStore
 * Manages selected Spec detail state
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8
 */

import { create } from 'zustand';
import type { SpecMetadata, SpecDetail, ArtifactInfo, TaskProgress } from '../../types';
import { getLatestInspectionReportFile, normalizeInspectionState } from '../../types/inspection';
import type { SpecDetailState, SpecDetailActions, ArtifactType } from './types';
import { DEFAULT_SPEC_DETAIL_STATE } from './types';

type SpecDetailStore = SpecDetailState & SpecDetailActions;

export const useSpecDetailStore = create<SpecDetailStore>((set, get) => ({
  // Initial state
  ...DEFAULT_SPEC_DETAIL_STATE,

  // Actions

  /**
   * Select a spec and load its details
   * Requirement 2.3: selectSpec action to load spec detail from path
   * Requirement 2.5: Load specJson and all artifacts
   * Requirement 2.6: Calculate taskProgress from tasks.md content
   * Requirement 2.7: Silent mode option
   */
  selectSpec: async (spec: SpecMetadata, options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;

    if (!silent) {
      set({ selectedSpec: spec, isLoading: true, error: null });
    }

    try {
      const specJson = await window.electronAPI.readSpecJson(spec.path);

      // Get artifact info with content for tasks
      const getArtifactInfo = async (name: string): Promise<ArtifactInfo | null> => {
        try {
          const artifactPath = `${spec.path}/${name}.md`;
          const content = await window.electronAPI.readArtifact(artifactPath);
          return { exists: true, updatedAt: null, content };
        } catch {
          return null;
        }
      };

      // Helper to get inspection artifact from spec.json inspection field
      // Bug fix: inspection-state-data-model - normalize inspection state
      const getInspectionArtifact = async (): Promise<ArtifactInfo | null> => {
        const normalizedInspection = normalizeInspectionState(specJson.inspection);
        const reportFile = getLatestInspectionReportFile(normalizedInspection);
        if (!reportFile) {
          return null;
        }

        try {
          const artifactPath = `${spec.path}/${reportFile}`;
          const content = await window.electronAPI.readArtifact(artifactPath);
          return { exists: true, updatedAt: null, content };
        } catch {
          return null;
        }
      };

      const [requirements, design, tasks, research, inspection] = await Promise.all([
        getArtifactInfo('requirements'),
        getArtifactInfo('design'),
        getArtifactInfo('tasks'),
        getArtifactInfo('research'),
        getInspectionArtifact(),
      ]);

      // Calculate task progress from tasks.md content
      let taskProgress: TaskProgress | null = null;
      if (tasks?.content) {
        const completedMatches = tasks.content.match(/^- \[x\]/gim) || [];
        const pendingMatches = tasks.content.match(/^- \[ \]/gm) || [];
        const total = completedMatches.length + pendingMatches.length;
        const completed = completedMatches.length;
        taskProgress = {
          total,
          completed,
          percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
        console.log('[specDetailStore] Task progress calculated:', { spec: spec.name, taskProgress });

        // Auto-fix spec.json phase if task completion doesn't match phase
        if (total > 0) {
          const currentPhase = specJson.phase;
          const isAllComplete = completed === total;

          if (isAllComplete && currentPhase !== 'implementation-complete') {
            console.log('[specDetailStore] Auto-fixing phase to implementation-complete', { spec: spec.name, currentPhase });
            try {
              await window.electronAPI.syncSpecPhase(spec.path, 'impl-complete', { skipTimestamp: true });
              specJson.phase = 'implementation-complete';
            } catch (error) {
              console.error('[specDetailStore] Failed to auto-fix phase:', error);
            }
          }
        }
      }

      // Auto-sync documentReview field with file system state
      try {
        const wasModified = await window.electronAPI.syncDocumentReview(spec.path);
        if (wasModified) {
          console.log('[specDetailStore] Auto-synced documentReview state', { spec: spec.name });
          const updatedSpecJson = await window.electronAPI.readSpecJson(spec.path);
          Object.assign(specJson, updatedSpecJson);
        }
      } catch (error) {
        console.error('[specDetailStore] Failed to sync documentReview:', error);
      }

      const specDetail: SpecDetail = {
        metadata: spec,
        specJson,
        artifacts: {
          requirements,
          design,
          tasks,
          research,
          inspection,
        },
        taskProgress,
      };

      if (silent) {
        set({ selectedSpec: spec, specDetail });
      } else {
        set({ specDetail, isLoading: false });
      }
    } catch (error) {
      if (!silent) {
        set({
          error: error instanceof Error ? error.message : 'Failed to load spec detail',
          isLoading: false,
        });
      } else {
        console.error('[specDetailStore] Failed to refresh spec detail:', error);
      }
    }
  },

  /**
   * Clear selected spec
   * Requirement 2.4: clearSelectedSpec action to reset selection
   */
  clearSelectedSpec: () => {
    set({ selectedSpec: null, specDetail: null });
  },

  /**
   * Refresh spec detail by re-reading spec.json
   */
  refreshSpecDetail: async () => {
    const { selectedSpec } = get();

    if (!selectedSpec) {
      return;
    }

    try {
      await get().selectSpec(selectedSpec, { silent: true });
      console.log('[specDetailStore] refreshSpecDetail completed:', selectedSpec.name);
    } catch (error) {
      console.error('[specDetailStore] Failed to refresh spec detail:', error);
    }
  },

  // Internal setters for SpecSyncService

  /**
   * Set specDetail directly
   */
  setSpecDetail: (detail: SpecDetail) => {
    set({ specDetail: detail });
  },

  /**
   * Set specJson in specDetail
   */
  setSpecJson: (specJson: SpecDetail['specJson']) => {
    const { specDetail } = get();
    if (!specDetail) return;

    set({
      specDetail: {
        ...specDetail,
        specJson,
      },
    });
  },

  /**
   * Set artifact in specDetail
   */
  setArtifact: (type: ArtifactType, info: ArtifactInfo | null) => {
    const { specDetail } = get();
    if (!specDetail) return;

    set({
      specDetail: {
        ...specDetail,
        artifacts: {
          ...specDetail.artifacts,
          [type]: info,
        },
      },
    });
  },

  /**
   * Set taskProgress in specDetail
   */
  setTaskProgress: (progress: TaskProgress | null) => {
    const { specDetail } = get();
    if (!specDetail) return;

    set({
      specDetail: {
        ...specDetail,
        taskProgress: progress,
      },
    });
  },
}));
