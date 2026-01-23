/**
 * AgentLogPanel Component (Electron Wrapper)
 *
 * Wrapper that connects Zustand agent store to the shared AgentLogPanel component.
 *
 * Requirements: 8.1, 8.2, 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { useMemo } from 'react';
import { useAgentStore, type LogEntry } from '../stores/agentStore';
import { AgentLogPanel as SharedAgentLogPanel, type AgentLogInfo } from '@shared/components/agent';
import { useHumanActivity } from '../hooks/useHumanActivity';

// Bug fix: Zustand無限ループ回避のため、空配列を定数化して参照安定性を確保
const EMPTY_LOGS: LogEntry[] = [];

export function AgentLogPanel() {
  const selectedAgentId = useAgentStore((state) => state.selectedAgentId);
  const clearLogs = useAgentStore((state) => state.clearLogs);
  const { recordActivity } = useHumanActivity();

  // Bug fix: logs Mapの変更を購読することで、リアルタイムログ更新を実現
  // Bug fix: 空配列を定数化することで、|| []による毎回の新規配列生成を防ぐ
  // Bug fix: agent-log-stream-race-condition - getLogsForAgentを使用してソート済みログを取得
  const logs = useAgentStore((state) => {
    if (!state.selectedAgentId) return EMPTY_LOGS;
    return state.getLogsForAgent(state.selectedAgentId);
  });

  // Bug fix: getSnapshot無限ループ回避
  // agentsマップを直接サブスクライブし、useMemoでagentを導出
  const agents = useAgentStore((state) => state.agents);
  const agent = useMemo(() => {
    if (!selectedAgentId) return undefined;
    for (const agentList of agents.values()) {
      const found = agentList.find((a) => a.agentId === selectedAgentId);
      if (found) return found;
    }
    return undefined;
  }, [selectedAgentId, agents]);

  // Convert to shared AgentLogInfo format
  const agentLogInfo: AgentLogInfo | undefined = useMemo(() => {
    if (!agent) return undefined;
    return {
      agentId: agent.agentId,
      sessionId: agent.sessionId,
      phase: agent.phase,
      status: agent.status,
      command: agent.command,
    };
  }, [agent]);

// Clear logs handler
  const handleClear = () => {
    if (selectedAgentId) {
      clearLogs(selectedAgentId);
    }
  };

  return (
    <SharedAgentLogPanel
      agent={agentLogInfo}
      logs={logs}
      showTokens={true}
      showSessionId={true}
      onClear={handleClear}
      onActivity={recordActivity}
    />
  );
}
