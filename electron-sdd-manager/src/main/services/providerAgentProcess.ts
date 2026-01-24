/**
 * Provider-aware AgentProcess
 * Wraps ProcessProvider to provide AgentProcess-compatible interface
 * Requirements: 3.1, 4.1, 5.1
 *
 * This module provides a bridge between the existing AgentProcess interface
 * and the new ProcessProvider abstraction layer, enabling transparent
 * local/remote process execution.
 */

import type {
  ProcessHandle,
  SpawnOptions,
} from './ssh/processProvider';
import { LocalProcessProvider } from './ssh/processProvider';
import { providerFactory, type ProviderType } from './ssh/providerFactory';
import { logger } from './logger';

/**
 * Options for creating a provider-aware agent process
 */
export interface ProviderAgentProcessOptions {
  readonly agentId: string;
  readonly command: string;
  readonly args: string[];
  readonly cwd: string;
  readonly sessionId?: string;
  readonly providerType?: ProviderType;
  readonly env?: Record<string, string>;
}

/**
 * AgentProcess interface (compatible with existing interface)
 */
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
 * Result type
 */
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Provider AgentProcess Error
 */
export interface ProviderAgentProcessError {
  type: 'SPAWN_ERROR' | 'PROVIDER_ERROR' | 'CONNECTION_LOST' | 'COMMAND_NOT_FOUND';
  message: string;
}

/**
 * Implementation of AgentProcess using ProcessProvider
 */
class ProviderAgentProcessImpl implements AgentProcess {
  readonly agentId: string;
  readonly sessionId: string;

  private handle: ProcessHandle | null = null;
  private outputCallbacks: ((stream: 'stdout' | 'stderr', data: string) => void)[] = [];
  private exitCallbacks: ((code: number) => void)[] = [];
  private errorCallbacks: ((error: Error) => void)[] = [];
  private _isRunning: boolean = false;
  private _pid: number = 0;

  constructor(agentId: string, sessionId: string = '') {
    this.agentId = agentId;
    this.sessionId = sessionId;
  }

  /**
   * Initialize with a ProcessHandle
   */
  initialize(handle: ProcessHandle): void {
    this.handle = handle;
    this._pid = handle.pid;
    this._isRunning = handle.isRunning;

    // Set up event forwarding
    handle.onOutput((stream, data) => {
      logger.debug('[ProviderAgentProcess] Output received', {
        agentId: this.agentId,
        stream,
        length: data.length,
      });
      this.outputCallbacks.forEach((cb) => cb(stream, data));
    });

    handle.onExit((code) => {
      logger.info('[ProviderAgentProcess] Process exited', {
        agentId: this.agentId,
        code,
      });
      this._isRunning = false;
      this.exitCallbacks.forEach((cb) => cb(code));
      // Clear callback arrays to prevent memory leaks
      this.outputCallbacks.length = 0;
      this.exitCallbacks.length = 0;
      this.errorCallbacks.length = 0;
    });

    // Note: ProcessHandle doesn't have onError, but we handle connection issues
  }

  get pid(): number {
    return this._pid;
  }

  get isRunning(): boolean {
    return this._isRunning && (this.handle?.isRunning ?? false);
  }

  writeStdin(input: string): void {
    if (this.handle) {
      this.handle.writeStdin(input);
    } else {
      logger.warn('[ProviderAgentProcess] writeStdin called but no handle', {
        agentId: this.agentId,
      });
    }
  }

