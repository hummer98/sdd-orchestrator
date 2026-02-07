/**
 * MCP Router - MCP Server control tRPC procedures
 * Task 10.3: mcpルーターとZodスキーマを実装する
 * Requirements: 9.1, 9.2
 *
 * Provides MCP server lifecycle management procedures:
 * - start: Start the MCP server (optionally with preferred port)
 * - stop: Stop the MCP server
 * - getStatus: Get current server status
 * - getSettings: Get MCP settings from ConfigStore
 * - setEnabled: Enable/disable MCP server (starts/stops accordingly)
 * - setPort: Set MCP server port (restarts if running)
 *
 * Legacy: mcpHandlers.ts (6 channels: MCP_START, MCP_STOP, MCP_GET_STATUS,
 *         MCP_GET_SETTINGS, MCP_SET_ENABLED, MCP_SET_PORT)
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc';

// ============================================================
// Zod Schemas (Task 10.3: Requirements 9.1, 9.2)
// ============================================================

/** Input schema for start procedure - optional preferred port */
export const mcpStartInputSchema = z.object({
  preferredPort: z.number().int().min(1).max(65535).optional(),
});

/** Output schema for start procedure - Result type */
export const mcpStartOutputSchema = z.union([
  z.object({
    ok: z.literal(true),
    value: z.object({
      port: z.number(),
      url: z.string(),
    }),
  }),
  z.object({
    ok: z.literal(false),
    error: z.record(z.unknown()),
  }),
]);

/** Output schema for getStatus - server status */
export const mcpStatusOutputSchema = z.object({
  isRunning: z.boolean(),
  port: z.number().nullable(),
  url: z.string().nullable(),
});

/** Output schema for getSettings - MCP configuration */
export const mcpSettingsOutputSchema = z.object({
  enabled: z.boolean(),
  port: z.number(),
});

/** Input schema for setEnabled */
export const mcpSetEnabledInputSchema = z.object({
  enabled: z.boolean(),
});

/** Input schema for setPort */
export const mcpSetPortInputSchema = z.object({
  port: z.number().int().min(1).max(65535),
});

// ============================================================
// MCP Router
// ============================================================

export const mcpRouter = router({
  /**
   * Start MCP server.
   * Legacy: MCP_START channel in mcpHandlers.ts
   */
  start: publicProcedure
    .input(mcpStartInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.mcpServerService;
      if (!service) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'MCP Server Service not available',
        });
      }

      const result = await service.start(input.preferredPort);
      return result;
    }),

  /**
   * Stop MCP server.
   * Legacy: MCP_STOP channel in mcpHandlers.ts
   */
  stop: publicProcedure
    .mutation(async ({ ctx }) => {
      const service = ctx.services.mcpServerService;
      if (!service) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'MCP Server Service not available',
        });
      }

      await service.stop();
    }),

  /**
   * Get current MCP server status.
   * Legacy: MCP_GET_STATUS channel in mcpHandlers.ts
   */
  getStatus: publicProcedure
    .output(mcpStatusOutputSchema)
    .query(({ ctx }) => {
      const service = ctx.services.mcpServerService;
      if (!service) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'MCP Server Service not available',
        });
      }

      return service.getStatus();
    }),

  /**
   * Get MCP settings from ConfigStore.
   * Legacy: MCP_GET_SETTINGS channel in mcpHandlers.ts
   */
  getSettings: publicProcedure
    .output(mcpSettingsOutputSchema)
    .query(({ ctx }) => {
      const configStore = ctx.services.configStore;
      if (!configStore || !configStore.getMcpSettings) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'ConfigStore not available',
        });
      }

      return configStore.getMcpSettings();
    }),

  /**
   * Enable/disable MCP server.
   * Starts server when enabling, stops when disabling.
   * Legacy: MCP_SET_ENABLED channel in mcpHandlers.ts
   */
  setEnabled: publicProcedure
    .input(mcpSetEnabledInputSchema)
    .mutation(async ({ ctx, input }) => {
      const configStore = ctx.services.configStore;
      if (!configStore || !configStore.getMcpSettings || !configStore.setMcpSettings) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'ConfigStore not available',
        });
      }

      const service = ctx.services.mcpServerService;
      if (!service) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'MCP Server Service not available',
        });
      }

      const currentSettings = configStore.getMcpSettings();
      const newSettings = { ...currentSettings, enabled: input.enabled };
      configStore.setMcpSettings(newSettings);

      if (input.enabled) {
        await service.start(currentSettings.port);
      } else {
        await service.stop();
      }
    }),

  /**
   * Set MCP server port.
   * Restarts server if currently running.
   * Legacy: MCP_SET_PORT channel in mcpHandlers.ts
   */
  setPort: publicProcedure
    .input(mcpSetPortInputSchema)
    .mutation(async ({ ctx, input }) => {
      const configStore = ctx.services.configStore;
      if (!configStore || !configStore.getMcpSettings || !configStore.setMcpSettings) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'ConfigStore not available',
        });
      }

      const service = ctx.services.mcpServerService;
      if (!service) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'MCP Server Service not available',
        });
      }

      const currentSettings = configStore.getMcpSettings();
      const newSettings = { ...currentSettings, port: input.port };
      configStore.setMcpSettings(newSettings);

      // Restart server if running
      const status = service.getStatus();
      if (status.isRunning) {
        await service.stop();
        await service.start(input.port);
      }
    }),
});
