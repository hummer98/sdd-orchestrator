/**
 * Project Handlers
 * IPC handlers for project management operations
 *
 * Task 4.1: projectHandlers.ts を新規作成し、プロジェクト管理関連ハンドラーを実装する
 * Requirements: 1.4, 2.1, 2.2, 4.1, 4.2, 6.2
 *
 * Migrated handlers from handlers.ts:
 * - VALIDATE_KIRO_DIRECTORY, SET_PROJECT_PATH, SELECT_PROJECT
 * - GET_RECENT_PROJECTS, ADD_RECENT_PROJECT
 * - GET_APP_VERSION, GET_PLATFORM, GET_INITIAL_PROJECT_PATH
 * - GET_IS_E2E_TEST
 * - GET_PROJECT_LOG_PATH, OPEN_LOG_IN_BROWSER
 * - ADD_SHELL_PERMISSIONS, ADD_MISSING_PERMISSIONS, CHECK_REQUIRED_PERMISSIONS
 */

import { ipcMain, app, shell, BrowserWindow } from 'electron';
import * as path from 'path';
import { access, stat, readdir } from 'fs/promises';
import { IPC_CHANNELS } from './channels';
import type { FileService } from '../services/fileService';
import type { ConfigStore } from '../services/configStore';
import type { SelectProjectResult, SelectProjectError } from '../../renderer/types';
import { logger } from '../services/logger';
import { projectLogger } from '../services/projectLogger';
import { updateMenu } from '../menu';
import {
  addShellPermissions,
  checkRequiredPermissions,
  addPermissionsToProject,
} from '../services/permissionsService';
import { REQUIRED_PERMISSIONS } from '../services/projectChecker';
import type { OrphanDetector } from '../services/stale-recovery/OrphanDetector';

/**
 * Dependencies required for project handlers
 * Requirements: 2.1, 2.2 - Dependency injection for testability
 * agent-stale-recovery Task 14.1: Added orphanDetector dependency
 */
export interface ProjectHandlersDependencies {
  /** FileService instance for file operations */
  fileService: FileService;
  /** ConfigStore instance for app-wide config */
  configStore: ConfigStore;
  /** Get current project path */
  getCurrentProjectPath: () => string | null;
  /** Set project path */
  setProjectPath: (path: string) => Promise<void>;
  /** Select project (unified handler) */
  selectProject: (path: string) => Promise<SelectProjectResult>;
  /** Get initial project path from command line */
  getInitialProjectPath: () => string | null;
  /** Start specs watcher for a window */
  startSpecsWatcher: (window: BrowserWindow) => Promise<void>;
  /** Start agent record watcher for a window */
  startAgentRecordWatcher: (window: BrowserWindow, getCurrentProjectPath: () => string | null) => void;
  /** Start bugs watcher for a window */
  startBugsWatcher: (window: BrowserWindow) => Promise<void>;
  /** OrphanDetector instance for detecting orphan agents on project load */
  orphanDetector?: OrphanDetector;
}

// ============================================================
// Exclusive Control for Project Selection
// Requirements: 6.2, 6.3, 6.4
// ============================================================

/** Lock state for project selection */
let projectSelectionInProgress = false;

/**
 * Check if project selection is in progress
 * Exported for use in other modules and handlers.ts re-export
 */
export function isProjectSelectionInProgress(): boolean {
  return projectSelectionInProgress;
}

/**
 * Set project selection lock
 * For testing purposes
 */
export function setProjectSelectionLock(locked: boolean): void {
  projectSelectionInProgress = locked;
}

/**
 * Reset project selection lock
 * For testing purposes
 */
export function resetProjectSelectionLock(): void {
  projectSelectionInProgress = false;
}

/**
 * Validate project path
 * Checks if path exists, is a directory, and has read permission
 * Requirements: 1.2, 5.1-5.4
 *
 * Exported for use in other modules and handlers.ts re-export
 *
 * @param projectPath - The project path to validate
 * @returns Result with path on success, or SelectProjectError on failure
 */
