/**
 * ImplFlowFrame Component
 * impl-flow-hierarchy-fix: Task 1.1, 1.2
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 *
 * Frame component that wraps impl, inspection, and deploy phases.
 * - Shows WorktreeModeCheckbox in header
 * - Changes background color based on worktree mode selection
 * - Manages checkbox lock state based on impl/worktree status
 * - Visual frame only - NO execution button (moved to ImplPhasePanel)
 */

import React from 'react';
import { clsx } from 'clsx';
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
  /** Children to render inside the frame (ImplPhasePanel, TaskProgressView, InspectionPanel, deploy PhaseItem) */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  // Requirement 1.5: Execution-related props REMOVED
  // canExecute, isExecuting, onExecute moved to ImplPhasePanel
}

// =============================================================================
// Component
// =============================================================================

/**
 * ImplFlowFrame - Visual frame component for implementation flow phases
 *
 * Requirement 1.1: NO execution button (visual frame only)
 * Requirement 1.2: Shows WorktreeModeCheckbox in header
 * Requirement 1.3: Purple background when worktree mode selected
 * Requirement 1.4: Children rendering for impl flow components
 * Requirement 1.5: No execution-related props
 */
export function ImplFlowFrame({
  worktreeModeSelected,
  onWorktreeModeChange,
  isImplStarted,
  hasExistingWorktree,
  children,
  className,
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

        {/* Requirement 1.1: Execution button REMOVED */}
        {/* Start/Continue button functionality moved to ImplPhasePanel */}
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
