/**
 * ScheduleTaskHandlers Tests
 * Task 3.2: IPCハンドラを実装
 * Requirements: All IPC (design.md scheduleTaskHandlers API Contract)
 *
 * Tests for schedule task IPC handlers:
 * - CRUD operations (get-all, get, create, update, delete)
 * - Execution control (execute-immediately, get-queue, get-running)
 * - Request validation and forwarding to services
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, BrowserWindow } from 'electron';

// Mock electron modules
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
  },
}));

// Mock logger
vi.mock('../services/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock services
const mockScheduleTaskService = {
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  getTask: vi.fn(),
  getAllTasks: vi.fn(),
  validateConsistency: vi.fn(),
};

const mockScheduleTaskCoordinator = {
  initialize: vi.fn(),
  startScheduler: vi.fn(),
  stopScheduler: vi.fn(),
  getQueuedTasks: vi.fn(),
  clearQueue: vi.fn(),
  executeImmediately: vi.fn(),
  getRunningTasks: vi.fn(),
  checkAvoidanceConflict: vi.fn(),
  processQueue: vi.fn(),
  dispose: vi.fn(),
};

vi.mock('../services/scheduleTaskService', () => ({
  getDefaultScheduleTaskService: vi.fn(() => mockScheduleTaskService),
}));

import {
  registerScheduleTaskHandlers,
  unregisterScheduleTaskHandlers,
  initScheduleTaskCoordinator,
  disposeScheduleTaskCoordinator,
} from './scheduleTaskHandlers';
import { IPC_CHANNELS } from './channels';

describe('ScheduleTaskHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    unregisterScheduleTaskHandlers();
    disposeScheduleTaskCoordinator();
  });

  // ============================================================
  // Registration Tests
  // ============================================================

  describe('registerScheduleTaskHandlers', () => {
    it('should register all schedule task IPC handlers', () => {
      const getCurrentProjectPath = vi.fn(() => '/test/project');

      registerScheduleTaskHandlers(getCurrentProjectPath);

      // Verify all handlers are registered
      const registeredChannels = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls.map(
        (call) => call[0]
      );

      expect(registeredChannels).toContain(IPC_CHANNELS.SCHEDULE_TASK_GET_ALL);
      expect(registeredChannels).toContain(IPC_CHANNELS.SCHEDULE_TASK_GET);
      expect(registeredChannels).toContain(IPC_CHANNELS.SCHEDULE_TASK_CREATE);
      expect(registeredChannels).toContain(IPC_CHANNELS.SCHEDULE_TASK_UPDATE);
      expect(registeredChannels).toContain(IPC_CHANNELS.SCHEDULE_TASK_DELETE);
      expect(registeredChannels).toContain(IPC_CHANNELS.SCHEDULE_TASK_EXECUTE_IMMEDIATELY);
      expect(registeredChannels).toContain(IPC_CHANNELS.SCHEDULE_TASK_GET_QUEUE);
      expect(registeredChannels).toContain(IPC_CHANNELS.SCHEDULE_TASK_GET_RUNNING);
      // Task 7.1: Idle Time Sync handler
      expect(registeredChannels).toContain(IPC_CHANNELS.SCHEDULE_TASK_REPORT_IDLE_TIME);
    });
  });

  describe('unregisterScheduleTaskHandlers', () => {
    it('should unregister all schedule task IPC handlers', () => {
      const getCurrentProjectPath = vi.fn(() => '/test/project');
      registerScheduleTaskHandlers(getCurrentProjectPath);

      unregisterScheduleTaskHandlers();

      // Verify all handlers are unregistered
      const unregisteredChannels = (ipcMain.removeHandler as ReturnType<typeof vi.fn>).mock.calls.map(
        (call) => call[0]
      );

      expect(unregisteredChannels).toContain(IPC_CHANNELS.SCHEDULE_TASK_GET_ALL);
      expect(unregisteredChannels).toContain(IPC_CHANNELS.SCHEDULE_TASK_GET);
      expect(unregisteredChannels).toContain(IPC_CHANNELS.SCHEDULE_TASK_CREATE);
      expect(unregisteredChannels).toContain(IPC_CHANNELS.SCHEDULE_TASK_UPDATE);
      expect(unregisteredChannels).toContain(IPC_CHANNELS.SCHEDULE_TASK_DELETE);
      expect(unregisteredChannels).toContain(IPC_CHANNELS.SCHEDULE_TASK_EXECUTE_IMMEDIATELY);
      expect(unregisteredChannels).toContain(IPC_CHANNELS.SCHEDULE_TASK_GET_QUEUE);
      expect(unregisteredChannels).toContain(IPC_CHANNELS.SCHEDULE_TASK_GET_RUNNING);
      // Task 7.1: Idle Time Sync handler
      expect(unregisteredChannels).toContain(IPC_CHANNELS.SCHEDULE_TASK_REPORT_IDLE_TIME);
    });
  });

  // ============================================================
  // Handler Behavior Tests (via mock call inspection)
  // ============================================================

  describe('SCHEDULE_TASK_GET_ALL handler', () => {
    it('should call scheduleTaskService.getAllTasks with projectPath', async () => {
      const getCurrentProjectPath = vi.fn(() => '/test/project');
      registerScheduleTaskHandlers(getCurrentProjectPath);

      // Get the registered handler
      const handleCall = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === IPC_CHANNELS.SCHEDULE_TASK_GET_ALL
      );
      expect(handleCall).toBeDefined();

      const handler = handleCall![1];
      mockScheduleTaskService.getAllTasks.mockResolvedValue([]);

      // Call the handler
      const result = await handler({}, { projectPath: '/test/project' });

      expect(mockScheduleTaskService.getAllTasks).toHaveBeenCalledWith('/test/project');
      expect(result).toEqual([]);
    });
  });

  describe('SCHEDULE_TASK_GET handler', () => {
    it('should call scheduleTaskService.getTask with projectPath and taskId', async () => {
      const getCurrentProjectPath = vi.fn(() => '/test/project');
      registerScheduleTaskHandlers(getCurrentProjectPath);

      const handleCall = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === IPC_CHANNELS.SCHEDULE_TASK_GET
      );
      expect(handleCall).toBeDefined();

      const handler = handleCall![1];
      const mockTask = { id: 'task-1', name: 'Test Task' };
      mockScheduleTaskService.getTask.mockResolvedValue(mockTask);

      const result = await handler({}, { projectPath: '/test/project', taskId: 'task-1' });

      expect(mockScheduleTaskService.getTask).toHaveBeenCalledWith('/test/project', 'task-1');
      expect(result).toEqual(mockTask);
    });
  });

  describe('SCHEDULE_TASK_CREATE handler', () => {
    it('should call scheduleTaskService.createTask and return result', async () => {
      const getCurrentProjectPath = vi.fn(() => '/test/project');
      registerScheduleTaskHandlers(getCurrentProjectPath);

      const handleCall = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === IPC_CHANNELS.SCHEDULE_TASK_CREATE
      );
      expect(handleCall).toBeDefined();

      const handler = handleCall![1];
      const taskInput = {
        name: 'New Task',
        enabled: true,
        schedule: { type: 'interval' as const, hoursInterval: 24, waitForIdle: false },
        prompts: [{ order: 0, content: 'test prompt' }],
        avoidance: { targets: [], behavior: 'wait' as const },
        workflow: { enabled: false },
        behavior: 'wait' as const,
      };
      const createdTask = { id: 'new-id', ...taskInput };
      mockScheduleTaskService.createTask.mockResolvedValue({ ok: true, value: createdTask });

      const result = await handler({}, { projectPath: '/test/project', task: taskInput });

      expect(mockScheduleTaskService.createTask).toHaveBeenCalledWith('/test/project', taskInput);
      expect(result).toEqual({ ok: true, value: createdTask });
    });
  });

  describe('SCHEDULE_TASK_UPDATE handler', () => {
    it('should call scheduleTaskService.updateTask and return result', async () => {
      const getCurrentProjectPath = vi.fn(() => '/test/project');
      registerScheduleTaskHandlers(getCurrentProjectPath);

      const handleCall = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === IPC_CHANNELS.SCHEDULE_TASK_UPDATE
      );
      expect(handleCall).toBeDefined();

      const handler = handleCall![1];
      const updates = { name: 'Updated Task' };
      const updatedTask = { id: 'task-1', name: 'Updated Task' };
      mockScheduleTaskService.updateTask.mockResolvedValue({ ok: true, value: updatedTask });

      const result = await handler({}, { projectPath: '/test/project', taskId: 'task-1', updates });

      expect(mockScheduleTaskService.updateTask).toHaveBeenCalledWith('/test/project', 'task-1', updates);
      expect(result).toEqual({ ok: true, value: updatedTask });
    });
  });

  describe('SCHEDULE_TASK_DELETE handler', () => {
    it('should call scheduleTaskService.deleteTask and return result', async () => {
      const getCurrentProjectPath = vi.fn(() => '/test/project');
      registerScheduleTaskHandlers(getCurrentProjectPath);

      const handleCall = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === IPC_CHANNELS.SCHEDULE_TASK_DELETE
      );
      expect(handleCall).toBeDefined();

      const handler = handleCall![1];
      mockScheduleTaskService.deleteTask.mockResolvedValue({ ok: true, value: undefined });

      const result = await handler({}, { projectPath: '/test/project', taskId: 'task-1' });

      expect(mockScheduleTaskService.deleteTask).toHaveBeenCalledWith('/test/project', 'task-1');
      expect(result).toEqual({ ok: true, value: undefined });
    });
  });

  // ============================================================
  // Coordinator Initialization Tests
  // ============================================================

  describe('initScheduleTaskCoordinator', () => {
    it('should initialize coordinator with projectPath', async () => {
      // This test validates that initScheduleTaskCoordinator creates a coordinator
      // The actual integration will be tested in integration tests
      const projectPath = '/test/project';

      // initScheduleTaskCoordinator should not throw
      await expect(initScheduleTaskCoordinator(projectPath)).resolves.not.toThrow();
    });
  });

  describe('disposeScheduleTaskCoordinator', () => {
    it('should dispose coordinator without error', () => {
      // disposeScheduleTaskCoordinator should not throw even if not initialized
      expect(() => disposeScheduleTaskCoordinator()).not.toThrow();
    });
  });
});
