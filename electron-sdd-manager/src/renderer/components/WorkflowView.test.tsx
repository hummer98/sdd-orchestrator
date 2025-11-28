/**
 * WorkflowView Component Tests
 * TDD: Testing main workflow view functionality
 * Requirements: 1.1-1.4, 3.1-3.5, 6.1-6.6, 7.1-7.6, 9.1-9.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkflowView } from './WorkflowView';
import { useSpecStore } from '../stores/specStore';
import { useWorkflowStore } from '../stores/workflowStore';
import type { SpecDetail, ArtifactInfo } from '../types';
import type { ExtendedSpecJson } from '../types/workflow';

// Mock stores
vi.mock('../stores/specStore', () => ({
  useSpecStore: vi.fn(),
}));

vi.mock('../stores/workflowStore', () => ({
  useWorkflowStore: vi.fn(),
}));

const mockArtifact: ArtifactInfo = {
  exists: true,
  updatedAt: '2024-01-01T00:00:00Z',
  content: '# Test Content',
};

const mockSpecDetail: SpecDetail = {
  metadata: {
    name: 'test-feature',
    path: '/test/path',
    phase: 'tasks-generated',
    updatedAt: '2024-01-01T00:00:00Z',
    approvals: {
      requirements: { generated: true, approved: true },
      design: { generated: true, approved: true },
      tasks: { generated: true, approved: true },
    },
    readyForImplementation: true,
  },
  specJson: {
    feature_name: 'test-feature',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    language: 'ja',
    phase: 'tasks-generated',
    approvals: {
      requirements: { generated: true, approved: true },
      design: { generated: true, approved: true },
      tasks: { generated: true, approved: true },
    },
    ready_for_implementation: true,
  } as ExtendedSpecJson,
  artifacts: {
    requirements: mockArtifact,
    design: mockArtifact,
    tasks: { ...mockArtifact, content: '- [x] Task 1\n- [ ] Task 2' },
  },
  taskProgress: { total: 2, completed: 1, percentage: 50 },
};

const mockWorkflowState = {
  autoExecutionPermissions: {
    requirements: true,
    design: false,
    tasks: false,
    impl: false,
    inspection: false,
    deploy: false,
  },
  validationOptions: { gap: false, design: false, impl: false },
  isAutoExecuting: false,
  currentAutoPhase: null,
  toggleAutoPermission: vi.fn(),
  toggleValidationOption: vi.fn(),
  startAutoExecution: vi.fn(),
  stopAutoExecution: vi.fn(),
  setCurrentAutoPhase: vi.fn(),
  resetSettings: vi.fn(),
  isPhaseAutoPermitted: vi.fn((phase: string) => phase === 'requirements'),
  getNextAutoPhase: vi.fn(),
};

describe('WorkflowView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSpecStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      specDetail: mockSpecDetail,
      isLoading: false,
      selectedSpec: mockSpecDetail.metadata,
    });
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockWorkflowState);
  });

  // ============================================================
  // Task 7.1: 6 phases vertical display
  // Requirements: 1.1, 1.2, 1.3
  // ============================================================
  describe('Task 7.1: 6 phases vertical display', () => {
    it('should display all 6 phases', () => {
      render(<WorkflowView />);

      expect(screen.getByText('要件定義')).toBeInTheDocument();
      expect(screen.getByText('設計')).toBeInTheDocument();
      expect(screen.getByText('タスク')).toBeInTheDocument();
      expect(screen.getByText('実装')).toBeInTheDocument();
      expect(screen.getByText('検査')).toBeInTheDocument();
      expect(screen.getByText('デプロイ')).toBeInTheDocument();
    });

    it('should display phase connectors (arrows)', () => {
      render(<WorkflowView />);

      // Should have 5 connectors for 6 phases
      const connectors = screen.getAllByTestId('phase-connector');
      expect(connectors.length).toBe(5);
    });

    it('should display approved status for approved phases', () => {
      render(<WorkflowView />);

      // Requirements, design, tasks should show approved
      const approvedBadges = screen.getAllByText('承認済');
      expect(approvedBadges.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ============================================================
  // Task 7.2: Validation options placement
  // Requirements: 4.1, 4.2, 4.3
  // ============================================================
  describe('Task 7.2: Validation options placement', () => {
    it('should display validate-gap option between requirements and design', () => {
      render(<WorkflowView />);

      expect(screen.getByText('validate-gap')).toBeInTheDocument();
    });

    it('should display validate-design option between design and tasks', () => {
      render(<WorkflowView />);

      expect(screen.getByText('validate-design')).toBeInTheDocument();
    });

    it('should display validate-impl option between impl and inspection', () => {
      render(<WorkflowView />);

      expect(screen.getByText('validate-impl')).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 7.6: Footer buttons
  // Requirements: 1.4, 9.1, 9.2, 9.3
  // ============================================================
  describe('Task 7.6: Footer buttons', () => {
    it('should display auto-execute button', () => {
      render(<WorkflowView />);

      expect(screen.getByRole('button', { name: /自動実行/i })).toBeInTheDocument();
    });

    it('should display spec-status button', () => {
      render(<WorkflowView />);

      expect(screen.getByRole('button', { name: /spec-status/i })).toBeInTheDocument();
    });

    it('should spec-status button be always enabled', () => {
      render(<WorkflowView />);

      const button = screen.getByRole('button', { name: /spec-status/i });
      expect(button).not.toBeDisabled();
    });
  });

  // ============================================================
  // Loading and empty states
  // ============================================================
  describe('Loading and empty states', () => {
    it('should display loading state', () => {
      (useSpecStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        specDetail: null,
        isLoading: true,
        selectedSpec: mockSpecDetail.metadata,
      });

      render(<WorkflowView />);

      expect(screen.getByText(/読み込み中/i)).toBeInTheDocument();
    });

    it('should display empty state when no spec selected', () => {
      (useSpecStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        specDetail: null,
        isLoading: false,
        selectedSpec: null,
      });

      render(<WorkflowView />);

      expect(screen.getByText(/仕様を選択してください/i)).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 7.4: Auto execution mode
  // Requirements: 6.1, 6.2
  // ============================================================
  describe('Task 7.4: Auto execution mode', () => {
    it('should change button to stop when auto executing', () => {
      (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...mockWorkflowState,
        isAutoExecuting: true,
      });

      render(<WorkflowView />);

      expect(screen.getByRole('button', { name: /停止/i })).toBeInTheDocument();
    });
  });
});
