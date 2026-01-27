/**
 * AgentLifecycleManager - Centralized agent lifecycle management
 * Requirements: 1.1, 1.3, 1.4, 1.5, 3.1-3.5, 5.1-5.5, 6.3, 9.1, 9.2
 *
 * Manages the complete lifecycle of agents:
 * - Starting agents (spawning, running)
 * - Monitoring agents (event-driven, watchdog)
 * - Stopping agents (graceful shutdown with SIGTERM/SIGKILL)
 * - Synchronizing state on app startup
 */

import { EventEmitter } from 'events';
import { spawn, type ChildProcess } from 'child_process';
import { StandardAgentHandle, type AgentHandle } from './agentHandle';
import type { AgentRegistry } from './agentRegistry';
import type { ProcessUtils } from './processUtils';
import type { StopReason, ExitReason } from './agentLifecycleTypes';
import type { AgentRecord } from './agentRecordService';

/**
 * Interface for AgentRecordStore operations
 */
export interface IAgentRecordStore {
  readAllRecords(): Promise<AgentRecord[]>;
  createRecord(record: AgentRecord): Promise<void>;
  updateRecord(agentId: string, updates: Partial<AgentRecord>): Promise<void>;
}

/**
 * Result of synchronization operation
 */
export interface SyncResult {
  totalRecords: number;
  reattached: number;
  markedInterrupted: number;
  pidReused: number;
}

/**
 * Options for starting an agent
 */
export interface StartAgentOptions {
  agentId: string;
  specId: string;
  phase: string;
  sessionId: string;
  command: string;
  args: string[];
  cwd: string;
  prompt?: string;
  spawn?: typeof spawn; // For testing
}

/**
 * Result type for operations
 */
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Agent error type
 */
export type AgentError = string;

/**
 * AgentLifecycleManager events
 */
export interface AgentLifecycleManagerEvents {
  'agent-state-changed': (agentId: string, oldState: string, newState: string) => void;
  'agent-started': (agentId: string, handle: AgentHandle) => void;
  'agent-stopped': (agentId: string, reason: StopReason, exitReason: ExitReason) => void;
  'agent-state-synced': () => void;
}

/**
 * AgentLifecycleManager
 * Centralized manager for agent process lifecycle
 * Requirements: 1.1, 1.3
 */
export class AgentLifecycleManager extends EventEmitter {
  private registry: AgentRegistry;
  private processUtils: ProcessUtils;
  private recordStore: IAgentRecordStore;

  constructor(
    registry: AgentRegistry,
    processUtils: ProcessUtils,
    recordStore: IAgentRecordStore
  ) {
    super();
    this.registry = registry;
    this.processUtils = processUtils;
    this.recordStore = recordStore;
  }

