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
          <pre
            className={clsx(
              'mt-2 text-xs font-mono whitespace-pre-wrap break-all overflow-auto max-h-96',
              'text-yellow-900 dark:text-yellow-100'
            )}
          >
            {JSON.stringify(input, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// Export for use in other components
export { TOOL_ICONS };
