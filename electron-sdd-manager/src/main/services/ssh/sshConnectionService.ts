/**
 * SSH Connection Service
 * Manages SSH connection lifecycle, state, and reconnection
 * Requirements: 2.1, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 9.4
 */

import { Client, type ConnectConfig, type SFTPWrapper } from 'ssh2';
import type { Result } from '../../../renderer/types';
import type { SSHUri } from './sshUriParser';
import { SSHAuthService } from './sshAuthService';
import { HostKeyManager } from './hostKeyManager';
import { logger } from '../logger';

/**
 * Connection status values
 */
export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'authenticating'
  | 'host-verifying'
  | 'connected'
  | 'reconnecting'
  | 'error';

/**
 * SSH connection error types
 */
export interface SSHConnectionError {
  type: 'AUTH_FAILED' | 'HOST_REJECTED' | 'NETWORK_ERROR' | 'TIMEOUT' | 'UNKNOWN';
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Exec result from SSH command
 */
export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Connection information
 */
export interface ConnectionInfo {
  host: string;
  port: number;
  user: string;
  connectedAt: Date;
  bytesTransferred: number;
}

/**
 * SSH connection options
 */
export interface SSHConnectionOptions {
  keepAliveInterval?: number;
  maxReconnectAttempts?: number;
  connectionTimeout?: number;
  onPasswordRequired?: () => Promise<string>;
  onPassphraseRequired?: (keyPath: string) => Promise<string>;
  onHostKeyVerification?: (fingerprint: string, isNew: boolean) => Promise<boolean>;
}

const DEFAULT_OPTIONS: Required<Omit<SSHConnectionOptions, 'onPasswordRequired' | 'onPassphraseRequired' | 'onHostKeyVerification'>> = {
  keepAliveInterval: 30000, // 30 seconds
  maxReconnectAttempts: 3,
  connectionTimeout: 30000, // 30 seconds
};

/**
 * SSH Connection Service
 * Manages SSH connection lifecycle with state machine
 */
export class SSHConnectionService {
  private client: Client | null = null;
  private sftpClient: SFTPWrapper | null = null;
  private status: ConnectionStatus = 'disconnected';
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private connectionInfo: ConnectionInfo | null = null;
  private currentUri: SSHUri | null = null;
  private options: typeof DEFAULT_OPTIONS & SSHConnectionOptions;
  private keepAliveTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;

  private authService: SSHAuthService;
  private hostKeyManager: HostKeyManager;

  constructor(options?: SSHConnectionOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.authService = new SSHAuthService();
    this.hostKeyManager = new HostKeyManager();
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Get connection information
   */
  getConnectionInfo(): ConnectionInfo | null {
    return this.connectionInfo;
  }

  /**
   * Subscribe to status changes
   * @returns Unsubscribe function
   */
  onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(callback);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  /**
   * Update status and notify listeners
   */
  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.statusListeners.forEach((cb) => cb(status));
    logger.info('[SSHConnection] Status changed', { status });
  }

