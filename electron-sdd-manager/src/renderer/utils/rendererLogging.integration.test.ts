/**
 * Renderer Logging Integration Tests
 * renderer-unified-logging feature
 *
 * Tests the complete log flow through mocked components:
 * - Console Hook -> tRPC -> (mocked) ProjectLogger
 * - rendererLogger -> tRPC -> (mocked) ProjectLogger
 * - notify -> rendererLogger -> tRPC
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

// Mock tRPC vanillaClient (trpc-full-migration: electronAPI → tRPC)
const mockMutate = vi.fn().mockResolvedValue(undefined);
vi.mock('../../shared/trpc/vanillaClient', () => {
  const createMockProxy = (): any => {
    return new Proxy({}, {
      get: (_target: any, prop: string) => {
        if (prop === 'mutate') return mockMutate;
        if (prop === 'query') return vi.fn().mockResolvedValue(undefined);
        if (prop === 'then' || prop === 'catch' || prop === 'finally') return undefined;
        return createMockProxy();
      },
    });
  };
  return {
    getVanillaClient: vi.fn(() => createMockProxy()),
    resetVanillaClient: vi.fn(),
  };
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

// bugs-view-unification Task 6.1: Mock useSharedBugStore instead of useBugStore
vi.mock('../../shared/stores/bugStore', () => ({
  useSharedBugStore: {
    getState: vi.fn(() => ({
      selectedBugId: 'test-integration-bug',
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
    mockMutate.mockClear();

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

  // Integration Test 1: Console Hook -> tRPC flow
  describe('Console Hook -> tRPC Flow', () => {
    it('should send console.log to tRPC with context', () => {
      initializeConsoleHook();
      expect(isHookActive()).toBe(true);

      console.log('Integration test message');

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
          message: expect.stringContaining('Integration test message'),
          context: expect.objectContaining({
            specId: 'test-integration-spec',
            bugName: 'test-integration-bug',
          }),
        })
      );
    });

    it('should send console.error with stack trace', () => {
      initializeConsoleHook();

      console.error('Integration error message');

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          message: expect.stringContaining('Integration error message'),
          context: expect.objectContaining({
            stack: expect.any(String),
          }),
        })
      );
    });

    it('should filter HMR messages from tRPC', () => {
      initializeConsoleHook();

      console.log('[HMR] Hot update');

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('should filter Vite messages from tRPC', () => {
      initializeConsoleHook();

      console.log('[vite] connected');

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('should filter React DevTools messages from tRPC', () => {
      initializeConsoleHook();

      console.log('Download the React DevTools');

      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  // Integration Test 2: rendererLogger -> tRPC flow
  describe('rendererLogger -> tRPC Flow', () => {
    it('should send rendererLogger.log to tRPC with auto context', () => {
      rendererLogger.log('Logger test message');

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
          message: expect.stringContaining('Logger test message'),
          context: expect.objectContaining({
            specId: 'test-integration-spec',
            bugName: 'test-integration-bug',
          }),
        })
      );
    });

    it('should send rendererLogger.error to tRPC', () => {
      rendererLogger.error('Logger error message');

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          message: expect.stringContaining('Logger error message'),
        })
      );
    });

    it('should merge explicit context with auto context', () => {
      rendererLogger.logWithContext('warn', 'Custom context test', {
        customField: 'customValue',
      });

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'warn',
          message: 'Custom context test',
          context: expect.objectContaining({
            specId: 'test-integration-spec',
            bugName: 'test-integration-bug',
            customField: 'customValue',
          }),
        })
      );
    });
  });

  // Integration Test 3: notify -> rendererLogger -> tRPC flow
  describe('notify -> rendererLogger -> tRPC Flow', () => {
    it('should send notify.error through rendererLogger to tRPC', () => {
      notify.error('Notification error');

      // Verify notification was added
      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].type).toBe('error');

      // Verify log was sent via rendererLogger
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          message: expect.stringContaining('Notification error'),
          context: expect.objectContaining({
            source: expect.stringMatching(/^renderer:/),
          }),
        })
      );
    });

    it('should send notify.success through rendererLogger to tRPC', () => {
      notify.success('Operation completed');

      // Verify notification was added
      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].type).toBe('success');

      // Verify log was sent
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
          message: expect.stringContaining('Operation completed'),
        })
      );
    });

    it('should send notify.warning through rendererLogger to tRPC', () => {
      notify.warning('Warning message');

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'warn',
          message: expect.stringContaining('Warning message'),
        })
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

      // Should not be sent to tRPC when hook is not active
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('should still allow rendererLogger in production', () => {
      setEnvironment('production');

      // rendererLogger should still work regardless of console hook
      rendererLogger.log('Production logger message');

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
          message: expect.stringContaining('Production logger message'),
        })
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
      expect(mockMutate).toHaveBeenCalledTimes(3);

      // Check each call - now using { level, message, context } object format
      const calls = mockMutate.mock.calls;

      // Console log
      expect(calls[0][0].level).toBe('info');
      expect(calls[0][0].message).toContain('Console log');

      // Logger info
      expect(calls[1][0].level).toBe('info');
      expect(calls[1][0].message).toContain('Logger info');

      // Notify info
      expect(calls[2][0].level).toBe('info');
      expect(calls[2][0].message).toContain('Notify info');
    });
  });
});
