/**
 * Agent Store (Action-Only Facade) - DD-005
 *
 * agent-store-unification: Unified Interface for Electron Renderer
 * agent-facade-action-only Task 3.1: Converted to Action-Only Store
 * Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.3, 5.3, 6.1, 6.2, 6.3
 *
 * This Action-Only Facade provides action methods for Electron renderer components
 * to interact with Agent state. State is read directly from SSOT (useSharedAgentStore).
 *
 * Architecture:
 * - State reads: Components use useSharedAgentStore directly
 * - Actions: Components use useAgentStore for operations (IPC, tRPC, etc.)
 * - Event listeners: setupEventListeners() sets up tRPC subscriptions
 *
 * Usage in components:
 * ```typescript
 * // State reads from SSOT
 * import { useSharedAgentStore } from '@shared/stores/agentStore';
 * const selectedAgentId = useSharedAgentStore(s => s.selectedAgentId);
 *
 * // Actions from facade
 * import { useAgentStore } from '@renderer/stores/agentStore';
 * const stopAgent = useAgentStore(s => s.stopAgent);
 * ```
 */

import { create } from 'zustand';
import {
  useSharedAgentStore,
  type AgentInfo as SharedAgentInfo,
  type AgentStatus as SharedAgentStatus,
  type ParsedLogEntry,
} from '@shared/stores/agentStore';
import {
  agentOperations,
  setupAgentEventListeners,
  skipPermissionsOperations,
} from './agentStoreAdapter';
// trpc-full-migration Task 6.2: Use tRPC vanilla client for agent operations
import { getVanillaClient } from '../../shared/trpc/vanillaClient';
// trpc-full-migration Task 9.2: tRPC Subscription for event listeners
import type { Unsubscribable } from '@trpc/server/observable';

// Bug fix: agent-log-dynamic-import-issue
// Import specStore synchronously to avoid Promise delays in callbacks
import { useSpecStore } from './specStore';
// bugs-view-unification Task 6.1: Use shared bugStore
import { useSharedBugStore } from '../../shared/stores/bugStore';

// =============================================================================
// Type Re-exports for Backward Compatibility
// Requirements: 3.4
// =============================================================================

/**
 * AgentStatus type re-export
 * Ensures backward compatibility with existing components
 */
export type AgentStatus = SharedAgentStatus;

/**
 * AgentInfo type re-export from shared/api/types (SSOT)
 * agent-facade-action-only Task 2.1: Removed renderer-specific AgentInfo interface
 * Requirements: 3.1, 3.2, 3.3, 3.5
 */
export type { AgentInfo } from '@shared/api/types';

/**
 * Re-export ParsedLogEntry type
 * main-process-log-parser Task 10.4: Changed from LogEntry to ParsedLogEntry
 */
export type { ParsedLogEntry };

// =============================================================================
// Types
// =============================================================================

/**
 * Action-Only interface for Agent Store facade.
 * agent-facade-action-only Task 3.1: All state fields removed.
 * State is read directly from useSharedAgentStore (SSOT).
 */
interface AgentActions {
  // ===========================================================================
  // Agent Operations (delegate to adapter)
  // Requirements: 3.3
  // ===========================================================================

  /** Load all agents from main process */
  loadAgents: () => Promise<void>;
  /** Select an agent (selection only, no side effects) */
  selectAgent: (agentId: string | null) => Promise<void>;
  /**
   * Ensure logs are loaded for an agent
   * Refactoring: log-loading-separation
   * - Running agents: load only if no logs exist (IPC adds more)
   * - Completed/failed agents: always load from file (may have more logs)
   */
  ensureLogsLoaded: (agentId: string) => Promise<void>;
  /** Add an agent to the store */
  addAgent: (specId: string, agent: SharedAgentInfo) => void;
  /** Start a new agent
   * unified-engine-command-resolution: command parameter removed, engineId used instead
   */
  startAgent: (
    specId: string,
    phase: string,
    args: string[],
    group?: 'doc' | 'impl',
    sessionId?: string,
    engineId?: import('@shared/registry').LLMEngineId
  ) => Promise<string | null>;
  /** Stop a running agent */
  stopAgent: (agentId: string) => Promise<void>;
  /** Resume an interrupted agent */
  resumeAgent: (agentId: string, prompt?: string) => Promise<void>;
  /** Remove an agent */
  removeAgent: (agentId: string) => Promise<void>;
  /** Send input to an agent */
  sendInput: (agentId: string, input: string) => Promise<void>;
  /** Update agent status */
  updateAgentStatus: (agentId: string, status: AgentStatus) => void;

