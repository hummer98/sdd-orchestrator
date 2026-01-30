/**
 * BinaryFileIndicator Component
 * git-view-source-mode Task 8.1: Binary file display indicator
 * Requirements: 4.1 (バイナリファイル表示)
 *
 * Displays a message indicating that the file cannot be displayed
 * because it is a binary file.
 */

import { FileQuestion } from 'lucide-react';

export interface BinaryFileIndicatorProps {
  /** File path for display */
  filePath?: string;
}

/**
 * BinaryFileIndicator - Display message for binary files
 *
 * Shows:
 * - Icon indicating binary file
 * - File path (if provided)
 * - Message explaining the file cannot be displayed
 */
export function BinaryFileIndicator({
  filePath,
}: BinaryFileIndicatorProps): React.ReactElement {
  return (
    <div
      className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400"
      data-testid="binary-file-indicator"
    >
      <FileQuestion className="w-16 h-16 mb-4 text-gray-400 dark:text-gray-600" />

      {filePath && (
        <div className="mb-2 text-sm font-mono text-gray-600 dark:text-gray-500">
          {filePath}
        </div>
      )}

      <div className="text-lg font-medium">
        Binary file - cannot display
      </div>

      <div className="mt-2 text-sm">
        This file cannot be displayed as text or image.
      </div>
    </div>
  );
}

export default BinaryFileIndicator;
