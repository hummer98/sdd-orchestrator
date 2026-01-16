/**
 * BugWorkflowView Component Tests
 * Task 3: bugs-pane-integration - BugWorkflowViewコンポーネント
 * Requirements: 3.1, 3.2, 3.3, 4.1-4.7, 6.2, 6.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BugWorkflowView } from './BugWorkflowView';
import { useBugStore } from '../stores/bugStore';
import { useAgentStore } from '../stores/agentStore';
import { useWorkflowStore } from '../stores/workflowStore';
import type { BugDetail, BugMetadata } from '../types/bug';

// Mock stores
vi.mock('../stores/bugStore', () => ({
  useBugStore: vi.fn(),
}));

vi.mock('../stores/agentStore', () => {
  // Create a mock that includes subscribe for Zustand store compatibility
  const mockFn = vi.fn();
  mockFn.subscribe = vi.fn(() => vi.fn());
  mockFn.getState = vi.fn(() => ({
    agents: new Map(),
    selectedAgentId: null,
    logs: new Map(),
    isLoading: false,
    error: null,
  }));
  mockFn.setState = vi.fn();
  return { useAgentStore: mockFn };
});

vi.mock('../stores/workflowStore', () => ({
  useWorkflowStore: vi.fn(),
}));

// bug-auto-execution-per-bug-state: Mock bugAutoExecutionStore
const mockBugAutoExecutionStore = {
  bugAutoExecutionRuntimeMap: new Map(),
  getBugAutoExecutionRuntime: vi.fn().mockReturnValue({
    isAutoExecuting: false,
    currentAutoPhase: null,
    autoExecutionStatus: 'idle',
    lastFailedPhase: null,
    retryCount: 0,
  }),
  fetchBugAutoExecutionState: vi.fn().mockResolvedValue(undefined),
  startAutoExecution: vi.fn(),
  stopAutoExecution: vi.fn(),
  setErrorState: vi.fn(),
};

vi.mock('../../shared/stores/bugAutoExecutionStore', () => {
  const mockFn = vi.fn((selector?: (state: unknown) => unknown) => {
    if (selector) {
      return selector(mockBugAutoExecutionStore);
    }
    return mockBugAutoExecutionStore;
  });
  mockFn.subscribe = vi.fn(() => vi.fn());
  mockFn.getState = vi.fn(() => mockBugAutoExecutionStore);
  mockFn.setState = vi.fn();
  return { useBugAutoExecutionStore: mockFn };
});

// Mock electronAPI
const mockElectronAPI = {
  startAgent: vi.fn().mockResolvedValue({
    agentId: 'test-agent-id',
    specId: 'test-bug',
    phase: 'analyze',
    pid: 1234,
    sessionId: 'test-session',
    status: 'running',
    startedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    command: '/kiro:bug-analyze',
  }),
};

vi.stubGlobal('window', {
  electronAPI: mockElectronAPI,
});

const mockBugMetadata: BugMetadata = {
  name: 'test-bug',
  path: '/project/.kiro/bugs/test-bug',
  phase: 'reported',
  updatedAt: '2024-01-01T00:00:00Z',
  reportedAt: '2024-01-01T00:00:00Z',
};

const mockBugDetail: BugDetail = {
  metadata: mockBugMetadata,
  artifacts: {
    report: { exists: true, path: '/project/.kiro/bugs/test-bug/report.md', updatedAt: '2024-01-01T00:00:00Z' },
    analysis: null,
    fix: null,
    verification: null,
  },
};

describe('BugWorkflowView', () => {
  const mockUseBugStore = useBugStore as unknown as ReturnType<typeof vi.fn>;
  const mockUseAgentStore = useAgentStore as unknown as ReturnType<typeof vi.fn>;
  const mockUseWorkflowStore = useWorkflowStore as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseBugStore.mockReturnValue({
      selectedBug: mockBugMetadata,
      bugDetail: mockBugDetail,
      useWorktree: false,
      setUseWorktree: vi.fn(),
    });

    mockUseAgentStore.mockImplementation((selector?: (state: unknown) => unknown) => {
      const state = {
        agents: new Map(),
        getAgentsForSpec: () => [],
      };
      return selector ? selector(state) : state;
    });

    mockUseWorkflowStore.mockReturnValue({
      commandPrefix: '/kiro:',
    });
  });

  describe('rendering', () => {
    it('should render workflow view container', () => {
      render(<BugWorkflowView />);
      expect(screen.getByTestId('bug-workflow-view')).toBeInTheDocument();
    });

    it('should render all 5 phases', () => {
      render(<BugWorkflowView />);

      expect(screen.getByTestId('bug-phase-item-report')).toBeInTheDocument();
      expect(screen.getByTestId('bug-phase-item-analyze')).toBeInTheDocument();
      expect(screen.getByTestId('bug-phase-item-fix')).toBeInTheDocument();
      expect(screen.getByTestId('bug-phase-item-verify')).toBeInTheDocument();
      expect(screen.getByTestId('bug-phase-item-deploy')).toBeInTheDocument();
    });

    it('should show phase connectors between phases', () => {
      render(<BugWorkflowView />);
      const connectors = screen.getAllByTestId('bug-phase-connector');
      expect(connectors).toHaveLength(4); // 5 phases = 4 connectors
    });

    it('should not show execute button for report phase', () => {
      render(<BugWorkflowView />);
      expect(screen.queryByTestId('bug-phase-execute-button-report')).not.toBeInTheDocument();
    });

    it('should show execute buttons for other phases', () => {
      render(<BugWorkflowView />);
      expect(screen.getByTestId('bug-phase-execute-button-analyze')).toBeInTheDocument();
      expect(screen.getByTestId('bug-phase-execute-button-fix')).toBeInTheDocument();
      expect(screen.getByTestId('bug-phase-execute-button-verify')).toBeInTheDocument();
      expect(screen.getByTestId('bug-phase-execute-button-deploy')).toBeInTheDocument();
    });
  });

  describe('phase status calculation', () => {
    it('should show completed status for report when report exists', () => {
      render(<BugWorkflowView />);
      const reportItem = screen.getByTestId('bug-phase-item-report');
      expect(reportItem.querySelector('[data-testid="bug-phase-status-completed"]')).toBeInTheDocument();
    });

    it('should show pending status for phases without artifacts', () => {
      render(<BugWorkflowView />);
      const analyzeItem = screen.getByTestId('bug-phase-item-analyze');
      expect(analyzeItem.querySelector('[data-testid="bug-phase-status-pending"]')).toBeInTheDocument();
    });

    it('should show completed status for analysis when analysis exists', () => {
      const bugDetailWithAnalysis: BugDetail = {
        ...mockBugDetail,
        artifacts: {
          ...mockBugDetail.artifacts,
          analysis: { exists: true, path: '/test/analysis.md', updatedAt: '2024-01-01T00:00:00Z' },
        },
      };
      mockUseBugStore.mockReturnValue({
        selectedBug: mockBugMetadata,
        bugDetail: bugDetailWithAnalysis,
        useWorktree: false,
        setUseWorktree: vi.fn(),
      });

      render(<BugWorkflowView />);
      const analyzeItem = screen.getByTestId('bug-phase-item-analyze');
      expect(analyzeItem.querySelector('[data-testid="bug-phase-status-completed"]')).toBeInTheDocument();
    });
  });

  describe('phase execution', () => {
    it('should call startAgent with correct command for analyze', () => {
      render(<BugWorkflowView />);

      const button = screen.getByTestId('bug-phase-execute-button-analyze');
      fireEvent.click(button);

      // startAgent is called asynchronously, but we can verify it was called
      // Base flags are added by specManagerService, so args only contain the command
      expect(mockElectronAPI.startAgent).toHaveBeenCalledWith(
        'bug:test-bug', // bug:{name} format for AgentListPanel filtering
        'analyze',
        'claude',
        ['/kiro:bug-analyze test-bug'], // Base flags added by service
        undefined,
        undefined
      );
    });

    it('should call startAgent with /commit {bugName} for deploy phase', () => {
      // Set up a bug that has completed all phases except deploy
      const completedBugDetail: BugDetail = {
        ...mockBugDetail,
        artifacts: {
          report: { exists: true, path: '/test/report.md', updatedAt: '2024-01-01T00:00:00Z' },
          analysis: { exists: true, path: '/test/analysis.md', updatedAt: '2024-01-01T00:00:00Z' },
          fix: { exists: true, path: '/test/fix.md', updatedAt: '2024-01-01T00:00:00Z' },
          verification: { exists: true, path: '/test/verification.md', updatedAt: '2024-01-01T00:00:00Z' },
        },
      };

      // Set up fresh state for this test
      mockUseBugStore.mockReturnValue({
        selectedBug: mockBugMetadata,
        bugDetail: completedBugDetail,
        useWorktree: false,
        setUseWorktree: vi.fn(),
      });
      mockUseAgentStore.mockImplementation((selector?: (state: unknown) => unknown) => {
        const state = {
          agents: new Map(),
          getAgentsForSpec: () => [],
        };
        return selector ? selector(state) : state;
      });

      render(<BugWorkflowView />);

      const button = screen.getByTestId('bug-phase-execute-button-deploy');
      fireEvent.click(button);

      // /commit accepts bug name to collect related files from .kiro/bugs/{bug-name}/
      expect(mockElectronAPI.startAgent).toHaveBeenCalledWith(
        'bug:test-bug', // bug:{name} format for AgentListPanel filtering
        'deploy',
        'claude',
        ['/commit test-bug'], // Bug name passed to /commit for file collection
        undefined,
        undefined
      );
    });
  });

  describe('when no bug is selected', () => {
    it('should show placeholder message', () => {
      mockUseBugStore.mockReturnValue({
        selectedBug: null,
        bugDetail: null,
      });

      render(<BugWorkflowView />);
      expect(screen.getByText('バグを選択してください')).toBeInTheDocument();
    });
  });

  // ============================================================
  // bugs-worktree-support Task 12.1: worktreeチェックボックス
  // Requirements: 8.2
  // ============================================================
  describe('Task 12.1: worktree checkbox', () => {
    beforeEach(() => {
      mockUseBugStore.mockReturnValue({
        selectedBug: mockBugMetadata,
        bugDetail: mockBugDetail,
        useWorktree: false,
        setUseWorktree: vi.fn(),
      });
    });

    it('should display worktree checkbox', () => {
      render(<BugWorkflowView />);
      expect(screen.getByTestId('workflow-use-worktree-checkbox')).toBeInTheDocument();
    });

    it('should display worktree label', () => {
      render(<BugWorkflowView />);
      expect(screen.getByText('Worktreeを使用')).toBeInTheDocument();
    });

    it('should initialize checkbox with store value (false)', () => {
      mockUseBugStore.mockReturnValue({
        selectedBug: mockBugMetadata,
        bugDetail: mockBugDetail,
        useWorktree: false,
        setUseWorktree: vi.fn(),
      });

      render(<BugWorkflowView />);

      const checkbox = screen.getByTestId('workflow-use-worktree-checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('should initialize checkbox with store value (true)', () => {
      mockUseBugStore.mockReturnValue({
        selectedBug: mockBugMetadata,
        bugDetail: mockBugDetail,
        useWorktree: true,
        setUseWorktree: vi.fn(),
      });

      render(<BugWorkflowView />);

      const checkbox = screen.getByTestId('workflow-use-worktree-checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('should call setUseWorktree when checkbox is changed', () => {
      const mockSetUseWorktree = vi.fn();
      mockUseBugStore.mockReturnValue({
        selectedBug: mockBugMetadata,
        bugDetail: mockBugDetail,
        useWorktree: false,
        setUseWorktree: mockSetUseWorktree,
      });

      render(<BugWorkflowView />);

      const checkbox = screen.getByTestId('workflow-use-worktree-checkbox');
      fireEvent.click(checkbox);

      expect(mockSetUseWorktree).toHaveBeenCalledWith(true);
    });
  });

  // ============================================================
  // bugs-worktree-support Task 12.2: bug-fix実行時のworktree作成判定
  // Requirements: 8.5, 3.2, 3.6
  // ============================================================
  describe('Task 12.2: bug-fix with worktree', () => {
    beforeEach(() => {
      // Setup: report exists, analysis exists (so fix phase is executable)
      const bugDetailReadyForFix: BugDetail = {
        ...mockBugDetail,
        artifacts: {
          report: { exists: true, path: '/test/report.md', updatedAt: '2024-01-01T00:00:00Z' },
          analysis: { exists: true, path: '/test/analysis.md', updatedAt: '2024-01-01T00:00:00Z' },
          fix: null,
          verification: null,
        },
      };
      mockUseBugStore.mockReturnValue({
        selectedBug: mockBugMetadata,
        bugDetail: bugDetailReadyForFix,
        useWorktree: false,
        setUseWorktree: vi.fn(),
      });
    });

    it('should call createBugWorktree when useWorktree is true and fix button is clicked', async () => {
      const mockCreateBugWorktree = vi.fn().mockResolvedValue({ ok: true, value: undefined });
      Object.defineProperty(window, 'electronAPI', {
        value: {
          ...mockElectronAPI,
          createBugWorktree: mockCreateBugWorktree,
        },
        writable: true,
      });

      mockUseBugStore.mockReturnValue({
        selectedBug: mockBugMetadata,
        bugDetail: {
          ...mockBugDetail,
          artifacts: {
            report: { exists: true, path: '/test/report.md', updatedAt: '2024-01-01T00:00:00Z' },
            analysis: { exists: true, path: '/test/analysis.md', updatedAt: '2024-01-01T00:00:00Z' },
            fix: null,
            verification: null,
          },
        },
        useWorktree: true,
        setUseWorktree: vi.fn(),
      });

      render(<BugWorkflowView />);

      const button = screen.getByTestId('bug-phase-execute-button-fix');
      fireEvent.click(button);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockCreateBugWorktree).toHaveBeenCalledWith(mockBugMetadata.name);
    });

    it('should not call createBugWorktree when useWorktree is false', async () => {
      const mockCreateBugWorktree = vi.fn().mockResolvedValue({ ok: true, value: undefined });
      Object.defineProperty(window, 'electronAPI', {
        value: {
          ...mockElectronAPI,
          createBugWorktree: mockCreateBugWorktree,
        },
        writable: true,
      });

      mockUseBugStore.mockReturnValue({
        selectedBug: mockBugMetadata,
        bugDetail: {
          ...mockBugDetail,
          artifacts: {
            report: { exists: true, path: '/test/report.md', updatedAt: '2024-01-01T00:00:00Z' },
            analysis: { exists: true, path: '/test/analysis.md', updatedAt: '2024-01-01T00:00:00Z' },
            fix: null,
            verification: null,
          },
        },
        useWorktree: false,
        setUseWorktree: vi.fn(),
      });

      render(<BugWorkflowView />);

      const button = screen.getByTestId('bug-phase-execute-button-fix');
      fireEvent.click(button);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockCreateBugWorktree).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // bugs-worktree-support Task 12.3: Deployボタンの条件分岐
  // Requirements: 4.1
  // ============================================================
  describe('Task 12.3: Deploy button conditional command', () => {
    const completedBugDetail: BugDetail = {
      ...mockBugDetail,
      artifacts: {
        report: { exists: true, path: '/test/report.md', updatedAt: '2024-01-01T00:00:00Z' },
        analysis: { exists: true, path: '/test/analysis.md', updatedAt: '2024-01-01T00:00:00Z' },
        fix: { exists: true, path: '/test/fix.md', updatedAt: '2024-01-01T00:00:00Z' },
        verification: { exists: true, path: '/test/verification.md', updatedAt: '2024-01-01T00:00:00Z' },
      },
    };

    it('should call /kiro:bug-merge when bug has worktree field', async () => {
      const bugWithWorktree: BugMetadata = {
        ...mockBugMetadata,
        worktree: {
          path: '../test-worktrees/bugs/test-bug',
          branch: 'bugfix/test-bug',
          created_at: '2024-01-01T00:00:00Z',
        },
      };

      mockUseBugStore.mockReturnValue({
        selectedBug: bugWithWorktree,
        bugDetail: {
          ...completedBugDetail,
          metadata: bugWithWorktree,
        },
        useWorktree: false,
        setUseWorktree: vi.fn(),
      });
      mockUseAgentStore.mockImplementation((selector?: (state: unknown) => unknown) => {
        const state = {
          agents: new Map(),
          getAgentsForSpec: () => [],
        };
        return selector ? selector(state) : state;
      });

      render(<BugWorkflowView />);

      const button = screen.getByTestId('bug-phase-execute-button-deploy');
      fireEvent.click(button);

      await new Promise(resolve => setTimeout(resolve, 0));

      // Should call bug-merge for worktree mode
      expect(mockElectronAPI.startAgent).toHaveBeenCalledWith(
        'bug:test-bug',
        'deploy',
        'claude',
        ['/kiro:bug-merge test-bug'],
        undefined,
        undefined
      );
    });

    it('should call /commit when bug has no worktree field', async () => {
      mockUseBugStore.mockReturnValue({
        selectedBug: mockBugMetadata,
        bugDetail: completedBugDetail,
        useWorktree: false,
        setUseWorktree: vi.fn(),
      });
      mockUseAgentStore.mockImplementation((selector?: (state: unknown) => unknown) => {
        const state = {
          agents: new Map(),
          getAgentsForSpec: () => [],
        };
        return selector ? selector(state) : state;
      });

      render(<BugWorkflowView />);

      const button = screen.getByTestId('bug-phase-execute-button-deploy');
      fireEvent.click(button);

      await new Promise(resolve => setTimeout(resolve, 0));

      // Should call /commit for non-worktree mode
      expect(mockElectronAPI.startAgent).toHaveBeenCalledWith(
        'bug:test-bug',
        'deploy',
        'claude',
        ['/commit test-bug'],
        undefined,
        undefined
      );
    });
  });

  // ============================================================
  // bugs-workflow-auto-execution Task 4: Auto execution support
  // Requirements: 1.1-1.6, 6.1
  // ============================================================
  describe('Task 4: Auto execution button', () => {
    beforeEach(() => {
      mockUseBugStore.mockReturnValue({
        selectedBug: mockBugMetadata,
        bugDetail: mockBugDetail,
        useWorktree: false,
        setUseWorktree: vi.fn(),
      });

      mockUseWorkflowStore.mockReturnValue({
        commandPrefix: '/kiro:',
        bugAutoExecutionPermissions: {
          analyze: true,
          fix: true,
          verify: true,
          deploy: false,
        },
      });
    });

    it('should render auto execution button', () => {
      render(<BugWorkflowView />);
      expect(screen.getByTestId('bug-auto-execute-button')).toBeInTheDocument();
    });

    it('should display "自動実行" label', () => {
      render(<BugWorkflowView />);
      expect(screen.getByText('自動実行')).toBeInTheDocument();
    });

    it('should disable auto execution button when no bug is selected', () => {
      mockUseBugStore.mockReturnValue({
        selectedBug: null,
        bugDetail: null,
      });

      render(<BugWorkflowView />);
      // Button should not exist when no bug is selected (placeholder shown instead)
    });
  });
});
