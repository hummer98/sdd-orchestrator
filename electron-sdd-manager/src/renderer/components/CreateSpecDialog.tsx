/**
 * CreateSpecDialog Component
 * Dialog for creating new specifications via spec-manager:init
 * Task 5.1, 5.2, 5.3 (sidebar-refactor)
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { useState } from 'react';
import { X, Plus, Loader2, AlertCircle } from 'lucide-react';
import { useProjectStore, useSpecStore, notify } from '../stores';
import { descriptionSchema } from '../utils/validation';
import { clsx } from 'clsx';

interface CreateSpecDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateSpecDialog({ isOpen, onClose }: CreateSpecDialogProps) {
  const { currentProject } = useProjectStore();
  const { refreshSpecs } = useSpecStore();

  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    setError(null);
  };

  const handleCreate = async () => {
    if (!currentProject) return;

    // Validate description
    const result = descriptionSchema.safeParse(description);
    if (!result.success) {
      setError(result.error.errors[0]?.message || '説明を入力してください');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Call spec-manager:init via IPC
      await window.electronAPI.executeSpecInit(currentProject, description);
      await refreshSpecs();
      notify.success('仕様を作成しました');
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '仕様の作成に失敗しました');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setDescription('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const charCount = [...description].length;
  const isValid = charCount >= 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div
        className={clsx(
          'relative z-10 w-full max-w-md p-6 rounded-lg shadow-xl',
          'bg-white dark:bg-gray-900'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
            新規仕様を作成
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
          {/* Description field only */}
          <div>
            <label
              htmlFor="spec-description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              説明
            </label>
            <textarea
              id="spec-description"
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="機能の概要を入力してください。spec-manager:initが仕様名を自動生成します..."
              rows={5}
              disabled={isCreating}
              className={clsx(
                'w-full px-3 py-2 rounded-md resize-none',
                'bg-gray-50 dark:bg-gray-800',
                'border',
                error
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500',
                'focus:outline-none focus:ring-2',
                'disabled:opacity-50'
              )}
            />
            <p className={clsx(
              'mt-1 text-xs',
              charCount < 10 ? 'text-gray-500' : 'text-green-600'
            )}>
              10文字以上で入力してください（{charCount}/10）
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleClose}
            disabled={isCreating}
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
            onClick={handleCreate}
            disabled={isCreating || !isValid}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-md',
              'bg-blue-500 hover:bg-blue-600 text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                作成中...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                作成
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
