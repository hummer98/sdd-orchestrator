/**
 * bugHandlers.test.ts
 * Unit tests for bug-related IPC handlers
 * Task 6.1: TDD - Write tests first
 * Requirements: 1.6, 2.1, 2.2, 2.3, 4.1, 4.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from './channels';
import type { BugMetadata, BugDetail, BugPhase } from '../../renderer/types/bug';
import type { BugService, ReadBugsResult } from '../services/bugService';
import type { FileService } from '../services/fileService';
import type { SpecManagerService } from '../services/specManagerService';

// Mock electron with app for logger
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  BrowserWindow: {
    fromWebContents: vi.fn(),
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

// Mock BugsWatcherService
vi.mock('../services/bugsWatcherService', () => ({
  BugsWatcherService: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    onChange: vi.fn(),
  })),
}));

// Mock remoteAccessHandlers
vi.mock('./remoteAccessHandlers', () => ({
  getRemoteAccessServer: vi.fn().mockReturnValue({
    getWebSocketHandler: vi.fn().mockReturnValue(null),
  }),
}));

// Mock WorktreeService for worktreeMode tests
vi.mock('../services/worktreeService', () => ({
  WorktreeService: vi.fn().mockImplementation(() => ({
    isOnMainBranch: vi.fn().mockResolvedValue({ ok: true, value: true }),
    getCurrentBranch: vi.fn().mockResolvedValue({ ok: true, value: 'main' }),
  })),
}));

describe('bugHandlers', () => {
  // Mock services
  let mockBugService: {
    readBugs: ReturnType<typeof vi.fn>;
    readBugDetail: ReturnType<typeof vi.fn>;
    updateBugJsonPhase: ReturnType<typeof vi.fn>;
  };

  let mockFileService: {
    resolveBugPath: ReturnType<typeof vi.fn>;
  };

  let mockSpecManagerService: {
    startAgent: ReturnType<typeof vi.fn>;
    onOutput: ReturnType<typeof vi.fn>;
    onStatusChange: ReturnType<typeof vi.fn>;
    onExit: ReturnType<typeof vi.fn>;
  };

  // Store registered handlers for testing
  const registeredHandlers: Map<string, (...args: unknown[]) => Promise<unknown>> = new Map();

  // Mock BrowserWindow
  let mockWindow: {
    webContents: { send: ReturnType<typeof vi.fn> };
    isDestroyed: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset handlers map
    registeredHandlers.clear();

    // Capture registered handlers
    vi.mocked(ipcMain.handle).mockImplementation((channel: string, handler: (...args: unknown[]) => Promise<unknown>) => {
      registeredHandlers.set(channel, handler);
      return undefined as unknown as Electron.IpcMain;
    });

    // Initialize mock BrowserWindow
    mockWindow = {
      webContents: { send: vi.fn() },
      isDestroyed: vi.fn().mockReturnValue(false),
    };
    vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(mockWindow as unknown as BrowserWindow);

    // Initialize mock services
    mockBugService = {
      readBugs: vi.fn(),
      readBugDetail: vi.fn(),
      updateBugJsonPhase: vi.fn(),
    };

    mockFileService = {
      resolveBugPath: vi.fn(),
    };

    mockSpecManagerService = {
      startAgent: vi.fn(),
      onOutput: vi.fn(),
      onStatusChange: vi.fn(),
      onExit: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('registerBugHandlers', () => {
    it('should register all bug-related IPC handlers', async () => {
      const { registerBugHandlers } = await import('./bugHandlers');

      // Register handlers with mock dependencies
      registerBugHandlers({
        bugService: mockBugService as unknown as BugService,
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: () => '/test/project',
        getSpecManagerService: () => mockSpecManagerService as unknown as SpecManagerService,
        registerEventCallbacks: vi.fn(),
        getEventCallbacksRegistered: () => false,
        setEventCallbacksRegistered: vi.fn(),
      });

      // Verify all bug handlers are registered
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.READ_BUGS, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.READ_BUG_DETAIL, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.START_BUGS_WATCHER, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.STOP_BUGS_WATCHER, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.EXECUTE_BUG_CREATE, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.BUG_PHASE_UPDATE, expect.any(Function));
    });
  });

  describe('READ_BUGS handler', () => {
    it('should return bugs list from bugService', async () => {
      const { registerBugHandlers } = await import('./bugHandlers');

      const mockBugs: ReadBugsResult = {
        bugs: [
          { name: 'bug-1', phase: 'reported', updatedAt: '2026-01-25T00:00:00Z', reportedAt: '2026-01-25T00:00:00Z' },
          { name: 'bug-2', phase: 'analyzed', updatedAt: '2026-01-25T01:00:00Z', reportedAt: '2026-01-24T00:00:00Z' },
        ],
        warnings: [],
      };
      mockBugService.readBugs.mockResolvedValue({ ok: true, value: mockBugs });

      registerBugHandlers({
        bugService: mockBugService as unknown as BugService,
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: () => '/test/project',
        getSpecManagerService: () => mockSpecManagerService as unknown as SpecManagerService,
        registerEventCallbacks: vi.fn(),
        getEventCallbacksRegistered: () => false,
        setEventCallbacksRegistered: vi.fn(),
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.READ_BUGS);
      expect(handler).toBeDefined();

      const result = await handler!({} as Electron.IpcMainInvokeEvent, '/test/project');
      expect(result).toEqual(mockBugs);
      expect(mockBugService.readBugs).toHaveBeenCalledWith('/test/project');
    });

    it('should throw error when bugService returns error', async () => {
      const { registerBugHandlers } = await import('./bugHandlers');

      mockBugService.readBugs.mockResolvedValue({ ok: false, error: { type: 'NOT_FOUND' } });

      registerBugHandlers({
        bugService: mockBugService as unknown as BugService,
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: () => '/test/project',
        getSpecManagerService: () => mockSpecManagerService as unknown as SpecManagerService,
        registerEventCallbacks: vi.fn(),
        getEventCallbacksRegistered: () => false,
        setEventCallbacksRegistered: vi.fn(),
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.READ_BUGS);
      await expect(handler!({} as Electron.IpcMainInvokeEvent, '/test/project')).rejects.toThrow('Failed to read bugs');
    });
  });

  describe('READ_BUG_DETAIL handler', () => {
    it('should return bug detail from bugService', async () => {
      const { registerBugHandlers } = await import('./bugHandlers');

      const mockBugDetail: BugDetail = {
        metadata: { name: 'test-bug', phase: 'reported', updatedAt: '2026-01-25T00:00:00Z', reportedAt: '2026-01-25T00:00:00Z' },
        artifacts: {
          report: { exists: true, path: '/test/report.md', updatedAt: '2026-01-25T00:00:00Z' },
          analysis: null,
          fix: null,
          verification: null,
        },
      };

      mockFileService.resolveBugPath.mockResolvedValue({ ok: true, value: '/test/project/.kiro/bugs/test-bug' });
      mockBugService.readBugDetail.mockResolvedValue({ ok: true, value: mockBugDetail });

      registerBugHandlers({
        bugService: mockBugService as unknown as BugService,
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: () => '/test/project',
        getSpecManagerService: () => mockSpecManagerService as unknown as SpecManagerService,
        registerEventCallbacks: vi.fn(),
        getEventCallbacksRegistered: () => false,
        setEventCallbacksRegistered: vi.fn(),
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.READ_BUG_DETAIL);
      expect(handler).toBeDefined();

      const result = await handler!({} as Electron.IpcMainInvokeEvent, 'test-bug');
      expect(result).toEqual(mockBugDetail);
      expect(mockFileService.resolveBugPath).toHaveBeenCalledWith('/test/project', 'test-bug');
      expect(mockBugService.readBugDetail).toHaveBeenCalledWith('/test/project/.kiro/bugs/test-bug');
    });

    it('should throw error when project not selected', async () => {
      const { registerBugHandlers } = await import('./bugHandlers');

      registerBugHandlers({
        bugService: mockBugService as unknown as BugService,
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: () => null,
        getSpecManagerService: () => mockSpecManagerService as unknown as SpecManagerService,
        registerEventCallbacks: vi.fn(),
        getEventCallbacksRegistered: () => false,
        setEventCallbacksRegistered: vi.fn(),
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.READ_BUG_DETAIL);
      await expect(handler!({} as Electron.IpcMainInvokeEvent, 'test-bug')).rejects.toThrow('Project not selected');
    });

    it('should throw error when bug not found', async () => {
      const { registerBugHandlers } = await import('./bugHandlers');

      mockFileService.resolveBugPath.mockResolvedValue({ ok: false, error: { type: 'NOT_FOUND' } });

      registerBugHandlers({
        bugService: mockBugService as unknown as BugService,
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: () => '/test/project',
        getSpecManagerService: () => mockSpecManagerService as unknown as SpecManagerService,
        registerEventCallbacks: vi.fn(),
        getEventCallbacksRegistered: () => false,
        setEventCallbacksRegistered: vi.fn(),
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.READ_BUG_DETAIL);
      await expect(handler!({} as Electron.IpcMainInvokeEvent, 'nonexistent-bug')).rejects.toThrow('Bug not found');
    });
  });

  describe('START_BUGS_WATCHER handler', () => {
    it('should start bugs watcher when project path is set', async () => {
      const { registerBugHandlers, startBugsWatcher, stopBugsWatcher } = await import('./bugHandlers');

      registerBugHandlers({
        bugService: mockBugService as unknown as BugService,
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: () => '/test/project',
        getSpecManagerService: () => mockSpecManagerService as unknown as SpecManagerService,
        registerEventCallbacks: vi.fn(),
        getEventCallbacksRegistered: () => false,
        setEventCallbacksRegistered: vi.fn(),
      });

      // Verify handler is registered
      const handler = registeredHandlers.get(IPC_CHANNELS.START_BUGS_WATCHER);
      expect(handler).toBeDefined();

      // Verify startBugsWatcher and stopBugsWatcher are exported
      expect(typeof startBugsWatcher).toBe('function');
      expect(typeof stopBugsWatcher).toBe('function');
    });
  });

  describe('STOP_BUGS_WATCHER handler', () => {
    it('should stop bugs watcher', async () => {
      const { registerBugHandlers, stopBugsWatcher } = await import('./bugHandlers');

      registerBugHandlers({
        bugService: mockBugService as unknown as BugService,
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: () => '/test/project',
        getSpecManagerService: () => mockSpecManagerService as unknown as SpecManagerService,
        registerEventCallbacks: vi.fn(),
        getEventCallbacksRegistered: () => false,
        setEventCallbacksRegistered: vi.fn(),
      });

      // Verify handler is registered
      const handler = registeredHandlers.get(IPC_CHANNELS.STOP_BUGS_WATCHER);
      expect(handler).toBeDefined();

      // Verify stopBugsWatcher is exported
      expect(typeof stopBugsWatcher).toBe('function');
    });
  });

  describe('EXECUTE_BUG_CREATE handler', () => {
    it('should start bug create agent via specManagerService', async () => {
      const { registerBugHandlers } = await import('./bugHandlers');

      mockSpecManagerService.startAgent.mockResolvedValue({
        ok: true,
        value: { agentId: 'agent-123' },
      });

      registerBugHandlers({
        bugService: mockBugService as unknown as BugService,
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: () => '/test/project',
        getSpecManagerService: () => mockSpecManagerService as unknown as SpecManagerService,
        registerEventCallbacks: vi.fn(),
        getEventCallbacksRegistered: () => false,
        setEventCallbacksRegistered: vi.fn(),
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.EXECUTE_BUG_CREATE);
      expect(handler).toBeDefined();

      const mockEvent = { sender: {} } as Electron.IpcMainInvokeEvent;
      const result = await handler!(mockEvent, '/test/project', 'Fix the login bug');

      expect(result).toEqual({ agentId: 'agent-123' });
      expect(mockSpecManagerService.startAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          specId: '',
          phase: 'bug-create',
          command: 'claude',
          group: 'doc',
        })
      );
    });

    it('should include --worktree flag when worktreeMode is true', async () => {
      const { registerBugHandlers } = await import('./bugHandlers');

      mockSpecManagerService.startAgent.mockResolvedValue({
        ok: true,
        value: { agentId: 'agent-123' },
      });

      registerBugHandlers({
        bugService: mockBugService as unknown as BugService,
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: () => '/test/project',
        getSpecManagerService: () => mockSpecManagerService as unknown as SpecManagerService,
        registerEventCallbacks: vi.fn(),
        getEventCallbacksRegistered: () => false,
        setEventCallbacksRegistered: vi.fn(),
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.EXECUTE_BUG_CREATE);
      const mockEvent = { sender: {} } as Electron.IpcMainInvokeEvent;
      await handler!(mockEvent, '/test/project', 'Fix the login bug', true);

      expect(mockSpecManagerService.startAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.arrayContaining([expect.stringContaining('--worktree')]),
        })
      );
    });

    it('should throw error when agent start fails', async () => {
      const { registerBugHandlers } = await import('./bugHandlers');

      mockSpecManagerService.startAgent.mockResolvedValue({
        ok: false,
        error: { type: 'EXECUTION_ERROR', message: 'Failed to start' },
      });

      registerBugHandlers({
        bugService: mockBugService as unknown as BugService,
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: () => '/test/project',
        getSpecManagerService: () => mockSpecManagerService as unknown as SpecManagerService,
        registerEventCallbacks: vi.fn(),
        getEventCallbacksRegistered: () => false,
        setEventCallbacksRegistered: vi.fn(),
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.EXECUTE_BUG_CREATE);
      const mockEvent = { sender: {} } as Electron.IpcMainInvokeEvent;

      await expect(handler!(mockEvent, '/test/project', 'Fix the login bug')).rejects.toThrow();
    });

    it('should register event callbacks if not already registered', async () => {
      const { registerBugHandlers } = await import('./bugHandlers');

      const mockRegisterEventCallbacks = vi.fn();
      const mockSetEventCallbacksRegistered = vi.fn();

      mockSpecManagerService.startAgent.mockResolvedValue({
        ok: true,
        value: { agentId: 'agent-123' },
      });

      registerBugHandlers({
        bugService: mockBugService as unknown as BugService,
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: () => '/test/project',
        getSpecManagerService: () => mockSpecManagerService as unknown as SpecManagerService,
        registerEventCallbacks: mockRegisterEventCallbacks,
        getEventCallbacksRegistered: () => false,
        setEventCallbacksRegistered: mockSetEventCallbacksRegistered,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.EXECUTE_BUG_CREATE);
      const mockEvent = { sender: {} } as Electron.IpcMainInvokeEvent;
      await handler!(mockEvent, '/test/project', 'Fix the login bug');

      expect(mockRegisterEventCallbacks).toHaveBeenCalled();
    });
  });

  describe('BUG_PHASE_UPDATE handler', () => {
    it('should update bug phase via bugService', async () => {
      const { registerBugHandlers } = await import('./bugHandlers');

      mockBugService.updateBugJsonPhase.mockResolvedValue({ ok: true, value: undefined });

      registerBugHandlers({
        bugService: mockBugService as unknown as BugService,
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: () => '/test/project',
        getSpecManagerService: () => mockSpecManagerService as unknown as SpecManagerService,
        registerEventCallbacks: vi.fn(),
        getEventCallbacksRegistered: () => false,
        setEventCallbacksRegistered: vi.fn(),
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.BUG_PHASE_UPDATE);
      expect(handler).toBeDefined();

      const result = await handler!({} as Electron.IpcMainInvokeEvent, 'test-bug', 'fixed' as BugPhase);
      expect(result).toEqual({ ok: true, value: undefined });
      expect(mockBugService.updateBugJsonPhase).toHaveBeenCalledWith('/test/project/.kiro/bugs/test-bug', 'fixed');
    });

    it('should return error when project path is not set', async () => {
      const { registerBugHandlers } = await import('./bugHandlers');

      registerBugHandlers({
        bugService: mockBugService as unknown as BugService,
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: () => null,
        getSpecManagerService: () => mockSpecManagerService as unknown as SpecManagerService,
        registerEventCallbacks: vi.fn(),
        getEventCallbacksRegistered: () => false,
        setEventCallbacksRegistered: vi.fn(),
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.BUG_PHASE_UPDATE);
      const result = await handler!({} as Electron.IpcMainInvokeEvent, 'test-bug', 'fixed' as BugPhase);

      expect(result).toEqual({
        ok: false,
        error: { type: 'NOT_FOUND', message: 'No project path set' },
      });
    });

    it('should return error when bugService returns error', async () => {
      const { registerBugHandlers } = await import('./bugHandlers');

      mockBugService.updateBugJsonPhase.mockResolvedValue({
        ok: false,
        error: { type: 'WRITE_ERROR', message: 'Failed to write' },
      });

      registerBugHandlers({
        bugService: mockBugService as unknown as BugService,
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: () => '/test/project',
        getSpecManagerService: () => mockSpecManagerService as unknown as SpecManagerService,
        registerEventCallbacks: vi.fn(),
        getEventCallbacksRegistered: () => false,
        setEventCallbacksRegistered: vi.fn(),
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.BUG_PHASE_UPDATE);
      const result = await handler!({} as Electron.IpcMainInvokeEvent, 'test-bug', 'fixed' as BugPhase);

      expect(result).toEqual({
        ok: false,
        error: { type: 'WRITE_ERROR', message: 'Failed to update bug phase' },
      });
    });
  });

  describe('BugHandlersDependencies interface', () => {
    it('should accept mock dependencies with proper interface', async () => {
      const { registerBugHandlers } = await import('./bugHandlers');

      // This test verifies the interface by ensuring our mock matches it
      const dependencies = {
        bugService: mockBugService as unknown as BugService,
        fileService: mockFileService as unknown as FileService,
        getCurrentProjectPath: () => '/test/project',
        getSpecManagerService: () => mockSpecManagerService as unknown as SpecManagerService,
        registerEventCallbacks: vi.fn(),
        getEventCallbacksRegistered: () => false,
        setEventCallbacksRegistered: vi.fn(),
      };

      // Should not throw
      expect(() => registerBugHandlers(dependencies)).not.toThrow();
    });
  });

  describe('exported functions', () => {
    it('should export startBugsWatcher function', async () => {
      const { startBugsWatcher } = await import('./bugHandlers');
      expect(typeof startBugsWatcher).toBe('function');
    });

    it('should export stopBugsWatcher function', async () => {
      const { stopBugsWatcher } = await import('./bugHandlers');
      expect(typeof stopBugsWatcher).toBe('function');
    });
  });
});
