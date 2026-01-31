/**
 * ScheduleTaskCoordinator Integration Tests
 * Task 4.1-4.4: Integration tests for scheduler activation
 * Requirements: 5.1, 5.2, 5.3, 5.4
 *
 * Tests the full flow:
 * - initScheduleTaskCoordinator -> startScheduler -> checkScheduleConditions -> processQueue -> Agent start
 * - Idle condition tasks
 * - Workflow mode worktree creation
 * - Avoidance rule behavior (wait/skip)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ScheduleTaskCoordinator,
  createScheduleTaskCoordinator,
  type ScheduleTaskCoordinatorDeps,
  type RunningAgentInfo,
  SCHEDULE_CHECK_INTERVAL_MS,
} from './scheduleTaskCoordinator';
import type { ScheduleTask } from '../../shared/types/scheduleTask';

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
 * Create mock dependencies with default implementations
 */
function createMockDeps(overrides: Partial<ScheduleTaskCoordinatorDeps> = {}): ScheduleTaskCoordinatorDeps {
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
    ...overrides,
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
// Task 4.1: Scheduler Auto-start Flow Integration Tests
// Requirements: 5.1
// =============================================================================

describe('Integration: Scheduler Auto-start Flow', () => {
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

  it('should execute checkScheduleConditions and processQueue after startScheduler', async () => {
    // Setup: Create a task that should be queued immediately (never executed)
    const task = createMockTask({
      id: 'auto-start-task',
      schedule: {
        type: 'interval',
        hoursInterval: 1,
        waitForIdle: false,
      },
      lastExecutedAt: null, // Never executed
    });

    // Mock startScheduleAgent to track calls
    const mockStartAgent = vi.fn().mockResolvedValue({
      ok: true,
      value: { agentId: 'agent-auto-start' },
    });

    mockDeps = createMockDeps({
      getAllTasks: vi.fn().mockResolvedValue([task]),
      startScheduleAgent: mockStartAgent,
    });

    // Act: Create and initialize coordinator, then start scheduler
    coordinator = createScheduleTaskCoordinator('/test/project', mockDeps);
    await coordinator.initialize();
    coordinator.startScheduler();

    // Advance time by 1 minute (scheduler interval)
    await vi.advanceTimersByTimeAsync(SCHEDULE_CHECK_INTERVAL_MS);

    // Assert: Task should be queued
    expect(mockDeps.onTaskQueued).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 'auto-start-task',
        reason: 'schedule',
      })
    );

    // Process queue is called in the same cycle
    // Since startScheduleAgent is provided, agent should be started
    expect(mockStartAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 'auto-start-task',
        taskName: 'Test Task',
      })
    );
  });

  it('should run schedule check every 1 minute after startScheduler', async () => {
    const task = createMockTask({
      id: 'periodic-task',
      schedule: {
        type: 'interval',
        hoursInterval: 1,
        waitForIdle: false,
      },
      lastExecutedAt: null,
    });

    mockDeps = createMockDeps({
      getAllTasks: vi.fn().mockResolvedValue([task]),
    });

    coordinator = createScheduleTaskCoordinator('/test/project', mockDeps);
    await coordinator.initialize();
    coordinator.startScheduler();

    // Advance time by 3 minutes
    await vi.advanceTimersByTimeAsync(SCHEDULE_CHECK_INTERVAL_MS * 3);

    // getAllTasks should be called: 1 (initialize) + 3 (scheduler cycles)
    expect(mockDeps.getAllTasks).toHaveBeenCalledTimes(4);
  });
});

// =============================================================================
// Task 4.2: Idle Condition Task Integration Tests
// Requirements: 5.2
// =============================================================================

