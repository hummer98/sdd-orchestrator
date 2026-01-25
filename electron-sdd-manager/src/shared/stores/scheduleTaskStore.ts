/**
 * scheduleTaskStore - Shared Schedule Task Store
 *
 * Task 4.1: scheduleTaskStoreを作成
 * Requirements: 全UI, 9.2
 *
 * Renderer側状態管理（UIキャッシュ）:
 * - タスク一覧のキャッシュ管理
 * - 編集画面の状態管理
 * - IPC経由でのデータ取得・更新
 *
 * electron-store同期:
 * - 保存時: ファイル書き込み成功後にelectron-storeキャッシュ更新
 * - 読み込み時: プロジェクトファイルをマスターとし、キャッシュに反映
 * - 競合時: プロジェクトファイル優先（electron-storeはフォールバック）
 *
 * Note: electron-store同期はMain Process側のscheduleTaskFileServiceで実装済み。
 * このストアはRenderer側のキャッシュとして機能し、IPCを通じてMain Processと通信する。
 */

import { create } from 'zustand';
import type {
  ScheduleTask,
  ScheduleTaskInput,
  ScheduleTaskServiceError,
  ScheduleTaskStatusEvent,
  QueuedTask,
  RunningTaskInfo,
  ExecutionResult,
  ExecutionError,
  TaskNotFoundError,
} from '../types/scheduleTask';

// =============================================================================
// ElectronAPI Interface (subset for schedule tasks)
// =============================================================================

/**
 * Subset of ElectronAPI for schedule task operations
 * This interface matches the schedule task methods exposed via preload
 */
export interface ScheduleTaskElectronAPI {
  scheduleTaskGetAll: (projectPath: string) => Promise<ScheduleTask[]>;
  scheduleTaskGet: (projectPath: string, taskId: string) => Promise<ScheduleTask | null>;
  scheduleTaskCreate: (
    projectPath: string,
    task: ScheduleTaskInput
  ) => Promise<
    | { ok: true; value: ScheduleTask }
    | { ok: false; error: ScheduleTaskServiceError }
  >;
  scheduleTaskUpdate: (
    projectPath: string,
    taskId: string,
    updates: Partial<ScheduleTaskInput>
  ) => Promise<
    | { ok: true; value: ScheduleTask }
    | { ok: false; error: ScheduleTaskServiceError }
  >;
  scheduleTaskDelete: (
    projectPath: string,
    taskId: string
  ) => Promise<
    | { ok: true; value: void }
    | { ok: false; error: TaskNotFoundError }
  >;
  scheduleTaskExecuteImmediately: (
    projectPath: string,
    taskId: string,
    force?: boolean
  ) => Promise<
    | { ok: true; value: ExecutionResult }
    | { ok: false; error: ExecutionError }
  >;
  scheduleTaskGetQueue: (projectPath: string) => Promise<QueuedTask[]>;
  scheduleTaskGetRunning: (projectPath: string) => Promise<RunningTaskInfo[]>;
  onScheduleTaskStatusChanged: (
    callback: (event: ScheduleTaskStatusEvent) => void
  ) => () => void;
}

// =============================================================================
// Types
// =============================================================================

export interface ScheduleTaskState {
  /** Cached schedule tasks */
  tasks: ScheduleTask[];
  /** Currently editing task (null for new task mode) */
  editingTask: ScheduleTask | null;
  /** Whether in new task creation mode */
  isCreatingNew: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Current project path */
  projectPath: string;
  /** Queued tasks waiting to execute */
  queuedTasks: QueuedTask[];
  /** Currently running tasks */
  runningTasks: RunningTaskInfo[];
}

export interface ScheduleTaskActions {
  // Data Loading
  /** Load all tasks from Main Process */
  loadTasks: (api: ScheduleTaskElectronAPI, projectPath: string) => Promise<void>;
  /** Load queued tasks */
  loadQueuedTasks: (api: ScheduleTaskElectronAPI) => Promise<void>;
  /** Load running tasks */
  loadRunningTasks: (api: ScheduleTaskElectronAPI) => Promise<void>;

