/**
 * ImplStartButtons Component
 * Provides 2-button UI for impl start with worktree options
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9 (git-worktree-support)
 * Task 14.1: ImplパネルにImpl開始オプションの2ボタンUIを実装
 */

import React from 'react';
import { clsx } from 'clsx';
import { Play, GitBranch, Loader2 } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface ImplStartButtonsProps {
  /** Feature name for the spec (reserved for future use) */
  featureName?: string;
  /** Whether the spec already has a worktree configuration */
  hasWorktree: boolean;
  /** Whether impl is currently executing */
  isExecuting: boolean;
  /** Whether impl can be executed (previous phase approved) */
  canExecute: boolean;
  /** Handler for "カレントブランチで実装" button */
  onExecuteCurrentBranch: () => void;
  /** Handler for "Worktreeで実装" button */
  onExecuteWithWorktree: () => void;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * ImplStartButtons - Provides options for starting implementation
 *
 * When no worktree exists:
 * - Shows "カレントブランチで実装" and "Worktreeで実装" buttons
 * - Requirements: 9.1, 9.2, 9.3
 *
 * When worktree exists:
 * - Shows only "Worktreeで実装（継続）" button
 * - Requirements: 9.8, 9.9
 */
export function ImplStartButtons({
  // featureName is reserved for future use (e.g., displaying feature name in UI)
  hasWorktree,
  isExecuting,
  canExecute,
  onExecuteCurrentBranch,
  onExecuteWithWorktree,
  className,
}: ImplStartButtonsProps): React.ReactElement {
  // Buttons are disabled when executing or when cannot execute
  const isDisabled = isExecuting || !canExecute;

  // ============================================================
  // Render: worktree exists - show continue button only
  // Requirements: 9.8, 9.9
  // ============================================================
  if (hasWorktree) {
    return (
      <div className={clsx('flex flex-col gap-2', className)}>
        {/* Executing indicator */}
        {isExecuting && (
          <div
            data-testid="impl-executing-indicator"
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>実行中...</span>
          </div>
        )}

        {/* Worktreeで実装（継続）button */}
        <button
          data-testid="impl-start-worktree-continue"
          onClick={onExecuteWithWorktree}
          disabled={isDisabled}
          className={clsx(
            'flex items-center justify-center gap-2 px-4 py-2 rounded text-sm font-medium',
            'transition-colors',
            isDisabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
              : 'bg-green-500 text-white hover:bg-green-600'
          )}
        >
          <GitBranch className="w-4 h-4" />
          Worktreeで実装（継続）
        </button>
      </div>
    );
  }

  // ============================================================
  // Render: no worktree - show both buttons
  // Requirements: 9.1, 9.2, 9.3
  // ============================================================
  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      {/* Executing indicator */}
      {isExecuting && (
        <div
          data-testid="impl-executing-indicator"
          className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>実行中...</span>
        </div>
      )}

      {/* Button container */}
      <div className="flex gap-2">
        {/* カレントブランチで実装 button */}
        <button
          data-testid="impl-start-current-branch"
          onClick={onExecuteCurrentBranch}
          disabled={isDisabled}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium',
            'transition-colors',
            isDisabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          )}
        >
          <Play className="w-4 h-4" />
          カレントブランチで実装
        </button>

        {/* Worktreeで実装 button */}
        <button
          data-testid="impl-start-worktree"
          onClick={onExecuteWithWorktree}
          disabled={isDisabled}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium',
            'transition-colors',
            isDisabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
              : 'bg-green-500 text-white hover:bg-green-600'
          )}
        >
          <GitBranch className="w-4 h-4" />
          Worktreeで実装
        </button>
      </div>
    </div>
  );
}
