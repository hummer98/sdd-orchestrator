/**
 * Toast Component
 * Shared toast notification component used by both Electron and Remote UI
 * Requirements: 3.1 (Component sharing)
 */

import React from 'react';
import { clsx } from 'clsx';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  /** Button label */
  label: string;
  /** Click handler */
  onClick: () => void;
}

export interface ToastProps {
  /** Unique toast identifier */
  id: string;
  /** Toast message */
  message: string;
  /** Toast type for styling */
  type: ToastType;
  /** Called when close button is clicked */
  onClose: () => void;
  /** Optional action button */
  action?: ToastAction;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Icons
// =============================================================================

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

// =============================================================================
// Color Styles
// =============================================================================

const COLORS = {
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-800 dark:text-green-200',
    icon: 'text-green-500',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-200',
    icon: 'text-red-500',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    text: 'text-yellow-800 dark:text-yellow-200',
    icon: 'text-yellow-500',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-200',
    icon: 'text-blue-500',
  },
};

// =============================================================================
// Component
// =============================================================================

/**
 * Toast - Individual toast notification
 *
 * Usage:
 * ```tsx
 * <Toast
 *   id="1"
 *   type="success"
 *   message="Operation completed"
 *   onClose={() => handleClose("1")}
 *   action={{ label: "Undo", onClick: handleUndo }}
 * />
 * ```
 */
export function Toast({
  id: _id,  // Kept for potential future use (e.g., aria-labelledby)
  message,
  type,
  onClose,
  action,
  className,
}: ToastProps): React.ReactElement {
  void _id; // Suppress unused variable warning
  const Icon = ICONS[type];
  const colors = COLORS[type];

  return (
    <div
      role="alert"
      className={clsx(
        'flex items-start gap-3 p-4 rounded-lg shadow-lg border',
        colors.bg,
        colors.border,
        className
      )}
    >
      <Icon
        data-testid="toast-icon"
        className={clsx('w-5 h-5 flex-shrink-0 mt-0.5', colors.icon)}
      />

      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm font-medium', colors.text)}>
          {message}
        </p>

        {action && (
          <button
            onClick={action.onClick}
            className={clsx(
              'mt-2 text-sm font-medium underline',
              colors.text,
              'hover:opacity-80'
            )}
          >
            {action.label}
          </button>
        )}
      </div>

      <button
        onClick={onClose}
        aria-label="Close notification"
        className={clsx(
          'p-1 rounded hover:bg-black/10',
          colors.text
        )}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
