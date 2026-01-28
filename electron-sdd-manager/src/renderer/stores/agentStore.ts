/**
 * Agent Store (Facade)
 *
 * agent-store-unification: Unified Interface for Electron Renderer
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 *
 * This Facade provides a single access point for Electron renderer components
 * to interact with Agent state. It combines:
 * - shared/agentStore (SSOT for Agent state)
 * - agentStoreAdapter (IPC operations)
 * - Facade-specific state (skipPermissions, runningAgentCounts, UI state)
 *
 * Usage in components:
 * ```typescript
 * import { useAgentStore } from '@renderer/stores/agentStore';
 *
 * const agents = useAgentStore((state) => state.getAgentsForSpec(specId));
 * ```
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  useSharedAgentStore,
  type AgentInfo as SharedAgentInfo,
  type AgentStatus as SharedAgentStatus,
  type ParsedLogEntry,
} from '@shared/stores/agentStore';
import type { LLMEngineId } from '@shared/registry';
import {
  agentOperations,
  setupAgentEventListeners,
  skipPermissionsOperations,
} from './agentStoreAdapter';

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
 * AgentInfo interface for renderer
 * Uses 'agentId' for backward compatibility with existing components
 * The shared store uses 'id' internally
 */
export interface AgentInfo {
  readonly agentId: string;
  readonly specId: string;
  readonly phase: string;
  readonly pid?: number;
  readonly sessionId: string;
  readonly status: AgentStatus;
  readonly startedAt: string;
  readonly lastActivityAt: string;
  readonly command: string;

  // execution-store-consolidation: Extended fields (Req 2.1, 2.2)
  // Optional fields for backward compatibility
  executionMode?: 'auto' | 'manual';
  retryCount?: number;

  // project-agent-release-footer: Task 2.3 - Args field for release detection
  // Requirements: 6.1, 6.2, 6.3
  // Contains the prompt/command string used to start the agent
  // Used to detect release agents via args?.includes('/release')
  args?: string;

  /**
   * LLM engine ID for parser selection and UI labels
   * llm-stream-log-parser: Task 6.1 - engineId in AgentInfo
   * Requirements: 4.1, 4.2
   * Made optional for backward compatibility - defaults to 'claude'
   */
  engineId?: LLMEngineId;
}

/**
 * Re-export ParsedLogEntry type
 * main-process-log-parser Task 10.4: Changed from LogEntry to ParsedLogEntry
 */
export type { ParsedLogEntry };

// =============================================================================
// Type Conversion Helpers
// =============================================================================

/**
 * Convert shared AgentInfo (id) to renderer AgentInfo (agentId)
 */
function toRendererAgentInfo(shared: SharedAgentInfo): AgentInfo {
  return {
    agentId: shared.id,
    specId: shared.specId,
    phase: shared.phase,
    sessionId: shared.sessionId || '',
    status: shared.status,
    startedAt: typeof shared.startedAt === 'number' ? new Date(shared.startedAt).toISOString() : shared.startedAt,
    lastActivityAt: shared.lastActivityAt || '',
    command: shared.command || '',
    // execution-store-consolidation: Preserve extended fields
    executionMode: shared.executionMode,
    retryCount: shared.retryCount,
    // project-agent-release-footer: Task 2.3 - Map args for release detection
    args: shared.args,
    // llm-stream-log-parser: Task 6.1 - Map engineId for parser selection
    engineId: shared.engineId,
  };
}

/**
 * Convert renderer AgentInfo (agentId) to shared AgentInfo (id)
 */
function toSharedAgentInfo(renderer: AgentInfo): SharedAgentInfo {
  return {
    id: renderer.agentId,
    specId: renderer.specId,
    phase: renderer.phase,
    status: renderer.status,
    startedAt: renderer.startedAt,
    command: renderer.command,
    sessionId: renderer.sessionId,
    lastActivityAt: renderer.lastActivityAt,
    // execution-store-consolidation: Preserve extended fields
    executionMode: renderer.executionMode,
    retryCount: renderer.retryCount,
    // project-agent-release-footer: Task 2.3 - Preserve args for release detection
    args: renderer.args,
    // llm-stream-log-parser: Task 6.1 - Preserve engineId for parser selection
    engineId: renderer.engineId,
  };
}

// =============================================================================
// Types
// =============================================================================