  // CRUD Operations
  /** Create a new task */
  createTask: (
    api: ScheduleTaskElectronAPI,
    input: ScheduleTaskInput
  ) => Promise<
    | { ok: true; value: ScheduleTask }
    | { ok: false; error: ScheduleTaskServiceError }
  >;
  /** Update an existing task */
  updateTask: (
    api: ScheduleTaskElectronAPI,
    taskId: string,
    updates: Partial<ScheduleTaskInput>
  ) => Promise<
    | { ok: true; value: ScheduleTask }
    | { ok: false; error: ScheduleTaskServiceError }
  >;
  /** Delete a task */
  deleteTask: (
    api: ScheduleTaskElectronAPI,
    taskId: string
  ) => Promise<
    | { ok: true; value: void }
    | { ok: false; error: TaskNotFoundError }
  >;
  /** Toggle task enabled state */
  toggleTaskEnabled: (api: ScheduleTaskElectronAPI, taskId: string) => Promise<void>;

  // Execution
  /** Execute task immediately */
  executeImmediately: (
    api: ScheduleTaskElectronAPI,
    taskId: string,
    force: boolean
  ) => Promise<
    | { ok: true; value: ExecutionResult }
    | { ok: false; error: ExecutionError }
  >;

  // Editing State
  /** Start editing an existing task */
  startEditing: (task: ScheduleTask) => void;
  /** Cancel editing */
  cancelEditing: () => void;
  /** Start creating a new task */
  startNewTask: () => void;

  // Selectors
  /** Get task by ID */
  getTaskById: (taskId: string) => ScheduleTask | undefined;

  // Status Event Handling
  /** Handle status change event from Main Process */
  handleStatusEvent: (event: ScheduleTaskStatusEvent) => void;
  /** Subscribe to status changes from Main Process */
  subscribeToStatusChanges: (api: ScheduleTaskElectronAPI) => () => void;

  // Utility
  /** Clear error */
  clearError: () => void;
  /** Update tasks array directly (for event handling) */
  updateTasks: (tasks: ScheduleTask[]) => void;
}

export type ScheduleTaskStore = ScheduleTaskState & ScheduleTaskActions;

// =============================================================================
// Initial State
// =============================================================================

const initialState: ScheduleTaskState = {
  tasks: [],
  editingTask: null,
  isCreatingNew: false,
  isLoading: false,
  error: null,
  projectPath: '',
  queuedTasks: [],
  runningTasks: [],
};

// =============================================================================
// Store Implementation
// =============================================================================

