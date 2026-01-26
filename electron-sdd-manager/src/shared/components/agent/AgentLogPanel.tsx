/**
 * AgentLogPanel Component
 *
 * Shared component for displaying agent logs.
 * Used by both Electron (renderer) and Remote UI.
 *
 * llm-stream-log-parser Task 7.2: engineId propagation for parser selection and UI labels
 * Requirements: 4.1, 4.2
 *
 * Features:
 * - Log parsing and display using LogEntryBlock
 * - Auto-scroll to bottom on new logs
 * - Header with phase, session ID, running indicator
 * - Optional token usage display
 * - Copy/Clear actions
 * - Engine-specific parsing and display labels
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { Terminal, Copy, Trash2, Loader2, BarChart3 } from 'lucide-react';
import { clsx } from 'clsx';
import type { TokenUsage } from '@shared/utils/tokenAggregator';
import { throttle } from '@shared/utils/throttle';
import { useIncrementalLogParser } from '@shared/hooks/useIncrementalLogParser';
import { useIncrementalTokenAggregator } from '@shared/hooks/useIncrementalTokenAggregator';
import { LogEntryBlock } from './LogEntryBlock';
import type { LogEntry, AgentStatus } from '@shared/api/types';
import type { ActivityEventType } from '../../../renderer/services/humanActivityTracker';
import type { LLMEngineId } from '@shared/registry';

// =============================================================================
// Types
// =============================================================================

/**
 * Agent info required for log panel display
 * llm-stream-log-parser Task 7.2: Added engineId field
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
  /** Log file path for copy functionality */
  logFilePath?: string;
  /**
   * LLM engine ID for parser selection and UI labels
   * llm-stream-log-parser Task 7.2: engineId support
   * Requirements: 4.1, 4.2
   */
  engineId?: LLMEngineId;
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
  noAgentMessage = 'Select an Agent',
  emptyLogsMessage = 'No logs available',
  showSessionId = true,
  testId = 'agent-log-panel',
  onActivity,
}: AgentLogPanelProps): React.ReactElement {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  const isRunning = agent?.status === 'running';

  // Throttled scroll handler for activity tracking (250ms)
  const handleScroll = useMemo(
    () => onActivity
      ? throttle(() => onActivity('agent-log-scroll'), 250)
      : undefined,
    [onActivity]
  );

  // Performance fix: Incremental token aggregation
  // Only processes new logs instead of re-aggregating all logs on each update
  const calculatedTokenUsage = useIncrementalTokenAggregator(
    logs,
    showTokens && !providedTokenUsage
  );
  const tokenUsage = providedTokenUsage ?? calculatedTokenUsage;

  // Performance fix: Incremental log parsing
  // llm-stream-log-parser Task 7.2: Pass engineId for engine-specific parsing
  const parsedEntries = useIncrementalLogParser(logs, agent?.command, agent?.engineId);

  // Track if user is near bottom of scroll area
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const handleScrollEnd = () => {
      // Consider "near bottom" if within 50px of the bottom
      const threshold = 50;
      isNearBottomRef.current =
        scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight < threshold;
    };

    scrollEl.addEventListener('scroll', handleScrollEnd);
    return () => scrollEl.removeEventListener('scroll', handleScrollEnd);
  }, []);

  // Auto-scroll to bottom only when user is near bottom
  useEffect(() => {
    if (scrollRef.current && isNearBottomRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [parsedEntries.length]);

  // Copy handler - copies log file path if available, otherwise log content
  const handleCopy = () => {
    if (onCopy) {
      onCopy();
    } else if (agent?.logFilePath) {
      navigator.clipboard.writeText(agent.logFilePath);
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
            Agent Log
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
                    {agent.agentId} - Session: {agent.sessionId}
                    <button
                      onClick={() => navigator.clipboard.writeText(agent.sessionId || '')}
                      className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      title="Copy session ID"
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
              <span>Input: {tokenUsage.inputTokens.toLocaleString()}</span>
              <span className="text-gray-400 dark:text-gray-600">|</span>
              <span>Output: {tokenUsage.outputTokens.toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Copy button - copies log file path */}
          <button
            onClick={handleCopy}
            disabled={!agent?.logFilePath && logs.length === 0}
            className={clsx(
              'p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700',
              'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title={agent?.logFilePath ? 'Copy log file path' : 'Copy logs'}
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
              title="Clear logs"
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