  kill(): void {
    logger.info('[ProviderAgentProcess] Killing process', {
      agentId: this.agentId,
      pid: this._pid,
    });
    this._isRunning = false;
    if (this.handle) {
      this.handle.kill('SIGTERM');
    }
    // Clear callback arrays to prevent memory leaks
    this.outputCallbacks.length = 0;
    this.exitCallbacks.length = 0;
    this.errorCallbacks.length = 0;
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

  /**
   * Trigger error callbacks
   */
  triggerError(error: Error): void {
    this._isRunning = false;
    this.errorCallbacks.forEach((cb) => cb(error));
  }
}

/**
 * Create an AgentProcess using the appropriate ProcessProvider
 *
 * This function maintains backward compatibility with the existing
 * createAgentProcess function while supporting both local and SSH providers.
 *
 * @param options - Agent process creation options
 * @returns Result with AgentProcess or error
 */
export async function createProviderAgentProcess(
  options: ProviderAgentProcessOptions
): Promise<Result<AgentProcess, ProviderAgentProcessError>> {
  const {
    agentId,
    command,
    args,
    cwd,
    sessionId,
    providerType = 'local',
    env,
  } = options;

  logger.info('[ProviderAgentProcess] Creating agent process', {
    agentId,
    command,
    args,
    cwd,
    providerType,
  });

  try {
    // Get the appropriate provider
    const provider = providerFactory.getProcessProvider(providerType);

    // Build spawn options with environment variables
    const spawnOptions: SpawnOptions = {
      cwd,
      env: {
        // Include PATH for finding claude command
        PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH || ''}`,
        ...env,
      },
    };

    // Spawn the process
    const spawnResult = await provider.spawn(command, args, spawnOptions);

    if (!spawnResult.ok) {
      logger.error('[ProviderAgentProcess] Spawn failed', {
        agentId,
        error: spawnResult.error,
      });
      return {
        ok: false,
        error: {
          type: spawnResult.error.type === 'CONNECTION_LOST'
            ? 'CONNECTION_LOST'
            : spawnResult.error.type === 'COMMAND_NOT_FOUND'
            ? 'COMMAND_NOT_FOUND'
            : 'SPAWN_ERROR',
          message: 'message' in spawnResult.error
            ? spawnResult.error.message
            : 'Process spawn failed',
        },
      };
    }

    // Create AgentProcess wrapper
    const agentProcess = new ProviderAgentProcessImpl(agentId, sessionId);
    agentProcess.initialize(spawnResult.value);

    // Close stdin immediately for claude -p compatibility
    spawnResult.value.closeStdin();
    logger.debug('[ProviderAgentProcess] stdin closed', { agentId });

    logger.info('[ProviderAgentProcess] Process created successfully', {
      agentId,
      pid: agentProcess.pid,
    });

    return { ok: true, value: agentProcess };
  } catch (error) {
    logger.error('[ProviderAgentProcess] Unexpected error', {
      agentId,
      error: String(error),
    });
    return {
      ok: false,
      error: {
        type: 'PROVIDER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Synchronous factory for backward compatibility
 * Uses local provider and returns immediately with spawned process
 *
 * Note: This is for backward compatibility with existing code.
 * New code should use createProviderAgentProcess for async operation.
 */
export function createAgentProcessSync(
  options: Omit<ProviderAgentProcessOptions, 'providerType'>
): AgentProcess {
  const { agentId, command, args, cwd, sessionId } = options;

  // Use local provider for synchronous operation
  const localProvider = new LocalProcessProvider();

  // Create placeholder that will be populated asynchronously
  const agentProcess = new ProviderAgentProcessImpl(agentId, sessionId);

  // Start spawn asynchronously but return immediately
  const spawnOptions: SpawnOptions = {
    cwd,
    env: {
      PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH || ''}`,
    },
  };

  localProvider.spawn(command, args, spawnOptions).then((result) => {
    if (result.ok) {
      agentProcess.initialize(result.value);
      result.value.closeStdin();
    } else {
      agentProcess.triggerError(new Error('Spawn failed'));
    }
  }).catch((error) => {
    agentProcess.triggerError(error instanceof Error ? error : new Error(String(error)));
  });

  return agentProcess;
}

/**
 * Get provider type from project path
 * Returns 'ssh' for SSH URIs, 'local' for local paths
 */
export function getProviderTypeFromPath(path: string): ProviderType {
  return providerFactory.getProviderType(path);
}
