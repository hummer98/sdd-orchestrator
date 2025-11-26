/**
 * UnsavedChangesDialog Component
 * Confirmation dialog for unsaved changes
 * Requirements: 9.1, 9.3, 9.4
 */

import { AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onContinue: () => void;
  onCancel: () => void;
}

export function UnsavedChangesDialog({
  isOpen,
  onContinue,
  onCancel,
}: UnsavedChangesDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        className={clsx(
          'relative z-10 w-full max-w-md p-6 rounded-lg shadow-xl',
          'bg-white dark:bg-gray-900'
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-yellow-100 rounded-full">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
            未保存の変更
          </h2>
        </div>

        {/* Content */}
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          保存されていない変更があります。変更を破棄して続行しますか？
        </p>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className={clsx(
              'px-4 py-2 rounded-md',
              'text-gray-700 dark:text-gray-300',
              'hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
          >
            キャンセル
          </button>
          <button
            onClick={onContinue}
            className={clsx(
              'px-4 py-2 rounded-md',
              'bg-yellow-500 hover:bg-yellow-600 text-white'
            )}
          >
            変更を破棄
          </button>
        </div>
      </div>
    </div>
  );
}
