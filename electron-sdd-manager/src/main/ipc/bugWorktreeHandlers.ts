/**
 * Bug Worktree IPC Handlers
 * Git worktree operations for bugs via IPC
 * Requirements: 3.1, 3.3, 4.6, 8.5, 12.1-12.4 (bugs-worktree-support)
 * Requirements: 6.1-6.5, 7.1-7.3 (bugs-worktree-directory-mode)
 * bug-worktree-spec-alignment: Uses ConvertBugWorktreeService for worktree conversion
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './channels';
import { WorktreeService } from '../services/worktreeService';
import { BugService } from '../services/bugService';
import { getConfigStore } from '../services/configStore';
import { BugWorkflowService } from '../services/bugWorkflowService';
import { ConvertBugWorktreeService } from '../services/convertBugWorktreeService';
import { getDefaultEventLogService } from '../services/eventLogService';
import { getCurrentProjectPath } from './handlers';
import { logger } from '../services/logger';
import type {
  WorktreeInfo,
  WorktreeServiceResult,
} from '../../renderer/types/worktree';

/**
 * Handle bug-worktree:create IPC call
 * Create a new worktree for a bug using ConvertBugWorktreeService
 * bug-worktree-spec-alignment: Spec と同等のコミット状態チェックロジックを適用
 * Requirements: 3.1, 3.3, 8.5 (bugs-worktree-support)
 * Requirements: 6.1-6.5 (bugs-worktree-directory-mode)
 * Requirements: 1.1-1.4, 2.1-2.3, 3.1-3.4, 4.1-4.4, 5.1-5.4 (bug-worktree-spec-alignment)
 *
 * ConvertBugWorktreeService flow (based on bug commit status):
 * 1. Pre-validation: main branch, bug exists, not in worktree mode, not committed-dirty
 * 2. Worktree creation: git branch bugfix/{bugName} + git worktree add
 * 3. File handling: untracked: copy+delete, committed-clean: skip
 * 4. Symlink creation: logs/runtime directories
 * 5. bug.json update: add worktree field inside worktree
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
  logger.info('[bugWorktreeHandlers] bug-worktree:create called (ConvertBugWorktreeService)', { projectPath, bugPath, bugName });

  const worktreeService = new WorktreeService(projectPath);
  const bugService = new BugService();
  const eventLogService = getDefaultEventLogService();
  const convertService = new ConvertBugWorktreeService(worktreeService, bugService, undefined, eventLogService);

  // Use ConvertBugWorktreeService for the conversion
  // This handles commit status checking and conditional file handling
  const result = await convertService.convertToWorktree(projectPath, bugPath, bugName);

  if (!result.ok) {
    logger.error('[bugWorktreeHandlers] ConvertBugWorktreeService failed', { error: result.error });
    // Map ConvertBugError to WorktreeServiceResult error format
    const errorMessage = 'message' in result.error
      ? (result.error as { message: string }).message
      : result.error.type;
    return {
      ok: false,
      error: { type: 'GIT_ERROR', message: errorMessage },
    };
  }

  logger.info('[bugWorktreeHandlers] Bug worktree created successfully', {
    worktreeInfo: result.value,
  });
  return { ok: true, value: result.value };
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

  // bugs-workflow-footer: bug-worktree:convert
  // Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
  ipcMain.handle(
    IPC_CHANNELS.BUG_CONVERT_TO_WORKTREE,
    async (_event, bugName: string) => {
      logger.info('[bugWorktreeHandlers] bug-worktree:convert called', { bugName });

      const projectPath = getCurrentProjectPath();
      if (!projectPath) {
        logger.error('[bugWorktreeHandlers] No project path set');
        return {
          ok: false as const,
          error: { type: 'BUG_NOT_FOUND' as const, message: 'No project path set' },
        };
      }

      const worktreeService = new WorktreeService(projectPath);
      const bugService = new BugService();
      const bugPath = `${projectPath}/.kiro/bugs/${bugName}`;

      // Step 1: Check if on main branch (Requirements: 5.2, 5.3)
      const isMainResult = await worktreeService.isOnMainBranch();
      if (!isMainResult.ok) {
        logger.error('[bugWorktreeHandlers] Failed to check main branch', { error: isMainResult.error });
        return {
          ok: false as const,
          error: { type: 'NOT_ON_MAIN_BRANCH' as const, message: 'Failed to check branch status' },
        };
      }
      if (!isMainResult.value) {
        // Get current branch name for error message
        const currentBranchResult = await worktreeService.getCurrentBranch();
        const currentBranch = currentBranchResult.ok ? currentBranchResult.value : 'unknown';
        logger.warn('[bugWorktreeHandlers] Not on main branch', { currentBranch });
        return {
          ok: false as const,
          error: {
            type: 'NOT_ON_MAIN_BRANCH' as const,
            currentBranch,
            message: `Cannot convert to worktree: not on main branch (current: ${currentBranch})`,
          },
        };
      }

      // Step 2: Check if bug exists (Requirements: 5.2 - BUG_NOT_FOUND)
      const bugExistsResult = await bugService.bugExists(bugPath);
      if (!bugExistsResult.ok || !bugExistsResult.value) {
        logger.error('[bugWorktreeHandlers] Bug not found', { bugPath });
        return {
          ok: false as const,
          error: { type: 'BUG_NOT_FOUND' as const, message: `Bug not found: ${bugName}` },
        };
      }

      // Step 3: Check if already in worktree mode (ALREADY_WORKTREE_MODE)
      const bugJsonResult = await bugService.readBugJson(bugPath);
      if (bugJsonResult.ok && bugJsonResult.value?.worktree) {
        logger.warn('[bugWorktreeHandlers] Bug already in worktree mode', { bugName });
        return {
          ok: false as const,
          error: { type: 'ALREADY_WORKTREE_MODE' as const, message: `Bug ${bugName} is already in worktree mode` },
        };
      }

      // Step 4: Create worktree (Requirements: 5.4, 5.5)
      // This uses the existing directory mode flow in handleBugWorktreeCreate
      const createResult = await handleBugWorktreeCreate(projectPath, bugPath, bugName);
      if (!createResult.ok) {
        logger.error('[bugWorktreeHandlers] Failed to create worktree', { error: createResult.error });
        const errorMessage = createResult.error && 'message' in createResult.error
          ? createResult.error.message
          : 'Failed to create worktree';
        return {
          ok: false as const,
          error: {
            type: 'WORKTREE_CREATE_FAILED' as const,
            message: errorMessage,
          },
        };
      }

      // Step 5: Return success (Requirements: 5.7)
      logger.info('[bugWorktreeHandlers] Bug converted to worktree mode successfully', {
        bugName,
        worktreeInfo: createResult.value,
      });

      return {
        ok: true as const,
        value: createResult.value,
      };
    }
  );

  logger.info('[bugWorktreeHandlers] Bug worktree IPC handlers registered');
}
