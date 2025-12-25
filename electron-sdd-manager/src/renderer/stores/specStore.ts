/**
 * Spec Store
 * Manages spec list and detail state
 * Requirements: 2.1-2.6, 3.1-3.5, 5.2-5.8
 */

import { create } from 'zustand';
import type { SpecMetadata, SpecDetail, SpecPhase, ArtifactInfo, TaskProgress, AutoExecutionStatus } from '../types';
import type { WorkflowPhase } from '../types/workflow';

/** spec-manager用フェーズタイプ */
export type SpecManagerPhase = 'requirements' | 'design' | 'tasks' | 'impl';

/** impl用タスクステータス */
export type ImplTaskStatus =
  | 'pending'      // 未実行
  | 'running'      // 実行中
  | 'continuing'   // continue中（リトライ中）
  | 'success'      // 完了
  | 'error'        // エラー終了
  | 'stalled';     // リトライ上限到達（完了報告なし）

/** impl完了解析結果 */
export interface CheckImplResult {
  readonly status: 'success';
  readonly completedTasks: readonly string[];
  readonly stats: {
    readonly num_turns: number;
    readonly duration_ms: number;
    readonly total_cost_usd: number;
  };
}

/** spec-manager実行状態 */
export interface SpecManagerExecutionState {
  readonly isRunning: boolean;
  readonly currentPhase: SpecManagerPhase | null;
  readonly currentSpecId: string | null;
  readonly lastCheckResult: CheckImplResult | null;
  readonly error: string | null;
  readonly implTaskStatus: ImplTaskStatus | null;
  readonly retryCount: number;
  readonly executionMode: 'auto' | 'manual' | null;
}

/**
 * spec-scoped-auto-execution-state Task 5.1: Auto Execution Runtime State
 * Runtime state for auto-execution (not persisted to spec.json)
 * This replaces the fields removed from workflowStore
 */
export interface AutoExecutionRuntimeState {
  /** 自動実行中フラグ */
  readonly isAutoExecuting: boolean;
  /** 現在の自動実行フェーズ */
  readonly currentAutoPhase: WorkflowPhase | null;
  /** 自動実行の詳細状態 */
  readonly autoExecutionStatus: AutoExecutionStatus;
}

interface SpecState {
  specs: SpecMetadata[];
  selectedSpec: SpecMetadata | null;
  specDetail: SpecDetail | null;
  sortBy: 'name' | 'updatedAt' | 'phase';
  sortOrder: 'asc' | 'desc';
  statusFilter: SpecPhase | 'all';
  isLoading: boolean;
  error: string | null;
  isWatching: boolean;
  // spec-manager extensions
  specManagerExecution: SpecManagerExecutionState;
  // spec-scoped-auto-execution-state Task 5.1: Runtime auto-execution state
  autoExecutionRuntime: AutoExecutionRuntimeState;
}

interface SpecActions {
  loadSpecs: (projectPath: string) => Promise<void>;
  selectSpec: (spec: SpecMetadata, options?: { silent?: boolean }) => Promise<void>;
  clearSelectedSpec: () => void;
  setSortBy: (sortBy: SpecState['sortBy']) => void;
  setSortOrder: (order: SpecState['sortOrder']) => void;
  setStatusFilter: (filter: SpecState['statusFilter']) => void;
  refreshSpecs: () => Promise<void>;
  getSortedFilteredSpecs: () => SpecMetadata[];
  startWatching: () => Promise<void>;
  stopWatching: () => Promise<void>;
  // Unified project selection support (unified-project-selection feature)
  // Requirements: 3.1
  setSpecs: (specs: SpecMetadata[]) => void;
  // spec-scoped-auto-execution-state Task 4.3
  // Requirements: 6.3
  refreshSpecDetail: () => Promise<void>;
  // spec-scoped-auto-execution-state Task 5.1: Auto execution runtime state actions
  setAutoExecutionRunning: (isRunning: boolean) => void;
  setAutoExecutionPhase: (phase: WorkflowPhase | null) => void;
  setAutoExecutionStatus: (status: AutoExecutionStatus) => void;
  startAutoExecution: () => void;
  stopAutoExecution: () => void;
  // spec-manager extensions
  executeSpecManagerGeneration: (
    specId: string,
    phase: SpecManagerPhase,
    featureName: string,
    taskId: string | undefined,
    executionMode: 'auto' | 'manual'
  ) => Promise<void>;
  handleCheckImplResult: (result: CheckImplResult) => void;
  updateImplTaskStatus: (status: ImplTaskStatus, retryCount?: number) => void;
  clearSpecManagerError: () => void;
}

