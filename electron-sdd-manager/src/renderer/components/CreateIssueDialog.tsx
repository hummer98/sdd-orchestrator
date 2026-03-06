/**
 * CreateIssueDialog Component
 * Modal dialog for creating GitHub Issues (Electron version).
 *
 * github-issue-integration: Task 7.4
 * Requirements: 3.1, 3.4
 */

import { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { X, Loader2, AlertCircle } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface CreateIssueFormData {
  title: string;
  body: string;
  labels: string[];
  assignees: string[];
}

export interface CreateIssueDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateIssueFormData) => Promise<void>;
}

// =============================================================================
// Component
// =============================================================================

export function CreateIssueDialog({
  isOpen,
  onClose,
  onSubmit,
}: CreateIssueDialogProps): React.ReactElement | null {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [labelsInput, setLabelsInput] = useState('');
  const [assigneesInput, setAssigneesInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = title.trim().length > 0;

  const handleSubmit = useCallback(async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const labels = labelsInput
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean);
      const assignees = assigneesInput
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

      await onSubmit({
        title: title.trim(),
        body: body.trim(),
        labels,
        assignees,
      });

      // Reset form on success
      setTitle('');
      setBody('');
      setLabelsInput('');
      setAssigneesInput('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Issue作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  }, [title, body, labelsInput, assigneesInput, isValid, isSubmitting, onSubmit, onClose]);

  const handleClose = useCallback(() => {
    setTitle('');
    setBody('');
    setLabelsInput('');
    setAssigneesInput('');
    setError(null);
    setIsSubmitting(false);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        data-testid="modal-backdrop"
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div
        className={clsx(
          'relative z-10 w-full max-w-xl p-6 rounded-lg shadow-xl',
          'bg-white dark:bg-gray-900'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
            新規Issue作成
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label
              htmlFor="issue-title"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              タイトル
            </label>
            <input
              id="issue-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Issueのタイトルを入力..."
              disabled={isSubmitting}
              className={clsx(
                'w-full px-3 py-2 rounded-md',
                'bg-gray-50 dark:bg-gray-800',
                'text-gray-900 dark:text-gray-100',
                'border border-gray-200 dark:border-gray-700',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
                'disabled:opacity-50'
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
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Issueの詳細を入力..."
              rows={5}
              disabled={isSubmitting}
              className={clsx(
                'w-full px-3 py-2 rounded-md resize-none',
                'bg-gray-50 dark:bg-gray-800',
                'text-gray-900 dark:text-gray-100',
                'border border-gray-200 dark:border-gray-700',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
                'disabled:opacity-50'
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
              type="text"
              value={labelsInput}
              onChange={(e) => setLabelsInput(e.target.value)}
              placeholder="カンマ区切りでLabel名を入力 (例: bug, enhancement)"
              disabled={isSubmitting}
              className={clsx(
                'w-full px-3 py-2 rounded-md',
                'bg-gray-50 dark:bg-gray-800',
                'text-gray-900 dark:text-gray-100',
                'border border-gray-200 dark:border-gray-700',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
                'disabled:opacity-50'
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
              type="text"
              value={assigneesInput}
              onChange={(e) => setAssigneesInput(e.target.value)}
              placeholder="カンマ区切りでユーザー名を入力"
              disabled={isSubmitting}
              className={clsx(
                'w-full px-3 py-2 rounded-md',
                'bg-gray-50 dark:bg-gray-800',
                'text-gray-900 dark:text-gray-100',
                'border border-gray-200 dark:border-gray-700',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
                'disabled:opacity-50'
              )}
            />
          </div>

          {/* Auto-label note */}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            作成時に <span className="font-medium text-yellow-600">status:triage</span> Labelが自動的に付与されます
          </p>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className={clsx(
              'px-4 py-2 rounded-md',
              'text-gray-700 dark:text-gray-300',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'disabled:opacity-50'
            )}
          >
            キャンセル
          </button>
          <button
            data-testid="create-issue-submit"
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-md text-white',
              'bg-blue-500 hover:bg-blue-600',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors'
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
      </div>
    </div>
  );
}
