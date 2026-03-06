/**
 * AutoExecution Router - Auto execution management tRPC procedures
 * Task 7.1: autoExecutionルーターとZodスキーマを実装する
 * Requirements: 6.1, 6.2, 6.3
 *
 * Provides 14 auto-execution procedures:
 *
 * Spec Auto Execution (8):
 * - start (mutation): Start auto execution for a spec
 * - stop (mutation): Stop auto execution for a spec
 * - getStatus (query): Get status for a spec
 * - getAllStatus (query): Get all execution statuses
 * - retryFrom (mutation): Retry from a specific phase
 * - reset (mutation): Reset all executions (E2E test support)
 * - setMockEnv (mutation): Set mock env variable (E2E test support)
 * - resetImplRetry (mutation): Reset impl retry count
 *
 * Bug Auto Execution (6):
 * - bugStart (mutation): Start auto execution for a bug
 * - bugStop (mutation): Stop auto execution for a bug
 * - bugGetStatus (query): Get status for a bug
 * - bugGetAllStatus (query): Get all bug execution statuses
 * - bugRetryFrom (mutation): Retry from a specific bug phase
 * - bugReset (mutation): Reset all bug executions (E2E test support)
 *
 * Legacy handlers: autoExecutionHandlers.ts (8 channels), bugAutoExecutionHandlers.ts (6 channels)
 * All services accessed via ctx.services for testability (DD-006).
 * autoExecutionCoordinator is the adapter target for both spec and bug coordinators.
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc';

// ============================================================
// Zod Schemas (Task 7.1: Requirements 6.3)
// ============================================================

// --- Spec Auto Execution Schemas ---

const autoExecutionPermissionsSchema = z.object({
  requirements: z.boolean(),
  design: z.boolean(),
  tasks: z.boolean(),
  'document-review': z.boolean(),
  impl: z.boolean(),
  inspection: z.boolean(),
  deploy: z.boolean(),
});

const autoExecutionOptionsSchema = z.object({
  permissions: autoExecutionPermissionsSchema,
  timeoutMs: z.number().optional(),
  commandPrefix: z.enum(['kiro', 'spec-manager']).optional(),
  approvals: z.object({
    requirements: z.object({ generated: z.boolean(), approved: z.boolean() }),
    design: z.object({ generated: z.boolean(), approved: z.boolean() }),
    tasks: z.object({ generated: z.boolean(), approved: z.boolean() }),
  }).optional(),
  validationOptions: z.object({
    gap: z.boolean(),
    design: z.boolean(),
    impl: z.boolean(),
  }).optional(),
});

export const startInputSchema = z.object({
  projectPath: z.string().min(1),
  specPath: z.string().min(1),
  specId: z.string().min(1),
  options: autoExecutionOptionsSchema,
});

export const stopInputSchema = z.object({
  specPath: z.string().min(1),
});

export const statusInputSchema = z.object({
  specPath: z.string().min(1),
});

export const retryFromInputSchema = z.object({
  specPath: z.string().min(1),
  phase: z.string().min(1),
});

export const resetImplRetryInputSchema = z.object({
  specPath: z.string().min(1),
});

export const setMockEnvInputSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

// Bug Auto Execution Schemas removed (github-issue-integration)
// Minimal stubs retained for router contract compatibility
const bugStartInputSchema = z.object({
  projectPath: z.string().min(1),
  bugPath: z.string().min(1),
  bugName: z.string().min(1),
  options: z.object({ permissions: z.record(z.boolean()) }),
  lastCompletedPhase: z.string().nullable(),
});

const bugStopInputSchema = z.object({
  bugPath: z.string().min(1),
});

const bugStatusInputSchema = z.object({
  bugPath: z.string().min(1),
});

const bugRetryFromInputSchema = z.object({
  bugPath: z.string().min(1),
  phase: z.string().min(1),
});

// ============================================================
// Helper: Serialize state (remove timeoutId for IPC safety)
// ============================================================

/**
 * Remove timeoutId from state for IPC serialization.
 * timeoutId contains NodeJS.Timeout which has circular references.
 */
function toSerializableState<T extends Record<string, unknown>>(
  state: T | null,
): Omit<T, 'timeoutId'> | null {
  if (!state) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { timeoutId, ...rest } = state;
  return rest as Omit<T, 'timeoutId'>;
}

