/**
 * ClaudePathResolverService
 * Resolves the full path of the `claude` command using the user's login shell
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.4
 *
 * GUIアプリ起動時はシェルプロファイルが読み込まれないため、
 * ユーザーのログインシェル経由で`which claude`を実行してパスを解決する。
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { projectLogger as logger } from './projectLogger';

const execPromise = promisify(exec);

/**
 * Exec dependencies for dependency injection (testing)
 */
export interface ExecDeps {
  execAsync: (
    command: string,
    options?: { timeout?: number }
  ) => Promise<{ stdout: string; stderr: string }>;
}

/**
 * Default exec dependencies using child_process
 */
const defaultExecDeps: ExecDeps = {
  execAsync: async (command, options) => {
    const result = await execPromise(command, options);
    return {
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
    };
  },
};

/**
 * Path resolution result
 * Requirement 2.1: Return resolved state and path or error
 */
export interface ClaudePathResolutionResult {
  /** True if path was successfully resolved */
  readonly resolved: boolean;
  /** Resolved full path (undefined if resolution failed) */
  readonly path?: string;
  /** Error message if resolution failed */
  readonly error?: string;
}

/**
 * ClaudePathResolverService
 * Resolves and caches the claude command path
 */
export class ClaudePathResolverService {
  private execDeps: ExecDeps;
  private cachedPath: string | null = null;
  private initialized: boolean = false;
  private resolutionSucceeded: boolean = false;

  /** Timeout for shell command execution (5 seconds) */
  private static readonly TIMEOUT_MS = 5000;

  constructor(execDeps: ExecDeps = defaultExecDeps) {
    this.execDeps = execDeps;
  }

  /**
   * Resolve the claude command path using the user's login shell
   * Requirement 1.1: Execute `which claude` within login shell
   * Requirement 1.2: Use $SHELL with -l flag, fallback to /bin/sh
   * Requirement 1.3: Cache result for session duration
   * Requirement 2.4: No automatic fallback on failure
   *
   * @returns Resolution result with path or error
   */
  async resolveClaudePath(): Promise<ClaudePathResolutionResult> {
    // Return cached result if already resolved
    if (this.initialized) {
      logger.debug('[ClaudePathResolver] Returning cached result', {
        resolved: this.resolutionSucceeded,
        path: this.cachedPath,
      });
      return this.resolutionSucceeded
        ? { resolved: true, path: this.cachedPath! }
        : { resolved: false, error: 'claude command not found (cached)' };
    }

    // Mark as initialized
    this.initialized = true;

    // Get user's shell (Requirement 1.2)
    // Use -il flags to load both login (.zprofile) and interactive (.zshrc) configs
    // This ensures PATH modifications in .zshrc (e.g., ~/.local/bin) are included
    const shell = process.env.SHELL || '/bin/sh';
    const command = `${shell} -il -c 'which claude'`;

    logger.info('[ClaudePathResolver] Resolving claude path', { shell, command });

    try {
      const { stdout, stderr } = await this.execDeps.execAsync(command, {
        timeout: ClaudePathResolverService.TIMEOUT_MS,
      });

      const resolvedPath = stdout.trim();

      if (!resolvedPath) {
        logger.warn('[ClaudePathResolver] which returned empty output', { stderr });
        this.resolutionSucceeded = false;
        return {
          resolved: false,
          error: 'claude command not found (empty which output)',
        };
      }

      // Cache the resolved path (Requirement 1.3)
      this.cachedPath = resolvedPath;
      this.resolutionSucceeded = true;

      logger.info('[ClaudePathResolver] Path resolved successfully', { path: resolvedPath });
      return { resolved: true, path: resolvedPath };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn('[ClaudePathResolver] Failed to resolve path', { error: errorMessage });

      this.resolutionSucceeded = false;
      return {
        resolved: false,
        error: `claude command not found: ${errorMessage}`,
      };
    }
  }

  /**
   * Get the cached claude command path
   * Requirement 1.3: Return cached path
   * E2E Support: Return E2E_MOCK_CLAUDE_COMMAND if set
   *
   * @returns Full path to claude command, or 'claude' if not resolved
   */
  getClaudePath(): string {
    // E2E testing support: environment variable takes precedence
    const mockCommand = process.env.E2E_MOCK_CLAUDE_COMMAND;
    if (mockCommand) {
      return mockCommand;
    }

    // Return cached path if resolved, otherwise return 'claude'
    return this.cachedPath || 'claude';
  }

  /**
   * Check if path resolution was successful
   *
   * @returns True if path was successfully resolved
   */
  isResolved(): boolean {
    return this.resolutionSucceeded;
  }
}

// Singleton instance
let instance: ClaudePathResolverService | null = null;

/**
 * Get the singleton ClaudePathResolverService instance
 */
export function getClaudePathResolverService(): ClaudePathResolverService {
  if (!instance) {
    instance = new ClaudePathResolverService();
  }
  return instance;
}

/**
 * Reset the singleton instance (for testing only)
 */
export function resetClaudePathResolverService(): void {
  instance = null;
}
