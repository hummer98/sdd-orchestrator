/**
 * Bug Worktree IPC Handlers
 * Git worktree operations for bugs via IPC
 * Requirements: 3.1, 3.3, 4.6, 8.5, 12.1-12.4 (bugs-worktree-support)
 * Requirements: 6.1-6.5, 7.1-7.3 (bugs-worktree-directory-mode)
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './channels';
import { WorktreeService } from '../services/worktreeService';
import { BugService } from '../services/bugService';
import { getConfigStore } from '../services/configStore';
import { BugWorkflowService } from '../services/bugWorkflowService';
import { getCurrentProjectPath } from './handlers';
import { logger } from '../services/logger';
import { getWorktreeEntityPath, getWorktreeBasePath } from '../services/worktreeHelpers';
import type {
  WorktreeInfo,
  WorktreeServiceResult,
} from '../../renderer/types/worktree';

/**
 * Handle bug-worktree:create IPC call
 * Create a new worktree for a bug using directory mode
 * Requirements: 3.1, 3.3, 8.5 (bugs-worktree-support)
 * Requirements: 6.1-6.5 (bugs-worktree-directory-mode)
 *
 * Directory mode flow:
 * 1. Create worktree at .kiro/worktrees/bugs/{bugName}
 * 2. Copy bug files from main to worktree/.kiro/bugs/{bugName}
 * 3. Add worktree field to bug.json inside worktree (NOT main)
 *
 * @param projectPath - Project root path
 * @param bugPath - Path to bug directory in main project
 * @param bugName - Bug name
 * @returns Result with WorktreeInfo on success
 */
export async function handleBugWorktreeCreate(
  projectPath: string,
  bugPath: string,
  bugName: string
): Promise<WorktreeServiceResult<WorktreeInfo>> {
  logger.info('[bugWorktreeHandlers] bug-worktree:create called (directory mode)', { projectPath, bugPath, bugName });

  const worktreeService = new WorktreeService(projectPath);
  const bugService = new BugService();

  // Step 1: Create worktree using directory mode (createEntityWorktree)
  // This creates .kiro/worktrees/bugs/{bugName}/ with git worktree
  const createResult = await worktreeService.createEntityWorktree('bugs', bugName);
  if (!createResult.ok) {
    logger.error('[bugWorktreeHandlers] Failed to create bug worktree', { error: createResult.error });
    return createResult;
  }

  // Step 2: Copy bug files from main to worktree
  // Source: .kiro/bugs/{bugName}/
  // Destination: .kiro/worktrees/bugs/{bugName}/.kiro/bugs/{bugName}/
  const worktreeBugPath = getWorktreeEntityPath(projectPath, 'bugs', bugName);
  const copyResult = await bugService.copyBugToWorktree(bugPath, worktreeBugPath.absolute, bugName);
  if (!copyResult.ok) {
    // Rollback: remove the worktree we just created
    logger.warn('[bugWorktreeHandlers] Failed to copy bug files, rolling back worktree', {
      error: copyResult.error,
    });
    await worktreeService.removeEntityWorktree('bugs', bugName).catch(() => {
      logger.error('[bugWorktreeHandlers] Rollback failed', { bugName });
    });
    return {
      ok: false,
      error: { type: 'GIT_ERROR', message: `Failed to copy bug files: ${copyResult.error.type}` },
    };
  }

  // Step 3: Add worktree field to bug.json INSIDE worktree (NOT main bug.json)
  // This is the key difference from the old flag-based approach
  const worktreeBasePath = getWorktreeBasePath(projectPath, 'bugs', bugName);
  const worktreeConfig = {
    path: worktreeBasePath.relative,  // .kiro/worktrees/bugs/{bugName}
    branch: createResult.value.branch,
    created_at: createResult.value.created_at,
  };

  const updateResult = await bugService.addWorktreeField(worktreeBugPath.absolute, worktreeConfig);
  if (!updateResult.ok) {
    // Rollback: remove the worktree we just created
    logger.warn('[bugWorktreeHandlers] Failed to update bug.json in worktree, rolling back', {
      error: updateResult.error,
    });
    await worktreeService.removeEntityWorktree('bugs', bugName).catch(() => {
      logger.error('[bugWorktreeHandlers] Rollback failed', { bugName });
    });
    return {
      ok: false,
      error: { type: 'GIT_ERROR', message: 'Failed to update bug.json in worktree' },
    };
  }

  logger.info('[bugWorktreeHandlers] Bug worktree created successfully (directory mode)', {
    worktreeInfo: createResult.value,
    worktreeBugPath: worktreeBugPath.absolute,
  });
  return createResult;
}

