/**
 * Git Router - Git/Worktree management tRPC procedures
 * Task 8.1: gitルーターとZodスキーマを実装する
 * Requirements: 7.1, 7.2, 7.3
 *
 * Provides 13 git/worktree management procedures:
 * - getStatus (query): Get git status for a project
 * - getDiff (query): Get diff for a specific file
 * - watchChanges (mutation): Start watching for file changes
 * - unwatchChanges (mutation): Stop watching for file changes
 * - worktreeCheckMain (query): Check if on main/master branch
 * - worktreeCreate (mutation): Create a new worktree
 * - worktreeRemove (mutation): Remove a worktree
 * - worktreeResolvePath (query): Resolve worktree relative path
 * - worktreeImplStart (mutation): Start impl with worktree creation
 * - normalModeImplStart (mutation): Start impl in normal mode
 * - worktreeRebaseFromMain (mutation): Rebase worktree from main
 * - convertCheck (query): Check if spec can be converted to worktree
 * - convertToWorktree (mutation): Convert spec to worktree mode
 *
 * Legacy handlers: gitHandlers.ts (6 channels), worktreeHandlers.ts (7 channels),
 *   worktreeImplHandlers.ts (utility, no channel registration),
 *   convertWorktreeHandlers.ts (2 channels, already deleted in Task 5.4)
 * All services accessed via ctx.services for testability (DD-006).
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc';

// ============================================================
// Zod Schemas (Task 8.1: Requirements 7.3)
// ============================================================

// --- getStatus ---
export const getStatusInputSchema = z.object({
  projectPath: z.string().min(1),
});

// --- getDiff ---
export const getDiffInputSchema = z.object({
  projectPath: z.string().min(1),
  filePath: z.string(),
});

// --- watchChanges / unwatchChanges ---
export const watchChangesInputSchema = z.object({
  projectPath: z.string().min(1),
});

// --- worktreeCheckMain ---
export const worktreeCheckMainInputSchema = z.object({
  projectPath: z.string().min(1),
});

// --- worktreeCreate / worktreeRemove ---
export const worktreeCreateInputSchema = z.object({
  projectPath: z.string().min(1),
  featureName: z.string().min(1),
});

// --- worktreeResolvePath ---
export const worktreeResolvePathInputSchema = z.object({
  projectPath: z.string().min(1),
  relativePath: z.string().min(1),
});

// --- worktreeImplStart ---
export const worktreeImplStartInputSchema = z.object({
  projectPath: z.string().min(1),
  specPath: z.string().min(1),
  featureName: z.string().min(1),
});

// --- normalModeImplStart ---
export const normalModeImplStartInputSchema = z.object({
  projectPath: z.string().min(1),
  specPath: z.string().min(1),
});

// --- worktreeRebaseFromMain ---
export const worktreeRebaseInputSchema = z.object({
  specOrBugPath: z.string().min(1),
});

// --- convertCheck ---
export const convertCheckInputSchema = z.object({
  projectPath: z.string().min(1),
  specPath: z.string().min(1),
});

// --- convertToWorktree ---
export const convertToWorktreeInputSchema = z.object({
  projectPath: z.string().min(1),
  specPath: z.string().min(1),
  featureName: z.string().min(1),
});

// ============================================================
// Git Router
// ============================================================

export const gitRouter = router({
  // ============================================================
  // getStatus (query)
  // Legacy: GIT_GET_STATUS (gitHandlers.ts)
  // ============================================================

  /**
   * Get git status for a project path.
   * Returns Result with files and mode.
   */
  getStatus: publicProcedure
    .input(getStatusInputSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.services.gitGetStatus) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'gitGetStatus service not initialized',
        });
      }

      return ctx.services.gitGetStatus(input.projectPath);
    }),

  // ============================================================
  // getDiff (query)
  // Legacy: GIT_GET_DIFF (gitHandlers.ts)
  // ============================================================

  /**
   * Get diff for a specific file.
   * Returns Result with diff string.
   */
  getDiff: publicProcedure
    .input(getDiffInputSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.services.gitGetDiff) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'gitGetDiff service not initialized',
        });
      }

      return ctx.services.gitGetDiff(input.projectPath, input.filePath);
    }),

  // ============================================================
  // watchChanges (mutation)
  // Legacy: GIT_WATCH_CHANGES (gitHandlers.ts)
  // ============================================================

  /**
   * Start watching for file changes in a project.
   * Sets up GitFileWatcherService to monitor changes.
   */
  watchChanges: publicProcedure
    .input(watchChangesInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.services.gitWatchChanges) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'gitWatchChanges service not initialized',
        });
      }

      return ctx.services.gitWatchChanges(input.projectPath);
    }),

  // ============================================================
  // unwatchChanges (mutation)
  // Legacy: GIT_UNWATCH_CHANGES (gitHandlers.ts)
  // ============================================================

  /**
   * Stop watching for file changes in a project.
   */
  unwatchChanges: publicProcedure
    .input(watchChangesInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.services.gitUnwatchChanges) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'gitUnwatchChanges service not initialized',
        });
      }

      return ctx.services.gitUnwatchChanges(input.projectPath);
    }),

  // ============================================================
  // worktreeCheckMain (query)
  // Legacy: WORKTREE_CHECK_MAIN (worktreeHandlers.ts)
  // ============================================================

  /**
   * Check if currently on main/master branch.
   * Returns isMain flag and current branch name.
   */
  worktreeCheckMain: publicProcedure
    .input(worktreeCheckMainInputSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.services.worktreeCheckMain) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'worktreeCheckMain service not initialized',
        });
      }

      return ctx.services.worktreeCheckMain(input.projectPath);
    }),

  // ============================================================
  // worktreeCreate (mutation)
  // Legacy: WORKTREE_CREATE (worktreeHandlers.ts)
  // ============================================================

  /**
   * Create a new worktree for a feature.
   * Returns WorktreeInfo on success.
   */
  worktreeCreate: publicProcedure
    .input(worktreeCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.services.worktreeCreate) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'worktreeCreate service not initialized',
        });
      }

      return ctx.services.worktreeCreate(input.projectPath, input.featureName);
    }),

  // ============================================================
  // worktreeRemove (mutation)
  // Legacy: WORKTREE_REMOVE (worktreeHandlers.ts)
  // ============================================================

  /**
   * Remove a worktree and its associated branch.
   */
  worktreeRemove: publicProcedure
    .input(worktreeCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.services.worktreeRemove) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'worktreeRemove service not initialized',
        });
      }

      return ctx.services.worktreeRemove(input.projectPath, input.featureName);
    }),

  // ============================================================
  // worktreeResolvePath (query)
  // Legacy: WORKTREE_RESOLVE_PATH (worktreeHandlers.ts)
  // ============================================================

  /**
   * Resolve a worktree relative path to an absolute path.
   */
  worktreeResolvePath: publicProcedure
    .input(worktreeResolvePathInputSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.services.worktreeResolvePath) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'worktreeResolvePath service not initialized',
        });
      }

      return ctx.services.worktreeResolvePath(input.projectPath, input.relativePath);
    }),

  // ============================================================
  // worktreeImplStart (mutation)
  // Legacy: WORKTREE_IMPL_START (worktreeHandlers.ts)
  // ============================================================

  /**
   * Start impl with automatic worktree creation.
   * Checks main branch, creates worktree, updates spec.json.
   */
  worktreeImplStart: publicProcedure
    .input(worktreeImplStartInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.services.worktreeImplStart) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'worktreeImplStart service not initialized',
        });
      }

      return ctx.services.worktreeImplStart(input.projectPath, input.specPath, input.featureName);
    }),

  // ============================================================
  // normalModeImplStart (mutation)
  // Legacy: NORMAL_MODE_IMPL_START (worktreeHandlers.ts)
  // ============================================================

  /**
   * Start impl in normal mode (without worktree).
   * Creates spec.json.worktree with only branch and created_at.
   */
  normalModeImplStart: publicProcedure
    .input(normalModeImplStartInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.services.normalModeImplStart) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'normalModeImplStart service not initialized',
        });
      }

      return ctx.services.normalModeImplStart(input.projectPath, input.specPath);
    }),

  // ============================================================
  // worktreeRebaseFromMain (mutation)
  // Legacy: WORKTREE_REBASE_FROM_MAIN (worktreeHandlers.ts)
  // Uses getCurrentProjectPath from context (spec-path-ssot-refactor)
  // ============================================================

  /**
   * Rebase worktree branch from main.
   * Gets projectPath from context session state.
   */
  worktreeRebaseFromMain: publicProcedure
    .input(worktreeRebaseInputSchema)
    .mutation(async ({ ctx, input }) => {
      const projectPath = ctx.services.getCurrentProjectPath();
      if (!projectPath) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'No project is currently selected',
        });
      }

      if (!ctx.services.worktreeRebaseFromMain) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'worktreeRebaseFromMain service not initialized',
        });
      }

      return ctx.services.worktreeRebaseFromMain(projectPath, input.specOrBugPath);
    }),

  // ============================================================
  // convertCheck (query)
  // Legacy: CONVERT_CHECK (convertWorktreeHandlers.ts, deleted in Task 5.4)
  // ============================================================

  /**
   * Check if a spec can be converted to worktree mode.
   * Validates main branch, spec existence, worktree status.
   */
  convertCheck: publicProcedure
    .input(convertCheckInputSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.services.convertCheck) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'convertCheck service not initialized',
        });
      }

      return ctx.services.convertCheck(input.projectPath, input.specPath);
    }),

  // ============================================================
  // convertToWorktree (mutation)
  // Legacy: CONVERT_TO_WORKTREE (convertWorktreeHandlers.ts, deleted in Task 5.4)
  // ============================================================

  /**
   * Convert a normal spec to worktree mode.
   * Performs full conversion: validation, branch creation,
   * worktree creation, file move, spec.json update.
   */
  convertToWorktree: publicProcedure
    .input(convertToWorktreeInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.services.convertToWorktree) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'convertToWorktree service not initialized',
        });
      }

      return ctx.services.convertToWorktree(input.projectPath, input.specPath, input.featureName);
    }),
});
