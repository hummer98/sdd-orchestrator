/**
 * BugWorkflowFooter Component
 * Footer with auto-execution and worktree conversion controls
 * bugs-workflow-footer: Tasks 4.1, 4.2
 * Requirements: 1.1-1.4, 2.1-2.7, 3.1-3.6, 4.1-4.5
 */

import { Play, Square, GitBranch, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import type { BugJson } from '../types/bugJson';

/**
 * Props for BugWorkflowFooter
 * Requirements: 1.2
 */
export interface BugWorkflowFooterProps {
  /** Current auto-execution state */
  isAutoExecuting: boolean;
  /** Whether any agents are running for this bug */
  hasRunningAgents: boolean;
  /** Callback for auto-execution button click */
  onAutoExecution: () => void;
  /** Whether current branch is main/master */
  isOnMain: boolean;
  /** Current bug's bug.json data */
  bugJson: BugJson | null | undefined;
  /** Callback for convert to worktree button click */
  onConvertToWorktree: () => void;
  /** Whether worktree conversion is in progress */
  isConverting: boolean;
}

/**
 * Determine if convert button should be shown
 * Task 4.1: Requirements 4.1-4.5
 *
 * @param isOnMain - Whether on main/master branch
 * @param bugJson - Bug's bug.json data
 * @returns true if convert button should be shown
 */
export function canShowConvertButton(
  isOnMain: boolean,
  bugJson: BugJson | null | undefined
): boolean {
  // Requirements 4.2: Not on main branch - hide button
  if (!isOnMain) return false;

  // Requirements 4.3: No bugJson - hide button
  if (!bugJson) return false;

  // Requirements 4.4: Already in worktree mode - hide button
  if (bugJson.worktree) return false;

  // Requirements 4.5: All conditions met - show button
  return true;
}

/**
 * BugWorkflowFooter Component
 * Task 4.2: Requirements 1.1-1.4, 2.1-2.7, 3.1-3.6
 */
export function BugWorkflowFooter({
  isAutoExecuting,
  hasRunningAgents,
  onAutoExecution,
  isOnMain,
  bugJson,
  onConvertToWorktree,
  isConverting,
}: BugWorkflowFooterProps): React.ReactElement {
  const showConvertButton = canShowConvertButton(isOnMain, bugJson);

  // Requirements 2.3, 3.4: Disable when agents running
  const autoExecutionDisabled = hasRunningAgents && !isAutoExecuting;
  const convertDisabled = hasRunningAgents || isAutoExecuting || isConverting;

  return (
    <div
      data-testid="bug-workflow-footer"
      className={clsx(
        'p-4 border-t border-gray-200 dark:border-gray-700',
        'flex items-center gap-2'
      )}
    >
      {/* Requirements 2.1-2.7: Auto Execution Button */}
      {!isAutoExecuting ? (
        <button
          data-testid="bug-auto-execute-button"
          onClick={onAutoExecution}
          disabled={autoExecutionDisabled}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md',
            'text-sm font-medium transition-colors',
            !autoExecutionDisabled
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
          )}
        >
          <Play className="w-4 h-4" />
          <span>自動実行</span>
        </button>
      ) : (
        <button
          data-testid="bug-auto-execute-button"
          onClick={onAutoExecution}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md',
            'text-sm font-medium transition-colors',
            'bg-red-500 text-white hover:bg-red-600'
          )}
        >
          <Square className="w-4 h-4" />
          <span>停止</span>
        </button>
      )}

      {/* Requirements 3.1-3.6: Convert to Worktree Button */}
      {showConvertButton && (
        <button
          data-testid="bug-convert-worktree-button"
          onClick={onConvertToWorktree}
          disabled={convertDisabled}
          className={clsx(
            'flex items-center justify-center gap-2 px-4 py-2 rounded-md',
            'text-sm font-medium transition-colors',
            !convertDisabled
              ? 'bg-violet-500 text-white hover:bg-violet-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
          )}
        >
          {isConverting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>変換中...</span>
            </>
          ) : (
            <>
              <GitBranch className="w-4 h-4" />
              <span>Worktreeに変換</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
