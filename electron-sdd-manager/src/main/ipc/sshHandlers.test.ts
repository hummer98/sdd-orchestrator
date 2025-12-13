/**
 * SSH IPC Handlers Tests
 * Tests for SSH connection management IPC handlers
 * Requirements: 1.1, 2.1, 6.1, 7.1, 7.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, BrowserWindow } from 'electron';
import type { ConnectionStatus } from '../services/ssh/sshConnectionService';
import type { RecentRemoteProject } from '../services/ssh/recentRemoteProjects';
import { SSH_IPC_CHANNELS } from './sshChannels';

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
    fromWebContents: vi.fn(),
  },
}));

// Mock SSH services
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockGetStatus = vi.fn();
const mockGetConnectionInfo = vi.fn();
const mockOnStatusChange = vi.fn();

vi.mock('../services/ssh', () => ({
  SSHConnectionService: vi.fn().mockImplementation(() => ({
    connect: mockConnect,
    disconnect: mockDisconnect,
    getStatus: mockGetStatus,
    getConnectionInfo: mockGetConnectionInfo,
    onStatusChange: mockOnStatusChange,
  })),
  sshConnectionService: {
    connect: mockConnect,
    disconnect: mockDisconnect,
    getStatus: mockGetStatus,
    getConnectionInfo: mockGetConnectionInfo,
    onStatusChange: mockOnStatusChange,
  },
  sshUriParser: {
    parse: vi.fn(),
    isValid: vi.fn(),
  },
  providerFactory: {
    setSSHConnectionService: vi.fn(),
    clearSSHProviders: vi.fn(),
    getProviderType: vi.fn(),
    getFileSystemProvider: vi.fn(),
    getProcessProvider: vi.fn(),
  },
  getRecentRemoteProjectsService: vi.fn(() => ({
    getRecentRemoteProjects: vi.fn(() => []),
    addRecentRemoteProject: vi.fn(),
    removeRecentRemoteProject: vi.fn(),
    updateConnectionStatus: vi.fn(),
  })),
}));

// Mock logger
vi.mock('../services/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('SSH IPC Handlers', () => {
  let registeredHandlers: Record<string, (...args: unknown[]) => unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    registeredHandlers = {};

    // Capture registered handlers
    vi.mocked(ipcMain.handle).mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      registeredHandlers[channel] = handler;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('SSH_CONNECT handler', () => {
    it('should register SSH_CONNECT handler', async () => {
      const { registerSSHHandlers } = await import('./sshHandlers');
      registerSSHHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        SSH_IPC_CHANNELS.SSH_CONNECT,
        expect.any(Function)
      );
    });

    it('should connect to SSH server with valid URI', async () => {
      const { sshUriParser } = await import('../services/ssh');
      vi.mocked(sshUriParser.parse).mockReturnValue({
        ok: true,
        value: {
          scheme: 'ssh' as const,
          user: 'testuser',
          host: 'testhost.com',
          port: 22,
          path: '/home/testuser/project',
        },
      });

      mockConnect.mockResolvedValue({ ok: true, value: undefined });

      const { registerSSHHandlers } = await import('./sshHandlers');
      registerSSHHandlers();

      const handler = registeredHandlers[SSH_IPC_CHANNELS.SSH_CONNECT];
      const result = await handler({}, 'ssh://testuser@testhost.com/home/testuser/project');

      expect(mockConnect).toHaveBeenCalled();
      expect(result).toEqual({ ok: true, value: undefined });
    });

    it('should return error for invalid URI', async () => {
      const { sshUriParser } = await import('../services/ssh');
      vi.mocked(sshUriParser.parse).mockReturnValue({
        ok: false,
        error: { type: 'INVALID_SCHEME', found: 'http' },
      });

      const { registerSSHHandlers } = await import('./sshHandlers');
      registerSSHHandlers();

      const handler = registeredHandlers[SSH_IPC_CHANNELS.SSH_CONNECT];
      const result = await handler({}, 'http://invalid.com/path');

      expect(mockConnect).not.toHaveBeenCalled();
      expect(result).toEqual({
        ok: false,
        error: {
          type: 'INVALID_URI',
          message: expect.any(String),
        },
      });
    });
  });

  describe('SSH_DISCONNECT handler', () => {
    it('should register SSH_DISCONNECT handler', async () => {
      const { registerSSHHandlers } = await import('./sshHandlers');
      registerSSHHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        SSH_IPC_CHANNELS.SSH_DISCONNECT,
        expect.any(Function)
      );
    });

    it('should disconnect from SSH server', async () => {
      mockDisconnect.mockResolvedValue(undefined);

      const { registerSSHHandlers } = await import('./sshHandlers');
      registerSSHHandlers();

      const handler = registeredHandlers[SSH_IPC_CHANNELS.SSH_DISCONNECT];
      await handler({});

      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  describe('SSH_GET_STATUS handler', () => {
    it('should register SSH_GET_STATUS handler', async () => {
      const { registerSSHHandlers } = await import('./sshHandlers');
      registerSSHHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        SSH_IPC_CHANNELS.SSH_GET_STATUS,
        expect.any(Function)
      );
    });

    it('should return current connection status', async () => {
      const status: ConnectionStatus = 'connected';
      mockGetStatus.mockReturnValue(status);

      const { registerSSHHandlers } = await import('./sshHandlers');
      registerSSHHandlers();

      const handler = registeredHandlers[SSH_IPC_CHANNELS.SSH_GET_STATUS];
      const result = await handler({});

      expect(result).toBe('connected');
    });
  });

  describe('SSH_GET_CONNECTION_INFO handler', () => {
    it('should register SSH_GET_CONNECTION_INFO handler', async () => {
      const { registerSSHHandlers } = await import('./sshHandlers');
      registerSSHHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        SSH_IPC_CHANNELS.SSH_GET_CONNECTION_INFO,
        expect.any(Function)
      );
    });

    it('should return connection info when connected', async () => {
      const connectionInfo = {
        host: 'testhost.com',
        port: 22,
        user: 'testuser',
        connectedAt: new Date(),
        bytesTransferred: 1024,
      };
      mockGetConnectionInfo.mockReturnValue(connectionInfo);

      const { registerSSHHandlers } = await import('./sshHandlers');
      registerSSHHandlers();

      const handler = registeredHandlers[SSH_IPC_CHANNELS.SSH_GET_CONNECTION_INFO];
      const result = await handler({});

      expect(result).toEqual(connectionInfo);
    });

    it('should return null when not connected', async () => {
      mockGetConnectionInfo.mockReturnValue(null);

      const { registerSSHHandlers } = await import('./sshHandlers');
      registerSSHHandlers();

      const handler = registeredHandlers[SSH_IPC_CHANNELS.SSH_GET_CONNECTION_INFO];
      const result = await handler({});

      expect(result).toBeNull();
    });
  });

  describe('Recent Remote Projects handlers', () => {
    it('should register SSH_GET_RECENT_REMOTE_PROJECTS handler', async () => {
      const { registerSSHHandlers } = await import('./sshHandlers');
      registerSSHHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        SSH_IPC_CHANNELS.SSH_GET_RECENT_REMOTE_PROJECTS,
        expect.any(Function)
      );
    });

    it('should register SSH_ADD_RECENT_REMOTE_PROJECT handler', async () => {
      const { registerSSHHandlers } = await import('./sshHandlers');
      registerSSHHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        SSH_IPC_CHANNELS.SSH_ADD_RECENT_REMOTE_PROJECT,
        expect.any(Function)
      );
    });

    it('should register SSH_REMOVE_RECENT_REMOTE_PROJECT handler', async () => {
      const { registerSSHHandlers } = await import('./sshHandlers');
      registerSSHHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        SSH_IPC_CHANNELS.SSH_REMOVE_RECENT_REMOTE_PROJECT,
        expect.any(Function)
      );
    });
  });

  describe('cleanupSSHHandlers', () => {
    it('should remove all SSH handlers', async () => {
      const { registerSSHHandlers, cleanupSSHHandlers } = await import('./sshHandlers');
      registerSSHHandlers();
      cleanupSSHHandlers();

      expect(ipcMain.removeHandler).toHaveBeenCalledWith(SSH_IPC_CHANNELS.SSH_CONNECT);
      expect(ipcMain.removeHandler).toHaveBeenCalledWith(SSH_IPC_CHANNELS.SSH_DISCONNECT);
      expect(ipcMain.removeHandler).toHaveBeenCalledWith(SSH_IPC_CHANNELS.SSH_GET_STATUS);
      expect(ipcMain.removeHandler).toHaveBeenCalledWith(SSH_IPC_CHANNELS.SSH_GET_CONNECTION_INFO);
      expect(ipcMain.removeHandler).toHaveBeenCalledWith(SSH_IPC_CHANNELS.SSH_GET_RECENT_REMOTE_PROJECTS);
      expect(ipcMain.removeHandler).toHaveBeenCalledWith(SSH_IPC_CHANNELS.SSH_ADD_RECENT_REMOTE_PROJECT);
      expect(ipcMain.removeHandler).toHaveBeenCalledWith(SSH_IPC_CHANNELS.SSH_REMOVE_RECENT_REMOTE_PROJECT);
    });
  });
});
