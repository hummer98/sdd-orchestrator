/**
 * EventLogListItem Component
 * Individual event log entry display with type-specific styling
 * Requirements: 3.5, 3.6 (spec-event-log)
 */

import React from 'react';
import { clsx } from 'clsx';
import {
  Bot,
  Play,
  Square,
  Check,
  GitBranch,
  RefreshCw,
  FileSearch,
  AlertCircle,
} from 'lucide-react';
import type { EventLogEntry, EventType } from '../../types';

export interface EventLogListItemProps {
  /** Event log entry */
  event: EventLogEntry;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get icon component for event type
 */
function getEventIcon(type: EventType): React.ReactNode {
  switch (type) {
    case 'agent:start':
    case 'agent:complete':
    case 'agent:fail':
      return <Bot className="w-4 h-4" />;
    case 'auto-execution:start':
      return <Play className="w-4 h-4" />;
    case 'auto-execution:complete':
    case 'auto-execution:fail':
    case 'auto-execution:stop':
      return <Square className="w-4 h-4" />;
    case 'approval:update':
      return <Check className="w-4 h-4" />;
    case 'worktree:create':
    case 'worktree:merge':
    case 'worktree:delete':
      return <GitBranch className="w-4 h-4" />;
    case 'phase:transition':
      return <RefreshCw className="w-4 h-4" />;
    case 'review:start':
    case 'review:complete':
    case 'inspection:start':
    case 'inspection:complete':
      return <FileSearch className="w-4 h-4" />;
    default:
      return <AlertCircle className="w-4 h-4" />;
  }
}

/**
 * Get color classes for event type
 */
function getEventColorClasses(type: EventType): string {
  switch (type) {
    case 'agent:complete':
    case 'auto-execution:complete':
    case 'approval:update':
    case 'review:complete':
    case 'inspection:complete':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'agent:fail':
    case 'auto-execution:fail':
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    case 'agent:start':
    case 'auto-execution:start':
    case 'review:start':
    case 'inspection:start':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case 'auto-execution:stop':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    case 'worktree:create':
    case 'worktree:merge':
    case 'worktree:delete':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
    case 'phase:transition':
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
}

/**
 * Format timestamp for local display
 */
function formatLocalTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString();
  } catch {
    return timestamp;
  }
}

/**
 * EventLogListItem - Individual event entry with icon and styling
 *
 * Requirements:
 * - 3.5: Show timestamp, event type, and details
 * - 3.6: Visual distinction by event type (icons and colors)
 *
 * Usage:
 * ```tsx
 * <EventLogListItem event={entry} />
 * ```
 */
export function EventLogListItem({
  event,
  className,
}: EventLogListItemProps): React.ReactElement {
  const icon = getEventIcon(event.type);
  const colorClasses = getEventColorClasses(event.type);

  return (
    <div
      data-testid={`event-log-item-${event.type}`}
      className={clsx(
        'flex items-start gap-3 p-3 rounded-lg',
        'bg-white dark:bg-gray-800',
        'border border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {/* Icon */}
      <div
        className={clsx(
          'flex items-center justify-center w-8 h-8 rounded-full shrink-0',
          colorClasses
        )}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Message */}
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {event.message}
        </p>

        {/* Timestamp and type */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatLocalTime(event.timestamp)}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {event.type}
          </span>
        </div>
      </div>
    </div>
  );
}