type SpecStore = SpecState & SpecActions;

// Cleanup function for specs watcher
let watcherCleanup: (() => void) | null = null;

/** spec-manager実行状態の初期値 */
const initialSpecManagerExecution: SpecManagerExecutionState = {
  isRunning: false,
  currentPhase: null,
  currentSpecId: null,
  lastCheckResult: null,
  error: null,
  implTaskStatus: null,
  retryCount: 0,
  executionMode: null,
};

/** spec-scoped-auto-execution-state Task 5.1: Auto execution runtime state initial value */
const initialAutoExecutionRuntime: AutoExecutionRuntimeState = {
  isAutoExecuting: false,
  currentAutoPhase: null,
  autoExecutionStatus: 'idle',
};

export const useSpecStore = create<SpecStore>((set, get) => ({
  // Initial state
  specs: [],
  selectedSpec: null,
  specDetail: null,
  sortBy: 'updatedAt',
  sortOrder: 'desc',
  statusFilter: 'all',
  isLoading: false,
  error: null,
  isWatching: false,
  specManagerExecution: initialSpecManagerExecution,
  // spec-scoped-auto-execution-state Task 5.1: Auto execution runtime state
  autoExecutionRuntime: initialAutoExecutionRuntime,

  // Actions
  loadSpecs: async (projectPath: string) => {
    set({ isLoading: true, error: null });

    try {
      // Read specs directly without calling setProjectPath
      // Note: setProjectPath is now handled by unified selectProject IPC
      const specs = await window.electronAPI.readSpecs(projectPath);
      set({ specs, isLoading: false });

      // Start watching for changes automatically
      await get().startWatching();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '仕様の読み込みに失敗しました',
        isLoading: false,
      });
    }
  },

  // ============================================================
  // Unified Project Selection Support (unified-project-selection feature)
  // Requirements: 3.1
  // ============================================================

  /**
   * Set specs directly from IPC result
   * Used by projectStore.selectProject to update specs without re-fetching
   */
  setSpecs: (specs: SpecMetadata[]) => {
    set({ specs, isLoading: false, error: null });
  },

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

      const [requirements, design, tasks, research] = await Promise.all([
        getArtifactInfo('requirements'),
        getArtifactInfo('design'),
        getArtifactInfo('tasks'),
        getArtifactInfo('research'),
      ]);

      // Calculate task progress from tasks.md content
      // Only match tasks at line start (excluding code examples in backticks)
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
        console.log('[specStore] Task progress calculated:', { spec: spec.name, taskProgress, silent: options?.silent });

        // Auto-fix spec.json phase if task completion doesn't match phase
        // Note: skipTimestamp: true to avoid updating updated_at for UI auto-correction
        if (total > 0) {
          const currentPhase = specJson.phase;
          const isAllComplete = completed === total;
          const hasStartedImpl = completed > 0;

          // If all tasks complete but phase is not implementation-complete, fix it
          if (isAllComplete && currentPhase !== 'implementation-complete') {
            console.log('[specStore] Auto-fixing phase to implementation-complete', { spec: spec.name, currentPhase });
            try {
              await window.electronAPI.syncSpecPhase(spec.path, 'impl-complete', { skipTimestamp: true });
              specJson.phase = 'implementation-complete';
            } catch (error) {
              console.error('[specStore] Failed to auto-fix phase:', error);
            }
          }
          // If some tasks started but phase is still tasks-generated, fix to implementation-in-progress
          else if (hasStartedImpl && !isAllComplete && currentPhase === 'tasks-generated') {
            console.log('[specStore] Auto-fixing phase to implementation-in-progress', { spec: spec.name, currentPhase });
            try {
              await window.electronAPI.syncSpecPhase(spec.path, 'impl', { skipTimestamp: true });
              specJson.phase = 'implementation-in-progress';
            } catch (error) {
              console.error('[specStore] Failed to auto-fix phase:', error);
            }
          }
        }
      }

      // Auto-sync documentReview field with file system state
      // Detects document-review-*.md files and updates spec.json if needed
      try {
        const wasModified = await window.electronAPI.syncDocumentReview(spec.path);
        if (wasModified) {
          console.log('[specStore] Auto-synced documentReview state', { spec: spec.name });
          // Re-read specJson to get updated documentReview field
          const updatedSpecJson = await window.electronAPI.readSpecJson(spec.path);
          Object.assign(specJson, updatedSpecJson);
        }
      } catch (error) {
        console.error('[specStore] Failed to sync documentReview:', error);
      }

      const specDetail: SpecDetail = {
        metadata: spec,
        specJson,
        artifacts: {
          requirements,
          design,
          tasks,
          research,
        },
        taskProgress,
      };

      if (silent) {
        console.log('[specStore] Setting specDetail (silent):', { spec: spec.name, taskProgress: specDetail.taskProgress });
        set({ selectedSpec: spec, specDetail });
      } else {
        console.log('[specStore] Setting specDetail:', { spec: spec.name, taskProgress: specDetail.taskProgress });
        set({ specDetail, isLoading: false });
      }

      // spec-scoped-auto-execution-state: Sync autoExecution state to workflowStore
      // Import and sync after setting specDetail to avoid circular dependency issues
      try {
        const { getAutoExecutionService } = await import('../services/AutoExecutionService');
        const service = getAutoExecutionService();
        service.syncFromSpecAutoExecution();
      } catch (syncError) {
        console.error('[specStore] Failed to sync autoExecution state:', syncError);
      }
    } catch (error) {
      if (!silent) {
        set({
          error: error instanceof Error ? error.message : '仕様詳細の読み込みに失敗しました',
          isLoading: false,
        });
      } else {
        console.error('Failed to refresh spec detail:', error);
      }
    }
  },

  clearSelectedSpec: () => {
    set({ selectedSpec: null, specDetail: null });
  },

  setSortBy: (sortBy: SpecState['sortBy']) => {
    set({ sortBy });
  },

  setSortOrder: (order: SpecState['sortOrder']) => {
    set({ sortOrder: order });
  },

  setStatusFilter: (filter: SpecState['statusFilter']) => {
    set({ statusFilter: filter });
  },

  refreshSpecs: async () => {
    // SSOT: Get project path from projectStore (single source of truth)
    // Dynamic import to avoid circular dependency
    const { useProjectStore } = await import('./projectStore');
    const currentProject = useProjectStore.getState().currentProject;

    if (currentProject) {
      // Re-read specs without triggering full loading state
      try {
        const specs = await window.electronAPI.readSpecs(currentProject);
        set({ specs });

        // Also refresh selected spec detail if one is selected
        const { selectedSpec } = get();
        if (selectedSpec) {
          // Find updated metadata for the selected spec
          const updatedSpec = specs.find((s) => s.path === selectedSpec.path);
          if (updatedSpec) {
            // Re-select to refresh detail pane (silent mode for smoother UX)
            await get().selectSpec(updatedSpec, { silent: true });
          }
        }
      } catch (error) {
        console.error('Failed to refresh specs:', error);
      }
    }
  },

  startWatching: async () => {
    // Clean up existing listener if any
    if (watcherCleanup) {
      watcherCleanup();
      watcherCleanup = null;
    }

    try {
      // Note: Watcher is now started by Main process in SELECT_PROJECT IPC handler
      // (unified-project-selection Task 1.4)
      // Here we only register the event listener

      // Subscribe to change events
      watcherCleanup = window.electronAPI.onSpecsChanged((event) => {
        console.log('[specStore] Specs changed:', event);

        // Check if changed spec is the currently selected one
        const { selectedSpec } = get();
        const isSelectedSpecChanged = selectedSpec && event.specId === selectedSpec.name;

        if (isSelectedSpecChanged) {
          console.log('[specStore] Selected spec changed, refreshing specDetail:', event.specId);
        }

        // Refresh specs list and detail if selected
        get().refreshSpecs();
      });

      set({ isWatching: true });
      console.log('[specStore] Specs change listener registered');
    } catch (error) {
      console.error('[specStore] Failed to register specs change listener:', error);
    }
  },

  stopWatching: async () => {
    if (watcherCleanup) {
      watcherCleanup();
      watcherCleanup = null;
    }

    try {
      await window.electronAPI.stopSpecsWatcher();
      set({ isWatching: false });
      console.log('[specStore] Specs watcher stopped');
    } catch (error) {
      console.error('[specStore] Failed to stop specs watcher:', error);
    }
  },

  getSortedFilteredSpecs: () => {
    const { specs, sortBy, sortOrder, statusFilter } = get();

    // Filter
    let filtered = specs;
    if (statusFilter !== 'all') {
      filtered = specs.filter((spec) => spec.phase === statusFilter);
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'phase':
          comparison = a.phase.localeCompare(b.phase);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  },

  // ============================================================
  // spec-scoped-auto-execution-state Task 4.3
  // Requirements: 6.3
  // ============================================================

  /**
   * Refresh specDetail by re-reading spec.json
   * Used when external changes are detected (e.g., FileWatcher notification)
   * Also syncs autoExecution state to workflowStore
   */
  refreshSpecDetail: async () => {
    const { selectedSpec } = get();

    // Do nothing if no spec is selected
    if (!selectedSpec) {
      return;
    }

    try {
      // Re-select the spec with silent mode to refresh without full loading state
      await get().selectSpec(selectedSpec, { silent: true });
      console.log('[specStore] refreshSpecDetail completed:', selectedSpec.name);
    } catch (error) {
      console.error('[specStore] Failed to refresh spec detail:', error);
      // Preserve existing specDetail on error (graceful failure)
    }
  },

  // ============================================================
  // spec-manager Extensions
  // Requirements: 5.2, 5.3, 5.4, 5.5, 5.7, 5.8
  // ============================================================

  /**
   * Execute spec-manager generation command
   * Requirements: 5.2, 5.3
   */
  executeSpecManagerGeneration: async (
    specId: string,
    phase: SpecManagerPhase,
    featureName: string,
    taskId: string | undefined,
    executionMode: 'auto' | 'manual'
  ) => {
    const { specManagerExecution } = get();

    // Check if already running - prevent concurrent operations
    if (specManagerExecution.isRunning) {
      console.warn('[specStore] spec-manager operation already running');
      return;
    }

    // Set running state
    set({
      specManagerExecution: {
        ...initialSpecManagerExecution,
        isRunning: true,
        currentPhase: phase,
        currentSpecId: specId,
        executionMode,
        implTaskStatus: phase === 'impl' ? 'running' : null,
      },
    });

    try {
      // Call main process to execute spec-manager phase
      // Use existing executePhase API for phase execution
      if (phase === 'impl' && taskId) {
        await window.electronAPI.executeTaskImpl(specId, featureName, taskId);
      } else {
        await window.electronAPI.executePhase(specId, phase, featureName);
      }

      // Note: Actual completion handling is done via IPC callbacks
      // The running state will be updated when the agent completes

    } catch (error) {
      // Set error state
      set({
        specManagerExecution: {
          ...get().specManagerExecution,
          isRunning: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          implTaskStatus: 'error',
        },
      });
    }
  },

  /**
   * Handle impl completion result from ImplCompletionAnalyzer
   * Requirements: 5.4, 5.5
   */
  handleCheckImplResult: (result: CheckImplResult) => {
    set({
      specManagerExecution: {
        ...get().specManagerExecution,
        isRunning: false,
        lastCheckResult: result,
        implTaskStatus: 'success',
        error: null,
      },
    });
  },

  /**
   * Update impl task status
   * Requirements: 5.7, 5.8
   */
  updateImplTaskStatus: (status: ImplTaskStatus, retryCount?: number) => {
    const current = get().specManagerExecution;
    set({
      specManagerExecution: {
        ...current,
        implTaskStatus: status,
        retryCount: retryCount !== undefined ? retryCount : current.retryCount,
        isRunning: status === 'running' || status === 'continuing',
      },
    });
  },

  /**
   * Clear spec-manager error
   * Requirements: 5.5
   */
  clearSpecManagerError: () => {
    set({
      specManagerExecution: {
        ...get().specManagerExecution,
        error: null,
        implTaskStatus: null,
      },
    });
  },

  // ============================================================
  // spec-scoped-auto-execution-state Task 5.1: Auto Execution Runtime Actions
  // These actions replace the removed workflowStore actions
  // ============================================================

  /**
   * Set auto execution running state
   */
  setAutoExecutionRunning: (isRunning: boolean) => {
    set({
      autoExecutionRuntime: {
        ...get().autoExecutionRuntime,
        isAutoExecuting: isRunning,
      },
    });
  },

  /**
   * Set current auto execution phase
   */
  setAutoExecutionPhase: (phase: WorkflowPhase | null) => {
    set({
      autoExecutionRuntime: {
        ...get().autoExecutionRuntime,
        currentAutoPhase: phase,
      },
    });
  },

  /**
   * Set auto execution status
   */
  setAutoExecutionStatus: (status: AutoExecutionStatus) => {
    set({
      autoExecutionRuntime: {
        ...get().autoExecutionRuntime,
        autoExecutionStatus: status,
      },
    });
  },

  /**
   * Start auto execution
   */
  startAutoExecution: () => {
    set({
      autoExecutionRuntime: {
        ...get().autoExecutionRuntime,
        isAutoExecuting: true,
        autoExecutionStatus: 'running',
      },
    });
  },

  /**
   * Stop auto execution
   */
  stopAutoExecution: () => {
    set({
      autoExecutionRuntime: {
        isAutoExecuting: false,
        currentAutoPhase: null,
        autoExecutionStatus: 'idle',
      },
    });
  },
}));
