/**
 * FileSystemProvider Unit Tests
 * TDD: Testing file system abstraction interface and local implementation
 * Requirements: 3.1, 3.2, 3.4, 3.7
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock logger first to avoid Electron app dependency
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  type FileSystemProvider,
  type FSError,
  LocalFileSystemProvider,
} from './fileSystemProvider';

// We'll use actual filesystem for integration tests
describe('LocalFileSystemProvider', () => {
  let provider: LocalFileSystemProvider;
  let tempDir: string;

  beforeEach(async () => {
    provider = new LocalFileSystemProvider();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fsprovider-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('type property', () => {
    it('should return "local" as type', () => {
      expect(provider.type).toBe('local');
    });
  });

  describe('readFile', () => {
    it('should read file content', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello, World!');

      const result = await provider.readFile(filePath);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('Hello, World!');
      }
    });

    it('should return NOT_FOUND error for missing file', async () => {
      const result = await provider.readFile(path.join(tempDir, 'nonexistent.txt'));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_FOUND');
      }
    });
  });

  describe('writeFile', () => {
    it('should write content to file', async () => {
      const filePath = path.join(tempDir, 'output.txt');

      const result = await provider.writeFile(filePath, 'Test content');

      expect(result.ok).toBe(true);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('Test content');
    });

    it('should overwrite existing file', async () => {
      const filePath = path.join(tempDir, 'existing.txt');
      await fs.writeFile(filePath, 'Old content');

      const result = await provider.writeFile(filePath, 'New content');

      expect(result.ok).toBe(true);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('New content');
    });
  });

  describe('readDir', () => {
    it('should list directory contents', async () => {
      await fs.writeFile(path.join(tempDir, 'file1.txt'), 'content1');
      await fs.writeFile(path.join(tempDir, 'file2.txt'), 'content2');
      await fs.mkdir(path.join(tempDir, 'subdir'));

      const result = await provider.readDir(tempDir);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(3);

        const names = result.value.map((e) => e.name).sort();
        expect(names).toEqual(['file1.txt', 'file2.txt', 'subdir']);

        const subdir = result.value.find((e) => e.name === 'subdir');
        expect(subdir?.isDirectory).toBe(true);
        expect(subdir?.isFile).toBe(false);

        const file1 = result.value.find((e) => e.name === 'file1.txt');
        expect(file1?.isDirectory).toBe(false);
        expect(file1?.isFile).toBe(true);
      }
    });

    it('should return NOT_FOUND for missing directory', async () => {
      const result = await provider.readDir(path.join(tempDir, 'nonexistent'));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_FOUND');
      }
    });
  });

  describe('stat', () => {
    it('should return file stats', async () => {
      const filePath = path.join(tempDir, 'stats-test.txt');
      await fs.writeFile(filePath, 'Test data for stats');

      const result = await provider.stat(filePath);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.isFile).toBe(true);
        expect(result.value.isDirectory).toBe(false);
        expect(result.value.size).toBe('Test data for stats'.length);
        expect(result.value.mtime).toBeInstanceOf(Date);
      }
    });

    it('should return directory stats', async () => {
      const dirPath = path.join(tempDir, 'stats-dir');
      await fs.mkdir(dirPath);

      const result = await provider.stat(dirPath);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.isDirectory).toBe(true);
        expect(result.value.isFile).toBe(false);
      }
    });

    it('should return NOT_FOUND for missing path', async () => {
      const result = await provider.stat(path.join(tempDir, 'missing'));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_FOUND');
      }
    });
  });

  describe('mkdir', () => {
    it('should create directory', async () => {
      const dirPath = path.join(tempDir, 'new-dir');

      const result = await provider.mkdir(dirPath);

      expect(result.ok).toBe(true);

      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should create nested directories with recursive option', async () => {
      const dirPath = path.join(tempDir, 'parent', 'child', 'grandchild');

      const result = await provider.mkdir(dirPath, { recursive: true });

      expect(result.ok).toBe(true);

      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('rm', () => {
    it('should remove file', async () => {
      const filePath = path.join(tempDir, 'to-remove.txt');
      await fs.writeFile(filePath, 'content');

      const result = await provider.rm(filePath);

      expect(result.ok).toBe(true);

      await expect(fs.access(filePath)).rejects.toThrow();
    });

    it('should remove directory recursively', async () => {
      const dirPath = path.join(tempDir, 'dir-to-remove');
      await fs.mkdir(dirPath);
      await fs.writeFile(path.join(dirPath, 'file.txt'), 'content');

      const result = await provider.rm(dirPath, { recursive: true });

      expect(result.ok).toBe(true);

      await expect(fs.access(dirPath)).rejects.toThrow();
    });
  });

  describe('exists', () => {
    it('should return true for existing file', async () => {
      const filePath = path.join(tempDir, 'exists.txt');
      await fs.writeFile(filePath, 'content');

      const result = await provider.exists(filePath);

      expect(result).toBe(true);
    });

    it('should return true for existing directory', async () => {
      const dirPath = path.join(tempDir, 'exists-dir');
      await fs.mkdir(dirPath);

      const result = await provider.exists(dirPath);

      expect(result).toBe(true);
    });

    it('should return false for missing path', async () => {
      const result = await provider.exists(path.join(tempDir, 'missing'));

      expect(result).toBe(false);
    });
  });

  describe('watch', () => {
    it('should create a watch handle', async () => {
      const callback = vi.fn();

      const handle = provider.watch(tempDir, callback);

      expect(handle).toBeDefined();
      expect(typeof handle.close).toBe('function');

      handle.close();
    });

    it('should detect file changes', async () => {
      const callback = vi.fn();
      const filePath = path.join(tempDir, 'watched.txt');

      const handle = provider.watch(tempDir, callback);

      // Wait for watcher to be ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create a file
      await fs.writeFile(filePath, 'initial content');

      // Wait for event to be processed
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Callback should have been called
      expect(callback).toHaveBeenCalled();

      handle.close();
    }, { timeout: 5000 });
  });
});

describe('FSError types', () => {
  it('should have proper error type structure', () => {
    const notFoundError: FSError = { type: 'NOT_FOUND', path: '/some/path' };
    const permissionError: FSError = { type: 'PERMISSION_DENIED', path: '/protected' };
    const timeoutError: FSError = { type: 'TIMEOUT', path: '/slow/path' };
    const connectionError: FSError = { type: 'CONNECTION_LOST' };
    const unknownError: FSError = { type: 'UNKNOWN', message: 'Something went wrong' };

    expect(notFoundError.type).toBe('NOT_FOUND');
    expect(permissionError.type).toBe('PERMISSION_DENIED');
    expect(timeoutError.type).toBe('TIMEOUT');
    expect(connectionError.type).toBe('CONNECTION_LOST');
    expect(unknownError.type).toBe('UNKNOWN');
  });
});

/**
 * SSHFileSystemProvider Unit Tests
 * TDD: Testing SSH file system provider implementation
 * Requirements: 3.3, 3.5, 3.6, 3.7
 */
