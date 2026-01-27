/**
 * Spec Handlers
 * IPC handlers for Spec-related operations
 *
 * Task 5.1: specHandlers.ts を新規作成し、Spec関連ハンドラーを実装する
 * Requirements: 1.5, 2.1, 2.2, 4.1, 4.2
 *
 * Migrated handlers from handlers.ts:
 * - Spec CRUD: READ_SPECS, READ_SPEC_JSON, CREATE_SPEC
 * - Spec更新: UPDATE_APPROVAL, UPDATE_SPEC_JSON, SYNC_SPEC_PHASE
 * - Watcher: START_SPECS_WATCHER, STOP_SPECS_WATCHER
 * - 実行系: EXECUTE_SPEC_INIT, EXECUTE_SPEC_PLAN, EXECUTE
 * - ドキュメントレビュー: EXECUTE_DOCUMENT_REVIEW*, APPROVE_DOCUMENT_REVIEW (SKIP_DOCUMENT_REVIEW removed)
 * - Inspection: EXECUTE_INSPECTION*, SET_INSPECTION_AUTO_EXECUTION_FLAG
 * - Ask系: EXECUTE_ASK_PROJECT, EXECUTE_ASK_SPEC
 * - マージ: EXECUTE_SPEC_MERGE
 * - 実装開始: START_IMPL
 * - その他: SYNC_DOCUMENT_REVIEW, EVENT_LOG_GET, PARSE_TASKS_FOR_PARALLEL
 */

import { ipcMain, BrowserWindow } from 'electron';
import * as path from 'path';
import { IPC_CHANNELS } from './channels';
import type { FileService } from '../services/fileService';
import { SpecsWatcherService } from '../services/specsWatcherService';
import {
  SpecManagerService,
  ExecutionGroup,
  AgentError,
  SPEC_INIT_COMMANDS,
  SPEC_PLAN_COMMANDS,
  CommandPrefix,
} from '../services/specManagerService';
import { logger } from '../services/logger';
import type { Phase } from '../../renderer/types';
import type { ExecuteOptions } from '../../shared/types/executeOptions';
// spec-event-log: Event log service import
import { getDefaultEventLogService } from '../services/eventLogService';
// parallel-task-impl: Task parser for parallel execution
import { parseTasksContent, type ParseResult } from '../services/taskParallelParser';
// spec-productivity-metrics: Metrics service import
import { getDefaultMetricsService } from '../services/metricsService';

// SpecsWatcherService instance
let specsWatcherService: SpecsWatcherService | null = null;

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
 * Dependencies required for spec handlers
 * Requirements: 2.1, 2.2 - Dependency injection for testability
 */
export interface SpecHandlersDependencies {
  /** FileService instance for file operations */
  fileService: FileService;
  /** Function to get SpecManagerService instance */
  getSpecManagerService: () => SpecManagerService;
  /** Function to get current project path */
  getCurrentProjectPath: () => string | null;
  /** Function to check if event callbacks are registered */
  getEventCallbacksRegistered: () => boolean;
  /** Function to set event callbacks registered flag */
  setEventCallbacksRegistered: (value: boolean) => void;
  /** Function to register event callbacks */
  registerEventCallbacks: (service: SpecManagerService, window: BrowserWindow) => void;
}

/**
 * Register all spec-related IPC handlers
 * Requirements: 1.5, 2.1, 4.1, 4.2
 *
 * @param deps - Dependencies for spec handlers
 */
