/**
 * AgentStoreInit Integration Tests
 *
 * Task 6.1: MobileAppContentの統合テスト
 * Task 6.2: DesktopAppContentの統合テスト
 * Task 6.3: エラーハンドリングの統合テスト
 *
 * Requirements:
 * - 1.1, 1.2: MobileAppContent/DesktopAppContentマウント時にloadAgents呼び出し
 * - 1.3: Agent一覧ロード完了時にagentStoreへ格納
 * - 4.1: 取得失敗時にremoteNotify.error()呼び出し
 * - 3.1: AGENT_STATUSイベント受信時にagentStore更新
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { useSharedAgentStore, resetSharedAgentStore } from '@shared/stores/agentStore';
import { resetRemoteNotificationStore, useRemoteNotificationStore } from './stores/remoteNotificationStore';
import type { ApiClient, AgentInfo, AgentStatus } from '@shared/api/types';
import { useAgentStoreInit } from './hooks/useAgentStoreInit';

// =============================================================================
// Test Wrapper Component
// =============================================================================

interface TestWrapperProps {
  apiClient: ApiClient;
}

function TestWrapper({ apiClient }: TestWrapperProps): React.ReactElement {
  const { isLoading, error } = useAgentStoreInit(apiClient);
  return (
    <div data-testid="test-wrapper">
      <span data-testid="is-loading">{String(isLoading)}</span>
      <span data-testid="error">{error ?? ''}</span>
    </div>
  );
}

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
      specId: 'test-spec',
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
// Integration Tests
// =============================================================================

describe('AgentStoreInit Integration', () => {
  beforeEach(() => {
    resetSharedAgentStore();
    resetRemoteNotificationStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Task 6.1: Mobile/Desktop Content Integration', () => {
    it('should load agents on mount', async () => {
      const mockAgents = createMockAgents();
      const mockApiClient = createMockApiClient({
        getAgents: vi.fn().mockResolvedValue({
          ok: true,
          value: mockAgents,
        }),
      });

      render(<TestWrapper apiClient={mockApiClient} />);

      // Wait for load to complete
      await waitFor(() => {
        expect(mockApiClient.getAgents).toHaveBeenCalledTimes(1);
      });

      // Verify agents are in store
      await waitFor(() => {
        const state = useSharedAgentStore.getState();
        expect(state.isLoading).toBe(false);
        expect(state.agents.get('test-spec')).toHaveLength(1);
        expect(state.agents.get('')).toHaveLength(1);
      });
    });

    it('should set loading state correctly during load', async () => {
      let resolvePromise: (value: unknown) => void;
      const mockApiClient = createMockApiClient({
        getAgents: vi.fn().mockImplementation(() =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
        ),
      });

      render(<TestWrapper apiClient={mockApiClient} />);

      // Should be loading initially
      await waitFor(() => {
        const state = useSharedAgentStore.getState();
        expect(state.isLoading).toBe(true);
      });

      // Resolve the promise
      resolvePromise!({ ok: true, value: [] });

      // Should stop loading after resolve
      await waitFor(() => {
        const state = useSharedAgentStore.getState();
        expect(state.isLoading).toBe(false);
      });
    });
  });

  describe('Task 6.3: Error Handling Integration', () => {
    it('should show error notification on load failure', async () => {
      const mockApiClient = createMockApiClient({
        getAgents: vi.fn().mockResolvedValue({
          ok: false,
          error: { message: 'API Error' },
        }),
      });

      render(<TestWrapper apiClient={mockApiClient} />);

      // Wait for error notification
      await waitFor(() => {
        const notifications = useRemoteNotificationStore.getState().notifications;
        expect(notifications.length).toBeGreaterThan(0);
        expect(notifications[0].type).toBe('error');
        expect(notifications[0].message).toContain('Agent一覧の取得に失敗しました');
      });
    });

    it('should store error in agentStore', async () => {
      const mockApiClient = createMockApiClient({
        getAgents: vi.fn().mockResolvedValue({
          ok: false,
          error: { message: 'API Error' },
        }),
      });

      render(<TestWrapper apiClient={mockApiClient} />);

      // Wait for error state
      await waitFor(() => {
        const state = useSharedAgentStore.getState();
        expect(state.error).toBe('API Error');
        expect(state.isLoading).toBe(false);
      });
    });
  });

  describe('WebSocket Event Handling', () => {
    it('should subscribe to agent status changes', async () => {
      const mockApiClient = createMockApiClient();

      render(<TestWrapper apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(mockApiClient.onAgentStatusChange).toHaveBeenCalled();
      });
    });

    it('should update agent status on WebSocket event', async () => {
      const mockAgents = createMockAgents();
      const mockApiClient = createMockApiClient({
        getAgents: vi.fn().mockResolvedValue({
          ok: true,
          value: mockAgents,
        }),
      }) as ApiClient & { _triggerAgentStatusChange: (agentId: string, status: AgentStatus) => void };

      render(<TestWrapper apiClient={mockApiClient} />);

      // Wait for initial load
      await waitFor(() => {
        const state = useSharedAgentStore.getState();
        expect(state.agents.get('test-spec')?.[0].status).toBe('running');
      });

      // Trigger status change via WebSocket mock
      mockApiClient._triggerAgentStatusChange('agent-1', 'completed');

      // Verify status was updated
      await waitFor(() => {
        const state = useSharedAgentStore.getState();
        expect(state.agents.get('test-spec')?.[0].status).toBe('completed');
      });
    });
  });
});
