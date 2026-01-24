/**
 * Spec Tool Handlers
 * Implements spec_* scope MCP tools
 * Requirements: 3.1, 3.2 - spec_get
 * Requirements: 3.3, 3.4, 3.5 - spec_get_artifact
 * Requirements: 3.6, 3.7 - spec_create
 * Requirements: 3.8, 3.9 - spec_approve
 * Requirements: 3.10, 3.11, 3.12 - spec_start_execution, spec_stop_execution, spec_get_execution_status
 * Requirements: 3.13, 3.14 - spec_agent_stop, spec_agent_get_logs
 *
 * @file specToolHandlers.ts
 */

import { readdir } from 'fs/promises';
import { join } from 'path';
import { z } from 'zod';
import type { ToolRegistration, McpToolResult, ToolHandler } from './mcpToolRegistry';
import type { FileService } from '../fileService';
import type { AutoExecutionCoordinator, AutoExecutionState } from '../autoExecutionCoordinator';
import type { SpecManagerService } from '../specManagerService';
import type { LogFileService, LogEntry } from '../logFileService';
import type { SpecJson, ArtifactInfo, Phase } from '../../../renderer/types';

// =============================================================================
// Types
// =============================================================================

/**
 * Supported spec artifact types
 * Requirements: 3.4 - artifact type support
 */
export const SPEC_ARTIFACT_TYPES = [
  'requirements',
  'design',
  'tasks',
  'inspection',
  'document-review',
  'reply',
] as const;

export type SpecArtifactType = typeof SPEC_ARTIFACT_TYPES[number];

/**
 * Spec detail returned by spec_get
 * Requirements: 3.1
 */
export interface McpSpecDetail {
  /** Spec name */
  readonly name: string;
  /** Spec JSON content */
  readonly specJson: SpecJson;
  /** Artifact existence info */
  readonly artifacts: {
    readonly requirements: ArtifactInfo | null;
    readonly design: ArtifactInfo | null;
    readonly tasks: ArtifactInfo | null;
    readonly research: ArtifactInfo | null;
  };
}

/**
 * Supported approval phases for spec_approve
 * Requirements: 3.9 - all phases approval support
 */
export const APPROVAL_PHASES = ['requirements', 'design', 'tasks'] as const;

export type ApprovalPhase = typeof APPROVAL_PHASES[number];

/**
 * Spec error type
 * Requirements: 3.2, 3.5, 3.7, 3.10, 3.11, 3.13, 3.14
 */
export type SpecError =
  | { type: 'NOT_FOUND'; name: string }
  | { type: 'ARTIFACT_NOT_FOUND'; name: string; artifact: string }
  | { type: 'INVALID_ARTIFACT'; artifact: string }
  | { type: 'ALREADY_EXISTS'; name: string }
  | { type: 'INVALID_NAME'; name: string }
  | { type: 'PHASE_NOT_GENERATED'; name: string; phase: string }
  | { type: 'EXECUTION_NOT_ENABLED'; name: string }
  | { type: 'NOT_EXECUTING'; name: string }
  | { type: 'EXECUTION_FAILED'; name: string; message: string }
  | { type: 'AGENT_NOT_FOUND'; name: string };

// =============================================================================
// Input Schemas
// =============================================================================

/**
 * Input schema for spec_get tool
 */
const specGetSchema = z.object({
  name: z.string().describe('The name of the spec to get'),
});

/**
 * Input schema for spec_get_artifact tool
 */
const specGetArtifactSchema = z.object({
  name: z.string().describe('The name of the spec'),
  artifact: z
    .enum(SPEC_ARTIFACT_TYPES)
    .describe('The artifact type to get (requirements, design, tasks, inspection, document-review, reply)'),
});

/**
 * Input schema for spec_create tool
 * Requirements: 3.6
 */
const specCreateSchema = z.object({
  name: z.string().describe('The name of the spec to create (lowercase letters, numbers, and hyphens only)'),
  description: z.string().optional().describe('Optional description for the spec'),
});

/**
 * Input schema for spec_approve tool
 * Requirements: 3.8, 3.9
 */
const specApproveSchema = z.object({
  name: z.string().describe('The name of the spec'),
  phase: z.enum(APPROVAL_PHASES).describe('The phase to approve (requirements, design, tasks)'),
});

/**
 * Input schema for spec_start_execution tool
 * Requirements: 3.10
 */
