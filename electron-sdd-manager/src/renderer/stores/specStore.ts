/**
 * Spec Store
 * Manages spec list and detail state
 * Requirements: 2.1-2.6, 3.1-3.5, 5.2-5.8
 */

import { create } from 'zustand';
import type { SpecMetadata, SpecDetail, SpecPhase, ArtifactInfo, TaskProgress, AutoExecutionStatus } from '../types';
import type { WorkflowPhase } from '../types/workflow';
import { getLatestInspectionReportFile } from '../types/inspection';

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

/** Spec毎の自動実行runtime状態を管理するMap */
export type AutoExecutionRuntimeMap = Map<string, AutoExecutionRuntimeState>;

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
  // spec-scoped-auto-execution-state: Spec毎のruntime状態Map
  autoExecutionRuntimeMap: AutoExecutionRuntimeMap;
}

/** Artifact type for granular updates */
export type ArtifactType = 'requirements' | 'design' | 'tasks' | 'research';

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
  // ============================================================
  // Granular Update Methods (requirement-file-update-not-reflected fix)
  // Update only specific parts of spec without full reload
  // ============================================================
  /** Update only spec.json (phase, approvals, etc.) without reloading artifacts */
  updateSpecJson: () => Promise<void>;
  /** Update only a specific artifact (requirements.md, design.md, etc.) */
  updateArtifact: (artifact: ArtifactType) => Promise<void>;
  /** Update only spec metadata in the list (phase, updatedAt) */
  updateSpecMetadata: (specId: string) => Promise<void>;
  // ============================================================
  // Bug fix: document-review-panel-update-issues
  // Sync methods for file watcher granular updates
  // ============================================================
  /** Sync documentReview state from file system to spec.json and update UI */
  syncDocumentReviewState: () => Promise<void>;
  /** Sync inspection state and load inspection artifact */
  syncInspectionState: () => Promise<void>;
  /** Calculate task progress and auto-fix phase if needed */
  syncTaskProgress: () => Promise<void>;
  // spec-scoped-auto-execution-state: Spec毎の自動実行runtime状態アクション
  getAutoExecutionRuntime: (specId: string) => AutoExecutionRuntimeState;
  setAutoExecutionRunning: (specId: string, isRunning: boolean) => void;
  setAutoExecutionPhase: (specId: string, phase: WorkflowPhase | null) => void;
  setAutoExecutionStatus: (specId: string, status: AutoExecutionStatus) => void;
  startAutoExecution: (specId: string) => void;
  stopAutoExecution: (specId: string) => void;
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

