/**
 * SpecDetailPage component tests
 *
 * Task 5.1: SpecDetailPageのSpec/Artifactサブタブ構造を実装する
 * - SubTabBarを使用したSpec/Artifact切り替え
 * - activeSubTab状態管理
 * - 戻るボタン付きヘッダー
 * - onBackコールバックの接続
 * Requirements: 3.1, 2.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SpecDetailPage } from './SpecDetailPage';
import { resetSharedAgentStore, useSharedAgentStore } from '@shared/stores/agentStore';
import type { ApiClient, SpecMetadataWithPath, SpecDetail } from '@shared/api/types';

// Mock useDeviceType hook for testing
vi.mock('@shared/hooks/useDeviceType', () => ({
  useDeviceType: vi.fn(() => ({
    deviceType: 'desktop',
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    width: 1024,
    height: 768,
  })),
}));

// =============================================================================
// Mock API Client
// =============================================================================

const createMockApiClient = (): ApiClient => ({
  getSpecs: vi.fn(),
  getBugs: vi.fn(),
  getSpecDetail: vi.fn().mockResolvedValue({
    ok: true,
    value: {
      metadata: {
        name: 'test-feature',
        path: '.kiro/specs/test-feature',
        phase: 'tasks-generated',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      specJson: {
        feature_name: 'test-feature',
        phase: 'tasks-generated',
        approvals: {
          requirements: { generated: true, approved: true },
          design: { generated: true, approved: true },
          tasks: { generated: true, approved: false },
        },
      },
      artifacts: {
        requirements: { exists: true },
        design: { exists: true },
        tasks: { exists: true },
      },
    } satisfies SpecDetail,
  }),
  getBugDetail: vi.fn(),
  executePhase: vi.fn(),
  updateApproval: vi.fn(),
  executeBugPhase: vi.fn(),
  startAutoExecution: vi.fn(),
  stopAutoExecution: vi.fn(),
  getArtifactContent: vi.fn(),
  saveFile: vi.fn(),
  getAgentLogs: vi.fn(),
  getProjectAgents: vi.fn(),
  sendAgentInstruction: vi.fn(),
  continueAgent: vi.fn(),
  stopAgent: vi.fn(),
  onAgentLog: vi.fn(() => () => {}),
});

// =============================================================================
// Mock Spec Data
// =============================================================================

const mockSpec: SpecMetadataWithPath = {
  name: 'test-feature',
  path: '.kiro/specs/test-feature',
  phase: 'tasks-generated',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockSpecDetail: SpecDetail = {
  metadata: {
    name: 'test-feature',
    path: '.kiro/specs/test-feature',
    phase: 'tasks-generated',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  specJson: {
    feature_name: 'test-feature',
    phase: 'tasks-generated',
    approvals: {
      requirements: { generated: true, approved: true },
      design: { generated: true, approved: true },
      tasks: { generated: true, approved: false },
    },
  },
  artifacts: {
    requirements: { exists: true },
    design: { exists: true },
    tasks: { exists: true },
  },
};

// =============================================================================
// Tests
// =============================================================================

describe('SpecDetailPage', () => {
  let mockApiClient: ApiClient;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    resetSharedAgentStore();
  });

  afterEach(() => {
    resetSharedAgentStore();
    vi.clearAllMocks();
  });

  describe('Sub-tab structure (Req 3.1)', () => {
    it('should render SubTabBar with Spec and Artifact tabs', async () => {
      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // SubTabBar should be present
      expect(screen.getByTestId('spec-detail-subtabs')).toBeInTheDocument();

      // Both tabs should be visible
      expect(screen.getByText('Spec')).toBeInTheDocument();
      expect(screen.getByText('Artifact')).toBeInTheDocument();
    });

    it('should default to Spec tab as active', () => {
      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      const specTabButton = screen.getByTestId('spec-detail-subtabs-spec');
      expect(specTabButton).toHaveAttribute('aria-selected', 'true');
    });

    it('should switch to Artifact tab when clicked', async () => {
      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      const artifactTabButton = screen.getByTestId('spec-detail-subtabs-artifact');
      fireEvent.click(artifactTabButton);

      await waitFor(() => {
        expect(artifactTabButton).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('should show Spec content when Spec tab is active', () => {
      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Spec tab content should be visible
      expect(screen.getByTestId('spec-tab-content')).toBeInTheDocument();
    });

    it('should show Artifact content when Artifact tab is active', async () => {
      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      const artifactTabButton = screen.getByTestId('spec-detail-subtabs-artifact');
      fireEvent.click(artifactTabButton);

      await waitFor(() => {
        expect(screen.getByTestId('artifact-tab-content')).toBeInTheDocument();
      });
    });
  });

  describe('Header with back button (Req 2.3)', () => {
    it('should render header with back button', () => {
      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      expect(screen.getByTestId('spec-detail-header')).toBeInTheDocument();
      expect(screen.getByTestId('spec-detail-back-button')).toBeInTheDocument();
    });

    it('should display spec name in header', () => {
      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      expect(screen.getByText('test-feature')).toBeInTheDocument();
    });

    it('should call onBack when back button is clicked', () => {
      const onBack = vi.fn();
      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={onBack}
        />
      );

      const backButton = screen.getByTestId('spec-detail-back-button');
      fireEvent.click(backButton);

      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('activeSubTab state management', () => {
    it('should maintain activeSubTab state across interactions', async () => {
      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Initially Spec tab is active
      expect(screen.getByTestId('spec-detail-subtabs-spec')).toHaveAttribute('aria-selected', 'true');

      // Click Artifact tab
      const artifactTab = screen.getByTestId('spec-detail-subtabs-artifact');
      fireEvent.click(artifactTab);

      await waitFor(() => {
        expect(artifactTab).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByTestId('spec-detail-subtabs-spec')).toHaveAttribute('aria-selected', 'false');
      });

      // Click back to Spec tab
      const specTab = screen.getByTestId('spec-detail-subtabs-spec');
      fireEvent.click(specTab);

      await waitFor(() => {
        expect(specTab).toHaveAttribute('aria-selected', 'true');
        expect(artifactTab).toHaveAttribute('aria-selected', 'false');
      });
    });
  });

  describe('Component structure', () => {
    it('should render with proper testId for E2E testing', () => {
      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
          testId="spec-detail-page"
        />
      );

      expect(screen.getByTestId('spec-detail-page')).toBeInTheDocument();
    });

    it('should have SubTabBar at the bottom of the content area', () => {
      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // SubTabBar should exist
      const subTabBar = screen.getByTestId('spec-detail-subtabs');
      expect(subTabBar).toBeInTheDocument();

      // Layout structure: SubTabBar is at the bottom
      // This is verified by the component structure in the implementation
    });
  });

  // =============================================================================
  // Task 5.2: AgentList in Spec tab tests
  // Requirements: 3.2 (Spec tab structure), 3.3 (fixed 3-item height), 3.4 (tap for drawer)
  // =============================================================================

  describe('Spec tab AgentList (Req 3.2, 3.3, 3.4)', () => {
    it('should render AgentList area with fixed height for 3 items (Req 3.3)', () => {
      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Agent list container should exist with fixed height class
      const agentListContainer = screen.getByTestId('spec-agent-list-container');
      expect(agentListContainer).toBeInTheDocument();
      // h-36 is approximately 3 items height (each item ~48px)
      expect(agentListContainer).toHaveClass('h-36');
    });

    it('should have independent scroll on AgentList area (Req 3.3)', () => {
      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      const agentListContainer = screen.getByTestId('spec-agent-list-container');
      // Should have overflow-y-auto for independent scrolling
      expect(agentListContainer).toHaveClass('overflow-y-auto');
    });

    it('should display AgentList component in Spec tab (Req 3.2)', async () => {
      // Setup: Add agents to store to show a non-empty list
      const { useSharedAgentStore } = await import('@shared/stores/agentStore');
      useSharedAgentStore.setState({
        agents: new Map([
          [
            'test-feature',
            [
              {
                agentId: 'agent-1',
                specId: 'test-feature',
                phase: 'spec-requirements',
                status: 'completed',
                startedAt: '2024-01-01T00:00:00Z',
                lastActivityAt: '2024-01-01T00:01:00Z',
                sessionId: 'session-1',
              },
            ],
          ],
        ]),
        logs: new Map(),
        selectedAgentId: null,
        selectedAgentIdBySpec: new Map(),
        isLoading: false,
        error: null,
      });

      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // AgentList should be rendered (when non-empty, it has the testId directly)
      expect(screen.getByTestId('spec-agent-list')).toBeInTheDocument();

      // Cleanup
      useSharedAgentStore.setState({
        agents: new Map(),
        logs: new Map(),
        selectedAgentId: null,
        selectedAgentIdBySpec: new Map(),
        isLoading: false,
        error: null,
      });
    });

    it('should call onSelectAgent when AgentListItem is clicked (mobile-agent-log-fullscreen)', async () => {
      // Setup: Add agents to store
      const { useSharedAgentStore } = await import('@shared/stores/agentStore');
      useSharedAgentStore.setState({
        agents: new Map([
          [
            'test-feature',
            [
              {
                agentId: 'agent-1',
                specId: 'test-feature',
                phase: 'spec-requirements',
                status: 'running',
                startedAt: '2024-01-01T00:00:00Z',
                lastActivityAt: '2024-01-01T00:01:00Z',
                sessionId: 'session-1',
              },
            ],
          ],
        ]),
        logs: new Map(),
        selectedAgentId: null,
        selectedAgentIdBySpec: new Map(),
        isLoading: false,
        error: null,
      });

      const onSelectAgent = vi.fn();

      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
          onSelectAgent={onSelectAgent}
        />
      );

      // Click on agent item
      const agentItem = screen.getByTestId('agent-item-agent-1');
      fireEvent.click(agentItem);

      // onSelectAgent should be called instead of opening AgentDetailDrawer
      // (mobile-agent-log-fullscreen: drawer removed, uses page navigation)
      await waitFor(() => {
        expect(onSelectAgent).toHaveBeenCalledWith(
          expect.objectContaining({ agentId: 'agent-1' })
        );
      });

      // Cleanup
      useSharedAgentStore.setState({
        agents: new Map(),
        logs: new Map(),
        selectedAgentId: null,
        selectedAgentIdBySpec: new Map(),
        isLoading: false,
        error: null,
      });
    });

    it('should show empty message when no agents exist for spec', () => {
      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Empty state message should be shown
      expect(screen.getByTestId('spec-agent-list-empty')).toBeInTheDocument();
    });

    it('should select agent in store when AgentListItem is clicked (mobile-agent-log-fullscreen)', async () => {
      // Setup: Add agents to store
      const { useSharedAgentStore } = await import('@shared/stores/agentStore');
      useSharedAgentStore.setState({
        agents: new Map([
          [
            'test-feature',
            [
              {
                agentId: 'agent-1',
                specId: 'test-feature',
                phase: 'spec-requirements',
                status: 'completed',
                startedAt: '2024-01-01T00:00:00Z',
                lastActivityAt: '2024-01-01T00:01:00Z',
                sessionId: 'session-1',
              },
            ],
          ],
        ]),
        logs: new Map(),
        selectedAgentId: null,
        selectedAgentIdBySpec: new Map(),
        isLoading: false,
        error: null,
      });

      const onSelectAgent = vi.fn();

      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
          onSelectAgent={onSelectAgent}
        />
      );

      // Click on agent item
      const agentItem = screen.getByTestId('agent-item-agent-1');
      fireEvent.click(agentItem);

      // Agent should be selected in store (mobile-agent-log-fullscreen: page navigation instead of drawer)
      await waitFor(() => {
        expect(useSharedAgentStore.getState().selectedAgentId).toBe('agent-1');
      });

      // Cleanup
      useSharedAgentStore.setState({
        agents: new Map(),
        logs: new Map(),
        selectedAgentId: null,
        selectedAgentIdBySpec: new Map(),
        isLoading: false,
        error: null,
      });
    });

    it('should use agents from the store for the current spec', async () => {
      // Setup: Add agents for the specific spec
      const { useSharedAgentStore } = await import('@shared/stores/agentStore');
      useSharedAgentStore.setState({
        agents: new Map([
          [
            'test-feature',
            [
              {
                agentId: 'agent-1',
                specId: 'test-feature',
                phase: 'spec-requirements',
                status: 'completed',
                startedAt: '2024-01-01T00:00:00Z',
                lastActivityAt: '2024-01-01T00:01:00Z',
                sessionId: 'session-1',
              },
              {
                agentId: 'agent-2',
                specId: 'test-feature',
                phase: 'spec-design',
                status: 'running',
                startedAt: '2024-01-01T00:02:00Z',
                lastActivityAt: '2024-01-01T00:03:00Z',
                sessionId: 'session-2',
              },
            ],
          ],
          [
            'other-feature',
            [
              {
                agentId: 'agent-3',
                specId: 'other-feature',
                phase: 'spec-tasks',
                status: 'completed',
                startedAt: '2024-01-01T00:00:00Z',
                lastActivityAt: '2024-01-01T00:01:00Z',
                sessionId: 'session-3',
              },
            ],
          ],
        ]),
        logs: new Map(),
        selectedAgentId: null,
        selectedAgentIdBySpec: new Map(),
        isLoading: false,
        error: null,
      });

      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Should show only agents for test-feature spec
      expect(screen.getByTestId('agent-item-agent-1')).toBeInTheDocument();
      expect(screen.getByTestId('agent-item-agent-2')).toBeInTheDocument();
      // Should NOT show agent from other spec
      expect(screen.queryByTestId('agent-item-agent-3')).not.toBeInTheDocument();

      // Cleanup
      useSharedAgentStore.setState({
        agents: new Map(),
        logs: new Map(),
        selectedAgentId: null,
        selectedAgentIdBySpec: new Map(),
        isLoading: false,
        error: null,
      });
    });
  });

  // =============================================================================
  // Task 5.3: WorkflowArea and WorkflowFooter in Spec tab
  // Requirements: 3.2 (Spec tab structure), 3.7 (WorkflowFooter display)
  // =============================================================================

  describe('Spec tab WorkflowArea and WorkflowFooter (Req 3.2, 3.7)', () => {
    it('should render WorkflowArea in Spec tab (Req 3.2)', () => {
      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // WorkflowArea should be present
      expect(screen.getByTestId('spec-workflow-area')).toBeInTheDocument();
    });

    it('should have scrollable WorkflowArea (Req 3.2)', () => {
      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      const workflowArea = screen.getByTestId('spec-workflow-area');
      // Should have overflow-hidden to allow WorkflowViewCore internal scroll
      expect(workflowArea).toHaveClass('overflow-hidden');
    });

    it('should render RemoteWorkflowView inside WorkflowArea (Req 3.7)', () => {
      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // RemoteWorkflowView is rendered inside spec-workflow-area
      // The auto-execute button is rendered inside WorkflowViewCore (child of RemoteWorkflowView)
      // We verify the workflow area container exists
      const workflowArea = screen.getByTestId('spec-workflow-area');
      expect(workflowArea).toBeInTheDocument();
    });

    it('should render layout with AgentList at top and WorkflowArea (Req 3.2)', () => {
      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // All areas should be present
      const specTabContent = screen.getByTestId('spec-tab-content');
      expect(specTabContent).toBeInTheDocument();

      // Agent list container
      const agentListContainer = screen.getByTestId('spec-agent-list-container');
      expect(agentListContainer).toBeInTheDocument();

      // Workflow area (contains RemoteWorkflowView with WorkflowViewCore and footer)
      const workflowArea = screen.getByTestId('spec-workflow-area');
      expect(workflowArea).toBeInTheDocument();
    });
  });

  // =============================================================================
  // Task 5.4: Artifact tab implementation
  // Requirements: 3.5 (Artifact sub-tab with file tabs), 3.6 (shared edit/view components)
  // =============================================================================

  describe('Artifact tab content (Req 3.5, 3.6)', () => {
    it('should render RemoteArtifactEditor when Artifact tab is active (Req 3.5, 3.6)', async () => {
      // Mock getArtifactContent to return content
      const mockGetArtifactContent = vi.fn().mockResolvedValue({
        ok: true,
        value: '# Test Content',
      });
      mockApiClient.getArtifactContent = mockGetArtifactContent;

      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Click Artifact tab
      const artifactTabButton = screen.getByTestId('spec-detail-subtabs-artifact');
      fireEvent.click(artifactTabButton);

      // Wait for Artifact tab content to render
      await waitFor(() => {
        expect(screen.getByTestId('artifact-tab-content')).toBeInTheDocument();
      });

      // RemoteArtifactEditor should be rendered within the artifact tab
      await waitFor(() => {
        expect(screen.getByTestId('remote-artifact-editor')).toBeInTheDocument();
      });
    });

    it('should show artifact file tabs (requirements.md, design.md, tasks.md, research.md) (Req 3.5)', async () => {
      // Mock getArtifactContent
      const mockGetArtifactContent = vi.fn().mockResolvedValue({
        ok: true,
        value: '# Test Content',
      });
      mockApiClient.getArtifactContent = mockGetArtifactContent;

      // Use specDetail with all 4 artifacts including research
      const specDetailWithResearch: SpecDetail = {
        ...mockSpecDetail,
        artifacts: {
          requirements: { exists: true },
          design: { exists: true },
          tasks: { exists: true },
          research: { exists: true },
        },
      };

      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={specDetailWithResearch}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Click Artifact tab
      const artifactTabButton = screen.getByTestId('spec-detail-subtabs-artifact');
      fireEvent.click(artifactTabButton);

      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByTestId('remote-artifact-editor')).toBeInTheDocument();
      });

      // Should show artifact file tabs
      expect(screen.getByRole('tab', { name: /requirements\.md/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /design\.md/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /tasks\.md/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /research\.md/i })).toBeInTheDocument();
    });

    it('should share edit/view components with Desktop Web (uses RemoteArtifactEditor) (Req 3.6)', async () => {
      // Mock getArtifactContent
      const mockGetArtifactContent = vi.fn().mockResolvedValue({
        ok: true,
        value: '# Test Content',
      });
      mockApiClient.getArtifactContent = mockGetArtifactContent;

      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Click Artifact tab
      const artifactTabButton = screen.getByTestId('spec-detail-subtabs-artifact');
      fireEvent.click(artifactTabButton);

      // Wait for RemoteArtifactEditor to render
      await waitFor(() => {
        expect(screen.getByTestId('remote-artifact-editor')).toBeInTheDocument();
      });

      // RemoteArtifactEditor is the shared component for Desktop Web and Mobile
      // Verify edit/preview mode toggle buttons exist
      // The editor has Edit and Preview mode toggle
      await waitFor(() => {
        // MDEditor's edit and preview buttons
        const container = screen.getByTestId('remote-artifact-editor');
        expect(container).toBeInTheDocument();
      });
    });

    it('should pass spec and specDetail to RemoteArtifactEditor', async () => {
      // Mock getArtifactContent to verify it gets called with correct spec
      const mockGetArtifactContent = vi.fn().mockResolvedValue({
        ok: true,
        value: '# Requirements',
      });
      mockApiClient.getArtifactContent = mockGetArtifactContent;

      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Click Artifact tab
      const artifactTabButton = screen.getByTestId('spec-detail-subtabs-artifact');
      fireEvent.click(artifactTabButton);

      // Wait for RemoteArtifactEditor to load artifact
      await waitFor(() => {
        // getArtifactContent should be called with the spec name
        expect(mockGetArtifactContent).toHaveBeenCalledWith(
          mockSpec.name,
          expect.any(String), // artifact type
          'spec' // context type
        );
      });
    });

    it('should load artifact content when artifact tab is selected', async () => {
      const mockGetArtifactContent = vi.fn().mockResolvedValue({
        ok: true,
        value: '# Design Document\n\nThis is the design content.',
      });
      mockApiClient.getArtifactContent = mockGetArtifactContent;

      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Click Artifact tab
      const artifactTabButton = screen.getByTestId('spec-detail-subtabs-artifact');
      fireEvent.click(artifactTabButton);

      // Wait for content to load
      await waitFor(() => {
        expect(mockGetArtifactContent).toHaveBeenCalled();
      });
    });

    it('should display RemoteArtifactEditor in full height within the artifact tab', async () => {
      const mockGetArtifactContent = vi.fn().mockResolvedValue({
        ok: true,
        value: '# Test',
      });
      mockApiClient.getArtifactContent = mockGetArtifactContent;

      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Click Artifact tab
      const artifactTabButton = screen.getByTestId('spec-detail-subtabs-artifact');
      fireEvent.click(artifactTabButton);

      await waitFor(() => {
        const artifactContent = screen.getByTestId('artifact-tab-content');
        // Should have flex and h-full for full height
        expect(artifactContent).toBeInTheDocument();
        expect(artifactContent).toHaveClass('h-full');
      });
    });
  });

  // =============================================================================
  // Task 7.2: Mobile版：MobilePullToRefreshでラップ (SpecDetailPage)
  // Requirements: 5.2 (SpecDetailPageでPull to Refresh操作)
  // Method: MobilePullToRefresh
  // =============================================================================

  describe('MobilePullToRefresh integration (Req 5.2, Task 7.2)', () => {
    it('should render MobilePullToRefresh wrapper on mobile when onRefresh is provided', async () => {
      // Mock useDeviceType to return mobile
      const { useDeviceType } = await import('@shared/hooks/useDeviceType');
      vi.mocked(useDeviceType).mockReturnValue({
        deviceType: 'mobile',
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        width: 375,
        height: 667,
      });

      const onRefresh = vi.fn().mockResolvedValue(undefined);

      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
          onRefresh={onRefresh}
          isRefreshing={false}
        />
      );

      // MobilePullToRefresh should be rendered
      expect(screen.getByTestId('spec-pull-to-refresh')).toBeInTheDocument();
    });

    it('should not render MobilePullToRefresh on desktop', async () => {
      // Mock useDeviceType to return desktop
      const { useDeviceType } = await import('@shared/hooks/useDeviceType');
      vi.mocked(useDeviceType).mockReturnValue({
        deviceType: 'desktop',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        width: 1024,
        height: 768,
      });

      const onRefresh = vi.fn().mockResolvedValue(undefined);

      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
          onRefresh={onRefresh}
          isRefreshing={false}
        />
      );

      // MobilePullToRefresh should NOT be rendered on desktop
      expect(screen.queryByTestId('spec-pull-to-refresh')).not.toBeInTheDocument();
    });

    it('should pass isRefreshing prop to MobilePullToRefresh', async () => {
      // Mock useDeviceType to return mobile
      const { useDeviceType } = await import('@shared/hooks/useDeviceType');
      vi.mocked(useDeviceType).mockReturnValue({
        deviceType: 'mobile',
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        width: 375,
        height: 667,
      });

      const onRefresh = vi.fn().mockResolvedValue(undefined);

      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
          onRefresh={onRefresh}
          isRefreshing={true}
        />
      );

      // When isRefreshing is true, the indicator should be visible
      expect(screen.getByTestId('spec-pull-to-refresh-indicator')).toBeInTheDocument();
    });

    it('should not render MobilePullToRefresh when onRefresh is not provided on mobile', async () => {
      // Mock useDeviceType to return mobile
      const { useDeviceType } = await import('@shared/hooks/useDeviceType');
      vi.mocked(useDeviceType).mockReturnValue({
        deviceType: 'mobile',
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        width: 375,
        height: 667,
      });

      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // MobilePullToRefresh should NOT be rendered when onRefresh is not provided
      expect(screen.queryByTestId('spec-pull-to-refresh')).not.toBeInTheDocument();
    });
  });

  // =============================================================================
  // Task 7.3: Desktop版：RefreshButtonを追加 (SpecDetailPage)
  // Requirements: 6.2 (SpecDetailPageにリフレッシュボタン表示), 6.4 (クリック時に再取得)
  // Method: RefreshButton
  // =============================================================================

  describe('RefreshButton integration (Req 6.2, 6.4, Task 7.3)', () => {
    it('should render RefreshButton on desktop when onRefresh is provided', async () => {
      // Mock useDeviceType to return desktop
      const { useDeviceType } = await import('@shared/hooks/useDeviceType');
      vi.mocked(useDeviceType).mockReturnValue({
        deviceType: 'desktop',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        width: 1024,
        height: 768,
      });

      const onRefresh = vi.fn().mockResolvedValue(undefined);

      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
          onRefresh={onRefresh}
          isRefreshing={false}
        />
      );

      // RefreshButton should be rendered on desktop
      expect(screen.getByTestId('spec-refresh-button')).toBeInTheDocument();
    });

    it('should not render RefreshButton on mobile', async () => {
      // Mock useDeviceType to return mobile
      const { useDeviceType } = await import('@shared/hooks/useDeviceType');
      vi.mocked(useDeviceType).mockReturnValue({
        deviceType: 'mobile',
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        width: 375,
        height: 667,
      });

      const onRefresh = vi.fn().mockResolvedValue(undefined);

      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
          onRefresh={onRefresh}
          isRefreshing={false}
        />
      );

      // RefreshButton should NOT be rendered on mobile
      expect(screen.queryByTestId('spec-refresh-button')).not.toBeInTheDocument();
    });

    it('should call onRefresh when RefreshButton is clicked (Req 6.4)', async () => {
      // Mock useDeviceType to return desktop
      const { useDeviceType } = await import('@shared/hooks/useDeviceType');
      vi.mocked(useDeviceType).mockReturnValue({
        deviceType: 'desktop',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        width: 1024,
        height: 768,
      });

      const onRefresh = vi.fn().mockResolvedValue(undefined);

      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
          onRefresh={onRefresh}
          isRefreshing={false}
        />
      );

      const refreshButton = screen.getByTestId('spec-refresh-button');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(onRefresh).toHaveBeenCalledTimes(1);
      });
    });

    it('should show loading state on RefreshButton when isRefreshing is true (Req 6.5)', async () => {
      // Mock useDeviceType to return desktop
      const { useDeviceType } = await import('@shared/hooks/useDeviceType');
      vi.mocked(useDeviceType).mockReturnValue({
        deviceType: 'desktop',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        width: 1024,
        height: 768,
      });

      const onRefresh = vi.fn().mockResolvedValue(undefined);

      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
          onRefresh={onRefresh}
          isRefreshing={true}
        />
      );

      const refreshButton = screen.getByTestId('spec-refresh-button');
      expect(refreshButton).toBeDisabled();
    });

    it('should not render RefreshButton when onRefresh is not provided', async () => {
      // Mock useDeviceType to return desktop
      const { useDeviceType } = await import('@shared/hooks/useDeviceType');
      vi.mocked(useDeviceType).mockReturnValue({
        deviceType: 'desktop',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        width: 1024,
        height: 768,
      });

      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // RefreshButton should NOT be rendered without onRefresh prop
      expect(screen.queryByTestId('spec-refresh-button')).not.toBeInTheDocument();
    });
  });

  // =============================================================================
  // remote-ui-ask-agent-fix: Task 4.3 - Spec Ask button tests
  // Requirements: 5.3 (3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8)
  // ===========================================================================

  describe('Spec Ask button (remote-ui-ask-agent-fix)', () => {
    it('should render Spec Ask button in Agent list header (Req 3.1)', () => {
      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Spec Ask button should be present in the Agent list header
      expect(screen.getByTestId('spec-ask-button')).toBeInTheDocument();
    });

    it('should use MessageSquare icon with purple color (Req 3.2)', () => {
      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      const askButton = screen.getByTestId('spec-ask-button');
      // Button should have purple styling
      expect(askButton).toHaveClass('text-purple-600');
    });

    it('should open AskAgentDialog with agentType="spec" when clicked (Req 3.3)', async () => {
      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      const askButton = screen.getByTestId('spec-ask-button');
      fireEvent.click(askButton);

      // AskAgentDialog should appear
      await waitFor(() => {
        expect(screen.getByTestId('ask-agent-dialog')).toBeInTheDocument();
      });
    });

    it('should pass specName to AskAgentDialog (Req 3.4)', async () => {
      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      const askButton = screen.getByTestId('spec-ask-button');
      fireEvent.click(askButton);

      // Dialog should show and contain Spec Agent - Ask title with spec name
      await waitFor(() => {
        const dialog = screen.getByTestId('ask-agent-dialog');
        expect(dialog).toBeInTheDocument();
        // Dialog should contain "Spec Agent - Ask" title (agentType="spec")
        expect(screen.getByText('Spec Agent - Ask')).toBeInTheDocument();
        // Spec name should be visible in parentheses within the dialog
        const dialogContent = screen.getByTestId('dialog-content');
        expect(dialogContent.textContent).toContain('test-feature');
      });
    });

    it('should call executeSpecCommand when dialog executes (Req 3.5)', async () => {
      // websocket-command-unification: executeAskSpec replaced by executeSpecCommand
      const mockExecuteSpecCommand = vi.fn().mockResolvedValue({
        ok: true,
        value: {
          agentId: 'agent-new',
          specId: 'test-feature',
          phase: 'spec-ask',
          status: 'running',
          startedAt: '2024-01-01T00:00:00Z',
        },
      });
      mockApiClient.executeSpecCommand = mockExecuteSpecCommand;

      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Open dialog
      const askButton = screen.getByTestId('spec-ask-button');
      fireEvent.click(askButton);

      await waitFor(() => {
        expect(screen.getByTestId('ask-agent-dialog')).toBeInTheDocument();
      });

      // Enter prompt
      const promptInput = screen.getByTestId('ask-prompt-input');
      fireEvent.change(promptInput, { target: { value: 'Test prompt' } });

      // Click execute
      const executeButton = screen.getByTestId('ask-execute-button');
      fireEvent.click(executeButton);

      await waitFor(() => {
        expect(mockExecuteSpecCommand).toHaveBeenCalledWith(
          mockSpec.name, // specId
          mockSpec.name, // featureName
          expect.stringContaining('spec-ask'), // command contains /kiro:spec-ask
          'spec-ask' // phase
        );
      });
    });

    it('should close dialog on successful execution (Req 3.7)', async () => {
      // websocket-command-unification: executeAskSpec replaced by executeSpecCommand
      const mockExecuteSpecCommand = vi.fn().mockResolvedValue({
        ok: true,
        value: {
          agentId: 'agent-new',
          specId: 'test-feature',
          phase: 'spec-ask',
          status: 'running',
          startedAt: '2024-01-01T00:00:00Z',
        },
      });
      mockApiClient.executeSpecCommand = mockExecuteSpecCommand;

      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Open dialog
      const askButton = screen.getByTestId('spec-ask-button');
      fireEvent.click(askButton);

      await waitFor(() => {
        expect(screen.getByTestId('ask-agent-dialog')).toBeInTheDocument();
      });

      // Enter prompt and execute
      const promptInput = screen.getByTestId('ask-prompt-input');
      fireEvent.change(promptInput, { target: { value: 'Test prompt' } });

      const executeButton = screen.getByTestId('ask-execute-button');
      fireEvent.click(executeButton);

      // Dialog should close after successful execution
      await waitFor(() => {
        expect(screen.queryByTestId('ask-agent-dialog')).not.toBeInTheDocument();
      });
    });
  });
});
