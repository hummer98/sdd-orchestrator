/**
 * Bug Tool Handlers
 * Implements bug_* scope MCP tools
 * Requirements: 4.1, 4.2 - bug_get
 * Requirements: 4.3, 4.4, 4.5 - bug_get_artifact
 * Requirements: 4.6, 4.7 - bug_create
 * Requirements: 4.8 - bug_update_phase
 * Requirements: 4.9, 4.10, 4.11 - bug_start_execution, bug_stop_execution, bug_get_execution_status
 * Requirements: 4.12, 4.13 - bug_agent_stop, bug_agent_get_logs
 *
 * @file bugToolHandlers.ts
 */

import { join } from 'path';
import { z } from 'zod';
import type { ToolRegistration, McpToolResult, ToolHandler } from './mcpToolRegistry';
import type { BugService } from '../bugService';
// BugWorkflowService reserved for future use (worktree auto-creation during bug operations)
import type { BugWorkflowService } from '../bugWorkflowService';
import type { FileService } from '../fileService';
import type { BugAutoExecutionCoordinator, BugAutoExecutionState } from '../bugAutoExecutionCoordinator';
import type { SpecManagerService } from '../specManagerService';
import type { LogFileService, LogEntry } from '../logFileService';
import type { BugDetail, BugMetadata, BugPhase } from '../../../renderer/types';
import type { BugWorkflowPhase } from '../../../renderer/types/bug';

// Export BugWorkflowService type for consumers (reserved for future use)
export type { BugWorkflowService };

// =============================================================================
// Types
// =============================================================================

/**
 * Supported bug artifact types
 * Requirements: 4.4 - artifact type support
 *
 * Mapping:
 * - 'bug' -> report.md
 * - 'analysis' -> analysis.md
 * - 'fix' -> fix.md
 * - 'verify' -> verification.md
 */
export const BUG_ARTIFACT_TYPES = ['bug', 'analysis', 'fix', 'verify'] as const;

export type BugArtifactType = (typeof BUG_ARTIFACT_TYPES)[number];

/**
 * Supported bug phases
 * Requirements: 4.8 - phase update support
 */
export const BUG_PHASES = ['reported', 'analyzed', 'fixed', 'verified', 'deployed'] as const;

export type BugPhaseType = (typeof BUG_PHASES)[number];

/**
 * Bug detail returned by bug_get
 * Requirements: 4.1
 */
export interface McpBugDetail {
  /** Bug name */
  readonly name: string;
  /** Bug metadata */
  readonly metadata: BugMetadata;
  /** Artifact existence info */
  readonly artifacts: BugDetail['artifacts'];
}

/**
 * Bug error type
 * Requirements: 4.2, 4.5, 4.7, 4.9, 4.10, 4.11, 4.12, 4.13
 */
export type BugError =
  | { type: 'NOT_FOUND'; name: string }
  | { type: 'ARTIFACT_NOT_FOUND'; name: string; artifact: string }
  | { type: 'INVALID_ARTIFACT'; artifact: string }
  | { type: 'ALREADY_EXISTS'; name: string }
  | { type: 'INVALID_PHASE'; phase: string }
  | { type: 'EXECUTION_NOT_ENABLED'; name: string }
  | { type: 'NOT_EXECUTING'; name: string }
  | { type: 'AGENT_NOT_FOUND'; name: string };

// =============================================================================
// Input Schemas
// =============================================================================

/**
 * Input schema for bug_get tool
 */
const bugGetSchema = z.object({
  name: z.string().describe('The name of the bug to get'),
});

/**
 * Input schema for bug_get_artifact tool
 */
const bugGetArtifactSchema = z.object({
  name: z.string().describe('The name of the bug'),
  artifact: z
    .enum(BUG_ARTIFACT_TYPES)
    .describe('The artifact type to get (bug, analysis, fix, verify)'),
});

/**
 * Input schema for bug_create tool
 * Requirements: 4.6
 */
const bugCreateSchema = z.object({
  name: z.string().describe('The name of the bug to create (lowercase letters, numbers, and hyphens only)'),
  description: z.string().describe('Description of the bug'),
});

/**
 * Input schema for bug_update_phase tool
 * Requirements: 4.8
 */
const bugUpdatePhaseSchema = z.object({
  name: z.string().describe('The name of the bug'),
  phase: z.enum(BUG_PHASES).describe('The phase to set (reported, analyzed, fixed, verified, deployed)'),
});

/**
 * Input schema for bug_start_execution tool
 * Requirements: 4.9
 */
const bugStartExecutionSchema = z.object({
  name: z.string().describe('The name of the bug to start auto-execution'),
});

