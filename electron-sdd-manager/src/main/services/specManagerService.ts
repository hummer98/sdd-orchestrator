/**
 * SpecManagerService
 * Manages multiple Spec Managers and their SDD Agents
 * Requirements: 3.1, 3.2, 3.6, 5.1, 5.6, 5.7, 5.8, 6.1, 6.5, 10.1, 10.2
 */

import * as path from 'path';
import * as crypto from 'crypto';
import { AgentRegistry, AgentInfo, AgentStatus } from './agentRegistry';
import { createAgentProcess, AgentProcess } from './agentProcess';
import { AgentRecordService } from './agentRecordService';
import { LogFileService, LogEntry } from './logFileService';
import { LogParserService, ResultSubtype } from './logParserService';
import { ImplCompletionAnalyzer, CheckImplResult, createImplCompletionAnalyzer, AnalyzeError } from './implCompletionAnalyzer';
import { FileService } from './fileService';
import { logger } from './logger';

/** Maximum number of continue retries */
export const MAX_CONTINUE_RETRIES = 2;

export type ExecutionGroup = 'doc' | 'validate' | 'impl';

/** ワークフローフェーズ */
export type WorkflowPhase = 'requirements' | 'design' | 'tasks' | 'impl' | 'inspection' | 'deploy';

/** バリデーションタイプ */
export type ValidationType = 'gap' | 'design' | 'impl';

/** フェーズ実行コマンドマッピング */
const PHASE_COMMANDS: Record<WorkflowPhase, string> = {
  requirements: '/kiro:spec-requirements',
  design: '/kiro:spec-design',
  tasks: '/kiro:spec-tasks',
  impl: '/kiro:spec-impl',
  inspection: '/kiro:validate-impl',
  deploy: '/kiro:deployment',
};

/** バリデーションコマンドマッピング */
const VALIDATION_COMMANDS: Record<ValidationType, string> = {
  gap: '/kiro:validate-gap',
  design: '/kiro:validate-design',
  impl: '/kiro:validate-impl',
};

/** フェーズからExecutionGroupへのマッピング */
const PHASE_GROUPS: Record<WorkflowPhase, ExecutionGroup> = {
  requirements: 'doc',
  design: 'doc',
  tasks: 'doc',
  impl: 'impl',
  inspection: 'validate',
  deploy: 'doc',
};

export interface StartAgentOptions {
  specId: string;
  phase: string;
  command: string;
  args: string[];
  group?: ExecutionGroup;
  sessionId?: string;
}

export interface ExecutePhaseOptions {
  specId: string;
  phase: WorkflowPhase;
  featureName: string;
}

export interface ExecuteValidationOptions {
  specId: string;
  type: ValidationType;
  featureName: string;
}

export interface ExecuteTaskImplOptions {
  specId: string;
  featureName: string;
  taskId: string;
}

/** spec-manager用フェーズタイプ */
export type SpecManagerPhase = 'requirements' | 'design' | 'tasks' | 'impl';

/** impl用タスクステータス */
export type ImplTaskStatus =
  | 'pending'      // 未実行
  | 'running'      // 実行中
  | 'continuing'   // continue中（リトライ中）
  | 'success'      // 完了
  | 'error'        // エラー終了
  | 'stalled';     // リトライ上限到達（完了報告なし）

/** spec-manager用コマンド実行オプション */
export interface ExecuteSpecManagerOptions {
  readonly specId: string;
  readonly phase: SpecManagerPhase;
  readonly featureName: string;
  readonly taskId?: string; // impl時のみ
  readonly executionMode: 'auto' | 'manual';
}

/** impl実行結果 */
export interface ExecuteImplResult {
  readonly status: ImplTaskStatus;
  readonly completedTasks: readonly string[];
  readonly retryCount: number;
  readonly stats?: {
    readonly num_turns: number;
    readonly duration_ms: number;
    readonly total_cost_usd: number;
  };
}

/** spec-managerフェーズコマンドマッピング */
const SPEC_MANAGER_COMMANDS: Record<SpecManagerPhase, string> = {
  requirements: '/spec-manager:requirements',
  design: '/spec-manager:design',
  tasks: '/spec-manager:tasks',
  impl: '/spec-manager:impl',
};

