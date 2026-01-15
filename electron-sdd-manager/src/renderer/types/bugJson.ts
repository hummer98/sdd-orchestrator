/**
 * BugJson Types for Bug Worktree Support
 * Requirements: 1.1, 1.2, 1.3, 1.4 (bugs-worktree-support)
 *
 * This module defines types for managing bug metadata and worktree state in bug.json.
 * The worktree field is optional - its presence indicates worktree mode.
 */

/**
 * Worktree configuration for bugs
 * Requirements: 1.3, 3.4, 3.7 (bugs-worktree-support)
 *
 * Stored in bug.json when a bug is being worked on in a worktree.
 * Path format: ../{project}-worktrees/bugs/{bug-name}
 * Branch format: bugfix/{bug-name}
 */
export interface BugWorktreeConfig {
  /** Relative path from main project root: ../{project}-worktrees/bugs/{bug-name} */
  path: string;
  /** Branch name: bugfix/{bug-name} */
  branch: string;
  /** Creation timestamp (ISO-8601) */
  created_at: string;
}

/**
 * Bug metadata stored in bug.json
 * Requirements: 1.1, 1.2 (bugs-worktree-support)
 *
 * This is the schema for .kiro/bugs/{bug-name}/bug.json file.
 * The worktree field is optional and added when bug-fix is started with worktree enabled.
 */
export interface BugJson {
  /** Bug name (directory name) */
  bug_name: string;
  /** Creation timestamp (ISO-8601) */
  created_at: string;
  /** Last update timestamp (ISO-8601) */
  updated_at: string;
  /** Worktree configuration (optional) - Requirements: 1.3 */
  worktree?: BugWorktreeConfig;
}

/**
 * Check if a value is a valid BugWorktreeConfig
 * Requirements: 1.3, 1.4 - mode detection via field presence
 *
 * @param value - Value to check
 * @returns true if value is a valid BugWorktreeConfig
 */
export function isBugWorktreeConfig(value: unknown): value is BugWorktreeConfig {
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
 * Check if a bug is in worktree mode
 * Requirements: 1.4 - mode detection via worktree field presence
 *
 * @param bugJson - BugJson object (or any object with optional worktree field)
 * @returns true if bug has a valid worktree configuration
 */
export function isBugWorktreeMode(bugJson: { worktree?: unknown }): boolean {
  return isBugWorktreeConfig(bugJson.worktree);
}
