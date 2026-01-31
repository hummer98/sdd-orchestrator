/**
 * ToolUseBlock Component
 * Displays tool usage with collapsible details and tool-specific formatting
 *
 * Task 2.2: ToolUseBlockコンポーネントを作成
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 7.1, 7.2, 7.3
 */

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Pencil,
  FileOutput,
  Terminal,
  Search,
  SearchCode,
  ListTodo,
  Globe,
  Wrench,
  NotebookPen,
  CheckSquare,
  Circle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { clsx } from 'clsx';

export interface ToolUseBlockProps {
  tool: {
    name: string;
    toolUseId?: string;
    input?: Record<string, unknown>;
  };
  defaultExpanded?: boolean;
}

/** TodoWrite tool input type */
interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm: string;
}

/** Tool name to Lucide icon mapping (Requirement 2.5) */
const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Read: FileText,
  Edit: Pencil,
  Write: FileOutput,
  MultiEdit: Pencil,
  Bash: Terminal,
  Glob: Search,
  Grep: SearchCode,
  Task: ListTodo,
  TaskOutput: ListTodo,
  WebFetch: Globe,
  WebSearch: Search,
  TodoWrite: CheckSquare,
  NotebookEdit: NotebookPen,
};

/**
 * TodoWrite専用の表示コンポーネント
 */
function TodoListView({ todos }: { todos: TodoItem[] }): React.ReactElement {
  const getStatusIcon = (status: TodoItem['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'pending':
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: TodoItem['status']) => {
    switch (status) {
      case 'completed':
        return '完了';
      case 'in_progress':
        return '進行中';
      case 'pending':
        return '未着手';
    }
  };

  return (
    <div className="space-y-2 py-2">
      {todos.map((todo, index) => (
        <div
          key={index}
          className={clsx(
            'flex items-start gap-3 px-3 py-2 rounded',
            todo.status === 'completed' && 'bg-green-50 dark:bg-green-900/10',
            todo.status === 'in_progress' && 'bg-blue-50 dark:bg-blue-900/10',
            todo.status === 'pending' && 'bg-gray-50 dark:bg-gray-800/30'
          )}
        >
          {/* ステータスアイコン */}
          <div className="flex-shrink-0 mt-0.5">
            {getStatusIcon(todo.status)}
          </div>

          {/* タスク内容 */}
          <div className="flex-1 min-w-0">
            <div
              className={clsx(
                'text-sm',
                todo.status === 'completed' && 'line-through text-gray-500 dark:text-gray-400',
                todo.status === 'in_progress' && 'font-medium text-blue-900 dark:text-blue-100',
                todo.status === 'pending' && 'text-gray-700 dark:text-gray-300'
              )}
            >
              {todo.content}
            </div>
            {todo.status === 'in_progress' && todo.activeForm && todo.activeForm !== todo.content && (
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 italic">
                {todo.activeForm}
              </div>
            )}
          </div>

          {/* ステータスラベル */}
          <div className="flex-shrink-0">
            <span
              className={clsx(
                'text-xs px-2 py-1 rounded-full',
                todo.status === 'completed' && 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
                todo.status === 'in_progress' && 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
                todo.status === 'pending' && 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              )}
            >
              {getStatusLabel(todo.status)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Get tool-specific summary for collapsed display (Requirement 2.3)
 */
function getToolSummary(name: string, input?: Record<string, unknown>): string {
  if (!input) return '';

  switch (name) {
    case 'Read':
    case 'Write':
    case 'Edit':
    case 'MultiEdit':
      return (input.file_path as string) || '';

    case 'Bash': {
      const description = input.description as string | undefined;
      const command = input.command as string | undefined;
      if (description) return description;
      if (command) {
        // Show first line, truncate if too long
        const firstLine = command.split('\n')[0];
        return firstLine.length > 60 ? firstLine.slice(0, 57) + '...' : firstLine;
      }
      return '';
    }

    case 'Glob':
    case 'Grep':
      return (input.pattern as string) || '';

    case 'Task': {
      const subagentType = input.subagent_type as string | undefined;
      const description = input.description as string | undefined;
      const parts: string[] = [];
      if (subagentType) parts.push(`[${subagentType}]`);
      if (description) parts.push(description);
      return parts.join(' ');
    }

    case 'TodoWrite': {
      const todos = input.todos as TodoItem[] | undefined;
      if (!todos || todos.length === 0) return '';
      const completed = todos.filter(t => t.status === 'completed').length;
      const inProgress = todos.filter(t => t.status === 'in_progress').length;
      const pending = todos.filter(t => t.status === 'pending').length;
      return `${todos.length}個のタスク (完了: ${completed}, 進行中: ${inProgress}, 未着手: ${pending})`;
    }

    default:
      // Generic: show first string property
      const firstString = Object.entries(input).find(
        ([, v]) => typeof v === 'string' && v.length > 0
      );
      return firstString ? String(firstString[1]).slice(0, 60) : '';
  }
}

export function ToolUseBlock({
  tool,
  defaultExpanded = false,
}: ToolUseBlockProps): React.ReactElement {
  const { name, input } = tool;
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const Icon = TOOL_ICONS[name] || Wrench;
  const summary = getToolSummary(name, input);

  return (
    <div
      className={clsx(
        'rounded-lg border',
        'bg-yellow-50 dark:bg-yellow-900/20',
        'border-yellow-200 dark:border-yellow-700'
      )}
    >
      {/* Header - always visible, clickable */}
      <div
        data-testid="tool-use-header"
        onClick={() => setIsExpanded(!isExpanded)}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 cursor-pointer',
          'hover:bg-yellow-100 dark:hover:bg-yellow-900/30',
          'rounded-t-lg transition-colors'
        )}
      >
        {/* Expand/Collapse indicator */}
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        )}

        {/* Tool icon */}
        <span data-testid="tool-icon">
          <Icon className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
        </span>

        {/* Tool name */}
        <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
          {name}
        </span>

        {/* Summary (always visible when collapsed) */}
        {summary && (
          <span className="flex-1 text-sm text-yellow-700 dark:text-yellow-300 truncate ml-2 font-mono">
            {summary}
          </span>
        )}
      </div>

      {/* Details - collapsible */}
      {isExpanded && input && (
        <div
          data-testid="tool-use-details"
          className={clsx(
            'px-3 pb-3 pt-0',
            'border-t border-yellow-200 dark:border-yellow-700'
          )}
        >
          {name === 'TodoWrite' && input.todos ? (
            <TodoListView todos={input.todos as TodoItem[]} />
          ) : (
            <pre
              className={clsx(
                'mt-2 text-xs font-mono whitespace-pre-wrap break-all overflow-auto max-h-96',
                'text-yellow-900 dark:text-yellow-100'
              )}
            >
              {JSON.stringify(input, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// Export for use in other components
export { TOOL_ICONS };
