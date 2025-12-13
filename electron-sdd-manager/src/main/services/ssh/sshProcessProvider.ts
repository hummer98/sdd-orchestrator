/**
 * SSH Process Provider
 * Implements ProcessProvider using SSH exec channels
 * Requirements: 4.3, 5.4, 5.7
 */

import type { Client, ClientChannel } from 'ssh2';
import type { Result } from '../../../renderer/types';
import type {
  ProcessProvider,
  ProcessHandle,
  ProcessError,
  SpawnOptions,
  ExecOptions,
  ExecResult,
} from './processProvider';
import type { SSHConnectionService } from './sshConnectionService';
import { logger } from '../logger';

/**
 * Extended SSHConnectionService interface with SSH client access
 */
interface SSHConnectionServiceWithClient extends Omit<SSHConnectionService, 'getSSHClient'> {
  getSSHClient(): Result<Client, { type: string; message: string }>;
}

/**
 * SSH Process Handle implementation
 */
class SSHProcessHandle implements ProcessHandle {
  private channel: ClientChannel;
  private _pid: number = 0;
  private _isRunning: boolean = true;
  private outputCallbacks: ((stream: 'stdout' | 'stderr', data: string) => void)[] = [];
  private exitCallbacks: ((code: number) => void)[] = [];

  constructor(channel: ClientChannel) {
    this.channel = channel;
    this.setupEventHandlers();
  }

  get pid(): number {
    return this._pid;
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  private setupEventHandlers(): void {
    // Handle stdout data
    this.channel.on('data', (data: Buffer) => {
      const output = data.toString();

      // Check for PID marker
      const pidMatch = output.match(/__PID__:(\d+)/);
      if (pidMatch) {
        this._pid = parseInt(pidMatch[1], 10);
        // Remove PID marker from output if present at start
        const cleanOutput = output.replace(/__PID__:\d+\n?/, '');
        if (cleanOutput) {
          this.outputCallbacks.forEach((cb) => cb('stdout', cleanOutput));
        }
      } else {
        this.outputCallbacks.forEach((cb) => cb('stdout', output));
      }
    });

    // Handle stderr data
    this.channel.stderr.on('data', (data: Buffer) => {
      const output = data.toString();
      this.outputCallbacks.forEach((cb) => cb('stderr', output));
    });

    // Handle close
    this.channel.on('close', (code: number | null) => {
      this._isRunning = false;
      this.exitCallbacks.forEach((cb) => cb(code ?? -1));
    });

    // Handle error
    this.channel.on('error', (err: Error) => {
      logger.error('[SSHProcessHandle] Channel error', { error: err.message });
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
    // Convert signal format: SIGTERM -> TERM
    const sshSignal = signal?.replace('SIG', '') ?? 'TERM';
    this.channel.signal(sshSignal);
  }

  writeStdin(data: string): void {
    this.channel.write(data);
  }

  closeStdin(): void {
    this.channel.end();
  }
}

/**
 * SSH Process Provider
 * Provides process execution over SSH with environment variable support
 */
export class SSHProcessProvider implements ProcessProvider {
  readonly type = 'ssh' as const;

  private connectionService: SSHConnectionServiceWithClient;

  constructor(connectionService: SSHConnectionService) {
    this.connectionService = connectionService as SSHConnectionServiceWithClient;
  }

  /**
   * Build command string with environment variables and cwd
   */
  private buildCommand(
    command: string,
    args: string[],
    options: SpawnOptions
  ): string {
    let cmd = '';

    // Add environment variables
    if (options.env) {
      const envVars = Object.entries(options.env)
        .map(([key, value]) => `${key}=${this.shellEscape(value)}`)
        .join(' ');
      if (envVars) {
        cmd += envVars + ' ';
      }
    }

    // Add working directory wrapper
    if (options.cwd) {
      cmd = `cd ${this.shellEscape(options.cwd)} && ${cmd}`;
    }

    // Add PID tracking prefix
    cmd += `echo "__PID__:$$" && `;

    // Add command and args
    cmd += command;
    if (args.length > 0) {
      cmd += ' ' + args.map((a) => this.shellEscape(a)).join(' ');
    }

    return cmd;
  }

  /**
   * Build exec command string with environment variables
   */
  private buildExecCommand(
    command: string,
    options?: ExecOptions
  ): string {
    let cmd = '';

    // Add environment variables
    if (options?.env) {
      const envVars = Object.entries(options.env)
        .map(([key, value]) => `${key}=${this.shellEscape(value)}`)
        .join(' ');
      if (envVars) {
        cmd += envVars + ' ';
      }
    }

    cmd += command;

    return cmd;
  }

  /**
   * Escape string for shell
   */
  private shellEscape(str: string): string {
    // If string is simple (no special chars), return as-is
    if (/^[a-zA-Z0-9_\/.-]+$/.test(str)) {
      return str;
    }
    // Otherwise, wrap in single quotes and escape single quotes
    return `'${str.replace(/'/g, "'\\''")}'`;
  }

  /**
   * Spawn a process on remote server
   */
  async spawn(
    command: string,
    args: string[],
    options: SpawnOptions
  ): Promise<Result<ProcessHandle, ProcessError>> {
    const status = this.connectionService.getStatus();
    if (status !== 'connected') {
      return {
        ok: false,
        error: { type: 'CONNECTION_LOST' },
      };
    }

    const clientResult = this.connectionService.getSSHClient();
    if (!clientResult.ok) {
      return {
        ok: false,
        error: { type: 'CONNECTION_LOST' },
      };
    }

    const client = clientResult.value;
    const fullCommand = this.buildCommand(command, args, options);

    return new Promise((resolve) => {
      client.exec(fullCommand, (err, channel) => {
        if (err) {
          resolve({
            ok: false,
            error: { type: 'SPAWN_ERROR', message: err.message },
          });
          return;
        }

        const handle = new SSHProcessHandle(channel);
        resolve({ ok: true, value: handle });
      });
    });
  }

  /**
   * Execute command on remote server
   */
  async exec(
    command: string,
    options?: ExecOptions
  ): Promise<Result<ExecResult, ProcessError>> {
    const status = this.connectionService.getStatus();
    if (status !== 'connected') {
      return {
        ok: false,
        error: { type: 'CONNECTION_LOST' },
      };
    }

    const fullCommand = this.buildExecCommand(command, options);
    const result = await this.connectionService.executeCommand(fullCommand, {
      cwd: options?.cwd,
    });

    if (!result.ok) {
      return {
        ok: false,
        error: { type: 'CONNECTION_LOST' },
      };
    }

    return {
      ok: true,
      value: result.value,
    };
  }
}
