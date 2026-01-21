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
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SpecDetailView } from './SpecDetailView';
// spec-path-ssot-refactor: Use SpecMetadataWithPath for Remote UI tests
import type { SpecMetadataWithPath, SpecDetail, ApiClient, AgentInfo } from '@shared/api/types';

// =============================================================================
// Mock Data
// =============================================================================

// spec-path-ssot-refactor: Remote UI uses SpecMetadataWithPath (includes path)
const mockSpec: SpecMetadataWithPath = {
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
        expect(screen.getByTestId('remote-spec-detail')).toBeInTheDocument();
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
        expect(screen.getByTestId('remote-spec-detail')).toBeInTheDocument();
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
        expect(screen.getByTestId('remote-spec-detail')).toBeInTheDocument();
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
        expect(screen.getByTestId('remote-spec-detail')).toBeInTheDocument();
      });

      // Tasks phase should show approve button (generated but not approved)
      const tasksPhase = screen.getByTestId('phase-item-tasks');
      const approveButton = tasksPhase.querySelector('button[class*="bg-green"]');
      expect(approveButton).toBeInTheDocument();
    });

    it('calls updateApproval when approve button is clicked', async () => {
      render(<SpecDetailView spec={mockSpec} apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('remote-spec-detail')).toBeInTheDocument();
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
        expect(screen.getByTestId('remote-spec-detail')).toBeInTheDocument();
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
        expect(screen.getByTestId('remote-spec-detail')).toBeInTheDocument();
      });

      expect(screen.getByTestId('worktree-section')).toBeInTheDocument();
    });

    it('does not show worktree section when spec has no worktree config', async () => {
      render(<SpecDetailView spec={mockSpec} apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('remote-spec-detail')).toBeInTheDocument();
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

  // gemini-document-review: SchemeSelector tests moved to SpecActionsView.test.tsx
  // SchemeSelector is now rendered inside DocumentReviewPanel (per requirements 4.1, 5.1)
});
