/**
 * AgentProcess Service
 * Manages individual SDD Agent process lifecycle
 * Requirements: 5.1, 9.1, 9.4, 9.6, 10.1, 10.2
 */

import { spawn, ChildProcess } from 'child_process';
import { logger } from './logger';

/**
 * Get the command to use for Claude CLI
 * Supports E2E testing by allowing mock command via environment variable
 *
 * @returns The command path (default: 'claude', or E2E_MOCK_CLAUDE_COMMAND if set)
 */
export function getClaudeCommand(): string {
  return process.env.E2E_MOCK_CLAUDE_COMMAND || 'claude';
}

export interface AgentProcessOptions {
  readonly agentId: string;
  readonly command: string;
  readonly args: string[];
  readonly cwd: string;
  readonly sessionId?: string;
}

export interface AgentProcess {
  readonly agentId: string;
  readonly pid: number;
  readonly sessionId: string;
  readonly isRunning: boolean;

  writeStdin(input: string): void;
  kill(): void;
  onOutput(callback: (stream: 'stdout' | 'stderr', data: string) => void): void;
  onExit(callback: (code: number) => void): void;
  onError(callback: (error: Error) => void): void;
}

/**
 * Implementation of AgentProcess
 */
class AgentProcessImpl implements AgentProcess {
  readonly agentId: string;
  readonly sessionId: string;

  private process: ChildProcess;
  private outputCallbacks: ((stream: 'stdout' | 'stderr', data: string) => void)[] = [];
  private exitCallbacks: ((code: number) => void)[] = [];
  private errorCallbacks: ((error: Error) => void)[] = [];
  private _isRunning: boolean = true;

  // Buffer for stdout to handle chunked JSONL output
  // Claude CLI outputs stream-json format (one JSON per line)
  // but Node.js stdout may split data at arbitrary byte boundaries
  private stdoutBuffer: string = '';

  constructor(options: AgentProcessOptions) {
    this.agentId = options.agentId;
    this.sessionId = options.sessionId ?? '';

    logger.info('[AgentProcess] Spawning process', { agentId: this.agentId, command: options.command, args: options.args, cwd: options.cwd });
    // Note: Using shell: false for proper stdio handling
    // The command must be resolvable in PATH
    // stdin: 'pipe' and immediately close it to signal EOF
    // This is required for claude -p which waits for stdin to close
    // stdout/stderr: 'pipe' to capture output
    this.process = spawn(options.command, options.args, {
      cwd: options.cwd,
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        // Ensure PATH includes common locations for claude command
        PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH || ''}`,
      },
    });
    logger.info('[AgentProcess] Process spawned', { agentId: this.agentId, pid: this.process.pid });

    // Close stdin immediately to signal EOF
    // This allows commands like `claude -p` to proceed without waiting for input
    if (this.process.stdin) {
      this.process.stdin.end();
      logger.debug('[AgentProcess] stdin closed', { agentId: this.agentId });
    }

    this.setupEventHandlers();
  }

  get pid(): number {
    return this.process.pid ?? 0;
  }

  get isRunning(): boolean {
    return this._isRunning && !this.process.killed;
  }

  private setupEventHandlers(): void {
    logger.debug('[AgentProcess] Setting up event handlers', { agentId: this.agentId });

    // Handle stdout with line buffering for JSONL format
    // Claude CLI outputs one JSON object per line, but chunks may split mid-line
    this.process.stdout?.on('data', (data: Buffer) => {
      this.stdoutBuffer += data.toString();

      // Split by newline and process complete lines
      const lines = this.stdoutBuffer.split('\n');

      // Keep the last element (incomplete line) in the buffer
      this.stdoutBuffer = lines.pop() ?? '';

      // Send complete lines
      for (const line of lines) {
        if (line.trim()) {
          const output = line + '\n'; // Restore newline for JSONL format
          logger.debug('[AgentProcess] stdout line', { agentId: this.agentId, length: output.length, preview: output.substring(0, 100) });
          this.outputCallbacks.forEach((cb) => cb('stdout', output));
        }
      }
    });

    // Handle stderr
    this.process.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      logger.debug('[AgentProcess] stderr received', { agentId: this.agentId, length: output.length, preview: output.substring(0, 100) });
      this.outputCallbacks.forEach((cb) => cb('stderr', output));
    });

    // Handle process close
    this.process.on('close', (code: number | null) => {
      logger.info('[AgentProcess] Process closed', { agentId: this.agentId, exitCode: code });

      // Flush any remaining buffered stdout data
      if (this.stdoutBuffer.trim()) {
        const output = this.stdoutBuffer + '\n';
        logger.debug('[AgentProcess] Flushing remaining stdout buffer', { agentId: this.agentId, length: output.length });
        this.outputCallbacks.forEach((cb) => cb('stdout', output));
        this.stdoutBuffer = '';
      }

      this._isRunning = false;
      this.exitCallbacks.forEach((cb) => cb(code ?? -1));
    });

    // Handle process error
    this.process.on('error', (error: Error) => {
      logger.error('[AgentProcess] Process error', { agentId: this.agentId, error: error.message });
      this._isRunning = false;
      this.errorCallbacks.forEach((cb) => cb(error));
    });
  }

  writeStdin(input: string): void {
    // Note: stdin is closed immediately after spawn for claude -p compatibility
    // writeStdin is not supported in this mode
    logger.warn('[AgentProcess] writeStdin called but stdin is already closed, input ignored', { agentId: this.agentId, input });
  }

  kill(): void {
    this._isRunning = false;
    this.process.kill();
  }

  onOutput(callback: (stream: 'stdout' | 'stderr', data: string) => void): void {
    this.outputCallbacks.push(callback);
  }

  onExit(callback: (code: number) => void): void {
    this.exitCallbacks.push(callback);
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallbacks.push(callback);
  }
}

/**
 * Factory function to create AgentProcess
 */
export function createAgentProcess(options: AgentProcessOptions): AgentProcess {
  return new AgentProcessImpl(options);
}