describe('Integration: Idle Condition Tasks', () => {
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

  it('should queue idle task when idle time exceeds idleMinutes', async () => {
    // Setup: Create an idle-triggered task requiring 5 minutes of idle time
    const task = createMockTask({
      id: 'idle-task',
      schedule: {
        type: 'idle',
        idleMinutes: 5,
      },
    });

    // Mock: Return 6 minutes of idle time (exceeds 5 minute threshold)
    const mockGetIdleTimeMs = vi.fn().mockReturnValue(6 * 60 * 1000); // 6 minutes in ms

    mockDeps = createMockDeps({
      getAllTasks: vi.fn().mockResolvedValue([task]),
      getIdleTimeMs: mockGetIdleTimeMs,
    });

    coordinator = createScheduleTaskCoordinator('/test/project', mockDeps);
    await coordinator.initialize();
    coordinator.startScheduler();

    // Advance time by 1 minute to trigger schedule check
    await vi.advanceTimersByTimeAsync(SCHEDULE_CHECK_INTERVAL_MS);

    // Assert: Task should be queued with 'idle' reason
    expect(mockDeps.onTaskQueued).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 'idle-task',
        reason: 'idle',
      })
    );
  });

  it('should NOT queue idle task when idle time is below threshold', async () => {
    const task = createMockTask({
      id: 'idle-task',
      schedule: {
        type: 'idle',
        idleMinutes: 10,
      },
    });

    // Mock: Return only 5 minutes of idle time (below 10 minute threshold)
    const mockGetIdleTimeMs = vi.fn().mockReturnValue(5 * 60 * 1000);

    mockDeps = createMockDeps({
      getAllTasks: vi.fn().mockResolvedValue([task]),
      getIdleTimeMs: mockGetIdleTimeMs,
    });

    coordinator = createScheduleTaskCoordinator('/test/project', mockDeps);
    await coordinator.initialize();
    coordinator.startScheduler();

    await vi.advanceTimersByTimeAsync(SCHEDULE_CHECK_INTERVAL_MS);

    // Assert: Task should NOT be queued
    expect(mockDeps.onTaskQueued).not.toHaveBeenCalled();
  });

  it('should start agent when idle condition is met', async () => {
    const task = createMockTask({
      id: 'idle-exec-task',
      schedule: {
        type: 'idle',
        idleMinutes: 5,
      },
    });

    const mockStartAgent = vi.fn().mockResolvedValue({
      ok: true,
      value: { agentId: 'agent-idle' },
    });

    mockDeps = createMockDeps({
      getAllTasks: vi.fn().mockResolvedValue([task]),
      getIdleTimeMs: vi.fn().mockReturnValue(10 * 60 * 1000), // 10 minutes idle
      startScheduleAgent: mockStartAgent,
    });

    coordinator = createScheduleTaskCoordinator('/test/project', mockDeps);
    await coordinator.initialize();
    coordinator.startScheduler();

    await vi.advanceTimersByTimeAsync(SCHEDULE_CHECK_INTERVAL_MS);

    // Assert: Agent should be started
    expect(mockStartAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 'idle-exec-task',
      })
    );
    expect(mockDeps.onTaskStarted).toHaveBeenCalled();
  });
});

// =============================================================================
// Task 4.3: Workflow Mode Worktree Creation Integration Tests
// Requirements: 5.3
// =============================================================================

