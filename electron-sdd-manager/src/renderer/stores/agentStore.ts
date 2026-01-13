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
  // Skip permissions flag for claude CLI (--dangerously-skip-permissions)
  // Per-project, in-memory only, default OFF
  skipPermissions: boolean;
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
    group?: 'doc' | 'impl',
    sessionId?: string
  ) => Promise<string | null>;
  stopAgent: (agentId: string) => Promise<void>;
  resumeAgent: (agentId: string, prompt?: string) => Promise<void>;
  removeAgent: (agentId: string) => Promise<void>;
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
  getSelectedAgent: () => AgentInfo | undefined;
  getAgentsForSpec: (specId: string) => AgentInfo[];
  getProjectAgents: () => AgentInfo[];
  // Bug fix: Zustand無限ループ回避のため、セレクタ内で使用可能な純粋関数を追加
  findAgentById: (agentId: string | null) => AgentInfo | undefined;
  clearError: () => void;

  // Task 5.2.4 (sidebar-refactor): プロジェクトエージェントパネルへの遷移
  selectForProjectAgents: () => void;

  // Skip permissions control
  setSkipPermissions: (enabled: boolean) => void;
  // Bug fix: persist-skip-permission-per-project
  loadSkipPermissions: (projectPath: string) => Promise<void>;
}

type AgentStore = AgentState & AgentActions;

