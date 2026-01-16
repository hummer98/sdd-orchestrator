/**
 * Renderer Logging Integration Tests
 * renderer-unified-logging feature
 *
 * Tests the complete log flow through mocked components:
 * - Console Hook -> IPC -> (mocked) ProjectLogger
 * - rendererLogger -> IPC -> (mocked) ProjectLogger
 * - notify -> rendererLogger -> IPC
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Store original console
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

// Mock electronAPI
const mockLogRenderer = vi.fn();
vi.stubGlobal('window', {
  electronAPI: {
    logRenderer: mockLogRenderer,
    isE2ETest: vi.fn().mockResolvedValue(false),
  },
});

// Mock stores for context
vi.mock('../stores/spec/specDetailStore', () => ({
  useSpecDetailStore: {
    getState: vi.fn(() => ({
      specDetail: {
        metadata: { name: 'test-integration-spec' },
      },
    })),
  },
}));

vi.mock('../stores/bugStore', () => ({
  useBugStore: {
    getState: vi.fn(() => ({
      selectedBug: {
        name: 'test-integration-bug',
        status: 'analyzing',
      },
    })),
  },
}));

// Import after mocking
import {
  initializeConsoleHook,
  uninitializeConsoleHook,
  isHookActive,
  setEnvironment,
} from './consoleHook';
import { rendererLogger } from './rendererLogger';
import { notify } from '../stores/notificationStore';
import { useNotificationStore } from '../stores/notificationStore';

describe('Renderer Logging Integration', () => {
  beforeEach(() => {
    // Reset mocks
    mockLogRenderer.mockClear();

    // Reset console
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.debug = originalConsole.debug;

    // Reset hook state
    uninitializeConsoleHook();
    setEnvironment('development');

    // Reset notification store
    useNotificationStore.setState({ notifications: [] });
  });

  afterEach(() => {
    // Restore console
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.debug = originalConsole.debug;

    uninitializeConsoleHook();
  });

  // Integration Test 1: Console Hook -> IPC flow
  describe('Console Hook -> IPC Flow', () => {
    it('should send console.log to IPC with context', () => {
      initializeConsoleHook();
      expect(isHookActive()).toBe(true);

      console.log('Integration test message');

      expect(mockLogRenderer).toHaveBeenCalledWith(
        'info',
        expect.stringContaining('Integration test message'),
        expect.objectContaining({
          specId: 'test-integration-spec',
          bugName: 'test-integration-bug',
        })
      );
    });

    it('should send console.error with stack trace', () => {
      initializeConsoleHook();

      console.error('Integration error message');

      expect(mockLogRenderer).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('Integration error message'),
        expect.objectContaining({
          stack: expect.any(String),
        })
      );
    });

    it('should filter HMR messages from IPC', () => {
      initializeConsoleHook();

      console.log('[HMR] Hot update');

      expect(mockLogRenderer).not.toHaveBeenCalled();
    });

    it('should filter Vite messages from IPC', () => {
      initializeConsoleHook();

      console.log('[vite] connected');

      expect(mockLogRenderer).not.toHaveBeenCalled();
    });

    it('should filter React DevTools messages from IPC', () => {
      initializeConsoleHook();

      console.log('Download the React DevTools');

      expect(mockLogRenderer).not.toHaveBeenCalled();
    });
  });

  // Integration Test 2: rendererLogger -> IPC flow
  describe('rendererLogger -> IPC Flow', () => {
    it('should send rendererLogger.log to IPC with auto context', () => {
      rendererLogger.log('Logger test message');

      expect(mockLogRenderer).toHaveBeenCalledWith(
        'info',
        expect.stringContaining('Logger test message'),
        expect.objectContaining({
          specId: 'test-integration-spec',
          bugName: 'test-integration-bug',
        })
      );
    });

    it('should send rendererLogger.error to IPC', () => {
      rendererLogger.error('Logger error message');

      expect(mockLogRenderer).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('Logger error message'),
        expect.any(Object)
      );
    });

    it('should merge explicit context with auto context', () => {
      rendererLogger.logWithContext('warn', 'Custom context test', {
        customField: 'customValue',
      });

      expect(mockLogRenderer).toHaveBeenCalledWith(
        'warn',
        'Custom context test',
        expect.objectContaining({
          specId: 'test-integration-spec',
          bugName: 'test-integration-bug',
          customField: 'customValue',
        })
      );
    });
  });

  // Integration Test 3: notify -> rendererLogger -> IPC flow
  describe('notify -> rendererLogger -> IPC Flow', () => {
    it('should send notify.error through rendererLogger to IPC', () => {
      notify.error('Notification error');

      // Verify notification was added
      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].type).toBe('error');

      // Verify log was sent via rendererLogger
      // Note: source field is added by rendererLogger and includes "renderer:" prefix
      expect(mockLogRenderer).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('Notification error'),
        expect.objectContaining({
          source: expect.stringMatching(/^renderer:/),
        })
      );
    });

    it('should send notify.success through rendererLogger to IPC', () => {
      notify.success('Operation completed');

      // Verify notification was added
      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].type).toBe('success');

      // Verify log was sent
      expect(mockLogRenderer).toHaveBeenCalledWith(
        'info',
        expect.stringContaining('Operation completed'),
        expect.any(Object)
      );
    });

    it('should send notify.warning through rendererLogger to IPC', () => {
      notify.warning('Warning message');

      expect(mockLogRenderer).toHaveBeenCalledWith(
        'warn',
        expect.stringContaining('Warning message'),
        expect.any(Object)
      );
    });
  });

  // Production environment test
  describe('Production Environment', () => {
    it('should not hook console in production', () => {
      setEnvironment('production');
      initializeConsoleHook();

      expect(isHookActive()).toBe(false);

      console.log('Production log');

      // Should not be sent to IPC when hook is not active
      expect(mockLogRenderer).not.toHaveBeenCalled();
    });

    it('should still allow rendererLogger in production', () => {
      setEnvironment('production');

      // rendererLogger should still work regardless of console hook
      rendererLogger.log('Production logger message');

      expect(mockLogRenderer).toHaveBeenCalledWith(
        'info',
        expect.stringContaining('Production logger message'),
        expect.any(Object)
      );
    });
  });

  // Multiple log sources test
  describe('Multiple Log Sources', () => {
    it('should handle logs from multiple sources correctly', () => {
      initializeConsoleHook();

      // Log via console hook
      console.log('Console log');

      // Log via rendererLogger
      rendererLogger.info('Logger info');

      // Log via notify
      notify.info('Notify info');

      // All three should be logged
      expect(mockLogRenderer).toHaveBeenCalledTimes(3);

      // Check each call
      const calls = mockLogRenderer.mock.calls;

      // Console log
      expect(calls[0][0]).toBe('info');
      expect(calls[0][1]).toContain('Console log');

      // Logger info
      expect(calls[1][0]).toBe('info');
      expect(calls[1][1]).toContain('Logger info');

      // Notify info
      expect(calls[2][0]).toBe('info');
      expect(calls[2][1]).toContain('Notify info');
    });
  });
});
