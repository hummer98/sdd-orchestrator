/**
 * BugAgentListPanel Component Tests
 * Bug fix: bugs-tab-agent-list-missing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BugAgentListPanel } from './BugAgentListPanel';
import { useAgentStore, type AgentInfo } from '../stores/agentStore';
import { useBugStore } from '../stores/bugStore';

// Mock the stores
vi.mock('../stores/agentStore');
vi.mock('../stores/bugStore');

const mockUseAgentStore = useAgentStore as unknown as ReturnType<typeof vi.fn>;
const mockUseBugStore = useBugStore as unknown as ReturnType<typeof vi.fn>;

describe('BugAgentListPanel', () => {
  const mockStopAgent = vi.fn();
  const mockSelectAgent = vi.fn();
  const mockGetAgentsForSpec = vi.fn();
  const mockRemoveAgent = vi.fn();
  const mockLoadAgents = vi.fn();
  const mockSetSkipPermissions = vi.fn();

  const baseAgentInfo: AgentInfo = {
    agentId: 'agent-1',
    specId: 'bug:test-bug',
    phase: 'analyze',
    pid: 12345,
    sessionId: 'session-1',
    status: 'running',
    startedAt: '2025-01-01T00:00:00Z',
    lastActivityAt: '2025-01-01T00:00:00Z',
    command: 'claude -p "/kiro:bug-analyze"',
  };

  const mockGetAgentById = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseBugStore.mockReturnValue({
      selectedBug: { name: 'test-bug', path: '/path/to/bug', phase: 'reported' },
    });

    mockGetAgentById.mockImplementation((agentId: string) => {
      if (agentId === 'agent-1') return baseAgentInfo;
      return undefined;
    });

    mockUseAgentStore.mockReturnValue({
      selectedAgentId: null,
      stopAgent: mockStopAgent,
      selectAgent: mockSelectAgent,
      getAgentsForSpec: mockGetAgentsForSpec.mockReturnValue([baseAgentInfo]),
      getAgentById: mockGetAgentById,
      removeAgent: mockRemoveAgent,
      loadAgents: mockLoadAgents,
      agents: new Map([['agent-1', baseAgentInfo]]),
      skipPermissions: false,
      setSkipPermissions: mockSetSkipPermissions,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic rendering', () => {
    it('should render with data-testid="bug-agent-list-panel"', () => {
      render(<BugAgentListPanel />);

      expect(screen.getByTestId('bug-agent-list-panel')).toBeInTheDocument();
    });

    it('should display agent list when bug is selected', () => {
      render(<BugAgentListPanel />);

      expect(screen.getByText('Agent一覧')).toBeInTheDocument();
      expect(screen.getByText('analyze')).toBeInTheDocument();
    });

    it('should return null when no bug is selected', () => {
      mockUseBugStore.mockReturnValue({
        selectedBug: null,
      });

      const { container } = render(<BugAgentListPanel />);

      expect(container.firstChild).toBeNull();
    });

    it('should show empty message when no agents', () => {
      mockGetAgentsForSpec.mockReturnValue([]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        stopAgent: mockStopAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
        getAgentById: mockGetAgentById,
        removeAgent: mockRemoveAgent,
        loadAgents: mockLoadAgents,
        agents: new Map(),
        skipPermissions: false,
        setSkipPermissions: mockSetSkipPermissions,
      });

      render(<BugAgentListPanel />);

      expect(screen.getByText('Agentはありません')).toBeInTheDocument();
    });
  });

  describe('Agent status display', () => {
    it('should display agent status icon for running agent', () => {
      render(<BugAgentListPanel />);

      expect(screen.getByTitle('実行中')).toBeInTheDocument();
    });

    it('should display agent status icon for completed agent', () => {
      const completedAgent = { ...baseAgentInfo, status: 'completed' as const };
      mockGetAgentsForSpec.mockReturnValue([completedAgent]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        stopAgent: mockStopAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
        getAgentById: mockGetAgentById,
        removeAgent: mockRemoveAgent,
        loadAgents: mockLoadAgents,
        agents: new Map([['agent-1', completedAgent]]),
        skipPermissions: false,
        setSkipPermissions: mockSetSkipPermissions,
      });

      render(<BugAgentListPanel />);

      expect(screen.getByTitle('完了')).toBeInTheDocument();
    });
  });

  describe('Agent selection', () => {
    it('should highlight selected agent', () => {
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: 'agent-1',
        stopAgent: mockStopAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
        getAgentById: mockGetAgentById,
        removeAgent: mockRemoveAgent,
        loadAgents: mockLoadAgents,
        agents: new Map([['agent-1', baseAgentInfo]]),
        skipPermissions: false,
        setSkipPermissions: mockSetSkipPermissions,
      });

      render(<BugAgentListPanel />);

      const agentItem = screen.getByTestId('bug-agent-item-agent-1');
      expect(agentItem).toHaveClass('bg-blue-50');
    });

    it('should call selectAgent when clicking on agent item', () => {
      render(<BugAgentListPanel />);

      const agentItem = screen.getByTestId('bug-agent-item-agent-1');
      fireEvent.click(agentItem);

      expect(mockSelectAgent).toHaveBeenCalledWith('agent-1');
    });
  });

  describe('Stop button', () => {
    it('should show stop button for running agent', () => {
      render(<BugAgentListPanel />);

      expect(screen.getByRole('button', { name: '停止' })).toBeInTheDocument();
    });

    it('should not show stop button for completed agent', () => {
      const completedAgent = { ...baseAgentInfo, status: 'completed' as const };
      mockGetAgentsForSpec.mockReturnValue([completedAgent]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        stopAgent: mockStopAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
        getAgentById: mockGetAgentById,
        removeAgent: mockRemoveAgent,
        loadAgents: mockLoadAgents,
        agents: new Map([['agent-1', completedAgent]]),
        skipPermissions: false,
        setSkipPermissions: mockSetSkipPermissions,
      });

      render(<BugAgentListPanel />);

      expect(screen.queryByRole('button', { name: '停止' })).not.toBeInTheDocument();
    });

    it('should call stopAgent when stop button is clicked', async () => {
      render(<BugAgentListPanel />);

      const stopButton = screen.getByRole('button', { name: '停止' });
      fireEvent.click(stopButton);

      await waitFor(() => {
        expect(mockStopAgent).toHaveBeenCalledWith('agent-1');
      });
    });
  });

  describe('Delete button', () => {
    it('should show delete button for non-running agent', () => {
      const completedAgent = { ...baseAgentInfo, status: 'completed' as const };
      mockGetAgentsForSpec.mockReturnValue([completedAgent]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        stopAgent: mockStopAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
        getAgentById: mockGetAgentById,
        removeAgent: mockRemoveAgent,
        loadAgents: mockLoadAgents,
        agents: new Map([['agent-1', completedAgent]]),
        skipPermissions: false,
        setSkipPermissions: mockSetSkipPermissions,
      });

      render(<BugAgentListPanel />);

      expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument();
    });

    it('should NOT show delete button for running agent', () => {
      render(<BugAgentListPanel />);

      expect(screen.queryByRole('button', { name: '削除' })).not.toBeInTheDocument();
    });

    it('should call removeAgent when delete is confirmed', async () => {
      const completedAgent = { ...baseAgentInfo, status: 'completed' as const };
      mockGetAgentsForSpec.mockReturnValue([completedAgent]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        stopAgent: mockStopAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
        getAgentById: mockGetAgentById,
        removeAgent: mockRemoveAgent,
        loadAgents: mockLoadAgents,
        agents: new Map([['agent-1', completedAgent]]),
        skipPermissions: false,
        setSkipPermissions: mockSetSkipPermissions,
      });

      render(<BugAgentListPanel />);

      // Click the delete button to open confirmation dialog
      const deleteButtons = screen.getAllByRole('button', { name: '削除' });
      fireEvent.click(deleteButtons[0]);

      // Confirm deletion in the dialog
      const confirmButtons = screen.getAllByRole('button', { name: '削除' });
      fireEvent.click(confirmButtons[confirmButtons.length - 1]);

      await waitFor(() => {
        expect(mockRemoveAgent).toHaveBeenCalledWith('agent-1');
      });
    });
  });

  describe('Skip Permissions checkbox', () => {
    it('should display checkbox', () => {
      render(<BugAgentListPanel />);

      const checkbox = screen.getByRole('checkbox', { name: /skip permissions/i });
      expect(checkbox).toBeInTheDocument();
    });

    it('should call setSkipPermissions when checkbox is clicked', () => {
      render(<BugAgentListPanel />);

      const checkbox = screen.getByRole('checkbox', { name: /skip permissions/i });
      fireEvent.click(checkbox);

      expect(mockSetSkipPermissions).toHaveBeenCalledWith(true);
    });
  });

  describe('Bug-specific agent filtering', () => {
    it('should filter agents by bug:bugName format', () => {
      render(<BugAgentListPanel />);

      // getAgentsForSpec should be called with bug:test-bug
      expect(mockGetAgentsForSpec).toHaveBeenCalledWith('bug:test-bug');
    });
  });

  describe('Tooltip display', () => {
    it('should display agentId and sessionId in tooltip', () => {
      render(<BugAgentListPanel />);

      const agentItem = screen.getByTestId('bug-agent-item-agent-1');
      expect(agentItem).toHaveAttribute('title', 'agent-1 / session-1');
    });
  });
});
