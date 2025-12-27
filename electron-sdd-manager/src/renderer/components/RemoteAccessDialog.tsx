/**
 * RemoteAccessDialog Component
 * Modal dialog for displaying remote access server info (QR code, URL)
 * Requirements: 1.4, 1.5, 2.2
 */

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
        {/* RemoteAccessPanel */}
        <RemoteAccessPanel className="border-0 shadow-none" />
      </div>
    </div>
  );
}
