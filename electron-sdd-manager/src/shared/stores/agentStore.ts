/**
 * Shared agentStore
 *
 * agent-store-unification: Single Source of Truth for Agent state
 *
 * Data structure: Map<specId, AgentInfo[]>
 * - Key: specId (empty string '' for Project Agents)
 * - Value: Array of AgentInfo for that spec
 *
 * IPC依存を除去し、ApiClient経由でデータを取得する共有ストア。
 * Electron版とRemote UI版で同一storeを使用可能。
 */

import { create } from 'zustand';
import type { ApiClient, AgentInfo, AgentStatus, ParsedLogEntry } from '../api/types';

// Re-export types for convenience
export type { AgentInfo, AgentStatus, ParsedLogEntry };

// =============================================================================
// Types
// =============================================================================

export interface SharedAgentState {
  /**
   * Agent一覧: specId -> AgentInfo[]
   * agent-store-unification Task 1.1
   * Requirements: 1.1
   */
  agents: Map<string, AgentInfo[]>;
  /** 選択中のAgent ID */
  selectedAgentId: string | null;
  /**
   * Spec単位のAgent選択状態（オンメモリのみ）
   * agent-watcher-optimization Task 3.1
   * Requirements: 3.3, 3.5
   */
  selectedAgentIdBySpec: Map<string, string | null>;
  /**
   * Agent別のログ
   * main-process-log-parser Task 10.4
   * Requirements: 4.1 - ParsedLogEntry型に変更
   */
  logs: Map<string, ParsedLogEntry[]>;
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
  /**
   * IDでAgentを取得する（全specを走査）
   * agent-store-unification Task 1.3
   * Requirements: 1.3
   */
  getAgentById: (agentId: string) => AgentInfo | undefined;
  /**
   * Spec/Bug IDでAgentsを取得する
   * agent-store-unification Task 1.2
   * Requirements: 1.2
   */
  getAgentsForSpec: (specId: string) => AgentInfo[];
  /**
   * Agentを追加する
   * agent-store-unification Task 1.4
   * Requirements: 1.4
   */
  addAgent: (specId: string, agent: AgentInfo) => void;
  /**
   * Agentのステータスを更新する（全specを走査）
   * agent-store-unification Task 1.6
   * Requirements: 1.6
   */
  updateAgentStatus: (agentId: string, status: AgentStatus) => void;
  /**
   * Agentを削除する（全specから削除）
   * agent-store-unification Task 1.5
   * Requirements: 1.5
   */
  removeAgent: (agentId: string) => void;
  /**
   * ログを追加する
   * main-process-log-parser Task 10.4
   * Requirements: 4.2 - ParsedLogEntry型に変更
   */
  addLog: (agentId: string, log: ParsedLogEntry) => void;
  /** ログをクリアする */
  clearLogs: (agentId: string) => void;
  /**
   * 指定AgentのLogsを取得する
   * main-process-log-parser Task 10.4
   * Requirements: 4.1 - ParsedLogEntry[]型に変更
   */
  getLogsForAgent: (agentId: string) => ParsedLogEntry[];
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
// Helper functions
// =============================================================================

/**
 * 全specからAgentを検索
 * agent-store-unification: Map<specId, AgentInfo[]> 構造に対応
 */
function findAgentInAllSpecs(
  agents: Map<string, AgentInfo[]>,
  agentId: string
): { agent: AgentInfo; specId: string } | undefined {
  for (const [specId, agentList] of agents.entries()) {
    const agent = agentList.find((a) => a.id === agentId);
    if (agent) {
      return { agent, specId };
    }
  }
  return undefined;
}

/**
 * 全specから全Agentを取得
 */
function getAllAgents(agents: Map<string, AgentInfo[]>): AgentInfo[] {
  const allAgents: AgentInfo[] = [];
  for (const agentList of agents.values()) {
    allAgents.push(...agentList);
  }
  return allAgents;
}

// =============================================================================
// Store
// =============================================================================

export const useSharedAgentStore = create<SharedAgentStore>((set, get) => ({
  // Initial state
  // agent-store-unification Task 1.1: Map<specId, AgentInfo[]>
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
      // Convert flat array to Map<specId, AgentInfo[]>
      const agentMap = new Map<string, AgentInfo[]>();
      result.value.forEach((agent) => {
        const specId = agent.specId || '';
        const existing = agentMap.get(specId) || [];
        agentMap.set(specId, [...existing, agent]);
      });
      set({ agents: agentMap, isLoading: false });
    } else {
      set({ error: result.error.message, isLoading: false });
    }
  },

  selectAgent: (agentId: string | null) => {
    // agent-watcher-optimization Task 3.3: Save per-spec state when selecting
    if (agentId) {
      const found = findAgentInAllSpecs(get().agents, agentId);
      if (found) {
        const newMap = new Map(get().selectedAgentIdBySpec);
        newMap.set(found.specId, agentId);
        set({ selectedAgentId: agentId, selectedAgentIdBySpec: newMap });
        return;
      }
    }
    // When agentId is null or agent not found, just update selectedAgentId
    set({ selectedAgentId: agentId });
  },

  // agent-store-unification Task 1.3: 全specを走査して該当Agentを返す
  getAgentById: (agentId: string) => {
    const found = findAgentInAllSpecs(get().agents, agentId);
    return found?.agent;
  },

  // agent-store-unification Task 1.2: agents.get(specId) || []
  getAgentsForSpec: (specId: string) => {
    return get().agents.get(specId) || [];
  },

  // agent-store-unification Task 1.4: 該当specの配列に追加
  addAgent: (specId: string, agent: AgentInfo) => {
    set((state) => {
      const newAgents = new Map(state.agents);
      const existingAgents = newAgents.get(specId) || [];

      // 重複チェック: 既存のagentIdがあれば更新、なければ追加
      const existingIndex = existingAgents.findIndex((a) => a.id === agent.id);
      if (existingIndex >= 0) {
        // 既存のAgentを更新
        const updatedAgents = [...existingAgents];
        updatedAgents[existingIndex] = { ...agent, specId };
        newAgents.set(specId, updatedAgents);
      } else {
        // 新規追加
        newAgents.set(specId, [...existingAgents, { ...agent, specId }]);
      }

      return { agents: newAgents };
    });
  },

  // agent-store-unification Task 1.6: 全specから該当Agentを検索して更新
  updateAgentStatus: (agentId: string, status: AgentStatus) => {
    set((state) => {
      const found = findAgentInAllSpecs(state.agents, agentId);
      if (!found) return state;

      const newAgents = new Map(state.agents);
      const specAgents = newAgents.get(found.specId) || [];

      // Update the agent with new status and lastActivityAt
      const updatedAgents = specAgents.map((agent) =>
        agent.id === agentId
          ? { ...agent, status, lastActivityAt: new Date().toISOString() }
          : agent
      );
      newAgents.set(found.specId, updatedAgents);

      return { agents: newAgents };
    });
  },

  // agent-store-unification Task 1.5: 全specから該当Agentを削除
  removeAgent: (agentId: string) => {
    set((state) => {
      const found = findAgentInAllSpecs(state.agents, agentId);
      if (!found) return state;

      const newAgents = new Map(state.agents);
      const specAgents = newAgents.get(found.specId) || [];

      // Remove the agent, keep empty array (don't delete key)
      const filteredAgents = specAgents.filter((agent) => agent.id !== agentId);
      newAgents.set(found.specId, filteredAgents);

      const newLogs = new Map(state.logs);
      newLogs.delete(agentId);

      return {
        agents: newAgents,
        logs: newLogs,
        selectedAgentId: state.selectedAgentId === agentId ? null : state.selectedAgentId,
      };
    });
  },

  addLog: (agentId: string, log: ParsedLogEntry) => {
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
    const logs = get().logs.get(agentId) || [];
    // Bug fix: agent-log-stream-race-condition
    // Sort logs by timestamp to ensure correct order when file logs are merged with real-time logs
    // main-process-log-parser: ParsedLogEntry.timestamp is optional, so we need to handle undefined
    return [...logs].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
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
      const allAgents = getAllAgents(state.agents);
      const allRunningAgents = allAgents.filter((agent) => agent.status === 'running');

      if (allRunningAgents.length === 0) {
        // 実行中なし → 選択をクリア（Agentログエリア空）
        set({ selectedAgentId: null });
        return;
      }

      // 最新の実行中Agentを選択
      const sortedAgents = allRunningAgents.sort((a, b) => {
        const timeA = new Date(a.startedAt as string).getTime();
        const timeB = new Date(b.startedAt as string).getTime();
        return timeB - timeA; // Descending (newest first)
      });

      set({ selectedAgentId: sortedAgents[0].id });
      return;
    }

    // Case 2: spec/bugが選択されている
    const specAgents = state.agents.get(specId) || [];
    const runningAgents = specAgents.filter((agent) => agent.status === 'running');

    if (runningAgents.length === 0) {
      // 実行中なし → 選択をクリア（Agentログエリア空）
      set({ selectedAgentId: null });
      return;
    }

    // 最新の実行中Agentを選択
    const sortedAgents = runningAgents.sort((a, b) => {
      const timeA = new Date(a.startedAt as string).getTime();
      const timeB = new Date(b.startedAt as string).getTime();
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
