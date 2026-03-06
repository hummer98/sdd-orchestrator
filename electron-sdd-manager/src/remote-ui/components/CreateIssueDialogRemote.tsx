/**
 * CreateIssueDialogRemote Component
 *
 * github-issue-integration: Task 12.3
 * Requirements: 11.3
 *
 * Issue creation dialog for Remote UI using WebSocketApiClient.
 * Follows the same pattern as CreateSpecDialogRemote.
 */

import React, { useState, useCallback } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import type { ApiClient } from '@shared/api/types';
import { useSubmitShortcut } from '@shared/hooks';
import type { WebSocketApiClient } from '@shared/api/WebSocketApiClient';

// =============================================================================
// Types
// =============================================================================

export interface CreateIssueDialogRemoteProps {
  isOpen: boolean;
  onClose: () => void;
  apiClient: ApiClient;
  deviceType: 'desktop' | 'smartphone';
  onSuccess?: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function CreateIssueDialogRemote({
  isOpen,
  onClose,
  apiClient,
  deviceType,
  onSuccess,
}: CreateIssueDialogRemoteProps): React.ReactElement | null {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [labelsInput, setLabelsInput] = useState('');
  const [assigneesInput, setAssigneesInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = title.trim().length > 0;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!title.trim()) {
        setError('タイトルを入力してください');
        return;
      }

      setIsSubmitting(true);
      setError(null);

      // Use WebSocketApiClient's createIssue method
      const wsClient = apiClient as WebSocketApiClient;
      if (!wsClient.createIssue) {
        setError('Issue作成機能はサポートされていません');
        setIsSubmitting(false);
        return;
      }

      const labels = labelsInput
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean);
      const assignees = assigneesInput
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

      const result = await wsClient.createIssue(
        title.trim(),
        body.trim(),
        labels.length > 0 ? labels : undefined,
        assignees.length > 0 ? assignees : undefined,
      );

      setIsSubmitting(false);

