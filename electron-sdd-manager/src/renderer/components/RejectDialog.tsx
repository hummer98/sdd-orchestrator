/**
 * RejectDialog Component
 * Dialog for entering rejection reason
 * Requirements: 6.3, 6.4, 6.5, 6.6
 */

import { useState } from 'react';
import { X, XCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface RejectDialogProps {
  isOpen: boolean;
  phaseName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function RejectDialog({
  isOpen,
  phaseName,
  onConfirm,
  onCancel,
}: RejectDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError('却下理由を入力してください');
      return;
    }

    onConfirm(reason.trim());
    setReason('');
    setError(null);
  };

  const handleCancel = () => {
    setReason('');
    setError(null);
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleCancel}
      />

      {/* Dialog */}
      <div
        className={clsx(
          'relative z-10 w-full max-w-md p-6 rounded-lg shadow-xl',
          'bg-white dark:bg-gray-900'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
            {phaseName}を却下
          </h2>
          <button
            onClick={handleCancel}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            却下の理由を入力してください。この情報は記録され、改善に役立てられます。
          </p>

          <div>
            <label
              htmlFor="reject-reason"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              却下理由
            </label>
            <textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (e.target.value.trim()) {
                  setError(null);
                }
              }}
              placeholder="具体的な理由を記入..."
              rows={4}
              className={clsx(
                'w-full px-3 py-2 rounded-md resize-none',
                'bg-gray-50 dark:bg-gray-800',
                'border',
                error
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500',
                'focus:outline-none focus:ring-2'
              )}
            />
            {error && (
              <p className="mt-1 text-sm text-red-500">{error}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleCancel}
            className={clsx(
              'px-4 py-2 rounded-md',
              'text-gray-700 dark:text-gray-300',
              'hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
          >
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-md',
              'bg-red-500 hover:bg-red-600 text-white'
            )}
          >
            <XCircle className="w-4 h-4" />
            却下
          </button>
        </div>
      </div>
    </div>
  );
}
