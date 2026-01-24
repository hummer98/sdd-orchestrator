/**
 * Shared bugStore
 *
 * Task 5.2: 共有bugStoreを実装する
 * bugs-view-unification: Task 2.1, 2.2, 2.3 - Extended with bugDetail, handleBugsChanged, watching
 *
 * IPC依存を除去し、ApiClient経由でデータを取得する共有ストア。
 * Electron版とRemote UI版で同一storeを使用可能。
 */

import { create } from 'zustand';
import type { ApiClient, BugMetadata, BugDetail, BugsChangeEvent } from '../api/types';

// =============================================================================
// Types
// =============================================================================

export interface SharedBugState {
  /** Bug一覧 */
  bugs: BugMetadata[];
  /** 選択中のBug ID（名前） */
  selectedBugId: string | null;
  /** 選択中Bugの詳細 (bugs-view-unification Task 2.1) */
  bugDetail: BugDetail | null;
  /** 読み込み中フラグ */
  isLoading: boolean;
  /** エラーメッセージ */
  error: string | null;
  /**
   * Worktreeモードで実行するかどうか
   * Requirements: 5.3 (remote-ui-bug-advanced-features Task 3.1)
   */
  useWorktree: boolean;
  /** Bug作成中フラグ */
  isCreating: boolean;
  /** ファイル監視中フラグ (bugs-view-unification Task 2.3) */
  isWatching: boolean;
}

export interface SharedBugActions {
  /** ApiClient経由でbugsを読み込む */
  loadBugs: (apiClient: ApiClient) => Promise<void>;
  /**
   * Bugを選択し詳細を取得する (bugs-view-unification Task 2.1)
   * @param apiClient - ApiClient instance
   * @param bugId - Bug ID (name) or null to clear selection
   * Requirements: 3.1, 3.2, 3.8
   */
  selectBug: (apiClient: ApiClient, bugId: string | null) => Promise<void>;
  /** IDでBugを取得する */
  getBugById: (bugId: string) => BugMetadata | undefined;
  /** Bugs配列を更新する（イベント購読用） */
  updateBugs: (bugs: BugMetadata[]) => void;
  /** エラーをクリアする */
  clearError: () => void;
  /**
   * Worktreeモード設定を更新
   * Requirements: 5.3 (remote-ui-bug-advanced-features Task 3.1)
   */
  setUseWorktree: (useWorktree: boolean) => void;
  /**
   * ApiClient経由でBugを作成
   * Requirements: 5.3 (remote-ui-bug-advanced-features Task 3.1)
   */
  createBug: (apiClient: ApiClient, name: string, description: string) => Promise<boolean>;
  /**
   * 選択解除 (bugs-view-unification Task 2.1)
   */
  clearSelectedBug: () => void;
  /**
   * 選択中Bugの詳細を再取得する (bugs-view-unification Task 2.1)
   * Requirements: 3.2
   */
  refreshBugDetail: (apiClient: ApiClient) => Promise<void>;
  /**
   * Bug変更イベントを処理する（差分更新）(bugs-view-unification Task 2.2)
   * Requirements: 3.3, 3.4, 3.5, 3.6
   */
  handleBugsChanged: (apiClient: ApiClient, event: BugsChangeEvent) => Promise<void>;
  /**
   * ファイル監視を開始する (bugs-view-unification Task 2.3)
   * Requirements: 3.7
   */
  startWatching: (apiClient: ApiClient) => void;
  /**
   * ファイル監視を停止する (bugs-view-unification Task 2.3)
   * Requirements: 3.7
   */
  stopWatching: (apiClient: ApiClient) => void;
}

export type SharedBugStore = SharedBugState & SharedBugActions;

// =============================================================================
// Store
// =============================================================================

// Cleanup function for bugs watcher subscription
let watcherUnsubscribe: (() => void) | null = null;

