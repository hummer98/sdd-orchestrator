/**
 * GitView Store (Shared)
 * Manages GitView UI state (selected file, tree expansion, diff mode, resize position)
 * Requirements: 4.1, 4.2, 10.3, 10.4
 *
 * git-view-source-mode: Extended with viewMode support
 * Requirements: 1.1, 1.2, 2.1, 5.1, 5.2
 *
 * Design: UI State store following structure.md principles
 * - GitView-related UI state only (not Domain State)
 * - Git diff data cached from Main Process (MainからのResult受信後に保持)
 * - Shared between Electron and Remote UI
 *
 * This store is shared to enable Remote UI to use the same Git components.
 */

import { create } from 'zustand';
import type { ApiClient, GitStatusResult, GitFileStatus, FileContentResult } from '@shared/api/types';

/**
 * git-view-source-mode Task 5.1: Extended diff mode type
 * Requirements: 2.4 (diffMode状態管理)
 * Original: 'unified' | 'split'
 * Extended: 'unified' | 'split' | 'source'
 */
export type GitViewDiffMode = 'unified' | 'split' | 'source';

/**
 * For backward compatibility - alias to GitViewDiffMode
 * @deprecated Use GitViewDiffMode instead
 */
export type GitViewViewMode = 'diff' | 'source';

/**
 * Extract all directory paths from file list
 * Used to expand all directories by default
 */
function extractDirectoryPaths(files: GitFileStatus[]): string[] {
  const dirs = new Set<string>();
  for (const file of files) {
    const parts = file.path.split('/');
    let currentPath = '';
    // Skip the last part (file name)
    for (let i = 0; i < parts.length - 1; i++) {
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
      dirs.add(currentPath);
    }
  }
  return Array.from(dirs);
}

interface GitViewState {
  /** Selected file path */
  selectedFilePath: string | null;
  /** File tree expansion state (Map<dirPath, boolean>) */
  expandedDirs: Map<string, boolean>;
  /**
   * Diff display mode: 'unified' | 'split' | 'source'
   * git-view-source-mode Task 5.1: Extended with 'source' option
   * Requirements: 2.4
   */
  diffMode: GitViewDiffMode;
  /** Resize handle position (file tree width, px) */
  fileTreeWidth: number;
  /** Cache: git status result */
  cachedStatus: GitStatusResult | null;
  /** Cache: selected file diff content */
  cachedDiffContent: string | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;

  // git-view-source-mode: Extended state for source mode
  /** Cache: selected file content (for source mode) */
  cachedFileContent: FileContentResult | null;
  /** Image zoom level (for source mode image display) */
  imageZoom: number;
}

interface GitViewActions {
  /** Select file and fetch diff/content based on diffMode */
  selectFile: (apiClient: ApiClient, filePath: string, projectPath?: string) => Promise<void>;
  /** Toggle directory expansion/collapse */
  toggleDir: (dirPath: string) => void;
  /**
   * Set diff display mode
   * git-view-source-mode Task 5.1: Extended to accept 'source' mode
   * Requirements: 2.4
   */
  setDiffMode: (mode: GitViewDiffMode) => void;
  /** Update file tree width */
  setFileTreeWidth: (width: number) => void;
  /** Fetch git status and cache */
  refreshStatus: (apiClient: ApiClient, projectPath?: string) => Promise<void>;
  /** Clear error message */
  clearError: () => void;
  /** Reset store to initial state */
  reset: () => void;

  // git-view-source-mode: Extended actions
  /** Set image zoom level */
  setImageZoom: (zoom: number) => void;
}

type GitViewStore = GitViewState & GitViewActions;

const initialState: GitViewState = {
  selectedFilePath: null,
  expandedDirs: new Map(),
  diffMode: 'unified',
  fileTreeWidth: 300, // Default width
  cachedStatus: null,
  cachedDiffContent: null,
  isLoading: false,
  error: null,

  // git-view-source-mode: Extended initial state
  cachedFileContent: null,
  imageZoom: 1,
};