export const useScheduleTaskStore = create<ScheduleTaskStore>((set, get) => ({
  ...initialState,

  // ===========================================================================
  // Data Loading
  // ===========================================================================

  loadTasks: async (api: ScheduleTaskElectronAPI, projectPath: string) => {
    set({ isLoading: true, error: null, projectPath });

    try {
      const tasks = await api.scheduleTaskGetAll(projectPath);
      set({ tasks, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load tasks';
      set({ error: message, isLoading: false });
    }
  },

  loadQueuedTasks: async (api: ScheduleTaskElectronAPI) => {
    const { projectPath } = get();
    if (!projectPath) return;

    try {
      const queuedTasks = await api.scheduleTaskGetQueue(projectPath);
      set({ queuedTasks });
    } catch (error) {
      console.error('[scheduleTaskStore] Failed to load queued tasks:', error);
    }
  },

  loadRunningTasks: async (api: ScheduleTaskElectronAPI) => {
    const { projectPath } = get();
    if (!projectPath) return;

    try {
      const runningTasks = await api.scheduleTaskGetRunning(projectPath);
      set({ runningTasks });
    } catch (error) {
      console.error('[scheduleTaskStore] Failed to load running tasks:', error);
    }
  },

  // ===========================================================================
  // CRUD Operations
  // ===========================================================================

  createTask: async (api: ScheduleTaskElectronAPI, input: ScheduleTaskInput) => {
    const { projectPath, tasks } = get();

    const result = await api.scheduleTaskCreate(projectPath, input);

    if (result.ok) {
      // Add to local cache
      set({
        tasks: [...tasks, result.value],
        isCreatingNew: false,
        editingTask: null,
      });
    }

    return result;
  },

  updateTask: async (
    api: ScheduleTaskElectronAPI,
    taskId: string,
    updates: Partial<ScheduleTaskInput>
  ) => {
    const { projectPath, tasks } = get();

    const result = await api.scheduleTaskUpdate(projectPath, taskId, updates);

    if (result.ok) {
      // Update local cache
      const updatedTasks = tasks.map((t) =>
        t.id === taskId ? result.value : t
      );
      set({ tasks: updatedTasks, editingTask: null });
    }

    return result;
  },

  deleteTask: async (api: ScheduleTaskElectronAPI, taskId: string) => {
    const { projectPath, tasks, editingTask } = get();

    const result = await api.scheduleTaskDelete(projectPath, taskId);

    if (result.ok) {
      // Remove from local cache
      const updatedTasks = tasks.filter((t) => t.id !== taskId);

      // Clear editingTask if deleted task was being edited
      const newEditingTask = editingTask?.id === taskId ? null : editingTask;

      set({ tasks: updatedTasks, editingTask: newEditingTask });
    }

    return result;
  },

  toggleTaskEnabled: async (api: ScheduleTaskElectronAPI, taskId: string) => {
    const { tasks } = get();
    const task = tasks.find((t) => t.id === taskId);

    if (!task) return;

    await get().updateTask(api, taskId, { enabled: !task.enabled });
  },

  // ===========================================================================
  // Execution
  // ===========================================================================

  executeImmediately: async (
    api: ScheduleTaskElectronAPI,
    taskId: string,
    force: boolean
  ) => {
    const { projectPath } = get();

    return api.scheduleTaskExecuteImmediately(projectPath, taskId, force);
  },

  // ===========================================================================
  // Editing State
  // ===========================================================================

  startEditing: (task: ScheduleTask) => {
    set({ editingTask: task, isCreatingNew: false });
  },

  cancelEditing: () => {
    set({ editingTask: null, isCreatingNew: false });
  },

  startNewTask: () => {
    set({ editingTask: null, isCreatingNew: true });
  },

  // ===========================================================================
  // Selectors
  // ===========================================================================

  getTaskById: (taskId: string) => {
    return get().tasks.find((t) => t.id === taskId);
  },

  // ===========================================================================
  // Status Event Handling
  // ===========================================================================

  handleStatusEvent: (event: ScheduleTaskStatusEvent) => {
    const { tasks, queuedTasks } = get();

    switch (event.type) {
      case 'task-queued': {
        // Add to queued tasks
        const newQueuedTask: QueuedTask = {
          taskId: event.taskId,
          queuedAt: event.timestamp,
          reason: event.reason,
        };
        set({ queuedTasks: [...queuedTasks, newQueuedTask] });
        break;
      }

      case 'task-started': {
        // Remove from queued, update lastExecutedAt
        const updatedQueuedTasks = queuedTasks.filter(
          (q) => q.taskId !== event.taskId
        );

        const updatedTasks = tasks.map((t) =>
          t.id === event.taskId
            ? { ...t, lastExecutedAt: event.timestamp }
            : t
        );

        set({ queuedTasks: updatedQueuedTasks, tasks: updatedTasks });
        break;
      }

      case 'task-completed': {
        // Task completed - could refresh running tasks
        console.log('[scheduleTaskStore] Task completed:', event.taskId);
        break;
      }

      case 'task-skipped': {
        // Task was skipped
        console.log('[scheduleTaskStore] Task skipped:', event.taskId, event.reason);
        break;
      }

      case 'avoidance-waiting': {
        // Task is waiting due to avoidance rule
        console.log('[scheduleTaskStore] Task waiting:', event.taskId, event.conflictType);
        break;
      }
    }
  },

  subscribeToStatusChanges: (api: ScheduleTaskElectronAPI) => {
    const unsubscribe = api.onScheduleTaskStatusChanged((event) => {
      get().handleStatusEvent(event);
    });

    return unsubscribe;
  },

  // ===========================================================================
  // Utility
  // ===========================================================================

  clearError: () => {
    set({ error: null });
  },

  updateTasks: (tasks: ScheduleTask[]) => {
    set({ tasks });
  },
}));

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Reset store to initial state (for testing)
 */
export function resetScheduleTaskStore(): void {
  useScheduleTaskStore.setState(initialState);
}

/**
 * Get current store state (for testing)
 */
export function getScheduleTaskStore(): ScheduleTaskStore {
  return useScheduleTaskStore.getState();
}
