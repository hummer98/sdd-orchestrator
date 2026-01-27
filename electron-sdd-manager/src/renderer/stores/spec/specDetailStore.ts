/**
 * SpecDetailStore
 * Manages selected Spec detail state
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8
 * debatex-document-review: 3.2 - Scheme resolution logic
 */

import { create } from 'zustand';
import type { SpecMetadata, SpecDetail, ArtifactInfo, TaskProgress, ParallelTaskInfo } from '../../types';
import { getLatestInspectionReportFile, normalizeInspectionState } from '../../types/inspection';
import type { SpecDetailState, SpecDetailActions, ArtifactType } from './types';
import { DEFAULT_SPEC_DETAIL_STATE } from './types';
import { useEditorStore } from '../editorStore';
import { DEFAULT_REVIEWER_SCHEME, type ReviewerScheme } from '@shared/registry';
import { parseTasksContent } from '@shared/utils/taskParallelParser';

type SpecDetailStore = SpecDetailState & SpecDetailActions;

// ============================================================
// debatex-document-review Task 3.2: Scheme Resolution Selector
// Requirements: 3.2.1, 3.2.2, 3.2.3, 3.2.4
// ============================================================

/**
 * Extended specJson type for accessing documentReview.scheme
 */
interface ExtendedSpecJson {
  documentReview?: {
    scheme?: ReviewerScheme;
  };
}

/**
 * Get resolved reviewer scheme with priority order:
 * 1. specJson.documentReview.scheme (highest priority)
 * 2. projectDefaultScheme (from projectDefaults.json)
 * 3. DEFAULT_REVIEWER_SCHEME (fallback)
 *
 * @param state - SpecDetailState
 * @returns Resolved ReviewerScheme
 */
