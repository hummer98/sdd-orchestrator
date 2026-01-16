/**
 * Bug Store
 * Manages bug list and detail state
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 *
 * Bug fix: spec-agent-list-not-updating-on-auto-execution
 * - Removed module-scope currentProjectPath variable (SSOT violation)
 * - refreshBugs() now gets project path from projectStore.currentProject (SSOT)
 * - Aligned with specStore design pattern
 *
 * Bug fix: bugs-workflow-progress-not-updating
 * - handleBugsChanged() is now async and awaits updateBugByName/refreshSelectedBugDetail
 * - Ensures sequential execution: metadata update completes before detail refresh
 * - Prevents race conditions when bug-fix agent creates/updates files
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
  // bugs-worktree-support Task 10.1: worktree使用フラグ (Requirements: 8.4)
  // グローバルに1つ保持し、CreateBugDialog/BugWorkflowViewで共有
  useWorktree: boolean;
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
  // Unified project selection support (unified-project-selection feature)
  // Requirements: 3.2
  /**
   * Set bugs directly from IPC result
   * Used by projectStore.selectProject to update bugs without re-fetching
   */
  setBugs: (bugs: BugMetadata[]) => void;
  // Bug fix: bugstore-refresh-to-filewatch
  // Event-based differential update methods
  /**
   * Update metadata for a specific bug by name
   * Fetches updated metadata from main process
   */
  updateBugByName: (bugName: string) => Promise<void>;
  /**
   * Refresh only the selected bug's detail without full list refresh
   */
  refreshSelectedBugDetail: () => Promise<void>;
  /**
   * Handle bugs change event with differential update
   * Routes to appropriate handler based on event type
   * Returns Promise to ensure async operations complete before caller proceeds
   */
  handleBugsChanged: (event: BugsChangeEvent) => Promise<void>;
  // bugs-worktree-support Task 10.1: worktree使用フラグ操作 (Requirements: 8.4)
  /**
   * Set worktree使用フラグ
   * @param value - true: worktreeを使用, false: 使用しない
   */
  setUseWorktree: (value: boolean) => void;
  /**
   * Initialize useWorktree from project default setting
   * @param defaultValue - プロジェクト設定のデフォルト値
   */
  initializeUseWorktree: (defaultValue: boolean) => void;
}

