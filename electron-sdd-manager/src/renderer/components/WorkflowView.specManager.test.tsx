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
      lastCheckResult: null,
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
  // Task 8.1: spec-manager用UI表示
  // Requirements: 5.2, 5.3, 5.4, 5.5
  // ============================================================
  describe('Task 8.1: spec-manager UI display', () => {
    describe('progress display', () => {
      it('should display "実行中..." when isRunning is true', () => {
        createMockStores({
          specStore: {
            specManagerExecution: {
              isRunning: true,
              currentPhase: 'requirements',
              currentSpecId: 'test-feature',
              implTaskStatus: 'running',
            },
          },
        });

        render(<WorkflowView />);

        // Should show running indicator
        expect(screen.queryByText(/実行中/)).toBeInTheDocument();
      });

      it('should display next phase button when subtype is success', () => {
        createMockStores({
          specStore: {
            specManagerExecution: {
              isRunning: false,
              currentPhase: 'requirements',
              lastCheckResult: {
                status: 'success',
                completedTasks: ['1.1', '1.2'],
                stats: { num_turns: 5, duration_ms: 60000, total_cost_usd: 0.15 },
              },
              implTaskStatus: 'success',
            },
          },
        });

        render(<WorkflowView />);

        // Should show completed tasks in the result
        expect(screen.queryByText(/完了したタスク/)).toBeInTheDocument();
      });
    });

    describe('error display', () => {
      it('should display error details when error occurs', () => {
        createMockStores({
          specStore: {
            specManagerExecution: {
              isRunning: false,
              error: 'Generation failed: timeout',
              implTaskStatus: 'error',
            },
          },
        });

        render(<WorkflowView />);

        expect(screen.queryByText(/Generation failed/)).toBeInTheDocument();
      });

      it('should display re-execution button on error', () => {
        createMockStores({
          specStore: {
            specManagerExecution: {
              isRunning: false,
              error: 'Some error',
              implTaskStatus: 'error',
            },
          },
        });

        render(<WorkflowView />);

        // Should show retry/re-execute button
        expect(screen.queryByText(/再実行/)).toBeInTheDocument();
      });
    });

    describe('real-time state reflection', () => {
      it('should update UI when specManagerExecution state changes', () => {
        const { defaultSpecStore } = createMockStores();

        const { rerender } = render(<WorkflowView />);

        // Update state
        defaultSpecStore.specManagerExecution.isRunning = true;
        defaultSpecStore.specManagerExecution.currentPhase = 'design';

        rerender(<WorkflowView />);

        // UI should reflect the change
      });
    });
  });

  // ============================================================
  // Task 8.2: リトライ状態表示
  // Requirements: 5.7, 5.8
  // ============================================================
  describe('Task 8.2: retry state display', () => {
    describe('continuing state', () => {
      it('should display "継続処理中...(リトライ 1/2)" when continuing', () => {
        createMockStores({
          specStore: {
            specManagerExecution: {
              isRunning: true,
              implTaskStatus: 'continuing',
              retryCount: 1,
            },
          },
        });

        render(<WorkflowView />);

        expect(screen.queryByText(/継続処理中/)).toBeInTheDocument();
        expect(screen.queryByText(/リトライ 1\/2/)).toBeInTheDocument();
      });

      it('should display "継続処理中...(リトライ 2/2)" for second retry', () => {
        createMockStores({
          specStore: {
            specManagerExecution: {
              isRunning: true,
              implTaskStatus: 'continuing',
              retryCount: 2,
            },
          },
        });

        render(<WorkflowView />);

        expect(screen.queryByText(/リトライ 2\/2/)).toBeInTheDocument();
      });
    });

    describe('stalled state', () => {
      it('should display "完了確認できず - 手動確認が必要" when stalled', () => {
        createMockStores({
          specStore: {
            specManagerExecution: {
              isRunning: false,
              implTaskStatus: 'stalled',
              retryCount: 2,
            },
          },
        });

        render(<WorkflowView />);

        expect(screen.queryByText(/完了確認できず/)).toBeInTheDocument();
        expect(screen.queryByText(/手動確認が必要/)).toBeInTheDocument();
      });
    });

    describe('ImplTaskStatus-based UI switching', () => {
      const statusDisplayMap = {
        pending: null, // No special display
        running: '実行中',
        continuing: '継続処理中',
        success: '完了',
        error: 'エラー',
        stalled: '完了確認できず',
      };

      Object.entries(statusDisplayMap).forEach(([status, expectedText]) => {
        if (expectedText) {
          it(`should display "${expectedText}" for ${status} status`, () => {
            createMockStores({
              specStore: {
                specManagerExecution: {
                  isRunning: status === 'running' || status === 'continuing',
                  implTaskStatus: status,
                  retryCount: status === 'continuing' ? 1 : 0,
                },
              },
            });

            render(<WorkflowView />);

            expect(screen.queryByText(new RegExp(expectedText))).toBeInTheDocument();
          });
        }
      });
    });
  });

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