export function getResolvedScheme(state: SpecDetailState): ReviewerScheme {
  // Priority 1: specJson.documentReview.scheme
  const specDetail = state.specDetail;
  if (specDetail?.specJson) {
    const extendedSpecJson = specDetail.specJson as ExtendedSpecJson;
    if (extendedSpecJson.documentReview?.scheme) {
      return extendedSpecJson.documentReview.scheme;
    }
  }

  // Priority 2: projectDefaultScheme
  if (state.projectDefaultScheme) {
    return state.projectDefaultScheme;
  }

  // Priority 3: DEFAULT_REVIEWER_SCHEME
  return DEFAULT_REVIEWER_SCHEME;
}

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
    const timings: Record<string, number> = {};
    const startTotal = performance.now();

    if (!silent) {
      // Bug fix: spec-item-flash-wrong-content - clear specDetail immediately
      // to prevent showing old spec's artifacts while loading new spec
      set({ selectedSpec: spec, specDetail: null, isLoading: true, error: null });
    }

    try {
      // Bug fix: bugs-agent-list-not-updating (also applies to specs)
      // Switch agent watcher scope to this spec's directory for real-time updates
      // agent-watcher-optimization Task 4.2
      const t0 = performance.now();
      await window.electronAPI.switchAgentWatchScope(spec.name);
      timings['switchAgentWatchScope'] = performance.now() - t0;

      // agent-watcher-optimization Task 4.2: Auto-select agent for this spec
      // Import and call autoSelectAgentForSpec from shared agentStore
      const { useSharedAgentStore } = await import('../../../shared/stores/agentStore');
      useSharedAgentStore.getState().autoSelectAgentForSpec(spec.name);
      console.log('[specDetailStore] Auto-selected agent for spec:', spec.name);

      // spec-path-ssot-refactor: Use spec.name instead of spec.path
      const t1 = performance.now();
      const specJson = await window.electronAPI.readSpecJson(spec.name);
      timings['readSpecJson'] = performance.now() - t1;

      // Get artifact info with content for tasks
      // spec-path-ssot-refactor: Use (specName, filename) instead of full path
      const getArtifactInfo = async (name: string): Promise<ArtifactInfo | null> => {
        try {
          const content = await window.electronAPI.readArtifact(spec.name, `${name}.md`);
          return { exists: true, updatedAt: null, content };
        } catch {
          return null;
        }
      };

      // Helper to get inspection artifact from spec.json inspection field
      // Bug fix: inspection-state-data-model - normalize inspection state
      // spec-path-ssot-refactor: Use (specName, filename) instead of full path
      const getInspectionArtifact = async (): Promise<ArtifactInfo | null> => {
        const normalizedInspection = normalizeInspectionState(specJson.inspection);
        const reportFile = getLatestInspectionReportFile(normalizedInspection);
        if (!reportFile) {
          return null;
        }

        try {
          const content = await window.electronAPI.readArtifact(spec.name, reportFile);
          return { exists: true, updatedAt: null, content };
        } catch {
          return null;
        }
      };

      const t2 = performance.now();
      const [requirements, design, tasks, research, inspection] = await Promise.all([
        getArtifactInfo('requirements'),
        getArtifactInfo('design'),
        getArtifactInfo('tasks'),
        getArtifactInfo('research'),
        getInspectionArtifact(),
      ]);
      timings['readArtifacts'] = performance.now() - t2;

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
        // Bug fix: spec-phase-downgrade-on-select - don't downgrade advanced phases
        if (total > 0) {
          const currentPhase = specJson.phase;
          const isAllComplete = completed === total;
          const advancedPhases = ['implementation-complete', 'inspection-complete', 'deploy-complete'];

          if (isAllComplete && !advancedPhases.includes(currentPhase)) {
            console.log('[specDetailStore] Auto-fixing phase to implementation-complete', { spec: spec.name, currentPhase });
            try {
              // spec-path-ssot-refactor: Use spec.name instead of spec.path
              await window.electronAPI.syncSpecPhase(spec.name, 'impl-complete', { skipTimestamp: true });
              specJson.phase = 'implementation-complete';
            } catch (error) {
              console.error('[specDetailStore] Failed to auto-fix phase:', error);
            }
          }
        }
      }

      // Calculate parallel task info from tasks.md content using shared parser
      let parallelTaskInfo: ParallelTaskInfo | null = null;
      if (tasks?.content) {
        const parseResult = parseTasksContent(tasks.content);
        parallelTaskInfo = {
          parallelTasks: parseResult.parallelTasks,
          totalTasks: parseResult.totalTasks,
          groups: parseResult.groups,
        };
        console.log('[specDetailStore] Parallel task info calculated:', { spec: spec.name, parallelTaskInfo });
      }

      // Auto-sync documentReview field with file system state
      // spec-path-ssot-refactor: Use spec.name instead of spec.path
      const t3 = performance.now();
      try {
        const wasModified = await window.electronAPI.syncDocumentReview(spec.name);
        timings['syncDocumentReview'] = performance.now() - t3;
        if (wasModified) {
          console.log('[specDetailStore] Auto-synced documentReview state', { spec: spec.name });
          const updatedSpecJson = await window.electronAPI.readSpecJson(spec.name);
          Object.assign(specJson, updatedSpecJson);
        }
      } catch (error) {
        timings['syncDocumentReview'] = performance.now() - t3;
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
        parallelTaskInfo,
      };

      // Bug fix: auto-execution-flag-cross-spec-contamination
      // Removed workflowStore sync code - spec.json is now the Single Source of Truth
      // UI reads directly from spec.json via useElectronWorkflowState hook

      timings['total'] = performance.now() - startTotal;
      console.log('[specDetailStore] selectSpec timings:', { spec: spec.name, timings });
      // Debug: save to global for inspection
      (window as unknown as { __selectSpecTimings: unknown[] }).__selectSpecTimings = (window as unknown as { __selectSpecTimings: unknown[] }).__selectSpecTimings || [];
      (window as unknown as { __selectSpecTimings: unknown[] }).__selectSpecTimings.push({ spec: spec.name, timings, timestamp: Date.now() });

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
   * Bug fix: spec-item-flash-wrong-content - also clear editor content
   * agent-watcher-optimization Task 4.3: Clear watch scope on deselection
   */
  clearSelectedSpec: () => {
    set({ selectedSpec: null, specDetail: null });
    // Clear editor content to prevent showing old spec's content when switching projects
    useEditorStore.getState().clearEditor();
    // agent-watcher-optimization Task 4.3: Clear spec watch scope
    // Only ProjectAgent monitoring will continue
    window.electronAPI.switchAgentWatchScope(null).catch((error) => {
      console.error('[specDetailStore] Failed to clear agent watch scope:', error);
    });
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

  /**
   * Set parallelTaskInfo in specDetail
   */
  setParallelTaskInfo: (info: ParallelTaskInfo | null) => {
    const { specDetail } = get();
    if (!specDetail) return;

    set({
      specDetail: {
        ...specDetail,
        parallelTaskInfo: info,
      },
    });
  },

  /**
   * debatex-document-review Task 3.2: Set project default scheme
   * Called when project is selected and projectDefaults.json is loaded
   */
  setProjectDefaultScheme: (scheme: ReviewerScheme | undefined) => {
    set({ projectDefaultScheme: scheme });
  },
}));
