/**
 * MetricsSummaryPanel
 * Displays summary metrics for a spec
 * Task 7.1: Metrics summary panel component
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import React from 'react';
import { clsx } from 'clsx';
import type { SpecMetrics } from '../../../main/types/metrics';
import { formatDurationCompact } from '../../utils/timeFormat';

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
  const aiTime = metrics ? formatDurationCompact(metrics.totalAiTimeMs) : '--';
  const humanTime = metrics ? formatDurationCompact(metrics.totalHumanTimeMs) : '--';
  const totalTime = metrics?.totalElapsedMs
    ? formatDurationCompact(metrics.totalElapsedMs)
    : '--';
  const status = metrics?.status ?? 'in-progress';

  return (
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
      <div className="ml-auto">
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
      </div>
    </div>
  );
}
