/**
 * TextBlock Component
 * Displays Claude text responses with line-based folding
 *
 * Task 2.4: TextBlockコンポーネントを作成
 * Requirements: 4.1, 4.2, 4.4, 7.1, 7.2, 7.3
 */

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, MessageSquare, User } from 'lucide-react';
import { clsx } from 'clsx';

export interface TextBlockProps {
  text: {
    content: string;
    role: 'assistant' | 'user';
  };
  /** Fold threshold (default: 10 lines) */
  foldThreshold?: number;
  defaultExpanded?: boolean;
}

const DEFAULT_FOLD_THRESHOLD = 10;

export function TextBlock({
  text,
  foldThreshold = DEFAULT_FOLD_THRESHOLD,
  defaultExpanded = false,
}: TextBlockProps): React.ReactElement | null {
  const { content, role } = text;

  // Don't render empty content
  if (!content) {
    return null;
  }

  const lines = useMemo(() => content.split('\n'), [content]);
  const lineCount = lines.length;
  const shouldFold = lineCount >= foldThreshold;

  // Initialize expanded state based on whether folding is needed
  const [isExpanded, setIsExpanded] = useState(() => {
    if (!shouldFold) return true; // Always expanded if under threshold
    return defaultExpanded;
  });

  const displayContent = isExpanded ? content : lines.slice(0, foldThreshold - 1).join('\n');

  const isAssistant = role === 'assistant';
  const Icon = isAssistant ? MessageSquare : User;

  return (
    <div
      data-testid="text-block"
      className={clsx(
        'rounded-lg border',
        isAssistant
          ? 'bg-fuchsia-50 dark:bg-fuchsia-900/10 border-fuchsia-200 dark:border-fuchsia-700'
          : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-700'
      )}
    >
      {/* Header */}
      <div
        className={clsx(
          'flex items-center gap-2 px-3 py-2 border-b',
          isAssistant
            ? 'border-fuchsia-200 dark:border-fuchsia-700'
            : 'border-blue-200 dark:border-blue-700'
        )}
      >
        <Icon
          className={clsx(
            'w-4 h-4',
            isAssistant
              ? 'text-fuchsia-500 dark:text-fuchsia-400'
              : 'text-blue-500 dark:text-blue-400'
          )}
        />
        <span
          className={clsx(
            'text-sm font-medium',
            isAssistant
              ? 'text-fuchsia-700 dark:text-fuchsia-300'
              : 'text-blue-700 dark:text-blue-300'
          )}
        >
          {isAssistant ? 'Claude' : 'ユーザー'}
        </span>
      </div>

      {/* Content */}
      <div className="p-3">
        <div
          className={clsx(
            'text-sm whitespace-pre-wrap break-words',
            isAssistant
              ? 'text-fuchsia-900 dark:text-fuchsia-100'
              : 'text-blue-900 dark:text-blue-100'
          )}
        >
          {displayContent}
        </div>

        {/* Expand/Collapse button for long text */}
        {shouldFold && (
          <button
            data-testid="text-expand-button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={clsx(
              'flex items-center gap-1 mt-2 text-xs font-medium',
              'hover:underline cursor-pointer',
              isAssistant
                ? 'text-fuchsia-600 dark:text-fuchsia-400'
                : 'text-blue-600 dark:text-blue-400'
            )}
          >
            {isExpanded ? (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                折りたたむ
              </>
            ) : (
              <>
                <ChevronRight className="w-3.5 h-3.5" />
                展開 (+{lineCount - foldThreshold + 1}行)
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
