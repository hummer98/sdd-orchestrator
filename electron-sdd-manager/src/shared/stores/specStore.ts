/**
 * Shared specStore
 *
 * Task 5.1: 共有specStoreを実装する
 *
 * IPC依存を除去し、ApiClient経由でデータを取得する共有ストア。
 * Electron版とRemote UI版で同一storeを使用可能。
 */

import { create } from 'zustand';
import type { ApiClient, SpecMetadata } from '../api/types';

// =============================================================================
// Types
// =============================================================================

export interface SharedSpecState {
  /** Spec一覧 */
  specs: SpecMetadata[];
  /** 選択中のSpec ID（名前） */
  selectedSpecId: string | null;
  /** 読み込み中フラグ */
  isLoading: boolean;
  /** エラーメッセージ */
  error: string | null;
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
  });
}

/**
 * テスト用: ストアの現在の状態を取得
 */
export function getSharedSpecStore(): SharedSpecStore {
  return useSharedSpecStore.getState();
}
