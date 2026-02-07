/**
 * BugWorkflowView Component Tests
 * Task 3: bugs-pane-integration - BugWorkflowViewコンポーネント
 * Requirements: 3.1, 3.2, 3.3, 4.1-4.7, 6.2, 6.4
 * bugs-view-unification Task 6.1: Updated to use useSharedBugStore
 * trpc-full-migration Task 7.2: Use tRPC vanilla client mocks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// trpc-full-migration Task 6.2 + 7.2: Mock tRPC vanilla client for agent and autoExecution operations
const mockVanillaClient = {
  agent: {
    start: { mutate: vi.fn().mockResolvedValue({ agentId: 'test-agent-id' }) },
  },
  autoExecution: {
    bugStart: { mutate: vi.fn().mockResolvedValue({ ok: true, value: {} }) },
    bugStop: { mutate: vi.fn().mockResolvedValue({ ok: true }) },
    bugRetryFrom: { mutate: vi.fn().mockResolvedValue({ ok: true, value: {} }) },
  },
};
vi.mock('../../shared/trpc/vanillaClient', () => ({
  getVanillaClient: () => mockVanillaClient,
}));

import { BugWorkflowView } from './BugWorkflowView';
// zustand-agent-selector-hooks: Removed useAgentStore import - component now uses useAgentsBySpec hook
import { useWorkflowStore } from '../stores/workflowStore';
import type { BugDetail, BugMetadata } from '../types/bug';

// bugs-view-unification Task 6.1: Mock shared bugStore
vi.mock('../../shared/stores/bugStore', () => {
  const fn = vi.fn();
  fn.getState = vi.fn();
  return { useSharedBugStore: fn };
});

// bugs-view-unification Task 6.1: Mock ApiClientProvider
const mockApiClient = {
  getBugs: vi.fn(),
  getBugDetail: vi.fn(),
};
vi.mock('../../shared/api/ApiClientProvider', () => ({
  useApi: () => mockApiClient,
}));

import { useSharedBugStore } from '../../shared/stores/bugStore';

// zustand-agent-selector-hooks: Mock useAgentsBySpec hook instead of useAgentStore
vi.mock('@shared/hooks', () => ({
  useAgentsBySpec: vi.fn(),
  useSubmitShortcut: vi.fn(() => ({ handleKeyDown: vi.fn() })),
}));

import { useAgentsBySpec } from '@shared/hooks';
const mockUseAgentsBySpec = useAgentsBySpec as unknown as ReturnType<typeof vi.fn>;

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

// trpc-full-migration Task 11.4: All operations now use tRPC vanilla client (mocked above)
// updateBugPhase -> bug.phaseUpdate, rebaseFromMain -> git.worktreeRebaseFromMain

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
  // bugs-view-unification Task 6.1: Use shared bugStore mock
  const mockUseSharedBugStore = useSharedBugStore as unknown as ReturnType<typeof vi.fn>;
  const mockUseWorkflowStore = useWorkflowStore as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // bugs-view-unification Task 6.1: Use selectedBugId and bugs array
    const bugStoreValue = {
      bugs: [mockBugMetadata],
      selectedBugId: 'test-bug',
      bugDetail: mockBugDetail,
      useWorktree: false,
      setUseWorktree: vi.fn(),
      selectBug: vi.fn(),
      isRebasing: false,
    };
    mockUseSharedBugStore.mockReturnValue(bugStoreValue);
    (mockUseSharedBugStore as any).getState.mockReturnValue(bugStoreValue);

    // zustand-agent-selector-hooks: Mock useAgentsBySpec hook instead of useAgentStore
    // The hook returns an array of agents for the given specId
    mockUseAgentsBySpec.mockReturnValue([]);

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
      mockUseSharedBugStore.mockReturnValue({
        bugs: [mockBugMetadata],
        selectedBugId: 'test-bug',
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
    it('should call startAgent with correct command for analyze', async () => {
      render(<BugWorkflowView />);

      const button = screen.getByTestId('bug-phase-execute-button-analyze');
      fireEvent.click(button);

      // Wait for async handler to complete
      await new Promise(resolve => setTimeout(resolve, 0));

      // trpc-full-migration Task 7.2: startAgent now uses tRPC vanilla client
      // Base flags are added by specManagerService, so args only contain the command
      expect(mockVanillaClient.agent.start.mutate).toHaveBeenCalledWith({
        specId: 'bug:test-bug', // bug:{name} format for AgentListPanel filtering
        phase: 'analyze',
        engineId: 'claude',
        args: ['/kiro:bug-analyze test-bug'], // Base flags added by service
      });
    });

    it('should call startAgent with /commit {bugName} for deploy phase', async () => {
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
      mockUseSharedBugStore.mockReturnValue({
        bugs: [mockBugMetadata],
        selectedBugId: 'test-bug',
        bugDetail: completedBugDetail,
        useWorktree: false,
        setUseWorktree: vi.fn(),
      });
      // zustand-agent-selector-hooks: Mock useAgentsBySpec hook
      mockUseAgentsBySpec.mockReturnValue([]);

      render(<BugWorkflowView />);

      const button = screen.getByTestId('bug-phase-execute-button-deploy');
      fireEvent.click(button);

      // Wait for async operations (updateBugPhase + agent.start.mutate)
      await new Promise(resolve => setTimeout(resolve, 0));

      // trpc-full-migration Task 7.2: /commit via tRPC agent.start
      // /commit accepts bug name to collect related files from .kiro/bugs/{bug-name}/
      expect(mockVanillaClient.agent.start.mutate).toHaveBeenCalledWith({
        specId: 'bug:test-bug', // bug:{name} format for AgentListPanel filtering
        phase: 'deploy',
        engineId: 'claude',
        args: ['/commit test-bug'], // Bug name passed to /commit for file collection
      });
    });
  });

  describe('when no bug is selected', () => {
    it('should show placeholder message', () => {
      mockUseSharedBugStore.mockReturnValue({
        bugs: [],
        selectedBugId: null,
        bugDetail: null,
      });

      render(<BugWorkflowView />);
      expect(screen.getByText('バグを選択してください')).toBeInTheDocument();
    });
  });

  // ============================================================
  // bugs-workflow-footer Task 6.1, 6.2: Removed worktree checkbox
  // Tests for worktree checkbox have been removed
  // Worktree mode is now set via footer button (convertBugToWorktree)
  // ============================================================

  // ============================================================
  // bugs-workflow-footer Task 6.3: Removed auto worktree creation for fix phase
  // Tests for auto worktree creation have been removed
  // ============================================================

  // ============================================================
  // bugs-worktree-support Task 12.3: Deployボタンの条件分岐
  // Requirements: 4.1
  // ============================================================
  describe('Task 12.3: Deploy button conditional command and label', () => {
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

      mockUseSharedBugStore.mockReturnValue({
        bugs: [bugWithWorktree],
        selectedBugId: 'test-bug',
        bugDetail: {
          ...completedBugDetail,
          metadata: bugWithWorktree,
        },
        useWorktree: false,
        setUseWorktree: vi.fn(),
      });
      // zustand-agent-selector-hooks: Mock useAgentsBySpec hook
      mockUseAgentsBySpec.mockReturnValue([]);

      render(<BugWorkflowView />);

      const button = screen.getByTestId('bug-phase-execute-button-deploy');
      fireEvent.click(button);

      await new Promise(resolve => setTimeout(resolve, 0));

      // trpc-full-migration Task 7.2: bug-merge via tRPC agent.start
      // bug-merge-cwd-fix: phase should be 'bug-merge' (not 'deploy') for WORKTREE_LIFECYCLE_PHASES
      expect(mockVanillaClient.agent.start.mutate).toHaveBeenCalledWith({
        specId: 'bug:test-bug',
        phase: 'bug-merge',
        engineId: 'claude',
        args: ['/kiro:bug-merge test-bug'],
      });
    });

    it('should call /commit when bug has no worktree field', async () => {
      mockUseSharedBugStore.mockReturnValue({
        bugs: [mockBugMetadata],
        selectedBugId: 'test-bug',
        bugDetail: completedBugDetail,
        useWorktree: false,
        setUseWorktree: vi.fn(),
      });
      // zustand-agent-selector-hooks: Mock useAgentsBySpec hook
      mockUseAgentsBySpec.mockReturnValue([]);

      render(<BugWorkflowView />);

      const button = screen.getByTestId('bug-phase-execute-button-deploy');
      fireEvent.click(button);

      await new Promise(resolve => setTimeout(resolve, 0));

      // trpc-full-migration Task 7.2: /commit via tRPC agent.start for non-worktree
      expect(mockVanillaClient.agent.start.mutate).toHaveBeenCalledWith({
        specId: 'bug:test-bug',
        phase: 'deploy',
        engineId: 'claude',
        args: ['/commit test-bug'],
      });
    });

    it('should show "Merge" label when bug has worktree field', async () => {
      const bugWithWorktree: BugMetadata = {
        ...mockBugMetadata,
        worktree: {
          path: '../test-worktrees/bugs/test-bug',
          branch: 'bugfix/test-bug',
          created_at: '2024-01-01T00:00:00Z',
        },
      };

      mockUseSharedBugStore.mockReturnValue({
        bugs: [bugWithWorktree],
        selectedBugId: 'test-bug',
        bugDetail: {
          ...completedBugDetail,
          metadata: bugWithWorktree,
        },
        useWorktree: false,
        setUseWorktree: vi.fn(),
      });
      // zustand-agent-selector-hooks: Mock useAgentsBySpec hook
      mockUseAgentsBySpec.mockReturnValue([]);

      render(<BugWorkflowView />);

      // Should show "Merge" label instead of "Deploy" for worktree mode
      expect(screen.getByText('Merge')).toBeInTheDocument();
    });

    it('should show "Deploy" label when bug has no worktree field', async () => {
      mockUseSharedBugStore.mockReturnValue({
        bugs: [mockBugMetadata],
        selectedBugId: 'test-bug',
        bugDetail: completedBugDetail,
        useWorktree: false,
        setUseWorktree: vi.fn(),
      });
      // zustand-agent-selector-hooks: Mock useAgentsBySpec hook
      mockUseAgentsBySpec.mockReturnValue([]);

      render(<BugWorkflowView />);

      // Should show "Deploy" label for non-worktree mode
      expect(screen.getByText('Deploy')).toBeInTheDocument();
    });
  });

  // ============================================================
  // bugs-workflow-auto-execution Task 4: Auto execution support
  // Requirements: 1.1-1.6, 6.1
  // ============================================================
  describe('Task 4: Auto execution button', () => {
    beforeEach(() => {
      mockUseSharedBugStore.mockReturnValue({
        bugs: [mockBugMetadata],
        selectedBugId: 'test-bug',
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
      mockUseSharedBugStore.mockReturnValue({
        bugs: [],
        selectedBugId: null,
        bugDetail: null,
      });

      render(<BugWorkflowView />);
      // Button should not exist when no bug is selected (placeholder shown instead)
    });
  });
});
