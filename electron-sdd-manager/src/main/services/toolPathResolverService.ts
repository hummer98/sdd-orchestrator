/**
 * ToolPathResolverService
 * Unified service for resolving external tool paths using user's login shell
 * Requirements: 1.1-1.3, 2.1-2.4, 3.1-3.3, 4.1-4.3, 5.1-5.3, 6.1-6.2, 8.1-8.2
 *
 * This service replaces ClaudePathResolverService and ProjectChecker.checkJjAvailability/checkJqAvailability
 * with a unified approach that uses login shell for all tools, ensuring tools installed via Homebrew
 * are correctly detected when the app is launched from GUI.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { projectLogger as logger } from './projectLogger';

const execPromise = promisify(exec);

// ============================================================
// Types - Requirements: 6.1, 6.2
// ============================================================

/**
 * Tool definition - Requirements: 5.1, 5.2
 */
export interface ToolDefinition {
  readonly name: string;
  readonly required: boolean;
  readonly versionCommand: string;
  readonly installGuidance: string;
}

/**
 * Resolution result - Requirement 6.1
 */
export interface ToolResolutionResult {
  readonly resolved: boolean;
  readonly path?: string;
  readonly version?: string;
  readonly error?: string;
}

/**
 * Tool status combining definition and resolution - Requirement 6.2
 */
export interface ToolStatus {
  readonly definition: ToolDefinition;
  readonly resolution: ToolResolutionResult;
}

/**
 * Exec dependencies for dependency injection (testing)
 */
export interface ExecDeps {
  execAsync: (
    command: string,
    options?: { timeout?: number; env?: NodeJS.ProcessEnv }
  ) => Promise<{ stdout: string; stderr: string }>;
}

// ============================================================
// Constants - Requirements: 1.2, 5.1, 5.2, 5.3
// ============================================================

/**
 * Get shell execution environment with macOS session save disabled.
 * SHELL_SESSIONS_DISABLE=1 prevents zsh from outputting "Saving session..."
 * when running with -i flag. See: https://github.com/sindresorhus/pure/issues/664
 */
const getShellExecEnv = (): NodeJS.ProcessEnv => ({
  ...process.env,
  SHELL_SESSIONS_DISABLE: '1',
});

/**
 * Tool definitions - Requirements: 1.2, 5.1, 5.2, 5.3
 * Adding a new tool only requires adding an entry here.
 */
export const TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  {
    name: 'claude',
    required: true,
    versionCommand: '--version',
    installGuidance: 'Claude Codeをインストールしてください: https://claude.ai/code',
  },
  {
    name: 'jj',
    required: false,
    versionCommand: '--version',
    installGuidance: 'brew install jj',
  },
  {
    name: 'jq',
    required: false,
    versionCommand: '--version',
    installGuidance: 'brew install jq (macOS) / apt install jq (Ubuntu/Debian)',
  },
] as const;

// ============================================================
// Default exec dependencies
// ============================================================

const defaultExecDeps: ExecDeps = {
  execAsync: async (command, options) => {
    const result = await execPromise(command, options);
    return {
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
    };
  },
};

// ============================================================
// Service Implementation - Requirements: 1.1, 2.1-2.4, 3.1-3.3, 4.1-4.3
// ============================================================

/**
 * ToolPathResolverService
 * Resolves and caches tool paths for all registered tools
 */
export class ToolPathResolverService {
  private execDeps: ExecDeps;
  private resolvedCache: Map<string, ToolResolutionResult> = new Map();

  /** Timeout for shell command execution (5 seconds) - Requirement 2.4 */
  private static readonly TIMEOUT_MS = 5000;

  constructor(execDeps: ExecDeps = defaultExecDeps) {
    this.execDeps = execDeps;
  }

  /**
   * Resolve all registered tools in parallel
   * Requirements: 4.1, 4.2, 4.3
   *
   * @returns Promise that resolves when all tools are resolved
   */
  async resolveAll(): Promise<void> {
    logger.info('[ToolPathResolver] Resolving all tools in parallel');

    // Requirement 4.2: Parallel resolution using Promise.all
    const promises = TOOL_DEFINITIONS.map((def) => this.resolveTool(def.name));
    await Promise.all(promises);

    logger.info('[ToolPathResolver] All tools resolved', {
      resolved: TOOL_DEFINITIONS.filter((d) => this.isResolved(d.name)).map((d) => d.name),
      unresolved: TOOL_DEFINITIONS.filter((d) => !this.isResolved(d.name)).map((d) => d.name),
    });
  }

