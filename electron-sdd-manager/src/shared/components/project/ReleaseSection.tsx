/**
 * ReleaseSection Component
 * Displays release.md status and generation button
 * Requirements: 3.1, 3.3, 3.5 (steering-release-integration)
 *
 * Props-driven design for Electron/Remote UI sharing.
 */

import { FileWarning, Download, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

// =============================================================================
// Types
// =============================================================================

/** Release check result containing release.md status */
export interface ReleaseCheckResult {
  readonly releaseMdExists: boolean;
}

export interface ReleaseSectionProps {
  /** Release files check result */
  readonly releaseCheck: ReleaseCheckResult | null;
  /** Loading state for generation */
  readonly releaseGenerateLoading: boolean;
  /** Callback to generate release.md */
  readonly onGenerateReleaseMd: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function ReleaseSection({
  releaseCheck,
  releaseGenerateLoading,
  onGenerateReleaseMd,
}: ReleaseSectionProps) {
  // Don't render if no check result or release.md exists
  if (!releaseCheck || releaseCheck.releaseMdExists) {
    return null;
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
      <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400">
        Release
      </h3>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
          <FileWarning className="w-4 h-4" />
          <span>release.md が不足しています</span>
        </div>

        <button
          onClick={onGenerateReleaseMd}
          disabled={releaseGenerateLoading}
          className={clsx(
            'w-full px-3 py-2 rounded-md text-xs',
            'bg-blue-500 hover:bg-blue-600 text-white',
            'flex items-center justify-center gap-2',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          aria-label="release.md を生成"
        >
          {releaseGenerateLoading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Download className="w-3 h-3" />
              release.md を生成
            </>
          )}
        </button>
      </div>
    </div>
  );
}
