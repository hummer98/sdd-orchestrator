/**
 * Project Tool Handlers
 * Implements project_* scope MCP tools
 * Requirements: 2.1 - project_get_info
 * Requirements: 2.2, 2.3, 2.4, 2.5 - project_list_specs, project_list_bugs
 * Requirements: 2.6 - project_list_agents
 *
 * @file projectToolHandlers.ts
 */

import { access } from 'fs/promises';
import { join, basename } from 'path';
import { z } from 'zod';
import type { ToolRegistration, McpToolResult, ToolHandler } from './mcpToolRegistry';
import type { SpecManagerService } from '../specManagerService';
import type { AgentInfo as AgentRecordInfo } from '../agentRecordService';
import type { FileService } from '../fileService';
import type { BugService } from '../bugService';
import type { SpecPhase } from '../../../renderer/types';
import type { BugPhase } from '../../../renderer/types/bug';

// =============================================================================
// Types
// =============================================================================

/**
 * Project information returned by project_get_info
 * Requirements: 2.1
 */
export interface ProjectInfo {
  /** Absolute path to the project directory */
  readonly path: string;
  /** Project name (derived from directory name) */
  readonly name: string;
  /** Whether .kiro directory exists */
  readonly hasKiroDir: boolean;
  /** Whether .kiro/steering directory exists */
  readonly hasSteeringDir: boolean;
  /** Whether .kiro/specs directory exists */
  readonly hasSpecsDir: boolean;
  /** Whether .kiro/bugs directory exists */
  readonly hasBugsDir: boolean;
}

/**
 * Agent information for MCP tool responses
 * Requirements: 2.6 - project_list_agents
 * Maps from AgentRecordInfo to MCP-compatible format
 */
export interface McpAgentInfo {
  /** Agent ID */
  readonly agentId: string;
  /** Spec ID (or empty string for project-level agents) */
  readonly specId: string;
  /** Current phase */
  readonly phase: string;
  /** Process ID */
  readonly pid: number;
  /** Session ID */
  readonly sessionId: string;
  /** Agent status */
  readonly status: string;
  /** Start timestamp */
  readonly startedAt: string;
  /** Last activity timestamp */
  readonly lastActivityAt: string;
  /** Command used to start the agent */
  readonly command?: string;
  /** Working directory */
  readonly cwd?: string;
}

/**
 * Result of listAgents operation
 * Requirements: 2.6 - project_list_agents
 */
export interface AgentListResult {
  /** List of agents */
  readonly agents: McpAgentInfo[];
  /** Total count of agents */
  readonly total: number;
}

/**
 * Spec information for MCP tool responses
 * Requirements: 2.2, 2.3 - project_list_specs
 */
export interface McpSpecInfo {
  /** Spec name */
  readonly name: string;
  /** Current phase */
  readonly phase: SpecPhase;
  /** Whether the spec has a worktree */
  readonly hasWorktree: boolean;
  /** Last updated timestamp */
  readonly updatedAt: string;
}

/**
 * Filter options for listSpecs
 * Requirements: 2.3 - filter parameter
 */
export interface SpecListFilter {
  /** Filter by phase */
  readonly phase?: SpecPhase;
  /** Filter by worktree existence */
  readonly hasWorktree?: boolean;
}

/**
 * Result of listSpecs operation
 * Requirements: 2.2 - project_list_specs
 */
export interface SpecListResult {
  /** List of specs */
  readonly specs: McpSpecInfo[];
  /** Total count of specs */
  readonly total: number;
}

/**
 * Bug information for MCP tool responses
 * Requirements: 2.4, 2.5 - project_list_bugs
 */
export interface McpBugInfo {
  /** Bug name */
  readonly name: string;
  /** Current phase */
  readonly phase: BugPhase;
  /** Last updated timestamp */
  readonly updatedAt: string;
}

/**
 * Filter options for listBugs
 * Requirements: 2.5 - filter parameter
 */
export interface BugListFilter {
  /** Filter by phase */
  readonly phase?: BugPhase;
}

/**
 * Result of listBugs operation
 * Requirements: 2.4 - project_list_bugs
 */
export interface BugListResult {
  /** List of bugs */
  readonly bugs: McpBugInfo[];
  /** Total count of bugs */
  readonly total: number;
}

