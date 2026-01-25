/**
 * Bug Handlers
 * IPC handlers for bug-related operations
 *
 * Task 6.1: bugHandlers.ts を新規作成し、Bug関連ハンドラーを実装する
 * Requirements: 1.6, 2.1, 2.2, 4.1, 4.2
 *
 * Migrated handlers from handlers.ts:
 * - READ_BUGS, READ_BUG_DETAIL
 * - START_BUGS_WATCHER, STOP_BUGS_WATCHER
 * - EXECUTE_BUG_CREATE
 *
 * Moved from bugWorktreeHandlers.ts:
 * - BUG_PHASE_UPDATE
 */

import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from './channels';
import type { BugService } from '../services/bugService';
import type { FileService } from '../services/fileService';
import type { SpecManagerService } from '../services/specManagerService';
import type { BugPhase } from '../../renderer/types/bug';
import type { BugInfo } from '../services/webSocketHandler';
import { BugsWatcherService } from '../services/bugsWatcherService';
import { logger } from '../services/logger';
import { getRemoteAccessServer } from './remoteAccessHandlers';

/**
 * Dependencies required for bug handlers
 * Requirements: 2.1, 2.2 - Dependency injection for testability
 */
export interface BugHandlersDependencies {
  /** BugService instance for bug operations */
  bugService: BugService;
  /** FileService instance for file operations */
  fileService: FileService;
  /** Function to get current project path */
  getCurrentProjectPath: () => string | null;
  /** Function to get SpecManagerService instance */
  getSpecManagerService: () => SpecManagerService;
  /** Function to register event callbacks */
  registerEventCallbacks: (service: SpecManagerService, window: BrowserWindow) => void;
  /** Function to check if event callbacks are registered */
  getEventCallbacksRegistered: () => boolean;
  /** Function to set event callbacks registered flag */
  setEventCallbacksRegistered: (value: boolean) => void;
}

// Module-level state for watcher (needed for start/stop functions)
let bugsWatcherService: BugsWatcherService | null = null;
let currentDeps: BugHandlersDependencies | null = null;

/**
 * Helper function to convert error to user-friendly message
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'type' in error) {
    const typedError = error as { type: string; message?: string };
    return typedError.message || typedError.type;
  }
  return String(error);
}

/**
 * Register all bug-related IPC handlers
 * Requirements: 1.6, 2.1, 4.1, 4.2
 *
 * @param deps - Dependencies for bug handlers
 */
export function registerBugHandlers(deps: BugHandlersDependencies): void {
  const {
    bugService,
    fileService,
    getCurrentProjectPath,
    getSpecManagerService,
    registerEventCallbacks,
    getEventCallbacksRegistered,
  } = deps;

  // Store deps for watcher functions
  currentDeps = deps;

  // ============================================================
  // Bug List/Detail Handlers
  // Requirements: 3.1, 6.1, 6.3, 6.5
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.READ_BUGS,
    async (_event, projectPath: string) => {
      logger.info('[bugHandlers] READ_BUGS called', { projectPath });
      const result = await bugService.readBugs(projectPath);
      if (!result.ok) {
        throw new Error(`Failed to read bugs: ${result.error.type}`);
      }
      return result.value;
    }
  );

  // spec-path-ssot-refactor Task 6.1: Change from bugPath to bugName
  // Main process resolves path using resolveBugPath
  ipcMain.handle(
    IPC_CHANNELS.READ_BUG_DETAIL,
    async (_event, bugName: string) => {
      logger.info('[bugHandlers] READ_BUG_DETAIL called', { bugName });
      const currentProjectPath = getCurrentProjectPath();
      if (!currentProjectPath) {
        throw new Error('Project not selected');
      }
      const bugPathResult = await fileService.resolveBugPath(currentProjectPath, bugName);
      if (!bugPathResult.ok) {
        throw new Error(`Bug not found: ${bugName}`);
      }
      const result = await bugService.readBugDetail(bugPathResult.value);
      if (!result.ok) {
        throw new Error(`Failed to read bug detail: ${result.error.type}`);
      }
      return result.value;
    }
  );

  // ============================================================
  // Bugs Watcher Handlers
  // Requirements: 6.5
  // ============================================================

  ipcMain.handle(IPC_CHANNELS.START_BUGS_WATCHER, async (event) => {
    logger.info('[bugHandlers] START_BUGS_WATCHER called');
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      await startBugsWatcher(window);
    }
  });

  ipcMain.handle(IPC_CHANNELS.STOP_BUGS_WATCHER, async () => {
    logger.info('[bugHandlers] STOP_BUGS_WATCHER called');
    await stopBugsWatcher();
  });

  // ============================================================
  // Bug Create Handler
  // bug-create-dialog-unification: worktreeMode parameter added
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_BUG_CREATE,
    async (event, projectPath: string, description: string, worktreeMode: boolean = false) => {
      logger.info('[bugHandlers] EXECUTE_BUG_CREATE called', { projectPath, description, worktreeMode });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !getEventCallbacksRegistered()) {
        registerEventCallbacks(service, window);
      }

      // bug-create-dialog-unification: Worktree mode validation
      // When worktreeMode is true, validate main branch first (before agent starts)
      // The actual worktree creation happens in bug-create command (similar to spec-plan)
      if (worktreeMode) {
        const { WorktreeService } = await import('../services/worktreeService');
        const worktreeService = new WorktreeService(projectPath);

        // Check if on main branch
        const isMainResult = await worktreeService.isOnMainBranch();
        if (!isMainResult.ok) {
          logger.error('[bugHandlers] executeBugCreate failed to check main branch', { error: isMainResult.error });
          throw new Error('Failed to check branch state');
        }
        if (!isMainResult.value) {
          const currentBranchResult = await worktreeService.getCurrentBranch();
          const currentBranch = currentBranchResult.ok ? currentBranchResult.value : 'unknown';
          logger.warn('[bugHandlers] executeBugCreate not on main branch', { currentBranch });
          throw new Error(`Worktree mode must be executed on main branch (current: ${currentBranch})`);
        }
      }

      // bug-create-dialog-unification: Add --worktree flag when worktreeMode is true
      const worktreeFlag = worktreeMode ? ' --worktree' : '';

      // Start agent with specId='' (global agent)
      // Note: Bug name is auto-generated by Claude from description per bug-create.md spec
      // Base flags (-p, --output-format stream-json, --verbose) are added by specManagerService
      const result = await service.startAgent({
        specId: '', // Empty specId for global agent
        phase: 'bug-create',
        command: 'claude',
        args: [`/kiro:bug-create "${description}"${worktreeFlag}`], // Base flags added by service
        group: 'doc',
      });

      if (!result.ok) {
        logger.error('[bugHandlers] executeBugCreate failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[bugHandlers] executeBugCreate succeeded', { agentId: result.value.agentId, worktreeMode });
      return result.value;
    }
  );

  // ============================================================
  // Bug Phase Update Handler
  // bug-deploy-phase: Requirements 2.4
  // Moved from bugWorktreeHandlers.ts
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.BUG_PHASE_UPDATE,
    async (_event, bugName: string, phase: BugPhase) => {
      logger.info('[bugHandlers] BUG_PHASE_UPDATE called', { bugName, phase });

      const projectPath = getCurrentProjectPath();
      if (!projectPath) {
        logger.error('[bugHandlers] No project path set');
        return {
          ok: false as const,
          error: { type: 'NOT_FOUND' as const, message: 'No project path set' },
        };
      }

      const bugPath = `${projectPath}/.kiro/bugs/${bugName}`;

      const result = await bugService.updateBugJsonPhase(bugPath, phase);
      if (!result.ok) {
        logger.error('[bugHandlers] Failed to update bug phase', { error: result.error });
        return {
          ok: false as const,
          error: { type: result.error.type, message: 'Failed to update bug phase' },
        };
      }

      logger.info('[bugHandlers] Bug phase updated successfully', { bugName, phase });
      return { ok: true as const, value: undefined };
    }
  );

  logger.info('[bugHandlers] Bug handlers registered');
}

