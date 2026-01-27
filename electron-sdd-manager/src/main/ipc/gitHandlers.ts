/**
 * Git IPC Handlers
 * Task 3.2: IPC handlers for git operations
 * Requirements: 3.1 (IPC通信層)
 *
 * Provides IPC handlers for:
 * - git:get-status: Get git status for a project
 * - git:get-diff: Get diff for a specific file
 * - git:watch-changes: Start watching for file changes
 * - git:unwatch-changes: Stop watching for file changes
 * - git:changes-detected: Event broadcast when changes detected
 */

import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from './channels';
import { GitService } from '../services/GitService';
import { GitFileWatcherService } from '../services/GitFileWatcherService';
import { logger } from '../services/logger';
import type { Result } from '../../shared/types';
import type { ApiError, GitStatusResult } from '../../shared/api/types';

// Service instances
let gitService: GitService | null = null;
let gitFileWatcherService: GitFileWatcherService | null = null;

/**
 * Get or create GitService instance
 */
function getGitService(): GitService {
  if (!gitService) {
    gitService = new GitService();
  }
  return gitService;
}

/**
 * Get or create GitFileWatcherService instance
 */
function getGitFileWatcherService(): GitFileWatcherService {
  if (!gitFileWatcherService) {
    gitFileWatcherService = new GitFileWatcherService(getGitService());

    // Set up event callback to broadcast changes to all renderers
    gitFileWatcherService.setEventCallback((projectPath: string, status: GitStatusResult) => {
      const allWindows = BrowserWindow.getAllWindows();
      for (const window of allWindows) {
        if (!window.isDestroyed()) {
          window.webContents.send(IPC_CHANNELS.GIT_CHANGES_DETECTED, {
            projectPath,
            status,
          });
        }
      }
    });
  }
  return gitFileWatcherService;
}

/**
 * Register git-related IPC handlers
 * Called from handlers.ts registerIpcHandlers()
 */
export function registerGitHandlers(): void {
  // GIT_GET_STATUS: Get git status for a project
  ipcMain.handle(
    IPC_CHANNELS.GIT_GET_STATUS,
    async (_event, projectPath: string): Promise<Result<GitStatusResult, ApiError>> => {
      logger.debug('[gitHandlers] GIT_GET_STATUS called', { projectPath });

      try {
        const service = getGitService();
        const result = await service.getStatus(projectPath);

        if (result.success) {
          logger.debug('[gitHandlers] GIT_GET_STATUS success', {
            projectPath,
            fileCount: result.data.files.length,
            mode: result.data.mode,
          });
        } else {
          logger.warn('[gitHandlers] GIT_GET_STATUS failed', {
            projectPath,
            error: result.error.message,
          });
        }

        return result;
      } catch (error) {
        logger.error('[gitHandlers] GIT_GET_STATUS error', { projectPath, error });
        return {
          success: false,
          error: {
            type: 'system_error',
            message: `Failed to get git status: ${error instanceof Error ? error.message : String(error)}`,
          },
        };
      }
    }
  );

  // GIT_GET_DIFF: Get diff for a specific file
  ipcMain.handle(
    IPC_CHANNELS.GIT_GET_DIFF,
    async (_event, projectPath: string, filePath: string): Promise<Result<string, ApiError>> => {
      logger.debug('[gitHandlers] GIT_GET_DIFF called', { projectPath, filePath });

      try {
        const service = getGitService();
        const result = await service.getDiff(projectPath, filePath);

        if (result.success) {
          logger.debug('[gitHandlers] GIT_GET_DIFF success', {
            projectPath,
            filePath,
            diffLength: result.data.length,
          });
        } else {
          logger.warn('[gitHandlers] GIT_GET_DIFF failed', {
            projectPath,
            filePath,
            error: result.error.message,
          });
        }

        return result;
      } catch (error) {
        logger.error('[gitHandlers] GIT_GET_DIFF error', { projectPath, filePath, error });
        return {
          success: false,
          error: {
            type: 'system_error',
            message: `Failed to get diff: ${error instanceof Error ? error.message : String(error)}`,
          },
        };
      }
    }
  );

  // GIT_WATCH_CHANGES: Start watching for file changes
  ipcMain.handle(
    IPC_CHANNELS.GIT_WATCH_CHANGES,
    async (_event, projectPath: string): Promise<Result<void, ApiError>> => {
      logger.info('[gitHandlers] GIT_WATCH_CHANGES called', { projectPath });

      try {
        const watcher = getGitFileWatcherService();
        const result = await watcher.startWatching(projectPath);

        if (result.success) {
          logger.info('[gitHandlers] GIT_WATCH_CHANGES started', { projectPath });
        } else {
          logger.warn('[gitHandlers] GIT_WATCH_CHANGES failed', {
            projectPath,
            error: result.error.message,
          });
        }

        return result;
      } catch (error) {
        logger.error('[gitHandlers] GIT_WATCH_CHANGES error', { projectPath, error });
        return {
          success: false,
          error: {
            type: 'system_error',
            message: `Failed to start watching: ${error instanceof Error ? error.message : String(error)}`,
          },
        };
      }
    }
  );

  // GIT_UNWATCH_CHANGES: Stop watching for file changes
  ipcMain.handle(
    IPC_CHANNELS.GIT_UNWATCH_CHANGES,
    async (_event, projectPath: string): Promise<Result<void, ApiError>> => {
      logger.info('[gitHandlers] GIT_UNWATCH_CHANGES called', { projectPath });

      try {
        const watcher = getGitFileWatcherService();
        const result = await watcher.stopWatching(projectPath);

        if (result.success) {
          logger.info('[gitHandlers] GIT_UNWATCH_CHANGES stopped', { projectPath });
        } else {
          logger.warn('[gitHandlers] GIT_UNWATCH_CHANGES failed', {
            projectPath,
            error: result.error.message,
          });
        }

        return result;
      } catch (error) {
        logger.error('[gitHandlers] GIT_UNWATCH_CHANGES error', { projectPath, error });
        return {
          success: false,
          error: {
            type: 'system_error',
            message: `Failed to stop watching: ${error instanceof Error ? error.message : String(error)}`,
          },
        };
      }
    }
  );

  logger.info('[gitHandlers] Git IPC handlers registered');
}

/**
 * Cleanup function to close all watchers on app exit
 */
export async function cleanupGitWatchers(): Promise<void> {
  if (gitFileWatcherService) {
    await gitFileWatcherService.closeAll();
    logger.info('[gitHandlers] All git watchers closed');
  }
}
