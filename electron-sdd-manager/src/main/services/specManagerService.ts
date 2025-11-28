/**
 * SpecManagerService
 * Manages multiple Spec Managers and their SDD Agents
 * Requirements: 5.1, 5.6, 5.7, 5.8, 6.1, 6.5, 10.1, 10.2
 */

import * as path from 'path';
import * as crypto from 'crypto';
import { AgentRegistry, AgentInfo, AgentStatus } from './agentRegistry';
import { createAgentProcess, AgentProcess } from './agentProcess';
import { AgentRecordService } from './agentRecordService';
import { LogFileService, LogEntry } from './logFileService';
import { logger } from './logger';

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

export type AgentError =
  | { type: 'SPAWN_ERROR'; message: string }
  | { type: 'NOT_FOUND'; agentId: string }
  | { type: 'ALREADY_RUNNING'; specId: string; phase: string }
  | { type: 'SESSION_NOT_FOUND'; agentId: string }
  | { type: 'GROUP_CONFLICT'; runningGroup: ExecutionGroup; requestedGroup: ExecutionGroup };

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
  private processes: Map<string, AgentProcess> = new Map();
  private projectPath: string;
  private outputCallbacks: ((agentId: string, stream: 'stdout' | 'stderr', data: string) => void)[] = [];
  private statusCallbacks: ((agentId: string, status: AgentStatus) => void)[] = [];

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
}