  // ===========================================================================
  // Log Management
  // main-process-log-parser Task 10.4: Changed to ParsedLogEntry
  // ===========================================================================

  /** Append a log entry */
  appendLog: (agentId: string, entry: ParsedLogEntry) => void;
  /** Clear logs for an agent */
  clearLogs: (agentId: string) => void;
  /** Get logs for an agent */
  getLogsForAgent: (agentId: string) => ParsedLogEntry[];

  // ===========================================================================
  // Event Listeners
  // Requirements: 3.7
  // ===========================================================================

  /** Setup IPC event listeners */
  setupEventListeners: () => () => void;

  // ===========================================================================
  // Helper Methods
  // Requirements: 3.5
  // ===========================================================================

  /** Get agent by ID */
  getAgentById: (agentId: string) => SharedAgentInfo | undefined;
  /** Get selected agent */
  getSelectedAgent: () => SharedAgentInfo | undefined;
  // zustand-agent-selector-hooks: getAgentsForSpec REMOVED (use useAgentsBySpec hook)
  // zustand-agent-selector-hooks: getProjectAgents REMOVED (use useProjectAgents hook)
  /** Find agent by ID (pure function for selectors) */
  findAgentById: (agentId: string | null) => SharedAgentInfo | undefined;
  /** E2E/test用: 全agentをクリア */
  clearAllAgents: () => Promise<void>;
  /** Clear error */
  clearError: () => void;
  /** Select for project agents panel */
  selectForProjectAgents: () => void;

  // ===========================================================================
  // Electron-specific Features
  // Requirements: 3.6
  // ===========================================================================

  /** Set skip permissions */
  setSkipPermissions: (enabled: boolean) => void;
  /** Load skip permissions from project */
  loadSkipPermissions: (projectPath: string) => Promise<void>;
}

// =============================================================================
// tRPC Agent API Adapter
// trpc-full-migration Task 6.2: Partial ApiClient adapter for shared store
// =============================================================================

/**
 * Create a minimal ApiClient adapter that uses tRPC for agent log operations.
 * Only implements methods needed by shared/agentStore.ensureLogsLoaded().
 */
function createTrpcAgentApiAdapter() {
  return {
    getAgentLogs: async (specId: string, agentId: string) => {
      try {
        const logs = await getVanillaClient().agent.getLogs.query({ specId, agentId });
        return { ok: true as const, value: logs };
      } catch (error) {
        return {
          ok: false as const,
          error: {
            type: 'TRPC_ERROR',
            message: error instanceof Error ? error.message : String(error),
          },
        };
      }
    },
    getAgents: async () => {
      try {
        const agentsRecord = await getVanillaClient().agent.getAllAgents.query();
        const agents: SharedAgentInfo[] = [];
        for (const specAgents of Object.values(agentsRecord)) {
          agents.push(...(specAgents as SharedAgentInfo[]));
        }
        return { ok: true as const, value: agents };
      } catch (error) {
        return {
          ok: false as const,
          error: {
            type: 'TRPC_ERROR',
            message: error instanceof Error ? error.message : String(error),
          },
        };
      }
    },
  } as import('@shared/api/types').ApiClient;
}

// =============================================================================
// Store (Action-Only)
// agent-facade-action-only Task 3.1: No state fields, only actions
// =============================================================================

