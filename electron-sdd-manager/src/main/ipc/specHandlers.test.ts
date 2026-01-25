/**
 * Spec Handlers Tests
 * Task 5.1: specHandlers.ts を新規作成し、Spec関連ハンドラーを実装する
 * Requirements: 1.5, 2.1, 2.2, 2.3, 4.1, 4.2, 4.3
 *
 * TDD RED phase: Tests written before implementation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, BrowserWindow, IpcMainInvokeEvent } from 'electron';
import {
  registerSpecHandlers,
  startSpecsWatcher,
  stopSpecsWatcher,
  type SpecHandlersDependencies,
} from './specHandlers';
import { IPC_CHANNELS } from './channels';

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  BrowserWindow: {
    fromWebContents: vi.fn(),
    getAllWindows: vi.fn(() => []),
  },
}));

// Mock services
vi.mock('../services/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../services/specsWatcherService', () => ({
  SpecsWatcherService: vi.fn().mockImplementation(() => ({
    onChange: vi.fn(),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../services/documentReviewService', () => ({
  DocumentReviewService: vi.fn().mockImplementation(() => ({
    approveReview: vi.fn().mockResolvedValue({ ok: true }),
    skipReview: vi.fn().mockResolvedValue({ ok: true }),
    syncReviewState: vi.fn().mockResolvedValue({ ok: true }),
    getNextRoundNumber: vi.fn().mockResolvedValue(1),
    readSpecJson: vi.fn().mockResolvedValue({ ok: true, value: {} }),
  })),
}));

vi.mock('../services/eventLogService', () => ({
  getDefaultEventLogService: vi.fn(() => ({
    readEvents: vi.fn().mockResolvedValue({ ok: true, value: [] }),
  })),
}));

vi.mock('../services/taskParallelParser', () => ({
  parseTasksContent: vi.fn(() => ({
    totalTasks: 5,
    parallelTasks: 2,
    groups: [],
  })),
}));

vi.mock('../services/metricsService', () => ({
  getDefaultMetricsService: vi.fn(() => ({
    completeSpecLifecycle: vi.fn().mockResolvedValue(undefined),
    startSpecLifecycle: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('./startImplPhase', () => ({
  startImplPhase: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'test-agent' } }),
}));

describe('specHandlers', () => {
  let mockFileService: {
    readSpecs: ReturnType<typeof vi.fn>;
    readSpecJson: ReturnType<typeof vi.fn>;
    resolveSpecPath: ReturnType<typeof vi.fn>;
    createSpec: ReturnType<typeof vi.fn>;
    updateApproval: ReturnType<typeof vi.fn>;
    updateSpecJson: ReturnType<typeof vi.fn>;
    updateSpecJsonFromPhase: ReturnType<typeof vi.fn>;
    readArtifact: ReturnType<typeof vi.fn>;
  };

  let mockSpecManagerService: {
    startAgent: ReturnType<typeof vi.fn>;
    execute: ReturnType<typeof vi.fn>;
    setInspectionAutoExecutionFlag: ReturnType<typeof vi.fn>;
    onOutput: ReturnType<typeof vi.fn>;
    onStatusChange: ReturnType<typeof vi.fn>;
    offStatusChange: ReturnType<typeof vi.fn>;
    getAgentById: ReturnType<typeof vi.fn>;
    onAgentExitError: ReturnType<typeof vi.fn>;
  };

  let mockDependencies: SpecHandlersDependencies;

  beforeEach(() => {
    vi.clearAllMocks();

    mockFileService = {
      readSpecs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
      readSpecJson: vi.fn().mockResolvedValue({ ok: true, value: {} }),
      resolveSpecPath: vi.fn().mockResolvedValue({ ok: true, value: '/project/.kiro/specs/test-spec' }),
      createSpec: vi.fn().mockResolvedValue({ ok: true }),
      updateApproval: vi.fn().mockResolvedValue({ ok: true }),
      updateSpecJson: vi.fn().mockResolvedValue({ ok: true }),
      updateSpecJsonFromPhase: vi.fn().mockResolvedValue({ ok: true }),
      readArtifact: vi.fn().mockResolvedValue({ ok: true, value: '# Tasks\n- [x] 1.1 Task' }),
    };

    mockSpecManagerService = {
      startAgent: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'test-agent-123' } }),
      execute: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'test-agent-456' } }),
      setInspectionAutoExecutionFlag: vi.fn().mockResolvedValue(undefined),
      onOutput: vi.fn(),
      onStatusChange: vi.fn(),
      offStatusChange: vi.fn(),
      getAgentById: vi.fn(),
      onAgentExitError: vi.fn(),
    };

    mockDependencies = {
      fileService: mockFileService as unknown as SpecHandlersDependencies['fileService'],
      getSpecManagerService: vi.fn(() => mockSpecManagerService as unknown as ReturnType<SpecHandlersDependencies['getSpecManagerService']>),
      getCurrentProjectPath: vi.fn(() => '/test/project'),
      getEventCallbacksRegistered: vi.fn(() => false),
      setEventCallbacksRegistered: vi.fn(),
      registerEventCallbacks: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('registerSpecHandlers', () => {
    it('should register all spec-related IPC handlers', () => {
      registerSpecHandlers(mockDependencies);

      // Verify that ipcMain.handle was called for each expected channel
      const handleCalls = vi.mocked(ipcMain.handle).mock.calls;
      const registeredChannels = handleCalls.map(call => call[0]);

      // Spec CRUD
      expect(registeredChannels).toContain(IPC_CHANNELS.READ_SPECS);
      expect(registeredChannels).toContain(IPC_CHANNELS.READ_SPEC_JSON);
      expect(registeredChannels).toContain(IPC_CHANNELS.CREATE_SPEC);

      // Spec updates
      expect(registeredChannels).toContain(IPC_CHANNELS.UPDATE_APPROVAL);
      expect(registeredChannels).toContain(IPC_CHANNELS.UPDATE_SPEC_JSON);
      expect(registeredChannels).toContain(IPC_CHANNELS.SYNC_SPEC_PHASE);

      // Watcher
      expect(registeredChannels).toContain(IPC_CHANNELS.START_SPECS_WATCHER);
      expect(registeredChannels).toContain(IPC_CHANNELS.STOP_SPECS_WATCHER);

      // Execution
      expect(registeredChannels).toContain(IPC_CHANNELS.EXECUTE_SPEC_INIT);
      expect(registeredChannels).toContain(IPC_CHANNELS.EXECUTE_SPEC_PLAN);
      expect(registeredChannels).toContain(IPC_CHANNELS.EXECUTE);

      // Document Review
      expect(registeredChannels).toContain(IPC_CHANNELS.EXECUTE_DOCUMENT_REVIEW);
      expect(registeredChannels).toContain(IPC_CHANNELS.EXECUTE_DOCUMENT_REVIEW_REPLY);
      expect(registeredChannels).toContain(IPC_CHANNELS.EXECUTE_DOCUMENT_REVIEW_FIX);
      expect(registeredChannels).toContain(IPC_CHANNELS.APPROVE_DOCUMENT_REVIEW);
      expect(registeredChannels).toContain(IPC_CHANNELS.SKIP_DOCUMENT_REVIEW);

      // Inspection
      expect(registeredChannels).toContain(IPC_CHANNELS.EXECUTE_INSPECTION);
      expect(registeredChannels).toContain(IPC_CHANNELS.EXECUTE_INSPECTION_FIX);
      expect(registeredChannels).toContain(IPC_CHANNELS.SET_INSPECTION_AUTO_EXECUTION_FLAG);

      // Ask
      expect(registeredChannels).toContain(IPC_CHANNELS.EXECUTE_ASK_PROJECT);
      expect(registeredChannels).toContain(IPC_CHANNELS.EXECUTE_ASK_SPEC);

      // Merge
      expect(registeredChannels).toContain(IPC_CHANNELS.EXECUTE_SPEC_MERGE);

      // Impl Start
      expect(registeredChannels).toContain(IPC_CHANNELS.START_IMPL);

      // Other
      expect(registeredChannels).toContain(IPC_CHANNELS.SYNC_DOCUMENT_REVIEW);
      expect(registeredChannels).toContain(IPC_CHANNELS.EVENT_LOG_GET);
      expect(registeredChannels).toContain(IPC_CHANNELS.PARSE_TASKS_FOR_PARALLEL);
    });
  });

  describe('SpecHandlersDependencies interface', () => {
    it('should define required dependencies for dependency injection', () => {
      // Verify the dependencies interface structure
      expect(mockDependencies).toHaveProperty('fileService');
      expect(mockDependencies).toHaveProperty('getSpecManagerService');
      expect(mockDependencies).toHaveProperty('getCurrentProjectPath');
      expect(mockDependencies).toHaveProperty('getEventCallbacksRegistered');
      expect(mockDependencies).toHaveProperty('setEventCallbacksRegistered');
      expect(mockDependencies).toHaveProperty('registerEventCallbacks');
    });

    it('should allow mock services for testability (Requirement 2.3)', () => {
      // This test verifies that the dependency injection pattern allows mocking
      const customMockFileService = {
        readSpecs: vi.fn().mockResolvedValue({ ok: true, value: [{ name: 'custom-spec' }] }),
        readSpecJson: vi.fn(),
        resolveSpecPath: vi.fn(),
        createSpec: vi.fn(),
        updateApproval: vi.fn(),
        updateSpecJson: vi.fn(),
        updateSpecJsonFromPhase: vi.fn(),
        readArtifact: vi.fn(),
      };

      const customDeps: SpecHandlersDependencies = {
        ...mockDependencies,
        fileService: customMockFileService as unknown as SpecHandlersDependencies['fileService'],
      };

      registerSpecHandlers(customDeps);

      // Should register without errors with custom mocks
      expect(vi.mocked(ipcMain.handle)).toHaveBeenCalled();
    });
  });

  describe('startSpecsWatcher', () => {
    it('should be exported as a function', () => {
      expect(typeof startSpecsWatcher).toBe('function');
    });
  });

  describe('stopSpecsWatcher', () => {
    it('should be exported as a function', () => {
      expect(typeof stopSpecsWatcher).toBe('function');
    });
  });
});
