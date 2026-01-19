/**
 * SpecWorkflowFooter Component
 * Specワークフローフッター - 自動実行ボタン等のワークフロー全体操作
 */

import { clsx } from 'clsx';
import { Play, Square } from 'lucide-react';

export interface SpecWorkflowFooterProps {
  /** 自動実行中かどうか */
  isAutoExecuting: boolean;
  /** Agent実行中かどうか（自動実行ボタンの無効化判定用） */
  hasRunningAgents: boolean;
  /** 自動実行ボタンクリック時のハンドラ */
  onAutoExecution: () => void;
}

export function SpecWorkflowFooter({
  isAutoExecuting,
  hasRunningAgents,
  onAutoExecution,
}: SpecWorkflowFooterProps) {
  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
      <button
        data-testid="auto-execute-button"
        onClick={onAutoExecution}
        disabled={!isAutoExecuting && hasRunningAgents}
        className={clsx(
          'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded',
          'font-medium transition-colors',
          isAutoExecuting
            ? 'bg-red-500 text-white hover:bg-red-600'
            : hasRunningAgents
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
              : 'bg-blue-500 text-white hover:bg-blue-600'
        )}
      >
        {isAutoExecuting ? (
          <>
            <Square className="w-4 h-4" />
            停止
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            自動実行
          </>
        )}
      </button>
    </div>
  );
}
