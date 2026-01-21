/**
 * SpecStoreFacade
 * Facade that combines all decomposed spec stores and services
 * Maintains backward compatibility with existing useSpecStore interface
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 * spec-metadata-ssot-refactor: Updated to expose specJsonMap
 * execution-store-consolidation: specManagerExecutionStore REMOVED
 *   - specManagerExecution state is now derived from agentStore (SSOT)
 *   - Req 1.1, 3.1-3.4, 4.1-4.6
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { SpecMetadata, SpecJson, AutoExecutionStatus } from '../../types';
import type { WorkflowPhase } from '../../types/workflow';
import { useSpecListStore } from './specListStore';
import { useSpecDetailStore } from './specDetailStore';
import { useAutoExecutionStore } from './autoExecutionStore';
// execution-store-consolidation: specManagerExecutionStore REMOVED (Req 1.1)
// import { useSpecManagerExecutionStore } from './specManagerExecutionStore';
import { useAgentStore, type AgentInfo, type AgentStatus } from '../agentStore';
import { specSyncService } from '../../services/specSyncService';
import { specWatcherService } from '../../services/specWatcherService';
import type {
  SpecStoreState,
  SpecStoreActions,
  ArtifactType,
  SpecManagerPhase,
  ImplTaskStatus,
  // execution-store-consolidation: CheckImplResult REMOVED (Req 6.1)
  AutoExecutionRuntimeState,
  SpecManagerExecutionState,
} from './types';
import { DEFAULT_SPEC_MANAGER_EXECUTION_STATE } from './types';

type SpecStoreFacade = SpecStoreState & SpecStoreActions;

// ============================================================
// execution-store-consolidation: Derived Value Computation
// Requirements: 3.1, 3.2, 3.3, 3.4
// ============================================================

/**
 * Map AgentStatus to ImplTaskStatus (Req 3.2)
 * AgentStatus: 'running' | 'completed' | 'interrupted' | 'hang' | 'failed'
 * ImplTaskStatus: 'pending' | 'running' | 'continuing' | 'success' | 'error' | 'stalled'
 */
function mapAgentStatusToImplTaskStatus(status?: AgentStatus): ImplTaskStatus | null {
  if (!status) return null;
  switch (status) {
    case 'running':
      return 'running';
    case 'completed':
      return 'success';
    case 'failed':
      return 'error';
    case 'interrupted':
      return 'stalled';
    case 'hang':
      return 'stalled';
    default:
      return null;
  }
}

/**
 * Compute specManagerExecution state from agentStore (Req 3.1, 3.2, 3.3, 3.4)
 * This replaces the old specManagerExecutionStore
 */
function getSpecManagerExecution(specId: string | null): SpecManagerExecutionState {
  if (!specId) {
    return DEFAULT_SPEC_MANAGER_EXECUTION_STATE;
  }

  const agentState = useAgentStore.getState();
  const specAgents = agentState.getAgentsForSpec(specId);
  const runningAgents = specAgents.filter((a: AgentInfo) => a.status === 'running');

  // Sort by startedAt to get the latest running agent (Req 3.4)
  const latestRunningAgent = runningAgents
    .sort((a: AgentInfo, b: AgentInfo) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    )[0];

  return {
    isRunning: runningAgents.length > 0,
    currentPhase: latestRunningAgent?.phase as SpecManagerPhase | null,
    currentSpecId: runningAgents.length > 0 ? specId : null,
    // execution-store-consolidation: lastCheckResult REMOVED (Req 6.5)
    error: agentState.error,
    implTaskStatus: mapAgentStatusToImplTaskStatus(latestRunningAgent?.status),
    retryCount: latestRunningAgent?.retryCount ?? 0,
    executionMode: latestRunningAgent?.executionMode ?? null,
  };
}

/** Flag to track initialization status */
let isInitialized = false;

/**
 * Get aggregated state from all child stores
 * spec-metadata-ssot-refactor: Added specJsonMap to aggregated state
 * execution-store-consolidation: specManagerExecution now derived from agentStore
 */
