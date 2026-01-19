/**
 * ImplFlowFrame Component
 * impl-flow-hierarchy-fix: Task 1.1, 1.2
 * spec-worktree-early-creation: Task 7.1 - WorktreeModeCheckbox removed
 *
 * Frame component that wraps impl, inspection, and deploy phases.
 * - Changes background color based on worktree mode (read from spec.json)
 * - Visual frame only - NO execution button (moved to ImplPhasePanel)
 * - Worktree mode is now determined at spec creation time (not impl time)
 */

import React from 'react';
import { clsx } from 'clsx';

// =============================================================================
// Types
// =============================================================================

export interface ImplFlowFrameProps {
  /** Whether worktree mode is enabled (read from spec.json.worktree) */
  worktreeModeSelected: boolean;
  /** Children to render inside the frame (ImplPhasePanel, TaskProgressView, InspectionPanel, deploy PhaseItem) */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * ImplFlowFrame - Visual frame component for implementation flow phases
 *
 * spec-worktree-early-creation: WorktreeModeCheckbox REMOVED
 * - Worktree mode is determined at spec creation time via CreateSpecDialog
 * - This component now only shows the mode indicator (no selection)
 * - Purple background indicates worktree mode (determined at spec creation)
 */
export function ImplFlowFrame({
  worktreeModeSelected,
  children,
  className,
}: ImplFlowFrameProps): React.ReactElement {
  return (
    <div
      data-testid="impl-flow-frame"
      className={clsx(
        'rounded-lg border overflow-hidden transition-colors',
        // Purple/violet background when worktree mode
        worktreeModeSelected
          ? 'border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-900/10'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/30',
        className
      )}
    >
      {/* Header with mode indicator (read-only, no checkbox) */}
      <div
        data-testid="impl-flow-frame-header"
        className={clsx(
          'flex items-center px-3 py-2 border-b',
          worktreeModeSelected
            ? 'border-violet-200 dark:border-violet-800 bg-violet-100/50 dark:bg-violet-900/20'
            : 'border-gray-200 dark:border-gray-700 bg-gray-100/50 dark:bg-gray-800/50'
        )}
      >
        {/* Mode indicator label (read-only) */}
        <span
          className={clsx(
            'text-xs font-medium',
            worktreeModeSelected
              ? 'text-violet-600 dark:text-violet-400'
              : 'text-gray-500 dark:text-gray-400'
          )}
        >
          {worktreeModeSelected ? 'Worktreeモードで実装' : '実装フロー'}
        </span>

        {/* spec-worktree-early-creation: WorktreeModeCheckbox REMOVED */}
        {/* Worktree mode is now set at spec creation time */}
      </div>

      {/* Content area */}
      <div
        data-testid="impl-flow-frame-content"
        className="p-3 space-y-2"
      >
        {children}
      </div>
    </div>
  );
}
