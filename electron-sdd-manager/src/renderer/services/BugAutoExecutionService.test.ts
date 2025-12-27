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
import { DEFAULT_BUG_AUTO_EXECUTION_PERMISSIONS } from '../types/bugAutoExecution';
import type { BugDetail, BugMetadata } from '../types/bug';

// Mock window.electronAPI
const mockElectronAPI = {
  startAgent: vi.fn().mockResolvedValue({ agentId: 'test-agent-id' }),
  stopAgent: vi.fn().mockResolvedValue(undefined),
  onAgentStatusChange: vi.fn().mockReturnValue(() => {}),
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
    it('should return false when no bug is selected', () => {
      useBugStore.setState({ selectedBug: null, bugDetail: null });

      const result = service.start();

      expect(result).toBe(false);
    });

    it('should return false when bug detail is not available', () => {
      useBugStore.setState({ selectedBug: mockBugMetadata, bugDetail: null });

      const result = service.start();

      expect(result).toBe(false);
    });

    it('should return true when bug is selected and report is completed', () => {
      useBugStore.setState({
        selectedBug: mockBugMetadata,
        bugDetail: mockBugDetail,
      });

      const result = service.start();

      expect(result).toBe(true);
    });

    it('should start from analyze phase when report is completed', () => {
      useBugStore.setState({
        selectedBug: mockBugMetadata,
        bugDetail: mockBugDetail,
      });

      service.start();

      expect(service.getCurrentPhase()).toBe('analyze');
    });

    it('should set status to running on start', () => {
      useBugStore.setState({
        selectedBug: mockBugMetadata,
        bugDetail: mockBugDetail,
      });

      service.start();

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
    it('should return true when phase is permitted', () => {
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

      const result = service.retryFrom('analyze');

      expect(result).toBe(true);
    });

    it('should return false when phase is not permitted', () => {
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

      const result = service.retryFrom('analyze');

      expect(result).toBe(false);
    });

    it('should return false when no bug is selected', () => {
      useBugStore.setState({ selectedBug: null, bugDetail: null });

      const result = service.retryFrom('analyze');

      expect(result).toBe(false);
    });
  });

  describe('MAX_RETRIES handling', () => {
    it('should stop after 3 consecutive retries', () => {
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

      // Retry 3 times
      service.retryFrom('analyze');
      service.retryFrom('analyze');
      service.retryFrom('analyze');

      // 4th retry should fail
      const result = service.retryFrom('analyze');

      expect(result).toBe(false);
    });
  });
});
