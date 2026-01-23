/**
 * CreateBugDialogRemote Component
 *
 * Task 4.2: Bug作成ダイアログのRemote UI実装
 *
 * Desktop版: 標準モーダルダイアログ
 * Smartphone版: フルスクリーンモーダル
 *
 * Requirements: 1.2, 1.3, 1.4, 3.1 (remote-ui-bug-advanced-features)
 */

import React, { useState, useCallback } from 'react';
import { X, AlertCircle, GitBranch, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import type { ApiClient } from '@shared/api/types';
import { useSharedBugStore } from '@shared/stores/bugStore';
// submit-shortcut-key: Task 2.5 - Keyboard shortcut hook
import { useSubmitShortcut } from '@shared/hooks';

// =============================================================================
// Types
// =============================================================================

export interface CreateBugDialogRemoteProps {
  /** ダイアログ表示状態 */
  isOpen: boolean;
  /** ダイアログを閉じるコールバック */
  onClose: () => void;
  /** APIクライアント */
  apiClient: ApiClient;
  /** デバイスタイプ */
  deviceType: 'desktop' | 'smartphone';
}

// =============================================================================
// Component
// =============================================================================

/**
 * CreateBugDialogRemote - Bug作成ダイアログ
 *
 * Desktop版: 中央モーダル
 * Smartphone版: フルスクリーンモーダル
 */
export function CreateBugDialogRemote({
  isOpen,
  onClose,
  apiClient,
  deviceType,
}: CreateBugDialogRemoteProps): React.ReactElement | null {
  // State
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Store
  const { useWorktree, setUseWorktree, createBug } = useSharedBugStore();

  // Generate bug name from description (first 30 chars, sanitized)
  const generateBugName = useCallback((desc: string): string => {
    return desc
      .trim()
      .slice(0, 30)
      .toLowerCase()
      .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }, []);

  // Handle submit
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!description.trim()) {
        setError('説明を入力してください');
        return;
      }

      setIsSubmitting(true);
      setError(null);

      const bugName = generateBugName(description);

      const success = await createBug(apiClient, bugName, description.trim());

      setIsSubmitting(false);

      if (success) {
        // Reset form and close dialog
        setDescription('');
        onClose();
      } else {
        // Error is set in store, get it
        const storeError = useSharedBugStore.getState().error;
        setError(storeError || 'Bugの作成に失敗しました');
      }
    },
    [apiClient, createBug, description, generateBugName, onClose]
  );

  // Handle close
  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      setDescription('');
      setError(null);
      onClose();
    }
  }, [isSubmitting, onClose]);

  // Validation
  const isValid = description.trim().length > 0;

  // submit-shortcut-key: Task 2.5 - Shortcut submit handler (wraps handleSubmit without event)
  const handleShortcutSubmit = useCallback(() => {
    // Create a synthetic event to satisfy handleSubmit signature
    const syntheticEvent = { preventDefault: () => {} } as React.FormEvent;
    handleSubmit(syntheticEvent);
  }, [handleSubmit]);

  // submit-shortcut-key: Task 2.5 - Keyboard shortcut for form submission
  // Note: Hook must be called before early return to comply with React rules of hooks
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
      data-testid="create-bug-dialog-overlay"
      className={clsx(
        'fixed inset-0 z-50',
        'bg-black/50',
        'flex items-center justify-center',
        isSmartphone && 'items-start justify-start'
      )}
      onClick={handleClose}
    >
      <div
        data-testid="create-bug-dialog"
        onClick={(e) => e.stopPropagation()}
        className={clsx(
          'bg-white dark:bg-gray-900',
          'flex flex-col',
          isSmartphone
            ? 'w-full h-full'
            : 'w-full max-w-md rounded-lg shadow-xl mx-4'
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
            新規バグを作成
          </h2>
          <button
            data-testid="create-bug-dialog-close"
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
            {/* Description */}
            <div>
              <label
                htmlFor="bug-description"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                バグの説明 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="bug-description"
                data-testid="create-bug-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSubmitting}
                placeholder="バグの内容を説明してください..."
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

            {/* Worktree Checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="use-worktree"
                data-testid="create-bug-worktree-checkbox"
                checked={useWorktree}
                onChange={(e) => setUseWorktree(e.target.checked)}
                disabled={isSubmitting}
                className={clsx(
                  'w-4 h-4 rounded',
                  'text-blue-600',
                  'border-gray-300 dark:border-gray-600',
                  'focus:ring-blue-500',
                  isSubmitting && 'opacity-50'
                )}
              />
              <label
                htmlFor="use-worktree"
                className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300"
              >
                <GitBranch className="w-4 h-4" />
                Worktreeモードで実行
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div
                data-testid="create-bug-error"
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
              data-testid="create-bug-cancel"
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
              data-testid="create-bug-submit"
              disabled={isSubmitting || !description.trim()}
              className={clsx(
                'flex-1 px-4 py-2 text-sm font-medium rounded-md',
                'flex items-center justify-center gap-2',
                'bg-blue-600 hover:bg-blue-700',
                'text-white',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
                (isSubmitting || !description.trim()) && 'opacity-50 cursor-not-allowed'
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

export default CreateBugDialogRemote;
