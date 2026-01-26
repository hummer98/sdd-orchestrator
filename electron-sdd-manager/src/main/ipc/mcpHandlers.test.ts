/**
 * McpIpcHandlers Test
 * TDD tests for MCP server IPC handlers
 * Requirements: 6.3, 6.4, 6.5 (mcp-server-integration)
 *
 * @file mcpHandlers.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './channels';

// Mock electron
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn(() => '/tmp'),
    getName: vi.fn(() => 'test-app'),
  },
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
    getFocusedWindow: vi.fn(() => null),
  },
}));

// Mock McpServerService
const mockMcpServerService = {
  start: vi.fn(),
  stop: vi.fn(),
  getStatus: vi.fn(),
  onStatusChange: vi.fn(),
};

// Mock mcpAutoStart module (provides singleton McpServerService)
vi.mock('../services/mcp/mcpAutoStart', () => ({
  getMcpServerService: vi.fn(() => mockMcpServerService),
}));

// Mock ConfigStore
const mockConfigStore = {
  getMcpSettings: vi.fn(),
  setMcpSettings: vi.fn(),
};

vi.mock('../services/configStore', () => ({
  getConfigStore: vi.fn(() => mockConfigStore),
  DEFAULT_MCP_SETTINGS: { enabled: true, port: 3001 },
}));

describe('mcpHandlers', () => {
  let mockHandlers: Map<string, Function>;

  beforeEach(() => {
    mockHandlers = new Map();

    // Capture registered handlers
    vi.mocked(ipcMain.handle).mockImplementation((channel: string, handler: Function) => {
      mockHandlers.set(channel, handler);
    });

    // Reset mocks
    mockMcpServerService.start.mockReset();
    mockMcpServerService.stop.mockReset();
    mockMcpServerService.getStatus.mockReset();
    mockConfigStore.getMcpSettings.mockReset();
    mockConfigStore.setMcpSettings.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockHandlers.clear();
  });

  describe('registerMcpHandlers()', () => {
    it('should register all MCP-related IPC handlers', async () => {
      const { registerMcpHandlers } = await import('./mcpHandlers');
      registerMcpHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.MCP_START,
        expect.any(Function)
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.MCP_STOP,
        expect.any(Function)
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.MCP_GET_STATUS,
        expect.any(Function)
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.MCP_GET_SETTINGS,
        expect.any(Function)
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.MCP_SET_ENABLED,
        expect.any(Function)
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.MCP_SET_PORT,
        expect.any(Function)
      );
    });
  });

  describe('MCP_START handler', () => {
    it('should start MCP server with preferred port', async () => {
      const { registerMcpHandlers } = await import('./mcpHandlers');
      registerMcpHandlers();

      mockMcpServerService.start.mockResolvedValue({
        ok: true,
        value: { port: 3001, url: 'http://localhost:3001' },
      });

      const handler = mockHandlers.get(IPC_CHANNELS.MCP_START);
      expect(handler).toBeDefined();

      const result = await handler!({}, 3001);

      expect(mockMcpServerService.start).toHaveBeenCalledWith(3001);
      expect(result).toEqual({
        ok: true,
        value: { port: 3001, url: 'http://localhost:3001' },
      });
    });

    it('should return error when port is in use', async () => {
      const { registerMcpHandlers } = await import('./mcpHandlers');
      registerMcpHandlers();

      mockMcpServerService.start.mockResolvedValue({
        ok: false,
        error: { type: 'PORT_IN_USE', port: 3001 },
      });

      const handler = mockHandlers.get(IPC_CHANNELS.MCP_START);
      const result = await handler!({}, 3001);

      expect(result).toEqual({
        ok: false,
        error: { type: 'PORT_IN_USE', port: 3001 },
      });
    });
  });

  describe('MCP_STOP handler', () => {
    it('should stop MCP server', async () => {
      const { registerMcpHandlers } = await import('./mcpHandlers');
      registerMcpHandlers();

      mockMcpServerService.stop.mockResolvedValue(undefined);

      const handler = mockHandlers.get(IPC_CHANNELS.MCP_STOP);
      expect(handler).toBeDefined();

      await handler!({});

      expect(mockMcpServerService.stop).toHaveBeenCalled();
    });
  });

  describe('MCP_GET_STATUS handler', () => {
    it('should return current server status', async () => {
      const { registerMcpHandlers } = await import('./mcpHandlers');
      registerMcpHandlers();

      mockMcpServerService.getStatus.mockReturnValue({
        isRunning: true,
        port: 3001,
        url: 'http://localhost:3001',
      });

      const handler = mockHandlers.get(IPC_CHANNELS.MCP_GET_STATUS);
      expect(handler).toBeDefined();

      const result = await handler!({});

      expect(mockMcpServerService.getStatus).toHaveBeenCalled();
      expect(result).toEqual({
        isRunning: true,
        port: 3001,
        url: 'http://localhost:3001',
      });
    });
  });

  describe('MCP_GET_SETTINGS handler', () => {
    it('should return MCP settings from ConfigStore', async () => {
      const { registerMcpHandlers } = await import('./mcpHandlers');
      registerMcpHandlers();

      mockConfigStore.getMcpSettings.mockReturnValue({
        enabled: true,
        port: 3001,
      });

      const handler = mockHandlers.get(IPC_CHANNELS.MCP_GET_SETTINGS);
      expect(handler).toBeDefined();

      const result = await handler!({});

      expect(mockConfigStore.getMcpSettings).toHaveBeenCalled();
      expect(result).toEqual({
        enabled: true,
        port: 3001,
      });
    });
  });

  describe('MCP_SET_ENABLED handler', () => {
    it('should update enabled setting and start server when enabled', async () => {
      const { registerMcpHandlers } = await import('./mcpHandlers');
      registerMcpHandlers();

      mockConfigStore.getMcpSettings.mockReturnValue({
        enabled: false,
        port: 3001,
      });

      mockMcpServerService.start.mockResolvedValue({
        ok: true,
        value: { port: 3001, url: 'http://localhost:3001' },
      });

      const handler = mockHandlers.get(IPC_CHANNELS.MCP_SET_ENABLED);
      expect(handler).toBeDefined();

      await handler!({}, true);

      expect(mockConfigStore.setMcpSettings).toHaveBeenCalledWith({
        enabled: true,
        port: 3001,
      });
      expect(mockMcpServerService.start).toHaveBeenCalledWith(3001);
    });

    it('should update enabled setting and stop server when disabled', async () => {
      const { registerMcpHandlers } = await import('./mcpHandlers');
      registerMcpHandlers();

      mockConfigStore.getMcpSettings.mockReturnValue({
        enabled: true,
        port: 3001,
      });

      mockMcpServerService.stop.mockResolvedValue(undefined);

      const handler = mockHandlers.get(IPC_CHANNELS.MCP_SET_ENABLED);
      await handler!({}, false);

      expect(mockConfigStore.setMcpSettings).toHaveBeenCalledWith({
        enabled: false,
        port: 3001,
      });
      expect(mockMcpServerService.stop).toHaveBeenCalled();
    });
  });

  describe('MCP_SET_PORT handler', () => {
    it('should update port setting in ConfigStore', async () => {
      const { registerMcpHandlers } = await import('./mcpHandlers');
      registerMcpHandlers();

      mockConfigStore.getMcpSettings.mockReturnValue({
        enabled: true,
        port: 3001,
      });

      // Server is not running, so no restart needed
      mockMcpServerService.getStatus.mockReturnValue({ isRunning: false, port: null, url: null });

      const handler = mockHandlers.get(IPC_CHANNELS.MCP_SET_PORT);
      expect(handler).toBeDefined();

      await handler!({}, 4000);

      expect(mockConfigStore.setMcpSettings).toHaveBeenCalledWith({
        enabled: true,
        port: 4000,
      });
    });

    it('should restart server if running when port changes', async () => {
      const { registerMcpHandlers } = await import('./mcpHandlers');
      registerMcpHandlers();

      mockConfigStore.getMcpSettings.mockReturnValue({
        enabled: true,
        port: 3001,
      });

      mockMcpServerService.getStatus.mockReturnValue({ isRunning: true, port: 3001, url: 'http://localhost:3001' });
      mockMcpServerService.stop.mockResolvedValue(undefined);
      mockMcpServerService.start.mockResolvedValue({
        ok: true,
        value: { port: 4000, url: 'http://localhost:4000' },
      });

      const handler = mockHandlers.get(IPC_CHANNELS.MCP_SET_PORT);
      await handler!({}, 4000);

      expect(mockMcpServerService.stop).toHaveBeenCalled();
      expect(mockMcpServerService.start).toHaveBeenCalledWith(4000);
    });
  });
});
