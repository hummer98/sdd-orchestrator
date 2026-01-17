/**
 * WorkflowView - spec-manager Extensions Tests
 * TDD: Testing spec-manager UI display and retry state display
 * Requirements: 5.2, 5.3, 5.4, 5.5, 5.7, 5.8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkflowView } from './WorkflowView';
import { useSpecStore } from '../stores/specStore';
import { useWorkflowStore } from '../stores/workflowStore';
import { useAgentStore } from '../stores/agentStore';
import '@testing-library/jest-dom';

// Mock stores
vi.mock('../stores/specStore', () => ({
  useSpecStore: vi.fn(),
}));

vi.mock('../stores/workflowStore', () => ({
  useWorkflowStore: vi.fn(),
}));

// Mock agentStore with subscribe and getState methods for AutoExecutionService
const mockAgentStoreState = {
  agents: [],
  getAgentsForSpec: vi.fn(() => []),
  selectAgent: vi.fn(),
  addAgent: vi.fn(),
};

vi.mock('../stores/agentStore', () => {
  const mockUseAgentStore = Object.assign(vi.fn(() => mockAgentStoreState), {
    subscribe: vi.fn(() => vi.fn()), // Returns unsubscribe function
    getState: vi.fn(() => mockAgentStoreState),
  });
  return {
    useAgentStore: mockUseAgentStore,
  };
});

const mockSpecDetail = {
  metadata: {
    name: 'test-feature',
    path: '/test/.kiro/specs/test-feature',
    phase: 'tasks-generated' as const,
    updatedAt: '2024-01-01T00:00:00Z',
    approvals: {
      requirements: { generated: true, approved: true },
      design: { generated: true, approved: true },
      tasks: { generated: true, approved: true },
    },
  },
  specJson: {
    feature_name: 'test-feature',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    language: 'ja' as const,
    phase: 'tasks-generated' as const,
    approvals: {
      requirements: { generated: true, approved: true },
      design: { generated: true, approved: true },
      tasks: { generated: true, approved: true },
    },
  },
  artifacts: {
    requirements: { exists: true, updatedAt: null, content: '# Requirements' },
    design: { exists: true, updatedAt: null, content: '# Design' },
    tasks: { exists: true, updatedAt: null, content: '- [x] 1.1 Task 1\n- [ ] 1.2 Task 2' },
    research: null,
    inspection: null,
  },
  taskProgress: {
    total: 2,
    completed: 1,
    percentage: 50,
  },
};

const createMockStores = (overrides: any = {}) => {
  const defaultSpecStore = {
    specDetail: mockSpecDetail,
    selectedSpec: mockSpecDetail.metadata,
    isLoading: false,
    specManagerExecution: {
      isRunning: false,
      currentPhase: null,
      currentSpecId: null,
      // execution-store-consolidation: lastCheckResult REMOVED (Req 6.5)
      error: null,
      implTaskStatus: null,
      retryCount: 0,
      executionMode: null,
    },
    // spec-scoped-auto-execution-state Task 5.1: Auto execution runtime state (as Map)
    autoExecutionRuntimeMap: new Map([
      ['test-feature', {
        isAutoExecuting: false,
        currentAutoPhase: null,
        autoExecutionStatus: 'idle' as const,
      }],
    ]),
    clearSpecManagerError: vi.fn(),
    // Note: refreshSpecs removed - File Watcher handles spec updates automatically
    ...overrides.specStore,
  };

  const defaultWorkflowStore = {
    autoExecutionPermissions: {
      requirements: true,
      design: false,
      tasks: false,
      impl: false,
      inspection: false,
      deploy: false,
    },
    validationOptions: {
      gap: false,
      design: false,
      impl: false,
    },
    isAutoExecuting: false,
    currentAutoPhase: null,
    autoExecutionStatus: 'idle' as const,
    lastFailedPhase: null,
    failedRetryCount: 0,
    executionSummary: null,
    documentReviewOptions: {
      autoExecutionFlag: 'run' as const,
    },
    toggleAutoPermission: vi.fn(),
    toggleValidationOption: vi.fn(),
    startAutoExecution: vi.fn(),
    stopAutoExecution: vi.fn(),
    setCurrentAutoPhase: vi.fn(),
    resetSettings: vi.fn(),
    isPhaseAutoPermitted: vi.fn((phase: string) => phase === 'requirements'),
    getNextAutoPhase: vi.fn(),
    setAutoExecutionStatus: vi.fn(),
    setLastFailedPhase: vi.fn(),
    incrementFailedRetryCount: vi.fn(),
    resetFailedRetryCount: vi.fn(),
    setExecutionSummary: vi.fn(),
    setDocumentReviewAutoExecutionFlag: vi.fn(),
    ...overrides.workflowStore,
  };

  const defaultAgentStore = {
    agents: [],
    getAgentsForSpec: vi.fn().mockReturnValue([]),
    addAgent: vi.fn(),
    selectAgent: vi.fn(),
    ...overrides.agentStore,
  };

  (useSpecStore as any).mockImplementation((selector: any) =>
    selector ? selector(defaultSpecStore) : defaultSpecStore
  );
  (useWorkflowStore as any).mockImplementation((selector: any) =>
    selector ? selector(defaultWorkflowStore) : defaultWorkflowStore
  );
  (useAgentStore as any).mockImplementation((selector: any) =>
    selector ? selector(defaultAgentStore) : defaultAgentStore
  );
  // Also update the static methods
  (useAgentStore as any).getState = vi.fn(() => defaultAgentStore);
  (useAgentStore as any).subscribe = vi.fn(() => vi.fn());

  return { defaultSpecStore, defaultWorkflowStore, defaultAgentStore };
};

describe('WorkflowView - spec-manager Extensions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // SpecManagerStatusDisplay REMOVED
  // Agent execution state is now displayed via AgentListPanel
  // (running/completed/failed/hang/interrupted status icons)
  // ============================================================

  // ============================================================
  // Task Parsing: FIX-N format support
  // ============================================================
  describe('Task Parsing - FIX-N format support', () => {
    it('should parse standard numeric task IDs (1.1 format)', () => {
      createMockStores({
        specStore: {
          specDetail: {
            ...mockSpecDetail,
            artifacts: {
              ...mockSpecDetail.artifacts,
              tasks: {
                exists: true,
                updatedAt: null,
                content: '- [x] 1.1 First task\n- [ ] 1.2 Second task',
              },
            },
          },
        },
      });

      render(<WorkflowView />);

      expect(screen.getByText('First task')).toBeInTheDocument();
      expect(screen.getByText('Second task')).toBeInTheDocument();
    });

    it('should parse FIX-N format task IDs from inspection fixes', () => {
      createMockStores({
        specStore: {
          specDetail: {
            ...mockSpecDetail,
            artifacts: {
              ...mockSpecDetail.artifacts,
              tasks: {
                exists: true,
                updatedAt: null,
                content: '- [ ] FIX-1 エラーハンドリングの追加\n- [ ] FIX-2 バリデーション修正',
              },
            },
          },
        },
      });

      render(<WorkflowView />);

      expect(screen.getByText('エラーハンドリングの追加')).toBeInTheDocument();
      expect(screen.getByText('バリデーション修正')).toBeInTheDocument();
    });

    it('should parse BUG-N format task IDs', () => {
      createMockStores({
        specStore: {
          specDetail: {
            ...mockSpecDetail,
            artifacts: {
              ...mockSpecDetail.artifacts,
              tasks: {
                exists: true,
                updatedAt: null,
                content: '- [x] BUG-123 Fix null pointer exception',
              },
            },
          },
        },
      });

      render(<WorkflowView />);

      expect(screen.getByText('Fix null pointer exception')).toBeInTheDocument();
    });

    it('should parse (P) parallel task markers', () => {
      createMockStores({
        specStore: {
          specDetail: {
            ...mockSpecDetail,
            artifacts: {
              ...mockSpecDetail.artifacts,
              tasks: {
                exists: true,
                updatedAt: null,
                content: '- [ ] (P) Parallel task one\n- [ ] (P) Parallel task two',
              },
            },
          },
        },
      });

      render(<WorkflowView />);

      expect(screen.getByText('Parallel task one')).toBeInTheDocument();
      expect(screen.getByText('Parallel task two')).toBeInTheDocument();
    });

    it('should handle mixed task ID formats', () => {
      createMockStores({
        specStore: {
          specDetail: {
            ...mockSpecDetail,
            artifacts: {
              ...mockSpecDetail.artifacts,
              tasks: {
                exists: true,
                updatedAt: null,
                content: [
                  '- [x] 1.1 Standard task',
                  '- [ ] FIX-1 Inspection fix task',
                  '- [ ] (P) Parallel task',
                  '- [ ] Task without ID',
                ].join('\n'),
              },
            },
          },
        },
      });

      render(<WorkflowView />);

      expect(screen.getByText('Standard task')).toBeInTheDocument();
      expect(screen.getByText('Inspection fix task')).toBeInTheDocument();
      expect(screen.getByText('Parallel task')).toBeInTheDocument();
      expect(screen.getByText('Task without ID')).toBeInTheDocument();
    });

    it('should correctly identify completed vs pending tasks', () => {
      createMockStores({
        specStore: {
          specDetail: {
            ...mockSpecDetail,
            artifacts: {
              ...mockSpecDetail.artifacts,
              tasks: {
                exists: true,
                updatedAt: null,
                content: '- [x] FIX-1 Completed fix\n- [ ] FIX-2 Pending fix',
              },
            },
          },
        },
      });

      render(<WorkflowView />);

      // Both tasks should be rendered
      expect(screen.getByText('Completed fix')).toBeInTheDocument();
      expect(screen.getByText('Pending fix')).toBeInTheDocument();
    });

    it('should ignore nested sub-items (indented lines)', () => {
      createMockStores({
        specStore: {
          specDetail: {
            ...mockSpecDetail,
            artifacts: {
              ...mockSpecDetail.artifacts,
              tasks: {
                exists: true,
                updatedAt: null,
                content: [
                  '- [ ] FIX-1 Main task',
                  '  - 出典: inspection-1.md',
                  '  - 具体的な修正内容',
                ].join('\n'),
              },
            },
          },
        },
      });

      render(<WorkflowView />);

      // Only the main task should be parsed, not the nested items
      expect(screen.getByText('Main task')).toBeInTheDocument();
      expect(screen.queryByText('出典: inspection-1.md')).not.toBeInTheDocument();
    });
  });
});
