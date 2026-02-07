/**
 * Bug Router - bug management tRPC procedures
 * Task 5.2: bugルーターとZodスキーマを実装する
 * Requirements: 4.1, 4.2, 4.3
 *
 * Provides bug management procedures:
 * - readBugs (query): Read all bugs from a project
 * - readBugDetail (query): Read bug detail by name
 * - startBugsWatcher (mutation): Start file watcher for bugs
 * - stopBugsWatcher (mutation): Stop file watcher for bugs
 * - executeBugCreate (mutation): Create a new bug via agent
 * - phaseUpdate (mutation): Update bug phase
 * - worktreeCreate (mutation): Create a bug worktree
 * - worktreeRemove (mutation): Remove a bug worktree
 * - worktreeAutoExecution (mutation): Auto execution with worktree
 * - convertToWorktree (mutation): Convert bug to worktree mode
 * - getBugsWorktreeDefault (query): Get bugs worktree default setting
 * - setBugsWorktreeDefault (mutation): Set bugs worktree default setting
 *
 * Legacy handlers: bugHandlers.ts, bugWorktreeHandlers.ts
 * All services accessed via ctx.services for testability (DD-006).
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc';

// ============================================================
// Zod Schemas (Task 5.2: Requirements 4.3)
// ============================================================

// --- Bug Phase ---
export const bugPhaseSchema = z.enum(['reported', 'analyzed', 'fixed', 'verified', 'deployed']);

// --- readBugs ---
export const readBugsInputSchema = z.object({
  projectPath: z.string().min(1),
});

// --- readBugDetail ---
export const readBugDetailInputSchema = z.object({
  bugName: z.string().min(1),
});

// --- executeBugCreate ---
export const executeBugCreateInputSchema = z.object({
  projectPath: z.string().min(1),
  description: z.string().min(1),
  worktreeMode: z.boolean().default(false),
});

// --- phaseUpdate ---
export const phaseUpdateInputSchema = z.object({
  bugName: z.string().min(1),
  phase: bugPhaseSchema,
});

// --- worktreeCreate / worktreeRemove / worktreeAutoExecution / convertToWorktree ---
export const bugNameInputSchema = z.object({
  bugName: z.string().min(1),
});

// --- setBugsWorktreeDefault ---
export const setBugsWorktreeDefaultInputSchema = z.object({
  value: z.boolean(),
});

// ============================================================
// Helper: get error message from unknown error
// ============================================================

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'type' in error) {
    const typedError = error as { type: string; message?: string };
    return typedError.message || typedError.type;
  }
  return String(error);
}

// ============================================================
// Bug Router
// ============================================================

export const bugRouter = router({
  // ============================================================
  // readBugs (query)
  // Legacy: READ_BUGS (bugHandlers.ts)
  // ============================================================

  /**
   * Read all bugs from a project.
   * Returns array of bug summaries with warnings.
   */
  readBugs: publicProcedure
    .input(readBugsInputSchema)
    .query(async ({ ctx, input }) => {
      const bugService = ctx.services.bugService;
      if (!bugService) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'BugService not initialized',
        });
      }

      const result = await bugService.readBugs(input.projectPath);
      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to read bugs: ${result.error.type}`,
        });
      }
      return result.value;
    }),

  // ============================================================
  // readBugDetail (query)
  // Legacy: READ_BUG_DETAIL (bugHandlers.ts)
  // ============================================================

  /**
   * Read bug detail by name.
   * Resolves bug path via fileService.resolveBugPath.
   */
  readBugDetail: publicProcedure
    .input(readBugDetailInputSchema)
    .query(async ({ ctx, input }) => {
      const currentProjectPath = ctx.services.getCurrentProjectPath();
      if (!currentProjectPath) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Project not selected',
        });
      }

      const fileService = ctx.services.fileService;
      if (!fileService) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'FileService not initialized',
        });
      }

      const bugService = ctx.services.bugService;
      if (!bugService) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'BugService not initialized',
        });
      }

      const bugPathResult = await fileService.resolveBugPath(currentProjectPath, input.bugName);
      if (!bugPathResult.ok) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Bug not found: ${input.bugName}`,
        });
      }

      const result = await bugService.readBugDetail(bugPathResult.value);
      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to read bug detail: ${result.error.type}`,
        });
      }
      return result.value;
    }),

  // ============================================================
  // startBugsWatcher (mutation)
  // Legacy: START_BUGS_WATCHER (bugHandlers.ts)
  // ============================================================

  /**
   * Start file watcher for bugs directory.
   * Delegates to bugsWatcherStart service function.
   */
  startBugsWatcher: publicProcedure
    .mutation(async ({ ctx }) => {
      await ctx.services.bugsWatcherStart?.();
    }),

  // ============================================================
  // stopBugsWatcher (mutation)
  // Legacy: STOP_BUGS_WATCHER (bugHandlers.ts)
  // ============================================================

  /**
   * Stop file watcher for bugs directory.
   * Delegates to bugsWatcherStop service function.
   */
  stopBugsWatcher: publicProcedure
    .mutation(async ({ ctx }) => {
      await ctx.services.bugsWatcherStop?.();
    }),

  // ============================================================
  // executeBugCreate (mutation)
  // Legacy: EXECUTE_BUG_CREATE (bugHandlers.ts)
  // ============================================================

  /**
   * Create a new bug by starting an agent with bug-create command.
   * Optionally validates worktree mode (must be on main branch).
   */
  executeBugCreate: publicProcedure
    .input(executeBugCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.getSpecManagerService();

      // Worktree mode validation
      if (input.worktreeMode) {
        const validateResult = await ctx.services.validateWorktreeMainBranch?.(input.projectPath);
        if (validateResult && !validateResult.ok) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: validateResult.error?.message || 'Worktree mode must be executed on main branch',
          });
        }
      }

      // Add --worktree flag when worktreeMode is true
      const worktreeFlag = input.worktreeMode ? ' --worktree' : '';

      const result = await service.startAgent({
        specId: '', // Empty specId for global agent
        phase: 'bug-create',
        args: [`/kiro:bug-create "${input.description}"${worktreeFlag}`],
        group: 'doc',
        engineId: 'claude',
      });

      if (!result.ok) {
        const errorMessage = getErrorMessage(result.error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: errorMessage,
        });
      }

      return result.value;
    }),

  // ============================================================
  // phaseUpdate (mutation)
  // Legacy: BUG_PHASE_UPDATE (bugHandlers.ts, moved from bugWorktreeHandlers.ts)
  // ============================================================

  /**
   * Update bug phase (reported -> analyzed -> fixed -> verified -> deployed).
   * Returns Result-style object for backward compatibility.
   */
  phaseUpdate: publicProcedure
    .input(phaseUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const projectPath = ctx.services.getCurrentProjectPath();
      if (!projectPath) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Project not selected',
        });
      }

      const bugService = ctx.services.bugService;
      if (!bugService) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'BugService not initialized',
        });
      }

      const bugPath = `${projectPath}/.kiro/bugs/${input.bugName}`;
      const result = await bugService.updateBugJsonPhase(bugPath, input.phase);

      if (!result.ok) {
        return {
          ok: false as const,
          error: { type: result.error.type, message: 'Failed to update bug phase' },
        };
      }

      return { ok: true as const, value: undefined };
    }),

  // ============================================================
  // worktreeCreate (mutation)
  // Legacy: BUG_WORKTREE_CREATE (bugWorktreeHandlers.ts)
  // ============================================================

  /**
   * Create a worktree for a bug.
   * Delegates to bugWorktreeCreate service function.
   */
  worktreeCreate: publicProcedure
    .input(bugNameInputSchema)
    .mutation(async ({ ctx, input }) => {
      const projectPath = ctx.services.getCurrentProjectPath();
      if (!projectPath) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Project not selected',
        });
      }

      if (!ctx.services.bugWorktreeCreate) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'bugWorktreeCreate service not initialized',
        });
      }

      return ctx.services.bugWorktreeCreate(input.bugName);
    }),

  // ============================================================
  // worktreeRemove (mutation)
  // Legacy: BUG_WORKTREE_REMOVE (bugWorktreeHandlers.ts)
  // ============================================================

  /**
   * Remove a bug worktree.
   * Delegates to bugWorktreeRemove service function.
   */
  worktreeRemove: publicProcedure
    .input(bugNameInputSchema)
    .mutation(async ({ ctx, input }) => {
      const projectPath = ctx.services.getCurrentProjectPath();
      if (!projectPath) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Project not selected',
        });
      }

      if (!ctx.services.bugWorktreeRemove) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'bugWorktreeRemove service not initialized',
        });
      }

      return ctx.services.bugWorktreeRemove(input.bugName);
    }),

  // ============================================================
  // worktreeAutoExecution (mutation)
  // Legacy: BUG_WORKTREE_AUTO_EXECUTION (bugWorktreeHandlers.ts)
  // ============================================================

  /**
   * Start bug fix with auto worktree creation.
   * Delegates to bugWorktreeAutoExecution service function.
   */
  worktreeAutoExecution: publicProcedure
    .input(bugNameInputSchema)
    .mutation(async ({ ctx, input }) => {
      const projectPath = ctx.services.getCurrentProjectPath();
      if (!projectPath) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Project not selected',
        });
      }

      if (!ctx.services.bugWorktreeAutoExecution) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'bugWorktreeAutoExecution service not initialized',
        });
      }

      return ctx.services.bugWorktreeAutoExecution(input.bugName);
    }),

  // ============================================================
  // convertToWorktree (mutation)
  // Legacy: BUG_CONVERT_TO_WORKTREE (bugWorktreeHandlers.ts)
  // ============================================================

  /**
   * Convert an existing bug to worktree mode.
   * Performs main branch check, bug existence check, and worktree creation.
   * Delegates to bugConvertToWorktree service function.
   */
  convertToWorktree: publicProcedure
    .input(bugNameInputSchema)
    .mutation(async ({ ctx, input }) => {
      const projectPath = ctx.services.getCurrentProjectPath();
      if (!projectPath) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Project not selected',
        });
      }

      if (!ctx.services.bugConvertToWorktree) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'bugConvertToWorktree service not initialized',
        });
      }

      return ctx.services.bugConvertToWorktree(input.bugName);
    }),

  // ============================================================
  // getBugsWorktreeDefault (query)
  // Legacy: SETTINGS_BUGS_WORKTREE_DEFAULT_GET (bugWorktreeHandlers.ts)
  // ============================================================

  /**
   * Get the default worktree mode setting for bugs.
   */
  getBugsWorktreeDefault: publicProcedure
    .query(({ ctx }) => {
      const configStore = ctx.services.configStore;
      if (!configStore) {
        return false;
      }
      return configStore.getBugsWorktreeDefault?.() ?? false;
    }),

  // ============================================================
  // setBugsWorktreeDefault (mutation)
  // Legacy: SETTINGS_BUGS_WORKTREE_DEFAULT_SET (bugWorktreeHandlers.ts)
  // ============================================================

  /**
   * Set the default worktree mode setting for bugs.
   */
  setBugsWorktreeDefault: publicProcedure
    .input(setBugsWorktreeDefaultInputSchema)
    .mutation(({ ctx, input }) => {
      const configStore = ctx.services.configStore;
      if (!configStore) {
        return;
      }
      configStore.setBugsWorktreeDefault?.(input.value);
    }),
});