export type AgentError =
  | { type: 'SPAWN_ERROR'; message: string }
  | { type: 'NOT_FOUND'; agentId: string }
  | { type: 'ALREADY_RUNNING'; specId: string; phase: string }
  | { type: 'SESSION_NOT_FOUND'; agentId: string }
  | { type: 'GROUP_CONFLICT'; runningGroup: ExecutionGroup; requestedGroup: ExecutionGroup }
  | { type: 'SPEC_MANAGER_LOCKED'; lockedBy: string }
  | { type: 'PARSE_ERROR'; message: string }
  | { type: 'ANALYZE_ERROR'; error: AnalyzeError };

export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Service for managing Spec Managers and their SDD Agents
 */
export class SpecManagerService {
  private registry: AgentRegistry;
  private recordService: AgentRecordService;
  private logService: LogFileService;
  private logParserService: LogParserService;
  private fileService: FileService;
  private implAnalyzer: ImplCompletionAnalyzer | null = null;
  private processes: Map<string, AgentProcess> = new Map();
  private projectPath: string;
  private outputCallbacks: ((agentId: string, stream: 'stdout' | 'stderr', data: string) => void)[] = [];
  private statusCallbacks: ((agentId: string, status: AgentStatus) => void)[] = [];

  // Mutex for spec-manager operations
  private specManagerLock: string | null = null;
  private specManagerLockPromise: Promise<void> | null = null;
  private specManagerLockResolve: (() => void) | null = null;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.registry = new AgentRegistry();
    this.recordService = new AgentRecordService(
      path.join(projectPath, '.kiro', 'runtime', 'agents')
    );
    // Log files are stored at .kiro/specs/{specId}/logs/{agentId}.log
    this.logService = new LogFileService(
      path.join(projectPath, '.kiro', 'specs')
    );
    this.logParserService = new LogParserService();
    this.fileService = new FileService();

