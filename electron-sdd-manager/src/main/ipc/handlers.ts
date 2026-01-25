/**
 * IPC Handlers Orchestrator
 * Task 8.1: handlers.ts をオーケストレーターとして最終整理
 * Requirements: 3.1, 3.2, 3.3
 *
 * This file serves as the central orchestrator for all IPC handlers.
 * Responsibilities:
 * - Service instance creation and DI management
 * - Global state management (currentProjectPath, specManagerService, etc.)
 * - Calling all domain handler register functions
 */

import { ipcMain, BrowserWindow } from 'electron';
import * as path from 'path';
import { access, stat } from 'fs/promises';
import { join } from 'path';

// IPC Channels
import { IPC_CHANNELS } from './channels';

// Services
import { FileService } from '../services/fileService';
import { getConfigStore } from '../services/configStore';
import { setMenuProjectPath, updateWindowTitle } from '../menu';
import { SpecManagerService, ExecutionGroup, WorkflowPhase, AgentError } from '../services/specManagerService';
import { logger } from '../services/logger';
import { projectLogger } from '../services/projectLogger';
import { ProjectChecker } from '../services/projectChecker';
import { CommandInstallerService, getTemplateDir } from '../services/commandInstallerService';
import { initDefaultLogFileService } from '../services/logFileService';
import { getCliInstallStatus, installCliCommand, getManualInstallInstructions } from '../services/cliInstallerService';
import { BugService } from '../services/bugService';
import { CcSddWorkflowInstaller } from '../services/ccSddWorkflowInstaller';
import { BugWorkflowInstaller } from '../services/bugWorkflowInstaller';
import { UnifiedCommandsetInstaller } from '../services/unifiedCommandsetInstaller';
import { layoutConfigService } from '../services/layoutConfigService';
import { ExperimentalToolsInstallerService, getExperimentalTemplateDir } from '../services/experimentalToolsInstallerService';
import { CommandsetVersionService } from '../services/commandsetVersionService';
import { initDefaultMetricsService } from '../services/metricsService';
import { AutoExecutionCoordinator, MAX_DOCUMENT_REVIEW_ROUNDS } from '../services/autoExecutionCoordinator';
import { getBugAutoExecutionCoordinator } from '../services/bugAutoExecutionCoordinator';

// Remote Access
import { setupStateProvider, setupWorkflowController, setupAgentLogsProvider, setupSpecDetailProvider, setupBugDetailProvider, setupFileService, getRemoteAccessServer } from './remoteAccessHandlers';

// Domain Handlers
import { registerAutoExecutionHandlers } from './autoExecutionHandlers';
import { registerBugAutoExecutionHandlers } from './bugAutoExecutionHandlers';
import { registerMetricsHandlers } from './metricsHandlers';
import { registerMcpHandlers } from './mcpHandlers';
import { registerScheduleTaskHandlers, initScheduleTaskCoordinator } from './scheduleTaskHandlers';
import { registerCloudflareHandlers } from './cloudflareHandlers';
import { registerConfigHandlers } from './configHandlers';
import { registerInstallHandlers } from './installHandlers';
import { registerFileHandlers } from './fileHandlers';
import { registerBugHandlers, startBugsWatcher as startBugsWatcherImpl, stopBugsWatcher as stopBugsWatcherImpl } from './bugHandlers';
import { registerAgentHandlers, startAgentRecordWatcher, stopAgentRecordWatcher } from './agentHandlers';
import { registerProjectHandlers, validateProjectPath as validateProjectPathImpl, isProjectSelectionInProgress as isProjectSelectionInProgressImpl, setProjectSelectionLock as setProjectSelectionLockImpl, resetProjectSelectionLock as resetProjectSelectionLockImpl } from './projectHandlers';
import { registerSpecHandlers, startSpecsWatcher as startSpecsWatcherImpl, stopSpecsWatcher as stopSpecsWatcherImpl } from './specHandlers';

// Types
import type { SelectProjectResult } from '../../renderer/types';
import type { BugWorkflowPhase } from '../../renderer/types/bug';
import type { SpecInfo, BugInfo, AgentStateInfo } from '../services/webSocketHandler';

// ============================================================
// Service Instances (DI)
// ============================================================
const fileService = new FileService();
const projectChecker = new ProjectChecker();
const experimentalToolsInstaller = new ExperimentalToolsInstallerService(getExperimentalTemplateDir());
const commandInstallerService = new CommandInstallerService(getTemplateDir());
const ccSddWorkflowInstaller = new CcSddWorkflowInstaller(getTemplateDir());
const bugWorkflowInstaller = new BugWorkflowInstaller(getTemplateDir());
const unifiedCommandsetInstaller = new UnifiedCommandsetInstaller(ccSddWorkflowInstaller, bugWorkflowInstaller, getTemplateDir());
const bugService = new BugService();
const commandsetVersionService = new CommandsetVersionService();

