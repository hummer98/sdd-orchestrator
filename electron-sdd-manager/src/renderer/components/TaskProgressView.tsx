/**
 * TaskProgressView Component
 * Displays implementation task progress
 * Requirements: 7.1-7.5
 */

import { clsx } from 'clsx';
import { CheckCircle, Circle, Bot, Play } from 'lucide-react';

// ============================================================
// Task 5.1, 5.2: TaskProgressView Types
// Requirements: 7.1, 7.2
// ============================================================

export interface TaskItem {
  /** タスクID */
  id: string;
  /** タスク名 */
  title: string;
  /** タスク状態 */
  status: 'pending' | 'running' | 'completed';
}

export interface TaskProgress {
  /** タスク総数 */
  total: number;
  /** 完了タスク数 */
  completed: number;
  /** 進捗率 */
  percentage: number;
}

export interface TaskProgressViewProps {
  /** タスク一覧 */
  tasks: TaskItem[];
  /** 全体進捗 */
  progress: TaskProgress;
  /** タスク実行コールバック */
  onExecuteTask?: (taskId: string) => void;
  /** 実行可能かどうか */
  canExecute?: boolean;
}

export function TaskProgressView({ tasks, progress, onExecuteTask, canExecute = true }: TaskProgressViewProps) {
  const isAllCompleted = progress.percentage === 100 && progress.total > 0;

  if (tasks.length === 0) {
    return (
      <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
        タスクがありません
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {progress.completed} / {progress.total} タスク完了
          </span>
          <span
            className={clsx(
              'text-sm font-bold',
              progress.percentage === 100
                ? 'text-green-600'
                : progress.percentage >= 50
                  ? 'text-blue-600'
                  : 'text-gray-600'
            )}
          >
            {progress.percentage}%
          </span>
        </div>
        <div
          data-testid="progress-bar"
          className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2"
        >
          <div
            className={clsx(
              'h-2 rounded-full transition-all duration-300',
              progress.percentage === 100
                ? 'bg-green-500'
                : progress.percentage >= 50
                  ? 'bg-blue-500'
                  : 'bg-gray-400'
            )}
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
        {isAllCompleted && (
          <div className="mt-1 text-sm text-green-600 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            すべてのタスクが完了しました
          </div>
        )}
      </div>

      {/* Task List */}
      <div className="space-y-1 px-4">
        {tasks.map((task) => (
          <TaskListItem
            key={task.id}
            task={task}
            onExecute={onExecuteTask}
            canExecute={canExecute}
          />
        ))}
      </div>
    </div>
  );
}

interface TaskListItemProps {
  task: TaskItem;
  onExecute?: (taskId: string) => void;
  canExecute?: boolean;
}

function TaskListItem({ task, onExecute, canExecute = true }: TaskListItemProps) {
  const handleExecute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onExecute && canExecute && task.status !== 'completed' && task.status !== 'running') {
      onExecute(task.id);
    }
  };

  const showExecuteButton = onExecute && task.status !== 'completed' && task.status !== 'running';

  return (
    <div
      className={clsx(
        'flex items-center gap-2 py-1 px-2 rounded text-sm',
        'bg-gray-50 dark:bg-gray-800'
      )}
    >
      {/* Status Icon */}
      {task.status === 'completed' && (
        <CheckCircle
          data-testid="task-status-completed"
          className="w-4 h-4 text-green-500 flex-shrink-0"
        />
      )}
      {task.status === 'running' && (
        <Bot
          data-testid="task-status-running"
          className="w-4 h-4 text-blue-500 animate-pulse flex-shrink-0"
        />
      )}
      {task.status === 'pending' && (
        <Circle
          data-testid="task-status-pending"
          className="w-4 h-4 text-gray-400 flex-shrink-0"
        />
      )}

      {/* Task ID */}
      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
        {task.id}
      </span>

      {/* Task Title */}
      <span
        className={clsx(
          'truncate flex-1',
          task.status === 'completed'
            ? 'text-gray-500 dark:text-gray-400'
            : 'text-gray-700 dark:text-gray-300'
        )}
      >
        {task.title}
      </span>

      {/* Execute Button */}
      {showExecuteButton && (
        <button
          onClick={handleExecute}
          disabled={!canExecute}
          className={clsx(
            'p-0.5 rounded transition-colors flex-shrink-0',
            canExecute
              ? 'text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600'
              : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
          )}
          title={canExecute ? `タスク ${task.id} を実行` : '他のタスクが実行中です'}
          aria-label={`タスク ${task.id} を実行`}
        >
          <Play className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
