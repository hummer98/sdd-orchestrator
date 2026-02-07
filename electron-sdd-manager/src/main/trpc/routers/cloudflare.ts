/**
 * Cloudflare Router - Cloudflare Tunnel management tRPC procedures
 * Task 10.1: cloudflareルーターとZodスキーマを実装する
 * Requirements: 9.1, 9.2
 *
 * Provides Cloudflare Tunnel management procedures:
 * - getSettings (query): Get all Cloudflare settings
 * - setTunnelToken (mutation): Set the tunnel token
 * - refreshAccessToken (mutation): Refresh the access token
 * - ensureAccessToken (mutation): Ensure access token exists
 * - checkBinary (query): Check if cloudflared binary exists
 * - setPublishToCloudflare (mutation): Set publish setting
 * - setCloudflaredPath (mutation): Set custom cloudflared path
 * - startTunnel (mutation): Start the Cloudflare tunnel
 * - stopTunnel (mutation): Stop the Cloudflare tunnel
 * - getTunnelStatus (query): Get tunnel status
 *
 * All services accessed via ctx.services.cloudflareService for testability (DD-006).
 * Legacy: cloudflareHandlers.ts (10 channels)
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc';
import type { CloudflareServiceInterface } from '../context';

// ============================================================
// Zod Schemas (Task 10.1: Requirements 9.2)
// ============================================================

// --- getSettings output ---
export const cloudflareSettingsSchema = z.object({
  hasTunnelToken: z.boolean(),
  tunnelTokenSource: z.enum(['env', 'stored', 'none']),
  accessToken: z.string().nullable(),
  publishToCloudflare: z.boolean(),
  cloudflaredPath: z.string().nullable(),
});

// --- setTunnelToken input ---
export const setTunnelTokenInputSchema = z.object({
  token: z.string().min(1),
});

// --- checkBinary output ---
export const installInstructionsSchema = z.object({
  homebrew: z.string(),
  macports: z.string(),
  downloadUrl: z.string(),
});

export const binaryCheckOutputSchema = z.object({
  exists: z.boolean(),
  path: z.string().optional(),
  installInstructions: installInstructionsSchema.optional(),
});

// --- setPublishToCloudflare input ---
export const setPublishToCloudflareInputSchema = z.object({
  enabled: z.boolean(),
});

// --- setCloudflaredPath input ---
export const setCloudflaredPathInputSchema = z.object({
  path: z.string().nullable(),
});

// --- startTunnel input ---
export const startTunnelInputSchema = z.object({
  localPort: z.number().int().min(1).max(65535),
});

// --- startTunnel output ---
export const tunnelStartSuccessSchema = z.object({
  url: z.string(),
  pid: z.number(),
});

export const tunnelErrorSchema = z.object({
  type: z.string(),
  message: z.string(),
  url: z.string().optional(),
  installInstructions: installInstructionsSchema.optional(),
});

export const tunnelStartResultSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), value: tunnelStartSuccessSchema }),
  z.object({ ok: z.literal(false), error: tunnelErrorSchema }),
]);

// --- stopTunnel output ---
export const tunnelStopResultSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), error: tunnelErrorSchema }),
]);

// --- getTunnelStatus output ---
export const tunnelStatusSchema = z.object({
  state: z.enum(['stopped', 'starting', 'running', 'stopping']),
  url: z.string().nullable(),
  pid: z.number().nullable(),
  error: z.string().optional(),
});

// --- accessToken output ---
export const accessTokenOutputSchema = z.string();

// ============================================================
// Helper to get cloudflare service with null check
// ============================================================
function getCloudflareService(ctx: { services: { cloudflareService?: CloudflareServiceInterface } }): CloudflareServiceInterface {
  const service = ctx.services.cloudflareService;
  if (!service) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Cloudflare service not initialized',
    });
  }
  return service;
}

// ============================================================
// Cloudflare Router
// ============================================================

export const cloudflareRouter = router({
  /**
   * Get all Cloudflare settings.
   * Legacy: CLOUDFLARE_GET_SETTINGS
   */
  getSettings: publicProcedure
    .output(cloudflareSettingsSchema)
    .query(({ ctx }) => {
      const service = getCloudflareService(ctx);
      return service.getAllSettings();
    }),

  /**
   * Set the tunnel token.
   * Legacy: CLOUDFLARE_SET_TUNNEL_TOKEN
   */
  setTunnelToken: publicProcedure
    .input(setTunnelTokenInputSchema)
    .mutation(({ ctx, input }) => {
      const service = getCloudflareService(ctx);
      service.setTunnelToken(input.token);
    }),

  /**
   * Refresh the access token and return new token.
   * Legacy: CLOUDFLARE_REFRESH_ACCESS_TOKEN
   */
  refreshAccessToken: publicProcedure
    .output(accessTokenOutputSchema)
    .mutation(({ ctx }) => {
      const service = getCloudflareService(ctx);
      return service.refreshAccessToken();
    }),

  /**
   * Ensure access token exists (generate if missing).
   * Legacy: CLOUDFLARE_ENSURE_ACCESS_TOKEN
   */
  ensureAccessToken: publicProcedure
    .output(accessTokenOutputSchema)
    .mutation(({ ctx }) => {
      const service = getCloudflareService(ctx);
      return service.ensureAccessToken();
    }),

  /**
   * Check if cloudflared binary exists.
   * Legacy: CLOUDFLARE_CHECK_BINARY
   */
  checkBinary: publicProcedure
    .output(binaryCheckOutputSchema)
    .query(async ({ ctx }) => {
      const service = getCloudflareService(ctx);
      return service.checkBinary();
    }),

  /**
   * Set publish to Cloudflare setting.
   * Legacy: CLOUDFLARE_SET_PUBLISH_TO_CLOUDFLARE
   */
  setPublishToCloudflare: publicProcedure
    .input(setPublishToCloudflareInputSchema)
    .mutation(({ ctx, input }) => {
      const service = getCloudflareService(ctx);
      service.setPublishToCloudflare(input.enabled);
    }),

  /**
   * Set custom cloudflared binary path.
   * Legacy: CLOUDFLARE_SET_CLOUDFLARED_PATH
   */
  setCloudflaredPath: publicProcedure
    .input(setCloudflaredPathInputSchema)
    .mutation(({ ctx, input }) => {
      const service = getCloudflareService(ctx);
      service.setCloudflaredPath(input.path);
    }),

  /**
   * Start the Cloudflare tunnel.
   * Legacy: CLOUDFLARE_START_TUNNEL
   */
  startTunnel: publicProcedure
    .input(startTunnelInputSchema)
    .output(tunnelStartResultSchema)
    .mutation(async ({ ctx, input }) => {
      const service = getCloudflareService(ctx);
      return service.startTunnel(input.localPort);
    }),

  /**
   * Stop the Cloudflare tunnel.
   * Legacy: CLOUDFLARE_STOP_TUNNEL
   */
  stopTunnel: publicProcedure
    .output(tunnelStopResultSchema)
    .mutation(async ({ ctx }) => {
      const service = getCloudflareService(ctx);
      return service.stopTunnel();
    }),

  /**
   * Get current tunnel status.
   * Legacy: CLOUDFLARE_GET_TUNNEL_STATUS
   */
  getTunnelStatus: publicProcedure
    .output(tunnelStatusSchema)
    .query(({ ctx }) => {
      const service = getCloudflareService(ctx);
      return service.getTunnelStatus();
    }),
});
