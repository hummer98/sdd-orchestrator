/**
 * projectFileHandlers Tests
 *
 * TDD: Tests written first for project-config-editor Task 2.2
 * Requirements: 3.1, 4.1, 5.4
 *
 * Test cases:
 * - LIST_PROJECT_FILES: Returns CLAUDE.md and steering files
 * - READ_PROJECT_FILE: Reads file content
 * - WRITE_PROJECT_FILE: Writes file content
 * - PROJECT_FILE_CHANGED event: External change notification
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ipcMain, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  BrowserWindow: {
    getAllWindows: vi.fn().mockReturnValue([]),
  },
  app: {
    isPackaged: false,
    getPath: vi.fn((name: string) => {
      if (name === 'logs') return '/tmp/logs';
      return '/tmp';
    }),
  },
}));

// Mock fs/promises
vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>();
  return {
    ...actual,
    access: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(),
  };
});

// Mock ProjectFileWatcherService
vi.mock('../services/ProjectFileWatcherService', () => ({
  ProjectFileWatcherService: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    onChange: vi.fn(),
    isRunning: vi.fn().mockReturnValue(false),
    getProjectPath: vi.fn().mockReturnValue(null),
  })),
}));

import { registerProjectFileHandlers, getProjectFileWatcherService } from './projectFileHandlers';
import { IPC_CHANNELS } from './channels';

describe('projectFileHandlers', () => {
  const mockGetCurrentProjectPath = vi.fn();
  let registeredHandlers: Map<string, (...args: any[]) => Promise<any>>;

  beforeEach(() => {
    vi.clearAllMocks();
    registeredHandlers = new Map();

    // Capture registered handlers
    (ipcMain.handle as any).mockImplementation(
      (channel: string, handler: (...args: any[]) => Promise<any>) => {
        registeredHandlers.set(channel, handler);
      }
    );

    mockGetCurrentProjectPath.mockReturnValue('/test/project');

    registerProjectFileHandlers({
      getCurrentProjectPath: mockGetCurrentProjectPath,
    });
  });

  describe('PROJECT_FILE_LIST handler', () => {
    it('should be registered', () => {
      expect(registeredHandlers.has(IPC_CHANNELS.PROJECT_FILE_LIST)).toBe(true);
    });

    it('should return CLAUDE.md when it exists', async () => {
      (fs.access as any).mockResolvedValue(undefined);
      (fs.readdir as any).mockResolvedValue([]);

      const handler = registeredHandlers.get(IPC_CHANNELS.PROJECT_FILE_LIST);
      const result = await handler!({});

      expect(result.claudeMd).not.toBeNull();
      expect(result.claudeMd?.fileName).toBe('CLAUDE.md');
      expect(result.claudeMd?.group).toBe('claude');
      expect(result.claudeMd?.exists).toBe(true);
    });

    it('should return null for CLAUDE.md when it does not exist', async () => {
      (fs.access as any).mockRejectedValue(new Error('ENOENT'));
      (fs.readdir as any).mockResolvedValue([]);

      const handler = registeredHandlers.get(IPC_CHANNELS.PROJECT_FILE_LIST);
      const result = await handler!({});

      expect(result.claudeMd).toBeNull();
    });

    it('should return steering files list', async () => {
      (fs.access as any).mockResolvedValue(undefined);
      (fs.readdir as any).mockResolvedValue([
        { name: 'product.md', isFile: () => true },
        { name: 'tech.md', isFile: () => true },
        { name: '.hidden', isFile: () => true },
        { name: 'readme.txt', isFile: () => true },
      ]);

      const handler = registeredHandlers.get(IPC_CHANNELS.PROJECT_FILE_LIST);
      const result = await handler!({});

      expect(result.steeringFiles).toHaveLength(2);
      expect(result.steeringFiles[0].fileName).toBe('product.md');
      expect(result.steeringFiles[0].group).toBe('steering');
      expect(result.steeringFiles[1].fileName).toBe('tech.md');
    });

    it('should return empty steering files when directory does not exist', async () => {
      (fs.access as any).mockRejectedValue(new Error('ENOENT'));
      (fs.readdir as any).mockRejectedValue(new Error('ENOENT'));

      const handler = registeredHandlers.get(IPC_CHANNELS.PROJECT_FILE_LIST);
      const result = await handler!({});

      expect(result.steeringFiles).toEqual([]);
    });

    it('should throw error when no project is selected', async () => {
      mockGetCurrentProjectPath.mockReturnValue(null);

      const handler = registeredHandlers.get(IPC_CHANNELS.PROJECT_FILE_LIST);
      await expect(handler!({})).rejects.toThrow('Project not selected');
    });
  });

  describe('PROJECT_FILE_READ handler', () => {
    it('should be registered', () => {
      expect(registeredHandlers.has(IPC_CHANNELS.PROJECT_FILE_READ)).toBe(true);
    });

    it('should read file content', async () => {
      (fs.readFile as any).mockResolvedValue('# CLAUDE.md content');

      const handler = registeredHandlers.get(IPC_CHANNELS.PROJECT_FILE_READ);
      const result = await handler!({}, '/test/project/CLAUDE.md');

      expect(result).toBe('# CLAUDE.md content');
      expect(fs.readFile).toHaveBeenCalledWith('/test/project/CLAUDE.md', 'utf-8');
    });

    it('should validate file path is within project', async () => {
      const handler = registeredHandlers.get(IPC_CHANNELS.PROJECT_FILE_READ);
      await expect(handler!({}, '/other/project/file.md')).rejects.toThrow(
        'File path must be within project directory'
      );
    });

    it('should throw error when no project is selected', async () => {
      mockGetCurrentProjectPath.mockReturnValue(null);

      const handler = registeredHandlers.get(IPC_CHANNELS.PROJECT_FILE_READ);
      await expect(handler!({}, '/test/project/file.md')).rejects.toThrow('Project not selected');
    });
  });

  describe('PROJECT_FILE_WRITE handler', () => {
    it('should be registered', () => {
      expect(registeredHandlers.has(IPC_CHANNELS.PROJECT_FILE_WRITE)).toBe(true);
    });

    it('should write file content', async () => {
      (fs.writeFile as any).mockResolvedValue(undefined);

      const handler = registeredHandlers.get(IPC_CHANNELS.PROJECT_FILE_WRITE);
      await handler!({}, '/test/project/CLAUDE.md', '# Updated content');

      expect(fs.writeFile).toHaveBeenCalledWith('/test/project/CLAUDE.md', '# Updated content', 'utf-8');
    });

    it('should validate file path is within project', async () => {
      const handler = registeredHandlers.get(IPC_CHANNELS.PROJECT_FILE_WRITE);
      await expect(
        handler!({}, '/other/project/file.md', 'content')
      ).rejects.toThrow('File path must be within project directory');
    });

    it('should throw error when no project is selected', async () => {
      mockGetCurrentProjectPath.mockReturnValue(null);

      const handler = registeredHandlers.get(IPC_CHANNELS.PROJECT_FILE_WRITE);
      await expect(
        handler!({}, '/test/project/file.md', 'content')
      ).rejects.toThrow('Project not selected');
    });
  });

  describe('getProjectFileWatcherService', () => {
    it('should return the watcher service instance', () => {
      const service = getProjectFileWatcherService();
      expect(service).toBeDefined();
    });
  });
});
