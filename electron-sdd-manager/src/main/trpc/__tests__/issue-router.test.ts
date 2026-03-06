/**
 * Issue Router tests
 * github-issue-integration: Task 4.5
 * Requirements: 2.2, 3.2, 8.1
 *
 * Tests issueRouter tRPC procedures:
 * - Issue queries: listIssues, getIssue, getIssueComments, testConnection, getConnectionStatus, detectRepoInfo
 * - Issue mutations: createIssue (status:triage auto-label), addIssueComment, updateStatusLabel
 * - PR queries: listPullRequests, getPullRequest, getPRCIStatus, getPRFiles
 * - PR mutations: createPullRequest (Closes #N), mergePullRequest (auto label status:done)
 * - Auth mutations: setGitHubToken, removeGitHubToken, setEnterpriseUrl
 * - Implementation: startImplementation (worktree/direct modes)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestCaller, createMockServices } from '../helpers/test-helpers';
import type { ContextServices } from '../context';
import { EVENT_NAMES } from '../services/eventBus';

describe('Issue Router', () => {
  let mockServices: ContextServices;

  beforeEach(() => {
    mockServices = createMockServices();
  });

  // ============================================================
  // Issue Queries (Task 4.1)
  // ============================================================

  describe('listIssues', () => {
    it('should return issues list from GitHubApiService', async () => {
      const mockIssues = [
        { number: 1, title: 'Bug fix', state: 'open', labels: [], assignees: [], milestone: null, created_at: '', updated_at: '', comments: 0, user: { login: 'user', avatar_url: '' }, body: '' },
        { number: 2, title: 'Feature', state: 'open', labels: [], assignees: [], milestone: null, created_at: '', updated_at: '', comments: 0, user: { login: 'user', avatar_url: '' }, body: '' },
      ];
      (mockServices.gitHubApiService as any).listIssues.mockResolvedValue({ ok: true, data: mockIssues });

      const caller = createTestCaller(mockServices);
      const result = await caller.issue.listIssues({ projectPath: '/test/project' });

      expect(result).toEqual(mockIssues);
      expect(mockServices.gitHubApiService!.listIssues).toHaveBeenCalledWith('/test/project', undefined);
    });

    it('should pass filters to GitHubApiService', async () => {
      (mockServices.gitHubApiService as any).listIssues.mockResolvedValue({ ok: true, data: [] });

      const caller = createTestCaller(mockServices);
      const filters = { state: 'open' as const, labels: ['bug'], page: 1, per_page: 30 };
      await caller.issue.listIssues({ projectPath: '/test/project', filters });

      expect(mockServices.gitHubApiService!.listIssues).toHaveBeenCalledWith('/test/project', filters);
    });

    it('should throw when GitHubApiService returns error', async () => {
      (mockServices.gitHubApiService as any).listIssues.mockResolvedValue({
        ok: false,
        error: { type: 'AUTH_FAILED', message: 'Token invalid' },
      });

      const caller = createTestCaller(mockServices);
      await expect(caller.issue.listIssues({ projectPath: '/test/project' })).rejects.toThrow();
    });

    it('should throw when gitHubApiService is not available', async () => {
      mockServices.gitHubApiService = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.issue.listIssues({ projectPath: '/test/project' })).rejects.toThrow();
    });
  });

  describe('getIssue', () => {
    it('should return a single issue', async () => {
      const mockIssue = { number: 42, title: 'Test issue', body: 'Body', state: 'open', labels: [], assignees: [], milestone: null, created_at: '', updated_at: '', comments: 0, user: { login: 'user', avatar_url: '' } };
      (mockServices.gitHubApiService as any).getIssue.mockResolvedValue({ ok: true, data: mockIssue });

      const caller = createTestCaller(mockServices);
      const result = await caller.issue.getIssue({ projectPath: '/test/project', number: 42 });

      expect(result).toEqual(mockIssue);
      expect(mockServices.gitHubApiService!.getIssue).toHaveBeenCalledWith('/test/project', 42);
    });

    it('should throw when issue not found', async () => {
      (mockServices.gitHubApiService as any).getIssue.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_FOUND', message: 'Not found' },
      });

      const caller = createTestCaller(mockServices);
      await expect(caller.issue.getIssue({ projectPath: '/test/project', number: 999 })).rejects.toThrow();
    });
  });

  describe('getIssueComments', () => {
    it('should return comments for an issue', async () => {
      const mockComments = [
        { id: 1, body: 'Comment 1', user: { login: 'user', avatar_url: '' }, created_at: '', updated_at: '' },
      ];
      (mockServices.gitHubApiService as any).getIssueComments.mockResolvedValue({ ok: true, data: mockComments });

      const caller = createTestCaller(mockServices);
      const result = await caller.issue.getIssueComments({ projectPath: '/test/project', number: 1 });

      expect(result).toEqual(mockComments);
    });
  });

  describe('testConnection', () => {
    it('should return GitHub user info on successful connection', async () => {
      const mockUser = { login: 'testuser', avatar_url: 'https://example.com/avatar.png' };
      (mockServices.gitHubApiService as any).testConnection.mockResolvedValue({ ok: true, data: mockUser });

      const caller = createTestCaller(mockServices);
      const result = await caller.issue.testConnection({ projectPath: '/test/project' });

      expect(result).toEqual(mockUser);
    });

    it('should throw on auth failure', async () => {
      (mockServices.gitHubApiService as any).testConnection.mockResolvedValue({
        ok: false,
        error: { type: 'AUTH_FAILED', message: 'Invalid token' },
      });

      const caller = createTestCaller(mockServices);
      await expect(caller.issue.testConnection({ projectPath: '/test/project' })).rejects.toThrow();
    });
  });

  describe('getConnectionStatus', () => {
    it('should return connected status when credentials exist and connection succeeds', async () => {
      (mockServices.gitHubCredentialService as any).hasCredentials.mockReturnValue(true);
      (mockServices.gitHubApiService as any).testConnection.mockResolvedValue({
        ok: true,
        data: { login: 'testuser', avatar_url: 'https://example.com' },
      });
      (mockServices.gitHubApiService as any).detectRepoInfo.mockResolvedValue({
        ok: true,
        data: { owner: 'owner', repo: 'repo', baseUrl: 'https://api.github.com' },
      });

      const caller = createTestCaller(mockServices);
      const result = await caller.issue.getConnectionStatus({ projectPath: '/test/project' });

      expect(result.configured).toBe(true);
      expect(result.connected).toBe(true);
      expect(result.user).toEqual({ login: 'testuser', avatar_url: 'https://example.com' });
      expect(result.repoInfo).toEqual({ owner: 'owner', repo: 'repo', baseUrl: 'https://api.github.com' });
      expect(result.error).toBeNull();
    });

    it('should return unconfigured status when no credentials', async () => {
      (mockServices.gitHubCredentialService as any).hasCredentials.mockReturnValue(false);

      const caller = createTestCaller(mockServices);
      const result = await caller.issue.getConnectionStatus({ projectPath: '/test/project' });

      expect(result.configured).toBe(false);
      expect(result.connected).toBe(false);
    });

    it('should return error when connection test fails', async () => {
      (mockServices.gitHubCredentialService as any).hasCredentials.mockReturnValue(true);
      (mockServices.gitHubApiService as any).testConnection.mockResolvedValue({
        ok: false,
        error: { type: 'AUTH_FAILED', message: 'Token expired' },
      });

      const caller = createTestCaller(mockServices);
      const result = await caller.issue.getConnectionStatus({ projectPath: '/test/project' });

      expect(result.configured).toBe(true);
      expect(result.connected).toBe(false);
      expect(result.error).toBe('Token expired');
    });
  });

  describe('detectRepoInfo', () => {
    it('should return repo info from GitHubApiService', async () => {
      const mockRepoInfo = { owner: 'owner', repo: 'repo', baseUrl: 'https://api.github.com' };
      (mockServices.gitHubApiService as any).detectRepoInfo.mockResolvedValue({ ok: true, data: mockRepoInfo });

      const caller = createTestCaller(mockServices);
      const result = await caller.issue.detectRepoInfo({ projectPath: '/test/project' });

      expect(result).toEqual(mockRepoInfo);
    });
  });

  // ============================================================
  // Issue Mutations (Task 4.1)
  // ============================================================

  describe('createIssue', () => {
    it('should create an issue and auto-assign status:triage label', async () => {
      const createdIssue = {
        number: 10,
        title: 'New Issue',
        body: 'Description',
        state: 'open',
        labels: [],
        assignees: [],
        milestone: null,
        created_at: '',
        updated_at: '',
        comments: 0,
        user: { login: 'user', avatar_url: '' },
      };
      (mockServices.gitHubApiService as any).createIssue.mockResolvedValue({ ok: true, data: createdIssue });
      (mockServices.gitHubApiService as any).updateStatusLabel.mockResolvedValue({ ok: true, data: undefined });

      const caller = createTestCaller(mockServices);
      const result = await caller.issue.createIssue({
        projectPath: '/test/project',
        title: 'New Issue',
        body: 'Description',
      });

      expect(result).toEqual(createdIssue);
      // Verify status:triage label was auto-assigned
      expect(mockServices.gitHubApiService!.updateStatusLabel).toHaveBeenCalledWith(
        '/test/project',
        10,
        'triage',
      );
    });

    it('should emit issueListUpdated event after creation', async () => {
      const createdIssue = { number: 10, title: 'New', body: '', state: 'open', labels: [], assignees: [], milestone: null, created_at: '', updated_at: '', comments: 0, user: { login: 'user', avatar_url: '' } };
      (mockServices.gitHubApiService as any).createIssue.mockResolvedValue({ ok: true, data: createdIssue });
      (mockServices.gitHubApiService as any).updateStatusLabel.mockResolvedValue({ ok: true, data: undefined });

      const emitSpy = vi.spyOn(mockServices.eventBus!, 'emit');

      const caller = createTestCaller(mockServices);
      await caller.issue.createIssue({ projectPath: '/test/project', title: 'New', body: '' });

      expect(emitSpy).toHaveBeenCalledWith(EVENT_NAMES.ISSUE_LIST_UPDATED, expect.any(Object));
    });
  });

  describe('addIssueComment', () => {
    it('should add a comment to an issue', async () => {
      const mockComment = { id: 5, body: 'Hello', user: { login: 'user', avatar_url: '' }, created_at: '', updated_at: '' };
      (mockServices.gitHubApiService as any).addIssueComment.mockResolvedValue({ ok: true, data: mockComment });

      const caller = createTestCaller(mockServices);
      const result = await caller.issue.addIssueComment({
        projectPath: '/test/project',
        number: 1,
        body: 'Hello',
      });

      expect(result).toEqual(mockComment);
      expect(mockServices.gitHubApiService!.addIssueComment).toHaveBeenCalledWith('/test/project', 1, 'Hello');
    });

    it('should emit issueDetailUpdated event', async () => {
      (mockServices.gitHubApiService as any).addIssueComment.mockResolvedValue({
        ok: true,
        data: { id: 5, body: 'Test', user: { login: 'user', avatar_url: '' }, created_at: '', updated_at: '' },
      });

      const emitSpy = vi.spyOn(mockServices.eventBus!, 'emit');

      const caller = createTestCaller(mockServices);
      await caller.issue.addIssueComment({ projectPath: '/test/project', number: 1, body: 'Test' });

      expect(emitSpy).toHaveBeenCalledWith(EVENT_NAMES.ISSUE_DETAIL_UPDATED, expect.any(Object));
    });
  });

  describe('updateStatusLabel', () => {
    it('should update status label via GitHubApiService', async () => {
      (mockServices.gitHubApiService as any).updateStatusLabel.mockResolvedValue({ ok: true, data: undefined });

      const caller = createTestCaller(mockServices);
      await caller.issue.updateStatusLabel({
        projectPath: '/test/project',
        number: 1,
        status: 'in-progress',
      });

      expect(mockServices.gitHubApiService!.updateStatusLabel).toHaveBeenCalledWith('/test/project', 1, 'in-progress');
    });

    it('should emit issueDetailUpdated event', async () => {
      (mockServices.gitHubApiService as any).updateStatusLabel.mockResolvedValue({ ok: true, data: undefined });

      const emitSpy = vi.spyOn(mockServices.eventBus!, 'emit');

      const caller = createTestCaller(mockServices);
      await caller.issue.updateStatusLabel({ projectPath: '/test/project', number: 1, status: 'done' });

      expect(emitSpy).toHaveBeenCalledWith(EVENT_NAMES.ISSUE_DETAIL_UPDATED, expect.any(Object));
    });
  });

  // ============================================================
  // PR Queries (Task 4.2)
  // ============================================================

  describe('listPullRequests', () => {
    it('should return pull requests list', async () => {
      const mockPRs = [
        { number: 1, title: 'PR1', body: '', state: 'open', head: { ref: 'feature', sha: 'abc' }, base: { ref: 'main' }, mergeable: true, merged: false, labels: [], user: { login: 'user', avatar_url: '' }, created_at: '', updated_at: '', diff_url: '' },
      ];
      (mockServices.gitHubApiService as any).listPullRequests.mockResolvedValue({ ok: true, data: mockPRs });

      const caller = createTestCaller(mockServices);
      const result = await caller.issue.listPullRequests({ projectPath: '/test/project' });

      expect(result).toEqual(mockPRs);
    });

    it('should pass filters to GitHubApiService', async () => {
      (mockServices.gitHubApiService as any).listPullRequests.mockResolvedValue({ ok: true, data: [] });

      const caller = createTestCaller(mockServices);
      const filters = { state: 'open' as const, base: 'main' };
      await caller.issue.listPullRequests({ projectPath: '/test/project', filters });

      expect(mockServices.gitHubApiService!.listPullRequests).toHaveBeenCalledWith('/test/project', filters);
    });
  });

  describe('getPullRequest', () => {
    it('should return a single pull request', async () => {
      const mockPR = { number: 5, title: 'My PR', body: '', state: 'open', head: { ref: 'feature', sha: 'abc' }, base: { ref: 'main' }, mergeable: true, merged: false, labels: [], user: { login: 'user', avatar_url: '' }, created_at: '', updated_at: '', diff_url: '' };
      (mockServices.gitHubApiService as any).getPullRequest.mockResolvedValue({ ok: true, data: mockPR });

      const caller = createTestCaller(mockServices);
      const result = await caller.issue.getPullRequest({ projectPath: '/test/project', number: 5 });

      expect(result).toEqual(mockPR);
    });
  });

  describe('getPRCIStatus', () => {
    it('should return CI status for a commit', async () => {
      const mockStatus = { state: 'success', statuses: [{ context: 'ci', state: 'success', description: 'Passed', target_url: '' }] };
      (mockServices.gitHubApiService as any).getPRCIStatus.mockResolvedValue({ ok: true, data: mockStatus });

      const caller = createTestCaller(mockServices);
      const result = await caller.issue.getPRCIStatus({ projectPath: '/test/project', sha: 'abc123' });

      expect(result).toEqual(mockStatus);
      expect(mockServices.gitHubApiService!.getPRCIStatus).toHaveBeenCalledWith('/test/project', 'abc123');
    });
  });

  describe('getPRFiles', () => {
    it('should return files changed in a PR', async () => {
      const mockFiles = [
        { sha: 'abc', filename: 'src/main.ts', status: 'modified', additions: 5, deletions: 2, changes: 7 },
      ];
      (mockServices.gitHubApiService as any).getPRFiles.mockResolvedValue({ ok: true, data: mockFiles });

      const caller = createTestCaller(mockServices);
      const result = await caller.issue.getPRFiles({ projectPath: '/test/project', number: 1 });

      expect(result).toEqual(mockFiles);
      expect(mockServices.gitHubApiService!.getPRFiles).toHaveBeenCalledWith('/test/project', 1);
    });
  });

  // ============================================================
  // PR Mutations (Task 4.2)
  // ============================================================

  describe('createPullRequest', () => {
    it('should create a PR with Closes #N when issueNumber provided', async () => {
      const mockPR = { number: 3, title: 'Fix: issue', body: 'Closes #42\n\nFix description', state: 'open', head: { ref: 'fix/42', sha: 'abc' }, base: { ref: 'main' }, mergeable: true, merged: false, labels: [], user: { login: 'user', avatar_url: '' }, created_at: '', updated_at: '', diff_url: '' };
      (mockServices.gitHubApiService as any).createPullRequest.mockResolvedValue({ ok: true, data: mockPR });
      (mockServices.gitHubApiService as any).updateStatusLabel.mockResolvedValue({ ok: true, data: undefined });

      const caller = createTestCaller(mockServices);
      const result = await caller.issue.createPullRequest({
        projectPath: '/test/project',
        title: 'Fix: issue',
        body: 'Fix description',
        head: 'fix/42',
        base: 'main',
        issueNumber: 42,
      });

      expect(result).toEqual(mockPR);
      expect(mockServices.gitHubApiService!.createPullRequest).toHaveBeenCalledWith('/test/project', {
        title: 'Fix: issue',
        body: 'Fix description',
        head: 'fix/42',
        base: 'main',
        issueNumber: 42,
      });
    });

    it('should update issue label to status:in-review when issueNumber provided', async () => {
      const mockPR = { number: 3, title: 'PR', body: '', state: 'open', head: { ref: 'fix', sha: 'abc' }, base: { ref: 'main' }, mergeable: true, merged: false, labels: [], user: { login: 'user', avatar_url: '' }, created_at: '', updated_at: '', diff_url: '' };
      (mockServices.gitHubApiService as any).createPullRequest.mockResolvedValue({ ok: true, data: mockPR });
      (mockServices.gitHubApiService as any).updateStatusLabel.mockResolvedValue({ ok: true, data: undefined });

      const caller = createTestCaller(mockServices);
      await caller.issue.createPullRequest({
        projectPath: '/test/project',
        title: 'PR',
        body: '',
        head: 'fix',
        base: 'main',
        issueNumber: 42,
      });

      expect(mockServices.gitHubApiService!.updateStatusLabel).toHaveBeenCalledWith('/test/project', 42, 'in-review');
    });

    it('should emit prListUpdated event', async () => {
      const mockPR = { number: 3, title: 'PR', body: '', state: 'open', head: { ref: 'fix', sha: 'abc' }, base: { ref: 'main' }, mergeable: true, merged: false, labels: [], user: { login: 'user', avatar_url: '' }, created_at: '', updated_at: '', diff_url: '' };
      (mockServices.gitHubApiService as any).createPullRequest.mockResolvedValue({ ok: true, data: mockPR });

      const emitSpy = vi.spyOn(mockServices.eventBus!, 'emit');

      const caller = createTestCaller(mockServices);
      await caller.issue.createPullRequest({
        projectPath: '/test/project',
        title: 'PR',
        body: '',
        head: 'fix',
        base: 'main',
      });

      expect(emitSpy).toHaveBeenCalledWith(EVENT_NAMES.PR_LIST_UPDATED, expect.any(Object));
    });
  });

  describe('mergePullRequest', () => {
    it('should merge a PR with specified method', async () => {
      (mockServices.gitHubApiService as any).mergePullRequest.mockResolvedValue({ ok: true, data: undefined });

      const caller = createTestCaller(mockServices);
      await caller.issue.mergePullRequest({
        projectPath: '/test/project',
        number: 3,
        method: 'squash',
      });

      expect(mockServices.gitHubApiService!.mergePullRequest).toHaveBeenCalledWith('/test/project', 3, 'squash');
    });

    it('should update issue label to status:done when issueNumber provided', async () => {
      (mockServices.gitHubApiService as any).mergePullRequest.mockResolvedValue({ ok: true, data: undefined });
      (mockServices.gitHubApiService as any).updateStatusLabel.mockResolvedValue({ ok: true, data: undefined });

      const caller = createTestCaller(mockServices);
      await caller.issue.mergePullRequest({
        projectPath: '/test/project',
        number: 3,
        method: 'merge',
        issueNumber: 42,
      });

      expect(mockServices.gitHubApiService!.updateStatusLabel).toHaveBeenCalledWith('/test/project', 42, 'done');
    });

    it('should emit prListUpdated event after merge', async () => {
      (mockServices.gitHubApiService as any).mergePullRequest.mockResolvedValue({ ok: true, data: undefined });

      const emitSpy = vi.spyOn(mockServices.eventBus!, 'emit');

      const caller = createTestCaller(mockServices);
      await caller.issue.mergePullRequest({
        projectPath: '/test/project',
        number: 3,
        method: 'merge',
      });

      expect(emitSpy).toHaveBeenCalledWith(EVENT_NAMES.PR_LIST_UPDATED, expect.any(Object));
    });
  });

  // ============================================================
  // Auth Mutations (Task 4.3)
  // ============================================================

  describe('setGitHubToken', () => {
    it('should store token via GitHubCredentialService', async () => {
      const caller = createTestCaller(mockServices);
      await caller.issue.setGitHubToken({
        projectPath: '/test/project',
        token: 'ghp_new_token',
      });

      expect(mockServices.gitHubCredentialService!.storeToken).toHaveBeenCalledWith('/test/project', 'ghp_new_token');
    });

    it('should emit githubConnectionChanged event', async () => {
      const emitSpy = vi.spyOn(mockServices.eventBus!, 'emit');

      const caller = createTestCaller(mockServices);
      await caller.issue.setGitHubToken({ projectPath: '/test/project', token: 'ghp_test' });

      expect(emitSpy).toHaveBeenCalledWith(EVENT_NAMES.GITHUB_CONNECTION_CHANGED, expect.any(Object));
    });

    it('should throw when gitHubCredentialService is not available', async () => {
      mockServices.gitHubCredentialService = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.issue.setGitHubToken({ projectPath: '/test', token: 'x' })).rejects.toThrow();
    });
  });

  describe('removeGitHubToken', () => {
    it('should remove token via GitHubCredentialService', async () => {
      const caller = createTestCaller(mockServices);
      await caller.issue.removeGitHubToken({ projectPath: '/test/project' });

      expect(mockServices.gitHubCredentialService!.removeToken).toHaveBeenCalledWith('/test/project');
    });

    it('should emit githubConnectionChanged event', async () => {
      const emitSpy = vi.spyOn(mockServices.eventBus!, 'emit');

      const caller = createTestCaller(mockServices);
      await caller.issue.removeGitHubToken({ projectPath: '/test/project' });

      expect(emitSpy).toHaveBeenCalledWith(EVENT_NAMES.GITHUB_CONNECTION_CHANGED, expect.any(Object));
    });
  });

  describe('setEnterpriseUrl', () => {
    it('should store enterprise URL via GitHubCredentialService', async () => {
      const caller = createTestCaller(mockServices);
      await caller.issue.setEnterpriseUrl({
        projectPath: '/test/project',
        url: 'https://github.mycompany.com',
      });

      expect(mockServices.gitHubCredentialService!.storeEnterpriseUrl).toHaveBeenCalledWith(
        '/test/project',
        'https://github.mycompany.com',
      );
    });

    it('should emit githubConnectionChanged event', async () => {
      const emitSpy = vi.spyOn(mockServices.eventBus!, 'emit');

      const caller = createTestCaller(mockServices);
      await caller.issue.setEnterpriseUrl({ projectPath: '/test/project', url: 'https://github.mycompany.com' });

      expect(emitSpy).toHaveBeenCalledWith(EVENT_NAMES.GITHUB_CONNECTION_CHANGED, expect.any(Object));
    });
  });

  // ============================================================
  // Implementation Mode (Task 4.4)
  // ============================================================

  describe('startImplementation', () => {
    it('should create worktree branch in worktree mode', async () => {
      (mockServices.worktreeCreate as any).mockResolvedValue({
        ok: true,
        value: { path: '.kiro/worktrees/issue/42-fix-bug', branch: 'issue/42-fix-bug' },
      });
      (mockServices.gitHubApiService as any).getIssue.mockResolvedValue({
        ok: true,
        data: { number: 42, title: 'Fix critical bug', body: '', state: 'open', labels: [], assignees: [], milestone: null, created_at: '', updated_at: '', comments: 0, user: { login: 'user', avatar_url: '' } },
      });
      (mockServices.gitHubApiService as any).updateStatusLabel.mockResolvedValue({ ok: true, data: undefined });

      const caller = createTestCaller(mockServices);
      const result = await caller.issue.startImplementation({
        projectPath: '/test/project',
        issueNumber: 42,
        mode: 'worktree',
      });

      expect(result.branch).toBeDefined();
      // Verify label was updated to in-progress
      expect(mockServices.gitHubApiService!.updateStatusLabel).toHaveBeenCalledWith('/test/project', 42, 'in-progress');
    });

    it('should only update label in direct mode', async () => {
      (mockServices.gitHubApiService as any).updateStatusLabel.mockResolvedValue({ ok: true, data: undefined });

      const caller = createTestCaller(mockServices);
      const result = await caller.issue.startImplementation({
        projectPath: '/test/project',
        issueNumber: 42,
        mode: 'direct',
      });

      expect(result.branch).toBeDefined();
      expect(mockServices.gitHubApiService!.updateStatusLabel).toHaveBeenCalledWith('/test/project', 42, 'in-progress');
      // worktreeCreate should NOT have been called
      expect(mockServices.worktreeCreate).not.toHaveBeenCalled();
    });

    it('should use issue/{number}-{slug} format for branch name', async () => {
      (mockServices.gitHubApiService as any).getIssue.mockResolvedValue({
        ok: true,
        data: { number: 42, title: 'Fix Critical Bug!!', body: '', state: 'open', labels: [], assignees: [], milestone: null, created_at: '', updated_at: '', comments: 0, user: { login: 'user', avatar_url: '' } },
      });
      (mockServices.worktreeCreate as any).mockResolvedValue({
        ok: true,
        value: { path: '.kiro/worktrees/issue/42-fix-critical-bug', branch: 'issue/42-fix-critical-bug' },
      });
      (mockServices.gitHubApiService as any).updateStatusLabel.mockResolvedValue({ ok: true, data: undefined });

      const caller = createTestCaller(mockServices);
      await caller.issue.startImplementation({
        projectPath: '/test/project',
        issueNumber: 42,
        mode: 'worktree',
      });

      // Verify worktreeCreate was called with issue/{number}-{slug} format
      expect(mockServices.worktreeCreate).toHaveBeenCalledWith(
        '/test/project',
        expect.stringMatching(/^issue\/42-fix-critical-bug/),
      );
    });
  });

  // ============================================================
  // Integration Flow Tests (Task 4.5)
  // ============================================================

  describe('Issue creation -> Label auto-assign flow', () => {
    it('should create issue and auto-assign status:triage label', async () => {
      const createdIssue = {
        number: 15,
        title: 'New bug report',
        body: 'Steps to reproduce...',
        state: 'open',
        labels: [],
        assignees: [],
        milestone: null,
        created_at: '2026-03-01',
        updated_at: '2026-03-01',
        comments: 0,
        user: { login: 'reporter', avatar_url: '' },
      };
      (mockServices.gitHubApiService as any).createIssue.mockResolvedValue({ ok: true, data: createdIssue });
      (mockServices.gitHubApiService as any).updateStatusLabel.mockResolvedValue({ ok: true, data: undefined });

      const caller = createTestCaller(mockServices);
      const result = await caller.issue.createIssue({
        projectPath: '/test/project',
        title: 'New bug report',
        body: 'Steps to reproduce...',
        labels: ['bug'],
        assignees: ['dev1'],
      });

      // Issue was created
      expect(result.number).toBe(15);
      // createIssue was called with correct input
      expect(mockServices.gitHubApiService!.createIssue).toHaveBeenCalledWith('/test/project', {
        title: 'New bug report',
        body: 'Steps to reproduce...',
        labels: ['bug'],
        assignees: ['dev1'],
      });
      // status:triage was auto-assigned
      expect(mockServices.gitHubApiService!.updateStatusLabel).toHaveBeenCalledWith('/test/project', 15, 'triage');
    });
  });

  describe('PR creation -> Merge -> Label update flow', () => {
    it('should create PR, merge, and update label to status:done', async () => {
      const mockPR = {
        number: 5,
        title: 'Fix #42',
        body: 'Closes #42\n\nFix description',
        state: 'open',
        head: { ref: 'issue/42-fix', sha: 'abc123' },
        base: { ref: 'main' },
        mergeable: true,
        merged: false,
        labels: [],
        user: { login: 'dev', avatar_url: '' },
        created_at: '',
        updated_at: '',
        diff_url: '',
      };

      // Step 1: Create PR
      (mockServices.gitHubApiService as any).createPullRequest.mockResolvedValue({ ok: true, data: mockPR });
      (mockServices.gitHubApiService as any).updateStatusLabel.mockResolvedValue({ ok: true, data: undefined });
      (mockServices.gitHubApiService as any).mergePullRequest.mockResolvedValue({ ok: true, data: undefined });

      const caller = createTestCaller(mockServices);

      // Create PR with Closes #42
      const pr = await caller.issue.createPullRequest({
        projectPath: '/test/project',
        title: 'Fix #42',
        body: 'Fix description',
        head: 'issue/42-fix',
        base: 'main',
        issueNumber: 42,
      });
      expect(pr.number).toBe(5);
      // Label updated to in-review
      expect(mockServices.gitHubApiService!.updateStatusLabel).toHaveBeenCalledWith('/test/project', 42, 'in-review');

      // Step 2: Merge PR
      vi.mocked(mockServices.gitHubApiService!.updateStatusLabel).mockClear();
      await caller.issue.mergePullRequest({
        projectPath: '/test/project',
        number: 5,
        method: 'squash',
        issueNumber: 42,
      });

      // Label updated to done
      expect(mockServices.gitHubApiService!.updateStatusLabel).toHaveBeenCalledWith('/test/project', 42, 'done');
    });
  });
});
