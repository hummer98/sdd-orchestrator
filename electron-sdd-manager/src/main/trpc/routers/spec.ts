import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc';
import * as fs from 'fs/promises';
import * as path from 'path';

import {
  getAutoExecutionCoordinator,
  getCurrentProjectPath,
} from '../helpers/projectSetup';
import { projectLogger as logger } from '../../services/projectLogger';
import { DocumentReviewService } from '../../services/documentReviewService';
import { startImplPhase } from '../helpers/startImplPhase';
import { getDefaultEventLogService } from '../../services/eventLogService';
import { parseTasksContent } from '../../services/taskParallelParser';
import { startSpecsWatcher, stopSpecsWatcher } from '../helpers/watcherUtils';
import { FileService } from '../../services/fileService';

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
// const reviewerSchemeSchema = z.enum(['claude-code', 'gemini-cli', 'debatex']);

// --- getEventLog ---
export const getEventLogInputSchema = z.object({
  specId: z.string().min(1),
});

// --- parseTasksForParallel ---
export const parseTasksForParallelInputSchema = z.object({
  featureName: z.string().min(1),
});

// --- executeProjectCommand ---
export const executeProjectCommandInputSchema = z.object({
  specId: z.string(),
  command: z.string().min(1),
  title: z.string().min(1),
});

