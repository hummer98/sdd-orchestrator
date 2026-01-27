/**
 * GitView Component
 * Main UI component for git diff viewer (2-column layout)
 * Requirements: 6.1, 6.2, 6.3, 6.4, 10.3, 10.4
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
import { ResizeHandle } from '@shared/components/ui/ResizeHandle';

/**
 * GitView - Main component for displaying git diffs
 *
 * Layout:
 * - Left: GitFileTree (resizable width from gitViewStore.fileTreeWidth)
 * - Right: GitDiffViewer (remaining space)
 *
 * Lifecycle:
 * - On mount: Fetch initial git status and start file watching
 * - On unmount: Stop file watching
 * - On file change event: Refresh status
 */
export function GitView(): React.ReactElement {
  const apiClient = useApi();
  const {
    isLoading,
    error,
    cachedStatus,
    fileTreeWidth,
    setFileTreeWidth,
    refreshStatus,
    clearError,
  } = useSharedGitViewStore();

  // Get project path from apiClient
  const projectPath = useMemo(() => {
    return apiClient.getProjectPath?.() ?? '';
  }, [apiClient]);

  // Initial load: fetch git status and start watching
  useEffect(() => {
    // Fetch initial status
    refreshStatus(apiClient, projectPath);

    // Start watching for changes
    apiClient.startWatching(projectPath);

    // Cleanup: stop watching on unmount
    return () => {
      apiClient.stopWatching(projectPath);
    };
  }, [apiClient, projectPath, refreshStatus]);

  // Subscribe to git:changes-detected events from Electron main process
  useEffect(() => {
    // In Electron environment, listen for file change events
    if (typeof window !== 'undefined' && window.electronAPI?.onGitChangesDetected) {
      const unsubscribe = window.electronAPI.onGitChangesDetected(
        (_event: unknown, data: { projectPath: string }) => {
          // Only refresh if the change is for our project
          if (data.projectPath === projectPath) {
            refreshStatus(apiClient, projectPath);
          }
        }
      );

      return () => {
        unsubscribe?.();
      };
    }
  }, [apiClient, projectPath, refreshStatus]);

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
      <div className="flex-1 flex items-center justify-center" data-testid="loading-indicator">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-400">Git status を取得中...</span>
      </div>
    );
  }

  // Show error message
  if (error && !cachedStatus) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center text-gray-400"
        data-testid="error-message"
      >
        <span className="text-red-500">{error}</span>
        <button
          onClick={() => {
            clearError();
            refreshStatus(apiClient, projectPath);
          }}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          再試行
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: GitFileTree */}
      <div
        style={{ width: fileTreeWidth }}
        className="shrink-0 overflow-hidden border-r border-gray-200 dark:border-gray-700"
        data-testid="git-file-tree"
      >
        <GitFileTree />
      </div>

      {/* Resize handle */}
      <ResizeHandle
        direction="horizontal"
        onResize={handleResize}
        onResizeEnd={handleResizeEnd}
      />

      {/* Right: GitDiffViewer */}
      <div
        className="flex-1 overflow-hidden"
        data-testid="git-diff-viewer"
      >
        <GitDiffViewer />
      </div>
    </div>
  );
}

export default GitView;
