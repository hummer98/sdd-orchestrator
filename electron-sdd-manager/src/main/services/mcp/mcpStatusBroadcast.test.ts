/**
 * MCP Status Broadcast Integration Test
 * Tests Main→Renderer status synchronization for MCP server via EventBus
 *
 * Requirements: 6.9 (status indicator), Design.md "Remote UI Synchronization Flow"
 * trpc-full-migration Task 11.2: IPC_CHANNELS removed, EventBus is primary path
 *
 * This integration test verifies that:
 * 1. When MCP server starts, status is broadcast via EventBus
 * 2. When MCP server stops, status is broadcast via EventBus
 *
 * @file mcpStatusBroadcast.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { McpServerStatus } from './mcpServerService';

// Mock electron
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn(() => '/tmp'),
    getName: vi.fn(() => 'test-app'),
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

// Mock EventBus
const mockEmit = vi.fn();
vi.mock('../../trpc/services/globalEventBus', () => ({
  getGlobalEventBus: vi.fn(() => ({
    emit: mockEmit,
  })),
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
  beforeEach(() => {
    vi.clearAllMocks();
    capturedStatusChangeCallbacks = [];
  });

  afterEach(() => {
    vi.clearAllMocks();
    capturedStatusChangeCallbacks = [];
  });

  describe('MCP server start', () => {
    it('should broadcast status via EventBus when MCP server starts', async () => {
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

      // Verify EventBus was called
      expect(mockEmit).toHaveBeenCalledWith('events:mcp-status-changed', mockStatus);
    });
  });

  describe('MCP server stop', () => {
    it('should broadcast stopped status via EventBus when MCP server stops', async () => {
      const { setupMcpStatusBroadcast } = await import('./mcpStatusBroadcast');
      const { McpServerService } = await import('./mcpServerService');

      const service = new McpServerService();
      setupMcpStatusBroadcast(service);

      const stoppedStatus = { isRunning: false, port: null, url: null };

      for (const callback of capturedStatusChangeCallbacks) {
        callback(stoppedStatus);
      }

      expect(mockEmit).toHaveBeenCalledWith('events:mcp-status-changed', stoppedStatus);
    });
  });
});
