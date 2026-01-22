/**
 * AgentLogPanel Component
 * Displays logs for the selected SDD Agent using shared log display components
 *
 * Task 3.1-3.3: RAW mode removal, use LogEntryBlock, maintain existing features
 * Requirements: 8.1, 8.2, 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { useRef, useEffect, useMemo } from 'react';
import { Terminal, Copy, Trash2, Loader2, BarChart3 } from 'lucide-react';
import { useAgentStore, type LogEntry } from '../stores/agentStore';
import { clsx } from 'clsx';
import { parseLogData, type ParsedLogEntry } from '@shared/utils/logFormatter';
import { LogEntryBlock } from '@shared/components/agent';
import { aggregateTokens } from '../utils/tokenAggregator';

// Bug fix: Zustand無限ループ回避のため、空配列を定数化して参照安定性を確保
const EMPTY_LOGS: LogEntry[] = [];

export function AgentLogPanel() {
  const selectedAgentId = useAgentStore((state) => state.selectedAgentId);
  const clearLogs = useAgentStore((state) => state.clearLogs);
  // Bug fix: logs Mapの変更を購読することで、リアルタイムログ更新を実現
  // getLogsForAgent関数呼び出しでは購読されないため、セレクタで直接logsを参照
  // Bug fix: 空配列を定数化することで、|| []による毎回の新規配列生成を防ぐ
  const logs = useAgentStore((state) => {
    if (!state.selectedAgentId) return EMPTY_LOGS;
    return state.logs.get(state.selectedAgentId) ?? EMPTY_LOGS;
  });
  // Bug fix: getSnapshot無限ループ回避
  // agentsマップを直接サブスクライブし、useMemoでagentを導出
  // findAgentByIdは毎回新しいオブジェクトを返すため使用しない
  const agents = useAgentStore((state) => state.agents);
  const agent = useMemo(() => {
    if (!selectedAgentId) return undefined;
    for (const agentList of agents.values()) {
      const found = agentList.find((a) => a.agentId === selectedAgentId);
      if (found) return found;
    }
    return undefined;
  }, [selectedAgentId, agents]);
  const isRunning = agent?.status === 'running';

  // Aggregate tokens from logs
  const tokenUsage = useMemo(() => aggregateTokens(logs), [logs]);

  // Parse logs for display using new shared logFormatter
  const parsedEntries = useMemo<ParsedLogEntry[]>(() => {
    const entries: ParsedLogEntry[] = [];

    // Add command line as first entry if agent exists
    if (agent?.command) {
      entries.push({
        id: 'command-line',
        type: 'system',
        session: {
          cwd: agent.command,
        },
      });
    }

    // Parse each log entry
    logs.forEach((log, logIdx) => {
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
  }, [logs, agent?.command]);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive (Requirement 9.1)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [parsedEntries.length]);

  // Copy logs to clipboard (Requirement 9.2)
  const handleCopy = () => {
    const logText = logs.map((log) => log.data).join('\n');
    navigator.clipboard.writeText(logText);
  };

  // Clear logs (Requirement 9.3)
  const handleClear = () => {
    if (selectedAgentId) {
      clearLogs(selectedAgentId);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Agentログ
          </span>
          {agent && (
            <>
              <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {agent.phase}
              </span>
              <span className="text-sm text-gray-400 dark:text-gray-500">|</span>
              <span className="text-sm text-gray-500 dark:text-gray-500 font-mono flex items-center gap-1">
                {agent.agentId} - セッションID: {agent.sessionId}
                <button
                  onClick={() => navigator.clipboard.writeText(agent.sessionId)}
                  className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  title="セッションIDをコピー"
                  data-testid="copy-session-id"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </span>
            </>
          )}
          {/* Loading indicator (Requirement 9.5) */}
          {isRunning && (
            <Loader2
              className="w-4 h-4 text-blue-500 dark:text-blue-400 animate-spin"
              data-testid="running-indicator"
            />
          )}
          {/* Token usage display (Requirement 9.4) */}
          {tokenUsage.totalTokens > 0 && (
            <div
              className="flex items-center gap-1 ml-2 px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700/50 text-xs text-gray-600 dark:text-gray-400"
              data-testid="token-display"
            >
              <BarChart3 className="w-3 h-3" />
              <span>入力: {tokenUsage.inputTokens.toLocaleString()}</span>
              <span className="text-gray-400 dark:text-gray-600">|</span>
              <span>出力: {tokenUsage.outputTokens.toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Task 3.1: RAW toggle button removed - only formatted display */}
          {/* Actions */}
          <button
            onClick={handleCopy}
            disabled={logs.length === 0}
            className={clsx(
              'p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700',
              'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title="ログをコピー"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            disabled={logs.length === 0}
            className={clsx(
              'p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700',
              'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title="ログをクリア"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Log content - using shared LogEntryBlock components */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto text-sm p-3 bg-gray-50 dark:bg-gray-900"
      >
        {!selectedAgentId ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Agentを選択してください
          </div>
        ) : parsedEntries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            ログがありません
          </div>
        ) : (
          <div className="space-y-2">
            {parsedEntries.map((entry) => (
              <LogEntryBlock key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
