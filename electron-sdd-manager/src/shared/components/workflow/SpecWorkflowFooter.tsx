/**
 * SpecWorkflowFooter Component (Shared)
 *
 * Specワークフローフッター - 自動実行ボタン等のワークフロー全体操作
 * convert-spec-to-worktree: Task 3.1-3.3 - 「Worktreeに変更」ボタン追加
 * spec-event-log: Task 6.1 - イベントログボタン追加
 *
 * This component is shared between Electron renderer and Remote UI.
 */

import { clsx } from 'clsx';
import { Play, Square, GitBranch } from 'lucide-react';
import { hasWorktreePath, isImplStarted, type WorktreeConfig } from '../../types/worktree';
import { EventLogButton } from '../eventLog';

/**
 * Minimal SpecJson interface for WorkflowFooter
 * Only includes fields needed for display logic
 */
export interface SpecJsonForFooter {
  worktree?: WorktreeConfig | null;
}

/**
 * Check if "Convert to Worktree" button should be shown
 * Task 3.1: Display condition logic
 * Requirements: 4.1 (convert-spec-to-worktree)
 *
 * Shows button when:
 * - On main branch
 * - Implementation not started (no worktree.branch)
 * - Not in worktree mode (no worktree.path)
 *
 * @param isOnMain - Whether currently on main branch
 * @param specJson - SpecJson object to check worktree state
 * @returns true if button should be shown
 */
export function canShowConvertButton(
  isOnMain: boolean,
  specJson: SpecJsonForFooter | null | undefined
): boolean {
  // Must be on main branch
  if (!isOnMain) {
    return false;
  }

  // No specJson means we can't determine state
  if (!specJson) {
    return false;
  }

  // Check if already in worktree mode (has path)
  if (hasWorktreePath(specJson)) {
    return false;
  }

  // Check if impl already started (has branch)
  if (isImplStarted(specJson)) {
    return false;
  }

  return true;
}

export interface SpecWorkflowFooterProps {
  /** 自動実行中かどうか */
  isAutoExecuting: boolean;
  /** Agent実行中かどうか（自動実行ボタンの無効化判定用） */
  hasRunningAgents: boolean;
  /** 自動実行ボタンクリック時のハンドラ */
  onAutoExecution: () => void;
  /** mainブランチにいるかどうか（Convert buttonの表示判定用） */
  isOnMain?: boolean;
  /** SpecJson（Convert buttonの表示判定用） */
  specJson?: SpecJsonForFooter | null;
  /** 「Worktreeに変更」ボタンクリック時のハンドラ */
  onConvertToWorktree?: () => void;
  /** 変換処理中かどうか */
  isConverting?: boolean;
  /** spec-event-log: イベントログボタンクリック時のハンドラ */
  onShowEventLog?: () => void;
}

export function SpecWorkflowFooter({
  isAutoExecuting,
  hasRunningAgents,
  onAutoExecution,
  isOnMain = false,
  specJson,
  onConvertToWorktree,
  isConverting = false,
  onShowEventLog,
}: SpecWorkflowFooterProps) {
  const showConvertButton = canShowConvertButton(isOnMain, specJson);

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
      {/* spec-event-log: Event Log Button (Task 6.1) */}
      {onShowEventLog && (
        <EventLogButton onClick={onShowEventLog} />
      )}

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

      {/* Task 3.2: 「Worktreeに変更」ボタン */}
      {showConvertButton && onConvertToWorktree && (
        <button
          data-testid="convert-to-worktree-button"
          onClick={onConvertToWorktree}
          disabled={isConverting || hasRunningAgents || isAutoExecuting}
          className={clsx(
            'flex items-center justify-center gap-2 px-4 py-2 rounded',
            'font-medium transition-colors',
            isConverting || hasRunningAgents || isAutoExecuting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
              : 'bg-emerald-500 text-white hover:bg-emerald-600'
          )}
          title="通常モードからWorktreeモードに変換"
        >
          <GitBranch className="w-4 h-4" />
          {isConverting ? '変換中...' : 'Worktreeに変更'}
        </button>
      )}
    </div>
  );
}
