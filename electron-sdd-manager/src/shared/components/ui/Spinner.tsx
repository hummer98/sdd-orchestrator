/**
 * Spinner Component
 * Shared loading spinner component used by both Electron and Remote UI
 * Requirements: 3.1 (Component sharing)
 */

import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  /**
   * Spinner size
   * @default 'md'
   */
  size?: SpinnerSize;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Accessibility label
   * @default 'Loading'
   */
  'aria-label'?: string;
}

// =============================================================================
// Size Styles
// =============================================================================

const sizeStyles: Record<SpinnerSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

// =============================================================================
// Component
// =============================================================================

/**
 * Spinner - Loading indicator
 *
 * Usage:
 * ```tsx
 * <Spinner />
 * <Spinner size="lg" />
 * <Spinner className="text-green-500" />
 * ```
 */
export function Spinner({
  size = 'md',
  className,
  'aria-label': ariaLabel = 'Loading',
}: SpinnerProps): React.ReactElement {
  const combinedClassName = clsx(
    'animate-spin',
    'text-blue-600 dark:text-blue-400',
    sizeStyles[size],
    className
  );

  return (
    <span
      data-testid="spinner"
      aria-label={ariaLabel}
      className={combinedClassName}
    >
      <Loader2 className={combinedClassName} />
    </span>
  );
}
