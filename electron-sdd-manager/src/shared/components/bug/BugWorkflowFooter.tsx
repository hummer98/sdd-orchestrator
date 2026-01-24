/**
 * BugWorkflowFooter Component (Shared)
 * mobile-layout-refine: Task 1.1
 * Requirements: 7.1, 7.2, 7.3
 *
 * Footer with auto-execution and worktree conversion controls.
 * This component is platform-agnostic and can be used from both
 * Electron renderer and Remote UI.
 *
 * Originally from renderer/components/BugWorkflowFooter.tsx
 * Moved to shared/components/bug/ for cross-platform usage.
 */

import React from 'react';
import { Bot, Square, GitBranch, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

// =============================================================================
// Types
// =============================================================================

/**
 * BugWorktreeConfig - Worktree configuration for bugs
 * Matches the structure from renderer/types/bugJson.ts
 */
interface BugWorktreeConfig {
  /** Relative path from main project root */
  path: string;
  /** Branch name */
  branch: string;
  /** Creation timestamp (ISO-8601) */
  created_at: string;
}

/**
 * BugJson - Bug metadata stored in bug.json
 * Platform-agnostic type definition for the shared component
 * Matches the structure from renderer/types/bugJson.ts
 */
export interface BugJson {
  /** Bug name (directory name) */
  bug_name: string;
  /** Creation timestamp (ISO-8601) */
  created_at: string;
  /** Last update timestamp (ISO-8601) */
  updated_at: string;
  /** Worktree configuration (optional) */
  worktree?: BugWorktreeConfig;
  /** Bug phase (optional for backward compatibility) */
  phase?: string;
}

/**
 * Props for BugWorkflowFooter
 * Requirements: 7.2 - maintain existing functionality
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

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Determine if convert button should be shown for bugs
 * Requirements: 7.2 - maintain existing functionality
 *
 * @param isOnMain - Whether on main/master branch
 * @param bugJson - Bug's bug.json data
 * @returns true if convert button should be shown
 */
export function canShowBugConvertButton(
  isOnMain: boolean,
  bugJson: BugJson | null | undefined
): boolean {
  // Not on main branch - hide button
  if (!isOnMain) return false;

  // No bugJson - hide button
  if (!bugJson) return false;

  // Already in worktree mode - hide button
  if (bugJson.worktree) return false;

  // All conditions met - show button
  return true;
}

// =============================================================================
// Component
// =============================================================================

/**
 * BugWorkflowFooter Component
 * Requirements: 7.1, 7.2, 7.3
 *
 * Platform-agnostic footer component with:
 * - Auto-execution start/stop button
 * - Worktree conversion button (when applicable)
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
  const showConvertButton = canShowBugConvertButton(isOnMain, bugJson);

  // Disable when agents running
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
      {/* Auto Execution Button */}
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
          <Bot className="w-4 h-4" />
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

      {/* Convert to Worktree Button */}
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
