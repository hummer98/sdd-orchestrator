/**
 * Bug Store
 * Manages bug list and detail state
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { create } from 'zustand';
import type { BugMetadata, BugDetail, BugPhase, BugsChangeEvent } from '../types';

interface BugState {
  bugs: BugMetadata[];
  selectedBug: BugMetadata | null;
  bugDetail: BugDetail | null;
  isLoading: boolean;
  error: string | null;
  isWatching: boolean;
}

interface BugActions {
  loadBugs: (projectPath: string) => Promise<void>;
  selectBug: (bug: BugMetadata, options?: { silent?: boolean }) => Promise<void>;
  clearSelectedBug: () => void;
  refreshBugs: () => Promise<void>;
  startWatching: () => Promise<void>;
  stopWatching: () => Promise<void>;
  /**
   * Get filtered and sorted bugs
   * Currently returns bugs sorted by updatedAt descending
   */
  getSortedBugs: () => BugMetadata[];
  /**
   * Get bugs filtered by phase
   * @param phase - Phase to filter by, or 'all' for all bugs
   */
  getBugsByPhase: (phase: BugPhase | 'all') => BugMetadata[];
}

type BugStore = BugState & BugActions;

// Store the current project path for refresh
let currentProjectPath: string | null = null;

// Cleanup function for bugs watcher
let watcherCleanup: (() => void) | null = null;

export const useBugStore = create<BugStore>((set, get) => ({
  // Initial state
  bugs: [],
  selectedBug: null,
  bugDetail: null,
  isLoading: false,
  error: null,
  isWatching: false,

  // Actions
  loadBugs: async (projectPath: string) => {
    currentProjectPath = projectPath;
    set({ isLoading: true, error: null });

    try {
      const bugs = await window.electronAPI.readBugs(projectPath);
      set({ bugs, isLoading: false });

      // Start watching for changes automatically
      await get().startWatching();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'バグの読み込みに失敗しました',
        isLoading: false,
      });
    }
  },

  selectBug: async (bug: BugMetadata, options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;

    if (!silent) {
      set({ selectedBug: bug, isLoading: true, error: null });
    }

    try {
      const bugDetail = await window.electronAPI.readBugDetail(bug.path);

      if (silent) {
        set({ selectedBug: bug, bugDetail });
      } else {
        set({ bugDetail, isLoading: false });
      }
    } catch (error) {
      if (!silent) {
        set({
          error: error instanceof Error ? error.message : 'バグ詳細の読み込みに失敗しました',
          isLoading: false,
        });
      } else {
        console.error('Failed to refresh bug detail:', error);
      }
    }
  },

  clearSelectedBug: () => {
    set({ selectedBug: null, bugDetail: null });
  },

  refreshBugs: async () => {
    if (currentProjectPath) {
      try {
        const bugs = await window.electronAPI.readBugs(currentProjectPath);
        set({ bugs });

        // Also refresh selected bug detail if one is selected
        const { selectedBug } = get();
        if (selectedBug) {
          // Find updated metadata for the selected bug
          const updatedBug = bugs.find((b) => b.path === selectedBug.path);
          if (updatedBug) {
            // Re-select to refresh detail pane (silent mode for smoother UX)
            await get().selectBug(updatedBug, { silent: true });
          }
        }
      } catch (error) {
        console.error('Failed to refresh bugs:', error);
      }
    }
  },

  startWatching: async () => {
    // Clean up existing watcher if any
    if (watcherCleanup) {
      watcherCleanup();
      watcherCleanup = null;
    }

    try {
      // Start watcher on main process
      await window.electronAPI.startBugsWatcher();

      // Subscribe to change events
      watcherCleanup = window.electronAPI.onBugsChanged((event: BugsChangeEvent) => {
        console.log('[bugStore] Bugs changed:', event);
        // Refresh bugs list on any change
        get().refreshBugs();
      });

      set({ isWatching: true });
      console.log('[bugStore] Bugs watcher started');
    } catch (error) {
      console.error('[bugStore] Failed to start bugs watcher:', error);
    }
  },

  stopWatching: async () => {
    if (watcherCleanup) {
      watcherCleanup();
      watcherCleanup = null;
    }

    try {
      await window.electronAPI.stopBugsWatcher();
      set({ isWatching: false });
      console.log('[bugStore] Bugs watcher stopped');
    } catch (error) {
      console.error('[bugStore] Failed to stop bugs watcher:', error);
    }
  },

  getSortedBugs: () => {
    const { bugs } = get();
    // Sort by updatedAt descending (most recent first)
    return [...bugs].sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  getBugsByPhase: (phase: BugPhase | 'all') => {
    const { bugs } = get();
    if (phase === 'all') {
      return bugs;
    }
    return bugs.filter((bug) => bug.phase === phase);
  },
}));
