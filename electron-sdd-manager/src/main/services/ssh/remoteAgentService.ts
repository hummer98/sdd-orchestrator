/**
 * Remote Agent Service
 * Manages Claude Code execution on remote servers via SSH
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */

import type { Result } from '../../../renderer/types';
import type { ProcessProvider, ProcessHandle } from './processProvider';
import { logger } from '../logger';

/**
 * Claude Code availability information
 */
export interface ClaudeCodeInfo {
  installed: boolean;
  path?: string;
  version?: string;
}

/**
 * Agent start options
 */
export interface AgentStartOptions {
  projectPath: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  onOutput?: (data: string) => void;
  onError?: (data: string) => void;
  onExit?: (code: number) => void;
}

/**
 * Agent handle for controlling the running agent
 */
export interface AgentHandle {
  readonly pid: number;
  readonly isRunning: boolean;
}

/**
 * Remote agent error
 */
export interface RemoteAgentError {
  type: 'NOT_INSTALLED' | 'SPAWN_ERROR' | 'CONNECTION_LOST' | 'UNKNOWN';
  message: string;
}

/**
 * Remote Agent Service
 * Handles Claude Code execution on remote servers
 */
export class RemoteAgentService {
  private processProvider: ProcessProvider;
  private currentAgent: ProcessHandle | null = null;
  private agentRunning: boolean = false;

  constructor(processProvider: ProcessProvider) {
    this.processProvider = processProvider;
  }

  /**
   * Check if Claude Code is available on remote server
   */
  async checkClaudeCodeAvailability(): Promise<Result<ClaudeCodeInfo, RemoteAgentError>> {
    try {
      // Check if claude command exists
      const whichResult = await this.processProvider.exec('which claude', { cwd: '/' });

      if (!whichResult.ok) {
        return {
          ok: false,
          error: {
            type: 'CONNECTION_LOST',
            message: 'Failed to execute command on remote server',
          },
        };
      }

      if (whichResult.value.exitCode !== 0 || !whichResult.value.stdout.trim()) {
        return {
          ok: true,
          value: {
            installed: false,
          },
        };
      }

      const claudePath = whichResult.value.stdout.trim();

      // Get version information
      const versionResult = await this.processProvider.exec('claude --version', { cwd: '/' });

      let version: string | undefined;
      if (versionResult.ok && versionResult.value.exitCode === 0) {
        // Parse version from output like "claude version 1.0.0"
        const versionMatch = versionResult.value.stdout.match(/(\d+\.\d+\.\d+)/);
        if (versionMatch) {
          version = versionMatch[1];
        }
      }

      return {
        ok: true,
        value: {
          installed: true,
          path: claudePath,
          version,
        },
      };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'UNKNOWN',
          message: String(error),
        },
      };
    }
  }

  /**
   * Start Claude Code agent on remote server
   */
  async startAgent(options: AgentStartOptions): Promise<Result<AgentHandle, RemoteAgentError>> {
    // Stop any existing agent first
    if (this.currentAgent && this.agentRunning) {
      await this.stopAgent();
    }

    const args = options.args ? [options.command, ...options.args] : [options.command];

    logger.info('[RemoteAgentService] Starting agent', {
      projectPath: options.projectPath,
      command: options.command,
    });

    const spawnResult = await this.processProvider.spawn('claude', args, {
      cwd: options.projectPath,
      env: options.env,
    });

    if (!spawnResult.ok) {
      logger.error('[RemoteAgentService] Failed to start agent', { error: spawnResult.error });
      return {
        ok: false,
        error: {
          type: spawnResult.error.type === 'CONNECTION_LOST' ? 'CONNECTION_LOST' : 'SPAWN_ERROR',
          message:
            spawnResult.error.type === 'SPAWN_ERROR' ? spawnResult.error.message : 'Failed to start agent',
        },
      };
    }

    this.currentAgent = spawnResult.value;
    this.agentRunning = true;

    // Set up output handlers
    this.currentAgent.onOutput((stream, data) => {
      if (stream === 'stdout') {
        options.onOutput?.(data);
      } else {
        options.onError?.(data);
      }
    });

    // Set up exit handler
    this.currentAgent.onExit((code) => {
      logger.info('[RemoteAgentService] Agent exited', { code });
      this.agentRunning = false;
      options.onExit?.(code);
    });

    logger.info('[RemoteAgentService] Agent started', { pid: this.currentAgent.pid });

    return {
      ok: true,
      value: {
        pid: this.currentAgent.pid,
        isRunning: this.agentRunning,
      },
    };
  }

  /**
   * Stop running agent
   */
  async stopAgent(): Promise<Result<void, RemoteAgentError>> {
    if (!this.currentAgent || !this.agentRunning) {
      return { ok: true, value: undefined };
    }

    logger.info('[RemoteAgentService] Stopping agent', { pid: this.currentAgent.pid });

    try {
      this.currentAgent.kill('SIGTERM');
      this.agentRunning = false;
      this.currentAgent = null;

      return { ok: true, value: undefined };
    } catch (error) {
      logger.error('[RemoteAgentService] Error stopping agent', { error });
      return {
        ok: false,
        error: {
          type: 'UNKNOWN',
          message: String(error),
        },
      };
    }
  }

  /**
   * Check if agent is currently running
   */
  isAgentRunning(): boolean {
    return this.agentRunning && this.currentAgent !== null;
  }

  /**
   * Get PID of running agent
   */
  getAgentPid(): number | null {
    if (!this.currentAgent || !this.agentRunning) {
      return null;
    }
    return this.currentAgent.pid;
  }

  /**
   * Get installation guidance for Claude Code
   */
  getInstallationGuidance(): string {
    return `Claude Code is not installed on the remote server.

To install Claude Code, run the following command on the remote server:

  npm install -g @anthropic-ai/claude-code

Or if you're using a different package manager:

  yarn global add @anthropic-ai/claude-code
  pnpm add -g @anthropic-ai/claude-code

After installation, ensure the 'claude' command is available in the PATH.`;
  }
}
