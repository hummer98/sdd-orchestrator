/**
 * GitHub Types Tests
 *
 * github-issue-integration: Task 1.1
 * Requirements: 4.1
 *
 * Tests for GitHub domain model types used across Issue/PR workflows.
 * Following TDD methodology - tests written before implementation.
 */

import { describe, it, expect } from 'vitest';
import type {
  GitHubIssue,
  GitHubLabel,
  GitHubUser,
  GitHubMilestone,
  GitHubComment,
  GitHubPullRequest,
  PRFile,
  CIStatus,
  CIStatusEntry,
  StatusLabel,
  MergeMethod,
  GitHubRepoInfo,
  GitHubApiError,
  GitHubApiErrorType,
  IssueFilters,
  PRFilters,
  CreateIssueInput,
  CreatePRInput,
  ConnectionStatus,
} from './github';
import {
  STATUS_LABELS,
  STATUS_LABEL_COLORS,
  isStatusLabel,
} from './github';

// =============================================================================
// Helper Functions
// =============================================================================

function createGitHubUser(overrides?: Partial<GitHubUser>): GitHubUser {
  return {
    login: 'testuser',
    avatar_url: 'https://avatars.githubusercontent.com/u/12345',
    ...overrides,
  };
}

function createGitHubLabel(overrides?: Partial<GitHubLabel>): GitHubLabel {
  return {
    name: 'bug',
    color: 'fc2929',
    description: 'Something is broken',
    ...overrides,
  };
}

function createGitHubMilestone(overrides?: Partial<GitHubMilestone>): GitHubMilestone {
  return {
    title: 'v1.0',
    number: 1,
    ...overrides,
  };
}

function createGitHubIssue(overrides?: Partial<GitHubIssue>): GitHubIssue {
  return {
    number: 42,
    title: 'Fix the bug',
    body: 'Description of the bug',
    state: 'open',
    labels: [createGitHubLabel()],
    assignees: [createGitHubUser()],
    milestone: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    comments: 3,
    user: createGitHubUser(),
    ...overrides,
  };
}

function createGitHubComment(overrides?: Partial<GitHubComment>): GitHubComment {
  return {
    id: 1001,
    body: 'This is a comment',
    user: createGitHubUser(),
    created_at: '2026-01-01T12:00:00Z',
    updated_at: '2026-01-01T12:00:00Z',
    ...overrides,
  };
}

function createGitHubPullRequest(overrides?: Partial<GitHubPullRequest>): GitHubPullRequest {
  return {
    number: 99,
    title: 'Fix issue #42',
    body: 'Closes #42',
    state: 'open',
    head: { ref: 'feature/fix-42', sha: 'abc123' },
    base: { ref: 'main' },
    mergeable: true,
    merged: false,
    labels: [],
    user: createGitHubUser(),
    created_at: '2026-01-03T00:00:00Z',
    updated_at: '2026-01-03T00:00:00Z',
    diff_url: 'https://github.com/owner/repo/pull/99.diff',
    ...overrides,
  };
}

// =============================================================================
// Domain Types
// =============================================================================

