/**
 * PhaseMetricsView
 * Displays metrics for individual workflow phases
 * Task 7.2: Phase metrics view component
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import React from 'react';
import { clsx } from 'clsx';
import type { PhaseMetrics, PhaseMetricsMap, WorkflowPhase, PhaseStatus } from '../../../main/types/metrics';
import { formatDurationCompact } from '../../utils/timeFormat';

// =============================================================================
// Types
// =============================================================================

export interface PhaseMetricsViewProps {
  /** Phase metrics data (null shows loading state) */
  phaseMetrics: PhaseMetricsMap | null;

  /** Specific phase to display (optional - if not provided, shows all phases) */
  phase?: WorkflowPhase;

  /** Display variant */
  variant?: 'default' | 'inline' | 'compact';

  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const PHASE_LABELS: Record<WorkflowPhase, string> = {
  requirements: 'Requirements',
  design: 'Design',
  tasks: 'Tasks',
  impl: 'Impl',
};

const ALL_PHASES: WorkflowPhase[] = ['requirements', 'design', 'tasks', 'impl'];

// =============================================================================
// Status Icon Component
// =============================================================================

interface StatusIconProps {
  status: PhaseStatus;
  testId: string;
}

function StatusIcon({ status, testId }: StatusIconProps): React.ReactElement {
  const baseClasses = 'w-3 h-3 rounded-full';

  const statusClasses: Record<PhaseStatus, string> = {
    pending: 'bg-gray-300 dark:bg-gray-600',
    'in-progress': 'bg-yellow-400 dark:bg-yellow-500 animate-pulse',
    completed: 'bg-green-500 dark:bg-green-400',
  };

  return (
    <span
      data-testid={testId}
      data-status={status}
      className={clsx(baseClasses, statusClasses[status])}
      title={status}
    />
  );
}

// =============================================================================
// Single Phase Display
// =============================================================================

interface SinglePhaseMetricsProps {
  phase: WorkflowPhase;
  metrics: PhaseMetrics;
  variant: 'default' | 'inline' | 'compact';
  className?: string;
}

function SinglePhaseMetrics({
  phase,
  metrics,
  variant,
  className,
}: SinglePhaseMetricsProps): React.ReactElement {
  const aiTime = formatDurationCompact(metrics.aiTimeMs);
  const humanTime = formatDurationCompact(metrics.humanTimeMs);

  const containerClasses = clsx(
    'flex items-center gap-2',
    variant === 'inline' && 'inline-flex',
    variant === 'compact' && 'compact text-xs gap-1',
    variant === 'default' && 'p-2 rounded border border-gray-200 dark:border-gray-700',
    className
  );

  return (
    <div data-testid={`phase-metrics-${phase}`} className={containerClasses}>
      {/* Status Icon (Requirement 6.4) */}
      <StatusIcon status={metrics.status} testId={`phase-metrics-${phase}-status`} />

      {/* Phase Label (Requirement 6.1) */}
      <span className="text-gray-600 dark:text-gray-400 font-medium min-w-[80px]">
        {PHASE_LABELS[phase]}
      </span>

      {/* AI Time (Requirement 6.2) */}
      <span className="flex items-center gap-1">
        <span className="text-gray-400 dark:text-gray-500 text-xs">AI:</span>
        <span
          data-testid={`phase-metrics-${phase}-ai-time`}
          className="text-blue-600 dark:text-blue-400 font-medium"
        >
          {aiTime}
        </span>
      </span>

      {/* Human Time (Requirement 6.3) */}
      <span className="flex items-center gap-1">
        <span className="text-gray-400 dark:text-gray-500 text-xs">Human:</span>
        <span
          data-testid={`phase-metrics-${phase}-human-time`}
          className="text-green-600 dark:text-green-400 font-medium"
        >
          {humanTime}
        </span>
      </span>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * PhaseMetricsView - Displays metrics for workflow phases
 * Requirements: 6.1-6.4
 */
export function PhaseMetricsView({
  phaseMetrics,
  phase,
  variant = 'default',
  className,
}: PhaseMetricsViewProps): React.ReactElement {
  // Loading state
  if (!phaseMetrics) {
    return (
      <div className={clsx('text-gray-400 dark:text-gray-500', className)}>
        --
      </div>
    );
  }

  // Single phase mode
  if (phase) {
    return (
      <SinglePhaseMetrics
        phase={phase}
        metrics={phaseMetrics[phase]}
        variant={variant}
        className={className}
      />
    );
  }

  // All phases mode
  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      {ALL_PHASES.map((p) => (
        <SinglePhaseMetrics
          key={p}
          phase={p}
          metrics={phaseMetrics[p]}
          variant={variant}
        />
      ))}
    </div>
  );
}
