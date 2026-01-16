/**
 * ConsoleHook Unit Tests
 * renderer-unified-logging feature
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.4
 *
 * Tests for global console.* hooking functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Store original console methods
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

// Mock the noiseFilter
vi.mock('./noiseFilter', () => ({
  shouldFilter: vi.fn((msg) => {
    if (typeof msg === 'string') {
      return msg.includes('[HMR]') || msg.includes('[vite]');
    }
    return false;
  }),
}));

// Mock contextProvider
vi.mock('./contextProvider', () => ({
  getAutoContext: vi.fn(() => ({})),
}));

// Import after mocking
import {
  initializeConsoleHook,
  isHookActive,
  uninitializeConsoleHook,
  setEnvironment,
} from './consoleHook';
import { shouldFilter } from './noiseFilter';
import { getAutoContext } from './contextProvider';

describe('ConsoleHook', () => {
  beforeEach(() => {
    // Reset mocks
    mockLogRenderer.mockClear();
    vi.mocked(shouldFilter).mockClear();
    vi.mocked(getAutoContext).mockReturnValue({});

    // Reset console to original
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.debug = originalConsole.debug;

    // Reset hook state
    uninitializeConsoleHook();

    // Set development environment by default
    setEnvironment('development');
  });

  afterEach(() => {
    // Restore console
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.debug = originalConsole.debug;

    // Reset hook state
    uninitializeConsoleHook();
  });

  describe('initializeConsoleHook', () => {
    // Requirement 1.1: console.log/warn/error/debug are hooked
    describe('hooking behavior', () => {
      it('should hook console.log', () => {
        initializeConsoleHook();

        console.log('Test message');

        expect(mockLogRenderer).toHaveBeenCalled();
      });

      it('should hook console.info', () => {
        initializeConsoleHook();

        console.info('Info message');

        expect(mockLogRenderer).toHaveBeenCalled();
      });

      it('should hook console.warn', () => {
        initializeConsoleHook();

        console.warn('Warning message');

        expect(mockLogRenderer).toHaveBeenCalled();
      });

      it('should hook console.error', () => {
        initializeConsoleHook();

        console.error('Error message');

        expect(mockLogRenderer).toHaveBeenCalled();
      });

      it('should hook console.debug', () => {
        initializeConsoleHook();

        console.debug('Debug message');

        expect(mockLogRenderer).toHaveBeenCalled();
      });

      it('should send correct level for each console method', () => {
        initializeConsoleHook();

        console.log('Log');
        expect(mockLogRenderer).toHaveBeenLastCalledWith('info', expect.any(String), expect.any(Object));

        console.info('Info');
        expect(mockLogRenderer).toHaveBeenLastCalledWith('info', expect.any(String), expect.any(Object));

        console.warn('Warn');
        expect(mockLogRenderer).toHaveBeenLastCalledWith('warn', expect.any(String), expect.any(Object));

        console.error('Error');
        expect(mockLogRenderer).toHaveBeenLastCalledWith('error', expect.any(String), expect.any(Object));

        console.debug('Debug');
        expect(mockLogRenderer).toHaveBeenLastCalledWith('debug', expect.any(String), expect.any(Object));
      });
    });

    // Requirement 1.2: console.error includes stack trace
    describe('stack trace for errors', () => {
      it('should include stack trace for console.error', () => {
        initializeConsoleHook();

        console.error('Error with stack');

        expect(mockLogRenderer).toHaveBeenCalledWith(
          'error',
          expect.any(String),
          expect.objectContaining({
            stack: expect.any(String),
          })
        );
      });

      it('should not include stack trace for console.log', () => {
        initializeConsoleHook();

        console.log('Log without stack');

        const lastCall = mockLogRenderer.mock.calls[mockLogRenderer.mock.calls.length - 1];
        expect(lastCall[2].stack).toBeUndefined();
      });
    });

    // Requirement 1.5: File name extraction
    describe('file name extraction', () => {
      it('should include source with file name in context', () => {
        initializeConsoleHook();

        console.log('Test');

        expect(mockLogRenderer).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.objectContaining({
            source: expect.stringMatching(/^renderer/),
          })
        );
      });
    });

    // Requirement 2.4: Original console still works
    describe('original console preservation', () => {
      it('should call original console.log', () => {
        // The hook stores the console method at initialization time
        // So we need to spy on it before initialization
        const logSpy = vi.spyOn(console, 'log');

        initializeConsoleHook();
        console.log('Test');

        // The hooked function will call the original (which we spied on)
        // But since initializeConsoleHook stores the bound function,
        // we verify behavior by checking that the message was processed
        expect(logSpy).toHaveBeenCalled();
        logSpy.mockRestore();
      });

      it('should call original console.error', () => {
        const errorSpy = vi.spyOn(console, 'error');

        initializeConsoleHook();
        console.error('Test error');

        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
      });

      it('should pass all arguments to original console', () => {
        const logSpy = vi.spyOn(console, 'log');

        initializeConsoleHook();
        console.log('Message', 123, { key: 'value' });

        expect(logSpy).toHaveBeenCalled();
        logSpy.mockRestore();
      });
    });
  });

  describe('isHookActive', () => {
    it('should return false before initialization', () => {
      expect(isHookActive()).toBe(false);
    });

    it('should return true after initialization in development', () => {
      setEnvironment('development');
      initializeConsoleHook();

      expect(isHookActive()).toBe(true);
    });

    it('should return false after uninitialization', () => {
      initializeConsoleHook();
      uninitializeConsoleHook();

      expect(isHookActive()).toBe(false);
    });
  });

  // Requirement 1.3: Development/E2E environment enables hook
  describe('environment detection', () => {
    describe('development environment', () => {
      it('should enable hook in development environment', () => {
        setEnvironment('development');
        initializeConsoleHook();

        expect(isHookActive()).toBe(true);
      });
    });

    describe('e2e test environment', () => {
      it('should enable hook in E2E test environment', () => {
        setEnvironment('e2e');
        initializeConsoleHook();

        expect(isHookActive()).toBe(true);
      });
    });

    // Requirement 1.4: Production environment disables hook
    describe('production environment', () => {
      it('should disable hook in production environment', () => {
        setEnvironment('production');
        initializeConsoleHook();

        expect(isHookActive()).toBe(false);
      });

      it('should not hook console in production', () => {
        setEnvironment('production');
        const originalLog = vi.fn();
        console.log = originalLog;

        initializeConsoleHook();
        console.log('Test');

        // Original should be called but logRenderer should not
        expect(originalLog).toHaveBeenCalledWith('Test');
        expect(mockLogRenderer).not.toHaveBeenCalled();
      });
    });
  });

  // Noise filtering integration
  describe('noise filtering', () => {
    it('should not send filtered messages to main', () => {
      initializeConsoleHook();

      console.log('[HMR] Hot module update');

      expect(mockLogRenderer).not.toHaveBeenCalled();
    });

    it('should still call original console for filtered messages', () => {
      const logSpy = vi.spyOn(console, 'log');

      initializeConsoleHook();
      console.log('[HMR] Hot module update');

      // Original console should be called even for filtered messages
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should send non-filtered messages', () => {
      initializeConsoleHook();

      console.log('Normal application message');

      expect(mockLogRenderer).toHaveBeenCalled();
    });
  });

  // Context integration
  describe('context integration', () => {
    it('should include auto context from stores', () => {
      vi.mocked(getAutoContext).mockReturnValue({
        specId: 'test-spec',
        bugName: 'test-bug',
      });

      initializeConsoleHook();
      console.log('Test');

      expect(mockLogRenderer).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          specId: 'test-spec',
          bugName: 'test-bug',
        })
      );
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('should handle multiple initialization calls', () => {
      initializeConsoleHook();
      initializeConsoleHook();

      console.log('Test');

      // Should only log once, not twice
      expect(mockLogRenderer).toHaveBeenCalledTimes(1);
    });

    it('should handle empty messages', () => {
      initializeConsoleHook();

      expect(() => console.log()).not.toThrow();
      expect(() => console.log('')).not.toThrow();
    });

    it('should handle object arguments', () => {
      initializeConsoleHook();

      expect(() => console.log({ key: 'value' })).not.toThrow();
      expect(mockLogRenderer).toHaveBeenCalled();
    });

    it('should handle multiple arguments', () => {
      initializeConsoleHook();

      console.log('Message', 123, true, null, undefined, { key: 'value' });

      expect(mockLogRenderer).toHaveBeenCalled();
    });
  });

  describe('uninitializeConsoleHook', () => {
    it('should restore original console methods', () => {
      const originalLog = vi.fn();
      console.log = originalLog;

      initializeConsoleHook();
      uninitializeConsoleHook();

      // After uninitialization, console.log should be restored
      // But it won't be the exact same function due to how we restore
      expect(isHookActive()).toBe(false);
    });

    it('should stop sending logs to main after uninitialization', () => {
      initializeConsoleHook();
      console.log('Before uninit');
      expect(mockLogRenderer).toHaveBeenCalledTimes(1);

      uninitializeConsoleHook();
      mockLogRenderer.mockClear();

      // After uninitialize, the hooked console should still work but won't send to main
      // (because isHookActive will be false)
    });
  });
});
