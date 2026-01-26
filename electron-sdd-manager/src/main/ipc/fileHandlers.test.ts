/**
 * fileHandlers.test.ts
 * Unit tests for file-related IPC handlers
 * Task 3.1: TDD - Write tests first
 * Requirements: 1.3, 2.1, 2.2, 2.3, 4.1, 4.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, dialog } from 'electron';
import { IPC_CHANNELS } from './channels';
import type { FileService } from '../services/fileService';
import type { Result, FileError } from '../../renderer/types';

// Mock electron with app and dialog for logger and file operations
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  dialog: {
    showOpenDialog: vi.fn(),
  },
  app: {
    isPackaged: false,
    getPath: vi.fn(() => '/tmp'),
  },
}));

// Mock logger to avoid file system operations
vi.mock('../services/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock child_process to prevent actual command execution (e.g. code /path/to/project)
vi.mock('child_process', () => {
  const mockSpawn = vi.fn().mockReturnValue({
    unref: vi.fn(),
    on: vi.fn(),
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    stdin: { end: vi.fn() },
    kill: vi.fn(),
  });
  return {
    spawn: mockSpawn,
    default: {
      spawn: mockSpawn,
    },
  };
});

// Import spawn after mocking to verify it
import { spawn } from 'child_process';

// Mock path module
vi.mock('path', async (importOriginal) => {
  const actual = await importOriginal<typeof import('path')>();
  return {
    ...actual,
    join: vi.fn((...args: string[]) => args.join('/')),
  };
});

describe('fileHandlers', () => {
  // Mock services
  let mockFileService: {
    resolveSpecPath: ReturnType<typeof vi.fn>;
    resolveBugPath: ReturnType<typeof vi.fn>;
    readArtifact: ReturnType<typeof vi.fn>;
    writeFile: ReturnType<typeof vi.fn>;
  };

  let mockGetCurrentProjectPath: ReturnType<typeof vi.fn>;

  // Store registered handlers for testing
  const registeredHandlers: Map<string, (...args: unknown[]) => Promise<unknown>> = new Map();

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    // Reset handlers map
    registeredHandlers.clear();

    // Capture registered handlers
    vi.mocked(ipcMain.handle).mockImplementation((channel: string, handler: (...args: unknown[]) => Promise<unknown>) => {
      registeredHandlers.set(channel, handler);
      return undefined as unknown as Electron.IpcMain;
    });

    // Initialize mock services
    mockFileService = {
      resolveSpecPath: vi.fn(),
      resolveBugPath: vi.fn(),
      readArtifact: vi.fn(),
      writeFile: vi.fn(),
    };

    mockGetCurrentProjectPath = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('registerFileHandlers', () => {
    it('should register all file-related IPC handlers', async () => {
      // Import the module (which will be implemented)
      const { registerFileHandlers } = await import('./fileHandlers');

      // Register handlers with mock dependencies
      registerFileHandlers({
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: mockGetCurrentProjectPath,
      });

      // Verify all file handlers are registered
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.SHOW_OPEN_DIALOG, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.READ_ARTIFACT, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.WRITE_ARTIFACT, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.WRITE_FILE, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.OPEN_IN_VSCODE, expect.any(Function));
    });
  });

  describe('SHOW_OPEN_DIALOG handler', () => {
    it('should return selected directory path', async () => {
      const { registerFileHandlers } = await import('./fileHandlers');

      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: false,
        filePaths: ['/path/to/selected/project'],
      });

      registerFileHandlers({
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: mockGetCurrentProjectPath,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.SHOW_OPEN_DIALOG);
      expect(handler).toBeDefined();

      const result = await handler!({} as Electron.IpcMainInvokeEvent);
      expect(result).toBe('/path/to/selected/project');
      expect(dialog.showOpenDialog).toHaveBeenCalledWith({
        properties: ['openDirectory'],
        title: 'プロジェクトディレクトリを選択',
      });
    });

    it('should return null when dialog is canceled', async () => {
      const { registerFileHandlers } = await import('./fileHandlers');

      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: true,
        filePaths: [],
      });

      registerFileHandlers({
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: mockGetCurrentProjectPath,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.SHOW_OPEN_DIALOG);
      const result = await handler!({} as Electron.IpcMainInvokeEvent);
      expect(result).toBeNull();
    });

    it('should return null when no file paths are selected', async () => {
      const { registerFileHandlers } = await import('./fileHandlers');

      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: false,
        filePaths: [],
      });

      registerFileHandlers({
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: mockGetCurrentProjectPath,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.SHOW_OPEN_DIALOG);
      const result = await handler!({} as Electron.IpcMainInvokeEvent);
      expect(result).toBeNull();
    });
  });

  describe('READ_ARTIFACT handler', () => {
    it('should return artifact content for spec', async () => {
      const { registerFileHandlers } = await import('./fileHandlers');

      mockGetCurrentProjectPath.mockReturnValue('/project/path');
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/project/path/.kiro/specs/my-spec',
      } as Result<string, FileError>);
      mockFileService.readArtifact.mockResolvedValue({
        ok: true,
        value: '# Requirements\n\nThis is the content',
      } as Result<string, FileError>);

      registerFileHandlers({
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: mockGetCurrentProjectPath,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.READ_ARTIFACT);
      expect(handler).toBeDefined();

      const result = await handler!({} as Electron.IpcMainInvokeEvent, 'my-spec', 'requirements.md', 'spec');
      expect(result).toBe('# Requirements\n\nThis is the content');
      expect(mockFileService.resolveSpecPath).toHaveBeenCalledWith('/project/path', 'my-spec');
    });

    it('should return artifact content for bug', async () => {
      const { registerFileHandlers } = await import('./fileHandlers');

      mockGetCurrentProjectPath.mockReturnValue('/project/path');
      mockFileService.resolveBugPath.mockResolvedValue({
        ok: true,
        value: '/project/path/.kiro/bugs/my-bug',
      } as Result<string, FileError>);
      mockFileService.readArtifact.mockResolvedValue({
        ok: true,
        value: '# Bug Report\n\nThis is the bug',
      } as Result<string, FileError>);

      registerFileHandlers({
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: mockGetCurrentProjectPath,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.READ_ARTIFACT);
      const result = await handler!({} as Electron.IpcMainInvokeEvent, 'my-bug', 'report.md', 'bug');
      expect(result).toBe('# Bug Report\n\nThis is the bug');
      expect(mockFileService.resolveBugPath).toHaveBeenCalledWith('/project/path', 'my-bug');
    });

    it('should throw error when project not selected', async () => {
      const { registerFileHandlers } = await import('./fileHandlers');

      mockGetCurrentProjectPath.mockReturnValue(null);

      registerFileHandlers({
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: mockGetCurrentProjectPath,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.READ_ARTIFACT);
      await expect(handler!({} as Electron.IpcMainInvokeEvent, 'my-spec', 'requirements.md', 'spec'))
        .rejects.toThrow('Project not selected');
    });

    it('should throw error when spec not found', async () => {
      const { registerFileHandlers } = await import('./fileHandlers');

      mockGetCurrentProjectPath.mockReturnValue('/project/path');
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_FOUND', path: 'unknown-spec' },
      } as Result<string, FileError>);

      registerFileHandlers({
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: mockGetCurrentProjectPath,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.READ_ARTIFACT);
      await expect(handler!({} as Electron.IpcMainInvokeEvent, 'unknown-spec', 'requirements.md', 'spec'))
        .rejects.toThrow('Spec not found: unknown-spec');
    });

    it('should throw error when artifact read fails', async () => {
      const { registerFileHandlers } = await import('./fileHandlers');

      mockGetCurrentProjectPath.mockReturnValue('/project/path');
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/project/path/.kiro/specs/my-spec',
      } as Result<string, FileError>);
      mockFileService.readArtifact.mockResolvedValue({
        ok: false,
        error: { type: 'READ_ERROR', path: 'requirements.md' },
      } as Result<string, FileError>);

      registerFileHandlers({
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: mockGetCurrentProjectPath,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.READ_ARTIFACT);
      await expect(handler!({} as Electron.IpcMainInvokeEvent, 'my-spec', 'requirements.md', 'spec'))
        .rejects.toThrow('Failed to read artifact: READ_ERROR');
    });

    it('should use spec as default entity type', async () => {
      const { registerFileHandlers } = await import('./fileHandlers');

      mockGetCurrentProjectPath.mockReturnValue('/project/path');
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/project/path/.kiro/specs/my-spec',
      } as Result<string, FileError>);
      mockFileService.readArtifact.mockResolvedValue({
        ok: true,
        value: 'content',
      } as Result<string, FileError>);

      registerFileHandlers({
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: mockGetCurrentProjectPath,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.READ_ARTIFACT);
      // Call without entityType parameter (should default to 'spec')
      await handler!({} as Electron.IpcMainInvokeEvent, 'my-spec', 'requirements.md');
      expect(mockFileService.resolveSpecPath).toHaveBeenCalledWith('/project/path', 'my-spec');
      expect(mockFileService.resolveBugPath).not.toHaveBeenCalled();
    });
  });

  describe('WRITE_ARTIFACT handler', () => {
    it('should write artifact content for spec', async () => {
      const { registerFileHandlers } = await import('./fileHandlers');

      mockGetCurrentProjectPath.mockReturnValue('/project/path');
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/project/path/.kiro/specs/my-spec',
      } as Result<string, FileError>);
      mockFileService.writeFile.mockResolvedValue({
        ok: true,
        value: undefined,
      } as Result<undefined, FileError>);

      registerFileHandlers({
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: mockGetCurrentProjectPath,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.WRITE_ARTIFACT);
      expect(handler).toBeDefined();

      await handler!({} as Electron.IpcMainInvokeEvent, 'my-spec', 'requirements.md', '# New Content', 'spec');
      expect(mockFileService.resolveSpecPath).toHaveBeenCalledWith('/project/path', 'my-spec');
      expect(mockFileService.writeFile).toHaveBeenCalled();
    });

    it('should write artifact content for bug', async () => {
      const { registerFileHandlers } = await import('./fileHandlers');

      mockGetCurrentProjectPath.mockReturnValue('/project/path');
      mockFileService.resolveBugPath.mockResolvedValue({
        ok: true,
        value: '/project/path/.kiro/bugs/my-bug',
      } as Result<string, FileError>);
      mockFileService.writeFile.mockResolvedValue({
        ok: true,
        value: undefined,
      } as Result<undefined, FileError>);

      registerFileHandlers({
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: mockGetCurrentProjectPath,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.WRITE_ARTIFACT);
      await handler!({} as Electron.IpcMainInvokeEvent, 'my-bug', 'report.md', '# Bug Report', 'bug');
      expect(mockFileService.resolveBugPath).toHaveBeenCalledWith('/project/path', 'my-bug');
      expect(mockFileService.writeFile).toHaveBeenCalled();
    });

    it('should throw error when project not selected', async () => {
      const { registerFileHandlers } = await import('./fileHandlers');

      mockGetCurrentProjectPath.mockReturnValue(null);

      registerFileHandlers({
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: mockGetCurrentProjectPath,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.WRITE_ARTIFACT);
      await expect(handler!({} as Electron.IpcMainInvokeEvent, 'my-spec', 'requirements.md', 'content', 'spec'))
        .rejects.toThrow('Project not selected');
    });

    it('should throw error when spec not found', async () => {
      const { registerFileHandlers } = await import('./fileHandlers');

      mockGetCurrentProjectPath.mockReturnValue('/project/path');
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_FOUND', path: 'unknown-spec' },
      } as Result<string, FileError>);

      registerFileHandlers({
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: mockGetCurrentProjectPath,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.WRITE_ARTIFACT);
      await expect(handler!({} as Electron.IpcMainInvokeEvent, 'unknown-spec', 'requirements.md', 'content', 'spec'))
        .rejects.toThrow('Spec not found: unknown-spec');
    });

    it('should throw error when write fails', async () => {
      const { registerFileHandlers } = await import('./fileHandlers');

      mockGetCurrentProjectPath.mockReturnValue('/project/path');
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/project/path/.kiro/specs/my-spec',
      } as Result<string, FileError>);
      mockFileService.writeFile.mockResolvedValue({
        ok: false,
        error: { type: 'WRITE_ERROR', path: 'requirements.md' },
      } as Result<undefined, FileError>);

      registerFileHandlers({
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: mockGetCurrentProjectPath,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.WRITE_ARTIFACT);
      await expect(handler!({} as Electron.IpcMainInvokeEvent, 'my-spec', 'requirements.md', 'content', 'spec'))
        .rejects.toThrow('Failed to write artifact: WRITE_ERROR');
    });
  });

  describe('WRITE_FILE handler', () => {
    it('should write file content to specified path', async () => {
      const { registerFileHandlers } = await import('./fileHandlers');

      mockFileService.writeFile.mockResolvedValue({
        ok: true,
        value: undefined,
      } as Result<undefined, FileError>);

      registerFileHandlers({
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: mockGetCurrentProjectPath,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.WRITE_FILE);
      expect(handler).toBeDefined();

      await handler!({} as Electron.IpcMainInvokeEvent, '/path/to/file.md', '# Content');
      expect(mockFileService.writeFile).toHaveBeenCalledWith('/path/to/file.md', '# Content');
    });

    it('should throw error when write fails', async () => {
      const { registerFileHandlers } = await import('./fileHandlers');

      mockFileService.writeFile.mockResolvedValue({
        ok: false,
        error: { type: 'WRITE_ERROR', path: '/path/to/file.md' },
      } as Result<undefined, FileError>);

      registerFileHandlers({
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: mockGetCurrentProjectPath,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.WRITE_FILE);
      await expect(handler!({} as Electron.IpcMainInvokeEvent, '/path/to/file.md', '# Content'))
        .rejects.toThrow('Failed to write file: WRITE_ERROR');
    });
  });

  describe('OPEN_IN_VSCODE handler', () => {
    it('should register OPEN_IN_VSCODE handler', async () => {
      const { registerFileHandlers } = await import('./fileHandlers');

      registerFileHandlers({
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: mockGetCurrentProjectPath,
      });

      // Verify the handler is registered
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.OPEN_IN_VSCODE, expect.any(Function));
      const handler = registeredHandlers.get(IPC_CHANNELS.OPEN_IN_VSCODE);
      expect(handler).toBeDefined();
    });

    it('should complete successfully when spawn does not throw', async () => {
      const { registerFileHandlers } = await import('./fileHandlers');

      registerFileHandlers({
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: mockGetCurrentProjectPath,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.OPEN_IN_VSCODE);
      expect(handler).toBeDefined();

      // Handler should complete without throwing (spawn is mocked to return successfully)
      // The actual spawn behavior is tested at integration level
      // Here we verify the handler returns without error
      await expect(handler!({} as Electron.IpcMainInvokeEvent, '/path/to/project')).resolves.toBeUndefined();

      // Verify spawn was called with correct arguments
      expect(spawn).toHaveBeenCalledWith('code', ['/path/to/project'], expect.objectContaining({
        detached: true,
        stdio: 'ignore',
      }));
    });
  });

  describe('FileHandlersDependencies interface', () => {
    it('should accept mock dependencies with proper interface', async () => {
      const { registerFileHandlers } = await import('./fileHandlers');

      // This test verifies the interface by ensuring our mock matches it
      const dependencies = {
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: mockGetCurrentProjectPath,
      };

      // Should not throw
      expect(() => registerFileHandlers(dependencies)).not.toThrow();
    });
  });
});
