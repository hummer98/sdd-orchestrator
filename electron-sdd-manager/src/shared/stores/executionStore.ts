/**
 * Shared executionStore
 *
 * Task 5.4: 共有executionStoreを実装する
 *
 * Auto Execution状態管理をApiClient経由で行う共有ストア。
 * Electron版とRemote UI版で同一storeを使用可能。
 */

import { create } from 'zustand';
import type {
  ApiClient,
  AutoExecutionOptions,
  AutoExecutionStatusEvent,
} from '../api/types';
import type { AutoExecutionStatus, WorkflowPhase } from '../types';

// =============================================================================
// Types
// =============================================================================

export interface ExecutionStateEntry {
  /** Spec Path */
  specPath: string;
  /** 自動実行状態 */
  status: AutoExecutionStatus;
  /** 現在のフェーズ */
  currentPhase: WorkflowPhase | null;
  /** 完了したフェーズ */
  completedPhases: WorkflowPhase[];
  /** 最後に失敗したフェーズ */
  lastFailedPhase: WorkflowPhase | null;
  /** リトライ回数 */
  retryCount: number;
}

export interface SharedExecutionState {
  /** Spec Path別の実行状態 */
  executions: Map<string, ExecutionStateEntry>;
  /** 読み込み中フラグ */
  isLoading: boolean;
  /** エラーメッセージ */
  error: string | null;
}

export interface SharedExecutionActions {
  /** 自動実行を開始する */
  startAutoExecution: (
    apiClient: ApiClient,
    specPath: string,
    specId: string,
    options: AutoExecutionOptions
  ) => Promise<void>;
  /** 自動実行を停止する */
  stopAutoExecution: (apiClient: ApiClient, specPath: string) => Promise<void>;
  /** 自動実行状態を取得する */
  getExecutionState: (specPath: string) => ExecutionStateEntry | undefined;
  /** 自動実行状態を更新する（イベント購読用） */
  updateExecutionState: (event: AutoExecutionStatusEvent) => void;
  /** リトライカウントを増やす */
  incrementRetryCount: (specPath: string) => void;
  /** 実行状態をクリアする */
  clearExecutionState: (specPath: string) => void;
  /** エラーをクリアする */
  clearError: () => void;
}

export type SharedExecutionStore = SharedExecutionState & SharedExecutionActions;

// =============================================================================
// Store
// =============================================================================

export const useSharedExecutionStore = create<SharedExecutionStore>((set, get) => ({
  // Initial state
  executions: new Map(),
  isLoading: false,
  error: null,

  // Actions
  startAutoExecution: async (
    apiClient: ApiClient,
    specPath: string,
    specId: string,
    options: AutoExecutionOptions
  ) => {
    set({ isLoading: true, error: null });

    const result = await apiClient.startAutoExecution(specPath, specId, options);

    if (result.ok) {
      set((state) => {
        const newExecutions = new Map(state.executions);
        newExecutions.set(specPath, {
          specPath,
          status: result.value.status,
          currentPhase: result.value.currentPhase || null,
          completedPhases: result.value.completedPhases,
          lastFailedPhase: null,
          retryCount: 0,
        });
        return { executions: newExecutions, isLoading: false };
      });
    } else {
      set({ error: result.error.message, isLoading: false });
    }
  },

  stopAutoExecution: async (apiClient: ApiClient, specPath: string) => {
    const result = await apiClient.stopAutoExecution(specPath);

    if (result.ok) {
      set((state) => {
        const newExecutions = new Map(state.executions);
        const current = newExecutions.get(specPath);
        if (current) {
          newExecutions.set(specPath, {
            ...current,
            status: 'idle',
          });
        }
        return { executions: newExecutions };
      });
    } else {
      set({ error: result.error.message });
    }
  },

  getExecutionState: (specPath: string) => {
    return get().executions.get(specPath);
  },

  updateExecutionState: (event: AutoExecutionStatusEvent) => {
    set((state) => {
      const newExecutions = new Map(state.executions);
      const current = newExecutions.get(event.specPath);

      newExecutions.set(event.specPath, {
        specPath: event.specPath,
        status: event.status,
        currentPhase: event.currentPhase || null,
        completedPhases: event.completedPhases,
        lastFailedPhase:
          event.status === 'error' ? (event.currentPhase || null) : (current?.lastFailedPhase || null),
        retryCount: current?.retryCount || 0,
      });

      return { executions: newExecutions };
    });
  },

  incrementRetryCount: (specPath: string) => {
    set((state) => {
      const newExecutions = new Map(state.executions);
      const current = newExecutions.get(specPath);
      if (current) {
        newExecutions.set(specPath, {
          ...current,
          retryCount: current.retryCount + 1,
        });
      }
      return { executions: newExecutions };
    });
  },

  clearExecutionState: (specPath: string) => {
    set((state) => {
      const newExecutions = new Map(state.executions);
      newExecutions.delete(specPath);
      return { executions: newExecutions };
    });
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
export function resetSharedExecutionStore(): void {
  useSharedExecutionStore.setState({
    executions: new Map(),
    isLoading: false,
    error: null,
  });
}

/**
 * テスト用: ストアの現在の状態を取得
 */
export function getSharedExecutionStore(): SharedExecutionStore {
  return useSharedExecutionStore.getState();
}
