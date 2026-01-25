/**
 * Schedule Task Types
 * schedule-task-execution feature
 * Requirements: 2.4, 3.1, 3.2, 4.1, 5.1, 6.1, 6.2, 8.1
 */

import { z } from 'zod';

// ============================================================
// Avoidance Rule Types
// Requirements: 6.1, 6.2
// ============================================================

/** Avoidance target types - operations to avoid running during */
export type AvoidanceTarget = 'spec-merge' | 'commit' | 'bug-merge' | 'schedule-task';

/** Avoidance behavior when target operation is running */
export type AvoidanceBehavior = 'wait' | 'skip';

/** Avoidance rule configuration */
export interface AvoidanceRule {
  readonly targets: readonly AvoidanceTarget[];
  readonly behavior: AvoidanceBehavior;
}

// ============================================================
// Workflow Configuration Types
// Requirements: 8.1
// ============================================================

/** Suffix generation mode for worktree naming */
export type ScheduleSuffixMode = 'auto' | 'custom';

/** Workflow mode configuration for schedule tasks */
export interface ScheduleWorkflowConfig {
  readonly enabled: boolean;
  readonly suffixMode?: ScheduleSuffixMode;
  readonly customSuffix?: string;
}

// ============================================================
// Schedule Condition Types (Union Type)
// Requirements: 3.1, 3.2, 4.1
// ============================================================

/** Interval-based schedule (e.g., "every 24 hours since last execution") */
export interface IntervalSchedule {
  readonly type: 'interval';
  readonly hoursInterval: number;
  readonly waitForIdle: boolean;
}

/** Weekly schedule (e.g., "every Monday and Wednesday at 9:00") */
export interface WeeklySchedule {
  readonly type: 'weekly';
  readonly weekdays: readonly number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
  readonly hourOfDay: number; // 0-23
  readonly waitForIdle: boolean;
}

/** Idle-based schedule (e.g., "when idle for 30 minutes") */
export interface IdleSchedule {
  readonly type: 'idle';
  readonly idleMinutes: number;
}

/** Union type for all schedule conditions */
export type ScheduleCondition =
  | IntervalSchedule
  | WeeklySchedule
  | IdleSchedule;

// ============================================================
// Prompt Type
// Requirements: 5.1
// ============================================================

/** Prompt definition for scheduled execution */
export interface Prompt {
  readonly order: number;
  readonly content: string;
}

// ============================================================
// Agent Behavior Type
// Requirements: 2.2 (other Agent behavior setting)
// ============================================================

/** Behavior when other agents are running */
export type AgentBehavior = 'wait' | 'skip';

// ============================================================
// Schedule Task Types
// Requirements: 2.4, 9.3
// ============================================================

/** Full schedule task definition */
export interface ScheduleTask {
  readonly id: string;
  readonly name: string;
  readonly enabled: boolean;
  readonly schedule: ScheduleCondition;
  readonly prompts: readonly Prompt[];
  readonly avoidance: AvoidanceRule;
  readonly workflow: ScheduleWorkflowConfig;
  readonly behavior: AgentBehavior;
  readonly lastExecutedAt: number | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** Input type for creating/updating tasks (no id, timestamps auto-generated) */
export type ScheduleTaskInput = Omit<ScheduleTask, 'id' | 'lastExecutedAt' | 'createdAt' | 'updatedAt'>;

/** File format for .kiro/schedule-tasks.json */
export interface ScheduleTasksFile {
  readonly version: 1;
  readonly tasks: readonly ScheduleTask[];
}

// ============================================================
// Zod Schemas for Validation
// Requirements: 2.4
// ============================================================

/** Avoidance target validation */
export const AvoidanceTargetSchema = z.enum(['spec-merge', 'commit', 'bug-merge', 'schedule-task']);

/** Avoidance behavior validation */
export const AvoidanceBehaviorSchema = z.enum(['wait', 'skip']);

/** Avoidance rule validation */
export const AvoidanceRuleSchema = z.object({
  targets: z.array(AvoidanceTargetSchema),
  behavior: AvoidanceBehaviorSchema,
});

/** Suffix mode validation */
export const ScheduleSuffixModeSchema = z.enum(['auto', 'custom']);

/** Workflow config validation for schedule tasks */
export const ScheduleWorkflowConfigSchema = z.object({
  enabled: z.boolean(),
  suffixMode: ScheduleSuffixModeSchema.optional(),
  customSuffix: z.string().optional(),
});

/** Interval schedule condition validation */
export const IntervalScheduleSchema = z.object({
  type: z.literal('interval'),
  hoursInterval: z.number().int().min(1),
  waitForIdle: z.boolean(),
});

/** Weekly schedule condition validation */
export const WeeklyScheduleSchema = z.object({
  type: z.literal('weekly'),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1),
  hourOfDay: z.number().int().min(0).max(23),
  waitForIdle: z.boolean(),
});

