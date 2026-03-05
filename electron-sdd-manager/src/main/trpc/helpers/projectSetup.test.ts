/**
 * projectSetup.ts Tests
 * multi-window-integration Task 6.1
 *
 * Tests for selectProject windowId parameter:
 * - selectProject(projectPath, windowId) uses WindowManager for per-window service initialization
 * - selectProject(projectPath) without windowId uses focused window fallback
 * - Duplicate project detection via WindowManager
 *
 * Requirements: 3.5, 5.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all external dependencies before importing the module under test

// Mock WindowManager
const mockWindowManager = {
  getFocusedWindowId: vi.fn().mockReturnValue(1),
  getWindowProject: vi.fn().mockReturnValue(null),
  getWindowServices: vi.fn().mockReturnValue(null),
  getWindowContext: vi.fn().mockReturnValue(null),
  setWindowProject: vi.fn().mockReturnValue({ ok: true, value: undefined }),
  checkDuplicate: vi.fn().mockReturnValue(null),
  restoreAndFocus: vi.fn(),
  getWindow: vi.fn().mockReturnValue(null),
  createWindowServices: vi.fn(),
};

vi.mock('../../services/windowManager', () => ({
  getWindowManager: vi.fn(() => mockWindowManager),
  resetWindowManager: vi.fn(),
}));

// Mock configStore
vi.mock('../../services/configStore', () => ({
  getConfigStore: vi.fn(() => ({
    addRecentProject: vi.fn(),
    getWindowBounds: vi.fn().mockReturnValue(null),
    getMultiWindowStates: vi.fn().mockReturnValue([]),
  })),
}));

// Mock menu
vi.mock('../../menu', () => ({
  setMenuProjectPath: vi.fn(),
  updateWindowTitle: vi.fn(),
}));

// Mock logger
vi.mock('../../services/projectLogger', () => ({
  projectLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    setCurrentProject: vi.fn(),
  },
}));

// Mock FileService - defined inline to avoid hoisting issues
vi.mock('../../services/fileService', () => ({
  FileService: vi.fn().mockImplementation(() => ({
    validateKiroDirectory: vi.fn().mockResolvedValue({ exists: true, hasSpecs: true, hasSteering: true }),
    readSpecs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    readSpecJson: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    resolveSpecPath: vi.fn().mockResolvedValue({ ok: true, value: '/test/.kiro/specs/test' }),
  })),
}));

// Mock BugService
vi.mock('../../services/bugService', () => ({
  BugService: vi.fn().mockImplementation(() => ({
    readBugs: vi.fn().mockResolvedValue({ ok: true, value: { bugs: [], warnings: [] } }),
    resolveBugPath: vi.fn().mockResolvedValue('/test/.kiro/bugs/test'),
    getAgentCwd: vi.fn().mockResolvedValue('/test/project'),
  })),
}));

// Mock SpecManagerService
vi.mock('../../services/specManagerService', () => ({
  SpecManagerService: vi.fn().mockImplementation(() => ({
    restoreAgents: vi.fn().mockResolvedValue(undefined),
    loadSpecs: vi.fn().mockResolvedValue([]),
    onStatusChange: vi.fn(),
    offStatusChange: vi.fn(),
    onOutput: vi.fn(),
    onAgentExitError: vi.fn(),
    onAgentStartError: vi.fn(),
    getAllAgents: vi.fn().mockResolvedValue(new Map()),
  })),
  WorkflowPhase: {},
}));

// Mock MetricsService
vi.mock('../../services/metricsService', () => ({
  MetricsService: vi.fn().mockImplementation(() => ({
    setProjectPath: vi.fn(),
    startSpecLifecycle: vi.fn().mockResolvedValue(undefined),
    recordHumanSession: vi.fn().mockResolvedValue(undefined),
    getMetricsForSpec: vi.fn().mockResolvedValue({}),
    getProjectMetrics: vi.fn().mockResolvedValue({}),
  })),
}));

vi.mock('../../services/metricsFileWriter', () => ({
  MetricsFileWriter: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('../../services/metricsFileReader', () => ({
  MetricsFileReader: vi.fn().mockImplementation(() => ({})),
}));

// Mock sessionRecoveryService
vi.mock('../../services/sessionRecoveryService', () => ({
  SessionRecoveryService: vi.fn().mockImplementation(() => ({
    recoverIncompleteSessions: vi.fn().mockResolvedValue({
      aiSessionsRecovered: 0,
      humanSessionsRecovered: 0,
    }),
  })),
}));

// Mock logFileService
vi.mock('../../services/logFileService', () => ({
  initDefaultLogFileService: vi.fn(),
  readParsedLogs: vi.fn().mockResolvedValue([]),
}));

// Mock logStreamingService
vi.mock('../../services/logStreamingService', () => ({
  LogStreamingService: vi.fn().mockImplementation(() => ({
    processLogOutput: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock agentRecordService
vi.mock('../../services/agentRecordService', () => ({
  initDefaultAgentRecordService: vi.fn(),
  getDefaultAgentRecordService: vi.fn().mockReturnValue({
    getRunningAgentCounts: vi.fn().mockResolvedValue(new Map()),
  }),
}));

// Mock layoutConfigService
vi.mock('../../services/layoutConfigService', () => ({
  layoutConfigService: {
    loadSkipPermissions: vi.fn().mockResolvedValue(false),
  },
}));

// Mock AutoExecutionCoordinator
vi.mock('../../services/autoExecutionCoordinator', () => ({
  AutoExecutionCoordinator: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    resetAll: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    setCurrentPhase: vi.fn(),
    handleAgentCompleted: vi.fn(),
  })),
  MAX_DOCUMENT_REVIEW_ROUNDS: 5,
}));

// Mock BugAutoExecutionCoordinator
vi.mock('../../services/bugAutoExecutionCoordinator', () => ({
  getBugAutoExecutionCoordinator: vi.fn().mockReturnValue({
    on: vi.fn(),
    resetAll: vi.fn(),
  }),
}));

// Mock remoteAccessSetup
vi.mock('../../services/remoteAccessSetup', () => ({
  setupStateProvider: vi.fn(),
  setupWorkflowController: vi.fn(),
  setupAgentLogsProvider: vi.fn(),
  setupSpecDetailProvider: vi.fn(),
  setupBugDetailProvider: vi.fn(),
  setupFileService: vi.fn(),
  getRemoteAccessServer: vi.fn().mockReturnValue({
    getWebSocketHandler: vi.fn().mockReturnValue(null),
  }),
}));

// Mock scheduleTaskSetup
vi.mock('../../services/scheduleTaskSetup', () => ({
  initScheduleTaskCoordinator: vi.fn().mockResolvedValue(undefined),
}));

// Mock agentLifecycleSetup
vi.mock('../../services/agentLifecycleSetup', () => ({
  initializeAgentLifecycleManager: vi.fn().mockResolvedValue({
    lifecycleManager: {
      synchronizeOnStartup: vi.fn().mockResolvedValue({ running: 0, stopped: 0 }),
    },
    watchdog: {
      start: vi.fn(),
    },
  }),
}));

// Mock DocumentReviewService
vi.mock('../../services/documentReviewService', () => ({
  DocumentReviewService: vi.fn().mockImplementation(() => ({
    getNextRoundNumber: vi.fn().mockResolvedValue(1),
    readSpecJson: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    approveReview: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock EventBus
vi.mock('../services/globalEventBus', () => ({
  getGlobalEventBus: vi.fn().mockReturnValue({
    emit: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  }),
}));

vi.mock('../services/eventBus', () => ({
  EVENT_NAMES: {
    AGENT_OUTPUT: 'events:agent-output',
    AGENT_STATUS_CHANGE: 'events:agent-status-change',
    AGENT_LOG: 'events:agent-log',
    AGENT_START_ERROR: 'events:agent-start-error',
    AGENT_EXIT_ERROR: 'events:agent-exit-error',
    AGENT_RECORD_CHANGED: 'events:agent-record-changed',
    SPECS_CHANGED: 'events:specs-changed',
    BUGS_CHANGED: 'events:bugs-changed',
    AUTO_EXECUTION_STATUS_CHANGED: 'events:auto-execution-status-changed',
    AUTO_EXECUTION_PHASE_STARTED: 'events:auto-execution-phase-started',
    AUTO_EXECUTION_PHASE_COMPLETED: 'events:auto-execution-phase-completed',
    AUTO_EXECUTION_ERROR: 'events:auto-execution-error',
    AUTO_EXECUTION_COMPLETED: 'events:auto-execution-completed',
    BUG_AUTO_EXECUTION_STATUS_CHANGED: 'events:bug-auto-execution-status-changed',
    BUG_AUTO_EXECUTION_PHASE_STARTED: 'events:bug-auto-execution-phase-started',
    BUG_AUTO_EXECUTION_PHASE_COMPLETED: 'events:bug-auto-execution-phase-completed',
    BUG_AUTO_EXECUTION_ERROR: 'events:bug-auto-execution-error',
    BUG_AUTO_EXECUTION_COMPLETED: 'events:bug-auto-execution-completed',
    BUG_AUTO_EXECUTION_EXECUTE_PHASE: 'events:bug-auto-execution-execute-phase',
    PROJECT_FILE_CHANGED: 'events:project-file-changed',
  },
}));

// Mock watcher utilities
vi.mock('./watcherUtils', () => ({
  startSpecsWatcher: vi.fn().mockResolvedValue(undefined),
  stopSpecsWatcher: vi.fn().mockResolvedValue(undefined),
  startBugsWatcher: vi.fn().mockResolvedValue(undefined),
  stopBugsWatcher: vi.fn().mockResolvedValue(undefined),
  startAgentRecordWatcher: vi.fn(),
  stopAgentRecordWatcher: vi.fn().mockResolvedValue(undefined),
}));

// Mock project file utils
vi.mock('./projectFileUtils', () => ({
  startProjectFileWatcher: vi.fn().mockResolvedValue(undefined),
  stopProjectFileWatcher: vi.fn().mockResolvedValue(undefined),
  initProjectFileWatcher: vi.fn(),
}));

// Mock project utils
vi.mock('./projectUtils', () => ({
  validateProjectPath: vi.fn().mockResolvedValue({ ok: true }),
  isProjectSelectionInProgress: vi.fn().mockReturnValue(false),
  setProjectSelectionLock: vi.fn(),
  resetProjectSelectionLock: vi.fn(),
}));

// Mock electron BrowserWindow
vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: vi.fn().mockReturnValue([{ id: 1, webContents: { send: vi.fn() } }]),
    getFocusedWindow: vi.fn().mockReturnValue(null),
  },
  app: {
    isPackaged: false,
    getVersion: vi.fn().mockReturnValue('1.0.0'),
    getPath: vi.fn().mockReturnValue('/tmp'),
  },
}));

// Now import the module under test
import { selectProject } from './projectSetup';
import { getWindowManager } from '../../services/windowManager';
import { validateProjectPath, isProjectSelectionInProgress, setProjectSelectionLock } from './projectUtils';

describe('projectSetup - Task 6.1: selectProject windowId parameter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-set getWindowManager mock after clearAllMocks (clearAllMocks resets vi.fn implementations)
    vi.mocked(getWindowManager).mockReturnValue(mockWindowManager as any);
    // Re-set projectUtils mocks after clearAllMocks
    vi.mocked(validateProjectPath).mockResolvedValue({ ok: true });
    vi.mocked(isProjectSelectionInProgress).mockReturnValue(false);
    vi.mocked(setProjectSelectionLock).mockImplementation(() => {});
    // Re-set mock implementations after clearAllMocks
    mockWindowManager.setWindowProject.mockReturnValue({ ok: true, value: undefined });
    mockWindowManager.checkDuplicate.mockReturnValue(null);
    mockWindowManager.getFocusedWindowId.mockReturnValue(1);
    mockWindowManager.getWindowProject.mockReturnValue(null);
    // Provide mock services so getSpecManagerService() via projectState compat layer works
    mockWindowManager.getWindowServices.mockReturnValue({
      specManagerService: {
        restoreAgents: vi.fn().mockResolvedValue(undefined),
        loadSpecs: vi.fn().mockResolvedValue([]),
        onStatusChange: vi.fn(),
        offStatusChange: vi.fn(),
        onOutput: vi.fn(),
        onAgentExitError: vi.fn(),
        onAgentStartError: vi.fn(),
        getAllAgents: vi.fn().mockResolvedValue(new Map()),
      },
      metricsService: {
        setProjectPath: vi.fn(),
        startSpecLifecycle: vi.fn().mockResolvedValue(undefined),
      },
      autoExecutionCoordinator: {
        on: vi.fn(),
        resetAll: vi.fn(),
      },
    });
  });

  afterEach(() => {
    // Note: only clearAllMocks (not restoreAllMocks) to preserve vi.mock() factory implementations
  });

  // ============================================================
  // Task 6.1: selectProject accepts windowId parameter
  // ============================================================

  describe('selectProject with windowId parameter', () => {
    it('should accept windowId as second parameter and return success', async () => {
      const result = await selectProject('/test/project', 42);

      expect(result.success).toBe(true);
      expect(result.projectPath).toBe('/test/project');
    });

    it('should call WindowManager.setWindowProject with provided windowId', async () => {
      await selectProject('/test/project', 42);

      expect(mockWindowManager.setWindowProject).toHaveBeenCalledWith(42, '/test/project');
    });

    it('should use focused window when windowId is not provided', async () => {
      mockWindowManager.getFocusedWindowId.mockReturnValue(7);

      await selectProject('/test/project');

      expect(mockWindowManager.setWindowProject).toHaveBeenCalledWith(7, '/test/project');
    });

    it('should return DUPLICATE_PROJECT error when project is already open in another window', async () => {
      mockWindowManager.setWindowProject.mockReturnValue({
        ok: false,
        error: {
          type: 'DUPLICATE_PROJECT',
          existingWindowId: 5,
          projectPath: '/test/project',
        },
      });

      const result = await selectProject('/test/project', 42);

      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({ type: 'DUPLICATE_PROJECT' }),
      );
    });

    it('should call restoreAndFocus on existing window for duplicate project', async () => {
      mockWindowManager.setWindowProject.mockReturnValue({
        ok: false,
        error: {
          type: 'DUPLICATE_PROJECT',
          existingWindowId: 5,
          projectPath: '/test/project',
        },
      });

      await selectProject('/test/project', 42);

      expect(mockWindowManager.restoreAndFocus).toHaveBeenCalledWith(5);
    });

    it('should catch and continue when WindowManager.setWindowProject throws', async () => {
      // When setWindowProject throws an unexpected error
      mockWindowManager.setWindowProject.mockImplementation(() => {
        throw new Error('Unexpected WindowManager error');
      });

      // selectProject should catch the error in the WindowManager block and continue
      const result = await selectProject('/test/project', 42);

      // Should still succeed (WindowManager error is non-fatal, caught by inner try-catch)
      expect(result.success).toBe(true);
      expect(result.projectPath).toBe('/test/project');
    });
  });
});
