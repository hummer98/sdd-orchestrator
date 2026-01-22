/**
 * Shared bugStore
 *
 * Task 5.2: 共有bugStoreを実装する
 *
 * IPC依存を除去し、ApiClient経由でデータを取得する共有ストア。
 * Electron版とRemote UI版で同一storeを使用可能。
 */

import { create } from 'zustand';
import type { ApiClient, BugMetadata } from '../api/types';

// =============================================================================
// Types
// =============================================================================

export interface SharedBugState {
  /** Bug一覧 */
  bugs: BugMetadata[];
  /** 選択中のBug ID（名前） */
  selectedBugId: string | null;
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
}

export interface SharedBugActions {
  /** ApiClient経由でbugsを読み込む */
  loadBugs: (apiClient: ApiClient) => Promise<void>;
  /** Bugを選択する */
  selectBug: (bugId: string | null) => void;
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
}

export type SharedBugStore = SharedBugState & SharedBugActions;

// =============================================================================
// Store
// =============================================================================

export const useSharedBugStore = create<SharedBugStore>((set, get) => ({
  // Initial state
  bugs: [],
  selectedBugId: null,
  isLoading: false,
  error: null,
  useWorktree: false,
  isCreating: false,

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

  selectBug: (bugId: string | null) => {
    set({ selectedBugId: bugId });
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
}));

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * テスト用: ストアを初期状態にリセット
 */
export function resetSharedBugStore(): void {
  useSharedBugStore.setState({
    bugs: [],
    selectedBugId: null,
    isLoading: false,
    error: null,
    useWorktree: false,
    isCreating: false,
  });
}

/**
 * テスト用: ストアの現在の状態を取得
 */
export function getSharedBugStore(): SharedBugStore {
  return useSharedBugStore.getState();
}
