/**
 * LogPanel Component
 * Displays execution logs with virtual scrolling
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8
 */

import { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Terminal, Copy, Trash2, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useExecutionStore, notify } from '../stores';
import { clsx } from 'clsx';

export function LogPanel() {
  const {
    isExecuting,
    logs,
    exitCode,
    executionTimeMs,
    clearLogs,
    copyLogs,
  } = useExecutionStore();

  const parentRef = useRef<HTMLDivElement>(null);

  // Virtual scrolling for performance with large logs
  const virtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 24,
    overscan: 10,
  });

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logs.length > 0 && parentRef.current) {
      virtualizer.scrollToIndex(logs.length - 1, { align: 'end' });
    }
  }, [logs.length, virtualizer]);

  const handleCopy = () => {
    copyLogs();
    notify.success('ログをコピーしました');
  };

  const handleClear = () => {
    clearLogs();
    notify.info('ログをクリアしました');
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">
            実行ログ
          </span>
          {isExecuting && (
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Execution result */}
          {exitCode !== null && (
            <div className="flex items-center gap-2 mr-4">
              {exitCode === 0 ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              <span
                className={clsx(
                  'text-xs',
                  exitCode === 0 ? 'text-green-400' : 'text-red-400'
                )}
              >
                終了コード: {exitCode}
              </span>
              {executionTimeMs !== null && (
                <span className="text-xs text-gray-500">
                  ({formatTime(executionTimeMs)})
                </span>
              )}
            </div>
          )}

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
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            実行ログがありません
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