  /**
   * Start an agent
   * Requirements: 1.1, 1.4, 4.2, 9.1
   * @param options - Start agent options
   * @returns Result with AgentHandle or error
   */
  async startAgent(options: StartAgentOptions): Promise<Result<AgentHandle, AgentError>> {
    const { agentId, specId, phase, sessionId, command, args, cwd, prompt } = options;
    const spawnFn = options.spawn || spawn;

    console.log(`[AgentLifecycleManager] Starting agent ${agentId} for spec ${specId}, phase ${phase}`);

    try {
      // Spawn the process
      const childProcess = spawnFn(command, args, { cwd });

      if (!childProcess.pid) {
        return { ok: false, error: 'Failed to spawn process: no PID assigned' };
      }

      const pid = childProcess.pid;
      const startedAt = new Date().toISOString();

      // Get process start time (Requirement: 4.2)
      const processStartTime = this.processUtils.getProcessStartTime(pid);
      if (!processStartTime) {
        console.warn(`[AgentLifecycleManager] Could not get process start time for PID ${pid}`);
      }

      // Create agent handle
      const handle = new StandardAgentHandle(
        agentId,
        specId,
        phase,
        pid,
        sessionId,
        'running', // State transitions: spawning -> running
        startedAt,
        processStartTime,
        null, // exitReason
        childProcess
      );

      // Register in registry (In-Memory SSOT)
      this.registry.register(handle);

      // Create record in store (File persistence)
      const record: AgentRecord = {
        agentId,
        specId,
        phase,
        pid,
        sessionId,
        status: 'running',
        startedAt,
        lastActivityAt: startedAt,
        command: `${command} ${args.join(' ')}`,
        cwd,
        prompt,
        processStartTime: processStartTime || undefined,
      };

      await this.recordStore.createRecord(record);

      // Requirement: 9.1 - Layer 1: Event-driven monitoring
      // Register exit listener
      childProcess.on('exit', (code) => {
        this.handleAgentExit(agentId, code);
      });

      // Register error listener
      childProcess.on('error', (error) => {
        this.handleAgentError(agentId, error);
      });

      // Emit agent-started event
      this.emit('agent-started', agentId, handle);

      console.log(`[AgentLifecycleManager] Agent ${agentId} started with PID ${pid}`);

      return { ok: true, value: handle };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[AgentLifecycleManager] Failed to start agent ${agentId}:`, errorMessage);
      return { ok: false, error: `Failed to start agent: ${errorMessage}` };
    }
  }

  /**
   * Handle agent exit event
   * @param agentId - Agent ID
   * @param code - Exit code
   */
  private async handleAgentExit(agentId: string, code: number | null): Promise<void> {
    console.log(`[AgentLifecycleManager] Agent ${agentId} exited with code ${code}`);

    const handle = this.registry.get(agentId);
    if (!handle) {
      console.warn(`[AgentLifecycleManager] Agent ${agentId} not found in registry`);
      return;
    }

    // Clear any pending kill timeout
    const killTimeout = (handle as any).killTimeout;
    if (killTimeout) {
      clearTimeout(killTimeout);
    }

    // Determine exit reason based on code and current state
    let exitReason: ExitReason;
    if (handle.state === 'stopping' || handle.state === 'killing') {
      exitReason = 'stopped_by_user';
    } else if (code === 0) {
      exitReason = 'completed';
    } else {
      exitReason = 'failed';
    }

    // Update state
    handle.state = code === 0 ? 'completed' : 'failed';
    handle.exitReason = exitReason;

    // Update record
    await this.recordStore.updateRecord(agentId, {
      status: code === 0 ? 'completed' : 'failed',
      exitReason,
      lastActivityAt: new Date().toISOString(),
    });

    // Emit event
    this.emit('agent-stopped', agentId, 'phase_complete', exitReason);

    // Unregister from registry (terminal state)
    this.registry.unregister(agentId);
  }

  /**
   * Handle agent error event
   * @param agentId - Agent ID
   * @param error - Error object
   */
  private async handleAgentError(agentId: string, error: Error): Promise<void> {
    console.error(`[AgentLifecycleManager] Agent ${agentId} error:`, error);

    const handle = this.registry.get(agentId);
    if (!handle) {
      return;
    }

    // Update state to failed
    handle.state = 'failed';
    handle.exitReason = 'crashed';

    await this.recordStore.updateRecord(agentId, {
      status: 'failed',
      exitReason: 'crashed',
      lastActivityAt: new Date().toISOString(),
    });

    this.emit('agent-stopped', agentId, 'error', 'crashed');
    this.registry.unregister(agentId);
  }

  /**
   * Stop an agent with graceful shutdown
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   * @param agentId - Agent ID
   * @param reason - Stop reason
   * @returns Result with void or error
   */
  async stopAgent(agentId: string, reason: StopReason): Promise<Result<void, AgentError>> {
    console.log(`[AgentLifecycleManager] Stopping agent ${agentId}, reason: ${reason}`);

    const handle = this.registry.get(agentId);
    if (!handle) {
      return { ok: false, error: `Agent ${agentId} not found` };
    }

    // Cannot gracefully stop reattached agents
    if (handle.isReattached) {
      return { ok: false, error: `Cannot gracefully stop reattached agent ${agentId}, use killAgent instead` };
    }

    // Get the process
    const standardHandle = handle as any;
    const childProcess = standardHandle.getProcess?.() as ChildProcess | undefined;
    if (!childProcess) {
      return { ok: false, error: `Cannot get process for agent ${agentId}` };
    }

    // Requirement: 3.1 - Update state based on reason
    if (reason === 'timeout') {
      handle.state = 'timed_out';
      await this.recordStore.updateRecord(agentId, {
        status: 'timed_out',
        lastActivityAt: new Date().toISOString(),
      });
    }

    // Requirement: 3.2 - Send SIGTERM and update state to stopping
    handle.state = 'stopping';
    await this.recordStore.updateRecord(agentId, {
      status: 'stopping',
      lastActivityAt: new Date().toISOString(),
    });

    try {
      childProcess.kill('SIGTERM');
      console.log(`[AgentLifecycleManager] Sent SIGTERM to agent ${agentId} (PID ${handle.pid})`);
    } catch (error) {
      console.error(`[AgentLifecycleManager] Failed to send SIGTERM to agent ${agentId}:`, error);
    }

    // Requirement: 3.3 - Set 10 second grace period, then SIGKILL
    const gracePeriodMs = 10000; // 10 seconds
    const killTimeout = setTimeout(async () => {
      // Check if process still exists
      if (this.processUtils.checkProcessAlive(handle.pid)) {
        console.log(`[AgentLifecycleManager] Grace period exceeded for agent ${agentId}, sending SIGKILL`);

        handle.state = 'killing';
        await this.recordStore.updateRecord(agentId, {
          status: 'killing',
          lastActivityAt: new Date().toISOString(),
        });

        try {
          childProcess.kill('SIGKILL');
          console.log(`[AgentLifecycleManager] Sent SIGKILL to agent ${agentId} (PID ${handle.pid})`);
        } catch (error) {
          console.error(`[AgentLifecycleManager] Failed to send SIGKILL to agent ${agentId}:`, error);
        }

        // Requirement: 3.4 - Verify termination
        // Wait a bit and verify process is dead
        setTimeout(() => {
          if (!this.processUtils.checkProcessAlive(handle.pid)) {
            console.log(`[AgentLifecycleManager] Agent ${agentId} confirmed terminated`);
            this.finalizeAgentStop(agentId, 'stopped_by_user');
          }
        }, 1000);
      }
    }, gracePeriodMs);

    // Store timeout ID for cleanup
    (handle as any).killTimeout = killTimeout;

    return { ok: true, value: undefined };
  }

  /**
   * Finalize agent stop (transition to terminal state)
   * @param agentId - Agent ID
   * @param exitReason - Exit reason
   */
  private async finalizeAgentStop(agentId: string, exitReason: ExitReason): Promise<void> {
    const handle = this.registry.get(agentId);
    if (!handle) {
      return;
    }

    // Clear any pending kill timeout
    const killTimeout = (handle as any).killTimeout;
    if (killTimeout) {
      clearTimeout(killTimeout);
    }

    handle.state = 'stopped';
    handle.exitReason = exitReason;

    await this.recordStore.updateRecord(agentId, {
      status: 'stopped',
      exitReason,
      lastActivityAt: new Date().toISOString(),
    });

    // Requirement: 2.4 - Terminal state: unregister from registry
    this.registry.unregister(agentId);

    console.log(`[AgentLifecycleManager] Agent ${agentId} finalized with exit reason: ${exitReason}`);
  }

  /**
   * Kill an agent immediately with SIGKILL
   * Requirements: 6.3
   * @param agentId - Agent ID
   * @returns Result with void or error
   */
  async killAgent(agentId: string): Promise<Result<void, AgentError>> {
    console.log(`[AgentLifecycleManager] Killing agent ${agentId} (SIGKILL)`);

    const handle = this.registry.get(agentId);
    if (!handle) {
      return { ok: false, error: `Agent ${agentId} not found` };
    }

    // Update state to killing
    handle.state = 'killing';
    await this.recordStore.updateRecord(agentId, {
      status: 'killing',
      lastActivityAt: new Date().toISOString(),
    });

    try {
      // For reattached agents, use process.kill directly with PID
      if (handle.isReattached) {
        process.kill(handle.pid, 'SIGKILL');
        console.log(`[AgentLifecycleManager] Sent SIGKILL to reattached agent ${agentId} (PID ${handle.pid})`);

        // Wait and verify termination
        setTimeout(async () => {
          if (!this.processUtils.checkProcessAlive(handle.pid)) {
            await this.finalizeAgentStop(agentId, 'stopped_by_user');
          }
        }, 1000);
      } else {
        // For normal agents, use ChildProcess.kill
        const standardHandle = handle as any;
        const childProcess = standardHandle.getProcess?.() as ChildProcess | undefined;
        if (childProcess) {
          childProcess.kill('SIGKILL');
          console.log(`[AgentLifecycleManager] Sent SIGKILL to agent ${agentId} (PID ${handle.pid})`);
        }
      }

      return { ok: true, value: undefined };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[AgentLifecycleManager] Failed to kill agent ${agentId}:`, errorMessage);
      return { ok: false, error: `Failed to kill agent: ${errorMessage}` };
    }
  }

  /**
   * Get agent by ID
   * @param agentId - Agent ID
   * @returns AgentHandle or null
   */
  getAgent(agentId: string): AgentHandle | null {
    return this.registry.get(agentId) || null;
  }

  /**
   * Get all agents
   * @returns Array of AgentHandles
   */
  getAllAgents(): AgentHandle[] {
    return this.registry.getAll();
  }

  /**
   * Get agents by spec ID
   * @param specId - Spec ID
   * @returns Array of AgentHandles for the spec
   */
  getAgentsBySpec(specId: string): AgentHandle[] {
    return this.registry.getBySpec(specId);
  }

  /**
   * Synchronize agent state on app startup
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 4.5
   * @returns Synchronization result
   */
  async synchronizeOnStartup(): Promise<SyncResult> {
    console.log('[AgentLifecycleManager] Starting state synchronization...');

    const records = await this.recordStore.readAllRecords();

    const result: SyncResult = {
      totalRecords: records.length,
      reattached: 0,
      markedInterrupted: 0,
      pidReused: 0,
    };

    for (const record of records) {
      // Skip already terminated agents
      if (
        record.status === 'completed' ||
        record.status === 'failed' ||
        record.status === 'interrupted'
      ) {
        continue;
      }

      const isAlive = this.processUtils.checkProcessAlive(record.pid);

      if (!isAlive) {
        // Requirement: 5.2 - Process not alive
        console.log(
          `[AgentLifecycleManager] Agent ${record.agentId} (PID ${record.pid}) not alive, marking as interrupted`
        );
        await this.recordStore.updateRecord(record.agentId, {
          status: 'interrupted',
          exitReason: 'exited_while_app_closed',
          lastActivityAt: new Date().toISOString(),
        });
        result.markedInterrupted++;
        continue;
      }

      // Process is alive - check if it's the same process
      if (record.processStartTime) {
        // Requirement: 5.3 - PID reuse detection
        const isSame = this.processUtils.isSameProcess(record.pid, record.processStartTime);
        if (!isSame) {
          console.log(
            `[AgentLifecycleManager] Agent ${record.agentId} (PID ${record.pid}) has different start time, marking as PID reused`
          );
          await this.recordStore.updateRecord(record.agentId, {
            status: 'interrupted',
            exitReason: 'pid_reused',
            lastActivityAt: new Date().toISOString(),
          });
          result.pidReused++;
          continue;
        }
      } else {
        // Requirement: 4.5 - Backward compatibility warning
        console.warn(
          `[AgentLifecycleManager] Agent ${record.agentId} has no processStartTime, cannot verify PID reuse (backward compatibility mode)`
        );
      }

      // Requirement: 5.4 - Process continues, register as reattached
      console.log(
        `[AgentLifecycleManager] Agent ${record.agentId} (PID ${record.pid}) still running, registering as reattached`
      );
      this.registry.registerReattached(record);
      result.reattached++;
    }

    // Requirement: 5.5 - Emit sync complete event
    this.emit('agent-state-synced');
    console.log('[AgentLifecycleManager] State synchronization complete', result);

    return result;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.removeAllListeners();
  }

  // Type-safe event emitter methods
  on<K extends keyof AgentLifecycleManagerEvents>(
    event: K,
    listener: AgentLifecycleManagerEvents[K]
  ): this {
    return super.on(event, listener);
  }

  emit<K extends keyof AgentLifecycleManagerEvents>(
    event: K,
    ...args: Parameters<AgentLifecycleManagerEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}
