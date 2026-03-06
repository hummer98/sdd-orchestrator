/**
 * Integration Test: Agent + Issue Context Injection
 * github-issue-integration: Task 15.4
 * Requirements: 9.1, 9.2
 * Integration Point: Design "Agent + Issue Context"
 *
 * Tests the end-to-end flow of:
 * - Agent execution with issue context injection from issueStore
 * - Issue context building from Issue body + comments
 * - Agent completion with Issue comment auto-posting
 * - Agent start with label status:in-progress update
 *
 * Mock boundaries:
 * - GitHubApiService (mocked)
 * - agentProcess extensions (functions tested directly)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isIssueAgent,
  extractIssueNumberFromSpecId,
  buildIssueContext,
  handleAgentStartForIssue,
  handleAgentCompletionForIssue,
} from '../agentIssueIntegration';

// Mock projectLogger
vi.mock('../projectLogger', () => ({
  projectLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Integration: Agent + Issue Context', () => {
  // ==========================================================================
  // Issue Agent Detection
  // ==========================================================================

  describe('Issue agent detection', () => {
    it('should detect issue-bound agents by specId pattern', () => {
      expect(isIssueAgent('issue:42')).toBe(true);
      expect(isIssueAgent('issue:1')).toBe(true);
      expect(isIssueAgent('issue:999')).toBe(true);
    });

    it('should NOT detect non-issue agents', () => {
      expect(isIssueAgent('my-feature')).toBe(false);
      expect(isIssueAgent('bug:fix-thing')).toBe(false);
      expect(isIssueAgent('')).toBe(false);
      expect(isIssueAgent('issue')).toBe(false);
    });

    it('should extract issue number from specId', () => {
      expect(extractIssueNumberFromSpecId('issue:42')).toBe(42);
      expect(extractIssueNumberFromSpecId('issue:1')).toBe(1);
      expect(extractIssueNumberFromSpecId('issue:999')).toBe(999);
    });

    it('should return null for invalid issue specIds', () => {
      expect(extractIssueNumberFromSpecId('my-feature')).toBeNull();
      expect(extractIssueNumberFromSpecId('issue:')).toBeNull();
      expect(extractIssueNumberFromSpecId('issue:abc')).toBeNull();
      expect(extractIssueNumberFromSpecId('issue:-1')).toBeNull();
      expect(extractIssueNumberFromSpecId('issue:0')).toBeNull();
    });
  });

  // ==========================================================================
  // Issue Context Building (Requirement 9.1)
  // ==========================================================================

  describe('Issue context building', () => {
    let mockGitHubApiService: any;

    beforeEach(() => {
      mockGitHubApiService = {
        getIssue: vi.fn(),
        getIssueComments: vi.fn(),
        updateStatusLabel: vi.fn(),
        addIssueComment: vi.fn(),
      };
    });

    it('should build context from issue body and comments', async () => {
      mockGitHubApiService.getIssue.mockResolvedValue({
        ok: true,
        data: {
          number: 42,
          title: 'Fix login bug',
          body: 'Users cannot login after password reset',
          state: 'open',
          labels: [
            { name: 'bug', color: 'd73a4a', description: null },
            { name: 'status:in-progress', color: '0e8a16', description: null },
          ],
          user: { login: 'reporter', avatar_url: '' },
        },
      });

      mockGitHubApiService.getIssueComments.mockResolvedValue({
        ok: true,
        data: [
          {
            id: 1,
            body: 'I can reproduce this',
            user: { login: 'tester', avatar_url: '' },
            created_at: '2026-03-01T10:00:00Z',
            updated_at: '2026-03-01T10:00:00Z',
          },
          {
            id: 2,
            body: 'Root cause found: session token not refreshed',
            user: { login: 'developer', avatar_url: '' },
            created_at: '2026-03-01T11:00:00Z',
            updated_at: '2026-03-01T11:00:00Z',
          },
        ],
      });

      const context = await buildIssueContext(
        mockGitHubApiService,
        '/test/project',
        42,
      );

      // Verify: Context includes issue title, body, labels
      expect(context).toContain('## GitHub Issue #42: Fix login bug');
      expect(context).toContain('Users cannot login after password reset');
      expect(context).toContain('bug, status:in-progress');
      expect(context).toContain('@reporter');

      // Verify: Context includes comments
      expect(context).toContain('I can reproduce this');
      expect(context).toContain('@tester');
      expect(context).toContain('Root cause found: session token not refreshed');
      expect(context).toContain('@developer');
    });

    it('should handle issue with no comments', async () => {
      mockGitHubApiService.getIssue.mockResolvedValue({
        ok: true,
        data: {
          number: 10,
          title: 'Simple bug',
          body: 'Description here',
          state: 'open',
          labels: [],
          user: { login: 'user', avatar_url: '' },
        },
      });

      mockGitHubApiService.getIssueComments.mockResolvedValue({
        ok: true,
        data: [],
      });

      const context = await buildIssueContext(mockGitHubApiService, '/test/project', 10);

      expect(context).toContain('## GitHub Issue #10: Simple bug');
      expect(context).toContain('Description here');
      expect(context).not.toContain('### Comments');
    });

    it('should handle empty issue body', async () => {
      mockGitHubApiService.getIssue.mockResolvedValue({
        ok: true,
        data: {
          number: 5,
          title: 'No body issue',
          body: '',
          state: 'open',
          labels: [],
          user: { login: 'user', avatar_url: '' },
        },
      });

      mockGitHubApiService.getIssueComments.mockResolvedValue({
        ok: true,
        data: [],
      });

      const context = await buildIssueContext(mockGitHubApiService, '/test/project', 5);

      expect(context).toContain('(empty)');
    });

    it('should return null when issue fetch fails', async () => {
      mockGitHubApiService.getIssue.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_FOUND', message: 'Issue not found' },
      });

      const context = await buildIssueContext(mockGitHubApiService, '/test/project', 999);

      expect(context).toBeNull();
    });

    it('should gracefully degrade when comments fetch fails', async () => {
      mockGitHubApiService.getIssue.mockResolvedValue({
        ok: true,
        data: {
          number: 42,
          title: 'Test',
          body: 'Body',
          state: 'open',
          labels: [],
          user: { login: 'user', avatar_url: '' },
        },
      });

      mockGitHubApiService.getIssueComments.mockResolvedValue({
        ok: false,
        error: { type: 'NETWORK_ERROR', message: 'Timeout' },
      });

      const context = await buildIssueContext(mockGitHubApiService, '/test/project', 42);

      // Should still return context without comments
      expect(context).toContain('## GitHub Issue #42: Test');
      expect(context).not.toContain('### Comments');
    });
  });

  // ==========================================================================
  // Agent Start Hook (Requirement 9.4)
  // ==========================================================================

  describe('Agent start for issue', () => {
    let mockGitHubApiService: any;

    beforeEach(() => {
      mockGitHubApiService = {
        updateStatusLabel: vi.fn(),
        addIssueComment: vi.fn(),
      };
    });

    it('should set status:in-progress label on agent start', async () => {
      mockGitHubApiService.updateStatusLabel.mockResolvedValue({
        ok: true,
        data: undefined,
      });

      await handleAgentStartForIssue(mockGitHubApiService, '/test/project', 42);

      expect(mockGitHubApiService.updateStatusLabel).toHaveBeenCalledWith(
        '/test/project',
        42,
        'in-progress',
      );
    });

    it('should handle label update failure gracefully', async () => {
      mockGitHubApiService.updateStatusLabel.mockResolvedValue({
        ok: false,
        error: { type: 'NETWORK_ERROR', message: 'Connection timeout' },
      });

      // Should not throw
      await expect(
        handleAgentStartForIssue(mockGitHubApiService, '/test/project', 42),
      ).resolves.toBeUndefined();
    });

    it('should handle exceptions gracefully', async () => {
      mockGitHubApiService.updateStatusLabel.mockRejectedValue(new Error('Unexpected error'));

      // Should not throw
      await expect(
        handleAgentStartForIssue(mockGitHubApiService, '/test/project', 42),
      ).resolves.toBeUndefined();
    });
  });

  // ==========================================================================
  // Agent Completion Hook (Requirement 9.2)
  // ==========================================================================

  describe('Agent completion for issue', () => {
    let mockGitHubApiService: any;

    beforeEach(() => {
      mockGitHubApiService = {
        addIssueComment: vi.fn(),
        updateStatusLabel: vi.fn(),
      };
    });

    it('should post success comment on agent completion with exit code 0', async () => {
      mockGitHubApiService.addIssueComment.mockResolvedValue({
        ok: true,
        data: { id: 100, body: '', user: { login: 'bot', avatar_url: '' }, created_at: '', updated_at: '' },
      });

      await handleAgentCompletionForIssue(
        mockGitHubApiService,
        '/test/project',
        42,
        { agentId: 'agent-001', phase: 'issue-fix', exitCode: 0 },
      );

      // Verify: comment posted
      expect(mockGitHubApiService.addIssueComment).toHaveBeenCalledTimes(1);
      const [, , body] = mockGitHubApiService.addIssueComment.mock.calls[0];
      expect(body).toContain('SDD Agent Execution Summary');
      expect(body).toContain('issue-fix');
      expect(body).toContain('agent-001');
      expect(body).toContain('completed successfully');
      expect(body).toContain(':white_check_mark:');
    });

    it('should post failure comment on agent completion with non-zero exit code', async () => {
      mockGitHubApiService.addIssueComment.mockResolvedValue({
        ok: true,
        data: { id: 101, body: '', user: { login: 'bot', avatar_url: '' }, created_at: '', updated_at: '' },
      });

      await handleAgentCompletionForIssue(
        mockGitHubApiService,
        '/test/project',
        42,
        { agentId: 'agent-002', phase: 'issue-analyze', exitCode: 1 },
      );

      const [, , body] = mockGitHubApiService.addIssueComment.mock.calls[0];
      expect(body).toContain('failed');
      expect(body).toContain(':x:');
      expect(body).toContain('`1`'); // exit code
    });

    it('should handle comment posting failure gracefully', async () => {
      mockGitHubApiService.addIssueComment.mockResolvedValue({
        ok: false,
        error: { type: 'NETWORK_ERROR', message: 'Connection refused' },
      });

      // Should not throw
      await expect(
        handleAgentCompletionForIssue(
          mockGitHubApiService,
          '/test/project',
          42,
          { agentId: 'agent-003', phase: 'test', exitCode: 0 },
        ),
      ).resolves.toBeUndefined();
    });

    it('should handle unexpected exceptions gracefully', async () => {
      mockGitHubApiService.addIssueComment.mockRejectedValue(new Error('Network error'));

      await expect(
        handleAgentCompletionForIssue(
          mockGitHubApiService,
          '/test/project',
          42,
          { agentId: 'agent-004', phase: 'test', exitCode: 0 },
        ),
      ).resolves.toBeUndefined();
    });
  });

  // ==========================================================================
  // Full Agent + Issue Lifecycle
  // ==========================================================================

  describe('Full agent + issue lifecycle', () => {
    let mockGitHubApiService: any;

    beforeEach(() => {
      mockGitHubApiService = {
        getIssue: vi.fn(),
        getIssueComments: vi.fn(),
        updateStatusLabel: vi.fn(),
        addIssueComment: vi.fn(),
      };
    });

    it('should support context build -> agent start -> agent complete flow', async () => {
      const specId = 'issue:42';
      const issueNumber = extractIssueNumberFromSpecId(specId);
      expect(issueNumber).toBe(42);

      // Step 1: Build context for agent
      mockGitHubApiService.getIssue.mockResolvedValue({
        ok: true,
        data: {
          number: 42,
          title: 'Fix bug',
          body: 'Description of the bug',
          state: 'open',
          labels: [{ name: 'status:triage', color: '', description: null }],
          user: { login: 'reporter', avatar_url: '' },
        },
      });
      mockGitHubApiService.getIssueComments.mockResolvedValue({
        ok: true,
        data: [],
      });

      const context = await buildIssueContext(mockGitHubApiService, '/test/project', 42);
      expect(context).toContain('Fix bug');
      expect(context).toContain('Description of the bug');

      // Step 2: Agent starts -> label set to in-progress
      mockGitHubApiService.updateStatusLabel.mockResolvedValue({ ok: true, data: undefined });

      await handleAgentStartForIssue(mockGitHubApiService, '/test/project', 42);
      expect(mockGitHubApiService.updateStatusLabel).toHaveBeenCalledWith(
        '/test/project',
        42,
        'in-progress',
      );

      // Step 3: Agent completes -> comment posted
      mockGitHubApiService.addIssueComment.mockResolvedValue({
        ok: true,
        data: { id: 1, body: '', user: { login: 'bot', avatar_url: '' }, created_at: '', updated_at: '' },
      });

      await handleAgentCompletionForIssue(
        mockGitHubApiService,
        '/test/project',
        42,
        { agentId: 'agent-001', phase: 'issue-fix', exitCode: 0 },
      );
      expect(mockGitHubApiService.addIssueComment).toHaveBeenCalledTimes(1);
    });
  });
});