describe('SSHFileSystemProvider', () => {
  // Import is done dynamically to allow mocking
  let SSHFileSystemProvider: typeof import('./sshFileSystemProvider').SSHFileSystemProvider;

  // Mock SFTP operations
  const mockSftpReadFile = vi.fn();
  const mockSftpWriteFile = vi.fn();
  const mockSftpReadDir = vi.fn();
  const mockSftpStat = vi.fn();
  const mockSftpMkdir = vi.fn();
  const mockSftpRmdir = vi.fn();
  const mockSftpUnlink = vi.fn();
  const mockSftpFastGet = vi.fn();
  const mockSftpFastPut = vi.fn();

  // Mock SFTP client
  const mockSftpClient = {
    readFile: mockSftpReadFile,
    writeFile: mockSftpWriteFile,
    readdir: mockSftpReadDir,
    stat: mockSftpStat,
    mkdir: mockSftpMkdir,
    rmdir: mockSftpRmdir,
    unlink: mockSftpUnlink,
    fastGet: mockSftpFastGet,
    fastPut: mockSftpFastPut,
  };

  // Mock connection service
  const mockConnectionService = {
    getStatus: vi.fn(() => 'connected'),
    getSFTPClient: vi.fn(() => ({ ok: true, value: mockSftpClient })),
    onStatusChange: vi.fn(() => () => {}),
  };

  beforeEach(async () => {
    vi.resetAllMocks();

    // Reset mock implementations
    mockConnectionService.getStatus.mockReturnValue('connected');
    mockConnectionService.getSFTPClient.mockReturnValue({ ok: true, value: mockSftpClient });

    // Dynamically import to get mocked version
    const module = await import('./sshFileSystemProvider');
    SSHFileSystemProvider = module.SSHFileSystemProvider;
  });

  describe('type property', () => {
    it('should return "ssh" as type', () => {
      const provider = new SSHFileSystemProvider(mockConnectionService as any);
      expect(provider.type).toBe('ssh');
    });
  });

  describe('readFile', () => {
    it('should read file content via SFTP', async () => {
      const fileContent = Buffer.from('Hello from remote!');
      mockSftpReadFile.mockImplementation((path: string, callback: (err: Error | null, data?: Buffer) => void) => {
        callback(null, fileContent);
      });

      const provider = new SSHFileSystemProvider(mockConnectionService as any);
      const result = await provider.readFile('/remote/path/file.txt');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('Hello from remote!');
      }
    });

    it('should return NOT_FOUND error for missing file', async () => {
      const error = new Error('No such file') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockSftpReadFile.mockImplementation((path: string, callback: (err: Error | null) => void) => {
        callback(error);
      });

      const provider = new SSHFileSystemProvider(mockConnectionService as any);
      const result = await provider.readFile('/remote/nonexistent.txt');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_FOUND');
      }
    });

    it('should return CONNECTION_LOST when not connected', async () => {
      mockConnectionService.getStatus.mockReturnValue('disconnected');
      mockConnectionService.getSFTPClient.mockReturnValue({
        ok: false,
        error: { type: 'NETWORK_ERROR', message: 'Not connected' },
      });

      const provider = new SSHFileSystemProvider(mockConnectionService as any);
      const result = await provider.readFile('/remote/path/file.txt');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('CONNECTION_LOST');
      }
    });

    it('should handle timeout errors', async () => {
      mockSftpReadFile.mockImplementation((path: string, callback: (err: Error | null) => void) => {
        const error = new Error('Timeout') as NodeJS.ErrnoException;
        error.code = 'ETIMEDOUT';
        callback(error);
      });

      const provider = new SSHFileSystemProvider(mockConnectionService as any);
      const result = await provider.readFile('/remote/slow.txt');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('TIMEOUT');
      }
    });
  });

  describe('writeFile', () => {
    it('should write content via SFTP', async () => {
      mockSftpWriteFile.mockImplementation((path: string, data: Buffer, callback: (err: Error | null) => void) => {
        callback(null);
      });

      const provider = new SSHFileSystemProvider(mockConnectionService as any);
      const result = await provider.writeFile('/remote/output.txt', 'Test content');

      expect(result.ok).toBe(true);
      expect(mockSftpWriteFile).toHaveBeenCalled();
    });

    it('should return PERMISSION_DENIED for protected paths', async () => {
      const error = new Error('Permission denied') as NodeJS.ErrnoException;
      error.code = 'EACCES';
      mockSftpWriteFile.mockImplementation((path: string, data: Buffer, callback: (err: Error | null) => void) => {
        callback(error);
      });

      const provider = new SSHFileSystemProvider(mockConnectionService as any);
      const result = await provider.writeFile('/protected/file.txt', 'content');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('PERMISSION_DENIED');
      }
    });
  });

  describe('readDir', () => {
    it('should list remote directory contents', async () => {
      const mockEntries = [
        { filename: 'file1.txt', longname: '-rw-r--r-- 1 user group 100 Jan 1 12:00 file1.txt', attrs: { isDirectory: () => false, isFile: () => true } },
        { filename: 'subdir', longname: 'drwxr-xr-x 2 user group 4096 Jan 1 12:00 subdir', attrs: { isDirectory: () => true, isFile: () => false } },
      ];
      mockSftpReadDir.mockImplementation((path: string, callback: (err: Error | null, list?: any[]) => void) => {
        callback(null, mockEntries);
      });

      const provider = new SSHFileSystemProvider(mockConnectionService as any);
      const result = await provider.readDir('/remote/dir');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(2);
        expect(result.value[0].name).toBe('file1.txt');
        expect(result.value[0].isFile).toBe(true);
        expect(result.value[1].name).toBe('subdir');
        expect(result.value[1].isDirectory).toBe(true);
      }
    });
  });

  describe('stat', () => {
    it('should return file stats', async () => {
      const mockStats = {
        size: 1024,
        mtime: 1700000000,
        isDirectory: () => false,
        isFile: () => true,
      };
      mockSftpStat.mockImplementation((path: string, callback: (err: Error | null, stats?: any) => void) => {
        callback(null, mockStats);
      });

      const provider = new SSHFileSystemProvider(mockConnectionService as any);
      const result = await provider.stat('/remote/file.txt');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.size).toBe(1024);
        expect(result.value.isFile).toBe(true);
        expect(result.value.isDirectory).toBe(false);
      }
    });
  });

  describe('mkdir', () => {
    it('should create remote directory', async () => {
      mockSftpMkdir.mockImplementation((path: string, callback: (err: Error | null) => void) => {
        callback(null);
      });

      const provider = new SSHFileSystemProvider(mockConnectionService as any);
      const result = await provider.mkdir('/remote/newdir');

      expect(result.ok).toBe(true);
      expect(mockSftpMkdir).toHaveBeenCalledWith('/remote/newdir', expect.any(Function));
    });

    it('should create directories recursively', async () => {
      // Track created paths
      const createdPaths = new Set<string>();

      // Mock stat - returns not found for non-existent paths
      mockSftpStat.mockImplementation((path: string, callback: (err: Error | null, stats?: any) => void) => {
        if (createdPaths.has(path)) {
          callback(null, { isDirectory: () => true, isFile: () => false, size: 0, mtime: 1700000000 });
        } else {
          const error = new Error('No such file') as NodeJS.ErrnoException;
          error.code = 'ENOENT';
          callback(error);
        }
      });

      // Mock mkdir - track created paths
      mockSftpMkdir.mockImplementation((path: string, callback: (err: Error | null) => void) => {
        createdPaths.add(path);
        callback(null);
      });

      const provider = new SSHFileSystemProvider(mockConnectionService as any);
      const result = await provider.mkdir('/remote/parent/child/grandchild', { recursive: true });

      expect(result.ok).toBe(true);
      expect(createdPaths.size).toBeGreaterThan(0);
    });
  });

  describe('rm', () => {
    it('should remove remote file', async () => {
      mockSftpStat.mockImplementation((path: string, callback: (err: Error | null, stats?: any) => void) => {
        callback(null, { isDirectory: () => false, isFile: () => true });
      });
      mockSftpUnlink.mockImplementation((path: string, callback: (err: Error | null) => void) => {
        callback(null);
      });

      const provider = new SSHFileSystemProvider(mockConnectionService as any);
      const result = await provider.rm('/remote/file.txt');

      expect(result.ok).toBe(true);
      expect(mockSftpUnlink).toHaveBeenCalled();
    });

    it('should remove remote directory recursively', async () => {
      mockSftpStat.mockImplementation((path: string, callback: (err: Error | null, stats?: any) => void) => {
        callback(null, { isDirectory: () => true, isFile: () => false });
      });
      mockSftpReadDir.mockImplementation((path: string, callback: (err: Error | null, list?: any[]) => void) => {
        callback(null, []);
      });
      mockSftpRmdir.mockImplementation((path: string, callback: (err: Error | null) => void) => {
        callback(null);
      });

      const provider = new SSHFileSystemProvider(mockConnectionService as any);
      const result = await provider.rm('/remote/dir', { recursive: true });

      expect(result.ok).toBe(true);
      expect(mockSftpRmdir).toHaveBeenCalled();
    });
  });

  describe('exists', () => {
    it('should return true for existing file', async () => {
      mockSftpStat.mockImplementation((path: string, callback: (err: Error | null, stats?: any) => void) => {
        callback(null, {
          isFile: () => true,
          isDirectory: () => false,
          size: 100,
          mtime: 1700000000,
        });
      });

      const provider = new SSHFileSystemProvider(mockConnectionService as any);
      const result = await provider.exists('/remote/exists.txt');

      expect(result).toBe(true);
    });

    it('should return false for missing file', async () => {
      const error = new Error('No such file') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockSftpStat.mockImplementation((path: string, callback: (err: Error | null) => void) => {
        callback(error);
      });

      const provider = new SSHFileSystemProvider(mockConnectionService as any);
      const result = await provider.exists('/remote/missing.txt');

      expect(result).toBe(false);
    });
  });

  describe('watch (polling-based)', () => {
    it('should create a watch handle', () => {
      const provider = new SSHFileSystemProvider(mockConnectionService as any);
      const callback = vi.fn();

      const handle = provider.watch('/remote/watched', callback);

      expect(handle).toBeDefined();
      expect(typeof handle.close).toBe('function');

      handle.close();
    });

    it('should detect file changes via polling', async () => {
      let statCallCount = 0;
      mockSftpStat.mockImplementation((path: string, callback: (err: Error | null, stats?: any) => void) => {
        statCallCount++;
        callback(null, {
          size: statCallCount === 1 ? 100 : 200, // Size changes on second call
          mtime: statCallCount === 1 ? 1700000000 : 1700000001,
          isFile: () => true,
          isDirectory: () => false,
        });
      });

      const provider = new SSHFileSystemProvider(mockConnectionService as any, { watchInterval: 100 });
      const callback = vi.fn();

      const handle = provider.watch('/remote/watched.txt', callback);

      // Wait for polling to detect change
      await new Promise((resolve) => setTimeout(resolve, 250));

      expect(callback).toHaveBeenCalled();

      handle.close();
    });
  });

  describe('timeout handling', () => {
    it('should timeout operations after configured duration', async () => {
      // Simulate slow operation that never completes
      mockSftpReadFile.mockImplementation(() => {
        // Never call callback - simulates hung operation
      });

      const provider = new SSHFileSystemProvider(mockConnectionService as any, { operationTimeout: 100 });
      const result = await provider.readFile('/remote/slow-file.txt');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('TIMEOUT');
      }
    }, { timeout: 5000 });
  });

  describe('retry on connection loss', () => {
    it('should retry operation after reconnection', async () => {
      let callCount = 0;
      mockSftpReadFile.mockImplementation((path: string, callback: (err: Error | null, data?: Buffer) => void) => {
        callCount++;
        if (callCount === 1) {
          const error = new Error('Connection lost') as NodeJS.ErrnoException;
          error.code = 'ECONNRESET';
          callback(error);
        } else {
          callback(null, Buffer.from('Success after retry'));
        }
      });

      const provider = new SSHFileSystemProvider(mockConnectionService as any, { maxRetries: 2 });
      const result = await provider.readFile('/remote/retry-file.txt');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('Success after retry');
      }
      expect(callCount).toBeGreaterThan(1);
    });
  });
});
