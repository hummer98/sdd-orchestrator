/**
 * AgentView Component
 *
 * Task 4.1-4.2: Agent制御・ログ表示UIを共通コンポーネントで実装
 *
 * Agent一覧表示、制御、ログ表示機能を提供。
 * AgentListItemを使用した一覧表示、LogEntryBlockを使用したログパネル。
 *
 * Requirements: 1.2, 7.1, 7.2, 7.3, 9.1
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Bot, Terminal } from 'lucide-react';
import { AgentList, type AgentItemInfo, type AgentItemStatus, LogEntryBlock } from '@shared/components/agent';
import { Spinner } from '@shared/components/ui/Spinner';
import { parseLogData, type ParsedLogEntry } from '@shared/utils/logFormatter';
import type { ApiClient, AgentInfo, AgentStatus, LogEntry } from '@shared/api/types';

// =============================================================================
// Types
// =============================================================================

export interface AgentViewProps {
  /** Spec ID to filter agents (optional, shows all if not provided) */
  specId?: string;
  /** API client instance */
  apiClient: ApiClient;
  /** Called when an agent is selected */
  onAgentSelected?: (agent: AgentInfo) => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

function mapAgentStatus(status: AgentStatus): AgentItemStatus {
  // agent-store-unification: Updated to match unified AgentStatus type
  // AgentStatus: 'running' | 'completed' | 'interrupted' | 'hang' | 'failed'
  switch (status) {
    case 'running':
      return 'running';
    case 'completed':
      return 'completed';
    case 'interrupted':
      return 'interrupted';
    case 'hang':
      return 'interrupted';
    case 'failed':
      return 'failed';
    default:
      return 'completed';
  }
}

function mapAgentInfoToItemInfo(agent: AgentInfo): AgentItemInfo {
  const startedAt = typeof agent.startedAt === 'number'
    ? new Date(agent.startedAt).toISOString()
    : agent.startedAt;
  const endedAt = agent.endedAt
    ? (typeof agent.endedAt === 'number' ? new Date(agent.endedAt).toISOString() : agent.endedAt)
    : startedAt;

  return {
    agentId: agent.id,
    sessionId: agent.specId,
    phase: agent.phase,
    status: mapAgentStatus(agent.status),
    startedAt,
    lastActivityAt: endedAt,
  };
}

// =============================================================================
// Component
// =============================================================================

