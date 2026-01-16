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
  /**
   * Spec単位のAgent選択状態（オンメモリのみ）
   * agent-watcher-optimization Task 3.1
   * Requirements: 3.3, 3.5
   */
  selectedAgentIdBySpec: Map<string, string | null>;
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

  // =============================================================================
  // agent-watcher-optimization: Spec単位選択状態管理
  // =============================================================================

  /**
   * Spec単位でAgent選択状態を保存
   * agent-watcher-optimization Task 3.1
   * Requirements: 3.3, 3.5
   */
  setSelectedAgentForSpec: (specId: string, agentId: string | null) => void;

  /**
   * Spec単位のAgent選択状態を取得
   * agent-watcher-optimization Task 3.1
   * Requirements: 3.3
   */
  getSelectedAgentForSpec: (specId: string) => string | null;

  /**
   * Spec選択時のAgent自動選択
   * Bug fix: agent-log-auto-select-rule
   *
   * 新しい自動選択ルール:
   * - specId === null (未選択状態): 全Agentから実行中の最新を選択。なければnull
   * - specId !== null (選択状態): そのspec/bugの実行中Agentから最新を選択。なければnull
   *
   * 実行中Agentを最優先し、なければAgentログエリアを空にする
   */
  autoSelectAgentForSpec: (specId: string | null) => void;
}

export type SharedAgentStore = SharedAgentState & SharedAgentActions;

// =============================================================================
// Store
// =============================================================================

export const useSharedAgentStore = create<SharedAgentStore>((set, get) => ({
  // Initial state
  agents: new Map(),
  selectedAgentId: null,
  selectedAgentIdBySpec: new Map(), // agent-watcher-optimization Task 3.1
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
    // agent-watcher-optimization Task 3.3: Save per-spec state when selecting
    if (agentId) {
      const agent = get().agents.get(agentId);
      if (agent) {
        const newMap = new Map(get().selectedAgentIdBySpec);
        newMap.set(agent.specId, agentId);
        set({ selectedAgentId: agentId, selectedAgentIdBySpec: newMap });
        return;
      }
    }
    // When agentId is null or agent not found, just update selectedAgentId
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

  // =============================================================================
  // agent-watcher-optimization: Spec単位選択状態管理
  // =============================================================================

  setSelectedAgentForSpec: (specId: string, agentId: string | null) => {
    set((state) => {
      const newMap = new Map(state.selectedAgentIdBySpec);
      newMap.set(specId, agentId);
      return { selectedAgentIdBySpec: newMap };
    });
  },

  getSelectedAgentForSpec: (specId: string) => {
    return get().selectedAgentIdBySpec.get(specId) ?? null;
  },

  autoSelectAgentForSpec: (specId: string | null) => {
    const state = get();

    // Bug fix: agent-log-auto-select-rule
    // 新しい自動選択ルール: 実行中Agentを最優先、なければAgentログエリアを空にする

    // Case 1: spec/bugが未選択（specId === null）
    if (specId === null) {
      // 全Agentから実行中のものを取得
      const allRunningAgents = Array.from(state.agents.values())
        .filter((agent) => agent.status === 'running');

      if (allRunningAgents.length === 0) {
        // 実行中なし → 選択をクリア（Agentログエリア空）
        set({ selectedAgentId: null });
        return;
      }

      // 最新の実行中Agentを選択
      const sortedAgents = allRunningAgents.sort((a, b) => {
        const timeA = new Date(a.startedAt).getTime();
        const timeB = new Date(b.startedAt).getTime();
        return timeB - timeA; // Descending (newest first)
      });

      set({ selectedAgentId: sortedAgents[0].id });
      return;
    }

    // Case 2: spec/bugが選択されている
    const specAgents = Array.from(state.agents.values()).filter(
      (agent) => agent.specId === specId
    );

    const runningAgents = specAgents.filter((agent) => agent.status === 'running');

    if (runningAgents.length === 0) {
      // 実行中なし → 選択をクリア（Agentログエリア空）
      set({ selectedAgentId: null });
      return;
    }

    // 最新の実行中Agentを選択
    const sortedAgents = runningAgents.sort((a, b) => {
      const timeA = new Date(a.startedAt).getTime();
      const timeB = new Date(b.startedAt).getTime();
      return timeB - timeA; // Descending (newest first)
    });

    const selectedAgentId = sortedAgents[0].id;

    // per-spec状態も更新
    const newMap = new Map(state.selectedAgentIdBySpec);
    newMap.set(specId, selectedAgentId);
    set({ selectedAgentId, selectedAgentIdBySpec: newMap });
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
    selectedAgentIdBySpec: new Map(), // agent-watcher-optimization Task 3.1
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
