/**
 * Agent Store Adapter
 *
 * agent-store-unification: Electron IPC Adapter Layer
 * trpc-full-migration Task 6.2: Agent operations migrated to tRPC vanilla client
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 *
 * This adapter encapsulates all Agent management operations.
 * It bridges the shared/agentStore (SSOT) with tRPC vanilla client.
 *
 * Responsibilities:
 * - tRPC call wrapping for Agent operations (queries and mutations)
 * - IPC event listener setup and cleanup (subscriptions remain via electronAPI until Task 9)
 * - skipPermissions management
 * - Updating shared/agentStore with tRPC results
 */

import { useSharedAgentStore, type AgentInfo as SharedAgentInfo, type AgentStatus } from '@shared/stores/agentStore';
// trpc-full-migration Task 6.2: Use tRPC vanilla client for agent operations
import { getVanillaClient } from '../../shared/trpc/vanillaClient';
// trpc-full-migration Task 9.2: tRPC Subscription for event listeners
import type { Unsubscribable } from '@trpc/server/observable';

// =============================================================================
// Type Adapters
// =============================================================================

/**
 * Convert renderer AgentInfo to shared AgentInfo format
 * agentId-unification: Both now use 'agentId', conversion is trivial
 * project-agent-release-footer: Task 2.3 - Map prompt to args for release detection
 */
function toSharedAgentInfo(rendererAgent: RendererAgentInfo): SharedAgentInfo {
  return {
    agentId: rendererAgent.agentId,
    specId: rendererAgent.specId,
    phase: rendererAgent.phase,
    status: rendererAgent.status as AgentStatus,
    startedAt: rendererAgent.startedAt,
    command: rendererAgent.command,
    sessionId: rendererAgent.sessionId,
    lastActivityAt: rendererAgent.lastActivityAt,
    // project-agent-release-footer: Task 2.3 - Map prompt to args for release detection
    // The main process stores the command string in 'prompt' field (via extractPromptFromArgs)
    // We map it to 'args' in the renderer for release detection
    args: rendererAgent.prompt,
    engineId: rendererAgent.engineId,
  };
}

/**
 * Renderer-side AgentInfo type (matches existing IPC response)
 * project-agent-release-footer: Task 2.3 - Added prompt field for release detection
 */
interface RendererAgentInfo {
  readonly agentId: string;
  readonly specId: string;
  readonly phase: string;
  readonly pid?: number;
  readonly sessionId: string;
  readonly status: string;
  // project-agent-release-footer: Task 2.3 - Prompt field from main process
  // Contains the command string used to start the agent (e.g., "/kiro:project-ask \"/release\"")
  readonly prompt?: string;
  readonly startedAt: string;
  readonly lastActivityAt: string;
  readonly command: string;
  // llm-stream-log-parser: engineId for UI display
  readonly engineId: import('@shared/registry').LLMEngineId;
}

// =============================================================================
// Agent Operations
// Requirements: 2.2, 2.3
// =============================================================================

/**
 * Agent operations that wrap Electron IPC calls
 * and update shared/agentStore with results.
 */
// trpc-full-migration Task 6.2: Agent operations now use tRPC vanilla client
export const agentOperations = {
  /**
   * Start a new agent
   * unified-engine-command-resolution: command parameter removed, engineId used instead
   * trpc-full-migration Task 6.2: Uses tRPC agent.start mutation
   * @returns agentId on success, null on failure
   */
  async startAgent(
    specId: string,
    phase: string,
    args: string[],
    group?: 'doc' | 'impl',
    sessionId?: string,
    engineId?: import('@shared/registry').LLMEngineId
  ): Promise<string | null> {
    try {
      const newAgent = await getVanillaClient().agent.start.mutate({
        specId,
        phase,
        args,
        group,
        sessionId,
        engineId: engineId ?? 'claude',
      });

      const agentInfo = toSharedAgentInfo(newAgent as RendererAgentInfo);
      useSharedAgentStore.getState().addAgent(specId, agentInfo);

      // Also select the new agent
      useSharedAgentStore.getState().selectAgent(agentInfo.agentId);

      return agentInfo.agentId;
    } catch (error) {
      console.error('[agentStoreAdapter] Failed to start agent:', error);
      return null;
    }
  },

  /**
   * Stop a running agent
   * trpc-full-migration Task 6.2: Uses tRPC agent.stop mutation
   */
  async stopAgent(agentId: string): Promise<void> {
    try {
      await getVanillaClient().agent.stop.mutate({ agentId });
    } catch (error) {
      console.error('[agentStoreAdapter] Failed to stop agent:', error);
    }
  },

  /**
   * Resume an interrupted agent
   * trpc-full-migration Task 6.2: Uses tRPC agent.resume mutation
   * Bug fix: agent-log-user-input-duplicate
   * User input log is now added only via Main process (onAgentLog IPC)
   * to avoid duplicate entries from both Renderer and Main.
   */
  async resumeAgent(agentId: string, prompt?: string): Promise<void> {
    try {
      await getVanillaClient().agent.resume.mutate({ agentId, prompt });
    } catch (error) {
      console.error('[agentStoreAdapter] Failed to resume agent:', error);
    }
  },

  /**
   * Remove an agent from file system and store
   * trpc-full-migration Task 6.2: Uses tRPC agent.delete mutation
   */
  async removeAgent(agentId: string): Promise<void> {
    const state = useSharedAgentStore.getState();
    const agent = state.getAgentById(agentId);

    if (agent) {
      try {
        await getVanillaClient().agent.delete.mutate({
          specId: agent.specId,
          agentId,
        });
        console.log('[agentStoreAdapter] Agent record deleted', { specId: agent.specId, agentId });
      } catch (error) {
        console.error('[agentStoreAdapter] Failed to delete agent record:', error);
        // Continue with store removal even if file deletion fails
      }
    }

    // Remove from shared store
    state.removeAgent(agentId);
  },

  /**
   * Send input to an agent
   * trpc-full-migration Task 6.2: Uses tRPC agent.sendInput mutation
   */
  async sendInput(agentId: string, input: string): Promise<void> {
    try {
      await getVanillaClient().agent.sendInput.mutate({ agentId, input });
    } catch (error) {
      console.error('[agentStoreAdapter] Failed to send input:', error);
    }
  },

  // agent-log-store-unification Task 4.2: loadAgentLogs removed
  // Requirements: 1.5 - loadAgentLogs削除（共通版ensureLogsLoadedに移行）
  // The log loading logic has been moved to shared/stores/agentStore.ts
};

