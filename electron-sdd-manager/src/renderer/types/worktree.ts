/**
 * Worktree Types for Git Worktree Support
 * Requirements: 2.1, 2.2, 2.3 (git-worktree-support)
 *
 * This module defines types for managing git worktree state in spec.json.
 * The worktree field is optional for backward compatibility.
 */

/**
 * Worktree configuration stored in spec.json
 * Requirements: 2.1 - worktree field structure
 */
export interface WorktreeConfig {
  /** Relative path from main project root to worktree directory */
  path: string;
  /** Branch name (feature/{feature-name}) */
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
 *
 * @param value - Value to check
 * @returns true if value is a valid WorktreeConfig
 */
export function isWorktreeConfig(value: unknown): value is WorktreeConfig {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.path === 'string' &&
    obj.path.length > 0 &&
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
