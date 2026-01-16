/**
 * RendererLogger Unit Tests
 * renderer-unified-logging feature
 * Requirements: 3.1, 3.2, 3.3, 3.4, 7.3
 *
 * Tests for the console-compatible renderer logger API
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock electronAPI
const mockLogRenderer = vi.fn();
vi.stubGlobal('window', {
  electronAPI: {
    logRenderer: mockLogRenderer,
  },
});

// Mock contextProvider
vi.mock('./contextProvider', () => ({
  getAutoContext: vi.fn(() => ({})),
}));

// Import after mocking
import { rendererLogger, extractFileName } from './rendererLogger';
import { getAutoContext } from './contextProvider';

describe('rendererLogger', () => {
  beforeEach(() => {
    mockLogRenderer.mockClear();
    vi.mocked(getAutoContext).mockReturnValue({});
  });

  // Requirement 3.1: console-compatible API
  describe('console-compatible API', () => {
    describe('log method', () => {
      it('should call logRenderer with info level', () => {
        rendererLogger.log('Test message');

        expect(mockLogRenderer).toHaveBeenCalledWith(
          'info',
          expect.stringContaining('Test message'),
          expect.any(Object)
        );
      });

      it('should accept multiple arguments', () => {
        rendererLogger.log('Message', 'arg1', 123);

        expect(mockLogRenderer).toHaveBeenCalledWith(
          'info',
          expect.stringContaining('Message'),
          expect.any(Object)
        );
      });
    });

    describe('info method', () => {
      it('should call logRenderer with info level', () => {
        rendererLogger.info('Info message');

        expect(mockLogRenderer).toHaveBeenCalledWith(
          'info',
          expect.stringContaining('Info message'),
          expect.any(Object)
        );
      });
    });

    describe('warn method', () => {
      it('should call logRenderer with warn level', () => {
        rendererLogger.warn('Warning message');

        expect(mockLogRenderer).toHaveBeenCalledWith(
          'warn',
          expect.stringContaining('Warning message'),
          expect.any(Object)
        );
      });
    });

    describe('error method', () => {
      it('should call logRenderer with error level', () => {
        rendererLogger.error('Error message');

        expect(mockLogRenderer).toHaveBeenCalledWith(
          'error',
          expect.stringContaining('Error message'),
          expect.any(Object)
        );
      });
    });

    describe('debug method', () => {
      it('should call logRenderer with debug level', () => {
        rendererLogger.debug('Debug message');

        expect(mockLogRenderer).toHaveBeenCalledWith(
          'debug',
          expect.stringContaining('Debug message'),
          expect.any(Object)
        );
      });
    });
  });

  // Requirement 3.2: automatic file name
  describe('automatic file name extraction', () => {
    it('should include source in context', () => {
      rendererLogger.log('Test');

      expect(mockLogRenderer).toHaveBeenCalledWith(
        'info',
        expect.any(String),
        expect.objectContaining({
          source: expect.stringMatching(/^renderer/),
        })
      );
    });
  });

  // Requirement 3.3: additional context as JSON
  describe('additional context handling', () => {
    it('should merge auto context with explicit context', () => {
      vi.mocked(getAutoContext).mockReturnValue({
        specId: 'test-feature',
      });

      rendererLogger.logWithContext('info', 'Test', { customKey: 'value' });

      expect(mockLogRenderer).toHaveBeenCalledWith(
        'info',
        'Test',
        expect.objectContaining({
          specId: 'test-feature',
          customKey: 'value',
        })
      );
    });

    it('should include specId from getAutoContext', () => {
      vi.mocked(getAutoContext).mockReturnValue({
        specId: 'feature-auth',
      });

      rendererLogger.log('Test');

      expect(mockLogRenderer).toHaveBeenCalledWith(
        'info',
        expect.any(String),
        expect.objectContaining({
          specId: 'feature-auth',
        })
      );
    });

    it('should include bugName from getAutoContext', () => {
      vi.mocked(getAutoContext).mockReturnValue({
        bugName: 'bug-123',
      });

      rendererLogger.log('Test');

      expect(mockLogRenderer).toHaveBeenCalledWith(
        'info',
        expect.any(String),
        expect.objectContaining({
          bugName: 'bug-123',
        })
      );
    });
  });

  // Requirement 3.4: import as console
  describe('alias usage', () => {
    it('should work when imported as console alias', () => {
      // This test verifies the API is compatible with console.*
      // The actual import alias is tested by usage: import { rendererLogger as console }
      const logger = rendererLogger;

      expect(typeof logger.log).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });
  });

  // Requirement 7.3: IPC unavailable fallback
  describe('IPC unavailable fallback', () => {
    it('should not throw when electronAPI is undefined', () => {
      const originalWindow = global.window;
      vi.stubGlobal('window', {});

      expect(() => rendererLogger.log('Test')).not.toThrow();

      vi.stubGlobal('window', originalWindow);
    });

    it('should not throw when logRenderer is undefined', () => {
      const originalWindow = global.window;
      vi.stubGlobal('window', {
        electronAPI: {},
      });

      expect(() => rendererLogger.log('Test')).not.toThrow();

      vi.stubGlobal('window', originalWindow);
    });

    it('should not throw when window is undefined', () => {
      const originalWindow = global.window;
      // @ts-expect-error Testing undefined window
      global.window = undefined;

      expect(() => rendererLogger.log('Test')).not.toThrow();

      global.window = originalWindow;
    });
  });

  // logWithContext method tests
  describe('logWithContext', () => {
    it('should send log with explicit level', () => {
      rendererLogger.logWithContext('warn', 'Warning', { key: 'value' });

      expect(mockLogRenderer).toHaveBeenCalledWith(
        'warn',
        'Warning',
        expect.objectContaining({
          key: 'value',
        })
      );
    });

    it('should handle all log levels', () => {
      const levels = ['log', 'info', 'warn', 'error', 'debug'] as const;

      levels.forEach((level) => {
        mockLogRenderer.mockClear();
        rendererLogger.logWithContext(level, 'Message');

        const expectedLevel = level === 'log' ? 'info' : level;
        expect(mockLogRenderer).toHaveBeenCalledWith(
          expectedLevel,
          'Message',
          expect.any(Object)
        );
      });
    });
  });

  // Message formatting tests
  describe('message formatting', () => {
    it('should stringify object arguments', () => {
      rendererLogger.log('Data:', { key: 'value' });

      expect(mockLogRenderer).toHaveBeenCalledWith(
        'info',
        expect.stringContaining('{"key":"value"}'),
        expect.any(Object)
      );
    });

    it('should handle array arguments', () => {
      rendererLogger.log('Array:', [1, 2, 3]);

      expect(mockLogRenderer).toHaveBeenCalledWith(
        'info',
        expect.stringContaining('[1,2,3]'),
        expect.any(Object)
      );
    });

    it('should handle circular reference gracefully', () => {
      const circular: { self?: unknown } = {};
      circular.self = circular;

      expect(() => rendererLogger.log('Circular:', circular)).not.toThrow();
    });
  });
});

describe('extractFileName', () => {
  it('should extract file name from typical stack trace', () => {
    // This tests the internal function directly
    const mockStack = `Error
    at Object.<anonymous> (/path/to/TestComponent.tsx:10:5)
    at Module._compile (node:internal/modules/cjs/loader:1376:14)`;

    const result = extractFileName(mockStack);

    // Should extract TestComponent.tsx or similar
    expect(result).toMatch(/\.tsx?$/);
  });

  it('should return "unknown" for empty stack', () => {
    const result = extractFileName('');
    expect(result).toBe('unknown');
  });

  it('should return "unknown" for undefined stack', () => {
    const result = extractFileName(undefined);
    expect(result).toBe('unknown');
  });

  it('should extract file name from webpack-style path', () => {
    const mockStack = `Error
    at http://localhost:5173/src/components/MyComponent.tsx:25:10`;

    const result = extractFileName(mockStack);

    expect(result).toContain('MyComponent');
  });
});
