/**
 * MetricsSummaryPanel
 * Displays summary metrics for a spec
 * Task 7.1: Metrics summary panel component
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import React, { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { Info, X } from 'lucide-react';
import type { SpecMetrics } from '../../../main/types/metrics';
import { formatDurationCompact } from '../../utils/timeFormat';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from '../ui/Modal';

// =============================================================================
// Types
// =============================================================================

export interface MetricsSummaryPanelProps {
  /** Metrics data to display (null shows loading state) */
  metrics: SpecMetrics | null;

  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * MetricsSummaryPanel - Displays AI time, human time, and total elapsed time
 * Requirements: 5.1-5.6
 */
export function MetricsSummaryPanel({
  metrics,
  className,
}: MetricsSummaryPanelProps): React.ReactElement {
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const handleOpenInfo = useCallback(() => {
    setIsInfoModalOpen(true);
  }, []);

  const handleCloseInfo = useCallback(() => {
    setIsInfoModalOpen(false);
  }, []);

  const aiTime = metrics ? formatDurationCompact(metrics.totalAiTimeMs) : '--';
  const humanTime = metrics ? formatDurationCompact(metrics.totalHumanTimeMs) : '--';
  const totalTime = metrics?.totalElapsedMs
    ? formatDurationCompact(metrics.totalElapsedMs)
    : '--';
  const status = metrics?.status ?? 'in-progress';

  return (
    <>
    <div
      data-testid="metrics-summary-panel"
      className={clsx(
        'flex items-center gap-4 p-3',
        'rounded-lg border',
        'bg-gray-50 dark:bg-gray-800/50',
        'border-gray-200 dark:border-gray-700',
        'text-sm',
        className
      )}
    >
      {/* AI Time (Requirement 5.1) */}
      <div className="flex items-center gap-1.5">
        <span className="text-gray-500 dark:text-gray-400">AI:</span>
        <span
          data-testid="metrics-ai-time"
          className="font-medium text-blue-600 dark:text-blue-400"
        >
          {aiTime}
        </span>
      </div>

      {/* Separator */}
      <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />

      {/* Human Time (Requirement 5.2) */}
      <div className="flex items-center gap-1.5">
        <span className="text-gray-500 dark:text-gray-400">Human:</span>
        <span
          data-testid="metrics-human-time"
          className="font-medium text-green-600 dark:text-green-400"
        >
          {humanTime}
        </span>
      </div>

      {/* Separator */}
      <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />

      {/* Total Time (Requirement 5.3) */}
      <div className="flex items-center gap-1.5">
        <span className="text-gray-500 dark:text-gray-400">Total:</span>
        <span
          data-testid="metrics-total-time"
          className="font-medium text-gray-900 dark:text-gray-100"
        >
          {totalTime}
        </span>
      </div>

      {/* Status Badge (Requirements 5.4, 5.5) */}
      <div className="ml-auto flex items-center gap-2">
        <span
          data-testid="metrics-status"
          className={clsx(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            status === 'completed'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
          )}
        >
          {status === 'completed' ? '完了' : '進行中'}
        </span>

        {/* Info Button */}
        <button
          type="button"
          data-testid="metrics-info-button"
          onClick={handleOpenInfo}
          className={clsx(
            'p-1 rounded-full',
            'text-gray-400 hover:text-gray-600',
            'dark:text-gray-500 dark:hover:text-gray-300',
            'hover:bg-gray-200 dark:hover:bg-gray-700',
            'transition-colors'
          )}
          aria-label="メトリクスの説明を表示"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
    </div>

    {/* Info Modal */}
    <Modal
      isOpen={isInfoModalOpen}
      onClose={handleCloseInfo}
      size="md"
      aria-labelledby="metrics-info-title"
    >
      <ModalHeader className="flex items-center justify-between">
        <ModalTitle id="metrics-info-title">メトリクスについて</ModalTitle>
        <button
          type="button"
          onClick={handleCloseInfo}
          className={clsx(
            'p-1 rounded-full',
            'text-gray-400 hover:text-gray-600',
            'dark:text-gray-500 dark:hover:text-gray-300',
            'hover:bg-gray-200 dark:hover:bg-gray-700',
            'transition-colors'
          )}
          aria-label="閉じる"
        >
          <X className="w-5 h-5" />
        </button>
      </ModalHeader>
      <ModalContent>
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            このパネルはSpec（仕様）毎の開発時間メトリクスを表示します。
          </p>

          <div className="space-y-3">
            {/* AI Time */}
            <div className="flex items-start gap-3">
              <span className="font-medium text-blue-600 dark:text-blue-400 w-16 shrink-0">
                AI
              </span>
              <p className="text-gray-600 dark:text-gray-400">
                AIエージェントが各フェーズ（Requirements, Design, Tasks, Implementation）で作業に費やした累積時間
              </p>
            </div>

            {/* Human Time */}
            <div className="flex items-start gap-3">
              <span className="font-medium text-green-600 dark:text-green-400 w-16 shrink-0">
                Human
              </span>
              <p className="text-gray-600 dark:text-gray-400">
                人間がレビュー・承認・編集などの操作に費やした累積時間（UIでの操作時間を自動計測）
              </p>
            </div>

            {/* Total Time */}
            <div className="flex items-start gap-3">
              <span className="font-medium text-gray-900 dark:text-gray-100 w-16 shrink-0">
                Total
              </span>
              <p className="text-gray-600 dark:text-gray-400">
                Spec作成開始から完了までの総経過時間
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-500">
              これらのメトリクスは <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">.kiro/metrics.jsonl</code> に記録されます。
            </p>
          </div>
        </div>
      </ModalContent>
      <ModalFooter>
        <button
          type="button"
          onClick={handleCloseInfo}
          className={clsx(
            'px-4 py-2 rounded-lg',
            'bg-gray-100 hover:bg-gray-200',
            'dark:bg-gray-700 dark:hover:bg-gray-600',
            'text-gray-700 dark:text-gray-300',
            'transition-colors'
          )}
        >
          閉じる
        </button>
      </ModalFooter>
    </Modal>
    </>
  );
}
