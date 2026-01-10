/**
 * Shared agentStore
 *
 * Task 5.3: 共有agentStoreを実装する
 *
 * IPC依存を除去し、ApiClient経由でデータを取得する共有ストア。
 * Electron版とRemote UI版で同一storeを使用可能。
 */

import { create } from 'zustand';
import type { ApiClient, AgentInfo, AgentStatus, LogEntry } from '../api/types';

// =============================================================================
// Types
// =============================================================================

export interface SharedAgentState {
  /** Agent一覧 */
  agents: Map<string, AgentInfo>;
  /** 選択中のAgent ID */
  selectedAgentId: string | null;
  /** Agent別のログ */
  logs: Map<string, LogEntry[]>;
  /** 読み込み中フラグ */
  isLoading: boolean;
  /** エラーメッセージ */
  error: string | null;
}

export interface SharedAgentActions {
  /** ApiClient経由でagentsを読み込む */
  loadAgents: (apiClient: ApiClient) => Promise<void>;
  /** Agentを選択する */
  selectAgent: (agentId: string | null) => void;
  /** IDでAgentを取得する */
  getAgentById: (agentId: string) => AgentInfo | undefined;
  /** Spec/Bug IDでAgentsを取得する */
  getAgentsForSpec: (specId: string) => AgentInfo[];
  /** Agentを追加する */
  addAgent: (specId: string, agent: AgentInfo) => void;
  /** Agentのステータスを更新する */
  updateAgentStatus: (agentId: string, status: AgentStatus) => void;
  /** Agentを削除する */
  removeAgent: (agentId: string) => void;
  /** ログを追加する */
  addLog: (agentId: string, log: LogEntry) => void;
  /** ログをクリアする */
  clearLogs: (agentId: string) => void;
  /** 指定AgentのLogsを取得する */
  getLogsForAgent: (agentId: string) => LogEntry[];
  /** エラーをクリアする */
  clearError: () => void;
}

export type SharedAgentStore = SharedAgentState & SharedAgentActions;

// =============================================================================
// Store
// =============================================================================

export const useSharedAgentStore = create<SharedAgentStore>((set, get) => ({
  // Initial state
  agents: new Map(),
  selectedAgentId: null,
  logs: new Map(),
  isLoading: false,
  error: null,

  // Actions
  loadAgents: async (apiClient: ApiClient) => {
    set({ isLoading: true, error: null });

    const result = await apiClient.getAgents();

    if (result.ok) {
      const agentMap = new Map<string, AgentInfo>();
      result.value.forEach((agent) => {
        agentMap.set(agent.id, agent);
      });
      set({ agents: agentMap, isLoading: false });
    } else {
      set({ error: result.error.message, isLoading: false });
    }
  },

  selectAgent: (agentId: string | null) => {
    set({ selectedAgentId: agentId });
  },

  getAgentById: (agentId: string) => {
    return get().agents.get(agentId);
  },

  getAgentsForSpec: (specId: string) => {
    const agents = Array.from(get().agents.values());
    return agents.filter((agent) => agent.specId === specId);
  },

  addAgent: (specId: string, agent: AgentInfo) => {
    set((state) => {
      const newAgents = new Map(state.agents);
      newAgents.set(agent.id, { ...agent, specId });
      return { agents: newAgents };
    });
  },

  updateAgentStatus: (agentId: string, status: AgentStatus) => {
    set((state) => {
      const agent = state.agents.get(agentId);
      if (!agent) return state;

      const newAgents = new Map(state.agents);
      newAgents.set(agentId, { ...agent, status });
      return { agents: newAgents };
    });
  },

  removeAgent: (agentId: string) => {
    set((state) => {
      const newAgents = new Map(state.agents);
      newAgents.delete(agentId);

      const newLogs = new Map(state.logs);
      newLogs.delete(agentId);

      return {
        agents: newAgents,
        logs: newLogs,
        selectedAgentId: state.selectedAgentId === agentId ? null : state.selectedAgentId,
      };
    });
  },

  addLog: (agentId: string, log: LogEntry) => {
    set((state) => {
      const newLogs = new Map(state.logs);
      const currentLogs = newLogs.get(agentId) || [];
      newLogs.set(agentId, [...currentLogs, log]);
      return { logs: newLogs };
    });
  },

  clearLogs: (agentId: string) => {
    set((state) => {
      const newLogs = new Map(state.logs);
      newLogs.delete(agentId);
      return { logs: newLogs };
    });
  },

  getLogsForAgent: (agentId: string) => {
    return get().logs.get(agentId) || [];
  },

  clearError: () => {
    set({ error: null });
  },
}));

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * テスト用: ストアを初期状態にリセット
 */
export function resetSharedAgentStore(): void {
  useSharedAgentStore.setState({
    agents: new Map(),
    selectedAgentId: null,
    logs: new Map(),
    isLoading: false,
    error: null,
  });
}

/**
 * テスト用: ストアの現在の状態を取得
 */
export function getSharedAgentStore(): SharedAgentStore {
  return useSharedAgentStore.getState();
}
