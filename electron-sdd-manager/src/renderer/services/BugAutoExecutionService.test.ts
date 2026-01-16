/**
 * BugAutoExecutionService Tests
 * bugs-workflow-auto-execution Task 2, 6.1
 * Requirements: 1.1-1.6, 4.1-4.5, 5.1-5.5
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BugAutoExecutionService, getBugAutoExecutionService, disposeBugAutoExecutionService } from './BugAutoExecutionService';
import { useBugStore } from '../stores/bugStore';
import { useWorkflowStore } from '../stores/workflowStore';
import { useAgentStore } from '../stores/agentStore';
import { useProjectStore } from '../stores/projectStore';
import { DEFAULT_BUG_AUTO_EXECUTION_PERMISSIONS } from '../types/bugAutoExecution';
import type { BugDetail, BugMetadata } from '../types/bug';

// Mock window.electronAPI with IPC methods for bug auto-execution
const mockElectronAPI = {
  startAgent: vi.fn().mockResolvedValue({ agentId: 'test-agent-id' }),
  stopAgent: vi.fn().mockResolvedValue(undefined),
  onAgentStatusChange: vi.fn().mockReturnValue(() => {}),
  getProjectPath: vi.fn().mockResolvedValue('/mock/project/path'),
  // Bug auto-execution IPC methods
  bugAutoExecutionStart: vi.fn().mockResolvedValue({
    ok: true,
    value: {
      bugPath: '/mock/project/path/.kiro/bugs/test-bug',
      bugName: 'test-bug',
      status: 'running',
      currentPhase: 'analyze',
      executedPhases: [],
      errors: [],
      startTime: Date.now(),
      lastActivityTime: Date.now(),
      retryCount: 0,
      lastFailedPhase: null,
    },
  }),
  bugAutoExecutionStop: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
  bugAutoExecutionStatus: vi.fn().mockResolvedValue(null),
  bugAutoExecutionRetryFrom: vi.fn().mockResolvedValue({
    ok: true,
    value: {
      bugPath: '/mock/project/path/.kiro/bugs/test-bug',
      bugName: 'test-bug',
      status: 'running',
      currentPhase: 'analyze',
      executedPhases: [],
      errors: [],
      startTime: Date.now(),
      lastActivityTime: Date.now(),
      retryCount: 1,
      lastFailedPhase: null,
    },
  }),
  // IPC event listeners
  onBugAutoExecutionStatusChanged: vi.fn().mockReturnValue(() => {}),
  onBugAutoExecutionPhaseCompleted: vi.fn().mockReturnValue(() => {}),
  onBugAutoExecutionCompleted: vi.fn().mockReturnValue(() => {}),
  onBugAutoExecutionError: vi.fn().mockReturnValue(() => {}),
  onBugAutoExecutionExecutePhase: vi.fn().mockReturnValue(() => {}),
};

vi.stubGlobal('window', {
  electronAPI: mockElectronAPI,
});

// Mock notify
vi.mock('../stores/notificationStore', () => ({
  notify: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

describe('BugAutoExecutionService', () => {
  let service: BugAutoExecutionService;

  const mockBugMetadata: BugMetadata = {
    name: 'test-bug',
    path: '/path/to/bug',
    phase: 'reported',
    updatedAt: '2024-01-01T00:00:00Z',
    reportedAt: '2024-01-01T00:00:00Z',
  };

  const mockBugDetail: BugDetail = {
    metadata: mockBugMetadata,
    artifacts: {
      report: { exists: true, path: '/path/to/report.md', updatedAt: '2024-01-01T00:00:00Z' },
      analysis: null,
      fix: null,
      verification: null,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    disposeBugAutoExecutionService();
    service = getBugAutoExecutionService();

    // Reset stores
    useBugStore.setState({
      selectedBug: null,
      bugDetail: null,
      bugs: [],
      isLoading: false,
      error: null,
      isWatching: false,
    });

    useWorkflowStore.setState({
      bugAutoExecutionPermissions: { ...DEFAULT_BUG_AUTO_EXECUTION_PERMISSIONS },
    });

    useAgentStore.setState({
      agents: [],
    });

    useProjectStore.setState({
      currentProject: '/mock/project/path',
    });
  });

  afterEach(() => {
    service.dispose();
  });

  describe('Task 2.1: Service basic structure', () => {
    it('should be a singleton', () => {
      const service1 = getBugAutoExecutionService();
      const service2 = getBugAutoExecutionService();
      expect(service1).toBe(service2);
    });

    it('should have start method', () => {
      expect(service.start).toBeDefined();
      expect(typeof service.start).toBe('function');
    });

    it('should have stop method', () => {
      expect(service.stop).toBeDefined();
      expect(typeof service.stop).toBe('function');
    });

    it('should have retryFrom method', () => {
      expect(service.retryFrom).toBeDefined();
      expect(typeof service.retryFrom).toBe('function');
    });

    it('should have getStatus method', () => {
      expect(service.getStatus).toBeDefined();
      expect(typeof service.getStatus).toBe('function');
    });

    it('should have getCurrentPhase method', () => {
      expect(service.getCurrentPhase).toBeDefined();
      expect(typeof service.getCurrentPhase).toBe('function');
    });

    it('should have dispose method', () => {
      expect(service.dispose).toBeDefined();
      expect(typeof service.dispose).toBe('function');
    });
  });

  describe('Task 2.2: start() method', () => {
    it('should return false when no bug is selected', async () => {
      useBugStore.setState({ selectedBug: null, bugDetail: null });

      const result = await service.start();

      expect(result).toBe(false);
    });

    it('should return false when bug detail is not available', async () => {
      useBugStore.setState({ selectedBug: mockBugMetadata, bugDetail: null });

      const result = await service.start();

      expect(result).toBe(false);
    });

    it('should return true when bug is selected and report is completed', async () => {
      useBugStore.setState({
        selectedBug: mockBugMetadata,
        bugDetail: mockBugDetail,
      });

      const result = await service.start();

      expect(result).toBe(true);
    });

    it('should start from analyze phase when report is completed', async () => {
      useBugStore.setState({
        selectedBug: mockBugMetadata,
        bugDetail: mockBugDetail,
      });

      await service.start();

      expect(service.getCurrentPhase()).toBe('analyze');
    });

    it('should set status to running on start', async () => {
      useBugStore.setState({
        selectedBug: mockBugMetadata,
        bugDetail: mockBugDetail,
      });

      await service.start();

      expect(service.getStatus()).toBe('running');
    });
  });

  describe('Task 2.3: getNextPermittedPhase()', () => {
    it('should return analyze after report when analyze is permitted', () => {
      useWorkflowStore.setState({
        bugAutoExecutionPermissions: {
          analyze: true,
          fix: true,
          verify: true,
          deploy: false,
        },
      });

      const nextPhase = service.getNextPermittedPhase('report');

      expect(nextPhase).toBe('analyze');
    });

    it('should return fix after analyze when fix is permitted', () => {
      useWorkflowStore.setState({
        bugAutoExecutionPermissions: {
          analyze: true,
          fix: true,
          verify: true,
          deploy: false,
        },
      });

      const nextPhase = service.getNextPermittedPhase('analyze');

      expect(nextPhase).toBe('fix');
    });

    it('should return verify after fix when verify is permitted', () => {
      useWorkflowStore.setState({
        bugAutoExecutionPermissions: {
          analyze: true,
          fix: true,
          verify: true,
          deploy: false,
        },
      });

      const nextPhase = service.getNextPermittedPhase('fix');

      expect(nextPhase).toBe('verify');
    });

    it('should skip deploy when deploy is not permitted', () => {
      useWorkflowStore.setState({
        bugAutoExecutionPermissions: {
          analyze: true,
          fix: true,
          verify: true,
          deploy: false,
        },
      });

      const nextPhase = service.getNextPermittedPhase('verify');

      // deploy is not permitted, so returns null
      expect(nextPhase).toBeNull();
    });

    it('should return null when all remaining phases are not permitted', () => {
      useWorkflowStore.setState({
        bugAutoExecutionPermissions: {
          analyze: true,
          fix: false,
          verify: false,
          deploy: false,
        },
      });

      const nextPhase = service.getNextPermittedPhase('analyze');

      expect(nextPhase).toBeNull();
    });

    it('should skip non-permitted phases', () => {
      useWorkflowStore.setState({
        bugAutoExecutionPermissions: {
          analyze: true,
          fix: false,
          verify: true,
          deploy: false,
        },
      });

      // Should skip fix and go to verify
      const nextPhase = service.getNextPermittedPhase('analyze');

      expect(nextPhase).toBe('verify');
    });

    it('should return deploy when deploy is permitted after verify', () => {
      useWorkflowStore.setState({
        bugAutoExecutionPermissions: {
          analyze: true,
          fix: true,
          verify: true,
          deploy: true,
        },
      });

      const nextPhase = service.getNextPermittedPhase('verify');

      // Bug fix: commit-unclear-target-files - deploy phase is now supported
      expect(nextPhase).toBe('deploy');
    });

    it('should return null after deploy phase', () => {
      useWorkflowStore.setState({
        bugAutoExecutionPermissions: {
          analyze: true,
          fix: true,
          verify: true,
          deploy: true,
        },
      });

      const nextPhase = service.getNextPermittedPhase('deploy');

      expect(nextPhase).toBeNull();
    });
  });

  describe('Task 2.4: stop() method', () => {
    it('should set status to idle after stop', async () => {
      useBugStore.setState({
        selectedBug: mockBugMetadata,
        bugDetail: mockBugDetail,
      });

      service.start();
      await service.stop();

      expect(service.getStatus()).toBe('idle');
    });

    it('should clear current phase after stop', async () => {
      useBugStore.setState({
        selectedBug: mockBugMetadata,
        bugDetail: mockBugDetail,
      });

      service.start();
      await service.stop();

      expect(service.getCurrentPhase()).toBeNull();
    });
  });

  describe('getLastCompletedPhase()', () => {
    it('should return report when report is completed', () => {
      const bugDetail: BugDetail = {
        metadata: mockBugMetadata,
        artifacts: {
          report: { exists: true, path: '/path/to/report.md', updatedAt: '2024-01-01T00:00:00Z' },
          analysis: null,
          fix: null,
          verification: null,
        },
      };

      const lastPhase = service.getLastCompletedPhase(bugDetail);

      expect(lastPhase).toBe('report');
    });

    it('should return analyze when analysis is completed', () => {
      const bugDetail: BugDetail = {
        metadata: mockBugMetadata,
        artifacts: {
          report: { exists: true, path: '/path/to/report.md', updatedAt: '2024-01-01T00:00:00Z' },
          analysis: { exists: true, path: '/path/to/analysis.md', updatedAt: '2024-01-01T00:00:00Z' },
          fix: null,
          verification: null,
        },
      };

      const lastPhase = service.getLastCompletedPhase(bugDetail);

      expect(lastPhase).toBe('analyze');
    });

    it('should return fix when fix is completed', () => {
      const bugDetail: BugDetail = {
        metadata: mockBugMetadata,
        artifacts: {
          report: { exists: true, path: '/path/to/report.md', updatedAt: '2024-01-01T00:00:00Z' },
          analysis: { exists: true, path: '/path/to/analysis.md', updatedAt: '2024-01-01T00:00:00Z' },
          fix: { exists: true, path: '/path/to/fix.md', updatedAt: '2024-01-01T00:00:00Z' },
          verification: null,
        },
      };

      const lastPhase = service.getLastCompletedPhase(bugDetail);

      expect(lastPhase).toBe('fix');
    });

    it('should return verify when verification is completed', () => {
      const bugDetail: BugDetail = {
        metadata: mockBugMetadata,
        artifacts: {
          report: { exists: true, path: '/path/to/report.md', updatedAt: '2024-01-01T00:00:00Z' },
          analysis: { exists: true, path: '/path/to/analysis.md', updatedAt: '2024-01-01T00:00:00Z' },
          fix: { exists: true, path: '/path/to/fix.md', updatedAt: '2024-01-01T00:00:00Z' },
          verification: { exists: true, path: '/path/to/verification.md', updatedAt: '2024-01-01T00:00:00Z' },
        },
      };

      const lastPhase = service.getLastCompletedPhase(bugDetail);

      expect(lastPhase).toBe('verify');
    });

    it('should return null when no phase is completed', () => {
      const bugDetail: BugDetail = {
        metadata: mockBugMetadata,
        artifacts: {
          report: null,
          analysis: null,
          fix: null,
          verification: null,
        },
      };

      const lastPhase = service.getLastCompletedPhase(bugDetail);

      expect(lastPhase).toBeNull();
    });
  });

  describe('retryFrom()', () => {
    it('should return true when phase is permitted', async () => {
      useBugStore.setState({
        selectedBug: mockBugMetadata,
        bugDetail: mockBugDetail,
      });
      useWorkflowStore.setState({
        bugAutoExecutionPermissions: {
          analyze: true,
          fix: true,
          verify: true,
          deploy: false,
        },
      });

      const result = await service.retryFrom('analyze');

      expect(result).toBe(true);
    });

    it('should return false when phase is not permitted', async () => {
      useBugStore.setState({
        selectedBug: mockBugMetadata,
        bugDetail: mockBugDetail,
      });
      useWorkflowStore.setState({
        bugAutoExecutionPermissions: {
          analyze: false,
          fix: true,
          verify: true,
          deploy: false,
        },
      });

      // Mock retryFrom to fail for not permitted phase
      mockElectronAPI.bugAutoExecutionRetryFrom.mockResolvedValueOnce({
        ok: false,
        error: { type: 'PHASE_NOT_PERMITTED' },
      });

      const result = await service.retryFrom('analyze');

      expect(result).toBe(false);
    });

    it('should return false when no bug is selected', async () => {
      useBugStore.setState({ selectedBug: null, bugDetail: null });

      const result = await service.retryFrom('analyze');

      expect(result).toBe(false);
    });
  });

  describe('MAX_RETRIES handling', () => {
    it('should stop after 3 consecutive retries', async () => {
      useBugStore.setState({
        selectedBug: mockBugMetadata,
        bugDetail: mockBugDetail,
      });
      useWorkflowStore.setState({
        bugAutoExecutionPermissions: {
          analyze: true,
          fix: true,
          verify: true,
          deploy: false,
        },
      });

      // Mock retryFrom to return increasing retry count, then fail on 4th
      mockElectronAPI.bugAutoExecutionRetryFrom
        .mockResolvedValueOnce({ ok: true, value: { status: 'running', currentPhase: 'analyze', retryCount: 1, lastFailedPhase: null, executedPhases: [], errors: [], bugPath: '', bugName: '', startTime: 0, lastActivityTime: 0 } })
        .mockResolvedValueOnce({ ok: true, value: { status: 'running', currentPhase: 'analyze', retryCount: 2, lastFailedPhase: null, executedPhases: [], errors: [], bugPath: '', bugName: '', startTime: 0, lastActivityTime: 0 } })
        .mockResolvedValueOnce({ ok: true, value: { status: 'running', currentPhase: 'analyze', retryCount: 3, lastFailedPhase: null, executedPhases: [], errors: [], bugPath: '', bugName: '', startTime: 0, lastActivityTime: 0 } })
        .mockResolvedValueOnce({ ok: false, error: { type: 'MAX_RETRIES_EXCEEDED' } });

      // Retry 3 times
      await service.retryFrom('analyze');
      await service.retryFrom('analyze');
      await service.retryFrom('analyze');

      // 4th retry should fail
      const result = await service.retryFrom('analyze');

      expect(result).toBe(false);
    });
  });

  describe('IPC communication', () => {
    it('should call bugAutoExecutionStart with correct parameters', async () => {
      useBugStore.setState({
        selectedBug: mockBugMetadata,
        bugDetail: mockBugDetail,
      });
      useWorkflowStore.setState({
        bugAutoExecutionPermissions: {
          analyze: true,
          fix: true,
          verify: true,
          deploy: false,
        },
      });

      await service.start();

      expect(mockElectronAPI.bugAutoExecutionStart).toHaveBeenCalledWith({
        bugPath: '/mock/project/path/.kiro/bugs/test-bug',
        bugName: 'test-bug',
        options: {
          permissions: {
            analyze: true,
            fix: true,
            verify: true,
            deploy: false,
          },
          timeoutMs: 600000, // 10 minutes
        },
        lastCompletedPhase: 'report',
      });
    });

    it('should call bugAutoExecutionStop when stop is called', async () => {
      useBugStore.setState({
        selectedBug: mockBugMetadata,
        bugDetail: mockBugDetail,
      });

      await service.start();
      await service.stop();

      expect(mockElectronAPI.bugAutoExecutionStop).toHaveBeenCalledWith({
        bugPath: '/mock/project/path/.kiro/bugs/test-bug',
      });
    });

    it('should call bugAutoExecutionRetryFrom with correct phase', async () => {
      useBugStore.setState({
        selectedBug: mockBugMetadata,
        bugDetail: mockBugDetail,
      });

      await service.start();
      await service.retryFrom('fix');

      expect(mockElectronAPI.bugAutoExecutionRetryFrom).toHaveBeenCalledWith({
        bugPath: '/mock/project/path/.kiro/bugs/test-bug',
        phase: 'fix',
      });
    });
  });

  // ============================================================
  // bugs-worktree-support Task 19.2: Worktree creation is now handled by Main Process
  // The BugAutoExecutionCoordinator in Main Process handles worktree creation
  // via BugWorkflowService.startBugFixWithAutoWorktree()
  // ============================================================
  describe('IPC event handling', () => {
    it('should setup IPC event listeners on construction', () => {
      expect(mockElectronAPI.onBugAutoExecutionStatusChanged).toHaveBeenCalled();
      expect(mockElectronAPI.onBugAutoExecutionPhaseCompleted).toHaveBeenCalled();
      expect(mockElectronAPI.onBugAutoExecutionCompleted).toHaveBeenCalled();
      expect(mockElectronAPI.onBugAutoExecutionError).toHaveBeenCalled();
      expect(mockElectronAPI.onBugAutoExecutionExecutePhase).toHaveBeenCalled();
    });
  });
});
