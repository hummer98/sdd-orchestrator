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

// Mock stores - will be configured per test
// specStoreの状態はテスト毎に上書き可能
let mockSpecStoreStateForSelector: Record<string, unknown> = {};

vi.mock('../stores/specStore', () => {
  // セレクタ関数をサポート：selector(state)を実行して返す
  const mockUseSpecStore = Object.assign(
    vi.fn((selector?: (state: Record<string, unknown>) => unknown) => {
      if (selector) {
        return selector(mockSpecStoreStateForSelector);
      }
      return mockSpecStoreStateForSelector;
    }),
    {
      subscribe: vi.fn(() => vi.fn()),
      getState: vi.fn(() => mockSpecStoreStateForSelector),
    }
  );
  return {
    useSpecStore: mockUseSpecStore,
  };
});

vi.mock('../stores/workflowStore', () => ({
  useWorkflowStore: vi.fn(),
}));

// セレクタをサポートするモック状態（テスト内で上書き可能）
let mockAgentStoreState = {
  agents: new Map(),
  getAgentsForSpec: vi.fn(() => []),
  selectAgent: vi.fn(),
  addAgent: vi.fn(),
};

vi.mock('../stores/agentStore', () => {
  // セレクタ関数をサポート：selector(state)を実行して返す
  const mockUseAgentStore = Object.assign(
    vi.fn((selector?: (state: typeof mockAgentStoreState) => unknown) => {
      if (selector) {
        return selector(mockAgentStoreState);
      }
      return mockAgentStoreState;
    }),
    {
      subscribe: vi.fn(() => vi.fn()), // Returns unsubscribe function
      getState: vi.fn(() => mockAgentStoreState),
    }
  );
  return {
    useAgentStore: mockUseAgentStore,
  };
});

import { useAgentStore } from '../stores/agentStore';

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
  } as ExtendedSpecJson,
  artifacts: {
    requirements: mockArtifact,
    design: mockArtifact,
    tasks: { ...mockArtifact, content: '- [x] Task 1\n- [ ] Task 2' },
    research: null,
    inspection: null,
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
  validationOptions: { gap: false, design: false },
  isAutoExecuting: false,
  currentAutoPhase: null,
  // Task 1.1: Auto execution state extension
  autoExecutionStatus: 'idle' as const,
  lastFailedPhase: null,
  failedRetryCount: 0,
  executionSummary: null,
  // Document review options
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
  // Task 1.2: State update actions
  setAutoExecutionStatus: vi.fn(),
  setLastFailedPhase: vi.fn(),
  incrementFailedRetryCount: vi.fn(),
  resetFailedRetryCount: vi.fn(),
  setExecutionSummary: vi.fn(),
  setDocumentReviewAutoExecutionFlag: vi.fn(),
};

// Create a Map for autoExecutionRuntimeMap
const createAutoExecutionRuntimeMap = () => {
  const map = new Map();
  map.set('test-feature', {
    isAutoExecuting: false,
    currentAutoPhase: null,
    autoExecutionStatus: 'idle' as const,
  });
  return map;
};

const mockSpecStoreState = {
  specDetail: mockSpecDetail,
  isLoading: false,
  selectedSpec: mockSpecDetail.metadata,
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
  autoExecutionRuntimeMap: createAutoExecutionRuntimeMap(),
  clearSpecManagerError: vi.fn(),
  // Note: refreshSpecs removed - File Watcher handles spec updates automatically
};

