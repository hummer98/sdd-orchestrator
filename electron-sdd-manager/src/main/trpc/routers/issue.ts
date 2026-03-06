/**
 * Issue Router - GitHub Issue/PR management tRPC procedures
 * github-issue-integration: Tasks 4.1-4.4
 * Requirements: 2.2, 2.4, 2.6, 3.2, 3.3, 4.2, 5.1, 5.2, 5.4, 8.1-8.5
 *
 * Provides Issue/PR management procedures via GitHubApiService:
 * - Queries: listIssues, getIssue, getIssueComments, testConnection, getConnectionStatus, detectRepoInfo
 * - Queries: listPullRequests, getPullRequest, getPRCIStatus, getPRFiles
 * - Mutations: createIssue (status:triage auto-label), addIssueComment, updateStatusLabel
 * - Mutations: createPullRequest (Closes #N, status:in-review), mergePullRequest (status:done)
 * - Mutations: setGitHubToken, removeGitHubToken, setEnterpriseUrl
 * - Mutations: startImplementation (worktree/direct modes)
 *
 * All services accessed via ctx.services for testability (DD-006).
 * EventBus used for real-time notifications to Renderer.
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc';
import { EVENT_NAMES } from '../services/eventBus';
import type { GitHubIssue } from '@shared/types/github';

// ============================================================
// Zod Schemas
// ============================================================

const projectPathSchema = z.object({
  projectPath: z.string().min(1),
});

const issueFiltersSchema = z.object({
  state: z.enum(['open', 'closed', 'all']).optional(),
  labels: z.array(z.string()).optional(),
  assignee: z.string().optional(),
  milestone: z.number().optional(),
  page: z.number().optional(),
  per_page: z.number().optional(),
}).optional();

const prFiltersSchema = z.object({
  state: z.enum(['open', 'closed', 'all']).optional(),
  head: z.string().optional(),
  base: z.string().optional(),
  page: z.number().optional(),
  per_page: z.number().optional(),
}).optional();

const statusLabelSchema = z.enum(['triage', 'in-progress', 'in-review', 'changes-requested', 'done']);
const mergeMethodSchema = z.enum(['merge', 'squash', 'rebase']);

// ============================================================
// Helper: Get required service or throw
// ============================================================

function getGitHubApiService(ctx: any) {
  const service = ctx.services.gitHubApiService;
  if (!service) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'GitHubApiService not initialized',
    });
  }
  return service;
}

function getGitHubCredentialService(ctx: any) {
  const service = ctx.services.gitHubCredentialService;
  if (!service) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'GitHubCredentialService not initialized',
    });
  }
  return service;
}

function handleApiResult<T>(result: { ok: true; data: T } | { ok: false; error: { type: string; message: string; statusCode?: number } }): T {
  if (!result.ok) {
    const errorCodeMap: Record<string, any> = {
      AUTH_FAILED: 'UNAUTHORIZED',
      NOT_FOUND: 'NOT_FOUND',
      RATE_LIMIT: 'TOO_MANY_REQUESTS',
      VALIDATION_ERROR: 'BAD_REQUEST',
    };
    throw new TRPCError({
      code: errorCodeMap[result.error.type] || 'INTERNAL_SERVER_ERROR',
      message: result.error.message,
    });
  }
  return result.data;
}

/**
 * Generate a URL-friendly slug from issue title.
 * e.g., "Fix Critical Bug!!" -> "fix-critical-bug"
 */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

// ============================================================
// Issue Router
// ============================================================

