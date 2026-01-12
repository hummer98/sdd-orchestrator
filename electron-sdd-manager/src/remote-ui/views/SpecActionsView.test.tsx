/**
 * SpecActionsView Component Tests
 *
 * Task 13.3: Validation・Review・Inspection UIを実装する
 * TDD: RED phase - Write failing tests first
 *
 * Requirements: 7.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SpecActionsView } from './SpecActionsView';
import type { SpecDetail, ApiClient } from '@shared/api/types';

// =============================================================================
// Mock Data
// =============================================================================

const mockSpecDetail: SpecDetail = {
  name: 'user-authentication',
  path: '/project/.kiro/specs/user-authentication',
  phase: 'implementation-complete',
  updatedAt: '2026-01-10T10:00:00Z',
  createdAt: '2026-01-09T08:00:00Z',
  specJson: {
    feature_name: 'user-authentication',
    created_at: '2026-01-09T08:00:00Z',
    updated_at: '2026-01-10T10:00:00Z',
    language: 'ja',
    phase: 'implementation-complete',
    approvals: {
      requirements: { generated: true, approved: true },
      design: { generated: true, approved: true },
      tasks: { generated: true, approved: true },
    },
    autoExecution: {
      enabled: false,
      permissions: {
        requirements: true,
        design: true,
        tasks: true,
        impl: true,
        inspection: 'run',
        deploy: false,
      },
      documentReviewFlag: 'run',
      validationOptions: {
        gap: false,
        design: false,
        impl: false,
      },
    },
    documentReview: {
      status: 'pending',
      roundDetails: [],
    },
    inspection: {
      rounds: [],
    },
  },
  artifacts: {
    requirements: 'Requirements content...',
    design: 'Design content...',
    tasks: 'Tasks content...',
    research: null,
  },
};

// =============================================================================
// Mock ApiClient
// =============================================================================

function createMockApiClient(overrides?: Partial<ApiClient>): ApiClient {
  return {
    getSpecs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    getSpecDetail: vi.fn().mockResolvedValue({ ok: true, value: mockSpecDetail }),
    executePhase: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    updateApproval: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    getBugs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    getBugDetail: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    executeBugPhase: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    getAgents: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    stopAgent: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    resumeAgent: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    sendAgentInput: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    getAgentLogs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    executeValidation: vi.fn().mockResolvedValue({ ok: true, value: { id: 'agent-1', specId: 'user-authentication', phase: 'validation', status: 'running', startedAt: '2026-01-10T12:00:00Z' } }),
    executeDocumentReview: vi.fn().mockResolvedValue({ ok: true, value: { id: 'agent-2', specId: 'user-authentication', phase: 'document-review', status: 'running', startedAt: '2026-01-10T12:00:00Z' } }),
    executeInspection: vi.fn().mockResolvedValue({ ok: true, value: { id: 'agent-3', specId: 'user-authentication', phase: 'inspection', status: 'running', startedAt: '2026-01-10T12:00:00Z' } }),
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

describe('SpecActionsView', () => {
  let mockApiClient: ApiClient;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
  });

  describe('Rendering', () => {
    it('renders document review panel', async () => {
      render(<SpecActionsView specDetail={mockSpecDetail} apiClient={mockApiClient} />);

      expect(screen.getByTestId('document-review-panel')).toBeInTheDocument();
    });

    it('renders inspection panel', async () => {
      render(<SpecActionsView specDetail={mockSpecDetail} apiClient={mockApiClient} />);

      expect(screen.getByTestId('inspection-panel')).toBeInTheDocument();
    });

    it('renders validation section', async () => {
      render(<SpecActionsView specDetail={mockSpecDetail} apiClient={mockApiClient} />);

      expect(screen.getByTestId('validation-section')).toBeInTheDocument();
    });
  });

  describe('Document Review', () => {
    it('calls executeDocumentReview when start review button is clicked', async () => {
      render(<SpecActionsView specDetail={mockSpecDetail} apiClient={mockApiClient} />);

      const startReviewButton = screen.getByTestId('start-review-button');
      fireEvent.click(startReviewButton);

      await waitFor(() => {
        expect(mockApiClient.executeDocumentReview).toHaveBeenCalledWith('user-authentication');
      });
    });
  });

  describe('Inspection', () => {
    it('calls executeInspection when start inspection button is clicked', async () => {
      render(<SpecActionsView specDetail={mockSpecDetail} apiClient={mockApiClient} />);

      const startInspectionButton = screen.getByTestId('start-inspection-button');
      fireEvent.click(startInspectionButton);

      await waitFor(() => {
        expect(mockApiClient.executeInspection).toHaveBeenCalledWith('user-authentication');
      });
    });
  });

  describe('Validation', () => {
    it('calls executeValidation with gap type when gap validation button is clicked', async () => {
      render(<SpecActionsView specDetail={mockSpecDetail} apiClient={mockApiClient} />);

      const gapValidationButton = screen.getByTestId('validation-gap-button');
      fireEvent.click(gapValidationButton);

      await waitFor(() => {
        expect(mockApiClient.executeValidation).toHaveBeenCalledWith('user-authentication', 'gap');
      });
    });

    it('calls executeValidation with design type when design validation button is clicked', async () => {
      render(<SpecActionsView specDetail={mockSpecDetail} apiClient={mockApiClient} />);

      const designValidationButton = screen.getByTestId('validation-design-button');
      fireEvent.click(designValidationButton);

      await waitFor(() => {
        expect(mockApiClient.executeValidation).toHaveBeenCalledWith('user-authentication', 'design');
      });
    });

    it('calls executeValidation with impl type when impl validation button is clicked', async () => {
      render(<SpecActionsView specDetail={mockSpecDetail} apiClient={mockApiClient} />);

      const implValidationButton = screen.getByTestId('validation-impl-button');
      fireEvent.click(implValidationButton);

      await waitFor(() => {
        expect(mockApiClient.executeValidation).toHaveBeenCalledWith('user-authentication', 'impl');
      });
    });
  });

  describe('Callbacks', () => {
    it('calls onActionExecuted when an action is executed', async () => {
      const onActionExecuted = vi.fn();
      render(
        <SpecActionsView
          specDetail={mockSpecDetail}
          apiClient={mockApiClient}
          onActionExecuted={onActionExecuted}
        />
      );

      const startReviewButton = screen.getByTestId('start-review-button');
      fireEvent.click(startReviewButton);

      await waitFor(() => {
        expect(onActionExecuted).toHaveBeenCalledWith('document-review', expect.any(Object));
      });
    });
  });
});
