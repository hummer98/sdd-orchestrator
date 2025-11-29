/**
 * Agent Store
 * UI層でのAgent状態管理
 * Requirements: 5.1-5.8, 9.1-9.10
 */

import { create } from 'zustand';
import type { LogEntry } from '../types';
import type { AgentStatus as AgentStatusType } from '../types/electron.d';

// Re-export types for use in tests and components
export type AgentStatus = AgentStatusType;

export interface AgentInfo {
  readonly agentId: string;
  readonly specId: string;
  readonly phase: string;
  readonly pid: number;
  readonly sessionId: string;
  readonly status: AgentStatus;
  readonly startedAt: string;
  readonly lastActivityAt: string;
  readonly command: string;
}

export type { LogEntry };

interface AgentState {
  agents: Map<string, AgentInfo[]>; // specId -> AgentInfo[]
  selectedAgentId: string | null;
  logs: Map<string, LogEntry[]>; // agentId -> logs
  isLoading: boolean;
  error: string | null;
}

interface AgentActions {
  // Task 29.2: Agent操作アクション
  loadAgents: () => Promise<void>;
  selectAgent: (agentId: string | null) => Promise<void>;
  loadAgentLogs: (specId: string, agentId: string) => Promise<void>;
  addAgent: (specId: string, agent: AgentInfo) => void;
  startAgent: (
    specId: string,
    phase: string,
    command: string,
    args: string[],
    group?: 'doc' | 'validate' | 'impl',
    sessionId?: string
  ) => Promise<string | null>;
  stopAgent: (agentId: string) => Promise<void>;
  resumeAgent: (agentId: string) => Promise<void>;
  removeAgent: (agentId: string) => void;
  sendInput: (agentId: string, input: string) => Promise<void>;
  updateAgentStatus: (agentId: string, status: AgentStatus) => void;

  // Task 29.3: ログ管理
  appendLog: (agentId: string, entry: LogEntry) => void;
  clearLogs: (agentId: string) => void;
  getLogsForAgent: (agentId: string) => LogEntry[];

  // Task 29.4: イベントリスナー設定
  setupEventListeners: () => () => void;

  // Helper methods
  getAgentById: (agentId: string) => AgentInfo | undefined;
  getAgentsForSpec: (specId: string) => AgentInfo[];
  clearError: () => void;
}

type AgentStore = AgentState & AgentActions;

