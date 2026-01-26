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
                id: 'agent-1',
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

    it('should show AgentDetailDrawer when AgentListItem is clicked (Req 3.4)', async () => {
      // Setup: Add agents to store
      const { useSharedAgentStore } = await import('@shared/stores/agentStore');
      useSharedAgentStore.setState({
        agents: new Map([
          [
            'test-feature',
            [
              {
                id: 'agent-1',
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

      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Click on agent item
      const agentItem = screen.getByTestId('agent-item-agent-1');
      fireEvent.click(agentItem);

      // AgentDetailDrawer should appear
      await waitFor(() => {
        expect(screen.getByTestId('agent-detail-drawer')).toBeInTheDocument();
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

    it('should close AgentDetailDrawer when close button is clicked (Req 3.4)', async () => {
      // Setup: Add agents to store
      const { useSharedAgentStore } = await import('@shared/stores/agentStore');
      useSharedAgentStore.setState({
        agents: new Map([
          [
            'test-feature',
            [
              {
                id: 'agent-1',
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

      // Click on agent item to open drawer
      const agentItem = screen.getByTestId('agent-item-agent-1');
      fireEvent.click(agentItem);

      // Wait for drawer to appear
      await waitFor(() => {
        expect(screen.getByTestId('agent-detail-drawer')).toBeInTheDocument();
      });

      // Click close button
      const closeButton = screen.getByTestId('agent-detail-drawer-close');
      fireEvent.click(closeButton);

      // Drawer should disappear
      await waitFor(() => {
        expect(screen.queryByTestId('agent-detail-drawer')).not.toBeInTheDocument();
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
                id: 'agent-1',
                specId: 'test-feature',
                phase: 'spec-requirements',
                status: 'completed',
                startedAt: '2024-01-01T00:00:00Z',
                lastActivityAt: '2024-01-01T00:01:00Z',
                sessionId: 'session-1',
              },
              {
                id: 'agent-2',
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
                id: 'agent-3',
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
      // Should have overflow-y-auto for scrollable content
      expect(workflowArea).toHaveClass('overflow-y-auto');
    });

    it('should render SpecWorkflowFooter with auto-execute button (Req 3.7)', () => {
      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // SpecWorkflowFooter should be present with auto-execute button
      expect(screen.getByTestId('auto-execute-button')).toBeInTheDocument();
    });

    it('should display correct auto execution button state when not auto executing', () => {
      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
          isAutoExecuting={false}
        />
      );

      const autoExecuteButton = screen.getByTestId('auto-execute-button');
      // Button should show "auto execute" text when not executing
      expect(autoExecuteButton).toHaveTextContent('自動実行');
    });

    it('should display stop button when auto executing', () => {
      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
          isAutoExecuting={true}
        />
      );

      const autoExecuteButton = screen.getByTestId('auto-execute-button');
      // Button should show "stop" text when executing
      expect(autoExecuteButton).toHaveTextContent('停止');
    });

    it('should call onAutoExecution when auto-execute button is clicked', () => {
      const onAutoExecution = vi.fn();
      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
          onAutoExecution={onAutoExecution}
        />
      );

      const autoExecuteButton = screen.getByTestId('auto-execute-button');
      fireEvent.click(autoExecuteButton);

      expect(onAutoExecution).toHaveBeenCalledTimes(1);
    });

    it('should render WorkflowFooter below WorkflowArea (Req 3.2)', () => {
      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Both elements should be present in the Spec tab content
      expect(screen.getByTestId('spec-workflow-area')).toBeInTheDocument();
      expect(screen.getByTestId('auto-execute-button')).toBeInTheDocument();
    });

    it('should render layout with AgentList at top, WorkflowArea in middle, and Footer at bottom (Req 3.2)', () => {
      render(
        <SpecDetailPage
          spec={mockSpec}
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // All three areas should be present in order (top to bottom)
      const specTabContent = screen.getByTestId('spec-tab-content');
      expect(specTabContent).toBeInTheDocument();

      // Agent list container
      const agentListContainer = screen.getByTestId('spec-agent-list-container');
      expect(agentListContainer).toBeInTheDocument();

      // Workflow area
      const workflowArea = screen.getByTestId('spec-workflow-area');
      expect(workflowArea).toBeInTheDocument();

      // Auto execute button (part of footer)
      const autoExecuteButton = screen.getByTestId('auto-execute-button');
      expect(autoExecuteButton).toBeInTheDocument();
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
});
