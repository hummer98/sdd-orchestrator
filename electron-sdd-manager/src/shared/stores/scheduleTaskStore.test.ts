/**
 * scheduleTaskStore Tests
 *
 * Task 4.1: scheduleTaskStoreを作成
 * Requirements: 全UI, 9.2
 *
 * Tests for shared scheduleTaskStore
 * - タスク一覧のキャッシュ管理
 * - 編集画面の状態管理
 * - IPC経由でのデータ取得・更新
 * - electron-store同期
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useScheduleTaskStore,
  resetScheduleTaskStore,
  getScheduleTaskStore,
} from './scheduleTaskStore';
import type {
  ScheduleTask,
  ScheduleTaskInput,
  ScheduleTaskStatusEvent,
  QueuedTask,
  RunningTaskInfo,
  ExecutionResult,
} from '../types/scheduleTask';

// =============================================================================
// Mock Data
// =============================================================================

const createMockTask = (id: string, name: string): ScheduleTask => ({
  id,
  name,
  enabled: true,
  schedule: { type: 'interval', hoursInterval: 24, waitForIdle: false },
  prompts: [{ order: 0, content: '/kiro:steering' }],
  avoidance: { targets: [], behavior: 'skip' },
  workflow: { enabled: false },
  behavior: 'skip',
  lastExecutedAt: null,
  createdAt: Date.now() - 1000,
  updatedAt: Date.now(),
});

const createMockTaskInput = (name: string): ScheduleTaskInput => ({
  name,
  enabled: true,
  schedule: { type: 'interval', hoursInterval: 24, waitForIdle: false },
  prompts: [{ order: 0, content: '/kiro:steering' }],
  avoidance: { targets: [], behavior: 'skip' },
  workflow: { enabled: false },
  behavior: 'skip',
});

// =============================================================================
// Mock ElectronAPI
// =============================================================================

interface MockElectronAPI {
  scheduleTaskGetAll: ReturnType<typeof vi.fn>;
  scheduleTaskGet: ReturnType<typeof vi.fn>;
  scheduleTaskCreate: ReturnType<typeof vi.fn>;
  scheduleTaskUpdate: ReturnType<typeof vi.fn>;
  scheduleTaskDelete: ReturnType<typeof vi.fn>;
  scheduleTaskExecuteImmediately: ReturnType<typeof vi.fn>;
  scheduleTaskGetQueue: ReturnType<typeof vi.fn>;
  scheduleTaskGetRunning: ReturnType<typeof vi.fn>;
  onScheduleTaskStatusChanged: ReturnType<typeof vi.fn>;
}

function createMockElectronAPI(): MockElectronAPI {
  return {
    scheduleTaskGetAll: vi.fn().mockResolvedValue([]),
    scheduleTaskGet: vi.fn().mockResolvedValue(null),
    scheduleTaskCreate: vi.fn().mockResolvedValue({ ok: true, value: createMockTask('new-id', 'New Task') }),
    scheduleTaskUpdate: vi.fn().mockResolvedValue({ ok: true, value: createMockTask('updated-id', 'Updated Task') }),
    scheduleTaskDelete: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    scheduleTaskExecuteImmediately: vi.fn().mockResolvedValue({ ok: true, value: { taskId: 'task-1', startedAt: Date.now(), agentIds: ['agent-1'] } }),
    scheduleTaskGetQueue: vi.fn().mockResolvedValue([]),
    scheduleTaskGetRunning: vi.fn().mockResolvedValue([]),
    onScheduleTaskStatusChanged: vi.fn().mockReturnValue(() => {}),
  };
}

// =============================================================================
// Tests: Initial State
// =============================================================================

describe('scheduleTaskStore - initial state', () => {
  beforeEach(() => {
    resetScheduleTaskStore();
  });

  it('should have empty tasks array initially', () => {
    const state = getScheduleTaskStore();
    expect(state.tasks).toEqual([]);
  });

  it('should have null editingTask initially', () => {
    const state = getScheduleTaskStore();
    expect(state.editingTask).toBeNull();
  });

  it('should not be loading initially', () => {
    const state = getScheduleTaskStore();
    expect(state.isLoading).toBe(false);
  });

  it('should have no error initially', () => {
    const state = getScheduleTaskStore();
    expect(state.error).toBeNull();
  });

  it('should have empty projectPath initially', () => {
    const state = getScheduleTaskStore();
    expect(state.projectPath).toBe('');
  });
});

// =============================================================================
// Tests: loadTasks
// =============================================================================

describe('scheduleTaskStore - loadTasks', () => {
  beforeEach(() => {
    resetScheduleTaskStore();
  });

  it('should load tasks via IPC and update state', async () => {
    const mockTasks = [
      createMockTask('task-1', 'Task 1'),
      createMockTask('task-2', 'Task 2'),
    ];

    const mockApi = createMockElectronAPI();
    mockApi.scheduleTaskGetAll.mockResolvedValue(mockTasks);

    await useScheduleTaskStore.getState().loadTasks(mockApi, '/project/path');

    const state = getScheduleTaskStore();
    expect(state.tasks).toEqual(mockTasks);
    expect(state.projectPath).toBe('/project/path');
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(mockApi.scheduleTaskGetAll).toHaveBeenCalledWith('/project/path');
  });

  it('should set isLoading during load', async () => {
    let resolvePromise: (value: ScheduleTask[]) => void;
    const pendingPromise = new Promise<ScheduleTask[]>((resolve) => {
      resolvePromise = resolve;
    });

    const mockApi = createMockElectronAPI();
    mockApi.scheduleTaskGetAll.mockReturnValue(pendingPromise);

    const loadPromise = useScheduleTaskStore.getState().loadTasks(mockApi, '/project/path');

    expect(getScheduleTaskStore().isLoading).toBe(true);

    resolvePromise!([]);
    await loadPromise;

    expect(getScheduleTaskStore().isLoading).toBe(false);
  });

  it('should handle load error', async () => {
    const mockApi = createMockElectronAPI();
    mockApi.scheduleTaskGetAll.mockRejectedValue(new Error('Failed to load'));

    await useScheduleTaskStore.getState().loadTasks(mockApi, '/project/path');

    const state = getScheduleTaskStore();
    expect(state.error).toBe('Failed to load');
    expect(state.isLoading).toBe(false);
  });
});

// =============================================================================
// Tests: createTask
// =============================================================================

describe('scheduleTaskStore - createTask', () => {
  beforeEach(() => {
    resetScheduleTaskStore();
  });

  it('should create task via IPC and add to local state', async () => {
    const mockInput = createMockTaskInput('New Task');
    const mockCreatedTask = createMockTask('new-id', 'New Task');

    const mockApi = createMockElectronAPI();
    mockApi.scheduleTaskCreate.mockResolvedValue({ ok: true, value: mockCreatedTask });

    useScheduleTaskStore.setState({ projectPath: '/project/path' });

    const result = await useScheduleTaskStore.getState().createTask(mockApi, mockInput);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(mockCreatedTask);
    }
    expect(getScheduleTaskStore().tasks).toContainEqual(mockCreatedTask);
    expect(mockApi.scheduleTaskCreate).toHaveBeenCalledWith('/project/path', mockInput);
  });

  it('should handle create validation error', async () => {
    const mockInput = createMockTaskInput('');
    const mockError = { type: 'VALIDATION_ERROR' as const, errors: [{ field: 'name', message: 'Name is required' }] };

    const mockApi = createMockElectronAPI();
    mockApi.scheduleTaskCreate.mockResolvedValue({ ok: false, error: mockError });

    useScheduleTaskStore.setState({ projectPath: '/project/path' });

    const result = await useScheduleTaskStore.getState().createTask(mockApi, mockInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual(mockError);
    }
  });
});

// =============================================================================
// Tests: updateTask
// =============================================================================

describe('scheduleTaskStore - updateTask', () => {
  beforeEach(() => {
    resetScheduleTaskStore();
  });

  it('should update task via IPC and update local state', async () => {
    const existingTask = createMockTask('task-1', 'Original Name');
    const updatedTask = { ...existingTask, name: 'Updated Name' };

    const mockApi = createMockElectronAPI();
    mockApi.scheduleTaskUpdate.mockResolvedValue({ ok: true, value: updatedTask });

    useScheduleTaskStore.setState({
      projectPath: '/project/path',
      tasks: [existingTask],
    });

    const result = await useScheduleTaskStore.getState().updateTask(mockApi, 'task-1', { name: 'Updated Name' });

    expect(result.ok).toBe(true);
    const state = getScheduleTaskStore();
    expect(state.tasks[0].name).toBe('Updated Name');
    expect(mockApi.scheduleTaskUpdate).toHaveBeenCalledWith('/project/path', 'task-1', { name: 'Updated Name' });
  });

  it('should handle update not found error', async () => {
    const mockError = { type: 'TASK_NOT_FOUND' as const, taskId: 'nonexistent' };

    const mockApi = createMockElectronAPI();
    mockApi.scheduleTaskUpdate.mockResolvedValue({ ok: false, error: mockError });

    useScheduleTaskStore.setState({ projectPath: '/project/path' });

    const result = await useScheduleTaskStore.getState().updateTask(mockApi, 'nonexistent', { name: 'Updated' });

    expect(result.ok).toBe(false);
  });
});

// =============================================================================
// Tests: deleteTask
// =============================================================================

describe('scheduleTaskStore - deleteTask', () => {
  beforeEach(() => {
    resetScheduleTaskStore();
  });

  it('should delete task via IPC and remove from local state', async () => {
    const existingTask = createMockTask('task-1', 'Task to Delete');

    const mockApi = createMockElectronAPI();
    mockApi.scheduleTaskDelete.mockResolvedValue({ ok: true, value: undefined });

    useScheduleTaskStore.setState({
      projectPath: '/project/path',
      tasks: [existingTask],
    });

    const result = await useScheduleTaskStore.getState().deleteTask(mockApi, 'task-1');

    expect(result.ok).toBe(true);
    expect(getScheduleTaskStore().tasks).toHaveLength(0);
    expect(mockApi.scheduleTaskDelete).toHaveBeenCalledWith('/project/path', 'task-1');
  });

  it('should clear editingTask if deleted task was being edited', async () => {
    const existingTask = createMockTask('task-1', 'Task to Delete');

    const mockApi = createMockElectronAPI();
    mockApi.scheduleTaskDelete.mockResolvedValue({ ok: true, value: undefined });

    useScheduleTaskStore.setState({
      projectPath: '/project/path',
      tasks: [existingTask],
      editingTask: existingTask,
    });

    await useScheduleTaskStore.getState().deleteTask(mockApi, 'task-1');

    expect(getScheduleTaskStore().editingTask).toBeNull();
  });
});

// =============================================================================
// Tests: toggleTaskEnabled
// =============================================================================

describe('scheduleTaskStore - toggleTaskEnabled', () => {
  beforeEach(() => {
    resetScheduleTaskStore();
  });

  it('should toggle task enabled state', async () => {
    const existingTask = createMockTask('task-1', 'Task 1');
    existingTask.enabled = true;
    const toggledTask = { ...existingTask, enabled: false };

    const mockApi = createMockElectronAPI();
    mockApi.scheduleTaskUpdate.mockResolvedValue({ ok: true, value: toggledTask });

    useScheduleTaskStore.setState({
      projectPath: '/project/path',
      tasks: [existingTask],
    });

    await useScheduleTaskStore.getState().toggleTaskEnabled(mockApi, 'task-1');

    expect(mockApi.scheduleTaskUpdate).toHaveBeenCalledWith('/project/path', 'task-1', { enabled: false });
  });
});

// =============================================================================
// Tests: executeImmediately
// =============================================================================

describe('scheduleTaskStore - executeImmediately', () => {
  beforeEach(() => {
    resetScheduleTaskStore();
  });

  it('should execute task immediately via IPC', async () => {
    const mockResult: ExecutionResult = {
      taskId: 'task-1',
      startedAt: Date.now(),
      agentIds: ['agent-1', 'agent-2'],
    };

    const mockApi = createMockElectronAPI();
    mockApi.scheduleTaskExecuteImmediately.mockResolvedValue({ ok: true, value: mockResult });

    useScheduleTaskStore.setState({ projectPath: '/project/path' });

    const result = await useScheduleTaskStore.getState().executeImmediately(mockApi, 'task-1', false);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(mockResult);
    }
    expect(mockApi.scheduleTaskExecuteImmediately).toHaveBeenCalledWith('/project/path', 'task-1', false);
  });

  it('should pass force flag when specified', async () => {
    const mockApi = createMockElectronAPI();
    mockApi.scheduleTaskExecuteImmediately.mockResolvedValue({
      ok: true,
      value: { taskId: 'task-1', startedAt: Date.now(), agentIds: [] },
    });

    useScheduleTaskStore.setState({ projectPath: '/project/path' });

    await useScheduleTaskStore.getState().executeImmediately(mockApi, 'task-1', true);

    expect(mockApi.scheduleTaskExecuteImmediately).toHaveBeenCalledWith('/project/path', 'task-1', true);
  });
});

// =============================================================================
// Tests: Editing State Management
// =============================================================================

describe('scheduleTaskStore - editing state', () => {
  beforeEach(() => {
    resetScheduleTaskStore();
  });

  it('should set editingTask when startEditing is called', () => {
    const task = createMockTask('task-1', 'Task 1');
    useScheduleTaskStore.setState({ tasks: [task] });

    useScheduleTaskStore.getState().startEditing(task);

    expect(getScheduleTaskStore().editingTask).toEqual(task);
  });

  it('should clear editingTask when cancelEditing is called', () => {
    const task = createMockTask('task-1', 'Task 1');
    useScheduleTaskStore.setState({ editingTask: task });

    useScheduleTaskStore.getState().cancelEditing();

    expect(getScheduleTaskStore().editingTask).toBeNull();
  });

  it('should set editingTask to null when startNewTask is called', () => {
    useScheduleTaskStore.getState().startNewTask();

    // For new task, editingTask should be null (indicates new task mode)
    expect(getScheduleTaskStore().isCreatingNew).toBe(true);
  });
});

// =============================================================================
// Tests: Queue and Running Tasks
// =============================================================================

describe('scheduleTaskStore - queue and running tasks', () => {
  beforeEach(() => {
    resetScheduleTaskStore();
  });

  it('should load queued tasks', async () => {
    const mockQueuedTasks: QueuedTask[] = [
      { taskId: 'task-1', queuedAt: Date.now(), reason: 'schedule' },
    ];

    const mockApi = createMockElectronAPI();
    mockApi.scheduleTaskGetQueue.mockResolvedValue(mockQueuedTasks);

    useScheduleTaskStore.setState({ projectPath: '/project/path' });

    await useScheduleTaskStore.getState().loadQueuedTasks(mockApi);

    expect(getScheduleTaskStore().queuedTasks).toEqual(mockQueuedTasks);
  });

  it('should load running tasks', async () => {
    const mockRunningTasks: RunningTaskInfo[] = [
      { taskId: 'task-1', promptIndex: 0, agentId: 'agent-1' },
    ];

    const mockApi = createMockElectronAPI();
    mockApi.scheduleTaskGetRunning.mockResolvedValue(mockRunningTasks);

    useScheduleTaskStore.setState({ projectPath: '/project/path' });

    await useScheduleTaskStore.getState().loadRunningTasks(mockApi);

    expect(getScheduleTaskStore().runningTasks).toEqual(mockRunningTasks);
  });
});

// =============================================================================
// Tests: Status Event Handling
// =============================================================================

describe('scheduleTaskStore - status event handling', () => {
  beforeEach(() => {
    resetScheduleTaskStore();
  });

  it('should handle task-started event and update lastExecutedAt', () => {
    const task = createMockTask('task-1', 'Task 1');
    const startedAt = Date.now();

    useScheduleTaskStore.setState({ tasks: [task] });

    const event: ScheduleTaskStatusEvent = {
      type: 'task-started',
      taskId: 'task-1',
      timestamp: startedAt,
      agentIds: ['agent-1'],
    };

    useScheduleTaskStore.getState().handleStatusEvent(event);

    const state = getScheduleTaskStore();
    expect(state.tasks[0].lastExecutedAt).toBe(startedAt);
  });

  it('should add to queuedTasks on task-queued event', () => {
    const timestamp = Date.now();

    const event: ScheduleTaskStatusEvent = {
      type: 'task-queued',
      taskId: 'task-1',
      timestamp,
      reason: 'schedule',
    };

    useScheduleTaskStore.getState().handleStatusEvent(event);

    const state = getScheduleTaskStore();
    expect(state.queuedTasks).toContainEqual({
      taskId: 'task-1',
      queuedAt: timestamp,
      reason: 'schedule',
    });
  });

  it('should remove from queuedTasks on task-started event', () => {
    useScheduleTaskStore.setState({
      tasks: [createMockTask('task-1', 'Task 1')],
      queuedTasks: [{ taskId: 'task-1', queuedAt: Date.now() - 1000, reason: 'schedule' }],
    });

    const event: ScheduleTaskStatusEvent = {
      type: 'task-started',
      taskId: 'task-1',
      timestamp: Date.now(),
      agentIds: ['agent-1'],
    };

    useScheduleTaskStore.getState().handleStatusEvent(event);

    expect(getScheduleTaskStore().queuedTasks).toHaveLength(0);
  });
});

// =============================================================================
// Tests: Subscription Management
// =============================================================================

describe('scheduleTaskStore - subscriptions', () => {
  beforeEach(() => {
    resetScheduleTaskStore();
  });

  it('should subscribe to status changes and return cleanup function', () => {
    const unsubscribeMock = vi.fn();
    const mockApi = createMockElectronAPI();
    mockApi.onScheduleTaskStatusChanged.mockReturnValue(unsubscribeMock);

    const cleanup = useScheduleTaskStore.getState().subscribeToStatusChanges(mockApi);

    expect(mockApi.onScheduleTaskStatusChanged).toHaveBeenCalled();
    expect(typeof cleanup).toBe('function');

    cleanup();
    expect(unsubscribeMock).toHaveBeenCalled();
  });
});

// =============================================================================
// Tests: getTaskById
// =============================================================================

describe('scheduleTaskStore - getTaskById', () => {
  beforeEach(() => {
    resetScheduleTaskStore();
  });

  it('should return task by id', () => {
    const task1 = createMockTask('task-1', 'Task 1');
    const task2 = createMockTask('task-2', 'Task 2');

    useScheduleTaskStore.setState({ tasks: [task1, task2] });

    const result = useScheduleTaskStore.getState().getTaskById('task-2');

    expect(result).toEqual(task2);
  });

  it('should return undefined for non-existent task', () => {
    useScheduleTaskStore.setState({ tasks: [] });

    const result = useScheduleTaskStore.getState().getTaskById('nonexistent');

    expect(result).toBeUndefined();
  });
});

// =============================================================================
// Tests: clearError
// =============================================================================

describe('scheduleTaskStore - clearError', () => {
  beforeEach(() => {
    resetScheduleTaskStore();
  });

  it('should clear error state', () => {
    useScheduleTaskStore.setState({ error: 'Some error' });

    useScheduleTaskStore.getState().clearError();

    expect(getScheduleTaskStore().error).toBeNull();
  });
});

// =============================================================================
// Tests: Reset
// =============================================================================

describe('scheduleTaskStore - resetScheduleTaskStore', () => {
  it('should reset all state to initial values', () => {
    useScheduleTaskStore.setState({
      tasks: [createMockTask('task-1', 'Task 1')],
      editingTask: createMockTask('task-1', 'Task 1'),
      isLoading: true,
      error: 'Some error',
      projectPath: '/project/path',
      queuedTasks: [{ taskId: 'task-1', queuedAt: Date.now(), reason: 'schedule' }],
      runningTasks: [{ taskId: 'task-1', promptIndex: 0, agentId: 'agent-1' }],
      isCreatingNew: true,
    });

    resetScheduleTaskStore();

    const state = getScheduleTaskStore();
    expect(state.tasks).toEqual([]);
    expect(state.editingTask).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.projectPath).toBe('');
    expect(state.queuedTasks).toEqual([]);
    expect(state.runningTasks).toEqual([]);
    expect(state.isCreatingNew).toBe(false);
  });
});
