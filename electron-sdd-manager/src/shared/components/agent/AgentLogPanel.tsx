/**
 * AgentLogPanel Component
 *
 * Shared component for displaying agent logs.
 * Used by both Electron (renderer) and Remote UI.
 *
 * Features:
 * - Log parsing and display using LogEntryBlock
 * - Auto-scroll to bottom on new logs
 * - Header with phase, session ID, running indicator
 * - Optional token usage display
 * - Copy/Clear actions
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { Terminal, Copy, Trash2, Loader2, BarChart3 } from 'lucide-react';
import { clsx } from 'clsx';
import { parseLogData, type ParsedLogEntry } from '@shared/utils/logFormatter';
import { aggregateTokens, type TokenUsage } from '@shared/utils/tokenAggregator';
import { throttle } from '@shared/utils/throttle';
import { LogEntryBlock } from './LogEntryBlock';
import type { LogEntry, AgentStatus } from '@shared/api/types';
import type { ActivityEventType } from '../../../renderer/services/humanActivityTracker';

// =============================================================================
// Types
// =============================================================================

/**
 * Agent info required for log panel display
 */
export interface AgentLogInfo {
  /** Agent identifier */
  agentId: string;
  /** Session ID for grouping */
  sessionId?: string;
  /** Current phase name */
  phase: string;
  /** Agent status */
  status: AgentStatus;
  /** Command that started the agent */
  command?: string;
}

export interface AgentLogPanelProps {
  /** Agent information (undefined shows "select agent" message) */
  agent?: AgentLogInfo;
  /** Log entries to display */
  logs: LogEntry[];
  /** Show token usage in header (calculates from logs if true) */
  showTokens?: boolean;
  /** Pre-calculated token usage (if not provided, calculated from logs when showTokens=true) */
  tokenUsage?: TokenUsage;
  /** Callback when copy button clicked */
  onCopy?: () => void;
  /** Callback when clear button clicked */
  onClear?: () => void;
  /** Custom message when no agent selected */
  noAgentMessage?: string;
  /** Custom message when logs are empty */
  emptyLogsMessage?: string;
  /** Whether to show session ID in header */
  showSessionId?: boolean;
  /** Test ID for the component */
  testId?: string;
  /** Callback for human activity tracking (optional, Electron-only) */
  onActivity?: (eventType: ActivityEventType) => void;
}

// =============================================================================
// Component
// =============================================================================

export function AgentLogPanel({
  agent,
  logs,
  showTokens = false,
  tokenUsage: providedTokenUsage,
  onCopy,
  onClear,
  noAgentMessage = 'Agentを選択してください',
  emptyLogsMessage = 'ログがありません',
  showSessionId = true,
  testId = 'agent-log-panel',
  onActivity,
}: AgentLogPanelProps): React.ReactElement {
  const scrollRef = useRef<HTMLDivElement>(null);

  const isRunning = agent?.status === 'running';

  // Throttled scroll handler for activity tracking (250ms)
  const handleScroll = useMemo(
    () => onActivity
      ? throttle(() => onActivity('agent-log-scroll'), 250)
      : undefined,
    [onActivity]
  );

  // Calculate token usage from logs if showTokens is true and not provided
  const tokenUsage = useMemo(() => {
    if (!showTokens) return undefined;
    if (providedTokenUsage) return providedTokenUsage;
    return aggregateTokens(logs);
  }, [showTokens, providedTokenUsage, logs]);

  // Parse logs for display using shared logFormatter
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

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [parsedEntries.length]);

  // Default copy handler
  const handleCopy = () => {
    if (onCopy) {
      onCopy();
    } else {
      const logText = logs.map((log) => log.data).join('\n');
      navigator.clipboard.writeText(logText);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-gray-900" data-testid={testId}>
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
              {showSessionId && agent.sessionId && (
                <>
                  <span className="text-sm text-gray-400 dark:text-gray-500">|</span>
                  <span className="text-sm text-gray-500 dark:text-gray-500 font-mono flex items-center gap-1">
                    {agent.agentId} - セッションID: {agent.sessionId}
                    <button
                      onClick={() => navigator.clipboard.writeText(agent.sessionId || '')}
                      className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      title="セッションIDをコピー"
                      data-testid="copy-session-id"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </span>
                </>
              )}
            </>
          )}
          {/* Loading indicator */}
          {isRunning && (
            <Loader2
              className="w-4 h-4 text-blue-500 dark:text-blue-400 animate-spin"
              data-testid="running-indicator"
            />
          )}
          {/* Token usage display */}
          {tokenUsage && tokenUsage.totalTokens > 0 && (
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
          {/* Copy button */}
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
          {/* Clear button */}
          {onClear && (
            <button
              onClick={onClear}
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
          )}
        </div>
      </div>

      {/* Log content - using shared LogEntryBlock components */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto text-sm p-3 bg-gray-50 dark:bg-gray-900"
        onScroll={handleScroll}
      >
        {!agent ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            {noAgentMessage}
          </div>
        ) : parsedEntries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            {emptyLogsMessage}
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

export default AgentLogPanel;
