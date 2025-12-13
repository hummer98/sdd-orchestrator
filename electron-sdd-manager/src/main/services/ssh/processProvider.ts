/**
 * ProcessProvider Interface and Local Implementation
 * Abstracts process execution for local/remote transparency
 * Requirements: 4.1, 4.2, 4.4, 4.5, 4.6, 4.7
 */

import { spawn, exec, type ChildProcess } from 'child_process';
import type { Result } from '../../../renderer/types';

/**
 * Spawn options
 */
export interface SpawnOptions {
  cwd: string;
  env?: Record<string, string>;
}

/**
 * Exec options
 */
export interface ExecOptions {
  cwd: string;
  env?: Record<string, string>;
  timeout?: number;
}

/**
 * Exec result
 */
export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Process handle for spawned processes
 */
export interface ProcessHandle {
  readonly pid: number;
  readonly isRunning: boolean;

  onOutput(callback: (stream: 'stdout' | 'stderr', data: string) => void): void;
  onExit(callback: (code: number) => void): void;
  kill(signal?: NodeJS.Signals): void;
  writeStdin(data: string): void;
  closeStdin(): void;
}

/**
 * Process error types
 */
export type ProcessError =
  | { type: 'SPAWN_ERROR'; message: string }
  | { type: 'CONNECTION_LOST' }
  | { type: 'COMMAND_NOT_FOUND'; command: string }
  | { type: 'PERMISSION_DENIED' }
  | { type: 'TIMEOUT' };

/**
 * ProcessProvider Interface
 * Provides a unified interface for process execution across local and remote systems
 */
export interface ProcessProvider {
  readonly type: 'local' | 'ssh';

  spawn(
    command: string,
    args: string[],
    options: SpawnOptions
  ): Promise<Result<ProcessHandle, ProcessError>>;

  exec(
    command: string,
    options?: ExecOptions
  ): Promise<Result<ExecResult, ProcessError>>;
}

/**
 * Local Process Handle implementation
 */
class LocalProcessHandle implements ProcessHandle {
  private process: ChildProcess;
  private outputCallbacks: ((stream: 'stdout' | 'stderr', data: string) => void)[] = [];
  private exitCallbacks: ((code: number) => void)[] = [];
  private _isRunning: boolean = true;

  constructor(proc: ChildProcess) {
    this.process = proc;
    this.setupEventHandlers();
  }

  get pid(): number {
    return this.process.pid ?? 0;
  }

  get isRunning(): boolean {
    return this._isRunning && !this.process.killed;
  }

  private setupEventHandlers(): void {
    this.process.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      this.outputCallbacks.forEach((cb) => cb('stdout', output));
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      this.outputCallbacks.forEach((cb) => cb('stderr', output));
    });

    this.process.on('close', (code: number | null) => {
      this._isRunning = false;
      this.exitCallbacks.forEach((cb) => cb(code ?? -1));
    });

    this.process.on('error', () => {
      this._isRunning = false;
    });
  }

  onOutput(callback: (stream: 'stdout' | 'stderr', data: string) => void): void {
    this.outputCallbacks.push(callback);
  }

  onExit(callback: (code: number) => void): void {
    this.exitCallbacks.push(callback);
  }

  kill(signal?: NodeJS.Signals): void {
    this._isRunning = false;
    this.process.kill(signal);
  }

  writeStdin(data: string): void {
    this.process.stdin?.write(data);
  }

  closeStdin(): void {
    this.process.stdin?.end();
  }
}

/**
 * Local Process Provider
 * Implements ProcessProvider using Node.js child_process module
 */
export class LocalProcessProvider implements ProcessProvider {
  readonly type = 'local' as const;

  async spawn(
    command: string,
    args: string[],
    options: SpawnOptions
  ): Promise<Result<ProcessHandle, ProcessError>> {
    try {
      const proc = spawn(command, args, {
        cwd: options.cwd,
        env: {
          ...process.env,
          ...options.env,
        },
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
      });

      // Handle spawn errors
      return new Promise((resolve) => {
        let resolved = false;

        proc.on('error', (error: NodeJS.ErrnoException) => {
          if (!resolved) {
            resolved = true;
            if (error.code === 'ENOENT') {
              resolve({
                ok: false,
                error: { type: 'COMMAND_NOT_FOUND', command },
              });
            } else if (error.code === 'EACCES') {
              resolve({
                ok: false,
                error: { type: 'PERMISSION_DENIED' },
              });
            } else {
              resolve({
                ok: false,
                error: { type: 'SPAWN_ERROR', message: error.message },
              });
            }
          }
        });

        // If spawn succeeds, the process will have a pid
        // We use setImmediate to check after the error event would fire
        setImmediate(() => {
          if (!resolved && proc.pid !== undefined) {
            resolved = true;
            resolve({
              ok: true,
              value: new LocalProcessHandle(proc),
            });
          }
        });
      });
    } catch (error: unknown) {
      return {
        ok: false,
        error: { type: 'SPAWN_ERROR', message: String(error) },
      };
    }
  }

  async exec(
    command: string,
    options?: ExecOptions
  ): Promise<Result<ExecResult, ProcessError>> {
    return new Promise((resolve) => {
      const execOptions = {
        cwd: options?.cwd,
        env: {
          ...process.env,
          ...options?.env,
        },
        timeout: options?.timeout,
        shell: '/bin/sh',
      };

      exec(command, execOptions, (error, stdout, stderr) => {
        if (error) {
          // ExecException.code is number | undefined (exit code), not ENOENT
          // ENOENT would come from spawn, not exec with shell
          if (error.killed && error.signal === 'SIGTERM') {
            resolve({
              ok: false,
              error: { type: 'TIMEOUT' },
            });
            return;
          }

          // Command returned non-zero exit code
          // This is still a valid execution result, not an error
          resolve({
            ok: true,
            value: {
              stdout: stdout,
              stderr: stderr,
              exitCode: error.code ?? 1,
            },
          });
          return;
        }

        resolve({
          ok: true,
          value: {
            stdout: stdout,
            stderr: stderr,
            exitCode: 0,
          },
        });
      });
    });
  }
}

// Export singleton instance
export const localProcessProvider = new LocalProcessProvider();
