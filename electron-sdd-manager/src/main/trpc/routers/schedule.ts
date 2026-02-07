/**
 * Schedule Router - Schedule task management tRPC procedures
 * Task 10.4: scheduleルーターとZodスキーマを実装する
 * Requirements: 9.1, 9.2
 *
 * Provides 9 schedule task management procedures:
 * - getAll (query): Get all schedule tasks for a project
 * - get (query): Get a single schedule task by ID
 * - create (mutation): Create a new schedule task
 * - update (mutation): Update an existing schedule task
 * - delete (mutation): Delete a schedule task
 * - executeImmediately (mutation): Execute a task immediately via coordinator
 * - getQueue (query): Get queued tasks from coordinator
 * - getRunning (query): Get running tasks from coordinator
 * - reportIdleTime (mutation): Report idle time from Renderer
 *
 * Legacy handler: scheduleTaskHandlers.ts (9 channels)
 * All services accessed via ctx.services for testability (DD-006).
 * Router is a thin adapter layer over existing ScheduleTaskService
 * and ScheduleTaskCoordinator (DD-002).
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc';
import {
  ScheduleConditionSchema,
  AvoidanceRuleSchema,
  ScheduleWorkflowConfigSchema,
  AgentBehaviorSchema,
  PromptSchema,
} from '../../../shared/types/scheduleTask';

// ============================================================
// Zod Schemas (Task 10.4: Requirements 9.2)
// ============================================================

// --- getAll ---
export const scheduleGetAllInputSchema = z.object({
  projectPath: z.string().min(1),
});

// --- get ---
export const scheduleGetInputSchema = z.object({
  projectPath: z.string().min(1),
  taskId: z.string().min(1),
});

// --- create ---
export const scheduleCreateInputSchema = z.object({
  projectPath: z.string().min(1),
  task: z.object({
    name: z.string().min(1).max(100),
    enabled: z.boolean(),
    schedule: ScheduleConditionSchema,
    prompts: z.array(PromptSchema).min(1).readonly(),
    avoidance: AvoidanceRuleSchema,
    workflow: ScheduleWorkflowConfigSchema,
    behavior: AgentBehaviorSchema,
  }),
});

// --- update ---
export const scheduleUpdateInputSchema = z.object({
  projectPath: z.string().min(1),
  taskId: z.string().min(1),
  updates: z.object({
    name: z.string().min(1).max(100).optional(),
    enabled: z.boolean().optional(),
    schedule: ScheduleConditionSchema.optional(),
    prompts: z.array(PromptSchema).min(1).readonly().optional(),
    avoidance: AvoidanceRuleSchema.optional(),
    workflow: ScheduleWorkflowConfigSchema.optional(),
    behavior: AgentBehaviorSchema.optional(),
  }),
});

// --- delete ---
export const scheduleDeleteInputSchema = z.object({
  projectPath: z.string().min(1),
  taskId: z.string().min(1),
});

// --- executeImmediately ---
export const scheduleExecuteImmediatelyInputSchema = z.object({
  projectPath: z.string().min(1),
  taskId: z.string().min(1),
  force: z.boolean().optional(),
});

// --- getQueue ---
export const scheduleGetQueueInputSchema = z.object({
  projectPath: z.string().min(1),
});

// --- getRunning ---
export const scheduleGetRunningInputSchema = z.object({
  projectPath: z.string().min(1),
});

// --- reportIdleTime ---
export const reportIdleTimeInputSchema = z.object({
  lastActivityTime: z.number(),
});

// ============================================================
// Schedule Router
// ============================================================

export const scheduleRouter = router({
  // ============================================================
  // getAll (query)
  // Legacy: SCHEDULE_TASK_GET_ALL (scheduleTaskHandlers.ts)
  // ============================================================

  /**
   * Get all schedule tasks for a project.
   * Delegates to scheduleTaskService.getAllTasks().
   */
  getAll: publicProcedure
    .input(scheduleGetAllInputSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.services.scheduleTaskService) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'scheduleTaskService not initialized',
        });
      }

      return ctx.services.scheduleTaskService.getAllTasks(input.projectPath);
    }),

  // ============================================================
  // get (query)
  // Legacy: SCHEDULE_TASK_GET (scheduleTaskHandlers.ts)
  // ============================================================

  /**
   * Get a single schedule task by ID.
   * Delegates to scheduleTaskService.getTask().
   */
  get: publicProcedure
    .input(scheduleGetInputSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.services.scheduleTaskService) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'scheduleTaskService not initialized',
        });
      }

      return ctx.services.scheduleTaskService.getTask(input.projectPath, input.taskId);
    }),

  // ============================================================
  // create (mutation)
  // Legacy: SCHEDULE_TASK_CREATE (scheduleTaskHandlers.ts)
  // ============================================================

  /**
   * Create a new schedule task.
   * Delegates to scheduleTaskService.createTask().
   * Returns Result<ScheduleTask, ScheduleTaskServiceError>.
   */
  create: publicProcedure
    .input(scheduleCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.services.scheduleTaskService) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'scheduleTaskService not initialized',
        });
      }

      return ctx.services.scheduleTaskService.createTask(input.projectPath, input.task);
    }),

  // ============================================================
  // update (mutation)
  // Legacy: SCHEDULE_TASK_UPDATE (scheduleTaskHandlers.ts)
  // ============================================================

  /**
   * Update an existing schedule task.
   * Delegates to scheduleTaskService.updateTask().
   * Returns Result<ScheduleTask, ScheduleTaskServiceError>.
   */
  update: publicProcedure
    .input(scheduleUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.services.scheduleTaskService) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'scheduleTaskService not initialized',
        });
      }

      return ctx.services.scheduleTaskService.updateTask(input.projectPath, input.taskId, input.updates);
    }),

  // ============================================================
  // delete (mutation)
  // Legacy: SCHEDULE_TASK_DELETE (scheduleTaskHandlers.ts)
  // ============================================================

  /**
   * Delete a schedule task.
   * Delegates to scheduleTaskService.deleteTask().
   * Returns Result<void, TaskNotFoundError>.
   */
  delete: publicProcedure
    .input(scheduleDeleteInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.services.scheduleTaskService) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'scheduleTaskService not initialized',
        });
      }

      return ctx.services.scheduleTaskService.deleteTask(input.projectPath, input.taskId);
    }),

  // ============================================================
  // executeImmediately (mutation)
  // Legacy: SCHEDULE_TASK_EXECUTE_IMMEDIATELY (scheduleTaskHandlers.ts)
  // ============================================================

  /**
   * Execute a task immediately via coordinator.
   * Delegates to scheduleTaskCoordinator.executeImmediately().
   * Returns Result<ExecutionResult, ExecutionError>.
   */
  executeImmediately: publicProcedure
    .input(scheduleExecuteImmediatelyInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.services.scheduleTaskCoordinator) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'scheduleTaskCoordinator not initialized',
        });
      }

      return ctx.services.scheduleTaskCoordinator.executeImmediately(input.taskId, input.force);
    }),

  // ============================================================
  // getQueue (query)
  // Legacy: SCHEDULE_TASK_GET_QUEUE (scheduleTaskHandlers.ts)
  // ============================================================

  /**
   * Get queued tasks from coordinator.
   * Returns empty array if coordinator is not initialized.
   */
  getQueue: publicProcedure
    .input(scheduleGetQueueInputSchema)
    .query(({ ctx }) => {
      if (!ctx.services.scheduleTaskCoordinator) {
        return [];
      }

      return [...ctx.services.scheduleTaskCoordinator.getQueuedTasks()];
    }),

  // ============================================================
  // getRunning (query)
  // Legacy: SCHEDULE_TASK_GET_RUNNING (scheduleTaskHandlers.ts)
  // ============================================================

  /**
   * Get running tasks from coordinator.
   * Returns empty array if coordinator is not initialized.
   */
  getRunning: publicProcedure
    .input(scheduleGetRunningInputSchema)
    .query(({ ctx }) => {
      if (!ctx.services.scheduleTaskCoordinator) {
        return [];
      }

      return [...ctx.services.scheduleTaskCoordinator.getRunningTasks()];
    }),

  // ============================================================
  // reportIdleTime (mutation)
  // Legacy: SCHEDULE_TASK_REPORT_IDLE_TIME (scheduleTaskHandlers.ts)
  // ============================================================

  /**
   * Report idle time from Renderer.
   * Sets last activity time for idle-based schedule detection.
   * No-op if reportIdleTime service is not initialized.
   */
  reportIdleTime: publicProcedure
    .input(reportIdleTimeInputSchema)
    .mutation(({ ctx, input }) => {
      if (ctx.services.reportIdleTime) {
        ctx.services.reportIdleTime(input.lastActivityTime);
      }
    }),
});
