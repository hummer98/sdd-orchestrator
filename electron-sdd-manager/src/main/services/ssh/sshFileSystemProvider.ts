/**
 * SSH File System Provider
 * Implements FileSystemProvider using SFTP protocol
 * Requirements: 3.3, 3.5, 3.6, 3.7
 */

import type { SFTPWrapper } from 'ssh2';
import type { Result } from '../../../renderer/types';
import type {
  FileSystemProvider,
  DirEntry,
  FileStat,
  WatchEvent,
  WatchHandle,
  FSError,
} from './fileSystemProvider';
import type { SSHConnectionService } from './sshConnectionService';
import { logger } from '../logger';

/**
 * SSH FileSystem Provider options
 */
export interface SSHFileSystemProviderOptions {
  operationTimeout?: number; // Timeout for operations in ms (default: 30000)
  maxRetries?: number; // Maximum retries on connection errors (default: 2)
  watchInterval?: number; // Polling interval for file watching in ms (default: 5000)
}

const DEFAULT_OPTIONS: Required<SSHFileSystemProviderOptions> = {
  operationTimeout: 30000,
  maxRetries: 2,
  watchInterval: 5000,
};

/**
 * File stat cache entry for watch polling
 */
interface WatchCacheEntry {
  path: string;
  size: number;
  mtime: number;
}

/**
 * SSH File System Provider
 * Provides file operations over SFTP with timeout and retry support
 */
export class SSHFileSystemProvider implements FileSystemProvider {
  readonly type = 'ssh' as const;

  private connectionService: SSHConnectionService;
  private options: Required<SSHFileSystemProviderOptions>;

