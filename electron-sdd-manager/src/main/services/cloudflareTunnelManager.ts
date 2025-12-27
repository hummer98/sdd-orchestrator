/**
 * Cloudflare Tunnel Manager Service
 * Manages cloudflared process lifecycle for quick tunnels
 * Requirements: 2.1, 2.4, 4.3, 4.4
 */

import { spawn, ChildProcess, SpawnOptionsWithoutStdio } from 'child_process';
import { EventEmitter } from 'events';
import { CloudflareConfigStore, getCloudflareConfigStore } from './cloudflareConfigStore';
import {
  CloudflaredBinaryChecker,
  getCloudflaredBinaryChecker,
  InstallInstructions,
} from './cloudflaredBinaryChecker';

/**
 * Result of successfully starting the tunnel
 */
export interface TunnelStartSuccess {
  /** The tunnel URL */
  url: string;
  /** The cloudflared process ID */
  pid: number;
}

/**
 * Tunnel error types
 */
export type TunnelError =
  | { type: 'NO_TUNNEL_TOKEN'; message: string }
  | { type: 'BINARY_NOT_FOUND'; message: string; installInstructions?: InstallInstructions }
  | { type: 'ALREADY_RUNNING'; message: string; url: string }
  | { type: 'SPAWN_ERROR'; message: string }
  | { type: 'TIMEOUT'; message: string }
  | { type: 'NOT_RUNNING'; message: string }
  | { type: 'PROCESS_ERROR'; message: string };

/**
 * Result type for tunnel operations
 */
export type TunnelStartResult =
  | { ok: true; value: TunnelStartSuccess }
  | { ok: false; error: TunnelError };

export type TunnelStopResult =
  | { ok: true }
  | { ok: false; error: TunnelError };

/**
 * Tunnel status
 */
export interface TunnelStatus {
  state: 'stopped' | 'starting' | 'running' | 'stopping';
  url: string | null;
  pid: number | null;
  error?: string;
}

/**
 * Start options
 */
export interface TunnelStartOptions {
  /** Timeout in milliseconds for URL to be received (default: 30000) */
  timeout?: number;
}

/**
 * Spawn function type for dependency injection
 */
export type SpawnFn = (
  command: string,
  args: string[],
  options?: SpawnOptionsWithoutStdio
) => ChildProcess;

/**
 * URL pattern to match cloudflared output
 * Matches: https://xxx.trycloudflare.com
 */
const TUNNEL_URL_PATTERN = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;

/**
 * Default timeout for URL detection (30 seconds)
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * CloudflareTunnelManager
 *
 * Manages the cloudflared process for creating quick tunnels.
 * Handles process lifecycle, URL detection, and error handling.
 *
 * @example
 * const manager = getCloudflareTunnelManager();
 * const result = await manager.start(8765);
 * if (result.ok) {
 *   console.log(`Tunnel URL: ${result.value.url}`);
 * }
 */
export class CloudflareTunnelManager extends EventEmitter {
  private configStore: CloudflareConfigStore;
  private binaryChecker: CloudflaredBinaryChecker;
  private spawnFn: SpawnFn;
  private process: ChildProcess | null = null;
  private tunnelUrl: string | null = null;
  private state: TunnelStatus['state'] = 'stopped';
  private statusChangeCallbacks: Set<(status: TunnelStatus) => void> = new Set();

  constructor(
    configStore?: CloudflareConfigStore,
    binaryChecker?: CloudflaredBinaryChecker,
    spawnFn?: SpawnFn
  ) {
    super();
    this.configStore = configStore ?? getCloudflareConfigStore();
    this.binaryChecker = binaryChecker ?? getCloudflaredBinaryChecker();
    this.spawnFn = spawnFn ?? spawn;
  }

