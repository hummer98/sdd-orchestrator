/**
 * AgentListPanel Component Tests
 * Task 30.1-30.3: Agent list UI, continue button, stop button
 * Requirements: 5.1, 5.2, 5.7, 5.8
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AgentListPanel } from './AgentListPanel';
import { useAgentStore, type AgentInfo } from '../stores/agentStore';
import { useSpecStore } from '../stores/specStore';

// Mock the stores
vi.mock('../stores/agentStore');
vi.mock('../stores/specStore');

const mockUseAgentStore = useAgentStore as unknown as ReturnType<typeof vi.fn>;
const mockUseSpecStore = useSpecStore as unknown as ReturnType<typeof vi.fn>;

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

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseSpecStore.mockReturnValue({
      selectedSpec: { name: 'spec-1', path: '/path/to/spec-1' },
    });

    mockUseAgentStore.mockReturnValue({
      selectedAgentId: null,
      stopAgent: mockStopAgent,
      resumeAgent: mockResumeAgent,
      selectAgent: mockSelectAgent,
      getAgentsForSpec: mockGetAgentsForSpec.mockReturnValue([baseAgentInfo]),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Task 30.1: Agent一覧UI', () => {
    it('should display agent list when spec is selected', () => {
      render(<AgentListPanel />);

      expect(screen.getByText('Agent一覧')).toBeInTheDocument();
      expect(screen.getByText('requirements')).toBeInTheDocument();
    });

    it('should display agent status icon for running agent', () => {
      render(<AgentListPanel />);

      expect(screen.getByTitle('実行中')).toBeInTheDocument();
    });

    it('should display agent status icon for completed agent', () => {
      mockGetAgentsForSpec.mockReturnValue([{ ...baseAgentInfo, status: 'completed' }]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        stopAgent: mockStopAgent,
        resumeAgent: mockResumeAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
      });

      render(<AgentListPanel />);

      expect(screen.getByTitle('完了')).toBeInTheDocument();
    });

    it('should display agent status icon for interrupted agent', () => {
      mockGetAgentsForSpec.mockReturnValue([{ ...baseAgentInfo, status: 'interrupted' }]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        stopAgent: mockStopAgent,
        resumeAgent: mockResumeAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
      });

      render(<AgentListPanel />);

      expect(screen.getByTitle('中断')).toBeInTheDocument();
    });

    it('should display agent status icon for hang agent', () => {
      mockGetAgentsForSpec.mockReturnValue([{ ...baseAgentInfo, status: 'hang' }]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        stopAgent: mockStopAgent,
        resumeAgent: mockResumeAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
      });

      render(<AgentListPanel />);

      expect(screen.getByTitle('応答なし')).toBeInTheDocument();
    });

    it('should highlight selected agent', () => {
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: 'agent-1',
        stopAgent: mockStopAgent,
        resumeAgent: mockResumeAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
      });

      render(<AgentListPanel />);

      const agentItem = screen.getByTestId('agent-item-agent-1');
      expect(agentItem).toHaveClass('bg-blue-50');
    });

    it('should call selectAgent when clicking on agent item', () => {
      render(<AgentListPanel />);

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
      });

      render(<AgentListPanel />);

      expect(screen.getByText('Agentはありません')).toBeInTheDocument();
    });

    it('should return null when no spec is selected', () => {
      mockUseSpecStore.mockReturnValue({
        selectedSpec: null,
      });

      const { container } = render(<AgentListPanel />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Task 30.2: 「続けて」ボタン', () => {
    it('should show continue button for interrupted agent', () => {
      mockGetAgentsForSpec.mockReturnValue([{ ...baseAgentInfo, status: 'interrupted' }]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        stopAgent: mockStopAgent,
        resumeAgent: mockResumeAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
      });

      render(<AgentListPanel />);

      expect(screen.getByRole('button', { name: '続けて' })).toBeInTheDocument();
    });

    it('should not show continue button for running agent', () => {
      render(<AgentListPanel />);

      expect(screen.queryByRole('button', { name: '続けて' })).not.toBeInTheDocument();
    });

    it('should call resumeAgent when continue button is clicked', async () => {
      mockGetAgentsForSpec.mockReturnValue([{ ...baseAgentInfo, status: 'interrupted' }]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        stopAgent: mockStopAgent,
        resumeAgent: mockResumeAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
      });

      render(<AgentListPanel />);

      const continueButton = screen.getByRole('button', { name: '続けて' });
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(mockResumeAgent).toHaveBeenCalledWith('agent-1');
      });
    });
  });

  describe('Task 30.4: タグにtooltipでagentId/sessionId表示', () => {
    it('should display agentId and sessionId in tooltip', () => {
      render(<AgentListPanel />);

      const agentItem = screen.getByTestId('agent-item-agent-1');
      expect(agentItem).toHaveAttribute('title', 'agent-1 / session-1');
    });
  });

  describe('Task 30.5: 削除ボタン', () => {
    it('should show delete button for non-running agent', () => {
      mockGetAgentsForSpec.mockReturnValue([{ ...baseAgentInfo, status: 'completed' }]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        stopAgent: mockStopAgent,
        resumeAgent: mockResumeAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
        removeAgent: vi.fn(),
      });

      render(<AgentListPanel />);

      expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument();
    });

    it('should NOT show delete button for running agent', () => {
      render(<AgentListPanel />);

      expect(screen.queryByRole('button', { name: '削除' })).not.toBeInTheDocument();
    });

    it('should call removeAgent when delete is confirmed', async () => {
      const mockRemoveAgent = vi.fn();
      mockGetAgentsForSpec.mockReturnValue([{ ...baseAgentInfo, status: 'completed' }]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        stopAgent: mockStopAgent,
        resumeAgent: mockResumeAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
        removeAgent: mockRemoveAgent,
      });

      render(<AgentListPanel />);

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

  describe('Task 30.3: 停止ボタン', () => {
    it('should show stop button for running agent', () => {
      render(<AgentListPanel />);

      expect(screen.getByRole('button', { name: '停止' })).toBeInTheDocument();
    });

    it('should not show stop button for completed agent', () => {
      mockGetAgentsForSpec.mockReturnValue([{ ...baseAgentInfo, status: 'completed' }]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        stopAgent: mockStopAgent,
        resumeAgent: mockResumeAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
      });

      render(<AgentListPanel />);

      expect(screen.queryByRole('button', { name: '停止' })).not.toBeInTheDocument();
    });

    it('should call stopAgent when stop button is clicked', async () => {
      render(<AgentListPanel />);

      const stopButton = screen.getByRole('button', { name: '停止' });
      fireEvent.click(stopButton);

      await waitFor(() => {
        expect(mockStopAgent).toHaveBeenCalledWith('agent-1');
      });
    });

    it('should show stop button for hang agent', () => {
      mockGetAgentsForSpec.mockReturnValue([{ ...baseAgentInfo, status: 'hang' }]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        stopAgent: mockStopAgent,
        resumeAgent: mockResumeAgent,
        selectAgent: mockSelectAgent,
        getAgentsForSpec: mockGetAgentsForSpec,
      });

      render(<AgentListPanel />);

      expect(screen.getByRole('button', { name: '停止' })).toBeInTheDocument();
    });
  });
});
