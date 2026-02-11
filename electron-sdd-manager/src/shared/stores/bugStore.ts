/**
 * Shared bugStore
 *
 * Task 5.2: 共有bugStoreを実装する
 * bugs-view-unification: Task 2.1, 2.2, 2.3 - Extended with bugDetail, handleBugsChanged, watching
 * Task 12.3: handleRebaseResultに通知表示ロジック追加
 *
 * IPC依存を除去し、ApiClient経由でデータを取得する共有ストア。
 * Electron版とRemote UI版で同一storeを使用可能。
 */

import { create } from 'zustand';
import type { ApiClient, BugMetadata, BugDetail, BugsChangeEvent } from '../api/types';
import { useNotificationStore } from './notificationStore';
// trpc-bug-migration: tRPC vanilla client for Electron renderer (null apiClient path)
import { getVanillaClient } from '../trpc/vanillaClient';

// =============================================================================
// Types
// =============================================================================

/**
 * Rebase result success response
 */
export interface RebaseSuccessResult {
  ok: true;
  value: { success: true; alreadyUpToDate?: boolean };
}

/**
 * Rebase result error response
 */
export interface RebaseErrorResult {
  ok: false;
  error: {
    type: string;
    message?: string;
    reason?: string;
  };
}

/**
 * Rebase result response type (Result pattern)
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 * Task 12.3: Updated to Result pattern for consistent error handling
 */
export type RebaseFromMainResponse = RebaseSuccessResult | RebaseErrorResult;

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
  /**
   * Rebase処理中フラグ
   * Requirements: 7.1 (Task 6.2)
   */
  isRebasing: boolean;
  /**
   * Current project path for tRPC calls (Electron path)
   * trpc-bug-migration: Set by projectStore when project is selected
   */
  _projectPath: string | null;
}

export interface SharedBugActions {
  /**
   * bugsを読み込む
   * trpc-bug-migration: apiClient=null時はtRPC経由（Electron）
   */
  loadBugs: (apiClient: ApiClient | null) => Promise<void>;
  /**
   * Bugを選択し詳細を取得する (bugs-view-unification Task 2.1)
   * trpc-bug-migration: apiClient=null時はtRPC経由（Electron）
   * @param apiClient - ApiClient instance or null for tRPC path
   * @param bugId - Bug ID (name) or null to clear selection
   * Requirements: 3.1, 3.2, 3.8
   */
  selectBug: (apiClient: ApiClient | null, bugId: string | null) => Promise<void>;
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
   * Bugを作成
   * trpc-bug-migration: apiClient=null時はtRPC経由（Electron）
   * Requirements: 5.3 (remote-ui-bug-advanced-features Task 3.1)
   */
  createBug: (apiClient: ApiClient | null, name: string, description: string) => Promise<boolean>;
  /**
   * 選択解除 (bugs-view-unification Task 2.1)
   */
  clearSelectedBug: () => void;
  /**
   * 選択中Bugの詳細を再取得する (bugs-view-unification Task 2.1)
   * trpc-bug-migration: apiClient=null時はtRPC経由（Electron）
   * Requirements: 3.2
   */
  refreshBugDetail: (apiClient: ApiClient | null) => Promise<void>;
  /**
   * Bug変更イベントを処理する（差分更新）(bugs-view-unification Task 2.2)
   * trpc-bug-migration: apiClient=null時はtRPC経由（Electron）
   * Requirements: 3.3, 3.4, 3.5, 3.6
   */
  handleBugsChanged: (apiClient: ApiClient | null, event: BugsChangeEvent) => Promise<void>;
  /**
   * ファイル監視を開始する (bugs-view-unification Task 2.3)
   * trpc-bug-migration: apiClient=null時はtRPC subscription経由（Electron）
   * Requirements: 3.7
   */
  startWatching: (apiClient: ApiClient | null) => void;
  /**
   * ファイル監視を停止する (bugs-view-unification Task 2.3)
   * trpc-bug-migration: apiClient=null時はnoop（Electron、Main processが管理）
   * Requirements: 3.7
   */
  stopWatching: (apiClient: ApiClient | null) => void;
  /**
   * Rebase処理中状態を設定
   * Requirements: 7.1, 7.2 (Task 6.2)
   */
  setIsRebasing: (isRebasing: boolean) => void;
  /**
   * Rebase結果を処理し、通知を表示
   * Requirements: 7.3, 7.4, 7.5 (Task 6.2)
   */
  handleRebaseResult: (result: RebaseFromMainResponse) => void;
  /**
   * trpc-bug-migration: Set project path for tRPC calls
   */
  setProjectPath: (path: string | null) => void;
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
  isRebasing: false,
  _projectPath: null,

