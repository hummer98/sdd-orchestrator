/**
 * ImmediateExecutionWarningDialog Component
 * Warning dialog shown when immediate execution is triggered while an avoidance target is running
 *
 * Task 5.3: ImmediateExecutionWarningDialogを作成
 * - 回避対象動作中の警告表示
 * - 「それでも実行」「キャンセル」の選択肢
 *
 * Requirements: 7.3, 7.4, 7.5
 */

import React from 'react';
import { clsx } from 'clsx';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import type { AvoidanceTarget } from '../../types/scheduleTask';

// =============================================================================
// Types
// =============================================================================

export interface ImmediateExecutionWarningDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Task name to display in the warning */
  taskName: string;
  /** The type of operation that is currently running and causing the conflict */
  conflictType: AvoidanceTarget;
  /** Called when user confirms execution (force execution) */
  onConfirm: () => void;
  /** Called when user cancels */
  onCancel: () => void;
  /** Whether the dialog is in loading state (executing) */
  isLoading?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get human-readable label for avoidance target type
 */
function getConflictTypeLabel(conflictType: AvoidanceTarget): string {
  switch (conflictType) {
    case 'spec-merge':
      return 'Specマージ';
    case 'commit':
      return 'コミット';
    case 'bug-merge':
      return 'Bugマージ';
    case 'schedule-task':
      return 'スケジュールタスク';
    default:
      return '不明な操作';
  }
}

// =============================================================================
// Component
// =============================================================================

/**
 * ImmediateExecutionWarningDialog - Warning dialog for immediate execution during active avoidance targets
 *
 * Displays a warning when the user attempts to execute a scheduled task immediately
 * while an operation that is configured as an avoidance target is running.
 *
 * Usage:
 * ```tsx
 * <ImmediateExecutionWarningDialog
 *   isOpen={showWarning}
 *   taskName="定期ステアリング更新"
 *   conflictType="spec-merge"
 *   onConfirm={handleForceExecution}
 *   onCancel={() => setShowWarning(false)}
 * />
 * ```
 */
export function ImmediateExecutionWarningDialog({
  isOpen,
  taskName,
  conflictType,
  onConfirm,
  onCancel,
  isLoading = false,
}: ImmediateExecutionWarningDialogProps): React.ReactElement | null {
  if (!isOpen) {
    return null;
  }

  const conflictLabel = getConflictTypeLabel(conflictType);
  const dialogTitleId = 'immediate-execution-warning-title';

  return (
    <div
      data-testid="immediate-execution-warning-dialog"
      className="fixed inset-0 z-[60] flex items-center justify-center"
    >
      {/* Backdrop */}
      <div
        data-testid="dialog-backdrop"
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        className={clsx(
          'relative z-10 w-full max-w-md mx-4 p-6',
          'bg-white dark:bg-gray-800',
          'rounded-lg shadow-xl'
        )}
      >
        {/* Warning Header */}
        <div className="flex items-start gap-4">
          {/* Warning Icon */}
          <div
            data-testid="warning-icon"
            className="flex-shrink-0 p-2 rounded-full bg-amber-100 dark:bg-amber-900/30"
          >
            <AlertTriangle className="w-6 h-6 text-amber-500 dark:text-amber-400" />
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* Title */}
            <h3
              id={dialogTitleId}
              className="text-lg font-medium text-gray-900 dark:text-gray-100"
            >
              実行中の操作があります
            </h3>

            {/* Warning Message */}
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              現在「{conflictLabel}」が動作中です。
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              「{taskName}」を今すぐ実行すると、競合が発生する可能性があります。
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            キャンセル
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={isLoading}
            loading={isLoading}
          >
            それでも実行
          </Button>
        </div>
      </div>
    </div>
  );
}
