/**
 * ConsoleHook Module
 * renderer-unified-logging feature
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.4
 *
 * Global console.* hooking for renderer process.
 * Intercepts console calls and sends them to main process via IPC.
 */

import { shouldFilter } from './noiseFilter';
import { getAutoContext } from './contextProvider';
import { extractFileName } from './rendererLogger';

/**
 * Environment type for hook activation
 */
type Environment = 'development' | 'production' | 'e2e';

/**
 * Log level types
 */
type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

/**
 * Map console methods to IPC levels
 */
const levelMap: Record<LogLevel, 'error' | 'warn' | 'info' | 'debug'> = {
  log: 'info',
  info: 'info',
  warn: 'warn',
  error: 'error',
  debug: 'debug',
};

/**
 * Store original console methods (captured at initialization time)
 */
let originalConsole: Record<LogLevel, (...args: unknown[]) => void> | null = null;

/**
 * Hook state
 */
let hookActive = false;
let currentEnvironment: Environment = 'development';

/**
 * Capture original console methods
 * Called at initialization time to ensure we capture the current console methods
 */
function captureOriginalConsole(): void {
  originalConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
  };
}

/**
 * Set the environment for hook activation
 * Used for testing - in production, environment is auto-detected
 *
 * @param env - Environment to set
 */
export function setEnvironment(env: Environment): void {
  currentEnvironment = env;
}

/**
 * Detect the current environment
 * Requirements: 1.3, 1.4
 *
 * @returns Detected environment
 */
function detectEnvironment(): Environment {
  // Use currentEnvironment if explicitly set (for testing)
  if (currentEnvironment !== 'development') {
    return currentEnvironment;
  }

  // Check NODE_ENV for production
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
    return 'production';
  }

  // Check Vite dev mode
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    return 'development';
  }

  // Check Vite PROD mode (production build)
  if (typeof import.meta !== 'undefined' && import.meta.env?.PROD) {
    return 'production';
  }

  // Default to development (includes E2E test mode which also runs in dev-like environment)
  return 'development';
}

/**
 * Check if hook should be active based on environment
 * Requirements: 1.3, 1.4
 *
 * @returns true if hook should be active
 */
function shouldHookBeActive(): boolean {
  const env = detectEnvironment();
  // Hook is active in development and E2E test environments
  // Disabled in production
  return env === 'development' || env === 'e2e';
}

/**
 * Format message arguments to string
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
  if (typeof window !== 'undefined' && window.electronAPI?.logRenderer) {
    window.electronAPI.logRenderer(level, message, context);
  }
}

/**
 * Create hooked console function
 *
 * @param method - Console method name
 * @returns Hooked function
 */
function createHookedFunction(method: LogLevel): (...args: unknown[]) => void {
  return (...args: unknown[]): void => {
    // Always call original console
    if (originalConsole) {
      originalConsole[method](...args);
    }

    // Skip if hook is not active
    if (!hookActive) {
      return;
    }

    // Get first argument for filtering
    const firstArg = args[0];

    // Check if message should be filtered
    // Requirement 2.4: Filter but still call original
    if (shouldFilter(firstArg)) {
      return;
    }

    // Format message
    const message = formatMessage(args);

    // Get auto context
    const autoContext = getAutoContext();

    // Extract file name from stack trace
    // Requirement 1.5: File name extraction
    const stack = new Error().stack;
    const fileName = extractFileName(stack);

    // Build context
    const context: Record<string, unknown> = {
      ...autoContext,
      source: `renderer:${fileName}`,
    };

    // Requirement 1.2: Add stack trace for errors
    if (method === 'error') {
      context.stack = stack;
    }

    // Send to main process
    sendToMain(levelMap[method], message, context);
  };
}

/**
 * Initialize console hook
 * Requirements: 1.1, 1.3, 1.4
 *
 * Should be called once at application startup (main.tsx)
 * No-op in production environment
 */
export function initializeConsoleHook(): void {
  // Prevent double initialization
  if (hookActive) {
    return;
  }

  // Check if hook should be active
  if (!shouldHookBeActive()) {
    return;
  }

  // Capture original console methods at initialization time
  captureOriginalConsole();

  // Hook all console methods
  console.log = createHookedFunction('log');
  console.info = createHookedFunction('info');
  console.warn = createHookedFunction('warn');
  console.error = createHookedFunction('error');
  console.debug = createHookedFunction('debug');

  hookActive = true;
}

/**
 * Check if console hook is active
 *
 * @returns true if hook is active
 */
export function isHookActive(): boolean {
  return hookActive;
}

/**
 * Uninitialize console hook (restore original console)
 * Primarily for testing purposes
 */
export function uninitializeConsoleHook(): void {
  if (!hookActive || !originalConsole) {
    // Reset state even if not fully active
    hookActive = false;
    currentEnvironment = 'development';
    originalConsole = null;
    return;
  }

  // Restore original console methods
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.debug = originalConsole.debug;

  hookActive = false;
  currentEnvironment = 'development';
  originalConsole = null;
}
