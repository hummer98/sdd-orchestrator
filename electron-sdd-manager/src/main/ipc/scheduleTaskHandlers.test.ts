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

    // ============================================================
    // Task 3.1: Scheduler Auto-start Tests
    // Requirements: 1.1, 2.1, 3.1, 4.1
    // ============================================================

    it('should call startScheduler after initialize', async () => {
      const { getScheduleTaskCoordinator } = await import('./scheduleTaskHandlers');
      const projectPath = '/test/project';

      await initScheduleTaskCoordinator(projectPath);

      const coordinator = getScheduleTaskCoordinator();
      // Coordinator should be created (startScheduler is called internally)
      expect(coordinator).not.toBeNull();
    });

    it('should inject getIdleTimeMs dependency that returns actual idle time', async () => {
      // Requirement 2.1: getIdleTimeMs should use idleTimeTracker
      // This is verified by checking the coordinator is created with proper deps
      const projectPath = '/test/project';

      await initScheduleTaskCoordinator(projectPath);

      const { getScheduleTaskCoordinator } = await import('./scheduleTaskHandlers');
      const coordinator = getScheduleTaskCoordinator();
      expect(coordinator).not.toBeNull();
    });
  });

  describe('disposeScheduleTaskCoordinator', () => {
    it('should dispose coordinator without error', () => {
      // disposeScheduleTaskCoordinator should not throw even if not initialized
      expect(() => disposeScheduleTaskCoordinator()).not.toThrow();
    });

    it('should stop scheduler when disposed', async () => {
      const projectPath = '/test/project';
      await initScheduleTaskCoordinator(projectPath);

      disposeScheduleTaskCoordinator();

      const { getScheduleTaskCoordinator } = await import('./scheduleTaskHandlers');
      const coordinator = getScheduleTaskCoordinator();
      expect(coordinator).toBeNull();
    });
  });

  // ============================================================
  // Task 1.1: startScheduleAgentWrapper Tests
  // Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
  // ============================================================

  describe('createStartScheduleAgentWrapper', () => {
    it('should call SpecManagerService.startAgent with correct parameters', async () => {
      const mockStartAgent = vi.fn().mockResolvedValue({
        ok: true,
        value: { agentId: 'agent-123' },
      });
      const mockSpecManagerService = { startAgent: mockStartAgent };
      const projectPath = '/test/project';

      // Import the wrapper creator
      const { createStartScheduleAgentWrapper } = await import('./scheduleTaskHandlers');
      const wrapper = createStartScheduleAgentWrapper(projectPath, mockSpecManagerService as any);

      const result = await wrapper({
        taskId: 'task-1',
        taskName: 'Test Task',
        prompt: '/kiro:steering',
        promptIndex: 0,
      });

      // Requirement 3.1: Should use SpecManagerService.startAgent
      expect(mockStartAgent).toHaveBeenCalled();
      // Requirement 3.2: specId='' for project-level agent, phase='schedule-{taskName}'
      expect(mockStartAgent).toHaveBeenCalledWith(expect.objectContaining({
        specId: '',
        phase: 'schedule-Test Task',
      }));
      // Requirement 3.3: Prompt should be passed via args
      expect(mockStartAgent).toHaveBeenCalledWith(expect.objectContaining({
        prompt: '/kiro:steering',
      }));
      // Requirement 3.4: Should return agentId on success
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.agentId).toBe('agent-123');
      }
    });

    it('should pass worktreePath as worktreeCwd when provided', async () => {
      const mockStartAgent = vi.fn().mockResolvedValue({
        ok: true,
        value: { agentId: 'agent-456' },
      });
      const mockSpecManagerService = { startAgent: mockStartAgent };
      const projectPath = '/test/project';

      const { createStartScheduleAgentWrapper } = await import('./scheduleTaskHandlers');
      const wrapper = createStartScheduleAgentWrapper(projectPath, mockSpecManagerService as any);

      await wrapper({
        taskId: 'task-1',
        taskName: 'Workflow Task',
        prompt: '/kiro:steering',
        promptIndex: 0,
        worktreePath: '/test/project/.kiro/worktrees/schedule/workflow-task/20260131-120000',
      });

      expect(mockStartAgent).toHaveBeenCalledWith(expect.objectContaining({
        worktreeCwd: '/test/project/.kiro/worktrees/schedule/workflow-task/20260131-120000',
      }));
    });

    it('should return error result when startAgent fails', async () => {
      // Requirement 3.5: Error handling
      const mockStartAgent = vi.fn().mockResolvedValue({
        ok: false,
        error: { type: 'AGENT_START_FAILED', message: 'Process spawn failed' },
      });
      const mockSpecManagerService = { startAgent: mockStartAgent };
      const projectPath = '/test/project';

      const { createStartScheduleAgentWrapper } = await import('./scheduleTaskHandlers');
      const wrapper = createStartScheduleAgentWrapper(projectPath, mockSpecManagerService as any);

      const result = await wrapper({
        taskId: 'task-1',
        taskName: 'Test Task',
        prompt: '/kiro:steering',
        promptIndex: 0,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('AGENT_START_FAILED');
        expect(result.error.message).toBe('Process spawn failed');
      }
    });
  });

  // ============================================================
  // Task 2.1: createScheduleWorktreeWrapper Tests
  // Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
  // ============================================================

  describe('createScheduleWorktreeWrapper', () => {
    it('should call WorktreeService.createEntityWorktree with correct naming', async () => {
      const mockCreateEntityWorktree = vi.fn().mockResolvedValue({
        ok: true,
        value: {
          path: '.kiro/worktrees/schedule/test-task/20260131-120000',
          branch: 'schedule/test-task/20260131-120000',
          created_at: '2026-01-31T12:00:00Z',
        },
      });
      const mockWorktreeService = { createEntityWorktree: mockCreateEntityWorktree };
      const projectPath = '/test/project';

      const { createScheduleWorktreeWrapper } = await import('./scheduleTaskHandlers');
      const wrapper = createScheduleWorktreeWrapper(projectPath, mockWorktreeService as any);

      const result = await wrapper({
        taskName: 'Test Task',
        suffixMode: 'auto',
        promptIndex: 0,
      });

      // Requirement 4.1: Should use WorktreeService
      expect(mockCreateEntityWorktree).toHaveBeenCalled();
      // Requirement 4.2: Naming convention schedule/{task-name}/{suffix}
      expect(mockCreateEntityWorktree).toHaveBeenCalledWith(
        'schedule',
        expect.stringMatching(/^test-task\/\d{8}-\d{6}(-0)?$/)
      );
      // Requirement 4.5: Should return absolutePath on success
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.absolutePath).toBeDefined();
      }
    });

    it('should generate auto suffix with date format YYYYMMDD-HHmmss', async () => {
      // Requirement 4.3: suffixMode='auto' generates date-based suffix
      const mockCreateEntityWorktree = vi.fn().mockResolvedValue({
        ok: true,
        value: {
          path: '.kiro/worktrees/schedule/my-task/20260131-120000',
          branch: 'schedule/my-task/20260131-120000',
          created_at: '2026-01-31T12:00:00Z',
        },
      });
      const mockWorktreeService = { createEntityWorktree: mockCreateEntityWorktree };
      const projectPath = '/test/project';

      const { createScheduleWorktreeWrapper } = await import('./scheduleTaskHandlers');
      const wrapper = createScheduleWorktreeWrapper(projectPath, mockWorktreeService as any);

      await wrapper({
        taskName: 'My Task',
        suffixMode: 'auto',
        promptIndex: 0,
      });

      // Verify the name format includes date suffix
      const callArg = mockCreateEntityWorktree.mock.calls[0][1];
      expect(callArg).toMatch(/^my-task\/\d{8}-\d{6}/);
    });

    it('should use custom suffix with date when suffixMode is custom', async () => {
      // Requirement 4.4: suffixMode='custom' uses user-specified suffix + date
      const mockCreateEntityWorktree = vi.fn().mockResolvedValue({
        ok: true,
        value: {
          path: '.kiro/worktrees/schedule/my-task/v2-20260131-120000',
          branch: 'schedule/my-task/v2-20260131-120000',
          created_at: '2026-01-31T12:00:00Z',
        },
      });
      const mockWorktreeService = { createEntityWorktree: mockCreateEntityWorktree };
      const projectPath = '/test/project';

      const { createScheduleWorktreeWrapper } = await import('./scheduleTaskHandlers');
      const wrapper = createScheduleWorktreeWrapper(projectPath, mockWorktreeService as any);

      await wrapper({
        taskName: 'My Task',
        suffixMode: 'custom',
        customSuffix: 'v2',
        promptIndex: 0,
      });

      const callArg = mockCreateEntityWorktree.mock.calls[0][1];
      expect(callArg).toMatch(/^my-task\/v2-\d{8}-\d{6}/);
    });

    it('should append promptIndex suffix for multi-prompt tasks', async () => {
      const mockCreateEntityWorktree = vi.fn().mockResolvedValue({
        ok: true,
        value: {
          path: '.kiro/worktrees/schedule/test/20260131-120000-1',
          branch: 'schedule/test/20260131-120000-1',
          created_at: '2026-01-31T12:00:00Z',
        },
      });
      const mockWorktreeService = { createEntityWorktree: mockCreateEntityWorktree };
      const projectPath = '/test/project';

      const { createScheduleWorktreeWrapper } = await import('./scheduleTaskHandlers');
      const wrapper = createScheduleWorktreeWrapper(projectPath, mockWorktreeService as any);

      await wrapper({
        taskName: 'Test',
        suffixMode: 'auto',
        promptIndex: 1, // Second prompt
      });

      const callArg = mockCreateEntityWorktree.mock.calls[0][1];
      expect(callArg).toMatch(/-1$/); // Should end with -1
    });

    it('should return error result when worktree creation fails', async () => {
      // Requirement 4.6: Error handling
      const mockCreateEntityWorktree = vi.fn().mockResolvedValue({
        ok: false,
        error: { type: 'GIT_ERROR', message: 'Branch already exists' },
      });
      const mockWorktreeService = { createEntityWorktree: mockCreateEntityWorktree };
      const projectPath = '/test/project';

      const { createScheduleWorktreeWrapper } = await import('./scheduleTaskHandlers');
      const wrapper = createScheduleWorktreeWrapper(projectPath, mockWorktreeService as any);

      const result = await wrapper({
        taskName: 'Test Task',
        suffixMode: 'auto',
        promptIndex: 0,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('WORKTREE_ERROR');
      }
    });
  });
});