// =============================================================================
// Event Listeners Setup
// Requirements: 2.4, 2.5
// =============================================================================

/**
 * Setup event listeners for agent events
 * trpc-full-migration Task 9.2: Migrated from window.electronAPI.on* to tRPC Subscription
 * @returns Cleanup function to remove all listeners
 */
export function setupAgentEventListeners(): () => void {
  console.log('[agentStoreAdapter] Setting up event listeners via tRPC Subscription');

  const subscriptions: Unsubscribable[] = [];

  // Note: onAgentOutput listener was removed (Bug fix: agent-log-json-display-issue)
  // Raw output is no longer needed here - parsed logs come via onAgentLog channel

  // Agent status change event listener
  // Task 9.2: window.electronAPI.onAgentStatusChange -> tRPC Subscription
  const statusSub = getVanillaClient().events.onAgentStatusChange.subscribe(undefined, {
    onData: (data: { agentId: string; status: string }) => {
      if (!data) return;
      console.log('[agentStoreAdapter] Agent status changed', { agentId: data.agentId, status: data.status });
      useSharedAgentStore.getState().updateAgentStatus(data.agentId, data.status as AgentStatus);
    },
  });
  subscriptions.push(statusSub);

  // Agent record changed event listener (file watcher)
  // Task 9.2: window.electronAPI.onAgentRecordChanged -> tRPC Subscription
  const recordChangedSub = getVanillaClient().events.onAgentRecordChanged.subscribe(undefined, {
    onData: (data: { type: string; data?: { agentId?: string; specId?: string } }) => {
      const type = data.type as 'add' | 'change' | 'unlink';
      const eventInfo = data.data ?? {};
      console.log('[agentStoreAdapter] Agent record changed', { type, eventInfo });

      const { agentId, specId } = eventInfo;
      // specId can be empty string for global agents, so check for undefined
      if (!agentId || specId === undefined) {
        console.warn('[agentStoreAdapter] Invalid event info, missing agentId or specId');
        return;
      }

      if (type === 'unlink') {
        // File deletion - remove agent from store
        useSharedAgentStore.getState().removeAgent(agentId);
      } else {
        // add/change - reload agents
        // Note: Full reload is delegated to the Facade layer which handles
        // store-specific behaviors like auto-selection
        console.log('[agentStoreAdapter] Agent record add/change event - delegating to facade');
      }
    },
  });
  subscriptions.push(recordChangedSub);

  // agent-log-store-unification Task 4.3: onAgentLog listener removed
  // Requirements: 2.4 - ログ購読は共通hookに移行（useAgentLogSubscription）
  // Log subscription is now handled by the shared useAgentLogSubscription hook

  // Return cleanup function
  return () => {
    console.log('[agentStoreAdapter] Cleaning up event listeners');
    subscriptions.forEach((sub) => sub.unsubscribe());
  };
}

// =============================================================================
// Skip Permissions Operations
// Requirements: 2.6
// =============================================================================

/**
 * Skip permissions management operations
 * Handles --dangerously-skip-permissions flag for claude CLI
 */
export const skipPermissionsOperations = {
  /**
   * Save skip permissions setting for a project
   * trpc-full-migration Task 3.2: Use tRPC mutation
   */
  async setSkipPermissions(enabled: boolean, projectPath: string): Promise<void> {
    try {
      await getVanillaClient().config.saveSkipPermissions.mutate({ projectPath, skipPermissions: enabled });
      console.log('[agentStoreAdapter] Saved skipPermissions:', enabled);
    } catch (error) {
      console.error('[agentStoreAdapter] Failed to save skipPermissions:', error);
    }
  },

  /**
   * Load skip permissions setting for a project
   * trpc-full-migration Task 3.2: Use tRPC query
   * @returns skipPermissions value, false on error
   */
  async loadSkipPermissions(projectPath: string): Promise<boolean> {
    try {
      const skipPermissions = await getVanillaClient().config.loadSkipPermissions.query({ projectPath });
      console.log('[agentStoreAdapter] Loaded skipPermissions:', skipPermissions);
      return skipPermissions;
    } catch (error) {
      console.error('[agentStoreAdapter] Failed to load skipPermissions:', error);
      return false;
    }
  },
};
