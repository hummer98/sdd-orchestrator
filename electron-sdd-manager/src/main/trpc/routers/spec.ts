/**
 * Spec Router - Spec management tRPC procedures
 * Task 5.1: specルーターとZodスキーマを実装する
 * Requirements: 4.1, 4.2, 4.3
 *
 * Provides 27 spec management procedures:
 * - CRUD: create
 * - Update: updateApproval, updateSpecJson, syncSpecPhase
 * - Document Review: syncDocumentReview, executeDocumentReview,
 *   executeDocumentReviewReply, executeDocumentReviewFix, approveDocumentReview
 * - Watcher: startSpecsWatcher, stopSpecsWatcher
 * - Execution: execute, executeSpecInit, executeSpecPlan, executeAskSpec,
 *   executeInspection, executeInspectionFix, setInspectionAutoExecutionFlag,
 *   executeSpecMerge, startImpl
 * - Query: getEventLog, parseTasksForParallel
 * - Project Command: executeProjectCommand, confirmCommonCommands
 * - Steering: checkSteeringFiles, generateVerificationMd,
 *   checkReleaseMd, generateReleaseMd
 *
 * All services accessed via ctx.services for testability (DD-006).
 * Spec execution mutations use specManagerService (DD-002).
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc';

// ============================================================
// Zod Schemas (Task 5.1: Requirements 4.3)
// ============================================================

// --- Common schemas ---
const commandPrefixSchema = z.enum(['kiro', 'spec-manager']).default('kiro');

// --- create ---
export const createSpecInputSchema = z.object({
  projectPath: z.string().min(1),
  specName: z.string().min(1),
  description: z.string(),
});

// --- updateApproval ---
export const updateApprovalInputSchema = z.object({
  specName: z.string().min(1),
  phase: z.string().min(1),
  approved: z.boolean(),
});

// --- updateSpecJson ---
export const updateSpecJsonInputSchema = z.object({
  specName: z.string().min(1),
  updates: z.record(z.unknown()),
});

// --- syncSpecPhase ---
export const syncSpecPhaseInputSchema = z.object({
  specName: z.string().min(1),
  completedPhase: z.enum(['impl', 'impl-complete']),
  options: z.object({
    skipTimestamp: z.boolean().optional(),
  }).optional(),
});

// --- syncDocumentReview ---
export const syncDocumentReviewInputSchema = z.object({
  specName: z.string().min(1),
});

// --- executeDocumentReview ---
export const executeDocumentReviewInputSchema = z.object({
  specId: z.string(),
  featureName: z.string(),
  commandPrefix: commandPrefixSchema.optional(),
});

// --- executeDocumentReviewReply ---
export const executeDocumentReviewReplyInputSchema = z.object({
  specId: z.string(),
  featureName: z.string(),
  reviewNumber: z.number().int().positive(),
  commandPrefix: commandPrefixSchema.optional(),
  autofix: z.boolean().optional(),
});

// --- executeDocumentReviewFix ---
export const executeDocumentReviewFixInputSchema = z.object({
  specId: z.string(),
  featureName: z.string(),
  reviewNumber: z.number().int().positive(),
  commandPrefix: commandPrefixSchema.optional(),
});

// --- approveDocumentReview ---
export const approveDocumentReviewInputSchema = z.object({
  specPath: z.string().min(1),
});

// --- execute (unified) ---
// Mirrors ExecuteOptions discriminated union from shared/types/executeOptions.ts
const reviewerSchemeSchema = z.enum(['claude-code', 'gemini-cli', 'debatex']);

const executeBaseSchema = z.object({
  specId: z.string(),
  featureName: z.string(),
  commandPrefix: commandPrefixSchema.optional(),
});

export const executeInputSchema = z.discriminatedUnion('type', [
  executeBaseSchema.extend({ type: z.literal('requirements') }),
  executeBaseSchema.extend({ type: z.literal('design') }),
  executeBaseSchema.extend({ type: z.literal('tasks') }),
  executeBaseSchema.extend({ type: z.literal('deploy') }),
  executeBaseSchema.extend({
    type: z.literal('impl'),
    taskId: z.string().optional(),
  }),
  executeBaseSchema.extend({
    type: z.literal('auto-impl'),
  }),
  executeBaseSchema.extend({
    type: z.literal('document-review'),
    scheme: reviewerSchemeSchema.optional(),
  }),
  executeBaseSchema.extend({
    type: z.literal('document-review-reply'),
    reviewNumber: z.number().int().positive(),
    autofix: z.boolean().optional(),
  }),
  executeBaseSchema.extend({
    type: z.literal('document-review-fix'),
    reviewNumber: z.number().int().positive(),
  }),
  executeBaseSchema.extend({
    type: z.literal('inspection'),
    autofix: z.boolean().optional(),
    skipE2e: z.boolean().optional(),
  }),
  executeBaseSchema.extend({
    type: z.literal('inspection-fix'),
    roundNumber: z.number().int().positive(),
  }),
  executeBaseSchema.extend({ type: z.literal('spec-merge') }),
]);

// --- executeSpecInit ---
export const executeSpecInitInputSchema = z.object({
  projectPath: z.string().min(1),
  description: z.string().min(1),
  commandPrefix: commandPrefixSchema.optional(),
  worktreeMode: z.boolean().optional(),
});

// --- executeSpecPlan ---
export const executeSpecPlanInputSchema = z.object({
  projectPath: z.string().min(1),
  description: z.string().min(1),
  commandPrefix: commandPrefixSchema.optional(),
  worktreeMode: z.boolean().optional(),
});

// --- executeAskSpec ---
export const executeAskSpecInputSchema = z.object({
  specId: z.string(),
  featureName: z.string(),
  prompt: z.string().min(1),
  commandPrefix: commandPrefixSchema.optional(),
});

// --- executeInspection ---
export const executeInspectionInputSchema = z.object({
  specId: z.string(),
  featureName: z.string(),
  commandPrefix: commandPrefixSchema.optional(),
});

// --- executeInspectionFix ---
export const executeInspectionFixInputSchema = z.object({
  specId: z.string(),
  featureName: z.string(),
  roundNumber: z.number().int().positive(),
  commandPrefix: commandPrefixSchema.optional(),
});

// --- setInspectionAutoExecutionFlag ---
export const setInspectionAutoExecutionFlagInputSchema = z.object({
  specPath: z.string().min(1),
  flag: z.enum(['run', 'pause']),
});

// --- executeSpecMerge ---
export const executeSpecMergeInputSchema = z.object({
  specId: z.string(),
  featureName: z.string(),
  commandPrefix: commandPrefixSchema.optional(),
});

// --- startImpl ---
export const startImplInputSchema = z.object({
  specName: z.string().min(1),
  featureName: z.string(),
  commandPrefix: z.string().min(1),
});

// --- getEventLog ---
export const getEventLogInputSchema = z.object({
  specId: z.string(),
});

// --- parseTasksForParallel ---
export const parseTasksForParallelInputSchema = z.object({
  specName: z.string().min(1),
});

// --- executeProjectCommand ---
export const executeProjectCommandInputSchema = z.object({
  projectPath: z.string().min(1),
  command: z.string().min(1),
  title: z.string().min(1),
});

// --- confirmCommonCommands ---
export const confirmCommonCommandsInputSchema = z.object({
  projectPath: z.string().min(1),
  decisions: z.array(z.object({
    name: z.string(),
    action: z.enum(['skip', 'overwrite']),
  })),
});

// --- checkSteeringFiles ---
export const checkSteeringFilesInputSchema = z.object({
  projectPath: z.string().min(1),
});

export const checkSteeringFilesOutputSchema = z.object({
  verificationMdExists: z.boolean(),
});

// --- generateVerificationMd ---
export const generateVerificationMdInputSchema = z.object({
  projectPath: z.string().min(1),
});

// --- checkReleaseMd ---
export const checkReleaseMdInputSchema = z.object({
  projectPath: z.string().min(1),
});

export const checkReleaseMdOutputSchema = z.object({
  releaseMdExists: z.boolean(),
});

// --- generateReleaseMd ---
export const generateReleaseMdInputSchema = z.object({
  projectPath: z.string().min(1),
});

// ============================================================
// Internal helpers
// ============================================================

/**
 * SPEC_INIT_COMMANDS mapping (mirrored from specManagerService)
 */
