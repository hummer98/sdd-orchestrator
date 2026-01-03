/**
 * UpdateBanner Component
 * Displays update notification when commandsets need updating
 * Requirements (commandset-version-detection): 3.2, 3.3, 3.4
 */

import React from 'react';
import type { VersionCheckResult } from '../types';

interface UpdateBannerProps {
  versionResult: VersionCheckResult;
  onDismiss?: () => void;
  onUpdate?: () => void;
}

/**
 * UpdateBanner - Displays a banner when commandsets need updating
 * Requirements (commandset-version-detection): 3.2, 3.3
 */
export const UpdateBanner: React.FC<UpdateBannerProps> = ({
  versionResult,
  onDismiss,
  onUpdate,
}) => {
  // Don't show banner if no updates required
  if (!versionResult.anyUpdateRequired) {
    return null;
  }

  // Count updates needed
  const updateCount = versionResult.commandsets.filter(c => c.updateRequired).length;

  return (
    <div
      className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-3 mb-3"
      role="alert"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <svg
            className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              {updateCount === 1
                ? 'Commandset update available'
                : `${updateCount} commandset updates available`}
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-0.5">
              {versionResult.commandsets
                .filter(c => c.updateRequired)
                .map(c => `${c.name} (${c.installedVersion || '?'} -> ${c.bundleVersion})`)
                .join(', ')}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {onUpdate && (
            <button
              onClick={onUpdate}
              className="px-3 py-1 text-xs font-medium text-yellow-800 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-800/40 hover:bg-yellow-200 dark:hover:bg-yellow-800/60 rounded transition-colors"
            >
              Update
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
              aria-label="Dismiss"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * LegacyProjectBanner - Displays a banner for legacy projects without version info
 * Requirements (commandset-version-detection): 3.4
 */
export const LegacyProjectBanner: React.FC<{
  versionResult: VersionCheckResult;
  onReinstall?: () => void;
}> = ({ versionResult, onReinstall }) => {
  // Only show for legacy projects
  if (!versionResult.legacyProject || versionResult.hasCommandsets) {
    return null;
  }

  return (
    <div
      className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-3 mb-3"
      role="alert"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <svg
            className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Legacy project detected
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
              Reinstall commandsets to enable version tracking
            </p>
          </div>
        </div>
        {onReinstall && (
          <button
            onClick={onReinstall}
            className="px-3 py-1 text-xs font-medium text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-800/40 hover:bg-blue-200 dark:hover:bg-blue-800/60 rounded transition-colors"
          >
            Reinstall
          </button>
        )}
      </div>
    </div>
  );
};
