/**
 * Worktree Types for Git Worktree Support
 *
 * Re-exports from shared module for backward compatibility.
 * All worktree types and utilities are now defined in shared/types/worktree.
 *
 * @deprecated Import from '@shared/types/worktree' instead
 */
export {
  type WorktreeConfig,
  type WithWorktree,
  type WorktreeError,
  type WorktreeInfo,
  type WorktreeServiceResult,
  hasWorktreePath,
  isImplStarted,
  isWorktreeConfig,
} from '../../shared/types/worktree';
