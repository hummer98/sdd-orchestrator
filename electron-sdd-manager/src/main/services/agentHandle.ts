/**
 * AgentHandle - Interface for agent process operations
 * Requirements: 1.2, 6.1, 6.3
 */

import type { ChildProcess } from 'child_process';
import type { AgentState, ExitReason } from './agentLifecycleTypes';

/**
 * Agent handle interface
 * Provides unified interface for controlling both normal and reattached agents
 */
export interface AgentHandle {
  readonly agentId: string;
  readonly specId: string;
  readonly phase: string;
  readonly pid: number;
  readonly sessionId: string;
  state: AgentState; // Mutable for state transitions
  readonly isReattached: boolean;
  readonly startedAt: string;
  readonly processStartTime: string | null;
  exitReason: ExitReason | null; // Mutable for setting exit reason

  /**
   * Register callback for output events
   * Only available for normal agents (not reattached)
   */
  onOutput(callback: (stream: 'stdout' | 'stderr', data: string) => void): void;

  /**
   * Register callback for exit events
   * Available for both normal and reattached agents
   */
  onExit(callback: (code: number | null) => void): void;

  /**
   * Register callback for error events
   * Only available for normal agents (not reattached)
   */
  onError(callback: (error: Error) => void): void;
}

/**
 * Standard agent handle with full ChildProcess access
 * Requirement: 1.2
 */
export class StandardAgentHandle implements AgentHandle {
  constructor(
    public readonly agentId: string,
    public readonly specId: string,
    public readonly phase: string,
    public readonly pid: number,
    public readonly sessionId: string,
    public state: AgentState,
    public readonly startedAt: string,
    public processStartTime: string | null,
    public exitReason: ExitReason | null,
    private readonly process: ChildProcess
  ) {}

  get isReattached(): boolean {
    return false;
  }

  onOutput(callback: (stream: 'stdout' | 'stderr', data: string) => void): void {
    this.process.stdout?.on('data', (data: Buffer) => {
      callback('stdout', data.toString());
    });
    this.process.stderr?.on('data', (data: Buffer) => {
      callback('stderr', data.toString());
    });
  }

  onExit(callback: (code: number | null) => void): void {
    this.process.on('exit', callback);
  }

  onError(callback: (error: Error) => void): void {
    this.process.on('error', callback);
  }

  /**
   * Get the underlying child process (internal use only)
   */
  getProcess(): ChildProcess {
    return this.process;
  }
}

/**
 * Reattached agent handle with limited capabilities
 * Requirements: 6.1, 6.3
 *
 * Can only:
 * - Check PID liveness
 * - Force kill (SIGKILL)
 *
 * Cannot:
 * - Receive stdout/stderr
 * - Graceful shutdown
 */
export class ReattachedAgentHandle implements AgentHandle {
  constructor(
    public readonly agentId: string,
    public readonly specId: string,
    public readonly phase: string,
    public readonly pid: number,
    public readonly sessionId: string,
    public state: AgentState,
    public readonly startedAt: string,
    public processStartTime: string | null,
    public exitReason: ExitReason | null
  ) {}

  get isReattached(): boolean {
    return true;
  }

  onOutput(): void {
    // No-op: Cannot receive output from reattached processes
  }

  onExit(): void {
    // No-op: Cannot listen to exit events on reattached processes
  }

  onError(): void {
    // No-op: Cannot listen to error events on reattached processes
  }
}
