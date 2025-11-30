/**
 * InfoDialog Component
 * Displays information about commands/phases in a modal dialog
 */

import { X } from 'lucide-react';
import { clsx } from 'clsx';

interface InfoDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  onClose: () => void;
}

export function InfoDialog({ isOpen, title, description, onClose }: InfoDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className={clsx(
          'relative z-10 w-full max-w-sm p-5 rounded-lg shadow-xl',
          'bg-white dark:bg-gray-900'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
          {description}
        </p>

        {/* Close button */}
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className={clsx(
              'px-4 py-2 rounded-md text-sm',
              'bg-gray-100 dark:bg-gray-800',
              'text-gray-700 dark:text-gray-300',
              'hover:bg-gray-200 dark:hover:bg-gray-700',
              'transition-colors'
            )}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