  constructor(
    connectionService: SSHConnectionService,
    options?: SSHFileSystemProviderOptions
  ) {
    this.connectionService = connectionService;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Get SFTP client with connection check
   */
  private getSFTP(): Result<SFTPWrapper, FSError> {
    const status = this.connectionService.getStatus();
    if (status !== 'connected') {
      return { ok: false, error: { type: 'CONNECTION_LOST' } };
    }

    const sftpResult = this.connectionService.getSFTPClient();
    if (!sftpResult.ok) {
      return { ok: false, error: { type: 'CONNECTION_LOST' } };
    }

    return { ok: true, value: sftpResult.value };
  }

  /**
   * Execute SFTP operation with timeout and retry
   */
  private async withTimeoutAndRetry<T>(
    operation: (sftp: SFTPWrapper) => Promise<T>,
    path: string
  ): Promise<Result<T, FSError>> {
    let lastError: FSError | null = null;

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      const sftpResult = this.getSFTP();
      if (!sftpResult.ok) {
        lastError = sftpResult.error;
        continue;
      }

      try {
        const result = await Promise.race([
          operation(sftpResult.value),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('TIMEOUT')),
              this.options.operationTimeout
            )
          ),
        ]);
        return { ok: true, value: result };
      } catch (error: unknown) {
        lastError = this.handleError(error, path);

        // Only retry on connection errors
        if (lastError.type !== 'CONNECTION_LOST' && lastError.type !== 'TIMEOUT') {
          return { ok: false, error: lastError };
        }

        // Don't retry on last attempt
        if (attempt === this.options.maxRetries) {
          return { ok: false, error: lastError };
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return { ok: false, error: lastError || { type: 'UNKNOWN', message: 'Unknown error' } };
  }

  /**
   * Read file content
   */
  async readFile(path: string): Promise<Result<string, FSError>> {
    return this.withTimeoutAndRetry(async (sftp) => {
      return new Promise<string>((resolve, reject) => {
        (sftp as any).readFile(path, (err: Error | null, data?: Buffer) => {
          if (err) {
            reject(err);
          } else {
            resolve(data?.toString('utf-8') ?? '');
          }
        });
      });
    }, path);
  }

  /**
   * Write file content
   */
  async writeFile(path: string, content: string): Promise<Result<void, FSError>> {
    return this.withTimeoutAndRetry(async (sftp) => {
      return new Promise<void>((resolve, reject) => {
        (sftp as any).writeFile(path, Buffer.from(content, 'utf-8'), (err: Error | null) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }, path);
  }

  /**
   * Read directory contents
   */
  async readDir(path: string): Promise<Result<DirEntry[], FSError>> {
    return this.withTimeoutAndRetry(async (sftp) => {
      return new Promise<DirEntry[]>((resolve, reject) => {
        sftp.readdir(path, (err, list) => {
          if (err) {
            reject(err);
          } else {
            const entries: DirEntry[] = list.map((item) => ({
              name: item.filename,
              isDirectory: item.attrs.isDirectory(),
              isFile: item.attrs.isFile(),
            }));
            resolve(entries);
          }
        });
      });
    }, path);
  }

  /**
   * Get file/directory stats
   */
  async stat(path: string): Promise<Result<FileStat, FSError>> {
    return this.withTimeoutAndRetry(async (sftp) => {
      return new Promise<FileStat>((resolve, reject) => {
        sftp.stat(path, (err, stats) => {
          if (err) {
            reject(err);
          } else {
            resolve({
              size: stats.size,
              mtime: new Date(stats.mtime * 1000),
              isDirectory: stats.isDirectory(),
              isFile: stats.isFile(),
            });
          }
        });
      });
    }, path);
  }

  /**
   * Create directory
   */
  async mkdir(path: string, options?: { recursive?: boolean }): Promise<Result<void, FSError>> {
    if (options?.recursive) {
      return this.mkdirRecursive(path);
    }

    return this.withTimeoutAndRetry(async (sftp) => {
      return new Promise<void>((resolve, reject) => {
        sftp.mkdir(path, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }, path);
  }

  /**
   * Create directory recursively
   */
  private async mkdirRecursive(path: string): Promise<Result<void, FSError>> {
    const parts = path.split('/').filter(Boolean);
    let currentPath = '';

    for (const part of parts) {
      currentPath += '/' + part;

      // Check if exists
      const exists = await this.exists(currentPath);
      if (exists) {
        continue;
      }

      // Create directory
      const result = await this.withTimeoutAndRetry(async (sftp) => {
        return new Promise<void>((resolve, reject) => {
          sftp.mkdir(currentPath, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }, currentPath);

      if (!result.ok) {
        return result;
      }
    }

    return { ok: true, value: undefined };
  }

  /**
   * Remove file or directory
   */
  async rm(path: string, options?: { recursive?: boolean }): Promise<Result<void, FSError>> {
    // First check if it's a file or directory
    const statResult = await this.stat(path);
    if (!statResult.ok) {
      return statResult;
    }

    if (statResult.value.isDirectory) {
      if (options?.recursive) {
        return this.rmdirRecursive(path);
      }
      return this.withTimeoutAndRetry(async (sftp) => {
        return new Promise<void>((resolve, reject) => {
          sftp.rmdir(path, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }, path);
    }

    // It's a file
    return this.withTimeoutAndRetry(async (sftp) => {
      return new Promise<void>((resolve, reject) => {
        sftp.unlink(path, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }, path);
  }

  /**
   * Remove directory recursively
   */
  private async rmdirRecursive(path: string): Promise<Result<void, FSError>> {
    // Read directory contents
    const entries = await this.readDir(path);
    if (!entries.ok) {
      return entries;
    }

    // Remove all contents first
    for (const entry of entries.value) {
      const entryPath = path + '/' + entry.name;
      if (entry.isDirectory) {
        const result = await this.rmdirRecursive(entryPath);
        if (!result.ok) {
          return result;
        }
      } else {
        const result = await this.rm(entryPath);
        if (!result.ok) {
          return result;
        }
      }
    }

    // Now remove the empty directory
    return this.withTimeoutAndRetry(async (sftp) => {
      return new Promise<void>((resolve, reject) => {
        sftp.rmdir(path, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }, path);
  }

  /**
   * Check if file or directory exists
   */
  async exists(path: string): Promise<boolean> {
    const result = await this.stat(path);
    return result.ok;
  }

  /**
   * Watch file for changes (polling-based)
   */
  watch(path: string, callback: (event: WatchEvent) => void): WatchHandle {
    let cache: WatchCacheEntry | null = null;
    let timer: NodeJS.Timeout | null = null;
    let stopped = false;

    const poll = async () => {
      if (stopped) return;

      try {
        const result = await this.stat(path);
        if (result.ok) {
          const newEntry: WatchCacheEntry = {
            path,
            size: result.value.size,
            mtime: result.value.mtime.getTime(),
          };

          if (cache !== null) {
            // Check for changes
            if (cache.size !== newEntry.size || cache.mtime !== newEntry.mtime) {
              callback({ type: 'change', path });
            }
          }

          cache = newEntry;
        } else if (cache !== null) {
          // File was deleted
          callback({ type: 'unlink', path });
          cache = null;
        }
      } catch (error) {
        logger.warn('[SSHFileSystemProvider] Watch poll error', { path, error });
      }

      if (!stopped) {
        timer = setTimeout(poll, this.options.watchInterval);
      }
    };

    // Start polling
    poll();

    return {
      close: () => {
        stopped = true;
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
    };
  }

  /**
   * Convert errors to FSError
   */
  private handleError(error: unknown, path: string): FSError {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message === 'timeout') {
        return { type: 'TIMEOUT', path };
      }

      const nodeError = error as NodeJS.ErrnoException;
      const code = nodeError.code?.toUpperCase() ?? '';

      if (code === 'ENOENT' || code.includes('2')) {
        // SFTP error code 2 = No such file
        return { type: 'NOT_FOUND', path };
      }

      if (code === 'EACCES' || code === 'EPERM' || code.includes('3')) {
        // SFTP error code 3 = Permission denied
        return { type: 'PERMISSION_DENIED', path };
      }

      if (code === 'ETIMEDOUT') {
        return { type: 'TIMEOUT', path };
      }

      if (
        code === 'ECONNRESET' ||
        code === 'ECONNREFUSED' ||
        code === 'EPIPE' ||
        message.includes('connection')
      ) {
        return { type: 'CONNECTION_LOST' };
      }

      return { type: 'UNKNOWN', message: error.message };
    }

    return { type: 'UNKNOWN', message: String(error) };
  }
}
