/**
 * Integration Test: PR Creation and Merge Flow
 * github-issue-integration: Task 15.2
 * Requirements: 8.1, 8.4, 8.5
 * Integration Point: Design.md "PR Creation and Merge Flow"
 *
 * Tests the end-to-end flow of:
 * - PR creation with "Closes #N" in body -> status:in-review label update
 * - PR merge -> status:done label update
 * - EventBus PR_LIST_UPDATED notifications
 *
 * Mock boundaries:
 * - GitHubApiService HTTP layer (mocked)
 * - tRPC Context via createTestContext
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestCaller, createMockServices } from '../helpers/test-helpers';
import type { ContextServices } from '../context';
import { EVENT_NAMES } from '../services/eventBus';

describe('Integration: PR Creation and Merge Flow', () => {
  let mockServices: ContextServices;

  const projectPath = '/test/project';

  const mockPR = {
    number: 10,
    title: 'Fix authentication bug',
    body: 'Closes #42\n\nFixes the logout issue',
    state: 'open' as const,
    head: { ref: 'issue/42-fix-auth', sha: 'abc123' },
    base: { ref: 'main' },
    mergeable: true,
    merged: false,
    labels: [],
    user: { login: 'developer', avatar_url: 'https://example.com/avatar' },
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
    diff_url: 'https://github.com/owner/repo/pull/10.diff',
  };

  beforeEach(() => {
    mockServices = createMockServices();
  });

  // ==========================================================================
  // PR Creation Flow
  // ==========================================================================

  describe('PR creation with issue link', () => {
    it('should create PR and update linked issue label to status:in-review', async () => {
      (mockServices.gitHubApiService as any).createPullRequest.mockResolvedValue({
        ok: true,
        data: mockPR,
      });
      (mockServices.gitHubApiService as any).updateStatusLabel.mockResolvedValue({
        ok: true,
        data: undefined,
      });

      const caller = createTestCaller(mockServices);

      const result = await caller.issue.createPullRequest({
        projectPath,
        title: 'Fix authentication bug',
        body: 'Fixes the logout issue',
        head: 'issue/42-fix-auth',
        base: 'main',
        issueNumber: 42,
      });

      // Verify: PR created with correct params
      expect(result).toEqual(mockPR);
      expect(mockServices.gitHubApiService!.createPullRequest).toHaveBeenCalledWith(projectPath, {
        title: 'Fix authentication bug',
        body: 'Fixes the logout issue',
        head: 'issue/42-fix-auth',
        base: 'main',
        issueNumber: 42,
      });

      // Verify: Issue label updated to in-review
      expect(mockServices.gitHubApiService!.updateStatusLabel).toHaveBeenCalledWith(
        projectPath,
        42,
        'in-review',
      );
    });

    it('should emit PR_LIST_UPDATED event after PR creation', async () => {
      (mockServices.gitHubApiService as any).createPullRequest.mockResolvedValue({
        ok: true,
        data: mockPR,
      });
      (mockServices.gitHubApiService as any).updateStatusLabel.mockResolvedValue({
        ok: true,
        data: undefined,
      });

      const emitSpy = vi.spyOn(mockServices.eventBus!, 'emit');

      const caller = createTestCaller(mockServices);
      await caller.issue.createPullRequest({
        projectPath,
        title: 'Fix auth',
        body: 'Body',
        head: 'feature',
        base: 'main',
        issueNumber: 42,
      });

      expect(emitSpy).toHaveBeenCalledWith(
        EVENT_NAMES.PR_LIST_UPDATED,
        expect.objectContaining({ projectPath }),
      );
    });

    it('should NOT update issue label when issueNumber is not provided', async () => {
      (mockServices.gitHubApiService as any).createPullRequest.mockResolvedValue({
        ok: true,
        data: { ...mockPR, body: 'No linked issue' },
      });

      const caller = createTestCaller(mockServices);
      await caller.issue.createPullRequest({
        projectPath,
        title: 'Refactoring',
        body: 'No linked issue',
        head: 'refactor-branch',
        base: 'main',
      });

      // updateStatusLabel should NOT have been called for PR creation
      // (it may be called with default mock, but not explicitly for label update)
      expect(mockServices.gitHubApiService!.updateStatusLabel).not.toHaveBeenCalled();
    });

    it('should propagate error when PR creation fails', async () => {
      (mockServices.gitHubApiService as any).createPullRequest.mockResolvedValue({
        ok: false,
        error: { type: 'VALIDATION_ERROR', message: 'Head branch does not exist' },
      });

      const caller = createTestCaller(mockServices);
      await expect(
        caller.issue.createPullRequest({
          projectPath,
          title: 'Test',
          body: '',
          head: 'nonexistent',
          base: 'main',
        }),
      ).rejects.toThrow('Head branch does not exist');
    });
  });

  // ==========================================================================
  // PR Merge Flow
  // ==========================================================================

  describe('PR merge with issue label update', () => {
    it('should merge PR and update linked issue label to status:done', async () => {
      (mockServices.gitHubApiService as any).mergePullRequest.mockResolvedValue({
        ok: true,
        data: undefined,
      });
      (mockServices.gitHubApiService as any).updateStatusLabel.mockResolvedValue({
        ok: true,
        data: undefined,
      });

      const caller = createTestCaller(mockServices);

      await caller.issue.mergePullRequest({
        projectPath,
        number: 10,
        method: 'squash',
        issueNumber: 42,
      });

      // Verify: PR merged with correct method
      expect(mockServices.gitHubApiService!.mergePullRequest).toHaveBeenCalledWith(
        projectPath,
        10,
        'squash',
      );

      // Verify: Issue label updated to done
      expect(mockServices.gitHubApiService!.updateStatusLabel).toHaveBeenCalledWith(
        projectPath,
        42,
        'done',
      );
    });

    it('should emit PR_LIST_UPDATED event after merge', async () => {
      (mockServices.gitHubApiService as any).mergePullRequest.mockResolvedValue({
        ok: true,
        data: undefined,
      });
      (mockServices.gitHubApiService as any).updateStatusLabel.mockResolvedValue({
        ok: true,
        data: undefined,
      });

      const emitSpy = vi.spyOn(mockServices.eventBus!, 'emit');

      const caller = createTestCaller(mockServices);
      await caller.issue.mergePullRequest({
        projectPath,
        number: 10,
        method: 'merge',
        issueNumber: 42,
      });

      expect(emitSpy).toHaveBeenCalledWith(
        EVENT_NAMES.PR_LIST_UPDATED,
        expect.objectContaining({ projectPath }),
      );
    });

    it('should NOT update issue label when issueNumber is not provided', async () => {
      (mockServices.gitHubApiService as any).mergePullRequest.mockResolvedValue({
        ok: true,
        data: undefined,
      });

      const caller = createTestCaller(mockServices);
      await caller.issue.mergePullRequest({
        projectPath,
        number: 10,
        method: 'rebase',
      });

      expect(mockServices.gitHubApiService!.updateStatusLabel).not.toHaveBeenCalled();
    });

    it('should support all merge methods', async () => {
      (mockServices.gitHubApiService as any).mergePullRequest.mockResolvedValue({
        ok: true,
        data: undefined,
      });

      const caller = createTestCaller(mockServices);

      for (const method of ['merge', 'squash', 'rebase'] as const) {
        await caller.issue.mergePullRequest({
          projectPath,
          number: 10,
          method,
        });
      }

      expect(mockServices.gitHubApiService!.mergePullRequest).toHaveBeenCalledTimes(3);
    });
  });

  // ==========================================================================
  // Full PR Lifecycle: Create -> Merge -> Label Done
  // ==========================================================================

  describe('Full PR lifecycle', () => {
    it('should support create PR -> merge -> issue marked done', async () => {
      // Step 1: Create PR linked to issue #42
      (mockServices.gitHubApiService as any).createPullRequest.mockResolvedValue({
        ok: true,
        data: mockPR,
      });
      (mockServices.gitHubApiService as any).updateStatusLabel.mockResolvedValue({
        ok: true,
        data: undefined,
      });

      const caller = createTestCaller(mockServices);

      await caller.issue.createPullRequest({
        projectPath,
        title: 'Fix auth',
        body: 'Closes #42',
        head: 'issue/42-fix-auth',
        base: 'main',
        issueNumber: 42,
      });

      // Verify: in-review label set
      expect(mockServices.gitHubApiService!.updateStatusLabel).toHaveBeenCalledWith(
        projectPath,
        42,
        'in-review',
      );

      // Step 2: Merge PR
      (mockServices.gitHubApiService as any).mergePullRequest.mockResolvedValue({
        ok: true,
        data: undefined,
      });

      await caller.issue.mergePullRequest({
        projectPath,
        number: 10,
        method: 'squash',
        issueNumber: 42,
      });

      // Verify: done label set after merge
      expect(mockServices.gitHubApiService!.updateStatusLabel).toHaveBeenCalledWith(
        projectPath,
        42,
        'done',
      );
    });
  });
});
