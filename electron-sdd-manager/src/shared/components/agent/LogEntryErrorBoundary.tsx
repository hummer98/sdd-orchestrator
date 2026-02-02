/**
 * LogEntryErrorBoundary
 * React Error Boundary for individual log entry rendering.
 *
 * Catches rendering errors in individual LogEntryBlock components
 * to prevent a single corrupted log entry from crashing the entire UI.
 * Displays a compact error indicator instead of the failed entry.
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

interface LogEntryErrorBoundaryProps {
  children: React.ReactNode;
  /** Entry ID for error reporting */
  entryId?: string;
}

interface LogEntryErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class LogEntryErrorBoundary extends React.Component<
  LogEntryErrorBoundaryProps,
  LogEntryErrorBoundaryState
> {
  constructor(props: LogEntryErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): LogEntryErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(
      `[LogEntryErrorBoundary] Render error in entry "${this.props.entryId ?? 'unknown'}":`,
      error,
      errorInfo.componentStack
    );
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          data-testid="log-entry-error"
          className={clsx(
            'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm',
            'bg-red-50 dark:bg-red-900/20',
            'border-red-200 dark:border-red-700',
            'text-red-700 dark:text-red-300'
          )}
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            {'\u30ED\u30B0\u30A8\u30F3\u30C8\u30EA\u306E\u8868\u793A\u306B\u5931\u6557\u3057\u307E\u3057\u305F'}
            {this.state.error && (
              <span className="ml-1 text-xs text-red-500 dark:text-red-400 font-mono">
                ({this.state.error.message})
              </span>
            )}
          </span>
        </div>
      );
    }

    return this.props.children;
  }
}
