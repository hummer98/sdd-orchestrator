/**
 * AgentLogPanel Component
 * Displays logs for the selected SDD Agent with virtual scrolling
 * Task 31.1-31.2: Agent log display and operations
 * Requirements: 9.1, 9.2, 9.4, 9.7, 9.8, 9.9, 9.10
 */

import { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Terminal, Copy, Trash2, Loader2 } from 'lucide-react';
import { useAgentStore } from '../stores/agentStore';
import { clsx } from 'clsx';

export function AgentLogPanel() {
  const { selectedAgentId, clearLogs, getLogsForAgent, getAgentById } = useAgentStore();

  const logs = selectedAgentId ? getLogsForAgent(selectedAgentId) : [];
  const agent = selectedAgentId ? getAgentById(selectedAgentId) : undefined;
  const isRunning = agent?.status === 'running';

  const parentRef = useRef<HTMLDivElement>(null);

  // Virtual scrolling for performance with large logs
  const virtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 24,
    overscan: 10,
  });

  // Auto-scroll to bottom when new logs arrive (Task 31.2: 9.10)
  useEffect(() => {
    if (logs.length > 0 && parentRef.current) {
      virtualizer.scrollToIndex(logs.length - 1, { align: 'end' });
    }
  }, [logs.length, virtualizer]);

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
    <div className="flex flex-col h-full bg-gray-900">
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
            </>
          )}
          {isRunning && (
            <Loader2
              className="w-4 h-4 text-blue-400 animate-spin"
              data-testid="running-indicator"
            />
          )}
        </div>

        <div className="flex items-center gap-2">
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
        ref={parentRef}
        className="flex-1 overflow-auto font-mono text-sm"
      >
        {!selectedAgentId ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Agentを選択してください
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            ログがありません
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const log = logs[virtualItem.index];
              return (
                <div
                  key={log.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  className={clsx(
                    'px-4 py-0.5 whitespace-pre-wrap break-all',
                    log.stream === 'stderr'
                      ? 'text-red-400 bg-red-900/20'
                      : 'text-gray-300'
                  )}
                >
                  {log.data}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