export const useSharedGitViewStore = create<GitViewStore>((set, get) => ({
  // Initial state
  ...initialState,

  // Actions
  selectFile: async (apiClient: ApiClient, filePath: string, overrideProjectPath?: string) => {
    const { diffMode } = get();
    set({ selectedFilePath: filePath, isLoading: true, error: null });

    try {
      // Get project path (use override or fallback to apiClient)
      const projectPath = overrideProjectPath ?? apiClient.getProjectPath?.() ?? '';

      // git-view-source-mode: Fetch based on diffMode
      if (diffMode === 'source') {
        // Source mode: fetch file content
        if (!apiClient.readFileContent) {
          set({
            cachedFileContent: null,
            error: 'ファイル内容の取得はサポートされていません',
            isLoading: false,
          });
          return;
        }

        const result = await apiClient.readFileContent(projectPath, filePath);

        if (result.ok) {
          set({
            cachedFileContent: result.value,
            isLoading: false,
          });
        } else {
          set({
            cachedFileContent: null,
            error: result.error.message,
            isLoading: false,
          });
        }
      } else {
        // Unified/Split diff mode: fetch diff content
        const result = await apiClient.getGitDiff(projectPath, filePath);

        if (result.ok) {
          set({
            cachedDiffContent: result.value,
            isLoading: false,
          });
        } else {
          set({
            cachedDiffContent: null,
            error: result.error.message,
            isLoading: false,
          });
        }
      }
    } catch (error) {
      set({
        cachedDiffContent: null,
        cachedFileContent: null,
        error: error instanceof Error ? error.message : 'データの取得に失敗しました',
        isLoading: false,
      });
    }
  },

  toggleDir: (dirPath: string) => {
    const { expandedDirs } = get();
    const newExpandedDirs = new Map(expandedDirs);
    const currentState = newExpandedDirs.get(dirPath);
    newExpandedDirs.set(dirPath, !currentState);
    set({ expandedDirs: newExpandedDirs });
  },

  setDiffMode: (mode: GitViewDiffMode) => {
    set({ diffMode: mode });
  },

  setFileTreeWidth: (width: number) => {
    set({ fileTreeWidth: width });
  },

  refreshStatus: async (apiClient: ApiClient, overrideProjectPath?: string) => {
    set({ isLoading: true, error: null });

    try {
      // Get project path (use override or fallback to apiClient)
      const projectPath = overrideProjectPath ?? apiClient.getProjectPath?.() ?? '';

      // Fetch git status via ApiClient
      const result = await apiClient.getGitStatus(projectPath);

      if (result.ok) {
        const newStatus = result.value;
        const { selectedFilePath, expandedDirs } = get();

        // Validate selected file still exists in new status
        const fileExists = newStatus.files.some(file => file.path === selectedFilePath);

        // Expand all directories by default (only if expandedDirs is empty)
        let newExpandedDirs = expandedDirs;
        if (expandedDirs.size === 0 && newStatus.files.length > 0) {
          newExpandedDirs = new Map<string, boolean>();
          for (const dirPath of extractDirectoryPaths(newStatus.files)) {
            newExpandedDirs.set(dirPath, true);
          }
        }

        set({
          cachedStatus: newStatus,
          expandedDirs: newExpandedDirs,
          isLoading: false,
          // Clear selected file and diff if it no longer exists
          ...(selectedFilePath && !fileExists
            ? { selectedFilePath: null, cachedDiffContent: null }
            : {}),
        });
      } else {
        set({
          cachedStatus: null,
          error: result.error.message,
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        cachedStatus: null,
        error: error instanceof Error ? error.message : 'ステータスの取得に失敗しました',
        isLoading: false,
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set(initialState);
  },

  // git-view-source-mode: Extended actions
  setImageZoom: (zoom: number) => {
    set({ imageZoom: zoom });
  },
}));

/**
 * Reset the store to its initial state
 * Useful for testing and cleanup
 */
export function resetSharedGitViewStore(): void {
  useSharedGitViewStore.getState().reset();
}

/**
 * Get store instance for direct access
 * Useful for testing and MCP debugging
 */
export function getSharedGitViewStore() {
  return useSharedGitViewStore;
}
