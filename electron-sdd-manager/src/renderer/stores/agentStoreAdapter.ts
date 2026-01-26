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
import type { LogEntry } from '../types';

// =============================================================================
// Type Adapters
// =============================================================================

/**
 * Convert renderer AgentInfo to shared AgentInfo format
 * renderer uses 'agentId', shared uses 'id'
 * project-agent-release-footer: Task 2.3 - Map prompt to args for release detection
 */
function toSharedAgentInfo(rendererAgent: RendererAgentInfo): SharedAgentInfo {
  return {
    id: rendererAgent.agentId,
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
   * @returns agentId on success, null on failure
   */
  async startAgent(
    specId: string,
    phase: string,
    command: string,
    args: string[],
    group?: 'doc' | 'impl',
    sessionId?: string
  ): Promise<string | null> {
    try {
      const newAgent = await window.electronAPI.startAgent(
        specId,
        phase,
        command,
        args,
        group,
        sessionId
      );

      const agentInfo = toSharedAgentInfo(newAgent as RendererAgentInfo);
      useSharedAgentStore.getState().addAgent(specId, agentInfo);

      // Also select the new agent
      useSharedAgentStore.getState().selectAgent(agentInfo.id);

      return agentInfo.id;
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
   */
  async resumeAgent(agentId: string, prompt?: string): Promise<void> {
    try {
      // Add stdin log entry if prompt is provided
      if (prompt) {
        const inputLogEntry: LogEntry = {
          id: `stdin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          stream: 'stdin',
          data: prompt,
          timestamp: Date.now(),
        };
        useSharedAgentStore.getState().addLog(agentId, inputLogEntry);
      }

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

  /**
   * Load agent logs from file and update shared store
   *
   * Bug fix: agent-log-stream-race-condition
   * Previously, clearLogs() was called before adding file logs, which caused
   * real-time logs received via onAgentOutput to be lost. Now we merge file logs
   * with existing real-time logs, using ID-based deduplication and timestamp sorting.
   */
  async loadAgentLogs(specId: string, agentId: string): Promise<void> {
    try {
      console.log('[agentStoreAdapter] Loading agent logs', { specId, agentId });
      const logs = await window.electronAPI.getAgentLogs(specId, agentId);

      // Convert file logs to LogEntry format
      const fileLogEntries: LogEntry[] = logs.map((log: { timestamp: string; stream: string; data: string }, index: number) => ({
        id: `${agentId}-${index}-${log.timestamp}`,
        stream: log.stream as 'stdout' | 'stderr' | 'stdin',
        data: log.data,
        timestamp: new Date(log.timestamp).getTime(),
      }));

      // Bug fix: agent-log-stream-race-condition
      // Merge file logs with existing real-time logs instead of clearing
      const state = useSharedAgentStore.getState();
      const existingLogs = state.getLogsForAgent(agentId);

      // Create a set of existing log IDs for deduplication
      const existingIds = new Set(existingLogs.map((log) => log.id));

      // Add only new logs from file (not already in real-time logs)
      const newFileLogsCount = fileLogEntries.filter((entry) => {
        if (!existingIds.has(entry.id)) {
          state.addLog(agentId, entry);
          return true;
        }
        return false;
      }).length;

      console.log('[agentStoreAdapter] Loaded agent logs', {
        specId,
        agentId,
        fileCount: fileLogEntries.length,
        existingCount: existingLogs.length,
        newCount: newFileLogsCount,
      });
    } catch (error) {
      console.error('[agentStoreAdapter] Failed to load agent logs:', error);
    }
  },
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

  // Agent output event listener
  const cleanupOutput = window.electronAPI.onAgentOutput(
    (agentId: string, stream: 'stdout' | 'stderr', data: string) => {
      console.log('[agentStoreAdapter] Received agent output', { agentId, stream, dataLength: data.length });
      const entry: LogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        stream,
        data,
        timestamp: Date.now(),
      };
      useSharedAgentStore.getState().addLog(agentId, entry);
    }
  );

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

  // Return cleanup function
  return () => {
    console.log('[agentStoreAdapter] Cleaning up event listeners');
    cleanupOutput();
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
