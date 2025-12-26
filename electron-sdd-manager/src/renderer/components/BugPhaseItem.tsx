/**
 * BugPhaseItem Component
 * Displays a single bug workflow phase with status and actions
 * Task 2: bugs-pane-integration
 * Requirements: 3.3, 4.6, 4.7, 6.2
 */

import { clsx } from 'clsx';
import { Play, Check, Loader2, Circle } from 'lucide-react';
import type { BugWorkflowPhase, BugPhaseStatus } from '../types/bug';

export interface BugPhaseItemProps {
  /** フェーズ種別 */
  phase: BugWorkflowPhase;
  /** フェーズ表示名 */
  label: string;
  /** フェーズ状態 */
  status: BugPhaseStatus;
  /** このフェーズが実行可能かどうか */
  canExecute: boolean;
  /** 実行ボタンを表示するか（Reportフェーズは非表示） */
  showExecuteButton: boolean;
  /** 実行ボタンハンドラ */
  onExecute: () => void;
}

export function BugPhaseItem({
  phase,
  label,
  status,
  canExecute,
  showExecuteButton,
  onExecute,
}: BugPhaseItemProps) {
  const isExecuting = status === 'executing';
  const isCompleted = status === 'completed';

  // 進捗アイコンのレンダリング
  const renderStatusIcon = () => {
    if (isExecuting) {
      return (
        <Loader2
          data-testid="bug-phase-status-executing"
          className="w-4 h-4 text-blue-500 animate-spin"
        />
      );
    }
    if (isCompleted) {
      return (
        <Check
          data-testid="bug-phase-status-completed"
          className="w-4 h-4 text-green-500"
        />
      );
    }
    return (
      <Circle
        data-testid="bug-phase-status-pending"
        className="w-4 h-4 text-gray-300 dark:text-gray-600"
      />
    );
  };

  return (
    <div
      data-testid={`bug-phase-item-${phase}`}
      className={clsx(
        'flex items-center justify-between p-3 rounded-lg',
        'bg-gray-50 dark:bg-gray-800',
        'transition-colors',
        isExecuting && 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-900'
      )}
    >
      {/* 左側: 進捗アイコン + フェーズ名 */}
      <div className="flex items-center gap-2">
        <div className="p-1">
          {renderStatusIcon()}
        </div>
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
      </div>

      {/* 右側: アクションボタン */}
      <div className="flex items-center gap-2">
        {/* 実行中表示 */}
        {isExecuting && (
          <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            実行中
          </span>
        )}

        {/* 実行ボタン（完了済みフェーズでは非表示） */}
        {showExecuteButton && !isExecuting && !isCompleted && (
          <button
            data-testid={`bug-phase-execute-button-${phase}`}
            onClick={onExecute}
            disabled={!canExecute || isExecuting}
            className={clsx(
              'flex items-center gap-1 px-3 py-1.5 rounded text-sm',
              'transition-colors',
              canExecute && !isExecuting
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
            )}
          >
            <Play className="w-4 h-4" />
            実行
          </button>
        )}

        {/* 実行中の場合はdisabledボタンを表示 */}
        {showExecuteButton && isExecuting && (
          <button
            data-testid={`bug-phase-execute-button-${phase}`}
            disabled
            className="flex items-center gap-1 px-3 py-1.5 rounded text-sm bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400"
          >
            <Play className="w-4 h-4" />
            実行
          </button>
        )}
      </div>
    </div>
  );
}
