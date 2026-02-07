/**
 * Misc Router - miscellaneous tRPC procedures
 * Task 10.5: miscルーターとZodスキーマを実装する
 * Requirements: 9.1, 9.2
 *
 * Provides 22 procedures:
 * - Misc 15: openInVscode, copyToClipboard, logRenderer, recordHumanSession,
 *            getSpecMetrics, getProjectMetrics, getProjectLogPath, openLogInBrowser,
 *            addShellPermissions, addMissingPermissions, checkRequiredPermissions,
 *            startRemoteServer, stopRemoteServer, getRemoteServerStatus, refreshAccessToken
 * - SSH 7: sshConnect, sshDisconnect, sshGetStatus, sshGetConnectionInfo,
 *          sshGetRecentRemoteProjects, sshAddRecentRemoteProject, sshRemoveRecentRemoteProject
 *
 * All services accessed via ctx.services for testability (DD-006).
 * Legacy channels: handlers.ts (registerUnmigratedProjectHandlers, registerUnmigratedFileHandlers),
 *                  clipboardHandlers.ts, metricsHandlers.ts, remoteAccessHandlers.ts, sshHandlers.ts
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc';
import { projectPathInputSchema } from '../helpers/schemas';

// ============================================================
// Zod Schemas (Task 10.5: Requirements 9.2)
// ============================================================

// --- openInVscode ---
export const openInVscodeInputSchema = z.object({
  projectPath: z.string().min(1),
});

// --- copyToClipboard ---
export const copyToClipboardInputSchema = z.object({
  text: z.string(),
});

// --- logRenderer ---
export const logRendererInputSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug']),
  message: z.string(),
  context: z.unknown().optional(),
});

// --- recordHumanSession ---
export const humanSessionInputSchema = z.object({
  specId: z.string().min(1),
  start: z.string(),
  end: z.string(),
  ms: z.number().int().nonnegative(),
});

export const humanSessionResultSchema = z.union([
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), error: z.string() }),
]);

// --- getSpecMetrics ---
export const getSpecMetricsInputSchema = z.object({
  specId: z.string().min(1),
});

// --- getProjectLogPath ---
export const projectLogPathOutputSchema = z.string().nullable();

// projectPathInputSchema: imported from ../helpers/schemas (DRY)
export { projectPathInputSchema } from '../helpers/schemas';

export const addMissingPermissionsInputSchema = z.object({
  projectPath: z.string().min(1),
  permissions: z.array(z.string()),
});

export const permissionsCheckResultSchema = z.object({
  allPresent: z.boolean(),
  missing: z.array(z.string()),
  present: z.array(z.string()),
});

// --- remoteServer ---
export const startRemoteServerInputSchema = z.object({
  preferredPort: z.number().int().positive().optional(),
});

// --- SSH ---
export const sshConnectInputSchema = z.object({
  uri: z.string().min(1),
});

export const sshAddRecentRemoteProjectInputSchema = z.object({
  uri: z.string().min(1),
  displayName: z.string().min(1),
  connectionSuccessful: z.boolean(),
});

export const sshRemoveRecentRemoteProjectInputSchema = z.object({
  uri: z.string().min(1),
});

// ============================================================
// Misc Router
// ============================================================

export const miscRouter = router({
  // ============================================================
  // VSCode Integration
  // ============================================================

  /**
   * Open project path in VSCode.
   * Legacy: OPEN_IN_VSCODE channel in handlers.ts (registerUnmigratedFileHandlers)
   */
  openInVscode: publicProcedure
    .input(openInVscodeInputSchema)
    .mutation(async ({ ctx, input }) => {
      const fn = ctx.services.openInVscode;
      if (!fn) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'openInVscode not initialized' });
      }
      await fn(input.projectPath);
    }),

  // ============================================================
  // Clipboard
  // ============================================================

  /**
   * Copy text to clipboard.
   * Legacy: COPY_TO_CLIPBOARD channel in clipboardHandlers.ts
   */
  copyToClipboard: publicProcedure
    .input(copyToClipboardInputSchema)
    .mutation(({ ctx, input }) => {
      const fn = ctx.services.copyToClipboard;
      if (!fn) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'copyToClipboard not initialized' });
      }
      fn(input.text);
    }),

  // ============================================================
  // Renderer Logging
  // ============================================================

  /**
   * Forward renderer log to main process logger (fire-and-forget).
   * Legacy: LOG_RENDERER channel in handlers.ts (ipcMain.on)
   */
  logRenderer: publicProcedure
    .input(logRendererInputSchema)
    .mutation(({ ctx, input }) => {
      const fn = ctx.services.logRenderer;
      if (!fn) {
        return; // Silently ignore if not initialized (fire-and-forget)
      }
      fn(input.level, input.message, input.context);
    }),

  // ============================================================
  // Metrics
  // ============================================================

  /**
   * Record human activity session for metrics.
   * Legacy: RECORD_HUMAN_SESSION channel in metricsHandlers.ts
   */
  recordHumanSession: publicProcedure
    .input(humanSessionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const fn = ctx.services.recordHumanSession;
      if (!fn) {
        return { ok: false as const, error: 'recordHumanSession not initialized' };
      }
      return fn(input);
    }),

  /**
   * Get aggregated metrics for a spec.
   * Legacy: GET_SPEC_METRICS channel in metricsHandlers.ts
   */
  getSpecMetrics: publicProcedure
    .input(getSpecMetricsInputSchema)
    .query(async ({ ctx, input }) => {
      const fn = ctx.services.getSpecMetrics;
      if (!fn) {
        return { ok: false as const, error: 'getSpecMetrics not initialized' };
      }
      return fn(input.specId);
    }),

  /**
   * Get project-wide aggregated metrics.
   * Legacy: GET_PROJECT_METRICS channel in metricsHandlers.ts
   */
  getProjectMetrics: publicProcedure
    .query(async ({ ctx }) => {
      const fn = ctx.services.getProjectMetrics;
      if (!fn) {
        return { ok: false as const, error: 'getProjectMetrics not initialized' };
      }
      return fn();
    }),

  // ============================================================
  // Project Log
  // ============================================================

  /**
   * Get the project log file path.
   * Legacy: GET_PROJECT_LOG_PATH channel in handlers.ts (registerUnmigratedProjectHandlers)
   */
  getProjectLogPath: publicProcedure
    .output(projectLogPathOutputSchema)
    .query(({ ctx }) => {
      const fn = ctx.services.getProjectLogPath;
      if (!fn) {
        return null;
      }
      return fn();
    }),

  /**
   * Open log directory in system file browser.
   * Legacy: OPEN_LOG_IN_BROWSER channel in handlers.ts (registerUnmigratedProjectHandlers)
   */
  openLogInBrowser: publicProcedure
    .mutation(async ({ ctx }) => {
      const fn = ctx.services.openLogInBrowser;
      if (!fn) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'openLogInBrowser not initialized' });
      }
      await fn();
    }),

  // ============================================================
  // Permissions
  // ============================================================

  /**
   * Add shell permissions to a project's settings.local.json.
   * Legacy: ADD_SHELL_PERMISSIONS channel in handlers.ts (registerUnmigratedProjectHandlers)
   */
  addShellPermissions: publicProcedure
    .input(projectPathInputSchema)
    .mutation(async ({ ctx, input }) => {
      const fn = ctx.services.addShellPermissions;
      if (!fn) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'addShellPermissions not initialized' });
      }
      return fn(input.projectPath);
    }),

  /**
   * Add missing permissions to a project's settings.local.json.
   * Legacy: ADD_MISSING_PERMISSIONS channel in handlers.ts (registerUnmigratedProjectHandlers)
   */
  addMissingPermissions: publicProcedure
    .input(addMissingPermissionsInputSchema)
    .mutation(async ({ ctx, input }) => {
      const fn = ctx.services.addMissingPermissions;
      if (!fn) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'addMissingPermissions not initialized' });
      }
      return fn(input.projectPath, input.permissions);
    }),

  /**
   * Check required permissions in a project.
   * Legacy: CHECK_REQUIRED_PERMISSIONS channel in handlers.ts (registerUnmigratedProjectHandlers)
   */
  checkRequiredPermissions: publicProcedure
    .input(projectPathInputSchema)
    .query(async ({ ctx, input }) => {
      const fn = ctx.services.checkRequiredPermissions;
      if (!fn) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'checkRequiredPermissions not initialized' });
      }
      return fn(input.projectPath);
    }),

  // ============================================================
  // Remote Access Server
  // ============================================================

  /**
   * Start the remote access server.
   * Legacy: START_REMOTE_SERVER channel in remoteAccessHandlers.ts
   */
  startRemoteServer: publicProcedure
    .input(startRemoteServerInputSchema)
    .mutation(async ({ ctx, input }) => {
      const fn = ctx.services.startRemoteServer;
      if (!fn) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'startRemoteServer not initialized' });
      }
      return fn(input.preferredPort);
    }),

  /**
   * Stop the remote access server.
   * Legacy: STOP_REMOTE_SERVER channel in remoteAccessHandlers.ts
   */
  stopRemoteServer: publicProcedure
    .mutation(async ({ ctx }) => {
      const fn = ctx.services.stopRemoteServer;
      if (!fn) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'stopRemoteServer not initialized' });
      }
      await fn();
    }),

  /**
   * Get remote access server status.
   * Legacy: GET_REMOTE_SERVER_STATUS channel in remoteAccessHandlers.ts
   */
  getRemoteServerStatus: publicProcedure
    .query(({ ctx }) => {
      const fn = ctx.services.getRemoteServerStatus;
      if (!fn) {
        return { running: false, port: null, url: null, clientCount: 0, accessToken: null };
      }
      return fn();
    }),

  /**
   * Refresh remote access token.
   * Legacy: REFRESH_ACCESS_TOKEN channel in remoteAccessHandlers.ts
   */
  refreshAccessToken: publicProcedure
    .mutation(async ({ ctx }) => {
      const fn = ctx.services.refreshAccessToken;
      if (!fn) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'refreshAccessToken not initialized' });
      }
      return fn();
    }),

  // ============================================================
  // SSH Operations
  // ============================================================

  /**
   * Connect to SSH server via URI.
   * Legacy: SSH_CONNECT channel in sshHandlers.ts
   */
  sshConnect: publicProcedure
    .input(sshConnectInputSchema)
    .mutation(async ({ ctx, input }) => {
      const fn = ctx.services.sshConnect;
      if (!fn) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'sshConnect not initialized' });
      }
      return fn(input.uri);
    }),

  /**
   * Disconnect from SSH server.
   * Legacy: SSH_DISCONNECT channel in sshHandlers.ts
   */
  sshDisconnect: publicProcedure
    .mutation(async ({ ctx }) => {
      const fn = ctx.services.sshDisconnect;
      if (!fn) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'sshDisconnect not initialized' });
      }
      await fn();
    }),

  /**
   * Get current SSH connection status.
   * Legacy: SSH_GET_STATUS channel in sshHandlers.ts
   */
  sshGetStatus: publicProcedure
    .query(({ ctx }) => {
      const fn = ctx.services.sshGetStatus;
      if (!fn) {
        return { connected: false, host: null };
      }
      return fn();
    }),

  /**
   * Get SSH connection info.
   * Legacy: SSH_GET_CONNECTION_INFO channel in sshHandlers.ts
   */
  sshGetConnectionInfo: publicProcedure
    .query(({ ctx }) => {
      const fn = ctx.services.sshGetConnectionInfo;
      if (!fn) {
        return null;
      }
      return fn();
    }),

  /**
   * Get recent remote projects list.
   * Legacy: SSH_GET_RECENT_REMOTE_PROJECTS channel in sshHandlers.ts
   */
  sshGetRecentRemoteProjects: publicProcedure
    .query(({ ctx }) => {
      const fn = ctx.services.sshGetRecentRemoteProjects;
      if (!fn) {
        return [];
      }
      return fn();
    }),

  /**
   * Add a project to recent remote projects.
   * Legacy: SSH_ADD_RECENT_REMOTE_PROJECT channel in sshHandlers.ts
   */
  sshAddRecentRemoteProject: publicProcedure
    .input(sshAddRecentRemoteProjectInputSchema)
    .mutation(({ ctx, input }) => {
      const fn = ctx.services.sshAddRecentRemoteProject;
      if (!fn) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'sshAddRecentRemoteProject not initialized' });
      }
      fn(input.uri, input.displayName, input.connectionSuccessful);
    }),

  /**
   * Remove a project from recent remote projects.
   * Legacy: SSH_REMOVE_RECENT_REMOTE_PROJECT channel in sshHandlers.ts
   */
  sshRemoveRecentRemoteProject: publicProcedure
    .input(sshRemoveRecentRemoteProjectInputSchema)
    .mutation(({ ctx, input }) => {
      const fn = ctx.services.sshRemoveRecentRemoteProject;
      if (!fn) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'sshRemoveRecentRemoteProject not initialized' });
      }
      fn(input.uri);
    }),
});
