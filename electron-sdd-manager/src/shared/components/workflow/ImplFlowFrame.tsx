/**
 * ImplFlowFrame Component
 * worktree-execution-ui: Task 4.1, 4.2, 4.3, FIX-1
 * Requirements: 3.1, 3.2, 3.3, 4.3, 5.1, 5.2, 5.4, 6.1, 6.2, 6.4, 7.1, 7.2, 8.1, 8.2, 8.3
 *
 * Frame component that wraps impl, inspection, and deploy phases.
 * - Shows WorktreeModeCheckbox in header
 * - Changes background color based on worktree mode selection
 * - Manages checkbox lock state based on impl/worktree status
 * - FIX-1: Includes start/continue button replacing ImplStartButtons
 */

import React from 'react';
import { clsx } from 'clsx';
import { Play, Loader2, GitBranch } from 'lucide-react';
import { WorktreeModeCheckbox, type WorktreeLockReason } from './WorktreeModeCheckbox';

// =============================================================================
// Types
// =============================================================================

export interface ImplFlowFrameProps {
  /** Whether worktree mode is selected */
  worktreeModeSelected: boolean;
  /** Callback when worktree mode selection changes */
  onWorktreeModeChange: (selected: boolean) => void;
  /** Whether implementation has started (branch exists in spec.json.worktree) */
  isImplStarted: boolean;
  /** Whether an actual worktree already exists (path exists in spec.json.worktree) */
  hasExistingWorktree: boolean;
  /** Children to render inside the frame (PhaseItem for impl, InspectionPanel, deploy PhaseItem) */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** FIX-1: Whether impl can be executed */
  canExecute?: boolean;
  /** FIX-1: Whether impl is currently executing */
  isExecuting?: boolean;
  /** FIX-1: Callback to execute impl */
  onExecute?: () => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * ImplFlowFrame - Frame component for implementation flow phases
 *
 * Requirement 3.1: Wraps impl, inspection, and deploy in a visual frame
 * Requirement 3.2: Shows WorktreeModeCheckbox in header
 * Requirement 6.1: Purple background when worktree mode selected
 * Requirement 7.1: Normal background when normal mode selected
 * FIX-1: Includes start/continue button replacing ImplStartButtons
 */
export function ImplFlowFrame({
  worktreeModeSelected,
  onWorktreeModeChange,
  isImplStarted,
  hasExistingWorktree,
  children,
  className,
  canExecute = false,
  isExecuting = false,
  onExecute,
}: ImplFlowFrameProps): React.ReactElement {
  // Determine checkbox disabled state and lock reason
  // Requirement 4.3: Auto-check and lock when worktree exists
  // Requirement 5.1: Lock when impl started
  // Requirement 5.2: Lock when branch exists
  // Requirement 5.4: Editable during auto-execution if impl not started
  const isCheckboxDisabled = isImplStarted || hasExistingWorktree;

  const lockReason: WorktreeLockReason | null = (() => {
    if (hasExistingWorktree) return 'worktree-exists';
    if (isImplStarted) return 'impl-started';
    return null;
  })();

  return (
    <div
      data-testid="impl-flow-frame"
      className={clsx(
        'rounded-lg border overflow-hidden transition-colors',
        // Requirement 6.1: Purple/violet background when worktree mode
        // Requirement 7.1: Normal background when normal mode
        worktreeModeSelected
          ? 'border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-900/10'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/30',
        className
      )}
    >
      {/* Header with WorktreeModeCheckbox */}
      {/* Requirement 3.2: Checkbox in header */}
      <div
        data-testid="impl-flow-frame-header"
        className={clsx(
          'flex items-center justify-between px-3 py-2 border-b',
          worktreeModeSelected
            ? 'border-violet-200 dark:border-violet-800 bg-violet-100/50 dark:bg-violet-900/20'
            : 'border-gray-200 dark:border-gray-700 bg-gray-100/50 dark:bg-gray-800/50'
        )}
      >
        {/* Left side: Mode indicator label + checkbox */}
        <div className="flex items-center gap-3">
          {/* Mode indicator label */}
          <span
            className={clsx(
              'text-xs font-medium',
              worktreeModeSelected
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-gray-500 dark:text-gray-400'
            )}
          >
            {/* Requirement 6.2, 6.4: Label changes based on mode */}
            {worktreeModeSelected ? 'Worktreeモードで実装' : '実装フロー'}
          </span>

          {/* WorktreeModeCheckbox */}
          <WorktreeModeCheckbox
            checked={worktreeModeSelected}
            onChange={onWorktreeModeChange}
            disabled={isCheckboxDisabled}
            lockReason={lockReason}
          />
        </div>

        {/* FIX-1: Start/Continue button (replaces ImplStartButtons) */}
        {/* Requirement 8.1, 8.2, 8.3: Single button that changes behavior based on mode */}
        {onExecute && (
          <button
            data-testid="impl-start-button"
            type="button"
            disabled={!canExecute || isExecuting}
            onClick={onExecute}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              !canExecute || isExecuting
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                : worktreeModeSelected
                  ? 'bg-violet-500 text-white hover:bg-violet-600 dark:bg-violet-600 dark:hover:bg-violet-700'
                  : 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
            )}
          >
            {isExecuting ? (
              <>
                <Loader2 data-testid="impl-start-loading" className="w-3.5 h-3.5 animate-spin" />
                <span>実行中...</span>
              </>
            ) : (
              <>
                {worktreeModeSelected ? (
                  <GitBranch className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                <span>
                  {isImplStarted
                    ? worktreeModeSelected
                      ? 'Worktreeで実装継続'
                      : '実装継続'
                    : worktreeModeSelected
                      ? 'Worktreeで実装開始'
                      : '実装開始'
                  }
                </span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Content area */}
      {/* Requirement 3.1: Children (impl, inspection, deploy) rendered here */}
      <div
        data-testid="impl-flow-frame-content"
        className="p-3 space-y-2"
      >
        {children}
      </div>
    </div>
  );
}
