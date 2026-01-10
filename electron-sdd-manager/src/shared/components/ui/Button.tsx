/**
 * Button Component
 * Shared button component used by both Electron and Remote UI
 * Requirements: 3.1 (Component sharing)
 */

import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Button variant styling
   * @default 'primary'
   */
  variant?: ButtonVariant;

  /**
   * Button size
   * @default 'md'
   */
  size?: ButtonSize;

  /**
   * Show loading spinner and disable interaction
   * @default false
   */
  loading?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Button content
   */
  children: React.ReactNode;
}

// =============================================================================
// Variant Styles
// =============================================================================

const variantStyles: Record<ButtonVariant, string> = {
  primary: clsx(
    'bg-blue-600 text-white',
    'hover:bg-blue-700',
    'focus:ring-blue-500',
    'disabled:bg-blue-400'
  ),
  secondary: clsx(
    'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100',
    'hover:bg-gray-300 dark:hover:bg-gray-600',
    'focus:ring-gray-500',
    'disabled:bg-gray-100 dark:disabled:bg-gray-800'
  ),
  danger: clsx(
    'bg-red-600 text-white',
    'hover:bg-red-700',
    'focus:ring-red-500',
    'disabled:bg-red-400'
  ),
  ghost: clsx(
    'bg-transparent text-gray-700 dark:text-gray-300',
    'hover:bg-gray-100 dark:hover:bg-gray-800',
    'focus:ring-gray-500'
  ),
};

// =============================================================================
// Size Styles
// =============================================================================

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

// =============================================================================
// Component
// =============================================================================

/**
 * Button - Shared button component
 *
 * Usage:
 * ```tsx
 * <Button variant="primary" onClick={handleClick}>Save</Button>
 * <Button variant="danger" loading={isSaving}>Delete</Button>
 * <Button variant="ghost" size="sm">Cancel</Button>
 * ```
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps): React.ReactElement {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={clsx(
        // Base styles
        'inline-flex items-center justify-center gap-2',
        'font-medium rounded-md',
        'transition-colors duration-150',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        // Variant and size
        variantStyles[variant],
        sizeStyles[size],
        // Custom classes
        className
      )}
      {...props}
    >
      {loading && (
        <Loader2
          data-testid="button-spinner"
          className="w-4 h-4 animate-spin"
        />
      )}
      {children}
    </button>
  );
}
