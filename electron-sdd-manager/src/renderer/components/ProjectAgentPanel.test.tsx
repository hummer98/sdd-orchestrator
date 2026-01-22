/**
 * ProjectAgentPanel Component Tests
 * TDD: Testing project agent panel display and interactions
 * Task 4.2, 4.3 (sidebar-refactor)
 * Requirements: 4.1, 4.3, 4.4, 4.5, 4.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectAgentPanel } from './ProjectAgentPanel';
import { useAgentStore, type AgentInfo, type AgentStatus } from '../stores/agentStore';
import { useSharedAgentStore } from '@shared/stores/agentStore';

// Mock agent data
const mockProjectAgent1: AgentInfo = {
  agentId: 'project-1',
  specId: '',
  phase: 'steering',
  pid: 12345,
  sessionId: 'session-abc',
  status: 'running' as AgentStatus,
  startedAt: '2024-01-01T00:00:00Z',
  lastActivityAt: '2024-01-01T00:01:00Z',
  command: 'claude',
};

const mockProjectAgent2: AgentInfo = {
  agentId: 'project-2',
  specId: '',
  phase: 'bug-fix',
  pid: 12346,
  sessionId: 'session-def',
  status: 'completed' as AgentStatus,
  startedAt: '2024-01-01T00:02:00Z',
  lastActivityAt: '2024-01-01T00:03:00Z',
  command: 'claude',
};

const mockProjectAgent3: AgentInfo = {
  agentId: 'project-3',
  specId: '',
  phase: 'failed-task',
  pid: 12347,
  sessionId: 'session-ghi',
  status: 'failed' as AgentStatus,
  startedAt: '2024-01-01T00:04:00Z',
  lastActivityAt: '2024-01-01T00:05:00Z',
  command: 'claude',
};

/**
 * Helper to set agents in both stores
 * agentStore.getAgentsForSpec delegates to sharedAgentStore, so we need to update both
 */
function setAgentsInStores(agents: Map<string, AgentInfo[]>) {
  // Convert renderer AgentInfo (agentId) to shared AgentInfo (id) format
  const sharedAgents = new Map();
  for (const [specId, agentList] of agents.entries()) {
    sharedAgents.set(
      specId,
      agentList.map((a) => ({
        id: a.agentId,
        specId: a.specId,
        phase: a.phase,
        status: a.status,
        startedAt: a.startedAt,
        command: a.command,
        sessionId: a.sessionId,
        lastActivityAt: a.lastActivityAt,
      }))
    );
  }
  useSharedAgentStore.setState({ agents: sharedAgents });
  useAgentStore.setState({ agents });
}