describe('GitHub Domain Types', () => {
  describe('GitHubUser', () => {
    it('should have login and avatar_url fields', () => {
      const user: GitHubUser = createGitHubUser();
      expect(user.login).toBe('testuser');
      expect(user.avatar_url).toBe('https://avatars.githubusercontent.com/u/12345');
    });
  });

  describe('GitHubLabel', () => {
    it('should have name, color, and nullable description', () => {
      const label: GitHubLabel = createGitHubLabel();
      expect(label.name).toBe('bug');
      expect(label.color).toBe('fc2929');
      expect(label.description).toBe('Something is broken');
    });

    it('should allow null description', () => {
      const label: GitHubLabel = createGitHubLabel({ description: null });
      expect(label.description).toBeNull();
    });
  });

  describe('GitHubMilestone', () => {
    it('should have title and number fields', () => {
      const milestone: GitHubMilestone = createGitHubMilestone();
      expect(milestone.title).toBe('v1.0');
      expect(milestone.number).toBe(1);
    });
  });

  describe('GitHubIssue', () => {
    it('should have all required fields', () => {
      const issue: GitHubIssue = createGitHubIssue();
      expect(issue.number).toBe(42);
      expect(issue.title).toBe('Fix the bug');
      expect(issue.body).toBe('Description of the bug');
      expect(issue.state).toBe('open');
      expect(issue.labels).toHaveLength(1);
      expect(issue.assignees).toHaveLength(1);
      expect(issue.milestone).toBeNull();
      expect(issue.comments).toBe(3);
      expect(issue.user.login).toBe('testuser');
    });

    it('should support open and closed states', () => {
      const open: GitHubIssue = createGitHubIssue({ state: 'open' });
      const closed: GitHubIssue = createGitHubIssue({ state: 'closed' });
      expect(open.state).toBe('open');
      expect(closed.state).toBe('closed');
    });

    it('should support optional pull_request field', () => {
      const issueWithPR: GitHubIssue = createGitHubIssue({
        pull_request: { url: 'https://api.github.com/repos/owner/repo/pulls/99' },
      });
      expect(issueWithPR.pull_request?.url).toBe(
        'https://api.github.com/repos/owner/repo/pulls/99'
      );
    });

    it('should allow milestone to be set', () => {
      const issue: GitHubIssue = createGitHubIssue({
        milestone: createGitHubMilestone(),
      });
      expect(issue.milestone?.title).toBe('v1.0');
    });
  });

  describe('GitHubComment', () => {
    it('should have all required fields', () => {
      const comment: GitHubComment = createGitHubComment();
      expect(comment.id).toBe(1001);
      expect(comment.body).toBe('This is a comment');
      expect(comment.user.login).toBe('testuser');
      expect(comment.created_at).toBe('2026-01-01T12:00:00Z');
      expect(comment.updated_at).toBe('2026-01-01T12:00:00Z');
    });
  });

  describe('GitHubPullRequest', () => {
    it('should have all required fields', () => {
      const pr: GitHubPullRequest = createGitHubPullRequest();
      expect(pr.number).toBe(99);
      expect(pr.title).toBe('Fix issue #42');
      expect(pr.head.ref).toBe('feature/fix-42');
      expect(pr.head.sha).toBe('abc123');
      expect(pr.base.ref).toBe('main');
      expect(pr.mergeable).toBe(true);
      expect(pr.merged).toBe(false);
      expect(pr.diff_url).toContain('.diff');
    });

    it('should support open, closed, and merged states', () => {
      const open: GitHubPullRequest = createGitHubPullRequest({ state: 'open' });
      const closed: GitHubPullRequest = createGitHubPullRequest({ state: 'closed' });
      const merged: GitHubPullRequest = createGitHubPullRequest({ state: 'merged' });
      expect(open.state).toBe('open');
      expect(closed.state).toBe('closed');
      expect(merged.state).toBe('merged');
    });

    it('should allow null mergeable', () => {
      const pr: GitHubPullRequest = createGitHubPullRequest({ mergeable: null });
      expect(pr.mergeable).toBeNull();
    });
  });

  describe('PRFile', () => {
    it('should have file diff information', () => {
      const file: PRFile = {
        sha: 'abc123',
        filename: 'src/index.ts',
        status: 'modified',
        additions: 10,
        deletions: 5,
        changes: 15,
        patch: '@@ -1,5 +1,10 @@\n+added line',
      };
      expect(file.filename).toBe('src/index.ts');
      expect(file.status).toBe('modified');
      expect(file.additions).toBe(10);
      expect(file.deletions).toBe(5);
      expect(file.changes).toBe(15);
      expect(file.patch).toBeDefined();
    });

    it('should support all file statuses', () => {
      const statuses: PRFile['status'][] = [
        'added', 'removed', 'modified', 'renamed', 'copied', 'changed', 'unchanged',
      ];
      for (const status of statuses) {
        const file: PRFile = {
          sha: 'abc',
          filename: 'test.ts',
          status,
          additions: 0,
          deletions: 0,
          changes: 0,
        };
        expect(file.status).toBe(status);
      }
    });

    it('should allow optional patch field', () => {
      const file: PRFile = {
        sha: 'abc',
        filename: 'test.ts',
        status: 'added',
        additions: 1,
        deletions: 0,
        changes: 1,
      };
      expect(file.patch).toBeUndefined();
    });
  });

  describe('CIStatus', () => {
    it('should have state and statuses', () => {
      const ci: CIStatus = {
        state: 'success',
        statuses: [
          {
            context: 'ci/build',
            state: 'success',
            description: 'Build passed',
            target_url: 'https://ci.example.com/build/123',
          },
        ],
      };
      expect(ci.state).toBe('success');
      expect(ci.statuses).toHaveLength(1);
      expect(ci.statuses[0].context).toBe('ci/build');
    });

    it('should support all CI states', () => {
      const states: CIStatus['state'][] = ['pending', 'success', 'failure', 'error'];
      for (const state of states) {
        const ci: CIStatus = { state, statuses: [] };
        expect(ci.state).toBe(state);
      }
    });
  });
});