/**
 * Serialize a Result containing a state with timeoutId.
 */
function toSerializableResult<T extends Record<string, unknown>, E>(
  result: { ok: true; value: T } | { ok: false; error: E },
): { ok: true; value: Omit<T, 'timeoutId'> } | { ok: false; error: E } {
  if (result.ok) {
    return { ok: true, value: toSerializableState(result.value) as Omit<T, 'timeoutId'> };
  }
  return result;
}

// ============================================================
// Allowed E2E mock env keys
// ============================================================

const ALLOWED_MOCK_ENV_KEYS = [
  'E2E_MOCK_DOC_REVIEW_RESULT',
  'E2E_MOCK_TASKS_COMPLETE',
  'E2E_MOCK_CLAUDE_DELAY',
];

// ============================================================
// AutoExecution Router
// ============================================================

export const autoExecutionRouter = router({

  // ============================================================
  // Spec Auto Execution: start (mutation)
  // Legacy: AUTO_EXECUTION_START (autoExecutionHandlers.ts)
  // ============================================================

  /**
   * Start auto execution for a spec.
   * Resolves specPath via fileService, then delegates to autoExecutionCoordinator.start().
   * Returns serializable Result (timeoutId excluded).
   */
  start: publicProcedure
    .input(startInputSchema)
    .mutation(async ({ ctx, input }) => {
      const coordinator = ctx.services.autoExecutionCoordinator;
      if (!coordinator) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'autoExecutionCoordinator not initialized',
        });
      }

      // Resolve spec path from name via fileService (spec-path-ssot-refactor pattern)
      const fileService = ctx.services.fileService;
      if (!fileService) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'fileService not initialized',
        });
      }

      const specPathResult = await fileService.resolveSpecPath(input.projectPath, input.specPath);
      if (!specPathResult.ok) {
        return {
          ok: false as const,
          error: { type: 'SPEC_NOT_FOUND', specPath: input.specPath },
        };
      }
      const resolvedSpecPath = specPathResult.value;

      const result = await coordinator.start(
        input.projectPath,
        resolvedSpecPath,
        input.specId,
        input.options as Record<string, unknown>,
      );
      return toSerializableResult(result);
    }),

  // ============================================================
  // Spec Auto Execution: stop (mutation)
  // Legacy: AUTO_EXECUTION_STOP (autoExecutionHandlers.ts)
  // ============================================================

  /**
   * Stop auto execution for a spec.
   * Delegates to autoExecutionCoordinator.stop().
   */
  stop: publicProcedure
    .input(stopInputSchema)
    .mutation(async ({ ctx, input }) => {
      const coordinator = ctx.services.autoExecutionCoordinator;
      if (!coordinator) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'autoExecutionCoordinator not initialized',
        });
      }

      return coordinator.stop(input.specPath);
    }),

  // ============================================================
  // Spec Auto Execution: getStatus (query)
  // Legacy: AUTO_EXECUTION_STATUS (autoExecutionHandlers.ts)
  // ============================================================

  /**
   * Get auto execution status for a spec.
   * Returns serializable state (timeoutId excluded) or null.
   */
  getStatus: publicProcedure
    .input(statusInputSchema)
    .query(({ ctx, input }) => {
      const coordinator = ctx.services.autoExecutionCoordinator;
      if (!coordinator) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'autoExecutionCoordinator not initialized',
        });
      }

      return toSerializableState(
        coordinator.getStatus(input.specPath) as Record<string, unknown> | null,
      );
    }),

  // ============================================================
  // Spec Auto Execution: getAllStatus (query)
  // Legacy: AUTO_EXECUTION_ALL_STATUS (autoExecutionHandlers.ts)
  // ============================================================

  /**
   * Get all auto execution statuses.
   * Converts Map to Record and serializes each state.
   */
  getAllStatus: publicProcedure
    .query(({ ctx }) => {
      const coordinator = ctx.services.autoExecutionCoordinator;
      if (!coordinator) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'autoExecutionCoordinator not initialized',
        });
      }

      const statuses = coordinator.getAllStatuses();
      const result: Record<string, Record<string, unknown>> = {};
      for (const [key, value] of statuses) {
        const serializable = toSerializableState(value);
        if (serializable) {
          result[key] = serializable;
        }
      }
      return result;
    }),

  // ============================================================
  // Spec Auto Execution: retryFrom (mutation)
  // Legacy: AUTO_EXECUTION_RETRY_FROM (autoExecutionHandlers.ts)
  // ============================================================

  /**
   * Retry auto execution from a specific phase.
   * Delegates to autoExecutionCoordinator.retryFrom().
   */
  retryFrom: publicProcedure
    .input(retryFromInputSchema)
    .mutation(async ({ ctx, input }) => {
      const coordinator = ctx.services.autoExecutionCoordinator;
      if (!coordinator) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'autoExecutionCoordinator not initialized',
        });
      }

      const result = await coordinator.retryFrom(input.specPath, input.phase);
      return toSerializableResult(result);
    }),

  // ============================================================
  // Spec Auto Execution: reset (mutation)
  // Legacy: AUTO_EXECUTION_RESET (autoExecutionHandlers.ts)
  // WARNING: E2E test support only
  // ============================================================

  /**
   * Reset all auto executions.
   * E2E test support only.
   */
  reset: publicProcedure
    .mutation(({ ctx }) => {
      const coordinator = ctx.services.autoExecutionCoordinator;
      if (!coordinator) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'autoExecutionCoordinator not initialized',
        });
      }

      coordinator.resetAll();
    }),

  // ============================================================
  // Spec Auto Execution: setMockEnv (mutation)
  // Legacy: SET_MOCK_ENV (autoExecutionHandlers.ts)
  // WARNING: E2E test support only
  // ============================================================

  /**
   * Set mock environment variable for E2E tests.
   * Only allowed keys are accepted.
   */
  setMockEnv: publicProcedure
    .input(setMockEnvInputSchema)
    .mutation(({ input }) => {
      if (!ALLOWED_MOCK_ENV_KEYS.includes(input.key)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `setMockEnv rejected: key not allowed: ${input.key}`,
        });
      }

      process.env[input.key] = input.value;
    }),

  // ============================================================
  // Spec Auto Execution: resetImplRetry (mutation)
  // Legacy: AUTO_EXECUTION_RESET_IMPL_RETRY (autoExecutionHandlers.ts)
  // ============================================================

  /**
   * Reset impl retry count for a spec.
   * Delegates to autoExecutionCoordinator.resetImplRetryCount().
   */
  resetImplRetry: publicProcedure
    .input(resetImplRetryInputSchema)
    .mutation(({ ctx, input }) => {
      const coordinator = ctx.services.autoExecutionCoordinator;
      if (!coordinator) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'autoExecutionCoordinator not initialized',
        });
      }

      coordinator.resetImplRetryCount(input.specPath);
    }),

  // ============================================================
  // Bug Auto Execution: bugStart (mutation)
  // Legacy: BUG_AUTO_EXECUTION_START (bugAutoExecutionHandlers.ts)
  // ============================================================

  /**
   * Start bug auto execution.
   * Delegates to bugAutoExecutionCoordinator.start().
   */
  // Bug auto execution procedures removed (github-issue-integration)
  // bugStart, bugStop, bugGetStatus, bugGetAllStatus, bugRetryFrom, bugReset
  // These procedures are kept as stubs to avoid breaking the router contract
  bugStart: publicProcedure
    .input(bugStartInputSchema)
    .mutation(async () => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Bug auto execution removed (github-issue-integration)',
      });
    }),

  bugStop: publicProcedure
    .input(bugStopInputSchema)
    .mutation(async () => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Bug auto execution removed (github-issue-integration)',
      });
    }),

  bugGetStatus: publicProcedure
    .input(bugStatusInputSchema)
    .query(() => {
      return null;
    }),

  bugGetAllStatus: publicProcedure
    .query(() => {
      return {} as Record<string, Record<string, unknown>>;
    }),

  bugRetryFrom: publicProcedure
    .input(bugRetryFromInputSchema)
    .mutation(async () => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Bug auto execution removed (github-issue-integration)',
      });
    }),

  bugReset: publicProcedure
    .mutation(() => {
      // No-op (github-issue-integration)
    }),
});
