/**
 * MCP Status Broadcast Integration Test
 * Tests Main→Renderer status synchronization for MCP server
 *
 * Requirements: 6.9 (status indicator), Design.md "Remote UI Synchronization Flow"
 *
 * This integration test verifies that:
 * 1. When MCP server starts, status is broadcast to all Renderer windows
 * 2. When MCP server stops, status is broadcast to all Renderer windows
 * 3. Broadcast uses correct IPC channel
 *
 * @file mcpStatusBroadcast.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../ipc/channels';
import type { McpServerStatus } from './mcpServerService';

// Mock electron
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn(() => '/tmp'),
    getName: vi.fn(() => 'test-app'),
  },
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
  },
}));

// Mock logger
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Capture registered callbacks for McpServerService.onStatusChange
let capturedStatusChangeCallbacks: Array<(status: McpServerStatus) => void> = [];

// Mock McpServerService
vi.mock('./mcpServerService', () => ({
  McpServerService: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    getStatus: vi.fn(() => ({ isRunning: false, port: null, url: null })),
    onStatusChange: vi.fn((callback: (status: McpServerStatus) => void) => {
      capturedStatusChangeCallbacks.push(callback);
      return () => {
        const index = capturedStatusChangeCallbacks.indexOf(callback);
        if (index > -1) {
          capturedStatusChangeCallbacks.splice(index, 1);
        }
      };
    }),
    getMcpServer: vi.fn(),
  })),
}));

describe('MCP Status Broadcast Integration', () => {
  let mockWebContents: { send: ReturnType<typeof vi.fn> };
  let mockWindow: { isDestroyed: ReturnType<typeof vi.fn>; webContents: typeof mockWebContents };

  beforeEach(() => {
    vi.clearAllMocks();
    capturedStatusChangeCallbacks = [];

    // Setup mock window with webContents
    mockWebContents = { send: vi.fn() };
    mockWindow = {
      isDestroyed: vi.fn(() => false),
      webContents: mockWebContents,
    };

    vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([mockWindow as unknown as BrowserWindow]);
  });

  afterEach(() => {
    vi.clearAllMocks();
    capturedStatusChangeCallbacks = [];
  });

  describe('MCP server start', () => {
    it('should broadcast status to all windows when MCP server starts', async () => {
      // Import after mocking
      const { setupMcpStatusBroadcast } = await import('./mcpStatusBroadcast');
      const { McpServerService } = await import('./mcpServerService');

      const service = new McpServerService();

      // Setup broadcast listener - this registers a callback
      setupMcpStatusBroadcast(service);

      // Simulate status change (as if server started)
      const mockStatus = { isRunning: true, port: 3001, url: 'http://localhost:3001' };

      // Trigger all registered callbacks (simulating McpServerService.notifyStatusChange)
      for (const callback of capturedStatusChangeCallbacks) {
        callback(mockStatus);
      }

      // Verify broadcast was sent
      expect(mockWebContents.send).toHaveBeenCalledWith(
        IPC_CHANNELS.MCP_STATUS_CHANGED,
        mockStatus
      );
    });

    it('should broadcast to multiple windows', async () => {
      const mockWebContents2 = { send: vi.fn() };
      const mockWindow2 = {
        isDestroyed: vi.fn(() => false),
        webContents: mockWebContents2,
      };

      vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([
        mockWindow as unknown as BrowserWindow,
        mockWindow2 as unknown as BrowserWindow,
      ]);

      const { setupMcpStatusBroadcast } = await import('./mcpStatusBroadcast');
      const { McpServerService } = await import('./mcpServerService');

      const service = new McpServerService();
      setupMcpStatusBroadcast(service);

      const mockStatus = { isRunning: true, port: 3001, url: 'http://localhost:3001' };

      for (const callback of capturedStatusChangeCallbacks) {
        callback(mockStatus);
      }

      expect(mockWebContents.send).toHaveBeenCalledWith(
        IPC_CHANNELS.MCP_STATUS_CHANGED,
        mockStatus
      );
      expect(mockWebContents2.send).toHaveBeenCalledWith(
        IPC_CHANNELS.MCP_STATUS_CHANGED,
        mockStatus
      );
    });

    it('should skip destroyed windows', async () => {
      mockWindow.isDestroyed.mockReturnValue(true);

      const { setupMcpStatusBroadcast } = await import('./mcpStatusBroadcast');
      const { McpServerService } = await import('./mcpServerService');

      const service = new McpServerService();
      setupMcpStatusBroadcast(service);

      const mockStatus = { isRunning: true, port: 3001, url: 'http://localhost:3001' };

      for (const callback of capturedStatusChangeCallbacks) {
        callback(mockStatus);
      }

      expect(mockWebContents.send).not.toHaveBeenCalled();
    });
  });

  describe('MCP server stop', () => {
    it('should broadcast stopped status when MCP server stops', async () => {
      const { setupMcpStatusBroadcast } = await import('./mcpStatusBroadcast');
      const { McpServerService } = await import('./mcpServerService');

      const service = new McpServerService();
      setupMcpStatusBroadcast(service);

      const stoppedStatus = { isRunning: false, port: null, url: null };

      for (const callback of capturedStatusChangeCallbacks) {
        callback(stoppedStatus);
      }

      expect(mockWebContents.send).toHaveBeenCalledWith(
        IPC_CHANNELS.MCP_STATUS_CHANGED,
        stoppedStatus
      );
    });
  });
});
