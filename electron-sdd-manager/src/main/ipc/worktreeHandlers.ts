/**
 * Worktree IPC Handlers
 * Git worktree operations via IPC for renderer process
 * Requirements: 1.1, 1.3, 1.6 (git-worktree-support)
 * worktree-rebase-from-main: Task 13.1, 13.4 - Import getCurrentProjectPath for rebase handler
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './channels';
import { WorktreeService } from '../services/worktreeService';
import { logger } from '../services/logger';
import { handleImplStartWithWorktree, handleImplStartNormalMode } from './worktreeImplHandlers';
import { getCurrentProjectPath } from './handlers';
import type {
  WorktreeInfo,
  WorktreeServiceResult,
} from '../../renderer/types/worktree';

/**
 * Handle worktree:check-main IPC call
 * Check if currently on main/master branch
 *
 * @param projectPath - Project root path
 * @returns Result with isMain and currentBranch
 */
export async function handleWorktreeCheckMain(
  projectPath: string
): Promise<WorktreeServiceResult<{ isMain: boolean; currentBranch: string }>> {
  logger.info('[worktreeHandlers] worktree:check-main called', { projectPath });

  const service = new WorktreeService(projectPath);

  // Check if on main branch
  const isMainResult = await service.isOnMainBranch();
  if (!isMainResult.ok) {
    logger.error('[worktreeHandlers] Failed to check main branch', { error: isMainResult.error });
    return isMainResult;
  }

  // Get current branch name
  const branchResult = await service.getCurrentBranch();
  if (!branchResult.ok) {
    logger.error('[worktreeHandlers] Failed to get current branch', { error: branchResult.error });
    return branchResult;
  }

  return {
    ok: true,
    value: {
      isMain: isMainResult.value,
      currentBranch: branchResult.value,
    },
  };
}

/**
 * Handle worktree:create IPC call
 * Create a new worktree for a feature
 *
 * @param projectPath - Project root path
 * @param featureName - Feature name for the worktree
 * @returns Result with WorktreeInfo on success
 */
export async function handleWorktreeCreate(
  projectPath: string,
  featureName: string
): Promise<WorktreeServiceResult<WorktreeInfo>> {
  logger.info('[worktreeHandlers] worktree:create called', { projectPath, featureName });

  const service = new WorktreeService(projectPath);
  const result = await service.createWorktree(featureName);

  if (!result.ok) {
    logger.error('[worktreeHandlers] Failed to create worktree', { error: result.error });
  } else {
    logger.info('[worktreeHandlers] Worktree created successfully', { worktreeInfo: result.value });
  }

  return result;
}

/**
 * Handle worktree:remove IPC call
 * Remove a worktree and its associated branch
 *
 * @param projectPath - Project root path
 * @param featureName - Feature name of the worktree to remove
 * @returns Result with void on success
 */
export async function handleWorktreeRemove(
  projectPath: string,
  featureName: string
): Promise<WorktreeServiceResult<void>> {
  logger.info('[worktreeHandlers] worktree:remove called', { projectPath, featureName });

  const service = new WorktreeService(projectPath);
  const result = await service.removeWorktree(featureName);

  if (!result.ok) {
    logger.error('[worktreeHandlers] Failed to remove worktree', { error: result.error });
  } else {
    logger.info('[worktreeHandlers] Worktree removed successfully', { featureName });
  }

  return result;
}

/**
 * Handle worktree:resolve-path IPC call
 * Resolve a relative worktree path to absolute path
 *
 * @param projectPath - Project root path
 * @param relativePath - Relative path from spec.json
 * @returns Result with absolutePath on success
 */
