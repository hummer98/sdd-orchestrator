/**
 * Worktree Types for Git Worktree Support
 * Requirements: 2.1, 2.2, 2.3 (git-worktree-support)
 * worktree-execution-ui: Task 1.1 - Extended for normal mode support
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3 (worktree-execution-ui)
 *
 * This module defines types for managing git worktree state in spec.json.
 * The worktree field is optional for backward compatibility.
 */

/**
 * Worktree configuration stored in spec.json
 * Requirements: 2.1 - worktree field structure
 * worktree-execution-ui Requirement 1.1: path is now optional for normal mode support
 *
 * When worktree mode: { path, branch, created_at }
 * When normal mode:   { branch, created_at } (no path)
 */
export interface WorktreeConfig {
  /** Relative path from main project root to worktree directory (optional) */
  path?: string;
  /** Branch name (feature/{feature-name} or current branch) */
  branch: string;
  /** Creation timestamp (ISO-8601) */
  created_at: string;
}

/**
 * Worktree error types for WorktreeService operations
 * Requirements: 1.6 (error handling for worktree creation)
 */
export type WorktreeError =
  | { type: 'NOT_ON_MAIN_BRANCH'; currentBranch: string }
  | { type: 'WORKTREE_EXISTS'; path: string }
  | { type: 'BRANCH_EXISTS'; branch: string }
  | { type: 'GIT_ERROR'; message: string }
  | { type: 'PATH_NOT_FOUND'; path: string }
  | { type: 'PATH_VALIDATION_ERROR'; path: string; reason: string }
  | { type: 'INVALID_FEATURE_NAME'; featureName: string; reason: string };

/**
 * Worktree info returned from WorktreeService.createWorktree
 * Contains both relative and absolute paths for convenience
 */
export interface WorktreeInfo {
  /** Relative path from main project root */
  path: string;
  /** Absolute path for file system operations */
  absolutePath: string;
  /** Branch name (feature/{feature-name}) */
  branch: string;
  /** Creation timestamp (ISO-8601) */
  created_at: string;
}

/**
 * Result type for WorktreeService operations
 */
export type WorktreeServiceResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: WorktreeError };

/**
 * Check if a value is a valid WorktreeConfig
 * Requirements: 2.2, 2.3 - mode detection via field presence
 * worktree-execution-ui Requirement 2.1: path is no longer required, only branch and created_at
 *
 * @param value - Value to check
 * @returns true if value has valid branch and created_at
 */
export function isWorktreeConfig(value: unknown): value is WorktreeConfig {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // worktree-execution-ui: path is now optional
  // Only require branch and created_at for a valid WorktreeConfig
  return (
    typeof obj.branch === 'string' &&
    obj.branch.length > 0 &&
    typeof obj.created_at === 'string' &&
    obj.created_at.length > 0
  );
}

/**
 * Check if a spec is in worktree mode
 * Requirements: 2.2 - mode detection via worktree field presence
 *
 * @param specJson - SpecJson object (or any object with optional worktree field)
 * @returns true if spec has a valid worktree configuration
 */
export function isWorktreeMode(specJson: { worktree?: unknown }): boolean {
  return isWorktreeConfig(specJson.worktree);
}

/**
 * Check if spec is in "actual" worktree mode (has path)
 * worktree-execution-ui Requirement 2.2: Distinguishes actual worktree from normal mode
 *
 * @param specJson - SpecJson object
 * @returns true if spec.worktree.path exists and is non-empty
 */
export function isActualWorktreeMode(specJson: { worktree?: WorktreeConfig | null | unknown }): boolean {
  if (!specJson.worktree || typeof specJson.worktree !== 'object') {
    return false;
  }

  const worktree = specJson.worktree as Record<string, unknown>;
  return typeof worktree.path === 'string' && worktree.path.length > 0;
}

/**
 * Check if implementation has started
 * worktree-execution-ui Requirement 2.3: Uses worktree.branch existence
 *
 * @param specJson - SpecJson object
 * @returns true if spec.worktree?.branch exists and is non-empty
 */
export function isImplStarted(specJson: { worktree?: WorktreeConfig | null | unknown }): boolean {
  if (!specJson.worktree || typeof specJson.worktree !== 'object') {
    return false;
  }

  const worktree = specJson.worktree as Record<string, unknown>;
  return typeof worktree.branch === 'string' && worktree.branch.length > 0;
}
