/**
 * TaskProgressBar Component
 *
 * Displays task progress bar and expandable tasks.md content.
 * Shared component for both Electron and Remote UI.
 *
 * remote-ui-task-display Task 3.1: Create progress bar and expandable content component
 * Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4
 */

import React, { useState } from 'react';
import { ListTodo, ChevronDown, ChevronRight, CheckCircle, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import MDEditor from '@uiw/react-md-editor';
import type { TaskProgress } from '@shared/utils/taskProgressParser';

/**
 * Props for TaskProgressBar component
 */
export interface TaskProgressBarProps {
  /** Task progress data (null = no tasks) */
  taskProgress: TaskProgress | null;
  /** tasks.md content for expandable section (null = no expand) */
  tasksContent: string | null;
  /** Loading state */
  isLoading?: boolean;
  /** Test ID for testing */
  testId?: string;
}

/**
 * TaskProgressBar - Progress bar with expandable tasks.md content
 *
 * Requirements:
 * - 3.1/4.1: Display progress bar with count and percentage
 * - 3.2/4.2: Expandable tasks.md content section
 * - 3.3/4.3: "No tasks" message when taskProgress is null
 * - 3.4/4.4: Visual consistency with Electron version
 */
export function TaskProgressBar({
  taskProgress,
  tasksContent,
  isLoading = false,
  testId = 'task-progress-bar',
}: TaskProgressBarProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);

  // Loading state
  if (isLoading) {
    return (
      <div
        data-testid={`${testId}-loading`}
        className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 animate-pulse"
      >
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
      </div>
    );
  }

  // No tasks state (Requirement 3.3, 4.3)
  if (!taskProgress) {
    return (
      <div
        data-testid={testId}
        className={clsx(
          'p-4 rounded-lg',
          'bg-gray-50 dark:bg-gray-800',
          'text-gray-500 dark:text-gray-400',
          'text-sm'
        )}
      >
        <div className="flex items-center gap-2">
          <ListTodo className="w-4 h-4" />
          <span>タスクなし</span>
        </div>
      </div>
    );
  }

  const { total, completed, percentage } = taskProgress;
  const isComplete = percentage === 100;

  return (
    <div data-testid={testId} className="space-y-2">
      {/* Progress Section (Requirement 3.1, 4.1) */}
      <div
        className={clsx(
          'p-4 rounded-lg',
          'bg-gray-50 dark:bg-gray-800'
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {completed} / {total} タスク完了
          </span>
          <span
            className={clsx(
              'text-sm font-bold',
              isComplete
                ? 'text-green-600'
                : percentage >= 50
                  ? 'text-blue-600'
                  : 'text-gray-600'
            )}
          >
            {percentage}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            data-testid={`${testId}-progress`}
            className={clsx(
              'h-3 rounded-full transition-all duration-300',
              isComplete
                ? 'bg-green-500'
                : percentage >= 50
                  ? 'bg-blue-500'
                  : 'bg-gray-400'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Completion message */}
        {isComplete && (
          <div className="mt-2 text-sm text-green-600 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            すべてのタスクが完了しました
          </div>
        )}
      </div>

      {/* Expandable Content Section (Requirement 3.2, 4.2) */}
      {tasksContent && (
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 overflow-hidden">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={clsx(
              'w-full flex items-center justify-between p-3',
              'transition-colors',
              'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
            )}
            aria-label="tasks.md"
          >
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
              <FileText className="w-4 h-4 text-blue-500" />
              <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                tasks.md
              </span>
            </div>
          </button>

          {/* Expanded Content */}
          {isExpanded && (
            <div
              data-testid={`${testId}-content`}
              className="border-t border-gray-200 dark:border-gray-700"
            >
              <div className="p-4 max-h-96 overflow-y-auto" data-color-mode="dark">
                <MDEditor.Markdown source={tasksContent} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TaskProgressBar;
