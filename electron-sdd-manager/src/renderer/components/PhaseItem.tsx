/**
 * PhaseItem Component
 * Displays a single workflow phase with status and actions
 * Requirements: 2.1-2.5, 5.1, 5.2
 */

import { clsx } from 'clsx';
import {
  Play,
  Check,
  CheckCircle,
  Ban,
  PlayCircle,
  Loader2,
} from 'lucide-react';
import type { PhaseStatus, WorkflowPhase } from '../types/workflow';

// ============================================================
// Task 3.1, 3.2, 3.3: PhaseItem Props
// Requirements: 2.1-2.5, 5.1, 5.2
// ============================================================

export interface PhaseItemProps {
  /** フェーズ種別 */
  phase: WorkflowPhase;
  /** フェーズ表示名 */
  label: string;
  /** フェーズ状態 */
  status: PhaseStatus;
  /** 前フェーズの状態（遷移可能判定用） */
  previousStatus: PhaseStatus | null;
  /** 自動実行許可フラグ */
  autoExecutionPermitted: boolean;
  /** 現在実行中かどうか */
  isExecuting: boolean;
  /** このフェーズが実行可能かどうか（順序制御・多重実行防止用） */
  canExecute: boolean;
  /** 実行ボタンハンドラ */
  onExecute: () => void;
  /** 承認ボタンハンドラ */
  onApprove: () => void;
  /** 承認して実行ボタンハンドラ */
  onApproveAndExecute: () => void;
  /** 自動実行許可トグルハンドラ */
  onToggleAutoPermission: () => void;
  /** 生成完了リンクハンドラ（Agentログ表示） */
  onShowAgentLog?: () => void;
}

export function PhaseItem({
  phase,
  label,
  status,
  previousStatus,
  autoExecutionPermitted,
  isExecuting,
  canExecute,
  onExecute,
  onApprove,
  onApproveAndExecute,
  onToggleAutoPermission,
  onShowAgentLog,
}: PhaseItemProps) {
  // Task 3.2: 承認して実行ボタンの表示条件
  const showApproveAndExecute =
    previousStatus === 'generated' && status === 'pending' && !isExecuting && canExecute;

  return (
    <div
      className={clsx(
        'flex items-center justify-between p-3 rounded-lg',
        'bg-gray-50 dark:bg-gray-800',
        'transition-colors'
      )}
    >
      {/* 左側: 自動実行許可アイコン + フェーズ名 */}
      <button
        data-testid="phase-toggle"
        onClick={onToggleAutoPermission}
        className={clsx(
          'flex items-center gap-2',
          'hover:bg-gray-100 dark:hover:bg-gray-700',
          'rounded px-2 py-1 -ml-2',
          'transition-colors'
        )}
      >
        {/* Task 3.3: 自動実行許可アイコン */}
        {autoExecutionPermitted ? (
          <PlayCircle
            data-testid="auto-permitted-icon"
            className="w-4 h-4 text-green-500"
          />
        ) : (
          <Ban
            data-testid="auto-forbidden-icon"
            className="w-4 h-4 text-gray-400"
          />
        )}
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
      </button>

      {/* 右側: 状態表示とアクションボタン */}
      <div className="flex items-center gap-2">
        {/* Task 3.1: 実行中表示 */}
        {isExecuting && (
          <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">
            <Loader2 className="w-3 h-3 animate-spin" />
            実行中
          </span>
        )}

        {/* Task 3.1: pending状態 - 実行ボタン */}
        {status === 'pending' && !isExecuting && (
          <>
            {showApproveAndExecute ? (
              <button
                onClick={onApproveAndExecute}
                className={clsx(
                  'flex items-center gap-1 px-3 py-1.5 rounded text-sm',
                  'bg-green-500 text-white hover:bg-green-600',
                  'transition-colors'
                )}
              >
                <Check className="w-4 h-4" />
                承認して実行
              </button>
            ) : canExecute ? (
              <button
                onClick={onExecute}
                className={clsx(
                  'flex items-center gap-1 px-3 py-1.5 rounded text-sm',
                  'bg-blue-500 text-white hover:bg-blue-600',
                  'transition-colors'
                )}
              >
                <Play className="w-4 h-4" />
                実行
              </button>
            ) : (
              <button
                disabled
                className={clsx(
                  'flex items-center gap-1 px-3 py-1.5 rounded text-sm',
                  'bg-gray-300 text-gray-500 cursor-not-allowed',
                  'dark:bg-gray-600 dark:text-gray-400'
                )}
              >
                <Play className="w-4 h-4" />
                実行
              </button>
            )}
          </>
        )}

        {/* Task 3.1: generated状態 - 生成完了ラベル + 承認ボタン */}
        {status === 'generated' && !isExecuting && (
          <>
            <button
              onClick={onShowAgentLog}
              className={clsx(
                'px-2 py-1 rounded text-xs',
                'bg-blue-100 text-blue-700',
                'hover:bg-blue-200 transition-colors',
                'cursor-pointer'
              )}
            >
              生成完了
            </button>
            <button
              onClick={onApprove}
              className={clsx(
                'flex items-center gap-1 px-3 py-1.5 rounded text-sm',
                'bg-green-500 text-white hover:bg-green-600',
                'transition-colors'
              )}
            >
              <Check className="w-4 h-4" />
              承認
            </button>
          </>
        )}

        {/* Task 3.1: approved状態 - 承認済/完了ラベル */}
        {status === 'approved' && (
          <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" />
            {phase === 'impl' ? '完了' : '承認済'}
          </span>
        )}
      </div>
    </div>
  );
}