/**
 * Input schema for bug_stop_execution tool
 * Requirements: 4.10
 */
const bugStopExecutionSchema = z.object({
  name: z.string().describe('The name of the bug to stop auto-execution'),
});

/**
 * Input schema for bug_get_execution_status tool
 * Requirements: 4.11
 */
const bugGetExecutionStatusSchema = z.object({
  name: z.string().describe('The name of the bug to get execution status'),
});

/**
 * Input schema for bug_agent_stop tool
 * Requirements: 4.12
 */
const bugAgentStopSchema = z.object({
  name: z.string().describe('The name of the bug whose agent to stop'),
});

/**
 * Input schema for bug_agent_get_logs tool
 * Requirements: 4.13
 */
const bugAgentGetLogsSchema = z.object({
  name: z.string().describe('The name of the bug whose agent logs to retrieve'),
  lines: z.number().optional().describe('Number of log lines to retrieve (returns last N lines)'),
});

// =============================================================================
// Artifact file mapping
// =============================================================================

/**
 * Map artifact type to file name
 * - 'bug' -> report.md (report is the original bug report)
 * - 'analysis' -> analysis.md
 * - 'fix' -> fix.md
 * - 'verify' -> verification.md
 */
function getArtifactFileName(artifact: BugArtifactType): string {
  switch (artifact) {
    case 'bug':
      return 'report.md';
    case 'analysis':
      return 'analysis.md';
    case 'fix':
      return 'fix.md';
    case 'verify':
      return 'verification.md';
  }
}

// =============================================================================
// BugToolHandlers
// =============================================================================

/**
 * Handles bug_* scope MCP tools
 *
 * @example
 * const handlers = new BugToolHandlers();
 * handlers.setBugService(bugService);
 * handlers.setFileService(fileService);
 * const result = await handlers.get('/path/to/project', 'my-bug');
 */
export class BugToolHandlers {
  /** BugService instance for bug operations */
  private bugService: BugService | null = null;

  // BugWorkflowService is reserved for future use (worktree auto-creation during bug operations)

  /** FileService instance for file operations */
  private fileService: FileService | null = null;

  /** BugAutoExecutionCoordinator instance for auto-execution control */
  private bugAutoExecutionCoordinator: BugAutoExecutionCoordinator | null = null;

  /** SpecManagerService instance for agent operations */
  private specManagerService: SpecManagerService | null = null;

  /** LogFileService instance for log operations */
  private logFileService: LogFileService | null = null;

  /**
   * Set the BugService instance for bug operations
   * @param service - BugService instance
   */
  setBugService(service: BugService): void {
    this.bugService = service;
  }

  /**
   * Set the BugWorkflowService instance for workflow operations
   * Reserved for future use - currently phase updates are handled by bugService
   * This setter is provided for API consistency and future extensibility
   * Requirements: 4.8
   * @param _service - BugWorkflowService instance (currently unused)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setBugWorkflowService(_service: BugWorkflowService): void {
    // Reserved for future use - worktree auto-creation during bug operations
  }

  /**
   * Set the FileService instance for file operations
   * @param service - FileService instance
   */
  setFileService(service: FileService): void {
    this.fileService = service;
  }

  /**
   * Set the BugAutoExecutionCoordinator instance for auto-execution control
   * Requirements: 4.9, 4.10, 4.11
   * @param coordinator - BugAutoExecutionCoordinator instance
   */
  setBugAutoExecutionCoordinator(coordinator: BugAutoExecutionCoordinator): void {
    this.bugAutoExecutionCoordinator = coordinator;
  }

  /**
   * Set the SpecManagerService instance for agent operations
   * Requirements: 4.12, 4.13
   * @param service - SpecManagerService instance
   */
  setSpecManagerService(service: SpecManagerService): void {
    this.specManagerService = service;
  }

  /**
   * Set the LogFileService instance for log operations
   * Requirements: 4.13
   * @param service - LogFileService instance
   */
  setLogFileService(service: LogFileService): void {
    this.logFileService = service;
  }

  // =============================================================================
  // Task 5.1: bug_get
  // Requirements: 4.1, 4.2
  // =============================================================================

