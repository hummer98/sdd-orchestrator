/**
 * Worktree Types for Git Worktree Support (Shared)
 *
 * This module provides worktree-related types and utility functions
 * that can be used by both Electron renderer and Remote UI.
 *
 * Requirements: 2.1, 2.2, 2.3 (git-worktree-support)
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
 * @param specJson - Object with optional worktree field
 * @returns true if spec.worktree.path exists and is non-empty
 */
export function hasWorktreePath(specJson: WithWorktree): boolean {
  if (!specJson.worktree || typeof specJson.worktree !== 'object') {
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
