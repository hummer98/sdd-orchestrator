/**
 * MCP Auto-Start Tests
 * TDD: Testing MCP server auto-start on app launch
 * Task 6.4: アプリ起動時のMCPサーバー自動起動
 * Requirements: 6.1
 *
 * @file mcpAutoStart.test.ts
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { McpSettings } from '../configStore';

// Mock logger
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Store mock implementations
const mockStart = vi.fn();
const mockGetStatus = vi.fn();
const mockGetMcpSettings = vi.fn<() => McpSettings>();

// Mock McpServerService
vi.mock('./mcpServerService', () => ({
  McpServerService: vi.fn().mockImplementation(() => ({
    start: mockStart,
    stop: vi.fn(),
    getStatus: mockGetStatus,
    onStatusChange: vi.fn(),
    getMcpServer: vi.fn(),
  })),
}));

// Import after mocking
import { initializeMcpServer, getMcpServerService } from './mcpAutoStart';

describe('MCP Auto-Start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: MCP enabled on port 3001
    mockGetMcpSettings.mockReturnValue({ enabled: true, port: 3001 });
    mockStart.mockResolvedValue({ ok: true, value: { port: 3001, url: 'http://localhost:3001' } });
    mockGetStatus.mockReturnValue({ isRunning: false, port: null, url: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Task 6.4: Auto-start when enabled
  // Requirements: 6.1
  // ============================================================

  describe('initializeMcpServer', () => {
    it('should start MCP server when enabled in settings', async () => {
      mockGetMcpSettings.mockReturnValue({ enabled: true, port: 3001 });

      const result = await initializeMcpServer(mockGetMcpSettings);

      expect(mockStart).toHaveBeenCalledWith(3001);
      expect(result).toBe(true);
    });

    it('should not start MCP server when disabled in settings', async () => {
      mockGetMcpSettings.mockReturnValue({ enabled: false, port: 3001 });

      const result = await initializeMcpServer(mockGetMcpSettings);

      expect(mockStart).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should use port from settings', async () => {
      mockGetMcpSettings.mockReturnValue({ enabled: true, port: 4000 });

      await initializeMcpServer(mockGetMcpSettings);

      expect(mockStart).toHaveBeenCalledWith(4000);
    });

    it('should handle start failure gracefully', async () => {
      mockGetMcpSettings.mockReturnValue({ enabled: true, port: 3001 });
      mockStart.mockResolvedValue({
        ok: false,
        error: { type: 'PORT_IN_USE', port: 3001 },
      });

      const result = await initializeMcpServer(mockGetMcpSettings);

      expect(result).toBe(false);
    });

    it('should handle exceptions during start', async () => {
      mockGetMcpSettings.mockReturnValue({ enabled: true, port: 3001 });
      mockStart.mockRejectedValue(new Error('Unexpected error'));

      const result = await initializeMcpServer(mockGetMcpSettings);

      expect(result).toBe(false);
    });

    it('should log when MCP server starts successfully', async () => {
      const { logger } = await import('../logger');
      mockGetMcpSettings.mockReturnValue({ enabled: true, port: 3001 });

      await initializeMcpServer(mockGetMcpSettings);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('[MCP]'),
        expect.any(Object)
      );
    });

    it('should log when MCP server is disabled', async () => {
      const { logger } = await import('../logger');
      mockGetMcpSettings.mockReturnValue({ enabled: false, port: 3001 });

      await initializeMcpServer(mockGetMcpSettings);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('[MCP]'),
        expect.any(Object)
      );
    });
  });

  describe('getMcpServerService', () => {
    it('should return singleton instance', () => {
      const service1 = getMcpServerService();
      const service2 = getMcpServerService();

      expect(service1).toBe(service2);
    });

    it('should return an instance with start method', () => {
      const service = getMcpServerService();

      expect(service).toHaveProperty('start');
      expect(typeof service.start).toBe('function');
    });
  });
});
