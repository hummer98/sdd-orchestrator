/**
 * CenterPaneContainer Component
 * Exclusive container for switching between ArtifactEditor and GitView
 * Requirements: 5.1, 5.2, 5.3
 * git-diff-viewer Task 9.1: Use SPEC_ARTIFACT_TABS for consistent tabs
 */

import { useEffect } from 'react';
import { ArtifactEditor } from './ArtifactEditor';
import { GitView } from './GitView';
import type { TabInfo, ArtifactInfo } from './ArtifactEditor';
import { SPEC_ARTIFACT_TABS } from '../../shared/constants/artifacts';

/** Spec artifact tabs - use shared constant cast to local TabInfo type */
const SPEC_TABS: TabInfo[] = SPEC_ARTIFACT_TABS as unknown as TabInfo[];

export interface CenterPaneContainerProps {
  /** Dynamic tabs (document-review, inspection, etc.) */
  dynamicTabs: TabInfo[];
  /** View mode: 'artifacts' | 'git-diff' */
  viewMode: 'artifacts' | 'git-diff';
  /** Callback when viewMode changes */
  onViewModeChange: (mode: 'artifacts' | 'git-diff') => void;
  /** Base name for ArtifactEditor */
  baseName?: string;
  /** Placeholder for ArtifactEditor */
  placeholder?: string;
  /** Artifacts for ArtifactEditor */
  artifacts?: Record<string, ArtifactInfo | null>;
  /**
   * Worktree path for GitView.
   * When provided, GitView uses this path instead of projectPath for git operations.
   * Use this when viewing git diff for a worktree instead of the main project.
   */
  worktreePath?: string;
}

/**
 * CenterPaneContainer - Container for exclusive switching between ArtifactEditor and GitView
 */
export function CenterPaneContainer({
  dynamicTabs,
  viewMode,
  onViewModeChange,
  baseName,
  placeholder,
  artifacts,
  worktreePath,
}: CenterPaneContainerProps): React.ReactElement {
  // Keyboard shortcut: Ctrl+Shift+G (Windows/Linux) or Cmd+Shift+G (Mac)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'G') {
        e.preventDefault();
        onViewModeChange(viewMode === 'artifacts' ? 'git-diff' : 'artifacts');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [viewMode, onViewModeChange]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      {/* Segmented Control for view switching */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-700">
        <button
          role="button"
          aria-label="Artifacts"
          onClick={() => onViewModeChange('artifacts')}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            viewMode === 'artifacts'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Artifacts
        </button>
        <button
          role="button"
          aria-label="Git Diff"
          onClick={() => onViewModeChange('git-diff')}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            viewMode === 'git-diff'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Git Diff
        </button>
      </div>

      {/* Content area - conditional rendering based on viewMode */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'artifacts' ? (
          <ArtifactEditor
            tabs={SPEC_TABS}
            baseName={baseName || ''}
            placeholder={placeholder || '仕様を選択してエディターを開始'}
            dynamicTabs={dynamicTabs}
            artifacts={artifacts}
          />
        ) : (
          <GitView workingPath={worktreePath} />
        )}
      </div>
    </div>
  );
}

export default CenterPaneContainer;
