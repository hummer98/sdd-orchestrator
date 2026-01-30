/**
 * DiffModeToggle Component
 * git-view-source-mode Task 8.1: 3-button UI (Unified | Split | Source)
 * Requirements: 2.1 (3ボタン並列表示), 2.2 (モード切替動作), 2.3 (アクティブ状態の視覚表示)
 *
 * A 3-button toggle group to switch between unified, split, and source view modes.
 */

import type { GitViewDiffMode } from '@shared/stores/gitViewStore';

export interface ViewModeToggleProps {
  /** Current diff mode */
  diffMode: GitViewDiffMode;
  /** Callback when mode changes */
  onDiffModeChange: (mode: GitViewDiffMode) => void;
}

/**
 * ViewModeToggle - 3-button toggle group for diff modes
 *
 * Displays three buttons:
 * - "Unified": Shows unified diff view
 * - "Split": Shows split (side-by-side) diff view
 * - "Source": Shows the current file content
 */
export function ViewModeToggle({
  diffMode,
  onDiffModeChange,
}: ViewModeToggleProps): React.ReactElement {
  const buttonClass = (mode: GitViewDiffMode) =>
    `px-3 py-1 text-sm font-medium ${
      diffMode === mode
        ? 'bg-blue-500 text-white'
        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`;

  return (
    <div
      className="inline-flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden"
      role="group"
      aria-label="Diff mode toggle"
    >
      <button
        type="button"
        className={buttonClass('unified')}
        onClick={() => onDiffModeChange('unified')}
        aria-pressed={diffMode === 'unified'}
        data-testid="diff-mode-unified"
      >
        Unified
      </button>
      <button
        type="button"
        className={`${buttonClass('split')} border-l border-gray-300 dark:border-gray-600`}
        onClick={() => onDiffModeChange('split')}
        aria-pressed={diffMode === 'split'}
        data-testid="diff-mode-split"
      >
        Split
      </button>
      <button
        type="button"
        className={`${buttonClass('source')} border-l border-gray-300 dark:border-gray-600`}
        onClick={() => onDiffModeChange('source')}
        aria-pressed={diffMode === 'source'}
        data-testid="diff-mode-source"
      >
        Source
      </button>
    </div>
  );
}

export default ViewModeToggle;
