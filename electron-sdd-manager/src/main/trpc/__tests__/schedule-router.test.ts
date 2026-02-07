/**
 * Schedule Router tests
 * Task 10.4: scheduleルーターとZodスキーマを実装する
 * Requirements: 9.1, 9.2
 * Method: scheduleRouter, scheduleTaskService
 * Verify: Grep "scheduleRouter" in router.ts
 *
 * Tests all 9 procedures:
 * - getAll (query): Get all schedule tasks for a project
 * - get (query): Get a single schedule task by ID
 * - create (mutation): Create a new schedule task
 * - update (mutation): Update an existing schedule task
 * - delete (mutation): Delete a schedule task
 * - executeImmediately (mutation): Execute a task immediately
 * - getQueue (query): Get queued tasks
 * - getRunning (query): Get running tasks
 * - reportIdleTime (mutation): Report idle time from Renderer
 *
 * Legacy handler: scheduleTaskHandlers.ts (9 channels)
 * All services accessed via ctx.services for testability (DD-006).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestCaller, createMockServices } from '../helpers/test-helpers';
import type { ContextServices } from '../context';

describe('Schedule Router', () => {
  let mockServices: ContextServices;

  beforeEach(() => {
    mockServices = createMockServices();
  });

  // ============================================================
  // getAll
  // ============================================================

  describe('getAll', () => {
    it('should return all schedule tasks for a project', async () => {
      const mockTasks = [
        { id: 'task-1', name: 'Daily check', enabled: true },
        { id: 'task-2', name: 'Weekly review', enabled: false },
      ];
      mockServices.scheduleTaskService = {
        getAllTasks: vi.fn().mockResolvedValue(mockTasks),
        getTask: vi.fn(),
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
      } as any;

      const caller = createTestCaller(mockServices);
      const result = await caller.schedule.getAll({ projectPath: '/test/project' });

      expect(result).toEqual(mockTasks);
      expect(mockServices.scheduleTaskService!.getAllTasks).toHaveBeenCalledWith('/test/project');
    });

    it('should return empty array when no tasks exist', async () => {
      mockServices.scheduleTaskService = {
        getAllTasks: vi.fn().mockResolvedValue([]),
        getTask: vi.fn(),
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
      } as any;

      const caller = createTestCaller(mockServices);
      const result = await caller.schedule.getAll({ projectPath: '/test/project' });

      expect(result).toEqual([]);
    });

    it('should throw when scheduleTaskService is not initialized', async () => {
      mockServices.scheduleTaskService = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.schedule.getAll({ projectPath: '/test/project' }))
        .rejects.toThrow();
    });

    it('should validate input - empty projectPath should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.schedule.getAll({ projectPath: '' }))
        .rejects.toThrow();
    });
  });

  // ============================================================
  // get
  // ============================================================

  describe('get', () => {
    it('should return a single schedule task by ID', async () => {
      const mockTask = { id: 'task-1', name: 'Daily check', enabled: true };
      mockServices.scheduleTaskService = {
        getAllTasks: vi.fn(),
        getTask: vi.fn().mockResolvedValue(mockTask),
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
      } as any;

      const caller = createTestCaller(mockServices);
      const result = await caller.schedule.get({ projectPath: '/test/project', taskId: 'task-1' });

      expect(result).toEqual(mockTask);
      expect(mockServices.scheduleTaskService!.getTask).toHaveBeenCalledWith('/test/project', 'task-1');
    });

    it('should return null when task does not exist', async () => {
      mockServices.scheduleTaskService = {
        getAllTasks: vi.fn(),
        getTask: vi.fn().mockResolvedValue(null),
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
      } as any;

      const caller = createTestCaller(mockServices);
      const result = await caller.schedule.get({ projectPath: '/test/project', taskId: 'nonexistent' });

      expect(result).toBeNull();
    });

    it('should throw when scheduleTaskService is not initialized', async () => {
      mockServices.scheduleTaskService = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.schedule.get({ projectPath: '/test/project', taskId: 'task-1' }))
        .rejects.toThrow();
    });

    it('should validate input - empty taskId should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.schedule.get({ projectPath: '/test/project', taskId: '' }))
        .rejects.toThrow();
    });
  });

  // ============================================================
  // create
  // ============================================================

  describe('create', () => {
    const validTaskInput = {
      name: 'Daily check',
      enabled: true,
      schedule: { type: 'interval' as const, hoursInterval: 24, waitForIdle: true },
      prompts: [{ order: 0, content: 'Run daily checks' }],
      avoidance: { targets: ['spec-merge' as const], behavior: 'wait' as const },
      workflow: { enabled: false },
      behavior: 'wait' as const,
    };

    it('should create a new schedule task', async () => {
      const mockResult = { ok: true, value: { id: 'new-task-id', ...validTaskInput, lastExecutedAt: null, createdAt: Date.now(), updatedAt: Date.now() } };
      mockServices.scheduleTaskService = {
        getAllTasks: vi.fn(),
        getTask: vi.fn(),
        createTask: vi.fn().mockResolvedValue(mockResult),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
      } as any;

      const caller = createTestCaller(mockServices);
      const result = await caller.schedule.create({ projectPath: '/test/project', task: validTaskInput });

      expect(result).toEqual(mockResult);
      expect(mockServices.scheduleTaskService!.createTask).toHaveBeenCalledWith('/test/project', validTaskInput);
    });

    it('should return error result when service returns error', async () => {
      const mockResult = { ok: false, error: { type: 'DUPLICATE_TASK_NAME', taskName: 'Daily check' } };
      mockServices.scheduleTaskService = {
        getAllTasks: vi.fn(),
        getTask: vi.fn(),
        createTask: vi.fn().mockResolvedValue(mockResult),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
      } as any;

      const caller = createTestCaller(mockServices);
      const result = await caller.schedule.create({ projectPath: '/test/project', task: validTaskInput });

      expect(result.ok).toBe(false);
    });

    it('should throw when scheduleTaskService is not initialized', async () => {
      mockServices.scheduleTaskService = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.schedule.create({ projectPath: '/test/project', task: validTaskInput }))
        .rejects.toThrow();
    });

    it('should validate input - empty task name should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.schedule.create({
        projectPath: '/test/project',
        task: { ...validTaskInput, name: '' },
      })).rejects.toThrow();
    });

    it('should validate input - empty prompts array should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.schedule.create({
        projectPath: '/test/project',
        task: { ...validTaskInput, prompts: [] },
      })).rejects.toThrow();
    });
  });

  // ============================================================
  // update
  // ============================================================

  describe('update', () => {
    it('should update an existing schedule task', async () => {
      const mockResult = { ok: true, value: { id: 'task-1', name: 'Updated task', enabled: false } };
      mockServices.scheduleTaskService = {
        getAllTasks: vi.fn(),
        getTask: vi.fn(),
        createTask: vi.fn(),
        updateTask: vi.fn().mockResolvedValue(mockResult),
        deleteTask: vi.fn(),
      } as any;

      const caller = createTestCaller(mockServices);
      const result = await caller.schedule.update({
        projectPath: '/test/project',
        taskId: 'task-1',
        updates: { name: 'Updated task', enabled: false },
      });

      expect(result).toEqual(mockResult);
      expect(mockServices.scheduleTaskService!.updateTask).toHaveBeenCalledWith(
        '/test/project',
        'task-1',
        { name: 'Updated task', enabled: false },
      );
    });

    it('should return error when task not found', async () => {
      const mockResult = { ok: false, error: { type: 'TASK_NOT_FOUND', taskId: 'nonexistent' } };
      mockServices.scheduleTaskService = {
        getAllTasks: vi.fn(),
        getTask: vi.fn(),
        createTask: vi.fn(),
        updateTask: vi.fn().mockResolvedValue(mockResult),
        deleteTask: vi.fn(),
      } as any;

      const caller = createTestCaller(mockServices);
      const result = await caller.schedule.update({
        projectPath: '/test/project',
        taskId: 'nonexistent',
        updates: { enabled: false },
      });

      expect(result.ok).toBe(false);
    });

    it('should throw when scheduleTaskService is not initialized', async () => {
      mockServices.scheduleTaskService = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.schedule.update({
        projectPath: '/test/project',
        taskId: 'task-1',
        updates: { enabled: false },
      })).rejects.toThrow();
    });

    it('should validate input - empty taskId should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.schedule.update({
        projectPath: '/test/project',
        taskId: '',
        updates: { enabled: false },
      })).rejects.toThrow();
    });
  });

  // ============================================================
  // delete
  // ============================================================

  describe('delete', () => {
    it('should delete a schedule task', async () => {
      const mockResult = { ok: true, value: undefined };
      mockServices.scheduleTaskService = {
        getAllTasks: vi.fn(),
        getTask: vi.fn(),
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn().mockResolvedValue(mockResult),
      } as any;

      const caller = createTestCaller(mockServices);
      const result = await caller.schedule.delete({ projectPath: '/test/project', taskId: 'task-1' });

      expect(result).toEqual(mockResult);
      expect(mockServices.scheduleTaskService!.deleteTask).toHaveBeenCalledWith('/test/project', 'task-1');
    });

    it('should return error when task not found', async () => {
      const mockResult = { ok: false, error: { type: 'TASK_NOT_FOUND', taskId: 'nonexistent' } };
      mockServices.scheduleTaskService = {
        getAllTasks: vi.fn(),
        getTask: vi.fn(),
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn().mockResolvedValue(mockResult),
      } as any;

      const caller = createTestCaller(mockServices);
      const result = await caller.schedule.delete({ projectPath: '/test/project', taskId: 'nonexistent' });

      expect(result.ok).toBe(false);
    });

    it('should throw when scheduleTaskService is not initialized', async () => {
      mockServices.scheduleTaskService = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.schedule.delete({ projectPath: '/test/project', taskId: 'task-1' }))
        .rejects.toThrow();
    });

    it('should validate input - empty taskId should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.schedule.delete({ projectPath: '/test/project', taskId: '' }))
        .rejects.toThrow();
    });
  });

  // ============================================================
  // executeImmediately
  // ============================================================

  describe('executeImmediately', () => {
    it('should execute a task immediately and return result', async () => {
      const mockResult = { ok: true, value: { taskId: 'task-1', startedAt: Date.now(), agentIds: ['agent-1'] } };
      mockServices.scheduleTaskCoordinator = {
        executeImmediately: vi.fn().mockResolvedValue(mockResult),
        getQueuedTasks: vi.fn(),
        getRunningTasks: vi.fn(),
      } as any;

      const caller = createTestCaller(mockServices);
      const result = await caller.schedule.executeImmediately({
        projectPath: '/test/project',
        taskId: 'task-1',
      });

      expect(result).toEqual(mockResult);
      expect(mockServices.scheduleTaskCoordinator!.executeImmediately).toHaveBeenCalledWith('task-1', undefined);
    });

    it('should pass force parameter', async () => {
      const mockResult = { ok: true, value: { taskId: 'task-1', startedAt: Date.now(), agentIds: ['agent-1'] } };
      mockServices.scheduleTaskCoordinator = {
        executeImmediately: vi.fn().mockResolvedValue(mockResult),
        getQueuedTasks: vi.fn(),
        getRunningTasks: vi.fn(),
      } as any;

      const caller = createTestCaller(mockServices);
      await caller.schedule.executeImmediately({
        projectPath: '/test/project',
        taskId: 'task-1',
        force: true,
      });

      expect(mockServices.scheduleTaskCoordinator!.executeImmediately).toHaveBeenCalledWith('task-1', true);
    });

    it('should return error when coordinator returns error', async () => {
      const mockResult = { ok: false, error: { type: 'TASK_NOT_FOUND', taskId: 'task-1' } };
      mockServices.scheduleTaskCoordinator = {
        executeImmediately: vi.fn().mockResolvedValue(mockResult),
        getQueuedTasks: vi.fn(),
        getRunningTasks: vi.fn(),
      } as any;

      const caller = createTestCaller(mockServices);
      const result = await caller.schedule.executeImmediately({
        projectPath: '/test/project',
        taskId: 'task-1',
      });

      expect(result.ok).toBe(false);
    });

    it('should throw when scheduleTaskCoordinator is not initialized', async () => {
      mockServices.scheduleTaskCoordinator = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.schedule.executeImmediately({
        projectPath: '/test/project',
        taskId: 'task-1',
      })).rejects.toThrow();
    });

    it('should validate input - empty taskId should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.schedule.executeImmediately({
        projectPath: '/test/project',
        taskId: '',
      })).rejects.toThrow();
    });
  });

  // ============================================================
  // getQueue
  // ============================================================

  describe('getQueue', () => {
    it('should return queued tasks', async () => {
      const mockQueue = [
        { taskId: 'task-1', queuedAt: Date.now(), reason: 'schedule' },
      ];
      mockServices.scheduleTaskCoordinator = {
        executeImmediately: vi.fn(),
        getQueuedTasks: vi.fn().mockReturnValue(mockQueue),
        getRunningTasks: vi.fn(),
      } as any;

      const caller = createTestCaller(mockServices);
      const result = await caller.schedule.getQueue({ projectPath: '/test/project' });

      expect(result).toEqual(mockQueue);
    });

    it('should return empty array when no tasks are queued', async () => {
      mockServices.scheduleTaskCoordinator = {
        executeImmediately: vi.fn(),
        getQueuedTasks: vi.fn().mockReturnValue([]),
        getRunningTasks: vi.fn(),
      } as any;

      const caller = createTestCaller(mockServices);
      const result = await caller.schedule.getQueue({ projectPath: '/test/project' });

      expect(result).toEqual([]);
    });

    it('should return empty array when coordinator is not initialized', async () => {
      mockServices.scheduleTaskCoordinator = undefined;

      const caller = createTestCaller(mockServices);
      const result = await caller.schedule.getQueue({ projectPath: '/test/project' });

      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // getRunning
  // ============================================================

  describe('getRunning', () => {
    it('should return running tasks', async () => {
      const mockRunning = [
        { taskId: 'task-1', promptIndex: 0, agentId: 'agent-1', worktreePath: '/test/worktree' },
      ];
      mockServices.scheduleTaskCoordinator = {
        executeImmediately: vi.fn(),
        getQueuedTasks: vi.fn(),
        getRunningTasks: vi.fn().mockReturnValue(mockRunning),
      } as any;

      const caller = createTestCaller(mockServices);
      const result = await caller.schedule.getRunning({ projectPath: '/test/project' });

      expect(result).toEqual(mockRunning);
    });

    it('should return empty array when no tasks are running', async () => {
      mockServices.scheduleTaskCoordinator = {
        executeImmediately: vi.fn(),
        getQueuedTasks: vi.fn(),
        getRunningTasks: vi.fn().mockReturnValue([]),
      } as any;

      const caller = createTestCaller(mockServices);
      const result = await caller.schedule.getRunning({ projectPath: '/test/project' });

      expect(result).toEqual([]);
    });

    it('should return empty array when coordinator is not initialized', async () => {
      mockServices.scheduleTaskCoordinator = undefined;

      const caller = createTestCaller(mockServices);
      const result = await caller.schedule.getRunning({ projectPath: '/test/project' });

      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // reportIdleTime
  // ============================================================

  describe('reportIdleTime', () => {
    it('should report idle time from Renderer', async () => {
      mockServices.reportIdleTime = vi.fn();

      const caller = createTestCaller(mockServices);
      const lastActivityTime = Date.now() - 60000;
      await caller.schedule.reportIdleTime({ lastActivityTime });

      expect(mockServices.reportIdleTime).toHaveBeenCalledWith(lastActivityTime);
    });

    it('should not throw when reportIdleTime service is not initialized', async () => {
      mockServices.reportIdleTime = undefined;

      const caller = createTestCaller(mockServices);
      // Should not throw; just a no-op
      await caller.schedule.reportIdleTime({ lastActivityTime: Date.now() });
    });

    it('should validate input - lastActivityTime must be a number', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.schedule.reportIdleTime({ lastActivityTime: 'not-a-number' as any }))
        .rejects.toThrow();
    });
  });

  // ============================================================
  // Router registration
  // ============================================================

  describe('router registration', () => {
    it('should have schedule namespace accessible from appRouter', async () => {
      const caller = createTestCaller(mockServices);
      expect(caller.schedule).toBeDefined();
    });

    it('should have all 9 procedures defined', async () => {
      const caller = createTestCaller(mockServices);
      expect(typeof caller.schedule.getAll).toBe('function');
      expect(typeof caller.schedule.get).toBe('function');
      expect(typeof caller.schedule.create).toBe('function');
      expect(typeof caller.schedule.update).toBe('function');
      expect(typeof caller.schedule.delete).toBe('function');
      expect(typeof caller.schedule.executeImmediately).toBe('function');
      expect(typeof caller.schedule.getQueue).toBe('function');
      expect(typeof caller.schedule.getRunning).toBe('function');
      expect(typeof caller.schedule.reportIdleTime).toBe('function');
    });
  });

  // ============================================================
  // Zod schema validation
  // ============================================================

  describe('Zod schema validation', () => {
    it('should export scheduleGetAllInputSchema', async () => {
      const { scheduleGetAllInputSchema } = await import('../routers/schedule');
      expect(scheduleGetAllInputSchema).toBeDefined();

      expect(scheduleGetAllInputSchema.safeParse({ projectPath: '/test' }).success).toBe(true);
      expect(scheduleGetAllInputSchema.safeParse({ projectPath: '' }).success).toBe(false);
    });

    it('should export scheduleGetInputSchema', async () => {
      const { scheduleGetInputSchema } = await import('../routers/schedule');
      expect(scheduleGetInputSchema).toBeDefined();

      expect(scheduleGetInputSchema.safeParse({ projectPath: '/test', taskId: 'task-1' }).success).toBe(true);
      expect(scheduleGetInputSchema.safeParse({ projectPath: '/test', taskId: '' }).success).toBe(false);
    });

    it('should export scheduleCreateInputSchema with full validation', async () => {
      const { scheduleCreateInputSchema } = await import('../routers/schedule');
      expect(scheduleCreateInputSchema).toBeDefined();

      // Valid input with interval schedule
      const validInput = {
        projectPath: '/test',
        task: {
          name: 'Test task',
          enabled: true,
          schedule: { type: 'interval', hoursInterval: 24, waitForIdle: true },
          prompts: [{ order: 0, content: 'Run test' }],
          avoidance: { targets: ['spec-merge'], behavior: 'wait' },
          workflow: { enabled: false },
          behavior: 'wait',
        },
      };
      expect(scheduleCreateInputSchema.safeParse(validInput).success).toBe(true);

      // Valid input with weekly schedule
      const weeklyInput = {
        projectPath: '/test',
        task: {
          name: 'Weekly task',
          enabled: true,
          schedule: { type: 'weekly', weekdays: [1, 3, 5], hourOfDay: 9, waitForIdle: false },
          prompts: [{ order: 0, content: 'Run weekly' }],
          avoidance: { targets: [], behavior: 'skip' },
          workflow: { enabled: true, suffixMode: 'auto' },
          behavior: 'skip',
        },
      };
      expect(scheduleCreateInputSchema.safeParse(weeklyInput).success).toBe(true);

      // Valid input with idle schedule
      const idleInput = {
        projectPath: '/test',
        task: {
          name: 'Idle task',
          enabled: true,
          schedule: { type: 'idle', idleMinutes: 30 },
          prompts: [{ order: 0, content: 'Run on idle' }],
          avoidance: { targets: [], behavior: 'skip' },
          workflow: { enabled: false },
          behavior: 'wait',
        },
      };
      expect(scheduleCreateInputSchema.safeParse(idleInput).success).toBe(true);

      // Invalid: empty task name
      const invalidName = { ...validInput, task: { ...validInput.task, name: '' } };
      expect(scheduleCreateInputSchema.safeParse(invalidName).success).toBe(false);

      // Invalid: empty prompts
      const invalidPrompts = { ...validInput, task: { ...validInput.task, prompts: [] } };
      expect(scheduleCreateInputSchema.safeParse(invalidPrompts).success).toBe(false);
    });

    it('should export scheduleUpdateInputSchema', async () => {
      const { scheduleUpdateInputSchema } = await import('../routers/schedule');
      expect(scheduleUpdateInputSchema).toBeDefined();

      // Valid: partial update with just enabled
      expect(scheduleUpdateInputSchema.safeParse({
        projectPath: '/test',
        taskId: 'task-1',
        updates: { enabled: false },
      }).success).toBe(true);

      // Valid: partial update with name
      expect(scheduleUpdateInputSchema.safeParse({
        projectPath: '/test',
        taskId: 'task-1',
        updates: { name: 'Updated name' },
      }).success).toBe(true);

      // Invalid: empty taskId
      expect(scheduleUpdateInputSchema.safeParse({
        projectPath: '/test',
        taskId: '',
        updates: { enabled: false },
      }).success).toBe(false);
    });

    it('should export scheduleDeleteInputSchema', async () => {
      const { scheduleDeleteInputSchema } = await import('../routers/schedule');
      expect(scheduleDeleteInputSchema).toBeDefined();

      expect(scheduleDeleteInputSchema.safeParse({ projectPath: '/test', taskId: 'task-1' }).success).toBe(true);
      expect(scheduleDeleteInputSchema.safeParse({ projectPath: '/test', taskId: '' }).success).toBe(false);
    });

    it('should export scheduleExecuteImmediatelyInputSchema', async () => {
      const { scheduleExecuteImmediatelyInputSchema } = await import('../routers/schedule');
      expect(scheduleExecuteImmediatelyInputSchema).toBeDefined();

      // Valid without force
      expect(scheduleExecuteImmediatelyInputSchema.safeParse({
        projectPath: '/test',
        taskId: 'task-1',
      }).success).toBe(true);

      // Valid with force
      expect(scheduleExecuteImmediatelyInputSchema.safeParse({
        projectPath: '/test',
        taskId: 'task-1',
        force: true,
      }).success).toBe(true);

      // Invalid: empty taskId
      expect(scheduleExecuteImmediatelyInputSchema.safeParse({
        projectPath: '/test',
        taskId: '',
      }).success).toBe(false);
    });

    it('should export reportIdleTimeInputSchema', async () => {
      const { reportIdleTimeInputSchema } = await import('../routers/schedule');
      expect(reportIdleTimeInputSchema).toBeDefined();

      expect(reportIdleTimeInputSchema.safeParse({ lastActivityTime: Date.now() }).success).toBe(true);
      expect(reportIdleTimeInputSchema.safeParse({ lastActivityTime: 'invalid' }).success).toBe(false);
    });
  });
});