// =============================================================================
// Input Schemas
// =============================================================================

/**
 * Input schema for project_get_info tool
 * No parameters required - uses the current project path
 */
const projectGetInfoSchema = z.object({});

/**
 * Input schema for project_list_agents tool
 * No parameters required - returns all agents
 * Requirements: 2.6
 */
const projectListAgentsSchema = z.object({});

/**
 * Input schema for project_list_specs tool
 * Optional filter parameter
 * Requirements: 2.2, 2.3
 */
const projectListSpecsSchema = z.object({
  filter: z
    .object({
      phase: z.string().optional(),
      hasWorktree: z.boolean().optional(),
    })
    .optional(),
});

/**
 * Input schema for project_list_bugs tool
 * Optional filter parameter
 * Requirements: 2.4, 2.5
 */
const projectListBugsSchema = z.object({
  filter: z
    .object({
      phase: z.string().optional(),
    })
    .optional(),
});

// =============================================================================
// ProjectToolHandlers
// =============================================================================

/**
 * Handles project_* scope MCP tools
 *
 * @example
 * const handlers = new ProjectToolHandlers();
 * const info = await handlers.getInfo('/path/to/project');
 * console.log(info.name); // 'project'
 */
export class ProjectToolHandlers {
  /** SpecManagerService instance for agent operations */
  private specManagerService: SpecManagerService | null = null;
  /** FileService instance for spec operations */
  private fileService: FileService | null = null;
  /** BugService instance for bug operations */
  private bugService: BugService | null = null;

  /**
   * Get project information
   * Requirements: 2.1 - project_get_info
   *
   * @param projectPath - Absolute path to the project
   * @returns Project information including directory existence
   */
  async getInfo(projectPath: string): Promise<ProjectInfo> {
    const name = basename(projectPath);

    // Check directory existence
    const [hasKiroDir, hasSteeringDir, hasSpecsDir, hasBugsDir] = await Promise.all([
      this.checkDirectoryExists(join(projectPath, '.kiro')),
      this.checkDirectoryExists(join(projectPath, '.kiro', 'steering')),
      this.checkDirectoryExists(join(projectPath, '.kiro', 'specs')),
      this.checkDirectoryExists(join(projectPath, '.kiro', 'bugs')),
    ]);

    return {
      path: projectPath,
      name,
      hasKiroDir,
      hasSteeringDir,
      hasSpecsDir,
      hasBugsDir,
    };
  }

