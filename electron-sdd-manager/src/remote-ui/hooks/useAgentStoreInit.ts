/**
 * useAgentStoreInit Hook
 *
 * Task 2.1: useAgentStoreInit Hookの作成
 *
 * Requirements:
 * - 1.1, 1.2: MobileAppContent/DesktopAppContentマウント時にloadAgents呼び出し
 * - 1.3: Agent一覧ロード完了時にagentStoreへ格納
 * - 3.1: AGENT_STATUSイベント受信時にagentStore更新
 * - 3.2: agentStore更新時にUI自動更新 (Zustand subscription)
 * - 3.3: 新しいAgent開始時にAgent一覧に追加
 * - 3.4: Agent終了時にAgent一覧から削除/状態更新
 * - 4.1: 取得失敗時にremoteNotify.error()呼び出し
 *
 * Design:
 * - Design.md DD-001: 初期化ロジックの集約方法
 * - Design.md DD-002: WebSocketイベント購読の方式
 */

import { useEffect, useCallback } from 'react';
import { useSharedAgentStore } from '@shared/stores/agentStore';
import { remoteNotify } from '../stores/remoteNotificationStore';
import type { ApiClient } from '@shared/api/types';

// =============================================================================
// Error Messages (Design.md Error Messages)
// =============================================================================

const ERROR_MESSAGES = {
  LOAD_FAILED: 'Agent一覧の取得に失敗しました',
  REFRESH_FAILED: 'Agent一覧の更新に失敗しました',
};

// =============================================================================
// Types
// =============================================================================

/**
 * Return type for useAgentStoreInit hook
 * Design.md Service Interface
 */
export interface UseAgentStoreInitReturn {
  /** Agent一覧を再取得する */
  refreshAgents: () => Promise<void>;
  /** ロード中フラグ */
  isLoading: boolean;
  /** エラーメッセージ */
  error: string | null;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * AgentStoreを初期化し、WebSocketイベントを購読するHook
 *
 * Requirements covered:
 * - 1.1, 1.2: アプリマウント時にuseSharedAgentStore.loadAgents(apiClient)を呼び出す
 * - 1.3: Agent一覧ロード完了時にagentStoreへ格納
 * - 3.1: WebSocket AGENT_STATUSイベントを購読してStore更新を行う
 * - 3.3, 3.4: Agent開始/終了時のStore更新
 * - 4.1: エラー発生時にremoteNotify.error()を呼び出す
 *
 * @param apiClient - WebSocketApiClient instance
 * @returns UseAgentStoreInitReturn
 */
export function useAgentStoreInit(apiClient: ApiClient | null): UseAgentStoreInitReturn {
  // Get state from store
  const isLoading = useSharedAgentStore((state) => state.isLoading);
  const error = useSharedAgentStore((state) => state.error);

  /**
   * Load agents from API and populate store
   * Called on mount and when refreshAgents is invoked
   */
  const loadAgents = useCallback(async (isRefresh: boolean = false) => {
    if (!apiClient) return;

    const store = useSharedAgentStore.getState();

    try {
      // Requirement 1.1, 1.2: Call loadAgents
      await store.loadAgents(apiClient);

      // Check for errors after load
      const state = useSharedAgentStore.getState();
      if (state.error) {
        // Requirement 4.1: Show error notification
        const message = isRefresh ? ERROR_MESSAGES.REFRESH_FAILED : ERROR_MESSAGES.LOAD_FAILED;
        remoteNotify.error(message);
      }
    } catch {
      // Requirement 4.1: Show error notification on exception
      const message = isRefresh ? ERROR_MESSAGES.REFRESH_FAILED : ERROR_MESSAGES.LOAD_FAILED;
      remoteNotify.error(message);
    }
  }, [apiClient]);

  /**
   * Refresh agents (re-fetch from API)
   * Requirement 4.2, 4.3: Pull to Refresh / リフレッシュボタンで呼び出す
   */
  const refreshAgents = useCallback(async () => {
    await loadAgents(true);
  }, [loadAgents]);

  // =============================================================================
  // Initial Load Effect
  // =============================================================================

  useEffect(() => {
    if (!apiClient) return;

    // Requirement 1.1, 1.2, 1.3: Load agents on mount
    loadAgents(false);
  }, [apiClient, loadAgents]);

  // =============================================================================
  // WebSocket Event Subscription Effect
  // =============================================================================

  useEffect(() => {
    if (!apiClient) return;

    /**
     * Handle AGENT_STATUS event from WebSocket
     * Requirements 3.1, 3.3, 3.4: Update agentStore on status change
     * Design.md DD-002: WebSocketイベント購読の方式
     */
    const unsubscribe = apiClient.onAgentStatusChange((agentId, status) => {
      const store = useSharedAgentStore.getState();

      // Requirement 3.1: Update agent status in store
      store.updateAgentStatus(agentId, status);

      // Note: Requirement 3.2 (UI auto-update) is handled automatically by Zustand subscription
      // Note: Requirement 3.3 (agent add) and 3.4 (agent remove) are handled by store methods
    });

    // Cleanup: Unsubscribe on unmount
    return () => {
      unsubscribe();
    };
  }, [apiClient]);

  return {
    refreshAgents,
    isLoading,
    error,
  };
}

export default useAgentStoreInit;
