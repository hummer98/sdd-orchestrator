/**
 * AgentLogPanel Component (Electron Wrapper)
 *
 * Wrapper that connects Zustand agent store to the shared AgentLogPanel component.
 *
 * Requirements: 8.1, 8.2, 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { useEffect, useMemo } from 'react';
// main-process-log-parser Task 10.4: Changed LogEntry to ParsedLogEntry
import { useAgentStore } from '../stores/agentStore';
import { useSharedAgentStore } from '@shared/stores/agentStore';
import type { ParsedLogEntry } from '@shared/api/types';
import { useProjectStore } from '../stores/projectStore';
import { AgentLogPanel as SharedAgentLogPanel, type AgentLogInfo } from '@shared/components/agent';
import { useHumanActivity } from '../hooks/useHumanActivity';

// Bug fix: Zustand無限ループ回避のため、空配列を定数化して参照安定性を確保
// main-process-log-parser Task 10.4: Changed LogEntry to ParsedLogEntry
const EMPTY_LOGS: ParsedLogEntry[] = [];

export function AgentLogPanel() {
  // agent-facade-action-only Task 4.2: State reads from SSOT
  const selectedAgentId = useSharedAgentStore((state) => state.selectedAgentId);
  // Actions from facade
  const clearLogs = useAgentStore((state) => state.clearLogs);
  const ensureLogsLoaded = useAgentStore((state) => state.ensureLogsLoaded);

  // Refactoring: log-loading-separation
  // When a new agent is selected, ensure its logs are loaded
  // This separates the concern of "what to display" from "when to load"
  useEffect(() => {
    if (selectedAgentId) {
      ensureLogsLoaded(selectedAgentId);
    }
  }, [selectedAgentId, ensureLogsLoaded]);
  const currentProject = useProjectStore((state) => state.currentProject);
  const { recordActivity } = useHumanActivity();

  // agent-facade-action-only Task 4.2: Logs read from SSOT directly
  // Bug fix: getSnapshot無限ループ回避
  // セレクタ内でgetLogsForAgent()を呼ぶと毎回新しい配列が生成され無限ループになる
  // 代わりにlogs Mapを直接購読し、useMemoでソートする
  const rawLogs = useSharedAgentStore((state) => {
    if (!selectedAgentId) return EMPTY_LOGS;
    return state.logs.get(selectedAgentId) || EMPTY_LOGS;
  });

  // Bug fix: agent-log-stream-race-condition - ソートはuseMemo内で行う
  // main-process-log-parser Task 10.4: ParsedLogEntry.timestamp is optional
  const logs = useMemo(() => {
    if (rawLogs === EMPTY_LOGS || rawLogs.length === 0) return EMPTY_LOGS;
    return [...rawLogs].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
  }, [rawLogs]);

  // agent-facade-action-only Task 4.2: Agents read from SSOT
  // Bug fix: getSnapshot無限ループ回避
  // agentsマップを直接サブスクライブし、useMemoでagentを導出
  const agents = useSharedAgentStore((state) => state.agents);
  const agent = useMemo(() => {
    if (!selectedAgentId) return undefined;
    for (const agentList of agents.values()) {
      const found = agentList.find((a) => a.agentId === selectedAgentId);
      if (found) return found;
    }
    return undefined;
  }, [selectedAgentId, agents]);

  // Convert to shared AgentLogInfo format with log file path
  const agentLogInfo: AgentLogInfo | undefined = useMemo(() => {
    if (!agent) return undefined;

    // Build log file path using new runtime-agents-restructure structure
    // New structure: {projectPath}/.kiro/runtime/agents/{category}/{entityId}/logs/{agentId}.log
    let logFilePath: string | undefined;
    if (currentProject && agent.agentId) {
      // Determine category based on specId
      let category: 'specs' | 'bugs' | 'project';
      let entityId: string;

      if (agent.specId === '') {
        category = 'project';
        entityId = '';
      } else if (agent.specId.startsWith('bug:')) {
        category = 'bugs';
        entityId = agent.specId.substring(4); // Remove 'bug:' prefix
      } else {
        category = 'specs';
        entityId = agent.specId;
      }

      // Build path: {projectPath}/.kiro/runtime/agents/{category}/{entityId}/logs/{agentId}.log
      if (category === 'project') {
        logFilePath = `${currentProject}/.kiro/runtime/agents/project/logs/${agent.agentId}.log`;
      } else {
        logFilePath = `${currentProject}/.kiro/runtime/agents/${category}/${entityId}/logs/${agent.agentId}.log`;
      }
    }

    return {
      agentId: agent.agentId,
      sessionId: agent.sessionId,
      phase: agent.phase,
      status: agent.status,
      command: agent.command,
      logFilePath,
      // llm-stream-log-parser: Task 6.1 - Pass engineId for parser selection
      engineId: agent.engineId,
    };
  }, [agent, currentProject]);

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
