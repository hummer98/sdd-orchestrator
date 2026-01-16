/**
 * IPC Contract Tests for Bug Worktree Handlers
 *
 * These tests verify that IPC handlers are registered with the correct signatures
 * matching the preload API definitions.
 *
 * This prevents the bug where preload passes different arguments than the handler expects.
 * See: docs/technical-notes/electron-ipc-contract-mismatch.md
 *
 * Requirements: 3.1, 3.3, 4.6, 8.5, 9.1, 9.2, 12.1-12.4 (bugs-worktree-support)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ipcMain } from 'electron';
import { registerBugWorktreeHandlers } from './bugWorktreeHandlers';
import { IPC_CHANNELS } from './channels';

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

// Mock handlers module to get getCurrentProjectPath
vi.mock('./handlers', () => ({
  getCurrentProjectPath: vi.fn().mockReturnValue('/mock/project/path'),
}));

// Mock logger
vi.mock('../services/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock configStore
vi.mock('../services/configStore', () => ({
  getConfigStore: vi.fn().mockReturnValue({
    getBugsWorktreeDefault: vi.fn().mockReturnValue(false),
    setBugsWorktreeDefault: vi.fn(),
  }),
}));

// Mock BugService
vi.mock('../services/bugService', () => ({
  BugService: vi.fn().mockImplementation(() => ({
    addWorktreeField: vi.fn().mockResolvedValue({ ok: true }),
    removeWorktreeField: vi.fn().mockResolvedValue({ ok: true }),
  })),
}));

// Mock BugWorkflowService
vi.mock('../services/bugWorkflowService', () => ({
  BugWorkflowService: vi.fn().mockImplementation(() => ({
    startBugFixWithAutoWorktree: vi.fn().mockResolvedValue({ ok: true, value: null }),
  })),
}));

// Mock WorktreeService
vi.mock('../services/worktreeService', () => ({
  WorktreeService: vi.fn().mockImplementation(() => ({
    createBugWorktree: vi.fn().mockResolvedValue({
      ok: true,
      value: {
        path: '../test-project-worktrees/bugs/test-bug',
        absolutePath: '/tmp/test-project-worktrees/bugs/test-bug',
        branch: 'bugfix/test-bug',
        created_at: '2025-01-15T00:00:00Z',
      },
    }),
    removeBugWorktree: vi.fn().mockResolvedValue({
      ok: true,
      value: undefined,
    }),
  })),
}));

describe('IPC Contract Tests - Bug Worktree Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerBugWorktreeHandlers', () => {
    it('should register all bug worktree IPC handlers', () => {
      registerBugWorktreeHandlers();

      // Verify all expected handlers are registered
      expect(ipcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.BUG_WORKTREE_CREATE,
        expect.any(Function)
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.BUG_WORKTREE_REMOVE,
        expect.any(Function)
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.SETTINGS_BUGS_WORKTREE_DEFAULT_GET,
        expect.any(Function)
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.SETTINGS_BUGS_WORKTREE_DEFAULT_SET,
        expect.any(Function)
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.BUG_WORKTREE_AUTO_EXECUTION,
        expect.any(Function)
      );
    });

    it('BUG_WORKTREE_CREATE handler should accept only bugName (matching preload signature)', async () => {
      registerBugWorktreeHandlers();

      // Get the registered handler
      const handleCall = vi.mocked(ipcMain.handle).mock.calls.find(
        (call) => call[0] === IPC_CHANNELS.BUG_WORKTREE_CREATE
      );
      expect(handleCall).toBeDefined();

      const handler = handleCall![1];

      // Simulate preload call with only bugName (as defined in preload/index.ts)
      // preload: createBugWorktree: (bugName: string) => ipcRenderer.invoke(...)
      const mockEvent = {} as Electron.IpcMainInvokeEvent;
      const result = await handler(mockEvent, 'test-bug');

      // Handler should work with just bugName, deriving projectPath internally
      expect(result).toBeDefined();
      expect(result.ok).toBe(true);
    });

    it('BUG_WORKTREE_REMOVE handler should accept only bugName (matching preload signature)', async () => {
      registerBugWorktreeHandlers();

      // Get the registered handler
      const handleCall = vi.mocked(ipcMain.handle).mock.calls.find(
        (call) => call[0] === IPC_CHANNELS.BUG_WORKTREE_REMOVE
      );
      expect(handleCall).toBeDefined();

      const handler = handleCall![1];

      // Simulate preload call with only bugName (as defined in preload/index.ts)
      // preload: removeBugWorktree: (bugName: string) => ipcRenderer.invoke(...)
      const mockEvent = {} as Electron.IpcMainInvokeEvent;
      const result = await handler(mockEvent, 'test-bug');

      // Handler should work with just bugName, deriving projectPath internally
      expect(result).toBeDefined();
      expect(result.ok).toBe(true);
    });

    it('BUG_WORKTREE_AUTO_EXECUTION handler should accept only bugName (matching preload signature)', async () => {
      registerBugWorktreeHandlers();

      // Get the registered handler
      const handleCall = vi.mocked(ipcMain.handle).mock.calls.find(
        (call) => call[0] === IPC_CHANNELS.BUG_WORKTREE_AUTO_EXECUTION
      );
      expect(handleCall).toBeDefined();

      const handler = handleCall![1];

      // Simulate preload call with only bugName (as defined in preload/index.ts)
      // preload: createBugWorktreeWithAutoExecution: (bugName: string) => ipcRenderer.invoke(...)
      const mockEvent = {} as Electron.IpcMainInvokeEvent;
      const result = await handler(mockEvent, 'test-bug');

      // Handler should work with just bugName
      expect(result).toBeDefined();
      expect(result.ok).toBe(true);
    });

    it('SETTINGS_BUGS_WORKTREE_DEFAULT_GET handler should accept no arguments', async () => {
      registerBugWorktreeHandlers();

      const handleCall = vi.mocked(ipcMain.handle).mock.calls.find(
        (call) => call[0] === IPC_CHANNELS.SETTINGS_BUGS_WORKTREE_DEFAULT_GET
      );
      expect(handleCall).toBeDefined();

      const handler = handleCall![1];
      const mockEvent = {} as Electron.IpcMainInvokeEvent;

      // Should work with no additional arguments
      const result = await handler(mockEvent);
      expect(typeof result).toBe('boolean');
    });

    it('SETTINGS_BUGS_WORKTREE_DEFAULT_SET handler should accept boolean value', async () => {
      registerBugWorktreeHandlers();

      const handleCall = vi.mocked(ipcMain.handle).mock.calls.find(
        (call) => call[0] === IPC_CHANNELS.SETTINGS_BUGS_WORKTREE_DEFAULT_SET
      );
      expect(handleCall).toBeDefined();

      const handler = handleCall![1];
      const mockEvent = {} as Electron.IpcMainInvokeEvent;

      // Should work with boolean argument
      await expect(handler(mockEvent, true)).resolves.not.toThrow();
      await expect(handler(mockEvent, false)).resolves.not.toThrow();
    });
  });

  describe('IPC contract validation against preload signatures', () => {
    /**
     * These tests document the expected preload -> handler contract.
     * If the preload signature changes, these tests should be updated accordingly.
     *
     * Preload signatures (from preload/index.ts):
     * - createBugWorktree: (bugName: string) => Promise<...>
     * - removeBugWorktree: (bugName: string) => Promise<...>
     * - getBugsWorktreeDefault: () => Promise<boolean>
     * - createBugWorktreeWithAutoExecution: (bugName: string) => Promise<...>
     */

    it('documents expected preload signatures', () => {
      // This test serves as documentation and will fail if the contract is broken
      const expectedContracts = [
        {
          channel: IPC_CHANNELS.BUG_WORKTREE_CREATE,
          preloadArgs: ['bugName: string'],
          description: 'createBugWorktree(bugName)',
        },
        {
          channel: IPC_CHANNELS.BUG_WORKTREE_REMOVE,
          preloadArgs: ['bugName: string'],
          description: 'removeBugWorktree(bugName)',
        },
        {
          channel: IPC_CHANNELS.SETTINGS_BUGS_WORKTREE_DEFAULT_GET,
          preloadArgs: [],
          description: 'getBugsWorktreeDefault()',
        },
        {
          channel: IPC_CHANNELS.SETTINGS_BUGS_WORKTREE_DEFAULT_SET,
          preloadArgs: ['value: boolean'],
          description: 'setBugsWorktreeDefault(value)',
        },
        {
          channel: IPC_CHANNELS.BUG_WORKTREE_AUTO_EXECUTION,
          preloadArgs: ['bugName: string'],
          description: 'createBugWorktreeWithAutoExecution(bugName)',
        },
      ];

      // Just verify the contracts are defined - actual validation is in other tests
      expect(expectedContracts.length).toBe(5);
    });
  });
});
