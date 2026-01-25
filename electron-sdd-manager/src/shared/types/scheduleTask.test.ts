/**
 * ScheduleTask Types Tests
 *
 * schedule-task-execution: Task 1.1
 * Requirements: 2.4, 3.1, 3.2, 4.1, 5.1, 6.1, 6.2, 8.1
 *
 * Tests for schedule task domain model types and Zod validation schemas.
 * Following TDD methodology - tests written before implementation.
 */

import { describe, it, expect } from 'vitest';
import type {
  ScheduleTask,
  ScheduleCondition,
  IntervalSchedule,
  WeeklySchedule,
  IdleSchedule,
  Prompt,
  AvoidanceRule,
  AvoidanceTarget,
  AvoidanceBehavior,
  ScheduleWorkflowConfig,
  AgentBehavior,
  ScheduleTaskInput,
} from './scheduleTask';
import {
  ScheduleTaskSchema,
  ScheduleConditionSchema,
  IntervalScheduleSchema,
  WeeklyScheduleSchema,
  IdleScheduleSchema,
  PromptSchema,
  AvoidanceRuleSchema,
  ScheduleWorkflowConfigSchema,
  ScheduleTaskInputSchema,
} from './scheduleTask';

// =============================================================================
// Test Constants
// =============================================================================

const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

// =============================================================================
// Helper Functions
// =============================================================================

function createValidPrompt(order: number = 0, content: string = '/kiro:steering'): Prompt {
  return { order, content };
}

function createValidAvoidanceRule(): AvoidanceRule {
  return {
    targets: ['spec-merge', 'commit'],
    behavior: 'wait',
  };
}

function createValidWorkflowConfig(): ScheduleWorkflowConfig {
  return {
    enabled: false,
  };
}

function createValidIntervalSchedule(): IntervalSchedule {
  return {
    type: 'interval',
    hoursInterval: 168,
    waitForIdle: true,
  };
}

function createValidWeeklySchedule(): WeeklySchedule {
  return {
    type: 'weekly',
    weekdays: [1, 3, 5], // Mon, Wed, Fri
    hourOfDay: 9,
    waitForIdle: false,
  };
}

function createValidIdleSchedule(): IdleSchedule {
  return {
    type: 'idle',
    idleMinutes: 30,
  };
}

function createValidScheduleTask(overrides: Partial<ScheduleTask> = {}): ScheduleTask {
  return {
    id: VALID_UUID,
    name: 'Test Schedule Task',
    enabled: true,
    schedule: createValidIntervalSchedule(),
    prompts: [createValidPrompt()],
    avoidance: createValidAvoidanceRule(),
    workflow: createValidWorkflowConfig(),
    behavior: 'wait',
    lastExecutedAt: null,
    createdAt: 1706140800000,
    updatedAt: 1706140800000,
    ...overrides,
  };
}

function createValidScheduleTaskInput(overrides: Partial<ScheduleTaskInput> = {}): ScheduleTaskInput {
  return {
    name: 'New Schedule Task',
    enabled: true,
    schedule: createValidIntervalSchedule(),
    prompts: [createValidPrompt()],
    avoidance: createValidAvoidanceRule(),
    workflow: createValidWorkflowConfig(),
    behavior: 'wait',
    ...overrides,
  };
}

// =============================================================================
// Tests: Domain Model Types
// =============================================================================

