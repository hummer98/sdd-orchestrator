/**
 * Integration Test: Issue CRUD Flow
 * github-issue-integration: Task 15.1
 * Requirements: 2.2, 3.2, 3.3, 4.2
 * Integration Point: Design.md "Issue CRUD Flow"
 *
 * Tests the end-to-end flow of:
 * - Issue creation via issueRouter -> GitHubApiService (mocked HTTP) -> Label auto-assign
 * - Status label update flow
 * - EventBus notifications on mutations
 *
 * Mock boundaries:
 * - GitHubApiService HTTP layer (mocked via createMockServices)
 * - tRPC Context via createTestContext
 *
 * Verification:
 * - Issue created with correct parameters
 * - status:triage label auto-assigned after creation
 * - EventBus events emitted for issue list/detail updates
 * - Status label update calls updateStatusLabel on GitHubApiService
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestCaller, createMockServices } from '../helpers/test-helpers';
import type { ContextServices } from '../context';
import { EVENT_NAMES } from '../services/eventBus';

describe('Integration: Issue CRUD Flow', () => {
  let mockServices: ContextServices;

  const projectPath = '/test/project';

  const mockIssue = {
    number: 42,
    title: 'Fix authentication bug',
    body: 'Users are getting logged out unexpectedly',
    state: 'open' as const,
    labels: [],
    assignees: [],
    milestone: null,
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
    comments: 0,
    user: { login: 'developer', avatar_url: 'https://example.com/avatar' },
  };

  beforeEach(() => {
    mockServices = createMockServices();
  });

  // ==========================================================================
  // Issue Creation -> Label Auto-assign -> EventBus Notification
  // ==========================================================================

  describe('Issue creation with auto-label flow', () => {
    it('should create issue and auto-assign status:triage label', async () => {
      // Setup: createIssue returns a new issue, updateStatusLabel succeeds
      (mockServices.gitHubApiService as any).createIssue.mockResolvedValue({
        ok: true,
        data: mockIssue,
      });
      (mockServices.gitHubApiService as any).updateStatusLabel.mockResolvedValue({
        ok: true,
        data: undefined,
      });

      const caller = createTestCaller(mockServices);

      // Act: Create issue via issueRouter
      const result = await caller.issue.createIssue({
        projectPath,
        title: 'Fix authentication bug',
        body: 'Users are getting logged out unexpectedly',
        labels: ['bug'],
        assignees: ['developer'],
      });

      // Verify: Issue created correctly
      expect(result).toEqual(mockIssue);
      expect(mockServices.gitHubApiService!.createIssue).toHaveBeenCalledWith(projectPath, {
        title: 'Fix authentication bug',
        body: 'Users are getting logged out unexpectedly',
        labels: ['bug'],
        assignees: ['developer'],
      });

      // Verify: status:triage label auto-assigned
      expect(mockServices.gitHubApiService!.updateStatusLabel).toHaveBeenCalledWith(
        projectPath,
        42, // issue number from created issue
        'triage',
      );

      // Verify: EventBus notified about issue list update
      const eventBusSpy = vi.spyOn(mockServices.eventBus!, 'emit');
      // Re-run to capture the spy (already called in the flow above)
      // Check that the flow called emit - we need to set up spy before the call
    });

    it('should emit ISSUE_LIST_UPDATED event after issue creation', async () => {
      (mockServices.gitHubApiService as any).createIssue.mockResolvedValue({
        ok: true,
        data: mockIssue,
      });
      (mockServices.gitHubApiService as any).updateStatusLabel.mockResolvedValue({
        ok: true,
        data: undefined,
      });

      // Spy on EventBus before the call
      const emitSpy = vi.spyOn(mockServices.eventBus!, 'emit');

      const caller = createTestCaller(mockServices);
      await caller.issue.createIssue({
        projectPath,
        title: 'Fix authentication bug',
        body: 'Body',
      });

      // Verify: ISSUE_LIST_UPDATED event emitted
      expect(emitSpy).toHaveBeenCalledWith(
        EVENT_NAMES.ISSUE_LIST_UPDATED,
        expect.objectContaining({ projectPath }),
      );
    });

    it('should propagate API error when issue creation fails', async () => {
      (mockServices.gitHubApiService as any).createIssue.mockResolvedValue({
        ok: false,
        error: { type: 'AUTH_FAILED', message: 'Token expired' },
      });

      const caller = createTestCaller(mockServices);

      await expect(
        caller.issue.createIssue({
          projectPath,
          title: 'Test',
          body: 'Body',
        }),
      ).rejects.toThrow('Token expired');

      // Verify: updateStatusLabel NOT called when creation fails
      expect(mockServices.gitHubApiService!.updateStatusLabel).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Status Label Update Flow
  // ==========================================================================

  describe('Status label update flow', () => {
    it('should update status label and emit ISSUE_DETAIL_UPDATED event', async () => {
      (mockServices.gitHubApiService as any).updateStatusLabel.mockResolvedValue({
        ok: true,
        data: undefined,
      });

      const emitSpy = vi.spyOn(mockServices.eventBus!, 'emit');

      const caller = createTestCaller(mockServices);
      await caller.issue.updateStatusLabel({
        projectPath,
        number: 42,
        status: 'in-progress',
      });

      // Verify: GitHubApiService called with correct status
      expect(mockServices.gitHubApiService!.updateStatusLabel).toHaveBeenCalledWith(
        projectPath,
        42,
        'in-progress',
      );

      // Verify: ISSUE_DETAIL_UPDATED event emitted
      expect(emitSpy).toHaveBeenCalledWith(
        EVENT_NAMES.ISSUE_DETAIL_UPDATED,
        expect.objectContaining({ projectPath, issueNumber: 42 }),
      );
    });

    it('should propagate error when label update fails', async () => {
      (mockServices.gitHubApiService as any).updateStatusLabel.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_FOUND', message: 'Issue not found' },
      });

      const caller = createTestCaller(mockServices);

      await expect(
        caller.issue.updateStatusLabel({
          projectPath,
          number: 999,
          status: 'done',
        }),
      ).rejects.toThrow('Issue not found');
    });
  });

  // ==========================================================================
  // Issue Query -> Comment -> Event Flow
  // ==========================================================================

  describe('Issue query and comment flow', () => {
    it('should retrieve issue list with filters', async () => {
      const issues = [mockIssue, { ...mockIssue, number: 43, title: 'Second issue' }];
      (mockServices.gitHubApiService as any).listIssues.mockResolvedValue({
        ok: true,
        data: issues,
      });

      const caller = createTestCaller(mockServices);
      const result = await caller.issue.listIssues({
        projectPath,
        filters: { state: 'open', labels: ['bug'] },
      });

      expect(result).toHaveLength(2);
      expect(mockServices.gitHubApiService!.listIssues).toHaveBeenCalledWith(
        projectPath,
        { state: 'open', labels: ['bug'] },
      );
    });

    it('should add comment and emit ISSUE_DETAIL_UPDATED event', async () => {
      const mockComment = {
        id: 1,
        body: 'Investigation complete',
        user: { login: 'developer', avatar_url: '' },
        created_at: '2026-03-01T01:00:00Z',
        updated_at: '2026-03-01T01:00:00Z',
      };
      (mockServices.gitHubApiService as any).addIssueComment.mockResolvedValue({
        ok: true,
        data: mockComment,
      });

      const emitSpy = vi.spyOn(mockServices.eventBus!, 'emit');

      const caller = createTestCaller(mockServices);
      const result = await caller.issue.addIssueComment({
        projectPath,
        number: 42,
        body: 'Investigation complete',
      });

      expect(result).toEqual(mockComment);
      expect(mockServices.gitHubApiService!.addIssueComment).toHaveBeenCalledWith(
        projectPath,
        42,
        'Investigation complete',
      );

      // Verify event emitted
      expect(emitSpy).toHaveBeenCalledWith(
        EVENT_NAMES.ISSUE_DETAIL_UPDATED,
        expect.objectContaining({ projectPath, issueNumber: 42 }),
      );
    });
  });

  // ==========================================================================
  // Full CRUD Lifecycle Flow
  // ==========================================================================

  describe('Full CRUD lifecycle', () => {
    it('should support create -> query -> update status -> comment flow', async () => {
      // Step 1: Create issue
      (mockServices.gitHubApiService as any).createIssue.mockResolvedValue({
        ok: true,
        data: mockIssue,
      });
      (mockServices.gitHubApiService as any).updateStatusLabel.mockResolvedValue({
        ok: true,
        data: undefined,
      });

      const caller = createTestCaller(mockServices);
      const created = await caller.issue.createIssue({
        projectPath,
        title: mockIssue.title,
        body: mockIssue.body,
      });
      expect(created.number).toBe(42);

      // Step 2: Query the created issue
      (mockServices.gitHubApiService as any).getIssue.mockResolvedValue({
        ok: true,
        data: { ...mockIssue, labels: [{ name: 'status:triage', color: 'ffffff', description: null }] },
      });

      const queried = await caller.issue.getIssue({ projectPath, number: 42 });
      expect(queried.number).toBe(42);
      expect(queried.labels).toHaveLength(1);
      expect(queried.labels[0].name).toBe('status:triage');

      // Step 3: Update status to in-progress
      await caller.issue.updateStatusLabel({
        projectPath,
        number: 42,
        status: 'in-progress',
      });
      expect(mockServices.gitHubApiService!.updateStatusLabel).toHaveBeenCalledWith(
        projectPath,
        42,
        'in-progress',
      );

      // Step 4: Add comment
      (mockServices.gitHubApiService as any).addIssueComment.mockResolvedValue({
        ok: true,
        data: {
          id: 1,
          body: 'Working on fix',
          user: { login: 'developer', avatar_url: '' },
          created_at: '',
          updated_at: '',
        },
      });

      const comment = await caller.issue.addIssueComment({
        projectPath,
        number: 42,
        body: 'Working on fix',
      });
      expect(comment.body).toBe('Working on fix');
    });
  });
});
