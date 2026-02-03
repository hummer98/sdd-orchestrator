/**
 * Agent Store Adapter
 *
 * agent-store-unification: Electron IPC Adapter Layer
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 *
 * This adapter encapsulates all Electron IPC operations for Agent management.
 * It bridges the shared/agentStore (SSOT) with window.electronAPI.
 *
 * Responsibilities:
 * - IPC call wrapping for Agent operations
 * - IPC event listener setup and cleanup
 * - skipPermissions management
 * - Updating shared/agentStore with IPC results
 */

import { useSharedAgentStore, type AgentInfo as SharedAgentInfo, type AgentStatus } from '@shared/stores/agentStore';

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
export const agentOperations = {
  /**
   * Start a new agent
   * unified-engine-command-resolution: command parameter removed, engineId used instead
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
      const newAgent = await window.electronAPI.startAgent(
        specId,
        phase,
        args,
        group,
        sessionId,
        engineId
      );

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
   */
  async stopAgent(agentId: string): Promise<void> {
    try {
      await window.electronAPI.stopAgent(agentId);
    } catch (error) {
      console.error('[agentStoreAdapter] Failed to stop agent:', error);
    }
  },

  /**
   * Resume an interrupted agent
   * Bug fix: agent-log-user-input-duplicate
   * User input log is now added only via Main process (onAgentLog IPC)
   * to avoid duplicate entries from both Renderer and Main.
   */
  async resumeAgent(agentId: string, prompt?: string): Promise<void> {
    try {
      await window.electronAPI.resumeAgent(agentId, prompt);
    } catch (error) {
      console.error('[agentStoreAdapter] Failed to resume agent:', error);
    }
  },

  /**
   * Remove an agent from file system and store
   */
  async removeAgent(agentId: string): Promise<void> {
    const state = useSharedAgentStore.getState();
    const agent = state.getAgentById(agentId);

    if (agent) {
      try {
        await window.electronAPI.deleteAgent(agent.specId, agentId);
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
   */
  async sendInput(agentId: string, input: string): Promise<void> {
    try {
      await window.electronAPI.sendAgentInput(agentId, input);
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
 * Setup IPC event listeners for agent events
 * @returns Cleanup function to remove all listeners
 */
export function setupAgentEventListeners(): () => void {
  console.log('[agentStoreAdapter] Setting up event listeners');

  // Note: onAgentOutput listener was removed (Bug fix: agent-log-json-display-issue)
  // Raw output is no longer needed here - parsed logs come via onAgentLog channel

  // Agent status change event listener
  const cleanupStatus = window.electronAPI.onAgentStatusChange(
    (agentId: string, status: AgentStatus) => {
      console.log('[agentStoreAdapter] Agent status changed', { agentId, status });
      useSharedAgentStore.getState().updateAgentStatus(agentId, status);
    }
  );

  // Agent record changed event listener (file watcher)
  const cleanupRecordChanged = window.electronAPI.onAgentRecordChanged(
    (type: 'add' | 'change' | 'unlink', eventInfo: { agentId?: string; specId?: string }) => {
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
    }
  );

  // agent-log-store-unification Task 4.3: onAgentLog listener removed
  // Requirements: 2.4 - ログ購読は共通hookに移行（useAgentLogSubscription）
  // Log subscription is now handled by the shared useAgentLogSubscription hook

  // Return cleanup function
  return () => {
    console.log('[agentStoreAdapter] Cleaning up event listeners');
    cleanupStatus();
    cleanupRecordChanged();
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
   */
  async setSkipPermissions(enabled: boolean, projectPath: string): Promise<void> {
    try {
      await window.electronAPI.saveSkipPermissions(projectPath, enabled);
      console.log('[agentStoreAdapter] Saved skipPermissions:', enabled);
    } catch (error) {
      console.error('[agentStoreAdapter] Failed to save skipPermissions:', error);
    }
  },

  /**
   * Load skip permissions setting for a project
   * @returns skipPermissions value, false on error
   */
  async loadSkipPermissions(projectPath: string): Promise<boolean> {
    try {
      const skipPermissions = await window.electronAPI.loadSkipPermissions(projectPath);
      console.log('[agentStoreAdapter] Loaded skipPermissions:', skipPermissions);
      return skipPermissions;
    } catch (error) {
      console.error('[agentStoreAdapter] Failed to load skipPermissions:', error);
      return false;
    }
  },
};