export const issueRouter = router({
  // ============================================================
  // Issue Queries (Task 4.1)
  // ============================================================

  listIssues: publicProcedure
    .input(z.object({
      projectPath: z.string().min(1),
      filters: issueFiltersSchema,
    }))
    .query(async ({ ctx, input }) => {
      const service = getGitHubApiService(ctx);
      const result = await service.listIssues(input.projectPath, input.filters);
      return handleApiResult(result);
    }),

  getIssue: publicProcedure
    .input(z.object({
      projectPath: z.string().min(1),
      number: z.number().int().positive(),
    }))
    .query(async ({ ctx, input }) => {
      const service = getGitHubApiService(ctx);
      const result = await service.getIssue(input.projectPath, input.number);
      return handleApiResult(result);
    }),

  getIssueComments: publicProcedure
    .input(z.object({
      projectPath: z.string().min(1),
      number: z.number().int().positive(),
    }))
    .query(async ({ ctx, input }) => {
      const service = getGitHubApiService(ctx);
      const result = await service.getIssueComments(input.projectPath, input.number);
      return handleApiResult(result);
    }),

  testConnection: publicProcedure
    .input(projectPathSchema)
    .query(async ({ ctx, input }) => {
      const service = getGitHubApiService(ctx);
      const result = await service.testConnection(input.projectPath);
      return handleApiResult(result);
    }),

  getConnectionStatus: publicProcedure
    .input(projectPathSchema)
    .query(async ({ ctx, input }) => {
      const credService = getGitHubCredentialService(ctx);
      const apiService = getGitHubApiService(ctx);

      const configured = credService.hasCredentials(input.projectPath);
      if (!configured) {
        return {
          configured: false,
          connected: false,
          user: null,
          repoInfo: null,
          error: null,
        };
      }

      // Test connection
      const connectionResult = await apiService.testConnection(input.projectPath);
      if (!connectionResult.ok) {
        return {
          configured: true,
          connected: false,
          user: null,
          repoInfo: null,
          error: connectionResult.error.message,
        };
      }

      // Detect repo info
      const repoResult = await apiService.detectRepoInfo(input.projectPath);
      const repoInfo = repoResult.ok ? repoResult.data : null;

      return {
        configured: true,
        connected: true,
        user: connectionResult.data,
        repoInfo,
        error: null,
      };
    }),

  detectRepoInfo: publicProcedure
    .input(projectPathSchema)
    .query(async ({ ctx, input }) => {
      const service = getGitHubApiService(ctx);
      const result = await service.detectRepoInfo(input.projectPath);
      return handleApiResult(result);
    }),

  // ============================================================
  // Issue Mutations (Task 4.1)
  // ============================================================

  createIssue: publicProcedure
    .input(z.object({
      projectPath: z.string().min(1),
      title: z.string().min(1),
      body: z.string(),
      labels: z.array(z.string()).optional(),
      assignees: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = getGitHubApiService(ctx);

      const result = await service.createIssue(input.projectPath, {
        title: input.title,
        body: input.body,
        labels: input.labels,
        assignees: input.assignees,
      });
      const issue = handleApiResult<GitHubIssue>(result);

      // Auto-assign status:triage label
      await service.updateStatusLabel(input.projectPath, issue.number, 'triage');

      // Emit event
      ctx.services.eventBus?.emit(EVENT_NAMES.ISSUE_LIST_UPDATED, {
        projectPath: input.projectPath,
      });

      return issue;
    }),

  addIssueComment: publicProcedure
    .input(z.object({
      projectPath: z.string().min(1),
      number: z.number().int().positive(),
      body: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = getGitHubApiService(ctx);
      const result = await service.addIssueComment(input.projectPath, input.number, input.body);
      const comment = handleApiResult(result);

      ctx.services.eventBus?.emit(EVENT_NAMES.ISSUE_DETAIL_UPDATED, {
        projectPath: input.projectPath,
        issueNumber: input.number,
      });

      return comment;
    }),

  updateStatusLabel: publicProcedure
    .input(z.object({
      projectPath: z.string().min(1),
      number: z.number().int().positive(),
      status: statusLabelSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const service = getGitHubApiService(ctx);
      const result = await service.updateStatusLabel(input.projectPath, input.number, input.status);
      handleApiResult(result);

      ctx.services.eventBus?.emit(EVENT_NAMES.ISSUE_DETAIL_UPDATED, {
        projectPath: input.projectPath,
        issueNumber: input.number,
      });
    }),

  // ============================================================
  // PR Queries (Task 4.2)
  // ============================================================

  listPullRequests: publicProcedure
    .input(z.object({
      projectPath: z.string().min(1),
      filters: prFiltersSchema,
    }))
    .query(async ({ ctx, input }) => {
      const service = getGitHubApiService(ctx);
      const result = await service.listPullRequests(input.projectPath, input.filters);
      return handleApiResult(result);
    }),

  getPullRequest: publicProcedure
    .input(z.object({
      projectPath: z.string().min(1),
      number: z.number().int().positive(),
    }))
    .query(async ({ ctx, input }) => {
      const service = getGitHubApiService(ctx);
      const result = await service.getPullRequest(input.projectPath, input.number);
      return handleApiResult(result);
    }),

  getPRCIStatus: publicProcedure
    .input(z.object({
      projectPath: z.string().min(1),
      sha: z.string().min(1),
    }))
    .query(async ({ ctx, input }) => {
      const service = getGitHubApiService(ctx);
      const result = await service.getPRCIStatus(input.projectPath, input.sha);
      return handleApiResult(result);
    }),

  getPRFiles: publicProcedure
    .input(z.object({
      projectPath: z.string().min(1),
      number: z.number().int().positive(),
    }))
    .query(async ({ ctx, input }) => {
      const service = getGitHubApiService(ctx);
      const result = await service.getPRFiles(input.projectPath, input.number);
      return handleApiResult(result);
    }),

  // ============================================================
  // PR Mutations (Task 4.2)
  // ============================================================

  createPullRequest: publicProcedure
    .input(z.object({
      projectPath: z.string().min(1),
      title: z.string().min(1),
      body: z.string(),
      head: z.string().min(1),
      base: z.string().min(1),
      issueNumber: z.number().int().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = getGitHubApiService(ctx);

      const result = await service.createPullRequest(input.projectPath, {
        title: input.title,
        body: input.body,
        head: input.head,
        base: input.base,
        issueNumber: input.issueNumber,
      });
      const pr = handleApiResult(result);

      // Update issue label to in-review if issueNumber provided
      if (input.issueNumber) {
        await service.updateStatusLabel(input.projectPath, input.issueNumber, 'in-review');
      }

      ctx.services.eventBus?.emit(EVENT_NAMES.PR_LIST_UPDATED, {
        projectPath: input.projectPath,
      });

      return pr;
    }),

  mergePullRequest: publicProcedure
    .input(z.object({
      projectPath: z.string().min(1),
      number: z.number().int().positive(),
      method: mergeMethodSchema,
      issueNumber: z.number().int().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = getGitHubApiService(ctx);
      const result = await service.mergePullRequest(input.projectPath, input.number, input.method);
      handleApiResult(result);

      // Update issue label to done if issueNumber provided
      if (input.issueNumber) {
        await service.updateStatusLabel(input.projectPath, input.issueNumber, 'done');
      }

      ctx.services.eventBus?.emit(EVENT_NAMES.PR_LIST_UPDATED, {
        projectPath: input.projectPath,
      });
    }),

  // ============================================================
  // Auth Mutations (Task 4.3)
  // ============================================================

  setGitHubToken: publicProcedure
    .input(z.object({
      projectPath: z.string().min(1),
      token: z.string().min(1),
    }))
    .mutation(({ ctx, input }) => {
      const credService = getGitHubCredentialService(ctx);
      credService.storeToken(input.projectPath, input.token);

      ctx.services.eventBus?.emit(EVENT_NAMES.GITHUB_CONNECTION_CHANGED, {
        projectPath: input.projectPath,
      });
    }),

  removeGitHubToken: publicProcedure
    .input(projectPathSchema)
    .mutation(({ ctx, input }) => {
      const credService = getGitHubCredentialService(ctx);
      credService.removeToken(input.projectPath);

      ctx.services.eventBus?.emit(EVENT_NAMES.GITHUB_CONNECTION_CHANGED, {
        projectPath: input.projectPath,
      });
    }),

  setEnterpriseUrl: publicProcedure
    .input(z.object({
      projectPath: z.string().min(1),
      url: z.string().url(),
    }))
    .mutation(({ ctx, input }) => {
      const credService = getGitHubCredentialService(ctx);
      credService.storeEnterpriseUrl(input.projectPath, input.url);

      ctx.services.eventBus?.emit(EVENT_NAMES.GITHUB_CONNECTION_CHANGED, {
        projectPath: input.projectPath,
      });
    }),

  // ============================================================
  // Implementation Mode (Task 4.4)
  // ============================================================

  startImplementation: publicProcedure
    .input(z.object({
      projectPath: z.string().min(1),
      issueNumber: z.number().int().positive(),
      mode: z.enum(['worktree', 'direct']),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = getGitHubApiService(ctx);

      let branch: string;

      if (input.mode === 'worktree') {
        // Get issue title for branch slug
        const issueResult = await service.getIssue(input.projectPath, input.issueNumber);
        const issue = handleApiResult<GitHubIssue>(issueResult);
        const slug = slugify(issue.title);
        const featureName = `issue/${input.issueNumber}-${slug}`;

        // Create worktree via existing service
        if (!ctx.services.worktreeCreate) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'worktreeCreate service not initialized',
          });
        }

        const worktreeResult = await ctx.services.worktreeCreate(input.projectPath, featureName);
        if (!worktreeResult.ok) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to create worktree: ${(worktreeResult.error as any)?.message || 'Unknown error'}`,
          });
        }

        branch = (worktreeResult.value as any)?.branch || featureName;
      } else {
        // Direct mode: current branch
        branch = 'current';
      }

      // Update label to in-progress
      await service.updateStatusLabel(input.projectPath, input.issueNumber, 'in-progress');

      return { branch };
    }),
});
