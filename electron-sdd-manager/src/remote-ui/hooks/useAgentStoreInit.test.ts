/**
 * useAgentStoreInit Hook Tests
 *
 * Task 2.1: useAgentStoreInit Hookの作成
 * Task 9.1: useAgentStoreInitのユニットテスト
 *
 * Requirements:
 * - 1.1, 1.2: MobileAppContent/DesktopAppContentマウント時にloadAgents呼び出し
 * - 1.3: Agent一覧ロード完了時にagentStoreへ格納
 * - 3.1: AGENT_STATUSイベント受信時にagentStore更新
 * - 4.1: 取得失敗時にremoteNotify.error()呼び出し
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAgentStoreInit } from './useAgentStoreInit';
import { useSharedAgentStore, resetSharedAgentStore } from '@shared/stores/agentStore';
import { resetRemoteNotificationStore, useRemoteNotificationStore } from '../stores/remoteNotificationStore';
import type { ApiClient, AgentInfo, AgentStatus } from '@shared/api/types';

// =============================================================================
// Mock Factory
// =============================================================================

function createMockApiClient(overrides: Partial<ApiClient> = {}): ApiClient {
  let agentStatusCallback: ((agentId: string, status: AgentStatus) => void) | null = null;

  return {
    getAgents: vi.fn().mockResolvedValue({
      ok: true,
      value: [],
    }),
    onAgentStatusChange: vi.fn().mockImplementation((callback) => {
      agentStatusCallback = callback;
      return () => {
        agentStatusCallback = null;
      };
    }),
    stopAgent: vi.fn().mockResolvedValue({ ok: true }),
    // Helper to trigger status change from tests
    _triggerAgentStatusChange: (agentId: string, status: AgentStatus) => {
      if (agentStatusCallback) {
        agentStatusCallback(agentId, status);
      }
    },
    ...overrides,
  } as unknown as ApiClient & { _triggerAgentStatusChange: (agentId: string, status: AgentStatus) => void };
}

function createMockAgents(): AgentInfo[] {
  return [
    {
      id: 'agent-1',
      specId: 'spec-1',
      phase: 'requirements',
      status: 'running',
      startedAt: '2026-01-25T10:00:00Z',
    },
    {
      id: 'agent-2',
      specId: '',
      phase: 'project',
      status: 'completed',
      startedAt: '2026-01-25T09:00:00Z',
    },
  ];
}

// =============================================================================
// Tests
// =============================================================================

describe('useAgentStoreInit', () => {
  beforeEach(() => {
    resetSharedAgentStore();
    resetRemoteNotificationStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Load', () => {
    it('should call loadAgents on mount', async () => {
      const mockApiClient = createMockApiClient();

      renderHook(() => useAgentStoreInit(mockApiClient));

      await waitFor(() => {
        expect(mockApiClient.getAgents).toHaveBeenCalled();
      });
    });

    it('should set isLoading to true during load', async () => {
      const mockApiClient = createMockApiClient({
        getAgents: vi.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
      });

      renderHook(() => useAgentStoreInit(mockApiClient));

      // Check isLoading is true while waiting
      const state = useSharedAgentStore.getState();
      expect(state.isLoading).toBe(true);
    });

    it('should populate agentStore on successful load', async () => {
      const mockAgents = createMockAgents();
      const mockApiClient = createMockApiClient({
        getAgents: vi.fn().mockResolvedValue({
          ok: true,
          value: mockAgents,
        }),
      });

      renderHook(() => useAgentStoreInit(mockApiClient));

      await waitFor(() => {
        const state = useSharedAgentStore.getState();
        expect(state.isLoading).toBe(false);
        expect(state.agents.get('spec-1')).toHaveLength(1);
        expect(state.agents.get('')).toHaveLength(1);
      });
    });

    it('should set isLoading to false after load completes', async () => {
      const mockApiClient = createMockApiClient({
        getAgents: vi.fn().mockResolvedValue({
          ok: true,
          value: [],
        }),
      });

      renderHook(() => useAgentStoreInit(mockApiClient));

      await waitFor(() => {
        const state = useSharedAgentStore.getState();
        expect(state.isLoading).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should call remoteNotify.error on load failure', async () => {
      const mockApiClient = createMockApiClient({
        getAgents: vi.fn().mockResolvedValue({
          ok: false,
          error: { message: 'Network error' },
        }),
      });

      renderHook(() => useAgentStoreInit(mockApiClient));

      await waitFor(() => {
        const notifications = useRemoteNotificationStore.getState().notifications;
        expect(notifications).toHaveLength(1);
        expect(notifications[0].type).toBe('error');
        expect(notifications[0].message).toContain('Agent一覧の取得に失敗しました');
      });
    });

    it('should set error state on load failure', async () => {
      const mockApiClient = createMockApiClient({
        getAgents: vi.fn().mockResolvedValue({
          ok: false,
          error: { message: 'Network error' },
        }),
      });

      renderHook(() => useAgentStoreInit(mockApiClient));

      await waitFor(() => {
        const state = useSharedAgentStore.getState();
        expect(state.error).toBe('Network error');
        expect(state.isLoading).toBe(false);
      });
    });
  });

  describe('WebSocket Event Subscription', () => {
    it('should subscribe to AGENT_STATUS events on mount', async () => {
      const mockApiClient = createMockApiClient();

      renderHook(() => useAgentStoreInit(mockApiClient));

      await waitFor(() => {
        expect(mockApiClient.onAgentStatusChange).toHaveBeenCalled();
      });
    });

    it('should update agentStore on AGENT_STATUS event', async () => {
      const mockAgents = createMockAgents();
      const mockApiClient = createMockApiClient({
        getAgents: vi.fn().mockResolvedValue({
          ok: true,
          value: mockAgents,
        }),
      }) as ApiClient & { _triggerAgentStatusChange: (agentId: string, status: AgentStatus) => void };

      renderHook(() => useAgentStoreInit(mockApiClient));

      // Wait for initial load
      await waitFor(() => {
        expect(useSharedAgentStore.getState().agents.get('spec-1')).toHaveLength(1);
      });

      // Trigger status change
      act(() => {
        mockApiClient._triggerAgentStatusChange('agent-1', 'completed');
      });

      // Verify agent status was updated
      await waitFor(() => {
        const agents = useSharedAgentStore.getState().agents.get('spec-1');
        expect(agents?.[0].status).toBe('completed');
      });
    });

    it('should unsubscribe from events on unmount', async () => {
      const unsubscribeMock = vi.fn();
      const mockApiClient = createMockApiClient({
        onAgentStatusChange: vi.fn().mockReturnValue(unsubscribeMock),
      });

      const { unmount } = renderHook(() => useAgentStoreInit(mockApiClient));

      await waitFor(() => {
        expect(mockApiClient.onAgentStatusChange).toHaveBeenCalled();
      });

      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });

  describe('refreshAgents', () => {
    it('should re-fetch agents when refreshAgents is called', async () => {
      const mockApiClient = createMockApiClient({
        getAgents: vi.fn()
          .mockResolvedValueOnce({ ok: true, value: [] })
          .mockResolvedValueOnce({ ok: true, value: createMockAgents() }),
      });

      const { result } = renderHook(() => useAgentStoreInit(mockApiClient));

      // Wait for initial load
      await waitFor(() => {
        expect(mockApiClient.getAgents).toHaveBeenCalledTimes(1);
      });

      // Call refreshAgents
      await act(async () => {
        await result.current.refreshAgents();
      });

      expect(mockApiClient.getAgents).toHaveBeenCalledTimes(2);
    });

    it('should show error notification on refresh failure', async () => {
      const mockApiClient = createMockApiClient({
        getAgents: vi.fn()
          .mockResolvedValueOnce({ ok: true, value: [] })
          .mockResolvedValueOnce({ ok: false, error: { message: 'Refresh failed' } }),
      });

      const { result } = renderHook(() => useAgentStoreInit(mockApiClient));

      // Wait for initial load
      await waitFor(() => {
        expect(mockApiClient.getAgents).toHaveBeenCalledTimes(1);
      });

      // Call refreshAgents
      await act(async () => {
        await result.current.refreshAgents();
      });

      const notifications = useRemoteNotificationStore.getState().notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toContain('Agent一覧の更新に失敗しました');
    });
  });

  describe('Return Values', () => {
    it('should return isLoading state', async () => {
      const mockApiClient = createMockApiClient();

      const { result } = renderHook(() => useAgentStoreInit(mockApiClient));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should return error state', async () => {
      const mockApiClient = createMockApiClient({
        getAgents: vi.fn().mockResolvedValue({
          ok: false,
          error: { message: 'Test error' },
        }),
      });

      const { result } = renderHook(() => useAgentStoreInit(mockApiClient));

      await waitFor(() => {
        expect(result.current.error).toBe('Test error');
      });
    });

    it('should return refreshAgents function', async () => {
      const mockApiClient = createMockApiClient();

      const { result } = renderHook(() => useAgentStoreInit(mockApiClient));

      expect(typeof result.current.refreshAgents).toBe('function');
    });
  });

  describe('Null ApiClient Handling', () => {
    it('should not crash when apiClient is null', async () => {
      // This test verifies the hook handles null gracefully
      const { result } = renderHook(() => useAgentStoreInit(null as unknown as ApiClient));

      // Should not throw and return default values
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });
});