describe('ScheduleTask Types', () => {
  // ============================================================
  // ScheduleCondition Union Type (Requirements: 3.1, 3.2, 4.1)
  // ============================================================
  describe('ScheduleCondition', () => {
    describe('IntervalSchedule (Requirement 3.1)', () => {
      it('should accept valid interval schedule with waitForIdle', () => {
        const schedule: IntervalSchedule = {
          type: 'interval',
          hoursInterval: 168, // 1 week
          waitForIdle: true,
        };

        expect(schedule.type).toBe('interval');
        expect(schedule.hoursInterval).toBe(168);
        expect(schedule.waitForIdle).toBe(true);
      });

      it('should accept 1 hour as minimum interval', () => {
        const schedule: IntervalSchedule = {
          type: 'interval',
          hoursInterval: 1,
          waitForIdle: false,
        };

        expect(schedule.hoursInterval).toBe(1);
      });

      it('should accept 720 hours (monthly shortcut)', () => {
        const schedule: IntervalSchedule = {
          type: 'interval',
          hoursInterval: 720,
          waitForIdle: true,
        };

        expect(schedule.hoursInterval).toBe(720);
      });
    });

    describe('WeeklySchedule (Requirement 3.2)', () => {
      it('should accept valid weekly schedule with multiple weekdays', () => {
        const schedule: WeeklySchedule = {
          type: 'weekly',
          weekdays: [1, 3, 5], // Mon, Wed, Fri
          hourOfDay: 9,
          waitForIdle: false,
        };

        expect(schedule.type).toBe('weekly');
        expect(schedule.weekdays).toEqual([1, 3, 5]);
        expect(schedule.hourOfDay).toBe(9);
        expect(schedule.waitForIdle).toBe(false);
      });

      it('should accept single weekday', () => {
        const schedule: WeeklySchedule = {
          type: 'weekly',
          weekdays: [0], // Sunday
          hourOfDay: 0,
          waitForIdle: true,
        };

        expect(schedule.weekdays).toHaveLength(1);
        expect(schedule.weekdays[0]).toBe(0);
      });

      it('should accept all weekdays (0-6)', () => {
        const schedule: WeeklySchedule = {
          type: 'weekly',
          weekdays: [0, 1, 2, 3, 4, 5, 6],
          hourOfDay: 12,
          waitForIdle: false,
        };

        expect(schedule.weekdays).toHaveLength(7);
      });

      it('should accept hourOfDay from 0 to 23', () => {
        const morning: WeeklySchedule = {
          type: 'weekly',
          weekdays: [1],
          hourOfDay: 0,
          waitForIdle: false,
        };

        const night: WeeklySchedule = {
          type: 'weekly',
          weekdays: [1],
          hourOfDay: 23,
          waitForIdle: false,
        };

        expect(morning.hourOfDay).toBe(0);
        expect(night.hourOfDay).toBe(23);
      });
    });

    describe('IdleSchedule (Requirement 4.1)', () => {
      it('should accept valid idle schedule with minutes', () => {
        const schedule: IdleSchedule = {
          type: 'idle',
          idleMinutes: 30,
        };

        expect(schedule.type).toBe('idle');
        expect(schedule.idleMinutes).toBe(30);
      });

      it('should accept 1 minute as minimum idle time', () => {
        const schedule: IdleSchedule = {
          type: 'idle',
          idleMinutes: 1,
        };

        expect(schedule.idleMinutes).toBe(1);
      });
    });

    describe('ScheduleCondition Union', () => {
      it('should discriminate types correctly', () => {
        const conditions: ScheduleCondition[] = [
          createValidIntervalSchedule(),
          createValidWeeklySchedule(),
          createValidIdleSchedule(),
        ];

        expect(conditions[0].type).toBe('interval');
        expect(conditions[1].type).toBe('weekly');
        expect(conditions[2].type).toBe('idle');
      });

      it('should support type narrowing', () => {
        const processCondition = (condition: ScheduleCondition): string => {
          switch (condition.type) {
            case 'interval':
              return `interval:${condition.hoursInterval}h`;
            case 'weekly':
              return `weekly:${condition.weekdays.join(',')}@${condition.hourOfDay}`;
            case 'idle':
              return `idle:${condition.idleMinutes}m`;
          }
        };

        expect(processCondition(createValidIntervalSchedule())).toBe('interval:168h');
        expect(processCondition(createValidWeeklySchedule())).toBe('weekly:1,3,5@9');
        expect(processCondition(createValidIdleSchedule())).toBe('idle:30m');
      });
    });
  });

  // ============================================================
  // Prompt Type (Requirement 5.1)
  // ============================================================
  describe('Prompt', () => {
    it('should have order and content fields', () => {
      const prompt: Prompt = {
        order: 0,
        content: '/kiro:steering',
      };

      expect(prompt.order).toBe(0);
      expect(prompt.content).toBe('/kiro:steering');
    });

    it('should accept any string content', () => {
      const prompt: Prompt = {
        order: 1,
        content: 'Please review the codebase and fix any type errors.',
      };

      expect(prompt.content).toContain('review');
    });
  });

  // ============================================================
  // AvoidanceRule Type (Requirements: 6.1, 6.2)
  // ============================================================
  describe('AvoidanceRule', () => {
    it('should accept valid avoidance targets', () => {
      const targets: AvoidanceTarget[] = ['spec-merge', 'commit', 'bug-merge', 'schedule-task'];

      expect(targets).toHaveLength(4);
    });

    it('should accept valid avoidance behaviors', () => {
      const behaviors: AvoidanceBehavior[] = ['wait', 'skip'];

      expect(behaviors).toHaveLength(2);
    });

    it('should combine targets and behavior', () => {
      const rule: AvoidanceRule = {
        targets: ['spec-merge', 'bug-merge'],
        behavior: 'skip',
      };

      expect(rule.targets).toContain('spec-merge');
      expect(rule.targets).toContain('bug-merge');
      expect(rule.behavior).toBe('skip');
    });

    it('should accept empty targets array', () => {
      const rule: AvoidanceRule = {
        targets: [],
        behavior: 'wait',
      };

      expect(rule.targets).toHaveLength(0);
    });
  });

  // ============================================================
  // ScheduleWorkflowConfig Type (Requirement 8.1)
  // ============================================================
  describe('ScheduleWorkflowConfig', () => {
    it('should accept disabled workflow mode', () => {
      const config: ScheduleWorkflowConfig = {
        enabled: false,
      };

      expect(config.enabled).toBe(false);
      expect(config.suffixMode).toBeUndefined();
    });

    it('should accept enabled workflow mode with auto suffix', () => {
      const config: ScheduleWorkflowConfig = {
        enabled: true,
        suffixMode: 'auto',
      };

      expect(config.enabled).toBe(true);
      expect(config.suffixMode).toBe('auto');
    });

    it('should accept enabled workflow mode with custom suffix', () => {
      const config: ScheduleWorkflowConfig = {
        enabled: true,
        suffixMode: 'custom',
        customSuffix: 'my-task',
      };

      expect(config.enabled).toBe(true);
      expect(config.suffixMode).toBe('custom');
      expect(config.customSuffix).toBe('my-task');
    });
  });

  // ============================================================
  // ScheduleTask Type
  // ============================================================
  describe('ScheduleTask', () => {
    it('should have all required fields', () => {
      const task = createValidScheduleTask();

      expect(task.id).toBe(VALID_UUID);
      expect(task.name).toBe('Test Schedule Task');
      expect(task.enabled).toBe(true);
      expect(task.schedule.type).toBe('interval');
      expect(task.prompts).toHaveLength(1);
      expect(task.avoidance.targets).toContain('spec-merge');
      expect(task.workflow.enabled).toBe(false);
      expect(task.behavior).toBe('wait');
      expect(task.lastExecutedAt).toBeNull();
      expect(task.createdAt).toBe(1706140800000);
      expect(task.updatedAt).toBe(1706140800000);
    });

    it('should accept lastExecutedAt as timestamp', () => {
      const task = createValidScheduleTask({
        lastExecutedAt: 1706227200000,
      });

      expect(task.lastExecutedAt).toBe(1706227200000);
    });

    it('should accept multiple prompts', () => {
      const task = createValidScheduleTask({
        prompts: [
          createValidPrompt(0, '/kiro:steering'),
          createValidPrompt(1, 'git status'),
          createValidPrompt(2, 'npm test'),
        ],
      });

      expect(task.prompts).toHaveLength(3);
      expect(task.prompts[0].order).toBe(0);
      expect(task.prompts[1].order).toBe(1);
      expect(task.prompts[2].order).toBe(2);
    });

    it('should support skip behavior', () => {
      const task = createValidScheduleTask({
        behavior: 'skip',
      });

      expect(task.behavior).toBe('skip');
    });
  });

  // ============================================================
  // ScheduleTaskInput Type (Requirement 2.4)
  // ============================================================
  describe('ScheduleTaskInput', () => {
    it('should omit id, lastExecutedAt, createdAt, updatedAt from ScheduleTask', () => {
      const input = createValidScheduleTaskInput();

      // Type assertion: these fields should not exist on ScheduleTaskInput
      expect((input as ScheduleTask).id).toBeUndefined();
      expect((input as ScheduleTask).lastExecutedAt).toBeUndefined();
      expect((input as ScheduleTask).createdAt).toBeUndefined();
      expect((input as ScheduleTask).updatedAt).toBeUndefined();
    });

    it('should have name, enabled, schedule, prompts, avoidance, workflow, behavior', () => {
      const input = createValidScheduleTaskInput();

      expect(input.name).toBe('New Schedule Task');
      expect(input.enabled).toBe(true);
      expect(input.schedule.type).toBe('interval');
      expect(input.prompts).toHaveLength(1);
      expect(input.avoidance.targets).toContain('spec-merge');
      expect(input.workflow.enabled).toBe(false);
      expect(input.behavior).toBe('wait');
    });
  });
});

