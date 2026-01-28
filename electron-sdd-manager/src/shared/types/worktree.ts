/**
 * Worktree Types for Git Worktree Support (Shared)
 *
 * This module provides worktree-related types and utility functions
 * that can be used by Main, Renderer, and Remote UI.
 *
 * Requirements: 2.1, 2.2, 2.3 (git-worktree-support)
 * worktree-execution-ui: Task 1.1 - Extended for normal mode support
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3 (worktree-execution-ui)
 */

/**
 * Worktree configuration stored in spec.json
 * Requirements: 2.1 - worktree field structure
 *
 * When worktree mode: { path, branch, created_at, enabled: true }
 * When normal mode:   { branch, created_at } (no path)
 * When mode selected but impl not started: { enabled: true/false }
 */
export interface WorktreeConfig {
  /** Relative path from main project root to worktree directory (optional) */
  path?: string;
  /** Branch name (feature/{feature-name} or current branch) */
  branch?: string;
  /** Creation timestamp (ISO-8601) */
  created_at?: string;
  /**
   * Worktree mode selection state
   * - true: worktree mode is selected
   * - false/undefined: normal mode is selected
   */
  enabled?: boolean;
}

/**
 * Object with optional worktree field (for type-safe utility functions)
 */
export interface WithWorktree {
  worktree?: WorktreeConfig | null | unknown;
}

/**
 * Check if spec has a worktree directory (actual worktree mode with path)
 * Use this to determine if spec-merge is needed instead of commit.
 *
 * Task 13.5: Updated to accept null/undefined for safer usage in UI components
 *
 * @param specJson - Object with optional worktree field, or null/undefined
 * @returns true if spec.worktree.path exists and is non-empty
 */
export function hasWorktreePath(specJson: WithWorktree | null | undefined): boolean {
  if (!specJson || !specJson.worktree || typeof specJson.worktree !== 'object') {
    return false;
  }

  const worktree = specJson.worktree as Record<string, unknown>;
  return typeof worktree.path === 'string' && worktree.path.length > 0;
}

/**
 * Check if implementation has started
 * Uses worktree.branch existence as indicator
 *
 * @param specJson - Object with optional worktree field
 * @returns true if spec.worktree?.branch exists and is non-empty
 */
export function isImplStarted(specJson: WithWorktree): boolean {
  if (!specJson.worktree || typeof specJson.worktree !== 'object') {
    return false;
  }

  const worktree = specJson.worktree as Record<string, unknown>;
  return typeof worktree.branch === 'string' && worktree.branch.length > 0;
}

/**
 * Worktree error types for WorktreeService operations
 * Requirements: 1.6 (error handling for worktree creation)
 * convert-spec-to-worktree: Added SPEC_NOT_FOUND, ALREADY_WORKTREE_MODE, IMPL_ALREADY_STARTED,
 *                           WORKTREE_CREATE_FAILED, FILE_MOVE_FAILED, SYMLINK_CREATE_FAILED,
 *                           SPEC_JSON_UPDATE_FAILED (Requirements: 5.1-5.6)
 */
export type WorktreeError =
  | { type: 'NOT_ON_MAIN_BRANCH'; currentBranch: string }
  | { type: 'WORKTREE_EXISTS'; path: string }
  | { type: 'BRANCH_EXISTS'; branch: string }
  | { type: 'GIT_ERROR'; message: string }
  | { type: 'PATH_NOT_FOUND'; path: string }
  | { type: 'PATH_VALIDATION_ERROR'; path: string; reason: string }
  | { type: 'INVALID_FEATURE_NAME'; featureName: string; reason: string }
  // convert-spec-to-worktree: Additional error types for spec conversion
  | { type: 'SPEC_NOT_FOUND'; specPath: string }
  | { type: 'ALREADY_WORKTREE_MODE'; specPath: string }
  | { type: 'IMPL_ALREADY_STARTED'; specPath: string }
  | { type: 'WORKTREE_CREATE_FAILED'; message: string }
  | { type: 'FILE_MOVE_FAILED'; message: string }
  | { type: 'SYMLINK_CREATE_FAILED'; message: string }
  | { type: 'SPEC_JSON_UPDATE_FAILED'; message: string }
  // worktree-rebase-from-main: Additional error types for rebase operations
  | { type: 'SCRIPT_NOT_FOUND'; message: string }
  | { type: 'CONFLICT_RESOLUTION_FAILED'; message: string; reason: string };

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
