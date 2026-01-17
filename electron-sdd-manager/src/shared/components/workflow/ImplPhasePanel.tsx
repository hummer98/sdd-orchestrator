/**
 * ImplPhasePanel Component
 * impl-flow-hierarchy-fix: Task 2.1, 2.2, 2.3, 2.4
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10
 *
 * Specialized component for the impl phase:
 * - Displays worktree-aware labels and buttons
 * - Handles worktree/normal mode execution
 * - Shows status (pending/executing/approved)
 * - Applies purple accent color in worktree mode
 */

import React from 'react';
import { clsx } from 'clsx';
import {
  Check,
  Ban,
  PlayCircle,
  Loader2,
  Bot,
} from 'lucide-react';
import type { PhaseStatus } from './PhaseItem';
import { AgentIcon, AgentBranchIcon } from '../ui/AgentIcon';

// =============================================================================
// Types
// =============================================================================

export interface ImplPhasePanelProps {
  /** Whether worktree mode is selected */
  worktreeModeSelected: boolean;
  /** Whether implementation has started */
  isImplStarted: boolean;
  /** Whether an actual worktree exists */
  hasExistingWorktree: boolean;
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
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Determines the button label based on mode and state
 * Requirements: 2.3, 2.4, 2.5, 2.6
 */
function getButtonLabel(
  worktreeModeSelected: boolean,
  isImplStarted: boolean,
  hasExistingWorktree: boolean
): string {
  if (worktreeModeSelected) {
    // Requirement 2.3: Worktree mode + not created
    // Requirement 2.4: Worktree mode + created
    return hasExistingWorktree || isImplStarted
      ? 'Worktreeで実装継続'
      : 'Worktreeで実装開始';
  }
  // Requirement 2.5: Normal mode + not started
  // Requirement 2.6: Normal mode + started
  return isImplStarted ? '実装継続' : '実装開始';
}

// =============================================================================
// Component
// =============================================================================

/**
 * ImplPhasePanel - Specialized panel for the impl phase with worktree support
 *
 * Requirement 2.1: Component creation
 * Requirement 2.2: Receives worktreeModeSelected and branches execution logic
 * Requirement 2.7: Execute button triggers appropriate action
 * Requirement 2.8: Main branch check error display (handled by parent)
 * Requirement 2.9: Status display (pending/executing/approved)
 * Requirement 2.10: Purple accent color in worktree mode
 */
export function ImplPhasePanel({
  worktreeModeSelected,
  isImplStarted,
  hasExistingWorktree,
  status,
  autoExecutionPermitted,
  isExecuting,
  canExecute,
  isAutoPhase = false,
  onExecute,
  onToggleAutoPermission,
  className,
}: ImplPhasePanelProps): React.ReactElement {
  // Get button label based on current state
  const buttonLabel = getButtonLabel(worktreeModeSelected, isImplStarted, hasExistingWorktree);

  // Button disabled state
  const isButtonDisabled = !canExecute || isExecuting;

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
      {/* Left side: Status icon + phase label */}
      <div className="flex items-center gap-2">
        <span className="p-1">{renderStatusIcon()}</span>
        <span className="font-medium text-gray-700 dark:text-gray-300">
          実装
        </span>
      </div>

      {/* Right side: Auto permission toggle + action button */}
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
          title={autoExecutionPermitted ? '自動実行: 許可' : '自動実行: 禁止'}
        >
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
        </button>

        {/* Executing state indicator (inline) */}
        {isExecuting && (
          <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">
            <Loader2 className="w-3 h-3 animate-spin" />
            実行中
          </span>
        )}

        {/* Execute button */}
        {/* Requirement 2.7: Execute button with worktree-aware behavior */}
        {/* Requirement 2.10: Purple styling in worktree mode */}
        <button
          data-testid="impl-execute-button"
          type="button"
          disabled={isButtonDisabled}
          onClick={onExecute}
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
    </div>
  );
}