describe('Integration: Workflow Mode Worktree Creation', () => {
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

  it('should create worktree when workflow mode is enabled', async () => {
    const task = createMockTask({
      id: 'workflow-task',
      schedule: {
        type: 'interval',
        hoursInterval: 1,
        waitForIdle: false,
      },
      lastExecutedAt: null,
      workflow: {
        enabled: true,
        suffixMode: 'auto',
      },
    });

    const mockCreateWorktree = vi.fn().mockResolvedValue({
      ok: true,
      value: {
        path: '.kiro/worktrees/schedule/test-task/20260131-120000',
        absolutePath: '/test/project/.kiro/worktrees/schedule/test-task/20260131-120000',
        branch: 'schedule/test-task/20260131-120000',
        created_at: '2026-01-31T12:00:00Z',
      },
    });

    const mockStartAgent = vi.fn().mockResolvedValue({
      ok: true,
      value: { agentId: 'agent-workflow' },
    });

    mockDeps = createMockDeps({
      getAllTasks: vi.fn().mockResolvedValue([task]),
      createScheduleWorktree: mockCreateWorktree,
      startScheduleAgent: mockStartAgent,
    });

    coordinator = createScheduleTaskCoordinator('/test/project', mockDeps);
    await coordinator.initialize();
    coordinator.startScheduler();

    await vi.advanceTimersByTimeAsync(SCHEDULE_CHECK_INTERVAL_MS);

    // Assert: Worktree should be created
    expect(mockCreateWorktree).toHaveBeenCalledWith(
      expect.objectContaining({
        taskName: 'Test Task',
        suffixMode: 'auto',
      })
    );

    // Assert: Agent should receive worktree path
    expect(mockStartAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        worktreePath: '/test/project/.kiro/worktrees/schedule/test-task/20260131-120000',
      })
    );
  });

  it('should NOT create worktree when workflow mode is disabled', async () => {
    const task = createMockTask({
      id: 'no-workflow-task',
      schedule: {
        type: 'interval',
        hoursInterval: 1,
        waitForIdle: false,
      },
      lastExecutedAt: null,
      workflow: {
        enabled: false,
      },
    });

    const mockCreateWorktree = vi.fn();
    const mockStartAgent = vi.fn().mockResolvedValue({
      ok: true,
      value: { agentId: 'agent-no-workflow' },
    });

    mockDeps = createMockDeps({
      getAllTasks: vi.fn().mockResolvedValue([task]),
      createScheduleWorktree: mockCreateWorktree,
      startScheduleAgent: mockStartAgent,
    });

    coordinator = createScheduleTaskCoordinator('/test/project', mockDeps);
    await coordinator.initialize();
    coordinator.startScheduler();

    await vi.advanceTimersByTimeAsync(SCHEDULE_CHECK_INTERVAL_MS);

    // Assert: Worktree should NOT be created
    expect(mockCreateWorktree).not.toHaveBeenCalled();

    // Assert: Agent should be started without worktree path
    expect(mockStartAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        worktreePath: undefined,
      })
    );
  });

  it('should use custom suffix when suffixMode is custom', async () => {
    const task = createMockTask({
      id: 'custom-suffix-task',
      schedule: {
        type: 'interval',
        hoursInterval: 1,
        waitForIdle: false,
      },
      lastExecutedAt: null,
      workflow: {
        enabled: true,
        suffixMode: 'custom',
        customSuffix: 'v2',
      },
    });

    const mockCreateWorktree = vi.fn().mockResolvedValue({
      ok: true,
      value: {
        path: '.kiro/worktrees/schedule/test-task/v2-20260131-120000',
        absolutePath: '/test/project/.kiro/worktrees/schedule/test-task/v2-20260131-120000',
        branch: 'schedule/test-task/v2-20260131-120000',
        created_at: '2026-01-31T12:00:00Z',
      },
    });

    mockDeps = createMockDeps({
      getAllTasks: vi.fn().mockResolvedValue([task]),
      createScheduleWorktree: mockCreateWorktree,
      startScheduleAgent: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'agent' } }),
    });

    coordinator = createScheduleTaskCoordinator('/test/project', mockDeps);
    await coordinator.initialize();
    coordinator.startScheduler();

    await vi.advanceTimersByTimeAsync(SCHEDULE_CHECK_INTERVAL_MS);

    expect(mockCreateWorktree).toHaveBeenCalledWith(
      expect.objectContaining({
        suffixMode: 'custom',
        customSuffix: 'v2',
      })
    );
  });
});

// =============================================================================
// Task 4.4: Avoidance Rule Integration Tests
// Requirements: 5.4
// =============================================================================

