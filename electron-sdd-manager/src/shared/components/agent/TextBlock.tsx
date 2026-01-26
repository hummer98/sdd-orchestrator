/**
 * TextBlock Component
 * Displays LLM text responses with line-based folding
 *
 * Task 2.4: TextBlockコンポーネントを作成
 * llm-stream-log-parser Task 7.1: engineId support for dynamic display name
 * Requirements: 4.1, 4.2, 4.4, 7.1, 7.2, 7.3
 */

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, MessageSquare, User } from 'lucide-react';
import { clsx } from 'clsx';
import { getLLMEngine, type LLMEngineId } from '@shared/registry';

export interface TextBlockProps {
  text: {
    content: string;
    role: 'assistant' | 'user';
  };
  /** Fold threshold (default: 10 lines) */
  foldThreshold?: number;
  defaultExpanded?: boolean;
  /**
   * LLM engine ID for display name lookup
   * llm-stream-log-parser Task 7.1: engineId support
   * Requirements: 4.1, 4.2
   */
  engineId?: LLMEngineId;
}

const DEFAULT_FOLD_THRESHOLD = 10;

/**
 * Get assistant display label based on engineId
 * Requirements: 4.1, 4.2 - Dynamic engine label display
 */
function getAssistantLabel(engineId?: LLMEngineId): string {
  if (!engineId) {
    // Backward compatibility: default to "Claude" when no engineId
    return 'Claude';
  }

  const engine = getLLMEngine(engineId);
  return engine?.label ?? 'Claude';
}

export function TextBlock({
  text,
  foldThreshold = DEFAULT_FOLD_THRESHOLD,
  defaultExpanded = false,
  engineId,
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

  // llm-stream-log-parser Task 7.1: Dynamic label based on engineId
  const assistantLabel = getAssistantLabel(engineId);

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
          {isAssistant ? assistantLabel : 'User'}
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
                Collapse
              </>
            ) : (
              <>
                <ChevronRight className="w-3.5 h-3.5" />
                Expand (+{lineCount - foldThreshold + 1} lines)
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
