/**
 * FileSystemProvider Interface and Local Implementation
 * Abstracts file system operations for local/remote transparency
 * Requirements: 3.1, 3.2, 3.4, 3.7
 */

import * as fs from 'fs/promises';
import { watch as chokidarWatch } from 'chokidar';
import type { Result } from '../../../renderer/types';

/**
 * Directory entry structure
 */
export interface DirEntry {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
}

/**
 * File stat structure
 */
export interface FileStat {
  size: number;
  mtime: Date;
  isDirectory: boolean;
  isFile: boolean;
}

/**
 * File watch event
 */
export interface WatchEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
}

/**
 * Watch handle for stopping file watching
 */
export interface WatchHandle {
  close(): void;
}

/**
 * File system error types
 */
export type FSError =
  | { type: 'NOT_FOUND'; path: string }
  | { type: 'PERMISSION_DENIED'; path: string }
  | { type: 'TIMEOUT'; path: string }
  | { type: 'CONNECTION_LOST' }
  | { type: 'UNKNOWN'; message: string };

/**
 * FileSystemProvider Interface
 * Provides a unified interface for file operations across local and remote systems
 */
export interface FileSystemProvider {
  readonly type: 'local' | 'ssh';

  readFile(path: string): Promise<Result<string, FSError>>;
  writeFile(path: string, content: string): Promise<Result<void, FSError>>;
  readDir(path: string): Promise<Result<DirEntry[], FSError>>;
  stat(path: string): Promise<Result<FileStat, FSError>>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<Result<void, FSError>>;
  rm(path: string, options?: { recursive?: boolean }): Promise<Result<void, FSError>>;
  exists(path: string): Promise<boolean>;
  watch(path: string, callback: (event: WatchEvent) => void): WatchHandle;
}

/**
 * Local File System Provider
 * Implements FileSystemProvider using Node.js fs module
 */
export class LocalFileSystemProvider implements FileSystemProvider {
  readonly type = 'local' as const;

  async readFile(path: string): Promise<Result<string, FSError>> {
    try {
      const content = await fs.readFile(path, 'utf-8');
      return { ok: true, value: content };
    } catch (error: unknown) {
      return this.handleError(error, path);
    }
  }

  async writeFile(path: string, content: string): Promise<Result<void, FSError>> {
    try {
      await fs.writeFile(path, content, 'utf-8');
      return { ok: true, value: undefined };
    } catch (error: unknown) {
      return this.handleError(error, path);
    }
  }

  async readDir(path: string): Promise<Result<DirEntry[], FSError>> {
    try {
      const entries = await fs.readdir(path, { withFileTypes: true });
      const dirEntries: DirEntry[] = entries.map((entry) => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
      }));
      return { ok: true, value: dirEntries };
    } catch (error: unknown) {
      return this.handleError(error, path);
    }
  }

  async stat(path: string): Promise<Result<FileStat, FSError>> {
    try {
      const stats = await fs.stat(path);
      return {
        ok: true,
        value: {
          size: stats.size,
          mtime: stats.mtime,
          isDirectory: stats.isDirectory(),
          isFile: stats.isFile(),
        },
      };
    } catch (error: unknown) {
      return this.handleError(error, path);
    }
  }

  async mkdir(path: string, options?: { recursive?: boolean }): Promise<Result<void, FSError>> {
    try {
      await fs.mkdir(path, { recursive: options?.recursive ?? false });
      return { ok: true, value: undefined };
    } catch (error: unknown) {
      return this.handleError(error, path);
    }
  }

  async rm(path: string, options?: { recursive?: boolean }): Promise<Result<void, FSError>> {
    try {
      await fs.rm(path, { recursive: options?.recursive ?? false });
      return { ok: true, value: undefined };
    } catch (error: unknown) {
      return this.handleError(error, path);
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  watch(path: string, callback: (event: WatchEvent) => void): WatchHandle {
    const watcher = chokidarWatch(path, {
      ignoreInitial: true,
      persistent: true,
    });

    watcher.on('add', (filePath) => {
      callback({ type: 'add', path: filePath });
    });

    watcher.on('change', (filePath) => {
      callback({ type: 'change', path: filePath });
    });

    watcher.on('unlink', (filePath) => {
      callback({ type: 'unlink', path: filePath });
    });

    return {
      close: () => {
        watcher.close();
      },
    };
  }

  /**
   * Convert Node.js errors to FSError
   */
  private handleError<T>(error: unknown, path: string): Result<T, FSError> {
    const err = error as NodeJS.ErrnoException;

    if (err.code === 'ENOENT') {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', path },
      };
    }

    if (err.code === 'EACCES' || err.code === 'EPERM') {
      return {
        ok: false,
        error: { type: 'PERMISSION_DENIED', path },
      };
    }

    return {
      ok: false,
      error: { type: 'UNKNOWN', message: String(error) },
    };
  }
}

// Export singleton instance
export const localFileSystemProvider = new LocalFileSystemProvider();
