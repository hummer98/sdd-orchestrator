/**
 * RendererLogger Unit Tests
 * renderer-unified-logging feature
 * Requirements: 3.1, 3.2, 3.3, 3.4, 7.3
 *
 * Tests for the console-compatible renderer logger API
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

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

// Mock contextProvider
vi.mock('./contextProvider', () => ({
  getAutoContext: vi.fn(() => ({})),
}));

// Import after mocking
import { rendererLogger, extractFileName } from './rendererLogger';
import { getAutoContext } from './contextProvider';

describe('rendererLogger', () => {
  beforeEach(() => {
    mockMutate.mockClear();
    vi.mocked(getAutoContext).mockReturnValue({});
  });

  // Requirement 3.1: console-compatible API
  describe('console-compatible API', () => {
    describe('log method', () => {
      it('should call logRenderer with info level', () => {
        rendererLogger.log('Test message');

        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            level: 'info',
            message: expect.stringContaining('Test message'),
          })
        );
      });

      it('should accept multiple arguments', () => {
        rendererLogger.log('Message', 'arg1', 123);

        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            level: 'info',
            message: expect.stringContaining('Message'),
          })
        );
      });
    });

    describe('info method', () => {
      it('should call logRenderer with info level', () => {
        rendererLogger.info('Info message');

        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            level: 'info',
            message: expect.stringContaining('Info message'),
          })
        );
      });
    });

    describe('warn method', () => {
      it('should call logRenderer with warn level', () => {
        rendererLogger.warn('Warning message');

        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            level: 'warn',
            message: expect.stringContaining('Warning message'),
          })
        );
      });
    });

    describe('error method', () => {
      it('should call logRenderer with error level', () => {
        rendererLogger.error('Error message');

        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            level: 'error',
            message: expect.stringContaining('Error message'),
          })
        );
      });
    });

    describe('debug method', () => {
      it('should call logRenderer with debug level', () => {
        rendererLogger.debug('Debug message');

        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            level: 'debug',
            message: expect.stringContaining('Debug message'),
          })
        );
      });
    });
  });

  // Requirement 3.2: automatic file name
  describe('automatic file name extraction', () => {
    it('should include source in context', () => {
      rendererLogger.log('Test');

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            source: expect.stringMatching(/^renderer/),
          }),
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

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
          message: 'Test',
          context: expect.objectContaining({
            specId: 'test-feature',
            customKey: 'value',
          }),
        })
      );
    });

    it('should include specId from getAutoContext', () => {
      vi.mocked(getAutoContext).mockReturnValue({
        specId: 'feature-auth',
      });

      rendererLogger.log('Test');

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            specId: 'feature-auth',
          }),
        })
      );
    });

    it('should include bugName from getAutoContext', () => {
      vi.mocked(getAutoContext).mockReturnValue({
        bugName: 'bug-123',
      });

      rendererLogger.log('Test');

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            bugName: 'bug-123',
          }),
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

  // Requirement 7.3: tRPC client unavailable fallback
  describe('tRPC client unavailable fallback', () => {
    it('should not throw when tRPC mutate rejects', () => {
      mockMutate.mockRejectedValueOnce(new Error('tRPC unavailable'));

      expect(() => rendererLogger.log('Test')).not.toThrow();
    });

    it('should not throw when tRPC mutate throws synchronously', () => {
      mockMutate.mockImplementationOnce(() => { throw new Error('sync error'); });

      expect(() => rendererLogger.log('Test')).not.toThrow();
    });
  });

  // logWithContext method tests
  describe('logWithContext', () => {
    it('should send log with explicit level', () => {
      rendererLogger.logWithContext('warn', 'Warning', { key: 'value' });

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'warn',
          message: 'Warning',
          context: expect.objectContaining({
            key: 'value',
          }),
        })
      );
    });

    it('should handle all log levels', () => {
      const levels = ['log', 'info', 'warn', 'error', 'debug'] as const;

      levels.forEach((level) => {
        mockMutate.mockClear();
        rendererLogger.logWithContext(level, 'Message');

        const expectedLevel = level === 'log' ? 'info' : level;
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            level: expectedLevel,
            message: 'Message',
          })
        );
      });
    });
  });

  // Message formatting tests
  describe('message formatting', () => {
    it('should stringify object arguments', () => {
      rendererLogger.log('Data:', { key: 'value' });

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('{"key":"value"}'),
        })
      );
    });

    it('should handle array arguments', () => {
      rendererLogger.log('Array:', [1, 2, 3]);

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('[1,2,3]'),
        })
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
