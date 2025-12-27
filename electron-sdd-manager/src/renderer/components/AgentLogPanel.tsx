/**
 * AgentLogPanel Component
 * Displays logs for the selected SDD Agent
 * Task 31.1-31.2: Agent log display and operations
 * Requirements: 9.1, 9.2, 9.4, 9.7, 9.8, 9.9, 9.10
 */

import { useRef, useEffect, useMemo, useState } from 'react';
import { Terminal, Copy, Trash2, Loader2, Code, FileText, BarChart3 } from 'lucide-react';
import { useAgentStore } from '../stores/agentStore';
import { clsx } from 'clsx';
import { formatLogData, getColorClass, getBgClass, type FormattedLogLine } from '../utils/logFormatter';
import { aggregateTokens } from '../utils/tokenAggregator';

interface DisplayLine {
  id: string;
  type: 'raw' | 'formatted';
  raw?: { data: string; stream: 'stdout' | 'stderr' | 'stdin' };
  formatted?: FormattedLogLine;
}

export function AgentLogPanel() {
  const { selectedAgentId, clearLogs, getLogsForAgent, getAgentById } = useAgentStore();
  const [isFormatted, setIsFormatted] = useState(true);

  const logs = selectedAgentId ? getLogsForAgent(selectedAgentId) : [];
  const agent = selectedAgentId ? getAgentById(selectedAgentId) : undefined;
  const isRunning = agent?.status === 'running';

  // Aggregate tokens from logs
  const tokenUsage = useMemo(() => aggregateTokens(logs), [logs]);

  // Format logs for display
  const displayLines = useMemo<DisplayLine[]>(() => {
    const lines: DisplayLine[] = [];

    // Add command line as first entry if agent exists
    if (agent?.command) {
      lines.push({
        id: 'command-line',
        type: 'formatted',
        formatted: {
          type: 'system',
          icon: '▶',
          label: 'コマンド',
          content: agent.command,
          color: 'cyan',
        },
      });
    }

    if (!isFormatted) {
      // Raw mode: show original data
      logs.forEach((log, idx) => {
        lines.push({
          id: `${log.id}-${idx}`,
          type: 'raw' as const,
          raw: { data: log.data, stream: log.stream },
        });
      });
      return lines;
    }

    // Formatted mode: parse and format
    logs.forEach((log, logIdx) => {
      if (log.stream === 'stdin') {
        // stdin shows user input with blue color
        lines.push({
          id: `${log.id}-stdin-${logIdx}`,
          type: 'formatted',
          formatted: {
            type: 'input',
            icon: '👤',
            label: 'ユーザー入力',
            content: log.data,
            color: 'blue',
          },
        });
      } else if (log.stream === 'stderr') {
        // stderr is always shown as-is with red color
        lines.push({
          id: `${log.id}-stderr-${logIdx}`,
          type: 'formatted',
          formatted: {
            type: 'error',
            icon: '⚠️',
            label: 'stderr',
            content: log.data,
            color: 'red',
          },
        });
      } else {
        // Parse stdout as Claude stream-json
        const formatted = formatLogData(log.data);
        if (formatted.length === 0) {
          // If no formatted output, show raw
          lines.push({
            id: `${log.id}-raw-${logIdx}`,
            type: 'raw',
            raw: { data: log.data, stream: log.stream },
          });
        } else {
          formatted.forEach((f, fIdx) => {
            lines.push({
              id: `${log.id}-${logIdx}-${fIdx}`,
              type: 'formatted',
              formatted: f,
            });
          });
        }
      }
    });
    return lines;
  }, [logs, isFormatted, agent?.command]);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive (Task 31.2: 9.10)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayLines.length]);

  // Copy logs to clipboard (Task 31.2: 9.7)
  const handleCopy = () => {
    const logText = logs.map((log) => log.data).join('\n');
    navigator.clipboard.writeText(logText);
  };

  // Clear logs (Task 31.2: 9.8)
  const handleClear = () => {
    if (selectedAgentId) {
      clearLogs(selectedAgentId);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">
            Agentログ
          </span>
          {agent && (
            <>
              <span className="text-sm text-gray-500">-</span>
              <span className="text-sm text-gray-400">
                {agent.phase}
              </span>
              <span className="text-sm text-gray-500">|</span>
              <span className="text-sm text-gray-500 font-mono flex items-center gap-1">
                {agent.agentId} - セッションID: {agent.sessionId}
                <button
                  onClick={() => navigator.clipboard.writeText(agent.sessionId)}
                  className="p-0.5 rounded hover:bg-gray-600 text-gray-500 hover:text-gray-300"
                  title="セッションIDをコピー"
                  data-testid="copy-session-id"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </span>
            </>
          )}
          {isRunning && (
            <Loader2
              className="w-4 h-4 text-blue-400 animate-spin"
              data-testid="running-indicator"
            />
          )}
          {/* Token usage display */}
          {tokenUsage.totalTokens > 0 && (
            <div
              className="flex items-center gap-1 ml-2 px-2 py-0.5 rounded bg-gray-700/50 text-xs text-gray-400"
              data-testid="token-display"
            >
              <BarChart3 className="w-3 h-3" />
              <span>入力: {tokenUsage.inputTokens.toLocaleString()}</span>
              <span className="text-gray-600">|</span>
              <span>出力: {tokenUsage.outputTokens.toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Format toggle */}
          <button
            onClick={() => setIsFormatted(!isFormatted)}
            className={clsx(
              'p-1.5 rounded',
              isFormatted
                ? 'bg-blue-600 text-white'
                : 'hover:bg-gray-700 text-gray-400 hover:text-gray-200'
            )}
            title={isFormatted ? '整形表示中 (クリックでRAW表示)' : 'RAW表示中 (クリックで整形表示)'}
          >
            {isFormatted ? (
              <FileText className="w-4 h-4" />
            ) : (
              <Code className="w-4 h-4" />
            )}
          </button>
          {/* Actions */}
          <button
            onClick={handleCopy}
            disabled={logs.length === 0}
            className={clsx(
              'p-1.5 rounded hover:bg-gray-700',
              'text-gray-400 hover:text-gray-200',
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
              'p-1.5 rounded hover:bg-gray-700',
              'text-gray-400 hover:text-gray-200',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title="ログをクリア"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Log content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto font-mono-jp text-sm"
      >
        {!selectedAgentId ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Agentを選択してください
          </div>
        ) : displayLines.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            ログがありません
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {displayLines.map((line) => (
              <div
                key={line.id}
                className={clsx(
                  'px-2 py-1 rounded',
                  line.type === 'raw'
                    ? line.raw?.stream === 'stderr'
                      ? 'text-red-400 bg-red-900/20'
                      : line.raw?.stream === 'stdin'
                        ? 'text-blue-400 bg-blue-900/20'
                        : 'text-gray-300'
                    : getBgClass(line.formatted!.type)
                )}
              >
                {line.type === 'raw' ? (
                  <span className="whitespace-pre-wrap break-all">
                    {line.raw?.data}
                  </span>
                ) : (
                  <FormattedLogLineDisplay line={line.formatted!} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FormattedLogLineDisplay({ line }: { line: FormattedLogLine }) {
  return (
    <div className={clsx('flex items-start gap-2', getColorClass(line.color))}>
      {line.icon && <span className="shrink-0">{line.icon}</span>}
      {line.label && (
        <span className="shrink-0 font-semibold">{line.label}:</span>
      )}
      <span className="whitespace-pre-wrap break-all flex-1">
        {line.content}
        {line.details && (
          <span className="text-gray-500 ml-2">{line.details}</span>
        )}
      </span>
    </div>
  );
}
