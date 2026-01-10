/**
 * PhaseItem Component
 * Shared workflow phase item component used by both Electron and Remote UI
 * Requirements: 3.1, 7.1, 7.2
 */

import React from 'react';
import { clsx } from 'clsx';
import {
  Play,
  Check,
  Ban,
  PlayCircle,
  Loader2,
  Pause,
  Bot,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export type WorkflowPhase = 'requirements' | 'design' | 'tasks' | 'impl' | 'inspection' | 'deploy';
export type PhaseStatus = 'pending' | 'generated' | 'approved';

export interface PhaseItemProps {
  /** Phase type */
  phase: WorkflowPhase;
  /** Phase display label */
  label: string;
  /** Current phase status */
  status: PhaseStatus;
  /** Previous phase status (for approve and execute button) */
  previousStatus: PhaseStatus | null;
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
  /** Approve button handler */
  onApprove: () => void;
  /** Approve and execute button handler */
  onApproveAndExecute: () => void;
  /** Auto execution permission toggle handler */
  onToggleAutoPermission: () => void;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * PhaseItem - Individual workflow phase with status and actions
 *
 * Usage:
 * ```tsx
 * <PhaseItem
 *   phase="requirements"
 *   label="Requirements"
 *   status="pending"
 *   previousStatus={null}
 *   autoExecutionPermitted={true}
 *   isExecuting={false}
 *   canExecute={true}
 *   onExecute={handleExecute}
 *   onApprove={handleApprove}
 *   onApproveAndExecute={handleApproveAndExecute}
 *   onToggleAutoPermission={handleToggle}
 * />
 * ```
 */
export function PhaseItem({
  phase,
  label,
  status,
  previousStatus,
  autoExecutionPermitted,
  isExecuting,
  canExecute,
  isAutoPhase = false,
  onExecute,
  onApprove,
  onApproveAndExecute,
  onToggleAutoPermission,
  className,
}: PhaseItemProps): React.ReactElement {
  // Show approve and execute button condition
  const showApproveAndExecute =
    previousStatus === 'generated' && status === 'pending' && !isExecuting && canExecute;

  // Progress icon rendering
  const renderProgressIcon = () => {
    if (isExecuting) {
      return (
        <Bot
          data-testid="progress-icon-executing"
          className="w-4 h-4 text-blue-500 animate-pulse"
        />
      );
    }
    switch (status) {
      case 'approved':
        return (
          <Check
            data-testid="progress-icon-approved"
            className="w-4 h-4 text-green-500"
          />
        );
      case 'generated':
        return (
          <Pause
            data-testid="progress-icon-generated"
            className="w-4 h-4 text-yellow-500"
          />
        );
      default:
        return (
          <Check
            data-testid="progress-icon-pending"
            className="w-4 h-4 text-gray-300 dark:text-gray-600"
          />
        );
    }
  };

  return (
    <div
      data-testid={`phase-item-${phase}`}
      className={clsx(
        'flex items-center justify-between p-3 rounded-lg',
        'bg-gray-50 dark:bg-gray-800',
        'transition-colors',
        isAutoPhase && 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-900',
        className
      )}
    >
      {/* Left side: Progress icon + phase name */}
      <div data-testid="phase-left-side" className="flex items-center gap-2">
        <span className="p-1">{renderProgressIcon()}</span>
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
      </div>

      {/* Right side: Auto permission toggle + action buttons */}
      <div data-testid="phase-right-side" className="flex items-center gap-2">
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

        {/* Executing state */}
        {isExecuting && (
          <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">
            <Loader2 className="w-3 h-3 animate-spin" />
            実行中
          </span>
        )}

        {/* Pending state - Execute button */}
        {status === 'pending' && !isExecuting && (
          <>
            {showApproveAndExecute ? (
              <button
                data-testid={`phase-button-approve-and-execute-${phase}`}
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
            ) : (
              <button
                data-testid={`phase-button-${phase}`}
                onClick={onExecute}
                disabled={!canExecute}
                className={clsx(
                  'flex items-center gap-1 px-3 py-1.5 rounded text-sm',
                  canExecute
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400',
                  'transition-colors'
                )}
              >
                <Play className="w-4 h-4" />
                実行
              </button>
            )}
          </>
        )}

        {/* Generated state - Approve button */}
        {status === 'generated' && !isExecuting && (
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
        )}
      </div>
    </div>
  );
}
