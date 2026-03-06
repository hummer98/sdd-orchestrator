/**
 * GitHub API Service
 * Manages all GitHub REST API v3 communication for Issue/PR/Label operations.
 *
 * github-issue-integration: Tasks 3.1-3.5
 * Requirements: 1.3, 1.4, 1.5, 3.2, 3.3, 3.4, 4.1-4.3, 8.1, 8.3-8.5
 */

import { execSync } from 'child_process';
import type { GitHubCredentialService } from './gitHubCredentialService';
import type {
  GitHubRepoInfo,
  GitHubApiError,
  GitHubIssue,
  GitHubComment,
  GitHubLabel,
  GitHubPullRequest,
  GitHubUser,
  CIStatus,
  PRFile,
  StatusLabel,
  IssueFilters,
  PRFilters,
  CreateIssueInput,
  CreatePRInput,
  MergeMethod,
} from '@shared/types/github';
import { STATUS_LABELS, STATUS_LABEL_COLORS } from '@shared/types/github';
import { projectLogger as logger } from './projectLogger';

// =============================================================================
// Result Type
// =============================================================================

type Result<T, E = GitHubApiError> =
  | { ok: true; data: T }
  | { ok: false; error: E };

function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

function err<T>(error: GitHubApiError): Result<T> {
  return { ok: false, error };
}

// =============================================================================
// Git Remote URL Parsing
// =============================================================================

/**
 * Parse a git remote URL to extract owner and repo.
 * Supports HTTPS and SSH formats:
 *   https://github.com/owner/repo.git
 *   https://github.com/owner/repo
 *   git@github.com:owner/repo.git
 *   ssh://git@github.com/owner/repo.git
 */