type BugStore = BugState & BugActions;

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
  // bugs-worktree-support Task 10.1: worktree使用フラグ (Requirements: 8.4)
  useWorktree: false,

  // Actions
  loadBugs: async (projectPath: string) => {
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

  // ============================================================
  // Unified Project Selection Support (unified-project-selection feature)
  // Requirements: 3.2
  // ============================================================

  /**
   * Set bugs directly from IPC result
   * Used by projectStore.selectProject to update bugs without re-fetching
   */
  setBugs: (bugs: BugMetadata[]) => {
    set({ bugs, isLoading: false, error: null });
  },

  selectBug: async (bug: BugMetadata, options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;

    if (!silent) {
      set({ selectedBug: bug, isLoading: true, error: null });
    }

    try {
      // Bug fix: bugs-agent-list-not-updating
      // Switch agent watcher scope to this bug's specId for real-time updates
      // Bug fix: switchAgentWatchScope expects specId format (bug:{name}), not full path
      await window.electronAPI.switchAgentWatchScope(`bug:${bug.name}`);

      // Bug fix: agent-log-auto-select-rule
      // Auto-select running agent for this bug (consistent with specDetailStore behavior)
      const { useSharedAgentStore } = await import('../../shared/stores/agentStore');
      useSharedAgentStore.getState().autoSelectAgentForSpec(`bug:${bug.name}`);
      console.log('[bugStore] Auto-selected agent for bug:', bug.name);

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
    // SSOT: Get project path from projectStore (aligned with specStore pattern)
    // Bug fix: spec-agent-list-not-updating-on-auto-execution
    const { useProjectStore } = await import('./projectStore');
    const currentProject = useProjectStore.getState().currentProject;

    if (currentProject) {
      try {
        const bugs = await window.electronAPI.readBugs(currentProject);
        set({ bugs });

        // Task 1.2: bugs-pane-integration - Bug削除時の選択状態整合性チェック
        // Requirements: 5.4
        // Also refresh selected bug detail if one is selected
        const { selectedBug } = get();
        if (selectedBug) {
          // Find updated metadata for the selected bug
          const updatedBug = bugs.find((b) => b.path === selectedBug.path);
          if (updatedBug) {
            // Re-select to refresh detail pane (silent mode for smoother UX)
            await get().selectBug(updatedBug, { silent: true });
          } else {
            // 選択中のBugが削除された場合は選択状態を解除
            get().clearSelectedBug();
          }
        }
      } catch (error) {
        console.error('Failed to refresh bugs:', error);
      }
    }
  },

  startWatching: async () => {
    // Clean up existing listener if any
    if (watcherCleanup) {
      watcherCleanup();
      watcherCleanup = null;
    }

    try {
      // Note: Watcher is now started by Main process in SELECT_PROJECT IPC handler
      // (unified-project-selection Task 1.4)
      // Here we only register the event listener

      // Subscribe to change events
      // Bug fix: bugstore-refresh-to-filewatch
      // Use event-based differential update instead of full refresh
      watcherCleanup = window.electronAPI.onBugsChanged((event: BugsChangeEvent) => {
        console.log('[bugStore] Bugs changed:', event);
        get().handleBugsChanged(event);
      });

      set({ isWatching: true });
      console.log('[bugStore] Bugs change listener registered');
    } catch (error) {
      console.error('[bugStore] Failed to register bugs change listener:', error);
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

  // ============================================================
  // Bug fix: bugstore-refresh-to-filewatch
  // Event-based differential update methods
  // ============================================================

  updateBugByName: async (bugName: string) => {
    // SSOT: Get project path from projectStore
    const { useProjectStore } = await import('./projectStore');
    const currentProject = useProjectStore.getState().currentProject;

    if (!currentProject) {
      console.warn('[bugStore] No current project, skipping updateBugByName');
      return;
    }

    try {
      // Fetch all bugs and find the updated one
      const allBugs = await window.electronAPI.readBugs(currentProject);
      const updatedBug = allBugs.find((b) => b.name === bugName);

      if (updatedBug) {
        // Update the bug in the list (or add if new)
        const { bugs } = get();
        const existingIndex = bugs.findIndex((b) => b.name === bugName);

        if (existingIndex >= 0) {
          // Update existing bug
          const newBugs = [...bugs];
          newBugs[existingIndex] = updatedBug;
          set({ bugs: newBugs });
          console.log('[bugStore] Updated bug metadata:', bugName);
        } else {
          // Add new bug
          set({ bugs: [...bugs, updatedBug] });
          console.log('[bugStore] Added new bug:', bugName);
        }
      }
    } catch (error) {
      console.error('[bugStore] Failed to update bug by name:', bugName, error);
    }
  },

  refreshSelectedBugDetail: async () => {
    const { selectedBug } = get();

    if (!selectedBug) {
      return;
    }

    try {
      const bugDetail = await window.electronAPI.readBugDetail(selectedBug.path);
      set({ bugDetail });
      console.log('[bugStore] Refreshed selected bug detail:', selectedBug.name);
    } catch (error) {
      console.error('[bugStore] Failed to refresh selected bug detail:', error);
    }
  },

  handleBugsChanged: async (event: BugsChangeEvent) => {
    const { type, bugName } = event;
    const { selectedBug } = get();

    console.log('[bugStore] Handling bugs change event:', { type, bugName, selectedBugName: selectedBug?.name });

    switch (type) {
      case 'add':
      case 'addDir':
        // New bug added - update the bug in list
        if (bugName) {
          await get().updateBugByName(bugName);
        }
        break;

      case 'change':
        // Bug file changed - update metadata and possibly detail
        if (bugName) {
          await get().updateBugByName(bugName);
          // If the changed bug is currently selected, refresh its detail
          if (selectedBug?.name === bugName) {
            await get().refreshSelectedBugDetail();
          }
        }
        break;

      case 'unlink':
        // File deleted - might be a file within bug folder, update metadata
        if (bugName) {
          const { bugs } = get();
          const bugExists = bugs.some((b) => b.name === bugName);
          if (bugExists) {
            // Bug folder still exists, just update metadata
            await get().updateBugByName(bugName);
            // If selected bug was affected, refresh detail
            if (selectedBug?.name === bugName) {
              await get().refreshSelectedBugDetail();
            }
          }
        }
        break;

      case 'unlinkDir':
        // Directory deleted - remove bug from list if it's the bug folder itself
        if (bugName) {
          const { bugs } = get();
          const updatedBugs = bugs.filter((b) => b.name !== bugName);

          if (updatedBugs.length !== bugs.length) {
            set({ bugs: updatedBugs });
            console.log('[bugStore] Removed bug from list:', bugName);

            // Clear selection if the deleted bug was selected
            if (selectedBug?.name === bugName) {
              get().clearSelectedBug();
              console.log('[bugStore] Cleared selected bug (deleted):', bugName);
            }
          }
        }
        break;
    }
  },

  // ============================================================
  // bugs-worktree-support Task 10.1: worktree使用フラグ操作
  // Requirements: 8.4
  // ============================================================

  setUseWorktree: (value: boolean) => {
    set({ useWorktree: value });
    console.log('[bugStore] setUseWorktree:', value);
  },

  initializeUseWorktree: (defaultValue: boolean) => {
    set({ useWorktree: defaultValue });
    console.log('[bugStore] initializeUseWorktree:', defaultValue);
  },
}));
