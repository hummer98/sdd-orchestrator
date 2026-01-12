/**
 * BugDetailView Component Tests
 *
 * Task 13.6: Bug詳細・Phase実行UIを実装する
 * TDD: RED phase - Write failing tests first
 *
 * Requirements: 7.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BugDetailView } from './BugDetailView';
import type { BugMetadata, BugDetail, ApiClient, AgentInfo } from '@shared/api/types';

// =============================================================================
// Mock Data
// =============================================================================

const mockBug: BugMetadata = {
  name: 'login-timeout-bug',
  path: '/project/.kiro/bugs/login-timeout-bug',
  phase: 'analyzed',
  updatedAt: '2026-01-10T10:00:00Z',
  createdAt: '2026-01-09T08:00:00Z',
};

const mockBugDetail: BugDetail = {
  name: 'login-timeout-bug',
  path: '/project/.kiro/bugs/login-timeout-bug',
  phase: 'analyzed',
  updatedAt: '2026-01-10T10:00:00Z',
  createdAt: '2026-01-09T08:00:00Z',
  report: {
    description: 'Login times out after 5 seconds',
    steps: ['Open login page', 'Enter credentials', 'Click login'],
    expectedBehavior: 'Should login within 2 seconds',
    actualBehavior: 'Times out after 5 seconds',
  },
  analysis: {
    rootCause: 'Slow database query',
    affectedFiles: ['src/auth/login.ts'],
    proposedFix: 'Add database index',
  },
};

const mockAgentInfo: AgentInfo = {
  id: 'agent-123',
  specId: 'login-timeout-bug',
  phase: 'fix',
  status: 'running',
  startedAt: '2026-01-10T12:00:00Z',
};

// =============================================================================
// Mock ApiClient
// =============================================================================

function createMockApiClient(overrides?: Partial<ApiClient>): ApiClient {
  return {
    getSpecs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    getSpecDetail: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    executePhase: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    updateApproval: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    getBugs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    getBugDetail: vi.fn().mockResolvedValue({ ok: true, value: mockBugDetail }),
    executeBugPhase: vi.fn().mockResolvedValue({ ok: true, value: mockAgentInfo }),
    getAgents: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    stopAgent: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    resumeAgent: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    sendAgentInput: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    getAgentLogs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    executeValidation: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    executeDocumentReview: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    executeInspection: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    startAutoExecution: vi.fn().mockResolvedValue({ ok: true, value: {} }),
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

describe('BugDetailView', () => {
  let mockApiClient: ApiClient;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
  });

  describe('Rendering', () => {
    it('renders loading state initially', () => {
      render(<BugDetailView bug={mockBug} apiClient={mockApiClient} />);
      expect(screen.getByTestId('bug-detail-loading')).toBeInTheDocument();
    });

    it('renders bug detail after loading', async () => {
      render(<BugDetailView bug={mockBug} apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('bug-detail-view')).toBeInTheDocument();
      });

      // Should display bug name
      expect(screen.getByText('login-timeout-bug')).toBeInTheDocument();
    });

    it('renders error state on API error', async () => {
      const errorApiClient = createMockApiClient({
        getBugDetail: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'API_ERROR', message: 'Failed to load bug detail' },
        }),
      });

      render(<BugDetailView bug={mockBug} apiClient={errorApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('bug-detail-error')).toBeInTheDocument();
        expect(screen.getByText(/Failed to load bug detail/)).toBeInTheDocument();
      });
    });

    it('renders bug workflow phases', async () => {
      render(<BugDetailView bug={mockBug} apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('bug-phase-analyze')).toBeInTheDocument();
        expect(screen.getByTestId('bug-phase-fix')).toBeInTheDocument();
        expect(screen.getByTestId('bug-phase-verify')).toBeInTheDocument();
      });
    });
  });

  describe('Phase Execution', () => {
    it('calls executeBugPhase when fix button is clicked', async () => {
      render(<BugDetailView bug={mockBug} apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('bug-detail-view')).toBeInTheDocument();
      });

      // Find and click the fix button (next step after analyzed phase)
      const fixButton = screen.getByTestId('bug-phase-fix-button');
      fireEvent.click(fixButton);

      await waitFor(() => {
        expect(mockApiClient.executeBugPhase).toHaveBeenCalledWith('login-timeout-bug', 'fix');
      });
    });
  });

  describe('Bug Report Display', () => {
    it('displays bug report information', async () => {
      render(<BugDetailView bug={mockBug} apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('bug-detail-view')).toBeInTheDocument();
      });

      // Should show report description
      expect(screen.getByText(/Login times out/)).toBeInTheDocument();
    });

    it('displays analysis information when available', async () => {
      render(<BugDetailView bug={mockBug} apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('bug-detail-view')).toBeInTheDocument();
      });

      // Should show analysis root cause
      expect(screen.getByText(/Slow database query/)).toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('calls onPhaseExecuted when phase is executed', async () => {
      const onPhaseExecuted = vi.fn();
      render(
        <BugDetailView
          bug={mockBug}
          apiClient={mockApiClient}
          onPhaseExecuted={onPhaseExecuted}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('bug-detail-view')).toBeInTheDocument();
      });

      const fixButton = screen.getByTestId('bug-phase-fix-button');
      fireEvent.click(fixButton);

      await waitFor(() => {
        expect(onPhaseExecuted).toHaveBeenCalledWith('fix', mockAgentInfo);
      });
    });
  });
});