export const useSharedBugStore = create<SharedBugStore>((set, get) => ({
  // Initial state
  bugs: [],
  selectedBugId: null,
  bugDetail: null,
  isLoading: false,
  error: null,
  useWorktree: false,
  isCreating: false,
  isWatching: false,

  // Actions
  loadBugs: async (apiClient: ApiClient) => {
    set({ isLoading: true, error: null });

    const result = await apiClient.getBugs();

    if (result.ok) {
      set({ bugs: result.value, isLoading: false });
    } else {
      set({ error: result.error.message, isLoading: false });
    }
  },

  // bugs-view-unification Task 2.1: selectBug with bugDetail fetch
  // Requirements: 3.1, 3.2, 3.8
  selectBug: async (apiClient: ApiClient, bugId: string | null) => {
    // Handle null selection
    if (bugId === null) {
      set({ selectedBugId: null, bugDetail: null });
      return;
    }

    set({ selectedBugId: bugId, isLoading: true, error: null });

    try {
      // Switch agent watch scope (Requirements: 3.8)
      await apiClient.switchAgentWatchScope(`bug:${bugId}`);

      // Fetch bug detail (Requirements: 3.1, 3.2)
      const result = await apiClient.getBugDetail(bugId);

      if (result.ok) {
        set({ bugDetail: result.value, isLoading: false });
      } else {
        set({ error: result.error.message, bugDetail: null, isLoading: false });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load bug detail',
        bugDetail: null,
        isLoading: false,
      });
    }
  },

  getBugById: (bugId: string) => {
    return get().bugs.find((bug) => bug.name === bugId);
  },

  updateBugs: (bugs: BugMetadata[]) => {
    set({ bugs });
  },

  clearError: () => {
    set({ error: null });
  },

  setUseWorktree: (useWorktree: boolean) => {
    set({ useWorktree });
  },

  createBug: async (apiClient: ApiClient, name: string, description: string) => {
    set({ isCreating: true, error: null });

    // Check if createBug is available on the ApiClient
    if (!apiClient.createBug) {
      set({ error: 'Bug creation not supported', isCreating: false });
      return false;
    }

    const result = await apiClient.createBug(name, description);

    if (result.ok) {
      set({ isCreating: false });
      // Bug list will be updated via onBugsUpdated event subscription
      return true;
    } else {
      set({ error: result.error.message, isCreating: false });
      return false;
    }
  },

  // bugs-view-unification Task 2.1: clearSelectedBug
  clearSelectedBug: () => {
    set({ selectedBugId: null, bugDetail: null });
  },

  // bugs-view-unification Task 2.1: refreshBugDetail
  // Requirements: 3.2
  refreshBugDetail: async (apiClient: ApiClient) => {
    const { selectedBugId } = get();

    if (!selectedBugId) {
      return;
    }

    try {
      const result = await apiClient.getBugDetail(selectedBugId);

      if (result.ok) {
        set({ bugDetail: result.value });
      }
    } catch (error) {
      console.error('[useSharedBugStore] Failed to refresh bug detail:', error);
    }
  },

  // bugs-view-unification Task 2.2: handleBugsChanged
  // Requirements: 3.3, 3.4, 3.5, 3.6
  handleBugsChanged: async (apiClient: ApiClient, event: BugsChangeEvent) => {
    const { type, bugName } = event;
    const { selectedBugId, bugs } = get();

    console.log('[useSharedBugStore] Handling bugs change event:', { type, bugName, selectedBugId });

    switch (type) {
      case 'add':
      case 'addDir':
        // New bug added - refresh bug list (Requirements: 3.4)
        if (bugName) {
          const result = await apiClient.getBugs();
          if (result.ok) {
            set({ bugs: result.value });
          }
        }
        break;

      case 'change':
        // Bug file changed - update metadata and possibly detail (Requirements: 3.5)
        if (bugName) {
          const result = await apiClient.getBugs();
          if (result.ok) {
            set({ bugs: result.value });
          }
          // If the changed bug is currently selected, refresh its detail
          if (selectedBugId === bugName) {
            await get().refreshBugDetail(apiClient);
          }
        }
        break;

      case 'unlink':
        // File deleted - might be a file within bug folder, update metadata
        if (bugName) {
          const bugExists = bugs.some((b) => b.name === bugName);
          if (bugExists) {
            const result = await apiClient.getBugs();
            if (result.ok) {
              set({ bugs: result.value });
            }
            // If selected bug was affected, refresh detail
            if (selectedBugId === bugName) {
              await get().refreshBugDetail(apiClient);
            }
          }
        }
        break;

      case 'unlinkDir':
        // Directory deleted - remove bug from list (Requirements: 3.6)
        if (bugName) {
          const updatedBugs = bugs.filter((b) => b.name !== bugName);

          if (updatedBugs.length !== bugs.length) {
            set({ bugs: updatedBugs });
            console.log('[useSharedBugStore] Removed bug from list:', bugName);

            // Clear selection if the deleted bug was selected
            if (selectedBugId === bugName) {
              get().clearSelectedBug();
              console.log('[useSharedBugStore] Cleared selected bug (deleted):', bugName);
            }
          }
        }
        break;
    }
  },

  // bugs-view-unification Task 2.3: startWatching
  // Requirements: 3.7
  startWatching: (apiClient: ApiClient) => {
    // Clean up existing subscription
    if (watcherUnsubscribe) {
      watcherUnsubscribe();
      watcherUnsubscribe = null;
    }

    // Start bugs watcher
    apiClient.startBugsWatcher();

    // Subscribe to bug change events
    watcherUnsubscribe = apiClient.onBugsChanged((event: BugsChangeEvent) => {
      console.log('[useSharedBugStore] Bugs changed:', event);
      get().handleBugsChanged(apiClient, event);
    });

    set({ isWatching: true });
    console.log('[useSharedBugStore] Bugs watcher started');
  },

  // bugs-view-unification Task 2.3: stopWatching
  // Requirements: 3.7
  stopWatching: (apiClient: ApiClient) => {
    // Unsubscribe from events
    if (watcherUnsubscribe) {
      watcherUnsubscribe();
      watcherUnsubscribe = null;
    }

    // Stop bugs watcher
    apiClient.stopBugsWatcher();

    set({ isWatching: false });
    console.log('[useSharedBugStore] Bugs watcher stopped');
  },
}));

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * テスト用: ストアを初期状態にリセット
 * bugs-view-unification: Added bugDetail and isWatching reset
 */
export function resetSharedBugStore(): void {
  // Clean up watcher subscription
  if (watcherUnsubscribe) {
    watcherUnsubscribe();
    watcherUnsubscribe = null;
  }

  useSharedBugStore.setState({
    bugs: [],
    selectedBugId: null,
    bugDetail: null,
    isLoading: false,
    error: null,
    useWorktree: false,
    isCreating: false,
    isWatching: false,
  });
}

/**
 * テスト用: ストアの現在の状態を取得
 */
export function getSharedBugStore(): SharedBugStore {
  return useSharedBugStore.getState();
}
