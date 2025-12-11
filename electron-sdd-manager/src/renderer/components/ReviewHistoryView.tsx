/**
 * ReviewHistoryView Component
 * Displays review history with accordion-style round details
 * Requirements: 6.2, 6.3
 */

import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { ChevronDown, ChevronRight, CheckCircle, Clock, AlertCircle, FileText } from 'lucide-react';
import type { RoundDetail, RoundStatus } from '../types/documentReview';

// ============================================================
// Task 6.2: Props interface
// Requirements: 6.2, 6.3
// ============================================================

export interface ReviewHistoryViewProps {
  /** List of round details */
  rounds: RoundDetail[];
  /** Callback to load round content */
  onLoadRound: (roundNumber: number) => void;
  /** Currently expanded round number */
  expandedRound?: number;
  /** Review document content (markdown) */
  reviewContent?: string;
  /** Reply document content (markdown) */
  replyContent?: string;
}

// ============================================================
// Task 6.2: Status display helpers
// ============================================================

function getStatusDisplay(status: RoundStatus): {
  label: string;
  icon: React.ReactNode;
  colorClass: string;
} {
  switch (status) {
    case 'review_complete':
      return {
        label: 'レビュー完了',
        icon: <Clock className="w-4 h-4" />,
        colorClass: 'text-yellow-500',
      };
    case 'reply_complete':
      return {
        label: '返信完了',
        icon: <CheckCircle className="w-4 h-4" />,
        colorClass: 'text-green-500',
      };
    case 'incomplete':
      return {
        label: '未完了',
        icon: <AlertCircle className="w-4 h-4" />,
        colorClass: 'text-red-500',
      };
    default:
      return {
        label: '不明',
        icon: <Clock className="w-4 h-4" />,
        colorClass: 'text-gray-400',
      };
  }
}

function formatDateTime(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

// ============================================================
// Task 6.2: ReviewHistoryView Component
// Requirements: 6.2, 6.3
// ============================================================

export function ReviewHistoryView({
  rounds,
  onLoadRound,
  expandedRound,
  reviewContent,
  replyContent,
}: ReviewHistoryViewProps) {
  const [localExpandedRound, setLocalExpandedRound] = useState<number | null>(null);

  // Use external expandedRound if provided, otherwise use local state
  const currentExpanded = expandedRound ?? localExpandedRound;

  // Sort rounds by round number (ascending)
  const sortedRounds = useMemo(
    () => [...rounds].sort((a, b) => a.roundNumber - b.roundNumber),
    [rounds]
  );

  const handleToggleRound = (roundNumber: number) => {
    if (currentExpanded === roundNumber) {
      // Collapse
      setLocalExpandedRound(null);
    } else {
      // Expand and load content
      setLocalExpandedRound(roundNumber);
      onLoadRound(roundNumber);
    }
  };

  // Empty state
  if (rounds.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>履歴なし</p>
        <p className="text-sm">レビューを実行すると履歴がここに表示されます</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedRounds.map((round) => {
        const statusDisplay = getStatusDisplay(round.status);
        const isExpanded = currentExpanded === round.roundNumber;

        return (
          <div
            key={round.roundNumber}
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
          >
            {/* Round Header */}
            <button
              onClick={() => handleToggleRound(round.roundNumber)}
              className={clsx(
                'w-full flex items-center justify-between p-3 text-left',
                'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
                isExpanded && 'bg-gray-50 dark:bg-gray-800'
              )}
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  Round {round.roundNumber}
                </span>
                <span className={clsx('flex items-center gap-1 text-sm', statusDisplay.colorClass)}>
                  {statusDisplay.icon}
                  {statusDisplay.label}
                </span>
              </div>

              {/* Timestamps */}
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {round.reviewCompletedAt && formatDateTime(round.reviewCompletedAt)}
              </div>
            </button>

            {/* Round Content (expanded) */}
            {isExpanded && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Review Content */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      レビュー内容
                    </h4>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded text-sm overflow-auto max-h-60">
                      {reviewContent ? (
                        <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                          {reviewContent}
                        </pre>
                      ) : (
                        <span className="text-gray-400">読み込み中...</span>
                      )}
                    </div>
                    {round.reviewCompletedAt && (
                      <p className="text-xs text-gray-400 mt-1">
                        完了: {formatDateTime(round.reviewCompletedAt)}
                      </p>
                    )}
                  </div>

                  {/* Reply Content */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      返信内容
                    </h4>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded text-sm overflow-auto max-h-60">
                      {replyContent ? (
                        <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                          {replyContent}
                        </pre>
                      ) : round.status === 'reply_complete' ? (
                        <span className="text-gray-400">読み込み中...</span>
                      ) : (
                        <span className="text-gray-400">未完了</span>
                      )}
                    </div>
                    {round.replyCompletedAt && (
                      <p className="text-xs text-gray-400 mt-1">
                        完了: {formatDateTime(round.replyCompletedAt)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