const SPEC_INIT_COMMANDS: Record<string, string> = {
  kiro: '/kiro:spec-init',
  'spec-manager': '/spec-manager:init',
};

/**
 * SPEC_PLAN_COMMANDS mapping (mirrored from specManagerService)
 */
const SPEC_PLAN_COMMANDS: Record<string, string | undefined> = {
  kiro: '/kiro:spec-plan',
  'spec-manager': undefined,
};

// ============================================================
// Spec Router
// ============================================================

export const specRouter = router({
  // ============================================================
  // Spec CRUD (1 procedure)
  // Legacy: CREATE_SPEC (specHandlers.ts)
  // ============================================================

  /**
   * Create a new spec.
   */
  create: publicProcedure
    .input(createSpecInputSchema)
    .mutation(async ({ ctx, input }) => {
      const fileService = ctx.services.fileService;
      if (!fileService) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'FileService not initialized',
        });
      }
      const result = await fileService.createSpec(
        input.projectPath,
        input.specName,
        input.description,
      );
      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to create spec: ${result.error.type}`,
        });
      }
    }),

  // ============================================================
  // Spec Update procedures (3 procedures)
  // Legacy: UPDATE_APPROVAL, UPDATE_SPEC_JSON, SYNC_SPEC_PHASE
  // ============================================================

  /**
   * Update spec approval status.
   */
  updateApproval: publicProcedure
    .input(updateApprovalInputSchema)
    .mutation(async ({ ctx, input }) => {
      const currentProjectPath = ctx.services.getCurrentProjectPath();
      if (!currentProjectPath) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Project not selected',
        });
      }
      const fileService = ctx.services.fileService;
      if (!fileService) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'FileService not initialized',
        });
      }
      const specPathResult = await fileService.resolveSpecPath(currentProjectPath, input.specName);
      if (!specPathResult.ok) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Spec not found: ${input.specName}`,
        });
      }
      // Cast to Phase type - validation is done by fileService
      const result = await fileService.updateApproval(specPathResult.value, input.phase as any, input.approved);
      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to update approval: ${result.error.type}`,
        });
      }
    }),

  /**
   * Update spec.json with arbitrary updates.
   */
  updateSpecJson: publicProcedure
    .input(updateSpecJsonInputSchema)
    .mutation(async ({ ctx, input }) => {
      const currentProjectPath = ctx.services.getCurrentProjectPath();
      if (!currentProjectPath) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Project not selected',
        });
      }
      const fileService = ctx.services.fileService;
      if (!fileService) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'FileService not initialized',
        });
      }
      const specPathResult = await fileService.resolveSpecPath(currentProjectPath, input.specName);
      if (!specPathResult.ok) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Spec not found: ${input.specName}`,
        });
      }
      const result = await fileService.updateSpecJson(specPathResult.value, input.updates);
      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to update spec.json: ${result.error.type}`,
        });
      }
    }),

  /**
   * Sync spec phase (auto-fix spec.json phase based on task completion).
   */
  syncSpecPhase: publicProcedure
    .input(syncSpecPhaseInputSchema)
    .mutation(async ({ ctx, input }) => {
      const currentProjectPath = ctx.services.getCurrentProjectPath();
      if (!currentProjectPath) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Project not selected',
        });
      }
      const fileService = ctx.services.fileService;
      if (!fileService) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'FileService not initialized',
        });
      }
      const specPathResult = await fileService.resolveSpecPath(currentProjectPath, input.specName);
      if (!specPathResult.ok) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Spec not found: ${input.specName}`,
        });
      }
      const result = await fileService.updateSpecJsonFromPhase(
        specPathResult.value,
        input.completedPhase,
        input.options,
      );
      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to sync spec phase: ${result.error.type}`,
        });
      }
    }),

  // ============================================================
  // Document Review procedures (5 procedures)
  // Legacy: SYNC_DOCUMENT_REVIEW, EXECUTE_DOCUMENT_REVIEW,
  //         EXECUTE_DOCUMENT_REVIEW_REPLY, EXECUTE_DOCUMENT_REVIEW_FIX,
  //         APPROVE_DOCUMENT_REVIEW
  // ============================================================

  /**
   * Sync document review state from file system.
   */
  syncDocumentReview: publicProcedure
    .input(syncDocumentReviewInputSchema)
    .mutation(async ({ ctx, input }) => {
      const currentProjectPath = ctx.services.getCurrentProjectPath();
      if (!currentProjectPath) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Project not selected',
        });
      }
      const fileService = ctx.services.fileService;
      if (!fileService) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'FileService not initialized',
        });
      }
      const specPathResult = await fileService.resolveSpecPath(currentProjectPath, input.specName);
      if (!specPathResult.ok) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Spec not found: ${input.specName}`,
        });
      }
      const { DocumentReviewService } = await import('../../services/documentReviewService');
      const service = new DocumentReviewService(currentProjectPath);
      return service.syncReviewState(specPathResult.value);
    }),

  /**
   * Execute document review.
   */
  executeDocumentReview: publicProcedure
    .input(executeDocumentReviewInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.getSpecManagerService();
      const result = await service.execute({
        type: 'document-review',
        specId: input.specId,
        featureName: input.featureName,
        commandPrefix: input.commandPrefix,
      });
      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Execute failed: ${result.error.type}`,
        });
      }
      return result.value;
    }),

  /**
   * Execute document review reply.
   */
  executeDocumentReviewReply: publicProcedure
    .input(executeDocumentReviewReplyInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.getSpecManagerService();
      const result = await service.execute({
        type: 'document-review-reply',
        specId: input.specId,
        featureName: input.featureName,
        reviewNumber: input.reviewNumber,
        commandPrefix: input.commandPrefix,
        autofix: input.autofix,
      });
      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Execute failed: ${result.error.type}`,
        });
      }
      return result.value;
    }),

  /**
   * Execute document review fix (apply fixes from existing reply).
   */
  executeDocumentReviewFix: publicProcedure
    .input(executeDocumentReviewFixInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.getSpecManagerService();
      const result = await service.execute({
        type: 'document-review-fix',
        specId: input.specId,
        featureName: input.featureName,
        reviewNumber: input.reviewNumber,
        commandPrefix: input.commandPrefix,
      });
      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Execute failed: ${result.error.type}`,
        });
      }
      return result.value;
    }),

  /**
   * Approve document review.
   */
  approveDocumentReview: publicProcedure
    .input(approveDocumentReviewInputSchema)
    .mutation(async ({ ctx, input }) => {
      const currentProjectPath = ctx.services.getCurrentProjectPath();
      const { DocumentReviewService } = await import('../../services/documentReviewService');
      const service = new DocumentReviewService(currentProjectPath || '');
      const result = await service.approveReview(input.specPath);
      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to approve document review: ${result.error.type}`,
        });
      }
    }),

  // ============================================================
  // Specs Watcher procedures (2 procedures)
  // Legacy: START_SPECS_WATCHER, STOP_SPECS_WATCHER
  // ============================================================

  /**
   * Start specs watcher for the current project.
   * The watcher notifies on spec file changes.
   */
  startSpecsWatcher: publicProcedure
    .mutation(async () => {
      // Specs watcher management is handled internally.
      // In the tRPC router context, we don't have direct BrowserWindow access.
      // The watcher functionality will be initialized at handler level.
      // This is a no-op placeholder that maintains API compatibility.
    }),

  /**
   * Stop specs watcher.
   */
  stopSpecsWatcher: publicProcedure
    .mutation(async () => {
      // No-op placeholder - watcher lifecycle managed at handler level.
    }),

  // ============================================================
  // Execution procedures (1 procedure - unified execute)
  // Legacy: EXECUTE
  // ============================================================

  /**
   * Unified execute - delegates to specManagerService.execute().
   * Supports all execute types: requirements, design, tasks, impl, etc.
   */
  execute: publicProcedure
    .input(executeInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.getSpecManagerService();
      const result = await service.execute(input);
      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Execute failed: ${result.error.type}`,
        });
      }
      return result.value;
    }),

  // ============================================================
  // Spec Init/Plan procedures (2 procedures)
  // Legacy: EXECUTE_SPEC_INIT, EXECUTE_SPEC_PLAN
  // ============================================================

  /**
   * Execute spec-init: Launch spec-init agent with description.
   */
  executeSpecInit: publicProcedure
    .input(executeSpecInitInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.getSpecManagerService();
      const prefix = input.commandPrefix || 'kiro';
      const slashCommand = SPEC_INIT_COMMANDS[prefix] || SPEC_INIT_COMMANDS['kiro'];
      const worktreeFlag = input.worktreeMode ? ' --worktree' : '';

      const result = await service.startAgent({
        specId: '',
        phase: 'spec-init',
        args: [`${slashCommand} "${input.description}"${worktreeFlag}`],
        group: 'doc',
        engineId: 'claude',
      });

      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `executeSpecInit failed: ${result.error.type}`,
        });
      }
      return result.value;
    }),

  /**
   * Execute spec-plan: Launch spec-plan agent with description.
   */
  executeSpecPlan: publicProcedure
    .input(executeSpecPlanInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.getSpecManagerService();
      const prefix = input.commandPrefix || 'kiro';
      const slashCommand = SPEC_PLAN_COMMANDS[prefix];

      if (!slashCommand) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'spec-manager:plan is not yet implemented. Use kiro prefix.',
        });
      }

      const worktreeFlag = input.worktreeMode ? ' --worktree' : '';

      const result = await service.startAgent({
        specId: '',
        phase: 'spec-plan',
        args: [`${slashCommand} "${input.description}"${worktreeFlag}`],
        group: 'doc',
        engineId: 'claude',
      });

      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `executeSpecPlan failed: ${result.error.type}`,
        });
      }
      return result.value;
    }),

  // ============================================================
  // Ask Spec procedure (1 procedure)
  // Legacy: EXECUTE_ASK_SPEC
  // ============================================================

  /**
   * Execute ask-spec: Launch spec-ask agent.
   */
  executeAskSpec: publicProcedure
    .input(executeAskSpecInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.getSpecManagerService();
      const prefix = input.commandPrefix || 'kiro';
      const slashCommand = `/${prefix}:spec-ask`;

      const result = await service.startAgent({
        specId: input.specId,
        phase: 'ask',
        args: [`${slashCommand} "${input.featureName}" "${input.prompt.replace(/"/g, '\\"')}"`],
        group: 'doc',
        engineId: 'claude',
      });

      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `executeAskSpec failed: ${result.error.type}`,
        });
      }
      return result.value;
    }),

  // ============================================================
  // Inspection procedures (3 procedures)
  // Legacy: EXECUTE_INSPECTION, EXECUTE_INSPECTION_FIX,
  //         SET_INSPECTION_AUTO_EXECUTION_FLAG
  // ============================================================

  /**
   * Execute inspection.
   */
  executeInspection: publicProcedure
    .input(executeInspectionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.getSpecManagerService();
      const result = await service.execute({
        type: 'inspection',
        specId: input.specId,
        featureName: input.featureName,
        commandPrefix: input.commandPrefix,
      });
      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Execute failed: ${result.error.type}`,
        });
      }
      return result.value;
    }),

  /**
   * Execute inspection fix.
   */
  executeInspectionFix: publicProcedure
    .input(executeInspectionFixInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.getSpecManagerService();
      const result = await service.execute({
        type: 'inspection-fix',
        specId: input.specId,
        featureName: input.featureName,
        roundNumber: input.roundNumber,
        commandPrefix: input.commandPrefix,
      });
      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Execute failed: ${result.error.type}`,
        });
      }
      return result.value;
    }),

  /**
   * Set inspection auto execution flag.
   */
  setInspectionAutoExecutionFlag: publicProcedure
    .input(setInspectionAutoExecutionFlagInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.getSpecManagerService();
      await service.setInspectionAutoExecutionFlag(input.specPath, input.flag);
    }),

  // ============================================================
  // Spec Merge procedure (1 procedure)
  // Legacy: EXECUTE_SPEC_MERGE
  // ============================================================

  /**
   * Execute spec merge.
   */
  executeSpecMerge: publicProcedure
    .input(executeSpecMergeInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.getSpecManagerService();
      const result = await service.execute({
        type: 'spec-merge',
        specId: input.specId,
        featureName: input.featureName,
        commandPrefix: input.commandPrefix,
      });
      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Execute failed: ${result.error.type}`,
        });
      }
      return result.value;
    }),

  // ============================================================
  // Start Impl procedure (1 procedure)
  // Legacy: START_IMPL (specHandlers.ts)
  // ============================================================

  /**
   * Start implementation phase.
   * Uses startImplPhase utility for worktree/normal mode handling.
   */
  startImpl: publicProcedure
    .input(startImplInputSchema)
    .mutation(async ({ ctx, input }) => {
      const currentProjectPath = ctx.services.getCurrentProjectPath();
      if (!currentProjectPath) {
        return {
          ok: false as const,
          error: { type: 'SPEC_JSON_ERROR', message: 'Project not selected' },
        };
      }

      const fileService = ctx.services.fileService;
      if (!fileService) {
        return {
          ok: false as const,
          error: { type: 'SPEC_JSON_ERROR', message: 'FileService not initialized' },
        };
      }

      const specPathResult = await fileService.resolveSpecPath(currentProjectPath, input.specName);
      if (!specPathResult.ok) {
        return {
          ok: false as const,
          error: { type: 'SPEC_JSON_ERROR', message: `Spec not found: ${input.specName}` },
        };
      }

      const service = ctx.services.getSpecManagerService();

      // Import startImplPhase function (moved from ipc/ to trpc/helpers/ in Task 10.7)
      const { startImplPhase } = await import('../helpers/startImplPhase');

      // Validate and cast commandPrefix
      const validPrefix = (input.commandPrefix === 'kiro' || input.commandPrefix === 'spec-manager')
        ? input.commandPrefix as 'kiro' | 'spec-manager'
        : 'kiro';

      return startImplPhase({
        specPath: specPathResult.value,
        featureName: input.featureName,
        commandPrefix: validPrefix,
        specManagerService: service,
      });
    }),

  // ============================================================
  // Event Log procedure (1 procedure)
  // Legacy: EVENT_LOG_GET (specHandlers.ts)
  // ============================================================

  /**
   * Get event log entries for a spec.
   */
  getEventLog: publicProcedure
    .input(getEventLogInputSchema)
    .query(async ({ ctx, input }) => {
      const currentProjectPath = ctx.services.getCurrentProjectPath();
      if (!currentProjectPath) {
        return { ok: false as const, error: { type: 'NOT_FOUND', specId: input.specId } };
      }

      const { getDefaultEventLogService } = await import('../../services/eventLogService');
      const eventLogService = getDefaultEventLogService();
      return eventLogService.readEvents(currentProjectPath, input.specId);
    }),

  // ============================================================
  // Parse Tasks for Parallel procedure (1 procedure)
  // Legacy: PARSE_TASKS_FOR_PARALLEL (specHandlers.ts)
  // ============================================================

  /**
   * Parse tasks.md for parallel execution groups.
   */
  parseTasksForParallel: publicProcedure
    .input(parseTasksForParallelInputSchema)
    .query(async ({ ctx, input }) => {
      const currentProjectPath = ctx.services.getCurrentProjectPath();
      if (!currentProjectPath) {
        return null;
      }

      const fileService = ctx.services.fileService;
      if (!fileService) {
        return null;
      }

      try {
        const specPathResult = await fileService.resolveSpecPath(currentProjectPath, input.specName);
        if (!specPathResult.ok) {
          return null;
        }

        const path = await import('path');
        const tasksPath = path.join(specPathResult.value, 'tasks.md');
        const tasksContentResult = await fileService.readArtifact(tasksPath);
        if (!tasksContentResult.ok) {
          return null;
        }

        const { parseTasksContent } = await import('../../services/taskParallelParser');
        return parseTasksContent(tasksContentResult.value);
      } catch {
        return null;
      }
    }),

  // ============================================================
  // Project Command Execution procedure (1 procedure)
  // Legacy: EXECUTE_PROJECT_COMMAND (handlers.ts)
  // ============================================================

  /**
   * Execute project command: Launch project-level agent with any command.
   * Command is passed directly without wrapping.
   * Title is used as phase (display name).
   */
  executeProjectCommand: publicProcedure
    .input(executeProjectCommandInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.getSpecManagerService();

      const result = await service.startAgent({
        specId: '',
        phase: input.title,
        args: [input.command],
        group: 'doc',
        engineId: 'claude',
      });

      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `executeProjectCommand failed: ${result.error.type}`,
        });
      }
      return result.value;
    }),

  // ============================================================
  // Confirm Common Commands procedure (1 procedure)
  // Legacy: CONFIRM_COMMON_COMMANDS (installHandlers.ts)
  // ============================================================

  /**
   * Confirm common commands installation decisions.
   * Delegates to unifiedCommandsetInstaller.
   */
  confirmCommonCommands: publicProcedure
    .input(confirmCommonCommandsInputSchema)
    .mutation(async ({ ctx, input }) => {
      const confirmFn = ctx.services.confirmCommonCommands;
      if (!confirmFn) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'confirmCommonCommands service not initialized',
        });
      }

      const result = await confirmFn(
        input.projectPath,
        input.decisions,
      );

      if (!result.ok) {
        return {
          ok: false as const,
          error: result.error,
        };
      }

      return {
        ok: true as const,
        value: result.value,
      };
    }),

  // ============================================================
  // Steering procedures (4 procedures)
  // Legacy: CHECK_STEERING_FILES, GENERATE_VERIFICATION_MD,
  //         CHECK_RELEASE_MD, GENERATE_RELEASE_MD (handlers.ts)
  // ============================================================

  /**
   * Check if steering files exist (verification-commands.md).
   */
  checkSteeringFiles: publicProcedure
    .input(checkSteeringFilesInputSchema)
    .output(checkSteeringFilesOutputSchema)
    .query(async ({ input }) => {
      try {
        const path = await import('path');
        const fs = await import('fs/promises');
        const verificationMdPath = path.join(input.projectPath, '.kiro', 'steering', 'verification-commands.md');
        const exists = await fs.stat(verificationMdPath).then(() => true).catch(() => false);
        return { verificationMdExists: exists };
      } catch {
        return { verificationMdExists: false };
      }
    }),

  /**
   * Generate verification.md by starting a steering-verification agent.
   */
  generateVerificationMd: publicProcedure
    .input(generateVerificationMdInputSchema)
    .mutation(async ({ ctx }) => {
      const service = ctx.services.getSpecManagerService();
      const result = await service.startAgent({
        specId: '',
        phase: 'steering-verification',
        args: ['/kiro:steering-verification'],
        group: 'doc',
        engineId: 'claude',
      });
      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `generateVerificationMd failed: ${result.error.type}`,
        });
      }
      return result.value;
    }),

  /**
   * Check if release.md exists.
   */
  checkReleaseMd: publicProcedure
    .input(checkReleaseMdInputSchema)
    .output(checkReleaseMdOutputSchema)
    .query(async ({ input }) => {
      try {
        const path = await import('path');
        const fs = await import('fs/promises');
        const releaseMdPath = path.join(input.projectPath, '.claude', 'commands', 'release.md');
        const exists = await fs.stat(releaseMdPath).then(() => true).catch(() => false);
        return { releaseMdExists: exists };
      } catch {
        return { releaseMdExists: false };
      }
    }),

  /**
   * Generate release.md by starting a generate-release agent.
   */
  generateReleaseMd: publicProcedure
    .input(generateReleaseMdInputSchema)
    .mutation(async ({ ctx }) => {
      const service = ctx.services.getSpecManagerService();
      const result = await service.startAgent({
        specId: '',
        phase: 'generate-release',
        args: ['/kiro:generate-release'],
        group: 'doc',
        engineId: 'claude',
      });
      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `generateReleaseMd failed: ${result.error.type}`,
        });
      }
      return result.value;
    }),
});
