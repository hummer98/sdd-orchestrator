/**
 * GitView Component
 * Main UI component for git diff viewer (2-column layout)
 * Requirements: 6.1, 6.2, 6.3, 6.4, 10.3, 10.4
 *
 * git-view-source-mode: Extended with viewMode toggle
 * Requirements: 1.1 (diff/source表示切替)
 *
 * This component is shared between Electron and Remote UI.
 * It uses ApiClient abstraction to work with both IpcApiClient and WebSocketApiClient.
 */

import { useEffect, useCallback, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useApi } from '@shared/api/ApiClientProvider';
import { useSharedGitViewStore } from '@shared/stores/gitViewStore';
import { GitFileTree } from './GitFileTree';
import { GitDiffViewer } from './GitDiffViewer';
import { ViewModeToggle } from './ViewModeToggle';
import { SourceContentViewer } from './SourceContentViewer';
import { ResizeHandle } from '@shared/components/ui/ResizeHandle';
// trpc-full-migration Task 11.4: Import vanillaClient for tRPC subscription
// getVanillaClient() lazily initializes ipcLink, so importing the module is safe for Remote UI
import { getVanillaClient } from '../../trpc/vanillaClient';

/**
 * Props for GitView component
 */
export interface GitViewProps {
  /**
   * Explicit working path for git operations (e.g., worktree path).
   * When provided, takes precedence over apiClient.getProjectPath().
   * Use this when viewing git diff for a worktree instead of the main project.
   */
  workingPath?: string;

  /**
   * git-view-source-mode Task 8.1: Whether to show diff mode toggle (3 buttons)
   * When true, shows a toggle between 'unified', 'split', and 'source' views
   * Requirements: 2.1 (3ボタン並列表示)
   * @default true - Shows toggle by default
   */
  showDiffModeToggle?: boolean;
}

/**
 * GitView - Main component for displaying git diffs
 *
 * Layout:
 * - Left: GitFileTree (resizable width from gitViewStore.fileTreeWidth)
 * - Right: GitDiffViewer or SourceContentViewer (based on viewMode)
 *
 * Lifecycle:
 * - On mount: Fetch initial git status and start file watching
 * - On unmount: Stop file watching
 * - On file change event: Refresh status
 */
export function GitView({ workingPath, showDiffModeToggle = true }: GitViewProps): React.ReactElement {
  const apiClient = useApi();
  const {
    isLoading,
    error,
    cachedStatus,
    fileTreeWidth,
    setFileTreeWidth,
    refreshStatus,
    clearError,
    // git-view-source-mode: Extended state
    diffMode,
    setDiffMode,
    selectedFilePath,
    cachedFileContent,
  } = useSharedGitViewStore();

  // Resolve effective path: workingPath > apiClient.getProjectPath()
  const effectivePath = useMemo(() => {
    return workingPath ?? apiClient.getProjectPath?.() ?? '';
  }, [workingPath, apiClient]);

  // Initial load: fetch git status and start watching
  useEffect(() => {
    // Fetch initial status
    refreshStatus(apiClient, effectivePath);

    // Start watching for changes
    apiClient.startWatching(effectivePath);

    // Cleanup: stop watching on unmount
    return () => {
      apiClient.stopWatching(effectivePath);
    };
  }, [apiClient, effectivePath, refreshStatus]);

  // Subscribe to git:changes-detected events via tRPC Subscription (Electron only)
  // trpc-full-migration Task 11.4: Migrated from window.electronAPI to tRPC vanilla client
  useEffect(() => {
    // Only subscribe in Electron environment (electronTRPC is set by exposeElectronTRPC)
    if (typeof window === 'undefined' || !('electronTRPC' in window)) {
      return;
    }

    const client = getVanillaClient();
    const sub = client.events.onGitChangesDetected.subscribe(undefined, {
      onData: (data: { projectPath?: string }) => {
        // Only refresh if the change is for our project
        if (data.projectPath === effectivePath) {
          refreshStatus(apiClient, effectivePath);
        }
      },
    });

    return () => {
      sub.unsubscribe();
    };
  }, [apiClient, effectivePath, refreshStatus]);

  // Handle file tree resize
  const handleResize = useCallback((delta: number) => {
    setFileTreeWidth(fileTreeWidth + delta);
  }, [fileTreeWidth, setFileTreeWidth]);

  // Handle resize end (for saving layout)
  const handleResizeEnd = useCallback(() => {
    // Layout persistence can be added here if needed
  }, []);

  // Show loading indicator
  if (isLoading && !cachedStatus) {
    return (
      <div className="h-full flex items-center justify-center" data-testid="loading-indicator">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-400">Git status を取得中...</span>
      </div>
    );
  }

  // Show error message
  if (error && !cachedStatus) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center text-gray-400"
        data-testid="error-message"
      >
        <span className="text-red-500">{error}</span>
        <button
          onClick={() => {
            clearError();
            refreshStatus(apiClient, effectivePath);
          }}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          再試行
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" data-testid="git-view-container">
      {/* git-view-source-mode Task 8.1: 3-button diff mode toggle */}
      {showDiffModeToggle && (
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end">
          <ViewModeToggle
            diffMode={diffMode}
            onDiffModeChange={setDiffMode}
          />
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: GitFileTree - independent scrolling */}
        <div
          style={{ width: fileTreeWidth }}
          className="h-full shrink-0 overflow-auto border-r border-gray-200 dark:border-gray-700"
          data-testid="git-file-tree"
        >
          <GitFileTree workingPath={effectivePath} />
        </div>

        {/* Resize handle */}
        <ResizeHandle
          direction="horizontal"
          onResize={handleResize}
          onResizeEnd={handleResizeEnd}
        />

        {/* Right: Content viewer - switches between diff and source based on diffMode */}
        <div
          className="h-full flex-1 overflow-auto"
          data-testid={diffMode === 'source' ? 'git-source-viewer' : 'git-diff-viewer'}
        >
          {diffMode === 'source' ? (
            <SourceContentViewer
              fileContent={cachedFileContent}
              filePath={selectedFilePath}
              isLoading={isLoading}
              error={error}
            />
          ) : (
            <GitDiffViewer />
          )}
        </div>
      </div>
    </div>
  );
}

export default GitView;
