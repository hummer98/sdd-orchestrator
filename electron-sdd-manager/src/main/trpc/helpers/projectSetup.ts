import { BrowserWindow } from 'electron';
import * as path from 'path';
import { access } from 'fs/promises';
import { join } from 'path';

import { FileService } from '../../services/fileService';
import { getConfigStore } from '../../services/configStore';
import { setMenuProjectPath, updateWindowTitle } from '../../menu';
import { SpecManagerService, WorkflowPhase } from '../../services/specManagerService';
import { projectLogger, projectLogger as logger } from '../../services/projectLogger';
// getToolPathResolverService: removed (unused after IPC deletion)
import { initDefaultLogFileService } from '../../services/logFileService';
import { LogStreamingService } from '../../services/logStreamingService';
import { getDefaultAgentRecordService, initDefaultAgentRecordService } from '../../services/agentRecordService';
import { getGlobalEventBus } from '../services/globalEventBus';
import { EVENT_NAMES } from '../services/eventBus';
import { BugService } from '../../services/bugService';
import { layoutConfigService } from '../../services/layoutConfigService';
import { AutoExecutionCoordinator, MAX_DOCUMENT_REVIEW_ROUNDS } from '../../services/autoExecutionCoordinator';
import { getBugAutoExecutionCoordinator } from '../../services/bugAutoExecutionCoordinator';
import { setupStateProvider, setupWorkflowController, setupAgentLogsProvider, setupSpecDetailProvider, setupBugDetailProvider, setupFileService, getRemoteAccessServer } from '../../services/remoteAccessSetup';
import { initScheduleTaskCoordinator } from '../../services/scheduleTaskSetup';
import { MetricsService } from '../../services/metricsService';
import { MetricsFileWriter } from '../../services/metricsFileWriter';
import { MetricsFileReader } from '../../services/metricsFileReader';
import { SessionRecoveryService } from '../../services/sessionRecoveryService';
import { initializeAgentLifecycleManager } from '../../services/agentLifecycleSetup';
import { DocumentReviewService } from '../../services/documentReviewService';
import {
  isProjectSelectionInProgress,
  setProjectSelectionLock,
  validateProjectPath,
} from './projectUtils';

// State Management
import {
  getSpecManagerService,
  setSpecManagerService,
  getAutoExecutionCoordinator,
  setAutoExecutionCoordinator,
  setMetricsService,
  getCurrentProjectPath,
  setCurrentProjectPath,
  setInitialSelectResult,
} from './projectState';

// Project Info Helpers
export {
  getSpecManagerService,
  getAutoExecutionCoordinator,
  getMetricsService,
  getCurrentProjectPath,
  getInitialProjectPath,
  getInitialSelectResult,
  setInitialProjectPath,
  setInitialSelectResult,
} from './projectState';

import type { SelectProjectResult } from '../../../renderer/types';
import type { BugWorkflowPhase } from '../../../renderer/types/bug';
import type { SpecInfo, BugInfo, AgentStateInfo } from '../../services/webSocketHandler';

// Re-export utility functions that were in projectUtils.ts
export { validateProjectPath, isProjectSelectionInProgress, setProjectSelectionLock, resetProjectSelectionLock } from './projectUtils';

// Import project file utilities for local use and re-export
import { startProjectFileWatcher, stopProjectFileWatcher, initProjectFileWatcher } from './projectFileUtils';
export { startProjectFileWatcher, stopProjectFileWatcher, initProjectFileWatcher } from './projectFileUtils';

// Import watcher utilities for local use and re-export
import { startSpecsWatcher, stopSpecsWatcher, startBugsWatcher, stopBugsWatcher, startAgentRecordWatcher, stopAgentRecordWatcher } from './watcherUtils';
export { startSpecsWatcher, stopSpecsWatcher, startBugsWatcher, stopBugsWatcher, startAgentRecordWatcher, stopAgentRecordWatcher } from './watcherUtils';

// ============================================================
// Service Instances (DI)
// ============================================================
const fileService = new FileService();
const bugService = new BugService();

// ============================================================
// Public Functions
// ============================================================

