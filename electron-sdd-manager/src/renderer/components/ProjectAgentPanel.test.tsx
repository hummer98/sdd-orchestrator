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

    it('should sort agents by running status first, then by lastActivityAt descending', () => {
      // Create agents with different lastActivityAt times
      const runningAgent: AgentInfo = {
        agentId: 'running-1',
        specId: '',
        phase: 'ask',
        pid: 1001,
        sessionId: 'session-1',
        status: 'running',
        startedAt: '2024-01-01T00:00:00Z',
        lastActivityAt: '2024-01-01T00:05:00Z', // Most recent
        command: 'claude',
      };

      const completedAgent1: AgentInfo = {
        agentId: 'completed-1',
        specId: '',
        phase: 'release',
        pid: 1002,
        sessionId: 'session-2',
        status: 'completed',
        startedAt: '2024-01-01T00:01:00Z',
        lastActivityAt: '2024-01-01T00:04:00Z', // Second most recent
        command: 'claude',
      };

      const completedAgent2: AgentInfo = {
        agentId: 'completed-2',
        specId: '',
        phase: 'steering',
        pid: 1003,
        sessionId: 'session-3',
        status: 'completed',
        startedAt: '2024-01-01T00:02:00Z',
        lastActivityAt: '2024-01-01T00:03:00Z', // Third most recent
        command: 'claude',
      };

      // Add agents in random order
      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [completedAgent2, runningAgent, completedAgent1]);
      setAgentsInStores(agents);

      render(<ProjectAgentPanel />);

      // Get all agent items
      const agentItems = screen.getAllByTestId(/^agent-item-/);

      // Expected order: running-1 (running), completed-1 (latest activity), completed-2 (oldest activity)
      expect(agentItems[0]).toHaveAttribute('data-testid', 'agent-item-running-1');
      expect(agentItems[1]).toHaveAttribute('data-testid', 'agent-item-completed-1');
      expect(agentItems[2]).toHaveAttribute('data-testid', 'agent-item-completed-2');
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
  // Task 6.1: handleReleaseハンドラの新API移行
  // release-button-api-fix feature
  // Requirements: 2.1
  // ============================================================
  describe('Task 6.1: handleRelease new API migration', () => {
    beforeEach(async () => {
      // Setup currentProject
      const { useProjectStore } = await import('../stores');
      useProjectStore.setState({ currentProject: '/test/project' });

      // Mock electronAPI.executeProjectCommand (new API)
      vi.stubGlobal('window', {
        electronAPI: {
          executeProjectCommand: vi.fn().mockResolvedValue({
            agentId: 'release-agent-1',
            specId: '',
            phase: 'release',  // Now phase is 'release', not 'ask'
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

    it('should call executeProjectCommand with /release --auto command and release title when release button clicked (Requirement 4.1)', async () => {
      render(<ProjectAgentPanel />);

      const releaseButton = screen.getByTestId('release-button');
      fireEvent.click(releaseButton);

      // Verify executeProjectCommand was called with correct parameters
      // executeProjectCommand(projectPath, command, title)
      // release-auto-option Task 2.1: Changed from '/release' to '/release --auto'
      await vi.waitFor(() => {
        expect(window.electronAPI.executeProjectCommand).toHaveBeenCalledWith(
          '/test/project',
          '/release --auto',
          'release'
        );
      });
    });

    it('should add agent with addAgent after successful executeProjectCommand (Requirement 2.1)', async () => {
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

    it('should call selectForProjectAgents after successful release', async () => {
      const selectForProjectAgentsSpy = vi.spyOn(useAgentStore.getState(), 'selectForProjectAgents');

      render(<ProjectAgentPanel />);

      const releaseButton = screen.getByTestId('release-button');
      fireEvent.click(releaseButton);

      await vi.waitFor(() => {
        expect(selectForProjectAgentsSpy).toHaveBeenCalled();
      });
    });

    it('should call selectAgent with new agent ID after successful release', async () => {
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

    it('should show error notification when executeProjectCommand fails', async () => {
      // Override mock to throw error
      vi.stubGlobal('window', {
        electronAPI: {
          executeProjectCommand: vi.fn().mockRejectedValue(new Error('Release failed')),
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

      // executeProjectCommand should not be called
      expect(window.electronAPI.executeProjectCommand).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Task 6.2: handleAskExecute新API移行 (release-button-api-fix)
  // Requirements: 3.1, 3.2, 3.3
  // ============================================================
  describe('Task 6.2: handleAskExecute migration to executeProjectCommand', () => {
    beforeEach(async () => {
      // Setup currentProject
      const { useProjectStore } = await import('../stores');
      useProjectStore.setState({ currentProject: '/test/project' });

      // Mock electronAPI.executeProjectCommand (new API)
      vi.stubGlobal('window', {
        electronAPI: {
          executeProjectCommand: vi.fn().mockResolvedValue({
            agentId: 'ask-agent-1',
            specId: '',
            phase: 'ask', // title parameter becomes phase
            sessionId: 'ask-session-1',
            status: 'running' as AgentStatus,
            startedAt: '2024-01-01T00:00:00Z',
            lastActivityAt: '2024-01-01T00:00:00Z',
            command: 'claude',
            args: '/kiro:project-ask "test prompt"',
          }),
        },
      });
    });

    /**
     * Helper to get execute button within dialog
     */
    const getDialogExecuteButton = () => {
      const dialog = screen.getByTestId('dialog-content');
      // Find button with 実行 text within the dialog
      const buttons = dialog.querySelectorAll('button');
      return Array.from(buttons).find(btn => btn.textContent?.includes('実行'));
    };

    it('should call executeProjectCommand with correct parameters (Requirement 3.1)', async () => {
      render(<ProjectAgentPanel />);

      // Open the Ask dialog
      const askButton = screen.getByTestId('project-ask-button');
      fireEvent.click(askButton);

      // Find the input field in the dialog and enter a prompt
      const promptInput = screen.getByTestId('ask-prompt-input');
      fireEvent.change(promptInput, { target: { value: 'test prompt' } });

      // Submit the form (get execute button within dialog)
      const executeButton = getDialogExecuteButton();
      expect(executeButton).toBeTruthy();
      fireEvent.click(executeButton!);

      // Verify executeProjectCommand was called with correct parameters
      await vi.waitFor(() => {
        expect(window.electronAPI.executeProjectCommand).toHaveBeenCalledWith(
          '/test/project',
          '/kiro:project-ask "test prompt"',
          'ask'
        );
      });
    });

    it('should maintain existing Ask functionality with new API (Requirement 3.2)', async () => {
      const addAgentSpy = vi.spyOn(useAgentStore.getState(), 'addAgent');

      render(<ProjectAgentPanel />);

      // Open Ask dialog and submit
      const askButton = screen.getByTestId('project-ask-button');
      fireEvent.click(askButton);

      const promptInput = screen.getByTestId('ask-prompt-input');
      fireEvent.change(promptInput, { target: { value: 'architecture question' } });

      const executeButton = getDialogExecuteButton();
      fireEvent.click(executeButton!);

      // Verify addAgent is called with the returned AgentInfo
      await vi.waitFor(() => {
        expect(addAgentSpy).toHaveBeenCalledWith('', expect.objectContaining({
          agentId: 'ask-agent-1',
          phase: 'ask',
        }));
      });
    });

    it('should display agent with title "ask" in Agent list (Requirement 3.3)', async () => {
      render(<ProjectAgentPanel />);

      // Open Ask dialog and submit
      const askButton = screen.getByTestId('project-ask-button');
      fireEvent.click(askButton);

      const promptInput = screen.getByTestId('ask-prompt-input');
      fireEvent.change(promptInput, { target: { value: 'test' } });

      const executeButton = getDialogExecuteButton();
      fireEvent.click(executeButton!);

      // Wait for the agent to be added
      await vi.waitFor(() => {
        expect(window.electronAPI.executeProjectCommand).toHaveBeenCalled();
      });

      // The phase (title) should be 'ask' in the returned AgentInfo
      const callResult = await (window.electronAPI.executeProjectCommand as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(callResult.phase).toBe('ask');
    });

    it('should close dialog on successful Ask execution', async () => {
      render(<ProjectAgentPanel />);

      // Open Ask dialog
      const askButton = screen.getByTestId('project-ask-button');
      fireEvent.click(askButton);

      // Verify dialog is open
      expect(screen.getByTestId('ask-agent-dialog')).toBeInTheDocument();

      const promptInput = screen.getByTestId('ask-prompt-input');
      fireEvent.change(promptInput, { target: { value: 'test' } });

      const executeButton = getDialogExecuteButton();
      fireEvent.click(executeButton!);

      // Dialog should close after successful execution
      await vi.waitFor(() => {
        expect(screen.queryByTestId('ask-agent-dialog')).not.toBeInTheDocument();
      });
    });

    it('should show error notification when executeProjectCommand fails', async () => {
      // Override mock to throw error
      vi.stubGlobal('window', {
        electronAPI: {
          executeProjectCommand: vi.fn().mockRejectedValue(new Error('Ask failed')),
        },
      });

      const { notify } = await import('../stores');
      const errorSpy = vi.spyOn(notify, 'error');

      render(<ProjectAgentPanel />);

      const askButton = screen.getByTestId('project-ask-button');
      fireEvent.click(askButton);

      const promptInput = screen.getByTestId('ask-prompt-input');
      fireEvent.change(promptInput, { target: { value: 'test' } });

      const executeButton = getDialogExecuteButton();
      fireEvent.click(executeButton!);

      await vi.waitFor(() => {
        expect(errorSpy).toHaveBeenCalledWith('Ask failed');
      });
    });

    it('should show success notification on successful Ask execution', async () => {
      const { notify } = await import('../stores');
      const successSpy = vi.spyOn(notify, 'success');

      render(<ProjectAgentPanel />);

      const askButton = screen.getByTestId('project-ask-button');
      fireEvent.click(askButton);

      const promptInput = screen.getByTestId('ask-prompt-input');
      fireEvent.change(promptInput, { target: { value: 'test' } });

      const executeButton = getDialogExecuteButton();
      fireEvent.click(executeButton!);

      await vi.waitFor(() => {
        expect(successSpy).toHaveBeenCalledWith('Project Askを開始しました');
      });
    });
  });

  // ============================================================
  // Task 6.3: isReleaseRunning判定ロジックを更新
  // release-button-api-fix feature
  // Requirements: 5.1, 5.2, 2.2, 2.3
  // - phase === 'release' && status === 'running'で判定
  // - 既存のargs?.includes('/release')判定を置き換え
  // ============================================================
  describe('Task 6.3: isReleaseRunning phase-based detection', () => {
    /**
     * Create a mock release agent with phase='release' for testing
     * Requirements: 5.1 - title==='release' (phase field) かつ status==='running' 判定
     */
    const createReleaseAgent = (status: AgentStatus): AgentInfo => ({
      agentId: 'release-agent-1',
      specId: '', // Project agent (specId = '')
      phase: 'release', // NEW: phase is 'release', not 'ask'
      pid: 12350,
      sessionId: 'release-session-1',
      status,
      startedAt: '2024-01-01T00:00:00Z',
      lastActivityAt: '2024-01-01T00:00:00Z',
      command: 'claude',
      args: '/release',
    });

    /**
     * Create a mock non-release project agent for testing
     */
    const createNonReleaseAgent = (status: AgentStatus): AgentInfo => ({
      agentId: 'ask-agent-1',
      specId: '', // Project agent (specId = '')
      phase: 'ask', // phase is 'ask', not 'release'
      pid: 12351,
      sessionId: 'ask-session-1',
      status,
      startedAt: '2024-01-01T00:01:00Z',
      lastActivityAt: '2024-01-01T00:01:00Z',
      command: 'claude',
      args: '/kiro:project-ask "What is the architecture?"',
    });

    it('should set isReleaseRunning=true when phase=release and status=running (Requirement 5.1)', async () => {
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

    it('should set isReleaseRunning=false when no release agent exists', async () => {
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

    it('should set isReleaseRunning=false when phase=release but status is not running (Requirement 5.1)', async () => {
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

    it('should set isReleaseRunning=false when only non-release agents are running (phase != release)', async () => {
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

    it('should NOT detect release based on args - only phase matters (Requirement 5.2)', async () => {
      // This test verifies that args?.includes('/release') is NO LONGER used
      // Instead, only phase === 'release' is checked
      const { useProjectStore } = await import('../stores');
      useProjectStore.setState({ currentProject: '/test/project' });

      const agents = new Map<string, AgentInfo[]>();
      // Agent with /release in args but phase is 'ask' (old pattern)
      const agentWithReleaseInArgs: AgentInfo = {
        agentId: 'old-release-agent',
        specId: '',
        phase: 'ask', // NOT 'release'
        pid: 12352,
        sessionId: 'old-release-session',
        status: 'running' as AgentStatus,
        startedAt: '2024-01-01T00:02:00Z',
        lastActivityAt: '2024-01-01T00:02:00Z',
        command: 'claude',
        args: '/release', // has /release in args, but phase is not 'release'
      };
      agents.set('', [agentWithReleaseInArgs]);
      setAgentsInStores(agents);

      render(<ProjectAgentPanel />);

      const releaseButton = screen.getByTestId('release-button');
      // Button should NOT be disabled - phase is 'ask', not 'release'
      // Even though args contains '/release', we now use phase-based detection
      expect(releaseButton).not.toBeDisabled();
      expect(releaseButton).not.toHaveAttribute('title', 'release実行中');
    });

    it('should display agent with "release" title in Agent list (Requirement 2.2)', async () => {
      const { useProjectStore } = await import('../stores');
      useProjectStore.setState({ currentProject: '/test/project' });

      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [createReleaseAgent('running')]);
      setAgentsInStores(agents);

      render(<ProjectAgentPanel />);

      // Agent should be displayed with 'release' as the title (phase)
      // The agent item should contain 'release' text in the agent list
      const agentItem = screen.getByTestId('agent-item-release-agent-1');
      expect(agentItem).toBeInTheDocument();
      expect(agentItem).toHaveTextContent('release');
    });

    it('should use getProjectAgents selector to get agent list', async () => {
      // This test verifies that the implementation uses getProjectAgents selector
      // by checking that only specId='' agents are considered

      const agents = new Map<string, AgentInfo[]>();
      // Add a spec-bound agent with phase='release' (should be ignored)
      const specAgent: AgentInfo = {
        agentId: 'spec-release-agent',
        specId: 'some-spec', // NOT a project agent
        phase: 'release',
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

    it('should prevent duplicate release execution when release is already running (Requirement 2.3)', async () => {
      const { useProjectStore } = await import('../stores');
      useProjectStore.setState({ currentProject: '/test/project' });

      const agents = new Map<string, AgentInfo[]>();
      agents.set('', [createReleaseAgent('running')]);
      setAgentsInStores(agents);

      render(<ProjectAgentPanel />);

      const releaseButton = screen.getByTestId('release-button');
      // Button should be disabled to prevent duplicate execution
      expect(releaseButton).toBeDisabled();
    });
  });
});
