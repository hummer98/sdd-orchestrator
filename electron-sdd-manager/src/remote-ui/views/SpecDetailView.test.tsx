/**
 * SpecDetailView Component Tests
 *
 * Task 13.2: Spec詳細・Phase実行UIを実装する
 * gemini-document-review Task 10.3: scheme表示・切り替えテスト追加
 * TDD: RED phase - Write failing tests first
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { SpecDetailView } from './SpecDetailView';
import type { SpecMetadata, SpecDetail, ApiClient, AgentInfo } from '@shared/api/types';

// =============================================================================
// Mock Data
// =============================================================================

const mockSpec: SpecMetadata = {
  name: 'user-authentication',
  path: '/project/.kiro/specs/user-authentication',
};

const mockSpecDetail: SpecDetail = {
  metadata: {
    name: 'user-authentication',
    path: '/project/.kiro/specs/user-authentication',
  },
  specJson: {
    feature_name: 'user-authentication',
    created_at: '2026-01-09T08:00:00Z',
    updated_at: '2026-01-10T10:00:00Z',
    language: 'ja',
    phase: 'tasks-generated',
    approvals: {
      requirements: { generated: true, approved: true },
      design: { generated: true, approved: true },
      tasks: { generated: true, approved: false },
    },
    autoExecution: {
      permissions: {
        requirements: true,
        design: true,
        tasks: true,
        impl: false,
        inspection: false,
        deploy: false,
      },
      documentReviewFlag: 'run',
    },
  },
  artifacts: {
    requirements: { exists: true, updatedAt: '2026-01-09T08:00:00Z', content: 'Requirements content...' },
    design: { exists: true, updatedAt: '2026-01-09T10:00:00Z', content: 'Design content...' },
    tasks: { exists: true, updatedAt: '2026-01-10T08:00:00Z', content: 'Tasks content...' },
    research: null,
    inspection: null,
  },
  taskProgress: { total: 10, completed: 5, percentage: 50 },
};

/**
 * Mock spec detail with worktree config
 * git-worktree-support: Task 13.2
 */
const mockSpecDetailWithWorktree: SpecDetail = {
  ...mockSpecDetail,
  specJson: {
    ...mockSpecDetail.specJson,
    worktree: {
      path: '../my-project-worktrees/user-authentication',
      branch: 'feature/user-authentication',
      created_at: '2026-01-10T09:00:00Z',
    },
  },
};

/**
 * Mock spec detail with scheme config
 * gemini-document-review: Task 10.3
 * Requirements: 7.1
 */
const mockSpecDetailWithScheme: SpecDetail = {
  ...mockSpecDetail,
  specJson: {
    ...mockSpecDetail.specJson,
    documentReview: {
      status: 'pending',
      scheme: 'gemini-cli',
    },
  },
};

const mockAgentInfo: AgentInfo = {
  id: 'agent-123',
  specId: 'user-authentication',
  phase: 'design',
  status: 'running',
  startedAt: '2026-01-10T12:00:00Z',
};

// =============================================================================
// Mock ApiClient
// =============================================================================