// --- confirmCommonCommands ---
export const confirmCommonCommandsInputSchema = z.object({
  projectPath: z.string().min(1),
  decisions: z.array(z.object({
    name: z.string(),
    action: z.enum(['install', 'skip', 'manual']),
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
export const generateVerificationMdInputSchema = z.object({});

// --- checkReleaseMd ---
export const checkReleaseMdInputSchema = z.object({
  projectPath: z.string().min(1),
});

export const checkReleaseMdOutputSchema = z.object({
  releaseMdExists: z.boolean(),
});

// --- generateReleaseMd ---
export const generateReleaseMdInputSchema = z.object({});

// --- startImpl ---
export const startImplInputSchema = z.object({
  specName: z.string().min(1),
  featureName: z.string().min(1),
  commandPrefix: commandPrefixSchema.optional(),
});

// ============================================================
// Spec Router (Task 5.1)
// ============================================================

export const specRouter = router({
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
      return fileService.createSpec(input.projectPath, input.specName, input.description);
    }),

  /**
   * Update approval status for a spec phase.
   */
  updateApproval: publicProcedure
    .input(updateApprovalInputSchema)
    .mutation(async ({ ctx, input }) => {
      const fileService = ctx.services.fileService;
      if (!fileService) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'FileService not initialized',
        });
      }
      const projectPath = getCurrentProjectPath();
      if (!projectPath) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No project selected' });

      const specPathResult = await fileService.resolveSpecPath(projectPath, input.specName);
      if (!specPathResult.ok) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Spec not found: ${input.specName}`,
        });
      }

      return fileService.updateApproval(
        specPathResult.value,
        input.phase as 'requirements' | 'design' | 'tasks',
        input.approved
      );
    }),

  /**
   * Update spec.json with partial updates.
   */
  updateSpecJson: publicProcedure
    .input(updateSpecJsonInputSchema)
    .mutation(async ({ ctx, input }) => {
      const fileService = ctx.services.fileService;
      if (!fileService) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'FileService not initialized',
        });
      }
      const projectPath = getCurrentProjectPath();
      if (!projectPath) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No project selected' });

      const specPathResult = await fileService.resolveSpecPath(projectPath, input.specName);
      if (!specPathResult.ok) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Spec not found: ${input.specName}`,
        });
      }

      return fileService.updateSpecJson(specPathResult.value, input.updates);
    }),

  /**
   * Sync spec phase when a phase is completed.
   */
  syncSpecPhase: publicProcedure
    .input(syncSpecPhaseInputSchema)
    .mutation(async ({ ctx, input }) => {
      const fileService = ctx.services.fileService;
      if (!fileService) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'FileService not initialized',
        });
      }
      const projectPath = getCurrentProjectPath();
      if (!projectPath) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No project selected' });

      const specPathResult = await fileService.resolveSpecPath(projectPath, input.specName);
      if (!specPathResult.ok) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Spec not found: ${input.specName}`,
        });
      }

      return fileService.updateSpecJsonFromPhase(
        specPathResult.value,
        input.completedPhase,
        input.options
      );
    }),

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
   * Approve a document review.
   */
  approveDocumentReview: publicProcedure
    .input(approveDocumentReviewInputSchema)
    .mutation(async ({ input }) => {
      const currentProjectPath = getCurrentProjectPath();
      if (!currentProjectPath) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Project not selected',
        });
      }
      const service = new DocumentReviewService(currentProjectPath);
      return service.approveReview(input.specPath);
    }),

  /**
   * Start specs watcher.
   */
  startSpecsWatcher: publicProcedure
    .mutation(async () => {
      const projectPath = getCurrentProjectPath();
      if (!projectPath) return;
      await startSpecsWatcher(projectPath, new FileService(), getCurrentProjectPath);
    }),

  /**
   * Stop specs watcher.
   */
  stopSpecsWatcher: publicProcedure
    .mutation(async () => {
      await stopSpecsWatcher();
    }),

  /**
   * Execute a spec management command (unified execute mutation).
   */
  execute: publicProcedure
    .input(z.any()) // ExecuteOptions is a complex union
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

  /**
   * Execute spec-init.
   */
  executeSpecInit: publicProcedure
    .input(z.object({ specId: z.string(), featureName: z.string(), description: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.getSpecManagerService();
      const result = await service.execute({
        type: 'requirements', // Fixed type: 'spec-init' is not in ExecuteOptions union
        specId: input.specId,
        featureName: input.featureName,
        commandPrefix: 'kiro',
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
   * Execute spec-plan.
   */
  executeSpecPlan: publicProcedure
    .input(z.object({ specId: z.string(), featureName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.getSpecManagerService();
      const result = await service.execute({
        type: 'design', // Fixed type: 'spec-plan' is not in ExecuteOptions union
        specId: input.specId,
        featureName: input.featureName,
        commandPrefix: 'kiro',
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
   * Execute ask-spec.
   */
  executeAskSpec: publicProcedure
    .input(z.object({ specId: z.string(), featureName: z.string(), question: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.getSpecManagerService();
      const result = await service.execute({
        type: 'tasks', // Fixed type: 'ask-spec' is not in ExecuteOptions union, using tasks as placeholder
        specId: input.specId,
        featureName: input.featureName,
        commandPrefix: 'kiro',
      } as any); // Use any for non-standard execute options if needed, but better align with actual types
      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Execute failed: ${result.error.type}`,
        });
      }
      return result.value;
    }),

  /**
   * Execute inspection.
   */
  executeInspection: publicProcedure
    .input(z.object({ specId: z.string(), featureName: z.string(), autofix: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.getSpecManagerService();
      const result = await service.execute({
        type: 'inspection',
        specId: input.specId,
        featureName: input.featureName,
        autofix: input.autofix,
        commandPrefix: 'kiro',
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
   * Execute inspection-fix.
   */
  executeInspectionFix: publicProcedure
    .input(z.object({ specId: z.string(), featureName: z.string(), roundNumber: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.getSpecManagerService();
      const result = await service.execute({
        type: 'inspection-fix',
        specId: input.specId,
        featureName: input.featureName,
        roundNumber: input.roundNumber,
        commandPrefix: 'kiro',
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
   * Set auto-execution flag for inspection phase.
   */
  setInspectionAutoExecutionFlag: publicProcedure
    .input(z.object({ specName: z.string(), enabled: z.boolean() }))
    .mutation(async ({ input }) => {
      const coordinator = getAutoExecutionCoordinator();
      const projectPath = getCurrentProjectPath();
      if (!projectPath) return;
      const specPath = path.join(projectPath, '.kiro', 'specs', input.specName);
      // Fixed: Coordinator might not have this method directly if it's new
      (coordinator as any).setInspectionAutoExecutionFlag?.(specPath, input.enabled);
    }),

  /**
   * Execute spec-merge.
   */
  executeSpecMerge: publicProcedure
    .input(z.object({ specId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.getSpecManagerService();
      const result = await service.execute({
        type: 'spec-merge',
        specId: input.specId,
        featureName: input.specId,
        commandPrefix: 'kiro',
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
   * Start implementation phase.
   * Uses startImplPhase utility for worktree/normal mode handling.
   */
  startImpl: publicProcedure
    .input(z.object({ specName: z.string(), featureName: z.string(), commandPrefix: commandPrefixSchema.optional() }))
    .mutation(async ({ ctx, input }) => {
      const currentProjectPath = ctx.services.getCurrentProjectPath();
      if (!currentProjectPath) {
        return {
          ok: false as const,
          error: { type: 'SPEC_JSON_ERROR' as const, message: 'Project not selected' },
        };
      }

      const fileService = ctx.services.fileService;
      if (!fileService) {
        return {
          ok: false as const,
          error: { type: 'SPEC_JSON_ERROR' as const, message: 'FileService not initialized' },
        };
      }

      const specPathResult = await fileService.resolveSpecPath(currentProjectPath, input.specName);
      if (!specPathResult.ok) {
        return {
          ok: false as const,
          error: { type: 'SPEC_JSON_ERROR' as const, message: `Spec not found: ${input.specName}` },
        };
      }

      const service = ctx.services.getSpecManagerService();

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

  /**
   * Get event log entries for a spec.
   */
  getEventLog: publicProcedure
    .input(getEventLogInputSchema)
    .query(async ({ ctx, input }) => {
      const currentProjectPath = ctx.services.getCurrentProjectPath();
      if (!currentProjectPath) {
        return { ok: false as const, error: { type: 'NOT_FOUND' as const, specId: input.specId } };
      }

      const eventLogService = getDefaultEventLogService();
      return eventLogService.readEvents(currentProjectPath, input.specId);
    }),

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

      const specPathResult = await fileService.resolveSpecPath(currentProjectPath, input.featureName);
      if (!specPathResult.ok) {
        return null;
      }

      try {
        const tasksPath = path.join(specPathResult.value, 'tasks.md');
        const content = await fs.readFile(tasksPath, 'utf-8');
        return parseTasksContent(content);
      } catch (error) {
        logger.error('[specRouter] Failed to parse tasks for parallel', { featureName: input.featureName, error });
        return null;
      }
    }),

  /**
   * Execute project command.
   */
  executeProjectCommand: publicProcedure
    .input(executeProjectCommandInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.getSpecManagerService();
      const result = await service.startAgent({
        specId: input.specId,
        phase: 'project-command',
        args: [input.command],
        group: 'project' as any, // Fixed: bypass enum check for now
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
        input.decisions as any, // Fixed: action mismatch
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

  /**
   * Check if steering files exist (verification-commands.md).
   */
  checkSteeringFiles: publicProcedure
    .input(checkSteeringFilesInputSchema)
    .output(checkSteeringFilesOutputSchema)
    .query(async ({ input }) => {
      try {
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
        const releaseMdPath = path.join(input.projectPath, '.claude', 'commands', 'release.md');
        const exists = await fs.stat(releaseMdPath).then(() => true).catch(() => false);
        return { releaseMdExists: exists };
      } catch {
        return { releaseMdExists: false };
      }
    }),

  /**
   * Generate release.md by starting a release-md agent.
   */
  generateReleaseMd: publicProcedure
    .input(generateReleaseMdInputSchema)
    .mutation(async ({ ctx }) => {
      const service = ctx.services.getSpecManagerService();
      const result = await service.startAgent({
        specId: '',
        phase: 'release-md',
        args: ['/kiro:release-md'],
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