export async function validateProjectPath(
  projectPath: string
): Promise<{ ok: true; value: string } | { ok: false; error: SelectProjectError }> {
  try {
    // Check if path exists
    await access(projectPath);
  } catch {
    return {
      ok: false,
      error: { type: 'PATH_NOT_EXISTS', path: projectPath },
    };
  }

  try {
    // Check if path is a directory
    const stats = await stat(projectPath);
    if (!stats.isDirectory()) {
      return {
        ok: false,
        error: { type: 'NOT_A_DIRECTORY', path: projectPath },
      };
    }
  } catch {
    return {
      ok: false,
      error: { type: 'PERMISSION_DENIED', path: projectPath },
    };
  }

  try {
    // Check read permission by trying to read the directory
    await readdir(projectPath);
  } catch {
    return {
      ok: false,
      error: { type: 'PERMISSION_DENIED', path: projectPath },
    };
  }

  return { ok: true, value: projectPath };
}

/**
 * Register all project-related IPC handlers
 * Requirements: 1.4, 2.1, 4.1, 4.2
 *
 * @param deps - Dependencies for project handlers
 */
export function registerProjectHandlers(deps: ProjectHandlersDependencies): void {
  const {
    fileService,
    configStore,
    setProjectPath,
    selectProject,
    getInitialProjectPath,
    startSpecsWatcher,
    startAgentRecordWatcher,
    startBugsWatcher,
    orphanDetector,
  } = deps;

  // ============================================================
  // Project Selection & Validation
  // Requirements: 1.1-1.6, 5.1-5.4, 6.1-6.4
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.VALIDATE_KIRO_DIRECTORY,
    async (_event, dirPath: string) => {
      logger.debug('[projectHandlers] VALIDATE_KIRO_DIRECTORY called', { dirPath });
      return fileService.validateKiroDirectory(dirPath);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.SET_PROJECT_PATH,
    async (_event, projectPath: string) => {
      logger.debug('[projectHandlers] SET_PROJECT_PATH called', { projectPath });
      await setProjectPath(projectPath);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.SELECT_PROJECT,
    async (
      event,
      projectPath: string
    ): Promise<SelectProjectResult> => {
      logger.info('[projectHandlers] SELECT_PROJECT called', { projectPath });
      const result = await selectProject(projectPath);

      // Start file watchers on successful project selection
      // Design: unified-project-selection Task 1.4
      if (result.success) {
        const window = BrowserWindow.fromWebContents(event.sender);
        if (window) {
          await startSpecsWatcher(window);
          startAgentRecordWatcher(window, deps.getCurrentProjectPath);
          await startBugsWatcher(window);
          logger.info('[projectHandlers] File watchers started for project', { projectPath });
        }

        // agent-stale-recovery Task 14.1: Detect orphan agents after project selection
        // Requirements: 1.1 - Trigger orphan detection on project load
        if (orphanDetector) {
          try {
            await orphanDetector.detectOrphans(projectPath);
          } catch (error) {
            // Log error but don't fail project selection
            logger.error('[projectHandlers] Orphan detection failed', { projectPath, error });
          }
        }
      }

      return result;
    }
  );

  // ============================================================
  // Recent Projects (History Management)
  // ============================================================

  ipcMain.handle(IPC_CHANNELS.GET_RECENT_PROJECTS, async () => {
    logger.debug('[projectHandlers] GET_RECENT_PROJECTS called');
    return configStore.getRecentProjects();
  });

  ipcMain.handle(
    IPC_CHANNELS.ADD_RECENT_PROJECT,
    async (_event, projectPath: string) => {
      logger.debug('[projectHandlers] ADD_RECENT_PROJECT called', { projectPath });
      configStore.addRecentProject(projectPath);
      updateMenu(); // Update menu to reflect new recent project
    }
  );

  // ============================================================
  // App Information
  // ============================================================

  ipcMain.handle(IPC_CHANNELS.GET_APP_VERSION, async () => {
    logger.debug('[projectHandlers] GET_APP_VERSION called');
    return app.getVersion();
  });

  ipcMain.handle(IPC_CHANNELS.GET_PLATFORM, async () => {
    logger.debug('[projectHandlers] GET_PLATFORM called');
    return process.platform;
  });

  ipcMain.handle(IPC_CHANNELS.GET_INITIAL_PROJECT_PATH, async () => {
    logger.debug('[projectHandlers] GET_INITIAL_PROJECT_PATH called');
    return getInitialProjectPath();
  });

  // ============================================================
  // E2E Test Support
  // ============================================================

  ipcMain.handle(IPC_CHANNELS.GET_IS_E2E_TEST, () => {
    logger.debug('[projectHandlers] GET_IS_E2E_TEST called');
    return process.argv.includes('--e2e-test');
  });

  // ============================================================
  // Project Log (project-log-separation feature)
  // Requirements: 6.1, 6.2, 6.3
  // ============================================================

  ipcMain.handle(IPC_CHANNELS.GET_PROJECT_LOG_PATH, async () => {
    logger.debug('[projectHandlers] GET_PROJECT_LOG_PATH called');
    return projectLogger.getProjectLogPath();
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_LOG_IN_BROWSER, async () => {
    logger.info('[projectHandlers] OPEN_LOG_IN_BROWSER called');
    const logPath = projectLogger.getProjectLogPath();

    if (!logPath) {
      throw new Error('No project log path available');
    }

    // Get the directory containing the log file
    const logDir = path.dirname(logPath);

    try {
      // Check if directory exists
      await access(logDir);
      // Open in system file browser
      const result = await shell.openPath(logDir);
      if (result) {
        // shell.openPath returns empty string on success, error message on failure
        throw new Error(`Failed to open log directory: ${result}`);
      }
    } catch (error) {
      logger.error('[projectHandlers] OPEN_LOG_IN_BROWSER failed', { logDir, error });
      throw error instanceof Error ? error : new Error('Failed to open log directory');
    }
  });

  // ============================================================
  // Permissions Handlers
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.ADD_SHELL_PERMISSIONS,
    async (_event, projectPath: string) => {
      logger.info('[projectHandlers] ADD_SHELL_PERMISSIONS called', { projectPath });
      const result = await addShellPermissions(projectPath);
      if (!result.ok) {
        throw new Error(`Failed to add shell permissions: ${result.error.type}`);
      }
      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.ADD_MISSING_PERMISSIONS,
    async (_event, projectPath: string, permissions: string[]) => {
      logger.info('[projectHandlers] ADD_MISSING_PERMISSIONS called', { projectPath, count: permissions.length });
      const result = await addPermissionsToProject(projectPath, permissions);
      if (!result.ok) {
        throw new Error(`Failed to add missing permissions: ${result.error.type}`);
      }
      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.CHECK_REQUIRED_PERMISSIONS,
    async (_event, projectPath: string) => {
      const result = await checkRequiredPermissions(
        projectPath,
        [...REQUIRED_PERMISSIONS]
      );
      if (!result.ok) {
        // If settings.local.json doesn't exist or has errors, return all as missing
        logger.info('[projectHandlers] CHECK_REQUIRED_PERMISSIONS called', { projectPath, error: result.error });
        return {
          allPresent: false,
          missing: [...REQUIRED_PERMISSIONS],
          present: [],
        };
      }
      // Only log if there are missing permissions
      if (!result.value.allPresent) {
        logger.info('[projectHandlers] CHECK_REQUIRED_PERMISSIONS called', { projectPath, missing: result.value.missing.length });
      }
      return result.value;
    }
  );

  logger.info('[projectHandlers] Project handlers registered');
}