/** Idle schedule condition validation */
export const IdleScheduleSchema = z.object({
  type: z.literal('idle'),
  idleMinutes: z.number().int().min(1),
});

/** Schedule condition validation (union) */
export const ScheduleConditionSchema = z.discriminatedUnion('type', [
  IntervalScheduleSchema,
  WeeklyScheduleSchema,
  IdleScheduleSchema,
]);

/** Prompt validation */
export const PromptSchema = z.object({
  order: z.number().int().min(0),
  content: z.string().min(1),
});

/** Agent behavior validation */
export const AgentBehaviorSchema = z.enum(['wait', 'skip']);

/** Schedule task input validation (strict mode - rejects extra fields) */
export const ScheduleTaskInputSchema = z.object({
  name: z.string().min(1).max(100),
  enabled: z.boolean(),
  schedule: ScheduleConditionSchema,
  prompts: z.array(PromptSchema).min(1),
  avoidance: AvoidanceRuleSchema,
  workflow: ScheduleWorkflowConfigSchema,
  behavior: AgentBehaviorSchema,
}).strict();

/** Full schedule task validation (with generated fields) */
export const ScheduleTaskSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  enabled: z.boolean(),
  schedule: ScheduleConditionSchema,
  prompts: z.array(PromptSchema).min(1),
  avoidance: AvoidanceRuleSchema,
  workflow: ScheduleWorkflowConfigSchema,
  behavior: AgentBehaviorSchema,
  lastExecutedAt: z.number().int().nonnegative().nullable(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

/** Schedule tasks file validation */
export const ScheduleTasksFileSchema = z.object({
  version: z.literal(1),
  tasks: z.array(ScheduleTaskSchema),
});

// ============================================================
// Error Types
// Requirements: 2.4, 9.3
// ============================================================

/** Validation error type */
export interface ValidationError {
  readonly type: 'VALIDATION_ERROR';
  readonly errors: readonly { readonly field: string; readonly message: string }[];
}

/** Task not found error */
export interface TaskNotFoundError {
  readonly type: 'TASK_NOT_FOUND';
  readonly taskId: string;
}

/** Duplicate task name error */
export interface DuplicateTaskNameError {
  readonly type: 'DUPLICATE_TASK_NAME';
  readonly taskName: string;
}

/** Consistency check result */
export interface ConsistencyResult {
  readonly isConsistent: boolean;
  readonly issues?: readonly string[];
}

/** Combined service error type */
export type ScheduleTaskServiceError = ValidationError | TaskNotFoundError | DuplicateTaskNameError;

// ============================================================
// IPC Contract Types
// Requirements: All IPC (design.md scheduleTaskHandlers API Contract)
// Task 3.1: IPCチャンネル定義を追加
// ============================================================

/** Reason why a task was queued */
export type QueueReason = 'schedule' | 'idle';

/** Queued task information (waiting to be executed) */
export interface QueuedTask {
  readonly taskId: string;
  readonly queuedAt: number;
  readonly reason: QueueReason;
}

/** Running task information (currently executing) */
export interface RunningTaskInfo {
  readonly taskId: string;
  readonly promptIndex: number;
  readonly agentId: string;
  readonly worktreePath?: string;
}

/** Successful execution result */
export interface ExecutionResult {
  readonly taskId: string;
  readonly startedAt: number;
  readonly agentIds: readonly string[];
}

/** Execution error types */
export type ExecutionError =
  | { readonly type: 'TASK_NOT_FOUND'; readonly taskId: string }
  | { readonly type: 'ALREADY_RUNNING'; readonly taskId: string }
  | { readonly type: 'AVOIDANCE_CONFLICT'; readonly conflictType: AvoidanceTarget }
  | { readonly type: 'AGENT_START_FAILED'; readonly message: string };

// ============================================================
// Status Event Types
// Requirements: All IPC (schedule-task:status-changed event)
// ============================================================

/** Task status event types */
export type ScheduleTaskStatusEventType =
  | 'task-queued'
  | 'task-started'
  | 'task-completed'
  | 'task-skipped'
  | 'avoidance-waiting';

/** Base event structure */
interface ScheduleTaskStatusEventBase {
  readonly timestamp: number;
  readonly taskId: string;
}

/** Task queued event */
export interface TaskQueuedEvent extends ScheduleTaskStatusEventBase {
  readonly type: 'task-queued';
  readonly reason: QueueReason;
}

/** Task started event */
export interface TaskStartedEvent extends ScheduleTaskStatusEventBase {
  readonly type: 'task-started';
  readonly agentIds: readonly string[];
}

/** Task completed event */
export interface TaskCompletedEvent extends ScheduleTaskStatusEventBase {
  readonly type: 'task-completed';
  readonly success: boolean;
}

/** Task skipped event */
export interface TaskSkippedEvent extends ScheduleTaskStatusEventBase {
  readonly type: 'task-skipped';
  readonly reason: 'avoidance' | 'disabled';
}

/** Avoidance waiting event */
export interface AvoidanceWaitingEvent extends ScheduleTaskStatusEventBase {
  readonly type: 'avoidance-waiting';
  readonly conflictType: AvoidanceTarget;
}

/** Union type for all status change events */
export type ScheduleTaskStatusEvent =
  | TaskQueuedEvent
  | TaskStartedEvent
  | TaskCompletedEvent
  | TaskSkippedEvent
  | AvoidanceWaitingEvent;

// ============================================================
// IPC Request/Response Types
// Requirements: All IPC (design.md scheduleTaskHandlers API Contract)
// ============================================================

/** Request type for schedule-task:get-all */
export interface ScheduleTaskGetAllRequest {
  readonly projectPath: string;
}

/** Request type for schedule-task:get */
export interface ScheduleTaskGetRequest {
  readonly projectPath: string;
  readonly taskId: string;
}

/** Request type for schedule-task:create */
export interface ScheduleTaskCreateRequest {
  readonly projectPath: string;
  readonly task: ScheduleTaskInput;
}

/** Request type for schedule-task:update */
export interface ScheduleTaskUpdateRequest {
  readonly projectPath: string;
  readonly taskId: string;
  readonly updates: Partial<ScheduleTaskInput>;
}

/** Request type for schedule-task:delete */
export interface ScheduleTaskDeleteRequest {
  readonly projectPath: string;
  readonly taskId: string;
}

/** Request type for schedule-task:execute-immediately */
export interface ScheduleTaskExecuteImmediatelyRequest {
  readonly projectPath: string;
  readonly taskId: string;
  readonly force?: boolean;
}

/** Request type for schedule-task:get-queue */
export interface ScheduleTaskGetQueueRequest {
  readonly projectPath: string;
}

/** Request type for schedule-task:get-running */
export interface ScheduleTaskGetRunningRequest {
  readonly projectPath: string;
}
