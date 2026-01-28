/**
 * GitDiffViewer Component
 * Syntax-highlighted diff display component
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 10.3, 10.4
 *
 * This component is shared between Electron and Remote UI.
 */

import { useMemo, useCallback } from 'react';
import { Loader2, SplitSquareHorizontal, FileText } from 'lucide-react';
import { parseDiff, Diff, Hunk, HunkData } from 'react-diff-view';

import { useSharedGitViewStore } from '@shared/stores/gitViewStore';

// Import react-diff-view styles
import 'react-diff-view/style/index.css';

/**
 * Check if diff content indicates a binary file
 */
function isBinaryDiff(diffContent: string): boolean {
  return diffContent.includes('Binary files') && diffContent.includes('differ');
}

/**
 * GitDiffViewer - Displays syntax-highlighted diff content
 *
 * Features:
 * - Diff display using react-diff-view
 * - Unified/Split view mode toggle
 * - Line number display
 * - Add/Remove/Unchanged line highlighting
 * - Binary file detection
 * - Scroll support
 */
export function GitDiffViewer(): React.ReactElement {
  const {
    selectedFilePath,
    cachedDiffContent,
    isLoading,
    error,
    diffMode,
    setDiffMode,
  } = useSharedGitViewStore();

  // Parse diff content
  const parsedDiff = useMemo(() => {
    if (!cachedDiffContent) {
      return null;
    }
    try {
      const files = parseDiff(cachedDiffContent);
      return files.length > 0 ? files[0] : null;
    } catch (e) {
      console.warn('Failed to parse diff:', e);
      return null;
    }
  }, [cachedDiffContent]);

  // Handle mode toggle
  const handleModeToggle = useCallback(() => {
    setDiffMode(diffMode === 'unified' ? 'split' : 'unified');
  }, [diffMode, setDiffMode]);

  // No file selected state
  if (!selectedFilePath) {
    return (
      <div
        className="h-full flex items-center justify-center text-gray-400"
        data-testid="no-file-selected"
      >
        ファイルを選択して差分を表示
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center" data-testid="diff-loading">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-400">差分を取得中...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className="h-full flex items-center justify-center text-red-500"
        data-testid="diff-error"
      >
        {error}
      </div>
    );
  }

  // No diff content
  if (!cachedDiffContent) {
    return (
      <div
        className="h-full flex items-center justify-center text-gray-400"
        data-testid="no-diff-content"
      >
        差分がありません
      </div>
    );
  }

  // Binary file
  if (isBinaryDiff(cachedDiffContent)) {
    return (
      <div className="h-full overflow-auto" data-testid="diff-container">
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {selectedFilePath}
            </div>
          </div>
          <div
            className="flex items-center justify-center p-8 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
            data-testid="binary-file-message"
          >
            <span className="text-gray-500">バイナリファイルは表示できません</span>
          </div>
        </div>
      </div>
    );
  }

  // No parsed hunks (empty diff or unparseable diff)
  if (!parsedDiff?.hunks || parsedDiff.hunks.length === 0) {
    return (
      <div className="h-full overflow-auto" data-testid="diff-container">
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {selectedFilePath}
            </div>
            <button
              onClick={handleModeToggle}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              data-testid="diff-mode-toggle"
              title={diffMode === 'unified' ? 'Split view' : 'Unified view'}
            >
              {diffMode === 'unified' ? (
                <>
                  <SplitSquareHorizontal className="w-3 h-3" />
                  <span>Split</span>
                </>
              ) : (
                <>
                  <FileText className="w-3 h-3" />
                  <span>Unified</span>
                </>
              )}
            </button>
          </div>
          <div
            className="flex items-center justify-center p-8 text-gray-400"
            data-testid="no-diff-content"
          >
            差分がありません
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto" data-testid="diff-container">
      <div className="p-4">
        {/* Header with file name and mode toggle */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {selectedFilePath}
          </div>
          <button
            onClick={handleModeToggle}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            data-testid="diff-mode-toggle"
            title={diffMode === 'unified' ? 'Split view' : 'Unified view'}
          >
            {diffMode === 'unified' ? (
              <>
                <SplitSquareHorizontal className="w-3 h-3" />
                <span>Split</span>
              </>
            ) : (
              <>
                <FileText className="w-3 h-3" />
                <span>Unified</span>
              </>
            )}
          </button>
        </div>

        {/* Diff view */}
        <div
          className="text-xs font-mono bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 overflow-auto"
          data-testid="diff-content"
        >
          <Diff
            viewType={diffMode}
            diffType={parsedDiff.type}
            hunks={parsedDiff.hunks}
          >
            {(hunks: HunkData[]) =>
              hunks.map((hunk: HunkData) => (
                <Hunk
                  key={hunk.content}
                  hunk={hunk}
                />
              ))
            }
          </Diff>
        </div>
      </div>
    </div>
  );
}

export default GitDiffViewer;
