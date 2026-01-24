/**
 * SteeringSection Component
 * Displays steering verification-commands.md status and generation button
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 *
 * Props-driven design for Electron/Remote UI sharing.
 */

import { FileWarning, Download, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

// =============================================================================
// Types
// =============================================================================

/** Steering check result containing verification-commands.md status */
export interface SteeringCheckResult {
  readonly verificationMdExists: boolean;
}

export interface SteeringSectionProps {
  /** Steering files check result */
  readonly steeringCheck: SteeringCheckResult | null;
  /** Loading state for generation */
  readonly steeringGenerateLoading: boolean;
  /** Callback to generate verification-commands.md */
  readonly onGenerateVerificationMd: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function SteeringSection({
  steeringCheck,
  steeringGenerateLoading,
  onGenerateVerificationMd,
}: SteeringSectionProps) {
  // Don't render if no check result or verification-commands.md exists
  if (!steeringCheck || steeringCheck.verificationMdExists) {
    return null;
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
      <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400">
        Steering
      </h3>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
          <FileWarning className="w-4 h-4" />
          <span>verification-commands.md が不足しています</span>
        </div>

        <button
          onClick={onGenerateVerificationMd}
          disabled={steeringGenerateLoading}
          className={clsx(
            'w-full px-3 py-2 rounded-md text-xs',
            'bg-blue-500 hover:bg-blue-600 text-white',
            'flex items-center justify-center gap-2',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          aria-label="verification-commands.md を生成"
        >
          {steeringGenerateLoading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Download className="w-3 h-3" />
              verification-commands.md を生成
            </>
          )}
        </button>
      </div>
    </div>
  );
}