export function registerSpecHandlers(deps: SpecHandlersDependencies): void {
  const {
    fileService,
    getSpecManagerService,
    getCurrentProjectPath,
    getEventCallbacksRegistered,
    // setEventCallbacksRegistered is used by registerEventCallbacks (passed to it from handlers.ts)
    registerEventCallbacks,
  } = deps;

  // ============================================================
  // Spec CRUD Handlers
  // ============================================================

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

  // spec-path-ssot-refactor Task 5.1: Change from specPath to specName
  // Main process resolves path using resolveSpecPath
  ipcMain.handle(
    IPC_CHANNELS.READ_SPEC_JSON,
    async (_event, specName: string) => {
      const currentProjectPath = getCurrentProjectPath();
      if (!currentProjectPath) {
        throw new Error('Project not selected');
      }
      const specPathResult = await fileService.resolveSpecPath(currentProjectPath, specName);
      if (!specPathResult.ok) {
        throw new Error(`Spec not found: ${specName}`);
      }
      const result = await fileService.readSpecJson(specPathResult.value);
      if (!result.ok) {
        throw new Error(`Failed to read spec.json: ${result.error.type}`);
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

  // ============================================================
  // Spec Update Handlers
  // ============================================================

  // spec-path-ssot-refactor Task 5.2: Change from specPath to specName
  // Main process resolves path using resolveSpecPath
  ipcMain.handle(
    IPC_CHANNELS.UPDATE_APPROVAL,
    async (_event, specName: string, phase: Phase, approved: boolean) => {
      const currentProjectPath = getCurrentProjectPath();
      if (!currentProjectPath) {
        throw new Error('Project not selected');
      }
      const specPathResult = await fileService.resolveSpecPath(currentProjectPath, specName);
      if (!specPathResult.ok) {
        throw new Error(`Spec not found: ${specName}`);
      }
      const result = await fileService.updateApproval(specPathResult.value, phase, approved);
      if (!result.ok) {
        throw new Error(`Failed to update approval: ${result.error.type}`);
      }
    }
  );

  // spec-scoped-auto-execution-state: Update spec.json handler
  // spec-path-ssot-refactor Task 5.3: Change from specPath to specName
  // Main process resolves path using resolveSpecPath
  ipcMain.handle(
    IPC_CHANNELS.UPDATE_SPEC_JSON,
    async (_event, specName: string, updates: Record<string, unknown>) => {
      const currentProjectPath = getCurrentProjectPath();
      if (!currentProjectPath) {
        throw new Error('Project not selected');
      }
      const specPathResult = await fileService.resolveSpecPath(currentProjectPath, specName);
      if (!specPathResult.ok) {
        throw new Error(`Spec not found: ${specName}`);
      }
      const result = await fileService.updateSpecJson(specPathResult.value, updates);
      if (!result.ok) {
        throw new Error(`Failed to update spec.json: ${result.error.type}`);
      }
    }
  );

  // Phase Sync Handler - Auto-fix spec.json phase based on task completion
  // spec-path-ssot-refactor Task 5.4: Change from specPath to specName
  // Main process resolves path using resolveSpecPath
  ipcMain.handle(
    IPC_CHANNELS.SYNC_SPEC_PHASE,
    async (_event, specName: string, completedPhase: 'impl' | 'impl-complete', options?: { skipTimestamp?: boolean }) => {
      logger.info('[specHandlers] SYNC_SPEC_PHASE called', { specName, completedPhase, options });
      const currentProjectPath = getCurrentProjectPath();
      if (!currentProjectPath) {
        throw new Error('Project not selected');
      }
      const specPathResult = await fileService.resolveSpecPath(currentProjectPath, specName);
      if (!specPathResult.ok) {
        throw new Error(`Spec not found: ${specName}`);
      }
      const result = await fileService.updateSpecJsonFromPhase(specPathResult.value, completedPhase, options);
      if (!result.ok) {
        throw new Error(`Failed to sync spec phase: ${result.error.type}`);
      }

      // spec-productivity-metrics: Task 4.1 - Complete lifecycle on impl-complete
      // Requirements: 3.1, 3.2 (lifecycle measurement)
      if (completedPhase === 'impl-complete') {
        const metricsService = getDefaultMetricsService();
        await metricsService.completeSpecLifecycle(specName);
        logger.debug('[specHandlers] Spec lifecycle completed', { specName });
      }
    }
  );

  // ============================================================
  // Specs Watcher Handlers
  // ============================================================

  ipcMain.handle(IPC_CHANNELS.START_SPECS_WATCHER, async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      await startSpecsWatcher(window, deps);
    }
  });

  ipcMain.handle(IPC_CHANNELS.STOP_SPECS_WATCHER, async () => {
    await stopSpecsWatcher();
  });

  // ============================================================
  // Phase Execution Handlers (high-level commands)
  // These build the claude command internally in the service layer
  // ============================================================

  // execute-method-unification: Task 4.2 - Unified EXECUTE handler
  // Requirements: 4.2
  ipcMain.handle(
    IPC_CHANNELS.EXECUTE,
    async (event, options: ExecuteOptions) => {
      logger.info('[specHandlers] EXECUTE called', { type: options.type, specId: options.specId, featureName: options.featureName });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !getEventCallbacksRegistered()) {
        registerEventCallbacks(service, window);
      }

      const result = await service.execute(options);

      if (!result.ok) {
        logger.error('[specHandlers] execute failed', { type: options.type, error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[specHandlers] execute succeeded', { type: options.type, agentId: result.value.agentId });
      return result.value;
    }
  );

  // Task 5.2.3 (sidebar-refactor): spec-init連携
  // spec-worktree-early-creation: Task 4.2 - worktreeModeパラメータ追加
  // Launch spec-init agent with description only
  // specId='' for global agent, command: claude -p /kiro:spec-init "{description}" or /spec-manager:init "{description}"
  // Returns agentId immediately without waiting for completion
  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_SPEC_INIT,
    async (
      event,
      projectPath: string,
      description: string,
      commandPrefix: CommandPrefix = 'kiro',
      worktreeMode: boolean = false
    ) => {
      logger.info('[specHandlers] EXECUTE_SPEC_INIT called', { projectPath, description, commandPrefix, worktreeMode });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !getEventCallbacksRegistered()) {
        registerEventCallbacks(service, window);
      }

      // spec-worktree-early-creation: --worktreeフラグをコマンドに追加
      const worktreeFlag = worktreeMode ? ' --worktree' : '';

      // Get the appropriate slash command based on commandPrefix
      const slashCommand = SPEC_INIT_COMMANDS[commandPrefix];

      // Start agent with specId='' (global agent)
      // Base flags (-p, --output-format stream-json, --verbose) are added by specManagerService
      const result = await service.startAgent({
        specId: '', // Empty specId for global agent
        phase: 'spec-init',
        command: 'claude',
        args: [`${slashCommand} "${description}"${worktreeFlag}`], // Base flags added by service
        group: 'doc',
      });

      if (!result.ok) {
        logger.error('[specHandlers] executeSpecInit failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[specHandlers] executeSpecInit succeeded', { agentId: result.value.agentId, worktreeMode });
      return result.value;
    }
  );

  // ============================================================
  // Spec Plan - Launch spec-plan agent for interactive requirements generation
  // spec-plan-ui-integration feature
  // spec-worktree-early-creation: Task 4.2 - worktreeModeパラメータ追加
  // ============================================================
  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_SPEC_PLAN,
    async (
      event,
      projectPath: string,
      description: string,
      commandPrefix: CommandPrefix = 'kiro',
      worktreeMode: boolean = false
    ) => {
      logger.info('[specHandlers] EXECUTE_SPEC_PLAN called', { projectPath, description, commandPrefix, worktreeMode });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !getEventCallbacksRegistered()) {
        registerEventCallbacks(service, window);
      }

      // spec-worktree-early-creation: --worktreeフラグをコマンドに追加
      const worktreeFlag = worktreeMode ? ' --worktree' : '';

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
        args: [`${slashCommand} "${description}"${worktreeFlag}`], // Base flags added by service
        group: 'doc',
      });

      if (!result.ok) {
        logger.error('[specHandlers] executeSpecPlan failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[specHandlers] executeSpecPlan succeeded', { agentId: result.value.agentId, worktreeMode });
      return result.value;
    }
  );

  // ============================================================
  // Ask Agent Execution (agent-ask-execution feature)
  // Requirements: 2.5, 3.1-3.4, 4.1-4.5, 5.1-5.6
  // NOTE: EXECUTE_ASK_PROJECT has been removed (Requirement 4.4)
  // Use EXECUTE_PROJECT_COMMAND in handlers.ts instead with '/kiro:project-ask "${prompt}"'
  // ============================================================

  // Execute Spec Ask: Launch spec-ask agent with feature name and prompt
  // Loads steering files and spec files as context
  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_ASK_SPEC,
    async (event, specId: string, featureName: string, prompt: string, commandPrefix: CommandPrefix = 'kiro') => {
      logger.info('[specHandlers] EXECUTE_ASK_SPEC called', { specId, featureName, prompt: prompt.substring(0, 100), commandPrefix });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !getEventCallbacksRegistered()) {
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
        logger.error('[specHandlers] executeAskSpec failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[specHandlers] executeAskSpec succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  // ============================================================
  // Document Review Handlers
  // ============================================================

  // Document Review Sync Handler - Auto-fix spec.json documentReview based on file system
  // spec-path-ssot-refactor: Change from specPath to specName
  // Main process resolves path using resolveSpecPath
  ipcMain.handle(
    IPC_CHANNELS.SYNC_DOCUMENT_REVIEW,
    async (_event, specName: string) => {
      logger.info('[specHandlers] SYNC_DOCUMENT_REVIEW called', { specName });
      const currentProjectPath = getCurrentProjectPath();
      if (!currentProjectPath) {
        throw new Error('Project not selected');
      }
      const specPathResult = await fileService.resolveSpecPath(currentProjectPath, specName);
      if (!specPathResult.ok) {
        throw new Error(`Spec not found: ${specName}`);
      }
      const { DocumentReviewService } = await import('../services/documentReviewService');
      const service = new DocumentReviewService(currentProjectPath);
      return service.syncReviewState(specPathResult.value);
    }
  );

  // execute-method-unification: Delegate to unified execute method
  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_DOCUMENT_REVIEW,
    async (event, specId: string, featureName: string, commandPrefix?: 'kiro' | 'spec-manager') => {
      logger.info('[specHandlers] EXECUTE_DOCUMENT_REVIEW called (delegating to execute)', { specId, featureName, commandPrefix });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !getEventCallbacksRegistered()) {
        registerEventCallbacks(service, window);
      }

      const result = await service.execute({ type: 'document-review', specId, featureName, commandPrefix });

      if (!result.ok) {
        logger.error('[specHandlers] execute failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[specHandlers] execute succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_DOCUMENT_REVIEW_REPLY,
    async (event, specId: string, featureName: string, reviewNumber: number, commandPrefix?: 'kiro' | 'spec-manager', autofix?: boolean) => {
      logger.info('[specHandlers] EXECUTE_DOCUMENT_REVIEW_REPLY called (delegating to execute)', { specId, featureName, reviewNumber, commandPrefix, autofix });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !getEventCallbacksRegistered()) {
        registerEventCallbacks(service, window);
      }

      const result = await service.execute({ type: 'document-review-reply', specId, featureName, reviewNumber, commandPrefix, autofix });

      if (!result.ok) {
        logger.error('[specHandlers] execute failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[specHandlers] execute succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_DOCUMENT_REVIEW_FIX,
    async (event, specId: string, featureName: string, reviewNumber: number, commandPrefix?: 'kiro' | 'spec-manager') => {
      logger.info('[specHandlers] EXECUTE_DOCUMENT_REVIEW_FIX called (delegating to execute)', { specId, featureName, reviewNumber, commandPrefix });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !getEventCallbacksRegistered()) {
        registerEventCallbacks(service, window);
      }

      const result = await service.execute({ type: 'document-review-fix', specId, featureName, reviewNumber, commandPrefix });

      if (!result.ok) {
        logger.error('[specHandlers] execute failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[specHandlers] execute succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.APPROVE_DOCUMENT_REVIEW,
    async (_event, specPath: string) => {
      logger.info('[specHandlers] APPROVE_DOCUMENT_REVIEW called', { specPath });
      const { DocumentReviewService } = await import('../services/documentReviewService');
      const currentProjectPath = getCurrentProjectPath();
      const service = new DocumentReviewService(currentProjectPath || '');
      const result = await service.approveReview(specPath);
      if (!result.ok) {
        throw new Error(`Failed to approve document review: ${result.error.type}`);
      }
    }
  );

  // document-review-skip-removal: SKIP_DOCUMENT_REVIEW handler removed

  // ============================================================
  // Inspection Workflow (inspection-workflow-ui feature)
  // Requirements: 4.2, 4.3, 4.5
  // ============================================================

  // execute-method-unification: Delegate to unified execute method
  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_INSPECTION,
    async (event, specId: string, featureName: string, commandPrefix?: 'kiro' | 'spec-manager') => {
      logger.info('[specHandlers] EXECUTE_INSPECTION called (delegating to execute)', { specId, featureName, commandPrefix });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !getEventCallbacksRegistered()) {
        registerEventCallbacks(service, window);
      }

      const result = await service.execute({ type: 'inspection', specId, featureName, commandPrefix });

      if (!result.ok) {
        logger.error('[specHandlers] execute failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[specHandlers] execute succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_INSPECTION_FIX,
    async (event, specId: string, featureName: string, roundNumber: number, commandPrefix?: 'kiro' | 'spec-manager') => {
      logger.info('[specHandlers] EXECUTE_INSPECTION_FIX called (delegating to execute)', { specId, featureName, roundNumber, commandPrefix });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !getEventCallbacksRegistered()) {
        registerEventCallbacks(service, window);
      }

      const result = await service.execute({ type: 'inspection-fix', specId, featureName, roundNumber, commandPrefix });

      if (!result.ok) {
        logger.error('[specHandlers] execute failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[specHandlers] execute succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.SET_INSPECTION_AUTO_EXECUTION_FLAG,
    async (_event, specPath: string, flag: 'run' | 'pause') => {
      logger.info('[specHandlers] SET_INSPECTION_AUTO_EXECUTION_FLAG called', { specPath, flag });
      const service = getSpecManagerService();
      await service.setInspectionAutoExecutionFlag(specPath, flag);
      logger.info('[specHandlers] setInspectionAutoExecutionFlag succeeded', { specPath, flag });
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
      logger.info('[specHandlers] EXECUTE_SPEC_MERGE called (delegating to execute)', { specId, featureName, commandPrefix });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !getEventCallbacksRegistered()) {
        registerEventCallbacks(service, window);
      }

      const result = await service.execute({ type: 'spec-merge', specId, featureName, commandPrefix });

      if (!result.ok) {
        logger.error('[specHandlers] execute failed', { error: result.error });
        const errorMessage = getErrorMessage(result.error);
        throw new Error(errorMessage);
      }

      logger.info('[specHandlers] execute succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  // ============================================================
  // impl-start-unification: Unified impl start IPC
  // Task 2.2: IPC handler for startImpl
  // Requirements: 4.2, 4.4
  // Bug fix: start-impl-path-resolution-missing
  // spec-path-ssot-refactor: Resolve path from name
  // ============================================================
  ipcMain.handle(
    IPC_CHANNELS.START_IMPL,
    async (event, specName: string, featureName: string, commandPrefix: string) => {
      logger.info('[specHandlers] START_IMPL called', { specName, featureName, commandPrefix });

      const currentProjectPath = getCurrentProjectPath();
      if (!currentProjectPath) {
        return {
          ok: false,
          error: { type: 'SPEC_JSON_ERROR', message: 'Project not selected' },
        };
      }

      // spec-path-ssot-refactor: Resolve path from name
      const specPathResult = await fileService.resolveSpecPath(currentProjectPath, specName);
      if (!specPathResult.ok) {
        logger.error('[specHandlers] START_IMPL: spec not found', { specName });
        return {
          ok: false,
          error: { type: 'SPEC_JSON_ERROR', message: `Spec not found: ${specName}` },
        };
      }
      const specPath = specPathResult.value;

      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !getEventCallbacksRegistered()) {
        registerEventCallbacks(service, window);
      }

      // Import startImplPhase function
      const { startImplPhase } = await import('./startImplPhase');

      // Validate and cast commandPrefix
      const validPrefix = (commandPrefix === 'kiro' || commandPrefix === 'spec-manager')
        ? commandPrefix as CommandPrefix
        : 'kiro';

      // Call unified startImplPhase function
      const result = await startImplPhase({
        specPath,
        featureName,
        commandPrefix: validPrefix,
        specManagerService: service,
      });

      logger.info('[specHandlers] START_IMPL result', { specName, specPath, ok: result.ok });
      return result;
    }
  );

  // ============================================================
  // Event Log Handler (spec-event-log feature)
  // Requirements: 5.4
  // ============================================================
  ipcMain.handle(
    IPC_CHANNELS.EVENT_LOG_GET,
    async (_event, specId: string) => {
      logger.debug('[specHandlers] EVENT_LOG_GET called', { specId });

      const currentProjectPath = getCurrentProjectPath();
      if (!currentProjectPath) {
        logger.error('[specHandlers] EVENT_LOG_GET: No project path set');
        return { ok: false, error: { type: 'NOT_FOUND', specId } };
      }

      const eventLogService = getDefaultEventLogService();
      const result = await eventLogService.readEvents(currentProjectPath, specId);

      if (result.ok) {
        logger.debug('[specHandlers] EVENT_LOG_GET result', { specId, count: result.value.length });
      } else {
        logger.error('[specHandlers] EVENT_LOG_GET failed', { specId, error: result.error });
      }

      return result;
    }
  );

  // ============================================================
  // Parallel Task Parser (parallel-task-impl feature)
  // Requirements: 2.1 - Parse tasks.md for parallel execution
  // ============================================================
  ipcMain.handle(
    IPC_CHANNELS.PARSE_TASKS_FOR_PARALLEL,
    async (_event, specName: string): Promise<ParseResult | null> => {
      logger.debug('[specHandlers] PARSE_TASKS_FOR_PARALLEL called', { specName });

      const currentProjectPath = getCurrentProjectPath();
      if (!currentProjectPath) {
        logger.error('[specHandlers] PARSE_TASKS_FOR_PARALLEL: No project path set');
        return null;
      }

      try {
        // Resolve spec path and read tasks.md content
        const specPathResult = await fileService.resolveSpecPath(currentProjectPath, specName);
        if (!specPathResult.ok) {
          logger.warn('[specHandlers] PARSE_TASKS_FOR_PARALLEL: spec path resolution failed', { specName, error: specPathResult.error });
          return null;
        }

        const tasksPath = path.join(specPathResult.value, 'tasks.md');
        const tasksContentResult = await fileService.readArtifact(tasksPath);
        if (!tasksContentResult.ok) {
          logger.warn('[specHandlers] PARSE_TASKS_FOR_PARALLEL: tasks.md not found', { specName, tasksPath });
          return null;
        }

        // Parse and return result
        const result = parseTasksContent(tasksContentResult.value);
        logger.debug('[specHandlers] PARSE_TASKS_FOR_PARALLEL result', {
          specName,
          totalTasks: result.totalTasks,
          parallelTasks: result.parallelTasks,
          groupCount: result.groups.length,
        });

        return result;
      } catch (error) {
        logger.error('[specHandlers] PARSE_TASKS_FOR_PARALLEL failed', { specName, error });
        return null;
      }
    }
  );

  logger.info('[specHandlers] Spec handlers registered');
}

/**
 * Start or restart specs watcher for the current project
 * spec-worktree-early-creation: start() is now async
 */
export async function startSpecsWatcher(
  window: BrowserWindow,
  deps: SpecHandlersDependencies
): Promise<void> {
  const { fileService, getCurrentProjectPath } = deps;
  const currentProjectPath = getCurrentProjectPath();

  if (!currentProjectPath) {
    logger.warn('[specHandlers] Cannot start specs watcher: no project path set');
    return;
  }

  // Stop existing watcher if any
  if (specsWatcherService) {
    await specsWatcherService.stop();
  }

  specsWatcherService = new SpecsWatcherService(currentProjectPath, fileService);

  specsWatcherService.onChange(async (event) => {
    logger.info('[specHandlers] Specs changed', { event });
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.SPECS_CHANGED, event);
    }

    // spec-productivity-metrics: Task 4.1 - Start lifecycle on new spec creation
    // Requirements: 3.1 (lifecycle measurement)
    // When spec.json is added (new spec created), start the lifecycle
    if (event.type === 'add' && event.path.endsWith('spec.json') && event.specId) {
      const metricsService = getDefaultMetricsService();
      await metricsService.startSpecLifecycle(event.specId);
      logger.debug('[specHandlers] Spec lifecycle started', { specId: event.specId });
    }
  });

  await specsWatcherService.start();
  logger.info('[specHandlers] Specs watcher started', { projectPath: currentProjectPath });
}

/**
 * Stop specs watcher
 */
export async function stopSpecsWatcher(): Promise<void> {
  if (specsWatcherService) {
    await specsWatcherService.stop();
    specsWatcherService = null;
    logger.info('[specHandlers] Specs watcher stopped');
  }
}