    // Initialize ImplCompletionAnalyzer if API key is available
    const analyzerResult = createImplCompletionAnalyzer();
    if (analyzerResult.ok) {
      this.implAnalyzer = analyzerResult.value;
      logger.info('[SpecManagerService] ImplCompletionAnalyzer initialized');
    } else {
      logger.warn('[SpecManagerService] ImplCompletionAnalyzer not available', { error: analyzerResult.error });
    }
  }

  /**
   * Generate a unique agent ID
   */
  private generateAgentId(): string {
    return `agent-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  }

  /**
   * Get the currently running execution group
   */
  private getRunningGroup(): ExecutionGroup | null {
    const allAgents = this.registry.getAll();
    const runningAgents = allAgents.filter((a) => a.status === 'running');

    for (const agent of runningAgents) {
      // Check agent's phase to determine group
      if (agent.phase.startsWith('validate-')) {
        return 'validate';
      }
      if (agent.phase.startsWith('impl-')) {
        return 'impl';
      }
      if (['requirement', 'requirements', 'design', 'tasks'].includes(agent.phase)) {
        return 'doc';
      }
    }

    return null;
  }

  /**
   * Check if an agent is already running for the given spec and phase
   */
  private isPhaseRunning(specId: string, phase: string): boolean {
    const agents = this.registry.getBySpec(specId);
    return agents.some((a) => a.phase === phase && a.status === 'running');
  }

  /**
   * Start a new SDD Agent
   * Requirements: 5.1, 6.1
   */
  async startAgent(options: StartAgentOptions): Promise<Result<AgentInfo, AgentError>> {
    const { specId, phase, command, args, group, sessionId } = options;
    logger.info('[SpecManagerService] startAgent called', { specId, phase, command, args, group, sessionId });

    // Check if phase is already running
    if (this.isPhaseRunning(specId, phase)) {
      logger.warn('[SpecManagerService] Phase already running', { specId, phase });
      return {
        ok: false,
        error: { type: 'ALREADY_RUNNING', specId, phase },
      };
    }

    // Check for group conflicts (validate vs impl)
    if (group === 'validate' || group === 'impl') {
      const runningGroup = this.getRunningGroup();
      if (runningGroup && runningGroup !== group) {
        if ((runningGroup === 'validate' && group === 'impl') ||
            (runningGroup === 'impl' && group === 'validate')) {
          return {
            ok: false,
            error: { type: 'GROUP_CONFLICT', runningGroup, requestedGroup: group },
          };
        }
      }
    }

    const agentId = this.generateAgentId();
    const now = new Date().toISOString();

    try {
      logger.info('[SpecManagerService] Creating agent process', { agentId, command, args, cwd: this.projectPath });
      // Create the agent process
      const process = createAgentProcess({
        agentId,
        command,
        args,
        cwd: this.projectPath,
        sessionId,
      });
      logger.info('[SpecManagerService] Agent process created', { agentId, pid: process.pid });

      // Create agent info
      const agentInfo: AgentInfo = {
        agentId,
        specId,
        phase,
        pid: process.pid,
        sessionId: sessionId || '',
        status: 'running',
        startedAt: now,
        lastActivityAt: now,
        command: `${command} ${args.join(' ')}`,
      };

      // Register the agent
      this.registry.register(agentInfo);
      this.processes.set(agentId, process);

      // Write agent record
      await this.recordService.writeRecord({
        agentId,
        specId,
        phase,
        pid: process.pid,
        sessionId: sessionId || '',
        status: 'running',
        startedAt: now,
        lastActivityAt: now,
        command: `${command} ${args.join(' ')}`,
      });

      // Set up event handlers
      process.onOutput((stream, data) => {
        logger.debug('[SpecManagerService] Process output received', { agentId, stream, dataLength: data.length });
        this.registry.updateActivity(agentId);

        // Parse sessionId from Claude Code init message
        if (stream === 'stdout') {
          this.parseAndUpdateSessionId(agentId, specId, data);
        }

        // Save log to file
        const logEntry: LogEntry = {
          timestamp: new Date().toISOString(),
          stream,
          data,
        };
        this.logService.appendLog(specId, agentId, logEntry).catch((err) => {
          logger.warn('[SpecManagerService] Failed to write log file', { agentId, error: err.message });
        });

        logger.debug('[SpecManagerService] Calling output callbacks', { agentId, callbackCount: this.outputCallbacks.length });
        this.outputCallbacks.forEach((cb) => cb(agentId, stream, data));
      });

      process.onExit((code) => {
        // Check current status - if already interrupted (by stopAgent), don't change
        const currentAgent = this.registry.get(agentId);
        if (currentAgent?.status === 'interrupted') {
          this.processes.delete(agentId);
          return;
        }

        const newStatus: AgentStatus = code === 0 ? 'completed' : 'failed';
        this.registry.updateStatus(agentId, newStatus);
        this.statusCallbacks.forEach((cb) => cb(agentId, newStatus));
        this.processes.delete(agentId);

        // Update agent record
        this.recordService.updateRecord(specId, agentId, {
          status: newStatus,
          lastActivityAt: new Date().toISOString(),
        }).catch(() => {
          // Ignore errors when updating agent record on exit
        });
      });

      process.onError(() => {
        this.registry.updateStatus(agentId, 'failed');
        this.statusCallbacks.forEach((cb) => cb(agentId, 'failed'));
        this.processes.delete(agentId);

        // Update agent record on error
        this.recordService.updateRecord(specId, agentId, {
          status: 'failed',
          lastActivityAt: new Date().toISOString(),
        }).catch(() => {
          // Ignore errors when updating agent record on error
        });
      });

      return { ok: true, value: agentInfo };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'SPAWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Stop a running agent
   * Requirements: 5.1
   */
  async stopAgent(agentId: string): Promise<Result<void, AgentError>> {
    const agent = this.registry.get(agentId);
    if (!agent) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', agentId },
      };
    }

    const process = this.processes.get(agentId);
    if (process) {
      process.kill();
      this.processes.delete(agentId);
    }

    // Update status
    this.registry.updateStatus(agentId, 'interrupted');
    this.statusCallbacks.forEach((cb) => cb(agentId, 'interrupted'));

    // Update agent record
    try {
      await this.recordService.updateRecord(agent.specId, agentId, {
        status: 'interrupted',
        lastActivityAt: new Date().toISOString(),
      });
    } catch {
      // Ignore errors
    }

    return { ok: true, value: undefined };
  }

  /**
   * Stop all running agents
   */
  async stopAllAgents(): Promise<void> {
    const allAgents = this.registry.getAll();
    const runningAgents = allAgents.filter((a) => a.status === 'running');

    for (const agent of runningAgents) {
      await this.stopAgent(agent.agentId);
    }
  }

  /**
   * Restore agents from agent records after restart
   * Requirements: 5.6, 5.7
   * Now also restores completed/failed agents as history
   */
  async restoreAgents(): Promise<void> {
    const records = await this.recordService.readAllRecords();

    for (const record of records) {
      const isAlive = this.recordService.checkProcessAlive(record.pid);

      // Determine the correct status based on process state
      let status = record.status;
      if (!isAlive && record.status === 'running') {
        // Process died unexpectedly while running - mark as interrupted
        status = 'interrupted';
        console.log(`[SpecManagerService] Agent process died unexpectedly: ${record.agentId} (pid: ${record.pid}), marking as interrupted`);

        // Update the agent record with the new status
        await this.recordService.updateRecord(record.specId, record.agentId, {
          status: 'interrupted',
          lastActivityAt: new Date().toISOString(),
        }).catch(() => {
          // Ignore errors when updating agent record
        });
      }

      const agentInfo: AgentInfo = {
        agentId: record.agentId,
        specId: record.specId,
        phase: record.phase,
        pid: record.pid,
        sessionId: record.sessionId,
        status,
        startedAt: record.startedAt,
        lastActivityAt: record.lastActivityAt,
        command: record.command,
      };

      // Register all agents (including completed/failed) as history
      this.registry.register(agentInfo);
      console.log(`[SpecManagerService] Restored agent: ${record.agentId} (pid: ${record.pid}, status: ${status}, alive: ${isAlive})`);
    }
  }

  /**
   * Resume an interrupted agent
   * Requirements: 5.8
   */
  async resumeAgent(agentId: string): Promise<Result<AgentInfo, AgentError>> {
    const agent = this.registry.get(agentId);
    if (!agent) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', agentId },
      };
    }

    if (!agent.sessionId) {
      return {
        ok: false,
        error: { type: 'SESSION_NOT_FOUND', agentId },
      };
    }

    // Start a new agent with resume
    return this.startAgent({
      specId: agent.specId,
      phase: agent.phase,
      command: 'claude',
      args: ['-p', '--resume', agent.sessionId, '続けて'],
      sessionId: agent.sessionId,
    });
  }

  /**
   * Send input to a running agent's stdin
   * Requirements: 10.1, 10.2
   */
  sendInput(agentId: string, input: string): Result<void, AgentError> {
    const process = this.processes.get(agentId);
    if (!process) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', agentId },
      };
    }

    process.writeStdin(input);
    this.registry.updateActivity(agentId);

    return { ok: true, value: undefined };
  }

  /**
   * Get agents for a specific spec
   */
  getAgents(specId: string): AgentInfo[] {
    return this.registry.getBySpec(specId);
  }

  /**
   * Get all agents grouped by spec
   */
  getAllAgents(): Map<string, AgentInfo[]> {
    const result = new Map<string, AgentInfo[]>();
    const allAgents = this.registry.getAll();

    for (const agent of allAgents) {
      const existing = result.get(agent.specId) || [];
      existing.push(agent);
      result.set(agent.specId, existing);
    }

    return result;
  }

  /**
   * Register output callback
   */
  onOutput(callback: (agentId: string, stream: 'stdout' | 'stderr', data: string) => void): void {
    this.outputCallbacks.push(callback);
  }

  /**
   * Register status change callback
   */
  onStatusChange(callback: (agentId: string, status: AgentStatus) => void): void {
    this.statusCallbacks.push(callback);
  }

  /**
   * Execute a workflow phase
   * Builds the claude command internally
   */
  async executePhase(options: ExecutePhaseOptions): Promise<Result<AgentInfo, AgentError>> {
    const { specId, phase, featureName } = options;
    const slashCommand = PHASE_COMMANDS[phase];
    const group = PHASE_GROUPS[phase];

    logger.info('[SpecManagerService] executePhase called', { specId, phase, featureName, slashCommand, group });

    return this.startAgent({
      specId,
      phase,
      command: 'claude',
      args: ['-p', '--verbose', '--output-format', 'stream-json', `${slashCommand} ${featureName}`],
      group,
    });
  }

  /**
   * Execute a validation
   * Builds the claude command internally
   */
  async executeValidation(options: ExecuteValidationOptions): Promise<Result<AgentInfo, AgentError>> {
    const { specId, type, featureName } = options;
    const slashCommand = VALIDATION_COMMANDS[type];
    const phase = `validate-${type}`;

    logger.info('[SpecManagerService] executeValidation called', { specId, type, featureName, slashCommand });

    return this.startAgent({
      specId,
      phase,
      command: 'claude',
      args: ['-p', '--verbose', '--output-format', 'stream-json', `${slashCommand} ${featureName}`],
      group: 'validate',
    });
  }

  /**
   * Execute spec-status command
   */
  async executeSpecStatus(specId: string, featureName: string): Promise<Result<AgentInfo, AgentError>> {
    logger.info('[SpecManagerService] executeSpecStatus called', { specId, featureName });

    return this.startAgent({
      specId,
      phase: 'status',
      command: 'claude',
      args: ['-p', '--verbose', '--output-format', 'stream-json', `/kiro:spec-status ${featureName}`],
      group: 'doc',
    });
  }

  /**
   * Execute a specific task implementation
   * Builds the claude command with task ID: /kiro:spec-impl {featureName} {taskId}
   */
  async executeTaskImpl(options: ExecuteTaskImplOptions): Promise<Result<AgentInfo, AgentError>> {
    const { specId, featureName, taskId } = options;

    logger.info('[SpecManagerService] executeTaskImpl called', { specId, featureName, taskId });

    return this.startAgent({
      specId,
      phase: `impl-${taskId}`,
      command: 'claude',
      args: ['-p', '--verbose', '--output-format', 'stream-json', `/kiro:spec-impl ${featureName} ${taskId}`],
      group: 'impl',
    });
  }

  /**
   * Parse sessionId from Claude Code stream-json output
   * Claude Code outputs session_id in the first "system/init" message
   */
  private parseAndUpdateSessionId(agentId: string, specId: string, data: string): void {
    // Already have sessionId for this agent
    const agent = this.registry.get(agentId);
    if (agent?.sessionId) {
      return;
    }

    try {
      // Claude Code outputs JSON lines, try to parse each line
      const lines = data.split('\n').filter((line) => line.trim());
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          // Check for system/init message with session_id
          if (parsed.type === 'system' && parsed.subtype === 'init' && parsed.session_id) {
            logger.info('[SpecManagerService] Extracted sessionId from Claude Code output', {
              agentId,
              sessionId: parsed.session_id,
            });

            // Update registry
            this.registry.updateSessionId(agentId, parsed.session_id);

            // Update agent record
            this.recordService.updateRecord(specId, agentId, {
              sessionId: parsed.session_id,
            }).catch((err) => {
              logger.warn('[SpecManagerService] Failed to update agent record with sessionId', {
                agentId,
                error: err.message,
              });
            });

            return;
          }
        } catch {
          // Not valid JSON, skip this line
        }
      }
    } catch (err) {
      // Parsing error, ignore
      logger.debug('[SpecManagerService] Failed to parse output for sessionId', { agentId });
    }
  }

  // ============================================================
  // spec-manager Extensions
  // Requirements: 3.1, 3.2, 3.6, 5.1, 5.6, 5.7, 5.8
  // ============================================================

  /**
   * Check if a spec-manager operation is currently running
   * Requirements: 3.6
   */
  isSpecManagerOperationRunning(): boolean {
    return this.specManagerLock !== null;
  }

  /**
   * Acquire spec-manager lock for exclusive control
   * Requirements: 3.6
   */
  async acquireSpecManagerLock(lockId: string): Promise<Result<void, AgentError>> {
    if (this.specManagerLock !== null) {
      return {
        ok: false,
        error: { type: 'SPEC_MANAGER_LOCKED', lockedBy: this.specManagerLock },
      };
    }

    this.specManagerLock = lockId;
    this.specManagerLockPromise = new Promise((resolve) => {
      this.specManagerLockResolve = resolve;
    });

    logger.info('[SpecManagerService] Acquired spec-manager lock', { lockId });
    return { ok: true, value: undefined };
  }

  /**
   * Release spec-manager lock
   * Requirements: 3.6
   */
  releaseSpecManagerLock(lockId: string): void {
    if (this.specManagerLock === lockId) {
      this.specManagerLock = null;
      if (this.specManagerLockResolve) {
        this.specManagerLockResolve();
        this.specManagerLockResolve = null;
      }
      this.specManagerLockPromise = null;
      logger.info('[SpecManagerService] Released spec-manager lock', { lockId });
    }
  }

  /**
   * Execute spec-manager phase command
   * Requirements: 3.1, 3.2, 3.6, 5.1
   *
   * For requirements/design/tasks: uses LogParserService.parseResultSubtype for algorithmic determination
   * For impl: uses ImplCompletionAnalyzer.analyzeCompletion() for LLM analysis (Structured Output)
   */
  async executeSpecManagerPhase(
    options: ExecuteSpecManagerOptions
  ): Promise<Result<AgentInfo, AgentError>> {
    const { specId, phase, featureName, taskId, executionMode } = options;
    const lockId = `${specId}-${phase}-${Date.now()}`;

    logger.info('[SpecManagerService] executeSpecManagerPhase called', {
      specId,
      phase,
      featureName,
      taskId,
      executionMode,
    });

    // Acquire lock for exclusive control
    const lockResult = await this.acquireSpecManagerLock(lockId);
    if (!lockResult.ok) {
      return lockResult;
    }

    try {
      // Build command
      const slashCommand = SPEC_MANAGER_COMMANDS[phase];
      let commandArgs: string[];

      if (phase === 'impl' && taskId) {
        commandArgs = [
          '-p',
          '--verbose',
          '--output-format',
          'stream-json',
          `${slashCommand} ${featureName} ${taskId}`,
        ];
      } else {
        commandArgs = [
          '-p',
          '--verbose',
          '--output-format',
          'stream-json',
          `${slashCommand} ${featureName}`,
        ];
      }

      // Start agent
      const result = await this.startAgent({
        specId,
        phase: phase === 'impl' && taskId ? `spec-manager-impl-${taskId}` : `spec-manager-${phase}`,
        command: 'claude',
        args: commandArgs,
        group: phase === 'impl' ? 'impl' : 'doc',
      });

      if (!result.ok) {
        this.releaseSpecManagerLock(lockId);
        return result;
      }

      // Note: Lock will be released when the agent completes and completion is checked
      // For now, we release immediately after starting the agent
      // The completion checking will be done asynchronously via callbacks
      this.releaseSpecManagerLock(lockId);

      return result;
    } catch (error) {
      this.releaseSpecManagerLock(lockId);
      throw error;
    }
  }

  /**
   * Retry with continue for no_result detection
   * Requirements: 5.6, 5.7, 5.8
   *
   * @param sessionId - Original session ID to resume
   * @param retryCount - Current retry count (0-based)
   * @returns New AgentInfo if retrying, or { status: 'stalled' } if max retries exceeded
   */
  async retryWithContinue(
    sessionId: string,
    retryCount: number
  ): Promise<Result<AgentInfo | { status: 'stalled' }, AgentError>> {
    logger.info('[SpecManagerService] retryWithContinue called', { sessionId, retryCount });

    // Check if max retries exceeded
    if (retryCount >= MAX_CONTINUE_RETRIES) {
      logger.warn('[SpecManagerService] Max retries exceeded, returning stalled', {
        sessionId,
        retryCount,
        maxRetries: MAX_CONTINUE_RETRIES,
      });
      return { ok: true, value: { status: 'stalled' } };
    }

    // Find the original agent by sessionId
    const allAgents = this.registry.getAll();
    const originalAgent = allAgents.find((a) => a.sessionId === sessionId);

    if (!originalAgent) {
      return {
        ok: false,
        error: { type: 'SESSION_NOT_FOUND', agentId: sessionId },
      };
    }

    // Start a new agent with session resume and "continue" prompt
    return this.startAgent({
      specId: originalAgent.specId,
      phase: originalAgent.phase,
      command: 'claude',
      args: ['-p', '--resume', sessionId, 'continue'],
      sessionId,
    });
  }

  /**
   * Analyze impl completion using ImplCompletionAnalyzer
   * Requirements: 2.4, 5.1
   *
   * @param logPath - Path to the impl execution log
   * @returns CheckImplResult from ImplCompletionAnalyzer
   */
  async analyzeImplCompletion(
    logPath: string
  ): Promise<Result<CheckImplResult, AgentError>> {
    logger.info('[SpecManagerService] analyzeImplCompletion called', { logPath });

    // Check if analyzer is available
    if (!this.implAnalyzer) {
      return {
        ok: false,
        error: {
          type: 'ANALYZE_ERROR',
          error: { type: 'API_ERROR', message: 'ImplCompletionAnalyzer not initialized - API key may not be set' },
        },
      };
    }

    // Get result line from log
    const resultLineResult = await this.logParserService.getResultLine(logPath);
    if (!resultLineResult.ok) {
      return {
        ok: false,
        error: { type: 'PARSE_ERROR', message: `Failed to get result line: ${resultLineResult.error.type}` },
      };
    }

    // Get last assistant message from log
    const lastMessageResult = await this.logParserService.getLastAssistantMessage(logPath);
    if (!lastMessageResult.ok) {
      return {
        ok: false,
        error: { type: 'PARSE_ERROR', message: `Failed to get last assistant message: ${lastMessageResult.error.type}` },
      };
    }

    // Analyze using ImplCompletionAnalyzer
    const analyzeResult = await this.implAnalyzer.analyzeCompletion(
      resultLineResult.value,
      lastMessageResult.value
    );

    if (!analyzeResult.ok) {
      return {
        ok: false,
        error: { type: 'ANALYZE_ERROR', error: analyzeResult.error },
      };
    }

    return { ok: true, value: analyzeResult.value };
  }

  /**
   * Check completion status for a spec-manager phase
   * Requirements: 3.1, 3.2, 5.1
   *
   * For requirements/design/tasks: uses LogParserService.parseResultSubtype
   * For impl: uses analyzeImplCompletion
   */
  async checkSpecManagerCompletion(
    specId: string,
    phase: SpecManagerPhase,
    logPath: string
  ): Promise<Result<{ subtype: ResultSubtype; implResult?: CheckImplResult }, AgentError>> {
    logger.info('[SpecManagerService] checkSpecManagerCompletion called', { specId, phase, logPath });

    if (phase === 'impl') {
      // For impl, use ImplCompletionAnalyzer
      const implResult = await this.analyzeImplCompletion(logPath);
      if (!implResult.ok) {
        return implResult;
      }
      return { ok: true, value: { subtype: 'success', implResult: implResult.value } };
    } else {
      // For requirements/design/tasks, use LogParserService
      const subtypeResult = await this.logParserService.parseResultSubtype(logPath);
      if (!subtypeResult.ok) {
        return {
          ok: false,
          error: { type: 'PARSE_ERROR', message: `Failed to parse result subtype: ${subtypeResult.error.type}` },
        };
      }
      return { ok: true, value: { subtype: subtypeResult.value } };
    }
  }

  /**
   * Get log path for an agent
   */
  getAgentLogPath(specId: string, agentId: string): string {
    return path.join(this.projectPath, '.kiro', 'specs', specId, 'logs', `${agentId}.ndjson`);
  }
}
