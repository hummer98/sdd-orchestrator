/**
 * ScheduleTaskListItem Component
 * Individual schedule task item in a list with interactive controls
 *
 * Task 5.2: ScheduleTaskListItemを作成
 * - タスク名、スケジュール種別、次回実行予定、最終実行日時の表示
 * - 有効/無効トグル（インライン）
 * - 削除アイコン
 * - 即時実行ボタン
 * - クリックで編集画面へ遷移
 *
 * Requirements: 1.3, 1.5, 1.6, 7.1
 */

import React, { useCallback } from 'react';
import { clsx } from 'clsx';
import { Trash2, Play, Clock, Calendar, Coffee } from 'lucide-react';
import type { ScheduleTask, ScheduleCondition } from '../../types/scheduleTask';

// =============================================================================
// Types
// =============================================================================

export interface ScheduleTaskListItemProps {
  /** Schedule task data */
  task: ScheduleTask;
  /** Called when the item body is clicked (navigate to edit) */
  onClick: () => void;
  /** Called when toggle is clicked */
  onToggleEnabled: (taskId: string) => void;
  /** Called when delete is clicked */
  onDelete: (taskId: string) => void;
  /** Called when immediate execution is clicked */
  onExecuteImmediately: (taskId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/** Day names in Japanese */
const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * Format schedule type for display
 */
function formatScheduleType(schedule: ScheduleCondition): string {
  switch (schedule.type) {
    case 'interval':
      return `${schedule.hoursInterval}時間ごと`;
    case 'weekly': {
      const dayNames = schedule.weekdays.map((d) => DAY_NAMES[d]).join('・');
      return `毎週${dayNames} ${schedule.hourOfDay}時`;
    }
    case 'idle':
      return `アイドル${schedule.idleMinutes}分後`;
    default:
      return '不明';
  }
}

/**
 * Get schedule type label (fixed vs conditional)
 */
function getScheduleTypeLabel(schedule: ScheduleCondition): { label: string; color: string } {
  switch (schedule.type) {
    case 'interval':
    case 'weekly':
      return { label: '固定', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' };
    case 'idle':
      return { label: '条件', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' };
    default:
      return { label: '不明', color: 'bg-gray-100 text-gray-700' };
  }
}

/**
 * Get schedule type icon
 */
function getScheduleTypeIcon(schedule: ScheduleCondition): React.ReactNode {
  switch (schedule.type) {
    case 'interval':
      return <Clock className="w-3.5 h-3.5" />;
    case 'weekly':
      return <Calendar className="w-3.5 h-3.5" />;
    case 'idle':
      return <Coffee className="w-3.5 h-3.5" />;
    default:
      return null;
  }
}

/**
 * Format last executed time for display
 */
function formatLastExecuted(timestamp: number | null): string {
  if (timestamp === null) {
    return '未実行';
  }
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return '今';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分前`;
  } else if (diffHours < 24) {
    return `${diffHours}時間前`;
  } else if (diffDays < 7) {
    return `${diffDays}日前`;
  } else {
    return date.toLocaleDateString('ja-JP');
  }
}

/**
 * Calculate and format next execution time
 */
function formatNextExecution(task: ScheduleTask): string | null {
  const { schedule, lastExecutedAt, enabled } = task;

  if (!enabled) {
    return null;
  }

  switch (schedule.type) {
    case 'interval': {
      if (lastExecutedAt === null) {
        return '待機中';
      }
      const nextTime = lastExecutedAt + schedule.hoursInterval * 60 * 60 * 1000;
      const now = Date.now();
      const diffMs = nextTime - now;

      if (diffMs <= 0) {
        return '実行可能';
      }

      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffMinutes < 60) {
        return `約${diffMinutes}分後`;
      } else if (diffHours < 24) {
        return `約${diffHours}時間後`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        return `約${diffDays}日後`;
      }
    }
    case 'weekly': {
      // Find next occurrence
      const now = new Date();
      const currentDay = now.getDay();
      const currentHour = now.getHours();

      // Sort weekdays for finding next
      const sortedDays = [...schedule.weekdays].sort((a, b) => a - b);

      // Find next day
      let nextDay = sortedDays.find((d) => d > currentDay || (d === currentDay && schedule.hourOfDay > currentHour));
      let daysUntil = 0;

      if (nextDay === undefined) {
        // Wrap to next week
        nextDay = sortedDays[0];
        daysUntil = 7 - currentDay + nextDay;
      } else {
        daysUntil = nextDay - currentDay;
      }

      if (daysUntil === 0) {
        const hoursUntil = schedule.hourOfDay - currentHour;
        if (hoursUntil > 0) {
          return `約${hoursUntil}時間後`;
        }
      } else if (daysUntil === 1) {
        return '明日';
      } else {
        return `${daysUntil}日後`;
      }
      return `${DAY_NAMES[nextDay]}曜`;
    }
    case 'idle':
      return 'アイドル時';
    default:
      return null;
  }
}

// =============================================================================
// Toggle Component
// =============================================================================

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
  disabled?: boolean;
}

function ToggleSwitch({ checked, onChange, ariaLabel, disabled }: ToggleSwitchProps) {
  return (
    <button
      role="switch"
      type="button"
      aria-checked={checked}
      aria-label={ariaLabel}
      data-testid="enabled-toggle"
      data-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={clsx(
        'relative inline-flex h-5 w-9 items-center rounded-full',
        'transition-colors duration-200 ease-in-out',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
        checked
          ? 'bg-blue-500 dark:bg-blue-600'
          : 'bg-gray-300 dark:bg-gray-600',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={clsx(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm',
          'transition-transform duration-200 ease-in-out',
          checked ? 'translate-x-4' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

// =============================================================================
// Component
// =============================================================================

export function ScheduleTaskListItem({
  task,
  onClick,
  onToggleEnabled,
  onDelete,
  onExecuteImmediately,
  className,
}: ScheduleTaskListItemProps): React.ReactElement {
  // Event handlers with stopPropagation
  const handleToggleClick = useCallback(() => {
    onToggleEnabled(task.id);
  }, [onToggleEnabled, task.id]);

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(task.id);
    },
    [onDelete, task.id]
  );

  const handleExecuteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onExecuteImmediately(task.id);
    },
    [onExecuteImmediately, task.id]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    },
    [onClick]
  );

  const scheduleTypeInfo = getScheduleTypeLabel(task.schedule);
  const nextExecution = formatNextExecution(task);

  return (
    <div
      data-testid="schedule-task-list-item"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={clsx(
        'p-4 rounded-lg cursor-pointer',
        'border border-gray-200 dark:border-gray-700',
        'hover:border-blue-300 dark:hover:border-blue-600',
        'hover:bg-gray-50 dark:hover:bg-gray-800/50',
        'transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
        className
      )}
    >
      {/* Row 1: Task name, toggle, action buttons */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Task name */}
          <h3
            className={clsx(
              'font-medium truncate',
              task.enabled
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-400 dark:text-gray-500'
            )}
          >
            {task.name}
          </h3>

          {/* Disabled badge */}
          {!task.enabled && (
            <span className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
              無効
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Immediate execution button */}
          <button
            type="button"
            data-testid="execute-button"
            aria-label="即時実行"
            disabled={!task.enabled}
            onClick={handleExecuteClick}
            className={clsx(
              'p-1.5 rounded-md',
              'transition-colors duration-150',
              task.enabled
                ? 'text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/30'
                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
            )}
          >
            <Play className="w-4 h-4" />
          </button>

          {/* Delete button */}
          <button
            type="button"
            data-testid="delete-button"
            aria-label="削除"
            onClick={handleDeleteClick}
            className={clsx(
              'p-1.5 rounded-md',
              'text-gray-400 hover:text-red-600 hover:bg-red-100',
              'dark:text-gray-500 dark:hover:text-red-400 dark:hover:bg-red-900/30',
              'transition-colors duration-150'
            )}
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Toggle switch */}
          <ToggleSwitch
            checked={task.enabled}
            onChange={handleToggleClick}
            ariaLabel={`${task.name}を${task.enabled ? '無効' : '有効'}にする`}
          />
        </div>
      </div>

      {/* Row 2: Schedule info */}
      <div className="flex items-center gap-3 mt-2 text-sm">
        {/* Schedule type badge */}
        <span
          data-testid="schedule-type-badge"
          className={clsx(
            'inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded',
            scheduleTypeInfo.color
          )}
        >
          {getScheduleTypeIcon(task.schedule)}
          {scheduleTypeInfo.label}
        </span>

        {/* Schedule description */}
        <span className="text-gray-600 dark:text-gray-400">
          {formatScheduleType(task.schedule)}
        </span>
      </div>

      {/* Row 3: Execution info */}
      <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
        {/* Next execution */}
        {nextExecution && (
          <span>
            次回: <span className="text-gray-700 dark:text-gray-300">{nextExecution}</span>
          </span>
        )}

        {/* Last executed */}
        <span>
          最終実行: <span className="text-gray-700 dark:text-gray-300">{formatLastExecuted(task.lastExecutedAt)}</span>
        </span>
      </div>
    </div>
  );
}
