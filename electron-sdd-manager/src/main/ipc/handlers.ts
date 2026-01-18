/**
 * IPC Handlers Registration
 * Requirements: 11.2, 11.3, 5.1-5.8, 9.1-9.10, 10.1-10.3, 13.1, 13.2
 */

import { ipcMain, dialog, app, BrowserWindow, shell } from 'electron';
import { IPC_CHANNELS } from './channels';
import { FileService } from '../services/fileService';
import { getConfigStore } from '../services/configStore';
import { updateMenu, setMenuProjectPath, updateWindowTitle } from '../menu';
import type { Phase, SelectProjectResult, SelectProjectError } from '../../renderer/types';
import { SpecManagerService, ExecutionGroup, WorkflowPhase, AgentError, SPEC_INIT_COMMANDS, SPEC_PLAN_COMMANDS, CommandPrefix } from '../services/specManagerService';
import { SpecsWatcherService } from '../services/specsWatcherService';
import { AgentRecordWatcherService } from '../services/agentRecordWatcherService';
import type { AgentInfo } from '../services/agentRecordService';
import { getDefaultAgentRecordService } from '../services/agentRecordService';
import { logger } from '../services/logger';
import { projectLogger } from '../services/projectLogger';
import { ProjectChecker } from '../services/projectChecker';
import { CommandInstallerService, getTemplateDir, ClaudeMdInstallMode } from '../services/commandInstallerService';
import { getDefaultLogFileService, initDefaultLogFileService } from '../services/logFileService';
import { addShellPermissions, checkRequiredPermissions, addPermissionsToProject } from '../services/permissionsService';
import { REQUIRED_PERMISSIONS } from '../services/projectChecker';
import { getCliInstallStatus, installCliCommand, getManualInstallInstructions } from '../services/cliInstallerService';
import { BugService } from '../services/bugService';
import { getClaudeCommand } from '../services/agentProcess';
import { BugsWatcherService } from '../services/bugsWatcherService';
import { CcSddWorkflowInstaller } from '../services/ccSddWorkflowInstaller';
import { BugWorkflowInstaller } from '../services/bugWorkflowInstaller';
import {
  UnifiedCommandsetInstaller,
  ProfileName,
  UnifiedInstallResult,
  UnifiedInstallStatus,
} from '../services/unifiedCommandsetInstaller';
import { setupStateProvider, setupWorkflowController, setupAgentLogsProvider, getRemoteAccessServer } from './remoteAccessHandlers';
import { registerAutoExecutionHandlers } from './autoExecutionHandlers';
import { registerBugAutoExecutionHandlers } from './bugAutoExecutionHandlers';
import { getBugAutoExecutionCoordinator } from '../services/bugAutoExecutionCoordinator';
import { registerCloudflareHandlers } from './cloudflareHandlers';
import { AutoExecutionCoordinator, MAX_DOCUMENT_REVIEW_ROUNDS } from '../services/autoExecutionCoordinator';
import type { SpecInfo, BugInfo, AgentStateInfo } from '../services/webSocketHandler';
import * as path from 'path';
import { spawn } from 'child_process';
import { access, rm, stat, readdir } from 'fs/promises';
import { join } from 'path';
import { layoutConfigService, type LayoutValues } from '../services/layoutConfigService';
import {
  ExperimentalToolsInstallerService,
  getExperimentalTemplateDir,
  getCommonCommandsTemplateDir,
  CommonCommandsInstallerService,
  type InstallOptions as ExperimentalInstallOptions,
  type InstallResult as ExperimentalInstallResult,
  type InstallError as ExperimentalInstallError,
  type CheckResult as ExperimentalCheckResult,
  type Result as ExperimentalResult,
} from '../services/experimentalToolsInstallerService';
import { CommandsetVersionService } from '../services/commandsetVersionService';

const fileService = new FileService();
const projectChecker = new ProjectChecker();
const experimentalToolsInstaller = new ExperimentalToolsInstallerService(getExperimentalTemplateDir());
const commonCommandsInstaller = new CommonCommandsInstallerService(getCommonCommandsTemplateDir());
const commandInstallerService = new CommandInstallerService(getTemplateDir());
const ccSddWorkflowInstaller = new CcSddWorkflowInstaller(getTemplateDir());
const bugWorkflowInstaller = new BugWorkflowInstaller(getTemplateDir());
const unifiedCommandsetInstaller = new UnifiedCommandsetInstaller(
  ccSddWorkflowInstaller,
  bugWorkflowInstaller,
  getTemplateDir()
);
const bugService = new BugService();
const commandsetVersionService = new CommandsetVersionService();

// SpecManagerService instance (lazily initialized with project path)
let specManagerService: SpecManagerService | null = null;
// SpecsWatcherService instance
let specsWatcherService: SpecsWatcherService | null = null;
// AgentRecordWatcherService instance
let agentRecordWatcherService: AgentRecordWatcherService | null = null;
// BugsWatcherService instance
let bugsWatcherService: BugsWatcherService | null = null;
// AutoExecutionCoordinator singleton instance
// Fixes: Critical Issue #2 (AutoExecutionCoordinatorのインスタンス管理不備)
let autoExecutionCoordinator: AutoExecutionCoordinator | null = null;
// Track if event callbacks have been set up to avoid duplicates
let eventCallbacksRegistered = false;
// Initial project path set from command line arguments
let initialProjectPath: string | null = null;
// Current project path
let currentProjectPath: string | null = null;

/**
 * Get current project path
 * Used by other modules that need access to the current project
 * @returns Current project path or null if not set
 */
export function getCurrentProjectPath(): string | null {
  return currentProjectPath;
}

/**
 * Convert AgentError to user-friendly error message
 */