/**
 * Handle bug-worktree:remove IPC call
 * Remove a bug worktree (directory mode)
 * Requirements: 4.6 (bugs-worktree-support)
 * Requirements: 7.1-7.3 (bugs-worktree-directory-mode)
 *
 * Directory mode flow:
 * 1. Remove git worktree at .kiro/worktrees/bugs/{bugName}
 * 2. Delete bugfix/{bugName} branch
 * Note: Main bug.json is NOT modified (it never had worktree field in directory mode)
 *
 * @param projectPath - Project root path
 * @param bugPath - Path to bug directory in main project (not used in directory mode)
 * @param bugName - Bug name
 * @returns Result with void on success
 */
export async function handleBugWorktreeRemove(
  projectPath: string,
  bugPath: string,
  bugName: string
): Promise<WorktreeServiceResult<void>> {
  logger.info('[bugWorktreeHandlers] bug-worktree:remove called (directory mode)', { projectPath, bugPath, bugName });

  const worktreeService = new WorktreeService(projectPath);

  // Remove the worktree using directory mode (removeEntityWorktree)
  // This removes .kiro/worktrees/bugs/{bugName}/ and deletes the bugfix/{bugName} branch
  const removeResult = await worktreeService.removeEntityWorktree('bugs', bugName);
  if (!removeResult.ok) {
    logger.error('[bugWorktreeHandlers] Failed to remove bug worktree', { error: removeResult.error });
    return removeResult;
  }

  // Note: In directory mode, main bug.json does NOT have worktree field
  // The worktree field only exists in the bug.json INSIDE the worktree
  // So we don't need to update main bug.json
  logger.info('[bugWorktreeHandlers] Bug worktree removed successfully (directory mode)', { bugName });
  return { ok: true, value: undefined };
}

/**
 * Register bug worktree IPC handlers
 * Should be called during app initialization
 */
export function registerBugWorktreeHandlers(): void {
  logger.info('[bugWorktreeHandlers] Registering bug worktree IPC handlers');

  // bug-worktree:create
  // Preload passes only bugName; projectPath/bugPath are derived internally
  ipcMain.handle(
    IPC_CHANNELS.BUG_WORKTREE_CREATE,
    async (_event, bugName: string) => {
      const projectPath = getCurrentProjectPath();
      if (!projectPath) {
        logger.error('[bugWorktreeHandlers] No project path set');
        return {
          ok: false as const,
          error: { type: 'GIT_ERROR' as const, message: 'No project path set' },
        };
      }
      const bugPath = `${projectPath}/.kiro/bugs/${bugName}`;
      return handleBugWorktreeCreate(projectPath, bugPath, bugName);
    }
  );

  // bug-worktree:remove
  // Preload passes only bugName; projectPath/bugPath are derived internally
  ipcMain.handle(
    IPC_CHANNELS.BUG_WORKTREE_REMOVE,
    async (_event, bugName: string) => {
      const projectPath = getCurrentProjectPath();
      if (!projectPath) {
        logger.error('[bugWorktreeHandlers] No project path set');
        return {
          ok: false as const,
          error: { type: 'GIT_ERROR' as const, message: 'No project path set' },
        };
      }
      const bugPath = `${projectPath}/.kiro/bugs/${bugName}`;
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

  // bug-worktree:auto-execution (Task 19.1)
  // Requirements: 12.1, 12.2, 12.3, 12.4
  ipcMain.handle(
    IPC_CHANNELS.BUG_WORKTREE_AUTO_EXECUTION,
    async (_event, bugName: string) => {
      logger.info('[bugWorktreeHandlers] bug-worktree:auto-execution called', { bugName });

      const projectPath = getCurrentProjectPath();
      if (!projectPath) {
        logger.error('[bugWorktreeHandlers] No project path set');
        return {
          ok: false as const,
          error: { type: 'GIT_ERROR' as const, message: 'No project path set' },
        };
      }

      const bugPath = `${projectPath}/.kiro/bugs/${bugName}`;
      const configStore = getConfigStore();
      const bugService = new BugService();
      const bugWorkflowService = new BugWorkflowService(
        configStore,
        (path: string) => new WorktreeService(path),
        bugService
      );

      return bugWorkflowService.startBugFixWithAutoWorktree(bugName, projectPath, bugPath);
    }
  );

  logger.info('[bugWorktreeHandlers] Bug worktree IPC handlers registered');
}
