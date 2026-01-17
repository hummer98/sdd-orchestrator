/**
 * DocumentReviewPanel Component (Shared)
 *
 * Task 4.6: DocumentReview・Inspection・Validation関連コンポーネントを共有化する
 * gemini-document-review Task 7.1, 7.2: Added scheme tag and selector
 *
 * ドキュメントレビューのワークフロー制御とステータス表示を行うコンポーネント。
 * props-driven設計で、ストア非依存。Electron版とRemote UI版で共有可能。
 */

import { clsx } from 'clsx';
import { Loader2, Check, Circle, Ban, PlayCircle, Wrench } from 'lucide-react';
import { AgentIcon } from '../ui/AgentIcon';
import type {
  DocumentReviewState,
  DocumentReviewAutoExecutionFlag,
} from '../../types';
import { SchemeSelector, type ReviewerScheme } from './SchemeSelector';

// =============================================================================
// Types
// =============================================================================

export interface DocumentReviewPanelProps {
  /** Current review state from spec.json */
  reviewState: DocumentReviewState | null;
  /** Whether review is currently executing (Agent running) */
  isExecuting: boolean;
  /** Whether auto execution is running (global workflow auto execution) */
  isAutoExecuting?: boolean;
  /** Whether tasks.md exists and has content */
  hasTasks?: boolean;
  /** Auto execution flag (run/pause/skip) */
  autoExecutionFlag?: DocumentReviewAutoExecutionFlag;
  /** Handler for starting a new review round */
  onStartReview: () => void;
  /** Handler for executing reply for a specific round */
  onExecuteReply?: (roundNumber: number) => void;
  /** Handler for applying fixes from a specific round's reply */
  onApplyFix?: (roundNumber: number) => void;
  /** Handler for auto execution flag change */
  onAutoExecutionFlagChange?: (flag: DocumentReviewAutoExecutionFlag) => void;
  // gemini-document-review Task 7.1, 7.2: Scheme support
  // Requirements: 7.1, 7.2, 7.3, 7.4
  /** Current reviewer scheme (default: claude-code) */
  scheme?: ReviewerScheme;
  /** Handler for scheme change */
  onSchemeChange?: (scheme: ReviewerScheme) => void;
}

// =============================================================================
// Helper Types & Functions
// =============================================================================

type ProgressIndicatorState = 'checked' | 'unchecked' | 'executing';

function getProgressIndicatorState(
  reviewState: DocumentReviewState | null,
  isExecuting: boolean,
  _autoExecutionFlag: DocumentReviewAutoExecutionFlag
): ProgressIndicatorState {
  // Priority 1: Executing (status === 'in_progress' or isExecuting)
  if (isExecuting || reviewState?.status === 'in_progress') {
    return 'executing';
  }

  // Priority 2: Checked (has roundDetails)
  if (reviewState && (reviewState.roundDetails?.length ?? 0) >= 1) {
    return 'checked';
  }

  // Default: Unchecked
  return 'unchecked';
}

function renderProgressIndicator(state: ProgressIndicatorState): React.ReactNode {
  switch (state) {
    case 'checked':
      return (
        <Check
          data-testid="progress-indicator-checked"
          className="w-4 h-4 text-green-500"
        />
      );
    case 'unchecked':
      return (
        <Circle
          data-testid="progress-indicator-unchecked"
          className="w-4 h-4 text-gray-300 dark:text-gray-600"
        />
      );
    case 'executing':
      return (
        <Loader2
          data-testid="progress-indicator-executing"
          className="w-4 h-4 text-blue-500 animate-spin"
        />
      );
  }
}

function getNextAutoExecutionFlag(
  current: DocumentReviewAutoExecutionFlag
): DocumentReviewAutoExecutionFlag {
  switch (current) {
    case 'run':
      return 'pause';
    case 'pause':
      return 'run';
  }
}

function renderAutoExecutionFlagIcon(flag: DocumentReviewAutoExecutionFlag): React.ReactNode {
  switch (flag) {
    case 'run':
      return (
        <PlayCircle data-testid="auto-flag-run" className="w-4 h-4 text-green-500" />
      );
    case 'pause':
      return <Ban data-testid="auto-flag-pause" className="w-4 h-4 text-yellow-500" />;
  }
}

function getAutoExecutionFlagTooltip(flag: DocumentReviewAutoExecutionFlag): string {
  switch (flag) {
    case 'run':
      return '自動実行: 実行';
    case 'pause':
      return '自動実行: 一時停止';
  }
}

// =============================================================================
// Component
// =============================================================================

