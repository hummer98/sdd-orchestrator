/**
 * PhaseExecutionPanel Component Tests
 * Task 33.2: PhaseExecutionPanel update with execution groups
 * Requirements: 6.1-6.8
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PhaseExecutionPanel } from './PhaseExecutionPanel';
import { useSpecStore } from '../stores/specStore';
import { useExecutionStore } from '../stores/executionStore';
import { useAgentStore } from '../stores/agentStore';
import type { SpecDetail, SpecJson, SpecMetadata, SpecPhase } from '../types';

// Mock the stores
vi.mock('../stores/specStore');
vi.mock('../stores/executionStore');
vi.mock('../stores/agentStore');

const mockUseSpecStore = useSpecStore as unknown as ReturnType<typeof vi.fn>;
const mockUseExecutionStore = useExecutionStore as unknown as ReturnType<typeof vi.fn>;
const mockUseAgentStore = useAgentStore as unknown as ReturnType<typeof vi.fn>;

describe('PhaseExecutionPanel - Task 33.2', () => {
  const mockExecutePhase = vi.fn();
  const mockExecuteImpl = vi.fn();
  const mockRefreshSpecs = vi.fn();
  const mockStartAgent = vi.fn();
  const mockGetAgentsForSpec = vi.fn();

  const baseSpecJson: SpecJson = {
    feature_name: 'feature-1',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    language: 'ja',
    phase: 'tasks-generated',
    approvals: {
      requirements: { generated: true, approved: true },
      design: { generated: true, approved: true },
      tasks: { generated: true, approved: true },
    },
  };

  const baseSpec: SpecMetadata = {
    name: 'feature-1',
    path: '/path/to/feature-1',
    phase: 'tasks-generated' as SpecPhase,
    updatedAt: '2025-01-01T00:00:00Z',
    approvals: baseSpecJson.approvals,
  };

  const baseSpecDetail: SpecDetail = {
    metadata: baseSpec,
    specJson: baseSpecJson,
    artifacts: {
      requirements: { exists: true, updatedAt: null },
      design: { exists: true, updatedAt: null },
      tasks: { exists: true, updatedAt: null },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseSpecStore.mockReturnValue({
      selectedSpec: baseSpec,
      specDetail: baseSpecDetail,
      refreshSpecs: mockRefreshSpecs,
    });

    mockUseExecutionStore.mockReturnValue({
      isExecuting: false,
      currentPhase: null,
      executePhase: mockExecutePhase,
      executeImpl: mockExecuteImpl,
    });

    mockUseAgentStore.mockReturnValue({
      startAgent: mockStartAgent,
      getAgentsForSpec: mockGetAgentsForSpec.mockReturnValue([]),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Phase execution buttons', () => {
    it('should render phase buttons', () => {
      render(<PhaseExecutionPanel />);

      expect(screen.getByRole('button', { name: /要件定義/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /設計/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /タスク/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /実装/i })).toBeInTheDocument();
    });
  });

  describe('Button states based on agent status', () => {
    it('should show loading indicator when executing', () => {
      mockUseExecutionStore.mockReturnValue({
        isExecuting: true,
        currentPhase: 'requirements',
        executePhase: mockExecutePhase,
        executeImpl: mockExecuteImpl,
      });

      render(<PhaseExecutionPanel />);

      // Check for loading indicator
      const loadingIndicator = document.querySelector('.animate-spin');
      expect(loadingIndicator).toBeInTheDocument();
    });

    it('should have auto-approve checkbox', () => {
      render(<PhaseExecutionPanel />);

      expect(screen.getByLabelText(/自動承認/i)).toBeInTheDocument();
    });
  });

  describe('Return null when no spec selected', () => {
    it('should return null when no selectedSpec', () => {
      mockUseSpecStore.mockReturnValue({
        selectedSpec: null,
        specDetail: null,
        refreshSpecs: mockRefreshSpecs,
      });

      const { container } = render(<PhaseExecutionPanel />);

      expect(container.firstChild).toBeNull();
    });
  });
});