/** spec-scoped-auto-execution-state: Spec毎のruntime状態のデフォルト値 */
const DEFAULT_AUTO_EXECUTION_RUNTIME: AutoExecutionRuntimeState = {
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
  // spec-scoped-auto-execution-state: Spec毎のruntime状態Map
  autoExecutionRuntimeMap: new Map<string, AutoExecutionRuntimeState>(),

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

      // Helper to get inspection artifact from spec.json inspection field (MultiRoundInspectionState)
      const getInspectionArtifact = async (): Promise<ArtifactInfo | null> => {
        const reportFile = getLatestInspectionReportFile(specJson.inspection);
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
        // Note: implementation-in-progress state was removed. Phase stays as tasks-generated during implementation.
        if (total > 0) {
          const currentPhase = specJson.phase;
          const isAllComplete = completed === total;

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
          inspection,
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

      // Note: spec-scoped-auto-execution-state sync was removed as part of
      // deprecated-auto-execution-service-cleanup. Main Process AutoExecutionCoordinator
      // now handles state management via IPC events.
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
      // Bug fix: Use granular updates based on changed file instead of full refresh
      watcherCleanup = window.electronAPI.onSpecsChanged((event) => {
        console.log('[specStore] Specs changed:', event);

        const { selectedSpec } = get();
        const isSelectedSpecChanged = selectedSpec && event.specId === selectedSpec.name;

        if (isSelectedSpecChanged && event.path) {
          // Granular update: Only update the changed file/field
          const fileName = event.path.split('/').pop() || '';
          console.log('[specStore] Selected spec changed, granular update:', { specId: event.specId, fileName });

          if (fileName === 'spec.json') {
            get().updateSpecJson();
          } else if (fileName === 'requirements.md') {
            get().updateArtifact('requirements');
          } else if (fileName === 'design.md') {
            get().updateArtifact('design');
          } else if (fileName === 'tasks.md') {
            get().updateArtifact('tasks');
            // Bug fix: document-review-panel-update-issues
            // Also sync task progress for phase auto-fix
            get().syncTaskProgress();
          } else if (fileName === 'research.md') {
            get().updateArtifact('research');
          } else if (fileName.startsWith('document-review-')) {
            // Bug fix: document-review-panel-update-issues
            // Use dedicated sync method for document review files
            console.log('[specStore] Document review file changed, syncing documentReview state:', fileName);
            get().syncDocumentReviewState();
          } else if (fileName.startsWith('inspection-')) {
            // Use dedicated sync method for inspection files
            console.log('[specStore] Inspection file changed, syncing inspection state:', fileName);
            get().syncInspectionState();
          } else {
            // Unknown file, update spec.json as fallback (may contain references)
            console.log('[specStore] Unknown file changed, updating spec.json as fallback:', fileName);
            get().updateSpecJson();
          }
        } else if (event.specId) {
          // Not the selected spec, just update metadata in the list
          get().updateSpecMetadata(event.specId);
        }
        // If no specId, ignore the event (shouldn't happen for valid spec changes)
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
  // Granular Update Methods (requirement-file-update-not-reflected fix)
  // Update only specific parts of spec without full reload
  // ============================================================

  /**
   * Update only spec.json without reloading artifacts
   * Used when spec.json changes (phase, approvals, etc.)
   * Bug fix: inspection-tab-not-displayed - Also reload inspection artifact when spec.json has inspection field
   */
  updateSpecJson: async () => {
    const { selectedSpec, specDetail } = get();

    if (!selectedSpec || !specDetail) {
      return;
    }

    try {
      console.log('[specStore] updateSpecJson: Updating spec.json only', selectedSpec.name);
      const specJson = await window.electronAPI.readSpecJson(selectedSpec.path);

      // Bug fix: inspection-tab-not-displayed
      // Also reload inspection artifact if spec.json has inspection field (MultiRoundInspectionState)
      let updatedArtifacts = specDetail.artifacts;
      const reportFile = getLatestInspectionReportFile(specJson.inspection);
      if (reportFile) {
        try {
          const artifactPath = `${selectedSpec.path}/${reportFile}`;
          const content = await window.electronAPI.readArtifact(artifactPath);
          updatedArtifacts = {
            ...specDetail.artifacts,
            inspection: { exists: true, updatedAt: null, content },
          };
          console.log('[specStore] updateSpecJson: Loaded inspection artifact', reportFile);
        } catch {
          // File doesn't exist yet or read error - set to null
          updatedArtifacts = {
            ...specDetail.artifacts,
            inspection: null,
          };
          console.log('[specStore] updateSpecJson: Inspection file not found', reportFile);
        }
      }

      // Update specJson field and optionally updated artifacts
      set({
        specDetail: {
          ...specDetail,
          specJson,
          artifacts: updatedArtifacts,
        },
      });

      // Also update metadata in specs list
      await get().updateSpecMetadata(selectedSpec.name);

      // Note: autoExecution state sync was removed as part of
      // deprecated-auto-execution-service-cleanup. Main Process AutoExecutionCoordinator
      // now handles state management via IPC events.

      console.log('[specStore] updateSpecJson completed:', selectedSpec.name);
    } catch (error) {
      console.error('[specStore] Failed to update spec.json:', error);
    }
  },

  /**
   * Update only a specific artifact without reloading spec.json
   * Used when individual .md files change
   */
  updateArtifact: async (artifact: ArtifactType) => {
    const { selectedSpec, specDetail } = get();

    if (!selectedSpec || !specDetail) {
      return;
    }

    try {
      console.log('[specStore] updateArtifact: Updating artifact only', { spec: selectedSpec.name, artifact });

      const artifactPath = `${selectedSpec.path}/${artifact}.md`;
      let artifactInfo: ArtifactInfo | null = null;

      try {
        const content = await window.electronAPI.readArtifact(artifactPath);
        artifactInfo = { exists: true, updatedAt: null, content };
      } catch {
        artifactInfo = null;
      }

      // Update only the specific artifact, preserve others
      const updatedArtifacts = {
        ...specDetail.artifacts,
        [artifact]: artifactInfo,
      };

      // Recalculate task progress if tasks.md changed
      let taskProgress = specDetail.taskProgress;
      if (artifact === 'tasks' && artifactInfo?.content) {
        const completedMatches = artifactInfo.content.match(/^- \[x\]/gim) || [];
        const pendingMatches = artifactInfo.content.match(/^- \[ \]/gm) || [];
        const total = completedMatches.length + pendingMatches.length;
        const completed = completedMatches.length;
        taskProgress = {
          total,
          completed,
          percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
        console.log('[specStore] Task progress recalculated:', { spec: selectedSpec.name, taskProgress });
      }

      set({
        specDetail: {
          ...specDetail,
          artifacts: updatedArtifacts,
          taskProgress,
        },
      });

      // Bug fix: e2e-file-watcher-test-bypass
      // Sync editorStore when the active tab matches the updated artifact
      // This ensures the editor UI reflects the file changes from file watcher
      try {
        const { useEditorStore } = await import('./editorStore');
        const editorState = useEditorStore.getState();
        if (editorState.activeTab === artifact && !editorState.isDirty) {
          // Only reload if editor is not dirty (user hasn't made changes)
          console.log('[specStore] Syncing editorStore with updated artifact:', artifact);
          await editorState.loadArtifact(selectedSpec.path, artifact);
        }
      } catch (editorError) {
        console.error('[specStore] Failed to sync editorStore:', editorError);
      }

      console.log('[specStore] updateArtifact completed:', { spec: selectedSpec.name, artifact });
    } catch (error) {
      console.error('[specStore] Failed to update artifact:', { artifact, error });
    }
  },

  /**
   * Update only spec metadata in the list (phase, updatedAt)
   * Used when a non-selected spec changes
   */
  updateSpecMetadata: async (specId: string) => {
    try {
      // Get current project path from projectStore
      const { useProjectStore } = await import('./projectStore');
      const currentProject = useProjectStore.getState().currentProject;

      if (!currentProject) {
        return;
      }

      // Re-read specs list
      const specs = await window.electronAPI.readSpecs(currentProject);
      set({ specs });

      console.log('[specStore] updateSpecMetadata completed:', specId);
    } catch (error) {
      console.error('[specStore] Failed to update spec metadata:', error);
    }
  },

  // ============================================================
  // Bug fix: document-review-panel-update-issues
  // Sync methods for file watcher granular updates
  // ============================================================

  /**
   * Sync documentReview state from file system to spec.json and update UI
   * Called when document-review-*.md files change
   */
  syncDocumentReviewState: async () => {
    const { selectedSpec, specDetail } = get();

    if (!selectedSpec || !specDetail) {
      return;
    }

    try {
      console.log('[specStore] syncDocumentReviewState: Syncing documentReview state', selectedSpec.name);

      // Sync file system state to spec.json
      const wasModified = await window.electronAPI.syncDocumentReview(selectedSpec.path);
      if (wasModified) {
        console.log('[specStore] syncDocumentReviewState: spec.json was updated');
      }

      // Always re-read spec.json to get current state
      const specJson = await window.electronAPI.readSpecJson(selectedSpec.path);

      // Update specDetail with new specJson
      set({
        specDetail: {
          ...specDetail,
          specJson,
        },
      });

      console.log('[specStore] syncDocumentReviewState completed:', selectedSpec.name);
    } catch (error) {
      console.error('[specStore] Failed to sync documentReview state:', error);
    }
  },

  /**
   * Sync inspection state and load inspection artifact
   * Called when inspection-*.md files change
   */
  syncInspectionState: async () => {
    const { selectedSpec, specDetail } = get();

    if (!selectedSpec || !specDetail) {
      return;
    }

    try {
      console.log('[specStore] syncInspectionState: Syncing inspection state', selectedSpec.name);

      // Re-read spec.json to get current inspection field
      const specJson = await window.electronAPI.readSpecJson(selectedSpec.path);

      // Load inspection artifact if exists
      let updatedArtifacts = specDetail.artifacts;
      const reportFile = getLatestInspectionReportFile(specJson.inspection);
      if (reportFile) {
        try {
          const artifactPath = `${selectedSpec.path}/${reportFile}`;
          const content = await window.electronAPI.readArtifact(artifactPath);
          updatedArtifacts = {
            ...specDetail.artifacts,
            inspection: { exists: true, updatedAt: null, content },
          };
          console.log('[specStore] syncInspectionState: Loaded inspection artifact', reportFile);
        } catch {
          updatedArtifacts = {
            ...specDetail.artifacts,
            inspection: null,
          };
          console.log('[specStore] syncInspectionState: Inspection file not found', reportFile);
        }
      }

      // Update specDetail
      set({
        specDetail: {
          ...specDetail,
          specJson,
          artifacts: updatedArtifacts,
        },
      });

      console.log('[specStore] syncInspectionState completed:', selectedSpec.name);
    } catch (error) {
      console.error('[specStore] Failed to sync inspection state:', error);
    }
  },

  /**
   * Calculate task progress and auto-fix phase if needed
   * Called when tasks.md changes
   */
  syncTaskProgress: async () => {
    const { selectedSpec, specDetail } = get();

    if (!selectedSpec || !specDetail) {
      return;
    }

    try {
      console.log('[specStore] syncTaskProgress: Syncing task progress', selectedSpec.name);

      const tasksArtifact = specDetail.artifacts.tasks;
      if (!tasksArtifact?.content) {
        return;
      }

      // Calculate task progress
      const completedMatches = tasksArtifact.content.match(/^- \[x\]/gim) || [];
      const pendingMatches = tasksArtifact.content.match(/^- \[ \]/gm) || [];
      const total = completedMatches.length + pendingMatches.length;
      const completed = completedMatches.length;
      const taskProgress: TaskProgress = {
        total,
        completed,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      };

      // Auto-fix phase if all tasks complete
      let specJson = specDetail.specJson;
      if (total > 0) {
        const isAllComplete = completed === total;
        if (isAllComplete && specJson.phase !== 'implementation-complete') {
          console.log('[specStore] syncTaskProgress: Auto-fixing phase to implementation-complete');
          try {
            await window.electronAPI.syncSpecPhase(selectedSpec.path, 'impl-complete', { skipTimestamp: true });
            specJson = await window.electronAPI.readSpecJson(selectedSpec.path);
          } catch (error) {
            console.error('[specStore] syncTaskProgress: Failed to auto-fix phase:', error);
          }
        }
      }

      // Update specDetail
      set({
        specDetail: {
          ...specDetail,
          specJson,
          taskProgress,
        },
      });

      console.log('[specStore] syncTaskProgress completed:', { spec: selectedSpec.name, taskProgress });
    } catch (error) {
      console.error('[specStore] Failed to sync task progress:', error);
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
  // spec-scoped-auto-execution-state: Spec毎の自動実行Runtime Actions
  // ============================================================

  /**
   * Get auto execution runtime state for a specific spec
   * Returns default state if not found
   */
  getAutoExecutionRuntime: (specId: string): AutoExecutionRuntimeState => {
    const map = get().autoExecutionRuntimeMap;
    return map.get(specId) ?? { ...DEFAULT_AUTO_EXECUTION_RUNTIME };
  },

  /**
   * Set auto execution running state for a specific spec
   */
  setAutoExecutionRunning: (specId: string, isRunning: boolean) => {
    const map = new Map(get().autoExecutionRuntimeMap);
    const current = map.get(specId) ?? { ...DEFAULT_AUTO_EXECUTION_RUNTIME };
    map.set(specId, { ...current, isAutoExecuting: isRunning });
    set({ autoExecutionRuntimeMap: map });
  },

  /**
   * Set current auto execution phase for a specific spec
   */
  setAutoExecutionPhase: (specId: string, phase: WorkflowPhase | null) => {
    const map = new Map(get().autoExecutionRuntimeMap);
    const current = map.get(specId) ?? { ...DEFAULT_AUTO_EXECUTION_RUNTIME };
    map.set(specId, { ...current, currentAutoPhase: phase });
    set({ autoExecutionRuntimeMap: map });
  },

  /**
   * Set auto execution status for a specific spec
   */
  setAutoExecutionStatus: (specId: string, status: AutoExecutionStatus) => {
    const map = new Map(get().autoExecutionRuntimeMap);
    const current = map.get(specId) ?? { ...DEFAULT_AUTO_EXECUTION_RUNTIME };
    map.set(specId, { ...current, autoExecutionStatus: status });
    set({ autoExecutionRuntimeMap: map });
  },

  /**
   * Start auto execution for a specific spec
   */
  startAutoExecution: (specId: string) => {
    const map = new Map(get().autoExecutionRuntimeMap);
    map.set(specId, {
      isAutoExecuting: true,
      currentAutoPhase: null,
      autoExecutionStatus: 'running',
    });
    set({ autoExecutionRuntimeMap: map });
  },

  /**
   * Stop auto execution for a specific spec
   */
  stopAutoExecution: (specId: string) => {
    const map = new Map(get().autoExecutionRuntimeMap);
    map.set(specId, {
      isAutoExecuting: false,
      currentAutoPhase: null,
      autoExecutionStatus: 'idle',
    });
    set({ autoExecutionRuntimeMap: map });
  },
}));
