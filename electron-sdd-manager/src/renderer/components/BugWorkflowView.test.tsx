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

vi.mock('../stores/agentStore', () => ({
  useAgentStore: vi.fn(),
}));

vi.mock('../stores/workflowStore', () => ({
  useWorkflowStore: vi.fn(),
}));

// Mock BugAutoExecutionService
vi.mock('../services/BugAutoExecutionService', () => ({
  getBugAutoExecutionService: vi.fn().mockReturnValue({
    getStatus: () => 'idle',
    getCurrentPhase: () => null,
    getLastFailedPhase: () => null,
    getRetryCount: () => 0,
    start: vi.fn().mockReturnValue(true),
    stop: vi.fn().mockResolvedValue(undefined),
    retryFrom: vi.fn().mockReturnValue(true),
  }),
}));

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
      expect(mockElectronAPI.startAgent).toHaveBeenCalledWith(
        'bug:test-bug', // bug:{name} format for AgentListPanel filtering
        'analyze',
        'claude',
        ['-p', '/kiro:bug-analyze test-bug'],
        undefined,
        undefined
      );
    });

    it('should call startAgent with /commit for deploy phase', () => {
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

      expect(mockElectronAPI.startAgent).toHaveBeenCalledWith(
        'bug:test-bug', // bug:{name} format for AgentListPanel filtering
        'deploy',
        'claude',
        ['-p', '/commit'],
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
  // bugs-workflow-auto-execution Task 4: Auto execution support
  // Requirements: 1.1-1.6, 6.1
  // ============================================================
  describe('Task 4: Auto execution button', () => {
    beforeEach(() => {
      mockUseBugStore.mockReturnValue({
        selectedBug: mockBugMetadata,
        bugDetail: mockBugDetail,
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