/**
 * Start or restart bugs watcher for the current project
 * Requirements: 6.5
 */
export async function startBugsWatcher(window: BrowserWindow): Promise<void> {
  if (!currentDeps) {
    logger.warn('[bugHandlers] Cannot start bugs watcher: handlers not registered');
    return;
  }

  const currentProjectPath = currentDeps.getCurrentProjectPath();
  if (!currentProjectPath) {
    logger.warn('[bugHandlers] Cannot start bugs watcher: no project path set');
    return;
  }

  // Stop existing watcher if any
  if (bugsWatcherService) {
    await bugsWatcherService.stop();
  }

  bugsWatcherService = new BugsWatcherService(currentProjectPath);

  bugsWatcherService.onChange(async (event) => {
    logger.info('[bugHandlers] Bugs changed', { event });
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.BUGS_CHANGED, event);
    }

    // Broadcast to Remote UI via WebSocket
    // Requirements: Bug management file watcher - Remote UI integration
    // spec-path-ssot-refactor: Use resolveBugPath to get the full path for BugInfo (WebSocket API)
    // Bug fix: empty bug directory handling - extract bugs from ReadBugsResult
    try {
      const remoteServer = getRemoteAccessServer();
      const wsHandler = remoteServer.getWebSocketHandler();
      if (wsHandler && currentProjectPath && currentDeps) {
        const bugsResult = await currentDeps.bugService.readBugs(currentProjectPath);
        if (bugsResult.ok) {
          // Log warnings for empty bug directories
          if (bugsResult.value.warnings.length > 0) {
            for (const warning of bugsResult.value.warnings) {
              logger.warn('[bugHandlers] ' + warning);
            }
          }
          const bugs: BugInfo[] = [];
          for (const bug of bugsResult.value.bugs) {
            const bugPathResult = await currentDeps.fileService.resolveBugPath(currentProjectPath, bug.name);
            const bugPath = bugPathResult.ok ? bugPathResult.value : '';
            bugs.push({
              name: bug.name,
              path: bugPath,
              phase: bug.phase,
              updatedAt: bug.updatedAt,
              reportedAt: bug.reportedAt,
            });
          }
          wsHandler.broadcastBugsUpdated(bugs);
          logger.debug('[bugHandlers] Bugs change broadcasted to Remote UI', { bugsCount: bugs.length });
        }
      }
    } catch (error) {
      logger.warn('[bugHandlers] Failed to broadcast bugs change to Remote UI', { error });
    }
  });

  await bugsWatcherService.start();
  logger.info('[bugHandlers] Bugs watcher started', { projectPath: currentProjectPath });
}

/**
 * Stop bugs watcher
 */
export async function stopBugsWatcher(): Promise<void> {
  if (bugsWatcherService) {
    await bugsWatcherService.stop();
    bugsWatcherService = null;
    logger.info('[bugHandlers] Bugs watcher stopped');
  }
}
