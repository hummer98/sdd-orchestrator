/**
 * watcherUtils.ts Tests
 * multi-window-integration Task 6.2
 *
 * Tests for per-window watcher management:
 * - Watcher functions delegate to WindowManager per-window services when windowId is provided
 * - Global variables are used as fallback when no windowId is provided
 * - Watchers emit events via EventBus
 *
 * Requirements: 1.5, 3.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================
// Module-level mock instances (accessible in beforeEach)
// ============================================================

const mockSpecsWatcher = {
  onChange: vi.fn(),
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
};

const mockBugsWatcher = {
  onChange: vi.fn(),
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
};

const mockAgentRecordWatcher = {
  onChange: vi.fn(),
  start: vi.fn(),
  stop: vi.fn().mockResolvedValue(undefined),
};

const mockEventBus = {
  emit: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
};

const mockWindowManager = {
  getWindowServices: vi.fn().mockReturnValue(null),
  getFocusedWindowId: vi.fn().mockReturnValue(1),
};

// ============================================================
// vi.mock declarations
// ============================================================

vi.mock('../../services/specsWatcherService', () => ({
  SpecsWatcherService: vi.fn().mockImplementation(() => mockSpecsWatcher),
}));

vi.mock('../../services/bugsWatcherService', () => ({
  BugsWatcherService: vi.fn().mockImplementation(() => mockBugsWatcher),
}));

vi.mock('../../services/agentRecordWatcherService', () => ({
  AgentRecordWatcherService: vi.fn().mockImplementation(() => mockAgentRecordWatcher),
}));

vi.mock('../../services/projectLogger', () => ({
  projectLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('./projectState', () => ({
  getMetricsService: vi.fn().mockReturnValue({
    startSpecLifecycle: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('../services/globalEventBus', () => ({
  getGlobalEventBus: vi.fn(() => mockEventBus),
}));

vi.mock('../services/eventBus', () => ({
  EVENT_NAMES: {
    SPECS_CHANGED: 'events:specs-changed',
    BUGS_CHANGED: 'events:bugs-changed',
    AGENT_RECORD_CHANGED: 'events:agent-record-changed',
  },
}));

vi.mock('../../services/windowManager', () => ({
  getWindowManager: vi.fn(() => mockWindowManager),
}));

// ============================================================
// Import module under test
// ============================================================

import {
  startSpecsWatcher,
  stopSpecsWatcher,
  startBugsWatcher,
  stopBugsWatcher,
  startAgentRecordWatcher,
  stopAgentRecordWatcher,
} from './watcherUtils';
import { getWindowManager } from '../../services/windowManager';

// ============================================================
// Tests
// ============================================================

describe('watcherUtils - Task 6.2: Per-window watcher management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-set mock implementations after clearAllMocks
    vi.mocked(getWindowManager).mockReturnValue(mockWindowManager as any);
    mockWindowManager.getWindowServices.mockReturnValue(null);
    mockWindowManager.getFocusedWindowId.mockReturnValue(1);
    mockSpecsWatcher.onChange.mockImplementation(() => {});
    mockSpecsWatcher.start.mockResolvedValue(undefined);
    mockSpecsWatcher.stop.mockResolvedValue(undefined);
    mockBugsWatcher.onChange.mockImplementation(() => {});
    mockBugsWatcher.start.mockResolvedValue(undefined);
    mockBugsWatcher.stop.mockResolvedValue(undefined);
    mockAgentRecordWatcher.onChange.mockImplementation(() => {});
    mockAgentRecordWatcher.start.mockImplementation(() => {});
    mockAgentRecordWatcher.stop.mockResolvedValue(undefined);
  });

  // ============================================================
  // Per-window specs watcher
  // ============================================================

  describe('startSpecsWatcher with windowId', () => {
    it('should use WindowManager per-window specsWatcherService when windowId is provided', async () => {
      const perWindowSpecsWatcher = {
        onChange: vi.fn(),
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      };
      mockWindowManager.getWindowServices.mockReturnValue({
        specsWatcherService: perWindowSpecsWatcher,
      });

      const mockFileService = {} as any;
      await startSpecsWatcher(null, mockFileService, () => '/test/project', 42);

      // Should use the per-window watcher's onChange and start
      expect(perWindowSpecsWatcher.onChange).toHaveBeenCalled();
      expect(perWindowSpecsWatcher.start).toHaveBeenCalled();
    });

    it('should fall back to creating a new watcher when windowId is not provided', async () => {
      const mockFileService = {} as any;
      await startSpecsWatcher(null, mockFileService, () => '/test/project');

      // Should use the module-level SpecsWatcherService constructor (global fallback)
      expect(mockSpecsWatcher.onChange).toHaveBeenCalled();
      expect(mockSpecsWatcher.start).toHaveBeenCalled();
    });
  });

  describe('stopSpecsWatcher with windowId', () => {
    it('should stop per-window specsWatcherService when windowId is provided', async () => {
      const perWindowSpecsWatcher = {
        onChange: vi.fn(),
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      };
      mockWindowManager.getWindowServices.mockReturnValue({
        specsWatcherService: perWindowSpecsWatcher,
      });

      await stopSpecsWatcher(42);

      expect(perWindowSpecsWatcher.stop).toHaveBeenCalled();
    });

    it('should stop global watcher when windowId is not provided', async () => {
      // First start a global watcher
      const mockFileService = {} as any;
      await startSpecsWatcher(null, mockFileService, () => '/test/project');

      await stopSpecsWatcher();

      expect(mockSpecsWatcher.stop).toHaveBeenCalled();
    });
  });

  // ============================================================
  // Per-window bugs watcher
  // ============================================================

  describe('startBugsWatcher with windowId', () => {
    it('should use WindowManager per-window bugsWatcherService when windowId is provided', async () => {
      const perWindowBugsWatcher = {
        onChange: vi.fn(),
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      };
      mockWindowManager.getWindowServices.mockReturnValue({
        bugsWatcherService: perWindowBugsWatcher,
      });

      await startBugsWatcher(() => '/test/project', 42);

      expect(perWindowBugsWatcher.onChange).toHaveBeenCalled();
      expect(perWindowBugsWatcher.start).toHaveBeenCalled();
    });
  });

  describe('stopBugsWatcher with windowId', () => {
    it('should stop per-window bugsWatcherService when windowId is provided', async () => {
      const perWindowBugsWatcher = {
        onChange: vi.fn(),
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      };
      mockWindowManager.getWindowServices.mockReturnValue({
        bugsWatcherService: perWindowBugsWatcher,
      });

      await stopBugsWatcher(42);

      expect(perWindowBugsWatcher.stop).toHaveBeenCalled();
    });
  });

  // ============================================================
  // Per-window agent record watcher
  // ============================================================

  describe('startAgentRecordWatcher with windowId', () => {
    it('should use WindowManager per-window agentRecordWatcherService when windowId is provided', () => {
      const perWindowAgentRecordWatcher = {
        onChange: vi.fn(),
        start: vi.fn(),
        stop: vi.fn().mockResolvedValue(undefined),
      };
      mockWindowManager.getWindowServices.mockReturnValue({
        agentRecordWatcherService: perWindowAgentRecordWatcher,
      });

      startAgentRecordWatcher(null, () => '/test/project', 42);

      expect(perWindowAgentRecordWatcher.onChange).toHaveBeenCalled();
      expect(perWindowAgentRecordWatcher.start).toHaveBeenCalled();
    });
  });

  describe('stopAgentRecordWatcher with windowId', () => {
    it('should stop per-window agentRecordWatcherService when windowId is provided', async () => {
      const perWindowAgentRecordWatcher = {
        onChange: vi.fn(),
        start: vi.fn(),
        stop: vi.fn().mockResolvedValue(undefined),
      };
      mockWindowManager.getWindowServices.mockReturnValue({
        agentRecordWatcherService: perWindowAgentRecordWatcher,
      });

      await stopAgentRecordWatcher(42);

      expect(perWindowAgentRecordWatcher.stop).toHaveBeenCalled();
    });
  });

  // ============================================================
  // Task 6.3: Event emission with projectPath metadata
  // ============================================================

  describe('Event emission with projectPath metadata', () => {
    it('should emit SPECS_CHANGED with projectPath in payload', async () => {
      const mockFileService = {} as any;
      let capturedHandler: Function;
      mockSpecsWatcher.onChange.mockImplementation((handler: Function) => {
        capturedHandler = handler;
      });

      await startSpecsWatcher(null, mockFileService, () => '/test/project');

      // Simulate a change event
      capturedHandler!({ type: 'change', path: '/test/project/.kiro/specs/test' });

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'events:specs-changed',
        expect.objectContaining({ projectPath: '/test/project' }),
      );
    });

    it('should emit BUGS_CHANGED with projectPath in payload', async () => {
      let capturedHandler: Function;
      mockBugsWatcher.onChange.mockImplementation((handler: Function) => {
        capturedHandler = handler;
      });

      await startBugsWatcher(() => '/test/project');

      // Simulate a change event
      capturedHandler!({ type: 'change', path: '/test/project/.kiro/bugs/test' });

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'events:bugs-changed',
        expect.objectContaining({ projectPath: '/test/project' }),
      );
    });

    it('should emit AGENT_RECORD_CHANGED with projectPath in payload', () => {
      let capturedHandler: Function;
      mockAgentRecordWatcher.onChange.mockImplementation((handler: Function) => {
        capturedHandler = handler;
      });

      startAgentRecordWatcher(null, () => '/test/project');

      // Simulate a change event
      capturedHandler!({ type: 'change', agentId: 'agent-1', specId: 'spec-1' });

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'events:agent-record-changed',
        expect.objectContaining({ projectPath: '/test/project' }),
      );
    });
  });
});