  // Actions
  // trpc-bug-migration: apiClient=null時はtRPC経由
  loadBugs: async (apiClient: ApiClient | null) => {
    set({ isLoading: true, error: null });

    try {
      if (apiClient) {
        // Remote UI path: use ApiClient
        const result = await apiClient.getBugs();
        if (result.ok) {
          set({ bugs: result.value, isLoading: false });
        } else {
          set({ error: result.error.message, isLoading: false });
        }
      } else {
        // Electron path: use tRPC
        const projectPath = get()._projectPath;
        if (!projectPath) {
          set({ error: 'Project path not set', isLoading: false });
          return;
        }
        const result = await getVanillaClient().bug.readBugs.query({ projectPath });
        set({ bugs: result.bugs as BugMetadata[], isLoading: false });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load bugs', isLoading: false });
    }
  },

  // bugs-view-unification Task 2.1: selectBug with bugDetail fetch
  // trpc-bug-migration: apiClient=null時はtRPC経由
  // Requirements: 3.1, 3.2
  // remove-redundant-agent-watchers: No need to call switchAgentWatchScope - projectAgentWatcher handles all
  selectBug: async (apiClient: ApiClient | null, bugId: string | null) => {
    // Handle null selection
    if (bugId === null) {
      set({ selectedBugId: null, bugDetail: null });
      return;
    }

    set({ selectedBugId: bugId, isLoading: true, error: null });

    try {
      if (apiClient) {
        // Remote UI path: use ApiClient
        const result = await apiClient.getBugDetail(bugId);
        if (result.ok) {
          set({ bugDetail: result.value, isLoading: false });
        } else {
          set({ error: result.error.message, bugDetail: null, isLoading: false });
        }
      } else {
        // Electron path: use tRPC
        const bugDetail = await getVanillaClient().bug.readBugDetail.query({ bugName: bugId });
        set({ bugDetail: bugDetail as BugDetail, isLoading: false });
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

  // trpc-bug-migration: apiClient=null時はtRPC経由
  createBug: async (apiClient: ApiClient | null, name: string, description: string) => {
    set({ isCreating: true, error: null });

    try {
      if (apiClient) {
        // Remote UI path: use ApiClient
        if (!apiClient.createBug) {
          set({ error: 'Bug creation not supported', isCreating: false });
          return false;
        }
        const result = await apiClient.createBug(name, description);
        if (result.ok) {
          set({ isCreating: false });
          return true;
        } else {
          set({ error: result.error.message, isCreating: false });
          return false;
        }
      } else {
        // Electron path: use tRPC
        const projectPath = get()._projectPath;
        if (!projectPath) {
          set({ error: 'Project path not set', isCreating: false });
          return false;
        }
        await getVanillaClient().bug.executeBugCreate.mutate({
          projectPath,
          description: `${name}: ${description}`,
        });
        set({ isCreating: false });
        return true;
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create bug', isCreating: false });
      return false;
    }
  },

  // bugs-view-unification Task 2.1: clearSelectedBug
  clearSelectedBug: () => {
    set({ selectedBugId: null, bugDetail: null });
  },

  // bugs-view-unification Task 2.1: refreshBugDetail
  // trpc-bug-migration: apiClient=null時はtRPC経由
  // Requirements: 3.2
  refreshBugDetail: async (apiClient: ApiClient | null) => {
    const { selectedBugId } = get();

    if (!selectedBugId) {
      return;
    }

    try {
      if (apiClient) {
        // Remote UI path: use ApiClient
        const result = await apiClient.getBugDetail(selectedBugId);
        if (result.ok) {
          set({ bugDetail: result.value });
        }
      } else {
        // Electron path: use tRPC
        const bugDetail = await getVanillaClient().bug.readBugDetail.query({ bugName: selectedBugId });
        set({ bugDetail: bugDetail as BugDetail });
      }
    } catch (error) {
      console.error('[useSharedBugStore] Failed to refresh bug detail:', error);
    }
  },

  // bugs-view-unification Task 2.2: handleBugsChanged
  // trpc-bug-migration: apiClient=null時はtRPC経由
  // Requirements: 3.3, 3.4, 3.5, 3.6
  handleBugsChanged: async (apiClient: ApiClient | null, event: BugsChangeEvent) => {
    if (!event) return; // Guard against undefined event
    const { type, bugName } = event;
    const { selectedBugId, bugs } = get();

    console.log('[useSharedBugStore] Handling bugs change event:', { type, bugName, selectedBugId });

    // Helper to reload full bug list
    const reloadBugs = async (): Promise<BugMetadata[] | null> => {
      if (apiClient) {
        const result = await apiClient.getBugs();
        return result.ok ? result.value : null;
      } else {
        const projectPath = get()._projectPath;
        if (!projectPath) return null;
        const result = await getVanillaClient().bug.readBugs.query({ projectPath });
        return result.bugs as BugMetadata[];
      }
    };

    switch (type) {
      case 'add':
      case 'addDir':
        // New bug added - refresh bug list (Requirements: 3.4)
        if (bugName) {
          const updatedBugs = await reloadBugs();
          if (updatedBugs) {
            set({ bugs: updatedBugs });
          }
        }
        break;

      case 'change':
        // Bug file changed - update metadata and possibly detail (Requirements: 3.5)
        if (bugName) {
          const updatedBugs = await reloadBugs();
          if (updatedBugs) {
            set({ bugs: updatedBugs });
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
            const updatedBugs = await reloadBugs();
            if (updatedBugs) {
              set({ bugs: updatedBugs });
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
          const filteredBugs = bugs.filter((b) => b.name !== bugName);

          if (filteredBugs.length !== bugs.length) {
            set({ bugs: filteredBugs });
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
  // trpc-bug-migration: apiClient=null時はtRPC subscription経由（Electron）
  // Requirements: 3.7
  // Note: Watcher is started by Main Process in SELECT_PROJECT IPC handler
  // Here we only register the event listener on Renderer side (same pattern as specWatcherService)
  startWatching: (apiClient: ApiClient | null) => {
    // Clean up existing subscription
    if (watcherUnsubscribe) {
      watcherUnsubscribe();
      watcherUnsubscribe = null;
    }

    if (apiClient) {
      // Remote UI path: use ApiClient
      watcherUnsubscribe = apiClient.onBugsChanged((event: BugsChangeEvent) => {
        console.log('[useSharedBugStore] Bugs changed:', event);
        get().handleBugsChanged(apiClient, event);
      });
    } else {
      // Electron path: use tRPC subscription
      const sub = getVanillaClient().events.onBugsChanged.subscribe(undefined, {
        onData: (data: unknown) => {
          if (!data || typeof data !== 'object' || !('type' in (data as Record<string, unknown>))) return; // phantom data guard
          const event = data as BugsChangeEvent;
          console.log('[useSharedBugStore] Bugs changed (tRPC):', event);
          get().handleBugsChanged(null, event);
        },
      });
      watcherUnsubscribe = () => sub.unsubscribe();
    }

    set({ isWatching: true });
    console.log('[useSharedBugStore] Bugs watcher started');
  },

  // bugs-view-unification Task 2.3: stopWatching
  // trpc-bug-migration: apiClient=null時はnoop（Electron、Main processが管理）
  // Requirements: 3.7
  stopWatching: (apiClient: ApiClient | null) => {
    // Unsubscribe from events
    if (watcherUnsubscribe) {
      watcherUnsubscribe();
      watcherUnsubscribe = null;
    }

    // Stop bugs watcher (Remote UI only; Electron watcher lifecycle managed by Main process)
    if (apiClient) {
      apiClient.stopBugsWatcher();
    }

    set({ isWatching: false });
    console.log('[useSharedBugStore] Bugs watcher stopped');
  },

  // Task 6.2: Rebase state management
  // Requirements: 7.1, 7.2
  setIsRebasing: (isRebasing: boolean) => {
    set({ isRebasing });
  },

  // trpc-bug-migration: Set project path for tRPC calls
  setProjectPath: (path: string | null) => {
    set({ _projectPath: path });
  },

  // Task 6.2, Task 12.3: Rebase result handler with notification
  // Requirements: 7.3, 7.4, 7.5
  handleRebaseResult: (result: RebaseFromMainResponse) => {
    // Always reset isRebasing flag
    set({ isRebasing: false });

    // Task 12.3: Show notification based on result
    const { showNotification } = useNotificationStore.getState();

    if (result.ok) {
      // Success case
      if (result.value.alreadyUpToDate) {
        // Requirement 7.4: Already up to date info notification
        showNotification({
          type: 'info',
          message: '既に最新です',
        });
      } else {
        // Requirement 7.3: Success notification
        showNotification({
          type: 'success',
          message: 'mainブランチの変更を取り込みました',
        });
      }
    } else {
      // Error case
      const errorType = result.error.type;

      if (errorType === 'CONFLICT_RESOLUTION_FAILED') {
        // Requirement 7.5: Conflict resolution failed
        showNotification({
          type: 'error',
          message: 'コンフリクトを解決できませんでした。手動で解決してください',
        });
      } else if (errorType === 'SCRIPT_NOT_FOUND') {
        // Requirement 7.5: Script not found error
        showNotification({
          type: 'error',
          message: 'スクリプトが見つかりません。commandsetを再インストールしてください',
        });
      } else {
        // Requirement 7.5: Generic error with message
        showNotification({
          type: 'error',
          message: result.error.message || 'Rebaseに失敗しました',
        });
      }
    }
  },
}));

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * テスト用: ストアを初期状態にリセット
 * bugs-view-unification: Added bugDetail and isWatching reset
 * worktree-rebase-from-main: Added isRebasing reset
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
    isRebasing: false,
    _projectPath: null,
  });
}

/**
 * テスト用: ストアの現在の状態を取得
 */
export function getSharedBugStore(): SharedBugStore {
  return useSharedBugStore.getState();
}