export const useAgentStore = create<AgentActions>()(
  (_set, get) => ({
    // ===========================================================================
    // Agent Operations (Requirements: 3.3)
    // ===========================================================================

    // trpc-full-migration Task 6.2: Uses tRPC agent.getAllAgents query
    loadAgents: async () => {
      useSharedAgentStore.getState().setLoading(true);
      useSharedAgentStore.getState().clearError();

      try {
        const agentsRecord = await getVanillaClient().agent.getAllAgents.query();

        // Update shared store directly (SSOT)
        for (const [specId, agentList] of Object.entries(agentsRecord)) {
          for (const agent of agentList as SharedAgentInfo[]) {
            useSharedAgentStore.getState().addAgent(specId, agent);
          }
        }

        useSharedAgentStore.getState().setLoading(false);
      } catch (error) {
        useSharedAgentStore.getState().setError(
          error instanceof Error ? error.message : 'Agentの読み込みに失敗しました'
        );
        useSharedAgentStore.getState().setLoading(false);
      }
    },

    selectAgent: async (agentId: string | null) => {
      // Refactoring: log-loading-separation
      // selectAgent is now a pure selection action - no side effects
      // Log loading should be handled separately via ensureLogsLoaded()
      useSharedAgentStore.getState().selectAgent(agentId);
    },

    // trpc-full-migration Task 6.2: Uses tRPC-backed TrpcAgentApiAdapter
    ensureLogsLoaded: async (agentId: string) => {
      // agent-log-store-unification Task 4.1: Delegate to shared ensureLogsLoaded
      // trpc-full-migration Task 6.2: Use tRPC-backed adapter instead of IpcApiClient
      const adapter = createTrpcAgentApiAdapter();
      await useSharedAgentStore.getState().ensureLogsLoaded(adapter, agentId);
    },

    addAgent: (specId: string, agent: SharedAgentInfo) => {
      // Add to shared store directly (SSOT)
      useSharedAgentStore.getState().addAgent(specId, agent);
    },

    // unified-engine-command-resolution: command parameter removed, engineId used instead
    startAgent: async (
      specId: string,
      phase: string,
      args: string[],
      group?: 'doc' | 'impl',
      sessionId?: string,
      engineId?: import('@shared/registry').LLMEngineId
    ) => {
      useSharedAgentStore.getState().setLoading(true);
      useSharedAgentStore.getState().clearError();
      try {
        const agentId = await agentOperations.startAgent(specId, phase, args, group, sessionId, engineId);
        useSharedAgentStore.getState().setLoading(false);
        if (agentId) {
          useSharedAgentStore.getState().selectAgent(agentId);
        }
        return agentId;
      } catch (error) {
        useSharedAgentStore.getState().setError(
          error instanceof Error ? error.message : 'Agentの起動に失敗しました'
        );
        useSharedAgentStore.getState().setLoading(false);
        return null;
      }
    },

    stopAgent: async (agentId: string) => {
      try {
        await agentOperations.stopAgent(agentId);
      } catch (error) {
        useSharedAgentStore.getState().setError(
          error instanceof Error ? error.message : 'Agentの停止に失敗しました'
        );
      }
    },

    resumeAgent: async (agentId: string, prompt?: string) => {
      try {
        // main-process-log-parser Task 10.4: Removed duplicate log addition
        // The adapter (agentStoreAdapter.ts) already handles adding stdin log
        await agentOperations.resumeAgent(agentId, prompt);
      } catch (error) {
        useSharedAgentStore.getState().setError(
          error instanceof Error ? error.message : 'Agentの再開に失敗しました'
        );
      }
    },

    removeAgent: async (agentId: string) => {
      try {
        await agentOperations.removeAgent(agentId);
      } catch (error) {
        useSharedAgentStore.getState().setError(
          error instanceof Error ? error.message : 'Agentの削除に失敗しました'
        );
      }
    },

    sendInput: async (agentId: string, input: string) => {
      try {
        await agentOperations.sendInput(agentId, input);
      } catch (error) {
        useSharedAgentStore.getState().setError(
          error instanceof Error ? error.message : '入力の送信に失敗しました'
        );
      }
    },

    updateAgentStatus: (agentId: string, status: AgentStatus) => {
      useSharedAgentStore.getState().updateAgentStatus(agentId, status);
    },

    // ===========================================================================
    // Log Management
    // ===========================================================================

    appendLog: (agentId: string, entry: ParsedLogEntry) => {
      useSharedAgentStore.getState().addLog(agentId, entry);
    },

    clearLogs: (agentId: string) => {
      useSharedAgentStore.getState().clearLogs(agentId);
    },

    getLogsForAgent: (agentId: string) => {
      return useSharedAgentStore.getState().getLogsForAgent(agentId);
    },

    // ===========================================================================
    // Event Listeners (Requirements: 3.7)
    // agent-facade-action-only Task 3.1: subscribe-and-sync removed
    // tRPC event subscriptions and adapter event listeners maintained
    // ===========================================================================

    setupEventListeners: () => {
      console.log('[agentStore] Setting up event listeners');

      // Setup IPC event listeners via adapter
      const cleanupAdapter = setupAgentEventListeners();

      // Agent Record変更イベントリスナー(ファイル監視)
      // Note: The adapter handles basic add/change/unlink, but we need additional
      // handling for auto-selection which requires specStore/bugStore context
      // Task 9.2: window.electronAPI.onAgentRecordChanged -> tRPC Subscription
      const facadeSubscriptions: Unsubscribable[] = [];
      const recordChangedSub = getVanillaClient().events.onAgentRecordChanged.subscribe(undefined, {
        onData: (data: { type: string; data?: { agentId?: string; specId?: string } }) => {
          if (!data || !data.type) return; // phantom data guard
          const type = data.type as 'add' | 'change' | 'unlink';
          const eventInfo = data.data ?? {};
          console.log('[agentStore] Agent record changed', { type, eventInfo });

          const { agentId, specId } = eventInfo;
          if (!agentId || specId === undefined) {
            console.warn('[agentStore] Invalid event info, missing agentId or specId');
            return;
          }

          if (type === 'unlink') {
            // File deletion - handled by adapter, SSOT updated directly
          } else {
            // add/change - reload and auto-select
            get().loadAgents().then(() => {
              // Auto-selection logic
              if (type === 'add') {
                if (specId === '') {
                  // Project Agent - only auto-select if running
                  // Bug fix: project-agent-auto-select-stale
                  const agent = get().getAgentById(agentId);
                  if (agent && agent.status === 'running') {
                    get().selectAgent(agentId);
                  }
                } else {
                  // Spec/Bug Agent - auto-select if matches current selection
                  const { selectedSpec } = useSpecStore.getState();
                  if (specId.startsWith('bug:')) {
                    // bugs-view-unification Task 6.1: Use selectedBugId from shared store
                    const { selectedBugId } = useSharedBugStore.getState();
                    const expectedSpecId = selectedBugId ? `bug:${selectedBugId}` : '';
                    if (specId === expectedSpecId) {
                      get().selectAgent(agentId);
                    }
                  } else if (selectedSpec && specId === selectedSpec.name) {
                    get().selectAgent(agentId);
                  }
                }
              }
            });
          }
        },
      });
      facadeSubscriptions.push(recordChangedSub);

      return () => {
        console.log('[agentStore] Cleaning up event listeners');
        cleanupAdapter();
        facadeSubscriptions.forEach((sub) => sub.unsubscribe());
      };
    },

    // ===========================================================================
    // Helper Methods (Requirements: 3.5)
    // ===========================================================================

    getAgentById: (agentId: string) => {
      return useSharedAgentStore.getState().getAgentById(agentId);
    },

    getSelectedAgent: () => {
      const selectedAgentId = useSharedAgentStore.getState().selectedAgentId;
      if (!selectedAgentId) return undefined;
      return get().getAgentById(selectedAgentId);
    },

    // zustand-agent-selector-hooks: getAgentsForSpec REMOVED (use useAgentsBySpec hook)
    // zustand-agent-selector-hooks: getProjectAgents REMOVED (use useProjectAgents hook)

    findAgentById: (agentId: string | null) => {
      if (!agentId) return undefined;
      return get().getAgentById(agentId);
    },

    clearAllAgents: async () => {
      const sharedState = useSharedAgentStore.getState();
      const agentIds: string[] = [];
      sharedState.agents.forEach((agentList) => {
        agentList.forEach((a) => agentIds.push(a.agentId));
      });
      for (const id of agentIds) {
        await get().removeAgent(id);
      }
    },

    clearError: () => {
      useSharedAgentStore.getState().clearError();
    },

    selectForProjectAgents: () => {
      useSharedAgentStore.getState().selectAgent(null);
    },

    // ===========================================================================
    // Electron-specific Features (Requirements: 3.6)
    // agent-facade-action-only Task 3.1: skipPermissions delegated to SSOT
    // ===========================================================================

    setSkipPermissions: async (enabled: boolean) => {
      // Update SSOT
      useSharedAgentStore.getState().setSkipPermissions(enabled);

      // Persist to project config file
      const { useProjectStore } = await import('./projectStore');
      const currentProject = useProjectStore.getState().currentProject;
      if (currentProject) {
        await skipPermissionsOperations.setSkipPermissions(enabled, currentProject);
      }
    },

    loadSkipPermissions: async (projectPath: string) => {
      const skipPermissions = await skipPermissionsOperations.loadSkipPermissions(projectPath);
      // Update SSOT
      useSharedAgentStore.getState().setSkipPermissions(skipPermissions);
    },
  })
);

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Reset store to initial state (for tests)
 * agent-facade-action-only Task 3.1: Action-only store has no state to reset
 * Reset SSOT instead via resetSharedAgentStore()
 */
export function resetAgentStore(): void {
  // No local state to reset - facade is action-only
  // Tests should use resetSharedAgentStore() from '@shared/stores/agentStore'
}