  /**
   * Start the Cloudflare tunnel
   * Requirements: 2.1
   *
   * @param localPort The local port to tunnel to
   * @param options Start options
   * @returns Result with tunnel info or error
   */
  async start(
    localPort: number,
    options: TunnelStartOptions = {}
  ): Promise<TunnelStartResult> {
    const timeout = options.timeout ?? DEFAULT_TIMEOUT;

    // Check if already running
    if (this.process && this.tunnelUrl) {
      return {
        ok: false,
        error: {
          type: 'ALREADY_RUNNING',
          message: 'Tunnel is already running',
          url: this.tunnelUrl,
        },
      };
    }

    // Check tunnel token
    const tunnelToken = this.configStore.getTunnelToken();
    if (!tunnelToken) {
      return {
        ok: false,
        error: {
          type: 'NO_TUNNEL_TOKEN',
          message: 'Tunnel token is not configured. Set CLOUDFLARE_TUNNEL_TOKEN environment variable or configure in settings.',
        },
      };
    }

    // Check binary exists
    const binaryCheck = await this.binaryChecker.checkBinaryExists();
    if (!binaryCheck.exists) {
      return {
        ok: false,
        error: {
          type: 'BINARY_NOT_FOUND',
          message: 'cloudflared binary not found. Please install it first.',
          installInstructions: this.binaryChecker.getInstallInstructions(),
        },
      };
    }

    // Update state
    this.state = 'starting';
    this.notifyStatusChange();

    return new Promise<TunnelStartResult>((resolve) => {
      try {
        // Spawn cloudflared process
        // For quick tunnels: cloudflared tunnel --url http://localhost:PORT
        const args = [
          'tunnel',
          '--url',
          `http://localhost:${localPort}`,
        ];

        this.process = this.spawnFn(binaryCheck.path, args, {
          env: {
            ...process.env,
            TUNNEL_TOKEN: tunnelToken,
          },
        });

        let resolved = false;
        let outputBuffer = '';

        // Handle stdout for URL detection
        this.process.stdout?.on('data', (data: Buffer) => {
          const output = data.toString();
          outputBuffer += output;

          // Try to parse URL
          const url = this.parseUrlFromOutput(outputBuffer);
          if (url && !resolved) {
            resolved = true;
            this.tunnelUrl = url;
            this.state = 'running';
            this.notifyStatusChange();
            resolve({
              ok: true,
              value: {
                url,
                pid: this.process!.pid!,
              },
            });
          }
        });

        // Handle stderr (cloudflared logs to stderr)
        this.process.stderr?.on('data', (data: Buffer) => {
          const output = data.toString();
          outputBuffer += output;

          // URL might be in stderr
          const url = this.parseUrlFromOutput(outputBuffer);
          if (url && !resolved) {
            resolved = true;
            this.tunnelUrl = url;
            this.state = 'running';
            this.notifyStatusChange();
            resolve({
              ok: true,
              value: {
                url,
                pid: this.process!.pid!,
              },
            });
          }
        });

        // Handle process error
        this.process.on('error', (err: Error) => {
          if (!resolved) {
            resolved = true;
            this.state = 'stopped';
            this.process = null;
            this.tunnelUrl = null;
            this.notifyStatusChange();
            resolve({
              ok: false,
              error: {
                type: 'SPAWN_ERROR',
                message: `Failed to start cloudflared: ${err.message}`,
              },
            });
          }
        });

        // Handle process exit
        this.process.on('exit', (code: number | null) => {
          this.state = 'stopped';
          this.process = null;
          this.tunnelUrl = null;
          this.notifyStatusChange();

          if (!resolved) {
            resolved = true;
            resolve({
              ok: false,
              error: {
                type: 'PROCESS_ERROR',
                message: `cloudflared exited with code ${code}`,
              },
            });
          }
        });

        // Timeout
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            // Kill the process
            if (this.process) {
              this.process.kill();
              this.process = null;
            }
            this.state = 'stopped';
            this.tunnelUrl = null;
            this.notifyStatusChange();
            resolve({
              ok: false,
              error: {
                type: 'TIMEOUT',
                message: `Tunnel URL not received within ${timeout}ms`,
              },
            });
          }
        }, timeout);
      } catch (err) {
        this.state = 'stopped';
        this.notifyStatusChange();
        resolve({
          ok: false,
          error: {
            type: 'SPAWN_ERROR',
            message: `Failed to start cloudflared: ${err instanceof Error ? err.message : String(err)}`,
          },
        });
      }
    });
  }

  /**
   * Stop the Cloudflare tunnel
   * Requirements: 2.4
   *
   * @returns Result indicating success or error
   */
  async stop(): Promise<TunnelStopResult> {
    if (!this.process) {
      return {
        ok: false,
        error: {
          type: 'NOT_RUNNING',
          message: 'No tunnel is currently running',
        },
      };
    }

    this.state = 'stopping';
    this.notifyStatusChange();

    return new Promise<TunnelStopResult>((resolve) => {
      let resolved = false;

      this.process!.on('exit', () => {
        if (!resolved) {
          resolved = true;
          this.state = 'stopped';
          this.process = null;
          this.tunnelUrl = null;
          this.notifyStatusChange();
          resolve({ ok: true });
        }
      });

      // Send kill signal
      this.process!.kill();

      // Timeout for graceful shutdown
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          // Force kill if not exited
          if (this.process) {
            this.process.kill('SIGKILL');
            this.process = null;
          }
          this.state = 'stopped';
          this.tunnelUrl = null;
          this.notifyStatusChange();
          resolve({ ok: true });
        }
      }, 5000);
    });
  }

  /**
   * Get current tunnel status
   * Requirements: 4.4
   *
   * @returns Current status
   */
  getStatus(): TunnelStatus {
    return {
      state: this.state,
      url: this.tunnelUrl,
      pid: this.process?.pid ?? null,
    };
  }

  /**
   * Subscribe to status changes
   *
   * @param callback Callback to invoke on status change
   * @returns Unsubscribe function
   */
  onStatusChange(callback: (status: TunnelStatus) => void): () => void {
    this.statusChangeCallbacks.add(callback);
    return () => {
      this.statusChangeCallbacks.delete(callback);
    };
  }

  /**
   * Parse tunnel URL from cloudflared output
   * Requirements: 4.3
   *
   * @param output The output string to parse
   * @returns The URL if found, null otherwise
   */
  parseUrlFromOutput(output: string): string | null {
    const match = output.match(TUNNEL_URL_PATTERN);
    return match ? match[0] : null;
  }

  /**
   * Get the connect URL with access token
   * Requirements: 3.2
   *
   * @returns The URL with token query parameter, or null if not running
   */
  getConnectUrl(): string | null {
    if (!this.tunnelUrl) {
      return null;
    }

    const accessToken = this.configStore.getAccessToken();
    if (!accessToken) {
      return this.tunnelUrl;
    }

    return `${this.tunnelUrl}?token=${accessToken}`;
  }

  /**
   * Notify all subscribers of status change
   */
  private notifyStatusChange(): void {
    const status = this.getStatus();
    for (const callback of this.statusChangeCallbacks) {
      callback(status);
    }
  }
}

// Singleton instance
let cloudflareTunnelManager: CloudflareTunnelManager | null = null;

export function getCloudflareTunnelManager(): CloudflareTunnelManager {
  if (!cloudflareTunnelManager) {
    cloudflareTunnelManager = new CloudflareTunnelManager();
  }
  return cloudflareTunnelManager;
}