export const useAgentStore = create<AgentStore>((set, get) => ({
  // Initial state (Task 29.1)
  agents: new Map<string, AgentInfo[]>(),
  selectedAgentId: null,
  logs: new Map<string, LogEntry[]>(),
  isLoading: false,
  error: null,
  skipPermissions: false,

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

      // 重複チェック: 既存のagentIdがあれば更新、なければ追加
      const existingIndex = existingAgents.findIndex((a) => a.agentId === agent.agentId);
      if (existingIndex >= 0) {
        // 既存のAgentを更新
        const updatedAgents = [...existingAgents];
        updatedAgents[existingIndex] = agent;
        newAgents.set(specId, updatedAgents);
      } else {
        // 新規追加
        newAgents.set(specId, [...existingAgents, agent]);
      }

      return { agents: newAgents };
    });
  },

  startAgent: async (
    specId: string,
    phase: string,
    command: string,
    args: string[],
    group?: 'doc' | 'impl',
    sessionId?: string
  ): Promise<string | null> => {
    try {
      // Get skipPermissions from current state
      const { skipPermissions } = get();
      const newAgent = await window.electronAPI.startAgent(
        specId,
        phase,
        command,
        args,
        group,
        sessionId,
        skipPermissions
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

  resumeAgent: async (agentId: string, prompt?: string) => {
    try {
      // ユーザー入力をログに追加（API呼び出し前に表示）
      if (prompt) {
        const inputLogEntry: LogEntry = {
          id: `stdin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          stream: 'stdin',
          data: prompt,
          timestamp: Date.now(),
        };
        get().appendLog(agentId, inputLogEntry);
      }

      // Get skipPermissions from current state (same as startAgent)
      const { skipPermissions } = get();
      const resumedAgent = await window.electronAPI.resumeAgent(agentId, prompt, skipPermissions);

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

  removeAgent: async (agentId: string) => {
    // Find the specId for this agent
    const state = get();
    let targetSpecId: string | null = null;
    for (const [specId, agentList] of state.agents) {
      const found = agentList.find((a) => a.agentId === agentId);
      if (found) {
        targetSpecId = specId;
        break;
      }
    }

    // Delete from file system first (if we found the agent)
    if (targetSpecId !== null) {
      try {
        await window.electronAPI.deleteAgent(targetSpecId, agentId);
        console.log('[agentStore] Agent record deleted from file system', { specId: targetSpecId, agentId });
      } catch (error) {
        console.error('[agentStore] Failed to delete agent record', { agentId, error });
        // Continue with UI deletion even if file deletion fails
        // The file watcher will handle cleanup if needed
      }
    }

    // Remove from UI state
    set((currentState) => {
      const newAgents = new Map(currentState.agents);
      const newLogs = new Map(currentState.logs);

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
      const newSelectedAgentId = currentState.selectedAgentId === agentId ? null : currentState.selectedAgentId;

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
    // Bug fix: spec-agent-list-not-updating-on-auto-execution
    // Simplified to match specsWatcherService/bugsWatcherService pattern:
    // Receive only event info (type, specId, agentId), then fetch full data via loadAgents()
    // This avoids file read timing issues in the main process
    const cleanupRecordChanged = window.electronAPI.onAgentRecordChanged(
      (type: 'add' | 'change' | 'unlink', eventInfo: { agentId?: string; specId?: string }) => {
        console.log('[agentStore] Agent record changed', { type, eventInfo });

        const { agentId, specId } = eventInfo;
        // specId can be empty string for global agents, so check for undefined
        if (!agentId || specId === undefined) {
          console.warn('[agentStore] Invalid event info, missing agentId or specId');
          return;
        }

        if (type === 'unlink') {
          // ファイル削除時はAgentをストアから削除
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
        } else {
          // add/change時はloadAgents()で全データを再取得
          // これにより、ファイル書き込みタイミングの問題を回避
          get().loadAgents().then(() => {
            // 新規追加時のみ自動選択（File as SSOT: WorkflowViewからの直接呼び出しを廃止）
            // Bug fix: agent-selection-scope-mismatch - 選択中のspec/bugと一致する場合のみ自動選択
            if (type === 'add') {
              // Project Agent（specId=''）は常に自動選択
              if (specId === '') {
                get().selectAgent(agentId);
              } else {
                // Spec/Bug Agentは選択中のspec/bugと一致する場合のみ自動選択
                // Dynamic import to avoid circular dependency
                import('./specStore').then(({ useSpecStore }) => {
                  const { selectedSpec } = useSpecStore.getState();
                  // Bug agents use 'bug:{bugName}' format
                  if (specId.startsWith('bug:')) {
                    import('./bugStore').then(({ useBugStore }) => {
                      const { selectedBug } = useBugStore.getState();
                      const expectedSpecId = selectedBug ? `bug:${selectedBug.name}` : '';
                      if (specId === expectedSpecId) {
                        get().selectAgent(agentId);
                      }
                    });
                  } else if (selectedSpec && specId === selectedSpec.name) {
                    get().selectAgent(agentId);
                  }
                });
              }
            }
          });
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

  // Bug fix: agent-log-textfield-inactive
  // selectedAgentIdに対応するAgentInfoを返す
  // セレクタとして使用することで、agents Map変更時に正しく再レンダリングされる
  getSelectedAgent: () => {
    const { selectedAgentId, agents } = get();
    if (!selectedAgentId) return undefined;
    for (const agentList of agents.values()) {
      const found = agentList.find((a) => a.agentId === selectedAgentId);
      if (found) return found;
    }
    return undefined;
  },

  getAgentsForSpec: (specId: string) => {
    return get().agents.get(specId) || [];
  },

  // Bug fix: Zustand無限ループ回避のため、セレクタ内で使用可能な純粋関数
  // getAgentByIdとは異なり、stateを引数として受け取ることでセレクタ内で安全に使用可能
  findAgentById: (agentId: string | null) => {
    if (!agentId) return undefined;
    const state = get();
    for (const agentList of state.agents.values()) {
      const found = agentList.find((a) => a.agentId === agentId);
      if (found) return found;
    }
    return undefined;
  },

  // Task 4.1 (sidebar-refactor): プロジェクトエージェント取得
  // specIdが空文字列のエージェントをプロジェクトエージェントとして返す
  getProjectAgents: () => {
    return get().agents.get('') || [];
  },

  clearError: () => {
    set({ error: null });
  },

  // Task 5.2.4 (sidebar-refactor): プロジェクトエージェントパネルへの遷移
  // specId=''のエージェントを選択可能な状態にする
  selectForProjectAgents: () => {
    // プロジェクトエージェント（specId=''）を選択対象として設定
    // selectedAgentIdをnullにリセットして、ProjectAgentPanelにフォーカスを移す
    set({ selectedAgentId: null });
  },

  // Skip permissions control
  // Sets the --dangerously-skip-permissions flag for claude CLI
  // Bug fix: persist-skip-permission-per-project - Persist to sdd-orchestrator.json
  setSkipPermissions: async (enabled: boolean) => {
    set({ skipPermissions: enabled });

    // Persist to project config file
    // Dynamic import to avoid circular dependency
    const { useProjectStore } = await import('./projectStore');
    const currentProject = useProjectStore.getState().currentProject;
    if (currentProject) {
      try {
        await window.electronAPI.saveSkipPermissions(currentProject, enabled);
      } catch (error) {
        console.error('[agentStore] Failed to save skipPermissions:', error);
      }
    }
  },

  // Load skipPermissions from project config file
  // Bug fix: persist-skip-permission-per-project
  loadSkipPermissions: async (projectPath: string) => {
    try {
      const skipPermissions = await window.electronAPI.loadSkipPermissions(projectPath);
      set({ skipPermissions });
      console.log('[agentStore] Loaded skipPermissions:', skipPermissions);
    } catch (error) {
      console.error('[agentStore] Failed to load skipPermissions:', error);
      // Default to false on error
      set({ skipPermissions: false });
    }
  },
}));
