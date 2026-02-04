/**
 * ToolPathResolverService
 * Well Known path resolution service (no shell spawn)
 * well-known-tool-paths feature
 * Requirements: 1.1-1.4, 2.4, 4.1-4.4
 *
 * This service replaces the old shell-based approach with direct filesystem checks.
 * Benefits:
 * - No TTY errors, session save messages, or ANSI escape sequence pollution
 * - Fast and predictable path resolution
 * - Easy to debug and test
 */

import * as fs from 'fs';
import { projectLogger as logger } from './projectLogger';
import { getConfigStore } from './configStore';

// ============================================================
// Types - Requirements: 1.1, 2.4
// ============================================================

/**
 * Tool definition
 * Requirements: 1.4
 */
export interface ToolDefinition {
  readonly name: string;
  readonly required: boolean;
  readonly versionCommand: string;
  readonly installGuidance: string;
}

/**
 * Resolution result with source indicator
 * Requirements: 1.1, 2.4
 */
export interface ToolResolutionResult {
  readonly resolved: boolean;
  readonly path?: string;
  readonly source?: 'manual' | 'well-known' | 'not-found';
  readonly error?: string;
}

/**
 * Tool status combining definition and resolution
 */
export interface ToolStatus {
  readonly definition: ToolDefinition;
  readonly resolution: ToolResolutionResult;
}

/**
 * Filesystem dependencies for dependency injection (testing)
 */
export interface FsDeps {
  existsSync: (path: string) => boolean;
}

/**
 * ConfigStore dependencies for dependency injection (testing)
 */
export interface ConfigStoreDeps {
  getToolPath: (toolName: string) => string | null;
}

// ============================================================
// Constants - Requirements: 1.1, 1.4
// ============================================================

/**
 * Well Known paths to check in order
 * Requirements: 1.1
 */
export const WELL_KNOWN_PATHS: readonly string[] = [
  '/opt/homebrew/bin',    // Homebrew Apple Silicon
  '/usr/local/bin',       // Homebrew Intel
  `${process.env.HOME}/.local/bin`,  // npm global, pipx, etc.
  '/usr/bin',             // System
];

/**
 * Tool definitions
 * Requirements: 1.4
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
// Default dependencies
// ============================================================

const defaultFsDeps: FsDeps = {
  existsSync: (path: string) => fs.existsSync(path),
};

const defaultConfigStoreDeps: ConfigStoreDeps = {
  getToolPath: (toolName: string) => getConfigStore().getToolPath(toolName),
};

// ============================================================
// Service Implementation - Requirements: 1.1-1.4, 2.4, 4.1-4.4
// ============================================================

/**
 * ToolPathResolverService
 * Resolves and caches tool paths using Well Known paths and manual configuration
 */
export class ToolPathResolverService {
  private fsDeps: FsDeps;
  private configStoreDeps: ConfigStoreDeps;
  private resolvedCache: Map<string, ToolResolutionResult> = new Map();

  constructor(
    fsDeps: FsDeps = defaultFsDeps,
    configStoreDeps: ConfigStoreDeps = defaultConfigStoreDeps
  ) {
    this.fsDeps = fsDeps;
    this.configStoreDeps = configStoreDeps;
  }

  /**
   * Resolve all registered tools in parallel
   * Requirements: 4.1, 4.2
   */
  async resolveAll(): Promise<void> {
    logger.info('[ToolPathResolver] Resolving all tools in parallel');

    const promises = TOOL_DEFINITIONS.map((def) => this.resolveTool(def.name));
    await Promise.all(promises);

    logger.info('[ToolPathResolver] All tools resolved', {
      resolved: TOOL_DEFINITIONS.filter((d) => this.isResolved(d.name)).map((d) => d.name),
      unresolved: TOOL_DEFINITIONS.filter((d) => !this.isResolved(d.name)).map((d) => d.name),
    });
  }

