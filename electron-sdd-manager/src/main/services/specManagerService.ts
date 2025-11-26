/**
 * SpecManagerService
 * Manages multiple Spec Managers and their SDD Agents
 * Requirements: 5.1, 5.6, 5.7, 5.8, 6.1, 6.5, 10.1, 10.2
 */

import * as path from 'path';
import * as crypto from 'crypto';
import { AgentRegistry, AgentInfo, AgentStatus } from './agentRegistry';
import { createAgentProcess, AgentProcess } from './agentProcess';
import { PidFileService } from './pidFileService';
import { logger } from './logger';

export type ExecutionGroup = 'doc' | 'validate' | 'impl';

export interface StartAgentOptions {
  specId: string;
  phase: string;
  command: string;
  args: string[];
  group?: ExecutionGroup;
  sessionId?: string;
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
  private pidService: PidFileService;
  private processes: Map<string, AgentProcess> = new Map();
  private projectPath: string;
  private outputCallbacks: ((agentId: string, stream: 'stdout' | 'stderr', data: string) => void)[] = [];
  private statusCallbacks: ((agentId: string, status: AgentStatus) => void)[] = [];

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.registry = new AgentRegistry();
    this.pidService = new PidFileService(
      path.join(projectPath, '.kiro', 'runtime', 'agents')
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

      // Write PID file
      await this.pidService.writePidFile({
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

        // Update PID file
        this.pidService.updatePidFile(specId, agentId, {
          status: newStatus,
          lastActivityAt: new Date().toISOString(),
        }).catch(() => {
          // Ignore errors when updating PID file on exit
        });
      });

      process.onError(() => {
        this.registry.updateStatus(agentId, 'failed');
        this.statusCallbacks.forEach((cb) => cb(agentId, 'failed'));
        this.processes.delete(agentId);
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

    // Update PID file
    try {
      await this.pidService.updatePidFile(agent.specId, agentId, {
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
   * Restore agents from PID files after restart
   * Requirements: 5.6, 5.7
   */
  async restoreAgents(): Promise<void> {
    const pidFiles = await this.pidService.readAllPidFiles();

    for (const pidFile of pidFiles) {
      const isAlive = this.pidService.checkProcessAlive(pidFile.pid);

      // If process is dead, delete the PID file and skip registration
      if (!isAlive) {
        console.log(`[SpecManagerService] Cleaning up stale PID file for agent: ${pidFile.agentId} (pid: ${pidFile.pid})`);
        await this.pidService.deletePidFile(pidFile.specId, pidFile.agentId);
        continue;
      }

      const agentInfo: AgentInfo = {
        agentId: pidFile.agentId,
        specId: pidFile.specId,
        phase: pidFile.phase,
        pid: pidFile.pid,
        sessionId: pidFile.sessionId,
        status: pidFile.status,
        startedAt: pidFile.startedAt,
        lastActivityAt: pidFile.lastActivityAt,
        command: pidFile.command,
      };

      this.registry.register(agentInfo);
      console.log(`[SpecManagerService] Restored agent: ${pidFile.agentId} (pid: ${pidFile.pid}, status: ${pidFile.status})`);
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
}