// ============================================================
// Global State
// ============================================================
let specManagerService: SpecManagerService | null = null;
let autoExecutionCoordinator: AutoExecutionCoordinator | null = null;
let eventCallbacksRegistered = false;
let initialProjectPath: string | null = null;
let currentProjectPath: string | null = null;

// ============================================================
// Public Functions
// ============================================================

export function getCurrentProjectPath(): string | null {
  return currentProjectPath;
}

export function getAutoExecutionCoordinator(): AutoExecutionCoordinator {
  if (!autoExecutionCoordinator) {
    autoExecutionCoordinator = new AutoExecutionCoordinator();
    logger.info('[handlers] AutoExecutionCoordinator created');
  }
  return autoExecutionCoordinator;
}

export function getBugAgentEffectiveCwd(phase: BugWorkflowPhase, worktreeCwd: string, projectPath: string): string {
  const isWorktreeMode = worktreeCwd !== projectPath;
  if (phase === 'deploy' && isWorktreeMode) {
    return projectPath;
  }
  return worktreeCwd;
}

export function setInitialProjectPath(path: string | null): void {
  initialProjectPath = path;
}

export function getInitialProjectPath(): string | null {
  return initialProjectPath;
}

// Re-exports from projectHandlers.ts for backward compatibility
/** @deprecated Use import from projectHandlers.ts directly */
export const isProjectSelectionInProgress = isProjectSelectionInProgressImpl;
/** @deprecated Use import from projectHandlers.ts directly */
export const setProjectSelectionLock = setProjectSelectionLockImpl;
/** @deprecated Use import from projectHandlers.ts directly */
export const resetProjectSelectionLock = resetProjectSelectionLockImpl;
/** @deprecated Use import from projectHandlers.ts directly */
export const validateProjectPath = validateProjectPathImpl;

// Re-exports from bugHandlers.ts for backward compatibility
export { startBugsWatcherImpl as startBugsWatcher, stopBugsWatcherImpl as stopBugsWatcher };

// ============================================================
// Project Selection
// ============================================================

