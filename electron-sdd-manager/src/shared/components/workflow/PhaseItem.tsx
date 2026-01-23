/**
 * PhaseItem Component
 * Shared workflow phase item component used by both Electron and Remote UI
 * Requirements: 3.1, 7.1, 7.2
 * spec-productivity-metrics Task 10.3: Integrate PhaseMetricsView for inline metrics display
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
import { AgentIcon } from '../ui/AgentIcon';
// spec-productivity-metrics: Task 10.3 - Phase metrics types
import type { PhaseMetrics } from '../../../main/types/metrics';
import { formatDurationCompact } from '../../utils/timeFormat';

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
  /** Handler for showing agent log when progress icon is clicked (generated status only) */
  onShowAgentLog?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Phase metrics data (optional - spec-productivity-metrics Task 10.3) */
  phaseMetrics?: PhaseMetrics | null;
  /** Phase description for info dialog (optional) */
  description?: string;
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
  onShowAgentLog,
  className,
  phaseMetrics,
  description,
}: PhaseItemProps): React.ReactElement {
  // Info dialog state
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);

  // Show approve and execute button condition
  const showApproveAndExecute =
    previousStatus === 'generated' && status === 'pending' && !isExecuting && canExecute;

  // Progress icon click handler (only for generated status)
  const handleProgressIconClick = () => {
    if (status === 'generated' && onShowAgentLog) {
      onShowAgentLog();
    }
  };

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
      {/* Left side: Progress icon + phase name + info icon + metrics (Task 10.3) */}
      <div data-testid="phase-left-side" className="flex items-center gap-2">
        <button
          onClick={handleProgressIconClick}
          className={clsx(
            'p-1 rounded',
            status === 'generated' && 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600',
            status !== 'generated' && 'cursor-default'
          )}
          title={status === 'generated' ? 'Agentログを表示' : undefined}
        >
          {renderProgressIcon()}
        </button>
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
        {/* Info icon - shows description dialog when clicked */}
        {description && (
          <button
            data-testid={`phase-info-button-${phase}`}
            onClick={() => setIsInfoDialogOpen(true)}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="詳細を表示"
          >
            <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </button>
        )}
        {/* spec-productivity-metrics Task 10.3: Inline phase metrics display */}
        {/* Requirements: 6.1-6.4 */}
        {phaseMetrics && (phaseMetrics.aiTimeMs > 0 || phaseMetrics.humanTimeMs > 0) && (
          <span
            data-testid={`phase-metrics-${phase}`}
            className="ml-2 text-xs text-gray-500 dark:text-gray-400"
          >
            <span className="text-blue-500 dark:text-blue-400" data-testid={`phase-metrics-${phase}-ai-time`}>
              AI: {formatDurationCompact(phaseMetrics.aiTimeMs)}
            </span>
            <span className="mx-1">|</span>
            <span className="text-green-500 dark:text-green-400" data-testid={`phase-metrics-${phase}-human-time`}>
              Human: {formatDurationCompact(phaseMetrics.humanTimeMs)}
            </span>
          </span>
        )}
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

        {/* Executing state */}
        {isExecuting && (
          <span className="flex items-center gap-1 px-3 py-1.5 rounded text-sm bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            <Loader2 className="w-4 h-4 animate-spin" />
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
                <AgentIcon />
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
            data-testid={`phase-info-dialog-${phase}`}
            className={clsx(
              'relative z-10 w-full max-w-sm p-5 rounded-lg shadow-xl',
              'bg-white dark:bg-gray-900'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                {label}
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
