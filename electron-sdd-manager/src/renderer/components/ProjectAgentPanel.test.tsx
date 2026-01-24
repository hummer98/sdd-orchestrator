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
        // project-agent-release-footer: Task 2.3 - Include args for release detection
        args: a.args,
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
      // 共通AgentListItemではステータスはtitle属性として表示
      expect(screen.getByTitle('実行中')).toBeInTheDocument();
    });

    it('should display status icon for completed agent', () => {
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [mockProjectAgent2]); // status: completed
      setAgentsInStores(agents);

      render(<ProjectAgentPanel />);
      expect(screen.getByTitle('完了')).toBeInTheDocument();
    });

    it('should display status icon for failed agent', () => {
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [mockProjectAgent3]); // status: failed
      setAgentsInStores(agents);

      render(<ProjectAgentPanel />);
      expect(screen.getByTitle('失敗')).toBeInTheDocument();
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

      const agentItem = screen.getByTestId('agent-item-project-1');
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

      const selectedItem = screen.getByTestId('agent-item-project-1');
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

  // ============================================================
  // Task 2.1: ProjectAgentPanelへのProjectAgentFooter統合
  // project-agent-release-footer feature
  // Requirements: 4.1, 4.2, 4.3
  // ============================================================
  describe('Task 2.1: ProjectAgentFooter integration', () => {
    it('should render ProjectAgentFooter component (Requirement 4.1)', () => {
      render(<ProjectAgentPanel />);
      expect(screen.getByTestId('project-agent-footer')).toBeInTheDocument();
    });

    it('should render release button in footer (Requirement 4.1)', () => {
      render(<ProjectAgentPanel />);
      expect(screen.getByTestId('release-button')).toBeInTheDocument();
    });

    it('should have correct flex layout structure (Requirement 4.3)', () => {
      render(<ProjectAgentPanel />);

      // Panel should have flex column layout
      const panel = screen.getByTestId('project-agent-panel');
      expect(panel).toHaveClass('flex', 'flex-col');

      // Agent list container should have flex-1 and overflow-y-auto for scrollability
      // When empty, the testId is project-agent-list-empty, otherwise project-agent-list
      // We query for either and check their parent
      const agentListEmpty = screen.queryByTestId('project-agent-list-empty');
      const agentListFull = screen.queryByTestId('project-agent-list');
      const agentListElement = agentListEmpty || agentListFull;
      expect(agentListElement).toBeInTheDocument();

      const agentListContainer = agentListElement!.parentElement;
      expect(agentListContainer).toHaveClass('flex-1', 'overflow-y-auto');

      // Footer should have shrink-0 to stay fixed at bottom (not shrink when content overflows)
      const footer = screen.getByTestId('project-agent-footer');
      expect(footer).toHaveClass('shrink-0');
    });

    it('should render footer after agent list (Requirement 4.2)', () => {
      render(<ProjectAgentPanel />);

      const panel = screen.getByTestId('project-agent-panel');

      // When empty, the testId is project-agent-list-empty, otherwise project-agent-list
      const agentListEmpty = screen.queryByTestId('project-agent-list-empty');
      const agentListFull = screen.queryByTestId('project-agent-list');
      const agentListElement = agentListEmpty || agentListFull;
      expect(agentListElement).toBeInTheDocument();

      const agentListContainer = agentListElement!.parentElement;
      const footer = screen.getByTestId('project-agent-footer');

      // Get all children of panel that are element nodes
      const panelChildren = Array.from(panel.children);

      // Find indices - footer should come after agent list
      const agentListIndex = panelChildren.indexOf(agentListContainer!);
      const footerIndex = panelChildren.indexOf(footer);

      expect(footerIndex).toBeGreaterThan(agentListIndex);
    });

    it('should pass placeholder onRelease handler that does nothing', () => {
      render(<ProjectAgentPanel />);

      const releaseButton = screen.getByTestId('release-button');

      // Should not throw when clicked (placeholder handler)
      expect(() => fireEvent.click(releaseButton)).not.toThrow();
    });

    it('should pass isReleaseRunning=false (placeholder for 2.3)', () => {
      render(<ProjectAgentPanel />);

      const releaseButton = screen.getByTestId('release-button');

      // Button should not be disabled due to release running
      // (may be disabled due to no project selected, but not due to release running)
      expect(releaseButton).not.toHaveAttribute('title', 'release実行中');
    });
  });

  // ============================================================
  // Task 2.2: handleReleaseハンドラの実装
  // project-agent-release-footer feature
  // Requirements: 5.1, 5.2, 5.3, 5.4
  // ============================================================
  describe('Task 2.2: handleRelease implementation', () => {
    beforeEach(async () => {
      // Setup currentProject
      const { useProjectStore } = await import('../stores');
      useProjectStore.setState({ currentProject: '/test/project' });

      // Mock electronAPI.executeAskProject
      vi.stubGlobal('window', {
        electronAPI: {
          executeAskProject: vi.fn().mockResolvedValue({
            agentId: 'release-agent-1',
            specId: '',
            phase: 'ask',
            sessionId: 'release-session-1',
            status: 'running' as AgentStatus,
            startedAt: '2024-01-01T00:00:00Z',
            lastActivityAt: '2024-01-01T00:00:00Z',
            command: 'claude',
            args: '/release',
          }),
        },
      });
    });

    it('should call executeAskProject with /release prompt when release button clicked (Requirement 5.1, 5.2)', async () => {
      render(<ProjectAgentPanel />);

      const releaseButton = screen.getByTestId('release-button');
      fireEvent.click(releaseButton);

      // Verify executeAskProject was called with /release
      await vi.waitFor(() => {
        expect(window.electronAPI.executeAskProject).toHaveBeenCalledWith(
          '/test/project',
          '/release'
        );
      });
    });

    it('should add agent with addAgent after successful executeAskProject (Requirement 5.3)', async () => {
      const addAgentSpy = vi.spyOn(useAgentStore.getState(), 'addAgent');

      render(<ProjectAgentPanel />);

      const releaseButton = screen.getByTestId('release-button');
      fireEvent.click(releaseButton);

      // Wait for async operation
      await vi.waitFor(() => {
        expect(addAgentSpy).toHaveBeenCalledWith('', expect.objectContaining({
          agentId: 'release-agent-1',
        }));
      });
    });

    it('should call selectForProjectAgents after successful release (Requirement 5.3)', async () => {
      const selectForProjectAgentsSpy = vi.spyOn(useAgentStore.getState(), 'selectForProjectAgents');

      render(<ProjectAgentPanel />);

      const releaseButton = screen.getByTestId('release-button');
      fireEvent.click(releaseButton);

      await vi.waitFor(() => {
        expect(selectForProjectAgentsSpy).toHaveBeenCalled();
      });
    });

    it('should call selectAgent with new agent ID after successful release (Requirement 5.4)', async () => {
      const selectAgentSpy = vi.spyOn(useAgentStore.getState(), 'selectAgent');

      render(<ProjectAgentPanel />);

      const releaseButton = screen.getByTestId('release-button');
      fireEvent.click(releaseButton);

      await vi.waitFor(() => {
        expect(selectAgentSpy).toHaveBeenCalledWith('release-agent-1');
      });
    });

    it('should show success notification on successful release', async () => {
      const { notify } = await import('../stores');
      const successSpy = vi.spyOn(notify, 'success');

      render(<ProjectAgentPanel />);

      const releaseButton = screen.getByTestId('release-button');
      fireEvent.click(releaseButton);

      await vi.waitFor(() => {
        expect(successSpy).toHaveBeenCalledWith('releaseを開始しました');
      });
    });

    it('should show error notification when executeAskProject fails', async () => {
      // Override mock to throw error
      vi.stubGlobal('window', {
        electronAPI: {
          executeAskProject: vi.fn().mockRejectedValue(new Error('Release failed')),
        },
      });

      const { notify } = await import('../stores');
      const errorSpy = vi.spyOn(notify, 'error');

      render(<ProjectAgentPanel />);

      const releaseButton = screen.getByTestId('release-button');
      fireEvent.click(releaseButton);

      await vi.waitFor(() => {
        expect(errorSpy).toHaveBeenCalledWith('Release failed');
      });
    });

    it('should not execute release when currentProject is null', async () => {
      // Set currentProject to null
      const { useProjectStore } = await import('../stores');
      useProjectStore.setState({ currentProject: null });

      render(<ProjectAgentPanel />);

      const releaseButton = screen.getByTestId('release-button');
      fireEvent.click(releaseButton);

      // executeAskProject should not be called
      expect(window.electronAPI.executeAskProject).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Task 2.3: isReleaseRunning状態の算出ロジック
  // project-agent-release-footer feature
  // Requirements: 6.1, 6.2, 6.3
  // ============================================================
  describe('Task 2.3: isReleaseRunning calculation logic', () => {
    /**
     * Create a mock release agent for testing
     * Requirements: 6.1 - Detect release agents from Project Agent list
     */
    const createReleaseAgent = (status: AgentStatus): AgentInfo => ({
      agentId: 'release-agent-1',
      specId: '', // Project agent (specId = '')
      phase: 'ask',
      pid: 12350,
      sessionId: 'release-session-1',
      status,
      startedAt: '2024-01-01T00:00:00Z',
      lastActivityAt: '2024-01-01T00:00:00Z',
      command: 'claude',
      args: '/release', // args contains /release
    });

    /**
     * Create a mock non-release project agent for testing
     */
    const createNonReleaseAgent = (status: AgentStatus): AgentInfo => ({
      agentId: 'ask-agent-1',
      specId: '', // Project agent (specId = '')
      phase: 'ask',
      pid: 12351,
      sessionId: 'ask-session-1',
      status,
      startedAt: '2024-01-01T00:01:00Z',
      lastActivityAt: '2024-01-01T00:01:00Z',
      command: 'claude',
      args: '/kiro:project-ask "What is the architecture?"',
    });

    it('should set isReleaseRunning=true when a release agent is running (Requirement 6.2)', async () => {
      // Set up currentProject first (needed for proper button state)
      const { useProjectStore } = await import('../stores');
      useProjectStore.setState({ currentProject: '/test/project' });

      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [createReleaseAgent('running')]);
      setAgentsInStores(agents);

      render(<ProjectAgentPanel />);

      const releaseButton = screen.getByTestId('release-button');
      // Button should be disabled when release is running
      expect(releaseButton).toBeDisabled();
      // Tooltip should show "release実行中"
      expect(releaseButton).toHaveAttribute('title', 'release実行中');
    });

    it('should set isReleaseRunning=false when no release agent exists (Requirement 6.1)', async () => {
      const agents = new Map<string, AgentInfo[]>();
      // No agents at all
      setAgentsInStores(agents);

      // Mock currentProject to enable button
      const { useProjectStore } = await import('../stores');
      useProjectStore.setState({ currentProject: '/test/project' });

      render(<ProjectAgentPanel />);

      const releaseButton = screen.getByTestId('release-button');
      // Button should not be disabled due to release running
      expect(releaseButton).not.toBeDisabled();
      expect(releaseButton).not.toHaveAttribute('title', 'release実行中');
    });

    it('should set isReleaseRunning=false when release agent is not running (completed) (Requirement 6.2)', async () => {
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [createReleaseAgent('completed')]);
      setAgentsInStores(agents);

      // Mock currentProject to enable button
      const { useProjectStore } = await import('../stores');
      useProjectStore.setState({ currentProject: '/test/project' });

      render(<ProjectAgentPanel />);

      const releaseButton = screen.getByTestId('release-button');
      // Button should not be disabled - release is completed, not running
      expect(releaseButton).not.toBeDisabled();
      expect(releaseButton).not.toHaveAttribute('title', 'release実行中');
    });

    it('should set isReleaseRunning=false when only non-release agents are running (Requirement 6.1)', async () => {
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [createNonReleaseAgent('running')]);
      setAgentsInStores(agents);

      // Mock currentProject to enable button
      const { useProjectStore } = await import('../stores');
      useProjectStore.setState({ currentProject: '/test/project' });

      render(<ProjectAgentPanel />);

      const releaseButton = screen.getByTestId('release-button');
      // Button should not be disabled - only non-release agent is running
      expect(releaseButton).not.toBeDisabled();
      expect(releaseButton).not.toHaveAttribute('title', 'release実行中');
    });

    it('should detect /release in args even when surrounded by other text (Requirement 6.1)', async () => {
      // Set up currentProject first
      const { useProjectStore } = await import('../stores');
      useProjectStore.setState({ currentProject: '/test/project' });

      const agents = new Map<string, AgentInfo[]>();
      const agentWithRelease: AgentInfo = {
        agentId: 'release-agent-2',
        specId: '',
        phase: 'ask',
        pid: 12352,
        sessionId: 'release-session-2',
        status: 'running' as AgentStatus,
        startedAt: '2024-01-01T00:02:00Z',
        lastActivityAt: '2024-01-01T00:02:00Z',
        command: 'claude',
        args: '/kiro:project-ask "/release"', // /release is within a larger command
      };
      agents.set('', [agentWithRelease]);
      setAgentsInStores(agents);

      render(<ProjectAgentPanel />);

      const releaseButton = screen.getByTestId('release-button');
      // Button should be disabled when release is running
      expect(releaseButton).toBeDisabled();
      expect(releaseButton).toHaveAttribute('title', 'release実行中');
    });

    it('should use getProjectAgents selector to get agent list (Requirement 6.3)', async () => {
      // This test verifies that the implementation uses getProjectAgents selector
      // by checking that only specId='' agents are considered

      const agents = new Map<string, AgentInfo[]>();
      // Add a spec-bound agent with /release in args (should be ignored)
      const specAgent: AgentInfo = {
        agentId: 'spec-release-agent',
        specId: 'some-spec', // NOT a project agent
        phase: 'ask',
        pid: 12353,
        sessionId: 'spec-session',
        status: 'running' as AgentStatus,
        startedAt: '2024-01-01T00:03:00Z',
        lastActivityAt: '2024-01-01T00:03:00Z',
        command: 'claude',
        args: '/release',
      };
      agents.set('some-spec', [specAgent]);
      // No project agents
      agents.set('', []);
      setAgentsInStores(agents);

      // Mock currentProject to enable button
      const { useProjectStore } = await import('../stores');
      useProjectStore.setState({ currentProject: '/test/project' });

      render(<ProjectAgentPanel />);

      const releaseButton = screen.getByTestId('release-button');
      // Button should NOT be disabled - spec-bound agent should be ignored
      expect(releaseButton).not.toBeDisabled();
      expect(releaseButton).not.toHaveAttribute('title', 'release実行中');
    });
  });
});