const specStartExecutionSchema = z.object({
  name: z.string().describe('The name of the spec to start auto-execution for'),
});

/**
 * Input schema for spec_stop_execution tool
 * Requirements: 3.11
 */
const specStopExecutionSchema = z.object({
  name: z.string().describe('The name of the spec to stop auto-execution for'),
});

/**
 * Input schema for spec_get_execution_status tool
 * Requirements: 3.12
 */
const specGetExecutionStatusSchema = z.object({
  name: z.string().describe('The name of the spec to get execution status for'),
});

/**
 * Input schema for spec_agent_stop tool
 * Requirements: 3.13
 */
const specAgentStopSchema = z.object({
  name: z.string().describe('The name of the spec to stop running agents for'),
});

/**
 * Input schema for spec_agent_get_logs tool
 * Requirements: 3.14
 */
const specAgentGetLogsSchema = z.object({
  name: z.string().describe('The name of the spec to get agent logs for'),
  lines: z.number().optional().describe('Optional limit on the number of log lines to return (from the end)'),
});

// =============================================================================
// SpecToolHandlers
// =============================================================================

/**
 * Handles spec_* scope MCP tools
 *
 * @example
 * const handlers = new SpecToolHandlers();
 * handlers.setFileService(fileService);
 * const result = await handlers.get('/path/to/project', 'my-feature');
 */
export class SpecToolHandlers {
  /** FileService instance for file operations */
  private fileService: FileService | null = null;

  /** AutoExecutionCoordinator instance for auto-execution control */
  private autoExecutionCoordinator: AutoExecutionCoordinator | null = null;

  /** SpecManagerService instance for agent operations */
  private specManagerService: SpecManagerService | null = null;

  /** LogFileService instance for log file operations */
  private logFileService: LogFileService | null = null;

  /**
   * Set the FileService instance for file operations
   * @param service - FileService instance
   */
  setFileService(service: FileService): void {
    this.fileService = service;
  }

  /**
   * Set the AutoExecutionCoordinator instance for auto-execution control
   * Requirements: 3.10, 3.11, 3.12
   * @param coordinator - AutoExecutionCoordinator instance
   */
  setAutoExecutionCoordinator(coordinator: AutoExecutionCoordinator): void {
    this.autoExecutionCoordinator = coordinator;
  }

  /**
   * Set the SpecManagerService instance for agent operations
   * Requirements: 3.13, 3.14
   * @param service - SpecManagerService instance
   */
  setSpecManagerService(service: SpecManagerService): void {
    this.specManagerService = service;
  }

  /**
   * Set the LogFileService instance for log file operations
   * Requirements: 3.14
   * @param service - LogFileService instance
   */
  setLogFileService(service: LogFileService): void {
    this.logFileService = service;
  }

  // =============================================================================
  // Task 4.1: spec_get
  // Requirements: 3.1, 3.2
  // =============================================================================

  /**
   * Get spec detail
   * Requirements: 3.1 - spec_get
   * Requirements: 3.2 - error on not found
   *
   * @param projectPath - Project path
   * @param name - Spec name
   * @returns Spec detail or error
   */
  async get(
    projectPath: string,
    name: string
  ): Promise<{ ok: true; value: McpSpecDetail } | { ok: false; error: SpecError }> {
    if (!this.fileService) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    // Resolve spec path
    const pathResult = await this.fileService.resolveSpecPath(projectPath, name);
    if (!pathResult.ok) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    const specPath = pathResult.value;

    // Read spec.json
    const specJsonResult = await this.fileService.readSpecJson(specPath);
    if (!specJsonResult.ok) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    // Get artifact info for each artifact
    const [requirements, design, tasks, research] = await Promise.all([
      this.fileService.getArtifactInfo(specPath, 'requirements'),
      this.fileService.getArtifactInfo(specPath, 'design'),
      this.fileService.getArtifactInfo(specPath, 'tasks'),
      this.fileService.getArtifactInfo(specPath, 'research'),
    ]);

    return {
      ok: true,
      value: {
        name,
        specJson: specJsonResult.value,
        artifacts: {
          requirements,
          design,
          tasks,
          research,
        },
      },
    };
  }

