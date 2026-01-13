/**
 * SpecStoreFacade
 * Facade that combines all decomposed spec stores and services
 * Maintains backward compatibility with existing useSpecStore interface
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 * spec-metadata-ssot-refactor: Updated to expose specJsonMap
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { SpecMetadata, AutoExecutionStatus } from '../../types';
import type { WorkflowPhase } from '../../types/workflow';
import { useSpecListStore } from './specListStore';
import { useSpecDetailStore } from './specDetailStore';
import { useAutoExecutionStore } from './autoExecutionStore';
import { useSpecManagerExecutionStore } from './specManagerExecutionStore';
import { specSyncService } from '../../services/specSyncService';
import { specWatcherService } from '../../services/specWatcherService';
import type {
  SpecStoreState,
  SpecStoreActions,
  ArtifactType,
  SpecManagerPhase,
  ImplTaskStatus,
  CheckImplResult,
  AutoExecutionRuntimeState,
} from './types';

type SpecStoreFacade = SpecStoreState & SpecStoreActions;

/** Flag to track initialization status */
let isInitialized = false;

/**
 * Get aggregated state from all child stores
 * spec-metadata-ssot-refactor: Added specJsonMap to aggregated state
 */
function getAggregatedState(): SpecStoreState {
  const listState = useSpecListStore.getState();
  const detailState = useSpecDetailStore.getState();
  const autoExecState = useAutoExecutionStore.getState();
  const specManagerState = useSpecManagerExecutionStore.getState();

  return {
    // SpecListStore state
    specs: listState.specs,
    specJsonMap: listState.specJsonMap,  // spec-metadata-ssot-refactor
    sortBy: listState.sortBy,
    sortOrder: listState.sortOrder,
    statusFilter: listState.statusFilter,

    // SpecDetailStore state (merged isLoading/error from list store)
    selectedSpec: detailState.selectedSpec,
    specDetail: detailState.specDetail,
    isLoading: listState.isLoading || detailState.isLoading,
    error: listState.error || detailState.error,

    // AutoExecutionStore state
    autoExecutionRuntimeMap: autoExecState.autoExecutionRuntimeMap,

    // SpecManagerExecutionStore state
    specManagerExecution: {
      isRunning: specManagerState.isRunning,
      currentPhase: specManagerState.currentPhase,
      currentSpecId: specManagerState.currentSpecId,
      lastCheckResult: specManagerState.lastCheckResult,
      error: specManagerState.error,
      implTaskStatus: specManagerState.implTaskStatus,
      retryCount: specManagerState.retryCount,
      executionMode: specManagerState.executionMode,
    },

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

    loadSpecs: async (projectPath: string) => {
      await useSpecListStore.getState().loadSpecs(projectPath);
      set(getAggregatedState());
    },

    setSpecs: (specs: SpecMetadata[]) => {
      useSpecListStore.getState().setSpecs(specs);
      set(getAggregatedState());
    },

    /** spec-metadata-ssot-refactor: Load specJsons for all specs */
    loadSpecJsons: async (projectPath: string) => {
      await useSpecListStore.getState().loadSpecJsons(projectPath);
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

    refreshSpecs: async () => {
      // SSOT: Get project path from projectStore
      const { useProjectStore } = await import('../projectStore');
      const currentProject = useProjectStore.getState().currentProject;

      if (currentProject) {
        await useSpecListStore.getState().loadSpecs(currentProject);

        // Also refresh selected spec detail if one is selected
        const { selectedSpec } = useSpecDetailStore.getState();
        if (selectedSpec) {
          const specs = useSpecListStore.getState().specs;
          const updatedSpec = specs.find((s) => s.path === selectedSpec.path);
          if (updatedSpec) {
            await useSpecDetailStore.getState().selectSpec(updatedSpec, { silent: true });
          }
        }

        set(getAggregatedState());
      }
    },

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
    // SpecManagerExecutionStore Actions (Req 7.4)
    // ============================================================

    executeSpecManagerGeneration: async (
      specId: string,
      phase: SpecManagerPhase,
      featureName: string,
      taskId: string | undefined,
      executionMode: 'auto' | 'manual'
    ) => {
      await useSpecManagerExecutionStore.getState().executeSpecManagerGeneration(
        specId,
        phase,
        featureName,
        taskId,
        executionMode
      );
      set(getAggregatedState());
    },

    handleCheckImplResult: (result: CheckImplResult) => {
      useSpecManagerExecutionStore.getState().handleCheckImplResult(result);
      set(getAggregatedState());
    },

    updateImplTaskStatus: (status: ImplTaskStatus, retryCount?: number) => {
      useSpecManagerExecutionStore.getState().updateImplTaskStatus(status, retryCount);
      set(getAggregatedState());
    },

    clearSpecManagerError: () => {
      useSpecManagerExecutionStore.getState().clearSpecManagerError();
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

useSpecManagerExecutionStore.subscribe(() => {
  useSpecStoreFacade.setState(getAggregatedState());
});
