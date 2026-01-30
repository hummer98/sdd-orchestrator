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

// Mock remote access handlers
vi.mock('./ipc/remoteAccessHandlers', () => ({
  getRemoteAccessServer: vi.fn(() => ({
    stop: mockRemoteAccessServerStop,
    getStatus: mockRemoteAccessServerGetStatus,
  })),
  registerRemoteAccessHandlers: vi.fn(),
  setupStateProvider: vi.fn(),
  setupWorkflowController: vi.fn(),
  setupAgentLogsProvider: vi.fn(),
  setupSpecDetailProvider: vi.fn(),
  setupBugDetailProvider: vi.fn(),
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

vi.mock('./ipc/handlers', () => ({
  registerHandlers: vi.fn(),
}));

vi.mock('./ipc/sshHandlers', () => ({
  registerSSHHandlers: vi.fn(),
}));

vi.mock('./ipc/bugHandlers', () => ({
  registerBugHandlers: vi.fn(),
}));

vi.mock('./ipc/gitHandlers', () => ({
  registerGitHandlers: vi.fn(),
}));

vi.mock('./ipc/cloudflareHandlers', () => ({
  registerCloudflareHandlers: vi.fn(),
}));

vi.mock('./ipc/agentHandlers', () => ({
  registerAgentHandlers: vi.fn(),
}));

vi.mock('./ipc/bugWorktreeHandlers', () => ({
  registerBugWorktreeHandlers: vi.fn(),
}));

vi.mock('./ipc/installHandlers', () => ({
  registerInstallHandlers: vi.fn(),
}));

vi.mock('./ipc/convertWorktreeHandlers', () => ({
  registerConvertWorktreeHandlers: vi.fn(),
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
      const { logger } = await import('./services/logger');

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
      const { logger } = await import('./services/logger');

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
});