export function AgentView({
  specId,
  apiClient,
  onAgentSelected,
}: AgentViewProps): React.ReactElement {
  // State
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [logs, setLogs] = useState<Map<string, LogEntry[]>>(new Map());

  // Load agents on mount
  useEffect(() => {
    let isMounted = true;

    async function loadAgents() {
      setIsLoading(true);
      const result = await apiClient.getAgents();

      if (!isMounted) return;

      if (result.ok) {
        const filteredAgents = specId
          ? result.value.filter((a) => a.specId === specId)
          : result.value;
        setAgents(filteredAgents);
      }

      setIsLoading(false);
    }

    loadAgents();

    return () => {
      isMounted = false;
    };
  }, [apiClient, specId]);

  // Subscribe to agent output
  useEffect(() => {
    const unsubscribe = apiClient.onAgentOutput((agentId, stream, data) => {
      setLogs((prev) => {
        const newLogs = new Map(prev);
        const agentLogs = newLogs.get(agentId) || [];
        newLogs.set(agentId, [
          ...agentLogs,
          {
            id: `${agentId}-${Date.now()}-${agentLogs.length}`,
            timestamp: Date.now(),
            stream,
            data,
          },
        ]);
        return newLogs;
      });
    });

    return unsubscribe;
  }, [apiClient]);

  // Subscribe to agent status changes
  useEffect(() => {
    const unsubscribe = apiClient.onAgentStatusChange((agentId, status) => {
      setAgents((prev) =>
        prev.map((agent) =>
          agent.id === agentId ? { ...agent, status } : agent
        )
      );
    });

    return unsubscribe;
  }, [apiClient]);

  // Load logs when agent is selected
  useEffect(() => {
    if (!selectedAgentId) return;
    // Capture in const with explicit type after null check
    const agentId: string = selectedAgentId;

    let isMounted = true;

    async function loadLogs() {
      const selectedAgent = agents.find((a) => a.id === agentId);
      if (!selectedAgent) return;

      const result = await apiClient.getAgentLogs(selectedAgent.specId ?? '', agentId);

      if (!isMounted) return;

      if (result.ok) {
        setLogs((prev) => {
          const newLogs = new Map(prev);
          newLogs.set(agentId, result.value);
          return newLogs;
        });
      }
    }

    loadLogs();

    return () => {
      isMounted = false;
    };
  }, [apiClient, selectedAgentId, agents]);

  // Handle agent selection
  const handleSelectAgent = useCallback(
    (agent: AgentInfo) => {
      setSelectedAgentId(agent.id);
      onAgentSelected?.(agent);
    },
    [onAgentSelected]
  );

  // Handle agent stop
  const handleStopAgent = useCallback(
    async (e: React.MouseEvent, agentId: string) => {
      e.stopPropagation();
      await apiClient.stopAgent(agentId);
    },
    [apiClient]
  );

  // Handle agent remove (from UI only)
  const handleRemoveAgent = useCallback(
    (e: React.MouseEvent, agentId: string) => {
      e.stopPropagation();
      setAgents((prev) => prev.filter((a) => a.id !== agentId));
      if (selectedAgentId === agentId) {
        setSelectedAgentId(null);
      }
    },
    [selectedAgentId]
  );

  // Get logs for selected agent
  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const selectedLogs = selectedAgentId ? logs.get(selectedAgentId) || [] : [];

  // Auto-scroll ref for log panel (Requirement 9.1)
  const scrollRef = useRef<HTMLDivElement>(null);

  // Parse logs for display using shared logFormatter
  const parsedEntries = useMemo<ParsedLogEntry[]>(() => {
    const entries: ParsedLogEntry[] = [];

    selectedLogs.forEach((log, logIdx) => {
      if (log.stream === 'stdin') {
        // stdin shows user input
        entries.push({
          id: `${log.id}-stdin-${logIdx}`,
          type: 'input',
          text: {
            content: log.data,
            role: 'user',
          },
        });
      } else if (log.stream === 'stderr') {
        // stderr is always shown as error
        entries.push({
          id: `${log.id}-stderr-${logIdx}`,
          type: 'error',
          result: {
            content: log.data,
            isError: true,
          },
        });
      } else {
        // Parse stdout as Claude stream-json
        const parsed = parseLogData(log.data);
        if (parsed.length === 0 && log.data.trim()) {
          // If no parsed output, show as text
          entries.push({
            id: `${log.id}-raw-${logIdx}`,
            type: 'text',
            text: {
              content: log.data,
              role: 'assistant',
            },
          });
        } else {
          parsed.forEach((entry, entryIdx) => {
            entries.push({
              ...entry,
              id: `${log.id}-${logIdx}-${entryIdx}`,
            });
          });
        }
      }
    });
    return entries;
  }, [selectedLogs]);

  // Auto-scroll to bottom when new logs arrive (Requirement 9.1)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [parsedEntries.length]);

  // Render loading state
  if (isLoading) {
    return (
      <div
        data-testid="agent-view-loading"
        className="flex items-center justify-center h-full p-8"
      >
        <Spinner size="lg" />
      </div>
    );
  }

  // Render empty state
  if (agents.length === 0) {
    return (
      <div
        data-testid="agent-empty-state"
        className="flex flex-col items-center justify-center h-full p-8 text-center"
      >
        <Bot className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">実行中のAgentはありません</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="agent-view">
      {/* Agent List */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 p-3">
        <AgentList
          agents={agents.map(mapAgentInfoToItemInfo)}
          selectedAgentId={selectedAgentId}
          onSelect={(agentId) => {
            const agent = agents.find(a => a.id === agentId);
            if (agent) handleSelectAgent(agent);
          }}
          onStop={(e, agentId) => handleStopAgent(e, agentId)}
          onRemove={(e, agentId) => handleRemoveAgent(e, agentId)}
          showHeader
          headerTitle="Agent"
        />
      </div>

      {/* Log Panel - using shared LogEntryBlock components */}
      {/* remote-ui-vanilla-removal: Added remote-log-viewer for E2E */}
      {selectedAgent && (
        <div data-testid="agent-log-panel" className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 p-3 border-b border-gray-200 dark:border-gray-700">
            <Terminal className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {selectedAgent.phase} - ログ
            </span>
          </div>
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-900 text-sm"
          >
            {parsedEntries.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">ログはまだありません</p>
            ) : (
              <div className="space-y-2">
                {parsedEntries.map((entry) => (
                  <LogEntryBlock key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AgentView;