function getAggregatedState(): SpecStoreState {
  const listState = useSpecListStore.getState();
  const detailState = useSpecDetailStore.getState();
  const autoExecState = useAutoExecutionStore.getState();
  // execution-store-consolidation: specManagerExecutionStore REMOVED (Req 1.1)
  // specManagerExecution is now computed from agentStore

  // Get current specId for derived value computation (Req 3.1)
  const currentSpecId = detailState.selectedSpec?.name ?? null;

  return {
    // SpecListStore state
    specs: listState.specs,
    specJsonMap: listState.specJsonMap,  // spec-metadata-ssot-refactor
    sortBy: listState.sortBy,
    sortOrder: listState.sortOrder,
    statusFilter: listState.statusFilter,

    // SpecDetailStore state
    // Bug fix: spec-list-loading-on-item-click
    // Separated isLoading (list) from isDetailLoading (detail panel)
    // to prevent SpecList from showing spinner when selecting a spec
    selectedSpec: detailState.selectedSpec,
    specDetail: detailState.specDetail,
    isLoading: listState.isLoading,
    isDetailLoading: detailState.isLoading,
    error: listState.error || detailState.error,

    // AutoExecutionStore state
    autoExecutionRuntimeMap: autoExecState.autoExecutionRuntimeMap,

    // execution-store-consolidation: specManagerExecution derived from agentStore (Req 3.1, 3.2)
    specManagerExecution: getSpecManagerExecution(currentSpecId),

    // Watcher state
    isWatching: specWatcherService.isWatching,
  };
}

/**
 * Initialize the facade and wire up services
 * Should be called once during app initialization
 */
export function initSpecStoreFacade(): void {
  if (isInitialized) {
    return;
  }

  // Initialize sync service with callbacks to child stores
  specSyncService.init({
    getSelectedSpec: () => useSpecDetailStore.getState().selectedSpec,
    getSpecDetail: () => useSpecDetailStore.getState().specDetail,
    setSpecJson: (specJson) => useSpecDetailStore.getState().setSpecJson(specJson),
    setArtifact: (type, info) => useSpecDetailStore.getState().setArtifact(type, info),
    setTaskProgress: (progress) => useSpecDetailStore.getState().setTaskProgress(progress),
    updateSpecMetadata: async (specId) => {
      // Dynamic import to avoid circular dependency
      const { useProjectStore } = await import('../projectStore');
      const projectPath = useProjectStore.getState().currentProject;
      if (projectPath) {
        await useSpecListStore.getState().updateSpecMetadata(specId, projectPath);
      }
    },
    editorSyncCallback: async (specPath, artifact) => {
      // Dynamic import to avoid circular dependency
      const { useEditorStore } = await import('../editorStore');
      const editorState = useEditorStore.getState();
      if (editorState.activeTab === artifact && !editorState.isDirty) {
        await editorState.loadArtifact(specPath, artifact);
      }
    },
  });

  // Initialize watcher service with dependencies
  specWatcherService.init({
    syncService: specSyncService,
    getSelectedSpec: () => useSpecDetailStore.getState().selectedSpec,
    updateSpecMetadata: async (specId) => {
      // Dynamic import to avoid circular dependency
      const { useProjectStore } = await import('../projectStore');
      const projectPath = useProjectStore.getState().currentProject;
      if (projectPath) {
        await useSpecListStore.getState().updateSpecMetadata(specId, projectPath);
      }
    },
    // spec-worktree-early-creation: Reload spec list when directory is added/removed
    reloadSpecs: async () => {
      // Dynamic import to avoid circular dependency
      const { useProjectStore } = await import('../projectStore');
      const projectPath = useProjectStore.getState().currentProject;
      if (!projectPath) {
        console.warn('[specStoreFacade] reloadSpecs: No project path');
        return;
      }

      try {
        // Fetch updated specs list from main process
        const specs = await window.electronAPI.readSpecs(projectPath);
        useSpecListStore.getState().setSpecs(specs);

        // Also update specJsonMap for each spec
        // spec-path-ssot-refactor: Use spec.name instead of spec.path
        const specJsonMap: Record<string, SpecJson> = {};
        for (const spec of specs) {
          try {
            const specJson = await window.electronAPI.readSpecJson(spec.name);
            if (specJson) {
              specJsonMap[spec.name] = specJson;
            }
          } catch {
            // Skip specs with invalid specJson
          }
        }
        useSpecListStore.getState().setSpecJsonMap(specJsonMap);

        console.log('[specStoreFacade] reloadSpecs: Reloaded', specs.length, 'specs');
      } catch (error) {
        console.error('[specStoreFacade] reloadSpecs failed:', error);
      }
    },
  });

  isInitialized = true;
  console.log('[specStoreFacade] Initialized');
}

