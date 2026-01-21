/**
 * ConvertWorktreeHandlers Tests
 * Requirements: 3.1, 3.2, 3.3 (convert-spec-to-worktree feature)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './channels';
import { registerConvertWorktreeHandlers } from './convertWorktreeHandlers';

// Unmock this module to test the actual implementation
vi.unmock('./convertWorktreeHandlers');

// Mock logger
vi.mock('../services/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock handlers module to provide getCurrentProjectPath
vi.mock('./handlers', () => ({
  getCurrentProjectPath: vi.fn(() => '/test/project'),
}));

// Mock WorktreeService
const mockWorktreeService = {
  isOnMainBranch: vi.fn(),
  getCurrentBranch: vi.fn(),
  createWorktree: vi.fn(),
  removeWorktree: vi.fn(),
  createSymlinksForWorktree: vi.fn(),
};
vi.mock('../services/worktreeService', () => ({
  WorktreeService: vi.fn(() => mockWorktreeService),
}));

// Mock FileService
const mockFileService = {
  readSpecJson: vi.fn(),
  updateSpecJson: vi.fn(),
};
vi.mock('../services/fileService', () => ({
  FileService: vi.fn(() => mockFileService),
}));

// Mock fs/promises (used by ConvertWorktreeService)
vi.mock('fs/promises', () => ({
  access: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  cp: vi.fn().mockResolvedValue(undefined),
  rm: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue('{}'),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
}));

describe('ConvertWorktreeHandlers', () => {
  let handlers: Map<string, (...args: unknown[]) => Promise<unknown>>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Capture registered handlers
    handlers = new Map();
    vi.mocked(ipcMain.handle).mockImplementation((channel: string, handler: (...args: unknown[]) => Promise<unknown>) => {
      handlers.set(channel, handler);
    });

    // Register handlers
    registerConvertWorktreeHandlers();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('registerConvertWorktreeHandlers', () => {
    it('should register CONVERT_CHECK handler', () => {
      expect(ipcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.CONVERT_CHECK,
        expect.any(Function)
      );
    });

    it('should register CONVERT_TO_WORKTREE handler', () => {
      expect(ipcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.CONVERT_TO_WORKTREE,
        expect.any(Function)
      );
    });
  });

  describe('CONVERT_CHECK handler', () => {
    it('should check if spec can be converted', async () => {
      // Arrange
      const projectPath = '/test/project';
      const specPath = '/test/project/.kiro/specs/my-feature';

      // Mock the service methods
      mockWorktreeService.isOnMainBranch.mockResolvedValue({ ok: true, value: true });
      mockFileService.readSpecJson.mockResolvedValue({
        ok: true,
        value: { feature_name: 'my-feature', phase: 'tasks-generated' },
      });

      // Act
      const handler = handlers.get(IPC_CHANNELS.CONVERT_CHECK);
      expect(handler).toBeDefined();
      const result = await handler!({} as Electron.IpcMainInvokeEvent, projectPath, specPath);

      // Assert
      expect(result).toEqual({ ok: true, value: true });
    });

    it('should return error when not on main branch', async () => {
      // Arrange
      const projectPath = '/test/project';
      const specPath = '/test/project/.kiro/specs/my-feature';

      mockWorktreeService.isOnMainBranch.mockResolvedValue({ ok: true, value: false });
      mockWorktreeService.getCurrentBranch.mockResolvedValue({ ok: true, value: 'develop' });

      // Act
      const handler = handlers.get(IPC_CHANNELS.CONVERT_CHECK);
      const result = await handler!({} as Electron.IpcMainInvokeEvent, projectPath, specPath);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_ON_MAIN_BRANCH');
      }
    });
  });

  describe('CONVERT_TO_WORKTREE handler', () => {
    it('should convert spec to worktree mode', async () => {
      // Arrange
      const projectPath = '/test/project';
      const specPath = '/test/project/.kiro/specs/my-feature';
      const featureName = 'my-feature';

      // Mock successful conversion
      mockWorktreeService.isOnMainBranch.mockResolvedValue({ ok: true, value: true });
      mockFileService.readSpecJson.mockResolvedValue({
        ok: true,
        value: { feature_name: 'my-feature', phase: 'tasks-generated' },
      });
      mockWorktreeService.createWorktree.mockResolvedValue({
        ok: true,
        value: {
          path: '.kiro/worktrees/specs/my-feature',
          absolutePath: '/test/project/.kiro/worktrees/specs/my-feature',
          branch: 'feature/my-feature',
          created_at: '2026-01-20T00:00:00Z',
        },
      });
      mockWorktreeService.createSymlinksForWorktree.mockResolvedValue({ ok: true, value: undefined });
      mockFileService.updateSpecJson.mockResolvedValue({ ok: true, value: undefined });

      // Act
      const handler = handlers.get(IPC_CHANNELS.CONVERT_TO_WORKTREE);
      expect(handler).toBeDefined();
      const result = await handler!({} as Electron.IpcMainInvokeEvent, projectPath, specPath, featureName);

      // Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.path).toBe('.kiro/worktrees/specs/my-feature');
        expect(result.value.branch).toBe('feature/my-feature');
      }
    });

    it('should return error when worktree creation fails', async () => {
      // Arrange
      const projectPath = '/test/project';
      const specPath = '/test/project/.kiro/specs/my-feature';
      const featureName = 'my-feature';

      mockWorktreeService.isOnMainBranch.mockResolvedValue({ ok: true, value: true });
      mockFileService.readSpecJson.mockResolvedValue({
        ok: true,
        value: { feature_name: 'my-feature', phase: 'tasks-generated' },
      });
      mockWorktreeService.createWorktree.mockResolvedValue({
        ok: false,
        error: { type: 'GIT_ERROR', message: 'Branch already exists' },
      });

      // Act
      const handler = handlers.get(IPC_CHANNELS.CONVERT_TO_WORKTREE);
      const result = await handler!({} as Electron.IpcMainInvokeEvent, projectPath, specPath, featureName);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('WORKTREE_CREATE_FAILED');
      }
    });
  });
});
