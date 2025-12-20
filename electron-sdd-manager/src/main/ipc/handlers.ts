/**
 * IPC Handlers Registration
 * Requirements: 11.2, 11.3, 5.1-5.8, 9.1-9.10, 10.1-10.3, 13.1, 13.2
 */

import { ipcMain, dialog, app, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from './channels';
import { FileService } from '../services/fileService';
import { CommandService } from '../services/commandService';
import { getConfigStore } from '../services/configStore';
import { updateMenu, setMenuProjectPath, updateWindowTitle } from '../menu';
import type { Phase, SelectProjectResult, SelectProjectError } from '../../renderer/types';
import { SpecManagerService, ExecutionGroup, WorkflowPhase, ValidationType, AgentError, SPEC_INIT_COMMANDS, CommandPrefix } from '../services/specManagerService';
import { SpecsWatcherService } from '../services/specsWatcherService';
import { AgentRecordWatcherService } from '../services/agentRecordWatcherService';
import type { AgentInfo } from '../services/agentRegistry';
import { logger } from '../services/logger';
import { ProjectChecker } from '../services/projectChecker';
import { CommandInstallerService, getTemplateDir, ClaudeMdInstallMode } from '../services/commandInstallerService';
import { getDefaultLogFileService, initDefaultLogFileService } from '../services/logFileService';
import { addShellPermissions, checkRequiredPermissions, addPermissionsToProject } from '../services/permissionsService';
import { REQUIRED_PERMISSIONS } from '../services/projectChecker';
import { getCliInstallStatus, installCliCommand, getManualInstallInstructions } from '../services/cliInstallerService';
import { BugService } from '../services/bugService';
import { BugsWatcherService } from '../services/bugsWatcherService';
import { CcSddWorkflowInstaller } from '../services/ccSddWorkflowInstaller';
import { BugWorkflowInstaller } from '../services/bugWorkflowInstaller';
import {
  UnifiedCommandsetInstaller,
  ProfileName,
  UnifiedInstallResult,
  UnifiedInstallStatus,
} from '../services/unifiedCommandsetInstaller';
import { setupStateProvider, setupWorkflowController, getRemoteAccessServer } from './remoteAccessHandlers';
import type { SpecInfo } from '../services/webSocketHandler';
import * as path from 'path';
import { spawn } from 'child_process';
import { access, rm, stat, readdir } from 'fs/promises';
import { join } from 'path';
import { layoutConfigService, type LayoutValues } from '../services/layoutConfigService';
import {
  ExperimentalToolsInstallerService,
  getExperimentalTemplateDir,
  type ToolType,
  type InstallOptions as ExperimentalInstallOptions,
  type InstallResult as ExperimentalInstallResult,
  type InstallError as ExperimentalInstallError,
  type CheckResult as ExperimentalCheckResult,
  type Result as ExperimentalResult,
} from '../services/experimentalToolsInstallerService';

const fileService = new FileService();
const commandService = new CommandService();
const projectChecker = new ProjectChecker();
const experimentalToolsInstaller = new ExperimentalToolsInstallerService(getExperimentalTemplateDir());
const commandInstallerService = new CommandInstallerService(getTemplateDir());
const ccSddWorkflowInstaller = new CcSddWorkflowInstaller(getTemplateDir());
const bugWorkflowInstaller = new BugWorkflowInstaller(getTemplateDir());
const unifiedCommandsetInstaller = new UnifiedCommandsetInstaller(
  ccSddWorkflowInstaller,
  bugWorkflowInstaller,
  getTemplateDir()
);
const bugService = new BugService();

// SpecManagerService instance (lazily initialized with project path)
let specManagerService: SpecManagerService | null = null;
// SpecsWatcherService instance
let specsWatcherService: SpecsWatcherService | null = null;
// AgentRecordWatcherService instance
let agentRecordWatcherService: AgentRecordWatcherService | null = null;
// BugsWatcherService instance
let bugsWatcherService: BugsWatcherService | null = null;
// Track if event callbacks have been set up to avoid duplicates
let eventCallbacksRegistered = false;
// Initial project path set from command line arguments
let initialProjectPath: string | null = null;
// Current project path
let currentProjectPath: string | null = null;

/**
 * Convert AgentError to user-friendly error message
 */
function getErrorMessage(error: AgentError): string {
  const groupLabels: Record<ExecutionGroup, string> = {
    doc: 'ドキュメント生成',
    validate: 'バリデーション',
    impl: '実装',
  };

  switch (error.type) {
    case 'SPAWN_ERROR':
      return `プロセス起動エラー: ${error.message}`;
    case 'NOT_FOUND':
      return `エージェントが見つかりません: ${error.agentId}`;
    case 'ALREADY_RUNNING':
      return `${error.phase}フェーズは既に実行中です`;
    case 'SESSION_NOT_FOUND':
      return `セッションが見つかりません: ${error.agentId}`;
    case 'GROUP_CONFLICT':
      return `${groupLabels[error.runningGroup]}が実行中のため、${groupLabels[error.requestedGroup]}を開始できません。先に実行中のAgentを停止してください。`;
    case 'SPEC_MANAGER_LOCKED':
      return `spec-managerはロック中です: ${error.lockedBy}`;
    case 'PARSE_ERROR':
      return `解析エラー: ${error.message}`;
    case 'ANALYZE_ERROR': {
      const analyzeError = error.error;
      switch (analyzeError.type) {
        case 'API_ERROR':
          return `分析API エラー: ${analyzeError.message}`;
        case 'RATE_LIMITED':
          return 'API呼び出し制限に達しました。しばらく待ってから再試行してください。';
        case 'TIMEOUT':
          return '分析がタイムアウトしました。';
        case 'INVALID_INPUT':
          return `入力エラー: ${analyzeError.message}`;
        default:
          return '分析エラーが発生しました';
      }
    }
    default:
      return '不明なエラーが発生しました';
  }
}

/**
 * Set initial project path (called from main process)
 */
export function setInitialProjectPath(path: string | null): void {
  initialProjectPath = path;
}

/**
 * Get initial project path
 */
export function getInitialProjectPath(): string | null {
  return initialProjectPath;
}

// ============================================================
// Exclusive Control for Project Selection
// Requirements: 6.2, 6.3, 6.4
// ============================================================

/** Lock state for project selection */
let projectSelectionInProgress = false;

/**
 * Check if project selection is in progress
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
 * Unified project selection handler
 * This is the single entry point for all project selection operations
 * Requirements: 1.1-1.6, 5.1-5.4, 6.1-6.4
 *
 * @param projectPath - The project path to select
 * @returns SelectProjectResult with project data or error
 */
export async function selectProject(projectPath: string): Promise<SelectProjectResult> {
  logger.info('[handlers] selectProject called', { projectPath });

  // Check for exclusive lock
  if (projectSelectionInProgress) {
    logger.warn('[handlers] selectProject blocked - selection already in progress', { projectPath });
    return {
      success: false,
      projectPath,
      kiroValidation: { exists: false, hasSpecs: false, hasSteering: false },
      specs: [],
      bugs: [],
      error: { type: 'SELECTION_IN_PROGRESS' },
    };
  }

  // Acquire lock
  projectSelectionInProgress = true;
  logger.debug('[handlers] selectProject acquired lock', { projectPath });

  try {
    // Validate path first
    const validationResult = await validateProjectPath(projectPath);
    if (!validationResult.ok) {
      logger.warn('[handlers] selectProject path validation failed', { projectPath, error: validationResult.error });
      return {
        success: false,
        projectPath,
        kiroValidation: { exists: false, hasSpecs: false, hasSteering: false },
        specs: [],
        bugs: [],
        error: validationResult.error,
      };
    }

    // Initialize the project
    await setProjectPath(projectPath);

    // Read kiro validation
    const kiroValidation = await fileService.validateKiroDirectory(projectPath);

    // Read specs
    const specsResult = await fileService.readSpecs(projectPath);
    const specs = specsResult.ok ? specsResult.value : [];

    // Read bugs
    const bugsResult = await bugService.readBugs(projectPath);
    const bugs = bugsResult.ok ? bugsResult.value : [];

    // Update configStore
    const configStore = getConfigStore();
    configStore.addRecentProject(projectPath);

    logger.info('[handlers] selectProject completed successfully', {
      projectPath,
      specsCount: specs.length,
      bugsCount: bugs.length,
      kiroExists: kiroValidation.exists,
    });

    return {
      success: true,
      projectPath,
      kiroValidation,
      specs,
      bugs,
    };
  } catch (error) {
    logger.error('[handlers] selectProject failed', { projectPath, error });
    return {
      success: false,
      projectPath,
      kiroValidation: { exists: false, hasSpecs: false, hasSteering: false },
      specs: [],
      bugs: [],
      error: {
        type: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  } finally {
    // Always release the lock
    projectSelectionInProgress = false;
    logger.debug('[handlers] selectProject released lock', { projectPath });
  }
}

/**
 * Set up SpecManagerService for a project
 */
export async function setProjectPath(projectPath: string): Promise<void> {
  logger.info('[handlers] setProjectPath called', { projectPath });
  currentProjectPath = projectPath;
  specManagerService = new SpecManagerService(projectPath);
  eventCallbacksRegistered = false; // Reset when service is recreated

  // Update menu state to enable project-dependent menu items
  setMenuProjectPath(projectPath);

  // Update window title with project name (Task 1.2 - sidebar-refactor)
  // Requirements: 1.3 - Display current project name in window title
  const projectName = projectPath.split('/').pop() || projectPath;
  updateWindowTitle(projectName);

  // Initialize default LogFileService for agent log reading (Bug fix: agent-log-display-issue)
  // Log files are stored at .kiro/specs/{specId}/logs/{agentId}.log
  initDefaultLogFileService(path.join(projectPath, '.kiro', 'specs'));
  logger.info('[handlers] LogFileService initialized');

  // Restore agents from PID files and cleanup stale ones
  try {
    await specManagerService.restoreAgents();
    logger.info('[handlers] Agents restored from PID files');
  } catch (error) {
    logger.error('[handlers] Failed to restore agents:', error);
  }

  // Stop existing watchers if any
  if (specsWatcherService) {
    await specsWatcherService.stop();
    specsWatcherService = null;
  }
  if (agentRecordWatcherService) {
    await agentRecordWatcherService.stop();
    agentRecordWatcherService = null;
  }
  if (bugsWatcherService) {
    await bugsWatcherService.stop();
    bugsWatcherService = null;
  }

  // Set up StateProvider and WorkflowController for Remote Access Server
  // This enables mobile remote access to see specs and control workflows
  const getSpecsForRemote = async (): Promise<SpecInfo[] | null> => {
    const result = await fileService.readSpecs(projectPath);
    if (!result.ok) {
      logger.error('[handlers] Failed to read specs for remote access', { error: result.error });
      return null;
    }
    // Convert SpecMetadata[] to SpecInfo[]
    // SpecInfo requires: id, name, phase (and allows additional properties)
    // Note: Mobile UI expects feature_name for display and selection
    // Include approvals for accurate phase status display
    return result.value.map(spec => ({
      id: spec.name, // Use name as id (spec directory name)
      name: spec.name,
      feature_name: spec.name, // Required by mobile UI components
      phase: spec.phase,
      path: spec.path,
      updatedAt: spec.updatedAt,
      approvals: spec.approvals, // Include approvals for Remote UI
    }));
  };

  setupStateProvider(projectPath, getSpecsForRemote);
  setupWorkflowController(specManagerService);
  logger.info('[handlers] Remote Access StateProvider and WorkflowController set up');
}

/**
 * Get current SpecManagerService or throw if not initialized
 */
function getSpecManagerService(): SpecManagerService {
  if (!specManagerService) {
    throw new Error('SpecManagerService not initialized. Call setProjectPath first.');
  }
  return specManagerService;
}

export function registerIpcHandlers(): void {
  const configStore = getConfigStore();

  // File System Handlers
  ipcMain.handle(IPC_CHANNELS.SHOW_OPEN_DIALOG, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'プロジェクトディレクトリを選択',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle(
    IPC_CHANNELS.VALIDATE_KIRO_DIRECTORY,
    async (_event, dirPath: string) => {
      return fileService.validateKiroDirectory(dirPath);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.SET_PROJECT_PATH,
    async (_event, projectPath: string) => {
      await setProjectPath(projectPath);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.READ_SPECS,
    async (_event, projectPath: string) => {
      const result = await fileService.readSpecs(projectPath);
      if (!result.ok) {
        throw new Error(`Failed to read specs: ${result.error.type}`);
      }
      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.READ_SPEC_JSON,
    async (_event, specPath: string) => {
      const result = await fileService.readSpecJson(specPath);
      if (!result.ok) {
        throw new Error(`Failed to read spec.json: ${result.error.type}`);
      }
      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.READ_ARTIFACT,
    async (_event, artifactPath: string) => {
      const result = await fileService.readArtifact(artifactPath);
      if (!result.ok) {
        throw new Error(`Failed to read artifact: ${result.error.type}`);
      }
      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.CREATE_SPEC,
    async (
      _event,
      projectPath: string,
      specName: string,
      description: string
    ) => {
      const result = await fileService.createSpec(
        projectPath,
        specName,
        description
      );
      if (!result.ok) {
        throw new Error(`Failed to create spec: ${result.error.type}`);
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.WRITE_FILE,
    async (_event, filePath: string, content: string) => {
      const result = await fileService.writeFile(filePath, content);
      if (!result.ok) {
        throw new Error(`Failed to write file: ${result.error.type}`);
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.UPDATE_APPROVAL,
    async (_event, specPath: string, phase: Phase, approved: boolean) => {
      const result = await fileService.updateApproval(specPath, phase, approved);
      if (!result.ok) {
        throw new Error(`Failed to update approval: ${result.error.type}`);
      }
    }
  );

  // Command Execution Handlers
  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_COMMAND,
    async (event, command: string, workingDirectory: string) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        throw new Error('No window found for command execution');
      }

      const result = await commandService.executeCommand(
        command,
        workingDirectory,
        window.webContents
      );

      if (!result.ok) {
        throw new Error(`Command execution failed: ${result.error.type}`);
      }

      return result.value;
    }
  );

  ipcMain.handle(IPC_CHANNELS.CANCEL_EXECUTION, async () => {
    const result = commandService.cancelExecution();
    if (!result.ok) {
      throw new Error(`Cancel execution failed: ${result.error.type}`);
    }
  });

  // Config Handlers
  ipcMain.handle(IPC_CHANNELS.GET_RECENT_PROJECTS, async () => {
    return configStore.getRecentProjects();
  });

  ipcMain.handle(
    IPC_CHANNELS.ADD_RECENT_PROJECT,
    async (_event, path: string) => {
      configStore.addRecentProject(path);
      updateMenu(); // Update menu to reflect new recent project
    }
  );

  // App Handlers
  ipcMain.handle(IPC_CHANNELS.GET_APP_VERSION, async () => {
    return app.getVersion();
  });

  ipcMain.handle(IPC_CHANNELS.GET_PLATFORM, async () => {
    return process.platform;
  });

  ipcMain.handle(IPC_CHANNELS.GET_INITIAL_PROJECT_PATH, async () => {
    return initialProjectPath;
  });

  // Specs Watcher Handlers
  ipcMain.handle(IPC_CHANNELS.START_SPECS_WATCHER, async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      startSpecsWatcher(window);
      // Also start agent record watcher
      startAgentRecordWatcher(window);
    }
  });

  ipcMain.handle(IPC_CHANNELS.STOP_SPECS_WATCHER, async () => {
    await stopSpecsWatcher();
    await stopAgentRecordWatcher();
  });

  // Agent Management Handlers (Task 27.1)
  // Requirements: 5.1-5.8, 10.1-10.3
  ipcMain.handle(
    IPC_CHANNELS.START_AGENT,
    async (
      event,
      specId: string,
      phase: string,
      command: string,
      args: string[],
      group?: ExecutionGroup,
      sessionId?: string
    ) => {
      logger.info('[handlers] START_AGENT called', { specId, phase, command, args, group, sessionId });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Set up event forwarding for output and status changes (only once per service instance)
      if (window && !eventCallbacksRegistered) {
        logger.info('[handlers] Registering event callbacks');
        eventCallbacksRegistered = true;

        service.onOutput((agentId, stream, data) => {
          logger.debug('[handlers] Agent output received', { agentId, stream, dataLength: data.length, preview: data.substring(0, 100) });
          if (!window.isDestroyed()) {
            window.webContents.send(IPC_CHANNELS.AGENT_OUTPUT, agentId, stream, data);
            logger.debug('[handlers] Agent output sent to renderer', { agentId });
          } else {
            logger.warn('[handlers] Window destroyed, cannot send output', { agentId });
          }

          // Broadcast to Remote UI via WebSocket
          const remoteServer = getRemoteAccessServer();
          const wsHandler = remoteServer.getWebSocketHandler();
          if (wsHandler) {
            const logType = stream === 'stderr' ? 'error' : 'agent';
            wsHandler.broadcastAgentOutput(agentId, stream, data, logType);
          }
        });

        service.onStatusChange((agentId, status) => {
          logger.info('[handlers] Agent status change', { agentId, status });
          if (!window.isDestroyed()) {
            window.webContents.send(IPC_CHANNELS.AGENT_STATUS_CHANGE, agentId, status);
          }

          // Broadcast status change to Remote UI via WebSocket
          const remoteServer = getRemoteAccessServer();
          const wsHandler = remoteServer.getWebSocketHandler();
          if (wsHandler) {
            wsHandler.broadcastAgentStatus(agentId, status);
          }
        });
      } else {
        logger.debug('[handlers] Event callbacks already registered or no window', { hasWindow: !!window, eventCallbacksRegistered });
      }

      logger.info('[handlers] Calling service.startAgent');
      const result = await service.startAgent({
        specId,
        phase,
        command,
        args,
        group,
        sessionId,
      });

      if (!result.ok) {
        logger.error('[handlers] startAgent failed', { error: result.error });
        throw new Error(`Failed to start agent: ${result.error.type}`);
      }

      logger.info('[handlers] startAgent succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.STOP_AGENT,
    async (_event, agentId: string) => {
      const service = getSpecManagerService();
      const result = await service.stopAgent(agentId);

      if (!result.ok) {
        throw new Error(`Failed to stop agent: ${result.error.type}`);
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.RESUME_AGENT,
    async (event, agentId: string, prompt?: string) => {
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered (may not be if no START_AGENT was called yet)
      if (window && !eventCallbacksRegistered) {
        registerEventCallbacks(service, window);
      }

      const result = await service.resumeAgent(agentId, prompt);

      if (!result.ok) {
        throw new Error(`Failed to resume agent: ${result.error.type}`);
      }

      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.DELETE_AGENT,
    async (_event, specId: string, agentId: string) => {
      logger.info('[handlers] DELETE_AGENT called', { specId, agentId });
      const service = getSpecManagerService();
      const result = await service.deleteAgent(specId, agentId);

      if (!result.ok) {
        throw new Error(`Failed to delete agent: ${result.error.type}`);
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GET_AGENTS,
    async (_event, specId: string) => {
      const service = getSpecManagerService();
      return service.getAgents(specId);
    }
  );

  ipcMain.handle(IPC_CHANNELS.GET_ALL_AGENTS, async () => {
    const service = getSpecManagerService();
    const agentsMap = service.getAllAgents();

    // Convert Map to plain object for IPC serialization
    const result: Record<string, AgentInfo[]> = {};
    agentsMap.forEach((agents, specId) => {
      result[specId] = agents;
    });

    return result;
  });

  ipcMain.handle(
    IPC_CHANNELS.SEND_AGENT_INPUT,
    async (_event, agentId: string, input: string) => {
      const service = getSpecManagerService();
      const result = service.sendInput(agentId, input);

      if (!result.ok) {
        throw new Error(`Failed to send input: ${result.error.type}`);
      }
    }
  );

  // Agent Logs Handler (Bug fix: agent-log-display-issue)
  ipcMain.handle(
    IPC_CHANNELS.GET_AGENT_LOGS,
    async (_event, specId: string, agentId: string) => {
      logger.debug('[handlers] GET_AGENT_LOGS called', { specId, agentId });
      try {
        const logFileService = getDefaultLogFileService();
        const logs = await logFileService.readLog(specId, agentId);
        logger.debug('[handlers] GET_AGENT_LOGS returned', { specId, agentId, logCount: logs.length });
        return logs;
      } catch (error) {
        logger.error('[handlers] GET_AGENT_LOGS failed', { specId, agentId, error });
        throw error;
      }
    }
  );

  // Config Handlers - Extension (Task 27.3)
  // Requirements: 13.1, 13.2
  ipcMain.handle(IPC_CHANNELS.GET_HANG_THRESHOLD, async () => {
    return configStore.getHangThreshold();
  });

  ipcMain.handle(
    IPC_CHANNELS.SET_HANG_THRESHOLD,
    async (_event, thresholdMs: number) => {
      configStore.setHangThreshold(thresholdMs);
    }
  );

  // Phase Execution Handlers (high-level commands)
  // These build the claude command internally in the service layer

  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_PHASE,
    async (event, specId: string, phase: WorkflowPhase, featureName: string, commandPrefix?: 'kiro' | 'spec-manager') => {
      logger.info('[handlers] EXECUTE_PHASE called', { specId, phase, featureName, commandPrefix });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !eventCallbacksRegistered) {
        registerEventCallbacks(service, window);
      }

      const result = await service.executePhase({ specId, phase, featureName, commandPrefix });

      if (!result.ok) {
        logger.error('[handlers] executePhase failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[handlers] executePhase succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_VALIDATION,
    async (event, specId: string, type: ValidationType, featureName: string, commandPrefix?: 'kiro' | 'spec-manager') => {
      logger.info('[handlers] EXECUTE_VALIDATION called', { specId, type, featureName, commandPrefix });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !eventCallbacksRegistered) {
        registerEventCallbacks(service, window);
      }

      const result = await service.executeValidation({ specId, type, featureName, commandPrefix });

      if (!result.ok) {
        logger.error('[handlers] executeValidation failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[handlers] executeValidation succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_SPEC_STATUS,
    async (event, specId: string, featureName: string, commandPrefix?: 'kiro' | 'spec-manager') => {
      logger.info('[handlers] EXECUTE_SPEC_STATUS called', { specId, featureName, commandPrefix });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !eventCallbacksRegistered) {
        registerEventCallbacks(service, window);
      }

      const result = await service.executeSpecStatus(specId, featureName, commandPrefix);

      if (!result.ok) {
        logger.error('[handlers] executeSpecStatus failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[handlers] executeSpecStatus succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_TASK_IMPL,
    async (event, specId: string, featureName: string, taskId: string, commandPrefix?: 'kiro' | 'spec-manager') => {
      logger.info('[handlers] EXECUTE_TASK_IMPL called', { specId, featureName, taskId, commandPrefix });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !eventCallbacksRegistered) {
        registerEventCallbacks(service, window);
      }

      const result = await service.executeTaskImpl({ specId, featureName, taskId, commandPrefix });

      if (!result.ok) {
        logger.error('[handlers] executeTaskImpl failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[handlers] executeTaskImpl succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  // Task 5.2.3 (sidebar-refactor): spec-init連携
  // Launch spec-init agent with description only
  // specId='' for global agent, command: claude -p /kiro:spec-init "{description}" or /spec-manager:init "{description}"
  // Returns agentId immediately without waiting for completion
  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_SPEC_INIT,
    async (event, projectPath: string, description: string, commandPrefix: CommandPrefix = 'kiro') => {
      logger.info('[handlers] EXECUTE_SPEC_INIT called', { projectPath, description, commandPrefix });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !eventCallbacksRegistered) {
        registerEventCallbacks(service, window);
      }

      // Get the appropriate slash command based on commandPrefix
      const slashCommand = SPEC_INIT_COMMANDS[commandPrefix];

      // Start agent with specId='' (global agent)
      const result = await service.startAgent({
        specId: '', // Empty specId for global agent
        phase: 'spec-init',
        command: 'claude',
        args: ['-p', '--verbose', '--output-format', 'stream-json', `${slashCommand} "${description}"`],
        group: 'doc',
      });

      if (!result.ok) {
        logger.error('[handlers] executeSpecInit failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[handlers] executeSpecInit succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  // spec-manager Install Handlers (Requirements: 4.1-4.6)
  ipcMain.handle(
    IPC_CHANNELS.CHECK_SPEC_MANAGER_FILES,
    async (_event, projectPath: string) => {
      // Only log if there are issues (normal checks are silent)
      const result = await projectChecker.checkAll(projectPath);
      const hasIssues = !result.allPresent;
      if (hasIssues) {
        logger.info('[handlers] CHECK_SPEC_MANAGER_FILES called', { projectPath });
      }
      return result;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.INSTALL_SPEC_MANAGER_COMMANDS,
    async (_event, projectPath: string, missingCommands: string[]) => {
      logger.info('[handlers] INSTALL_SPEC_MANAGER_COMMANDS called', { projectPath, missingCommands });
      return commandInstallerService.installCommands(projectPath, missingCommands);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.INSTALL_SPEC_MANAGER_SETTINGS,
    async (_event, projectPath: string, missingSettings: string[]) => {
      logger.info('[handlers] INSTALL_SPEC_MANAGER_SETTINGS called', { projectPath, missingSettings });
      return commandInstallerService.installSettings(projectPath, missingSettings);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.INSTALL_SPEC_MANAGER_ALL,
    async (_event, projectPath: string) => {
      logger.info('[handlers] INSTALL_SPEC_MANAGER_ALL called', { projectPath });
      return commandInstallerService.installAll(projectPath);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.FORCE_REINSTALL_SPEC_MANAGER_ALL,
    async (_event, projectPath: string) => {
      logger.info('[handlers] FORCE_REINSTALL_SPEC_MANAGER_ALL called', { projectPath });
      return commandInstallerService.forceReinstallAll(projectPath);
    }
  );

  // CLAUDE.md Install Handlers
  ipcMain.handle(
    IPC_CHANNELS.CHECK_CLAUDE_MD_EXISTS,
    async (_event, projectPath: string) => {
      logger.info('[handlers] CHECK_CLAUDE_MD_EXISTS called', { projectPath });
      return commandInstallerService.claudeMdExists(projectPath);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.INSTALL_CLAUDE_MD,
    async (_event, projectPath: string, mode: ClaudeMdInstallMode) => {
      logger.info('[handlers] INSTALL_CLAUDE_MD called', { projectPath, mode });
      return commandInstallerService.installClaudeMd(projectPath, mode);
    }
  );

  // Phase Sync Handler - Auto-fix spec.json phase based on task completion
  ipcMain.handle(
    IPC_CHANNELS.SYNC_SPEC_PHASE,
    async (_event, specPath: string, completedPhase: 'impl' | 'impl-complete') => {
      logger.info('[handlers] SYNC_SPEC_PHASE called', { specPath, completedPhase });
      const result = await fileService.updateSpecJsonFromPhase(specPath, completedPhase);
      if (!result.ok) {
        throw new Error(`Failed to sync spec phase: ${result.error.type}`);
      }
    }
  );

  // Permissions Handler - Add shell permissions to project's settings.local.json
  ipcMain.handle(
    IPC_CHANNELS.ADD_SHELL_PERMISSIONS,
    async (_event, projectPath: string) => {
      logger.info('[handlers] ADD_SHELL_PERMISSIONS called', { projectPath });
      const result = await addShellPermissions(projectPath);
      if (!result.ok) {
        throw new Error(`Failed to add shell permissions: ${result.error.type}`);
      }
      return result.value;
    }
  );

  // Permissions Handler - Add specific missing permissions to project's settings.local.json
  ipcMain.handle(
    IPC_CHANNELS.ADD_MISSING_PERMISSIONS,
    async (_event, projectPath: string, permissions: string[]) => {
      logger.info('[handlers] ADD_MISSING_PERMISSIONS called', { projectPath, count: permissions.length });
      const result = await addPermissionsToProject(projectPath, permissions);
      if (!result.ok) {
        throw new Error(`Failed to add missing permissions: ${result.error.type}`);
      }
      return result.value;
    }
  );

  // Permissions Handler - Check required permissions
  ipcMain.handle(
    IPC_CHANNELS.CHECK_REQUIRED_PERMISSIONS,
    async (_event, projectPath: string) => {
      const result = await checkRequiredPermissions(
        projectPath,
        [...REQUIRED_PERMISSIONS]
      );
      if (!result.ok) {
        // If settings.local.json doesn't exist or has errors, return all as missing
        logger.info('[handlers] CHECK_REQUIRED_PERMISSIONS called', { projectPath, error: result.error });
        return {
          allPresent: false,
          missing: [...REQUIRED_PERMISSIONS],
          present: [],
        };
      }
      // Only log if there are missing permissions
      if (!result.value.allPresent) {
        logger.info('[handlers] CHECK_REQUIRED_PERMISSIONS called', { projectPath, missing: result.value.missing.length });
      }
      return result.value;
    }
  );

  // Document Review Sync Handler - Auto-fix spec.json documentReview based on file system
  ipcMain.handle(
    IPC_CHANNELS.SYNC_DOCUMENT_REVIEW,
    async (_event, specPath: string) => {
      logger.info('[handlers] SYNC_DOCUMENT_REVIEW called', { specPath });
      const { DocumentReviewService } = await import('../services/documentReviewService');
      const service = new DocumentReviewService(currentProjectPath || '');
      return service.syncReviewState(specPath);
    }
  );

  // CLI Install Handlers
  ipcMain.handle(IPC_CHANNELS.GET_CLI_INSTALL_STATUS, async (_event, location: 'user' | 'system' = 'user') => {
    logger.info(`[handlers] GET_CLI_INSTALL_STATUS called (location: ${location})`);
    return getCliInstallStatus(location);
  });

  ipcMain.handle(IPC_CHANNELS.INSTALL_CLI_COMMAND, async (_event, location: 'user' | 'system' = 'user') => {
    logger.info(`[handlers] INSTALL_CLI_COMMAND called (location: ${location})`);
    const result = await installCliCommand(location);
    return {
      ...result,
      instructions: getManualInstallInstructions(location),
    };
  });


  // Bug Management Handlers (Requirements: 3.1, 6.1, 6.3, 6.5)
  ipcMain.handle(
    IPC_CHANNELS.READ_BUGS,
    async (_event, projectPath: string) => {
      logger.info('[handlers] READ_BUGS called', { projectPath });
      const result = await bugService.readBugs(projectPath);
      if (!result.ok) {
        throw new Error(`Failed to read bugs: ${result.error.type}`);
      }
      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.READ_BUG_DETAIL,
    async (_event, bugPath: string) => {
      logger.info('[handlers] READ_BUG_DETAIL called', { bugPath });
      const result = await bugService.readBugDetail(bugPath);
      if (!result.ok) {
        throw new Error(`Failed to read bug detail: ${result.error.type}`);
      }
      return result.value;
    }
  );

  ipcMain.handle(IPC_CHANNELS.START_BUGS_WATCHER, async (event) => {
    logger.info('[handlers] START_BUGS_WATCHER called');
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      startBugsWatcher(window);
    }
  });

  ipcMain.handle(IPC_CHANNELS.STOP_BUGS_WATCHER, async () => {
    logger.info('[handlers] STOP_BUGS_WATCHER called');
    await stopBugsWatcher();
  });

  // ============================================================
  // Document Review Execution Handlers (Requirements: 6.1 - Document Review Workflow)
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_DOCUMENT_REVIEW,
    async (event, specId: string, featureName: string, commandPrefix?: 'kiro' | 'spec-manager') => {
      logger.info('[handlers] EXECUTE_DOCUMENT_REVIEW called', { specId, featureName, commandPrefix });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !eventCallbacksRegistered) {
        registerEventCallbacks(service, window);
      }

      const result = await service.executeDocumentReview({ specId, featureName, commandPrefix });

      if (!result.ok) {
        logger.error('[handlers] executeDocumentReview failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[handlers] executeDocumentReview succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_DOCUMENT_REVIEW_REPLY,
    async (event, specId: string, featureName: string, reviewNumber: number, commandPrefix?: 'kiro' | 'spec-manager') => {
      logger.info('[handlers] EXECUTE_DOCUMENT_REVIEW_REPLY called', { specId, featureName, reviewNumber, commandPrefix });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !eventCallbacksRegistered) {
        registerEventCallbacks(service, window);
      }

      const result = await service.executeDocumentReviewReply({ specId, featureName, reviewNumber, commandPrefix });

      if (!result.ok) {
        logger.error('[handlers] executeDocumentReviewReply failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[handlers] executeDocumentReviewReply succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_DOCUMENT_REVIEW_FIX,
    async (event, specId: string, featureName: string, reviewNumber: number, commandPrefix?: 'kiro' | 'spec-manager') => {
      logger.info('[handlers] EXECUTE_DOCUMENT_REVIEW_FIX called', { specId, featureName, reviewNumber, commandPrefix });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !eventCallbacksRegistered) {
        registerEventCallbacks(service, window);
      }

      const result = await service.executeDocumentReviewFix({ specId, featureName, reviewNumber, commandPrefix });

      if (!result.ok) {
        logger.error('[handlers] executeDocumentReviewFix failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[handlers] executeDocumentReviewFix succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.APPROVE_DOCUMENT_REVIEW,
    async (_event, specPath: string) => {
      logger.info('[handlers] APPROVE_DOCUMENT_REVIEW called', { specPath });
      const { DocumentReviewService } = await import('../services/documentReviewService');
      const service = new DocumentReviewService(currentProjectPath || '');
      const result = await service.approveReview(specPath);
      if (!result.ok) {
        throw new Error(`Failed to approve document review: ${result.error.type}`);
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.SKIP_DOCUMENT_REVIEW,
    async (_event, specPath: string) => {
      logger.info('[handlers] SKIP_DOCUMENT_REVIEW called', { specPath });
      const { DocumentReviewService } = await import('../services/documentReviewService');
      const service = new DocumentReviewService(currentProjectPath || '');
      const result = await service.skipReview(specPath);
      if (!result.ok) {
        throw new Error(`Failed to skip document review: ${result.error.type}`);
      }
    }
  );

  // ============================================================
  // cc-sdd Workflow Install Handlers (cc-sdd-command-installer feature)
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.CHECK_CC_SDD_WORKFLOW_STATUS,
    async (_event, projectPath: string) => {
      logger.info('[handlers] CHECK_CC_SDD_WORKFLOW_STATUS called', { projectPath });
      return ccSddWorkflowInstaller.checkInstallStatus(projectPath);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.INSTALL_CC_SDD_WORKFLOW,
    async (_event, projectPath: string) => {
      logger.info('[handlers] INSTALL_CC_SDD_WORKFLOW called', { projectPath });
      return ccSddWorkflowInstaller.installAll(projectPath);
    }
  );

  // ============================================================
  // Unified Commandset Install Handlers (commandset-unified-installer feature)
  // Requirements: 11.1
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.CHECK_COMMANDSET_STATUS,
    async (_event, projectPath: string): Promise<UnifiedInstallStatus> => {
      logger.info('[handlers] CHECK_COMMANDSET_STATUS called', { projectPath });
      return unifiedCommandsetInstaller.checkAllInstallStatus(projectPath);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.INSTALL_COMMANDSET_BY_PROFILE,
    async (
      event,
      projectPath: string,
      profileName: ProfileName,
      options?: { force?: boolean }
    ): Promise<{ ok: true; value: UnifiedInstallResult } | { ok: false; error: { type: string; message: string } }> => {
      logger.info('[handlers] INSTALL_COMMANDSET_BY_PROFILE called', { projectPath, profileName, options });

      const window = BrowserWindow.fromWebContents(event.sender);

      // Progress callback to send updates to renderer
      const progressCallback = (current: number, total: number, currentCommandset: string) => {
        if (window && !window.isDestroyed()) {
          // We don't have a dedicated channel for progress, so we just log it
          logger.debug('[handlers] Install progress', { current, total, currentCommandset });
        }
      };

      const result = await unifiedCommandsetInstaller.installByProfile(
        projectPath,
        profileName,
        options,
        progressCallback
      );

      if (!result.ok) {
        logger.error('[handlers] INSTALL_COMMANDSET_BY_PROFILE failed', { error: result.error });
        const errorMessage = 'path' in result.error ? result.error.path : ('message' in result.error ? result.error.message : 'Installation failed');
        return {
          ok: false,
          error: { type: result.error.type, message: errorMessage }
        };
      }

      logger.info('[handlers] INSTALL_COMMANDSET_BY_PROFILE succeeded', {
        profileName,
        totalInstalled: result.value.summary.totalInstalled,
        totalSkipped: result.value.summary.totalSkipped,
        totalFailed: result.value.summary.totalFailed
      });

      return result;
    }
  );

  // ============================================================
  // Agent Folder Management (commandset-profile-agent-cleanup)
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.CHECK_AGENT_FOLDER_EXISTS,
    async (_event, projectPath: string): Promise<boolean> => {
      logger.info('[handlers] CHECK_AGENT_FOLDER_EXISTS called', { projectPath });
      const agentFolderPath = join(projectPath, '.claude', 'agents', 'kiro');
      try {
        await access(agentFolderPath);
        return true;
      } catch {
        return false;
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.DELETE_AGENT_FOLDER,
    async (_event, projectPath: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      logger.info('[handlers] DELETE_AGENT_FOLDER called', { projectPath });
      const agentFolderPath = join(projectPath, '.claude', 'agents', 'kiro');
      try {
        await rm(agentFolderPath, { recursive: true, force: true });
        logger.info('[handlers] Agent folder deleted successfully', { agentFolderPath });
        return { ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('[handlers] Failed to delete agent folder', { agentFolderPath, error: message });
        return { ok: false, error: message };
      }
    }
  );

  // ============================================================
  // VSCode Integration
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.OPEN_IN_VSCODE,
    async (_event, projectPath: string) => {
      logger.info('[handlers] OPEN_IN_VSCODE called', { projectPath });

      try {
        // Spawn VSCode with detached mode to prevent it from being killed when app closes
        const child = spawn('code', [projectPath], {
          detached: true,
          stdio: 'ignore',
        });

        // Unref to allow parent process to exit independently
        child.unref();

        logger.info('[handlers] VSCode launched successfully', { projectPath });
      } catch (error) {
        logger.error('[handlers] Failed to launch VSCode', { projectPath, error });
        throw new Error(`VSCodeの起動に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  );

  // ============================================================
  // Layout Config (pane-layout-persistence feature)
  // Requirements: 1.1-1.4, 2.1-2.4, 3.1-3.2
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.LOAD_LAYOUT_CONFIG,
    async (_event, projectPath: string): Promise<LayoutValues | null> => {
      logger.debug('[handlers] LOAD_LAYOUT_CONFIG called', { projectPath });
      return layoutConfigService.loadLayoutConfig(projectPath);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.SAVE_LAYOUT_CONFIG,
    async (_event, projectPath: string, layout: LayoutValues): Promise<void> => {
      logger.debug('[handlers] SAVE_LAYOUT_CONFIG called', { projectPath, layout });
      return layoutConfigService.saveLayoutConfig(projectPath, layout);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.RESET_LAYOUT_CONFIG,
    async (_event, projectPath: string): Promise<void> => {
      logger.info('[handlers] RESET_LAYOUT_CONFIG called', { projectPath });
      return layoutConfigService.resetLayoutConfig(projectPath);
    }
  );

  // ============================================================
  // Experimental Tools Install (experimental-tools-installer feature)
  // Requirements: 2.1-2.4, 3.1-3.6, 4.1-4.4, 7.1-7.4
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.INSTALL_EXPERIMENTAL_PLAN,
    async (
      _event,
      projectPath: string,
      options?: ExperimentalInstallOptions
    ): Promise<ExperimentalResult<ExperimentalInstallResult, ExperimentalInstallError>> => {
      logger.info('[handlers] INSTALL_EXPERIMENTAL_PLAN called', { projectPath, options });
      return experimentalToolsInstaller.installPlanCommand(projectPath, options);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.INSTALL_EXPERIMENTAL_DEBUG,
    async (
      _event,
      projectPath: string,
      options?: ExperimentalInstallOptions
    ): Promise<ExperimentalResult<ExperimentalInstallResult, ExperimentalInstallError>> => {
      logger.info('[handlers] INSTALL_EXPERIMENTAL_DEBUG called', { projectPath, options });
      return experimentalToolsInstaller.installDebugAgent(projectPath, options);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.INSTALL_EXPERIMENTAL_COMMIT,
    async (
      _event,
      projectPath: string,
      options?: ExperimentalInstallOptions
    ): Promise<ExperimentalResult<ExperimentalInstallResult, ExperimentalInstallError>> => {
      logger.info('[handlers] INSTALL_EXPERIMENTAL_COMMIT called', { projectPath, options });
      return experimentalToolsInstaller.installCommitCommand(projectPath, options);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.CHECK_EXPERIMENTAL_TOOL_EXISTS,
    async (
      _event,
      projectPath: string,
      toolType: ToolType
    ): Promise<ExperimentalCheckResult> => {
      logger.info('[handlers] CHECK_EXPERIMENTAL_TOOL_EXISTS called', { projectPath, toolType });
      return experimentalToolsInstaller.checkTargetExists(projectPath, toolType);
    }
  );

  // ============================================================
  // Unified Project Selection (unified-project-selection feature)
  // Requirements: 1.1-1.6, 5.1-5.4, 6.1-6.4
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.SELECT_PROJECT,
    async (
      event,
      projectPath: string
    ): Promise<SelectProjectResult> => {
      logger.info('[handlers] SELECT_PROJECT called', { projectPath });
      const result = await selectProject(projectPath);

      // Start file watchers on successful project selection
      // Design: unified-project-selection Task 1.4
      if (result.success) {
        const window = BrowserWindow.fromWebContents(event.sender);
        if (window) {
          startSpecsWatcher(window);
          startAgentRecordWatcher(window);
          startBugsWatcher(window);
          logger.info('[handlers] File watchers started for project', { projectPath });
        }
      }

      return result;
    }
  );
}

/**
 * Helper to register event callbacks for a window
 */
function registerEventCallbacks(service: SpecManagerService, window: BrowserWindow): void {
  logger.info('[handlers] Registering event callbacks');
  eventCallbacksRegistered = true;

  service.onOutput((agentId, stream, data) => {
    logger.debug('[handlers] Agent output received', { agentId, stream, dataLength: data.length, preview: data.substring(0, 100) });
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.AGENT_OUTPUT, agentId, stream, data);
      logger.debug('[handlers] Agent output sent to renderer', { agentId });
    } else {
      logger.warn('[handlers] Window destroyed, cannot send output', { agentId });
    }

    // Broadcast to Remote UI via WebSocket
    const remoteServer = getRemoteAccessServer();
    const wsHandler = remoteServer.getWebSocketHandler();
    if (wsHandler) {
      const logType = stream === 'stderr' ? 'error' : 'agent';
      wsHandler.broadcastAgentOutput(agentId, stream, data, logType);
    }
  });

  service.onStatusChange((agentId, status) => {
    logger.info('[handlers] Agent status change', { agentId, status });
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.AGENT_STATUS_CHANGE, agentId, status);
    }

    // Broadcast status change to Remote UI via WebSocket
    const remoteServer = getRemoteAccessServer();
    const wsHandler = remoteServer.getWebSocketHandler();
    if (wsHandler) {
      wsHandler.broadcastAgentStatus(agentId, status);
    }
  });
}

/**
 * Start or restart specs watcher for the current project
 */
export function startSpecsWatcher(window: BrowserWindow): void {
  if (!currentProjectPath) {
    logger.warn('[handlers] Cannot start specs watcher: no project path set');
    return;
  }

  // Stop existing watcher if any
  if (specsWatcherService) {
    specsWatcherService.stop();
  }

  specsWatcherService = new SpecsWatcherService(currentProjectPath);

  specsWatcherService.onChange((event) => {
    logger.info('[handlers] Specs changed', { event });
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.SPECS_CHANGED, event);
    }
  });

  specsWatcherService.start();
  logger.info('[handlers] Specs watcher started', { projectPath: currentProjectPath });
}

/**
 * Stop specs watcher
 */
export async function stopSpecsWatcher(): Promise<void> {
  if (specsWatcherService) {
    await specsWatcherService.stop();
    specsWatcherService = null;
    logger.info('[handlers] Specs watcher stopped');
  }
}

/**
 * Start or restart agent record watcher for the current project
 */
export function startAgentRecordWatcher(window: BrowserWindow): void {
  if (!currentProjectPath) {
    logger.warn('[handlers] Cannot start agent record watcher: no project path set');
    return;
  }

  // Stop existing watcher if any
  if (agentRecordWatcherService) {
    agentRecordWatcherService.stop();
  }

  agentRecordWatcherService = new AgentRecordWatcherService(currentProjectPath);

  agentRecordWatcherService.onChange((event) => {
    logger.debug('[handlers] Agent record changed', { type: event.type, specId: event.specId, agentId: event.agentId });
    if (!window.isDestroyed() && event.record) {
      // Send the full AgentInfo to renderer
      const agentInfo: AgentInfo = {
        agentId: event.record.agentId,
        specId: event.record.specId,
        phase: event.record.phase,
        pid: event.record.pid,
        sessionId: event.record.sessionId,
        status: event.record.status,
        startedAt: event.record.startedAt,
        lastActivityAt: event.record.lastActivityAt,
        command: event.record.command,
      };
      window.webContents.send(IPC_CHANNELS.AGENT_RECORD_CHANGED, event.type, agentInfo);
    } else if (!window.isDestroyed() && event.type === 'unlink') {
      // For unlink events, send just the IDs
      window.webContents.send(IPC_CHANNELS.AGENT_RECORD_CHANGED, event.type, {
        agentId: event.agentId,
        specId: event.specId,
      });
    }
  });

  agentRecordWatcherService.start();
  logger.info('[handlers] Agent record watcher started', { projectPath: currentProjectPath });
}

/**
 * Stop agent record watcher
 */
export async function stopAgentRecordWatcher(): Promise<void> {
  if (agentRecordWatcherService) {
    await agentRecordWatcherService.stop();
    agentRecordWatcherService = null;
    logger.info('[handlers] Agent record watcher stopped');
  }
}

/**
 * Start or restart bugs watcher for the current project
 * Requirements: 6.5
 */
export function startBugsWatcher(window: BrowserWindow): void {
  if (!currentProjectPath) {
    logger.warn('[handlers] Cannot start bugs watcher: no project path set');
    return;
  }

  // Stop existing watcher if any
  if (bugsWatcherService) {
    bugsWatcherService.stop();
  }

  bugsWatcherService = new BugsWatcherService(currentProjectPath);

  bugsWatcherService.onChange((event) => {
    logger.info('[handlers] Bugs changed', { event });
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.BUGS_CHANGED, event);
    }
  });

  bugsWatcherService.start();
  logger.info('[handlers] Bugs watcher started', { projectPath: currentProjectPath });
}

/**
 * Stop bugs watcher
 */
export async function stopBugsWatcher(): Promise<void> {
  if (bugsWatcherService) {
    await bugsWatcherService.stop();
    bugsWatcherService = null;
    logger.info('[handlers] Bugs watcher stopped');
  }
}
