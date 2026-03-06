/**
 * Shared GitHub Types
 *
 * Type definitions for GitHub Issue/PR integration shared by both
 * Electron renderer and Remote UI applications.
 *
 * github-issue-integration: Task 1.1
 * Requirements: 4.1
 */

// =============================================================================
// Domain Types
// =============================================================================

/**
 * GitHub user information
 */
export interface GitHubUser {
  login: string;
  avatar_url: string;
}

/**
 * GitHub label attached to Issues/PRs
 */
export interface GitHubLabel {
  name: string;
  color: string;
  description: string | null;
}

/**
 * GitHub milestone
 */
export interface GitHubMilestone {
  title: string;
  number: number;
}

/**
 * GitHub Issue
 */
export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: GitHubLabel[];
  assignees: GitHubUser[];
  milestone: GitHubMilestone | null;
  created_at: string;
  updated_at: string;
  comments: number;
  pull_request?: { url: string };
  user: GitHubUser;
}

/**
 * GitHub Issue comment
 */
export interface GitHubComment {
  id: number;
  body: string;
  user: GitHubUser;
  created_at: string;
  updated_at: string;
}

/**
 * GitHub Pull Request
 */
export interface GitHubPullRequest {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed' | 'merged';
  head: { ref: string; sha: string };
  base: { ref: string };
  mergeable: boolean | null;
  merged: boolean;
  labels: GitHubLabel[];
  user: GitHubUser;
  created_at: string;
  updated_at: string;
  diff_url: string;
}

/**
 * File changed in a Pull Request
 */
export interface PRFile {
  sha: string;
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

/**
 * Individual CI status entry
 */
export interface CIStatusEntry {
  context: string;
  state: string;
  description: string;
  target_url: string;
}

/**
 * Combined CI status for a commit
 */
export interface CIStatus {
  state: 'pending' | 'success' | 'failure' | 'error';
  statuses: CIStatusEntry[];
}

// =============================================================================
// StatusLabel
// =============================================================================

/**
 * Issue workflow status labels (GitHub Label with `status:` prefix)
 */
export type StatusLabel = 'triage' | 'in-progress' | 'in-review' | 'changes-requested' | 'done';

/**
 * All valid status label values
 */
export const STATUS_LABELS: readonly StatusLabel[] = [
  'triage',
  'in-progress',
  'in-review',
  'changes-requested',
  'done',
] as const;

/**
 * Default colors for status labels (used when creating labels on GitHub)
 */
export const STATUS_LABEL_COLORS: Record<StatusLabel, string> = {
  'triage': 'e4e669',
  'in-progress': '0075ca',
  'in-review': 'a2eeef',
  'changes-requested': 'fbca04',
  'done': '0e8a16',
};

/**
 * Check if a value is a valid StatusLabel
 */
export function isStatusLabel(value: unknown): value is StatusLabel {
  return typeof value === 'string' && STATUS_LABELS.includes(value as StatusLabel);
}

// =============================================================================
// Service Types
// =============================================================================

/**
 * Repository information detected from git remote
 */
export interface GitHubRepoInfo {
  owner: string;
  repo: string;
  baseUrl: string; // "https://api.github.com" or enterprise URL
}

/**
 * GitHub API error type identifiers
 */
export type GitHubApiErrorType =
  | 'AUTH_FAILED'
  | 'NOT_FOUND'
  | 'RATE_LIMIT'
  | 'NETWORK_ERROR'
  | 'REPO_DETECT_FAILED'
  | 'VALIDATION_ERROR';

/**
 * GitHub API error
 */
export interface GitHubApiError {
  type: GitHubApiErrorType;
  message: string;
  statusCode?: number;
  retryAfter?: number; // seconds, for rate limit
}

/**
 * GitHub connection status for a project
 */
export interface ConnectionStatus {
  configured: boolean;
  connected: boolean;
  user: GitHubUser | null;
  repoInfo: GitHubRepoInfo | null;
  error: string | null;
}

// =============================================================================
// Filter Types
// =============================================================================

/**
 * Filters for Issue list queries
 */
export interface IssueFilters {
  state?: 'open' | 'closed' | 'all';
  labels?: string[];
  assignee?: string;
  milestone?: number;
  page?: number;
  per_page?: number; // default 30, max 100
}

/**
 * Filters for Pull Request list queries
 */
export interface PRFilters {
  state?: 'open' | 'closed' | 'all';
  head?: string;
  base?: string;
  page?: number;
  per_page?: number; // default 30, max 100
}

// =============================================================================
// Input/Output Types
// =============================================================================

/**
 * PR merge method
 */
export type MergeMethod = 'merge' | 'squash' | 'rebase';

/**
 * Input for creating a new Issue
 */
export interface CreateIssueInput {
  title: string;
  body: string;
  labels?: string[];
  assignees?: string[];
}

/**
 * Input for creating a new Pull Request
 */
export interface CreatePRInput {
  title: string;
  body: string;
  head: string;
  base: string;
  issueNumber?: number; // for "Closes #N" in body
}