  /**
   * MCP tool handler for spec_get
   * Requirements: 3.1, 3.2
   *
   * @param args - Tool arguments (name)
   * @param projectPath - Project path
   * @returns MCP tool result with JSON-formatted spec detail
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
          message: 'Project path is required for spec_get',
        },
      };
    }

    const typedArgs = args as { name: string };
    const result = await this.get(projectPath, typedArgs.name);

    if (!result.ok) {
      const errorMessage = result.error.type === 'NOT_FOUND'
        ? `Spec not found: ${result.error.name}`
        : `Unknown error for spec: ${typedArgs.name}`;
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
   * Get tool registration for spec_get
   * Requirements: 3.1, 3.2
   *
   * @returns Tool registration object for McpToolRegistry
   */
  getToolRegistration(): ToolRegistration {
    return {
      name: 'spec_get',
      description:
        'Get spec detail including spec.json content and artifact existence info',
      inputSchema: specGetSchema,
      handler: this.getToolHandler,
      requiresProject: true,
    };
  }

  // =============================================================================
  // Task 4.1: spec_get_artifact
  // Requirements: 3.3, 3.4, 3.5
  // =============================================================================

  /**
   * Get artifact content
   * Requirements: 3.3 - spec_get_artifact
   * Requirements: 3.4 - artifact type support
   * Requirements: 3.5 - error on artifact not found
   *
   * @param projectPath - Project path
   * @param name - Spec name
   * @param artifact - Artifact type
   * @returns Artifact content or error
   */
  async getArtifact(
    projectPath: string,
    name: string,
    artifact: SpecArtifactType
  ): Promise<{ ok: true; value: string } | { ok: false; error: SpecError }> {
    if (!this.fileService) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    // Resolve spec path
    const pathResult = await this.fileService.resolveSpecPath(projectPath, name);
    if (!pathResult.ok) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    const specPath = pathResult.value;

    // Determine artifact file path based on type
    let artifactPath: string;

    switch (artifact) {
      case 'requirements':
      case 'design':
      case 'tasks':
        // Simple artifacts: {artifact}.md
        artifactPath = join(specPath, `${artifact}.md`);
        break;

      case 'inspection': {
        // inspection-*.md - return the latest
        const inspectionPath = await this.findLatestNumberedArtifact(specPath, 'inspection');
        if (!inspectionPath) {
          return {
            ok: false,
            error: { type: 'ARTIFACT_NOT_FOUND', name, artifact },
          };
        }
        artifactPath = inspectionPath;
        break;
      }

      case 'document-review': {
        // document-review-*.md - return the latest
        const reviewPath = await this.findLatestNumberedArtifact(specPath, 'document-review');
        if (!reviewPath) {
          return {
            ok: false,
            error: { type: 'ARTIFACT_NOT_FOUND', name, artifact },
          };
        }
        artifactPath = reviewPath;
        break;
      }

      case 'reply': {
        // document-review-*-reply.md - return the latest
        const replyPath = await this.findLatestReplyArtifact(specPath);
        if (!replyPath) {
          return {
            ok: false,
            error: { type: 'ARTIFACT_NOT_FOUND', name, artifact },
          };
        }
        artifactPath = replyPath;
        break;
      }

      default:
        return {
          ok: false,
          error: { type: 'INVALID_ARTIFACT', artifact },
        };
    }

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
   * Find the latest numbered artifact file
   * e.g., inspection-1.md, inspection-2.md -> returns path to inspection-2.md
   *
   * @param specPath - Spec directory path
   * @param prefix - File prefix (e.g., 'inspection', 'document-review')
   * @returns Path to the latest file or null if none found
   */
  private async findLatestNumberedArtifact(
    specPath: string,
    prefix: string
  ): Promise<string | null> {
    try {
      const entries = await readdir(specPath, { withFileTypes: true });
      const pattern = new RegExp(`^${prefix}-(\\d+)\\.md$`);

      let maxNumber = 0;
      let latestFile: string | null = null;

      for (const entry of entries) {
        if (!entry.isFile()) continue;

        const match = entry.name.match(pattern);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) {
            maxNumber = num;
            latestFile = entry.name;
          }
        }
      }

      return latestFile ? join(specPath, latestFile) : null;
    } catch {
      return null;
    }
  }

  /**
   * Find the latest reply artifact file
   * e.g., document-review-1-reply.md, document-review-2-reply.md
   *
   * @param specPath - Spec directory path
   * @returns Path to the latest reply file or null if none found
   */
  private async findLatestReplyArtifact(specPath: string): Promise<string | null> {
    try {
      const entries = await readdir(specPath, { withFileTypes: true });
      const pattern = /^document-review-(\d+)-reply\.md$/;

      let maxNumber = 0;
      let latestFile: string | null = null;

      for (const entry of entries) {
        if (!entry.isFile()) continue;

        const match = entry.name.match(pattern);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) {
            maxNumber = num;
            latestFile = entry.name;
          }
        }
      }

      return latestFile ? join(specPath, latestFile) : null;
    } catch {
      return null;
    }
  }

  /**
   * MCP tool handler for spec_get_artifact
   * Requirements: 3.3, 3.4, 3.5
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
          message: 'Project path is required for spec_get_artifact',
        },
      };
    }

    const typedArgs = args as { name: string; artifact: SpecArtifactType };
    const result = await this.getArtifact(projectPath, typedArgs.name, typedArgs.artifact);

    if (!result.ok) {
      if (result.error.type === 'NOT_FOUND') {
        return {
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: `Spec not found: ${result.error.name}`,
          },
        };
      }
      if (result.error.type === 'ARTIFACT_NOT_FOUND') {
        return {
          ok: false,
          error: {
            code: 'ARTIFACT_NOT_FOUND',
            message: `Artifact not found: ${result.error.artifact} for spec ${result.error.name}`,
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
   * Get tool registration for spec_get_artifact
   * Requirements: 3.3, 3.4, 3.5
   *
   * @returns Tool registration object for McpToolRegistry
   */
  getArtifactToolRegistration(): ToolRegistration {
    return {
      name: 'spec_get_artifact',
      description:
        'Get artifact content for a spec (requirements, design, tasks, inspection, document-review, reply)',
      inputSchema: specGetArtifactSchema,
      handler: this.getArtifactToolHandler,
      requiresProject: true,
    };
  }

  // =============================================================================
  // Task 4.2: spec_create
  // Requirements: 3.6, 3.7
  // =============================================================================

  /**
   * Create a new spec
   * Requirements: 3.6 - spec_create
   * Requirements: 3.7 - error on duplicate
   *
   * @param projectPath - Project path
   * @param name - Spec name
   * @param description - Optional description
   * @returns Success or error
   */
  async create(
    projectPath: string,
    name: string,
    description?: string
  ): Promise<{ ok: true; value: void } | { ok: false; error: SpecError }> {
    if (!this.fileService) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    const result = await this.fileService.createSpec(projectPath, name, description ?? '');

    if (!result.ok) {
      // Check for specific error types
      if (result.error.type === 'INVALID_PATH' && result.error.reason?.includes('Spec name must contain')) {
        return {
          ok: false,
          error: { type: 'INVALID_NAME', name },
        };
      }
      if (result.error.type === 'WRITE_ERROR' && result.error.message?.includes('EEXIST')) {
        return {
          ok: false,
          error: { type: 'ALREADY_EXISTS', name },
        };
      }
      // Default to ALREADY_EXISTS for other write errors (spec already exists)
      return {
        ok: false,
        error: { type: 'ALREADY_EXISTS', name },
      };
    }

    return { ok: true, value: undefined };
  }

  /**
   * MCP tool handler for spec_create
   * Requirements: 3.6, 3.7
   *
   * @param args - Tool arguments (name, description?)
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
          message: 'Project path is required for spec_create',
        },
      };
    }

    const typedArgs = args as { name: string; description?: string };
    const result = await this.create(projectPath, typedArgs.name, typedArgs.description);

    if (!result.ok) {
      if (result.error.type === 'ALREADY_EXISTS') {
        return {
          ok: false,
          error: {
            code: 'ALREADY_EXISTS',
            message: `Spec already exists: ${result.error.name}`,
          },
        };
      }
      if (result.error.type === 'INVALID_NAME') {
        return {
          ok: false,
          error: {
            code: 'INVALID_NAME',
            message: `Invalid spec name: ${result.error.name}. Must contain only lowercase letters, numbers, and hyphens.`,
          },
        };
      }
      return {
        ok: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: `Failed to create spec: ${typedArgs.name}`,
        },
      };
    }

    return {
      ok: true,
      content: [
        {
          type: 'text',
          text: `Spec '${typedArgs.name}' created successfully`,
        },
      ],
    };
  };

  /**
   * Get tool registration for spec_create
   * Requirements: 3.6, 3.7
   *
   * @returns Tool registration object for McpToolRegistry
   */
  createToolRegistration(): ToolRegistration {
    return {
      name: 'spec_create',
      description: 'Create a new spec with the given name and optional description',
      inputSchema: specCreateSchema,
      handler: this.createToolHandler,
      requiresProject: true,
    };
  }

  // =============================================================================
  // Task 4.2: spec_approve
  // Requirements: 3.8, 3.9
  // =============================================================================

  /**
   * Approve a spec phase
   * Requirements: 3.8 - spec_approve
   * Requirements: 3.9 - all phases approval support
   *
   * @param projectPath - Project path
   * @param name - Spec name
   * @param phase - Phase to approve
   * @returns Success or error
   */
  async approve(
    projectPath: string,
    name: string,
    phase: ApprovalPhase
  ): Promise<{ ok: true; value: void } | { ok: false; error: SpecError }> {
    if (!this.fileService) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    // Resolve spec path
    const pathResult = await this.fileService.resolveSpecPath(projectPath, name);
    if (!pathResult.ok) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    const specPath = pathResult.value;

    // Update approval status
    const result = await this.fileService.updateApproval(specPath, phase as Phase, true);

    if (!result.ok) {
      // Check if phase not generated
      if (result.error.type === 'INVALID_PATH' && result.error.reason?.includes('phase has not been generated')) {
        return {
          ok: false,
          error: { type: 'PHASE_NOT_GENERATED', name, phase },
        };
      }
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    return { ok: true, value: undefined };
  }

  /**
   * MCP tool handler for spec_approve
   * Requirements: 3.8, 3.9
   *
   * @param args - Tool arguments (name, phase)
   * @param projectPath - Project path
   * @returns MCP tool result
   */
  approveToolHandler: ToolHandler = async (
    args: unknown,
    projectPath?: string
  ): Promise<McpToolResult> => {
    if (!projectPath) {
      return {
        ok: false,
        error: {
          code: 'NO_PROJECT_SELECTED',
          message: 'Project path is required for spec_approve',
        },
      };
    }

    const typedArgs = args as { name: string; phase: ApprovalPhase };
    const result = await this.approve(projectPath, typedArgs.name, typedArgs.phase);

    if (!result.ok) {
      if (result.error.type === 'NOT_FOUND') {
        return {
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: `Spec not found: ${result.error.name}`,
          },
        };
      }
      if (result.error.type === 'PHASE_NOT_GENERATED') {
        return {
          ok: false,
          error: {
            code: 'PHASE_NOT_GENERATED',
            message: `Cannot approve ${result.error.phase}: phase has not been generated yet for spec ${result.error.name}`,
          },
        };
      }
      return {
        ok: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: `Failed to approve spec: ${typedArgs.name}`,
        },
      };
    }

    return {
      ok: true,
      content: [
        {
          type: 'text',
          text: `Phase '${typedArgs.phase}' approved for spec '${typedArgs.name}'`,
        },
      ],
    };
  };

  /**
   * Get tool registration for spec_approve
   * Requirements: 3.8, 3.9
   *
   * @returns Tool registration object for McpToolRegistry
   */
  approveToolRegistration(): ToolRegistration {
    return {
      name: 'spec_approve',
      description: 'Approve a phase (requirements, design, or tasks) for a spec',
      inputSchema: specApproveSchema,
      handler: this.approveToolHandler,
      requiresProject: true,
    };
  }

  // =============================================================================
  // Task 4.3: spec_start_execution
  // Requirements: 3.10
  // =============================================================================

  /**
   * Start auto-execution for a spec
   * Requirements: 3.10 - spec_start_execution
   *
   * @param projectPath - Project path
   * @param name - Spec name
   * @returns Success or error
   */
  async startExecution(
    projectPath: string,
    name: string
  ): Promise<{ ok: true; value: void } | { ok: false; error: SpecError }> {
    if (!this.fileService) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    if (!this.autoExecutionCoordinator) {
      return {
        ok: false,
        error: { type: 'EXECUTION_FAILED', name, message: 'AutoExecutionCoordinator not initialized' },
      };
    }

    // Resolve spec path
    const pathResult = await this.fileService.resolveSpecPath(projectPath, name);
    if (!pathResult.ok) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    const specPath = pathResult.value;

    // Read spec.json to get autoExecution settings
    const specJsonResult = await this.fileService.readSpecJson(specPath);
    if (!specJsonResult.ok) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    const specJson = specJsonResult.value;

    // Check if autoExecution is enabled
    if (!specJson.autoExecution?.enabled) {
      return {
        ok: false,
        error: { type: 'EXECUTION_NOT_ENABLED', name },
      };
    }

    // Start auto-execution with settings from spec.json
    const result = await this.autoExecutionCoordinator.start(
      specPath,
      name,
      {
        permissions: specJson.autoExecution.permissions ?? {
          requirements: true,
          design: true,
          tasks: true,
          impl: true,
          inspection: true,
          deploy: false,
        },
        documentReviewFlag: specJson.autoExecution.documentReviewFlag ?? 'run',
        approvals: specJson.approvals,
      }
    );

    if (!result.ok) {
      return {
        ok: false,
        error: { type: 'EXECUTION_FAILED', name, message: result.error.type },
      };
    }

    return { ok: true, value: undefined };
  }

  /**
   * MCP tool handler for spec_start_execution
   * Requirements: 3.10
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
          message: 'Project path is required for spec_start_execution',
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
            message: `Spec not found: ${result.error.name}`,
          },
        };
      }
      if (result.error.type === 'EXECUTION_NOT_ENABLED') {
        return {
          ok: false,
          error: {
            code: 'EXECUTION_NOT_ENABLED',
            message: `Auto-execution is not enabled for spec: ${result.error.name}`,
          },
        };
      }
      return {
        ok: false,
        error: {
          code: 'EXECUTION_FAILED',
          message: `Failed to start execution: ${'message' in result.error ? result.error.message : 'Unknown error'}`,
        },
      };
    }

    return {
      ok: true,
      content: [
        {
          type: 'text',
          text: `Auto-execution started for spec '${typedArgs.name}'`,
        },
      ],
    };
  };

  /**
   * Get tool registration for spec_start_execution
   * Requirements: 3.10
   *
   * @returns Tool registration object for McpToolRegistry
   */
  startExecutionToolRegistration(): ToolRegistration {
    return {
      name: 'spec_start_execution',
      description: 'Start auto-execution for a spec',
      inputSchema: specStartExecutionSchema,
      handler: this.startExecutionToolHandler,
      requiresProject: true,
    };
  }

  // =============================================================================
  // Task 4.3: spec_stop_execution
  // Requirements: 3.11
  // =============================================================================

  /**
   * Stop auto-execution for a spec
   * Requirements: 3.11 - spec_stop_execution
   *
   * @param projectPath - Project path
   * @param name - Spec name
   * @returns Success or error
   */
  async stopExecution(
    projectPath: string,
    name: string
  ): Promise<{ ok: true; value: void } | { ok: false; error: SpecError }> {
    if (!this.fileService) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    if (!this.autoExecutionCoordinator) {
      return {
        ok: false,
        error: { type: 'EXECUTION_FAILED', name, message: 'AutoExecutionCoordinator not initialized' },
      };
    }

    // Resolve spec path
    const pathResult = await this.fileService.resolveSpecPath(projectPath, name);
    if (!pathResult.ok) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    const specPath = pathResult.value;

    // Stop auto-execution
    const result = await this.autoExecutionCoordinator.stop(specPath);

    if (!result.ok) {
      if (result.error.type === 'NOT_EXECUTING') {
        return {
          ok: false,
          error: { type: 'NOT_EXECUTING', name },
        };
      }
      return {
        ok: false,
        error: { type: 'EXECUTION_FAILED', name, message: result.error.type },
      };
    }

    return { ok: true, value: undefined };
  }

  /**
   * MCP tool handler for spec_stop_execution
   * Requirements: 3.11
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
          message: 'Project path is required for spec_stop_execution',
        },
      };
    }

    const typedArgs = args as { name: string };
    const result = await this.stopExecution(projectPath, typedArgs.name);

    if (!result.ok) {
      if (result.error.type === 'NOT_FOUND') {
        return {
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: `Spec not found: ${result.error.name}`,
          },
        };
      }
      if (result.error.type === 'NOT_EXECUTING') {
        return {
          ok: false,
          error: {
            code: 'NOT_EXECUTING',
            message: `Spec is not executing: ${result.error.name}`,
          },
        };
      }
      return {
        ok: false,
        error: {
          code: 'EXECUTION_FAILED',
          message: `Failed to stop execution: ${'message' in result.error ? result.error.message : 'Unknown error'}`,
        },
      };
    }

    return {
      ok: true,
      content: [
        {
          type: 'text',
          text: `Auto-execution stopped for spec '${typedArgs.name}'`,
        },
      ],
    };
  };

  /**
   * Get tool registration for spec_stop_execution
   * Requirements: 3.11
   *
   * @returns Tool registration object for McpToolRegistry
   */
  stopExecutionToolRegistration(): ToolRegistration {
    return {
      name: 'spec_stop_execution',
      description: 'Stop auto-execution for a spec',
      inputSchema: specStopExecutionSchema,
      handler: this.stopExecutionToolHandler,
      requiresProject: true,
    };
  }

  // =============================================================================
  // Task 4.3: spec_get_execution_status
  // Requirements: 3.12
  // =============================================================================

  /**
   * Get auto-execution status for a spec
   * Requirements: 3.12 - spec_get_execution_status
   *
   * @param projectPath - Project path
   * @param name - Spec name
   * @returns Execution status or null if not executing, or error
   */
  async getExecutionStatus(
    projectPath: string,
    name: string
  ): Promise<{ ok: true; value: AutoExecutionState | null } | { ok: false; error: SpecError }> {
    if (!this.fileService) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    if (!this.autoExecutionCoordinator) {
      return {
        ok: false,
        error: { type: 'EXECUTION_FAILED', name, message: 'AutoExecutionCoordinator not initialized' },
      };
    }

    // Resolve spec path
    const pathResult = await this.fileService.resolveSpecPath(projectPath, name);
    if (!pathResult.ok) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', name },
      };
    }

    const specPath = pathResult.value;

    // Get execution status
    const status = this.autoExecutionCoordinator.getStatus(specPath);

    return { ok: true, value: status };
  }

  /**
   * MCP tool handler for spec_get_execution_status
   * Requirements: 3.12
   *
   * @param args - Tool arguments (name)
   * @param projectPath - Project path
   * @returns MCP tool result with execution status JSON
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
          message: 'Project path is required for spec_get_execution_status',
        },
      };
    }

    const typedArgs = args as { name: string };
    const result = await this.getExecutionStatus(projectPath, typedArgs.name);

    if (!result.ok) {
      if (result.error.type === 'NOT_FOUND') {
        return {
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: `Spec not found: ${result.error.name}`,
          },
        };
      }
      return {
        ok: false,
        error: {
          code: 'EXECUTION_FAILED',
          message: `Failed to get execution status: ${'message' in result.error ? result.error.message : 'Unknown error'}`,
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
   * Get tool registration for spec_get_execution_status
   * Requirements: 3.12
   *
   * @returns Tool registration object for McpToolRegistry
   */
  getExecutionStatusToolRegistration(): ToolRegistration {
    return {
      name: 'spec_get_execution_status',
      description: 'Get auto-execution status for a spec',
      inputSchema: specGetExecutionStatusSchema,
      handler: this.getExecutionStatusToolHandler,
      requiresProject: true,
    };
  }

  // =============================================================================
  // Task 4.4: spec_agent_stop
  // Requirements: 3.13
  // =============================================================================

  /**
   * Stop all running agents for a spec
   * Requirements: 3.13 - spec_agent_stop
   *
   * @param name - Spec name
   * @returns Success or error
   */
  async stopAgent(
    name: string
  ): Promise<{ ok: true; value: { stoppedCount: number } } | { ok: false; error: SpecError }> {
    if (!this.specManagerService) {
      return {
        ok: false,
        error: { type: 'AGENT_NOT_FOUND', name },
      };
    }

    // Get all agents and find running agents for this spec
    const allAgentsMap = await this.specManagerService.getAllAgents();
    const specAgents = allAgentsMap.get(name) || [];
    const runningAgents = specAgents.filter((agent) => agent.status === 'running');

    if (runningAgents.length === 0) {
      return {
        ok: false,
        error: { type: 'AGENT_NOT_FOUND', name },
      };
    }

    // Stop all running agents
    let stoppedCount = 0;
    for (const agent of runningAgents) {
      const result = await this.specManagerService.stopAgent(agent.agentId);
      if (result.ok) {
        stoppedCount++;
      }
    }

    return { ok: true, value: { stoppedCount } };
  }

  /**
   * MCP tool handler for spec_agent_stop
   * Requirements: 3.13
   *
   * @param args - Tool arguments (name)
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
          message: 'Project path is required for spec_agent_stop',
        },
      };
    }

    const typedArgs = args as { name: string };
    const result = await this.stopAgent(typedArgs.name);

    if (!result.ok) {
      if (result.error.type === 'AGENT_NOT_FOUND') {
        return {
          ok: false,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `No running agents found for spec: ${result.error.name}`,
          },
        };
      }
      return {
        ok: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: `Failed to stop agents for spec: ${typedArgs.name}`,
        },
      };
    }

    return {
      ok: true,
      content: [
        {
          type: 'text',
          text: `Agents stopped for spec '${typedArgs.name}' (${result.value.stoppedCount} agent(s) stopped)`,
        },
      ],
    };
  };

  /**
   * Get tool registration for spec_agent_stop
   * Requirements: 3.13
   *
   * @returns Tool registration object for McpToolRegistry
   */
  stopAgentToolRegistration(): ToolRegistration {
    return {
      name: 'spec_agent_stop',
      description: 'Stop all running agents for a spec',
      inputSchema: specAgentStopSchema,
      handler: this.stopAgentToolHandler,
      requiresProject: true,
    };
  }

  // =============================================================================
  // Task 4.4: spec_agent_get_logs
  // Requirements: 3.14
  // =============================================================================

  /**
   * Get agent logs for a spec
   * Requirements: 3.14 - spec_agent_get_logs
   *
   * @param name - Spec name
   * @param lines - Optional limit on number of log lines (from the end)
   * @returns Log entries or error
   */
  async getAgentLogs(
    name: string,
    lines?: number
  ): Promise<{ ok: true; value: LogEntry[] } | { ok: false; error: SpecError }> {
    if (!this.specManagerService || !this.logFileService) {
      return {
        ok: false,
        error: { type: 'AGENT_NOT_FOUND', name },
      };
    }

    // Get all agents and find agents for this spec
    const allAgentsMap = await this.specManagerService.getAllAgents();
    const specAgents = allAgentsMap.get(name) || [];

    if (specAgents.length === 0) {
      return {
        ok: false,
        error: { type: 'AGENT_NOT_FOUND', name },
      };
    }

    // Get logs for the most recent agent (or the first running one)
    const runningAgent = specAgents.find((a) => a.status === 'running');
    const targetAgent = runningAgent || specAgents[specAgents.length - 1];

    // Read logs using logFileService
    const logEntries = await this.logFileService.readLog(name, targetAgent.agentId);

    // Apply line limit if specified (return last N lines)
    if (lines !== undefined && lines > 0 && logEntries.length > lines) {
      return {
        ok: true,
        value: logEntries.slice(-lines),
      };
    }

    return { ok: true, value: logEntries };
  }

  /**
   * MCP tool handler for spec_agent_get_logs
   * Requirements: 3.14
   *
   * @param args - Tool arguments (name, lines?)
   * @param projectPath - Project path
   * @returns MCP tool result with JSON-formatted log entries
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
          message: 'Project path is required for spec_agent_get_logs',
        },
      };
    }

    const typedArgs = args as { name: string; lines?: number };
    const result = await this.getAgentLogs(typedArgs.name, typedArgs.lines);

    if (!result.ok) {
      if (result.error.type === 'AGENT_NOT_FOUND') {
        return {
          ok: false,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `No agents found for spec: ${result.error.name}`,
          },
        };
      }
      return {
        ok: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: `Failed to get logs for spec: ${typedArgs.name}`,
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
   * Get tool registration for spec_agent_get_logs
   * Requirements: 3.14
   *
   * @returns Tool registration object for McpToolRegistry
   */
  getAgentLogsToolRegistration(): ToolRegistration {
    return {
      name: 'spec_agent_get_logs',
      description: 'Get agent logs for a spec. Returns logs from the most recent or running agent.',
      inputSchema: specAgentGetLogsSchema,
      handler: this.getAgentLogsToolHandler,
      requiresProject: true,
    };
  }

  /**
   * Get all tool registrations
   * Returns registrations for spec_get, spec_get_artifact, spec_create, spec_approve,
   * spec_start_execution, spec_stop_execution, spec_get_execution_status,
   * spec_agent_stop, and spec_agent_get_logs
   *
   * @returns Array of tool registration objects
   */
  getAllToolRegistrations(): ToolRegistration[] {
    return [
      this.getToolRegistration(),
      this.getArtifactToolRegistration(),
      this.createToolRegistration(),
      this.approveToolRegistration(),
      this.startExecutionToolRegistration(),
      this.stopExecutionToolRegistration(),
      this.getExecutionStatusToolRegistration(),
      this.stopAgentToolRegistration(),
      this.getAgentLogsToolRegistration(),
    ];
  }
}
