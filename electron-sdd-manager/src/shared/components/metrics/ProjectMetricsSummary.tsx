/**
 * ProjectMetricsSummary
 * Displays project-wide metrics summary
 * Task 8.2: Project metrics UI
 * Requirements: 8.1, 8.2, 8.3
 */

import React from 'react';
import { clsx } from 'clsx';
import type { ProjectMetrics } from '../../../main/types/metrics';
import { formatDurationCompact } from '../../utils/timeFormat';

// =============================================================================
// Types
// =============================================================================

export interface ProjectMetricsSummaryProps {
  /** Project metrics data to display (null shows loading state) */
  metrics: ProjectMetrics | null;

  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * ProjectMetricsSummary - Displays project-wide AI time, human time, and spec counts
 * Requirements: 8.1, 8.2, 8.3
 */
export function ProjectMetricsSummary({
  metrics,
  className,
}: ProjectMetricsSummaryProps): React.ReactElement {
  const aiTime = metrics ? formatDurationCompact(metrics.totalAiTimeMs) : '--';
  const humanTime = metrics ? formatDurationCompact(metrics.totalHumanTimeMs) : '--';
  const completedCount = metrics?.completedSpecCount ?? '--';
  const inProgressCount = metrics?.inProgressSpecCount ?? '--';

  return (
    <div
      data-testid="project-metrics-summary"
      className={clsx(
        'flex items-center gap-4 p-3',
        'rounded-lg border',
        'bg-gray-50 dark:bg-gray-800/50',
        'border-gray-200 dark:border-gray-700',
        'text-sm',
        className
      )}
    >
      {/* AI Time (Requirement 8.1) */}
      <div className="flex items-center gap-1.5">
        <span className="text-gray-500 dark:text-gray-400">AI:</span>
        <span
          data-testid="project-metrics-ai-time"
          className="font-medium text-blue-600 dark:text-blue-400"
        >
          {aiTime}
        </span>
      </div>

      {/* Separator */}
      <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />

      {/* Human Time (Requirement 8.2) */}
      <div className="flex items-center gap-1.5">
        <span className="text-gray-500 dark:text-gray-400">Human:</span>
        <span
          data-testid="project-metrics-human-time"
          className="font-medium text-green-600 dark:text-green-400"
        >
          {humanTime}
        </span>
      </div>

      {/* Separator */}
      <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />

      {/* Completed Specs (Requirement 8.3) */}
      <div className="flex items-center gap-1.5">
        <span className="text-gray-500 dark:text-gray-400">Completed:</span>
        <span
          data-testid="project-metrics-completed-count"
          className="font-medium text-green-600 dark:text-green-400"
        >
          {completedCount}
        </span>
      </div>

      {/* Separator */}
      <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />

      {/* In-Progress Specs (Requirement 8.3) */}
      <div className="flex items-center gap-1.5">
        <span className="text-gray-500 dark:text-gray-400">In Progress:</span>
        <span
          data-testid="project-metrics-in-progress-count"
          className="font-medium text-yellow-600 dark:text-yellow-400"
        >
          {inProgressCount}
        </span>
      </div>
    </div>
  );
}
