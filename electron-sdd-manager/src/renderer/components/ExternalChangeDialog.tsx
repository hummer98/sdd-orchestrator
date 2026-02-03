/**
 * ExternalChangeDialog Component
 *
 * project-config-editor Task 3.3: External change notification dialog
 * Requirements: 5.2, 5.3, 5.4, 5.5
 *
 * Features:
 * - Shows when external change is detected
 * - Offers reload or ignore options
 * - Integrates with projectEditorStore
 */

import { AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

export interface ExternalChangeDialogProps {
  /** Whether dialog is visible */
  isOpen: boolean;
  /** File name that changed */
  fileName: string;
  /** Callback when user chooses to reload */
  onReload: () => void;
  /** Callback when user chooses to ignore */
  onIgnore: () => void;
}

/**
 * ExternalChangeDialog - Notifies user of external file changes
 */
export function ExternalChangeDialog({
  isOpen,
  fileName,
  onReload,
  onIgnore,
}: ExternalChangeDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      data-testid="external-change-dialog"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-orange-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              外部で変更されました
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{fileName}</span> が外部で変更されました。
              リロードして最新の内容を取得するか、無視して現在の編集内容を保持できます。
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onIgnore}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-md',
              'text-gray-700 dark:text-gray-300',
              'bg-gray-100 dark:bg-gray-700',
              'hover:bg-gray-200 dark:hover:bg-gray-600',
              'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500'
            )}
          >
            無視
          </button>
          <button
            onClick={onReload}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-md',
              'text-white bg-blue-500 hover:bg-blue-600',
              'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500'
            )}
          >
            リロード
          </button>
        </div>
      </div>
    </div>
  );
}
