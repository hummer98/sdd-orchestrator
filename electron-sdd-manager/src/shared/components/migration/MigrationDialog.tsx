/**
 * MigrationDialog Component
 * Displays migration prompt for legacy logs
 *
 * Requirements: 5.3, 5.4, 5.5
 *
 * Task 6.1: MigrationDialog component
 */

import { clsx } from 'clsx';
import { X, FolderSync, AlertCircle, Loader2 } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface MigrationDialogProps {
  /** Dialog open state */
  readonly isOpen: boolean;
  /** Spec or bug ID (with 'bug:' prefix for bugs) */
  readonly specId: string;
  /** Number of files to migrate */
  readonly fileCount: number;
  /** Total size of files in bytes */
  readonly totalSize: number;
  /** Whether migration is in progress */
  readonly isProcessing: boolean;
  /** Error message if migration failed */
  readonly error?: string;
  /** Accept migration callback */
  readonly onAccept: (specId: string) => void;
  /** Decline migration callback */
  readonly onDecline: (specId: string) => void;
  /** Close dialog callback */
  readonly onClose: () => void;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);

  return `${value.toFixed(1)} ${sizes[i]}`;
}

/**
 * Extract display name from specId
 * Removes 'bug:' prefix for bugs
 */
function getDisplayName(specId: string): string {
  if (specId.startsWith('bug:')) {
    return specId.substring(4);
  }
  return specId;
}

/**
 * Check if specId is a bug
 */
function isBug(specId: string): boolean {
  return specId.startsWith('bug:');
}

// =============================================================================
// Component
// =============================================================================

export function MigrationDialog({
  isOpen,
  specId,
  fileCount,
  totalSize,
  isProcessing,
  error,
  onAccept,
  onDecline,
  onClose,
}: MigrationDialogProps): React.ReactElement | null {
  if (!isOpen) return null;

  const displayName = getDisplayName(specId);
  const isBugLog = isBug(specId);
  const formattedSize = formatBytes(totalSize);

  const handleAccept = () => {
    onAccept(specId);
  };

  const handleDecline = () => {
    onDecline(specId);
  };

  const handleBackdropClick = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      data-testid="migration-dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleBackdropClick}
        data-testid="dialog-backdrop"
      />

      {/* Dialog */}
      <div
        className={clsx(
          'relative z-10 w-full max-w-md p-6 rounded-lg shadow-xl',
          'bg-white dark:bg-gray-900'
        )}
        data-testid="dialog-content"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderSync className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
              Legacy Log Migration
            </h2>
          </div>
          {!isProcessing && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              data-testid="close-button"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Explanation */}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Legacy log files were found for{' '}
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {isBugLog ? `Bug: ${displayName}` : displayName}
            </span>
            . Would you like to migrate them to the new location?
          </p>

          {/* Stats */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Files:</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {fileCount}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600 dark:text-gray-400">Total size:</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {formattedSize}
              </span>
            </div>
          </div>

          {/* Info about migration */}
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Migration will move log files from the legacy path to the new structure.
            This is a one-time operation per {isBugLog ? 'bug' : 'spec'}.
          </p>

          {/* Processing indicator */}
          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Migrating...</span>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div
              className="flex items-center gap-2 p-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md"
              data-testid="error-message"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleDecline}
            disabled={isProcessing}
            className={clsx(
              'px-4 py-2 rounded-md text-sm',
              'text-gray-700 dark:text-gray-300',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            Skip
          </button>
          <button
            onClick={handleAccept}
            disabled={isProcessing}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm',
              'bg-amber-500 hover:bg-amber-600',
              'text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Migrating...
              </>
            ) : (
              'Migrate'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
