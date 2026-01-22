/**
 * ToolResultBlock Component
 * Displays tool execution results with collapsible content and error highlighting
 *
 * Task 2.3: ToolResultBlockコンポーネントを作成
 * Requirements: 3.1, 3.2, 3.3, 3.4, 7.1, 7.2, 7.3
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Check, AlertCircle, FileOutput } from 'lucide-react';
import { clsx } from 'clsx';

export interface ToolResultBlockProps {
  toolResult: {
    toolUseId: string;
    content: string;
    isError: boolean;
  };
  defaultExpanded?: boolean;
}

export function ToolResultBlock({
  toolResult,
  defaultExpanded = false,
}: ToolResultBlockProps): React.ReactElement {
  const { content, isError } = toolResult;
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const hasContent = content.length > 0;

  return (
    <div
      data-testid="tool-result-block"
      onClick={() => setIsExpanded(!isExpanded)}
      className={clsx(
        'rounded-lg border cursor-pointer transition-colors',
        isError
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/30'
          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30'
      )}
    >
      {/* Header - always visible */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Expand/Collapse indicator */}
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        )}

        {/* Result icon */}
        <FileOutput
          className={clsx(
            'w-4 h-4',
            isError
              ? 'text-red-500 dark:text-red-400'
              : 'text-blue-500 dark:text-blue-400'
          )}
        />

        {/* Label */}
        <span
          className={clsx(
            'text-sm font-medium',
            isError
              ? 'text-red-700 dark:text-red-300'
              : 'text-blue-700 dark:text-blue-300'
          )}
        >
          ツール結果
        </span>

        {/* Status indicator */}
        <span
          data-testid="tool-result-indicator"
          className={clsx(
            'flex items-center gap-1 ml-auto text-xs',
            isError
              ? 'text-red-600 dark:text-red-400'
              : 'text-blue-600 dark:text-blue-400'
          )}
        >
          {!hasContent ? (
            '(結果なし)'
          ) : isError ? (
            <>
              <AlertCircle className="w-3.5 h-3.5" />
              エラー
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5" />
              成功
            </>
          )}
        </span>
      </div>

      {/* Content - collapsible */}
      {isExpanded && hasContent && (
        <div
          data-testid="tool-result-content"
          className={clsx(
            'px-3 pb-3 pt-0',
            'border-t',
            isError
              ? 'border-red-200 dark:border-red-700'
              : 'border-blue-200 dark:border-blue-700'
          )}
        >
          <pre
            className={clsx(
              'mt-2 text-xs font-mono whitespace-pre-wrap break-all overflow-auto max-h-96',
              isError
                ? 'text-red-800 dark:text-red-200'
                : 'text-blue-800 dark:text-blue-200'
            )}
          >
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}