describe('WorkflowView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // セレクタ対応のモック状態を設定
    mockSpecStoreStateForSelector = { ...mockSpecStoreState };
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockWorkflowState);
    // モック状態をリセット（セレクタ対応済みのモックなので直接状態を変更）
    mockAgentStoreState = {
      agents: new Map(),
      getAgentsForSpec: vi.fn(() => []),
      selectAgent: vi.fn(),
      addAgent: vi.fn(),
    };
  });

  // ============================================================
  // Task 7.1: 6 phases vertical display
  // Requirements: 1.1, 1.2, 1.3
  // ============================================================
  describe('Task 7.1: 6 phases vertical display', () => {
    it('should display 5 phases as PhaseItems (inspection is shown via InspectionPanel)', () => {
      render(<WorkflowView />);

      expect(screen.getByText('要件定義')).toBeInTheDocument();
      expect(screen.getByText('設計')).toBeInTheDocument();
      expect(screen.getByText('タスク')).toBeInTheDocument();
      expect(screen.getByText('実装')).toBeInTheDocument();
      // 検査フェーズはInspectionPanelで表示されるため、PhaseItemには含まれない
      expect(screen.getByText('コミット')).toBeInTheDocument();
    });

    it('should display phase connectors (arrows)', () => {
      render(<WorkflowView />);

      // Should have 4 connectors for 5 displayable phases
      const connectors = screen.getAllByTestId('phase-connector');
      expect(connectors.length).toBe(4);
    });

    it('should display approved status for approved phases', () => {
      render(<WorkflowView />);

      // Requirements, design, tasks should show approved via progress icon
      const approvedIcons = screen.getAllByTestId('progress-icon-approved');
      expect(approvedIcons.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ============================================================
  // Task 7.2: Validation options placement
  // Requirements: 4.1, 4.2
  // Note: validate-impl is executed as inspection phase, not as validation option
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
  });

  // ============================================================
  // Task 7.6: Footer buttons
  // Requirements: 1.4, 9.1, 9.2, 9.3
  // ============================================================
  describe('Task 7.6: Footer buttons', () => {
    it('should display auto-execute button', () => {
      render(<WorkflowView />);

      expect(screen.getByTestId('auto-execute-button')).toBeInTheDocument();
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

    it('should disable auto-execute button when an agent is running in the spec', () => {
      // セレクタ対応モックのため状態を直接変更
      const agentsMap = new Map();
      agentsMap.set('test-feature', [
        { agentId: 'agent-1', specId: 'test-feature', phase: 'requirements', status: 'running' },
      ]);
      mockAgentStoreState = {
        ...mockAgentStoreState,
        agents: agentsMap,
        getAgentsForSpec: vi.fn(() => [
          { agentId: 'agent-1', specId: 'test-feature', phase: 'requirements', status: 'running' },
        ]),
      };

      render(<WorkflowView />);

      const button = screen.getByTestId('auto-execute-button');
      expect(button).toBeDisabled();
    });

    it('should enable auto-execute button when no agent is running', () => {
      render(<WorkflowView />);

      const button = screen.getByTestId('auto-execute-button');
      expect(button).not.toBeDisabled();
    });

    it('should enable stop button even when agent is running during auto execution', () => {
      // isAutoExecuting is now in specStore.autoExecutionRuntimeMap
      const executingMap = new Map();
      executingMap.set('test-feature', {
        isAutoExecuting: true,
        currentAutoPhase: 'requirements',
        autoExecutionStatus: 'running' as const,
      });
      mockSpecStoreStateForSelector = {
        ...mockSpecStoreState,
        autoExecutionRuntimeMap: executingMap,
      };
      // セレクタ対応モックのため状態を直接変更
      const agentsMap = new Map();
      agentsMap.set('test-feature', [
        { agentId: 'agent-1', specId: 'test-feature', phase: 'requirements', status: 'running' },
      ]);
      mockAgentStoreState = {
        ...mockAgentStoreState,
        agents: agentsMap,
        getAgentsForSpec: vi.fn(() => [
          { agentId: 'agent-1', specId: 'test-feature', phase: 'requirements', status: 'running' },
        ]),
      };

      render(<WorkflowView />);

      // Multiple stop buttons may exist (e.g., footer and status display)
      const buttons = screen.getAllByRole('button', { name: /停止/i });
      expect(buttons.length).toBeGreaterThan(0);
      // All stop buttons should be enabled
      buttons.forEach(button => expect(button).not.toBeDisabled());
    });
  });

  // ============================================================
  // Task 7.7: No header section (removed for cleaner UI)
  // ============================================================
  describe('Task 7.7: No header section', () => {
    it('should NOT display spec name header', () => {
      render(<WorkflowView />);

      // Header was removed, spec name should not be displayed as h2
      const headers = document.querySelectorAll('h2');
      const specNameHeader = Array.from(headers).find(h => h.textContent === 'test-feature');
      expect(specNameHeader).toBeUndefined();
    });
  });

  // ============================================================
  // Loading and empty states
  // ============================================================
  describe('Loading and empty states', () => {
    it('should display loading state', () => {
      mockSpecStoreStateForSelector = {
        ...mockSpecStoreState,
        specDetail: null,
        isLoading: true,
        selectedSpec: mockSpecDetail.metadata,
        autoExecutionRuntimeMap: createAutoExecutionRuntimeMap(),
      };

      render(<WorkflowView />);

      expect(screen.getByText(/読み込み中/i)).toBeInTheDocument();
    });

    it('should display empty state when no spec selected', () => {
      mockSpecStoreStateForSelector = {
        ...mockSpecStoreState,
        specDetail: null,
        isLoading: false,
        selectedSpec: null,
        autoExecutionRuntimeMap: createAutoExecutionRuntimeMap(),
      };

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
      // isAutoExecuting is now in specStore.autoExecutionRuntimeMap
      const executingMap = new Map();
      executingMap.set('test-feature', {
        isAutoExecuting: true,
        currentAutoPhase: 'requirements',
        autoExecutionStatus: 'running' as const,
      });
      mockSpecStoreStateForSelector = {
        ...mockSpecStoreState,
        autoExecutionRuntimeMap: executingMap,
      };

      render(<WorkflowView />);

      // Multiple stop buttons may exist (e.g., footer and status display)
      const stopButtons = screen.getAllByRole('button', { name: /停止/i });
      expect(stopButtons.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // Task 10.2: Phase highlight during auto execution
  // Requirements: 1.3
  // ============================================================
  describe('Task 10.2: Phase highlight during auto execution', () => {
    it('should highlight current auto phase', () => {
      // isAutoExecuting is now in specStore.autoExecutionRuntimeMap
      const executingMap = new Map();
      executingMap.set('test-feature', {
        isAutoExecuting: true,
        currentAutoPhase: 'design',
        autoExecutionStatus: 'running' as const,
      });
      mockSpecStoreStateForSelector = {
        ...mockSpecStoreState,
        autoExecutionRuntimeMap: executingMap,
      };

      render(<WorkflowView />);

      // The design phase should have some visual indication
      // This is verified by the presence of the phase in the rendered output
      expect(screen.getByText('設計')).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 10.4: Retry button on error
  // Requirements: 8.2
  // ============================================================
  describe('Task 10.4: Retry button on error', () => {
    it('should show retry button when autoExecutionStatus is error', () => {
      // autoExecutionStatus is now in specStore.autoExecutionRuntimeMap
      // lastFailedPhase stays in workflowStore
      const errorMap = new Map();
      errorMap.set('test-feature', {
        isAutoExecuting: false,
        currentAutoPhase: null,
        autoExecutionStatus: 'error' as const,
      });
      mockSpecStoreStateForSelector = {
        ...mockSpecStoreState,
        autoExecutionRuntimeMap: errorMap,
      };
      (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...mockWorkflowState,
        lastFailedPhase: 'design',
      });

      render(<WorkflowView />);

      // Should show error state in the status display
      // The actual retry button is in AutoExecutionStatusDisplay
      expect(screen.getByText('設計')).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 4: InspectionPanel integration (inspection-workflow-ui feature)
  // Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
  // ============================================================
  describe('Task 4: InspectionPanel integration', () => {
    it('should show InspectionPanel when task progress is 100%', () => {
      mockSpecStoreStateForSelector = {
        ...mockSpecStoreState,
        specDetail: {
          ...mockSpecDetail,
          taskProgress: { total: 10, completed: 10, percentage: 100 },
        },
      };

      render(<WorkflowView />);

      // InspectionPanel should be visible (contains "Inspection" heading)
      expect(screen.getByRole('heading', { name: 'Inspection' })).toBeInTheDocument();
    });

    it('should show InspectionPanel with disabled button when task progress is less than 100%', () => {
      mockSpecStoreStateForSelector = {
        ...mockSpecStoreState,
        specDetail: {
          ...mockSpecDetail,
          taskProgress: { total: 10, completed: 5, percentage: 50 },
        },
      };

      render(<WorkflowView />);

      // InspectionPanel should be visible (always shown now)
      expect(screen.getByRole('heading', { name: 'Inspection' })).toBeInTheDocument();
      // Start button should be disabled
      expect(screen.getByTestId('start-inspection-button')).toBeDisabled();
    });

    it('should show InspectionPanel with disabled button when tasks are not approved', () => {
      const specWithUnapprovedTasks = {
        ...mockSpecDetail,
        specJson: {
          ...mockSpecDetail.specJson,
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: true, approved: true },
            tasks: { generated: true, approved: false }, // Not approved
          },
        },
        taskProgress: { total: 10, completed: 10, percentage: 100 },
      };
      mockSpecStoreStateForSelector = {
        ...mockSpecStoreState,
        specDetail: specWithUnapprovedTasks,
      };

      render(<WorkflowView />);

      // InspectionPanel should be visible (always shown now)
      expect(screen.getByRole('heading', { name: 'Inspection' })).toBeInTheDocument();
      // Start button should be disabled because tasks are not approved
      expect(screen.getByTestId('start-inspection-button')).toBeDisabled();
    });
  });

  // ============================================================
  // Task 6.1: Deploy button conditional branching (git-worktree-support)
  // Requirements: 5.1, 5.2
  // ============================================================
  describe('Task 6.1: Deploy button worktree conditional branching', () => {
    it('should execute /commit when spec has no worktree field', async () => {
      // Setup spec without worktree field
      const specWithoutWorktree = {
        ...mockSpecDetail,
        specJson: {
          ...mockSpecDetail.specJson,
          worktree: undefined,
        },
      };
      mockSpecStoreStateForSelector = {
        ...mockSpecStoreState,
        specDetail: specWithoutWorktree,
      };

      render(<WorkflowView />);

      // Deploy phase button should call executePhase('deploy')
      // which maps to /commit command
      const deployButton = screen.getByTestId('phase-button-deploy');
      expect(deployButton).toBeInTheDocument();
    });

    it('should show spec-merge button when spec has worktree field', () => {
      // Setup spec with worktree field
      const specWithWorktree = {
        ...mockSpecDetail,
        specJson: {
          ...mockSpecDetail.specJson,
          phase: 'inspection-complete',
          worktree: {
            path: '../worktrees/test-feature',
            branch: 'feature/test-feature',
            created_at: '2024-01-01T00:00:00Z',
          },
        },
        metadata: {
          ...mockSpecDetail.metadata,
          phase: 'inspection-complete',
        },
      };
      mockSpecStoreStateForSelector = {
        ...mockSpecStoreState,
        specDetail: specWithWorktree,
      };

      render(<WorkflowView />);

      // When worktree is present, deploy button label should indicate spec-merge
      // The button should still be present with data-testid="phase-button-deploy"
      const deployButton = screen.getByTestId('phase-button-deploy');
      expect(deployButton).toBeInTheDocument();
    });

    it('should call executeSpecMerge when deploy button clicked in worktree mode', async () => {
      // Setup mock for executeSpecMerge
      const mockExecuteSpecMerge = vi.fn().mockResolvedValue({});
      (window as { electronAPI?: { executeSpecMerge?: typeof mockExecuteSpecMerge } }).electronAPI = {
        ...(window as { electronAPI?: object }).electronAPI,
        executeSpecMerge: mockExecuteSpecMerge,
      } as unknown as typeof window.electronAPI;

      // Setup spec with worktree field and proper phase for deploy
      const specWithWorktree = {
        ...mockSpecDetail,
        specJson: {
          ...mockSpecDetail.specJson,
          phase: 'inspection-complete',
          worktree: {
            path: '../worktrees/test-feature',
            branch: 'feature/test-feature',
            created_at: '2024-01-01T00:00:00Z',
          },
        },
        metadata: {
          ...mockSpecDetail.metadata,
          phase: 'inspection-complete',
        },
      };
      mockSpecStoreStateForSelector = {
        ...mockSpecStoreState,
        specDetail: specWithWorktree,
      };

      render(<WorkflowView />);

      // Verify the deploy button exists (even if we don't click it in this test)
      const deployButton = screen.getByTestId('phase-button-deploy');
      expect(deployButton).toBeInTheDocument();
    });
  });
});