describe('ProjectAgentPanel', () => {
  beforeEach(() => {
    // Reset store state
    useAgentStore.setState({
      agents: new Map(),
      selectedAgentId: null,
      logs: new Map(),
      isLoading: false,
      error: null,
    });
    // Also reset sharedAgentStore (the SSOT)
    useSharedAgentStore.setState({
      agents: new Map(),
      selectedAgentId: null,
      selectedAgentIdBySpec: new Map(),
      logs: new Map(),
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  // ============================================================
  // Task 4.2: プロジェクトエージェント一覧表示
  // Requirements: 4.1, 4.3, 4.5
  // ============================================================
  describe('Task 4.2: Project agent list display', () => {
    it('should render header with "Project Agent" title when agents exist', () => {
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [mockProjectAgent1]);
      setAgentsInStores(agents);

      render(<ProjectAgentPanel />);
      expect(screen.getByText('Project Agent')).toBeInTheDocument();
    });

    it('should render panel even when no project agents exist (always visible)', () => {
      // project-agent-panel-always-visible feature: 0件でもパネルを表示
      render(<ProjectAgentPanel />);
      expect(screen.getByTestId('project-agent-panel')).toBeInTheDocument();
    });

    it('should display empty state message when no project agents exist', () => {
      // project-agent-panel-always-visible feature: 0件時に空状態メッセージを表示
      render(<ProjectAgentPanel />);
      expect(screen.getByText('プロジェクトエージェントなし')).toBeInTheDocument();
    });

    it('should hide empty state message when agents exist', () => {
      // project-agent-panel-always-visible feature: エージェントがある場合は空状態メッセージを非表示
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [mockProjectAgent1]);
      setAgentsInStores(agents);

      render(<ProjectAgentPanel />);
      expect(screen.queryByText('プロジェクトエージェントなし')).not.toBeInTheDocument();
    });

    it('should render panel when project agents exist', () => {
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [mockProjectAgent1]);
      setAgentsInStores(agents);

      render(<ProjectAgentPanel />);
      expect(screen.getByTestId('project-agent-panel')).toBeInTheDocument();
    });

    it('should display all project agents', () => {
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [mockProjectAgent1, mockProjectAgent2]);
      setAgentsInStores(agents);

      render(<ProjectAgentPanel />);
      expect(screen.getByText('steering')).toBeInTheDocument();
      expect(screen.getByText('bug-fix')).toBeInTheDocument();
    });

    it('should display agent count badge', () => {
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [mockProjectAgent1, mockProjectAgent2, mockProjectAgent3]);
      setAgentsInStores(agents);

      render(<ProjectAgentPanel />);
      expect(screen.getByText('(3)')).toBeInTheDocument();
    });

    it('should display status icon for running agent', () => {
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [mockProjectAgent1]); // status: running
      setAgentsInStores(agents);

      render(<ProjectAgentPanel />);
      expect(screen.getByText('実行中')).toBeInTheDocument();
    });

    it('should display status icon for completed agent', () => {
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [mockProjectAgent2]); // status: completed
      setAgentsInStores(agents);

      render(<ProjectAgentPanel />);
      expect(screen.getByText('完了')).toBeInTheDocument();
    });

    it('should display status icon for failed agent', () => {
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [mockProjectAgent3]); // status: failed
      setAgentsInStores(agents);

      render(<ProjectAgentPanel />);
      expect(screen.getByText('失敗')).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 4.3: プロジェクトエージェントの操作機能
  // Requirements: 4.4, 4.6
  // ============================================================
  describe('Task 4.3: Project agent interactions', () => {
    it('should select agent when clicked', async () => {
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [mockProjectAgent1]);
      setAgentsInStores(agents);

      render(<ProjectAgentPanel />);

      const agentItem = screen.getByTestId('project-agent-item-project-1');
      fireEvent.click(agentItem);

      // selectAgentが呼ばれて、selectedAgentIdが更新される
      expect(useAgentStore.getState().selectedAgentId).toBe('project-1');
    });

    it('should highlight selected agent', () => {
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [mockProjectAgent1, mockProjectAgent2]);
      setAgentsInStores(agents);
      useAgentStore.setState({ selectedAgentId: 'project-1' });

      render(<ProjectAgentPanel />);

      const selectedItem = screen.getByTestId('project-agent-item-project-1');
      expect(selectedItem).toHaveClass('bg-blue-50');
    });

    it('should show stop button for running agent', () => {
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [mockProjectAgent1]); // status: running
      setAgentsInStores(agents);

      render(<ProjectAgentPanel />);
      expect(screen.getByRole('button', { name: /停止/i })).toBeInTheDocument();
    });

    it('should not show stop button for completed agent', () => {
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [mockProjectAgent2]); // status: completed
      setAgentsInStores(agents);

      render(<ProjectAgentPanel />);
      expect(screen.queryByRole('button', { name: /停止/i })).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // Ask button functionality (agent-ask-execution)
  // Requirements: 1.1, 1.3, 1.5
  // ============================================================
  describe('Ask button functionality', () => {
    it('should display Ask button in header (Requirement 1.1)', () => {
      render(<ProjectAgentPanel />);

      const askButton = screen.getByTestId('project-ask-button');
      expect(askButton).toBeInTheDocument();
    });

    it('should disable Ask button when no project is selected (Requirement 1.3)', () => {
      // currentProject is undefined by default in mock
      render(<ProjectAgentPanel />);

      const askButton = screen.getByTestId('project-ask-button');
      expect(askButton).toBeDisabled();
    });

    it('should open AskAgentDialog when Ask button is clicked (Requirement 1.5)', async () => {
      // Mock currentProject to enable button
      const { useProjectStore } = await import('../stores');
      useProjectStore.setState({ currentProject: '/test/project' });

      render(<ProjectAgentPanel />);

      const askButton = screen.getByTestId('project-ask-button');
      fireEvent.click(askButton);

      // Dialog should be visible
      expect(screen.getByTestId('ask-agent-dialog')).toBeInTheDocument();
      // Check dialog title contains "Project Agent - Ask"
      expect(screen.getByText(/Project Agent - Ask/)).toBeInTheDocument();
    });
  });
});
