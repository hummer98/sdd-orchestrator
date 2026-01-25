/**
 * ParallelModeToggle Component
 * parallel-task-impl: Task 5.1-5.3
 * impl-mode-toggle: Task 3.1, 3.2
 *
 * Toggle button for switching between sequential and parallel execution mode.
 * impl-mode-toggle: Now always renders and uses ImplMode for state.
 *
 * Requirements: 5.1-5.4 (parallel-task-impl)
 * Requirements: 2.1, 2.2, 2.3, 5.1, 5.2, 5.3, 5.4 (impl-mode-toggle)
 */

import React from 'react';
import { clsx } from 'clsx';
import { User, Users } from 'lucide-react';
import type { ImplMode } from '@renderer/types/implMode';

// =============================================================================
// Types
// =============================================================================

/**
 * New simplified props interface (impl-mode-toggle)
 * Requirements: 5.1, 5.3, 5.4
 */
export interface ParallelModeToggleNewProps {
  /** Implementation mode: 'sequential' or 'parallel' */
  mode: ImplMode;
  /** Callback when toggle is clicked */
  onToggle: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Legacy props interface (deprecated, for backward compatibility)
 * @deprecated Use ParallelModeToggleNewProps with `mode` prop instead
 */
export interface ParallelModeToggleLegacyProps {
  /**
   * Whether parallel mode is enabled
   * @deprecated Use `mode: 'parallel' | 'sequential'` instead
   */
  parallelModeEnabled: boolean;
  /**
   * Whether the current spec has parallel tasks
   * @deprecated This prop is ignored - component now always renders (Req 5.1)
   */
  hasParallelTasks: boolean;
  /**
   * Number of parallel tasks in the spec
   * @deprecated This prop is ignored - count display removed (Req 5.4)
   */
  parallelTaskCount: number;
  /** Callback when toggle is clicked */
  onToggle: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Combined props type supporting both new and legacy APIs
 */
export type ParallelModeToggleProps = ParallelModeToggleNewProps | ParallelModeToggleLegacyProps;

// =============================================================================
// Type Guards
// =============================================================================

function isNewProps(props: ParallelModeToggleProps): props is ParallelModeToggleNewProps {
  return 'mode' in props;
}

// =============================================================================
// Component
// =============================================================================

/**
 * ParallelModeToggle
 *
 * Displays a toggle button for switching between sequential and parallel
 * execution modes. Uses User icon for sequential and Users icon for parallel.
 *
 * impl-mode-toggle: Always renders (Req 2.1), uses User/Users icons (Req 2.2)
 *
 * Requirements: 2.1, 2.2, 2.3, 5.1, 5.2, 5.3, 5.4 (impl-mode-toggle)
 */
export function ParallelModeToggle(props: ParallelModeToggleProps): React.ReactElement {
  const { onToggle, className } = props;

  // Normalize to new mode-based API
  const mode: ImplMode = isNewProps(props)
    ? props.mode
    : (props.parallelModeEnabled ? 'parallel' : 'sequential');

  const isParallel = mode === 'parallel';

  // Requirement 2.2: User/Users icons
  const Icon = isParallel ? Users : User;
  const iconTestId = isParallel ? 'icon-users' : 'icon-user';

  // Tooltip and aria labels
  const modeLabel = isParallel ? 'Parallel' : 'Sequential';
  const tooltipText = isParallel
    ? 'Parallel Mode: Uses spec-auto-impl for batch execution. Click to switch to Sequential.'
    : 'Sequential Mode: Uses spec-impl for step-by-step execution. Click to switch to Parallel.';

  return (
    <div className={clsx('flex items-center gap-1', className)}>
      <button
        data-testid="parallel-mode-toggle"
        type="button"
        onClick={onToggle}
        aria-pressed={isParallel}
        aria-label={`${modeLabel} Mode. Click to toggle.`}
        title={tooltipText}
        className={clsx(
          'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-1',
          isParallel
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
        <Icon
          data-testid={iconTestId}
          className={clsx(
            'w-3.5 h-3.5',
            isParallel ? 'text-white' : 'text-gray-500 dark:text-gray-400'
          )}
        />
        <span className="sr-only">{modeLabel} mode</span>
      </button>
    </div>
  );
}