  /**
   * MCP tool handler for project_get_info
   * Wraps getInfo to return MCP-compatible result
   *
   * @param _args - Tool arguments (empty for this tool)
   * @param projectPath - Project path provided by registry
   * @returns MCP tool result with JSON-formatted project info
   */
  getInfoToolHandler: ToolHandler = async (
    _args: unknown,
    projectPath?: string
  ): Promise<McpToolResult> => {
    if (!projectPath) {
      return {
        ok: false,
        error: {
          code: 'NO_PROJECT_SELECTED',
          message: 'Project path is required for project_get_info',
        },
      };
    }

    const info = await this.getInfo(projectPath);

    return {
      ok: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify(info, null, 2),
        },
      ],
    };
  };

  /**
   * Get tool registration for project_get_info
   *
   * @returns Tool registration object for McpToolRegistry
   */
  getToolRegistration(): ToolRegistration {
    return {
      name: 'project_get_info',
      description:
        'Get project information including path, name, and existence of .kiro directories (steering, specs, bugs)',
      inputSchema: projectGetInfoSchema,
      handler: this.getInfoToolHandler,
      requiresProject: true,
    };
  }

  /**
   * Check if a directory exists
   *
   * @param dirPath - Path to check
   * @returns True if directory exists
   */
  private async checkDirectoryExists(dirPath: string): Promise<boolean> {
    try {
      await access(dirPath);
      return true;
    } catch {
      return false;
    }
  }

  // =============================================================================
  // Task 3.3: project_list_agents
  // Requirements: 2.6
  // =============================================================================

  /**
   * Set the SpecManagerService instance for agent operations
   * @param service - SpecManagerService instance
   */
  setSpecManagerService(service: SpecManagerService): void {
    this.specManagerService = service;
  }

  /**
   * List all agents
   * Requirements: 2.6 - project_list_agents
   *
   * @param specManagerService - SpecManagerService instance (optional, uses stored if not provided)
   * @returns Agent list result with all agents
   */
  async listAgents(specManagerService?: SpecManagerService): Promise<AgentListResult> {
    const service = specManagerService || this.specManagerService;
    if (!service) {
      throw new Error('SpecManagerService not available');
    }

    // Get all agents from specManagerService
    const agentsMap = await service.getAllAgents();

    // Flatten the map into a single array
    const agents: McpAgentInfo[] = [];
    for (const agentList of agentsMap.values()) {
      for (const agent of agentList) {
        agents.push(this.mapAgentRecordToMcpAgentInfo(agent));
      }
    }

    return {
      agents,
      total: agents.length,
    };
  }

  /**
   * Map AgentRecordInfo to McpAgentInfo
   * @param agent - Agent record from specManagerService
   * @returns MCP-compatible agent info
   */
  private mapAgentRecordToMcpAgentInfo(agent: AgentRecordInfo): McpAgentInfo {
    return {
      agentId: agent.agentId,
      specId: agent.specId,
      phase: agent.phase,
      pid: agent.pid,
      sessionId: agent.sessionId,
      status: agent.status,
      startedAt: agent.startedAt,
      lastActivityAt: agent.lastActivityAt,
      command: agent.command,
      cwd: agent.cwd,
    };
  }

  /**
   * MCP tool handler for project_list_agents
   * Requirements: 2.6 - project_list_agents
   *
   * @param _args - Tool arguments (empty for this tool)
   * @param _projectPath - Project path (not used, agents are global)
   * @returns MCP tool result with JSON-formatted agents list
   */
  listAgentsToolHandler: ToolHandler = async (
    _args: unknown,
    _projectPath?: string
  ): Promise<McpToolResult> => {
    if (!this.specManagerService) {
      return {
        ok: false,
        error: {
          code: 'SERVICE_NOT_AVAILABLE',
          message: 'SpecManagerService not available. Cannot list agents.',
        },
      };
    }

    const result = await this.listAgents(this.specManagerService);

    return {
      ok: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  };

  /**
   * Get tool registration for project_list_agents
   * Requirements: 2.6 - project_list_agents
   *
   * @returns Tool registration object for McpToolRegistry
   */
  getListAgentsToolRegistration(): ToolRegistration {
    return {
      name: 'project_list_agents',
      description: 'List all running and completed agents across all specs and bugs in the project',
      inputSchema: projectListAgentsSchema,
      handler: this.listAgentsToolHandler,
      requiresProject: true,
    };
  }

  // =============================================================================
  // Task 3.2: project_list_specs, project_list_bugs
  // Requirements: 2.2, 2.3, 2.4, 2.5
  // =============================================================================

  /**
   * Set the FileService instance for spec operations
   * @param service - FileService instance
   */
  setFileService(service: FileService): void {
    this.fileService = service;
  }

  /**
   * Set the BugService instance for bug operations
   * @param service - BugService instance
   */
  setBugService(service: BugService): void {
    this.bugService = service;
  }

  /**
   * List all specs with optional filtering
   * Requirements: 2.2 - list all specs
   * Requirements: 2.3 - filter parameter
   *
   * @param projectPath - Project path
   * @param filter - Optional filter options
   * @returns Spec list result
   */
  async listSpecs(projectPath: string, filter?: SpecListFilter): Promise<SpecListResult> {
    if (!this.fileService) {
      return { specs: [], total: 0 };
    }

    // Read all specs from FileService
    const readResult = await this.fileService.readSpecs(projectPath);
    if (!readResult.ok) {
      return { specs: [], total: 0 };
    }

    // For each spec, read the spec.json to get phase, worktree, and updatedAt
    const specs: McpSpecInfo[] = [];
    for (const specMetadata of readResult.value) {
      const specPath = join(projectPath, '.kiro', 'specs', specMetadata.name);
      const specJsonResult = await this.fileService.readSpecJson(specPath);

      if (!specJsonResult.ok) {
        // Skip specs with unreadable spec.json
        continue;
      }

      const specJson = specJsonResult.value;
      const hasWorktree = !!specJson.worktree;

      // Apply filter
      if (filter) {
        if (filter.phase !== undefined && specJson.phase !== filter.phase) {
          continue;
        }
        if (filter.hasWorktree !== undefined && hasWorktree !== filter.hasWorktree) {
          continue;
        }
      }

      specs.push({
        name: specMetadata.name,
        phase: specJson.phase,
        hasWorktree,
        updatedAt: specJson.updated_at,
      });
    }

    return {
      specs,
      total: specs.length,
    };
  }

  /**
   * MCP tool handler for project_list_specs
   * Requirements: 2.2, 2.3 - project_list_specs
   *
   * @param args - Tool arguments (optional filter)
   * @param projectPath - Project path
   * @returns MCP tool result with JSON-formatted spec list
   */
  listSpecsToolHandler: ToolHandler = async (
    args: unknown,
    projectPath?: string
  ): Promise<McpToolResult> => {
    if (!projectPath) {
      return {
        ok: false,
        error: {
          code: 'NO_PROJECT_SELECTED',
          message: 'Project path is required for project_list_specs',
        },
      };
    }

    const typedArgs = args as { filter?: SpecListFilter };
    const result = await this.listSpecs(projectPath, typedArgs.filter);

    return {
      ok: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  };

  /**
   * Get tool registration for project_list_specs
   * Requirements: 2.2, 2.3 - project_list_specs
   *
   * @returns Tool registration object for McpToolRegistry
   */
  getListSpecsToolRegistration(): ToolRegistration {
    return {
      name: 'project_list_specs',
      description: 'List all specs in the project with optional filtering by phase or worktree status',
      inputSchema: projectListSpecsSchema,
      handler: this.listSpecsToolHandler,
      requiresProject: true,
    };
  }

  /**
   * List all bugs with optional filtering
   * Requirements: 2.4 - list all bugs
   * Requirements: 2.5 - filter parameter
   *
   * @param projectPath - Project path
   * @param filter - Optional filter options
   * @returns Bug list result
   */
  async listBugs(projectPath: string, filter?: BugListFilter): Promise<BugListResult> {
    if (!this.bugService) {
      return { bugs: [], total: 0 };
    }

    // Read all bugs from BugService
    const readResult = await this.bugService.readBugs(projectPath);
    if (!readResult.ok) {
      return { bugs: [], total: 0 };
    }

    // Map bugs to MCP format with filtering
    const bugs: McpBugInfo[] = [];
    for (const bugMetadata of readResult.value.bugs) {
      // Apply filter
      if (filter && filter.phase !== undefined && bugMetadata.phase !== filter.phase) {
        continue;
      }

      bugs.push({
        name: bugMetadata.name,
        phase: bugMetadata.phase,
        updatedAt: bugMetadata.updatedAt,
      });
    }

    return {
      bugs,
      total: bugs.length,
    };
  }

  /**
   * MCP tool handler for project_list_bugs
   * Requirements: 2.4, 2.5 - project_list_bugs
   *
   * @param args - Tool arguments (optional filter)
   * @param projectPath - Project path
   * @returns MCP tool result with JSON-formatted bug list
   */
  listBugsToolHandler: ToolHandler = async (
    args: unknown,
    projectPath?: string
  ): Promise<McpToolResult> => {
    if (!projectPath) {
      return {
        ok: false,
        error: {
          code: 'NO_PROJECT_SELECTED',
          message: 'Project path is required for project_list_bugs',
        },
      };
    }

    const typedArgs = args as { filter?: BugListFilter };
    const result = await this.listBugs(projectPath, typedArgs.filter);

    return {
      ok: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  };

  /**
   * Get tool registration for project_list_bugs
   * Requirements: 2.4, 2.5 - project_list_bugs
   *
   * @returns Tool registration object for McpToolRegistry
   */
  getListBugsToolRegistration(): ToolRegistration {
    return {
      name: 'project_list_bugs',
      description: 'List all bugs in the project with optional filtering by phase',
      inputSchema: projectListBugsSchema,
      handler: this.listBugsToolHandler,
      requiresProject: true,
    };
  }

  /**
   * Get all tool registrations
   * Returns registrations for all project_* tools
   *
   * @returns Array of tool registration objects
   */
  getAllToolRegistrations(): ToolRegistration[] {
    return [
      this.getToolRegistration(),
      this.getListSpecsToolRegistration(),
      this.getListBugsToolRegistration(),
      this.getListAgentsToolRegistration(),
    ];
  }
}