// =============================================================================
// Tests: Zod Validation Schemas (Requirement 2.4)
// =============================================================================

describe('ScheduleTask Zod Schemas', () => {
  // ============================================================
  // IntervalScheduleSchema
  // ============================================================
  describe('IntervalScheduleSchema', () => {
    it('should validate valid interval schedule', () => {
      const result = IntervalScheduleSchema.safeParse({
        type: 'interval',
        hoursInterval: 168,
        waitForIdle: true,
      });

      expect(result.success).toBe(true);
    });

    it('should reject hoursInterval less than 1', () => {
      const result = IntervalScheduleSchema.safeParse({
        type: 'interval',
        hoursInterval: 0,
        waitForIdle: false,
      });

      expect(result.success).toBe(false);
    });

    it('should reject non-integer hoursInterval', () => {
      const result = IntervalScheduleSchema.safeParse({
        type: 'interval',
        hoursInterval: 1.5,
        waitForIdle: false,
      });

      expect(result.success).toBe(false);
    });

    it('should reject missing fields', () => {
      const result = IntervalScheduleSchema.safeParse({
        type: 'interval',
        hoursInterval: 168,
        // missing waitForIdle
      });

      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // WeeklyScheduleSchema
  // ============================================================
  describe('WeeklyScheduleSchema', () => {
    it('should validate valid weekly schedule', () => {
      const result = WeeklyScheduleSchema.safeParse({
        type: 'weekly',
        weekdays: [1, 3, 5],
        hourOfDay: 9,
        waitForIdle: false,
      });

      expect(result.success).toBe(true);
    });

    it('should reject weekday outside 0-6 range', () => {
      const result = WeeklyScheduleSchema.safeParse({
        type: 'weekly',
        weekdays: [7],
        hourOfDay: 9,
        waitForIdle: false,
      });

      expect(result.success).toBe(false);
    });

    it('should reject negative weekday', () => {
      const result = WeeklyScheduleSchema.safeParse({
        type: 'weekly',
        weekdays: [-1],
        hourOfDay: 9,
        waitForIdle: false,
      });

      expect(result.success).toBe(false);
    });

    it('should reject empty weekdays array', () => {
      const result = WeeklyScheduleSchema.safeParse({
        type: 'weekly',
        weekdays: [],
        hourOfDay: 9,
        waitForIdle: false,
      });

      expect(result.success).toBe(false);
    });

    it('should reject hourOfDay outside 0-23 range', () => {
      const result = WeeklyScheduleSchema.safeParse({
        type: 'weekly',
        weekdays: [1],
        hourOfDay: 24,
        waitForIdle: false,
      });

      expect(result.success).toBe(false);
    });

    it('should reject negative hourOfDay', () => {
      const result = WeeklyScheduleSchema.safeParse({
        type: 'weekly',
        weekdays: [1],
        hourOfDay: -1,
        waitForIdle: false,
      });

      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // IdleScheduleSchema
  // ============================================================
  describe('IdleScheduleSchema', () => {
    it('should validate valid idle schedule', () => {
      const result = IdleScheduleSchema.safeParse({
        type: 'idle',
        idleMinutes: 30,
      });

      expect(result.success).toBe(true);
    });

    it('should reject idleMinutes less than 1', () => {
      const result = IdleScheduleSchema.safeParse({
        type: 'idle',
        idleMinutes: 0,
      });

      expect(result.success).toBe(false);
    });

    it('should reject non-integer idleMinutes', () => {
      const result = IdleScheduleSchema.safeParse({
        type: 'idle',
        idleMinutes: 30.5,
      });

      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // ScheduleConditionSchema (Discriminated Union)
  // ============================================================
  describe('ScheduleConditionSchema', () => {
    it('should parse interval schedule', () => {
      const result = ScheduleConditionSchema.safeParse({
        type: 'interval',
        hoursInterval: 168,
        waitForIdle: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('interval');
      }
    });

    it('should parse weekly schedule', () => {
      const result = ScheduleConditionSchema.safeParse({
        type: 'weekly',
        weekdays: [1],
        hourOfDay: 9,
        waitForIdle: false,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('weekly');
      }
    });

    it('should parse idle schedule', () => {
      const result = ScheduleConditionSchema.safeParse({
        type: 'idle',
        idleMinutes: 30,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('idle');
      }
    });

    it('should reject unknown type', () => {
      const result = ScheduleConditionSchema.safeParse({
        type: 'unknown',
        value: 123,
      });

      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // PromptSchema
  // ============================================================
  describe('PromptSchema', () => {
    it('should validate valid prompt', () => {
      const result = PromptSchema.safeParse({
        order: 0,
        content: '/kiro:steering',
      });

      expect(result.success).toBe(true);
    });

    it('should reject negative order', () => {
      const result = PromptSchema.safeParse({
        order: -1,
        content: 'test',
      });

      expect(result.success).toBe(false);
    });

    it('should reject empty content', () => {
      const result = PromptSchema.safeParse({
        order: 0,
        content: '',
      });

      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // AvoidanceRuleSchema
  // ============================================================
  describe('AvoidanceRuleSchema', () => {
    it('should validate valid avoidance rule', () => {
      const result = AvoidanceRuleSchema.safeParse({
        targets: ['spec-merge', 'commit'],
        behavior: 'wait',
      });

      expect(result.success).toBe(true);
    });

    it('should accept empty targets array', () => {
      const result = AvoidanceRuleSchema.safeParse({
        targets: [],
        behavior: 'skip',
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid target', () => {
      const result = AvoidanceRuleSchema.safeParse({
        targets: ['invalid-target'],
        behavior: 'wait',
      });

      expect(result.success).toBe(false);
    });

    it('should reject invalid behavior', () => {
      const result = AvoidanceRuleSchema.safeParse({
        targets: ['spec-merge'],
        behavior: 'invalid',
      });

      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // WorkflowConfigSchema
  // ============================================================
  describe('ScheduleWorkflowConfigSchema', () => {
    it('should validate disabled workflow', () => {
      const result = ScheduleWorkflowConfigSchema.safeParse({
        enabled: false,
      });

      expect(result.success).toBe(true);
    });

    it('should validate enabled workflow with auto suffix', () => {
      const result = ScheduleWorkflowConfigSchema.safeParse({
        enabled: true,
        suffixMode: 'auto',
      });

      expect(result.success).toBe(true);
    });

    it('should validate enabled workflow with custom suffix', () => {
      const result = ScheduleWorkflowConfigSchema.safeParse({
        enabled: true,
        suffixMode: 'custom',
        customSuffix: 'my-suffix',
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid suffixMode', () => {
      const result = ScheduleWorkflowConfigSchema.safeParse({
        enabled: true,
        suffixMode: 'invalid',
      });

      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // ScheduleTaskSchema
  // ============================================================
  describe('ScheduleTaskSchema', () => {
    it('should validate complete schedule task', () => {
      const result = ScheduleTaskSchema.safeParse(createValidScheduleTask());

      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const result = ScheduleTaskSchema.safeParse(
        createValidScheduleTask({ name: '' })
      );

      expect(result.success).toBe(false);
    });

    it('should reject empty prompts array', () => {
      const result = ScheduleTaskSchema.safeParse(
        createValidScheduleTask({ prompts: [] })
      );

      expect(result.success).toBe(false);
    });

    it('should accept null lastExecutedAt', () => {
      const result = ScheduleTaskSchema.safeParse(
        createValidScheduleTask({ lastExecutedAt: null })
      );

      expect(result.success).toBe(true);
    });

    it('should accept number lastExecutedAt', () => {
      const result = ScheduleTaskSchema.safeParse(
        createValidScheduleTask({ lastExecutedAt: 1706227200000 })
      );

      expect(result.success).toBe(true);
    });

    it('should reject negative timestamps', () => {
      const result = ScheduleTaskSchema.safeParse(
        createValidScheduleTask({ createdAt: -1 })
      );

      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // ScheduleTaskInputSchema
  // ============================================================
  describe('ScheduleTaskInputSchema', () => {
    it('should validate complete schedule task input', () => {
      const result = ScheduleTaskInputSchema.safeParse(createValidScheduleTaskInput());

      expect(result.success).toBe(true);
    });

    it('should not require id field', () => {
      const input = createValidScheduleTaskInput();

      const result = ScheduleTaskInputSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        // id should not be in the parsed data
        expect((result.data as Record<string, unknown>).id).toBeUndefined();
      }
    });

    it('should not require timestamp fields', () => {
      const input = createValidScheduleTaskInput();

      const result = ScheduleTaskInputSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as Record<string, unknown>).lastExecutedAt).toBeUndefined();
        expect((result.data as Record<string, unknown>).createdAt).toBeUndefined();
        expect((result.data as Record<string, unknown>).updatedAt).toBeUndefined();
      }
    });

    it('should reject extra fields (strict mode)', () => {
      const input = {
        ...createValidScheduleTaskInput(),
        extraField: 'should not be here',
      };

      const result = ScheduleTaskInputSchema.safeParse(input);

      // Zod strict mode rejects extra fields
      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// Tests: IPC Contract Types (Task 3.1)
// Requirements: All IPC (design.md scheduleTaskHandlers API Contract)
// =============================================================================

import type {
  QueuedTask,
  QueueReason,
  RunningTaskInfo,
  ExecutionResult,
  ExecutionError,
  ScheduleTaskStatusEvent,
  TaskQueuedEvent,
  TaskStartedEvent,
  TaskCompletedEvent,
  TaskSkippedEvent,
  AvoidanceWaitingEvent,
  ScheduleTaskGetAllRequest,
  ScheduleTaskGetRequest,
  ScheduleTaskCreateRequest,
  ScheduleTaskUpdateRequest,
  ScheduleTaskDeleteRequest,
  ScheduleTaskExecuteImmediatelyRequest,
  ScheduleTaskGetQueueRequest,
  ScheduleTaskGetRunningRequest,
} from './scheduleTask';

describe('IPC Contract Types (Task 3.1)', () => {
  // ============================================================
  // QueuedTask Type
  // ============================================================
  describe('QueuedTask', () => {
    it('should have taskId, queuedAt, and reason fields', () => {
      const queued: QueuedTask = {
        taskId: VALID_UUID,
        queuedAt: 1706140800000,
        reason: 'schedule',
      };

      expect(queued.taskId).toBe(VALID_UUID);
      expect(queued.queuedAt).toBe(1706140800000);
      expect(queued.reason).toBe('schedule');
    });

    it('should accept idle as reason', () => {
      const queued: QueuedTask = {
        taskId: VALID_UUID,
        queuedAt: 1706140800000,
        reason: 'idle',
      };

      expect(queued.reason).toBe('idle');
    });
  });

  // ============================================================
  // QueueReason Type
  // ============================================================
  describe('QueueReason', () => {
    it('should accept schedule and idle values', () => {
      const reasons: QueueReason[] = ['schedule', 'idle'];

      expect(reasons).toHaveLength(2);
      expect(reasons).toContain('schedule');
      expect(reasons).toContain('idle');
    });
  });

  // ============================================================
  // RunningTaskInfo Type
  // ============================================================
  describe('RunningTaskInfo', () => {
    it('should have required fields', () => {
      const running: RunningTaskInfo = {
        taskId: VALID_UUID,
        promptIndex: 0,
        agentId: 'agent-123',
      };

      expect(running.taskId).toBe(VALID_UUID);
      expect(running.promptIndex).toBe(0);
      expect(running.agentId).toBe('agent-123');
    });

    it('should accept optional worktreePath', () => {
      const running: RunningTaskInfo = {
        taskId: VALID_UUID,
        promptIndex: 1,
        agentId: 'agent-456',
        worktreePath: '/path/to/worktree',
      };

      expect(running.worktreePath).toBe('/path/to/worktree');
    });
  });

  // ============================================================
  // ExecutionResult Type
  // ============================================================
  describe('ExecutionResult', () => {
    it('should have taskId, startedAt, and agentIds', () => {
      const result: ExecutionResult = {
        taskId: VALID_UUID,
        startedAt: 1706140800000,
        agentIds: ['agent-1', 'agent-2'],
      };

      expect(result.taskId).toBe(VALID_UUID);
      expect(result.startedAt).toBe(1706140800000);
      expect(result.agentIds).toHaveLength(2);
    });
  });

  // ============================================================
  // ExecutionError Type
  // ============================================================
  describe('ExecutionError', () => {
    it('should support TASK_NOT_FOUND error', () => {
      const error: ExecutionError = {
        type: 'TASK_NOT_FOUND',
        taskId: VALID_UUID,
      };

      expect(error.type).toBe('TASK_NOT_FOUND');
      expect(error.taskId).toBe(VALID_UUID);
    });

    it('should support ALREADY_RUNNING error', () => {
      const error: ExecutionError = {
        type: 'ALREADY_RUNNING',
        taskId: VALID_UUID,
      };

      expect(error.type).toBe('ALREADY_RUNNING');
    });

    it('should support AVOIDANCE_CONFLICT error', () => {
      const error: ExecutionError = {
        type: 'AVOIDANCE_CONFLICT',
        conflictType: 'spec-merge',
      };

      expect(error.type).toBe('AVOIDANCE_CONFLICT');
      expect(error.conflictType).toBe('spec-merge');
    });

    it('should support AGENT_START_FAILED error', () => {
      const error: ExecutionError = {
        type: 'AGENT_START_FAILED',
        message: 'Failed to start agent process',
      };

      expect(error.type).toBe('AGENT_START_FAILED');
      expect(error.message).toBe('Failed to start agent process');
    });
  });

  // ============================================================
  // ScheduleTaskStatusEvent Types
  // ============================================================
  describe('ScheduleTaskStatusEvent', () => {
    it('should support task-queued event', () => {
      const event: TaskQueuedEvent = {
        type: 'task-queued',
        timestamp: 1706140800000,
        taskId: VALID_UUID,
        reason: 'schedule',
      };

      expect(event.type).toBe('task-queued');
      expect(event.reason).toBe('schedule');
    });

    it('should support task-started event', () => {
      const event: TaskStartedEvent = {
        type: 'task-started',
        timestamp: 1706140800000,
        taskId: VALID_UUID,
        agentIds: ['agent-1'],
      };

      expect(event.type).toBe('task-started');
      expect(event.agentIds).toContain('agent-1');
    });

    it('should support task-completed event', () => {
      const event: TaskCompletedEvent = {
        type: 'task-completed',
        timestamp: 1706140800000,
        taskId: VALID_UUID,
        success: true,
      };

      expect(event.type).toBe('task-completed');
      expect(event.success).toBe(true);
    });

    it('should support task-skipped event', () => {
      const event: TaskSkippedEvent = {
        type: 'task-skipped',
        timestamp: 1706140800000,
        taskId: VALID_UUID,
        reason: 'avoidance',
      };

      expect(event.type).toBe('task-skipped');
      expect(event.reason).toBe('avoidance');
    });

    it('should support avoidance-waiting event', () => {
      const event: AvoidanceWaitingEvent = {
        type: 'avoidance-waiting',
        timestamp: 1706140800000,
        taskId: VALID_UUID,
        conflictType: 'bug-merge',
      };

      expect(event.type).toBe('avoidance-waiting');
      expect(event.conflictType).toBe('bug-merge');
    });

    it('should discriminate union type correctly', () => {
      const events: ScheduleTaskStatusEvent[] = [
        { type: 'task-queued', timestamp: 1706140800000, taskId: VALID_UUID, reason: 'schedule' },
        { type: 'task-started', timestamp: 1706140800000, taskId: VALID_UUID, agentIds: [] },
        { type: 'task-completed', timestamp: 1706140800000, taskId: VALID_UUID, success: true },
        { type: 'task-skipped', timestamp: 1706140800000, taskId: VALID_UUID, reason: 'disabled' },
        { type: 'avoidance-waiting', timestamp: 1706140800000, taskId: VALID_UUID, conflictType: 'commit' },
      ];

      expect(events[0].type).toBe('task-queued');
      expect(events[1].type).toBe('task-started');
      expect(events[2].type).toBe('task-completed');
      expect(events[3].type).toBe('task-skipped');
      expect(events[4].type).toBe('avoidance-waiting');
    });
  });

  // ============================================================
  // IPC Request Types
  // ============================================================
  describe('IPC Request Types', () => {
    it('should define ScheduleTaskGetAllRequest', () => {
      const req: ScheduleTaskGetAllRequest = {
        projectPath: '/path/to/project',
      };

      expect(req.projectPath).toBe('/path/to/project');
    });

    it('should define ScheduleTaskGetRequest', () => {
      const req: ScheduleTaskGetRequest = {
        projectPath: '/path/to/project',
        taskId: VALID_UUID,
      };

      expect(req.projectPath).toBe('/path/to/project');
      expect(req.taskId).toBe(VALID_UUID);
    });

    it('should define ScheduleTaskCreateRequest', () => {
      const req: ScheduleTaskCreateRequest = {
        projectPath: '/path/to/project',
        task: createValidScheduleTaskInput(),
      };

      expect(req.projectPath).toBe('/path/to/project');
      expect(req.task.name).toBe('New Schedule Task');
    });

    it('should define ScheduleTaskUpdateRequest', () => {
      const req: ScheduleTaskUpdateRequest = {
        projectPath: '/path/to/project',
        taskId: VALID_UUID,
        updates: { enabled: false },
      };

      expect(req.projectPath).toBe('/path/to/project');
      expect(req.taskId).toBe(VALID_UUID);
      expect(req.updates.enabled).toBe(false);
    });

    it('should define ScheduleTaskDeleteRequest', () => {
      const req: ScheduleTaskDeleteRequest = {
        projectPath: '/path/to/project',
        taskId: VALID_UUID,
      };

      expect(req.projectPath).toBe('/path/to/project');
      expect(req.taskId).toBe(VALID_UUID);
    });

    it('should define ScheduleTaskExecuteImmediatelyRequest', () => {
      const req: ScheduleTaskExecuteImmediatelyRequest = {
        projectPath: '/path/to/project',
        taskId: VALID_UUID,
        force: true,
      };

      expect(req.projectPath).toBe('/path/to/project');
      expect(req.taskId).toBe(VALID_UUID);
      expect(req.force).toBe(true);
    });

    it('should define ScheduleTaskGetQueueRequest', () => {
      const req: ScheduleTaskGetQueueRequest = {
        projectPath: '/path/to/project',
      };

      expect(req.projectPath).toBe('/path/to/project');
    });

    it('should define ScheduleTaskGetRunningRequest', () => {
      const req: ScheduleTaskGetRunningRequest = {
        projectPath: '/path/to/project',
      };

      expect(req.projectPath).toBe('/path/to/project');
    });
  });
});
