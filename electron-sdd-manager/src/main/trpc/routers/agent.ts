/**
 * Agent Router - Agent management tRPC procedures
 * Task 6.1: agentルーターとZodスキーマを実装する
 * Requirements: 5.1, 5.2, 5.3
 *
 * Provides 11 agent management procedures:
 * - start (mutation): Start an agent with specId, phase, args, optional group/sessionId/engineId
 * - stop (mutation): Stop a running agent (via AgentLifecycleManager or fallback)
 * - resume (mutation): Resume a stopped agent with optional prompt
 * - delete (mutation): Delete an agent record
 * - getAgents (query): Get agents for a specific spec
 * - getAllAgents (query): Get all agents across all specs (Map serialized to Record)
 * - sendInput (mutation): Send input to a running agent's stdin
 * - getLogs (query): Get parsed log entries for an agent
 * - getRunningAgentCounts (query): Get running agent count per spec
 * - checkFolderExists (query): Check if .claude/agents/kiro folder exists
 * - deleteFolder (mutation): Delete .claude/agents/kiro folder
 *
 * Legacy handler: agentHandlers.ts (10 channels) + installHandlers.ts (2 channels)
 * All services accessed via ctx.services for testability (DD-006).
 * Agent start/stop mutations use agentProcess, agentRegistry via SpecManagerService.
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc';
import { projectPathInputSchema } from '../helpers/schemas';

// ============================================================
// Zod Schemas (Task 6.1: Requirements 5.3)
// ============================================================

// --- start ---
export const startAgentInputSchema = z.object({
  specId: z.string(),
  phase: z.string().min(1),
  args: z.array(z.string()),
  group: z.enum(['doc', 'impl']).optional(),
  sessionId: z.string().optional(),
  engineId: z.string().default('claude'),
});

// --- stop ---
export const stopAgentInputSchema = z.object({
  agentId: z.string().min(1),
});

// --- resume ---
export const resumeAgentInputSchema = z.object({
  agentId: z.string().min(1),
  prompt: z.string().optional(),
});

// --- delete ---
export const deleteAgentInputSchema = z.object({
  specId: z.string(),
  agentId: z.string().min(1),
});

// --- getAgents ---
export const getAgentsInputSchema = z.object({
  specId: z.string(),
});

// --- sendInput ---
export const sendInputSchema = z.object({
  agentId: z.string().min(1),
  input: z.string(),
});

// --- getLogs ---
export const getLogsInputSchema = z.object({
  specId: z.string(),
  agentId: z.string().min(1),
});

// projectPathInputSchema: imported from ../helpers/schemas (DRY)
export { projectPathInputSchema } from '../helpers/schemas';

// ============================================================
// Agent Router
// ============================================================

export const agentRouter = router({
  // ============================================================
  // start (mutation)
  // Legacy: START_AGENT (agentHandlers.ts)
  // ============================================================

  /**
   * Start an agent with given spec, phase, and args.
   * Delegates to specManagerService.startAgent().
   * engineId defaults to 'claude' if not provided.
   */
  start: publicProcedure
    .input(startAgentInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.getSpecManagerService();

      const result = await service.startAgent({
        specId: input.specId,
        phase: input.phase,
        args: input.args,
        group: input.group,
        sessionId: input.sessionId,
        engineId: input.engineId as any,
      });

      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to start agent: ${result.error.type}`,
        });
      }

      return result.value;
    }),

  // ============================================================
  // stop (mutation)
  // Legacy: STOP_AGENT (agentHandlers.ts)
  // Uses AgentLifecycleManager with fallback to SpecManagerService
  // ============================================================

  /**
   * Stop a running agent.
   * Delegates to agentStop service function which handles
   * AgentLifecycleManager (preferred) and SpecManagerService fallback.
   */
  stop: publicProcedure
    .input(stopAgentInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.services.agentStop) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'agentStop service not initialized',
        });
      }

      await ctx.services.agentStop(input.agentId);
    }),

  // ============================================================
  // resume (mutation)
  // Legacy: RESUME_AGENT (agentHandlers.ts)
  // ============================================================

  /**
   * Resume a stopped agent with optional prompt.
   * Delegates to specManagerService.resumeAgent().
   */
  resume: publicProcedure
    .input(resumeAgentInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.getSpecManagerService();
      const result = await service.resumeAgent(input.agentId, input.prompt);

      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to resume agent: ${result.error.type}`,
        });
      }

      return result.value;
    }),

  // ============================================================
  // delete (mutation)
  // Legacy: DELETE_AGENT (agentHandlers.ts)
  // ============================================================

  /**
   * Delete an agent record.
   * Delegates to specManagerService.deleteAgent().
   */
  delete: publicProcedure
    .input(deleteAgentInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.getSpecManagerService();
      const result = await service.deleteAgent(input.specId, input.agentId);

      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to delete agent: ${result.error.type}`,
        });
      }
    }),

  // ============================================================
  // getAgents (query)
  // Legacy: GET_AGENTS (agentHandlers.ts)
  // ============================================================

  /**
   * Get agents for a specific spec.
   * Returns an array of AgentInfo objects.
   */
  getAgents: publicProcedure
    .input(getAgentsInputSchema)
    .query(async ({ ctx, input }) => {
      const service = ctx.services.getSpecManagerService();
      return await service.getAgents(input.specId);
    }),

  // ============================================================
  // getAllAgents (query)
  // Legacy: GET_ALL_AGENTS (agentHandlers.ts)
  // ============================================================

  /**
   * Get all agents across all specs.
   * Converts Map to Record for IPC serialization.
   */
  getAllAgents: publicProcedure
    .query(async ({ ctx }) => {
      const service = ctx.services.getSpecManagerService();
      const agentsMap = await service.getAllAgents();

      // Convert Map to plain object for serialization
      const result: Record<string, unknown[]> = {};
      agentsMap.forEach((agents: unknown[], specId: string) => {
        result[specId] = agents;
      });

      return result;
    }),

  // ============================================================
  // sendInput (mutation)
  // Legacy: SEND_AGENT_INPUT (agentHandlers.ts)
  // ============================================================

  /**
   * Send input to a running agent's stdin.
   * Delegates to specManagerService.sendInput().
   */
  sendInput: publicProcedure
    .input(sendInputSchema)
    .mutation(({ ctx, input }) => {
      const service = ctx.services.getSpecManagerService();
      const result = service.sendInput(input.agentId, input.input);

      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to send input: ${result.error.type}`,
        });
      }
    }),

  // ============================================================
  // getLogs (query)
  // Legacy: GET_AGENT_LOGS (agentHandlers.ts)
  // ============================================================

  /**
   * Get parsed log entries for an agent.
   * Delegates to agentGetLogs service function.
   */
  getLogs: publicProcedure
    .input(getLogsInputSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.services.agentGetLogs) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'agentGetLogs service not initialized',
        });
      }

      return ctx.services.agentGetLogs(input.specId, input.agentId);
    }),

  // ============================================================
  // getRunningAgentCounts (query)
  // Legacy: GET_RUNNING_AGENT_COUNTS (agentHandlers.ts)
  // ============================================================

  /**
   * Get running agent counts per spec.
   * Returns a Record<specId, count>.
   * Returns empty object if service is not initialized.
   */
  getRunningAgentCounts: publicProcedure
    .query(async ({ ctx }) => {
      if (!ctx.services.agentGetRunningCounts) {
        return {};
      }

      try {
        return await ctx.services.agentGetRunningCounts();
      } catch {
        return {};
      }
    }),

  // ============================================================
  // checkFolderExists (query)
  // Legacy: CHECK_AGENT_FOLDER_EXISTS (installHandlers.ts)
  // ============================================================

  /**
   * Check if agent folder (.claude/agents/kiro) exists in the project.
   * Returns false if service is not initialized.
   */
  checkFolderExists: publicProcedure
    .input(projectPathInputSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.services.agentCheckFolderExists) {
        return false;
      }

      return ctx.services.agentCheckFolderExists(input.projectPath);
    }),

  // ============================================================
  // deleteFolder (mutation)
  // Legacy: DELETE_AGENT_FOLDER (installHandlers.ts)
  // ============================================================

  /**
   * Delete agent folder (.claude/agents/kiro) from the project.
   * Returns { ok: true } or { ok: false, error: string }.
   */
  deleteFolder: publicProcedure
    .input(projectPathInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.services.agentDeleteFolder) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'agentDeleteFolder service not initialized',
        });
      }

      return ctx.services.agentDeleteFolder(input.projectPath);
    }),
});
