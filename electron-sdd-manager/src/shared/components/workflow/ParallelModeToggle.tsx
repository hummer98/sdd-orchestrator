/**
 * ParallelModeToggle Component
 * parallel-task-impl: Task 5.1-5.3
 *
 * Toggle button for enabling/disabling parallel task execution mode.
 * Only renders when the current spec has parallel tasks.
 * Requirements: 5.1-5.4
 */

import React from 'react';
import { clsx } from 'clsx';
import { Layers } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface ParallelModeToggleProps {
  /** Whether parallel mode is enabled */
  parallelModeEnabled: boolean;
  /** Whether the current spec has parallel tasks */
  hasParallelTasks: boolean;
  /** Number of parallel tasks in the spec */
  parallelTaskCount: number;
  /** Callback when toggle is clicked */
  onToggle: () => void;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * ParallelModeToggle
 *
 * Displays a toggle button for parallel execution mode.
 * Shows the count of parallel tasks and provides visual feedback
 * for enabled/disabled state.
 *
 * Requirements: 5.1-5.4
 */
export function ParallelModeToggle({
  parallelModeEnabled,
  hasParallelTasks,
  parallelTaskCount,
  onToggle,
  className,
}: ParallelModeToggleProps): React.ReactElement | null {
  // Don't render if no parallel tasks
  if (!hasParallelTasks) {
    return null;
  }

  const tooltipText = parallelModeEnabled
    ? `Parallel Mode: ON (${parallelTaskCount} tasks can run in parallel)`
    : `Parallel Mode: OFF (Click to enable parallel execution for ${parallelTaskCount} tasks)`;

  return (
    <div className={clsx('flex items-center gap-1', className)}>
      <button
        data-testid="parallel-mode-toggle"
        type="button"
        onClick={onToggle}
        aria-pressed={parallelModeEnabled}
        aria-label={`Toggle parallel mode. Currently ${parallelModeEnabled ? 'enabled' : 'disabled'}`}
        title={tooltipText}
        className={clsx(
          'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-1',
          parallelModeEnabled
            ? [
                'bg-violet-500 text-white',
                'hover:bg-violet-600',
                'focus:ring-violet-500',
                'dark:bg-violet-600 dark:hover:bg-violet-700',
              ]
            : [
                'bg-gray-100 text-gray-600',
                'hover:bg-gray-200',
                'focus:ring-gray-400',
                'dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
              ]
        )}
      >
        <Layers
          className={clsx(
            'w-3.5 h-3.5',
            parallelModeEnabled ? 'text-white' : 'text-gray-500 dark:text-gray-400'
          )}
        />
        <span className="tabular-nums">{parallelTaskCount}</span>
        <span className="sr-only">parallel tasks</span>
      </button>
    </div>
  );
}