  /**
   * Resolve a single tool's path using login shell
   * Requirements: 2.1, 2.2, 2.3, 2.4, 8.1, 8.2
   *
   * @param toolName - Name of the tool to resolve
   * @param options - Optional parameters
   * @param options.forceResolve - Skip cache and re-resolve (used after tool installation)
   * @returns Resolution result with path or error
   */
  async resolveTool(
    toolName: string,
    options?: { forceResolve?: boolean }
  ): Promise<ToolResolutionResult> {
    const { forceResolve = false } = options || {};

    // Check cache first - Requirement 3.1, 3.3
    // Skip cache if forceResolve is true (used after installing a tool)
    if (!forceResolve) {
      const cached = this.resolvedCache.get(toolName);
      if (cached) {
        logger.debug('[ToolPathResolver] Returning cached result', {
          tool: toolName,
          resolved: cached.resolved,
          path: cached.path,
        });
        return cached;
      }
    } else {
      // Clear existing cache entry for this tool when forcing re-resolution
      this.resolvedCache.delete(toolName);
      logger.info('[ToolPathResolver] Force re-resolving tool (cache cleared)', { tool: toolName });
    }

    // Check E2E mock environment variable - Requirement 8.1, 8.2
    const mockEnvVar = `E2E_MOCK_${toolName.toUpperCase()}_COMMAND`;
    const mockPath = process.env[mockEnvVar];
    if (mockPath) {
      logger.info('[ToolPathResolver] Using E2E mock path', { tool: toolName, path: mockPath });
      const result: ToolResolutionResult = { resolved: true, path: mockPath };
      this.resolvedCache.set(toolName, result);
      return result;
    }

    // Get tool definition
    const definition = this.getDefinition(toolName);
    if (!definition) {
      logger.warn('[ToolPathResolver] Unknown tool', { tool: toolName });
      const result: ToolResolutionResult = {
        resolved: false,
        error: `Unknown tool: ${toolName}`,
      };
      this.resolvedCache.set(toolName, result);
      return result;
    }

    // Resolve using login shell
    // Requirement 2.2, 2.3: Use $SHELL with -il flags, fallback to /bin/sh
    const shell = process.env.SHELL || '/bin/sh';
    const whichCommand = `${shell} -il -c 'which ${toolName}'`;

    logger.info('[ToolPathResolver] Resolving tool path', { tool: toolName, shell, command: whichCommand });

    try {
      // Requirement 2.1: Execute which within login shell
      const { stdout, stderr } = await this.execDeps.execAsync(whichCommand, {
        timeout: ToolPathResolverService.TIMEOUT_MS, // Requirement 2.4
        env: getShellExecEnv(),
      });

      const resolvedPath = stdout.trim();

      if (!resolvedPath) {
        logger.warn('[ToolPathResolver] which returned empty output', { tool: toolName, stderr });
        const result: ToolResolutionResult = {
          resolved: false,
          error: `${toolName} command not found (empty which output)`,
        };
        this.resolvedCache.set(toolName, result);
        return result;
      }

      // Try to get version
      let version: string | undefined;
      try {
        const versionCommand = `${shell} -il -c '${resolvedPath} ${definition.versionCommand}'`;
        const versionResult = await this.execDeps.execAsync(versionCommand, {
          timeout: ToolPathResolverService.TIMEOUT_MS,
          env: getShellExecEnv(),
        });
        version = versionResult.stdout.trim();
      } catch (versionError) {
        logger.debug('[ToolPathResolver] Failed to get version', { tool: toolName, error: versionError });
        // Version retrieval failure is not fatal
      }

      const result: ToolResolutionResult = { resolved: true, path: resolvedPath, version };
      this.resolvedCache.set(toolName, result);

      logger.info('[ToolPathResolver] Tool resolved successfully', {
        tool: toolName,
        path: resolvedPath,
        version,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn('[ToolPathResolver] Failed to resolve tool', { tool: toolName, error: errorMessage });

      const result: ToolResolutionResult = {
        resolved: false,
        error: `${toolName} command not found: ${errorMessage}`,
      };
      this.resolvedCache.set(toolName, result);
      return result;
    }
  }

  /**
   * Get cached path for a tool
   * Requirements: 3.2, 8.1, 8.2
   *
   * @param toolName - Name of the tool
   * @returns Full path to tool command, or tool name if not resolved
   */
  getPath(toolName: string): string {
    // E2E testing support: environment variable takes precedence
    const mockEnvVar = `E2E_MOCK_${toolName.toUpperCase()}_COMMAND`;
    const mockPath = process.env[mockEnvVar];
    if (mockPath) {
      return mockPath;
    }

    // Return cached path if resolved, otherwise return tool name
    const cached = this.resolvedCache.get(toolName);
    return cached?.path || toolName;
  }

  /**
   * Get tool definition by name
   * Requirement 6.2
   *
   * @param toolName - Name of the tool
   * @returns Tool definition or undefined
   */
  getDefinition(toolName: string): ToolDefinition | undefined {
    return TOOL_DEFINITIONS.find((d) => d.name === toolName);
  }

  /**
   * Get tool status (definition + resolution)
   * Requirement 6.2
   *
   * @param toolName - Name of the tool
   * @returns Tool status or undefined for unknown tool
   */
  getStatus(toolName: string): ToolStatus | undefined {
    const definition = this.getDefinition(toolName);
    if (!definition) {
      return undefined;
    }

    const resolution = this.resolvedCache.get(toolName) || {
      resolved: false,
      error: 'Not yet resolved',
    };

    return { definition, resolution };
  }

  /**
   * Get all tool statuses
   *
   * @returns Array of all tool statuses
   */
  getAllStatuses(): ToolStatus[] {
    return TOOL_DEFINITIONS.map((definition) => {
      const resolution = this.resolvedCache.get(definition.name) || {
        resolved: false,
        error: 'Not yet resolved',
      };
      return { definition, resolution };
    });
  }

  /**
   * Check if tool was successfully resolved
   *
   * @param toolName - Name of the tool
   * @returns True if tool was successfully resolved
   */
  isResolved(toolName: string): boolean {
    const cached = this.resolvedCache.get(toolName);
    return cached?.resolved ?? false;
  }
}

// ============================================================
// Singleton Instance Management
// ============================================================

let instance: ToolPathResolverService | null = null;

/**
 * Get the singleton ToolPathResolverService instance
 */
export function getToolPathResolverService(): ToolPathResolverService {
  if (!instance) {
    instance = new ToolPathResolverService();
  }
  return instance;
}

/**
 * Reset the singleton instance (for testing only)
 */
export function resetToolPathResolverService(): void {
  instance = null;
}
