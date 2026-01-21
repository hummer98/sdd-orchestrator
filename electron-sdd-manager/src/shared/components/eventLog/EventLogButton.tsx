/**
 * EventLogButton Component
 * Button to open the event log viewer modal
 * Requirements: 3.1, 3.2 (spec-event-log)
 */

import React from 'react';
import { clsx } from 'clsx';
import { History } from 'lucide-react';

export interface EventLogButtonProps {
  /** Click handler to open the modal */
  onClick: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * EventLogButton - History icon button for opening event log viewer
 *
 * Requirements:
 * - 3.1: Footer button placement (always visible)
 * - 3.2: Always show button regardless of event count
 *
 * Usage:
 * ```tsx
 * <EventLogButton onClick={() => setModalOpen(true)} />
 * ```
 */
export function EventLogButton({
  onClick,
  className,
}: EventLogButtonProps): React.ReactElement {
  return (
    <button
      data-testid="event-log-button"
      onClick={onClick}
      className={clsx(
        'flex items-center justify-center gap-2 px-3 py-2 rounded',
        'font-medium transition-colors',
        'bg-gray-100 text-gray-700 hover:bg-gray-200',
        'dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
        className
      )}
      title="Show event history"
    >
      <History className="w-4 h-4" />
    </button>
  );
}