describe('Integration: Avoidance Rules', () => {
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

  it('should keep task in queue when avoidance behavior is wait', async () => {
    const task = createMockTask({
      id: 'wait-task',
      schedule: {
        type: 'interval',
        hoursInterval: 1,
        waitForIdle: false,
      },
      lastExecutedAt: null,
      avoidance: {
        targets: ['spec-merge'],
        behavior: 'wait',
      },
    });

    // Mock: spec-merge agent is running
    const runningAgent = createMockRunningAgent('spec-merge', 'some-spec');

    mockDeps = createMockDeps({
      getAllTasks: vi.fn().mockResolvedValue([task]),
      getRunningAgents: vi.fn().mockReturnValue([runningAgent]),
    });

    coordinator = createScheduleTaskCoordinator('/test/project', mockDeps);
    await coordinator.initialize();
    coordinator.startScheduler();

    // First cycle: task gets queued
    await vi.advanceTimersByTimeAsync(SCHEDULE_CHECK_INTERVAL_MS);

    // Task should be queued but waiting
    expect(mockDeps.onTaskQueued).toHaveBeenCalled();
    expect(mockDeps.onAvoidanceWaiting).toHaveBeenCalledWith('wait-task', 'spec-merge');

    // Task should still be in queue
    const queuedTasks = coordinator.getQueuedTasks();
    expect(queuedTasks.some(t => t.taskId === 'wait-task')).toBe(true);
  });

  it('should remove task from queue when avoidance behavior is skip', async () => {
    const task = createMockTask({
      id: 'skip-task',
      schedule: {
        type: 'interval',
        hoursInterval: 1,
        waitForIdle: false,
      },
      lastExecutedAt: null,
      avoidance: {
        targets: ['commit'],
        behavior: 'skip',
      },
    });

    // Mock: commit agent is running
    const runningAgent = createMockRunningAgent('commit', 'some-spec');

    mockDeps = createMockDeps({
      getAllTasks: vi.fn().mockResolvedValue([task]),
      getRunningAgents: vi.fn().mockReturnValue([runningAgent]),
    });

    coordinator = createScheduleTaskCoordinator('/test/project', mockDeps);
    await coordinator.initialize();
    coordinator.startScheduler();

    await vi.advanceTimersByTimeAsync(SCHEDULE_CHECK_INTERVAL_MS);

    // Task should be skipped
    expect(mockDeps.onTaskSkipped).toHaveBeenCalledWith('skip-task', expect.stringContaining('commit'));

    // Task should NOT be in queue (removed after skip)
    const queuedTasks = coordinator.getQueuedTasks();
    expect(queuedTasks.some(t => t.taskId === 'skip-task')).toBe(false);
  });

  it('should execute task after avoidance conflict is resolved', async () => {
    const task = createMockTask({
      id: 'delayed-task',
      schedule: {
        type: 'interval',
        hoursInterval: 1,
        waitForIdle: false,
      },
      lastExecutedAt: null,
      avoidance: {
        targets: ['bug-merge'],
        behavior: 'wait',
      },
    });

    // Mock: bug-merge agent is initially running
    const runningAgent = createMockRunningAgent('bug-merge', 'some-bug');
    let agentsRunning = true;

    const mockGetRunningAgents = vi.fn().mockImplementation(() => {
      return agentsRunning ? [runningAgent] : [];
    });

    const mockStartAgent = vi.fn().mockResolvedValue({
      ok: true,
      value: { agentId: 'agent-delayed' },
    });

    mockDeps = createMockDeps({
      getAllTasks: vi.fn().mockResolvedValue([task]),
      getRunningAgents: mockGetRunningAgents,
      startScheduleAgent: mockStartAgent,
    });

    coordinator = createScheduleTaskCoordinator('/test/project', mockDeps);
    await coordinator.initialize();
    coordinator.startScheduler();

    // First cycle: task gets queued but waits
    await vi.advanceTimersByTimeAsync(SCHEDULE_CHECK_INTERVAL_MS);
    expect(mockDeps.onAvoidanceWaiting).toHaveBeenCalled();
    expect(mockStartAgent).not.toHaveBeenCalled();

    // Simulate: conflict resolved (agent finished)
    agentsRunning = false;

    // Second cycle: task should now execute
    await vi.advanceTimersByTimeAsync(SCHEDULE_CHECK_INTERVAL_MS);
    expect(mockStartAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 'delayed-task',
      })
    );
  });

  it('should not conflict when avoidance targets do not match running agents', async () => {
    const task = createMockTask({
      id: 'no-conflict-task',
      schedule: {
        type: 'interval',
        hoursInterval: 1,
        waitForIdle: false,
      },
      lastExecutedAt: null,
      avoidance: {
        targets: ['spec-merge'], // Avoiding spec-merge
        behavior: 'wait',
      },
    });

    // Mock: different agent is running (not in avoidance targets)
    const runningAgent = createMockRunningAgent('requirements', 'some-spec');

    const mockStartAgent = vi.fn().mockResolvedValue({
      ok: true,
      value: { agentId: 'agent-no-conflict' },
    });

    mockDeps = createMockDeps({
      getAllTasks: vi.fn().mockResolvedValue([task]),
      getRunningAgents: vi.fn().mockReturnValue([runningAgent]),
      startScheduleAgent: mockStartAgent,
    });

    coordinator = createScheduleTaskCoordinator('/test/project', mockDeps);
    await coordinator.initialize();
    coordinator.startScheduler();

    await vi.advanceTimersByTimeAsync(SCHEDULE_CHECK_INTERVAL_MS);

    // Task should execute (no conflict)
    expect(mockDeps.onAvoidanceWaiting).not.toHaveBeenCalled();
    expect(mockStartAgent).toHaveBeenCalled();
  });
});
