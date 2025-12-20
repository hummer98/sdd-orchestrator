/**
 * GlobalAgentPanel Component Tests
 * TDD: Testing global agent panel display and interactions
 * Task 4.2, 4.3 (sidebar-refactor)
 * Requirements: 4.1, 4.3, 4.4, 4.5, 4.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GlobalAgentPanel } from './GlobalAgentPanel';
import { useAgentStore, type AgentInfo, type AgentStatus } from '../stores/agentStore';

// Mock agent data
const mockGlobalAgent1: AgentInfo = {
  agentId: 'global-1',
  specId: '',
  phase: 'steering',
  pid: 12345,
  sessionId: 'session-abc',
  status: 'running' as AgentStatus,
  startedAt: '2024-01-01T00:00:00Z',
  lastActivityAt: '2024-01-01T00:01:00Z',
  command: 'claude',
};

const mockGlobalAgent2: AgentInfo = {
  agentId: 'global-2',
  specId: '',
  phase: 'bug-fix',
  pid: 12346,
  sessionId: 'session-def',
  status: 'completed' as AgentStatus,
  startedAt: '2024-01-01T00:02:00Z',
  lastActivityAt: '2024-01-01T00:03:00Z',
  command: 'claude',
};

const mockGlobalAgent3: AgentInfo = {
  agentId: 'global-3',
  specId: '',
  phase: 'failed-task',
  pid: 12347,
  sessionId: 'session-ghi',
  status: 'failed' as AgentStatus,
  startedAt: '2024-01-01T00:04:00Z',
  lastActivityAt: '2024-01-01T00:05:00Z',
  command: 'claude',
};

describe('GlobalAgentPanel', () => {
  beforeEach(() => {
    // Reset store state
    useAgentStore.setState({
      agents: new Map(),
      selectedAgentId: null,
      logs: new Map(),
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  // ============================================================
  // Task 4.2: グローバルエージェント一覧表示
  // Requirements: 4.1, 4.3, 4.5
  // ============================================================
  describe('Task 4.2: Global agent list display', () => {
    it('should render header with "Global Agent" title when agents exist', () => {
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [mockGlobalAgent1]);
      useAgentStore.setState({ agents });

      render(<GlobalAgentPanel />);
      expect(screen.getByText('Global Agent')).toBeInTheDocument();
    });

    it('should render panel even when no global agents exist (always visible)', () => {
      // global-agent-panel-always-visible feature: 0件でもパネルを表示
      render(<GlobalAgentPanel />);
      expect(screen.getByTestId('global-agent-panel')).toBeInTheDocument();
    });

    it('should display empty state message when no global agents exist', () => {
      // global-agent-panel-always-visible feature: 0件時に空状態メッセージを表示
      render(<GlobalAgentPanel />);
      expect(screen.getByText('グローバルエージェントなし')).toBeInTheDocument();
    });

    it('should hide empty state message when agents exist', () => {
      // global-agent-panel-always-visible feature: エージェントがある場合は空状態メッセージを非表示
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [mockGlobalAgent1]);
      useAgentStore.setState({ agents });

      render(<GlobalAgentPanel />);
      expect(screen.queryByText('グローバルエージェントなし')).not.toBeInTheDocument();
    });

    it('should hide empty state message when collapsed', () => {
      // global-agent-panel-always-visible feature: 折りたたみ時は空状態メッセージも非表示
      render(<GlobalAgentPanel collapsed={true} />);
      expect(screen.queryByText('グローバルエージェントなし')).not.toBeInTheDocument();
    });

    it('should render panel when global agents exist', () => {
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [mockGlobalAgent1]);
      useAgentStore.setState({ agents });

      render(<GlobalAgentPanel />);
      expect(screen.getByTestId('global-agent-panel')).toBeInTheDocument();
    });

    it('should display all global agents', () => {
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [mockGlobalAgent1, mockGlobalAgent2]);
      useAgentStore.setState({ agents });

      render(<GlobalAgentPanel />);
      expect(screen.getByText('steering')).toBeInTheDocument();
      expect(screen.getByText('bug-fix')).toBeInTheDocument();
    });

    it('should display agent count badge', () => {
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [mockGlobalAgent1, mockGlobalAgent2, mockGlobalAgent3]);
      useAgentStore.setState({ agents });

      render(<GlobalAgentPanel />);
      expect(screen.getByText('(3)')).toBeInTheDocument();
    });

    it('should display status icon for running agent', () => {
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [mockGlobalAgent1]); // status: running
      useAgentStore.setState({ agents });

      render(<GlobalAgentPanel />);
      expect(screen.getByText('実行中')).toBeInTheDocument();
    });

    it('should display status icon for completed agent', () => {
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [mockGlobalAgent2]); // status: completed
      useAgentStore.setState({ agents });

      render(<GlobalAgentPanel />);
      expect(screen.getByText('完了')).toBeInTheDocument();
    });

    it('should display status icon for failed agent', () => {
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [mockGlobalAgent3]); // status: failed
      useAgentStore.setState({ agents });

      render(<GlobalAgentPanel />);
      expect(screen.getByText('失敗')).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 4.3: グローバルエージェントの操作機能
  // Requirements: 4.4, 4.6
  // ============================================================
  describe('Task 4.3: Global agent interactions', () => {
    it('should select agent when clicked', async () => {
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [mockGlobalAgent1]);
      useAgentStore.setState({ agents });

      render(<GlobalAgentPanel />);

      const agentItem = screen.getByTestId('global-agent-item-global-1');
      fireEvent.click(agentItem);

      // selectAgentが呼ばれて、selectedAgentIdが更新される
      expect(useAgentStore.getState().selectedAgentId).toBe('global-1');
    });

    it('should highlight selected agent', () => {
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [mockGlobalAgent1, mockGlobalAgent2]);
      useAgentStore.setState({ agents, selectedAgentId: 'global-1' });

      render(<GlobalAgentPanel />);

      const selectedItem = screen.getByTestId('global-agent-item-global-1');
      expect(selectedItem).toHaveClass('bg-blue-50');
    });

    it('should show stop button for running agent', () => {
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [mockGlobalAgent1]); // status: running
      useAgentStore.setState({ agents });

      render(<GlobalAgentPanel />);
      expect(screen.getByRole('button', { name: /停止/i })).toBeInTheDocument();
    });

    it('should not show stop button for completed agent', () => {
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [mockGlobalAgent2]); // status: completed
      useAgentStore.setState({ agents });

      render(<GlobalAgentPanel />);
      expect(screen.queryByRole('button', { name: /停止/i })).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // Collapse functionality
  // ============================================================
  describe('Collapse functionality', () => {
    it('should allow collapsing the panel', () => {
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [mockGlobalAgent1]);
      useAgentStore.setState({ agents });

      render(<GlobalAgentPanel collapsed={false} />);

      // Initially expanded, agents visible
      expect(screen.getByText('steering')).toBeInTheDocument();
    });

    it('should hide agent list when collapsed', () => {
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [mockGlobalAgent1]);
      useAgentStore.setState({ agents });

      render(<GlobalAgentPanel collapsed={true} />);

      // When collapsed, agent list is hidden
      expect(screen.queryByText('steering')).not.toBeInTheDocument();
    });

    it('should call onCollapsedChange when header is clicked', () => {
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [mockGlobalAgent1]);
      useAgentStore.setState({ agents });

      const onCollapsedChange = vi.fn();
      render(<GlobalAgentPanel collapsed={false} onCollapsedChange={onCollapsedChange} />);

      const header = screen.getByTestId('global-agent-panel-header');
      fireEvent.click(header);

      expect(onCollapsedChange).toHaveBeenCalledWith(true);
    });
  });
});
