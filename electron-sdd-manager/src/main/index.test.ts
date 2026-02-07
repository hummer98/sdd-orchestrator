/**
 * Main Process Lifecycle Tests
 * TDD: Testing app lifecycle events and cleanup
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { app } from 'electron';

// Mock all dependencies before importing the main module
vi.mock('electron', () => {
  const mockBrowserWindow = vi.fn().mockImplementation(() => ({
    loadFile: vi.fn(),
    loadURL: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    show: vi.fn(),
    isDestroyed: vi.fn().mockReturnValue(false),
    webContents: {
      send: vi.fn(),
      on: vi.fn(),
    },
  }));
  (mockBrowserWindow as any).fromWebContents = vi.fn();
  (mockBrowserWindow as any).getAllWindows = vi.fn().mockReturnValue([]);

  return {
    app: {
      isPackaged: false,
      name: 'SDD Orchestrator',
      getPath: vi.fn((name: string) => `/tmp/test-${name}`),
      getName: vi.fn(() => 'SDD Orchestrator'),
      setName: vi.fn(),
      getVersion: vi.fn(() => '0.0.0-test'),
      commandLine: {
        getSwitchValue: vi.fn(() => ''),
        hasSwitch: vi.fn(() => false),
        appendSwitch: vi.fn(),
      },
      quit: vi.fn(),
      on: vi.fn(),
      whenReady: vi.fn(() => Promise.resolve()),
    },
    ipcMain: {
      handle: vi.fn(),
      on: vi.fn(),
      removeHandler: vi.fn(),
      removeListener: vi.fn(),
    },
    BrowserWindow: mockBrowserWindow,
    Menu: {
      buildFromTemplate: vi.fn(),
      setApplicationMenu: vi.fn(),
    },
    nativeTheme: {
      shouldUseDarkColors: false,
      themeSource: 'system',
      on: vi.fn(),
    },
  };
});

// Mock RemoteAccessServer
const mockRemoteAccessServerStop = vi.fn();
const mockRemoteAccessServerGetStatus = vi.fn();

vi.mock('./services/remoteAccessServer', () => ({
  RemoteAccessServer: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: mockRemoteAccessServerStop,
    getStatus: mockRemoteAccessServerGetStatus,
    onStatusChange: vi.fn(),
    getClientCount: vi.fn(),
    getWebSocketHandler: vi.fn(() => ({
      initialize: vi.fn(),
      setStateProvider: vi.fn(),
      setWorkflowController: vi.fn(),
      setAgentLogsProvider: vi.fn(),
    })),
  })),
}));

// Mock remote access setup (Task 10.7: moved from ipc/remoteAccessHandlers.ts to services/remoteAccessSetup.ts)
vi.mock('./services/remoteAccessSetup', () => ({
  getRemoteAccessServer: vi.fn(() => ({
    stop: mockRemoteAccessServerStop,
    getStatus: mockRemoteAccessServerGetStatus,
  })),
  setupStatusNotifications: vi.fn(),
  setupStateProvider: vi.fn(),
  setupWorkflowController: vi.fn(),
  setupAgentLogsProvider: vi.fn(),
  setupSpecDetailProvider: vi.fn(),
  setupBugDetailProvider: vi.fn(),
  setupFileService: vi.fn(),
}));

// Mock agent watchdog
const mockAgentWatchdogStop = vi.fn();

vi.mock('./services/agentLifecycleSetup', () => ({
  getAgentWatchdog: vi.fn(() => ({
    stop: mockAgentWatchdogStop,
  })),
}));

// Mock other services
vi.mock('./services/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('./services/projectLogger', () => ({
  projectLogger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
  getProjectLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  })),
}));

vi.mock('./menu', () => ({
  createMenu: vi.fn(),
  setMenuRemoteServerStatus: vi.fn(),
}));

// Task 10.7: sshHandlers.ts deleted, setupSSHStatusNotifications moved to services/sshSetup.ts
vi.mock('./services/sshSetup', () => ({
  setupSSHStatusNotifications: vi.fn(),
}));

// bugHandlers: tRPC bugルーターに移行・削除済み (Task 5.4)

// gitHandlers: tRPC gitルーターに移行・削除済み (Task 8.3)

// cloudflareHandlers: tRPC cloudflareルーターに移行・削除済み (Task 10.7)

// agentHandlers: tRPC agentルーターに移行・削除済み (Task 6.3)

// bugWorktreeHandlers: tRPC bugルーターに移行・削除済み (Task 5.4)

// convertWorktreeHandlers: tRPC bugルーターに移行・削除済み (Task 5.4)

// trpc-full-migration Task 11.2: handlers/channels moved to trpc/helpers/projectSetup
const mockGetInitialSelectResult = vi.fn();
const mockClearInitialSelectResult = vi.fn();
const mockSetInitialSelectResult = vi.fn();
vi.mock('./trpc/helpers/projectSetup', () => ({
  initializeEventWiring: vi.fn(),
  setInitialProjectPath: vi.fn(),
  selectProject: vi.fn(),
  getInitialSelectResult: mockGetInitialSelectResult,
  clearInitialSelectResult: mockClearInitialSelectResult,
  setInitialSelectResult: mockSetInitialSelectResult,
}));

// trpc-full-migration Task 11.2: EventBus mock for broadcastInitialProjectSelection
const mockEventBusEmit = vi.fn();
vi.mock('./trpc/services/globalEventBus', () => ({
  getGlobalEventBus: vi.fn(() => ({
    emit: mockEventBusEmit,
    on: vi.fn(),
    off: vi.fn(),
  })),
}));

vi.mock('./trpc/services/eventBus', () => ({
  EVENT_NAMES: {
    PROJECT_SELECTED: 'events:project-selected',
  },
}));

describe('Main Process Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('cleanup on will-quit', () => {
    it('should stop agent watchdog', async () => {
      // Import the cleanup function (to be exported from index.ts)
      const { cleanupOnQuit } = await import('./index');

      // Execute cleanup
      await cleanupOnQuit();

      // Verify agent watchdog was stopped
      expect(mockAgentWatchdogStop).toHaveBeenCalledOnce();
    });

    it('should stop remote UI server if running', async () => {
      // Import the cleanup function
      const { cleanupOnQuit } = await import('./index');

      // Mock server as running
      mockRemoteAccessServerGetStatus.mockReturnValue({
        isRunning: true,
        port: 8765,
        url: 'http://localhost:8765',
        clientCount: 0,
        tunnelStatus: 'disconnected',
        tunnelUrl: null,
      });

      // Execute cleanup
      await cleanupOnQuit();

      // Verify remote UI server was stopped
      expect(mockRemoteAccessServerStop).toHaveBeenCalledOnce();
    });

    it('should not stop remote UI server if not running', async () => {
      // Import the cleanup function
      const { cleanupOnQuit } = await import('./index');

      // Mock server as not running
      mockRemoteAccessServerGetStatus.mockReturnValue({
        isRunning: false,
        port: null,
        url: null,
        clientCount: 0,
        tunnelStatus: 'disconnected',
        tunnelUrl: null,
      });

      // Execute cleanup
      await cleanupOnQuit();

      // Verify remote UI server stop was not called
      expect(mockRemoteAccessServerStop).not.toHaveBeenCalled();
    });

    it('should handle remote UI server stop error gracefully', async () => {
      // Import the cleanup function
      const { cleanupOnQuit } = await import('./index');
      const { projectLogger: logger } = await import('./services/projectLogger');

      // Mock server as running
      mockRemoteAccessServerGetStatus.mockReturnValue({
        isRunning: true,
        port: 8765,
        url: 'http://localhost:8765',
        clientCount: 0,
        tunnelStatus: 'disconnected',
        tunnelUrl: null,
      });

      // Mock stop to throw error
      mockRemoteAccessServerStop.mockRejectedValue(new Error('Stop failed'));

      // Execute cleanup (should not throw)
      await cleanupOnQuit();

      // Verify error was logged
      expect(logger.warn).toHaveBeenCalledWith(
        '[main] Error stopping remote UI server',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    it('should handle agent watchdog stop error gracefully', async () => {
      // Import the cleanup function
      const { cleanupOnQuit } = await import('./index');
      const { projectLogger: logger } = await import('./services/projectLogger');

      // Mock watchdog stop to throw error
      mockAgentWatchdogStop.mockImplementation(() => {
        throw new Error('Watchdog stop failed');
      });

      // Execute cleanup (should not throw)
      await cleanupOnQuit();

      // Verify error was logged
      expect(logger.warn).toHaveBeenCalledWith(
        '[main] Error stopping agent watchdog',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });
  });

  // ============================================================
  // startup-project-selection-fix Task 4.1: Broadcast on ready-to-show
  // Requirements: 1.2, 4.1, 4.3
  // ============================================================

  describe('startup project broadcast', () => {
    it('should broadcast PROJECT_SELECTED on ready-to-show when cached result exists', async () => {
      const mockResult = {
        success: true,
        projectPath: '/test/project',
        kiroValidation: { exists: true, hasSpecs: true, hasSteering: true },
        specs: [],
        bugs: [],
        specJsonMap: {},
      };

      // Mock cached result
      mockGetInitialSelectResult.mockReturnValue(mockResult);

      // Import to trigger module execution
      const { broadcastInitialProjectSelection } = await import('./index');

      // Create mock window
      const mockWebContents = { send: vi.fn() };
      const mockWindow = {
        isDestroyed: vi.fn().mockReturnValue(false),
        webContents: mockWebContents,
      };

      // Call broadcast function
      await broadcastInitialProjectSelection(mockWindow as any);

      // Verify EventBus was used to broadcast (tRPC Subscription path)
      expect(mockEventBusEmit).toHaveBeenCalledWith(
        'events:project-selected',
        mockResult
      );

      // Verify cache was cleared after broadcast
      expect(mockClearInitialSelectResult).toHaveBeenCalled();
    });

    it('should not broadcast when no cached result exists', async () => {
      // Mock no cached result
      mockGetInitialSelectResult.mockReturnValue(null);

      // Import function
      const { broadcastInitialProjectSelection } = await import('./index');

      // Create mock window
      const mockWebContents = { send: vi.fn() };
      const mockWindow = {
        isDestroyed: vi.fn().mockReturnValue(false),
        webContents: mockWebContents,
      };

      // Call broadcast function
      await broadcastInitialProjectSelection(mockWindow as any);

      // Verify webContents.send was not called
      expect(mockWebContents.send).not.toHaveBeenCalled();

      // Verify cache clear was not called
      expect(mockClearInitialSelectResult).not.toHaveBeenCalled();
    });

    it('should not broadcast when window is destroyed', async () => {
      const mockResult = {
        success: true,
        projectPath: '/test/project',
        kiroValidation: { exists: true, hasSpecs: true, hasSteering: true },
        specs: [],
        bugs: [],
        specJsonMap: {},
      };

      // Mock cached result
      mockGetInitialSelectResult.mockReturnValue(mockResult);

      // Import function
      const { broadcastInitialProjectSelection } = await import('./index');

      // Create mock window that is destroyed
      const mockWebContents = { send: vi.fn() };
      const mockWindow = {
        isDestroyed: vi.fn().mockReturnValue(true),
        webContents: mockWebContents,
      };

      // Call broadcast function
      await broadcastInitialProjectSelection(mockWindow as any);

      // Verify webContents.send was not called
      expect(mockWebContents.send).not.toHaveBeenCalled();
    });
  });
});
