/**
 * AgentIssueIntegration Tests
 *
 * github-issue-integration: Tasks 11.1, 11.2
 * Requirements: 9.1 (Issue context auto-injection), 9.2 (Agent result comment posting),
 *               9.3 (Existing Agent UI usage), 9.4 (Label maintenance during execution)
 *
 * TDD: RED phase - Tests written before implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isIssueAgent,
  extractIssueNumberFromSpecId,
  buildIssueContext,
  handleAgentStartForIssue,
  handleAgentCompletionForIssue,
} from './agentIssueIntegration';
import type { GitHubApiService } from './gitHubApiService';
import type { GitHubIssue, GitHubComment, GitHubLabel } from '@shared/types/github';

// =============================================================================
// Mock Factory
// =============================================================================

function createMockGitHubApiService(): {
  service: GitHubApiService;
  getIssue: ReturnType<typeof vi.fn>;
  getIssueComments: ReturnType<typeof vi.fn>;
  addIssueComment: ReturnType<typeof vi.fn>;
  updateStatusLabel: ReturnType<typeof vi.fn>;
} {
  const getIssue = vi.fn();
  const getIssueComments = vi.fn();
  const addIssueComment = vi.fn();
  const updateStatusLabel = vi.fn();

  const service = {
    getIssue,
    getIssueComments,
    addIssueComment,
    updateStatusLabel,
    // Other methods not needed for these tests
    detectRepoInfo: vi.fn(),
    listIssues: vi.fn(),
    createIssue: vi.fn(),
    setIssueLabels: vi.fn(),
    ensureStatusLabels: vi.fn(),
    listPullRequests: vi.fn(),
    getPullRequest: vi.fn(),
    createPullRequest: vi.fn(),
    mergePullRequest: vi.fn(),
    getPRCIStatus: vi.fn(),
    getPRFiles: vi.fn(),
    testConnection: vi.fn(),
  } as unknown as GitHubApiService;

  return { service, getIssue, getIssueComments, addIssueComment, updateStatusLabel };
}

function createMockIssue(overrides?: Partial<GitHubIssue>): GitHubIssue {
  return {
    number: 42,
    title: 'Fix login bug',
    body: 'The login form crashes when submitting empty fields.',
    state: 'open',
    labels: [{ name: 'status:in-progress', color: 'yellow', description: null }],
    assignees: [{ login: 'developer', avatar_url: 'https://example.com/avatar.png' }],
    milestone: null,
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-05T00:00:00Z',
    comments: 2,
    user: { login: 'reporter', avatar_url: 'https://example.com/reporter.png' },
    ...overrides,
  };
}

function createMockComment(overrides?: Partial<GitHubComment>): GitHubComment {
  return {
    id: 1,
    body: 'I can reproduce this on Chrome 120.',
    user: { login: 'tester', avatar_url: 'https://example.com/tester.png' },
    created_at: '2026-03-02T00:00:00Z',
    updated_at: '2026-03-02T00:00:00Z',
    ...overrides,
  };
}

// =============================================================================
// Tests: isIssueAgent
// =============================================================================

describe('isIssueAgent', () => {
  it('should return true for issue: prefixed specId', () => {
    expect(isIssueAgent('issue:42')).toBe(true);
    expect(isIssueAgent('issue:1')).toBe(true);
    expect(isIssueAgent('issue:999')).toBe(true);
  });

  it('should return false for non-issue specIds', () => {
    expect(isIssueAgent('')).toBe(false);
    expect(isIssueAgent('my-feature')).toBe(false);
    expect(isIssueAgent('bug:fix-login')).toBe(false);
    expect(isIssueAgent('issues:42')).toBe(false);
  });
});

// =============================================================================
// Tests: extractIssueNumberFromSpecId
// =============================================================================

describe('extractIssueNumberFromSpecId', () => {
  it('should extract issue number from issue: prefixed specId', () => {
    expect(extractIssueNumberFromSpecId('issue:42')).toBe(42);
    expect(extractIssueNumberFromSpecId('issue:1')).toBe(1);
    expect(extractIssueNumberFromSpecId('issue:999')).toBe(999);
  });

  it('should return null for non-issue specIds', () => {
    expect(extractIssueNumberFromSpecId('')).toBeNull();
    expect(extractIssueNumberFromSpecId('my-feature')).toBeNull();
    expect(extractIssueNumberFromSpecId('bug:fix-login')).toBeNull();
  });

  it('should return null for invalid issue number', () => {
    expect(extractIssueNumberFromSpecId('issue:abc')).toBeNull();
    expect(extractIssueNumberFromSpecId('issue:')).toBeNull();
  });
});

// =============================================================================
// Tests: buildIssueContext (Task 11.1)
// =============================================================================

describe('buildIssueContext', () => {
  let mock: ReturnType<typeof createMockGitHubApiService>;

  beforeEach(() => {
    mock = createMockGitHubApiService();
  });

  it('should build context string with issue body and comments', async () => {
    const issue = createMockIssue();
    const comments = [
      createMockComment({ id: 1, body: 'First comment', user: { login: 'user1', avatar_url: '' } }),
      createMockComment({ id: 2, body: 'Second comment', user: { login: 'user2', avatar_url: '' } }),
    ];

    mock.getIssue.mockResolvedValue({ ok: true, data: issue });
    mock.getIssueComments.mockResolvedValue({ ok: true, data: comments });

    const context = await buildIssueContext(mock.service, '/project', 42);

    expect(context).not.toBeNull();
    // Should contain issue title
    expect(context).toContain('Fix login bug');
    // Should contain issue body
    expect(context).toContain('The login form crashes when submitting empty fields.');
    // Should contain comments
    expect(context).toContain('First comment');
    expect(context).toContain('Second comment');
    // Should contain issue number
    expect(context).toContain('#42');
  });

  it('should build context with no comments', async () => {
    const issue = createMockIssue();
    mock.getIssue.mockResolvedValue({ ok: true, data: issue });
    mock.getIssueComments.mockResolvedValue({ ok: true, data: [] });

    const context = await buildIssueContext(mock.service, '/project', 42);

    expect(context).not.toBeNull();
    expect(context).toContain('Fix login bug');
    expect(context).toContain('The login form crashes when submitting empty fields.');
  });

  it('should return null when issue fetch fails', async () => {
    mock.getIssue.mockResolvedValue({
      ok: false,
      error: { type: 'NOT_FOUND', message: 'Issue not found' },
    });

    const context = await buildIssueContext(mock.service, '/project', 999);

    expect(context).toBeNull();
  });

  it('should include labels in context', async () => {
    const issue = createMockIssue({
      labels: [
        { name: 'bug', color: 'red', description: null },
        { name: 'status:in-progress', color: 'yellow', description: null },
      ],
    });
    mock.getIssue.mockResolvedValue({ ok: true, data: issue });
    mock.getIssueComments.mockResolvedValue({ ok: true, data: [] });

    const context = await buildIssueContext(mock.service, '/project', 42);

    expect(context).toContain('bug');
    expect(context).toContain('status:in-progress');
  });

  it('should gracefully handle comment fetch failure and return context without comments', async () => {
    const issue = createMockIssue();
    mock.getIssue.mockResolvedValue({ ok: true, data: issue });
    mock.getIssueComments.mockResolvedValue({
      ok: false,
      error: { type: 'NETWORK_ERROR', message: 'Network error' },
    });

    const context = await buildIssueContext(mock.service, '/project', 42);

    // Should still return context with issue body, just without comments
    expect(context).not.toBeNull();
    expect(context).toContain('Fix login bug');
  });
});

// =============================================================================
// Tests: handleAgentStartForIssue (Task 11.2 - Label maintenance)
// =============================================================================

describe('handleAgentStartForIssue', () => {
  let mock: ReturnType<typeof createMockGitHubApiService>;

  beforeEach(() => {
    mock = createMockGitHubApiService();
  });

  it('should update label to status:in-progress when agent starts for issue', async () => {
    mock.updateStatusLabel.mockResolvedValue({ ok: true, data: undefined });

    await handleAgentStartForIssue(mock.service, '/project', 42);

    expect(mock.updateStatusLabel).toHaveBeenCalledWith('/project', 42, 'in-progress');
  });

  it('should not throw when label update fails', async () => {
    mock.updateStatusLabel.mockResolvedValue({
      ok: false,
      error: { type: 'NETWORK_ERROR', message: 'Network error' },
    });

    // Should not throw
    await expect(handleAgentStartForIssue(mock.service, '/project', 42)).resolves.not.toThrow();
  });
});

// =============================================================================
// Tests: handleAgentCompletionForIssue (Task 11.2)
// =============================================================================

describe('handleAgentCompletionForIssue', () => {
  let mock: ReturnType<typeof createMockGitHubApiService>;

  beforeEach(() => {
    mock = createMockGitHubApiService();
  });

  it('should post completion summary as issue comment on success', async () => {
    mock.addIssueComment.mockResolvedValue({
      ok: true,
      data: createMockComment({ body: 'Agent completed' }),
    });

    await handleAgentCompletionForIssue(mock.service, '/project', 42, {
      agentId: 'agent-001',
      phase: 'issue-fix',
      exitCode: 0,
    });

    expect(mock.addIssueComment).toHaveBeenCalledTimes(1);
    const [projectPath, issueNumber, body] = mock.addIssueComment.mock.calls[0];
    expect(projectPath).toBe('/project');
    expect(issueNumber).toBe(42);
    // Comment should contain phase and success indication
    expect(body).toContain('issue-fix');
    expect(body).toMatch(/complete|success/i);
  });

  it('should post failure summary as issue comment on failure', async () => {
    mock.addIssueComment.mockResolvedValue({
      ok: true,
      data: createMockComment({ body: 'Agent failed' }),
    });

    await handleAgentCompletionForIssue(mock.service, '/project', 42, {
      agentId: 'agent-002',
      phase: 'issue-analyze',
      exitCode: 1,
    });

    expect(mock.addIssueComment).toHaveBeenCalledTimes(1);
    const [, , body] = mock.addIssueComment.mock.calls[0];
    expect(body).toContain('issue-analyze');
    expect(body).toMatch(/fail/i);
  });

  it('should not throw when comment posting fails', async () => {
    mock.addIssueComment.mockResolvedValue({
      ok: false,
      error: { type: 'AUTH_FAILED', message: 'Invalid token' },
    });

    await expect(
      handleAgentCompletionForIssue(mock.service, '/project', 42, {
        agentId: 'agent-003',
        phase: 'issue-fix',
        exitCode: 0,
      })
    ).resolves.not.toThrow();
  });

  it('should include agent ID in the comment', async () => {
    mock.addIssueComment.mockResolvedValue({
      ok: true,
      data: createMockComment(),
    });

    await handleAgentCompletionForIssue(mock.service, '/project', 42, {
      agentId: 'agent-007',
      phase: 'issue-verify',
      exitCode: 0,
    });

    const [, , body] = mock.addIssueComment.mock.calls[0];
    expect(body).toContain('agent-007');
  });
});