export async function handleWorktreeResolvePath(
  projectPath: string,
  relativePath: string
): Promise<WorktreeServiceResult<{ absolutePath: string }>> {
  logger.info('[worktreeHandlers] worktree:resolve-path called', { projectPath, relativePath });

  const service = new WorktreeService(projectPath);

  try {
    const absolutePath = service.resolveWorktreePath(relativePath);
    logger.info('[worktreeHandlers] Path resolved successfully', { absolutePath });
    return { ok: true, value: { absolutePath } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('[worktreeHandlers] Failed to resolve path', { error: message });
    return {
      ok: false,
      error: {
        type: 'PATH_VALIDATION_ERROR',
        path: relativePath,
        reason: message,
      },
    };
  }
}

/**
 * Handle worktree:rebase-from-main IPC call
 * Rebase worktree branch from main branch
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5 (worktree-rebase-from-main)
 *
 * @param projectPath - Project root path
 * @param specOrBugPath - Relative path to spec or bug directory
 * @returns Result with success and alreadyUpToDate flags
 */
export async function handleWorktreeRebaseFromMain(
  projectPath: string,
  specOrBugPath: string
): Promise<WorktreeServiceResult<{ success: true; alreadyUpToDate?: boolean }>> {
  logger.info('[worktreeHandlers] worktree:rebase-from-main called', { projectPath, specOrBugPath });

  const service = new WorktreeService(projectPath);
  const result = await service.executeRebaseFromMain(specOrBugPath);

  if (!result.ok) {
    logger.error('[worktreeHandlers] Rebase failed', { error: result.error });
  } else {
    logger.info('[worktreeHandlers] Rebase completed', { result: result.value });
  }

  return result;
}

/**
 * Register worktree IPC handlers
 * Should be called during app initialization
 */
export function registerWorktreeHandlers(): void {
  logger.info('[worktreeHandlers] Registering worktree IPC handlers');

  // worktree:check-main
  ipcMain.handle(
    IPC_CHANNELS.WORKTREE_CHECK_MAIN,
    async (_event, projectPath: string) => {
      return handleWorktreeCheckMain(projectPath);
    }
  );

  // worktree:create
  ipcMain.handle(
    IPC_CHANNELS.WORKTREE_CREATE,
    async (_event, projectPath: string, featureName: string) => {
      return handleWorktreeCreate(projectPath, featureName);
    }
  );

  // worktree:remove
  ipcMain.handle(
    IPC_CHANNELS.WORKTREE_REMOVE,
    async (_event, projectPath: string, featureName: string) => {
      return handleWorktreeRemove(projectPath, featureName);
    }
  );

  // worktree:resolve-path
  ipcMain.handle(
    IPC_CHANNELS.WORKTREE_RESOLVE_PATH,
    async (_event, projectPath: string, relativePath: string) => {
      return handleWorktreeResolvePath(projectPath, relativePath);
    }
  );

  // worktree:impl-start - Task 14.3: Start impl in worktree mode
  // Requirements: 9.5, 9.6, 9.7
  ipcMain.handle(
    IPC_CHANNELS.WORKTREE_IMPL_START,
    async (_event, projectPath: string, specPath: string, featureName: string) => {
      logger.info('[worktreeHandlers] worktree:impl-start called', {
        projectPath,
        specPath,
        featureName,
      });
      return handleImplStartWithWorktree(projectPath, specPath, featureName);
    }
  );

  // worktree-execution-ui Task 5.1: Normal mode impl start
  // Requirements: 9.1, 9.2
  ipcMain.handle(
    IPC_CHANNELS.NORMAL_MODE_IMPL_START,
    async (_event, projectPath: string, specPath: string) => {
      logger.info('[worktreeHandlers] worktree:normal-mode-impl-start called', {
        projectPath,
        specPath,
      });
      return handleImplStartNormalMode(projectPath, specPath);
    }
  );

  // worktree-rebase-from-main: Task 3.2, Task 13.1 - Rebase from main
  // Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
  // Task 13.1: Updated to get projectPath from session state (spec-path-ssot-refactor compliance)
  ipcMain.handle(
    IPC_CHANNELS.WORKTREE_REBASE_FROM_MAIN,
    async (_event, specOrBugPath: string) => {
      const projectPath = getCurrentProjectPath();
      if (!projectPath) {
        return {
          ok: false,
          error: {
            type: 'NO_PROJECT_SELECTED',
            message: 'No project is currently selected',
          },
        };
      }
      return handleWorktreeRebaseFromMain(projectPath, specOrBugPath);
    }
  );

  logger.info('[worktreeHandlers] Worktree IPC handlers registered');
}