interface AgentState {
  /** Agents map: specId -> AgentInfo[] */
  agents: Map<string, AgentInfo[]>;
  /** Selected agent ID */
  selectedAgentId: string | null;
  /**
   * Logs per agent: agentId -> ParsedLogEntry[]
   * main-process-log-parser Task 10.4: Changed from LogEntry[] to ParsedLogEntry[]
   */
  logs: Map<string, ParsedLogEntry[]>;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Skip permissions flag (--dangerously-skip-permissions) */
  skipPermissions: boolean;
  /** Running agent counts per spec (lightweight cache) */
  runningAgentCounts: Map<string, number>;
}

interface AgentActions {
  // ===========================================================================
  // Agent Operations (delegate to adapter)
  // Requirements: 3.3
  // ===========================================================================

  /** Load all agents from main process */
  loadAgents: () => Promise<void>;
  /** Load running agent counts (lightweight) */
  loadRunningAgentCounts: () => Promise<void>;
  /** Get running agent count for a spec */
  getRunningAgentCount: (specId: string) => number;
  /** Select an agent */
  selectAgent: (agentId: string | null) => Promise<void>;
  /** Load agent logs */
  loadAgentLogs: (specId: string, agentId: string) => Promise<void>;
  /** Add an agent to the store */
  addAgent: (specId: string, agent: AgentInfo) => void;
  /** Start a new agent */
  startAgent: (
    specId: string,
    phase: string,
    command: string,
    args: string[],
    group?: 'doc' | 'impl',
    sessionId?: string
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
  getAgentById: (agentId: string) => AgentInfo | undefined;
  /** Get selected agent */
  getSelectedAgent: () => AgentInfo | undefined;
  /** Get agents for a spec */
  getAgentsForSpec: (specId: string) => AgentInfo[];
  /** Get project agents (specId = '') */
  getProjectAgents: () => AgentInfo[];
  /** Find agent by ID (pure function for selectors) */
  findAgentById: (agentId: string | null) => AgentInfo | undefined;
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

type AgentStore = AgentState & AgentActions;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get agents from shared store and convert to renderer format
 */
function getAgentsFromShared(): Map<string, AgentInfo[]> {
  const sharedAgents = useSharedAgentStore.getState().agents;
  const rendererAgents = new Map<string, AgentInfo[]>();

  for (const [specId, agents] of sharedAgents.entries()) {
    rendererAgents.set(specId, agents.map(toRendererAgentInfo));
  }

  return rendererAgents;
}

/**
 * Get logs from shared store
 * main-process-log-parser Task 10.4: Return ParsedLogEntry[]
 */
function getLogsFromShared(): Map<string, ParsedLogEntry[]> {
  return useSharedAgentStore.getState().logs;
}

/**
 * Calculate running agent counts from shared store
 */
function calculateRunningCounts(): Map<string, number> {
  const sharedState = useSharedAgentStore.getState();
  const counts = new Map<string, number>();

  for (const [specId, agents] of sharedState.agents.entries()) {
    const runningCount = agents.filter((a) => a.status === 'running').length;
    counts.set(specId, runningCount);
  }

  return counts;
}

// =============================================================================
// Store
// =============================================================================

export const useAgentStore = create<AgentStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state - synced from shared store
    agents: getAgentsFromShared(),
    selectedAgentId: useSharedAgentStore.getState().selectedAgentId,
    logs: getLogsFromShared(),
    isLoading: useSharedAgentStore.getState().isLoading,
    error: useSharedAgentStore.getState().error,
    skipPermissions: false,
    runningAgentCounts: calculateRunningCounts(),

    // ===========================================================================
    // Agent Operations (Requirements: 3.3)
    // ===========================================================================

    loadAgents: async () => {
      set({ isLoading: true, error: null });

      try {
        const agentsRecord = await window.electronAPI.getAllAgents();
        const agentsMap = new Map<string, AgentInfo[]>();

        // Record<string, AgentInfo[]> を Map に変換
        for (const [specId, agentList] of Object.entries(agentsRecord)) {
          agentsMap.set(specId, agentList as AgentInfo[]);
        }

        // Also update runningAgentCounts from full data
        const runningCounts = new Map<string, number>();
        for (const [specId, agentList] of agentsMap) {
          const runningCount = agentList.filter((a) => a.status === 'running').length;
          runningCounts.set(specId, runningCount);
        }

        // Update shared store with converted data
        for (const [specId, agentList] of agentsMap) {
          for (const agent of agentList) {
            useSharedAgentStore.getState().addAgent(specId, toSharedAgentInfo(agent));
          }
        }

        set({
          agents: agentsMap,
          runningAgentCounts: runningCounts,
          isLoading: false,
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Agentの読み込みに失敗しました',
          isLoading: false,
        });
      }
    },

    loadRunningAgentCounts: async () => {
      try {
        const countsRecord = await window.electronAPI.getRunningAgentCounts();
        const countsMap = new Map<string, number>();

        for (const [specId, count] of Object.entries(countsRecord)) {
          countsMap.set(specId, count);
        }

        set({ runningAgentCounts: countsMap });
        console.log('[agentStore] Loaded running agent counts:', countsMap.size, 'specs');
      } catch (error) {
        console.error('[agentStore] Failed to load running agent counts:', error);
      }
    },

    getRunningAgentCount: (specId: string) => {
      const cachedCount = get().runningAgentCounts.get(specId);
      if (cachedCount !== undefined) {
        return cachedCount;
      }

      const agents = get().agents.get(specId) || [];
      return agents.filter((a) => a.status === 'running').length;
    },

    selectAgent: async (agentId: string | null) => {
      // Update shared store
      useSharedAgentStore.getState().selectAgent(agentId);
      set({ selectedAgentId: agentId });

      // Load logs if not already loaded
      if (agentId) {
        const state = get();
        const existingLogs = state.logs.get(agentId);

        if (!existingLogs || existingLogs.length === 0) {
          const agent = state.getAgentById(agentId);
          if (agent) {
            await agentOperations.loadAgentLogs(agent.specId, agentId);
          }
        }
      }
    },

    loadAgentLogs: async (specId: string, agentId: string) => {
      await agentOperations.loadAgentLogs(specId, agentId);
      // Sync logs from shared store
      set({ logs: getLogsFromShared() });
    },

    addAgent: (specId: string, agent: AgentInfo) => {
      // Add to shared store
      useSharedAgentStore.getState().addAgent(specId, toSharedAgentInfo(agent));
      // Sync from shared store
      set({ agents: getAgentsFromShared() });
    },

    startAgent: async (
      specId: string,
      phase: string,
      command: string,
      args: string[],
      group?: 'doc' | 'impl',
      sessionId?: string
    ) => {
      set({ isLoading: true, error: null });
      try {
        const agentId = await agentOperations.startAgent(specId, phase, command, args, group, sessionId);
        set({
          isLoading: false,
          agents: getAgentsFromShared(),
          selectedAgentId: agentId,
          runningAgentCounts: calculateRunningCounts(),
        });
        return agentId;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Agentの起動に失敗しました',
          isLoading: false,
        });
        return null;
      }
    },

    stopAgent: async (agentId: string) => {
      try {
        await agentOperations.stopAgent(agentId);
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Agentの停止に失敗しました' });
      }
    },

    resumeAgent: async (agentId: string, prompt?: string) => {
      try {
        // main-process-log-parser Task 10.4: Removed duplicate log addition
        // The adapter (agentStoreAdapter.ts) already handles adding stdin log
        await agentOperations.resumeAgent(agentId, prompt);
        // Sync from shared store
        set({ agents: getAgentsFromShared() });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Agentの再開に失敗しました' });
      }
    },

    removeAgent: async (agentId: string) => {
      try {
        await agentOperations.removeAgent(agentId);
        set({
          agents: getAgentsFromShared(),
          logs: getLogsFromShared(),
          runningAgentCounts: calculateRunningCounts(),
        });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Agentの削除に失敗しました' });
      }
    },

    sendInput: async (agentId: string, input: string) => {
      try {
        await agentOperations.sendInput(agentId, input);
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '入力の送信に失敗しました' });
      }
    },

    updateAgentStatus: (agentId: string, status: AgentStatus) => {
      useSharedAgentStore.getState().updateAgentStatus(agentId, status);
      set({ agents: getAgentsFromShared() });
    },

    // ===========================================================================
    // Log Management
    // ===========================================================================

    appendLog: (agentId: string, entry: ParsedLogEntry) => {
      useSharedAgentStore.getState().addLog(agentId, entry);
      set({ logs: getLogsFromShared() });
    },

    clearLogs: (agentId: string) => {
      useSharedAgentStore.getState().clearLogs(agentId);
      set({ logs: getLogsFromShared() });
    },

    getLogsForAgent: (agentId: string) => {
      return useSharedAgentStore.getState().getLogsForAgent(agentId);
    },

    // ===========================================================================
    // Event Listeners (Requirements: 3.7)
    // ===========================================================================

    setupEventListeners: () => {
      console.log('[agentStore] Setting up event listeners');

      // Setup IPC event listeners via adapter
      const cleanupAdapter = setupAgentEventListeners();

      // Agent Record変更イベントリスナー（ファイル監視）
      // Note: The adapter handles basic add/change/unlink, but we need additional
      // handling for auto-selection which requires specStore/bugStore context
      const cleanupRecordChanged = window.electronAPI.onAgentRecordChanged(
        (type: 'add' | 'change' | 'unlink', eventInfo: { agentId?: string; specId?: string }) => {
          console.log('[agentStore] Agent record changed', { type, eventInfo });

          const { agentId, specId } = eventInfo;
          if (!agentId || specId === undefined) {
            console.warn('[agentStore] Invalid event info, missing agentId or specId');
            return;
          }

          if (type === 'unlink') {
            // File deletion - handled by adapter, just sync state
            set({
              agents: getAgentsFromShared(),
              logs: getLogsFromShared(),
              runningAgentCounts: calculateRunningCounts(),
            });
          } else {
            // add/change - reload and auto-select
            get().loadAgents().then(() => {
              // Auto-selection logic
              if (type === 'add') {
                if (specId === '') {
                  // Project Agent - only auto-select if running
                  // Bug fix: project-agent-auto-select-stale
                  // On project selection, file watcher fires 'add' events for existing (stale) agents
                  // due to ignoreInitial: false. Only auto-select running agents to avoid
                  // selecting old, non-running agents on project switch.
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
        }
      );

      // Subscribe to shared store changes
      const unsubscribeShared = useSharedAgentStore.subscribe(() => {
        set({
          agents: getAgentsFromShared(),
          selectedAgentId: useSharedAgentStore.getState().selectedAgentId,
          logs: getLogsFromShared(),
          isLoading: useSharedAgentStore.getState().isLoading,
          error: useSharedAgentStore.getState().error,
          runningAgentCounts: calculateRunningCounts(),
        });
      });

      return () => {
        console.log('[agentStore] Cleaning up event listeners');
        cleanupAdapter();
        cleanupRecordChanged();
        unsubscribeShared();
      };
    },

    // ===========================================================================
    // Helper Methods (Requirements: 3.5)
    // ===========================================================================

    getAgentById: (agentId: string) => {
      const shared = useSharedAgentStore.getState().getAgentById(agentId);
      return shared ? toRendererAgentInfo(shared) : undefined;
    },

    getSelectedAgent: () => {
      const { selectedAgentId } = get();
      if (!selectedAgentId) return undefined;
      return get().getAgentById(selectedAgentId);
    },

    getAgentsForSpec: (specId: string) => {
      const shared = useSharedAgentStore.getState().getAgentsForSpec(specId);
      return shared.map(toRendererAgentInfo);
    },

    getProjectAgents: () => {
      return get().getAgentsForSpec('');
    },

    findAgentById: (agentId: string | null) => {
      if (!agentId) return undefined;
      return get().getAgentById(agentId);
    },

    clearError: () => {
      useSharedAgentStore.getState().clearError();
      set({ error: null });
    },

    selectForProjectAgents: () => {
      set({ selectedAgentId: null });
    },

    // ===========================================================================
    // Electron-specific Features (Requirements: 3.6)
    // ===========================================================================

    setSkipPermissions: async (enabled: boolean) => {
      set({ skipPermissions: enabled });

      // Persist to project config file
      const { useProjectStore } = await import('./projectStore');
      const currentProject = useProjectStore.getState().currentProject;
      if (currentProject) {
        await skipPermissionsOperations.setSkipPermissions(enabled, currentProject);
      }
    },

    loadSkipPermissions: async (projectPath: string) => {
      const skipPermissions = await skipPermissionsOperations.loadSkipPermissions(projectPath);
      set({ skipPermissions });
    },
  }))
);

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Reset store to initial state (for tests)
 */
export function resetAgentStore(): void {
  useAgentStore.setState({
    agents: new Map(),
    selectedAgentId: null,
    logs: new Map(),
    isLoading: false,
    error: null,
    skipPermissions: false,
    runningAgentCounts: new Map(),
  });
}
