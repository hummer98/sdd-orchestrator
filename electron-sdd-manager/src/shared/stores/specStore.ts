/**
 * Shared specStore
 *
 * Task 5.1: 共有specStoreを実装する
 * Task 12.2: handleRebaseResultに通知表示ロジック追加
 *
 * IPC依存を除去し、ApiClient経由でデータを取得する共有ストア。
 * Electron版とRemote UI版で同一storeを使用可能。
 */

import { create } from 'zustand';
import type { ApiClient, SpecMetadata } from '../api/types';
import { useNotificationStore } from './notificationStore';

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
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 * Task 12.2: Updated to Result pattern for consistent error handling
 */
export type RebaseFromMainResponse = RebaseSuccessResult | RebaseErrorResult;

export interface SharedSpecState {
  /** Spec一覧 */
  specs: SpecMetadata[];
  /** 選択中のSpec ID（名前） */
  selectedSpecId: string | null;
  /** 読み込み中フラグ */
  isLoading: boolean;
  /** エラーメッセージ */
  error: string | null;
  /**
   * Rebase処理中フラグ
   * Requirements: 6.1 (Task 6.1)
   */
  isRebasing: boolean;
}

export interface SharedSpecActions {
  /** ApiClient経由でspecsを読み込む */
  loadSpecs: (apiClient: ApiClient) => Promise<void>;
  /** Specを選択する */
  selectSpec: (specId: string | null) => void;
  /** IDでSpecを取得する */
  getSpecById: (specId: string) => SpecMetadata | undefined;
  /** Specs配列を更新する（イベント購読用） */
  updateSpecs: (specs: SpecMetadata[]) => void;
  /** エラーをクリアする */
  clearError: () => void;
  /**
   * Rebase処理中状態を設定
   * Requirements: 6.1, 6.2 (Task 6.1)
   */
  setIsRebasing: (isRebasing: boolean) => void;
  /**
   * Rebase結果を処理し、通知を表示
   * Requirements: 6.3, 6.4, 6.5 (Task 6.1)
   */
  handleRebaseResult: (result: RebaseFromMainResponse) => void;
}

export type SharedSpecStore = SharedSpecState & SharedSpecActions;

// =============================================================================
// Store
// =============================================================================

export const useSharedSpecStore = create<SharedSpecStore>((set, get) => ({
  // Initial state
  specs: [],
  selectedSpecId: null,
  isLoading: false,
  error: null,
  isRebasing: false,

  // Actions
  loadSpecs: async (apiClient: ApiClient) => {
    set({ isLoading: true, error: null });

    const result = await apiClient.getSpecs();

    if (result.ok) {
      set({ specs: result.value, isLoading: false });
    } else {
      set({ error: result.error.message, isLoading: false });
    }
  },

  selectSpec: (specId: string | null) => {
    set({ selectedSpecId: specId });
  },

  getSpecById: (specId: string) => {
    return get().specs.find((spec) => spec.name === specId);
  },

  updateSpecs: (specs: SpecMetadata[]) => {
    set({ specs });
  },

  clearError: () => {
    set({ error: null });
  },

  // Task 6.1: Rebase state management
  // Requirements: 6.1, 6.2
  setIsRebasing: (isRebasing: boolean) => {
    set({ isRebasing });
  },

  // Task 6.1, Task 12.2: Rebase result handler with notification
  // Requirements: 6.3, 6.4, 6.5
  handleRebaseResult: (result: RebaseFromMainResponse) => {
    // Always reset isRebasing flag
    set({ isRebasing: false });

    // Task 12.2: Show notification based on result
    const { showNotification } = useNotificationStore.getState();

    if (result.ok) {
      // Success case
      if (result.value.alreadyUpToDate) {
        // Requirement 6.4: Already up to date info notification
        showNotification({
          type: 'info',
          message: '既に最新です',
        });
      } else {
        // Requirement 6.3: Success notification
        showNotification({
          type: 'success',
          message: 'mainブランチの変更を取り込みました',
        });
      }
    } else {
      // Error case
      const errorType = result.error.type;

      if (errorType === 'CONFLICT_RESOLUTION_FAILED') {
        // Requirement 6.5: Conflict resolution failed
        showNotification({
          type: 'error',
          message: 'コンフリクトを解決できませんでした。手動で解決してください',
        });
      } else if (errorType === 'SCRIPT_NOT_FOUND') {
        // Requirement 6.5: Script not found error
        showNotification({
          type: 'error',
          message: 'スクリプトが見つかりません。commandsetを再インストールしてください',
        });
      } else {
        // Requirement 6.5: Generic error with message
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
 */
export function resetSharedSpecStore(): void {
  useSharedSpecStore.setState({
    specs: [],
    selectedSpecId: null,
    isLoading: false,
    error: null,
    isRebasing: false,
  });
}

/**
 * テスト用: ストアの現在の状態を取得
 */
export function getSharedSpecStore(): SharedSpecStore {
  return useSharedSpecStore.getState();
}
