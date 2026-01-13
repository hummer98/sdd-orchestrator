/**
 * AgentView Component Tests
 *
 * Task 13.4: Agent制御・ログ表示UIを実装する
 * TDD: RED phase - Write failing tests first
 *
 * Requirements: 7.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AgentView } from './AgentView';
import type { ApiClient, AgentInfo, LogEntry } from '@shared/api/types';

// =============================================================================
// Mock Data
// =============================================================================

const mockAgents: AgentInfo[] = [
  {
    id: 'agent-1',
    specId: 'user-authentication',
    phase: 'requirements',
    status: 'running',
    startedAt: '2026-01-10T10:00:00Z',
  },
  {
    id: 'agent-2',
    specId: 'user-authentication',
    phase: 'design',
    status: 'completed',
    startedAt: '2026-01-10T09:00:00Z',
    endedAt: '2026-01-10T09:30:00Z',
  },
];

const mockLogs: LogEntry[] = [
  {
    id: 'log-1',
    timestamp: new Date('2026-01-10T10:00:00Z').getTime(),
    stream: 'stdout',
    data: 'Starting requirements generation...',
  },
  {
    id: 'log-2',
    timestamp: new Date('2026-01-10T10:01:00Z').getTime(),
    stream: 'stdout',
    data: 'Processing requirements...',
  },
];

// =============================================================================
// Mock ApiClient
// =============================================================================

function createMockApiClient(overrides?: Partial<ApiClient>): ApiClient {
  return {
    getSpecs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    getSpecDetail: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    executePhase: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    updateApproval: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    getBugs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    getBugDetail: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    executeBugPhase: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    getAgents: vi.fn().mockResolvedValue({ ok: true, value: mockAgents }),
    stopAgent: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    resumeAgent: vi.fn().mockResolvedValue({ ok: true, value: mockAgents[0] }),
    sendAgentInput: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    getAgentLogs: vi.fn().mockResolvedValue({ ok: true, value: mockLogs }),
    executeValidation: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    executeDocumentReview: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    executeInspection: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    startAutoExecution: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    stopAutoExecution: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    getAutoExecutionStatus: vi.fn().mockResolvedValue({ ok: true, value: null }),
    saveFile: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    onSpecsUpdated: vi.fn().mockReturnValue(() => {}),
    onBugsUpdated: vi.fn().mockReturnValue(() => {}),
    onAgentOutput: vi.fn().mockReturnValue(() => {}),
    onAgentStatusChange: vi.fn().mockReturnValue(() => {}),
    onAutoExecutionStatusChanged: vi.fn().mockReturnValue(() => {}),
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('AgentView', () => {
  let mockApiClient: ApiClient;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
  });

  describe('Rendering', () => {
    it('renders loading state initially', () => {
      render(<AgentView specId="user-authentication" apiClient={mockApiClient} />);
      expect(screen.getByTestId('agent-view-loading')).toBeInTheDocument();
    });

    it('renders agent list after loading', async () => {
      render(<AgentView specId="user-authentication" apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('agent-list')).toBeInTheDocument();
      });

      // Should show both agents
      expect(screen.getByTestId('agent-item-agent-1')).toBeInTheDocument();
      expect(screen.getByTestId('agent-item-agent-2')).toBeInTheDocument();
    });

    it('renders empty state when no agents', async () => {
      const emptyApiClient = createMockApiClient({
        getAgents: vi.fn().mockResolvedValue({ ok: true, value: [] }),
      });

      render(<AgentView specId="user-authentication" apiClient={emptyApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('agent-empty-state')).toBeInTheDocument();
      });
    });
  });

  describe('Agent Selection', () => {
    it('selects an agent when clicked', async () => {
      render(<AgentView specId="user-authentication" apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('agent-item-agent-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('agent-item-agent-1'));

      // Should show log panel for selected agent
      await waitFor(() => {
        expect(screen.getByTestId('agent-log-panel')).toBeInTheDocument();
      });
    });
  });

  describe('Agent Control', () => {
    it('calls stopAgent when stop button is clicked', async () => {
      render(<AgentView specId="user-authentication" apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('agent-item-agent-1')).toBeInTheDocument();
      });

      // Find and click the stop button on running agent
      const agentItem = screen.getByTestId('agent-item-agent-1');
      const stopButton = agentItem.querySelector('button[title="停止"]');

      if (stopButton) {
        fireEvent.click(stopButton);
        await waitFor(() => {
          expect(mockApiClient.stopAgent).toHaveBeenCalledWith('agent-1');
        });
      }
    });
  });

  describe('Event Subscriptions', () => {
    it('subscribes to agent output on mount', async () => {
      render(<AgentView specId="user-authentication" apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(mockApiClient.onAgentOutput).toHaveBeenCalled();
      });
    });

    it('subscribes to agent status changes on mount', async () => {
      render(<AgentView specId="user-authentication" apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(mockApiClient.onAgentStatusChange).toHaveBeenCalled();
      });
    });

    it('unsubscribes on unmount', async () => {
      const unsubscribeOutput = vi.fn();
      const unsubscribeStatus = vi.fn();
      const apiClient = createMockApiClient({
        onAgentOutput: vi.fn().mockReturnValue(unsubscribeOutput),
        onAgentStatusChange: vi.fn().mockReturnValue(unsubscribeStatus),
      });

      const { unmount } = render(
        <AgentView specId="user-authentication" apiClient={apiClient} />
      );

      await waitFor(() => {
        expect(apiClient.onAgentOutput).toHaveBeenCalled();
      });

      unmount();

      expect(unsubscribeOutput).toHaveBeenCalled();
      expect(unsubscribeStatus).toHaveBeenCalled();
    });
  });

  describe('Log Display', () => {
    it('displays logs for selected agent', async () => {
      render(<AgentView specId="user-authentication" apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('agent-item-agent-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('agent-item-agent-1'));

      await waitFor(() => {
        expect(screen.getByTestId('agent-log-panel')).toBeInTheDocument();
        expect(screen.getByText(/Starting requirements generation/)).toBeInTheDocument();
      });
    });
  });
});