function createMockApiClient(overrides?: Partial<ApiClient>): ApiClient {
  return {
    getSpecs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    getSpecDetail: vi.fn().mockResolvedValue({ ok: true, value: mockSpecDetail }),
    executePhase: vi.fn().mockResolvedValue({ ok: true, value: mockAgentInfo }),
    updateApproval: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    getBugs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    getBugDetail: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    executeBugPhase: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    getAgents: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    stopAgent: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    resumeAgent: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    sendAgentInput: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    getAgentLogs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    executeDocumentReview: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    executeInspection: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    startAutoExecution: vi.fn().mockResolvedValue({ ok: true, value: { status: 'running' } }),
    stopAutoExecution: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    getAutoExecutionStatus: vi.fn().mockResolvedValue({ ok: true, value: null }),
    saveFile: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    onSpecsUpdated: vi.fn().mockReturnValue(() => {}),
    onBugsUpdated: vi.fn().mockReturnValue(() => {}),
    onAgentOutput: vi.fn().mockReturnValue(() => {}),
    onAgentStatusChange: vi.fn().mockReturnValue(() => {}),
    onAutoExecutionStatusChanged: vi.fn().mockReturnValue(() => {}),
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('SpecDetailView', () => {
  let mockApiClient: ApiClient;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
  });

  describe('Rendering', () => {
    it('renders loading state initially', () => {
      render(<SpecDetailView spec={mockSpec} apiClient={mockApiClient} />);
      expect(screen.getByTestId('spec-detail-loading')).toBeInTheDocument();
    });

    it('renders spec detail after loading', async () => {
      render(<SpecDetailView spec={mockSpec} apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('spec-detail-view')).toBeInTheDocument();
      });

      // Should display spec name
      expect(screen.getByText('user-authentication')).toBeInTheDocument();
    });

    it('renders error state on API error', async () => {
      const errorApiClient = createMockApiClient({
        getSpecDetail: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'API_ERROR', message: 'Failed to load spec detail' },
        }),
      });

      render(<SpecDetailView spec={mockSpec} apiClient={errorApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('spec-detail-error')).toBeInTheDocument();
        expect(screen.getByText(/Failed to load spec detail/)).toBeInTheDocument();
      });
    });

    it('renders workflow phases', async () => {
      render(<SpecDetailView spec={mockSpec} apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('phase-item-requirements')).toBeInTheDocument();
        expect(screen.getByTestId('phase-item-design')).toBeInTheDocument();
        expect(screen.getByTestId('phase-item-tasks')).toBeInTheDocument();
        expect(screen.getByTestId('phase-item-impl')).toBeInTheDocument();
      });
    });
  });

  describe('Phase Execution', () => {
    it('shows phase items with correct status', async () => {
      render(<SpecDetailView spec={mockSpec} apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('spec-detail-view')).toBeInTheDocument();
      });

      // Requirements and design should be approved (green check)
      expect(screen.getByTestId('phase-item-requirements')).toBeInTheDocument();
      expect(screen.getByTestId('phase-item-design')).toBeInTheDocument();

      // Tasks should show approve button (generated but not approved)
      const tasksPhase = screen.getByTestId('phase-item-tasks');
      const approveButton = tasksPhase.querySelector('button[class*="bg-green"]');
      expect(approveButton).toBeInTheDocument();
    });

    it('disables execute button for phases that cannot be executed', async () => {
      render(<SpecDetailView spec={mockSpec} apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('spec-detail-view')).toBeInTheDocument();
      });

      // impl phase should be disabled because tasks is not yet approved
      const implButton = screen.getByTestId('phase-button-impl');
      expect(implButton).toBeDisabled();
    });
  });

  describe('Approval', () => {
    it('shows approve button for generated phases', async () => {
      render(<SpecDetailView spec={mockSpec} apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('spec-detail-view')).toBeInTheDocument();
      });

      // Tasks phase should show approve button (generated but not approved)
      const tasksPhase = screen.getByTestId('phase-item-tasks');
      const approveButton = tasksPhase.querySelector('button[class*="bg-green"]');
      expect(approveButton).toBeInTheDocument();
    });

    it('calls updateApproval when approve button is clicked', async () => {
      render(<SpecDetailView spec={mockSpec} apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('spec-detail-view')).toBeInTheDocument();
      });

      // Find the approve button in tasks phase
      const tasksPhase = screen.getByTestId('phase-item-tasks');
      const approveButton = tasksPhase.querySelector('button[class*="bg-green"]');

      if (approveButton) {
        fireEvent.click(approveButton);
        expect(mockApiClient.updateApproval).toHaveBeenCalled();
      }
    });
  });

  describe('Auto Execution', () => {
    it('renders auto execution button', async () => {
      render(<SpecDetailView spec={mockSpec} apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('auto-execution-button')).toBeInTheDocument();
      });
    });

    it('calls startAutoExecution when auto execution button is clicked', async () => {
      render(<SpecDetailView spec={mockSpec} apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('auto-execution-button')).toBeInTheDocument();
      });

      const autoButton = screen.getByTestId('auto-execution-button');
      fireEvent.click(autoButton);

      expect(mockApiClient.startAutoExecution).toHaveBeenCalled();
    });
  });

  describe('Callbacks', () => {
    it('calls onApprovalUpdated when approve button is clicked', async () => {
      const onApprovalUpdated = vi.fn();
      render(
        <SpecDetailView
          spec={mockSpec}
          apiClient={mockApiClient}
          onApprovalUpdated={onApprovalUpdated}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('spec-detail-view')).toBeInTheDocument();
      });

      // Click approve button for tasks phase
      const tasksPhase = screen.getByTestId('phase-item-tasks');
      const approveButton = tasksPhase.querySelector('button[class*="bg-green"]');

      if (approveButton) {
        fireEvent.click(approveButton);
        await waitFor(() => {
          expect(onApprovalUpdated).toHaveBeenCalledWith('tasks', true);
        });
      }
    });
  });

  /**
   * git-worktree-support: Task 13.2
   * Worktree information section tests in Remote UI
   * Requirements: 4.1, 4.2
   */
  describe('Worktree Information', () => {
    it('shows worktree section when spec has worktree config', async () => {
      const apiClientWithWorktree = createMockApiClient({
        getSpecDetail: vi.fn().mockResolvedValue({ ok: true, value: mockSpecDetailWithWorktree }),
      });

      render(<SpecDetailView spec={mockSpec} apiClient={apiClientWithWorktree} />);

      await waitFor(() => {
        expect(screen.getByTestId('spec-detail-view')).toBeInTheDocument();
      });

      expect(screen.getByTestId('worktree-section')).toBeInTheDocument();
    });

    it('does not show worktree section when spec has no worktree config', async () => {
      render(<SpecDetailView spec={mockSpec} apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('spec-detail-view')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('worktree-section')).not.toBeInTheDocument();
    });

    it('displays worktree path in worktree section', async () => {
      const apiClientWithWorktree = createMockApiClient({
        getSpecDetail: vi.fn().mockResolvedValue({ ok: true, value: mockSpecDetailWithWorktree }),
      });

      render(<SpecDetailView spec={mockSpec} apiClient={apiClientWithWorktree} />);

      await waitFor(() => {
        expect(screen.getByTestId('worktree-section')).toBeInTheDocument();
      });

      expect(screen.getByText('../my-project-worktrees/user-authentication')).toBeInTheDocument();
    });

    it('displays branch name in worktree section', async () => {
      const apiClientWithWorktree = createMockApiClient({
        getSpecDetail: vi.fn().mockResolvedValue({ ok: true, value: mockSpecDetailWithWorktree }),
      });

      render(<SpecDetailView spec={mockSpec} apiClient={apiClientWithWorktree} />);

      await waitFor(() => {
        expect(screen.getByTestId('worktree-section')).toBeInTheDocument();
      });

      expect(screen.getByText('feature/user-authentication')).toBeInTheDocument();
    });

    it('shows GitBranch icon in worktree section', async () => {
      const apiClientWithWorktree = createMockApiClient({
        getSpecDetail: vi.fn().mockResolvedValue({ ok: true, value: mockSpecDetailWithWorktree }),
      });

      render(<SpecDetailView spec={mockSpec} apiClient={apiClientWithWorktree} />);

      await waitFor(() => {
        expect(screen.getByTestId('worktree-section')).toBeInTheDocument();
      });

      const worktreeSection = screen.getByTestId('worktree-section');
      expect(worktreeSection.querySelector('svg')).toBeInTheDocument();
    });
  });

  /**
   * gemini-document-review: Task 10.3
   * Scheme display and switching tests in Remote UI
   * Requirements: 7.1, 7.2, 7.3, 7.4
   */
  describe('Scheme Selector', () => {
    it('renders scheme selector in header', async () => {
      render(<SpecDetailView spec={mockSpec} apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('spec-detail-view')).toBeInTheDocument();
      });

      // SchemeSelector should be rendered with default value (Claude)
      const selectorButton = screen.getByTestId('scheme-selector-button');
      expect(selectorButton).toBeInTheDocument();
      expect(selectorButton).toHaveTextContent('Claude');
    });

    it('displays correct scheme label when spec has scheme config', async () => {
      const apiClientWithScheme = createMockApiClient({
        getSpecDetail: vi.fn().mockResolvedValue({ ok: true, value: mockSpecDetailWithScheme }),
      });

      render(<SpecDetailView spec={mockSpec} apiClient={apiClientWithScheme} />);

      await waitFor(() => {
        expect(screen.getByTestId('spec-detail-view')).toBeInTheDocument();
      });

      // SchemeSelector should display 'Gemini' for gemini-cli scheme
      const selectorButton = screen.getByTestId('scheme-selector-button');
      expect(selectorButton).toBeInTheDocument();
      expect(selectorButton).toHaveTextContent('Gemini');
    });

    it('shows dropdown menu when scheme selector is clicked', async () => {
      render(<SpecDetailView spec={mockSpec} apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('spec-detail-view')).toBeInTheDocument();
      });

      // Click the scheme selector button
      const selectorButton = screen.getByTestId('scheme-selector-button');
      fireEvent.click(selectorButton);

      // Dropdown should be visible
      await waitFor(() => {
        expect(screen.getByTestId('scheme-selector-dropdown')).toBeInTheDocument();
      });

      // All scheme options should be present in dropdown
      const dropdown = screen.getByTestId('scheme-selector-dropdown');
      expect(within(dropdown).getByText('Claude')).toBeInTheDocument();
      expect(within(dropdown).getByText('Gemini')).toBeInTheDocument();
      expect(within(dropdown).getByText('Debatex')).toBeInTheDocument();
    });

    it('calls saveFile when scheme is changed', async () => {
      render(<SpecDetailView spec={mockSpec} apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('spec-detail-view')).toBeInTheDocument();
      });

      // Click the scheme selector button
      const selectorButton = screen.getByTestId('scheme-selector-button');
      fireEvent.click(selectorButton);

      // Wait for dropdown
      await waitFor(() => {
        expect(screen.getByTestId('scheme-selector-dropdown')).toBeInTheDocument();
      });

      // Click on Gemini option
      const dropdown = screen.getByTestId('scheme-selector-dropdown');
      const geminiOption = within(dropdown).getByText('Gemini');
      fireEvent.click(geminiOption);

      // saveFile should be called with the spec.json path
      await waitFor(() => {
        expect(mockApiClient.saveFile).toHaveBeenCalledWith(
          '/project/.kiro/specs/user-authentication/spec.json',
          expect.stringContaining('"scheme": "gemini-cli"')
        );
      });
    });

    it('updates scheme tag immediately (optimistic update)', async () => {
      render(<SpecDetailView spec={mockSpec} apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('spec-detail-view')).toBeInTheDocument();
      });

      // Initially shows Claude
      const selectorButton = screen.getByTestId('scheme-selector-button');
      expect(selectorButton).toHaveTextContent('Claude');

      // Click the scheme selector button
      fireEvent.click(selectorButton);

      // Wait for dropdown
      await waitFor(() => {
        expect(screen.getByTestId('scheme-selector-dropdown')).toBeInTheDocument();
      });

      // Click on Gemini option
      const dropdown = screen.getByTestId('scheme-selector-dropdown');
      const geminiOption = within(dropdown).getByText('Gemini');
      fireEvent.click(geminiOption);

      // Scheme tag should immediately show Gemini
      await waitFor(() => {
        const schemeButton = screen.getByTestId('scheme-selector-button');
        expect(schemeButton).toHaveTextContent('Gemini');
      });
    });

    it('reloads spec detail after scheme change', async () => {
      render(<SpecDetailView spec={mockSpec} apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('spec-detail-view')).toBeInTheDocument();
      });

      // Initial getSpecDetail call
      expect(mockApiClient.getSpecDetail).toHaveBeenCalledTimes(1);

      // Click the scheme selector button
      const selectorButton = screen.getByTestId('scheme-selector-button');
      fireEvent.click(selectorButton);

      // Wait for dropdown
      await waitFor(() => {
        expect(screen.getByTestId('scheme-selector-dropdown')).toBeInTheDocument();
      });

      // Click on Gemini option
      const dropdown = screen.getByTestId('scheme-selector-dropdown');
      const geminiOption = within(dropdown).getByText('Gemini');
      fireEvent.click(geminiOption);

      // getSpecDetail should be called again to refresh data
      await waitFor(() => {
        expect(mockApiClient.getSpecDetail).toHaveBeenCalledTimes(2);
      });
    });

    it('disables scheme selector during auto execution', async () => {
      const apiClientWithRunning = createMockApiClient({
        startAutoExecution: vi.fn().mockResolvedValue({
          ok: true,
          value: { status: 'running', currentPhase: 'requirements', completedPhases: [] },
        }),
      });

      render(<SpecDetailView spec={mockSpec} apiClient={apiClientWithRunning} />);

      await waitFor(() => {
        expect(screen.getByTestId('spec-detail-view')).toBeInTheDocument();
      });

      // Start auto execution
      const autoButton = screen.getByTestId('auto-execution-button');
      fireEvent.click(autoButton);

      // Wait for status change
      await waitFor(() => {
        const schemeButton = screen.getByTestId('scheme-selector-button');
        expect(schemeButton).toBeDisabled();
      });
    });
  });
});
