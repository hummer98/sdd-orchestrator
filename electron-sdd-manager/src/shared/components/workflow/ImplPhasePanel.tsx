/**
 * ImplPhasePanel Component
 * impl-flow-hierarchy-fix: Task 2.1, 2.2, 2.3, 2.4
 * spec-worktree-early-creation: Task 7.1 - Simplified props
 * parallel-task-impl: Inspection Fix Task 9.1, 9.2 - ParallelModeToggle integration
 *
 * Specialized component for the impl phase:
 * - Shows status (pending/executing/approved)
 * - Applies purple accent color in worktree mode (read from spec.json)
 * - Worktree mode is determined at spec creation, not impl time
 * - Integrates ParallelModeToggle for parallel task execution
 */

import React, { useState } from 'react';
import { clsx } from 'clsx';
import {
  Check,
  PlayCircle,
  Loader2,
  Pause,
  Bot,
  Info,
  X,
} from 'lucide-react';
import type { PhaseStatus } from './PhaseItem';
import { AgentIcon, AgentBranchIcon } from '../ui/AgentIcon';
import { ParallelModeToggle } from './ParallelModeToggle';

// =============================================================================
// Types
// =============================================================================

export interface ImplPhasePanelProps {
  /** Whether worktree mode is enabled (read from spec.json.worktree) */
  worktreeModeSelected: boolean;
  /** Whether implementation has started (for button label: 開始/継続) */
  isImplStarted: boolean;
  /** Current phase status */
  status: PhaseStatus;
  /** Auto execution permission flag */
  autoExecutionPermitted: boolean;
  /** Whether currently executing */
  isExecuting: boolean;
  /** Whether this phase can be executed */
  canExecute: boolean;
  /** Whether this is the current auto execution phase */
  isAutoPhase?: boolean;
  /** Execute button handler */
  onExecute: () => void;
  /** Auto execution permission toggle handler */
  onToggleAutoPermission: () => void;
  /** Additional CSS classes */
  className?: string;

  // ==========================================================================
  // parallel-task-impl: Inspection Fix Task 9.1, 9.2 - Parallel mode props
  // Requirements: 1.1, 1.5, 1.6
  // ==========================================================================

  /** Whether the spec has parallel tasks (P) markers */
  hasParallelTasks?: boolean;
  /** Number of parallel tasks in the spec */
  parallelTaskCount?: number;
  /** Whether parallel mode is enabled */
  parallelModeEnabled?: boolean;
  /** Callback when parallel mode toggle is clicked */
  onToggleParallelMode?: () => void;
  /** Callback for parallel execution (when parallel mode is ON) */
  onExecuteParallel?: () => void;
  /** Phase description for info dialog (optional) */
  description?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Determines the button label based on state
 * spec-worktree-early-creation: Simplified - no hasExistingWorktree needed
 * Note: Worktree mode is indicated by color only, not label
 */
function getButtonLabel(isImplStarted: boolean): string {
  return isImplStarted ? '実装継続' : '実装開始';
}

// =============================================================================
// Component
// =============================================================================

/**
 * ImplPhasePanel - Specialized panel for the impl phase with worktree support
 *
 * spec-worktree-early-creation: Simplified
 * - Worktree mode is determined at spec creation, not impl time
 * - Purple accent color when worktree mode is enabled
 */
export function ImplPhasePanel({
  worktreeModeSelected,
  isImplStarted,
  status,
  autoExecutionPermitted,
  isExecuting,
  canExecute,
  isAutoPhase = false,
  onExecute,
  onToggleAutoPermission,
  className,
  // parallel-task-impl: Inspection Fix Task 9.1, 9.2 props
  hasParallelTasks = false,
  parallelTaskCount = 0,
  parallelModeEnabled = false,
  onToggleParallelMode,
  onExecuteParallel,
  description,
}: ImplPhasePanelProps): React.ReactElement {
  // Info dialog state
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);

  // Get button label based on current state (color indicates worktree mode)
  const buttonLabel = getButtonLabel(isImplStarted);

  // Button disabled state
  const isButtonDisabled = !canExecute || isExecuting;

  // parallel-task-impl: Execute handler selection based on parallel mode
  // Requirements: 1.5, 1.6
  // When parallel mode is ON and onExecuteParallel is provided, use it.
  // Otherwise, fallback to standard onExecute handler.
  const handleExecuteClick = () => {
    if (parallelModeEnabled && onExecuteParallel) {
      // Parallel mode ON with handler: use parallel execution
      onExecuteParallel();
    } else {
      // Parallel mode OFF, or no parallel handler: use standard execution
      onExecute();
    }
  };

