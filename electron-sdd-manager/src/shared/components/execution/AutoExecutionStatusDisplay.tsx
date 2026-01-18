/**
 * AutoExecutionStatusDisplay Component (Shared)
 *
 * Task 4.7: AutoExecution関連コンポーネントを共有化する
 *
 * 自動実行の進捗とステータスを表示するコンポーネント。
 * props-driven設計で、ストア非依存。Electron版とRemote UI版で共有可能。
 */

import { clsx } from 'clsx';
import {
  Bot,
  Pause,
  AlertCircle,
  CheckCircle,
  Square,
  RotateCcw,
} from 'lucide-react';
import type { AutoExecutionStatus, WorkflowPhase } from '../../types';
import { PHASE_LABELS } from '../../types';

// =============================================================================
// Types
// =============================================================================

export interface AutoExecutionStatusDisplayProps {
  /** 自動実行状態 */
  status: AutoExecutionStatus;
  /** 現在実行中のフェーズ */
  currentPhase: WorkflowPhase | null;
  /** 最後に失敗したフェーズ */
  lastFailedPhase: WorkflowPhase | null;
  /** リトライ回数 */
  retryCount: number;
  /** 再実行ハンドラ */
  onRetry: () => void;
  /** 停止ハンドラ */
  onStop: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function AutoExecutionStatusDisplay({
  status,
  currentPhase,
  lastFailedPhase,
  retryCount,
  onRetry,
  onStop,
}: AutoExecutionStatusDisplayProps) {
  // Don't render when idle
  if (status === 'idle') {
    return null;
  }

  return (
    <div
      data-testid="auto-execution-status"
      data-status={status}
      className={clsx(
        'mt-4 p-3 rounded-lg border',
        'transition-colors',
        status === 'running' &&
          'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
        status === 'paused' &&
          'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20',
        status === 'completing' &&
          'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
        status === 'error' &&
          'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
        status === 'completed' &&
          'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Status Icon */}
          {status === 'running' && (
            <Bot className="w-4 h-4 text-blue-500 animate-pulse" />
          )}
          {status === 'paused' && <Pause className="w-4 h-4 text-yellow-500" />}
          {status === 'completing' && (
            <Bot className="w-4 h-4 text-blue-500 animate-pulse" />
          )}
          {status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
          {status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}

          {/* Status Text */}
          <span
            className={clsx(
              'font-medium',
              status === 'running' && 'text-blue-700 dark:text-blue-400',
              status === 'paused' && 'text-yellow-700 dark:text-yellow-400',
              status === 'completing' && 'text-blue-700 dark:text-blue-400',
              status === 'error' && 'text-red-700 dark:text-red-400',
              status === 'completed' && 'text-green-700 dark:text-green-400'
            )}
          >
            {status === 'running' && '自動実行中'}
            {status === 'paused' && 'Agent待機中'}
            {status === 'completing' && '完了処理中'}
            {status === 'error' && 'エラー'}
            {status === 'completed' && '自動実行完了'}
          </span>

          {/* Current Phase */}
          {(status === 'running' || status === 'paused') && currentPhase && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              - {PHASE_LABELS[currentPhase]}
            </span>
          )}

          {/* Failed Phase */}
          {status === 'error' && lastFailedPhase && (
            <span className="text-sm text-red-600 dark:text-red-400">
              - {PHASE_LABELS[lastFailedPhase]}で失敗
            </span>
          )}

          {/* Retry Count */}
          {retryCount > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-500">
              (リトライ {retryCount}回)
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Stop Button - shown when running or paused */}
          {(status === 'running' || status === 'paused') && (
            <button
              onClick={onStop}
              className={clsx(
                'flex items-center gap-1 px-2 py-1 rounded text-sm',
                'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600',
                'text-gray-700 dark:text-gray-300',
                'transition-colors'
              )}
            >
              <Square className="w-3 h-3" />
              停止
            </button>
          )}

          {/* Retry Button - shown when error */}
          {status === 'error' && (
            <button
              onClick={onRetry}
              className={clsx(
                'flex items-center gap-1 px-2 py-1 rounded text-sm',
                'bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50',
                'text-red-700 dark:text-red-400',
                'transition-colors'
              )}
            >
              <RotateCcw className="w-3 h-3" />
              再実行
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