// =============================================================================
// StatusLabel Type and Constants
// =============================================================================

describe('StatusLabel', () => {
  it('STATUS_LABELS should contain all five status values', () => {
    expect(STATUS_LABELS).toEqual([
      'triage',
      'in-progress',
      'in-review',
      'changes-requested',
      'done',
    ]);
  });

  it('STATUS_LABEL_COLORS should map all status labels to colors', () => {
    for (const label of STATUS_LABELS) {
      expect(STATUS_LABEL_COLORS[label]).toBeDefined();
      expect(typeof STATUS_LABEL_COLORS[label]).toBe('string');
    }
  });

  it('isStatusLabel should return true for valid status labels', () => {
    expect(isStatusLabel('triage')).toBe(true);
    expect(isStatusLabel('in-progress')).toBe(true);
    expect(isStatusLabel('in-review')).toBe(true);
    expect(isStatusLabel('changes-requested')).toBe(true);
    expect(isStatusLabel('done')).toBe(true);
  });

  it('isStatusLabel should return false for invalid values', () => {
    expect(isStatusLabel('invalid')).toBe(false);
    expect(isStatusLabel('')).toBe(false);
    expect(isStatusLabel(42)).toBe(false);
    expect(isStatusLabel(null)).toBe(false);
    expect(isStatusLabel(undefined)).toBe(false);
  });
});

// =============================================================================
// Service Types
// =============================================================================

describe('Service Types', () => {
  describe('GitHubRepoInfo', () => {
    it('should have owner, repo, and baseUrl fields', () => {
      const info: GitHubRepoInfo = {
        owner: 'yamamoto',
        repo: 'sdd-orchestrator',
        baseUrl: 'https://api.github.com',
      };
      expect(info.owner).toBe('yamamoto');
      expect(info.repo).toBe('sdd-orchestrator');
      expect(info.baseUrl).toBe('https://api.github.com');
    });
  });

  describe('GitHubApiError', () => {
    it('should have type and message', () => {
      const error: GitHubApiError = {
        type: 'AUTH_FAILED',
        message: 'Bad credentials',
      };
      expect(error.type).toBe('AUTH_FAILED');
      expect(error.message).toBe('Bad credentials');
    });

    it('should support optional statusCode', () => {
      const error: GitHubApiError = {
        type: 'NOT_FOUND',
        message: 'Not Found',
        statusCode: 404,
      };
      expect(error.statusCode).toBe(404);
    });

    it('should support optional retryAfter for rate limits', () => {
      const error: GitHubApiError = {
        type: 'RATE_LIMIT',
        message: 'Rate limit exceeded',
        retryAfter: 60,
      };
      expect(error.retryAfter).toBe(60);
    });

    it('should support all error types', () => {
      const types: GitHubApiErrorType[] = [
        'AUTH_FAILED',
        'NOT_FOUND',
        'RATE_LIMIT',
        'NETWORK_ERROR',
        'REPO_DETECT_FAILED',
        'VALIDATION_ERROR',
      ];
      for (const type of types) {
        const error: GitHubApiError = { type, message: 'test' };
        expect(error.type).toBe(type);
      }
    });
  });

  describe('ConnectionStatus', () => {
    it('should represent unconfigured state', () => {
      const status: ConnectionStatus = {
        configured: false,
        connected: false,
        user: null,
        repoInfo: null,
        error: null,
      };
      expect(status.configured).toBe(false);
      expect(status.connected).toBe(false);
    });

    it('should represent connected state', () => {
      const status: ConnectionStatus = {
        configured: true,
        connected: true,
        user: createGitHubUser(),
        repoInfo: {
          owner: 'owner',
          repo: 'repo',
          baseUrl: 'https://api.github.com',
        },
        error: null,
      };
      expect(status.configured).toBe(true);
      expect(status.connected).toBe(true);
      expect(status.user?.login).toBe('testuser');
    });

    it('should represent error state', () => {
      const status: ConnectionStatus = {
        configured: true,
        connected: false,
        user: null,
        repoInfo: null,
        error: 'Authentication failed',
      };
      expect(status.error).toBe('Authentication failed');
    });
  });
});