  // Render status icon
  // Requirement 2.9: Status display
  const renderStatusIcon = () => {
    if (isExecuting) {
      return (
        <Bot
          data-testid="status-icon-executing"
          className="w-4 h-4 text-blue-500 animate-pulse"
        />
      );
    }
    switch (status) {
      case 'approved':
        return (
          <Check
            data-testid="status-icon-approved"
            className="w-4 h-4 text-green-500"
          />
        );
      default:
        return (
          <Check
            data-testid="status-icon-pending"
            className="w-4 h-4 text-gray-300 dark:text-gray-600"
          />
        );
    }
  };

  return (
    <div
      data-testid="impl-phase-panel"
      className={clsx(
        'flex items-center justify-between p-3 rounded-lg',
        'bg-gray-50 dark:bg-gray-800',
        'transition-colors',
        isAutoPhase && 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-900',
        className
      )}
    >
      {/* Left side: Status icon + phase label + info icon */}
      <div className="flex items-center gap-2">
        <span className="p-1">{renderStatusIcon()}</span>
        <span className="font-medium text-gray-700 dark:text-gray-300">
          実装
        </span>
        {/* Info icon - shows description dialog when clicked */}
        {description && (
          <button
            data-testid="impl-info-button"
            onClick={() => setIsInfoDialogOpen(true)}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="詳細を表示"
          >
            <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </button>
        )}
      </div>

      {/* Right side: Auto permission toggle + parallel toggle + action button */}
      <div className="flex items-center gap-2">
        {/* Auto execution permission toggle */}
        <button
          data-testid="auto-permission-toggle"
          onClick={onToggleAutoPermission}
          className={clsx(
            'p-1 rounded',
            'hover:bg-gray-200 dark:hover:bg-gray-600',
            'transition-colors'
          )}
          title={autoExecutionPermitted ? '自動実行: 許可' : '自動実行: 一時停止'}
        >
          {autoExecutionPermitted ? (
            <PlayCircle
              data-testid="auto-permitted-icon"
              className="w-4 h-4 text-green-500"
            />
          ) : (
            <Pause
              data-testid="auto-forbidden-icon"
              className="w-4 h-4 text-yellow-500"
            />
          )}
        </button>

        {/* parallel-task-impl: Parallel mode toggle */}
        {/* Requirements: 1.1 - Parallel toggle next to execute button */}
        <ParallelModeToggle
          parallelModeEnabled={parallelModeEnabled}
          hasParallelTasks={hasParallelTasks}
          parallelTaskCount={parallelTaskCount}
          onToggle={onToggleParallelMode ?? (() => {})}
        />

        {/* Execute button */}
        {/* Requirement 2.7: Execute button with worktree-aware behavior */}
        {/* Requirement 2.10: Purple styling in worktree mode */}
        {/* parallel-task-impl: Uses handleExecuteClick for parallel mode support */}
        <button
          data-testid="impl-execute-button"
          type="button"
          disabled={isButtonDisabled}
          onClick={handleExecuteClick}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            isButtonDisabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
              : worktreeModeSelected
                ? 'bg-violet-500 text-white hover:bg-violet-600 dark:bg-violet-600 dark:hover:bg-violet-700'
                : 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
          )}
        >
          {isExecuting ? (
            <>
              <Loader2 data-testid="impl-execute-loading" className="w-4 h-4 animate-spin" />
              <span>実行中...</span>
            </>
          ) : (
            <>
              {worktreeModeSelected ? (
                <AgentBranchIcon data-testid="icon-git-branch" />
              ) : (
                <AgentIcon data-testid="icon-play" />
              )}
              <span>{buttonLabel}</span>
            </>
          )}
        </button>
      </div>

      {/* Info Dialog */}
      {description && isInfoDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsInfoDialogOpen(false)}
          />
          {/* Dialog */}
          <div
            data-testid="impl-info-dialog"
            className={clsx(
              'relative z-10 w-full max-w-sm p-5 rounded-lg shadow-xl',
              'bg-white dark:bg-gray-900'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                実装
              </h2>
              <button
                onClick={() => setIsInfoDialogOpen(false)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            {/* Content */}
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {description}
            </p>
            {/* Close button */}
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setIsInfoDialogOpen(false)}
                className={clsx(
                  'px-4 py-2 rounded-md text-sm',
                  'bg-gray-100 dark:bg-gray-800',
                  'text-gray-700 dark:text-gray-300',
                  'hover:bg-gray-200 dark:hover:bg-gray-700',
                  'transition-colors'
                )}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
