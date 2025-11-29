/**
 * Spec Store
 * Manages spec list and detail state
 * Requirements: 2.1-2.6, 3.1-3.5, 5.2-5.8
 */

import { create } from 'zustand';
import type { SpecMetadata, SpecDetail, SpecPhase, ArtifactInfo, TaskProgress } from '../types';

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

// Store the current project path for refresh
let currentProjectPath: string | null = null;

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

  // Actions
  loadSpecs: async (projectPath: string) => {
    currentProjectPath = projectPath;
    set({ isLoading: true, error: null });

    try {
      // Initialize SpecManagerService on main process
      await window.electronAPI.setProjectPath(projectPath);
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

        // Auto-fix spec.json phase if task completion doesn't match phase
        if (total > 0) {
          const currentPhase = specJson.phase;
          const isAllComplete = completed === total;
          const hasStartedImpl = completed > 0;

          // If all tasks complete but phase is not implementation-complete, fix it
          if (isAllComplete && currentPhase !== 'implementation-complete') {
            console.log('[specStore] Auto-fixing phase to implementation-complete', { spec: spec.name, currentPhase });
            try {
              await window.electronAPI.syncSpecPhase(spec.path, 'impl-complete');
              specJson.phase = 'implementation-complete';
            } catch (error) {
              console.error('[specStore] Failed to auto-fix phase:', error);
            }
          }
          // If some tasks started but phase is still tasks-generated, fix to implementation-in-progress
          else if (hasStartedImpl && !isAllComplete && currentPhase === 'tasks-generated') {
            console.log('[specStore] Auto-fixing phase to implementation-in-progress', { spec: spec.name, currentPhase });
            try {
              await window.electronAPI.syncSpecPhase(spec.path, 'impl');
              specJson.phase = 'implementation-in-progress';
            } catch (error) {
              console.error('[specStore] Failed to auto-fix phase:', error);
            }
          }
        }
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
        set({ selectedSpec: spec, specDetail });
      } else {
        set({ specDetail, isLoading: false });
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
    if (currentProjectPath) {
      // Re-read specs without triggering full loading state
      try {
        const specs = await window.electronAPI.readSpecs(currentProjectPath);
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
    // Clean up existing watcher if any
    if (watcherCleanup) {
      watcherCleanup();
      watcherCleanup = null;
    }

    try {
      // Start watcher on main process
      await window.electronAPI.startSpecsWatcher();

      // Subscribe to change events
      watcherCleanup = window.electronAPI.onSpecsChanged((event) => {
        console.log('[specStore] Specs changed:', event);
        // Refresh specs list on any change
        get().refreshSpecs();
      });

      set({ isWatching: true });
      console.log('[specStore] Specs watcher started');
    } catch (error) {
      console.error('[specStore] Failed to start specs watcher:', error);
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
      await window.electronAPI.executeSpecManagerPhase({
        specId,
        phase,
        featureName,
        taskId,
        executionMode,
      });

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
}));