// =============================================================================
// Filter Types
// =============================================================================

describe('Filter Types', () => {
  describe('IssueFilters', () => {
    it('should support all filter fields', () => {
      const filters: IssueFilters = {
        state: 'open',
        labels: ['bug', 'priority:high'],
        assignee: 'testuser',
        milestone: 1,
        page: 2,
        per_page: 50,
      };
      expect(filters.state).toBe('open');
      expect(filters.labels).toEqual(['bug', 'priority:high']);
      expect(filters.assignee).toBe('testuser');
      expect(filters.milestone).toBe(1);
      expect(filters.page).toBe(2);
      expect(filters.per_page).toBe(50);
    });

    it('should allow all fields to be optional', () => {
      const filters: IssueFilters = {};
      expect(filters.state).toBeUndefined();
      expect(filters.labels).toBeUndefined();
    });

    it('should support state values: open, closed, all', () => {
      const states: IssueFilters['state'][] = ['open', 'closed', 'all'];
      for (const state of states) {
        const f: IssueFilters = { state };
        expect(f.state).toBe(state);
      }
    });
  });

  describe('PRFilters', () => {
    it('should support all filter fields', () => {
      const filters: PRFilters = {
        state: 'open',
        head: 'feature/branch',
        base: 'main',
        page: 1,
        per_page: 30,
      };
      expect(filters.state).toBe('open');
      expect(filters.head).toBe('feature/branch');
      expect(filters.base).toBe('main');
    });

    it('should allow all fields to be optional', () => {
      const filters: PRFilters = {};
      expect(filters.state).toBeUndefined();
    });
  });
});

// =============================================================================
// Input/Output Types
// =============================================================================

describe('Input/Output Types', () => {
  describe('MergeMethod', () => {
    it('should support merge, squash, and rebase', () => {
      const methods: MergeMethod[] = ['merge', 'squash', 'rebase'];
      expect(methods).toHaveLength(3);
    });
  });

  describe('CreateIssueInput', () => {
    it('should have required title and body', () => {
      const input: CreateIssueInput = {
        title: 'New Issue',
        body: 'Description',
      };
      expect(input.title).toBe('New Issue');
      expect(input.body).toBe('Description');
    });

    it('should support optional labels and assignees', () => {
      const input: CreateIssueInput = {
        title: 'New Issue',
        body: 'Description',
        labels: ['bug', 'priority:high'],
        assignees: ['testuser'],
      };
      expect(input.labels).toEqual(['bug', 'priority:high']);
      expect(input.assignees).toEqual(['testuser']);
    });
  });

  describe('CreatePRInput', () => {
    it('should have required fields', () => {
      const input: CreatePRInput = {
        title: 'Fix issue #42',
        body: 'Closes #42',
        head: 'feature/fix-42',
        base: 'main',
      };
      expect(input.title).toBe('Fix issue #42');
      expect(input.head).toBe('feature/fix-42');
      expect(input.base).toBe('main');
    });

    it('should support optional issueNumber', () => {
      const input: CreatePRInput = {
        title: 'Fix issue #42',
        body: 'Closes #42',
        head: 'feature/fix-42',
        base: 'main',
        issueNumber: 42,
      };
      expect(input.issueNumber).toBe(42);
    });
  });
});