      if (result.ok) {
        setTitle('');
        setBody('');
        setLabelsInput('');
        setAssigneesInput('');
        onClose();
        onSuccess?.();
      } else {
        setError(result.error.message || 'Issue作成に失敗しました');
      }
    },
    [apiClient, title, body, labelsInput, assigneesInput, onClose, onSuccess]
  );

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      setTitle('');
      setBody('');
      setLabelsInput('');
      setAssigneesInput('');
      setError(null);
      onClose();
    }
  }, [isSubmitting, onClose]);

  // Shortcut submit handler
  const handleShortcutSubmit = useCallback(() => {
    const syntheticEvent = { preventDefault: () => {} } as React.FormEvent;
    handleSubmit(syntheticEvent);
  }, [handleSubmit]);

  const { handleKeyDown } = useSubmitShortcut({
    onSubmit: handleShortcutSubmit,
    disabled: isSubmitting || !isValid,
  });

  if (!isOpen) {
    return null;
  }

  const isSmartphone = deviceType === 'smartphone';

  return (
    <div
      data-testid="create-issue-dialog-overlay"
      className={clsx(
        'fixed inset-0 z-50',
        'bg-black/50',
        'flex items-center justify-center',
        isSmartphone && 'items-start justify-start'
      )}
      onClick={handleClose}
    >
      <div
        data-testid="create-issue-dialog"
        onClick={(e) => e.stopPropagation()}
        className={clsx(
          'bg-white dark:bg-gray-900',
          'flex flex-col',
          isSmartphone
            ? 'w-full h-full'
            : 'w-full max-w-xl rounded-lg shadow-xl mx-4'
        )}
      >
        {/* Header */}
        <div
          className={clsx(
            'flex items-center justify-between',
            'px-4 py-3',
            'border-b border-gray-200 dark:border-gray-700'
          )}
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            新規Issue作成
          </h2>
          <button
            data-testid="create-issue-dialog-close"
            onClick={handleClose}
            disabled={isSubmitting}
            className={clsx(
              'p-1 rounded-md',
              'text-gray-500 hover:text-gray-700',
              'dark:text-gray-400 dark:hover:text-gray-200',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              isSubmitting && 'opacity-50 cursor-not-allowed'
            )}
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <div className={clsx('flex-1 p-4 space-y-4', isSmartphone && 'pb-24')}>
            {/* Title */}
            <div>
              <label
                htmlFor="issue-title"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                タイトル <span className="text-red-500">*</span>
              </label>
              <input
                id="issue-title"
                data-testid="create-issue-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSubmitting}
                placeholder="Issueのタイトルを入力..."
                className={clsx(
                  'w-full px-3 py-2 text-sm rounded-md',
                  'bg-white dark:bg-gray-800',
                  'text-gray-900 dark:text-gray-100',
                  'placeholder:text-gray-500 dark:placeholder:text-gray-400',
                  'border border-gray-300 dark:border-gray-600',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  isSubmitting && 'opacity-50'
                )}
              />
            </div>

            {/* Body */}
            <div>
              <label
                htmlFor="issue-body"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                本文
              </label>
              <textarea
                id="issue-body"
                data-testid="create-issue-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSubmitting}
                placeholder="Issueの詳細を入力..."
                rows={isSmartphone ? 6 : 4}
                className={clsx(
                  'w-full px-3 py-2 text-sm rounded-md',
                  'bg-white dark:bg-gray-800',
                  'text-gray-900 dark:text-gray-100',
                  'placeholder:text-gray-500 dark:placeholder:text-gray-400',
                  'border border-gray-300 dark:border-gray-600',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  'resize-none',
                  isSubmitting && 'opacity-50'
                )}
              />
            </div>

            {/* Labels */}
            <div>
              <label
                htmlFor="issue-labels"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Labels
              </label>
              <input
                id="issue-labels"
                data-testid="create-issue-labels"
                type="text"
                value={labelsInput}
                onChange={(e) => setLabelsInput(e.target.value)}
                disabled={isSubmitting}
                placeholder="カンマ区切りでLabel名を入力 (例: bug, enhancement)"
                className={clsx(
                  'w-full px-3 py-2 text-sm rounded-md',
                  'bg-white dark:bg-gray-800',
                  'text-gray-900 dark:text-gray-100',
                  'placeholder:text-gray-500 dark:placeholder:text-gray-400',
                  'border border-gray-300 dark:border-gray-600',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  isSubmitting && 'opacity-50'
                )}
              />
            </div>

            {/* Assignees */}
            <div>
              <label
                htmlFor="issue-assignees"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Assignees
              </label>
              <input
                id="issue-assignees"
                data-testid="create-issue-assignees"
                type="text"
                value={assigneesInput}
                onChange={(e) => setAssigneesInput(e.target.value)}
                disabled={isSubmitting}
                placeholder="カンマ区切りでユーザー名を入力"
                className={clsx(
                  'w-full px-3 py-2 text-sm rounded-md',
                  'bg-white dark:bg-gray-800',
                  'text-gray-900 dark:text-gray-100',
                  'placeholder:text-gray-500 dark:placeholder:text-gray-400',
                  'border border-gray-300 dark:border-gray-600',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  isSubmitting && 'opacity-50'
                )}
              />
            </div>

            {/* Auto-label note */}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              作成時に <span className="font-medium text-yellow-600">status:triage</span> Labelが自動的に付与されます
            </p>

            {/* Error Message */}
            {error && (
              <div
                data-testid="create-issue-error"
                className={clsx(
                  'flex items-center gap-2 p-3 rounded-md',
                  'bg-red-50 dark:bg-red-900/20',
                  'text-red-600 dark:text-red-400',
                  'text-sm'
                )}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className={clsx(
              'flex gap-3 px-4 py-3',
              'border-t border-gray-200 dark:border-gray-700',
              isSmartphone ? 'fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900' : ''
            )}
          >
            <button
              type="button"
              data-testid="create-issue-cancel"
              onClick={handleClose}
              disabled={isSubmitting}
              className={clsx(
                'flex-1 px-4 py-2 text-sm font-medium rounded-md',
                'bg-gray-100 dark:bg-gray-800',
                'text-gray-700 dark:text-gray-300',
                'hover:bg-gray-200 dark:hover:bg-gray-700',
                'focus:outline-none focus:ring-2 focus:ring-gray-500',
                isSubmitting && 'opacity-50 cursor-not-allowed'
              )}
            >
              キャンセル
            </button>
            <button
              type="submit"
              data-testid="create-issue-submit"
              disabled={isSubmitting || !isValid}
              className={clsx(
                'flex-1 px-4 py-2 text-sm font-medium rounded-md',
                'flex items-center justify-center gap-2',
                'bg-blue-600 hover:bg-blue-700',
                'text-white',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
                (isSubmitting || !isValid) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  作成中...
                </>
              ) : (
                '作成'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateIssueDialogRemote;