  /**
   * Resolve a single tool's path
   * Requirements: 1.1, 1.2, 1.3, 2.4
   *
   * @param toolName - Name of the tool to resolve
   * @param options - Optional parameters
   * @param options.forceResolve - Skip cache and re-resolve
   * @returns Resolution result with path or error
   */
  async resolveTool(
    toolName: string,
    options?: { forceResolve?: boolean }
  ): Promise<ToolResolutionResult> {
    const { forceResolve = false } = options || {};

    // Check cache first (unless forceResolve)
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
      this.resolvedCache.delete(toolName);
      logger.info('[ToolPathResolver] Force re-resolving tool (cache cleared)', { tool: toolName });
    }

    // Check E2E mock environment variable first
    const mockEnvVar = `E2E_MOCK_${toolName.toUpperCase()}_COMMAND`;
    const mockPath = process.env[mockEnvVar];
    if (mockPath) {
      logger.info('[ToolPathResolver] Using E2E mock path', { tool: toolName, path: mockPath });
      const result: ToolResolutionResult = { resolved: true, path: mockPath, source: 'well-known' };
      this.resolvedCache.set(toolName, result);
      return result;
    }

    // Get tool definition
    const definition = this.getDefinition(toolName);
    if (!definition) {
      logger.warn('[ToolPathResolver] Unknown tool', { tool: toolName });
      const result: ToolResolutionResult = {
        resolved: false,
        source: 'not-found',
        error: `Unknown tool: ${toolName}`,
      };
      this.resolvedCache.set(toolName, result);
      return result;
    }

    // Check manual path from ConfigStore first (Requirement 2.4)
    const manualPath = this.configStoreDeps.getToolPath(toolName);
    if (manualPath) {
      logger.info('[ToolPathResolver] Checking manual path', { tool: toolName, path: manualPath });
      if (this.fsDeps.existsSync(manualPath)) {
        logger.info('[ToolPathResolver] Manual path exists', { tool: toolName, path: manualPath });
        const result: ToolResolutionResult = {
          resolved: true,
          path: manualPath,
          source: 'manual',
        };
        this.resolvedCache.set(toolName, result);
        return result;
      } else {
        logger.warn('[ToolPathResolver] Manual path does not exist', { tool: toolName, path: manualPath });
        const result: ToolResolutionResult = {
          resolved: false,
          source: 'manual',
          error: `Manual path does not exist: ${manualPath}`,
        };
        this.resolvedCache.set(toolName, result);
        return result;
      }
    }

    // Check Well Known paths in order (Requirement 1.1, 1.2, 1.3)
    logger.info('[ToolPathResolver] Checking Well Known paths', { tool: toolName });
    for (const basePath of WELL_KNOWN_PATHS) {
      const fullPath = `${basePath}/${toolName}`;
      if (this.fsDeps.existsSync(fullPath)) {
        logger.info('[ToolPathResolver] Tool found in Well Known path', {
          tool: toolName,
          path: fullPath,
        });
        const result: ToolResolutionResult = {
          resolved: true,
          path: fullPath,
          source: 'well-known',
        };
        this.resolvedCache.set(toolName, result);
        return result;
      }
    }

    // Tool not found
    logger.warn('[ToolPathResolver] Tool not found in any Well Known path', { tool: toolName });
    const result: ToolResolutionResult = {
      resolved: false,
      source: 'not-found',
      error: `${toolName} not found in Well Known paths. Consider using Settings to specify a custom path.`,
    };
    this.resolvedCache.set(toolName, result);
    return result;
  }

  /**
   * Get cached path for a tool
   * Requirements: 4.4 (backward compatibility)
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
   *
   * @param toolName - Name of the tool
   * @returns Tool definition or undefined
   */
  getDefinition(toolName: string): ToolDefinition | undefined {
    return TOOL_DEFINITIONS.find((d) => d.name === toolName);
  }

  /**
   * Get tool status (definition + resolution)
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
      source: 'not-found' as const,
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
        source: 'not-found' as const,
        error: 'Not yet resolved',
      };
      return { definition, resolution };
    });
  }

  /**
   * Check if tool was successfully resolved
   * Requirements: 4.4 (backward compatibility)
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
