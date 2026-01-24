/**
 * MCP Tool Registry
 * Manages tool registration, validation, and execution for MCP protocol
 * Requirements: 1.4 - Project not selected error handling
 *
 * @file mcpToolRegistry.ts
 */

import { z } from 'zod';
import { logger } from '../logger';

// =============================================================================
// Types
// =============================================================================

/**
 * MCP tool content (text response)
 */
export interface McpToolContent {
  readonly type: 'text';
  readonly text: string;
}

/**
 * MCP tool error
 */
export interface McpToolError {
  readonly code: string;
  readonly message: string;
}

/**
 * MCP tool execution result
 */
export type McpToolResult =
  | { ok: true; content: McpToolContent[] }
  | { ok: false; error: McpToolError };

/**
 * Tool handler function type
 * @param args - Validated tool arguments
 * @param projectPath - Project path if tool requires project (optional)
 * @returns Tool execution result
 */
export type ToolHandler = (
  args: unknown,
  projectPath?: string
) => Promise<McpToolResult>;

/**
 * Tool definition for registration
 */
export interface ToolRegistration {
  /** Tool name (e.g., 'project_get_info') */
  readonly name: string;
  /** Tool description for MCP clients */
  readonly description: string;
  /** Zod schema for input validation */
  readonly inputSchema: z.ZodType;
  /** Handler function */
  readonly handler: ToolHandler;
  /** Whether tool requires a project to be selected (default: true) */
  readonly requiresProject?: boolean;
}

/**
 * Tool definition exposed to MCP clients (without handler)
 */
export interface McpToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: z.ZodType;
}

// =============================================================================
// Error codes
// =============================================================================

/**
 * Error codes for MCP tool operations
 */
export const McpToolErrorCodes = {
  TOOL_NOT_FOUND: 'TOOL_NOT_FOUND',
  INVALID_ARGUMENT: 'INVALID_ARGUMENT',
  NO_PROJECT_SELECTED: 'NO_PROJECT_SELECTED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type McpToolErrorCode = typeof McpToolErrorCodes[keyof typeof McpToolErrorCodes];

// =============================================================================
// Internal types
// =============================================================================

interface RegisteredTool extends ToolRegistration {
  requiresProject: boolean;
}

// =============================================================================
// McpToolRegistry
// =============================================================================

/**
 * MCP Tool Registry
 *
 * Manages MCP tool registration, validation, and execution.
 * Provides common error handling for project not selected scenarios.
 *
 * @example
 * const registry = new McpToolRegistry();
 *
 * registry.registerTool({
 *   name: 'project_get_info',
 *   description: 'Get project information',
 *   inputSchema: z.object({}),
 *   handler: async (args, projectPath) => {
 *     return { ok: true, content: [{ type: 'text', text: 'info' }] };
 *   },
 *   requiresProject: true,
 * });
 *
 * registry.setProjectPath('/path/to/project');
 * const result = await registry.executeTool('project_get_info', {});
 */
export class McpToolRegistry {
  /** Registered tools map */
  private tools: Map<string, RegisteredTool> = new Map();

  /** Current project path */
  private projectPath: string | null = null;

  /**
   * Register a tool
   *
   * @param registration - Tool registration details
   */
  registerTool(registration: ToolRegistration): void {
    const tool: RegisteredTool = {
      ...registration,
      requiresProject: registration.requiresProject ?? true,
    };

    this.tools.set(registration.name, tool);
    logger.debug(`[McpToolRegistry] Registered tool: ${registration.name}`);
  }

  /**
   * Get all registered tool definitions
   * Returns definitions without handlers (for MCP clients)
   *
   * @returns Array of tool definitions
   */
  getTools(): McpToolDefinition[] {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  /**
   * Execute a tool by name
   *
   * @param name - Tool name
   * @param args - Tool arguments
   * @returns Execution result
   */
  async executeTool(name: string, args: unknown): Promise<McpToolResult> {
    // Find tool
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        ok: false,
        error: {
          code: McpToolErrorCodes.TOOL_NOT_FOUND,
          message: `Tool not found: ${name}`,
        },
      };
    }

    // Check project requirement
    if (tool.requiresProject && !this.projectPath) {
      return {
        ok: false,
        error: {
          code: McpToolErrorCodes.NO_PROJECT_SELECTED,
          message: 'No project selected. Please select a project in SDD Orchestrator first.',
        },
      };
    }

    // Validate arguments
    const validationResult = tool.inputSchema.safeParse(args);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');

      return {
        ok: false,
        error: {
          code: McpToolErrorCodes.INVALID_ARGUMENT,
          message: `Invalid arguments: ${errorMessage}`,
        },
      };
    }

    // Execute handler
    try {
      const validatedArgs = validationResult.data;
      const result = await tool.handler(
        validatedArgs,
        tool.requiresProject ? this.projectPath! : undefined
      );
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[McpToolRegistry] Tool execution failed: ${name}`, error);

      return {
        ok: false,
        error: {
          code: McpToolErrorCodes.INTERNAL_ERROR,
          message: `Tool execution failed: ${errorMessage}`,
        },
      };
    }
  }

  /**
   * Set the current project path
   *
   * @param path - Project path or null to clear
   */
  setProjectPath(path: string | null): void {
    this.projectPath = path;
    logger.debug(`[McpToolRegistry] Project path set to: ${path ?? 'null'}`);
  }

  /**
   * Get the current project path
   *
   * @returns Current project path or null
   */
  getProjectPath(): string | null {
    return this.projectPath;
  }

  /**
   * Check if a tool exists
   *
   * @param name - Tool name
   * @returns True if tool is registered
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get the number of registered tools
   *
   * @returns Number of registered tools
   */
  getToolCount(): number {
    return this.tools.size;
  }

  /**
   * Clear all registered tools
   * Useful for testing or re-initialization
   */
  clearTools(): void {
    this.tools.clear();
    logger.debug('[McpToolRegistry] All tools cleared');
  }
}