export function DocumentReviewPanel({
  reviewState,
  isExecuting,
  isAutoExecuting = false,
  hasTasks = true,
  autoExecutionFlag = 'run',
  onStartReview,
  onExecuteReply,
  onApplyFix,
  onAutoExecutionFlagChange,
  // gemini-document-review Task 7.1, 7.2
  scheme,
  onSchemeChange,
}: DocumentReviewPanelProps) {
  const rounds = reviewState?.roundDetails?.length ?? 0;
  // Review start button is enabled when:
  // - Not currently executing (document review agent running)
  // - Not in auto execution mode (global workflow auto execution)
  // - tasks.md exists
  const canStartReview = !isExecuting && !isAutoExecuting && hasTasks;

  // Get the latest round (last element in the array)
  const latestRound = reviewState?.roundDetails?.at(-1) ?? null;

  // Check if there's a review without a reply (review_complete but not reply_complete)
  // Only check the latest round - past rounds are historical
  const pendingReplyRound =
    latestRound?.status === 'review_complete' ? latestRound.roundNumber : null;

  // Check if the latest reply needs action (fixStatus is 'pending' or 'applied')
  // 'pending' = fixes/discussion needed, 'applied' = awaiting re-review
  // 'not_required' = no action needed, can proceed to next review round
  const pendingFixRound =
    latestRound?.status === 'reply_complete' &&
    (latestRound.fixStatus === 'pending' || latestRound.fixStatus === 'applied')
      ? latestRound.roundNumber
      : null;

  // Progress indicator state
  const progressIndicatorState = getProgressIndicatorState(
    reviewState,
    isExecuting,
    autoExecutionFlag
  );

  // Handle auto execution flag toggle
  const handleAutoExecutionFlagClick = () => {
    if (onAutoExecutionFlagChange) {
      const nextFlag = getNextAutoExecutionFlag(autoExecutionFlag);
      onAutoExecutionFlagChange(nextFlag);
    }
  };

  return (
    <div
      data-testid="document-review-panel"
      className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        {/* Left side: Progress indicator + Icon + Title + Scheme Tag */}
        <div className="flex items-center gap-2">
          {/* Progress indicator (title left side) */}
          <span className="p-1">{renderProgressIndicator(progressIndicatorState)}</span>

          <h3 className="font-medium text-gray-800 dark:text-gray-200">
            ドキュメントレビュー
          </h3>

          {/* gemini-document-review Task 7.1, 7.2: Scheme Selector */}
          {/* Requirements: 7.1, 7.2, 7.3, 7.4 */}
          {onSchemeChange && (
            <SchemeSelector
              scheme={scheme}
              onChange={onSchemeChange}
              disabled={isExecuting}
              className="ml-2"
            />
          )}
        </div>

        {/* Right side: Auto execution flag control */}
        <button
          data-testid="auto-execution-flag-control"
          onClick={handleAutoExecutionFlagClick}
          className={clsx(
            'p-1 rounded',
            'hover:bg-gray-200 dark:hover:bg-gray-600',
            'transition-colors'
          )}
          title={getAutoExecutionFlagTooltip(autoExecutionFlag)}
        >
          {renderAutoExecutionFlagIcon(autoExecutionFlag)}
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-3 text-sm text-gray-600 dark:text-gray-400">
        <span>
          ラウンド:{' '}
          <strong className="text-gray-800 dark:text-gray-200">{rounds}</strong>
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {/* Priority 1: Show "レビュー内容判定" button when there's a pending reply */}
        {pendingReplyRound !== null ? (
          <button
            onClick={() => onExecuteReply?.(pendingReplyRound)}
            disabled={!canStartReview}
            data-testid="execute-reply-button"
            className={clsx(
              'flex items-center gap-1 px-3 py-1.5 text-sm rounded transition-colors',
              canStartReview
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
            )}
          >
            <AgentIcon data-testid="execute-reply-agent-icon" />
            レビュー内容判定 (Round {pendingReplyRound})
          </button>
        ) : pendingFixRound !== null ? (
          /* Priority 2: Show "replyを適用" button when there's a pending fix */
          <button
            onClick={() => onApplyFix?.(pendingFixRound)}
            disabled={!canStartReview}
            data-testid="apply-fix-button"
            className={clsx(
              'flex items-center gap-1 px-3 py-1.5 text-sm rounded transition-colors',
              canStartReview
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
            )}
          >
            <Wrench className="w-4 h-4" />
            replyを適用 (Round {pendingFixRound})
          </button>
        ) : (
          /* Default: Start Review Button - enabled when not executing */
          <button
            onClick={onStartReview}
            disabled={!canStartReview}
            data-testid="start-review-button"
            className={clsx(
              'flex items-center gap-1 px-3 py-1.5 text-sm rounded transition-colors',
              canStartReview
                ? 'bg-purple-500 text-white hover:bg-purple-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
            )}
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {reviewState?.currentRound ?? rounds + 1}ラウンド目 review実行中...
              </>
            ) : (
              <>
                <AgentIcon data-testid="start-review-agent-icon" />
                レビュー開始
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