function parseGitRemoteUrl(remoteUrl: string): { owner: string; repo: string; host: string } | null {
  const trimmed = remoteUrl.trim();

  // SSH format: git@github.com:owner/repo.git
  const sshMatch = trimmed.match(/^git@([^:]+):([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (sshMatch) {
    return { host: sshMatch[1], owner: sshMatch[2], repo: sshMatch[3] };
  }

  // HTTPS/SSH URL format: https://github.com/owner/repo.git or ssh://git@github.com/owner/repo.git
  const httpsMatch = trimmed.match(/^(?:https?|ssh):\/\/(?:[^@]+@)?([^/]+)\/([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (httpsMatch) {
    return { host: httpsMatch[1], owner: httpsMatch[2], repo: httpsMatch[3] };
  }

  return null;
}

// =============================================================================
// GitHubApiService
// =============================================================================

export class GitHubApiService {
  private credentialService: GitHubCredentialService;

  constructor(credentialService: GitHubCredentialService) {
    this.credentialService = credentialService;
  }

  // ---------------------------------------------------------------------------
  // Repository Detection (Task 3.1)
  // ---------------------------------------------------------------------------

  async detectRepoInfo(projectPath: string): Promise<Result<GitHubRepoInfo>> {
    let remoteUrl: string;
    try {
      remoteUrl = execSync('git remote get-url origin', {
        cwd: projectPath,
        encoding: 'utf-8',
      }).trim();
    } catch {
      return err({
        type: 'REPO_DETECT_FAILED',
        message: 'Failed to detect git remote. Ensure the project is a git repository with an "origin" remote.',
      });
    }

    const parsed = parseGitRemoteUrl(remoteUrl);
    if (!parsed) {
      return err({
        type: 'REPO_DETECT_FAILED',
        message: `Unrecognized git remote URL format: ${remoteUrl}`,
      });
    }

    // Determine baseUrl
    const enterpriseUrl = this.credentialService.getEnterpriseUrl(projectPath);
    let baseUrl: string;
    if (enterpriseUrl) {
      // Enterprise: {enterprise-url}/api/v3
      baseUrl = `${enterpriseUrl.replace(/\/+$/, '')}/api/v3`;
    } else if (parsed.host === 'github.com') {
      baseUrl = 'https://api.github.com';
    } else {
      // Non-github.com host without explicit enterprise URL: treat as enterprise
      baseUrl = `https://${parsed.host}/api/v3`;
    }

    return ok({
      owner: parsed.owner,
      repo: parsed.repo,
      baseUrl,
    });
  }

  // ---------------------------------------------------------------------------
  // Authentication Helper (Task 3.1)
  // ---------------------------------------------------------------------------

  private getToken(projectPath: string): string | null {
    // Try credential service first
    const token = this.credentialService.getToken(projectPath);
    if (token) return token;

    // Fallback to GITHUB_TOKEN env var
    return process.env.GITHUB_TOKEN ?? null;
  }

  private async request<T>(
    projectPath: string,
    path: string,
    options?: {
      method?: string;
      body?: unknown;
      rawUrl?: string; // Use this instead of constructing from repoInfo
    },
  ): Promise<Result<T>> {
    const token = this.getToken(projectPath);
    if (!token) {
      logger.warn('[GitHubApiService] AUTH_FAILED: No token available', { projectPath, path });
      return err({
        type: 'AUTH_FAILED',
        message: 'No GitHub token available. Configure a PAT in settings or set GITHUB_TOKEN environment variable.',
      });
    }

    let url: string;
    if (options?.rawUrl) {
      url = options.rawUrl;
    } else {
      const repoResult = await this.detectRepoInfo(projectPath);
      if (!repoResult.ok) return repoResult as Result<T>;
      const { owner, repo, baseUrl } = repoResult.data;
      url = `${baseUrl}/repos/${owner}/${repo}${path}`;
    }

    const method = options?.method ?? 'GET';
    const headers: Record<string, string> = {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };

    const fetchOptions: RequestInit = { method, headers };
    if (options?.body !== undefined) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, fetchOptions);
      return this.handleResponse<T>(response);
    } catch (error) {
      logger.error('[GitHubApiService] NETWORK_ERROR', { url, method, error: error instanceof Error ? error.message : String(error) });
      return err({
        type: 'NETWORK_ERROR',
        message: `Network error: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  private async handleResponse<T>(response: Response): Promise<Result<T>> {
    // Check rate limit headers
    const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
    const retryAfterHeader = response.headers.get('retry-after');

    // github-issue-integration: Task 16.13 - Log rate limit remaining
    if (rateLimitRemaining !== null) {
      const remaining = parseInt(rateLimitRemaining, 10);
      if (remaining <= 10) {
        logger.warn('[GitHubApiService] Rate limit low', { remaining, url: response.url });
      }
    }

    if (response.status === 429 || (rateLimitRemaining === '0' && !response.ok)) {
      const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
      logger.error('[GitHubApiService] RATE_LIMIT exceeded', { status: response.status, retryAfter, url: response.url });
      return err({
        type: 'RATE_LIMIT',
        message: 'GitHub API rate limit exceeded.',
        statusCode: response.status,
        retryAfter,
      });
    }

    if (response.status === 401 || response.status === 403) {
      logger.warn('[GitHubApiService] AUTH_FAILED', { status: response.status, url: response.url });
      return err({
        type: 'AUTH_FAILED',
        message: `Authentication failed (${response.status}).`,
        statusCode: response.status,
      });
    }

    if (response.status === 404) {
      return err({
        type: 'NOT_FOUND',
        message: 'Resource not found.',
        statusCode: 404,
      });
    }

    if (response.status === 422) {
      let message = 'Validation failed.';
      try {
        const body = await response.json();
        if (body.message) message = body.message;
      } catch {
        // ignore parse error
      }
      return err({
        type: 'VALIDATION_ERROR',
        message,
        statusCode: 422,
      });
    }

    if (!response.ok) {
      return err({
        type: 'NETWORK_ERROR',
        message: `GitHub API error: ${response.status} ${response.statusText}`,
        statusCode: response.status,
      });
    }

    // For 204 No Content responses
    if (response.status === 204) {
      return ok(undefined as unknown as T);
    }

    const data = await response.json();
    return ok(data as T);
  }

  // ---------------------------------------------------------------------------
  // Issue CRUD (Task 3.2)
  // ---------------------------------------------------------------------------

  async listIssues(projectPath: string, filters?: IssueFilters): Promise<Result<GitHubIssue[]>> {
    const params = new URLSearchParams();
    if (filters?.state) params.set('state', filters.state);
    if (filters?.labels?.length) params.set('labels', filters.labels.join(','));
    if (filters?.assignee) params.set('assignee', filters.assignee);
    if (filters?.milestone !== undefined) params.set('milestone', String(filters.milestone));
    if (filters?.page !== undefined) params.set('page', String(filters.page));
    if (filters?.per_page !== undefined) params.set('per_page', String(filters.per_page));

    const queryString = params.toString();
    const path = `/issues${queryString ? `?${queryString}` : ''}`;
    return this.request<GitHubIssue[]>(projectPath, path);
  }

  async getIssue(projectPath: string, number: number): Promise<Result<GitHubIssue>> {
    return this.request<GitHubIssue>(projectPath, `/issues/${number}`);
  }

  async createIssue(projectPath: string, input: CreateIssueInput): Promise<Result<GitHubIssue>> {
    return this.request<GitHubIssue>(projectPath, '/issues', {
      method: 'POST',
      body: {
        title: input.title,
        body: input.body,
        labels: input.labels,
        assignees: input.assignees,
      },
    });
  }

  async getIssueComments(projectPath: string, number: number): Promise<Result<GitHubComment[]>> {
    return this.request<GitHubComment[]>(projectPath, `/issues/${number}/comments`);
  }

  async addIssueComment(projectPath: string, number: number, body: string): Promise<Result<GitHubComment>> {
    return this.request<GitHubComment>(projectPath, `/issues/${number}/comments`, {
      method: 'POST',
      body: { body },
    });
  }

  // ---------------------------------------------------------------------------
  // Label Management (Task 3.3)
  // ---------------------------------------------------------------------------

  async setIssueLabels(projectPath: string, number: number, labels: string[]): Promise<Result<GitHubLabel[]>> {
    return this.request<GitHubLabel[]>(projectPath, `/issues/${number}/labels`, {
      method: 'PUT',
      body: { labels },
    });
  }

  async updateStatusLabel(projectPath: string, number: number, newStatus: StatusLabel): Promise<Result<void>> {
    // Get current issue to read existing labels
    const issueResult = await this.getIssue(projectPath, number);
    if (!issueResult.ok) return issueResult as Result<void>;

    const currentLabels = issueResult.data.labels.map((l) => l.name);

    // Remove existing status: labels, add new one
    const nonStatusLabels = currentLabels.filter((name) => !name.startsWith('status:'));
    const newLabels = [...nonStatusLabels, `status:${newStatus}`];

    const result = await this.setIssueLabels(projectPath, number, newLabels);
    if (!result.ok) return result as Result<void>;

    return ok(undefined);
  }

  async ensureStatusLabels(projectPath: string): Promise<Result<void>> {
    // Get existing labels from the repository
    const repoResult = await this.detectRepoInfo(projectPath);
    if (!repoResult.ok) return repoResult as Result<void>;

    const labelsResult = await this.request<GitHubLabel[]>(projectPath, '/labels?per_page=100');
    if (!labelsResult.ok) return labelsResult as Result<void>;

    const existingLabelNames = new Set(labelsResult.data.map((l) => l.name));

    // Create missing status labels
    for (const status of STATUS_LABELS) {
      const labelName = `status:${status}`;
      if (!existingLabelNames.has(labelName)) {
        const createResult = await this.request<GitHubLabel>(projectPath, '/labels', {
          method: 'POST',
          body: {
            name: labelName,
            color: STATUS_LABEL_COLORS[status],
            description: `Issue status: ${status}`,
          },
        });
        if (!createResult.ok) return createResult as Result<void>;
      }
    }

    return ok(undefined);
  }

  // ---------------------------------------------------------------------------
  // Pull Request Operations (Task 3.4)
  // ---------------------------------------------------------------------------

  async listPullRequests(projectPath: string, filters?: PRFilters): Promise<Result<GitHubPullRequest[]>> {
    const params = new URLSearchParams();
    if (filters?.state) params.set('state', filters.state);
    if (filters?.head) params.set('head', filters.head);
    if (filters?.base) params.set('base', filters.base);
    if (filters?.page !== undefined) params.set('page', String(filters.page));
    if (filters?.per_page !== undefined) params.set('per_page', String(filters.per_page));

    const queryString = params.toString();
    const path = `/pulls${queryString ? `?${queryString}` : ''}`;
    return this.request<GitHubPullRequest[]>(projectPath, path);
  }

  async getPullRequest(projectPath: string, number: number): Promise<Result<GitHubPullRequest>> {
    return this.request<GitHubPullRequest>(projectPath, `/pulls/${number}`);
  }

  async createPullRequest(projectPath: string, input: CreatePRInput): Promise<Result<GitHubPullRequest>> {
    let body = input.body;
    if (input.issueNumber) {
      body = `Closes #${input.issueNumber}\n\n${body}`;
    }

    return this.request<GitHubPullRequest>(projectPath, '/pulls', {
      method: 'POST',
      body: {
        title: input.title,
        body,
        head: input.head,
        base: input.base,
      },
    });
  }

  async mergePullRequest(projectPath: string, number: number, method: MergeMethod): Promise<Result<void>> {
    return this.request<void>(projectPath, `/pulls/${number}/merge`, {
      method: 'PUT',
      body: { merge_method: method },
    });
  }

  async getPRCIStatus(projectPath: string, sha: string): Promise<Result<CIStatus>> {
    return this.request<CIStatus>(projectPath, `/commits/${sha}/status`);
  }

  async getPRFiles(projectPath: string, number: number): Promise<Result<PRFile[]>> {
    return this.request<PRFile[]>(projectPath, `/pulls/${number}/files`);
  }

  // ---------------------------------------------------------------------------
  // Connection Test (Task 3.5)
  // ---------------------------------------------------------------------------

  async testConnection(projectPath: string): Promise<Result<GitHubUser>> {
    const token = this.getToken(projectPath);
    if (!token) {
      logger.warn('[GitHubApiService] AUTH_FAILED: No token for testConnection', { projectPath });
      return err({
        type: 'AUTH_FAILED',
        message: 'No GitHub token available. Configure a PAT in settings or set GITHUB_TOKEN environment variable.',
      });
    }

    // Determine base URL
    const enterpriseUrl = this.credentialService.getEnterpriseUrl(projectPath);
    let baseUrl: string;
    if (enterpriseUrl) {
      baseUrl = `${enterpriseUrl.replace(/\/+$/, '')}/api/v3`;
    } else {
      baseUrl = 'https://api.github.com';
    }

    return this.request<GitHubUser>(projectPath, '', {
      rawUrl: `${baseUrl}/user`,
    });
  }
}