  /**
   * Connect to SSH server
   */
  async connect(uri: SSHUri): Promise<Result<void, SSHConnectionError>> {
    if (this.status === 'connected' || this.status === 'connecting') {
      await this.disconnect();
    }

    this.currentUri = uri;
    this.setStatus('connecting');

    try {
      this.client = new Client();

      // Set up event handlers
      this.setupClientEventHandlers();

      // Get authentication methods
      const authMethods = await this.authService.getAuthMethods(uri.host, uri.user);
      logger.debug('[SSHConnection] Available auth methods', { methods: authMethods.map((m) => m.type) });

      // Build connection config
      const connectConfig: ConnectConfig = {
        host: uri.host,
        port: uri.port,
        username: uri.user,
        readyTimeout: this.options.connectionTimeout,
        keepaliveInterval: this.options.keepAliveInterval,
        algorithms: {
          cipher: ['aes256-gcm@openssh.com', 'chacha20-poly1305@openssh.com', 'aes256-ctr', 'aes192-ctr', 'aes128-ctr'],
        },
      };

      // Try agent auth first if available
      const agentMethod = authMethods.find((m) => m.type === 'agent');
      if (agentMethod && agentMethod.type === 'agent') {
        connectConfig.agent = agentMethod.socketPath;
      }

      // Add private key if available
      const keyMethod = authMethods.find((m) => m.type === 'privateKey');
      if (keyMethod && keyMethod.type === 'privateKey') {
        try {
          const fs = await import('fs/promises');
          const keyContent = await fs.readFile(keyMethod.keyPath, 'utf-8');
          connectConfig.privateKey = keyContent;

          if (keyMethod.hasPassphrase && this.options.onPassphraseRequired) {
            const passphrase = await this.options.onPassphraseRequired(keyMethod.keyPath);
            connectConfig.passphrase = passphrase;
          }
        } catch (error) {
          logger.warn('[SSHConnection] Failed to read private key', { keyPath: keyMethod.keyPath, error });
        }
      }

      // Host key verification callback
      connectConfig.hostVerifier = async (key: Buffer) => {
        this.setStatus('host-verifying');
        const result = await this.hostKeyManager.verifyHostKey(uri.host, uri.port, key);

        if (result.status === 'known') {
          return true;
        }

        if (result.status === 'unknown' || result.status === 'changed') {
          if (this.options.onHostKeyVerification) {
            const displayFingerprint = result.status === 'unknown'
              ? result.fingerprint
              : result.newFingerprint;
            const accepted = await this.options.onHostKeyVerification(
              displayFingerprint,
              result.status === 'unknown'
            );
            if (accepted) {
              await this.hostKeyManager.acceptHostKey(uri.host, uri.port, key);
              return true;
            }
            return false;
          }
          // If no verification callback, accept new hosts but reject changed ones
          if (result.status === 'unknown') {
            await this.hostKeyManager.acceptHostKey(uri.host, uri.port, key);
            return true;
          }
          return false;
        }

        return false;
      };

      // Connect
      return new Promise((resolve) => {
        this.client!.once('ready', async () => {
          this.setStatus('connected');
          this.connectionInfo = {
            host: uri.host,
            port: uri.port,
            user: uri.user,
            connectedAt: new Date(),
            bytesTransferred: 0,
          };
          this.reconnectAttempts = 0;

          // Initialize SFTP client
          try {
            this.sftpClient = await this.getSFTPClientInternal();
          } catch (error) {
            logger.warn('[SSHConnection] Failed to initialize SFTP', { error });
          }

          resolve({ ok: true, value: undefined });
        });

        this.client!.once('error', (error: Error) => {
          logger.error('[SSHConnection] Connection error', { error: error.message });
          this.setStatus('error');
          resolve({
            ok: false,
            error: {
              type: this.categorizeError(error),
              message: error.message,
            },
          });
        });

        this.client!.connect(connectConfig);
      });
    } catch (error: unknown) {
      this.setStatus('error');
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
   * Disconnect from SSH server
   */
  async disconnect(): Promise<void> {
    this.stopKeepAlive();

    if (this.client) {
      return new Promise((resolve) => {
        this.client!.once('close', () => {
          this.cleanup();
          resolve();
        });

        this.client!.end();
      });
    }

    this.cleanup();
  }

  /**
   * Get SFTP client
   */
  getSFTPClient(): Result<SFTPWrapper, SSHConnectionError> {
    if (!this.sftpClient) {
      return {
        ok: false,
        error: {
          type: 'NETWORK_ERROR',
          message: 'Not connected or SFTP not available',
        },
      };
    }
    return { ok: true, value: this.sftpClient };
  }

  /**
   * Get SSH client for direct channel operations
   */
  getSSHClient(): Result<Client, SSHConnectionError> {
    if (!this.client || this.status !== 'connected') {
      return {
        ok: false,
        error: {
          type: 'NETWORK_ERROR',
          message: 'Not connected',
        },
      };
    }
    return { ok: true, value: this.client };
  }

  /**
   * Execute command on remote server
   */
  async executeCommand(command: string, options?: { cwd?: string }): Promise<Result<ExecResult, SSHConnectionError>> {
    if (!this.client || this.status !== 'connected') {
      return {
        ok: false,
        error: {
          type: 'NETWORK_ERROR',
          message: 'Not connected',
        },
      };
    }

    const fullCommand = options?.cwd ? `cd "${options.cwd}" && ${command}` : command;

    return new Promise((resolve) => {
      this.client!.exec(fullCommand, (err, stream) => {
        if (err) {
          resolve({
            ok: false,
            error: {
              type: 'UNKNOWN',
              message: err.message,
            },
          });
          return;
        }

        let stdout = '';
        let stderr = '';

        stream.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        stream.on('close', (code: number) => {
          resolve({
            ok: true,
            value: {
              stdout,
              stderr,
              exitCode: code,
            },
          });
        });
      });
    });
  }

  /**
   * Setup event handlers on client
   */
  private setupClientEventHandlers(): void {
    if (!this.client) return;

    this.client.on('close', () => {
      if (this.status === 'connected') {
        // Unexpected disconnect - attempt reconnect
        this.handleUnexpectedDisconnect();
      }
    });

    this.client.on('error', (error: Error) => {
      logger.error('[SSHConnection] Client error', { error: error.message });
    });
  }

  /**
   * Handle unexpected disconnect
   */
  private async handleUnexpectedDisconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.setStatus('error');
      this.cleanup();
      return;
    }

    this.setStatus('reconnecting');
    this.reconnectAttempts++;

    logger.info('[SSHConnection] Attempting reconnect', { attempt: this.reconnectAttempts });

    if (this.currentUri) {
      const result = await this.connect(this.currentUri);
      if (!result.ok) {
        await this.handleUnexpectedDisconnect();
      }
    }
  }

  /**
   * Get SFTP client internally
   */
  private getSFTPClientInternal(): Promise<SFTPWrapper> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('Not connected'));
        return;
      }

      this.client.sftp((err, sftp) => {
        if (err) {
          reject(err);
        } else {
          resolve(sftp);
        }
      });
    });
  }

  /**
   * Stop keep-alive timer
   */
  private stopKeepAlive(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.stopKeepAlive();
    this.sftpClient = null;
    this.client = null;
    this.connectionInfo = null;
    this.setStatus('disconnected');
  }

  /**
   * Categorize error type
   */
  private categorizeError(error: Error): SSHConnectionError['type'] {
    const message = error.message.toLowerCase();

    if (message.includes('auth') || message.includes('password') || message.includes('key')) {
      return 'AUTH_FAILED';
    }
    if (message.includes('host') || message.includes('fingerprint')) {
      return 'HOST_REJECTED';
    }
    if (message.includes('timeout')) {
      return 'TIMEOUT';
    }
    if (message.includes('refused') || message.includes('network') || message.includes('unreachable')) {
      return 'NETWORK_ERROR';
    }

    return 'UNKNOWN';
  }
}

// Export singleton instance
export const sshConnectionService = new SSHConnectionService();
