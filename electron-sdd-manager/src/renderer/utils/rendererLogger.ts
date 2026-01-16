/**
 * RendererLogger Module
 * renderer-unified-logging feature
 * Requirements: 3.1, 3.2, 3.3, 3.4, 7.1, 7.2, 7.3
 *
 * Console-compatible logger API for renderer process.
 * Sends logs to main process via IPC with automatic context.
 */

import { getAutoContext } from './contextProvider';

/**
 * Log level types
 */
export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

/**
 * Map console-style levels to IPC levels
 */
const levelMap: Record<LogLevel, 'error' | 'warn' | 'info' | 'debug'> = {
  log: 'info',
  info: 'info',
  warn: 'warn',
  error: 'error',
  debug: 'debug',
};

/**
 * Extract file name from stack trace
 * Requirement: 3.2 - automatic file name extraction
 *
 * @param stack - Error stack trace string
 * @returns Extracted file name or 'unknown'
 */
export function extractFileName(stack: string | undefined): string {
  if (!stack) {
    return 'unknown';
  }

  // Try to extract file name from stack trace
  // Stack trace formats:
  // - Chrome/Electron: "at functionName (http://localhost:5173/src/path/File.tsx:10:5)"
  // - Chrome/Electron: "at http://localhost:5173/src/path/File.tsx:10:5"
  // - Node: "at Object.<anonymous> (/path/to/File.tsx:10:5)"

  const lines = stack.split('\n');

  // Skip first line (Error message) and look for the caller (skip internal frames)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    // Skip internal rendererLogger frames
    if (line.includes('rendererLogger') || line.includes('extractFileName')) {
      continue;
    }

    // Try to extract file name
    // Pattern 1: (path/to/File.tsx:line:col)
    const parenMatch = line.match(/\(([^)]+\.tsx?):[\d]+:[\d]+\)/);
    if (parenMatch) {
      const filePath = parenMatch[1];
      const fileName = filePath.split('/').pop() || filePath;
      return fileName;
    }

    // Pattern 2: at URL (http://localhost:5173/src/path/File.tsx:10:5)
    const urlMatch = line.match(/at\s+(?:https?:\/\/[^/]+)?([^:]+\.tsx?):[\d]+:[\d]+/);
    if (urlMatch) {
      const filePath = urlMatch[1];
      const fileName = filePath.split('/').pop() || filePath;
      return fileName;
    }

    // Pattern 3: Simple path match
    const simpleMatch = line.match(/([^\/\s]+\.tsx?):/);
    if (simpleMatch) {
      return simpleMatch[1];
    }
  }

  return 'unknown';
}

/**
 * Format message arguments to string
 * Handles various types including objects, arrays, and circular references
 *
 * @param args - Console arguments
 * @returns Formatted message string
 */
function formatMessage(args: unknown[]): string {
  return args
    .map((arg) => {
      if (typeof arg === 'string') {
        return arg;
      }
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg);
        } catch {
          // Handle circular references
          return '[Object]';
        }
      }
      return String(arg);
    })
    .join(' ');
}

/**
 * Send log to main process
 * Requirement 7.3: Silent fallback when IPC unavailable
 *
 * @param level - Log level
 * @param message - Log message
 * @param context - Additional context
 */
function sendToMain(
  level: 'error' | 'warn' | 'info' | 'debug',
  message: string,
  context: Record<string, unknown>
): void {
  // Requirement 7.3: Guard for environments where electronAPI may not exist
  if (typeof window !== 'undefined' && window.electronAPI?.logRenderer) {
    window.electronAPI.logRenderer(level, message, context);
  }
  // Silent fallback - no error thrown
}

/**
 * Create log function for a specific level
 *
 * @param level - Log level
 * @returns Log function
 */
function createLogFunction(level: LogLevel): (...args: unknown[]) => void {
  return (...args: unknown[]): void => {
    const message = formatMessage(args);
    const autoContext = getAutoContext();

    // Requirement 3.2: Extract file name from stack trace
    const stack = new Error().stack;
    const fileName = extractFileName(stack);

    const context: Record<string, unknown> = {
      ...autoContext,
      source: `renderer:${fileName}`,
    };

    sendToMain(levelMap[level], message, context);
  };
}

/**
 * RendererLogger API
 * Requirement 3.1: console.* compatible interface
 * Requirement 3.4: Can be used as `import { rendererLogger as console }`
 */
export const rendererLogger = {
  /**
   * Log at INFO level (alias for log)
   * Requirement 3.1
   */
  log: createLogFunction('log'),

  /**
   * Log at INFO level
   * Requirement 3.1
   */
  info: createLogFunction('info'),

  /**
   * Log at WARN level
   * Requirement 3.1
   */
  warn: createLogFunction('warn'),

  /**
   * Log at ERROR level
   * Requirement 3.1
   */
  error: createLogFunction('error'),

  /**
   * Log at DEBUG level
   * Requirement 3.1
   */
  debug: createLogFunction('debug'),

  /**
   * Log with explicit context
   * Requirement 3.3: Additional context as JSON
   *
   * @param level - Log level
   * @param message - Log message
   * @param context - Additional context (optional)
   */
  logWithContext(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): void {
    const autoContext = getAutoContext();

    // Requirement 3.2: Extract file name from stack trace
    const stack = new Error().stack;
    const fileName = extractFileName(stack);

    const mergedContext: Record<string, unknown> = {
      ...autoContext,
      ...context,
      source: `renderer:${fileName}`,
    };

    sendToMain(levelMap[level], message, mergedContext);
  },
};

// Default export for easy aliasing
export default rendererLogger;
