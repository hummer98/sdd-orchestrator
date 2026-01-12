/**
 * AgentListPanel Component Tests
 * Task 30.1-30.3: Agent list UI, continue button, stop button
 * Requirements: 5.1, 5.2, 5.7, 5.8
 * git-worktree-support Task 5.1: Worktree indicator display (Requirements: 4.1, 4.2)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AgentListPanel } from './AgentListPanel';
import { useAgentStore, type AgentInfo } from '../stores/agentStore';

// Mock the stores
vi.mock('../stores/agentStore');

const mockUseAgentStore = useAgentStore as unknown as ReturnType<typeof vi.fn>;

describe('AgentListPanel - Task 30', () => {
  const mockStopAgent = vi.fn();
  const mockResumeAgent = vi.fn();
  const mockSelectAgent = vi.fn();
  const mockGetAgentsForSpec = vi.fn();

  const baseAgentInfo: AgentInfo = {
    agentId: 'agent-1',
    specId: 'spec-1',
    phase: 'requirements',
    pid: 12345,
    sessionId: 'session-1',
    status: 'running',
    startedAt: '2025-01-01T00:00:00Z',
    lastActivityAt: '2025-01-01T00:00:00Z',
    command: 'claude -p "/kiro:spec-requirements"',
  };

  const mockGetAgentById = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetAgentById.mockImplementation((agentId: string) => {
      if (agentId === 'agent-1') return baseAgentInfo;
      return undefined;
    });

    mockUseAgentStore.mockReturnValue({
      selectedAgentId: null,
      stopAgent: mockStopAgent,
      resumeAgent: mockResumeAgent,
      selectAgent: mockSelectAgent,
      getAgentsForSpec: mockGetAgentsForSpec.mockReturnValue([baseAgentInfo]),
      getAgentById: mockGetAgentById,
      removeAgent: vi.fn(),
      loadAgents: vi.fn(),
      agents: new Map([['agent-1', baseAgentInfo]]),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Task 30.1: Agent一覧UI', () => {
    it('should display agent list when spec is selected', () => {
      render(<AgentListPanel specId="spec-1" />);

      expect(screen.getByText('Agent一覧')).toBeInTheDocument();
      expect(screen.getByText('requirements')).toBeInTheDocument();
    });

    it('should display agent status icon for running agent', () => {
      render(<AgentListPanel specId="spec-1" />);

      expect(screen.getByTitle('実行中')).toBeInTheDocument();
    });

    it('should display agent status icon for completed agent', () => {
      const completedAgent = { ...baseAgentInfo, status: 'completed' as const };
      mockGetAgentsForSpec.mockReturnValue([completedAgent]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        stopAgent: mockStopAgent,
        resumeAgent: mockResumeAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
        getAgentById: mockGetAgentById,
        removeAgent: vi.fn(),
        loadAgents: vi.fn(),
        agents: new Map([['agent-1', completedAgent]]),
      });

      render(<AgentListPanel specId="spec-1" />);

      expect(screen.getByTitle('完了')).toBeInTheDocument();
    });

    it('should display agent status icon for interrupted agent', () => {
      const interruptedAgent = { ...baseAgentInfo, status: 'interrupted' as const };
      mockGetAgentsForSpec.mockReturnValue([interruptedAgent]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        stopAgent: mockStopAgent,
        resumeAgent: mockResumeAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
        getAgentById: mockGetAgentById,
        removeAgent: vi.fn(),
        loadAgents: vi.fn(),
        agents: new Map([['agent-1', interruptedAgent]]),
      });

      render(<AgentListPanel specId="spec-1" />);

      expect(screen.getByTitle('中断')).toBeInTheDocument();
    });

    it('should display agent status icon for hang agent', () => {
      const hangAgent = { ...baseAgentInfo, status: 'hang' as const };
      mockGetAgentsForSpec.mockReturnValue([hangAgent]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        stopAgent: mockStopAgent,
        resumeAgent: mockResumeAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
        getAgentById: mockGetAgentById,
        removeAgent: vi.fn(),
        loadAgents: vi.fn(),
        agents: new Map([['agent-1', hangAgent]]),
      });

      render(<AgentListPanel specId="spec-1" />);

      expect(screen.getByTitle('応答なし')).toBeInTheDocument();
    });

    it('should highlight selected agent', () => {
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: 'agent-1',
        stopAgent: mockStopAgent,
        resumeAgent: mockResumeAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
        getAgentById: mockGetAgentById,
        removeAgent: vi.fn(),
        loadAgents: vi.fn(),
        agents: new Map([['agent-1', baseAgentInfo]]),
      });

      render(<AgentListPanel specId="spec-1" />);

      const agentItem = screen.getByTestId('agent-item-agent-1');
      expect(agentItem).toHaveClass('bg-blue-50');
    });

    it('should call selectAgent when clicking on agent item', () => {
      render(<AgentListPanel specId="spec-1" />);

      const agentItem = screen.getByTestId('agent-item-agent-1');
      fireEvent.click(agentItem);

      expect(mockSelectAgent).toHaveBeenCalledWith('agent-1');
    });

    it('should show empty message when no agents', () => {
      mockGetAgentsForSpec.mockReturnValue([]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        stopAgent: mockStopAgent,
        resumeAgent: mockResumeAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
        getAgentById: mockGetAgentById,
        removeAgent: vi.fn(),
        loadAgents: vi.fn(),
        agents: new Map(),
      });

      render(<AgentListPanel specId="spec-1" />);

      expect(screen.getByText('Agentはありません')).toBeInTheDocument();
    });

    it('should return null when specId is empty', () => {
      const { container } = render(<AgentListPanel specId="" />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Task 30.4: タグにtooltipでagentId/sessionId表示', () => {
    it('should display agentId and sessionId in tooltip', () => {
      render(<AgentListPanel specId="spec-1" />);

      const agentItem = screen.getByTestId('agent-item-agent-1');
      expect(agentItem).toHaveAttribute('title', 'agent-1 / session-1');
    });
  });

  describe('Task 30.5: 削除ボタン', () => {
    it('should show delete button for non-running agent', () => {
      const completedAgent = { ...baseAgentInfo, status: 'completed' as const };
      mockGetAgentsForSpec.mockReturnValue([completedAgent]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        stopAgent: mockStopAgent,
        resumeAgent: mockResumeAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
        getAgentById: mockGetAgentById,
        removeAgent: vi.fn(),
        loadAgents: vi.fn(),
        agents: new Map([['agent-1', completedAgent]]),
      });

      render(<AgentListPanel specId="spec-1" />);

      expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument();
    });

    it('should NOT show delete button for running agent', () => {
      render(<AgentListPanel specId="spec-1" />);

      expect(screen.queryByRole('button', { name: '削除' })).not.toBeInTheDocument();
    });

    it('should call removeAgent when delete is confirmed', async () => {
      const mockRemoveAgent = vi.fn();
      const completedAgent = { ...baseAgentInfo, status: 'completed' as const };
      mockGetAgentsForSpec.mockReturnValue([completedAgent]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        stopAgent: mockStopAgent,
        resumeAgent: mockResumeAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
        getAgentById: mockGetAgentById,
        removeAgent: mockRemoveAgent,
        loadAgents: vi.fn(),
        agents: new Map([['agent-1', completedAgent]]),
      });

      render(<AgentListPanel specId="spec-1" />);

      // Click the delete button (icon button in list item) to open confirmation dialog
      const deleteButtons = screen.getAllByRole('button', { name: '削除' });
      fireEvent.click(deleteButtons[0]);

      // Confirm deletion in the dialog (the second 削除 button which appears in the dialog)
      const confirmButtons = screen.getAllByRole('button', { name: '削除' });
      // The last button is the confirm button in the dialog
      fireEvent.click(confirmButtons[confirmButtons.length - 1]);

      await waitFor(() => {
        expect(mockRemoveAgent).toHaveBeenCalledWith('agent-1');
      });
    });
  });

  describe('Auto-select agent when spec changes', () => {
    it('should auto-select running agent when spec is selected', () => {
      const runningAgent = { ...baseAgentInfo, agentId: 'agent-1', status: 'running' as const };
      mockGetAgentsForSpec.mockReturnValue([runningAgent]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        stopAgent: mockStopAgent,
        resumeAgent: mockResumeAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
        getAgentById: mockGetAgentById,
        removeAgent: vi.fn(),
        loadAgents: vi.fn(),
        agents: new Map([['agent-1', runningAgent]]),
      });

      render(<AgentListPanel specId="spec-1" />);

      // Should auto-select the running agent
      expect(mockSelectAgent).toHaveBeenCalledWith('agent-1');
    });

    it('should NOT auto-select completed agent', () => {
      const completedAgent = { ...baseAgentInfo, agentId: 'agent-1', status: 'completed' as const };
      mockGetAgentsForSpec.mockReturnValue([completedAgent]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        stopAgent: mockStopAgent,
        resumeAgent: mockResumeAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
        getAgentById: mockGetAgentById,
        removeAgent: vi.fn(),
        loadAgents: vi.fn(),
        agents: new Map([['agent-1', completedAgent]]),
      });

      render(<AgentListPanel specId="spec-1" />);

      // Should NOT auto-select completed agent
      expect(mockSelectAgent).not.toHaveBeenCalled();
    });

    it('should not auto-select if an agent for this spec is already selected', () => {
      const agent1 = { ...baseAgentInfo, agentId: 'agent-1' };
      const agent2 = { ...baseAgentInfo, agentId: 'agent-2' };
      mockGetAgentsForSpec.mockReturnValue([agent1, agent2]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: 'agent-1', // Already selected
        stopAgent: mockStopAgent,
        resumeAgent: mockResumeAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
        getAgentById: mockGetAgentById,
        removeAgent: vi.fn(),
        loadAgents: vi.fn(),
        agents: new Map([['agent-1', agent1], ['agent-2', agent2]]),
      });

      render(<AgentListPanel specId="spec-1" />);

      // Should NOT auto-select since agent-1 is already selected
      expect(mockSelectAgent).not.toHaveBeenCalled();
    });

    it('should clear selection when no agents exist for the spec', () => {
      mockGetAgentsForSpec.mockReturnValue([]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        stopAgent: mockStopAgent,
        resumeAgent: mockResumeAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
        getAgentById: mockGetAgentById,
        removeAgent: vi.fn(),
        loadAgents: vi.fn(),
        agents: new Map(),
      });

      render(<AgentListPanel specId="spec-1" />);

      // Should clear selection (call selectAgent(null)) when moving to a spec with no agents
      expect(mockSelectAgent).toHaveBeenCalledWith(null);
    });

    it('should only auto-select running agent even when completed agents exist', () => {
      const completedAgent = { ...baseAgentInfo, agentId: 'agent-completed', status: 'completed' as const, startedAt: '2025-01-01T00:00:00Z' };
      const runningAgent = { ...baseAgentInfo, agentId: 'agent-running', status: 'running' as const, startedAt: '2025-01-01T00:00:01Z' };

      // Completed agent is listed first, but only running agent should be auto-selected
      mockGetAgentsForSpec.mockReturnValue([completedAgent, runningAgent]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        stopAgent: mockStopAgent,
        resumeAgent: mockResumeAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
        getAgentById: mockGetAgentById,
        removeAgent: vi.fn(),
        loadAgents: vi.fn(),
        agents: new Map([['agent-completed', completedAgent], ['agent-running', runningAgent]]),
      });

      render(<AgentListPanel specId="spec-1" />);

      // Should auto-select the running agent only
      expect(mockSelectAgent).toHaveBeenCalledWith('agent-running');
    });

    it('should not auto-select if a project agent is currently selected', () => {
      const projectAgent = { ...baseAgentInfo, agentId: 'project-agent-1', specId: '' };
      const specAgent = { ...baseAgentInfo, agentId: 'spec-agent-1', specId: 'spec-1' };
      mockGetAgentsForSpec.mockReturnValue([specAgent]);
      mockGetAgentById.mockImplementation((agentId: string) => {
        if (agentId === 'project-agent-1') return projectAgent;
        if (agentId === 'spec-agent-1') return specAgent;
        return undefined;
      });
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: 'project-agent-1', // Project agent is selected
        stopAgent: mockStopAgent,
        resumeAgent: mockResumeAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
        getAgentById: mockGetAgentById,
        removeAgent: vi.fn(),
        loadAgents: vi.fn(),
        agents: new Map([['project-agent-1', projectAgent], ['spec-agent-1', specAgent]]),
      });

      render(<AgentListPanel specId="spec-1" />);

      // Should NOT auto-select because a project agent is selected
      expect(mockSelectAgent).not.toHaveBeenCalled();
    });
  });

  describe('Task 30.3: 停止ボタン', () => {
    it('should show stop button for running agent', () => {
      render(<AgentListPanel specId="spec-1" />);

      expect(screen.getByRole('button', { name: '停止' })).toBeInTheDocument();
    });

    it('should not show stop button for completed agent', () => {
      const completedAgent = { ...baseAgentInfo, status: 'completed' as const };
      mockGetAgentsForSpec.mockReturnValue([completedAgent]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        stopAgent: mockStopAgent,
        resumeAgent: mockResumeAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
        getAgentById: mockGetAgentById,
        removeAgent: vi.fn(),
        loadAgents: vi.fn(),
        agents: new Map([['agent-1', completedAgent]]),
      });

      render(<AgentListPanel specId="spec-1" />);

      expect(screen.queryByRole('button', { name: '停止' })).not.toBeInTheDocument();
    });

    it('should call stopAgent when stop button is clicked', async () => {
      render(<AgentListPanel specId="spec-1" />);

      const stopButton = screen.getByRole('button', { name: '停止' });
      fireEvent.click(stopButton);

      await waitFor(() => {
        expect(mockStopAgent).toHaveBeenCalledWith('agent-1');
      });
    });

    it('should show stop button for hang agent', () => {
      const hangAgent = { ...baseAgentInfo, status: 'hang' as const };
      mockGetAgentsForSpec.mockReturnValue([hangAgent]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        stopAgent: mockStopAgent,
        resumeAgent: mockResumeAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
        getAgentById: mockGetAgentById,
        removeAgent: vi.fn(),
        loadAgents: vi.fn(),
        agents: new Map([['agent-1', hangAgent]]),
      });

      render(<AgentListPanel specId="spec-1" />);

      expect(screen.getByRole('button', { name: '停止' })).toBeInTheDocument();
    });
  });

  // ============================================================
  // Skip Permissions checkbox (--dangerously-skip-permissions)
  // ============================================================
  describe('Skip Permissions checkbox', () => {
    const mockSetSkipPermissions = vi.fn();

    beforeEach(() => {
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        stopAgent: mockStopAgent,
        resumeAgent: mockResumeAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec.mockReturnValue([baseAgentInfo]),
        getAgentById: mockGetAgentById,
        removeAgent: vi.fn(),
        loadAgents: vi.fn(),
        agents: new Map([['agent-1', baseAgentInfo]]),
        skipPermissions: false,
        setSkipPermissions: mockSetSkipPermissions,
      });
    });

    it('should display checkbox next to Agent一覧 title', () => {
      render(<AgentListPanel specId="spec-1" />);

      const checkbox = screen.getByRole('checkbox', { name: /skip permissions/i });
      expect(checkbox).toBeInTheDocument();
    });

    it('should be unchecked by default', () => {
      render(<AgentListPanel specId="spec-1" />);

      const checkbox = screen.getByRole('checkbox', { name: /skip permissions/i });
      expect(checkbox).not.toBeChecked();
    });

    it('should be checked when skipPermissions is true', () => {
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        stopAgent: mockStopAgent,
        resumeAgent: mockResumeAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec.mockReturnValue([baseAgentInfo]),
        getAgentById: mockGetAgentById,
        removeAgent: vi.fn(),
        loadAgents: vi.fn(),
        agents: new Map([['agent-1', baseAgentInfo]]),
        skipPermissions: true,
        setSkipPermissions: mockSetSkipPermissions,
      });

      render(<AgentListPanel specId="spec-1" />);

      const checkbox = screen.getByRole('checkbox', { name: /skip permissions/i });
      expect(checkbox).toBeChecked();
    });

    it('should call setSkipPermissions when checkbox is clicked', () => {
      render(<AgentListPanel specId="spec-1" />);

      const checkbox = screen.getByRole('checkbox', { name: /skip permissions/i });
      fireEvent.click(checkbox);

      expect(mockSetSkipPermissions).toHaveBeenCalledWith(true);
    });

    it('should call setSkipPermissions(false) when unchecking', () => {
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        stopAgent: mockStopAgent,
        resumeAgent: mockResumeAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec.mockReturnValue([baseAgentInfo]),
        getAgentById: mockGetAgentById,
        removeAgent: vi.fn(),
        loadAgents: vi.fn(),
        agents: new Map([['agent-1', baseAgentInfo]]),
        skipPermissions: true,
        setSkipPermissions: mockSetSkipPermissions,
      });

      render(<AgentListPanel specId="spec-1" />);

      const checkbox = screen.getByRole('checkbox', { name: /skip permissions/i });
      fireEvent.click(checkbox);

      expect(mockSetSkipPermissions).toHaveBeenCalledWith(false);
    });
  });

  // ============================================================
  // Spec Ask button functionality (agent-ask-execution)
  // Requirements: 1.2, 1.4, 1.5
  // ============================================================
  describe('Spec Ask button functionality', () => {
    it('should display Ask button when specId is provided (Requirement 1.2)', () => {
      render(<AgentListPanel specId="spec-1" />);

      const askButton = screen.getByTestId('spec-ask-button');
      expect(askButton).toBeInTheDocument();
    });

    it('should not display Ask button when specId is empty (Requirement 1.4)', () => {
      const { container } = render(<AgentListPanel specId="" />);

      // Component returns null when specId is empty
      expect(container.firstChild).toBeNull();
    });

    it('should not display Ask button for bug panels', () => {
      render(<AgentListPanel specId="bug:my-bug" isBugPanel={true} />);

      expect(screen.queryByTestId('spec-ask-button')).not.toBeInTheDocument();
    });

    it('should open AskAgentDialog when Ask button is clicked (Requirement 1.5)', () => {
      render(<AgentListPanel specId="spec-1" specName="my-feature" />);

      const askButton = screen.getByTestId('spec-ask-button');
      fireEvent.click(askButton);

      // Dialog should be visible
      expect(screen.getByTestId('ask-agent-dialog')).toBeInTheDocument();
      expect(screen.getByText(/Spec Agent/)).toBeInTheDocument();
      expect(screen.getByText('(my-feature)')).toBeInTheDocument();
    });
  });

  // ============================================================
  // Worktree indicator (git-worktree-support Task 5.1)
  // Requirements: 4.1, 4.2
  // ============================================================
  describe('Worktree indicator (git-worktree-support Task 5.1)', () => {
    it('should display worktree indicator when worktreePath is provided (Requirement 4.1)', () => {
      render(<AgentListPanel specId="spec-1" worktreePath="/Users/test/worktree-feature" />);

      const indicator = screen.getByTestId('worktree-indicator');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveAttribute('title', 'Worktree: /Users/test/worktree-feature');
    });

    it('should display "worktree" text in the indicator (Requirement 4.2)', () => {
      render(<AgentListPanel specId="spec-1" worktreePath="/Users/test/worktree-feature" />);

      const indicator = screen.getByTestId('worktree-indicator');
      expect(indicator.textContent).toContain('worktree');
    });

    it('should NOT display worktree indicator when worktreePath is null', () => {
      render(<AgentListPanel specId="spec-1" worktreePath={null} />);

      expect(screen.queryByTestId('worktree-indicator')).not.toBeInTheDocument();
    });

    it('should NOT display worktree indicator when worktreePath is undefined', () => {
      render(<AgentListPanel specId="spec-1" />);

      expect(screen.queryByTestId('worktree-indicator')).not.toBeInTheDocument();
    });

    it('should NOT display worktree indicator when worktreePath is empty string', () => {
      render(<AgentListPanel specId="spec-1" worktreePath="" />);

      expect(screen.queryByTestId('worktree-indicator')).not.toBeInTheDocument();
    });
  });
});
