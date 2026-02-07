/**
 * Project Router - project management tRPC procedures
 * Task 4.1: projectルーターとZodスキーマを実装する
 * Requirements: 3.1, 3.2, 3.3
 *
 * Provides project management procedures:
 * - selectProject: Unified project selection (validate, load specs/bugs, update state)
 * - showOpenDialog: Native file open dialog
 * - validateKiroDirectory: .kiro directory structure validation
 * - getInitialProjectPath: CLI args project path
 * - setProjectPath: Set current project path
 * - getWindowProject: Get current window's project path
 * - setWindowProject: Set current window's project path
 * - createNewWindow: Create a new BrowserWindow
 * - getIsE2ETest: Check if E2E test mode
 *
 * All services accessed via ctx.services for testability (DD-006).
 */
import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { projectPathInputSchema } from '../helpers/schemas';

// ============================================================
// Zod Schemas (Task 4.1: Requirements 3.3)
// ============================================================

// --- selectProject ---
export const selectProjectInputSchema = z.object({
  projectPath: z.string().min(1),
});

export const kiroValidationSchema = z.object({
  exists: z.boolean(),
  hasSpecs: z.boolean(),
  hasSteering: z.boolean(),
});

export const selectProjectResultSchema = z.object({
  success: z.boolean(),
  projectPath: z.string(),
  kiroValidation: kiroValidationSchema,
  specs: z.array(z.object({ name: z.string() }).passthrough()),
  bugs: z.array(z.record(z.unknown())),
  specJsonMap: z.record(z.unknown()),
  error: z.record(z.unknown()).optional(),
  bugWarnings: z.array(z.string()).optional(),
});

// --- showOpenDialog ---
export const showOpenDialogOutputSchema = z.string().nullable();

// --- validateKiroDirectory ---
export const validateKiroDirectoryInputSchema = z.object({
  path: z.string().min(1),
});

// projectPathInputSchema: imported from ../helpers/schemas (DRY)
export { projectPathInputSchema } from '../helpers/schemas';

// --- getInitialProjectPath / getWindowProject ---
export const nullableStringOutputSchema = z.string().nullable();

// ============================================================
// Project Router
// ============================================================

export const projectRouter = router({
  // ============================================================
  // selectProject (mutation)
  // Legacy: SELECT_PROJECT (projectHandlers.ts + handlers.ts)
  // Includes path validation, specs/bugs loading, exclusive control
  // ============================================================

  /**
   * Unified project selection.
   * Validates path, loads specs/bugs, updates currentProjectPath, adds to recent projects.
   * Exclusive control (lock) is handled inside the selectProject service function.
   */
  selectProject: publicProcedure
    .input(selectProjectInputSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.selectProject(input.projectPath);
    }),

  // ============================================================
  // showOpenDialog (mutation)
  // Legacy: SHOW_OPEN_DIALOG (fileHandlers.ts)
  // ============================================================

  /**
   * Show native file open dialog for directory selection.
   * Returns the selected directory path or null if canceled.
   */
  showOpenDialog: publicProcedure
    .output(showOpenDialogOutputSchema)
    .mutation(async ({ ctx }) => {
      return ctx.services.showOpenDialog();
    }),

  // ============================================================
  // validateKiroDirectory (query)
  // Legacy: VALIDATE_KIRO_DIRECTORY (projectHandlers.ts)
  // ============================================================

  /**
   * Validate .kiro directory structure at the given path.
   * Returns existence of .kiro, specs, and steering directories.
   */
  validateKiroDirectory: publicProcedure
    .input(validateKiroDirectoryInputSchema)
    .output(kiroValidationSchema)
    .query(async ({ ctx, input }) => {
      const fileService = ctx.services.fileService;
      if (!fileService) {
        return { exists: false, hasSpecs: false, hasSteering: false };
      }
      return fileService.validateKiroDirectory(input.path);
    }),

  // ============================================================
  // getInitialProjectPath (query)
  // Legacy: GET_INITIAL_PROJECT_PATH (projectHandlers.ts)
  // ============================================================

  /**
   * Get the initial project path from CLI arguments.
   * Returns null if no project was specified on startup.
   */
  getInitialProjectPath: publicProcedure
    .output(nullableStringOutputSchema)
    .query(({ ctx }) => {
      return ctx.services.getInitialProjectPath();
    }),

  // ============================================================
  // setProjectPath (mutation)
  // Legacy: SET_PROJECT_PATH (projectHandlers.ts)
  // ============================================================

  /**
   * Set the current project path and initialize related services.
   * Does NOT perform full project selection (use selectProject for that).
   */
  setProjectPath: publicProcedure
    .input(projectPathInputSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.services.setProjectPath(input.projectPath);
    }),

  // ============================================================
  // getWindowProject (query)
  // Legacy: GET_WINDOW_PROJECT (channels.ts defined)
  // ============================================================

  /**
   * Get the current project path for this window.
   * Returns null if no project is selected.
   */
  getWindowProject: publicProcedure
    .output(nullableStringOutputSchema)
    .query(({ ctx }) => {
      return ctx.services.getCurrentProjectPath();
    }),

  // ============================================================
  // setWindowProject (mutation)
  // Legacy: SET_WINDOW_PROJECT (channels.ts defined)
  // ============================================================

  /**
   * Set the project path for this window.
   * Delegates to setProjectPath service.
   */
  setWindowProject: publicProcedure
    .input(projectPathInputSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.services.setProjectPath(input.projectPath);
    }),

  // ============================================================
  // createNewWindow (mutation)
  // Legacy: CREATE_NEW_WINDOW (channels.ts defined)
  // ============================================================

  /**
   * Create a new BrowserWindow instance.
   */
  createNewWindow: publicProcedure
    .mutation(async ({ ctx }) => {
      await ctx.services.createNewWindow();
    }),

  // ============================================================
  // getIsE2ETest (query)
  // Legacy: GET_IS_E2E_TEST (projectHandlers.ts)
  // ============================================================

  /**
   * Check if the application is running in E2E test mode.
   * Returns true if --e2e-test flag is present in process.argv.
   */
  getIsE2ETest: publicProcedure
    .query(({ ctx }) => {
      return ctx.services.getIsE2ETest();
    }),

  // ============================================================
  // getInitialSelectResult (query)
  // startup-project-selection-race-condition: Pull model
  // Renderer calls this on mount to get cached startup project selection result
  // ============================================================

  /**
   * Get the cached initial project selection result.
   * Uses read-and-clear semantics: returns result and clears cache,
   * so subsequent calls return null.
   * Returns null if no cached result exists (SDD_PROJECT_PATH not set,
   * or result already consumed).
   */
  getInitialSelectResult: publicProcedure
    .query(({ ctx }) => {
      const result = ctx.services.getInitialSelectResult();
      if (result !== null) {
        ctx.services.clearInitialSelectResult();
      }
      return result;
    }),
});
