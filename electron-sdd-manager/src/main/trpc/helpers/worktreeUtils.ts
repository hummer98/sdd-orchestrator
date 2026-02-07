/**
 * Worktree Utilities
 * trpc-full-migration Task 11.2: ipc/worktreeUtils.ts から trpc/helpers/ に移動
 *
 * getWorktreeCwd - specManagerServiceで使用されるワーキングディレクトリ解決関数
 */

import { WorktreeService } from '../../services/worktreeService';
import { projectLogger as logger } from '../../services/projectLogger';
import type { WorktreeConfig } from '../../../renderer/types/worktree';
import { hasWorktreePath } from '../../../renderer/types/worktree';

/**
 * Get the working directory for Agent execution
 * If spec has worktree config, returns worktree absolute path
 * Otherwise, returns the project path
 *
 * Requirements: 3.1, 3.2 (git-worktree-support)
 *
 * @param projectPath - Path to the main project
 * @param specJson - The spec.json content
 * @returns Absolute path for Agent cwd
 */
export function getWorktreeCwd(
  projectPath: string,
  specJson: { worktree?: unknown }
): string {
  // Check if spec has worktree path (actual worktree mode, not normal mode)
  if (!hasWorktreePath(specJson)) {
    return projectPath;
  }

  // TypeScript: we know worktree.path exists from hasWorktreePath check
  const worktreeConfig = specJson.worktree as WorktreeConfig;

  // Use WorktreeService to resolve the path
  const worktreeService = new WorktreeService(projectPath);
  try {
    return worktreeService.resolveWorktreePath(worktreeConfig.path!);
  } catch (error) {
    // If path resolution fails, fall back to project path
    logger.warn('[WorktreeUtils] Failed to resolve worktree path, falling back to project path', {
      worktreePath: worktreeConfig.path,
      error: error instanceof Error ? error.message : String(error),
    });
    return projectPath;
  }
}
