/**
 * Bug Worktree IPC Handlers
 * Git worktree operations for bugs via IPC
 * Requirements: 3.1, 3.3, 4.6, 8.5 (bugs-worktree-support)
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './channels';
import { WorktreeService } from '../services/worktreeService';
import { BugService } from '../services/bugService';
import { getConfigStore } from '../services/configStore';
import { logger } from '../services/logger';
import type {
  WorktreeInfo,
  WorktreeServiceResult,
} from '../../renderer/types/worktree';

/**
 * Handle bug-worktree:create IPC call
 * Create a new worktree for a bug and update bug.json
 * Requirements: 3.1, 3.3, 8.5
 *
 * @param projectPath - Project root path
 * @param bugPath - Path to bug directory
 * @param bugName - Bug name
 * @returns Result with WorktreeInfo on success
 */
export async function handleBugWorktreeCreate(
  projectPath: string,
  bugPath: string,
  bugName: string
): Promise<WorktreeServiceResult<WorktreeInfo>> {
  logger.info('[bugWorktreeHandlers] bug-worktree:create called', { projectPath, bugPath, bugName });

  const worktreeService = new WorktreeService(projectPath);
  const bugService = new BugService();

  // Create the worktree
  const createResult = await worktreeService.createBugWorktree(bugName);
  if (!createResult.ok) {
    logger.error('[bugWorktreeHandlers] Failed to create bug worktree', { error: createResult.error });
    return createResult;
  }

  // Update bug.json with worktree field
  const worktreeConfig = {
    path: createResult.value.path,
    branch: createResult.value.branch,
    created_at: createResult.value.created_at,
  };

  const updateResult = await bugService.addWorktreeField(bugPath, worktreeConfig);
  if (!updateResult.ok) {
    // Rollback: remove the worktree we just created
    logger.warn('[bugWorktreeHandlers] Failed to update bug.json, rolling back worktree', {
      error: updateResult.error,
    });
    await worktreeService.removeBugWorktree(bugName).catch(() => {
      logger.error('[bugWorktreeHandlers] Rollback failed', { bugName });
    });
    return {
      ok: false,
      error: { type: 'GIT_ERROR', message: 'Failed to update bug.json' },
    };
  }

  logger.info('[bugWorktreeHandlers] Bug worktree created successfully', { worktreeInfo: createResult.value });
  return createResult;
}

/**
 * Handle bug-worktree:remove IPC call
 * Remove a bug worktree and update bug.json
 * Requirements: 4.6
 *
 * @param projectPath - Project root path
 * @param bugPath - Path to bug directory
 * @param bugName - Bug name
 * @returns Result with void on success
 */
export async function handleBugWorktreeRemove(
  projectPath: string,
  bugPath: string,
  bugName: string
): Promise<WorktreeServiceResult<void>> {
  logger.info('[bugWorktreeHandlers] bug-worktree:remove called', { projectPath, bugPath, bugName });

  const worktreeService = new WorktreeService(projectPath);
  const bugService = new BugService();

  // Remove the worktree
  const removeResult = await worktreeService.removeBugWorktree(bugName);
  if (!removeResult.ok) {
    logger.error('[bugWorktreeHandlers] Failed to remove bug worktree', { error: removeResult.error });
    return removeResult;
  }

  // Remove worktree field from bug.json
  const updateResult = await bugService.removeWorktreeField(bugPath);
  if (!updateResult.ok) {
    // Log warning but don't fail - worktree was already removed
    logger.warn('[bugWorktreeHandlers] Failed to update bug.json after worktree removal', {
      error: updateResult.error,
    });
  }

  logger.info('[bugWorktreeHandlers] Bug worktree removed successfully', { bugName });
  return { ok: true, value: undefined };
}

/**
 * Register bug worktree IPC handlers
 * Should be called during app initialization
 */
export function registerBugWorktreeHandlers(): void {
  logger.info('[bugWorktreeHandlers] Registering bug worktree IPC handlers');

  // bug-worktree:create
  ipcMain.handle(
    IPC_CHANNELS.BUG_WORKTREE_CREATE,
    async (_event, projectPath: string, bugPath: string, bugName: string) => {
      return handleBugWorktreeCreate(projectPath, bugPath, bugName);
    }
  );

  // bug-worktree:remove
  ipcMain.handle(
    IPC_CHANNELS.BUG_WORKTREE_REMOVE,
    async (_event, projectPath: string, bugPath: string, bugName: string) => {
      return handleBugWorktreeRemove(projectPath, bugPath, bugName);
    }
  );

  // settings:bugs-worktree-default:get
  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_BUGS_WORKTREE_DEFAULT_GET,
    async () => {
      logger.info('[bugWorktreeHandlers] settings:bugs-worktree-default:get called');
      const configStore = getConfigStore();
      return configStore.getBugsWorktreeDefault();
    }
  );

  // settings:bugs-worktree-default:set
  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_BUGS_WORKTREE_DEFAULT_SET,
    async (_event, value: boolean) => {
      logger.info('[bugWorktreeHandlers] settings:bugs-worktree-default:set called', { value });
      const configStore = getConfigStore();
      configStore.setBugsWorktreeDefault(value);
    }
  );

  logger.info('[bugWorktreeHandlers] Bug worktree IPC handlers registered');
}
