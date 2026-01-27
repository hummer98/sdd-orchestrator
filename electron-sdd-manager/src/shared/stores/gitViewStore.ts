/**
 * GitView Store (Shared)
 * Manages GitView UI state (selected file, tree expansion, diff mode, resize position)
 * Requirements: 4.1, 4.2, 10.3, 10.4
 *
 * Design: UI State store following structure.md principles
 * - GitView-related UI state only (not Domain State)
 * - Git diff data cached from Main Process (MainからのResult受信後に保持)
 * - Shared between Electron and Remote UI
 *
 * This store is shared to enable Remote UI to use the same Git components.
 */

import { create } from 'zustand';
import type { ApiClient, GitStatusResult } from '@shared/api/types';

interface GitViewState {
  /** Selected file path */
  selectedFilePath: string | null;
  /** File tree expansion state (Map<dirPath, boolean>) */
  expandedDirs: Map<string, boolean>;
  /** Diff display mode: 'unified' | 'split' */
  diffMode: 'unified' | 'split';
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
}

interface GitViewActions {
  /** Select file and fetch diff content */
  selectFile: (apiClient: ApiClient, filePath: string) => Promise<void>;
  /** Toggle directory expansion/collapse */
  toggleDir: (dirPath: string) => void;
  /** Set diff display mode */
  setDiffMode: (mode: 'unified' | 'split') => void;
  /** Update file tree width */
  setFileTreeWidth: (width: number) => void;
  /** Fetch git status and cache */
  refreshStatus: (apiClient: ApiClient, projectPath?: string) => Promise<void>;
  /** Clear error message */
  clearError: () => void;
  /** Reset store to initial state */
  reset: () => void;
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
};

export const useSharedGitViewStore = create<GitViewStore>((set, get) => ({
  // Initial state
  ...initialState,

  // Actions
  selectFile: async (apiClient: ApiClient, filePath: string) => {
    set({ selectedFilePath: filePath, isLoading: true, error: null });

    try {
      // Get project path (use empty string for current project)
      const projectPath = apiClient.getProjectPath?.() || '';

      // Fetch diff content via ApiClient
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
    } catch (error) {
      set({
        cachedDiffContent: null,
        error: error instanceof Error ? error.message : '差分の取得に失敗しました',
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

  setDiffMode: (mode: 'unified' | 'split') => {
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
        const { selectedFilePath } = get();

        // Validate selected file still exists in new status
        const fileExists = newStatus.files.some(file => file.path === selectedFilePath);

        set({
          cachedStatus: newStatus,
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
