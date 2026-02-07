/**
 * System Router - system-level tRPC procedures
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 * Task 2.1: getAppVersion, getPlatform, getAppPath, getNodeEnv
 *
 * Provides system information procedures and healthCheck for tRPC infrastructure.
 * All system information is accessed via ctx.services for testability (DD-006).
 */
import { z } from 'zod';
import { router, publicProcedure } from '../trpc';

// ============================================================
// Zod Schemas (Task 2.1: Requirements 1.1, 1.2)
// ============================================================

// healthCheck output schema (Requirements: 6.4)
export const healthCheckOutputSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string(),
  version: z.string(),
});

// getAppVersion output schema - app.getVersion() returns semver string
export const appVersionOutputSchema = z.string().min(1);

// getPlatform output schema - process.platform returns NodeJS.Platform
export const platformOutputSchema = z.string().min(1);

// getAppPath output schema - app.getAppPath() returns absolute path
export const appPathOutputSchema = z.string();

// getNodeEnv output schema - process.env.NODE_ENV
export const nodeEnvOutputSchema = z.string();

// ============================================================
// Type exports
// ============================================================

export type HealthCheckOutput = z.infer<typeof healthCheckOutputSchema>;

// Read version from package.json
// Using require for Node.js module resolution at runtime
// eslint-disable-next-line @typescript-eslint/no-var-requires
let appVersion = '0.0.0';
try {
  // In test/build environment, read from package.json
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pkg = require('../../../../package.json');
  appVersion = pkg.version || '0.0.0';
} catch {
  // Fallback if package.json cannot be loaded
  appVersion = '0.0.0';
}

// ============================================================
// System Router
// ============================================================

export const systemRouter = router({
  /**
   * Health check - verifies tRPC infrastructure is working.
   * Returns status, timestamp, and version from package.json.
   */
  healthCheck: publicProcedure
    .output(healthCheckOutputSchema)
    .query(() => {
      return {
        status: 'ok' as const,
        timestamp: new Date().toISOString(),
        version: appVersion,
      };
    }),

  /**
   * Get application version - wraps app.getVersion().
   * Legacy: GET_APP_VERSION channel in projectHandlers.ts
   */
  getAppVersion: publicProcedure
    .output(appVersionOutputSchema)
    .query(({ ctx }) => {
      return ctx.services.getAppVersion();
    }),

  /**
   * Get OS platform - wraps process.platform.
   * Legacy: GET_PLATFORM channel in projectHandlers.ts
   */
  getPlatform: publicProcedure
    .output(platformOutputSchema)
    .query(({ ctx }) => {
      return ctx.services.getPlatform();
    }),

  /**
   * Get application path - wraps app.getAppPath().
   * New procedure (no legacy IPC channel).
   */
  getAppPath: publicProcedure
    .output(appPathOutputSchema)
    .query(({ ctx }) => {
      return ctx.services.getAppPath();
    }),

  /**
   * Get NODE_ENV environment variable.
   * New procedure (no legacy IPC channel).
   */
  getNodeEnv: publicProcedure
    .output(nodeEnvOutputSchema)
    .query(({ ctx }) => {
      return ctx.services.getNodeEnv();
    }),
});