export async function selectProject(projectPath: string): Promise<SelectProjectResult> {
  logger.info('[handlers] selectProject called', { projectPath });

  if (isProjectSelectionInProgress()) {
    logger.warn('[handlers] selectProject blocked - selection already in progress', { projectPath });
    return {
      success: false, projectPath,
      kiroValidation: { exists: false, hasSpecs: false, hasSteering: false },
      specs: [], bugs: [], specJsonMap: {},
      error: { type: 'SELECTION_IN_PROGRESS' },
    };
  }

  setProjectSelectionLock(true);
  logger.debug('[handlers] selectProject acquired lock', { projectPath });

  try {
    const validationResult = await validateProjectPath(projectPath);
    if (!validationResult.ok) {
      logger.warn('[handlers] selectProject path validation failed', { projectPath, error: validationResult.error });
      return {
        success: false, projectPath,
        kiroValidation: { exists: false, hasSpecs: false, hasSteering: false },
        specs: [], bugs: [], specJsonMap: {},
        error: validationResult.error,
      };
    }

    await setProjectPath(projectPath);
    const kiroValidation = await fileService.validateKiroDirectory(projectPath);
    const specsResult = await fileService.readSpecs(projectPath);
    const specs = specsResult.ok ? specsResult.value : [];

    const specJsonMap: Record<string, import('../../renderer/types').SpecJson> = {};
    for (const spec of specs) {
      try {
        const specPathResult = await fileService.resolveSpecPath(projectPath, spec.name);
        if (!specPathResult.ok) continue;
        const specJsonResult = await fileService.readSpecJson(specPathResult.value);
        if (specJsonResult.ok) specJsonMap[spec.name] = specJsonResult.value;
      } catch (error) {
        logger.warn('[handlers] Failed to read specJson', { specName: spec.name, error });
      }
    }

    const bugsResult = await bugService.readBugs(projectPath);
    const bugs = bugsResult.ok ? bugsResult.value.bugs : [];
    const bugWarnings = bugsResult.ok ? bugsResult.value.warnings : [];
    if (bugWarnings.length > 0) {
      for (const warning of bugWarnings) logger.warn('[handlers] ' + warning);
    }

    const configStore = getConfigStore();
    configStore.addRecentProject(projectPath);

    logger.info('[handlers] selectProject completed successfully', {
      projectPath, specsCount: specs.length, specJsonMapCount: Object.keys(specJsonMap).length,
      bugsCount: bugs.length, bugWarningsCount: bugWarnings.length, kiroExists: kiroValidation.exists,
    });

    return { success: true, projectPath, kiroValidation, specs, bugs, specJsonMap, bugWarnings };
  } catch (error) {
    logger.error('[handlers] selectProject failed', { projectPath, error });
    return {
      success: false, projectPath,
      kiroValidation: { exists: false, hasSpecs: false, hasSteering: false },
      specs: [], bugs: [], specJsonMap: {},
      error: { type: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
    };
  } finally {
    setProjectSelectionLock(false);
    logger.debug('[handlers] selectProject released lock', { projectPath });
  }
}

// ============================================================
// Project Path Setup
// ============================================================

export async function setProjectPath(projectPath: string): Promise<void> {
  logger.info('[handlers] setProjectPath called', { projectPath });
  currentProjectPath = projectPath;
  projectLogger.setCurrentProject(projectPath);

  specManagerService = new SpecManagerService(projectPath, { layoutConfigService });
  eventCallbacksRegistered = false;

  setMenuProjectPath(projectPath);
  const projectName = projectPath.split('/').pop() || projectPath;
  updateWindowTitle(projectName);

  initDefaultLogFileService(path.join(projectPath, '.kiro', 'specs'));
  logger.info('[handlers] LogFileService initialized');

  initDefaultMetricsService(projectPath);
  logger.info('[handlers] MetricsService initialized');

  // Session recovery
  try {
    const { getDefaultSessionRecoveryService } = await import('../services/sessionRecoveryService');
    const sessionRecoveryService = getDefaultSessionRecoveryService();
    const recoveryResult = await sessionRecoveryService.recoverIncompleteSessions(projectPath);
    logger.info('[handlers] Session recovery completed', {
      aiSessionsRecovered: recoveryResult.aiSessionsRecovered,
      humanSessionsRecovered: recoveryResult.humanSessionsRecovered,
    });
  } catch (error) {
    logger.error('[handlers] Session recovery failed', { error: error instanceof Error ? error.message : String(error) });
  }

  // Restore agents
  try {
    await specManagerService.restoreAgents();
    logger.info('[handlers] Agents restored from PID files');
  } catch (error) {
    logger.error('[handlers] Failed to restore agents:', error);
  }

  // Stop existing watchers
  await stopSpecsWatcherImpl();
  await stopAgentRecordWatcher();
  await stopBugsWatcherImpl();

  // Setup Remote Access
  setupRemoteAccessProviders(projectPath);

  // Initialize ScheduleTaskCoordinator
  try {
    await initScheduleTaskCoordinator(projectPath);
    logger.info('[handlers] ScheduleTaskCoordinator initialized');
  } catch (error) {
    logger.error('[handlers] Failed to initialize ScheduleTaskCoordinator', { error: error instanceof Error ? error.message : String(error) });
  }
}

function getSpecManagerService(): SpecManagerService {
  if (!specManagerService) throw new Error('SpecManagerService not initialized. Call setProjectPath first.');
  return specManagerService;
}

// ============================================================
// Remote Access Setup
// ============================================================

async function setupRemoteAccessProviders(projectPath: string): Promise<void> {
  const getSpecsForRemote = async (): Promise<SpecInfo[] | null> => {
    const result = await fileService.readSpecs(projectPath);
    if (!result.ok) return null;
    const specInfos: SpecInfo[] = [];
    for (const spec of result.value) {
      try {
        const specPathResult = await fileService.resolveSpecPath(projectPath, spec.name);
        const specPath = specPathResult.ok ? specPathResult.value : '';
        const specJsonResult = specPath ? await fileService.readSpecJson(specPath) : { ok: false as const, error: { type: 'NOT_FOUND' as const, path: '' } };
        if (specJsonResult.ok) {
          specInfos.push({
            id: spec.name, name: spec.name, feature_name: spec.name, phase: specJsonResult.value.phase,
            path: specPath, updatedAt: specJsonResult.value.updated_at || '', approvals: specJsonResult.value.approvals,
            worktree: specJsonResult.value.worktree,
          });
        } else {
          specInfos.push({ id: spec.name, name: spec.name, feature_name: spec.name, phase: 'initialized', path: specPath });
        }
      } catch {
        specInfos.push({ id: spec.name, name: spec.name, feature_name: spec.name, phase: 'initialized', path: '' });
      }
    }
    return specInfos;
  };

  const getBugsForRemote = async (): Promise<BugInfo[] | null> => {
    const result = await bugService.readBugs(projectPath);
    if (!result.ok) return null;
    const bugInfos: BugInfo[] = [];
    for (const bug of result.value.bugs) {
      const bugPathResult = await fileService.resolveBugPath(projectPath, bug.name);
      const bugPath = bugPathResult.ok ? bugPathResult.value : '';
      bugInfos.push({
        name: bug.name, path: bugPath, phase: bug.phase, updatedAt: bug.updatedAt, reportedAt: bug.reportedAt,
        worktree: bug.worktree, worktreeBasePath: bug.worktreeBasePath,
      });
    }
    return bugInfos;
  };

  const getAgentsForRemote = async (): Promise<AgentStateInfo[] | null> => {
    if (!specManagerService) return null;
    const allAgentsMap = await specManagerService.getAllAgents();
    const agents: AgentStateInfo[] = [];
    for (const agentList of allAgentsMap.values()) {
      for (const agent of agentList) {
        agents.push({
          id: agent.agentId, status: agent.status, phase: agent.phase, specId: agent.specId,
          startedAt: agent.startedAt, lastActivityAt: agent.lastActivityAt, command: agent.command, sessionId: agent.sessionId,
        });
      }
    }
    return agents;
  };

  setupStateProvider(projectPath, getSpecsForRemote, getBugsForRemote, getAgentsForRemote);
  setupWorkflowController(specManagerService!);
  setupAgentLogsProvider();
  setupSpecDetailProvider(projectPath);
  setupBugDetailProvider(projectPath);
  setupFileService(projectPath);
  logger.info('[handlers] Remote Access providers set up');
}

// ============================================================
// release-button-api-fix: Project Command Execution
// Task 4.1: Parameter validation for executeProjectCommand
// Requirements: 1.1, 1.5
// ============================================================

/**
 * Validate parameters for executeProjectCommand
 * @param projectPath - Project root path
 * @param command - Command string to execute
 * @param title - Display title for Agent list
 * @returns Result with success or error message
 */
export function validateProjectCommandParams(
  projectPath: string,
  command: string,
  title: string
): { ok: true } | { ok: false; error: string } {
  if (!projectPath || projectPath.trim() === '') {
    return { ok: false, error: 'projectPath is required' };
  }
  if (!command || command.trim() === '') {
    return { ok: false, error: 'command is required' };
  }
  if (!title || title.trim() === '') {
    return { ok: false, error: 'title is required' };
  }
  return { ok: true };
}

// ============================================================
// IPC Handlers Registration (Orchestrator)
// ============================================================

export function registerIpcHandlers(): void {
  const configStore = getConfigStore();

  // Renderer logging (fire-and-forget)
  ipcMain.on(IPC_CHANNELS.LOG_RENDERER, (_event, level: 'error' | 'warn' | 'info' | 'debug', message: string, context?: unknown) => {
    projectLogger.logFromRenderer(level, message, context);
  });

  // Domain Handler Registration
  registerCloudflareHandlers();
  registerConfigHandlers({ configStore, layoutConfigService });
  registerInstallHandlers({
    commandInstallerService, projectChecker, ccSddWorkflowInstaller, unifiedCommandsetInstaller,
    experimentalToolsInstaller, commandsetVersionService, getCliInstallStatus, installCliCommand, getManualInstallInstructions,
  });
  registerFileHandlers({ fileService, getCurrentProjectPath });

  const specHandlersDeps = {
    fileService, getCurrentProjectPath, getSpecManagerService, registerEventCallbacks,
    getEventCallbacksRegistered: () => eventCallbacksRegistered,
    setEventCallbacksRegistered: (value: boolean) => { eventCallbacksRegistered = value; },
  };
  registerSpecHandlers(specHandlersDeps);

  const startSpecsWatcherWrapper = async (window: BrowserWindow) => {
    await startSpecsWatcherImpl(window, specHandlersDeps);
  };
  registerProjectHandlers({
    fileService, configStore, getCurrentProjectPath, setProjectPath, selectProject, getInitialProjectPath,
    startSpecsWatcher: startSpecsWatcherWrapper, startAgentRecordWatcher, startBugsWatcher: startBugsWatcherImpl,
  });

  registerBugHandlers({
    bugService, fileService, getCurrentProjectPath, getSpecManagerService, registerEventCallbacks,
    getEventCallbacksRegistered: () => eventCallbacksRegistered,
    setEventCallbacksRegistered: (value: boolean) => { eventCallbacksRegistered = value; },
  });

  registerAgentHandlers({
    getSpecManagerService, getCurrentProjectPath, registerEventCallbacks,
    getEventCallbacksRegistered: () => eventCallbacksRegistered,
    setEventCallbacksRegistered: (value: boolean) => { eventCallbacksRegistered = value; },
  });

  // Auto Execution Handlers
  const coordinator = getAutoExecutionCoordinator();
  registerAutoExecutionHandlers(coordinator);
  const bugCoordinator = getBugAutoExecutionCoordinator();
  registerBugAutoExecutionHandlers(bugCoordinator);

  // Bug Auto-Execution event handler
  registerBugAutoExecutionEvents(bugCoordinator);

  // Metrics & MCP Handlers
  registerMetricsHandlers(getCurrentProjectPath);
  registerMcpHandlers();
  registerScheduleTaskHandlers(getCurrentProjectPath);

  // ============================================================
  // Project Command Execution (release-button-api-fix feature)
  // Task 4.1: EXECUTE_PROJECT_COMMAND handler
  // Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.4
  // ============================================================

  // Execute Project Command: Launch project-level agent with any command
  // Command is passed directly without wrapping, title is used as phase (display name)
  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_PROJECT_COMMAND,
    async (event, projectPath: string, command: string, title: string) => {
      // Requirement 1.5: Validate parameters
      const validation = validateProjectCommandParams(projectPath, command, title);
      if (!validation.ok) {
        throw new Error(validation.error);
      }

      // NOTE: projectPath is used for logging only.
      // The working directory (cwd) for agent execution is managed by
      // SpecManagerService, which receives projectPath at construction time.
      // startAgent does not need projectPath as a parameter.
      logger.info('[handlers] EXECUTE_PROJECT_COMMAND called', { projectPath, command, title });

      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !eventCallbacksRegistered) {
        registerEventCallbacks(service, window);
      }

      // Requirement 1.2: command is passed directly to args (no wrapping)
      // Requirement 1.3: title is used as phase for Agent display name
      const result = await service.startAgent({
        specId: '', // Empty specId for project agent
        phase: title, // title is used as phase for display (Requirement 1.3)
        command: 'claude',
        args: [command], // command passed directly without wrapping (Requirement 1.2)
        group: 'doc',
      });

      if (!result.ok) {
        logger.error('[handlers] executeProjectCommand failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      // Requirement 1.4: Return AgentInfo on success
      logger.info('[handlers] executeProjectCommand succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  // Steering Verification Handlers
  registerSteeringHandlers();

  // Multi-Phase Auto-Execution events
  registerAutoExecutionEvents(coordinator);

  logger.info('[handlers] All IPC handlers registered');
}

// ============================================================
// Steering Handlers (Inline - small handlers)
// ============================================================

function getErrorMessage(error: AgentError): string {
  const groupLabels: Record<ExecutionGroup, string> = { doc: 'ドキュメント生成', impl: '実装' };
  switch (error.type) {
    case 'SPAWN_ERROR': return `プロセス起動エラー: ${error.message}`;
    case 'NOT_FOUND': return `エージェントが見つかりません: ${error.agentId}`;
    case 'ALREADY_RUNNING': return `${error.phase}フェーズは既に実行中です`;
    case 'SESSION_NOT_FOUND': return `セッションが見つかりません: ${error.agentId}`;
    case 'GROUP_CONFLICT': return `${groupLabels[error.runningGroup]}が実行中のため、${groupLabels[error.requestedGroup]}を開始できません。`;
    case 'SPEC_MANAGER_LOCKED': return `spec-managerはロック中です: ${error.lockedBy}`;
    case 'PARSE_ERROR': return `解析エラー: ${error.message}`;
    case 'ANALYZE_ERROR': {
      const e = error.error;
      switch (e.type) {
        case 'API_ERROR': return `分析API エラー: ${e.message}`;
        case 'RATE_LIMITED': return 'API呼び出し制限に達しました。しばらく待ってから再試行してください。';
        case 'TIMEOUT': return '分析がタイムアウトしました。';
        case 'INVALID_INPUT': return `入力エラー: ${e.message}`;
        default: return '分析エラーが発生しました';
      }
    }
    default: return '不明なエラーが発生しました';
  }
}

function registerSteeringHandlers(): void {
  // Check steering files
  ipcMain.handle(IPC_CHANNELS.CHECK_STEERING_FILES, async (_event, projectPath: string) => {
    try {
      const verificationMdPath = path.join(projectPath, '.kiro', 'steering', 'verification-commands.md');
      const exists = await stat(verificationMdPath).then(() => true).catch(() => false);
      return { verificationMdExists: exists };
    } catch {
      return { verificationMdExists: false };
    }
  });

  // Generate verification.md
  ipcMain.handle(IPC_CHANNELS.GENERATE_VERIFICATION_MD, async (event, projectPath: string) => {
    logger.info('[handlers] GENERATE_VERIFICATION_MD called', { projectPath });
    const service = getSpecManagerService();
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window && !eventCallbacksRegistered) registerEventCallbacks(service, window);
    const result = await service.startAgent({ specId: '', phase: 'steering-verification', command: 'claude', args: ['/kiro:steering-verification'], group: 'doc' });
    if (!result.ok) throw new Error(getErrorMessage(result.error));
    return result.value;
  });

  // Check release.md
  ipcMain.handle(IPC_CHANNELS.CHECK_RELEASE_MD, async (_event, projectPath: string) => {
    try {
      const releaseMdPath = path.join(projectPath, '.claude', 'commands', 'release.md');
      const exists = await stat(releaseMdPath).then(() => true).catch(() => false);
      return { releaseMdExists: exists };
    } catch {
      return { releaseMdExists: false };
    }
  });

  // Generate release.md
  ipcMain.handle(IPC_CHANNELS.GENERATE_RELEASE_MD, async (event, projectPath: string) => {
    logger.info('[handlers] GENERATE_RELEASE_MD called', { projectPath });
    const service = getSpecManagerService();
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window && !eventCallbacksRegistered) registerEventCallbacks(service, window);
    const result = await service.startAgent({ specId: '', phase: 'generate-release', command: 'claude', args: ['/kiro:generate-release'], group: 'doc' });
    if (!result.ok) throw new Error(getErrorMessage(result.error));
    return result.value;
  });

  logger.info('[handlers] Steering handlers registered');
}

// ============================================================
// Bug Auto-Execution Events
// ============================================================

const BUG_PHASE_COMMANDS: Record<BugWorkflowPhase, string | null> = {
  report: null, analyze: '/kiro:bug-analyze', fix: '/kiro:bug-fix', verify: '/kiro:bug-verify', deploy: '/commit',
};

function registerBugAutoExecutionEvents(bugCoordinator: ReturnType<typeof getBugAutoExecutionCoordinator>): void {
  bugCoordinator.on('execute-next-phase', async (bugPath: string, phase: BugWorkflowPhase, context: { bugName: string }) => {
    logger.info('[handlers] Bug execute-next-phase event received', { bugPath, phase, bugName: context.bugName });
    try {
      const service = getSpecManagerService();
      const window = BrowserWindow.getAllWindows()[0];
      if (!window) { bugCoordinator.handleAgentCompleted('', bugPath, 'failed'); return; }

      let command = BUG_PHASE_COMMANDS[phase];
      if (!command) { bugCoordinator.handleAgentCompleted('', bugPath, 'failed'); return; }

      const bugDir = await bugService.resolveBugPath(currentProjectPath!, context.bugName);
      const worktreeCwd = await bugService.getAgentCwd(bugDir, currentProjectPath!);
      const isWorktreeMode = worktreeCwd !== currentProjectPath;
      if (phase === 'deploy' && isWorktreeMode) command = '/kiro:bug-merge';
      const effectiveCwd = getBugAgentEffectiveCwd(phase, worktreeCwd, currentProjectPath!);

      const result = await service.startAgent({ specId: `bug:${context.bugName}`, phase, command: 'claude', args: [`${command} ${context.bugName}`], worktreeCwd: effectiveCwd });
      if (result.ok) {
        const agentId = result.value.agentId;
        bugCoordinator.setCurrentPhase(bugPath, phase, agentId);
        const handleStatusChange = async (changedAgentId: string, status: string) => {
          if (changedAgentId === agentId && ['completed', 'failed', 'stopped'].includes(status)) {
            const finalStatus = status === 'completed' ? 'completed' : (status === 'stopped' ? 'interrupted' : 'failed');
            bugCoordinator.handleAgentCompleted(agentId, bugPath, finalStatus as 'completed' | 'failed' | 'interrupted');
            service.offStatusChange(handleStatusChange);
          }
        };
        service.onStatusChange(handleStatusChange);
      } else {
        bugCoordinator.handleAgentCompleted('', bugPath, 'failed');
      }
    } catch {
      bugCoordinator.handleAgentCompleted('', bugPath, 'failed');
    }
  });
}

// ============================================================
// Spec Auto-Execution Events
// ============================================================

function registerAutoExecutionEvents(coordinator: AutoExecutionCoordinator): void {
  // execute-next-phase
  coordinator.on('execute-next-phase', async (specPath: string, phase: WorkflowPhase, context: { specId: string; featureName: string }) => {
    logger.info('[handlers] execute-next-phase event received', { specPath, phase, context });
    try {
      const service = getSpecManagerService();
      const window = BrowserWindow.getAllWindows()[0];
      if (!window) return;
      coordinator.setCurrentPhase(specPath, phase);

      if (phase === 'impl') {
        const result = await service.execute({ type: 'auto-impl', specId: context.specId, featureName: context.featureName, commandPrefix: 'kiro' });
        if (result.ok) {
          coordinator.setCurrentPhase(specPath, 'impl', result.value.agentId);
          setupAgentCompletionListener(service, result.value.agentId, specPath, coordinator);
        } else {
          coordinator.handleAgentCompleted('', specPath, 'failed');
        }
        return;
      }

      const result = await service.execute({ type: phase, specId: context.specId, featureName: context.featureName, commandPrefix: 'kiro' } as import('../../shared/types/executeOptions').ExecuteOptions);
      if (result.ok) {
        coordinator.setCurrentPhase(specPath, phase, result.value.agentId);
        setupAgentCompletionListenerWithApproval(service, result.value.agentId, specPath, phase, coordinator);
      } else {
        coordinator.handleAgentCompleted('', specPath, 'failed');
      }
    } catch {
      coordinator.handleAgentCompleted('', specPath, 'failed');
    }
  });

  // execute-document-review
  coordinator.on('execute-document-review', async (specPath: string, context: { specId: string }) => {
    logger.info('[handlers] execute-document-review event received', { specPath, context });
    try {
      const service = getSpecManagerService();
      const window = BrowserWindow.getAllWindows()[0];
      if (!window) { coordinator.handleDocumentReviewCompleted(specPath, false); return; }

      let scheme: import('../../shared/registry/reviewEngineRegistry').ReviewerScheme | undefined;
      try {
        const specJsonPath = join(specPath, 'spec.json');
        const specJsonContent = await access(specJsonPath).then(() => import('fs/promises').then(fs => fs.readFile(specJsonPath, 'utf-8')), () => null);
        if (specJsonContent) scheme = JSON.parse(specJsonContent).documentReview?.scheme;
      } catch { /* use default */ }

      const reviewResult = await service.execute({ type: 'document-review', specId: context.specId, featureName: context.specId, commandPrefix: 'kiro', scheme });
      if (!reviewResult.ok) { coordinator.handleDocumentReviewCompleted(specPath, false); return; }

      const handleReviewStatusChange = async (changedAgentId: string, status: string) => {
        if (changedAgentId === reviewResult.value.agentId) {
          if (status === 'completed') {
            service.offStatusChange(handleReviewStatusChange);
            await executeDocumentReviewReply(service, specPath, context.specId, coordinator);
          } else if (status === 'failed' || status === 'stopped') {
            service.offStatusChange(handleReviewStatusChange);
            coordinator.handleDocumentReviewCompleted(specPath, false);
          }
        }
      };
      service.onStatusChange(handleReviewStatusChange);
    } catch {
      coordinator.handleDocumentReviewCompleted(specPath, false);
    }
  });

  // execute-inspection
  coordinator.on('execute-inspection', async (specPath: string, context: { specId: string }) => {
    logger.info('[handlers] execute-inspection event received', { specPath, context });
    try {
      const service = getSpecManagerService();
      const result = await service.execute({ type: 'inspection', specId: context.specId, featureName: context.specId, commandPrefix: 'kiro', autofix: true });
      if (!result.ok) { coordinator.handleInspectionCompleted(specPath, 'failed'); return; }
      const handleStatusChange = async (changedAgentId: string, status: string) => {
        if (changedAgentId === result.value.agentId && ['completed', 'failed', 'stopped'].includes(status)) {
          service.offStatusChange(handleStatusChange);
          coordinator.handleInspectionCompleted(specPath, status === 'completed' ? 'passed' : 'failed');
        }
      };
      service.onStatusChange(handleStatusChange);
    } catch {
      coordinator.handleInspectionCompleted(specPath, 'failed');
    }
  });

  // execute-spec-merge
  coordinator.on('execute-spec-merge', async (specPath: string, context: { specId: string }) => {
    logger.info('[handlers] execute-spec-merge event received', { specPath, context });
    try {
      const service = getSpecManagerService();
      const result = await service.execute({ type: 'spec-merge', specId: context.specId, featureName: context.specId, commandPrefix: 'kiro' });
      if (!result.ok) { coordinator.completeExecution(specPath); return; }
      const handleStatusChange = async (changedAgentId: string, status: string) => {
        if (changedAgentId === result.value.agentId && ['completed', 'failed', 'stopped'].includes(status)) {
          service.offStatusChange(handleStatusChange);
          coordinator.completeExecution(specPath);
        }
      };
      service.onStatusChange(handleStatusChange);
    } catch {
      coordinator.completeExecution(specPath);
    }
  });

  logger.info('[handlers] Multi-phase auto-execution connected');
}

function setupAgentCompletionListener(service: SpecManagerService, agentId: string, specPath: string, coordinator: AutoExecutionCoordinator): void {
  const handleStatusChange = async (changedAgentId: string, status: string) => {
    if (changedAgentId === agentId && ['completed', 'failed', 'stopped'].includes(status)) {
      const finalStatus = status === 'completed' ? 'completed' : (status === 'stopped' ? 'interrupted' : 'failed');
      coordinator.handleAgentCompleted(agentId, specPath, finalStatus as 'completed' | 'failed' | 'interrupted');
      service.offStatusChange(handleStatusChange);
    }
  };
  service.onStatusChange(handleStatusChange);
}

function setupAgentCompletionListenerWithApproval(service: SpecManagerService, agentId: string, specPath: string, phase: WorkflowPhase, coordinator: AutoExecutionCoordinator): void {
  const handleStatusChange = async (changedAgentId: string, status: string) => {
    if (changedAgentId === agentId && ['completed', 'failed', 'stopped'].includes(status)) {
      if (status === 'completed' && ['requirements', 'design', 'tasks'].includes(phase)) {
        try {
          const approveResult = await fileService.updateApproval(specPath, phase as 'requirements' | 'design' | 'tasks', true);
          if (approveResult.ok) logger.info('[handlers] execute-next-phase: auto-approved phase', { specPath, phase });
        } catch { /* ignore */ }
      }
      const finalStatus = status === 'completed' ? 'completed' : (status === 'stopped' ? 'interrupted' : 'failed');
      coordinator.handleAgentCompleted(agentId, specPath, finalStatus as 'completed' | 'failed' | 'interrupted');
      service.offStatusChange(handleStatusChange);
    }
  };
  service.onStatusChange(handleStatusChange);
}

// ============================================================
// Document Review Reply Handler
// ============================================================

async function executeDocumentReviewReply(service: SpecManagerService, specPath: string, specId: string, coordinator: AutoExecutionCoordinator): Promise<void> {
  try {
    const { DocumentReviewService } = await import('../services/documentReviewService');
    const docReviewService = new DocumentReviewService(currentProjectPath || '');
    const roundNumber = await docReviewService.getNextRoundNumber(specPath);
    const currentRound = Math.max(1, roundNumber - 1);

    const replyResult = await service.execute({ type: 'document-review-reply', specId, featureName: specId, reviewNumber: currentRound, commandPrefix: 'kiro', autofix: true });
    if (!replyResult.ok) { coordinator.handleDocumentReviewCompleted(specPath, false); return; }

    const handleReplyStatusChange = async (changedAgentId: string, status: string) => {
      if (changedAgentId === replyResult.value.agentId) {
        if (status === 'completed') {
          service.offStatusChange(handleReplyStatusChange);
          const specJsonResult = await docReviewService.readSpecJson(specPath);
          if (!specJsonResult.ok) { coordinator.handleDocumentReviewCompleted(specPath, false); return; }

          const specJson = specJsonResult.value;
          const documentReview = specJson.documentReview;
          const isApproved = documentReview?.status === 'approved';
          const roundDetails = documentReview?.roundDetails || [];
          const latestRound = roundDetails[roundDetails.length - 1];
          const fixStatus = latestRound?.fixStatus;
          const fixRequired = latestRound?.fixRequired ?? 0;
          const needsDiscussion = latestRound?.needsDiscussion ?? 0;
          const currentRoundNumber = roundDetails.length;

          if (isApproved || fixStatus === 'not_required') {
            coordinator.handleDocumentReviewCompleted(specPath, true);
          } else if (fixStatus === 'pending') {
            coordinator.handleDocumentReviewCompleted(specPath, false);
          } else if (fixStatus === 'applied' && currentRoundNumber < MAX_DOCUMENT_REVIEW_ROUNDS) {
            coordinator.continueDocumentReviewLoop(specPath, currentRoundNumber + 1);
          } else if (fixStatus === 'applied') {
            coordinator.handleDocumentReviewCompleted(specPath, false);
          } else {
            // Fallback
            if (fixRequired === 0 && needsDiscussion === 0) coordinator.handleDocumentReviewCompleted(specPath, true);
            else if (needsDiscussion > 0) coordinator.handleDocumentReviewCompleted(specPath, false);
            else if (fixRequired > 0 && currentRoundNumber < MAX_DOCUMENT_REVIEW_ROUNDS) coordinator.continueDocumentReviewLoop(specPath, currentRoundNumber + 1);
            else coordinator.handleDocumentReviewCompleted(specPath, false);
          }
        } else if (status === 'failed' || status === 'stopped') {
          service.offStatusChange(handleReplyStatusChange);
          coordinator.handleDocumentReviewCompleted(specPath, false);
        }
      }
    };
    service.onStatusChange(handleReplyStatusChange);
  } catch {
    coordinator.handleDocumentReviewCompleted(specPath, false);
  }
}

// ============================================================
// Event Callbacks Helper
// ============================================================

function registerEventCallbacks(service: SpecManagerService, window: BrowserWindow): void {
  logger.info('[handlers] Registering event callbacks');
  eventCallbacksRegistered = true;

  service.onOutput((agentId, stream, data) => {
    if (!window.isDestroyed()) window.webContents.send(IPC_CHANNELS.AGENT_OUTPUT, agentId, stream, data);
    const remoteServer = getRemoteAccessServer();
    const wsHandler = remoteServer.getWebSocketHandler();
    if (wsHandler) wsHandler.broadcastAgentOutput(agentId, stream, data, stream === 'stderr' ? 'error' : 'agent');
  });

  service.onStatusChange(async (agentId, status) => {
    logger.info('[handlers] Agent status change', { agentId, status });
    if (!window.isDestroyed()) window.webContents.send(IPC_CHANNELS.AGENT_STATUS_CHANGE, agentId, status);
    const agentInfo = await service.getAgentById(agentId);
    const remoteServer = getRemoteAccessServer();
    const wsHandler = remoteServer.getWebSocketHandler();
    if (wsHandler) {
      wsHandler.broadcastAgentStatus(agentId, status, agentInfo ? {
        specId: agentInfo.specId, phase: agentInfo.phase, startedAt: agentInfo.startedAt, lastActivityAt: agentInfo.lastActivityAt,
      } : undefined);
    }
  });

  service.onAgentExitError((agentId, error) => {
    logger.warn('[handlers] Agent exit error', { agentId, error: error.message });
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send(IPC_CHANNELS.AGENT_EXIT_ERROR, { agentId, error: error.message });
    }
  });
}
