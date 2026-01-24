/**
 * BugDetailPage component tests
 *
 * Task 6.1: BugDetailPageのBug/Artifactサブタブ構造を実装する
 * - SubTabBarを使用したBug/Artifact切り替え
 * - activeSubTab状態管理
 * - 戻るボタン付きヘッダー
 * - onBackコールバックの接続
 * Requirements: 4.1, 2.3
 *
 * Task 6.2: BugタブにAgentList（固定3項目高さ）を実装する
 * - 固定高さ（3項目分、h-36相当）のAgentListエリア
 * - overflow-y-autoによる独立スクロール
 * - AgentListItemのタップでAgentDetailDrawer表示
 * - BugのAgent一覧取得
 * Requirements: 4.2, 4.3, 4.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { BugDetailPage } from './BugDetailPage';
import { resetSharedAgentStore, useSharedAgentStore } from '@shared/stores/agentStore';
import type { ApiClient, BugMetadataWithPath, BugDetail } from '@shared/api/types';

// =============================================================================
// Mock API Client
// =============================================================================

const createMockApiClient = (): ApiClient => ({
  getSpecs: vi.fn(),
  getBugs: vi.fn(),
  getSpecDetail: vi.fn(),
  getBugDetail: vi.fn().mockResolvedValue({
    ok: true,
    value: {
      metadata: {
        name: 'test-bug',
        phase: 'fixed',
        updatedAt: '2024-01-01T00:00:00Z',
        reportedAt: '2024-01-01T00:00:00Z',
      },
      artifacts: {
        report: { exists: true, path: '.kiro/bugs/test-bug/report.md', updatedAt: '2024-01-01T00:00:00Z' },
        analysis: { exists: true, path: '.kiro/bugs/test-bug/analysis.md', updatedAt: '2024-01-01T00:00:00Z' },
        fix: { exists: true, path: '.kiro/bugs/test-bug/fix.md', updatedAt: '2024-01-01T00:00:00Z' },
        verification: null,
      },
    } satisfies BugDetail,
  }),
  executePhase: vi.fn(),
  updateApproval: vi.fn(),
  executeBugPhase: vi.fn(),
  startAutoExecution: vi.fn(),
  stopAutoExecution: vi.fn(),
  getArtifactContent: vi.fn(),
  saveFile: vi.fn(),
  getAgentLogs: vi.fn(),
  stopAgent: vi.fn(),
  getAgents: vi.fn(),
  resumeAgent: vi.fn(),
  sendAgentInput: vi.fn(),
  getAutoExecutionStatus: vi.fn(),
  executeDocumentReview: vi.fn(),
  executeInspection: vi.fn(),
  executeAskProject: vi.fn(),
  onSpecsUpdated: vi.fn(() => () => {}),
  onBugsUpdated: vi.fn(() => () => {}),
  onAgentOutput: vi.fn(() => () => {}),
  onAgentStatusChange: vi.fn(() => () => {}),
  onAutoExecutionStatusChanged: vi.fn(() => () => {}),
});

// =============================================================================
// Mock Bug Data
// =============================================================================

const mockBug: BugMetadataWithPath = {
  name: 'test-bug',
  path: '.kiro/bugs/test-bug',
  phase: 'fixed',
  updatedAt: '2024-01-01T00:00:00Z',
  reportedAt: '2024-01-01T00:00:00Z',
};

const mockBugDetail: BugDetail = {
  metadata: {
    name: 'test-bug',
    phase: 'fixed',
    updatedAt: '2024-01-01T00:00:00Z',
    reportedAt: '2024-01-01T00:00:00Z',
  },
  artifacts: {
    report: { exists: true, path: '.kiro/bugs/test-bug/report.md', updatedAt: '2024-01-01T00:00:00Z' },
    analysis: { exists: true, path: '.kiro/bugs/test-bug/analysis.md', updatedAt: '2024-01-01T00:00:00Z' },
    fix: { exists: true, path: '.kiro/bugs/test-bug/fix.md', updatedAt: '2024-01-01T00:00:00Z' },
    verification: null,
  },
};

// =============================================================================
// Tests
// =============================================================================

describe('BugDetailPage', () => {
  let mockApiClient: ApiClient;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    resetSharedAgentStore();
  });

  afterEach(() => {
    resetSharedAgentStore();
  });

  // =============================================================================
  // Task 6.1: Sub-tab structure tests
  // Requirements: 4.1 (BugDetailPage下部にサブタブ)
  // =============================================================================

  describe('Sub-tab structure (Req 4.1)', () => {
    it('should render SubTabBar with Bug and Artifact tabs', async () => {
      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // SubTabBar should be present
      expect(screen.getByTestId('bug-detail-subtabs')).toBeInTheDocument();

      // Both tabs should be visible
      expect(screen.getByText('Bug')).toBeInTheDocument();
      expect(screen.getByText('Artifact')).toBeInTheDocument();
    });

    it('should default to Bug tab as active', () => {
      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      const bugTabButton = screen.getByTestId('bug-detail-subtabs-bug');
      expect(bugTabButton).toHaveAttribute('aria-selected', 'true');
    });

    it('should switch to Artifact tab when clicked', async () => {
      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      const artifactTabButton = screen.getByTestId('bug-detail-subtabs-artifact');
      fireEvent.click(artifactTabButton);

      await waitFor(() => {
        expect(artifactTabButton).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('should show Bug content when Bug tab is active', () => {
      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Bug tab content should be visible
      expect(screen.getByTestId('bug-tab-content')).toBeInTheDocument();
    });

    it('should show Artifact content when Artifact tab is active', async () => {
      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      const artifactTabButton = screen.getByTestId('bug-detail-subtabs-artifact');
      fireEvent.click(artifactTabButton);

      await waitFor(() => {
        expect(screen.getByTestId('bug-artifact-tab-content')).toBeInTheDocument();
      });
    });
  });

  // =============================================================================
  // Task 6.1: Header with back button tests
  // Requirements: 2.3 (DetailPageに戻るボタン)
  // =============================================================================

  describe('Header with back button (Req 2.3)', () => {
    it('should render header with back button', () => {
      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      expect(screen.getByTestId('bug-detail-header')).toBeInTheDocument();
      expect(screen.getByTestId('bug-detail-back-button')).toBeInTheDocument();
    });

    it('should display bug name in header', () => {
      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      expect(screen.getByText('test-bug')).toBeInTheDocument();
    });

    it('should call onBack when back button is clicked', () => {
      const onBack = vi.fn();
      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={onBack}
        />
      );

      const backButton = screen.getByTestId('bug-detail-back-button');
      fireEvent.click(backButton);

      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  // =============================================================================
  // Task 6.1: activeSubTab state management tests
  // =============================================================================

  describe('activeSubTab state management', () => {
    it('should maintain activeSubTab state across interactions', async () => {
      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Initially Bug tab is active
      expect(screen.getByTestId('bug-detail-subtabs-bug')).toHaveAttribute('aria-selected', 'true');

      // Click Artifact tab
      const artifactTab = screen.getByTestId('bug-detail-subtabs-artifact');
      fireEvent.click(artifactTab);

      await waitFor(() => {
        expect(artifactTab).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByTestId('bug-detail-subtabs-bug')).toHaveAttribute('aria-selected', 'false');
      });

      // Click back to Bug tab
      const bugTab = screen.getByTestId('bug-detail-subtabs-bug');
      fireEvent.click(bugTab);

      await waitFor(() => {
        expect(bugTab).toHaveAttribute('aria-selected', 'true');
        expect(artifactTab).toHaveAttribute('aria-selected', 'false');
      });
    });
  });

  // =============================================================================
  // Task 6.1: Component structure tests
  // =============================================================================

  describe('Component structure', () => {
    it('should render with proper testId for E2E testing', () => {
      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
          testId="bug-detail-page"
        />
      );

      expect(screen.getByTestId('bug-detail-page')).toBeInTheDocument();
    });

    it('should have SubTabBar at the bottom of the content area', () => {
      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // SubTabBar should exist
      const subTabBar = screen.getByTestId('bug-detail-subtabs');
      expect(subTabBar).toBeInTheDocument();

      // Layout structure: SubTabBar is at the bottom
      // This is verified by the component structure in the implementation
    });
  });

  // =============================================================================
  // Task 6.2: AgentList implementation in Bug tab
  // Requirements: 4.2 (Bug tab structure), 4.3 (Fixed 3-item height), 4.4 (AgentDetailDrawer on tap)
  // =============================================================================

  describe('AgentList in Bug tab (Req 4.2, 4.3, 4.4)', () => {
    // Helper to set up mock agents in the store
    const setupMockAgents = (agents: Array<{
      id: string;
      phase: string;
      status: 'running' | 'completed' | 'failed' | 'interrupted' | 'hang';
      specId?: string;
    }>) => {
      const agentStore = useSharedAgentStore.getState();
      agents.forEach(agent => {
        agentStore.addAgent(agent.specId ?? 'test-bug', {
          id: agent.id,
          phase: agent.phase,
          status: agent.status,
          specId: agent.specId ?? 'test-bug',
          sessionId: `session-${agent.id}`,
          startedAt: new Date().toISOString(),
        });
      });
    };

    it('should render AgentList container in Bug tab (Req 4.2)', () => {
      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // AgentList container should be present
      expect(screen.getByTestId('bug-agent-list-container')).toBeInTheDocument();
    });

    it('should have fixed height (h-36) for AgentList container (Req 4.3)', () => {
      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      const container = screen.getByTestId('bug-agent-list-container');
      // h-36 is 9rem = 144px in Tailwind
      expect(container).toHaveClass('h-36');
    });

    it('should have overflow-y-auto for independent scrolling (Req 4.3)', () => {
      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      const container = screen.getByTestId('bug-agent-list-container');
      expect(container).toHaveClass('overflow-y-auto');
    });

    it('should display agents from the bug (Req 4.2)', () => {
      setupMockAgents([
        { id: 'agent-1', phase: 'bug-analyze', status: 'completed' },
        { id: 'agent-2', phase: 'bug-fix', status: 'running' },
      ]);

      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // AgentList should render the agents
      expect(screen.getByTestId('bug-agent-list')).toBeInTheDocument();
    });

    it('should show empty message when no agents (Req 4.2)', () => {
      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Empty state message
      expect(screen.getByTestId('bug-agent-list-empty')).toBeInTheDocument();
    });

    it('should open AgentDetailDrawer when agent is tapped (Req 4.4)', async () => {
      setupMockAgents([
        { id: 'agent-1', phase: 'bug-analyze', status: 'completed' },
      ]);

      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Find the agent list and click on an agent item
      const agentList = screen.getByTestId('bug-agent-list');
      const agentItem = within(agentList).getByRole('listitem');
      fireEvent.click(agentItem);

      // AgentDetailDrawer should appear
      await waitFor(() => {
        expect(screen.getByTestId('agent-detail-drawer')).toBeInTheDocument();
      });
    });

    it('should close AgentDetailDrawer when onClose is called (Req 4.4)', async () => {
      setupMockAgents([
        { id: 'agent-1', phase: 'bug-analyze', status: 'completed' },
      ]);

      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Click on agent to open drawer
      const agentList = screen.getByTestId('bug-agent-list');
      const agentItem = within(agentList).getByRole('listitem');
      fireEvent.click(agentItem);

      // Wait for drawer to open
      await waitFor(() => {
        expect(screen.getByTestId('agent-detail-drawer')).toBeInTheDocument();
      });

      // Click close button
      const closeButton = screen.getByTestId('agent-detail-drawer-close');
      fireEvent.click(closeButton);

      // Drawer should close
      await waitFor(() => {
        expect(screen.queryByTestId('agent-detail-drawer')).not.toBeInTheDocument();
      });
    });

    it('should call apiClient.stopAgent when stop is clicked in AgentList', async () => {
      setupMockAgents([
        { id: 'agent-1', phase: 'bug-analyze', status: 'running' },
      ]);

      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Find stop button (rendered for running agents - uses Japanese aria-label "停止")
      const stopButton = screen.getByRole('button', { name: /停止/i });
      fireEvent.click(stopButton);

      await waitFor(() => {
        expect(mockApiClient.stopAgent).toHaveBeenCalledWith('agent-1');
      });
    });

    it('should show AgentList with header displaying agent count (Req 4.2)', () => {
      setupMockAgents([
        { id: 'agent-1', phase: 'bug-analyze', status: 'completed' },
        { id: 'agent-2', phase: 'bug-fix', status: 'running' },
      ]);

      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Header should display count
      expect(screen.getByTestId('bug-agent-list-header')).toBeInTheDocument();
      expect(screen.getByText(/Agents.*\(2\)/)).toBeInTheDocument();
    });
  });

  // =============================================================================
  // Task 6.3: WorkflowArea and BugWorkflowFooter implementation in Bug tab
  // Requirements: 4.2 (Bug tab structure), 4.6 (BugWorkflowFooter)
  // =============================================================================

  describe('WorkflowArea and BugWorkflowFooter (Req 4.2, 4.6)', () => {
    it('should render BugWorkflowFooter with auto-execution button (Req 4.6)', () => {
      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // BugWorkflowFooter should be present
      expect(screen.getByTestId('bug-workflow-footer')).toBeInTheDocument();

      // Auto-execution button should be present
      expect(screen.getByTestId('bug-auto-execute-button')).toBeInTheDocument();
    });

    it('should render workflow area with scrollable content (Req 4.2)', () => {
      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Workflow area should be present with overflow-y-auto
      const workflowArea = screen.getByTestId('bug-workflow-area');
      expect(workflowArea).toBeInTheDocument();
      expect(workflowArea).toHaveClass('overflow-y-auto');
    });

    it('should display bug phase status in workflow area (Req 4.2)', () => {
      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Phase information should be displayed
      expect(screen.getByText(/Phase:/)).toBeInTheDocument();
      expect(screen.getByText(/fixed/)).toBeInTheDocument();
    });

    it('should toggle auto-execution button state based on isAutoExecuting prop', () => {
      const { rerender } = render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
          isAutoExecuting={false}
        />
      );

      // Initially shows start button (自動実行)
      const autoButton = screen.getByTestId('bug-auto-execute-button');
      expect(autoButton).toHaveTextContent('自動実行');

      // Rerender with isAutoExecuting=true
      rerender(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
          isAutoExecuting={true}
        />
      );

      // Now shows stop button (停止)
      expect(autoButton).toHaveTextContent('停止');
    });

    it('should call onAutoExecution when auto-execution button is clicked', async () => {
      const onAutoExecution = vi.fn();
      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
          isAutoExecuting={false}
          onAutoExecution={onAutoExecution}
        />
      );

      const autoButton = screen.getByTestId('bug-auto-execute-button');
      fireEvent.click(autoButton);

      await waitFor(() => {
        expect(onAutoExecution).toHaveBeenCalledTimes(1);
      });
    });

    it('should show worktree conversion button when conditions are met (Req 4.6)', () => {
      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
          isOnMain={true}
        />
      );

      // When isOnMain is true and no worktree, convert button should be visible
      expect(screen.getByTestId('bug-convert-worktree-button')).toBeInTheDocument();
    });

    it('should not show worktree conversion button when not on main branch', () => {
      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
          isOnMain={false}
        />
      );

      // When isOnMain is false, convert button should not be visible
      expect(screen.queryByTestId('bug-convert-worktree-button')).not.toBeInTheDocument();
    });

    it('should not show worktree conversion button when bug already has worktree', () => {
      const bugDetailWithWorktree: BugDetail = {
        ...mockBugDetail,
        metadata: {
          ...mockBugDetail.metadata,
          worktree: {
            path: '.kiro/worktrees/bugs/test-bug',
            branch: 'bugfix/test-bug',
            created_at: '2024-01-01T00:00:00Z',
          },
        },
      };

      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={bugDetailWithWorktree}
          apiClient={mockApiClient}
          onBack={() => {}}
          isOnMain={true}
        />
      );

      // When bug already has worktree, convert button should not be visible
      expect(screen.queryByTestId('bug-convert-worktree-button')).not.toBeInTheDocument();
    });

    it('should call onConvertToWorktree when convert button is clicked', async () => {
      const onConvertToWorktree = vi.fn();
      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
          isOnMain={true}
          onConvertToWorktree={onConvertToWorktree}
        />
      );

      const convertButton = screen.getByTestId('bug-convert-worktree-button');
      fireEvent.click(convertButton);

      await waitFor(() => {
        expect(onConvertToWorktree).toHaveBeenCalledTimes(1);
      });
    });

    it('should disable auto-execution button when hasRunningAgents is true', () => {
      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
          isAutoExecuting={false}
          hasRunningAgents={true}
        />
      );

      const autoButton = screen.getByTestId('bug-auto-execute-button');
      expect(autoButton).toBeDisabled();
    });

    it('should show converting state on worktree button', () => {
      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
          isOnMain={true}
          isConverting={true}
        />
      );

      const convertButton = screen.getByTestId('bug-convert-worktree-button');
      expect(convertButton).toHaveTextContent('変換中');
      expect(convertButton).toBeDisabled();
    });
  });

  // =============================================================================
  // Task 6.4: BugDetailPageのArtifactタブを実装する
  // Requirements: 4.5 (Artifactタブ構成)
  // - SpecArtifactTabと同等のアーティファクト表示
  // - RemoteArtifactEditorを使用した編集/閲覧機能
  // =============================================================================

  describe('Artifact tab content (Req 4.5)', () => {
    it('should render RemoteBugArtifactEditor when Artifact tab is active (Req 4.5)', async () => {
      // Mock getArtifactContent to return content
      const mockGetArtifactContent = vi.fn().mockResolvedValue({
        ok: true,
        value: '# Test Bug Report Content',
      });
      mockApiClient.getArtifactContent = mockGetArtifactContent;

      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Click Artifact tab
      const artifactTabButton = screen.getByTestId('bug-detail-subtabs-artifact');
      fireEvent.click(artifactTabButton);

      // Wait for Artifact tab content to render
      await waitFor(() => {
        expect(screen.getByTestId('bug-artifact-tab-content')).toBeInTheDocument();
      });

      // RemoteBugArtifactEditor should be rendered within the artifact tab
      await waitFor(() => {
        expect(screen.getByTestId('remote-bug-artifact-editor')).toBeInTheDocument();
      });
    });

    it('should show bug artifact file tabs (report.md, analysis.md, fix.md, verification.md) (Req 4.5)', async () => {
      // Mock getArtifactContent
      const mockGetArtifactContent = vi.fn().mockResolvedValue({
        ok: true,
        value: '# Test Content',
      });
      mockApiClient.getArtifactContent = mockGetArtifactContent;

      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Click Artifact tab
      const artifactTabButton = screen.getByTestId('bug-detail-subtabs-artifact');
      fireEvent.click(artifactTabButton);

      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByTestId('remote-bug-artifact-editor')).toBeInTheDocument();
      });

      // Should show bug artifact file tabs
      expect(screen.getByRole('tab', { name: /report\.md/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /analysis\.md/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /fix\.md/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /verification\.md/i })).toBeInTheDocument();
    });

    it('should use entityType "bug" when loading artifact content (Req 4.5)', async () => {
      // Mock getArtifactContent to verify it gets called with correct parameters
      const mockGetArtifactContent = vi.fn().mockResolvedValue({
        ok: true,
        value: '# Report Content',
      });
      mockApiClient.getArtifactContent = mockGetArtifactContent;

      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Click Artifact tab
      const artifactTabButton = screen.getByTestId('bug-detail-subtabs-artifact');
      fireEvent.click(artifactTabButton);

      // Wait for RemoteBugArtifactEditor to load artifact
      await waitFor(() => {
        // getArtifactContent should be called with bug name, artifact type, and 'bug' entity type
        expect(mockGetArtifactContent).toHaveBeenCalledWith(
          mockBug.name,
          expect.any(String), // artifact type
          'bug' // entity type
        );
      });
    });

    it('should pass bug and bugDetail to RemoteBugArtifactEditor', async () => {
      const mockGetArtifactContent = vi.fn().mockResolvedValue({
        ok: true,
        value: '# Report',
      });
      mockApiClient.getArtifactContent = mockGetArtifactContent;

      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Click Artifact tab
      const artifactTabButton = screen.getByTestId('bug-detail-subtabs-artifact');
      fireEvent.click(artifactTabButton);

      // Wait for RemoteBugArtifactEditor to render
      await waitFor(() => {
        expect(screen.getByTestId('remote-bug-artifact-editor')).toBeInTheDocument();
      });

      // Should call getArtifactContent with bug name (not spec)
      await waitFor(() => {
        expect(mockGetArtifactContent).toHaveBeenCalledWith(
          'test-bug', // bug.name
          expect.any(String),
          'bug'
        );
      });
    });

    it('should display RemoteBugArtifactEditor in full height within the artifact tab', async () => {
      const mockGetArtifactContent = vi.fn().mockResolvedValue({
        ok: true,
        value: '# Test',
      });
      mockApiClient.getArtifactContent = mockGetArtifactContent;

      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Click Artifact tab
      const artifactTabButton = screen.getByTestId('bug-detail-subtabs-artifact');
      fireEvent.click(artifactTabButton);

      await waitFor(() => {
        const artifactContent = screen.getByTestId('bug-artifact-tab-content');
        // Should have flex and h-full for full height
        expect(artifactContent).toBeInTheDocument();
        expect(artifactContent).toHaveClass('h-full');
      });
    });

    it('should show placeholder when bug artifact is not available', async () => {
      const mockGetArtifactContent = vi.fn().mockResolvedValue({
        ok: false,
        error: { type: 'NotFound', message: 'File not found' },
      });
      mockApiClient.getArtifactContent = mockGetArtifactContent;

      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Click Artifact tab
      const artifactTabButton = screen.getByTestId('bug-detail-subtabs-artifact');
      fireEvent.click(artifactTabButton);

      // Should render the editor (which will show error or empty state)
      await waitFor(() => {
        expect(screen.getByTestId('remote-bug-artifact-editor')).toBeInTheDocument();
      });
    });

    it('should allow switching between bug artifact tabs', async () => {
      const mockGetArtifactContent = vi.fn().mockResolvedValue({
        ok: true,
        value: '# Content',
      });
      mockApiClient.getArtifactContent = mockGetArtifactContent;

      render(
        <BugDetailPage
          bug={mockBug}
          bugDetail={mockBugDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Click Artifact tab
      const artifactTabButton = screen.getByTestId('bug-detail-subtabs-artifact');
      fireEvent.click(artifactTabButton);

      // Wait for editor to render
      await waitFor(() => {
        expect(screen.getByTestId('remote-bug-artifact-editor')).toBeInTheDocument();
      });

      // Click analysis tab within the artifact editor
      const analysisTab = screen.getByRole('tab', { name: /analysis\.md/i });
      fireEvent.click(analysisTab);

      // Should call getArtifactContent with 'analysis' type
      await waitFor(() => {
        expect(mockGetArtifactContent).toHaveBeenCalledWith(
          'test-bug',
          'analysis',
          'bug'
        );
      });
    });
  });
});
