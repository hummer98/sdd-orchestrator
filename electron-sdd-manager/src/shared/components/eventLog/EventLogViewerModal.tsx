/**
 * EventLogViewerModal Component
 * Modal dialog for viewing event log history
 * Requirements: 3.3, 3.4, 3.7, 5.1, 5.2 (spec-event-log)
 */

import React from 'react';
import { clsx } from 'clsx';
import { X, History, Loader2, AlertTriangle } from 'lucide-react';
import { EventLogListItem } from './EventLogListItem';
import type { EventLogEntry, EventLogError } from '../../types';

export interface EventLogViewerModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Handler to close the modal */
  onClose: () => void;
  /** Event log entries */
  events: EventLogEntry[];
  /** Whether events are loading */
  isLoading?: boolean;
  /** Error if loading failed */
  error?: EventLogError | null;
  /** Additional CSS classes for the modal */
  className?: string;
}

/**
 * EventLogViewerModal - Modal dialog for viewing event history
 *
 * Requirements:
 * - 3.3: Modal display with open/close control
 * - 3.4: Chronological display (newest first)
 * - 3.7: Empty state message when no events
 * - 5.1: Shared component implementation
 * - 5.2: Works for both Electron and Remote UI
 *
 * Usage:
 * ```tsx
 * <EventLogViewerModal
 *   isOpen={isModalOpen}
 *   onClose={() => setModalOpen(false)}
 *   events={events}
 *   isLoading={isLoading}
 *   error={error}
 * />
 * ```
 */
export function EventLogViewerModal({
  isOpen,
  onClose,
  events,
  isLoading = false,
  error = null,
  className,
}: EventLogViewerModalProps): React.ReactElement | null {
  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  return (
    <div
      data-testid="event-log-modal"
      className={clsx(
        'fixed inset-0 z-50 flex items-center justify-center',
        'bg-black/50 backdrop-blur-sm',
        className
      )}
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Modal content */}
      <div
        className={clsx(
          'w-full max-w-2xl max-h-[80vh] mx-4',
          'bg-white dark:bg-gray-900',
          'rounded-lg shadow-xl',
          'flex flex-col overflow-hidden'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Event History
            </h2>
          </div>
          <button
            data-testid="event-log-modal-close"
            onClick={onClose}
            className={clsx(
              'p-1 rounded',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'transition-colors'
            )}
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Loading state */}
          {isLoading && (
            <div
              data-testid="event-log-loading"
              className="flex items-center justify-center py-8"
            >
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">
                Loading events...
              </span>
            </div>
          )}

          {/* Error state */}
          {!isLoading && error && (
            <div
              data-testid="event-log-error"
              className="flex items-center justify-center py-8"
            >
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <span className="ml-2 text-red-600 dark:text-red-400">
                Failed to load events: {error.type}
              </span>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && events.length === 0 && (
            <div
              data-testid="event-log-empty"
              className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400"
            >
              <History className="w-12 h-12 mb-2 opacity-50" />
              <p>No events recorded yet</p>
            </div>
          )}

          {/* Event list */}
          {!isLoading && !error && events.length > 0 && (
            <div className="space-y-2">
              {events.map((event, index) => (
                <EventLogListItem
                  key={`${event.timestamp}-${index}`}
                  event={event}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
