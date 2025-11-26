/**
 * Command Service
 * Handles shell command execution with security validation
 * Requirements: 5.2-5.5, 8.1-8.4, 12.4, 13.4, 13.5
 */

import { spawn, ChildProcess } from 'child_process';
import type { WebContents } from 'electron';
import { IPC_CHANNELS } from '../ipc/channels';
import type { ExecutionResult, CommandError, Result } from '../../renderer/types';

/**
 * Allowed commands whitelist
 * Only /kiro:spec-* commands are allowed for security
 */
export const ALLOWED_COMMANDS = [
  '/kiro:spec-requirements',
  '/kiro:spec-design',
  '/kiro:spec-tasks',
  '/kiro:spec-impl',
  '/kiro:spec-status',
  '/kiro:spec-init',
  '/kiro:validate-gap',
  '/kiro:validate-design',
  '/kiro:validate-impl',
  '/kiro:steering',
  '/kiro:steering-custom',
] as const;

/**
 * Dangerous shell characters that could be used for injection
 */
const DANGEROUS_CHARS = [';', '&&', '||', '|', '`', '$(', '>', '<', '\n', '\r'];

/**
 * Check if a command is in the allowlist
 */
export function isCommandAllowed(command: string): boolean {
  const trimmed = command.trim();
  if (!trimmed) return false;

  // Check for dangerous shell characters
  for (const char of DANGEROUS_CHARS) {
    if (trimmed.includes(char)) {
      return false;
    }
  }

  // Extract the base command (first part)
  const baseCommand = trimmed.split(' ')[0];

  // Check if it's an allowed command
  return ALLOWED_COMMANDS.some((allowed) => baseCommand === allowed);
}

/**
 * Get platform-specific shell command
 */
export function getShellCommand(platform: NodeJS.Platform): {
  shell: string;
  shellArgs: string[];
} {
  if (platform === 'win32') {
    return {
      shell: 'cmd',
      shellArgs: ['/c'],
    };
  }

  return {
    shell: '/bin/sh',
    shellArgs: ['-c'],
  };
}

/**
 * Command Service class for command execution
 */
export class CommandService {
  private currentProcess: ChildProcess | null = null;
  private processId: string | null = null;

  /**
   * Execute a command with streaming output
   */
  async executeCommand(
    command: string,
    workingDirectory: string,
    webContents: WebContents
  ): Promise<Result<ExecutionResult, CommandError>> {
    // Check if already running
    if (this.currentProcess) {
      return {
        ok: false,
        error: { type: 'ALREADY_RUNNING' },
      };
    }

    // Validate command
    if (!isCommandAllowed(command)) {
      return {
        ok: false,
        error: {
          type: 'COMMAND_NOT_ALLOWED',
          command,
        },
      };
    }

    const { shell, shellArgs } = getShellCommand(process.platform);
    const startTime = Date.now();

    return new Promise((resolve) => {
      try {
        // Build the full command with claude command wrapper
        // Assuming kiro commands are run through claude CLI
        const fullCommand = `claude "${command}"`;

        this.currentProcess = spawn(shell, [...shellArgs, fullCommand], {
          cwd: workingDirectory,
          env: { ...process.env },
        });

        this.processId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Handle stdout
        this.currentProcess.stdout?.on('data', (data: Buffer) => {
          webContents.send(IPC_CHANNELS.COMMAND_OUTPUT, {
            stream: 'stdout',
            data: data.toString(),
            timestamp: Date.now(),
          });
        });

        // Handle stderr
        this.currentProcess.stderr?.on('data', (data: Buffer) => {
          webContents.send(IPC_CHANNELS.COMMAND_OUTPUT, {
            stream: 'stderr',
            data: data.toString(),
            timestamp: Date.now(),
          });
        });

        // Handle process close
        this.currentProcess.on('close', (code) => {
          const exitCode = code ?? 0;
          const executionTimeMs = Date.now() - startTime;

          webContents.send(IPC_CHANNELS.COMMAND_COMPLETE, {
            exitCode,
            executionTimeMs,
          });

          this.currentProcess = null;
          this.processId = null;

          resolve({
            ok: true,
            value: { exitCode, executionTimeMs },
          });
        });

        // Handle spawn error
        this.currentProcess.on('error', (error) => {
          this.currentProcess = null;
          this.processId = null;

          resolve({
            ok: false,
            error: {
              type: 'SPAWN_ERROR',
              message: error.message,
            },
          });
        });
      } catch (error) {
        this.currentProcess = null;
        this.processId = null;

        resolve({
          ok: false,
          error: {
            type: 'SPAWN_ERROR',
            message: String(error),
          },
        });
      }
    });
  }

  /**
   * Cancel current execution
   */
  cancelExecution(): Result<void, CommandError> {
    if (!this.currentProcess || !this.processId) {
      return {
        ok: false,
        error: {
          type: 'PROCESS_NOT_FOUND',
          processId: this.processId ?? 'unknown',
        },
      };
    }

    try {
      this.currentProcess.kill('SIGTERM');
      this.currentProcess = null;
      this.processId = null;
      return { ok: true, value: undefined };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'SPAWN_ERROR',
          message: String(error),
        },
      };
    }
  }
}