export function clearInitialSelectResult(): void {
  setInitialSelectResult(null);
  logger.debug('[projectSetup] clearInitialSelectResult cache cleared');
}

export function getAutoExecutionCoordinatorInternal(): AutoExecutionCoordinator {
  try {
    return getAutoExecutionCoordinator();
  } catch {
    const coordinator = new AutoExecutionCoordinator();
    setAutoExecutionCoordinator(coordinator);
    logger.info('[projectSetup] AutoExecutionCoordinator created');
    return coordinator;
  }
}

export function getBugAgentEffectiveCwd(phase: BugWorkflowPhase, worktreeCwd: string, projectPath: string): string {
  const isWorktreeMode = worktreeCwd !== projectPath;
  if (phase === 'deploy' && isWorktreeMode) {
    return projectPath;
  }
  return worktreeCwd;
}

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
// Project Selection
// ============================================================

export async function selectProject(projectPath: string): Promise<SelectProjectResult> {
  logger.info('[projectSetup] selectProject called', { projectPath });

  if (isProjectSelectionInProgress()) {
    logger.warn('[projectSetup] selectProject blocked - selection already in progress', { projectPath });
    return {
      success: false, projectPath,
      kiroValidation: { exists: false, hasSpecs: false, hasSteering: false },
      specs: [], bugs: [], specJsonMap: {},
      error: { type: 'SELECTION_IN_PROGRESS' },
    };
  }

  setProjectSelectionLock(true);
  logger.debug('[projectSetup] selectProject acquired lock', { projectPath });

  try {
    const validationResult = await validateProjectPath(projectPath);
    if (!validationResult.ok) {
      logger.warn('[projectSetup] selectProject path validation failed', { projectPath, error: validationResult.error });
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

    const specJsonMap: Record<string, import('../../../renderer/types').SpecJson> = {};
    for (const spec of specs) {
      try {
        const specPathResult = await fileService.resolveSpecPath(projectPath, spec.name);
        if (!specPathResult.ok) continue;
        const specJsonResult = await fileService.readSpecJson(specPathResult.value);
        if (specJsonResult.ok) specJsonMap[spec.name] = specJsonResult.value;
      } catch (error) {
        logger.warn('[projectSetup] Failed to read specJson', { specName: spec.name, error });
      }
    }

    const bugsResult = await bugService.readBugs(projectPath);
    const bugs = bugsResult.ok ? bugsResult.value.bugs : [];
    const bugWarnings = bugsResult.ok ? bugsResult.value.warnings : [];
    if (bugWarnings.length > 0) {
      for (const warning of bugWarnings) logger.warn('[projectSetup] ' + warning);
    }

    const configStore = getConfigStore();
    configStore.addRecentProject(projectPath);

    logger.info('[projectSetup] selectProject completed successfully', {
      projectPath, specsCount: specs.length, specJsonMapCount: Object.keys(specJsonMap).length,
      bugsCount: bugs.length, bugWarningsCount: bugWarnings.length, kiroExists: kiroValidation.exists,
    });

    return { success: true, projectPath, kiroValidation, specs, bugs, specJsonMap, bugWarnings };
  } catch (error) {
    logger.error('[projectSetup] selectProject failed', { projectPath, error });
    return {
      success: false, projectPath,
      kiroValidation: { exists: false, hasSpecs: false, hasSteering: false },
      specs: [], bugs: [], specJsonMap: {},
      error: { type: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
    };
  } finally {
    setProjectSelectionLock(false);
    logger.debug('[projectSetup] selectProject released lock', { projectPath });
  }
}

// ============================================================
// Project Path Setup
// ============================================================

export async function setProjectPath(projectPath: string): Promise<void> {
  // startProjectFileWatcher, stopProjectFileWatcher, stopSpecsWatcher etc. are imported at module level

  logger.info('[projectSetup] setProjectPath called', { projectPath });
  setCurrentProjectPath(projectPath);
  projectLogger.setCurrentProject(projectPath);

  // Metrics services setup with DI
  const metricsFileWriter = new MetricsFileWriter(projectLogger);
  const metricsFileReader = new MetricsFileReader(projectLogger);
  const metricsService = new MetricsService(projectLogger, metricsFileWriter, metricsFileReader);
  metricsService.setProjectPath(projectPath);
  setMetricsService(metricsService);
  logger.info('[projectSetup] MetricsService initialized');

  const specManager = new SpecManagerService(projectPath, { layoutConfigService, metricsService });
  setSpecManagerService(specManager);

  setMenuProjectPath(projectPath);
  const projectName = projectPath.split('/').pop() || projectPath;
  updateWindowTitle(projectName);

  initDefaultLogFileService(path.join(projectPath, '.kiro', 'runtime', 'agents'));
  logger.info('[projectSetup] LogFileService initialized');

  const agentsBasePath = path.join(projectPath, '.kiro', 'runtime', 'agents');
  initDefaultAgentRecordService(agentsBasePath);
  logger.info('[projectSetup] AgentRecordService initialized');

  // Session recovery
  try {
    const sessionRecoveryService = new SessionRecoveryService(projectLogger, metricsFileWriter);
    const recoveryResult = await sessionRecoveryService.recoverIncompleteSessions(projectPath);
    logger.info('[projectSetup] Session recovery completed', {
      aiSessionsRecovered: recoveryResult.aiSessionsRecovered,
      humanSessionsRecovered: recoveryResult.humanSessionsRecovered,
    });
  } catch (error) {
    logger.error('[projectSetup] Session recovery failed', { error: error instanceof Error ? error.message : String(error) });
  }

  // Restore agents
  try {
    await specManager.restoreAgents();
    logger.info('[projectSetup] Agents restored from PID files');
  } catch (error) {
    logger.error('[projectSetup] Failed to restore agents:', error);
  }

  // Stop existing watchers
  await stopSpecsWatcher();
  await stopAgentRecordWatcher();
  await stopBugsWatcher();
  await stopProjectFileWatcher();

  // Start project file watcher
  await startProjectFileWatcher(projectPath);

  // Start entity watchers (specs, bugs, agent records)
  // These monitor .kiro/specs/ and .kiro/bugs/ for file changes and emit events via EventBus
  await startSpecsWatcher(null, fileService, getCurrentProjectPath);
  await startBugsWatcher(getCurrentProjectPath);
  startAgentRecordWatcher(null, getCurrentProjectPath);
  logger.info('[projectSetup] Entity watchers started (specs, bugs, agentRecord)');

  // Setup Remote Access
  setupRemoteAccessProviders(projectPath);

  // Initialize ScheduleTaskCoordinator
  try {
    await initScheduleTaskCoordinator(projectPath);
    logger.info('[projectSetup] ScheduleTaskCoordinator initialized');
  } catch (error) {
    logger.error('[projectSetup] Failed to initialize ScheduleTaskCoordinator', { error: error instanceof Error ? error.message : String(error) });
  }

  // Initialize Agent Lifecycle Management
  try {
    const { lifecycleManager, watchdog } = await initializeAgentLifecycleManager();
    const syncResult = await lifecycleManager.synchronizeOnStartup();
    logger.info('[projectSetup] Agent state synchronized', syncResult);
    watchdog.start();
    logger.info('[projectSetup] Agent lifecycle management initialized');
  } catch (error) {
    logger.error('[projectSetup] Failed to initialize agent lifecycle management', { error: error instanceof Error ? error.message : String(error) });
  }
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
    return specInfos.sort((a, b) => {
      const timeA = new Date((a.updatedAt as string | undefined) || '').getTime();
      const timeB = new Date((b.updatedAt as string | undefined) || '').getTime();
      return timeB - timeA;
    });
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
    const specManager = getSpecManagerService();
    const allAgentsMap = await specManager.getAllAgents();
    const agents: AgentStateInfo[] = [];
    for (const agentList of allAgentsMap.values()) {
      for (const agent of agentList) {
        agents.push({
          agentId: agent.agentId, status: agent.status, phase: agent.phase, specId: agent.specId,
          startedAt: agent.startedAt, lastActivityAt: agent.lastActivityAt, command: agent.command, sessionId: agent.sessionId,
        });
      }
    }
    return agents;
  };

  setupStateProvider(projectPath, getSpecsForRemote, getBugsForRemote, getAgentsForRemote);
  setupWorkflowController(getSpecManagerService());
  setupAgentLogsProvider();
  setupSpecDetailProvider(projectPath);
  setupBugDetailProvider(projectPath);
  setupFileService(projectPath);
  logger.info('[projectSetup] Remote Access providers set up');
}

// ============================================================
// Event Wiring (replaces registerIpcHandlers from handlers.ts)
// ============================================================

/**
 * Initialize all event wiring that was previously done in registerIpcHandlers.
 * This sets up:
 * - AutoExecution event handlers (spec & bug)
 * - Project file watcher initialization
 * - Renderer log forwarding via ipcMain.on (LOG_RENDERER)
 */
export function initializeEventWiring(): void {
  // initProjectFileWatcher is imported at module level (static import)

  // Renderer logging (fire-and-forget) - still uses ipcMain.on for fire-and-forget pattern
  // This is kept as the tRPC misc.logRenderer mutation also handles this,
  // but the ipcMain.on version is needed for synchronous sends from preload
  // NOTE: With preload cleaned up, this can be removed if all logging goes through tRPC
  // For now, we keep it for backward compatibility during transition

  // AutoExecution event handlers
  const coordinator = getAutoExecutionCoordinatorInternal();
  const bugCoordinator = getBugAutoExecutionCoordinator();
  registerBugAutoExecutionEvents(bugCoordinator);
  registerAutoExecutionEvents(coordinator);

  // Project file watcher initialization
  initProjectFileWatcher();

  logger.info('[projectSetup] Event wiring initialized');
}

// ============================================================
// Bug Auto-Execution Events
// ============================================================

const BUG_PHASE_COMMANDS: Record<BugWorkflowPhase, string | null> = {
  report: null, analyze: '/kiro:bug-analyze', fix: '/kiro:bug-fix', verify: '/kiro:bug-verify', deploy: '/commit',
};

function registerBugAutoExecutionEvents(bugCoordinator: ReturnType<typeof getBugAutoExecutionCoordinator>): void {
  bugCoordinator.on('execute-next-phase', async (bugPath: string, phase: BugWorkflowPhase, context: { bugName: string }) => {
    logger.info('[projectSetup] Bug execute-next-phase event received', { bugPath, phase, bugName: context.bugName });
    try {
      const service = getSpecManagerService();
      const window = BrowserWindow.getAllWindows()[0];
      if (!window) { bugCoordinator.handleAgentCompleted('', bugPath, 'failed'); return; }

      let command = BUG_PHASE_COMMANDS[phase];
      if (!command) { bugCoordinator.handleAgentCompleted('', bugPath, 'failed'); return; }

      const bugDir = await bugService.resolveBugPath(getCurrentProjectPath()!, context.bugName);
      const worktreeCwd = await bugService.getAgentCwd(bugDir, getCurrentProjectPath()!);
      const isWorktreeMode = worktreeCwd !== getCurrentProjectPath();
      if (phase === 'deploy' && isWorktreeMode) command = '/kiro:bug-merge';
      const effectiveCwd = getBugAgentEffectiveCwd(phase, worktreeCwd, getCurrentProjectPath()!);

      const result = await service.startAgent({ specId: `bug:${context.bugName}`, phase, args: [`${command} ${context.bugName}`], worktreeCwd: effectiveCwd, engineId: 'claude' });
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
  coordinator.on('execute-next-phase', async (specPath: string, phase: WorkflowPhase, context: { specId: string; featureName: string }) => {
    logger.info('[projectSetup] execute-next-phase event received', { specPath, phase, context });
    try {
      const service = getSpecManagerService();
      const window = BrowserWindow.getAllWindows()[0];
      if (!window) return;
      coordinator.setCurrentPhase(specPath, phase);

      if (phase === 'document-review') {
        logger.info('[projectSetup] execute-next-phase: executing document-review phase', { specPath, context });
        let scheme: import('../../../shared/registry/reviewEngineRegistry').ReviewerScheme | undefined;
        try {
          const specJsonPath = join(specPath, 'spec.json');
          const specJsonContent = await access(specJsonPath).then(() => import('fs/promises').then(fs => fs.readFile(specJsonPath, 'utf-8')), () => null);
          if (specJsonContent) scheme = JSON.parse(specJsonContent).documentReview?.scheme;
        } catch { /* use default */ }

        const reviewResult = await service.execute({
          type: 'document-review', specId: context.specId, featureName: context.featureName, commandPrefix: 'kiro', scheme,
        });

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
        return;
      }

      if (phase === 'inspection') {
        logger.info('[projectSetup] execute-next-phase: executing inspection phase', { specPath, context });
        const result = await service.execute({
          type: 'inspection', specId: context.specId, featureName: context.featureName, commandPrefix: 'kiro', autofix: true,
        });

        if (!result.ok) { coordinator.handleInspectionCompleted(specPath, 'failed'); return; }

        const handleStatusChange = async (changedAgentId: string, status: string) => {
          if (changedAgentId === result.value.agentId && ['completed', 'failed', 'stopped'].includes(status)) {
            service.offStatusChange(handleStatusChange);
            coordinator.handleInspectionCompleted(specPath, status === 'completed' ? 'passed' : 'failed');
          }
        };
        service.onStatusChange(handleStatusChange);
        return;
      }

      if (phase === 'impl') {
        const specJsonResult = await fileService.readSpecJson(specPath);
        let implMode: 'sequential' | 'parallel' = 'sequential';
        if (specJsonResult.ok && specJsonResult.value.impl?.mode) {
          const mode = specJsonResult.value.impl.mode;
          if (mode === 'parallel' || mode === 'sequential') implMode = mode;
        }
        logger.info('[projectSetup] execute-next-phase: impl mode determined', { specPath, implMode });

        const executeType = implMode === 'parallel' ? 'auto-impl' : 'impl';
        const result = await service.execute({
          type: executeType, specId: context.specId, featureName: context.featureName, commandPrefix: 'kiro',
        });

        if (result.ok) {
          const agentId = result.value.agentId;
          logger.info('[projectSetup] execute-next-phase: impl started successfully', { specPath, agentId, implMode, executeType });
          coordinator.setCurrentPhase(specPath, 'impl', agentId);
          setupAgentCompletionListener(service, agentId, specPath, coordinator);
        } else {
          logger.error('[projectSetup] execute-next-phase: impl start failed', { specPath, implMode, executeType, error: result.error });
          coordinator.handleAgentCompleted('', specPath, 'failed');
        }
        return;
      }

      const result = await service.execute({ type: phase, specId: context.specId, featureName: context.featureName, commandPrefix: 'kiro' } as import('../../../shared/types/executeOptions').ExecuteOptions);
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

  coordinator.on('execute-spec-merge', async (specPath: string, context: { specId: string }) => {
    logger.info('[projectSetup] execute-spec-merge event received', { specPath, context });
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

  logger.info('[projectSetup] Multi-phase auto-execution connected');
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
      let updatedApprovals: import('../../../renderer/types').SpecJson['approvals'] | undefined;
      if (status === 'completed' && ['requirements', 'design', 'tasks'].includes(phase)) {
        try {
          const approveResult = await fileService.updateApproval(specPath, phase as 'requirements' | 'design' | 'tasks', true);
          if (approveResult.ok) {
            logger.info('[projectSetup] execute-next-phase: auto-approved phase', { specPath, phase });
            const specJsonResult = await fileService.readSpecJson(specPath);
            if (specJsonResult.ok) {
              updatedApprovals = specJsonResult.value.approvals;
              logger.debug('[projectSetup] Read updated approvals after auto-approve', { specPath, approvals: updatedApprovals });
            }
          }
        } catch { /* ignore */ }
      }
      const finalStatus = status === 'completed' ? 'completed' : (status === 'stopped' ? 'interrupted' : 'failed');
      coordinator.handleAgentCompleted(agentId, specPath, finalStatus as 'completed' | 'failed' | 'interrupted', updatedApprovals);
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
    const docReviewService = new DocumentReviewService(getCurrentProjectPath() || '');
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
            // Persist approved status before completing (SSOT: documentReview.status)
            if (!isApproved) {
              try {
                await docReviewService.approveReview(specPath);
                logger.info('[projectSetup] executeDocumentReviewReply: approveReview succeeded (not_required)', { specPath });
              } catch (error) {
                logger.error('[projectSetup] executeDocumentReviewReply: approveReview failed (not_required)', { specPath, error: error instanceof Error ? error.message : String(error) });
              }
            }
            coordinator.handleDocumentReviewCompleted(specPath, true);
          } else if (fixStatus === 'pending') {
            coordinator.handleDocumentReviewCompleted(specPath, false);
          } else if (fixStatus === 'applied' && currentRoundNumber < MAX_DOCUMENT_REVIEW_ROUNDS) {
            coordinator.continueDocumentReviewLoop(specPath, currentRoundNumber + 1);
          } else if (fixStatus === 'applied') {
            coordinator.handleDocumentReviewCompleted(specPath, false);
          } else {
            if (fixRequired === 0 && needsDiscussion === 0) {
              // Fallback: persist approved status before completing (SSOT: documentReview.status)
              if (!isApproved) {
                try {
                  await docReviewService.approveReview(specPath);
                  logger.info('[projectSetup] executeDocumentReviewReply: approveReview succeeded (fallback)', { specPath });
                } catch (error) {
                  logger.error('[projectSetup] executeDocumentReviewReply: approveReview failed (fallback)', { specPath, error: error instanceof Error ? error.message : String(error) });
                }
              }
              coordinator.handleDocumentReviewCompleted(specPath, true);
            }
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
// Event Callbacks (Agent output/status/error forwarding)
// ============================================================

export function registerEventCallbacks(service: SpecManagerService, _window: BrowserWindow): void {
  logger.info('[projectSetup] Registering event callbacks');

  const eventBus = getGlobalEventBus();

  // LogStreamingService for parsed log distribution
  const logStreamingService = new LogStreamingService(
    getDefaultAgentRecordService(),
    (agentId, parsedLog) => {
      // Task 9.2: Emit to EventBus for tRPC Subscription (primary path)
      eventBus.emit(EVENT_NAMES.AGENT_LOG, { agentId, parsedLog });
      // Send parsed log to WebSocket (Remote UI)
      const remoteServer = getRemoteAccessServer();
      const wsHandler = remoteServer.getWebSocketHandler();
      if (wsHandler) {
        wsHandler.broadcastAgentLog(agentId, parsedLog);
      }
    }
  );

  service.onOutput((agentId, stream, data) => {
    // Emit to EventBus for tRPC Subscription (primary path)
    eventBus.emit(EVENT_NAMES.AGENT_OUTPUT, { agentId, stream, data });
    const remoteServer = getRemoteAccessServer();
    const wsHandler = remoteServer.getWebSocketHandler();
    if (wsHandler) wsHandler.broadcastAgentOutput(agentId, stream, data, stream === 'stderr' ? 'error' : 'agent');

    logStreamingService.processLogOutput(agentId, stream, data).catch((error) => {
      logger.warn('[projectSetup] LogStreamingService.processLogOutput failed', { agentId, error: error instanceof Error ? error.message : String(error) });
    });
  });

  service.onStatusChange(async (agentId, status) => {
    logger.info('[projectSetup] Agent status change', { agentId, status });
    // Emit to EventBus for tRPC Subscription (primary path)
    eventBus.emit(EVENT_NAMES.AGENT_STATUS_CHANGE, { agentId, status });
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
    logger.warn('[projectSetup] Agent exit error', { agentId, error: error.message });
    eventBus.emit(EVENT_NAMES.AGENT_EXIT_ERROR, { agentId, error: error.message });
  });

  service.onAgentStartError((agentId, specId, error) => {
    logger.warn('[projectSetup] Agent start error', { agentId, specId, errorType: error.type, errorMessage: error.message });
    eventBus.emit(EVENT_NAMES.AGENT_START_ERROR, { agentId, specId, error });
  });
}