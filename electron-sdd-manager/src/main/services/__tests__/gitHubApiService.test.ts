/**
 * GitHubApiService Unit Tests
 * TDD: Testing GitHub REST API communication, repo detection, error handling, and Label management
 *
 * github-issue-integration: Task 3.6
 * Requirements: 1.3, 1.4, 1.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { GitHubCredentialService } from '../gitHubCredentialService';

// ============================================================================
// Mocks
// ============================================================================

const mockExecSync = vi.fn();
vi.mock('child_process', () => ({
  execSync: (...args: unknown[]) => mockExecSync(...args),
}));

// Global fetch mock
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function createMockCredentialService(overrides?: Partial<GitHubCredentialService>): GitHubCredentialService {
  return {
    storeToken: vi.fn(),
    getToken: vi.fn().mockReturnValue('ghp_test_token_123'),
    removeToken: vi.fn(),
    storeEnterpriseUrl: vi.fn(),
    getEnterpriseUrl: vi.fn().mockReturnValue(null),
    removeEnterpriseUrl: vi.fn(),
    hasCredentials: vi.fn().mockReturnValue(true),
    ...overrides,
  } as unknown as GitHubCredentialService;
}

function createMockResponse(data: unknown, options?: { status?: number; headers?: Record<string, string> }) {
  const status = options?.status ?? 200;
  const headers = new Map(Object.entries(options?.headers ?? {}));
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : status === 404 ? 'Not Found' : 'Error',
    headers: {
      get: (key: string) => headers.get(key.toLowerCase()) ?? null,
    },
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('GitHubApiService', () => {
  let credentialService: GitHubCredentialService;

  beforeEach(() => {
    vi.clearAllMocks();
    credentialService = createMockCredentialService();
    // Default: HTTPS remote URL (execSync with encoding: 'utf-8' returns string)
    mockExecSync.mockReturnValue('https://github.com/test-owner/test-repo.git\n');
    // Reset GITHUB_TOKEN env
    delete process.env.GITHUB_TOKEN;
  });

  afterEach(() => {
    delete process.env.GITHUB_TOKEN;
  });

  // ==========================================================================
  // Task 3.1: REST API communication base, repo detection, auth, error handling
  // ==========================================================================

  describe('detectRepoInfo', () => {
    it('should detect owner/repo from HTTPS remote URL', async () => {
      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.detectRepoInfo('/path/to/project');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.owner).toBe('test-owner');
        expect(result.data.repo).toBe('test-repo');
        expect(result.data.baseUrl).toBe('https://api.github.com');
      }
    });

    it('should detect owner/repo from SSH remote URL', async () => {
      mockExecSync.mockReturnValue('git@github.com:test-owner/test-repo.git\n');

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.detectRepoInfo('/path/to/project');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.owner).toBe('test-owner');
        expect(result.data.repo).toBe('test-repo');
      }
    });

    it('should detect owner/repo from HTTPS URL without .git suffix', async () => {
      mockExecSync.mockReturnValue('https://github.com/test-owner/test-repo\n');

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.detectRepoInfo('/path/to/project');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.owner).toBe('test-owner');
        expect(result.data.repo).toBe('test-repo');
      }
    });

    it('should use enterprise baseUrl when enterprise URL is configured', async () => {
      credentialService = createMockCredentialService({
        getEnterpriseUrl: vi.fn().mockReturnValue('https://github.example.com'),
      });
      mockExecSync.mockReturnValue('https://github.example.com/org/repo.git\n');

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.detectRepoInfo('/path/to/project');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.owner).toBe('org');
        expect(result.data.repo).toBe('repo');
        expect(result.data.baseUrl).toBe('https://github.example.com/api/v3');
      }
    });

    it('should return REPO_DETECT_FAILED when git command fails', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('fatal: not a git repository');
      });

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.detectRepoInfo('/path/to/project');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('REPO_DETECT_FAILED');
      }
    });

    it('should return REPO_DETECT_FAILED when URL format is unrecognized', async () => {
      mockExecSync.mockReturnValue('invalid-url\n');

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.detectRepoInfo('/path/to/project');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('REPO_DETECT_FAILED');
      }
    });
  });

  describe('authentication', () => {
    it('should use PAT from GitHubCredentialService in Authorization header', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ login: 'testuser', avatar_url: 'https://example.com/avatar' }));

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      await service.testConnection('/path/to/project');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'token ghp_test_token_123',
          }),
        }),
      );
    });

    it('should fallback to GITHUB_TOKEN env var when credential service returns null', async () => {
      process.env.GITHUB_TOKEN = 'ghp_env_token_456';
      credentialService = createMockCredentialService({
        getToken: vi.fn().mockReturnValue(null),
      });
      mockFetch.mockResolvedValue(createMockResponse({ login: 'testuser', avatar_url: 'https://example.com/avatar' }));

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      await service.testConnection('/path/to/project');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'token ghp_env_token_456',
          }),
        }),
      );
    });

    it('should return AUTH_FAILED when no token is available', async () => {
      credentialService = createMockCredentialService({
        getToken: vi.fn().mockReturnValue(null),
      });

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.testConnection('/path/to/project');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('AUTH_FAILED');
      }
    });
  });

  describe('error handling', () => {
    it('should return AUTH_FAILED for 401 response', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ message: 'Bad credentials' }, { status: 401 }));

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.testConnection('/path/to/project');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('AUTH_FAILED');
        expect(result.error.statusCode).toBe(401);
      }
    });

    it('should return AUTH_FAILED for 403 response', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ message: 'Forbidden' }, { status: 403 }));

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.testConnection('/path/to/project');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('AUTH_FAILED');
      }
    });

    it('should return NOT_FOUND for 404 response', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ message: 'Not Found' }, { status: 404 }));

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.getIssue('/path/to/project', 999);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_FOUND');
        expect(result.error.statusCode).toBe(404);
      }
    });

    it('should return RATE_LIMIT for 429 response with retryAfter', async () => {
      mockFetch.mockResolvedValue(createMockResponse(
        { message: 'API rate limit exceeded' },
        {
          status: 429,
          headers: { 'retry-after': '60' },
        },
      ));

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.testConnection('/path/to/project');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('RATE_LIMIT');
        expect(result.error.retryAfter).toBe(60);
      }
    });

    it('should return RATE_LIMIT when X-RateLimit-Remaining is 0', async () => {
      mockFetch.mockResolvedValue(createMockResponse(
        { message: 'API rate limit exceeded' },
        {
          status: 403,
          headers: { 'x-ratelimit-remaining': '0', 'retry-after': '30' },
        },
      ));

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.testConnection('/path/to/project');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('RATE_LIMIT');
      }
    });

    it('should return NETWORK_ERROR when fetch throws', async () => {
      mockFetch.mockRejectedValue(new TypeError('fetch failed'));

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.testConnection('/path/to/project');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NETWORK_ERROR');
      }
    });

    it('should return VALIDATION_ERROR for 422 response', async () => {
      mockFetch.mockResolvedValue(createMockResponse(
        { message: 'Validation Failed', errors: [{ code: 'invalid' }] },
        { status: 422 },
      ));

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.createIssue('/path/to/project', {
        title: '',
        body: 'test',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('VALIDATION_ERROR');
        expect(result.error.statusCode).toBe(422);
      }
    });
  });

  // ==========================================================================
  // Task 3.2: Issue CRUD operations
  // ==========================================================================

  describe('listIssues', () => {
    it('should fetch issues with default filters', async () => {
      const mockIssues = [
        { number: 1, title: 'Issue 1', state: 'open', labels: [], assignees: [], user: { login: 'user', avatar_url: '' } },
        { number: 2, title: 'Issue 2', state: 'open', labels: [], assignees: [], user: { login: 'user', avatar_url: '' } },
      ];
      mockFetch.mockResolvedValue(createMockResponse(mockIssues));

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.listIssues('/path/to/project');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].number).toBe(1);
      }
    });

    it('should pass filter parameters as query string', async () => {
      mockFetch.mockResolvedValue(createMockResponse([]));

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      await service.listIssues('/path/to/project', {
        state: 'closed',
        labels: ['bug', 'urgent'],
        assignee: 'testuser',
        milestone: 1,
        page: 2,
        per_page: 50,
      });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('state=closed');
      expect(url).toContain('labels=bug%2Curgent');
      expect(url).toContain('assignee=testuser');
      expect(url).toContain('milestone=1');
      expect(url).toContain('page=2');
      expect(url).toContain('per_page=50');
    });
  });

  describe('getIssue', () => {
    it('should fetch a single issue by number', async () => {
      const mockIssue = {
        number: 42,
        title: 'Test Issue',
        body: 'Description',
        state: 'open',
        labels: [],
        assignees: [],
        milestone: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-02T00:00:00Z',
        comments: 3,
        user: { login: 'author', avatar_url: 'https://example.com/avatar' },
      };
      mockFetch.mockResolvedValue(createMockResponse(mockIssue));

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.getIssue('/path/to/project', 42);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.number).toBe(42);
        expect(result.data.title).toBe('Test Issue');
      }
    });
  });

  describe('createIssue', () => {
    it('should create an issue with title and body', async () => {
      const mockCreatedIssue = {
        number: 100,
        title: 'New Issue',
        body: 'Description',
        state: 'open',
        labels: [],
        assignees: [],
        milestone: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        comments: 0,
        user: { login: 'author', avatar_url: '' },
      };
      mockFetch.mockResolvedValue(createMockResponse(mockCreatedIssue, { status: 201 }));

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.createIssue('/path/to/project', {
        title: 'New Issue',
        body: 'Description',
        labels: ['bug'],
        assignees: ['testuser'],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.number).toBe(100);
      }

      // Verify POST request body
      const [, requestInit] = mockFetch.mock.calls[0];
      expect(requestInit.method).toBe('POST');
      const body = JSON.parse(requestInit.body);
      expect(body.title).toBe('New Issue');
      expect(body.body).toBe('Description');
      expect(body.labels).toEqual(['bug']);
      expect(body.assignees).toEqual(['testuser']);
    });
  });

  describe('getIssueComments', () => {
    it('should fetch comments for an issue', async () => {
      const mockComments = [
        { id: 1, body: 'Comment 1', user: { login: 'user1', avatar_url: '' }, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
        { id: 2, body: 'Comment 2', user: { login: 'user2', avatar_url: '' }, created_at: '2026-01-02T00:00:00Z', updated_at: '2026-01-02T00:00:00Z' },
      ];
      mockFetch.mockResolvedValue(createMockResponse(mockComments));

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.getIssueComments('/path/to/project', 42);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].body).toBe('Comment 1');
      }
    });
  });

  describe('addIssueComment', () => {
    it('should post a comment to an issue', async () => {
      const mockComment = {
        id: 10,
        body: 'New comment',
        user: { login: 'testuser', avatar_url: '' },
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      mockFetch.mockResolvedValue(createMockResponse(mockComment, { status: 201 }));

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.addIssueComment('/path/to/project', 42, 'New comment');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.body).toBe('New comment');
      }

      const [, requestInit] = mockFetch.mock.calls[0];
      expect(requestInit.method).toBe('POST');
      const body = JSON.parse(requestInit.body);
      expect(body.body).toBe('New comment');
    });
  });

  // ==========================================================================
  // Task 3.3: Label management
  // ==========================================================================

  describe('updateStatusLabel', () => {
    it('should remove old status labels and add new one', async () => {
      // First call: get current labels
      const currentLabels = [
        { name: 'status:triage', color: 'e4e669', description: null },
        { name: 'bug', color: 'd73a4a', description: null },
      ];
      const issueResponse = {
        number: 42,
        title: 'Test',
        body: '',
        state: 'open',
        labels: currentLabels,
        assignees: [],
        milestone: null,
        created_at: '',
        updated_at: '',
        comments: 0,
        user: { login: 'user', avatar_url: '' },
      };
      // First call: getIssue to get current labels
      mockFetch.mockResolvedValueOnce(createMockResponse(issueResponse));
      // Second call: set labels (PUT)
      mockFetch.mockResolvedValueOnce(createMockResponse([
        { name: 'bug', color: 'd73a4a', description: null },
        { name: 'status:in-progress', color: '0075ca', description: null },
      ]));

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.updateStatusLabel('/path/to/project', 42, 'in-progress');

      expect(result.ok).toBe(true);

      // Verify the PUT request with correct labels
      const [putUrl, putInit] = mockFetch.mock.calls[1];
      expect(putUrl).toContain('/issues/42/labels');
      expect(putInit.method).toBe('PUT');
      const body = JSON.parse(putInit.body);
      // Should contain non-status labels + new status label
      expect(body.labels).toContain('bug');
      expect(body.labels).toContain('status:in-progress');
      expect(body.labels).not.toContain('status:triage');
    });
  });

  describe('ensureStatusLabels', () => {
    it('should create missing status labels', async () => {
      // First call: list existing labels
      const existingLabels = [
        { name: 'status:triage', color: 'e4e669', description: null },
        { name: 'bug', color: 'd73a4a', description: null },
      ];
      mockFetch.mockResolvedValueOnce(createMockResponse(existingLabels));

      // Subsequent calls: create missing labels (4 missing)
      for (let i = 0; i < 4; i++) {
        mockFetch.mockResolvedValueOnce(createMockResponse(
          { name: `status:label-${i}`, color: '000000', description: null },
          { status: 201 },
        ));
      }

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.ensureStatusLabels('/path/to/project');

      expect(result.ok).toBe(true);

      // First call is GET labels, remaining are POST for missing labels
      expect(mockFetch).toHaveBeenCalledTimes(5); // 1 GET + 4 POST

      // Verify POST calls create the missing labels
      for (let i = 1; i < mockFetch.mock.calls.length; i++) {
        const [url, init] = mockFetch.mock.calls[i];
        expect(url).toContain('/labels');
        expect(init.method).toBe('POST');
        const body = JSON.parse(init.body);
        expect(body.name).toMatch(/^status:/);
        // Should not create status:triage (already exists)
        expect(body.name).not.toBe('status:triage');
      }
    });

    it('should not create any labels when all exist', async () => {
      const existingLabels = [
        { name: 'status:triage', color: 'e4e669', description: null },
        { name: 'status:in-progress', color: '0075ca', description: null },
        { name: 'status:in-review', color: 'a2eeef', description: null },
        { name: 'status:changes-requested', color: 'fbca04', description: null },
        { name: 'status:done', color: '0e8a16', description: null },
      ];
      mockFetch.mockResolvedValueOnce(createMockResponse(existingLabels));

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.ensureStatusLabels('/path/to/project');

      expect(result.ok).toBe(true);
      // Only the GET labels call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Task 3.4: Pull Request operations
  // ==========================================================================

  describe('listPullRequests', () => {
    it('should fetch pull requests with filters', async () => {
      const mockPRs = [
        { number: 10, title: 'PR 1', state: 'open', head: { ref: 'feature', sha: 'abc' }, base: { ref: 'main' }, user: { login: 'user', avatar_url: '' } },
      ];
      mockFetch.mockResolvedValue(createMockResponse(mockPRs));

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.listPullRequests('/path/to/project', { state: 'open', base: 'main' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].number).toBe(10);
      }

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('state=open');
      expect(url).toContain('base=main');
    });
  });

  describe('getPullRequest', () => {
    it('should fetch a single pull request', async () => {
      const mockPR = {
        number: 10,
        title: 'Test PR',
        body: 'PR body',
        state: 'open',
        head: { ref: 'feature', sha: 'abc123' },
        base: { ref: 'main' },
        mergeable: true,
        merged: false,
        labels: [],
        user: { login: 'author', avatar_url: '' },
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-02T00:00:00Z',
        diff_url: 'https://github.com/owner/repo/pull/10.diff',
      };
      mockFetch.mockResolvedValue(createMockResponse(mockPR));

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.getPullRequest('/path/to/project', 10);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.number).toBe(10);
        expect(result.data.head.sha).toBe('abc123');
      }
    });
  });

  describe('createPullRequest', () => {
    it('should create a PR with Closes #{number} in body when issueNumber is provided', async () => {
      const mockPR = {
        number: 20,
        title: 'Fix issue #42',
        body: 'Closes #42\n\nFix description',
        state: 'open',
        head: { ref: 'fix/42', sha: 'def456' },
        base: { ref: 'main' },
        mergeable: null,
        merged: false,
        labels: [],
        user: { login: 'author', avatar_url: '' },
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        diff_url: 'https://github.com/owner/repo/pull/20.diff',
      };
      mockFetch.mockResolvedValue(createMockResponse(mockPR, { status: 201 }));

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.createPullRequest('/path/to/project', {
        title: 'Fix issue #42',
        body: 'Fix description',
        head: 'fix/42',
        base: 'main',
        issueNumber: 42,
      });

      expect(result.ok).toBe(true);

      const [, requestInit] = mockFetch.mock.calls[0];
      expect(requestInit.method).toBe('POST');
      const body = JSON.parse(requestInit.body);
      expect(body.body).toContain('Closes #42');
    });

    it('should create a PR without Closes when issueNumber is not provided', async () => {
      const mockPR = {
        number: 21,
        title: 'Feature PR',
        body: 'Feature description',
        state: 'open',
        head: { ref: 'feature', sha: 'ghi789' },
        base: { ref: 'main' },
        mergeable: null,
        merged: false,
        labels: [],
        user: { login: 'author', avatar_url: '' },
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        diff_url: '',
      };
      mockFetch.mockResolvedValue(createMockResponse(mockPR, { status: 201 }));

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.createPullRequest('/path/to/project', {
        title: 'Feature PR',
        body: 'Feature description',
        head: 'feature',
        base: 'main',
      });

      expect(result.ok).toBe(true);

      const [, requestInit] = mockFetch.mock.calls[0];
      const body = JSON.parse(requestInit.body);
      expect(body.body).not.toContain('Closes #');
    });
  });

  describe('mergePullRequest', () => {
    it('should merge a PR with specified merge method', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ sha: 'merged-sha', merged: true, message: 'Pull Request successfully merged' }));

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.mergePullRequest('/path/to/project', 10, 'squash');

      expect(result.ok).toBe(true);

      const [url, requestInit] = mockFetch.mock.calls[0];
      expect(url).toContain('/pulls/10/merge');
      expect(requestInit.method).toBe('PUT');
      const body = JSON.parse(requestInit.body);
      expect(body.merge_method).toBe('squash');
    });
  });

  describe('getPRCIStatus', () => {
    it('should fetch CI status for a commit', async () => {
      const mockStatus = {
        state: 'success',
        statuses: [
          { context: 'ci/test', state: 'success', description: 'Tests passed', target_url: 'https://example.com' },
        ],
      };
      mockFetch.mockResolvedValue(createMockResponse(mockStatus));

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.getPRCIStatus('/path/to/project', 'abc123');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.state).toBe('success');
        expect(result.data.statuses).toHaveLength(1);
      }

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/commits/abc123/status');
    });
  });

  describe('getPRFiles', () => {
    it('should fetch files changed in a PR', async () => {
      const mockFiles = [
        { sha: 'abc', filename: 'src/index.ts', status: 'modified', additions: 10, deletions: 5, changes: 15, patch: '@@ -1,5 +1,10 @@' },
        { sha: 'def', filename: 'src/new.ts', status: 'added', additions: 20, deletions: 0, changes: 20 },
      ];
      mockFetch.mockResolvedValue(createMockResponse(mockFiles));

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.getPRFiles('/path/to/project', 10);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].filename).toBe('src/index.ts');
      }

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/pulls/10/files');
    });
  });

  // ==========================================================================
  // Task 3.5: Connection test
  // ==========================================================================

  describe('testConnection', () => {
    it('should return GitHubUser on successful authentication', async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        login: 'testuser',
        avatar_url: 'https://avatars.githubusercontent.com/u/12345',
      }));

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.testConnection('/path/to/project');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.login).toBe('testuser');
        expect(result.data.avatar_url).toBe('https://avatars.githubusercontent.com/u/12345');
      }

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/user');
    });

    it('should return AUTH_FAILED on 401 response', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ message: 'Bad credentials' }, { status: 401 }));

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      const result = await service.testConnection('/path/to/project');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('AUTH_FAILED');
      }
    });

    it('should use enterprise baseUrl for connection test', async () => {
      credentialService = createMockCredentialService({
        getEnterpriseUrl: vi.fn().mockReturnValue('https://github.example.com'),
      });
      mockExecSync.mockReturnValue('https://github.example.com/org/repo.git\n');
      mockFetch.mockResolvedValue(createMockResponse({ login: 'testuser', avatar_url: '' }));

      const { GitHubApiService } = await import('../gitHubApiService');
      const service = new GitHubApiService(credentialService);

      await service.testConnection('/path/to/project');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe('https://github.example.com/api/v3/user');
    });
  });
});