  /**
   * Get bug detail
   * Requirements: 4.1 - bug_get
   * Requirements: 4.2 - error on not found
   *
   * @param projectPath - Project path
   * @param name - Bug name
   * @returns Bug detail or error
   */
  async get(
    projectPath: string,
    name: string
  ): Promise<{ ok: true; value: McpBugDetail } | { ok: false; error: BugError }> {
    if (!this.bugService) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    // Resolve bug path
    const bugPath = await this.bugService.resolveBugPath(projectPath, name);

    // Read bug detail
    const bugDetailResult = await this.bugService.readBugDetail(bugPath);
    if (!bugDetailResult.ok) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    return {
      ok: true,
      value: {
        name,
        metadata: bugDetailResult.value.metadata,
        artifacts: bugDetailResult.value.artifacts,
      },
    };
  }

  /**
   * MCP tool handler for bug_get
   * Requirements: 4.1, 4.2
   *
   * @param args - Tool arguments (name)
   * @param projectPath - Project path
   * @returns MCP tool result with JSON-formatted bug detail
   */
  getToolHandler: ToolHandler = async (
    args: unknown,
    projectPath?: string
  ): Promise<McpToolResult> => {
    if (!projectPath) {
      return {
        ok: false,
        error: {
          code: 'NO_PROJECT_SELECTED',
          message: 'Project path is required for bug_get',
        },
      };
    }

    const typedArgs = args as { name: string };
    const result = await this.get(projectPath, typedArgs.name);

    if (!result.ok) {
      const errorMessage =
        result.error.type === 'NOT_FOUND'
          ? `Bug not found: ${result.error.name}`
          : `Unknown error for bug: ${typedArgs.name}`;
      return {
        ok: false,
        error: {
          code: result.error.type,
          message: errorMessage,
        },
      };
    }

    return {
      ok: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.value, null, 2),
        },
      ],
    };
  };

  /**
   * Get tool registration for bug_get
   * Requirements: 4.1, 4.2
   *
   * @returns Tool registration object for McpToolRegistry
   */
  getToolRegistration(): ToolRegistration {
    return {
      name: 'bug_get',
      description:
        'Get bug detail including bug.json content and artifact existence info',
      inputSchema: bugGetSchema,
      handler: this.getToolHandler,
      requiresProject: true,
    };
  }

  // =============================================================================
  // Task 5.1: bug_get_artifact
  // Requirements: 4.3, 4.4, 4.5
  // =============================================================================

  /**
   * Get artifact content
   * Requirements: 4.3 - bug_get_artifact
   * Requirements: 4.4 - artifact type support
   * Requirements: 4.5 - error on artifact not found
   *
   * @param projectPath - Project path
   * @param name - Bug name
   * @param artifact - Artifact type
   * @returns Artifact content or error
   */
  async getArtifact(
    projectPath: string,
    name: string,
    artifact: BugArtifactType
  ): Promise<{ ok: true; value: string } | { ok: false; error: BugError }> {
    if (!this.bugService) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    if (!this.fileService) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    // Resolve bug path
    const bugPath = await this.bugService.resolveBugPath(projectPath, name);

    // Determine artifact file path
    const artifactFileName = getArtifactFileName(artifact);
    const artifactPath = join(bugPath, artifactFileName);

    // Read artifact content
    const contentResult = await this.fileService.readArtifact(artifactPath);
    if (!contentResult.ok) {
      return {
        ok: false,
        error: { type: 'ARTIFACT_NOT_FOUND', name, artifact },
      };
    }

    return {
      ok: true,
      value: contentResult.value,
    };
  }

  /**
   * MCP tool handler for bug_get_artifact
   * Requirements: 4.3, 4.4, 4.5
   *
   * @param args - Tool arguments (name, artifact)
   * @param projectPath - Project path
   * @returns MCP tool result with artifact content
   */
  getArtifactToolHandler: ToolHandler = async (
    args: unknown,
    projectPath?: string
  ): Promise<McpToolResult> => {
    if (!projectPath) {
      return {
        ok: false,
        error: {
          code: 'NO_PROJECT_SELECTED',
          message: 'Project path is required for bug_get_artifact',
        },
      };
    }

    const typedArgs = args as { name: string; artifact: BugArtifactType };
    const result = await this.getArtifact(
      projectPath,
      typedArgs.name,
      typedArgs.artifact
    );

    if (!result.ok) {
      if (result.error.type === 'NOT_FOUND') {
        return {
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: `Bug not found: ${result.error.name}`,
          },
        };
      }
      if (result.error.type === 'ARTIFACT_NOT_FOUND') {
        return {
          ok: false,
          error: {
            code: 'ARTIFACT_NOT_FOUND',
            message: `Artifact not found: ${result.error.artifact} for bug ${result.error.name}`,
          },
        };
      }
      if (result.error.type === 'INVALID_ARTIFACT') {
        return {
          ok: false,
          error: {
            code: 'INVALID_ARTIFACT',
            message: `Invalid artifact type: ${result.error.artifact}`,
          },
        };
      }
      // Fallback for unknown errors
      return {
        ok: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: `Unknown error for artifact request`,
        },
      };
    }

    return {
      ok: true,
      content: [
        {
          type: 'text',
          text: result.value,
        },
      ],
    };
  };

  /**
   * Get tool registration for bug_get_artifact
   * Requirements: 4.3, 4.4, 4.5
   *
   * @returns Tool registration object for McpToolRegistry
   */
  getArtifactToolRegistration(): ToolRegistration {
    return {
      name: 'bug_get_artifact',
      description:
        'Get artifact content for a bug (bug, analysis, fix, verify)',
      inputSchema: bugGetArtifactSchema,
      handler: this.getArtifactToolHandler,
      requiresProject: true,
    };
  }

  // =============================================================================
  // Task 5.2: bug_create
  // Requirements: 4.6, 4.7
  // =============================================================================

  /**
   * Create a new bug
   * Requirements: 4.6 - bug_create
   * Requirements: 4.7 - error on duplicate
   *
   * @param projectPath - Project path
   * @param name - Bug name
   * @param description - Bug description
   * @returns Success or error
   */
  async create(
    projectPath: string,
    name: string,
    description: string
  ): Promise<{ ok: true; value: void } | { ok: false; error: BugError }> {
    if (!this.bugService) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    // Resolve bug path
    const bugPath = await this.bugService.resolveBugPath(projectPath, name);

    // Check if bug already exists
    const existsResult = await this.bugService.bugExists(bugPath);
    if (existsResult.ok && existsResult.value) {
      return {
        ok: false,
        error: { type: 'ALREADY_EXISTS', name },
      };
    }

    // Create bug (directory, bug.json, and report.md)
    const createResult = await this.bugService.createBug(bugPath, name, description);
    if (!createResult.ok) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    return { ok: true, value: undefined };
  }

  /**
   * MCP tool handler for bug_create
   * Requirements: 4.6, 4.7
   *
   * @param args - Tool arguments (name, description)
   * @param projectPath - Project path
   * @returns MCP tool result
   */
  createToolHandler: ToolHandler = async (
    args: unknown,
    projectPath?: string
  ): Promise<McpToolResult> => {
    if (!projectPath) {
      return {
        ok: false,
        error: {
          code: 'NO_PROJECT_SELECTED',
          message: 'Project path is required for bug_create',
        },
      };
    }

    const typedArgs = args as { name: string; description: string };
    const result = await this.create(projectPath, typedArgs.name, typedArgs.description);

    if (!result.ok) {
      if (result.error.type === 'ALREADY_EXISTS') {
        return {
          ok: false,
          error: {
            code: 'ALREADY_EXISTS',
            message: `Bug already exists: ${result.error.name}`,
          },
        };
      }
      return {
        ok: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: `Failed to create bug: ${typedArgs.name}`,
        },
      };
    }

    return {
      ok: true,
      content: [
        {
          type: 'text',
          text: `Bug '${typedArgs.name}' created successfully`,
        },
      ],
    };
  };

  /**
   * Get tool registration for bug_create
   * Requirements: 4.6, 4.7
   *
   * @returns Tool registration object for McpToolRegistry
   */
  createToolRegistration(): ToolRegistration {
    return {
      name: 'bug_create',
      description: 'Create a new bug with the given name and description',
      inputSchema: bugCreateSchema,
      handler: this.createToolHandler,
      requiresProject: true,
    };
  }

  // =============================================================================
  // Task 5.2: bug_update_phase
  // Requirements: 4.8
  // =============================================================================

  /**
   * Update bug phase
   * Requirements: 4.8 - bug_update_phase
   *
   * @param projectPath - Project path
   * @param name - Bug name
   * @param phase - New phase
   * @returns Success or error
   */
  async updatePhase(
    projectPath: string,
    name: string,
    phase: BugPhaseType
  ): Promise<{ ok: true; value: void } | { ok: false; error: BugError }> {
    if (!this.bugService) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    // Resolve bug path
    const bugPath = await this.bugService.resolveBugPath(projectPath, name);

    // Check if bug exists
    const existsResult = await this.bugService.bugExists(bugPath);
    if (!existsResult.ok || !existsResult.value) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    // Update phase
    const updateResult = await this.bugService.updateBugJsonPhase(bugPath, phase as BugPhase);
    if (!updateResult.ok) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    return { ok: true, value: undefined };
  }

  /**
   * MCP tool handler for bug_update_phase
   * Requirements: 4.8
   *
   * @param args - Tool arguments (name, phase)
   * @param projectPath - Project path
   * @returns MCP tool result
   */
  updatePhaseToolHandler: ToolHandler = async (
    args: unknown,
    projectPath?: string
  ): Promise<McpToolResult> => {
    if (!projectPath) {
      return {
        ok: false,
        error: {
          code: 'NO_PROJECT_SELECTED',
          message: 'Project path is required for bug_update_phase',
        },
      };
    }

    const typedArgs = args as { name: string; phase: BugPhaseType };
    const result = await this.updatePhase(projectPath, typedArgs.name, typedArgs.phase);

    if (!result.ok) {
      if (result.error.type === 'NOT_FOUND') {
        return {
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: `Bug not found: ${result.error.name}`,
          },
        };
      }
      return {
        ok: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: `Failed to update bug phase: ${typedArgs.name}`,
        },
      };
    }

    return {
      ok: true,
      content: [
        {
          type: 'text',
          text: `Bug '${typedArgs.name}' phase updated to '${typedArgs.phase}'`,
        },
      ],
    };
  };

  /**
   * Get tool registration for bug_update_phase
   * Requirements: 4.8
   *
   * @returns Tool registration object for McpToolRegistry
   */
  updatePhaseToolRegistration(): ToolRegistration {
    return {
      name: 'bug_update_phase',
      description: 'Update the phase of a bug (reported, analyzed, fixed, verified, deployed)',
      inputSchema: bugUpdatePhaseSchema,
      handler: this.updatePhaseToolHandler,
      requiresProject: true,
    };
  }

  // =============================================================================
  // Task 5.3: bug_start_execution
  // Requirements: 4.9
  // =============================================================================

  /**
   * Start auto-execution for a bug
   * Requirements: 4.9 - bug_start_execution
   *
   * @param projectPath - Project path
   * @param name - Bug name
   * @returns Success or error
   */
  async startExecution(
    projectPath: string,
    name: string
  ): Promise<{ ok: true; value: BugAutoExecutionState } | { ok: false; error: BugError }> {
    if (!this.bugService) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    if (!this.bugAutoExecutionCoordinator) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    // Resolve bug path
    const bugPath = await this.bugService.resolveBugPath(projectPath, name);

    // Read bug detail to get autoExecution settings
    const bugDetailResult = await this.bugService.readBugDetail(bugPath);
    if (!bugDetailResult.ok) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    const bugDetail = bugDetailResult.value;
    const autoExecution = (bugDetail.metadata as any).autoExecution;

    // Check if auto-execution is enabled
    if (!autoExecution || !autoExecution.enabled) {
      return {
        ok: false,
        error: { type: 'EXECUTION_NOT_ENABLED', name },
      };
    }

    // Derive lastCompletedPhase from current phase
    const currentPhase = bugDetail.metadata.phase;
    const lastCompletedPhase = this.deriveBugWorkflowPhaseFromBugPhase(currentPhase);

    // Start auto-execution
    // auto-execution-projectpath-fix Task 4.5: Pass projectPath to start()
    const startResult = await this.bugAutoExecutionCoordinator.start(
      projectPath,
      bugPath,
      name,
      {
        permissions: autoExecution.permissions || {
          analyze: true,
          fix: true,
          verify: true,
          deploy: false,
        },
      },
      lastCompletedPhase
    );

    if (!startResult.ok) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    return { ok: true, value: startResult.value };
  }

  /**
   * Derive BugWorkflowPhase from BugPhase for lastCompletedPhase parameter
   */
  private deriveBugWorkflowPhaseFromBugPhase(bugPhase: BugPhase): BugWorkflowPhase | null {
    // Map BugPhase to the last completed BugWorkflowPhase
    // BugPhase values: 'reported' | 'analyzed' | 'fixed' | 'verified' | 'deployed'
    // BugWorkflowPhase values: 'report' | 'analyze' | 'fix' | 'verify' | 'deploy'
    switch (bugPhase) {
      case 'reported':
        return 'report';
      case 'analyzed':
        return 'analyze';
      case 'fixed':
        return 'fix';
      case 'verified':
        return 'verify';
      case 'deployed':
        return 'deploy';
      default:
        return null;
    }
  }

  /**
   * MCP tool handler for bug_start_execution
   * Requirements: 4.9
   *
   * @param args - Tool arguments (name)
   * @param projectPath - Project path
   * @returns MCP tool result
   */
  startExecutionToolHandler: ToolHandler = async (
    args: unknown,
    projectPath?: string
  ): Promise<McpToolResult> => {
    if (!projectPath) {
      return {
        ok: false,
        error: {
          code: 'NO_PROJECT_SELECTED',
          message: 'Project path is required for bug_start_execution',
        },
      };
    }

    const typedArgs = args as { name: string };
    const result = await this.startExecution(projectPath, typedArgs.name);

    if (!result.ok) {
      if (result.error.type === 'NOT_FOUND') {
        return {
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: `Bug not found: ${result.error.name}`,
          },
        };
      }
      if (result.error.type === 'EXECUTION_NOT_ENABLED') {
        return {
          ok: false,
          error: {
            code: 'EXECUTION_NOT_ENABLED',
            message: `Auto-execution not enabled for bug: ${result.error.name}`,
          },
        };
      }
      return {
        ok: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: `Failed to start execution for bug: ${typedArgs.name}`,
        },
      };
    }

    return {
      ok: true,
      content: [
        {
          type: 'text',
          text: `Auto-execution started for bug '${typedArgs.name}'`,
        },
      ],
    };
  };

  /**
   * Get tool registration for bug_start_execution
   * Requirements: 4.9
   *
   * @returns Tool registration object for McpToolRegistry
   */
  startExecutionToolRegistration(): ToolRegistration {
    return {
      name: 'bug_start_execution',
      description: 'Start auto-execution for a bug (requires autoExecution.enabled in bug.json)',
      inputSchema: bugStartExecutionSchema,
      handler: this.startExecutionToolHandler,
      requiresProject: true,
    };
  }

  // =============================================================================
  // Task 5.3: bug_stop_execution
  // Requirements: 4.10
  // =============================================================================

  /**
   * Stop auto-execution for a bug
   * Requirements: 4.10 - bug_stop_execution
   *
   * @param projectPath - Project path
   * @param name - Bug name
   * @returns Success or error
   */
  async stopExecution(
    projectPath: string,
    name: string
  ): Promise<{ ok: true; value: void } | { ok: false; error: BugError }> {
    if (!this.bugService) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    if (!this.bugAutoExecutionCoordinator) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    // Resolve bug path
    const bugPath = await this.bugService.resolveBugPath(projectPath, name);

    // Stop auto-execution
    const stopResult = await this.bugAutoExecutionCoordinator.stop(bugPath);

    if (!stopResult.ok) {
      return {
        ok: false,
        error: { type: 'NOT_EXECUTING', name },
      };
    }

    return { ok: true, value: undefined };
  }

  /**
   * MCP tool handler for bug_stop_execution
   * Requirements: 4.10
   *
   * @param args - Tool arguments (name)
   * @param projectPath - Project path
   * @returns MCP tool result
   */
  stopExecutionToolHandler: ToolHandler = async (
    args: unknown,
    projectPath?: string
  ): Promise<McpToolResult> => {
    if (!projectPath) {
      return {
        ok: false,
        error: {
          code: 'NO_PROJECT_SELECTED',
          message: 'Project path is required for bug_stop_execution',
        },
      };
    }

    const typedArgs = args as { name: string };
    const result = await this.stopExecution(projectPath, typedArgs.name);

    if (!result.ok) {
      if (result.error.type === 'NOT_EXECUTING') {
        return {
          ok: false,
          error: {
            code: 'NOT_EXECUTING',
            message: `Bug is not executing: ${result.error.name}`,
          },
        };
      }
      return {
        ok: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: `Failed to stop execution for bug: ${typedArgs.name}`,
        },
      };
    }

    return {
      ok: true,
      content: [
        {
          type: 'text',
          text: `Auto-execution stopped for bug '${typedArgs.name}'`,
        },
      ],
    };
  };

  /**
   * Get tool registration for bug_stop_execution
   * Requirements: 4.10
   *
   * @returns Tool registration object for McpToolRegistry
   */
  stopExecutionToolRegistration(): ToolRegistration {
    return {
      name: 'bug_stop_execution',
      description: 'Stop auto-execution for a bug',
      inputSchema: bugStopExecutionSchema,
      handler: this.stopExecutionToolHandler,
      requiresProject: true,
    };
  }

  // =============================================================================
  // Task 5.3: bug_get_execution_status
  // Requirements: 4.11
  // =============================================================================

  /**
   * Get auto-execution status for a bug
   * Requirements: 4.11 - bug_get_execution_status
   *
   * @param projectPath - Project path
   * @param name - Bug name
   * @returns Execution status or error
   */
  async getExecutionStatus(
    projectPath: string,
    name: string
  ): Promise<{ ok: true; value: BugAutoExecutionState | null } | { ok: false; error: BugError }> {
    if (!this.bugService) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    if (!this.bugAutoExecutionCoordinator) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    // Resolve bug path
    const bugPath = await this.bugService.resolveBugPath(projectPath, name);

    // Get execution status
    const status = this.bugAutoExecutionCoordinator.getStatus(bugPath);

    return { ok: true, value: status };
  }

  /**
   * MCP tool handler for bug_get_execution_status
   * Requirements: 4.11
   *
   * @param args - Tool arguments (name)
   * @param projectPath - Project path
   * @returns MCP tool result with JSON-formatted execution status
   */
  getExecutionStatusToolHandler: ToolHandler = async (
    args: unknown,
    projectPath?: string
  ): Promise<McpToolResult> => {
    if (!projectPath) {
      return {
        ok: false,
        error: {
          code: 'NO_PROJECT_SELECTED',
          message: 'Project path is required for bug_get_execution_status',
        },
      };
    }

    const typedArgs = args as { name: string };
    const result = await this.getExecutionStatus(projectPath, typedArgs.name);

    if (!result.ok) {
      return {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: `Bug not found: ${typedArgs.name}`,
        },
      };
    }

    return {
      ok: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.value, null, 2),
        },
      ],
    };
  };

  /**
   * Get tool registration for bug_get_execution_status
   * Requirements: 4.11
   *
   * @returns Tool registration object for McpToolRegistry
   */
  getExecutionStatusToolRegistration(): ToolRegistration {
    return {
      name: 'bug_get_execution_status',
      description: 'Get auto-execution status for a bug (running, paused, error, etc.)',
      inputSchema: bugGetExecutionStatusSchema,
      handler: this.getExecutionStatusToolHandler,
      requiresProject: true,
    };
  }

  // =============================================================================
  // Task 5.4: bug_agent_stop
  // Requirements: 4.12
  // =============================================================================

  /**
   * Stop running agents for a bug
   * Requirements: 4.12 - bug_agent_stop
   *
   * Uses specManagerService.stopAgent to stop all running agents for the bug.
   * Bug agents are tracked with specId format 'bug:{bugName}'.
   *
   * @param bugName - Bug name
   * @returns Success or error
   */
  async stopAgent(
    bugName: string
  ): Promise<{ ok: true; value: { stoppedAgentIds: string[] } } | { ok: false; error: BugError }> {
    if (!this.specManagerService) {
      return { ok: false, error: { type: 'AGENT_NOT_FOUND', name: bugName } };
    }

    // Get all agents and filter for this bug (bug agents use 'bug:{bugName}' as specId)
    const bugSpecId = `bug:${bugName}`;
    const allAgentsMap = await this.specManagerService.getAllAgents();
    const bugAgents = allAgentsMap.get(bugSpecId) ?? [];

    // Filter for running agents
    const runningAgents = bugAgents.filter((a) => a.status === 'running');

    if (runningAgents.length === 0) {
      return { ok: false, error: { type: 'AGENT_NOT_FOUND', name: bugName } };
    }

    // Stop all running agents
    const stoppedAgentIds: string[] = [];
    for (const agent of runningAgents) {
      await this.specManagerService.stopAgent(agent.agentId);
      stoppedAgentIds.push(agent.agentId);
    }

    return { ok: true, value: { stoppedAgentIds } };
  }

  /**
   * MCP tool handler for bug_agent_stop
   * Requirements: 4.12
   *
   * @param args - Tool arguments
   * @param projectPath - Project path
   * @returns MCP tool result
   */
  stopAgentToolHandler: ToolHandler = async (
    args: unknown,
    projectPath?: string
  ): Promise<McpToolResult> => {
    if (!projectPath) {
      return {
        ok: false,
        error: {
          code: 'NO_PROJECT_SELECTED',
          message: 'No project selected. Please select a project first.',
        },
      };
    }

    const typedArgs = args as { name: string };
    const result = await this.stopAgent(typedArgs.name);

    if (!result.ok) {
      return {
        ok: false,
        error: {
          code: result.error.type,
          message: `No running agents found for bug '${typedArgs.name}'`,
        },
      };
    }

    return {
      ok: true,
      content: [
        {
          type: 'text',
          text: `Agents stopped for bug '${typedArgs.name}': ${result.value.stoppedAgentIds.join(', ')}`,
        },
      ],
    };
  };

  /**
   * Get tool registration for bug_agent_stop
   * Requirements: 4.12
   *
   * @returns Tool registration object for McpToolRegistry
   */
  stopAgentToolRegistration(): ToolRegistration {
    return {
      name: 'bug_agent_stop',
      description: 'Stop all running agents for a bug',
      inputSchema: bugAgentStopSchema,
      handler: this.stopAgentToolHandler,
      requiresProject: true,
    };
  }

  // =============================================================================
  // Task 5.4: bug_agent_get_logs
  // Requirements: 4.13
  // =============================================================================

  /**
   * Get logs for a bug agent
   * Requirements: 4.13 - bug_agent_get_logs
   *
   * Uses logFileService to retrieve agent logs.
   * Bug agents are tracked with specId format 'bug:{bugName}'.
   *
   * @param bugName - Bug name
   * @param lines - Optional number of log lines to return (last N lines)
   * @returns Log entries or error
   */
  async getAgentLogs(
    bugName: string,
    lines?: number
  ): Promise<{ ok: true; value: LogEntry[] } | { ok: false; error: BugError }> {
    if (!this.specManagerService) {
      return { ok: false, error: { type: 'AGENT_NOT_FOUND', name: bugName } };
    }

    if (!this.logFileService) {
      return { ok: false, error: { type: 'AGENT_NOT_FOUND', name: bugName } };
    }

    // Get all agents and find the most recent agent for this bug
    const bugSpecId = `bug:${bugName}`;
    const allAgentsMap = await this.specManagerService.getAllAgents();
    const bugAgents = allAgentsMap.get(bugSpecId) ?? [];

    if (bugAgents.length === 0) {
      return { ok: false, error: { type: 'AGENT_NOT_FOUND', name: bugName } };
    }

    // Get the most recent agent (prefer running, then most recent by startedAt)
    const getStartedAtTime = (startedAt: string | number | undefined): number => {
      if (startedAt === undefined) return 0;
      if (typeof startedAt === 'number') return startedAt;
      return new Date(startedAt).getTime();
    };
    const sortedAgents = [...bugAgents].sort((a, b) => {
      if (a.status === 'running' && b.status !== 'running') return -1;
      if (b.status === 'running' && a.status !== 'running') return 1;
      return getStartedAtTime(b.startedAt) - getStartedAtTime(a.startedAt);
    });

    const agent = sortedAgents[0];

    // Read logs using logFileService
    let logs = await this.logFileService.readLog(bugSpecId, agent.agentId);

    // Apply lines limit if specified (return last N entries)
    if (lines !== undefined && lines > 0 && logs.length > lines) {
      logs = logs.slice(-lines);
    }

    return { ok: true, value: logs };
  }

  /**
   * MCP tool handler for bug_agent_get_logs
   * Requirements: 4.13
   *
   * @param args - Tool arguments
   * @param projectPath - Project path
   * @returns MCP tool result
   */
  getAgentLogsToolHandler: ToolHandler = async (
    args: unknown,
    projectPath?: string
  ): Promise<McpToolResult> => {
    if (!projectPath) {
      return {
        ok: false,
        error: {
          code: 'NO_PROJECT_SELECTED',
          message: 'No project selected. Please select a project first.',
        },
      };
    }

    const typedArgs = args as { name: string; lines?: number };
    const result = await this.getAgentLogs(typedArgs.name, typedArgs.lines);

    if (!result.ok) {
      return {
        ok: false,
        error: {
          code: result.error.type,
          message: `No agents found for bug '${typedArgs.name}'`,
        },
      };
    }

    return {
      ok: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.value, null, 2),
        },
      ],
    };
  };

  /**
   * Get tool registration for bug_agent_get_logs
   * Requirements: 4.13
   *
   * @returns Tool registration object for McpToolRegistry
   */
  getAgentLogsToolRegistration(): ToolRegistration {
    return {
      name: 'bug_agent_get_logs',
      description: 'Get logs for the most recent agent of a bug',
      inputSchema: bugAgentGetLogsSchema,
      handler: this.getAgentLogsToolHandler,
      requiresProject: true,
    };
  }

  /**
   * Get all tool registrations
   * Returns registrations for bug_get, bug_get_artifact, bug_create, bug_update_phase,
   * bug_start_execution, bug_stop_execution, bug_get_execution_status,
   * bug_agent_stop, bug_agent_get_logs
   *
   * @returns Array of tool registration objects
   */
  getAllToolRegistrations(): ToolRegistration[] {
    return [
      this.getToolRegistration(),
      this.getArtifactToolRegistration(),
      this.createToolRegistration(),
      this.updatePhaseToolRegistration(),
      this.startExecutionToolRegistration(),
      this.stopExecutionToolRegistration(),
      this.getExecutionStatusToolRegistration(),
      this.stopAgentToolRegistration(),
      this.getAgentLogsToolRegistration(),
    ];
  }
}
