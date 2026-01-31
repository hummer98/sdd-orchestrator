/**
 * useAgentLogSubscription Hook
 *
 * agent-log-store-unification Task 2.1
 * Requirements: 2.1, 2.2
 *
 * A shared hook that subscribes to real-time agent log events from the API client
 * and updates the SharedAgentStore. This hook is used by both Electron (renderer)
 * and Remote UI (web) to maintain consistent log subscription behavior.
 *
 * Usage:
 * ```typescript
 * // In App.tsx or top-level component
 * const apiClient = useApi();
 * useAgentLogSubscription(apiClient);
 * ```
 *
 * Design Decision: DD-002 in design.md
 * - Independent hook for single responsibility (not merged into useAgentStoreInit)
 * - ApiClient as prop for IPC/WebSocket transparency
 * - Cleanup via useEffect cleanup function
 */

import { useEffect } from 'react';
import { useSharedAgentStore } from '../stores/agentStore';
import type { ApiClient } from '../api/types';

/**
 * Subscribe to real-time agent log events and update the SharedAgentStore.
 *
 * Requirements covered:
 * - 2.1: apiClient.onAgentLog()を購読
 * - 2.2: store.addLog()を呼び出し
 *
 * @param apiClient - The API client (IpcApiClient or WebSocketApiClient), or null if not connected
 */
export function useAgentLogSubscription(apiClient: ApiClient | null): void {
  useEffect(() => {
    // If apiClient is null (e.g., during connection), do nothing
    if (!apiClient) {
      return;
    }

    // Subscribe to agent log events
    // Requirement 2.1: apiClient.onAgentLog()を購読
    const cleanup = apiClient.onAgentLog((agentId, log) => {
      // Requirement 2.2: store.addLog()を呼び出し
      const store = useSharedAgentStore.getState();
      store.addLog(agentId, log);
    });

    // Return cleanup function for unmount
    return cleanup;
  }, [apiClient]);
}

export default useAgentLogSubscription;