export const useAgentStore = create<AgentStore>((set, get) => ({
  // Initial state (Task 29.1)
  agents: new Map<string, AgentInfo[]>(),
  selectedAgentId: null,
  logs: new Map<string, LogEntry[]>(),
  isLoading: false,
  error: null,

  // Task 29.2: Agent操作アクション
  // Requirements: 5.1-5.8

  loadAgents: async () => {
    set({ isLoading: true, error: null });

    try {
      const agentsRecord = await window.electronAPI.getAllAgents();
      const agentsMap = new Map<string, AgentInfo[]>();

      // Record<string, AgentInfo[]> を Map に変換
      for (const [specId, agentList] of Object.entries(agentsRecord)) {
        agentsMap.set(specId, agentList as AgentInfo[]);
      }

      set({
        agents: agentsMap,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Agentの読み込みに失敗しました',
        isLoading: false,
      });
    }
  },

  selectAgent: async (agentId: string | null) => {
    set({ selectedAgentId: agentId });

    // Load logs for the selected agent if not already loaded
    if (agentId) {
      const state = get();
      const existingLogs = state.logs.get(agentId);

      // If logs are not already loaded, fetch them from the file
      if (!existingLogs || existingLogs.length === 0) {
        const agent = state.getAgentById(agentId);
        if (agent) {
          await state.loadAgentLogs(agent.specId, agentId);
        }
      }
    }
  },

  loadAgentLogs: async (specId: string, agentId: string) => {
    try {
      console.log('[agentStore] Loading agent logs', { specId, agentId });
      const logs = await window.electronAPI.getAgentLogs(specId, agentId);

      // Convert file logs to LogEntry format
      const logEntries: LogEntry[] = logs.map((log, index) => ({
        id: `${agentId}-${index}-${log.timestamp}`,
        stream: log.stream,
        data: log.data,
        timestamp: new Date(log.timestamp).getTime(),
      }));

      set((state) => {
        const newLogs = new Map(state.logs);
        newLogs.set(agentId, logEntries);
        return { logs: newLogs };
      });

      console.log('[agentStore] Loaded agent logs', { specId, agentId, count: logEntries.length });
    } catch (error) {
      console.error('[agentStore] Failed to load agent logs', { specId, agentId, error });
      // Don't set error state - just log the error, as this is a non-critical feature
    }
  },

  addAgent: (specId: string, agent: AgentInfo) => {
    set((state) => {
      const newAgents = new Map(state.agents);
      const existingAgents = newAgents.get(specId) || [];
      newAgents.set(specId, [...existingAgents, agent]);
      return { agents: newAgents };
    });
  },

  startAgent: async (
    specId: string,
    phase: string,
    command: string,
    args: string[],
    group?: 'doc' | 'validate' | 'impl',
    sessionId?: string
  ): Promise<string | null> => {
    try {
      const newAgent = await window.electronAPI.startAgent(
        specId,
        phase,
        command,
        args,
        group,
        sessionId
      );

      const agentId = (newAgent as AgentInfo).agentId;

      set((state) => {
        const newAgents = new Map(state.agents);
        const existingAgents = newAgents.get(specId) || [];
        newAgents.set(specId, [...existingAgents, newAgent as AgentInfo]);

        return { agents: newAgents, selectedAgentId: agentId };
      });

      return agentId;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Agentの起動に失敗しました',
      });
      return null;
    }
  },

  stopAgent: async (agentId: string) => {
    try {
      await window.electronAPI.stopAgent(agentId);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Agentの停止に失敗しました',
      });
    }
  },

  resumeAgent: async (agentId: string) => {
    try {
      const resumedAgent = await window.electronAPI.resumeAgent(agentId);

      set((state) => {
        const newAgents = new Map(state.agents);

        // 全てのspecから該当するagentを探して更新
        for (const [specId, agentList] of newAgents) {
          const updatedList = agentList.map((agent) =>
            agent.agentId === agentId ? (resumedAgent as AgentInfo) : agent
          );
          newAgents.set(specId, updatedList);
        }

        return { agents: newAgents };
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Agentの再開に失敗しました',
      });
    }
  },

  removeAgent: (agentId: string) => {
    set((state) => {
      const newAgents = new Map(state.agents);
      const newLogs = new Map(state.logs);

      // 全てのspecから該当するagentを削除
      for (const [specId, agentList] of newAgents) {
        const filteredList = agentList.filter((agent) => agent.agentId !== agentId);
        if (filteredList.length !== agentList.length) {
          newAgents.set(specId, filteredList);
        }
      }

      // ログも削除
      newLogs.delete(agentId);

      // 選択中のAgentが削除された場合はnullに
      const newSelectedAgentId = state.selectedAgentId === agentId ? null : state.selectedAgentId;

      return { agents: newAgents, logs: newLogs, selectedAgentId: newSelectedAgentId };
    });
  },

  sendInput: async (agentId: string, input: string) => {
    try {
      await window.electronAPI.sendAgentInput(agentId, input);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '入力の送信に失敗しました',
      });
    }
  },

  updateAgentStatus: (agentId: string, status: AgentStatus) => {
    set((state) => {
      const newAgents = new Map(state.agents);

      // 全てのspecから該当するagentを探して更新
      for (const [specId, agentList] of newAgents) {
        const updatedList = agentList.map((agent) =>
          agent.agentId === agentId ? { ...agent, status } : agent
        );
        newAgents.set(specId, updatedList);
      }

      return { agents: newAgents };
    });
  },

  // Task 29.3: ログ管理
  // Requirements: 9.1-9.10

  appendLog: (agentId: string, entry: LogEntry) => {
    set((state) => {
      const newLogs = new Map(state.logs);
      const existingLogs = newLogs.get(agentId) || [];
      newLogs.set(agentId, [...existingLogs, entry]);

      return { logs: newLogs };
    });
  },

  clearLogs: (agentId: string) => {
    set((state) => {
      const newLogs = new Map(state.logs);
      newLogs.set(agentId, []);

      return { logs: newLogs };
    });
  },

  getLogsForAgent: (agentId: string) => {
    return get().logs.get(agentId) || [];
  },

  // Task 29.4: イベントリスナー設定
  // Requirements: 9.1, 5.2

  setupEventListeners: () => {
    console.log('[agentStore] Setting up event listeners');

    // Agent出力イベントリスナー
    const cleanupOutput = window.electronAPI.onAgentOutput(
      (agentId: string, stream: 'stdout' | 'stderr', data: string) => {
        console.log('[agentStore] Received agent output', { agentId, stream, dataLength: data.length });
        const entry: LogEntry = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          stream,
          data,
          timestamp: Date.now(),
        };
        get().appendLog(agentId, entry);
      }
    );

    // Agentステータス変更イベントリスナー
    const cleanupStatus = window.electronAPI.onAgentStatusChange(
      (agentId: string, status: AgentStatus) => {
        get().updateAgentStatus(agentId, status);
      }
    );

    // Agent Record変更イベントリスナー（ファイル監視）
    const cleanupRecordChanged = window.electronAPI.onAgentRecordChanged(
      (type: 'add' | 'change' | 'unlink', agent: AgentInfo | { agentId?: string; specId?: string }) => {
        console.log('[agentStore] Agent record changed', { type, agent });

        if (type === 'unlink') {
          // ファイル削除時はAgentをストアから削除
          const { agentId, specId } = agent as { agentId?: string; specId?: string };
          if (agentId && specId) {
            const state = get();
            const agents = state.agents.get(specId);
            if (agents) {
              const filtered = agents.filter((a) => a.agentId !== agentId);
              const newAgents = new Map(state.agents);
              if (filtered.length > 0) {
                newAgents.set(specId, filtered);
              } else {
                newAgents.delete(specId);
              }
              set({ agents: newAgents });
            }
          }
        } else {
          // add/change時はAgentを追加/更新
          const agentInfo = agent as AgentInfo;
          if (agentInfo.agentId && agentInfo.specId) {
            get().addAgent(agentInfo.specId, agentInfo);
          }
        }
      }
    );

    // クリーンアップ関数を返す
    return () => {
      cleanupOutput();
      cleanupStatus();
      cleanupRecordChanged();
    };
  },

  // Helper methods

  getAgentById: (agentId: string) => {
    const state = get();
    for (const agentList of state.agents.values()) {
      const agent = agentList.find((a) => a.agentId === agentId);
      if (agent) {
        return agent;
      }
    }
    return undefined;
  },

  getAgentsForSpec: (specId: string) => {
    return get().agents.get(specId) || [];
  },

  clearError: () => {
    set({ error: null });
  },
}));
