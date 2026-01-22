/**
 * ResultBlock Component
 * Displays task completion status and statistics
 *
 * Task 2.6: ResultBlockコンポーネントを作成
 * Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3
 */

import React from 'react';
import { CheckCircle, XCircle, Clock, DollarSign, RefreshCw, Hash } from 'lucide-react';
import { clsx } from 'clsx';

export interface ResultBlockProps {
  result: {
    content: string;
    isError: boolean;
    costUsd?: number;
    durationMs?: number;
    numTurns?: number;
    inputTokens?: number;
    outputTokens?: number;
  };
}

export function ResultBlock({ result }: ResultBlockProps): React.ReactElement {
  const { content, isError, costUsd, durationMs, numTurns, inputTokens, outputTokens } = result;

  const hasStats =
    costUsd !== undefined ||
    durationMs !== undefined ||
    numTurns !== undefined ||
    inputTokens !== undefined ||
    outputTokens !== undefined;

  return (
    <div
      data-testid="result-block"
      className={clsx(
        'rounded-lg p-3 border',
        isError
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
          : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
      )}
    >
      {/* Header with status icon */}
      <div className="flex items-center gap-2 mb-2">
        {isError ? (
          <XCircle
            data-testid="result-error-icon"
            className="w-5 h-5 text-red-500 dark:text-red-400"
          />
        ) : (
          <CheckCircle
            data-testid="result-success-icon"
            className="w-5 h-5 text-green-500 dark:text-green-400"
          />
        )}
        <span
          className={clsx(
            'text-sm font-medium',
            isError
              ? 'text-red-700 dark:text-red-300'
              : 'text-green-700 dark:text-green-300'
          )}
        >
          {isError ? 'エラー' : '完了'}
        </span>
      </div>

      {/* Content */}
      {content && (
        <div
          className={clsx(
            'text-sm whitespace-pre-wrap break-words mb-2',
            isError
              ? 'text-red-800 dark:text-red-200'
              : 'text-green-800 dark:text-green-200'
          )}
        >
          {content}
        </div>
      )}

      {/* Statistics */}
      {hasStats && (
        <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          {durationMs !== undefined && (
            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{(durationMs / 1000).toFixed(1)}秒</span>
            </div>
          )}

          {costUsd !== undefined && (
            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
              <DollarSign className="w-3.5 h-3.5" />
              <span>${costUsd.toFixed(4)}</span>
            </div>
          )}

          {numTurns !== undefined && (
            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{numTurns}ターン</span>
            </div>
          )}

          {(inputTokens !== undefined || outputTokens !== undefined) && (
            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
              <Hash className="w-3.5 h-3.5" />
              <span>
                {inputTokens?.toLocaleString() ?? 0} / {outputTokens?.toLocaleString() ?? 0} tokens
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