function getErrorMessage(error: AgentError): string {
  const groupLabels: Record<ExecutionGroup, string> = {
    doc: 'ドキュメント生成',
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
 * Get AutoExecutionCoordinator singleton instance
 * Fixes: Critical Issue #2 (AutoExecutionCoordinatorのインスタンス管理不備)
 * Task 11.2: シングルトンインスタンスを提供
 */
export function getAutoExecutionCoordinator(): AutoExecutionCoordinator {
  if (!autoExecutionCoordinator) {
    autoExecutionCoordinator = new AutoExecutionCoordinator();
    logger.info('[handlers] AutoExecutionCoordinator created');
  }
  return autoExecutionCoordinator;
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
      specJsonMap: {},
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
        specJsonMap: {},
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

    // spec-metadata-ssot-refactor: Read specJsons for all specs to get phase/updatedAt
    // This avoids Renderer needing to make separate IPC calls for each spec
    const specJsonMap: Record<string, import('../../renderer/types').SpecJson> = {};
    for (const spec of specs) {
      try {
        const specJsonResult = await fileService.readSpecJson(spec.path);
        if (specJsonResult.ok) {
          specJsonMap[spec.name] = specJsonResult.value;
        }
      } catch (error) {
        // Skip specs with invalid spec.json - they'll use default 'initialized' phase
        logger.warn('[handlers] Failed to read specJson', { specName: spec.name, error });
      }
    }

    // Read bugs
    const bugsResult = await bugService.readBugs(projectPath);
    const bugs = bugsResult.ok ? bugsResult.value : [];

    // Update configStore
    const configStore = getConfigStore();
    configStore.addRecentProject(projectPath);

    logger.info('[handlers] selectProject completed successfully', {
      projectPath,
      specsCount: specs.length,
      specJsonMapCount: Object.keys(specJsonMap).length,
      bugsCount: bugs.length,
      kiroExists: kiroValidation.exists,
    });

    return {
      success: true,
      projectPath,
      kiroValidation,
      specs,
      bugs,
      specJsonMap,
    };
  } catch (error) {
    logger.error('[handlers] selectProject failed', { projectPath, error });
    return {
      success: false,
      projectPath,
      kiroValidation: { exists: false, hasSpecs: false, hasSteering: false },
      specs: [],
      bugs: [],
      specJsonMap: {},
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

  // Task 4.2: Switch project logger to new project
  // Requirements: 1.1, 1.2 (project-log-separation)
  projectLogger.setCurrentProject(projectPath);

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

  // Auto-install /commit command (required for deploy phase)
  // commit.md is installed automatically since it's a core command for the workflow
  try {
    const commitResult = await commonCommandsInstaller.installCommitCommand(projectPath);
    if (commitResult.ok) {
      if (commitResult.value.installedFiles.length > 0) {
        logger.info('[handlers] Commit command auto-installed', { files: commitResult.value.installedFiles });
      } else if (commitResult.value.skippedFiles.length > 0) {
        logger.debug('[handlers] Commit command already exists, skipped');
      }
    } else {
      logger.warn('[handlers] Failed to auto-install commit command', { error: commitResult.error });
    }
  } catch (error) {
    logger.warn('[handlers] Error during commit command auto-install', { error });
  }

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
  // spec-metadata-ssot-refactor: Read specJson for phase/updatedAt since SpecMetadata no longer has them
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
    // spec-metadata-ssot-refactor: Read specJson for each spec to get phase/updatedAt
    const specInfos: SpecInfo[] = [];
    for (const spec of result.value) {
      try {
        const specJsonResult = await fileService.readSpecJson(spec.path);
        if (specJsonResult.ok) {
          specInfos.push({
            id: spec.name,
            name: spec.name,
            feature_name: spec.name,
            phase: specJsonResult.value.phase,
            path: spec.path,
            updatedAt: specJsonResult.value.updated_at || '',
            approvals: specJsonResult.value.approvals,
          });
        } else {
          // Use default values if specJson cannot be read
          specInfos.push({
            id: spec.name,
            name: spec.name,
            feature_name: spec.name,
            phase: 'initialized',
            path: spec.path,
          });
        }
      } catch (error) {
        // Use default values on error
        specInfos.push({
          id: spec.name,
          name: spec.name,
          feature_name: spec.name,
          phase: 'initialized',
          path: spec.path,
        });
      }
    }
    return specInfos;
  };

  // Get bugs for remote access
  const getBugsForRemote = async (): Promise<BugInfo[] | null> => {
    const result = await bugService.readBugs(projectPath);
    if (!result.ok) {
      logger.error('[handlers] Failed to read bugs for remote access', { error: result.error });
      return null;
    }
    // BugMetadata and BugInfo have compatible structures
    return result.value.map(bug => ({
      name: bug.name,
      path: bug.path,
      phase: bug.phase,
      updatedAt: bug.updatedAt,
      reportedAt: bug.reportedAt,
    }));
  };

  // Get agents for remote access
  // Task 4.2 (agent-state-file-ssot): Updated to use async getAllAgents
  const getAgentsForRemote = async (): Promise<AgentStateInfo[] | null> => {
    if (!specManagerService) {
      logger.error('[handlers] SpecManagerService not initialized for remote access agents');
      return null;
    }
    const allAgentsMap = await specManagerService.getAllAgents();
    const agents: AgentStateInfo[] = [];
    for (const agentList of allAgentsMap.values()) {
      for (const agent of agentList) {
        agents.push({
          id: agent.agentId,
          status: agent.status,
          phase: agent.phase,
          specId: agent.specId,
          startedAt: agent.startedAt,
          lastActivityAt: agent.lastActivityAt,
        });
      }
    }
    return agents;
  };

  setupStateProvider(projectPath, getSpecsForRemote, getBugsForRemote, getAgentsForRemote);
  setupWorkflowController(specManagerService);
  setupAgentLogsProvider();
  logger.info('[handlers] Remote Access StateProvider, WorkflowController, and AgentLogsProvider set up');
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

  // spec-scoped-auto-execution-state: Update spec.json handler
  ipcMain.handle(
    IPC_CHANNELS.UPDATE_SPEC_JSON,
    async (_event, specPath: string, updates: Record<string, unknown>) => {
      const result = await fileService.updateSpecJson(specPath, updates);
      if (!result.ok) {
        throw new Error(`Failed to update spec.json: ${result.error.type}`);
      }
    }
  );

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

  // agent-watcher-optimization Task 4.1: Switch watch scope for specific spec/bug
  ipcMain.handle(IPC_CHANNELS.SWITCH_AGENT_WATCH_SCOPE, async (_event, scopeId: string | null) => {
    if (agentRecordWatcherService) {
      logger.info('[handlers] Switching agent watch scope', { scopeId });
      await agentRecordWatcherService.switchWatchScope(scopeId);
    } else {
      logger.warn('[handlers] Cannot switch scope: agent record watcher not running');
    }
  });

  // agent-watcher-optimization Task 2.2: Get running agent counts per spec
  // Requirements: 2.1 - Get running agent counts efficiently
  // agent-state-file-ssot: Now uses AgentRecordService (file-based SSOT)
  ipcMain.handle(IPC_CHANNELS.GET_RUNNING_AGENT_COUNTS, async () => {
    try {
      const recordService = getDefaultAgentRecordService();
      const countsMap = await recordService.getRunningAgentCounts();
      // Convert Map to Record for IPC serialization
      const result: Record<string, number> = {};
      for (const [specId, count] of countsMap) {
        result[specId] = count;
      }
      logger.debug('[handlers] GET_RUNNING_AGENT_COUNTS', { result });
      return result;
    } catch (error) {
      // AgentRecordService might not be initialized yet
      logger.warn('[handlers] GET_RUNNING_AGENT_COUNTS failed', { error });
      return {};
    }
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
      sessionId?: string,
      skipPermissions?: boolean
    ) => {
      // Replace 'claude' command with mock CLI command if configured (for E2E testing)
      const resolvedCommand = command === 'claude' ? getClaudeCommand() : command;
      logger.info('[handlers] START_AGENT called', { specId, phase, command: resolvedCommand, args, group, sessionId, skipPermissions });
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

        // Task 4.1 (agent-state-file-ssot): Updated to use async getAgentById
        service.onStatusChange(async (agentId, status) => {
          logger.info('[handlers] Agent status change', { agentId, status });
          if (!window.isDestroyed()) {
            window.webContents.send(IPC_CHANNELS.AGENT_STATUS_CHANGE, agentId, status);
          }

          // Broadcast status change to Remote UI via WebSocket
          // Include full agent info for remote-ui to display same content as Electron version
          const remoteServer = getRemoteAccessServer();
          const wsHandler = remoteServer.getWebSocketHandler();
          if (wsHandler) {
            const agentInfo = await service.getAgentById(agentId);
            wsHandler.broadcastAgentStatus(agentId, status, agentInfo ? {
              specId: agentInfo.specId,
              phase: agentInfo.phase,
              startedAt: agentInfo.startedAt,
              lastActivityAt: agentInfo.lastActivityAt,
            } : undefined);
          }
        });
      } else {
        logger.debug('[handlers] Event callbacks already registered or no window', { hasWindow: !!window, eventCallbacksRegistered });
      }

      logger.info('[handlers] Calling service.startAgent');
      const result = await service.startAgent({
        specId,
        phase,
        command: resolvedCommand,
        args,
        group,
        sessionId,
        skipPermissions,
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
    async (event, agentId: string, prompt?: string, skipPermissions?: boolean) => {
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered (may not be if no START_AGENT was called yet)
      if (window && !eventCallbacksRegistered) {
        registerEventCallbacks(service, window);
      }

      const result = await service.resumeAgent(agentId, prompt, skipPermissions);

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

  // Task 4.1 (agent-state-file-ssot): Update handler to use async getAgents
  ipcMain.handle(
    IPC_CHANNELS.GET_AGENTS,
    async (_event, specId: string) => {
      const service = getSpecManagerService();
      return await service.getAgents(specId);
    }
  );

  // Task 4.2 (agent-state-file-ssot): Update handler to use async getAllAgents
  ipcMain.handle(IPC_CHANNELS.GET_ALL_AGENTS, async () => {
    const service = getSpecManagerService();
    const agentsMap = await service.getAllAgents();

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

  // ============================================================
  // execute-method-unification: Task 4.2 - Unified EXECUTE handler
  // Requirements: 4.2
  // ============================================================
  ipcMain.handle(
    IPC_CHANNELS.EXECUTE,
    async (event, options: import('../../shared/types/executeOptions').ExecuteOptions) => {
      logger.info('[handlers] EXECUTE called', { type: options.type, specId: options.specId, featureName: options.featureName });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !eventCallbacksRegistered) {
        registerEventCallbacks(service, window);
      }

      const result = await service.execute(options);

      if (!result.ok) {
        logger.error('[handlers] execute failed', { type: options.type, error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[handlers] execute succeeded', { type: options.type, agentId: result.value.agentId });
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
      // Base flags (-p, --output-format stream-json, --verbose) are added by specManagerService
      const result = await service.startAgent({
        specId: '', // Empty specId for global agent
        phase: 'spec-init',
        command: 'claude',
        args: [`${slashCommand} "${description}"`], // Base flags added by service
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

  // ============================================================
  // Spec Plan - Launch spec-plan agent for interactive requirements generation
  // spec-plan-ui-integration feature
  // ============================================================
  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_SPEC_PLAN,
    async (event, projectPath: string, description: string, commandPrefix: CommandPrefix = 'kiro') => {
      logger.info('[handlers] EXECUTE_SPEC_PLAN called', { projectPath, description, commandPrefix });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !eventCallbacksRegistered) {
        registerEventCallbacks(service, window);
      }

      // Get the appropriate slash command based on commandPrefix
      // DD-002: spec-manager:plan is not yet implemented
      const slashCommand = SPEC_PLAN_COMMANDS[commandPrefix];
      if (!slashCommand) {
        throw new Error('spec-manager:plan is not yet implemented. Use kiro prefix.');
      }

      // Start agent with specId='' (global agent)
      // Base flags (-p, --output-format stream-json, --verbose) are added by specManagerService
      const result = await service.startAgent({
        specId: '', // Empty specId for global agent
        phase: 'spec-plan',
        command: 'claude',
        args: [`${slashCommand} "${description}"`], // Base flags added by service
        group: 'doc',
      });

      if (!result.ok) {
        logger.error('[handlers] executeSpecPlan failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[handlers] executeSpecPlan succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  // Bug Create: Launch bug-create agent with description only
  // specId='' for global agent, command: claude -p /kiro:bug-create "{description}"
  // Returns agentId immediately without waiting for completion
  // Bug name is generated by Claude based on description (following bug-create.md spec)
  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_BUG_CREATE,
    async (event, projectPath: string, description: string) => {
      logger.info('[handlers] EXECUTE_BUG_CREATE called', { projectPath, description });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !eventCallbacksRegistered) {
        registerEventCallbacks(service, window);
      }

      // Start agent with specId='' (global agent)
      // Note: Bug name is auto-generated by Claude from description per bug-create.md spec
      // Base flags (-p, --output-format stream-json, --verbose) are added by specManagerService
      const result = await service.startAgent({
        specId: '', // Empty specId for global agent
        phase: 'bug-create',
        command: 'claude',
        args: [`/kiro:bug-create "${description}"`], // Base flags added by service
        group: 'doc',
      });

      if (!result.ok) {
        logger.error('[handlers] executeBugCreate failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[handlers] executeBugCreate succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  // ============================================================
  // Ask Agent Execution (agent-ask-execution feature)
  // Requirements: 2.5, 3.1-3.4, 4.1-4.5, 5.1-5.6
  // ============================================================

  // Execute Project Ask: Launch project-ask agent with prompt
  // Loads steering files as context
  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_ASK_PROJECT,
    async (event, projectPath: string, prompt: string, commandPrefix: CommandPrefix = 'kiro') => {
      logger.info('[handlers] EXECUTE_ASK_PROJECT called', { projectPath, prompt: prompt.substring(0, 100), commandPrefix });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !eventCallbacksRegistered) {
        registerEventCallbacks(service, window);
      }

      // Start agent with specId='' (project agent)
      // Uses /kiro:project-ask or equivalent command
      const slashCommand = `/${commandPrefix}:project-ask`;
      const result = await service.startAgent({
        specId: '', // Empty specId for project agent
        phase: 'ask',
        command: 'claude',
        args: [`${slashCommand} "${prompt.replace(/"/g, '\\"')}"`],
        group: 'doc',
      });

      if (!result.ok) {
        logger.error('[handlers] executeAskProject failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[handlers] executeAskProject succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  // Execute Spec Ask: Launch spec-ask agent with feature name and prompt
  // Loads steering files and spec files as context
  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_ASK_SPEC,
    async (event, specId: string, featureName: string, prompt: string, commandPrefix: CommandPrefix = 'kiro') => {
      logger.info('[handlers] EXECUTE_ASK_SPEC called', { specId, featureName, prompt: prompt.substring(0, 100), commandPrefix });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !eventCallbacksRegistered) {
        registerEventCallbacks(service, window);
      }

      // Start agent with specId (spec agent)
      // Uses /kiro:spec-ask or equivalent command
      const slashCommand = `/${commandPrefix}:spec-ask`;
      const result = await service.startAgent({
        specId,
        phase: 'ask',
        command: 'claude',
        args: [`${slashCommand} "${featureName}" "${prompt.replace(/"/g, '\\"')}"`],
        group: 'doc',
      });

      if (!result.ok) {
        logger.error('[handlers] executeAskSpec failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[handlers] executeAskSpec succeeded', { agentId: result.value.agentId });
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
    async (_event, specPath: string, completedPhase: 'impl' | 'impl-complete', options?: { skipTimestamp?: boolean }) => {
      logger.info('[handlers] SYNC_SPEC_PHASE called', { specPath, completedPhase, options });
      const result = await fileService.updateSpecJsonFromPhase(specPath, completedPhase, options);
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

  // execute-method-unification: Delegate to unified execute method
  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_DOCUMENT_REVIEW,
    async (event, specId: string, featureName: string, commandPrefix?: 'kiro' | 'spec-manager') => {
      logger.info('[handlers] EXECUTE_DOCUMENT_REVIEW called (delegating to execute)', { specId, featureName, commandPrefix });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !eventCallbacksRegistered) {
        registerEventCallbacks(service, window);
      }

      const result = await service.execute({ type: 'document-review', specId, featureName, commandPrefix });

      if (!result.ok) {
        logger.error('[handlers] execute failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[handlers] execute succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_DOCUMENT_REVIEW_REPLY,
    async (event, specId: string, featureName: string, reviewNumber: number, commandPrefix?: 'kiro' | 'spec-manager', autofix?: boolean) => {
      logger.info('[handlers] EXECUTE_DOCUMENT_REVIEW_REPLY called (delegating to execute)', { specId, featureName, reviewNumber, commandPrefix, autofix });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !eventCallbacksRegistered) {
        registerEventCallbacks(service, window);
      }

      const result = await service.execute({ type: 'document-review-reply', specId, featureName, reviewNumber, commandPrefix, autofix });

      if (!result.ok) {
        logger.error('[handlers] execute failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[handlers] execute succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_DOCUMENT_REVIEW_FIX,
    async (event, specId: string, featureName: string, reviewNumber: number, commandPrefix?: 'kiro' | 'spec-manager') => {
      logger.info('[handlers] EXECUTE_DOCUMENT_REVIEW_FIX called (delegating to execute)', { specId, featureName, reviewNumber, commandPrefix });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !eventCallbacksRegistered) {
        registerEventCallbacks(service, window);
      }

      const result = await service.execute({ type: 'document-review-fix', specId, featureName, reviewNumber, commandPrefix });

      if (!result.ok) {
        logger.error('[handlers] execute failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[handlers] execute succeeded', { agentId: result.value.agentId });
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
  // Skip Permissions Config (bug fix: persist-skip-permission-per-project)
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.LOAD_SKIP_PERMISSIONS,
    async (_event, projectPath: string): Promise<boolean> => {
      logger.debug('[handlers] LOAD_SKIP_PERMISSIONS called', { projectPath });
      return layoutConfigService.loadSkipPermissions(projectPath);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.SAVE_SKIP_PERMISSIONS,
    async (_event, projectPath: string, skipPermissions: boolean): Promise<void> => {
      logger.debug('[handlers] SAVE_SKIP_PERMISSIONS called', { projectPath, skipPermissions });
      return layoutConfigService.saveSkipPermissions(projectPath, skipPermissions);
    }
  );

  // ============================================================
  // Project Defaults Config (debatex-document-review Task 3.3)
  // Requirements: 4.1
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.LOAD_PROJECT_DEFAULTS,
    async (_event, projectPath: string): Promise<import('../services/layoutConfigService').ProjectDefaults | undefined> => {
      logger.debug('[handlers] LOAD_PROJECT_DEFAULTS called', { projectPath });
      return layoutConfigService.loadProjectDefaults(projectPath);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.SAVE_PROJECT_DEFAULTS,
    async (_event, projectPath: string, defaults: import('../services/layoutConfigService').ProjectDefaults): Promise<void> => {
      logger.debug('[handlers] SAVE_PROJECT_DEFAULTS called', { projectPath, defaults });
      return layoutConfigService.saveProjectDefaults(projectPath, defaults);
    }
  );

  // ============================================================
  // Profile Badge (header-profile-badge feature)
  // Requirements: 1.1, 1.2, 1.3
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.LOAD_PROFILE,
    async (_event, projectPath: string): Promise<import('../services/layoutConfigService').ProfileConfig | null> => {
      logger.debug('[handlers] LOAD_PROFILE called', { projectPath });
      return layoutConfigService.loadProfile(projectPath);
    }
  );

  // ============================================================
  // Experimental Tools Install (experimental-tools-installer feature)
  // Requirements: 2.1-2.4, 3.1-3.6, 4.1-4.4, 7.1-7.4
  // ============================================================

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
    IPC_CHANNELS.CHECK_EXPERIMENTAL_TOOL_EXISTS,
    async (
      _event,
      projectPath: string,
      toolType: 'debug'
    ): Promise<ExperimentalCheckResult> => {
      logger.info('[handlers] CHECK_EXPERIMENTAL_TOOL_EXISTS called', { projectPath, toolType });
      return experimentalToolsInstaller.checkTargetExists(projectPath, toolType);
    }
  );

  // ============================================================
  // gemini-document-review Task 3.2: Gemini Document Review Install
  // Requirements: 1.2, 1.3, 1.4, 1.5, 1.6
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.INSTALL_EXPERIMENTAL_GEMINI_DOC_REVIEW,
    async (
      _event,
      projectPath: string,
      options?: ExperimentalInstallOptions
    ): Promise<ExperimentalResult<ExperimentalInstallResult, ExperimentalInstallError>> => {
      logger.info('[handlers] INSTALL_EXPERIMENTAL_GEMINI_DOC_REVIEW called', { projectPath, options });
      return experimentalToolsInstaller.installGeminiDocumentReview(projectPath, options);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.CHECK_EXPERIMENTAL_GEMINI_DOC_REVIEW_EXISTS,
    async (
      _event,
      projectPath: string
    ): Promise<ExperimentalCheckResult> => {
      logger.info('[handlers] CHECK_EXPERIMENTAL_GEMINI_DOC_REVIEW_EXISTS called', { projectPath });
      return experimentalToolsInstaller.checkGeminiDocumentReviewExists(projectPath);
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

  // E2E Test Mode Handler
  ipcMain.handle(IPC_CHANNELS.GET_IS_E2E_TEST, () => {
    return process.argv.includes('--e2e-test');
  });

  // ============================================================
  // Project Log (project-log-separation feature)
  // Requirements: 6.1, 6.2, 6.3
  // ============================================================

  /**
   * Get project log path
   * Task 3.1: Returns the project log path or null if no project is selected
   */
  ipcMain.handle(IPC_CHANNELS.GET_PROJECT_LOG_PATH, async () => {
    logger.debug('[handlers] GET_PROJECT_LOG_PATH called');
    return projectLogger.getProjectLogPath();
  });

  /**
   * Open log directory in system file browser
   * Task 3.2: Opens the log directory using shell.openPath
   */
  ipcMain.handle(IPC_CHANNELS.OPEN_LOG_IN_BROWSER, async () => {
    logger.info('[handlers] OPEN_LOG_IN_BROWSER called');
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
      logger.error('[handlers] OPEN_LOG_IN_BROWSER failed', { logDir, error });
      throw error instanceof Error ? error : new Error('Failed to open log directory');
    }
  });

  // ============================================================
  // Inspection Workflow (inspection-workflow-ui feature)
  // Requirements: 4.2, 4.3, 4.5
  // ============================================================

  // execute-method-unification: Delegate to unified execute method
  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_INSPECTION,
    async (event, specId: string, featureName: string, commandPrefix?: 'kiro' | 'spec-manager') => {
      logger.info('[handlers] EXECUTE_INSPECTION called (delegating to execute)', { specId, featureName, commandPrefix });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !eventCallbacksRegistered) {
        registerEventCallbacks(service, window);
      }

      const result = await service.execute({ type: 'inspection', specId, featureName, commandPrefix });

      if (!result.ok) {
        logger.error('[handlers] execute failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[handlers] execute succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_INSPECTION_FIX,
    async (event, specId: string, featureName: string, roundNumber: number, commandPrefix?: 'kiro' | 'spec-manager') => {
      logger.info('[handlers] EXECUTE_INSPECTION_FIX called (delegating to execute)', { specId, featureName, roundNumber, commandPrefix });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !eventCallbacksRegistered) {
        registerEventCallbacks(service, window);
      }

      const result = await service.execute({ type: 'inspection-fix', specId, featureName, roundNumber, commandPrefix });

      if (!result.ok) {
        logger.error('[handlers] execute failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[handlers] execute succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.SET_INSPECTION_AUTO_EXECUTION_FLAG,
    async (_event, specPath: string, flag: 'run' | 'pause') => {
      logger.info('[handlers] SET_INSPECTION_AUTO_EXECUTION_FLAG called', { specPath, flag });
      const service = getSpecManagerService();
      await service.setInspectionAutoExecutionFlag(specPath, flag);
      logger.info('[handlers] setInspectionAutoExecutionFlag succeeded', { specPath, flag });
    }
  );

  // ============================================================
  // Spec Merge Execution (git-worktree-support feature)
  // Requirements: 5.1, 5.2
  // ============================================================

  // execute-method-unification: Delegate to unified execute method
  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_SPEC_MERGE,
    async (event, specId: string, featureName: string, commandPrefix?: 'kiro' | 'spec-manager') => {
      logger.info('[handlers] EXECUTE_SPEC_MERGE called (delegating to execute)', { specId, featureName, commandPrefix });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !eventCallbacksRegistered) {
        registerEventCallbacks(service, window);
      }

      const result = await service.execute({ type: 'spec-merge', specId, featureName, commandPrefix });

      if (!result.ok) {
        logger.error('[handlers] execute failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[handlers] execute succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  // ============================================================
  // Commandset Version Check (commandset-version-detection feature)
  // Requirements: 2.1
  // ============================================================
  ipcMain.handle(
    IPC_CHANNELS.CHECK_COMMANDSET_VERSIONS,
    async (_event, projectPath: string) => {
      logger.info('[handlers] CHECK_COMMANDSET_VERSIONS called', { projectPath });
      const result = await commandsetVersionService.checkVersions(projectPath);
      logger.info('[handlers] checkCommandsetVersions succeeded', {
        anyUpdateRequired: result.anyUpdateRequired,
        hasCommandsets: result.hasCommandsets,
      });
      return result;
    }
  );

  // ============================================================
  // Renderer Logging (renderer-error-logging feature)
  // Fire-and-forget logging from renderer to main process
  // ============================================================
  ipcMain.on(
    IPC_CHANNELS.LOG_RENDERER,
    (_event, level: 'error' | 'warn' | 'info' | 'debug', message: string, context?: unknown) => {
      projectLogger.logFromRenderer(level, message, context);
    }
  );

  // ============================================================
  // Cloudflare Tunnel Handlers (cloudflare-tunnel-integration feature)
  // ============================================================
  registerCloudflareHandlers();
  logger.info('[handlers] Cloudflare handlers registered');

  // ============================================================
  // Auto Execution Handlers (Inspection Fix Task 11.1)
  // Fixes: Critical Issue #1 (registerAutoExecutionHandlersの未呼び出し)
  // Fixes: Critical Issue #3 (Renderer -> IPC -> Main通信の未接続)
  // Fixes: Critical Issue #4 (Dead Code: autoExecutionHandlers.ts)
  // ============================================================
  const coordinator = getAutoExecutionCoordinator();
  registerAutoExecutionHandlers(coordinator);
  logger.info('[handlers] Auto Execution handlers registered');

  // ============================================================
  // Bug Auto Execution Handlers (bug fix: auto-execution-ui-state-dependency)
  // Main Process側でBug自動実行の状態を管理
  // ============================================================
  const bugCoordinator = getBugAutoExecutionCoordinator();
  registerBugAutoExecutionHandlers(bugCoordinator);
  logger.info('[handlers] Bug Auto Execution handlers registered');

  // ============================================================
  // Steering Verification Handlers (steering-verification-integration feature)
  // Requirements: 3.1, 3.2, 3.3
  // ============================================================
  ipcMain.handle(
    IPC_CHANNELS.CHECK_STEERING_FILES,
    async (_event, projectPath: string) => {
      try {
        const verificationMdPath = path.join(projectPath, '.kiro', 'steering', 'verification.md');
        const exists = await stat(verificationMdPath).then(() => true).catch(() => false);
        return { verificationMdExists: exists };
      } catch (error) {
        logger.error('[handlers] Failed to check steering files', { projectPath, error });
        return { verificationMdExists: false };
      }
    }
  );

  // GENERATE_VERIFICATION_MD: Launch steering-verification agent
  // Task 6.2: executeProjectAgent を使用してエージェント起動
  // Requirements: 3.4 (ボタンクリックでエージェント起動)
  ipcMain.handle(
    IPC_CHANNELS.GENERATE_VERIFICATION_MD,
    async (event, projectPath: string) => {
      logger.info('[handlers] GENERATE_VERIFICATION_MD called', { projectPath });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !eventCallbacksRegistered) {
        registerEventCallbacks(service, window);
      }

      // Start agent with specId='' (project agent)
      // Uses /kiro:steering-verification command
      const slashCommand = '/kiro:steering-verification';
      const result = await service.startAgent({
        specId: '', // Empty specId for project agent
        phase: 'steering-verification',
        command: 'claude',
        args: [slashCommand],
        group: 'doc',
      });

      if (!result.ok) {
        logger.error('[handlers] generateVerificationMd failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[handlers] generateVerificationMd succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );
  logger.info('[handlers] Steering Verification handlers registered');

  // ============================================================
  // Multi-Phase Auto-Execution: connect coordinator to specManagerService
  // When coordinator emits 'execute-next-phase', execute the phase via specManagerService
  // ============================================================
  coordinator.on('execute-next-phase', async (specPath: string, phase: WorkflowPhase, context: { specId: string; featureName: string }) => {
    logger.info('[handlers] execute-next-phase event received', { specPath, phase, context });

    try {
      const service = getSpecManagerService();
      const window = BrowserWindow.getAllWindows()[0];

      if (!window) {
        logger.error('[handlers] No window available for execute-next-phase');
        return;
      }

      // Set current phase in coordinator before execution
      coordinator.setCurrentPhase(specPath, phase);

      // Execute the phase (execute-method-unification: using unified execute)
      const result = await service.execute({
        type: phase,
        specId: context.specId,
        featureName: context.featureName,
        commandPrefix: 'kiro', // Use kiro prefix by default for auto-execution
      } as import('../../shared/types/executeOptions').ExecuteOptions);

      if (result.ok) {
        const agentId = result.value.agentId;
        logger.info('[handlers] execute-next-phase: phase started successfully', { specPath, phase, agentId });

        // Update coordinator with agent ID
        coordinator.setCurrentPhase(specPath, phase, agentId);

        // Listen for this agent's completion
        const handleStatusChange = async (changedAgentId: string, status: string) => {
          if (changedAgentId === agentId) {
            if (status === 'completed' || status === 'failed' || status === 'stopped') {
              logger.info('[handlers] execute-next-phase: agent completed', { agentId, status });

              // Auto-approve phase on successful completion
              if (status === 'completed' && (phase === 'requirements' || phase === 'design' || phase === 'tasks')) {
                try {
                  const approveResult = await fileService.updateApproval(specPath, phase, true);
                  if (approveResult.ok) {
                    logger.info('[handlers] execute-next-phase: auto-approved phase', { specPath, phase });
                  } else {
                    logger.error('[handlers] execute-next-phase: failed to auto-approve phase', { specPath, phase, error: approveResult.error });
                  }
                } catch (error) {
                  logger.error('[handlers] execute-next-phase: error during auto-approve', { specPath, phase, error });
                }
              }

              const finalStatus = status === 'completed' ? 'completed' : (status === 'stopped' ? 'interrupted' : 'failed');
              coordinator.handleAgentCompleted(agentId, specPath, finalStatus as 'completed' | 'failed' | 'interrupted');
              service.offStatusChange(handleStatusChange);
            }
          }
        };
        service.onStatusChange(handleStatusChange);
      } else {
        logger.error('[handlers] execute-next-phase: phase execution failed', { specPath, phase, error: result.error });
        coordinator.handleAgentCompleted('', specPath, 'failed');
      }
    } catch (error) {
      logger.error('[handlers] execute-next-phase: unexpected error', { specPath, phase, error });
      coordinator.handleAgentCompleted('', specPath, 'failed');
    }
  });

  // ============================================================
  // Document Review Auto-Execution: execute document-review workflow
  // When coordinator emits 'execute-document-review', execute the document review via specManagerService
  // gemini-document-review Task 8: Added scheme support for auto execution
  // Requirements: 8.1, 8.2, 8.3
  // ============================================================
  coordinator.on('execute-document-review', async (specPath: string, context: { specId: string }) => {
    logger.info('[handlers] execute-document-review event received', { specPath, context });

    try {
      const service = getSpecManagerService();
      const window = BrowserWindow.getAllWindows()[0];

      if (!window) {
        logger.error('[handlers] No window available for execute-document-review');
        coordinator.handleDocumentReviewCompleted(specPath, false);
        return;
      }

      // gemini-document-review Task 8: Read scheme from spec.json
      // Requirements: 8.1 - Respect scheme setting during auto execution
      let scheme: import('../../shared/registry/reviewEngineRegistry').ReviewerScheme | undefined;
      try {
        const specJsonPath = join(specPath, 'spec.json');
        const specJsonContent = await access(specJsonPath).then(
          () => import('fs/promises').then(fs => fs.readFile(specJsonPath, 'utf-8')),
          () => null
        );
        if (specJsonContent) {
          const specJson = JSON.parse(specJsonContent);
          scheme = specJson.documentReview?.scheme;
          logger.debug('[handlers] execute-document-review: scheme loaded from spec.json', { specPath, scheme });
        }
      } catch (error) {
        logger.warn('[handlers] execute-document-review: failed to read scheme from spec.json', { specPath, error });
        // Continue with default scheme (claude-code)
      }

      // Execute document-review with scheme (execute-method-unification: using unified execute)
      const reviewResult = await service.execute({
        type: 'document-review',
        specId: context.specId,
        featureName: context.specId,
        commandPrefix: 'kiro',
        scheme,
      });

      if (!reviewResult.ok) {
        logger.error('[handlers] execute-document-review: document-review failed', { error: reviewResult.error });
        coordinator.handleDocumentReviewCompleted(specPath, false);
        return;
      }

      const reviewAgentId = reviewResult.value.agentId;
      logger.info('[handlers] execute-document-review: document-review started', { reviewAgentId });

      // Listen for document-review agent completion
      const handleReviewStatusChange = async (changedAgentId: string, status: string) => {
        if (changedAgentId === reviewAgentId) {
          if (status === 'completed') {
            logger.info('[handlers] execute-document-review: document-review completed', { reviewAgentId });
            service.offStatusChange(handleReviewStatusChange);

            // Execute document-review-reply with autofix=true
            await executeDocumentReviewReply(service, specPath, context.specId, coordinator);
          } else if (status === 'failed' || status === 'stopped') {
            logger.error('[handlers] execute-document-review: document-review failed/stopped', { reviewAgentId, status });
            service.offStatusChange(handleReviewStatusChange);
            coordinator.handleDocumentReviewCompleted(specPath, false);
          }
        }
      };
      service.onStatusChange(handleReviewStatusChange);
    } catch (error) {
      logger.error('[handlers] execute-document-review: unexpected error', { specPath, error });
      coordinator.handleDocumentReviewCompleted(specPath, false);
    }
  });

  logger.info('[handlers] Multi-phase auto-execution connected');
}

/**
 * Execute document-review-reply and handle the result
 * Implements automatic document-review loop (up to MAX_DOCUMENT_REVIEW_ROUNDS rounds)
 *
 * Loop logic:
 * - If Fix Required > 0 AND rounds < MAX_DOCUMENT_REVIEW_ROUNDS: continue loop (run document-review again)
 * - If Fix Required = 0 AND Needs Discussion = 0: approved, proceed to next phase
 * - If Needs Discussion > 0 OR rounds >= MAX_DOCUMENT_REVIEW_ROUNDS: pause for human review
 */
async function executeDocumentReviewReply(
  service: SpecManagerService,
  specPath: string,
  specId: string,
  coordinator: AutoExecutionCoordinator
): Promise<void> {
  try {
    // Get current round number from spec.json
    const { DocumentReviewService } = await import('../services/documentReviewService');
    const docReviewService = new DocumentReviewService(currentProjectPath || '');
    const roundNumber = await docReviewService.getNextRoundNumber(specPath);
    const currentRound = Math.max(1, roundNumber - 1); // getNextRoundNumber returns next round, we want current

    logger.info('[handlers] executeDocumentReviewReply: starting', { specPath, currentRound, maxRounds: MAX_DOCUMENT_REVIEW_ROUNDS });

    // execute-method-unification: using unified execute
    const replyResult = await service.execute({
      type: 'document-review-reply',
      specId,
      featureName: specId,
      reviewNumber: currentRound,
      commandPrefix: 'kiro',
      autofix: true,
    });

    if (!replyResult.ok) {
      logger.error('[handlers] executeDocumentReviewReply: failed', { error: replyResult.error });
      coordinator.handleDocumentReviewCompleted(specPath, false);
      return;
    }

    const replyAgentId = replyResult.value.agentId;
    logger.info('[handlers] executeDocumentReviewReply: started', { replyAgentId });

    // Listen for document-review-reply agent completion
    const handleReplyStatusChange = async (changedAgentId: string, status: string) => {
      if (changedAgentId === replyAgentId) {
        if (status === 'completed') {
          logger.info('[handlers] executeDocumentReviewReply: completed', { replyAgentId });
          service.offStatusChange(handleReplyStatusChange);

          // Check spec.json documentReview status and roundDetails
          // SSOT: The prompt sets documentReview.status = 'approved' when fixRequired = 0 AND needsDiscussion = 0
          const specJsonResult = await docReviewService.readSpecJson(specPath);

          if (!specJsonResult.ok) {
            logger.error('[handlers] executeDocumentReviewReply: failed to read spec.json', { error: specJsonResult.error });
            coordinator.handleDocumentReviewCompleted(specPath, false);
            return;
          }

          const specJson = specJsonResult.value;
          const documentReview = specJson.documentReview;
          const isApproved = documentReview?.status === 'approved';

          // Get fixStatus from the latest roundDetails (fix-status-field-migration Task 4.1)
          // fixStatus values: 'not_required' | 'pending' | 'applied'
          const roundDetails = documentReview?.roundDetails || [];
          const latestRound = roundDetails[roundDetails.length - 1];
          const fixStatus = latestRound?.fixStatus;
          const fixRequired = latestRound?.fixRequired ?? 0;
          const needsDiscussion = latestRound?.needsDiscussion ?? 0;
          const currentRoundNumber = roundDetails.length;

          logger.info('[handlers] executeDocumentReviewReply: analyzing result', {
            isApproved,
            fixStatus,
            fixRequired,
            needsDiscussion,
            currentRoundNumber,
            maxRounds: MAX_DOCUMENT_REVIEW_ROUNDS,
          });

          // fixStatus-based decision logic (fix-status-field-migration Task 4.1)
          // Priority: isApproved check first (backward compat), then fixStatus
          if (isApproved) {
            // Document review approved (prompt sets this when fixStatus = 'not_required')
            logger.info('[handlers] executeDocumentReviewReply: documentReview.status is approved');
            coordinator.handleDocumentReviewCompleted(specPath, true);
          } else if (fixStatus === 'not_required') {
            // fixStatus: not_required -> approved flow
            logger.info('[handlers] executeDocumentReviewReply: fixStatus is not_required, approving');
            coordinator.handleDocumentReviewCompleted(specPath, true);
          } else if (fixStatus === 'pending') {
            // fixStatus: pending -> pause for human review (fix or discussion needed)
            logger.info('[handlers] executeDocumentReviewReply: fixStatus is pending, pausing for human review', { fixRequired, needsDiscussion });
            coordinator.handleDocumentReviewCompleted(specPath, false);
          } else if (fixStatus === 'applied' && currentRoundNumber < MAX_DOCUMENT_REVIEW_ROUNDS) {
            // fixStatus: applied AND under max rounds -> continue the loop
            const nextRound = currentRoundNumber + 1;
            logger.info('[handlers] executeDocumentReviewReply: fixStatus is applied, continuing loop', { nextRound });
            coordinator.continueDocumentReviewLoop(specPath, nextRound);
          } else if (fixStatus === 'applied') {
            // fixStatus: applied but max rounds reached -> pause for human review
            logger.info('[handlers] executeDocumentReviewReply: fixStatus is applied but max rounds reached, pausing', {
              currentRoundNumber,
              maxRounds: MAX_DOCUMENT_REVIEW_ROUNDS,
            });
            coordinator.handleDocumentReviewCompleted(specPath, false);
          } else {
            // Fallback for undefined fixStatus: use legacy logic (handled by normalizeRoundDetail during sync)
            // This branch handles old data that hasn't been normalized yet
            logger.info('[handlers] executeDocumentReviewReply: fixStatus undefined, using fallback', {
              fixRequired,
              needsDiscussion,
              currentRoundNumber,
            });
            if (fixRequired === 0 && needsDiscussion === 0) {
              coordinator.handleDocumentReviewCompleted(specPath, true);
            } else if (needsDiscussion > 0) {
              coordinator.handleDocumentReviewCompleted(specPath, false);
            } else if (fixRequired > 0 && currentRoundNumber < MAX_DOCUMENT_REVIEW_ROUNDS) {
              coordinator.continueDocumentReviewLoop(specPath, currentRoundNumber + 1);
            } else {
              coordinator.handleDocumentReviewCompleted(specPath, false);
            }
          }
        } else if (status === 'failed' || status === 'stopped') {
          logger.error('[handlers] executeDocumentReviewReply: failed/stopped', { replyAgentId, status });
          service.offStatusChange(handleReplyStatusChange);
          coordinator.handleDocumentReviewCompleted(specPath, false);
        }
      }
    };
    service.onStatusChange(handleReplyStatusChange);
  } catch (error) {
    logger.error('[handlers] executeDocumentReviewReply: unexpected error', { specPath, error });
    coordinator.handleDocumentReviewCompleted(specPath, false);
  }
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

  // Task 4.1 (agent-state-file-ssot): Updated to use async getAgentById
  service.onStatusChange(async (agentId, status) => {
    logger.info('[handlers] Agent status change', { agentId, status });
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.AGENT_STATUS_CHANGE, agentId, status);
    }

    // Broadcast status change to Remote UI via WebSocket
    // Include full agent info for remote-ui to display same content as Electron version
    const remoteServer = getRemoteAccessServer();
    const wsHandler = remoteServer.getWebSocketHandler();
    if (wsHandler) {
      const agentInfo = await service.getAgentById(agentId);
      wsHandler.broadcastAgentStatus(agentId, status, agentInfo ? {
        specId: agentInfo.specId,
        phase: agentInfo.phase,
        startedAt: agentInfo.startedAt,
        lastActivityAt: agentInfo.lastActivityAt,
      } : undefined);
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

  specsWatcherService = new SpecsWatcherService(currentProjectPath, fileService);

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

  // Bug fix: spec-agent-list-not-updating-on-auto-execution
  // Simplified to match specsWatcherService/bugsWatcherService pattern:
  // Only send event info (type, specId, agentId), let renderer fetch full data via loadAgents()
  // This avoids file read timing issues that caused silent failures when record was undefined
  agentRecordWatcherService.onChange((event) => {
    logger.debug('[handlers] Agent record changed', { type: event.type, specId: event.specId, agentId: event.agentId });
    if (!window.isDestroyed()) {
      // Always send event info - renderer will fetch full data if needed
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
