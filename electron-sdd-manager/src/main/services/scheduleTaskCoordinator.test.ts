/**
 * ScheduleTaskCoordinator Test
 * Task 2.3: スケジュール管理コーディネーターを実装
 * Task 2.4: 回避ルールと実行制御を実装
 * Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 6.3, 7.2, 7.5, 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ScheduleTaskCoordinator,
  type ScheduleTaskCoordinatorService,
  type QueuedTask,
  type ScheduleTaskCoordinatorDeps,
  type RunningAgentInfo,
} from './scheduleTaskCoordinator';
import type { ScheduleTask, ScheduleCondition, AvoidanceTarget } from '../../shared/types/scheduleTask';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a mock ScheduleTask for testing
 */
function createMockTask(overrides: Partial<ScheduleTask> = {}): ScheduleTask {
  return {
    id: 'task-1',
    name: 'Test Task',
    enabled: true,
    schedule: {
      type: 'interval',
      hoursInterval: 24,
      waitForIdle: false,
    },
    prompts: [{ order: 0, content: '/kiro:steering' }],
    avoidance: {
      targets: [],
      behavior: 'wait',
    },
    workflow: {
      enabled: false,
    },
    behavior: 'wait',
    lastExecutedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

/**
 * Create mock dependencies for testing
 */
function createMockDeps(): ScheduleTaskCoordinatorDeps {
  return {
    getIdleTimeMs: vi.fn().mockReturnValue(0),
    getAllTasks: vi.fn().mockResolvedValue([]),
    updateLastExecutedAt: vi.fn().mockResolvedValue(undefined),
    getRunningAgents: vi.fn().mockReturnValue([]),
    onTaskQueued: vi.fn(),
    onTaskStarted: vi.fn(),
    onTaskCompleted: vi.fn(),
    onTaskSkipped: vi.fn(),
    onAvoidanceWaiting: vi.fn(),
    logger: {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
}

/**
 * Create a mock RunningAgentInfo for testing
 */
function createMockRunningAgent(phase: string, specId?: string): RunningAgentInfo {
  return {
    agentId: `agent-${phase}-${Date.now()}`,
    phase,
    specId: specId ?? `spec-${phase}`,
    startedAt: Date.now(),
  };
}

// =============================================================================
// Tests: Initialization
// =============================================================================

describe('ScheduleTaskCoordinator', () => {
  let coordinator: ScheduleTaskCoordinator;
  let mockDeps: ScheduleTaskCoordinatorDeps;

  beforeEach(() => {
    vi.useFakeTimers();
    mockDeps = createMockDeps();
  });

  afterEach(() => {
    if (coordinator) {
      coordinator.dispose();
    }
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with project path', async () => {
      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);

      await coordinator.initialize();

      expect(mockDeps.getAllTasks).toHaveBeenCalledWith('/project/path');
      expect(mockDeps.logger.info).toHaveBeenCalled();
    });

    it('should not start scheduler automatically on initialize', async () => {
      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);

      await coordinator.initialize();

      // Scheduler should not be running yet
      expect(coordinator.getQueuedTasks()).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Tests: Scheduler Start/Stop (Requirements 10.1)
  // ===========================================================================

  describe('startScheduler / stopScheduler', () => {
    it('should start the 1-minute interval scheduler', async () => {
      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      coordinator.startScheduler();

      // Fast-forward 1 minute and verify schedule check runs
      await vi.advanceTimersByTimeAsync(60_000);

      expect(mockDeps.getAllTasks).toHaveBeenCalledTimes(2); // Once in initialize, once in scheduler
    });

    it('should stop the scheduler', async () => {
      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      coordinator.startScheduler();
      coordinator.stopScheduler();

      // Fast-forward 2 minutes
      await vi.advanceTimersByTimeAsync(120_000);

      // Should only have initial call
      expect(mockDeps.getAllTasks).toHaveBeenCalledTimes(1);
    });

    it('should run schedule check every 1 minute', async () => {
      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      coordinator.startScheduler();

      // Fast-forward 5 minutes
      await vi.advanceTimersByTimeAsync(300_000);

      // Initial + 5 scheduler runs
      expect(mockDeps.getAllTasks).toHaveBeenCalledTimes(6);
    });
  });

  // ===========================================================================
  // Tests: Interval Schedule Condition (Requirements 3.1, 10.2)
  // ===========================================================================

  describe('interval schedule condition', () => {
    it('should queue task when hoursInterval has passed since last execution', async () => {
      const now = Date.now();
      const twentyFiveHoursAgo = now - 25 * 60 * 60 * 1000; // 25 hours ago

      const task = createMockTask({
        id: 'interval-task',
        schedule: {
          type: 'interval',
          hoursInterval: 24,
          waitForIdle: false,
        },
        lastExecutedAt: twentyFiveHoursAgo,
      });

      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      coordinator.startScheduler();
      await vi.advanceTimersByTimeAsync(60_000);

      const queuedTasks = coordinator.getQueuedTasks();
      expect(queuedTasks).toHaveLength(1);
      expect(queuedTasks[0].taskId).toBe('interval-task');
      expect(queuedTasks[0].reason).toBe('schedule');
    });

    it('should NOT queue task when hoursInterval has NOT passed', async () => {
      const now = Date.now();
      const twentyThreeHoursAgo = now - 23 * 60 * 60 * 1000; // 23 hours ago

      const task = createMockTask({
        id: 'interval-task',
        schedule: {
          type: 'interval',
          hoursInterval: 24,
          waitForIdle: false,
        },
        lastExecutedAt: twentyThreeHoursAgo,
      });

      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      coordinator.startScheduler();
      await vi.advanceTimersByTimeAsync(60_000);

      const queuedTasks = coordinator.getQueuedTasks();
      expect(queuedTasks).toHaveLength(0);
    });

    it('should queue task when lastExecutedAt is null (never executed)', async () => {
      const task = createMockTask({
        id: 'never-executed',
        schedule: {
          type: 'interval',
          hoursInterval: 1,
          waitForIdle: false,
        },
        lastExecutedAt: null,
      });

      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      coordinator.startScheduler();
      await vi.advanceTimersByTimeAsync(60_000);

      const queuedTasks = coordinator.getQueuedTasks();
      expect(queuedTasks).toHaveLength(1);
      expect(queuedTasks[0].taskId).toBe('never-executed');
    });
  });

  // ===========================================================================
  // Tests: Weekly Schedule Condition (Requirements 3.2, 10.2)
  // ===========================================================================

  describe('weekly schedule condition', () => {
    it('should queue task when current day and hour match schedule', async () => {
      // Set current time to Monday 9:00
      const monday9am = new Date('2026-01-26T09:00:00Z'); // Monday
      vi.setSystemTime(monday9am);

      const task = createMockTask({
        id: 'weekly-task',
        schedule: {
          type: 'weekly',
          weekdays: [1], // Monday
          hourOfDay: 9,
          waitForIdle: false,
        },
        lastExecutedAt: null,
      });

      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      coordinator.startScheduler();
      await vi.advanceTimersByTimeAsync(60_000);

      const queuedTasks = coordinator.getQueuedTasks();
      expect(queuedTasks).toHaveLength(1);
      expect(queuedTasks[0].taskId).toBe('weekly-task');
      expect(queuedTasks[0].reason).toBe('schedule');
    });

    it('should NOT queue task when day does not match', async () => {
      // Set current time to Tuesday 9:00
      const tuesday9am = new Date('2026-01-27T09:00:00Z'); // Tuesday
      vi.setSystemTime(tuesday9am);

      const task = createMockTask({
        id: 'weekly-task',
        schedule: {
          type: 'weekly',
          weekdays: [1], // Monday only
          hourOfDay: 9,
          waitForIdle: false,
        },
        lastExecutedAt: null,
      });

      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      coordinator.startScheduler();
      await vi.advanceTimersByTimeAsync(60_000);

      const queuedTasks = coordinator.getQueuedTasks();
      expect(queuedTasks).toHaveLength(0);
    });

    it('should NOT queue task when hour does not match', async () => {
      // Set current time to Monday 10:00
      const monday10am = new Date('2026-01-26T10:00:00Z'); // Monday
      vi.setSystemTime(monday10am);

      const task = createMockTask({
        id: 'weekly-task',
        schedule: {
          type: 'weekly',
          weekdays: [1], // Monday
          hourOfDay: 9, // Should be 9
          waitForIdle: false,
        },
        lastExecutedAt: null,
      });

      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      coordinator.startScheduler();
      await vi.advanceTimersByTimeAsync(60_000);

      const queuedTasks = coordinator.getQueuedTasks();
      expect(queuedTasks).toHaveLength(0);
    });

    it('should support multiple weekdays', async () => {
      // Set current time to Wednesday 14:00
      const wednesday2pm = new Date('2026-01-28T14:00:00Z'); // Wednesday
      vi.setSystemTime(wednesday2pm);

      const task = createMockTask({
        id: 'multi-day-task',
        schedule: {
          type: 'weekly',
          weekdays: [1, 3, 5], // Monday, Wednesday, Friday
          hourOfDay: 14,
          waitForIdle: false,
        },
        lastExecutedAt: null,
      });

      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      coordinator.startScheduler();
      await vi.advanceTimersByTimeAsync(60_000);

      const queuedTasks = coordinator.getQueuedTasks();
      expect(queuedTasks).toHaveLength(1);
    });

    it('should NOT queue weekly task if already executed this hour', async () => {
      // Set current time to Monday 9:30
      const monday930am = new Date('2026-01-26T09:30:00Z');
      vi.setSystemTime(monday930am);

      // Last executed at Monday 9:05 (same hour)
      const monday905am = new Date('2026-01-26T09:05:00Z').getTime();

      const task = createMockTask({
        id: 'weekly-task',
        schedule: {
          type: 'weekly',
          weekdays: [1],
          hourOfDay: 9,
          waitForIdle: false,
        },
        lastExecutedAt: monday905am,
      });

      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      coordinator.startScheduler();
      await vi.advanceTimersByTimeAsync(60_000);

      const queuedTasks = coordinator.getQueuedTasks();
      expect(queuedTasks).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Tests: Idle Schedule Condition (Requirements 4.1, 4.2, 4.3, 10.3)
  // ===========================================================================

  describe('idle schedule condition', () => {
    it('should queue task when idle time exceeds idleMinutes', async () => {
      const task = createMockTask({
        id: 'idle-task',
        schedule: {
          type: 'idle',
          idleMinutes: 30,
        },
        lastExecutedAt: null,
      });

      // Mock 35 minutes of idle time
      mockDeps.getIdleTimeMs = vi.fn().mockReturnValue(35 * 60 * 1000);
      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      coordinator.startScheduler();
      await vi.advanceTimersByTimeAsync(60_000);

      const queuedTasks = coordinator.getQueuedTasks();
      expect(queuedTasks).toHaveLength(1);
      expect(queuedTasks[0].taskId).toBe('idle-task');
      expect(queuedTasks[0].reason).toBe('idle');
    });

    it('should NOT queue task when idle time is less than idleMinutes', async () => {
      const task = createMockTask({
        id: 'idle-task',
        schedule: {
          type: 'idle',
          idleMinutes: 30,
        },
        lastExecutedAt: null,
      });

      // Mock 20 minutes of idle time
      mockDeps.getIdleTimeMs = vi.fn().mockReturnValue(20 * 60 * 1000);
      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      coordinator.startScheduler();
      await vi.advanceTimersByTimeAsync(60_000);

      const queuedTasks = coordinator.getQueuedTasks();
      expect(queuedTasks).toHaveLength(0);
    });

    it('should support minute-level precision for idle time', async () => {
      const task = createMockTask({
        id: 'idle-task',
        schedule: {
          type: 'idle',
          idleMinutes: 5, // 5 minutes
        },
        lastExecutedAt: null,
      });

      // Mock exactly 5 minutes of idle time
      mockDeps.getIdleTimeMs = vi.fn().mockReturnValue(5 * 60 * 1000);
      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      coordinator.startScheduler();
      await vi.advanceTimersByTimeAsync(60_000);

      const queuedTasks = coordinator.getQueuedTasks();
      expect(queuedTasks).toHaveLength(1);
    });
  });

  // ===========================================================================
  // Tests: Wait for Idle Option (Requirements 3.3)
  // ===========================================================================

  describe('waitForIdle option', () => {
    it('should queue interval task with waitForIdle when schedule time reached', async () => {
      const now = Date.now();
      const twentyFiveHoursAgo = now - 25 * 60 * 60 * 1000;

      const task = createMockTask({
        id: 'wait-idle-task',
        schedule: {
          type: 'interval',
          hoursInterval: 24,
          waitForIdle: true,
        },
        lastExecutedAt: twentyFiveHoursAgo,
      });

      // Not idle yet
      mockDeps.getIdleTimeMs = vi.fn().mockReturnValue(0);
      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      coordinator.startScheduler();
      await vi.advanceTimersByTimeAsync(60_000);

      // Task should be queued but marked as waiting for idle
      const queuedTasks = coordinator.getQueuedTasks();
      expect(queuedTasks).toHaveLength(1);
      expect(queuedTasks[0].taskId).toBe('wait-idle-task');
      expect(queuedTasks[0].waitingForIdle).toBe(true);
    });

    it('should queue weekly task with waitForIdle when time matches', async () => {
      const monday9am = new Date('2026-01-26T09:00:00Z');
      vi.setSystemTime(monday9am);

      const task = createMockTask({
        id: 'weekly-wait-idle',
        schedule: {
          type: 'weekly',
          weekdays: [1],
          hourOfDay: 9,
          waitForIdle: true,
        },
        lastExecutedAt: null,
      });

      mockDeps.getIdleTimeMs = vi.fn().mockReturnValue(0);
      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      coordinator.startScheduler();
      await vi.advanceTimersByTimeAsync(60_000);

      const queuedTasks = coordinator.getQueuedTasks();
      expect(queuedTasks).toHaveLength(1);
      expect(queuedTasks[0].waitingForIdle).toBe(true);
    });
  });

  // ===========================================================================
  // Tests: Queue Management (Requirements 10.1)
  // ===========================================================================

  describe('queue management', () => {
    it('should not duplicate tasks in queue', async () => {
      const now = Date.now();
      const task = createMockTask({
        id: 'no-duplicate',
        schedule: {
          type: 'interval',
          hoursInterval: 1,
          waitForIdle: false,
        },
        lastExecutedAt: now - 2 * 60 * 60 * 1000, // 2 hours ago
      });

      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      coordinator.startScheduler();

      // Run scheduler twice
      await vi.advanceTimersByTimeAsync(60_000);
      await vi.advanceTimersByTimeAsync(60_000);

      const queuedTasks = coordinator.getQueuedTasks();
      expect(queuedTasks).toHaveLength(1);
    });

    it('should clear queue on clearQueue()', async () => {
      const now = Date.now();
      const task = createMockTask({
        id: 'clear-test',
        schedule: {
          type: 'interval',
          hoursInterval: 1,
          waitForIdle: false,
        },
        lastExecutedAt: now - 2 * 60 * 60 * 1000,
      });

      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      coordinator.startScheduler();
      await vi.advanceTimersByTimeAsync(60_000);

      expect(coordinator.getQueuedTasks()).toHaveLength(1);

      coordinator.clearQueue();

      expect(coordinator.getQueuedTasks()).toHaveLength(0);
    });

    it('should emit task-queued event when task is added to queue', async () => {
      const now = Date.now();
      const task = createMockTask({
        id: 'event-test',
        schedule: {
          type: 'interval',
          hoursInterval: 1,
          waitForIdle: false,
        },
        lastExecutedAt: now - 2 * 60 * 60 * 1000,
      });

      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      coordinator.startScheduler();
      await vi.advanceTimersByTimeAsync(60_000);

      expect(mockDeps.onTaskQueued).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'event-test',
        })
      );
    });
  });

  // ===========================================================================
  // Tests: Disabled Tasks
  // ===========================================================================

  describe('disabled tasks', () => {
    it('should NOT queue disabled tasks', async () => {
      const now = Date.now();
      const task = createMockTask({
        id: 'disabled-task',
        enabled: false,
        schedule: {
          type: 'interval',
          hoursInterval: 1,
          waitForIdle: false,
        },
        lastExecutedAt: now - 2 * 60 * 60 * 1000,
      });

      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      coordinator.startScheduler();
      await vi.advanceTimersByTimeAsync(60_000);

      expect(coordinator.getQueuedTasks()).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Tests: getRunningTasks
  // ===========================================================================

  describe('getRunningTasks', () => {
    it('should return empty array initially', async () => {
      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      expect(coordinator.getRunningTasks()).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Tests: dispose
  // ===========================================================================

  describe('dispose', () => {
    it('should stop scheduler and clear state on dispose', async () => {
      const now = Date.now();
      const task = createMockTask({
        schedule: {
          type: 'interval',
          hoursInterval: 1,
          waitForIdle: false,
        },
        lastExecutedAt: now - 2 * 60 * 60 * 1000,
      });

      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();
      coordinator.startScheduler();
      await vi.advanceTimersByTimeAsync(60_000);

      expect(coordinator.getQueuedTasks()).toHaveLength(1);

      coordinator.dispose();

      // Scheduler should be stopped
      await vi.advanceTimersByTimeAsync(120_000);
      expect(coordinator.getQueuedTasks()).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Tests: Avoidance Rules (Task 2.4, Requirements 6.3)
  // ===========================================================================

  describe('avoidance rules', () => {
    it('should check running agents for avoidance targets', async () => {
      const task = createMockTask({
        id: 'avoid-task',
        avoidance: {
          targets: ['spec-merge'],
          behavior: 'wait',
        },
        lastExecutedAt: null,
      });

      // Mock a running spec-merge agent
      const runningAgent = createMockRunningAgent('spec-merge');
      mockDeps.getRunningAgents = vi.fn().mockReturnValue([runningAgent]);
      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      // Check avoidance
      const result = coordinator.checkAvoidanceConflict(task);

      expect(result).not.toBeNull();
      expect(result?.conflictType).toBe('spec-merge');
    });

    it('should return null when no avoidance conflict', async () => {
      const task = createMockTask({
        id: 'no-conflict-task',
        avoidance: {
          targets: ['spec-merge'],
          behavior: 'wait',
        },
        lastExecutedAt: null,
      });

      // No running agents
      mockDeps.getRunningAgents = vi.fn().mockReturnValue([]);
      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      const result = coordinator.checkAvoidanceConflict(task);

      expect(result).toBeNull();
    });

    it('should detect schedule-task avoidance target with running schedule tasks', async () => {
      const task = createMockTask({
        id: 'avoid-schedule-task',
        avoidance: {
          targets: ['schedule-task'],
          behavior: 'wait',
        },
        lastExecutedAt: null,
      });

      // Mock a running schedule task agent
      const runningAgent = createMockRunningAgent('schedule-task');
      mockDeps.getRunningAgents = vi.fn().mockReturnValue([runningAgent]);
      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      const result = coordinator.checkAvoidanceConflict(task);

      expect(result).not.toBeNull();
      expect(result?.conflictType).toBe('schedule-task');
    });

    it('should detect commit avoidance', async () => {
      const task = createMockTask({
        id: 'avoid-commit-task',
        avoidance: {
          targets: ['commit'],
          behavior: 'wait',
        },
        lastExecutedAt: null,
      });

      // Mock a running commit agent
      const runningAgent = createMockRunningAgent('commit');
      mockDeps.getRunningAgents = vi.fn().mockReturnValue([runningAgent]);
      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      const result = coordinator.checkAvoidanceConflict(task);

      expect(result).not.toBeNull();
      expect(result?.conflictType).toBe('commit');
    });

    it('should detect bug-merge avoidance', async () => {
      const task = createMockTask({
        id: 'avoid-bug-merge-task',
        avoidance: {
          targets: ['bug-merge'],
          behavior: 'wait',
        },
        lastExecutedAt: null,
      });

      // Mock a running bug-merge agent
      const runningAgent = createMockRunningAgent('bug-merge');
      mockDeps.getRunningAgents = vi.fn().mockReturnValue([runningAgent]);
      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      const result = coordinator.checkAvoidanceConflict(task);

      expect(result).not.toBeNull();
      expect(result?.conflictType).toBe('bug-merge');
    });

    it('should support multiple avoidance targets', async () => {
      const task = createMockTask({
        id: 'multi-avoid-task',
        avoidance: {
          targets: ['spec-merge', 'commit', 'bug-merge'],
          behavior: 'wait',
        },
        lastExecutedAt: null,
      });

      // Mock a running commit agent (one of the targets)
      const runningAgent = createMockRunningAgent('commit');
      mockDeps.getRunningAgents = vi.fn().mockReturnValue([runningAgent]);
      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      const result = coordinator.checkAvoidanceConflict(task);

      expect(result).not.toBeNull();
      expect(result?.conflictType).toBe('commit');
    });
  });

  // ===========================================================================
  // Tests: Wait/Skip Behavior (Task 2.4, Requirements 6.3)
  // ===========================================================================

  describe('wait/skip behavior', () => {
    it('should wait when behavior is "wait" and avoidance conflict exists', async () => {
      const now = Date.now();
      const task = createMockTask({
        id: 'wait-behavior-task',
        schedule: {
          type: 'interval',
          hoursInterval: 1,
          waitForIdle: false,
        },
        lastExecutedAt: now - 2 * 60 * 60 * 1000,
        avoidance: {
          targets: ['spec-merge'],
          behavior: 'wait',
        },
      });

      // Mock a running spec-merge agent
      const runningAgent = createMockRunningAgent('spec-merge');
      mockDeps.getRunningAgents = vi.fn().mockReturnValue([runningAgent]);
      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      coordinator.startScheduler();
      await vi.advanceTimersByTimeAsync(60_000);

      // Task should be in queue
      const queuedTasks = coordinator.getQueuedTasks();
      expect(queuedTasks).toHaveLength(1);
      expect(queuedTasks[0].taskId).toBe('wait-behavior-task');

      // Process queue - should trigger avoidance check
      await coordinator.processQueue();

      // Task should still be in queue (waiting)
      expect(coordinator.getQueuedTasks()).toHaveLength(1);

      // onAvoidanceWaiting should be called
      expect(mockDeps.onAvoidanceWaiting).toHaveBeenCalledWith(
        'wait-behavior-task',
        'spec-merge'
      );
    });

    it('should skip when behavior is "skip" and avoidance conflict exists', async () => {
      const now = Date.now();
      const task = createMockTask({
        id: 'skip-behavior-task',
        schedule: {
          type: 'interval',
          hoursInterval: 1,
          waitForIdle: false,
        },
        lastExecutedAt: now - 2 * 60 * 60 * 1000,
        avoidance: {
          targets: ['spec-merge'],
          behavior: 'skip',
        },
      });

      // Mock a running spec-merge agent
      const runningAgent = createMockRunningAgent('spec-merge');
      mockDeps.getRunningAgents = vi.fn().mockReturnValue([runningAgent]);
      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      coordinator.startScheduler();
      await vi.advanceTimersByTimeAsync(60_000);

      // Task should be queued
      const queuedTasks = coordinator.getQueuedTasks();
      expect(queuedTasks).toHaveLength(1);

      // Try to process queue - should skip
      await coordinator.processQueue();

      // Task should be removed from queue (skipped)
      expect(coordinator.getQueuedTasks()).toHaveLength(0);

      // onTaskSkipped should be called
      expect(mockDeps.onTaskSkipped).toHaveBeenCalledWith(
        'skip-behavior-task',
        expect.stringContaining('spec-merge')
      );
    });
  });

  // ===========================================================================
  // Tests: Immediate Execution (Task 2.4, Requirements 7.2, 7.5)
  // ===========================================================================

  describe('immediate execution', () => {
    it('should execute immediately without checking avoidance rules', async () => {
      const task = createMockTask({
        id: 'immediate-task',
        avoidance: {
          targets: ['spec-merge'],
          behavior: 'wait',
        },
        lastExecutedAt: null,
      });

      // Mock a running spec-merge agent
      const runningAgent = createMockRunningAgent('spec-merge');
      mockDeps.getRunningAgents = vi.fn().mockReturnValue([runningAgent]);
      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      // Execute immediately (bypasses avoidance rules)
      const result = await coordinator.executeImmediately('immediate-task');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.taskId).toBe('immediate-task');
      }
    });

    it('should return TASK_NOT_FOUND error for unknown task', async () => {
      mockDeps.getAllTasks = vi.fn().mockResolvedValue([]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      const result = await coordinator.executeImmediately('unknown-task');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('TASK_NOT_FOUND');
      }
    });

    it('should return ALREADY_RUNNING error when task is already running', async () => {
      const task = createMockTask({
        id: 'running-task',
        lastExecutedAt: null,
      });

      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      // First execution
      const result1 = await coordinator.executeImmediately('running-task');
      expect(result1.ok).toBe(true);

      // Second execution should fail
      const result2 = await coordinator.executeImmediately('running-task');
      expect(result2.ok).toBe(false);
      if (!result2.ok) {
        expect(result2.error.type).toBe('ALREADY_RUNNING');
      }
    });

    it('should detect avoidance conflict but proceed with force=true (Req 7.5)', async () => {
      const task = createMockTask({
        id: 'force-task',
        avoidance: {
          targets: ['spec-merge'],
          behavior: 'wait',
        },
        lastExecutedAt: null,
      });

      // Mock a running spec-merge agent
      const runningAgent = createMockRunningAgent('spec-merge');
      mockDeps.getRunningAgents = vi.fn().mockReturnValue([runningAgent]);
      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      // Check if there's an avoidance conflict (for warning dialog)
      const conflict = coordinator.checkAvoidanceConflict(task);
      expect(conflict).not.toBeNull();

      // Force execution anyway
      const result = await coordinator.executeImmediately('force-task', true);

      expect(result.ok).toBe(true);
    });
  });

  // ===========================================================================
  // Tests: Last Execution Time Recording (Task 2.4, Requirements 9.4)
  // ===========================================================================

  describe('last execution time recording', () => {
    it('should record lastExecutedAt when task starts execution', async () => {
      const task = createMockTask({
        id: 'record-time-task',
        lastExecutedAt: null,
      });

      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      const beforeExecution = Date.now();
      await coordinator.executeImmediately('record-time-task');
      const afterExecution = Date.now();

      // Should have called updateLastExecutedAt
      expect(mockDeps.updateLastExecutedAt).toHaveBeenCalledWith(
        '/project/path',
        'record-time-task',
        expect.any(Number)
      );

      // Verify the timestamp is reasonable
      const calledTimestamp = (mockDeps.updateLastExecutedAt as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(calledTimestamp).toBeGreaterThanOrEqual(beforeExecution);
      expect(calledTimestamp).toBeLessThanOrEqual(afterExecution);
    });
  });

  // ===========================================================================
  // Tests: Execution Conditions (Task 2.4, Requirements 10.4, 10.5)
  // ===========================================================================

  describe('execution conditions', () => {
    it('should execute task when no avoidance conflict (Req 10.4)', async () => {
      const now = Date.now();
      const task = createMockTask({
        id: 'execute-condition-task',
        schedule: {
          type: 'interval',
          hoursInterval: 1,
          waitForIdle: false,
        },
        lastExecutedAt: now - 2 * 60 * 60 * 1000,
        avoidance: {
          targets: [],
          behavior: 'wait',
        },
      });

      mockDeps.getRunningAgents = vi.fn().mockReturnValue([]);
      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      coordinator.startScheduler();
      await vi.advanceTimersByTimeAsync(60_000);

      // Task should be queued
      expect(coordinator.getQueuedTasks()).toHaveLength(1);

      // Process queue - should execute
      await coordinator.processQueue();

      // onTaskStarted should be called
      expect(mockDeps.onTaskStarted).toHaveBeenCalledWith(
        'execute-condition-task',
        expect.objectContaining({ taskId: 'execute-condition-task' })
      );
    });

    it('should wait for idle before executing when waitingForIdle is true (Req 10.5)', async () => {
      const now = Date.now();
      const task = createMockTask({
        id: 'wait-idle-exec-task',
        schedule: {
          type: 'interval',
          hoursInterval: 1,
          waitForIdle: true,
        },
        lastExecutedAt: now - 2 * 60 * 60 * 1000,
        avoidance: {
          targets: [],
          behavior: 'wait',
        },
      });

      // Not idle initially
      mockDeps.getIdleTimeMs = vi.fn().mockReturnValue(0);
      mockDeps.getRunningAgents = vi.fn().mockReturnValue([]);
      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      coordinator.startScheduler();
      await vi.advanceTimersByTimeAsync(60_000);

      // Task should be queued with waitingForIdle=true
      const queuedTasks = coordinator.getQueuedTasks();
      expect(queuedTasks).toHaveLength(1);
      expect(queuedTasks[0].waitingForIdle).toBe(true);

      // Process queue while not idle - should NOT execute
      await coordinator.processQueue();
      expect(mockDeps.onTaskStarted).not.toHaveBeenCalled();

      // Now simulate idle state
      mockDeps.getIdleTimeMs = vi.fn().mockReturnValue(5 * 60 * 1000); // 5 minutes idle

      // Process queue again - should execute now
      await coordinator.processQueue();
      expect(mockDeps.onTaskStarted).toHaveBeenCalledWith(
        'wait-idle-exec-task',
        expect.objectContaining({ taskId: 'wait-idle-exec-task' })
      );
    });

    it('should execute immediately when waitingForIdle is false and no conflicts', async () => {
      const now = Date.now();
      const task = createMockTask({
        id: 'no-wait-task',
        schedule: {
          type: 'interval',
          hoursInterval: 1,
          waitForIdle: false,
        },
        lastExecutedAt: now - 2 * 60 * 60 * 1000,
        avoidance: {
          targets: [],
          behavior: 'wait',
        },
      });

      mockDeps.getIdleTimeMs = vi.fn().mockReturnValue(0); // Not idle
      mockDeps.getRunningAgents = vi.fn().mockReturnValue([]);
      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      coordinator.startScheduler();
      await vi.advanceTimersByTimeAsync(60_000);

      // Task should be queued without waitingForIdle
      const queuedTasks = coordinator.getQueuedTasks();
      expect(queuedTasks).toHaveLength(1);
      expect(queuedTasks[0].waitingForIdle).toBeFalsy();

      // Process queue - should execute even though not idle
      await coordinator.processQueue();
      expect(mockDeps.onTaskStarted).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Tests: Queue Processing Integration
  // ===========================================================================

  describe('queue processing integration', () => {
    it('should process queue and respect avoidance rules', async () => {
      const now = Date.now();
      const task1 = createMockTask({
        id: 'task-1',
        schedule: { type: 'interval', hoursInterval: 1, waitForIdle: false },
        lastExecutedAt: now - 2 * 60 * 60 * 1000,
        avoidance: { targets: ['spec-merge'], behavior: 'wait' },
      });
      const task2 = createMockTask({
        id: 'task-2',
        schedule: { type: 'interval', hoursInterval: 1, waitForIdle: false },
        lastExecutedAt: now - 2 * 60 * 60 * 1000,
        avoidance: { targets: [], behavior: 'wait' },
      });

      // Mock a running spec-merge agent
      const runningAgent = createMockRunningAgent('spec-merge');
      mockDeps.getRunningAgents = vi.fn().mockReturnValue([runningAgent]);
      mockDeps.getAllTasks = vi.fn().mockResolvedValue([task1, task2]);

      coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
      await coordinator.initialize();

      coordinator.startScheduler();
      await vi.advanceTimersByTimeAsync(60_000);

      // Both tasks should be queued
      expect(coordinator.getQueuedTasks()).toHaveLength(2);

      // Process queue
      await coordinator.processQueue();

      // task-1 should still be waiting (spec-merge conflict)
      // task-2 should have been executed (no conflict)
      const remainingTasks = coordinator.getQueuedTasks();
      expect(remainingTasks).toHaveLength(1);
      expect(remainingTasks[0].taskId).toBe('task-1');

      expect(mockDeps.onTaskStarted).toHaveBeenCalledWith(
        'task-2',
        expect.objectContaining({ taskId: 'task-2' })
      );
    });
  });

  // ===========================================================================
  // Tests: Workflow Mode and Agent Execution (Task 2.5)
  // Requirements: 5.4, 5.5, 8.2, 8.3, 8.4, 8.5, 8.6
  // ===========================================================================

  describe('workflow mode and agent execution', () => {
    // ===========================================================================
    // Tests: Worktree Creation (Requirements 8.2, 8.3, 8.4, 8.5)
    // ===========================================================================

    describe('worktree creation', () => {
      it('should create worktree with naming convention schedule/{task-name}/{suffix} when workflow enabled (Req 8.2, 8.3)', async () => {
        const task = createMockTask({
          id: 'workflow-task',
          name: 'test-task',
          workflow: {
            enabled: true,
            suffixMode: 'auto',
          },
          prompts: [{ order: 0, content: '/kiro:steering' }],
          lastExecutedAt: null,
        });

        // Mock worktree creation
        const mockCreateWorktree = vi.fn().mockResolvedValue({
          ok: true,
          value: {
            path: '.kiro/worktrees/schedule/test-task/20260125-120000',
            absolutePath: '/project/path/.kiro/worktrees/schedule/test-task/20260125-120000',
            branch: 'schedule/test-task/20260125-120000',
            created_at: '2026-01-25T12:00:00Z',
          },
        });

        // Mock agent start
        const mockStartAgent = vi.fn().mockResolvedValue({
          ok: true,
          value: { agentId: 'agent-1' },
        });

        const depsWithWorkflow: ScheduleTaskCoordinatorDeps = {
          ...mockDeps,
          getAllTasks: vi.fn().mockResolvedValue([task]),
          createScheduleWorktree: mockCreateWorktree,
          startScheduleAgent: mockStartAgent,
        };

        coordinator = new ScheduleTaskCoordinator('/project/path', depsWithWorkflow);
        await coordinator.initialize();

        // Execute immediately
        const result = await coordinator.executeImmediately('workflow-task');

        expect(result.ok).toBe(true);
        // Verify worktree was created with correct naming
        expect(mockCreateWorktree).toHaveBeenCalledWith(
          expect.objectContaining({
            taskName: 'test-task',
            suffixMode: 'auto',
          })
        );
      });

      it('should use custom suffix with date appended when suffixMode is custom (Req 8.4)', async () => {
        const task = createMockTask({
          id: 'custom-suffix-task',
          name: 'test-task',
          workflow: {
            enabled: true,
            suffixMode: 'custom',
            customSuffix: 'hoge-task',
          },
          prompts: [{ order: 0, content: '/kiro:steering' }],
          lastExecutedAt: null,
        });

        const mockCreateWorktree = vi.fn().mockResolvedValue({
          ok: true,
          value: {
            path: '.kiro/worktrees/schedule/test-task/hoge-task-20260125',
            absolutePath: '/project/path/.kiro/worktrees/schedule/test-task/hoge-task-20260125',
            branch: 'schedule/test-task/hoge-task-20260125',
            created_at: '2026-01-25T12:00:00Z',
          },
        });

        const mockStartAgent = vi.fn().mockResolvedValue({
          ok: true,
          value: { agentId: 'agent-1' },
        });

        const depsWithWorkflow: ScheduleTaskCoordinatorDeps = {
          ...mockDeps,
          getAllTasks: vi.fn().mockResolvedValue([task]),
          createScheduleWorktree: mockCreateWorktree,
          startScheduleAgent: mockStartAgent,
        };

        coordinator = new ScheduleTaskCoordinator('/project/path', depsWithWorkflow);
        await coordinator.initialize();

        await coordinator.executeImmediately('custom-suffix-task');

        expect(mockCreateWorktree).toHaveBeenCalledWith(
          expect.objectContaining({
            taskName: 'test-task',
            suffixMode: 'custom',
            customSuffix: 'hoge-task',
          })
        );
      });

      it('should create separate worktree for each prompt (Req 8.5)', async () => {
        const task = createMockTask({
          id: 'multi-prompt-workflow-task',
          name: 'multi-prompt-task',
          workflow: {
            enabled: true,
            suffixMode: 'auto',
          },
          prompts: [
            { order: 0, content: '/kiro:steering' },
            { order: 1, content: '/kiro:other-command' },
          ],
          lastExecutedAt: null,
        });

        const mockCreateWorktree = vi.fn().mockResolvedValue({
          ok: true,
          value: {
            path: '.kiro/worktrees/schedule/multi-prompt-task/auto-suffix',
            absolutePath: '/project/path/.kiro/worktrees/schedule/multi-prompt-task/auto-suffix',
            branch: 'schedule/multi-prompt-task/auto-suffix',
            created_at: '2026-01-25T12:00:00Z',
          },
        });

        const mockStartAgent = vi.fn().mockResolvedValue({
          ok: true,
          value: { agentId: `agent-${Date.now()}` },
        });

        const depsWithWorkflow: ScheduleTaskCoordinatorDeps = {
          ...mockDeps,
          getAllTasks: vi.fn().mockResolvedValue([task]),
          createScheduleWorktree: mockCreateWorktree,
          startScheduleAgent: mockStartAgent,
        };

        coordinator = new ScheduleTaskCoordinator('/project/path', depsWithWorkflow);
        await coordinator.initialize();

        await coordinator.executeImmediately('multi-prompt-workflow-task');

        // Should create 2 worktrees (one for each prompt)
        expect(mockCreateWorktree).toHaveBeenCalledTimes(2);
      });

      it('should NOT create worktree when workflow disabled (Req 8.6 implicit)', async () => {
        const task = createMockTask({
          id: 'no-workflow-task',
          name: 'test-task',
          workflow: {
            enabled: false,
          },
          prompts: [{ order: 0, content: '/kiro:steering' }],
          lastExecutedAt: null,
        });

        const mockCreateWorktree = vi.fn();
        const mockStartAgent = vi.fn().mockResolvedValue({
          ok: true,
          value: { agentId: 'agent-1' },
        });

        const depsWithWorkflow: ScheduleTaskCoordinatorDeps = {
          ...mockDeps,
          getAllTasks: vi.fn().mockResolvedValue([task]),
          createScheduleWorktree: mockCreateWorktree,
          startScheduleAgent: mockStartAgent,
        };

        coordinator = new ScheduleTaskCoordinator('/project/path', depsWithWorkflow);
        await coordinator.initialize();

        await coordinator.executeImmediately('no-workflow-task');

        // Worktree should NOT be created
        expect(mockCreateWorktree).not.toHaveBeenCalled();
        // But agent should still be started
        expect(mockStartAgent).toHaveBeenCalled();
      });
    });

    // ===========================================================================
    // Tests: Agent Startup (Requirements 5.4)
    // ===========================================================================

    describe('agent startup per prompt', () => {
      it('should start separate agent for each prompt (Req 5.4)', async () => {
        const task = createMockTask({
          id: 'multi-prompt-task',
          name: 'test-task',
          workflow: { enabled: false },
          prompts: [
            { order: 0, content: '/kiro:steering' },
            { order: 1, content: '/kiro:spec-status' },
            { order: 2, content: '/kiro:other' },
          ],
          lastExecutedAt: null,
        });

        const mockStartAgent = vi.fn().mockResolvedValue({
          ok: true,
          value: { agentId: `agent-${Date.now()}` },
        });

        const depsWithAgent: ScheduleTaskCoordinatorDeps = {
          ...mockDeps,
          getAllTasks: vi.fn().mockResolvedValue([task]),
          startScheduleAgent: mockStartAgent,
        };

        coordinator = new ScheduleTaskCoordinator('/project/path', depsWithAgent);
        await coordinator.initialize();

        const result = await coordinator.executeImmediately('multi-prompt-task');

        expect(result.ok).toBe(true);
        // 3 prompts = 3 agent starts
        expect(mockStartAgent).toHaveBeenCalledTimes(3);
        // Verify prompts are passed correctly
        expect(mockStartAgent).toHaveBeenNthCalledWith(1,
          expect.objectContaining({ prompt: '/kiro:steering', promptIndex: 0 })
        );
        expect(mockStartAgent).toHaveBeenNthCalledWith(2,
          expect.objectContaining({ prompt: '/kiro:spec-status', promptIndex: 1 })
        );
        expect(mockStartAgent).toHaveBeenNthCalledWith(3,
          expect.objectContaining({ prompt: '/kiro:other', promptIndex: 2 })
        );
      });

      it('should pass task info to agent start', async () => {
        const task = createMockTask({
          id: 'agent-info-task',
          name: 'my-task',
          workflow: { enabled: false },
          prompts: [{ order: 0, content: '/kiro:steering' }],
          lastExecutedAt: null,
        });

        const mockStartAgent = vi.fn().mockResolvedValue({
          ok: true,
          value: { agentId: 'agent-1' },
        });

        const depsWithAgent: ScheduleTaskCoordinatorDeps = {
          ...mockDeps,
          getAllTasks: vi.fn().mockResolvedValue([task]),
          startScheduleAgent: mockStartAgent,
        };

        coordinator = new ScheduleTaskCoordinator('/project/path', depsWithAgent);
        await coordinator.initialize();

        await coordinator.executeImmediately('agent-info-task');

        expect(mockStartAgent).toHaveBeenCalledWith(
          expect.objectContaining({
            taskId: 'agent-info-task',
            taskName: 'my-task',
            prompt: '/kiro:steering',
            promptIndex: 0,
          })
        );
      });
    });

    // ===========================================================================
    // Tests: Parallel Execution (Requirements 5.5)
    // ===========================================================================

    describe('parallel execution', () => {
      it('should execute prompts sequentially by default (Req 5.5 - sequential)', async () => {
        const task = createMockTask({
          id: 'sequential-task',
          name: 'test-task',
          workflow: { enabled: false },
          prompts: [
            { order: 0, content: '/kiro:first' },
            { order: 1, content: '/kiro:second' },
          ],
          // Default behavior is 'wait' (sequential)
          behavior: 'wait',
          lastExecutedAt: null,
        });

        const executionOrder: number[] = [];
        const mockStartAgent = vi.fn().mockImplementation(async (options) => {
          executionOrder.push(options.promptIndex);
          return { ok: true, value: { agentId: `agent-${options.promptIndex}` } };
        });

        const depsWithAgent: ScheduleTaskCoordinatorDeps = {
          ...mockDeps,
          getAllTasks: vi.fn().mockResolvedValue([task]),
          startScheduleAgent: mockStartAgent,
        };

        coordinator = new ScheduleTaskCoordinator('/project/path', depsWithAgent);
        await coordinator.initialize();

        await coordinator.executeImmediately('sequential-task');

        // Verify sequential execution order
        expect(executionOrder).toEqual([0, 1]);
      });

      it('should return all agent IDs in execution result', async () => {
        const task = createMockTask({
          id: 'multi-agent-task',
          name: 'test-task',
          workflow: { enabled: false },
          prompts: [
            { order: 0, content: '/kiro:first' },
            { order: 1, content: '/kiro:second' },
          ],
          lastExecutedAt: null,
        });

        let agentCounter = 0;
        const mockStartAgent = vi.fn().mockImplementation(async () => {
          agentCounter++;
          return { ok: true, value: { agentId: `agent-${agentCounter}` } };
        });

        const depsWithAgent: ScheduleTaskCoordinatorDeps = {
          ...mockDeps,
          getAllTasks: vi.fn().mockResolvedValue([task]),
          startScheduleAgent: mockStartAgent,
        };

        coordinator = new ScheduleTaskCoordinator('/project/path', depsWithAgent);
        await coordinator.initialize();

        const result = await coordinator.executeImmediately('multi-agent-task');

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.agentIds).toHaveLength(2);
          expect(result.value.agentIds).toContain('agent-1');
          expect(result.value.agentIds).toContain('agent-2');
        }
      });
    });

    // ===========================================================================
    // Tests: Worktree not cleaned up (Req 8.6)
    // ===========================================================================

    describe('worktree lifecycle', () => {
      it('should NOT cleanup worktree after execution (Req 8.6)', async () => {
        const task = createMockTask({
          id: 'no-cleanup-task',
          name: 'test-task',
          workflow: {
            enabled: true,
            suffixMode: 'auto',
          },
          prompts: [{ order: 0, content: '/kiro:steering' }],
          lastExecutedAt: null,
        });

        const mockCreateWorktree = vi.fn().mockResolvedValue({
          ok: true,
          value: {
            path: '.kiro/worktrees/schedule/test-task/auto-suffix',
            absolutePath: '/project/path/.kiro/worktrees/schedule/test-task/auto-suffix',
            branch: 'schedule/test-task/auto-suffix',
            created_at: '2026-01-25T12:00:00Z',
          },
        });
        const mockRemoveWorktree = vi.fn();
        const mockStartAgent = vi.fn().mockResolvedValue({
          ok: true,
          value: { agentId: 'agent-1' },
        });

        const depsWithWorkflow: ScheduleTaskCoordinatorDeps = {
          ...mockDeps,
          getAllTasks: vi.fn().mockResolvedValue([task]),
          createScheduleWorktree: mockCreateWorktree,
          removeScheduleWorktree: mockRemoveWorktree,
          startScheduleAgent: mockStartAgent,
        };

        coordinator = new ScheduleTaskCoordinator('/project/path', depsWithWorkflow);
        await coordinator.initialize();

        await coordinator.executeImmediately('no-cleanup-task');

        // Worktree should NOT be removed (system leaves it alone per Req 8.6)
        expect(mockRemoveWorktree).not.toHaveBeenCalled();
      });
    });

    // ===========================================================================
    // Tests: Error Handling
    // ===========================================================================

    describe('error handling', () => {
      it('should return AGENT_START_FAILED error when agent start fails', async () => {
        const task = createMockTask({
          id: 'agent-fail-task',
          name: 'test-task',
          workflow: { enabled: false },
          prompts: [{ order: 0, content: '/kiro:steering' }],
          lastExecutedAt: null,
        });

        const mockStartAgent = vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'AGENT_START_FAILED', message: 'Failed to start agent' },
        });

        const depsWithAgent: ScheduleTaskCoordinatorDeps = {
          ...mockDeps,
          getAllTasks: vi.fn().mockResolvedValue([task]),
          startScheduleAgent: mockStartAgent,
        };

        coordinator = new ScheduleTaskCoordinator('/project/path', depsWithAgent);
        await coordinator.initialize();

        const result = await coordinator.executeImmediately('agent-fail-task');

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('AGENT_START_FAILED');
        }
      });

      it('should return error when worktree creation fails', async () => {
        const task = createMockTask({
          id: 'worktree-fail-task',
          name: 'test-task',
          workflow: {
            enabled: true,
            suffixMode: 'auto',
          },
          prompts: [{ order: 0, content: '/kiro:steering' }],
          lastExecutedAt: null,
        });

        const mockCreateWorktree = vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'GIT_ERROR', message: 'Git operation failed' },
        });

        const depsWithWorkflow: ScheduleTaskCoordinatorDeps = {
          ...mockDeps,
          getAllTasks: vi.fn().mockResolvedValue([task]),
          createScheduleWorktree: mockCreateWorktree,
        };

        coordinator = new ScheduleTaskCoordinator('/project/path', depsWithWorkflow);
        await coordinator.initialize();

        const result = await coordinator.executeImmediately('worktree-fail-task');

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('AGENT_START_FAILED');
          expect(result.error.message).toContain('worktree');
        }
      });
    });
  });

  // ===========================================================================
  // Additional Edge Case Tests (Task 9.1: Comprehensive Unit Tests)
  // Requirements: Full coverage for edge cases
  // ===========================================================================

  describe('edge cases', () => {
    describe('task removal during queue processing', () => {
      it('should handle task being deleted while in queue', async () => {
        const now = Date.now();
        const task = createMockTask({
          id: 'deleted-task',
          schedule: {
            type: 'interval',
            hoursInterval: 1,
            waitForIdle: false,
          },
          lastExecutedAt: now - 2 * 60 * 60 * 1000,
        });

        // Initially task exists
        mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

        coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
        await coordinator.initialize();

        coordinator.startScheduler();
        await vi.advanceTimersByTimeAsync(60_000);

        // Task is queued
        expect(coordinator.getQueuedTasks()).toHaveLength(1);

        // Now simulate task being deleted (getAllTasks returns empty)
        mockDeps.getAllTasks = vi.fn().mockResolvedValue([]);

        // Process queue - task should be removed as it no longer exists
        await coordinator.processQueue();

        // Queue should be empty (deleted task removed)
        expect(coordinator.getQueuedTasks()).toHaveLength(0);
      });
    });

    describe('scheduler restart behavior', () => {
      it('should handle starting scheduler when already started', async () => {
        coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
        await coordinator.initialize();

        coordinator.startScheduler();
        coordinator.startScheduler(); // Second start should be no-op

        // Should only run scheduler once
        await vi.advanceTimersByTimeAsync(60_000);

        // Only 2 calls: 1 from initialize, 1 from scheduler
        expect(mockDeps.getAllTasks).toHaveBeenCalledTimes(2);
      });

      it('should allow restart after stop', async () => {
        coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
        await coordinator.initialize();

        coordinator.startScheduler();
        await vi.advanceTimersByTimeAsync(60_000);

        coordinator.stopScheduler();
        coordinator.startScheduler();

        await vi.advanceTimersByTimeAsync(60_000);

        // Should have: initial + 1st scheduler run + restart scheduler run = 3
        expect(mockDeps.getAllTasks).toHaveBeenCalledTimes(3);
      });
    });

    describe('multiple tasks simultaneous queueing', () => {
      it('should queue multiple tasks in same scheduler tick', async () => {
        const now = Date.now();
        const task1 = createMockTask({
          id: 'multi-1',
          schedule: {
            type: 'interval',
            hoursInterval: 1,
            waitForIdle: false,
          },
          lastExecutedAt: now - 2 * 60 * 60 * 1000,
        });
        const task2 = createMockTask({
          id: 'multi-2',
          schedule: {
            type: 'interval',
            hoursInterval: 1,
            waitForIdle: false,
          },
          lastExecutedAt: now - 3 * 60 * 60 * 1000,
        });
        const task3 = createMockTask({
          id: 'multi-3',
          schedule: {
            type: 'interval',
            hoursInterval: 1,
            waitForIdle: false,
          },
          lastExecutedAt: now - 4 * 60 * 60 * 1000,
        });

        mockDeps.getAllTasks = vi.fn().mockResolvedValue([task1, task2, task3]);

        coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
        await coordinator.initialize();

        coordinator.startScheduler();
        await vi.advanceTimersByTimeAsync(60_000);

        const queuedTasks = coordinator.getQueuedTasks();
        expect(queuedTasks).toHaveLength(3);
        expect(queuedTasks.map((t) => t.taskId)).toContain('multi-1');
        expect(queuedTasks.map((t) => t.taskId)).toContain('multi-2');
        expect(queuedTasks.map((t) => t.taskId)).toContain('multi-3');
      });
    });

    describe('boundary conditions for interval schedule', () => {
      it('should handle exact boundary when hoursInterval matches elapsed time exactly', async () => {
        const now = Date.now();
        const exactlyTwentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

        const task = createMockTask({
          id: 'exact-boundary-task',
          schedule: {
            type: 'interval',
            hoursInterval: 24,
            waitForIdle: false,
          },
          lastExecutedAt: exactlyTwentyFourHoursAgo,
        });

        mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

        coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
        await coordinator.initialize();

        coordinator.startScheduler();
        await vi.advanceTimersByTimeAsync(60_000);

        // Should be queued as elapsed time equals interval
        expect(coordinator.getQueuedTasks()).toHaveLength(1);
      });

      it('should NOT queue when elapsed time is significantly less than interval', async () => {
        // Set a fixed system time for predictable testing
        const fixedNow = new Date('2026-01-25T12:00:00Z').getTime();
        vi.setSystemTime(fixedNow);

        // 23 hours ago - well under the 24 hour threshold
        const twentyThreeHoursAgo = fixedNow - 23 * 60 * 60 * 1000;

        const task = createMockTask({
          id: 'just-under-task',
          schedule: {
            type: 'interval',
            hoursInterval: 24,
            waitForIdle: false,
          },
          lastExecutedAt: twentyThreeHoursAgo,
        });

        mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

        coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
        await coordinator.initialize();

        coordinator.startScheduler();
        await vi.advanceTimersByTimeAsync(60_000);

        // Should NOT be queued
        expect(coordinator.getQueuedTasks()).toHaveLength(0);
      });
    });

    describe('boundary conditions for weekly schedule', () => {
      it('should handle Sunday (weekday 0)', async () => {
        // Set current time to Sunday 10:00
        const sunday10am = new Date('2026-01-25T10:00:00Z'); // Sunday
        vi.setSystemTime(sunday10am);

        const task = createMockTask({
          id: 'sunday-task',
          schedule: {
            type: 'weekly',
            weekdays: [0], // Sunday
            hourOfDay: 10,
            waitForIdle: false,
          },
          lastExecutedAt: null,
        });

        mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

        coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
        await coordinator.initialize();

        coordinator.startScheduler();
        await vi.advanceTimersByTimeAsync(60_000);

        expect(coordinator.getQueuedTasks()).toHaveLength(1);
      });

      it('should handle Saturday (weekday 6)', async () => {
        // Set current time to Saturday 23:00
        const saturday11pm = new Date('2026-01-31T23:00:00Z'); // Saturday
        vi.setSystemTime(saturday11pm);

        const task = createMockTask({
          id: 'saturday-task',
          schedule: {
            type: 'weekly',
            weekdays: [6], // Saturday
            hourOfDay: 23,
            waitForIdle: false,
          },
          lastExecutedAt: null,
        });

        mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

        coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
        await coordinator.initialize();

        coordinator.startScheduler();
        await vi.advanceTimersByTimeAsync(60_000);

        expect(coordinator.getQueuedTasks()).toHaveLength(1);
      });

      it('should handle midnight (hourOfDay 0)', async () => {
        const monday0am = new Date('2026-01-26T00:00:00Z'); // Monday midnight
        vi.setSystemTime(monday0am);

        const task = createMockTask({
          id: 'midnight-task',
          schedule: {
            type: 'weekly',
            weekdays: [1],
            hourOfDay: 0, // Midnight
            waitForIdle: false,
          },
          lastExecutedAt: null,
        });

        mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

        coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
        await coordinator.initialize();

        coordinator.startScheduler();
        await vi.advanceTimersByTimeAsync(60_000);

        expect(coordinator.getQueuedTasks()).toHaveLength(1);
      });

      it('should handle 11pm (hourOfDay 23)', async () => {
        const monday11pm = new Date('2026-01-26T23:00:00Z');
        vi.setSystemTime(monday11pm);

        const task = createMockTask({
          id: 'late-night-task',
          schedule: {
            type: 'weekly',
            weekdays: [1],
            hourOfDay: 23, // 11 PM
            waitForIdle: false,
          },
          lastExecutedAt: null,
        });

        mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

        coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
        await coordinator.initialize();

        coordinator.startScheduler();
        await vi.advanceTimersByTimeAsync(60_000);

        expect(coordinator.getQueuedTasks()).toHaveLength(1);
      });
    });

    describe('boundary conditions for idle schedule', () => {
      it('should queue task when idle time exactly equals threshold', async () => {
        const task = createMockTask({
          id: 'exact-idle-task',
          schedule: {
            type: 'idle',
            idleMinutes: 10,
          },
          lastExecutedAt: null,
        });

        // Exactly 10 minutes idle
        mockDeps.getIdleTimeMs = vi.fn().mockReturnValue(10 * 60 * 1000);
        mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

        coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
        await coordinator.initialize();

        coordinator.startScheduler();
        await vi.advanceTimersByTimeAsync(60_000);

        expect(coordinator.getQueuedTasks()).toHaveLength(1);
      });

      it('should NOT queue when idle time is 1ms less than threshold', async () => {
        const task = createMockTask({
          id: 'just-under-idle-task',
          schedule: {
            type: 'idle',
            idleMinutes: 10,
          },
          lastExecutedAt: null,
        });

        // Just under 10 minutes
        mockDeps.getIdleTimeMs = vi.fn().mockReturnValue(10 * 60 * 1000 - 1);
        mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

        coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
        await coordinator.initialize();

        coordinator.startScheduler();
        await vi.advanceTimersByTimeAsync(60_000);

        expect(coordinator.getQueuedTasks()).toHaveLength(0);
      });

      it('should handle idle time of 1 minute (minimum)', async () => {
        const task = createMockTask({
          id: 'one-minute-idle-task',
          schedule: {
            type: 'idle',
            idleMinutes: 1,
          },
          lastExecutedAt: null,
        });

        // Exactly 1 minute idle
        mockDeps.getIdleTimeMs = vi.fn().mockReturnValue(60_000);
        mockDeps.getAllTasks = vi.fn().mockResolvedValue([task]);

        coordinator = new ScheduleTaskCoordinator('/project/path', mockDeps);
        await coordinator.initialize();

        coordinator.startScheduler();
        await vi.advanceTimersByTimeAsync(60_000);

        expect(coordinator.getQueuedTasks()).toHaveLength(1);
      });
    });

    describe('event callbacks', () => {
      it('should call onTaskStarted callback with correct execution result', async () => {
        const task = createMockTask({
          id: 'callback-task',
          name: 'test-callback',
          prompts: [
            { order: 0, content: '/first' },
            { order: 1, content: '/second' },
          ],
          lastExecutedAt: null,
        });

        const mockStartAgent = vi.fn().mockImplementation(async (options) => ({
          ok: true,
          value: { agentId: `agent-${options.promptIndex}` },
        }));

        const depsWithCallback: ScheduleTaskCoordinatorDeps = {
          ...mockDeps,
          getAllTasks: vi.fn().mockResolvedValue([task]),
          startScheduleAgent: mockStartAgent,
          onTaskStarted: vi.fn(),
        };

        coordinator = new ScheduleTaskCoordinator('/project/path', depsWithCallback);
        await coordinator.initialize();

        await coordinator.executeImmediately('callback-task');

        expect(depsWithCallback.onTaskStarted).toHaveBeenCalledWith(
          'callback-task',
          expect.objectContaining({
            taskId: 'callback-task',
            agentIds: ['agent-0', 'agent-1'],
          })
        );
      });
    });

    describe('prompts ordering', () => {
      it('should execute prompts in order field order, not array order', async () => {
        const task = createMockTask({
          id: 'order-test-task',
          name: 'test-order',
          prompts: [
            { order: 2, content: '/third' },
            { order: 0, content: '/first' },
            { order: 1, content: '/second' },
          ],
          lastExecutedAt: null,
        });

        const executedPrompts: string[] = [];
        const mockStartAgent = vi.fn().mockImplementation(async (options) => {
          executedPrompts.push(options.prompt);
          return { ok: true, value: { agentId: `agent-${options.promptIndex}` } };
        });

        const depsWithAgent: ScheduleTaskCoordinatorDeps = {
          ...mockDeps,
          getAllTasks: vi.fn().mockResolvedValue([task]),
          startScheduleAgent: mockStartAgent,
        };

        coordinator = new ScheduleTaskCoordinator('/project/path', depsWithAgent);
        await coordinator.initialize();

        await coordinator.executeImmediately('order-test-task');

        // Should execute in order: 0, 1, 2
        expect(executedPrompts).toEqual(['/first', '/second', '/third']);
      });
    });

    describe('running tasks tracking', () => {
      it('should track running task after execution starts', async () => {
        const task = createMockTask({
          id: 'track-running-task',
          lastExecutedAt: null,
        });

        const mockStartAgent = vi.fn().mockResolvedValue({
          ok: true,
          value: { agentId: 'tracked-agent-id' },
        });

        const depsWithAgent: ScheduleTaskCoordinatorDeps = {
          ...mockDeps,
          getAllTasks: vi.fn().mockResolvedValue([task]),
          startScheduleAgent: mockStartAgent,
        };

        coordinator = new ScheduleTaskCoordinator('/project/path', depsWithAgent);
        await coordinator.initialize();

        // Initially no running tasks
        expect(coordinator.getRunningTasks()).toHaveLength(0);

        await coordinator.executeImmediately('track-running-task');

        // Now should have a running task
        const runningTasks = coordinator.getRunningTasks();
        expect(runningTasks).toHaveLength(1);
        expect(runningTasks[0].taskId).toBe('track-running-task');
      });
    });
  });

  // ===========================================================================
  // Integration Tests (Task 9.2)
  // Requirements: 4.3 (Idle Detection Integration), 5.4 (Agent Startup Flow)
  // ===========================================================================

  describe('integration tests', () => {
    // ===========================================================================
    // Integration: ScheduleTaskCoordinator + idleTimeTracker
    // Requirements: 4.3 - Idle detection integration
    // ===========================================================================

    describe('ScheduleTaskCoordinator + idleTimeTracker integration', () => {
      it('should integrate with idleTimeTracker to detect idle and queue task (Req 4.3)', async () => {
        const task = createMockTask({
          id: 'idle-integration-task',
          schedule: {
            type: 'idle',
            idleMinutes: 5,
          },
          lastExecutedAt: null,
        });

        // Simulate idleTimeTracker providing idle time
        // Initially not idle
        let simulatedIdleMs = 0;
        const mockGetIdleTimeMs = vi.fn(() => simulatedIdleMs);

        const integrationDeps: ScheduleTaskCoordinatorDeps = {
          ...mockDeps,
          getIdleTimeMs: mockGetIdleTimeMs,
          getAllTasks: vi.fn().mockResolvedValue([task]),
        };

        coordinator = new ScheduleTaskCoordinator('/project/path', integrationDeps);
        await coordinator.initialize();
        coordinator.startScheduler();

        // First check: Not idle enough
        await vi.advanceTimersByTimeAsync(60_000);
        expect(coordinator.getQueuedTasks()).toHaveLength(0);
        expect(mockGetIdleTimeMs).toHaveBeenCalled();

        // Simulate user activity ending - idle time starts accumulating
        simulatedIdleMs = 5 * 60 * 1000; // 5 minutes idle

        // Second check: Now idle enough
        await vi.advanceTimersByTimeAsync(60_000);
        expect(coordinator.getQueuedTasks()).toHaveLength(1);
        expect(coordinator.getQueuedTasks()[0].reason).toBe('idle');
      });

      it('should correctly calculate idle time for fixed schedule with waitForIdle option', async () => {
        const now = Date.now();
        const task = createMockTask({
          id: 'wait-idle-integration-task',
          schedule: {
            type: 'interval',
            hoursInterval: 1,
            waitForIdle: true,
          },
          lastExecutedAt: now - 2 * 60 * 60 * 1000, // 2 hours ago
        });

        // Simulate idleTimeTracker
        let simulatedIdleMs = 0;
        const mockGetIdleTimeMs = vi.fn(() => simulatedIdleMs);

        const integrationDeps: ScheduleTaskCoordinatorDeps = {
          ...mockDeps,
          getIdleTimeMs: mockGetIdleTimeMs,
          getAllTasks: vi.fn().mockResolvedValue([task]),
        };

        coordinator = new ScheduleTaskCoordinator('/project/path', integrationDeps);
        await coordinator.initialize();
        coordinator.startScheduler();

        // First check: Schedule condition met, task queued with waitingForIdle
        await vi.advanceTimersByTimeAsync(60_000);
        expect(coordinator.getQueuedTasks()).toHaveLength(1);
        expect(coordinator.getQueuedTasks()[0].waitingForIdle).toBe(true);

        // Try to process queue while not idle - should not execute
        await coordinator.processQueue();
        expect(mockDeps.onTaskStarted).not.toHaveBeenCalled();
        expect(coordinator.getQueuedTasks()).toHaveLength(1);

        // Simulate becoming idle
        simulatedIdleMs = 2 * 60 * 1000; // 2 minutes idle

        // Process queue again - now should execute
        await coordinator.processQueue();
        expect(mockDeps.onTaskStarted).toHaveBeenCalled();
        expect(coordinator.getQueuedTasks()).toHaveLength(0);
      });

      it('should continuously check idle time and queue when threshold is met', async () => {
        const task = createMockTask({
          id: 'continuous-idle-check',
          schedule: {
            type: 'idle',
            idleMinutes: 10,
          },
          lastExecutedAt: null,
        });

        // Simulate gradual idle time increase
        let simulatedIdleMs = 0;
        const mockGetIdleTimeMs = vi.fn(() => simulatedIdleMs);

        const integrationDeps: ScheduleTaskCoordinatorDeps = {
          ...mockDeps,
          getIdleTimeMs: mockGetIdleTimeMs,
          getAllTasks: vi.fn().mockResolvedValue([task]),
        };

        coordinator = new ScheduleTaskCoordinator('/project/path', integrationDeps);
        await coordinator.initialize();
        coordinator.startScheduler();

        // Check 1: 3 minutes idle - not enough
        simulatedIdleMs = 3 * 60 * 1000;
        await vi.advanceTimersByTimeAsync(60_000);
        expect(coordinator.getQueuedTasks()).toHaveLength(0);

        // Check 2: 6 minutes idle - still not enough
        simulatedIdleMs = 6 * 60 * 1000;
        await vi.advanceTimersByTimeAsync(60_000);
        expect(coordinator.getQueuedTasks()).toHaveLength(0);

        // Check 3: 10 minutes idle - threshold met
        simulatedIdleMs = 10 * 60 * 1000;
        await vi.advanceTimersByTimeAsync(60_000);
        expect(coordinator.getQueuedTasks()).toHaveLength(1);
      });

      it('should handle idle time reset (user activity resumes)', async () => {
        const task = createMockTask({
          id: 'idle-reset-task',
          schedule: {
            type: 'idle',
            idleMinutes: 5,
          },
          lastExecutedAt: null,
        });

        let simulatedIdleMs = 0;
        const mockGetIdleTimeMs = vi.fn(() => simulatedIdleMs);

        const integrationDeps: ScheduleTaskCoordinatorDeps = {
          ...mockDeps,
          getIdleTimeMs: mockGetIdleTimeMs,
          getAllTasks: vi.fn().mockResolvedValue([task]),
        };

        coordinator = new ScheduleTaskCoordinator('/project/path', integrationDeps);
        await coordinator.initialize();
        coordinator.startScheduler();

        // Idle time reaches near threshold
        simulatedIdleMs = 4 * 60 * 1000; // 4 minutes
        await vi.advanceTimersByTimeAsync(60_000);
        expect(coordinator.getQueuedTasks()).toHaveLength(0);

        // User resumes activity - idle time resets
        simulatedIdleMs = 0;
        await vi.advanceTimersByTimeAsync(60_000);
        expect(coordinator.getQueuedTasks()).toHaveLength(0);

        // Idle time accumulates again to threshold
        simulatedIdleMs = 5 * 60 * 1000;
        await vi.advanceTimersByTimeAsync(60_000);
        expect(coordinator.getQueuedTasks()).toHaveLength(1);
      });
    });

    // ===========================================================================
    // Integration: ScheduleTaskCoordinator + AgentProcess
    // Requirements: 5.4 - Agent startup flow
    // ===========================================================================

    describe('ScheduleTaskCoordinator + AgentProcess integration', () => {
      it('should execute complete agent startup flow from schedule detection to agent start (Req 5.4)', async () => {
        const now = Date.now();
        const task = createMockTask({
          id: 'agent-flow-task',
          name: 'Integration Test Task',
          schedule: {
            type: 'interval',
            hoursInterval: 1,
            waitForIdle: false,
          },
          prompts: [{ order: 0, content: '/kiro:steering' }],
          lastExecutedAt: now - 2 * 60 * 60 * 1000,
          avoidance: { targets: [], behavior: 'wait' },
        });

        const agentStartCalls: Array<{
          taskId: string;
          taskName: string;
          prompt: string;
          promptIndex: number;
        }> = [];

        const mockStartAgent = vi.fn().mockImplementation(async (options) => {
          agentStartCalls.push({
            taskId: options.taskId,
            taskName: options.taskName,
            prompt: options.prompt,
            promptIndex: options.promptIndex,
          });
          return { ok: true, value: { agentId: `agent-${Date.now()}` } };
        });

        const integrationDeps: ScheduleTaskCoordinatorDeps = {
          ...mockDeps,
          getAllTasks: vi.fn().mockResolvedValue([task]),
          getRunningAgents: vi.fn().mockReturnValue([]),
          startScheduleAgent: mockStartAgent,
        };

        coordinator = new ScheduleTaskCoordinator('/project/path', integrationDeps);
        await coordinator.initialize();
        coordinator.startScheduler();

        // Step 1: Schedule check detects task is due
        await vi.advanceTimersByTimeAsync(60_000);
        expect(coordinator.getQueuedTasks()).toHaveLength(1);

        // Step 2: Process queue - should trigger agent start
        await coordinator.processQueue();

        // Verify agent was started with correct parameters
        expect(agentStartCalls).toHaveLength(1);
        expect(agentStartCalls[0]).toEqual({
          taskId: 'agent-flow-task',
          taskName: 'Integration Test Task',
          prompt: '/kiro:steering',
          promptIndex: 0,
        });

        // Step 3: Task should be removed from queue after execution
        expect(coordinator.getQueuedTasks()).toHaveLength(0);
      });

      it('should handle multiple prompts in order with separate agent starts', async () => {
        const task = createMockTask({
          id: 'multi-prompt-flow-task',
          name: 'Multi-Prompt Task',
          prompts: [
            { order: 0, content: '/kiro:steering' },
            { order: 1, content: '/kiro:spec-requirements' },
            { order: 2, content: '/kiro:spec-design' },
          ],
          lastExecutedAt: null,
        });

        const agentStartOrder: number[] = [];
        const mockStartAgent = vi.fn().mockImplementation(async (options) => {
          agentStartOrder.push(options.promptIndex);
          return { ok: true, value: { agentId: `agent-${options.promptIndex}` } };
        });

        const integrationDeps: ScheduleTaskCoordinatorDeps = {
          ...mockDeps,
          getAllTasks: vi.fn().mockResolvedValue([task]),
          startScheduleAgent: mockStartAgent,
        };

        coordinator = new ScheduleTaskCoordinator('/project/path', integrationDeps);
        await coordinator.initialize();

        const result = await coordinator.executeImmediately('multi-prompt-flow-task');

        expect(result.ok).toBe(true);
        expect(mockStartAgent).toHaveBeenCalledTimes(3);
        expect(agentStartOrder).toEqual([0, 1, 2]);

        if (result.ok) {
          expect(result.value.agentIds).toHaveLength(3);
        }
      });

      it('should integrate workflow mode with worktree creation and agent start', async () => {
        const task = createMockTask({
          id: 'workflow-agent-flow-task',
          name: 'Workflow Test',
          workflow: {
            enabled: true,
            suffixMode: 'auto',
          },
          prompts: [{ order: 0, content: '/kiro:steering' }],
          lastExecutedAt: null,
        });

        const workflowSteps: string[] = [];

        const mockCreateWorktree = vi.fn().mockImplementation(async (options) => {
          workflowSteps.push(`worktree-created:${options.taskName}`);
          return {
            ok: true,
            value: {
              path: `.kiro/worktrees/schedule/${options.taskName}/auto-suffix`,
              absolutePath: `/project/path/.kiro/worktrees/schedule/${options.taskName}/auto-suffix`,
              branch: `schedule/${options.taskName}/auto-suffix`,
              created_at: new Date().toISOString(),
            },
          };
        });

        const mockStartAgent = vi.fn().mockImplementation(async (options) => {
          workflowSteps.push(`agent-started:${options.worktreePath ? 'with-worktree' : 'no-worktree'}`);
          return { ok: true, value: { agentId: 'agent-1' } };
        });

        const integrationDeps: ScheduleTaskCoordinatorDeps = {
          ...mockDeps,
          getAllTasks: vi.fn().mockResolvedValue([task]),
          createScheduleWorktree: mockCreateWorktree,
          startScheduleAgent: mockStartAgent,
        };

        coordinator = new ScheduleTaskCoordinator('/project/path', integrationDeps);
        await coordinator.initialize();

        await coordinator.executeImmediately('workflow-agent-flow-task');

        // Verify workflow steps: worktree created first, then agent started
        expect(workflowSteps).toEqual([
          'worktree-created:Workflow Test',
          'agent-started:with-worktree',
        ]);
      });

      it('should handle avoidance rules correctly in the execution flow', async () => {
        const now = Date.now();
        const task = createMockTask({
          id: 'avoidance-flow-task',
          schedule: {
            type: 'interval',
            hoursInterval: 1,
            waitForIdle: false,
          },
          lastExecutedAt: now - 2 * 60 * 60 * 1000,
          avoidance: {
            targets: ['spec-merge'],
            behavior: 'wait',
          },
        });

        // Simulate spec-merge running
        let isSpecMergeRunning = true;
        const mockGetRunningAgents = vi.fn(() =>
          isSpecMergeRunning
            ? [createMockRunningAgent('spec-merge')]
            : []
        );

        const mockStartAgent = vi.fn().mockResolvedValue({
          ok: true,
          value: { agentId: 'agent-1' },
        });

        const integrationDeps: ScheduleTaskCoordinatorDeps = {
          ...mockDeps,
          getAllTasks: vi.fn().mockResolvedValue([task]),
          getRunningAgents: mockGetRunningAgents,
          startScheduleAgent: mockStartAgent,
        };

        coordinator = new ScheduleTaskCoordinator('/project/path', integrationDeps);
        await coordinator.initialize();
        coordinator.startScheduler();

        // Task gets queued
        await vi.advanceTimersByTimeAsync(60_000);
        expect(coordinator.getQueuedTasks()).toHaveLength(1);

        // Process queue while spec-merge is running - should wait
        await coordinator.processQueue();
        expect(mockStartAgent).not.toHaveBeenCalled();
        expect(coordinator.getQueuedTasks()).toHaveLength(1);

        // Spec-merge completes
        isSpecMergeRunning = false;

        // Process queue again - now should execute
        await coordinator.processQueue();
        expect(mockStartAgent).toHaveBeenCalled();
        expect(coordinator.getQueuedTasks()).toHaveLength(0);
      });

      it('should record last execution time and update callbacks correctly', async () => {
        const task = createMockTask({
          id: 'callback-integration-task',
          lastExecutedAt: null,
        });

        const mockStartAgent = vi.fn().mockResolvedValue({
          ok: true,
          value: { agentId: 'agent-1' },
        });

        const callbackOrder: string[] = [];

        const integrationDeps: ScheduleTaskCoordinatorDeps = {
          ...mockDeps,
          getAllTasks: vi.fn().mockResolvedValue([task]),
          updateLastExecutedAt: vi.fn().mockImplementation(async () => {
            callbackOrder.push('updateLastExecutedAt');
          }),
          startScheduleAgent: mockStartAgent,
          onTaskStarted: vi.fn(() => {
            callbackOrder.push('onTaskStarted');
          }),
        };

        coordinator = new ScheduleTaskCoordinator('/project/path', integrationDeps);
        await coordinator.initialize();

        await coordinator.executeImmediately('callback-integration-task');

        // Verify execution order: lastExecutedAt updated before onTaskStarted
        expect(callbackOrder).toEqual(['updateLastExecutedAt', 'onTaskStarted']);
        expect(integrationDeps.updateLastExecutedAt).toHaveBeenCalledWith(
          '/project/path',
          'callback-integration-task',
          expect.any(Number)
        );
      });

      it('should handle agent start failure gracefully', async () => {
        const task = createMockTask({
          id: 'agent-fail-integration-task',
          prompts: [
            { order: 0, content: '/kiro:first' },
            { order: 1, content: '/kiro:second' },
          ],
          lastExecutedAt: null,
        });

        // First agent succeeds, second fails
        let callCount = 0;
        const mockStartAgent = vi.fn().mockImplementation(async () => {
          callCount++;
          if (callCount === 2) {
            return { ok: false, error: { type: 'AGENT_START_FAILED', message: 'Process error' } };
          }
          return { ok: true, value: { agentId: `agent-${callCount}` } };
        });

        const integrationDeps: ScheduleTaskCoordinatorDeps = {
          ...mockDeps,
          getAllTasks: vi.fn().mockResolvedValue([task]),
          startScheduleAgent: mockStartAgent,
        };

        coordinator = new ScheduleTaskCoordinator('/project/path', integrationDeps);
        await coordinator.initialize();

        const result = await coordinator.executeImmediately('agent-fail-integration-task');

        // Execution should fail due to second agent failure
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('AGENT_START_FAILED');
        }
      });

      it('should complete full flow: schedule -> queue -> wait for idle -> execute with agent', async () => {
        const now = Date.now();
        const task = createMockTask({
          id: 'full-flow-task',
          name: 'Full Flow Test',
          schedule: {
            type: 'interval',
            hoursInterval: 1,
            waitForIdle: true, // Wait for idle before execution
          },
          prompts: [{ order: 0, content: '/kiro:steering' }],
          lastExecutedAt: now - 2 * 60 * 60 * 1000,
          avoidance: { targets: [], behavior: 'wait' },
        });

        let simulatedIdleMs = 0;
        const mockGetIdleTimeMs = vi.fn(() => simulatedIdleMs);

        const flowEvents: string[] = [];
        const mockStartAgent = vi.fn().mockImplementation(async () => {
          flowEvents.push('agent-started');
          return { ok: true, value: { agentId: 'agent-1' } };
        });

        const integrationDeps: ScheduleTaskCoordinatorDeps = {
          ...mockDeps,
          getIdleTimeMs: mockGetIdleTimeMs,
          getAllTasks: vi.fn().mockResolvedValue([task]),
          getRunningAgents: vi.fn().mockReturnValue([]),
          startScheduleAgent: mockStartAgent,
          onTaskQueued: vi.fn(() => flowEvents.push('task-queued')),
          onTaskStarted: vi.fn(() => flowEvents.push('task-started-callback')),
        };

        coordinator = new ScheduleTaskCoordinator('/project/path', integrationDeps);
        await coordinator.initialize();
        coordinator.startScheduler();

        // Step 1: Schedule check - task should be queued with waitingForIdle
        await vi.advanceTimersByTimeAsync(60_000);
        expect(coordinator.getQueuedTasks()).toHaveLength(1);
        expect(coordinator.getQueuedTasks()[0].waitingForIdle).toBe(true);
        expect(flowEvents).toContain('task-queued');

        // Step 2: Process queue while not idle - should not execute
        await coordinator.processQueue();
        expect(mockStartAgent).not.toHaveBeenCalled();

        // Step 3: User becomes idle
        simulatedIdleMs = 2 * 60 * 1000; // 2 minutes idle

        // Step 4: Process queue - now should execute
        await coordinator.processQueue();
        expect(mockStartAgent).toHaveBeenCalled();
        expect(flowEvents).toContain('agent-started');
        expect(flowEvents).toContain('task-started-callback');
        expect(coordinator.getQueuedTasks()).toHaveLength(0);
      });
    });
  });
});
