/**
 * SpecListItem Component
 * Shared spec list item component used by both Electron and Remote UI
 * Requirements: 3.1, 7.1
 * spec-metadata-ssot-refactor: Updated to use SpecMetadataWithPhase
 * git-worktree-support: Task 11.1, 11.2 - worktree badge display (Requirements: 4.1, 4.2)
 */

import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Bot, Copy, Check, GitBranch } from 'lucide-react';
import type { SpecPhase } from '@shared/api/types';
import type { SpecMetadataWithPhase } from '@shared/types/spec';
import { hasWorktreePath, type WorktreeConfig } from '@shared/types/worktree';
import type { DocumentReviewState } from '@shared/types/review';

// =============================================================================
// Types
// =============================================================================

export interface SpecListItemProps {
  /** Spec metadata with phase info (spec-metadata-ssot-refactor) */
  spec: SpecMetadataWithPhase;
  /** Whether this item is selected */
  isSelected: boolean;
  /** Called when the item is selected */
  onSelect: () => void;
  /** Number of running agents for this spec (optional) */
  runningAgentCount?: number;
  /**
   * Worktree configuration (optional)
   * git-worktree-support: Task 11.2 - worktree props
   * Requirements: 4.1
   */
  worktree?: WorktreeConfig;
  /**
   * Document review state (optional)
   * Shows review completion badge when roundDetails has at least 1 entry
   */
  documentReview?: DocumentReviewState | null;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================
/**
 * Display state for phase badge, including document review states
 */
type DisplayPhaseState = SpecPhase | 'review-in-progress' | 'review-complete';

/**
 * Get display phase state based on spec phase and document review state
 * When phase is 'tasks-generated', check document review state to show review progress
 */
function getDisplayPhaseState(
  phase: SpecPhase,
  documentReview: DocumentReviewState | null | undefined
): DisplayPhaseState {
  // Only override for tasks-generated phase
  if (phase !== 'tasks-generated') {
    return phase;
  }

  // Check document review state
  if (documentReview?.status === 'in_progress') {
    return 'review-in-progress';
  }

  if ((documentReview?.roundDetails?.length ?? 0) >= 1) {
    return 'review-complete';
  }

  return phase;
}

/**
 * Extended phase labels including document review states
 */
const DISPLAY_PHASE_LABELS: Record<DisplayPhaseState, string> = {
  initialized: '初期化',
  'requirements-generated': '要件定義済',
  'design-generated': '設計済',
  'tasks-generated': 'タスク済',
  'review-in-progress': 'レビュー中',
  'review-complete': 'レビュー済',
  'implementation-complete': '実装完了',
  'inspection-complete': '検査完了',
  'deploy-complete': 'デプロイ完了',
};

/**
 * Extended phase colors including document review states
 */
const DISPLAY_PHASE_COLORS: Record<DisplayPhaseState, string> = {
  initialized: 'bg-gray-200 text-gray-700',
  'requirements-generated': 'bg-blue-100 text-blue-700',
  'design-generated': 'bg-yellow-100 text-yellow-700',
  'tasks-generated': 'bg-orange-100 text-orange-700',
  'review-in-progress': 'bg-purple-100 text-purple-700',
  'review-complete': 'bg-purple-200 text-purple-800',
  'implementation-complete': 'bg-green-100 text-green-700',
  'inspection-complete': 'bg-purple-100 text-purple-700',
  'deploy-complete': 'bg-emerald-100 text-emerald-700',
};

export function SpecListItem({
  spec,
  isSelected,
  onSelect,
  runningAgentCount,
  worktree,
  documentReview,
  className,
}: SpecListItemProps): React.ReactElement {
  const [copied, setCopied] = useState(false);

  // Date formatting
  const updatedDate = new Date(spec.updatedAt);
  const now = new Date();
  const isToday = updatedDate.toDateString() === now.toDateString();

  const formattedDate = isToday
    ? updatedDate.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : updatedDate.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric',
      });

  const tooltipDate = updatedDate.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Keyboard handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  // Copy handler
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(spec.name);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <li data-testid={`spec-item-${spec.name}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={handleKeyDown}
        className={clsx(
          'w-full px-4 py-2.5 text-left',
          'flex flex-col gap-1',
          'border-b border-gray-100 dark:border-gray-800',
          'hover:bg-gray-50 dark:hover:bg-gray-800/50',
          'transition-colors cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
          isSelected && 'bg-blue-100 dark:bg-blue-800/40 border-l-4 border-l-blue-500',
          className
        )}
      >
        {/* Row 1: Name and copy button */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
            {spec.name}
          </span>
          <button
            onClick={handleCopy}
            className={clsx(
              'p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700',
              'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
              'transition-colors shrink-0'
            )}
            title="仕様名をコピー"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Row 2: Phase (with document review state), worktree badge, agent count, updated date */}
        <div className="flex items-center gap-2">
          {(() => {
            const displayPhase = getDisplayPhaseState(spec.phase, documentReview);
            return (
              <span
                data-testid="phase-badge"
                className={clsx(
                  'px-2 py-0.5 text-xs rounded-full',
                  DISPLAY_PHASE_COLORS[displayPhase] ?? 'bg-gray-200 text-gray-700'
                )}
              >
                {DISPLAY_PHASE_LABELS[displayPhase] ?? displayPhase}
              </span>
            );
          })()}

          {/* git-worktree-support: Task 11.1 - worktree badge */}
          {/* worktree-execution-ui Task 8.2: Only show when actual worktree mode (path exists) */}
          {worktree && hasWorktreePath({ worktree }) && (
            <span
              data-testid="worktree-badge"
              className="flex items-center gap-1 px-1.5 py-0.5 text-xs bg-violet-100 text-violet-700 rounded"
              title={`Path: ${worktree.path}\nBranch: ${worktree.branch}`}
            >
              <GitBranch className="w-3 h-3" />
              worktree
            </span>
          )}

          {runningAgentCount !== undefined && runningAgentCount > 0 && (
            <span
              data-testid="running-agent-count"
              className="flex items-center gap-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded"
            >
              <Bot className="w-3 h-3" />
              {runningAgentCount}
            </span>
          )}

          <span
            data-testid="updated-date"
            className="text-xs text-gray-400"
            title={tooltipDate}
          >
            {formattedDate}
          </span>
        </div>
      </div>
    </li>
  );
}
