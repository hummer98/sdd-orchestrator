/**
 * Worktree Impl Handlers
 * IPC handlers for impl start with automatic worktree creation
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6 (git-worktree-support)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { WorktreeService } from '../services/worktreeService';
import { logger } from '../services/logger';
import type {
  WorktreeConfig,
  WorktreeError,
} from '../../renderer/types/worktree';
import { hasWorktreePath } from '../../renderer/types/worktree';

/**
 * Extended error type for impl start operations
 */
export type ImplStartError =
  | WorktreeError
  | { type: 'SPEC_JSON_ERROR'; message: string };

/**
 * Result type for impl start with worktree
 */
export type ImplStartWithWorktreeResult =
  | { ok: true; value: { worktreePath: string; worktreeConfig: WorktreeConfig } }
  | { ok: false; error: ImplStartError };

/**
 * Handle impl start with automatic worktree creation
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 *
 * @param projectPath - Path to the main project
 * @param specPath - Path to the spec directory (.kiro/specs/{feature})
 * @param featureName - Name of the feature
 * @returns Result with worktree path and config, or error
 */
export async function handleImplStartWithWorktree(
  projectPath: string,
  specPath: string,
  featureName: string
): Promise<ImplStartWithWorktreeResult> {
  const worktreeService = new WorktreeService(projectPath);

  // Check if on main branch (Requirements 1.1, 1.2)
  const isMainResult = await worktreeService.isOnMainBranch();
  if (!isMainResult.ok) {
    return isMainResult;
  }

  if (!isMainResult.value) {
    const branchResult = await worktreeService.getCurrentBranch();
    const currentBranch = branchResult.ok ? branchResult.value : 'unknown';
    return {
      ok: false,
      error: { type: 'NOT_ON_MAIN_BRANCH', currentBranch },
    };
  }

  // Create worktree (Requirements 1.3, 1.4)
  const createResult = await worktreeService.createWorktree(featureName);
  if (!createResult.ok) {
    return createResult;
  }

  const worktreeInfo = createResult.value;

  // Update spec.json with worktree field (Requirement 1.5)
  const specJsonPath = path.join(specPath, 'spec.json');

  try {
    // Read existing spec.json
    const specJsonContent = await fs.readFile(specJsonPath, 'utf-8');
    const specJson = JSON.parse(specJsonContent);

    // Add worktree configuration
    const worktreeConfig: WorktreeConfig = {
      path: worktreeInfo.path,
      branch: worktreeInfo.branch,
      created_at: worktreeInfo.created_at,
    };

    specJson.worktree = worktreeConfig;

    // Write updated spec.json
    await fs.writeFile(specJsonPath, JSON.stringify(specJson, null, 2));

    logger.info('[WorktreeImplHandlers] Worktree created and spec.json updated', {
      featureName,
      worktreePath: worktreeInfo.absolutePath,
      branch: worktreeInfo.branch,
    });

    return {
      ok: true,
      value: {
        worktreePath: worktreeInfo.absolutePath,
        worktreeConfig,
      },
    };
  } catch (error) {
    // Rollback: remove worktree if spec.json update fails
    logger.error('[WorktreeImplHandlers] Failed to update spec.json, rolling back worktree', {
      featureName,
      error: error instanceof Error ? error.message : String(error),
    });

    await worktreeService.removeWorktree(featureName).catch((rollbackError) => {
      logger.error('[WorktreeImplHandlers] Rollback failed', {
        featureName,
        error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
      });
    });

    return {
      ok: false,
      error: {
        type: 'SPEC_JSON_ERROR',
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

// =============================================================================
// worktree-execution-ui Task 5.1: Normal Mode Impl Start
// Requirements: 9.1, 9.2
// =============================================================================

/**
 * Result type for normal mode impl start
 */
export type ImplStartNormalModeResult =
  | { ok: true; value: { branch: string } }
  | { ok: false; error: ImplStartError };

/**
 * Handle impl start in normal mode (without worktree)
 * Creates spec.json.worktree with only branch and created_at fields
 * worktree-execution-ui: Task 5.1
 * Requirements: 9.1, 9.2
 *
 * @param projectPath - Path to the main project
 * @param specPath - Path to the spec directory (.kiro/specs/{feature})
 * @returns Result with current branch name, or error
 */
export async function handleImplStartNormalMode(
  projectPath: string,
  specPath: string
): Promise<ImplStartNormalModeResult> {
  const worktreeService = new WorktreeService(projectPath);

  // Get current branch name (Requirement 9.1)
  const branchResult = await worktreeService.getCurrentBranch();
  if (!branchResult.ok) {
    return branchResult;
  }

  const currentBranch = branchResult.value;
  const createdAt = new Date().toISOString();

  // Update spec.json with worktree field (branch + created_at only, no path)
  // (Requirement 9.2)
  const specJsonPath = path.join(specPath, 'spec.json');

  try {
    // Read existing spec.json
    const specJsonContent = await fs.readFile(specJsonPath, 'utf-8');
    const specJson = JSON.parse(specJsonContent);

    // Add worktree configuration (without path for normal mode)
    specJson.worktree = {
      branch: currentBranch,
      created_at: createdAt,
    };

    // Write updated spec.json
    await fs.writeFile(specJsonPath, JSON.stringify(specJson, null, 2));

    logger.info('[WorktreeImplHandlers] Normal mode impl started and spec.json updated', {
      specPath,
      branch: currentBranch,
    });

    return {
      ok: true,
      value: {
        branch: currentBranch,
      },
    };
  } catch (error) {
    logger.error('[WorktreeImplHandlers] Failed to update spec.json for normal mode impl start', {
      specPath,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      ok: false,
      error: {
        type: 'SPEC_JSON_ERROR',
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

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
    logger.warn('[WorktreeImplHandlers] Failed to resolve worktree path, falling back to project path', {
      worktreePath: worktreeConfig.path,
      error: error instanceof Error ? error.message : String(error),
    });
    return projectPath;
  }
}