/**
 * Facade store that aggregates all child stores
 */
export const useSpecStoreFacade = create<SpecStoreFacade>()(
  subscribeWithSelector((set) => ({
    // Initial aggregated state
    ...getAggregatedState(),

    // ============================================================
    // SpecListStore Actions (Req 7.3)
    // ============================================================

    setSpecs: (specs: SpecMetadata[]) => {
      useSpecListStore.getState().setSpecs(specs);
      set(getAggregatedState());
    },

    /** spec-metadata-ssot-refactor: Set specJsonMap directly from selectProject result */
    setSpecJsonMap: (specJsonMap: Record<string, SpecJson>) => {
      useSpecListStore.getState().setSpecJsonMap(specJsonMap);
      set(getAggregatedState());
    },

    setSortBy: (sortBy: 'name' | 'updatedAt' | 'phase') => {
      useSpecListStore.getState().setSortBy(sortBy);
      set(getAggregatedState());
    },

    setSortOrder: (order: 'asc' | 'desc') => {
      useSpecListStore.getState().setSortOrder(order);
      set(getAggregatedState());
    },

    setStatusFilter: (filter) => {
      useSpecListStore.getState().setStatusFilter(filter);
      set(getAggregatedState());
    },

    getSortedFilteredSpecs: () => {
      return useSpecListStore.getState().getSortedFilteredSpecs();
    },

    updateSpecMetadata: async (specId: string) => {
      // Dynamic import to avoid circular dependency
      const { useProjectStore } = await import('../projectStore');
      const projectPath = useProjectStore.getState().currentProject;
      if (projectPath) {
        await useSpecListStore.getState().updateSpecMetadata(specId, projectPath);
        set(getAggregatedState());
      }
    },

    // ============================================================
    // SpecDetailStore Actions (Req 7.3)
    // ============================================================

    selectSpec: async (spec: SpecMetadata, options?: { silent?: boolean }) => {
      await useSpecDetailStore.getState().selectSpec(spec, options);
      set(getAggregatedState());
    },

    clearSelectedSpec: () => {
      useSpecDetailStore.getState().clearSelectedSpec();
      set(getAggregatedState());
    },

    refreshSpecDetail: async () => {
      await useSpecDetailStore.getState().refreshSpecDetail();
      set(getAggregatedState());
    },

    /**
     * debatex-document-review Task 3.2: Set project default scheme
     */
    setProjectDefaultScheme: (scheme: import('@shared/registry').ReviewerScheme | undefined) => {
      useSpecDetailStore.getState().setProjectDefaultScheme(scheme);
      set(getAggregatedState());
    },

    // Note: refreshSpecs removed - File Watcher handles spec updates automatically

    // ============================================================
    // AutoExecutionStore Actions (Req 7.4)
    // ============================================================

    getAutoExecutionRuntime: (specId: string): AutoExecutionRuntimeState => {
      return useAutoExecutionStore.getState().getAutoExecutionRuntime(specId);
    },

    setAutoExecutionRunning: (specId: string, isRunning: boolean) => {
      useAutoExecutionStore.getState().setAutoExecutionRunning(specId, isRunning);
      set(getAggregatedState());
    },

    setAutoExecutionPhase: (specId: string, phase: WorkflowPhase | null) => {
      useAutoExecutionStore.getState().setAutoExecutionPhase(specId, phase);
      set(getAggregatedState());
    },

    setAutoExecutionStatus: (specId: string, status: AutoExecutionStatus) => {
      useAutoExecutionStore.getState().setAutoExecutionStatus(specId, status);
      set(getAggregatedState());
    },

    startAutoExecution: (specId: string) => {
      useAutoExecutionStore.getState().startAutoExecution(specId);
      set(getAggregatedState());
    },

    stopAutoExecution: (specId: string) => {
      useAutoExecutionStore.getState().stopAutoExecution(specId);
      set(getAggregatedState());
    },

    // ============================================================
    // SpecManagerExecution Actions
    // execution-store-consolidation: Actions now operate on agentStore (Req 4.2-4.6)
    // specManagerExecution state is derived from agentStore, not stored separately
    // ============================================================

    executeSpecManagerGeneration: async (
      specId: string,
      phase: SpecManagerPhase,
      featureName: string,
      taskId: string | undefined,
      _executionMode: 'auto' | 'manual'
    ) => {
      // execution-store-consolidation: Execution is now handled via IPC
      // The agentStore will be updated via onAgentRecordChanged callback
      // when the agent starts. We just call the IPC here.
      // execute-method-unification: Task 5.2 - Use unified execute API
      try {
        if (phase === 'impl' && taskId) {
          // Use unified execute API for impl phase
          await window.electronAPI.execute({
            type: 'impl',
            specId,
            featureName,
            taskId,
          });
        } else {
          // Use unified execute API for other phases
          // Cast phase to the appropriate type (requirements, design, tasks)
          await window.electronAPI.execute({
            type: phase as 'requirements' | 'design' | 'tasks',
            specId,
            featureName,
          });
        }
        // Note: Agent state is updated via IPC callbacks, no need to update here
        set(getAggregatedState());
      } catch (error) {
        // Error is handled via agentStore.error
        console.error('[specStoreFacade] executeSpecManagerGeneration error:', error);
        set(getAggregatedState());
      }
    },

    // execution-store-consolidation: handleCheckImplResult REMOVED (Req 6.4)
    // Task completion state is managed via TaskProgress from tasks.md

    updateImplTaskStatus: (_status: ImplTaskStatus, _retryCount?: number) => {
      // execution-store-consolidation: This is now a no-op (Req 4.5)
      // Status is derived from agentStore, not stored separately
      // The agentStore is updated via IPC callbacks from Main Process
      console.warn('[specStoreFacade] updateImplTaskStatus is deprecated - status is derived from agentStore');
      set(getAggregatedState());
    },

    clearSpecManagerError: () => {
      // execution-store-consolidation: Clear error in agentStore (Req 4.6)
      useAgentStore.getState().clearError();
      set(getAggregatedState());
    },

    // ============================================================
    // Watcher Actions (Req 7.5, 7.6)
    // ============================================================

    startWatching: async () => {
      initSpecStoreFacade();
      await specWatcherService.startWatching();
      set(getAggregatedState());
    },

    stopWatching: async () => {
      await specWatcherService.stopWatching();
      set(getAggregatedState());
    },

    // ============================================================
    // Sync Actions (delegated to services)
    // ============================================================

    updateSpecJson: async () => {
      initSpecStoreFacade();
      await specSyncService.updateSpecJson();
      set(getAggregatedState());
    },

    updateArtifact: async (artifact: ArtifactType) => {
      initSpecStoreFacade();
      await specSyncService.updateArtifact(artifact);
      set(getAggregatedState());
    },

    syncDocumentReviewState: async () => {
      initSpecStoreFacade();
      await specSyncService.syncDocumentReviewState();
      set(getAggregatedState());
    },

    syncInspectionState: async () => {
      initSpecStoreFacade();
      await specSyncService.syncInspectionState();
      set(getAggregatedState());
    },

    syncTaskProgress: async () => {
      initSpecStoreFacade();
      await specSyncService.syncTaskProgress();
      set(getAggregatedState());
    },
  }))
);

// Subscribe to child store changes to update facade state
useSpecListStore.subscribe(() => {
  useSpecStoreFacade.setState(getAggregatedState());
});

useSpecDetailStore.subscribe(() => {
  useSpecStoreFacade.setState(getAggregatedState());
});

useAutoExecutionStore.subscribe(() => {
  useSpecStoreFacade.setState(getAggregatedState());
});

// execution-store-consolidation: specManagerExecutionStore subscription REMOVED (Req 5.1)
// specManagerExecution is now derived from agentStore
// Subscribe to agentStore changes for specManagerExecution updates
useAgentStore.subscribe(() => {
  useSpecStoreFacade.setState(getAggregatedState());
});
