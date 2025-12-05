/**
 * RemoteAccessDialog Component
 * Modal dialog for displaying remote access server info (QR code, URL)
 * Requirements: 1.4, 1.5, 2.2
 */

import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { RemoteAccessPanel } from './RemoteAccessPanel';

export interface RemoteAccessDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when the dialog is closed */
  onClose: () => void;
}

/**
 * RemoteAccessDialog Component
 *
 * A modal dialog that displays the RemoteAccessPanel.
 * Used when server is started from the menu to show QR code and URL.
 *
 * @example
 * <RemoteAccessDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} />
 */
export function RemoteAccessDialog({ isOpen, onClose }: RemoteAccessDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="remote-access-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog Content */}
      <div
        className={clsx(
          'relative z-10 w-full max-w-md mx-4',
          'bg-white dark:bg-gray-800',
          'rounded-lg shadow-xl',
          'animate-in fade-in zoom-in-95 duration-200'
        )}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className={clsx(
            'absolute top-3 right-3 p-1.5 rounded-md',
            'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
            'hover:bg-gray-100 dark:hover:bg-gray-700',
            'transition-colors'
          )}
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* RemoteAccessPanel */}
        <RemoteAccessPanel className="border-0 shadow-none" />
      </div>
    </div>
  );
}
