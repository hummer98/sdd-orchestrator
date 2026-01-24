/**
 * McpServerService Unit Tests
 * TDD: Testing MCP HTTP/SSE server lifecycle and port management
 * Requirements: 1.1, 1.2, 1.3, 5.1, 5.2
 *
 * @file mcpServerService.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createServer, Server } from 'net';
import { McpServerService, McpServerStatus, McpServerError } from './mcpServerService';

// Helper to find an available port
async function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const testServer = createServer();
    testServer.listen(startPort, () => {
      const port = (testServer.address() as { port: number }).port;
      testServer.close(() => resolve(port));
    });
    testServer.on('error', () => {
      // Port is in use, try next
      findAvailablePort(startPort + 1).then(resolve).catch(reject);
    });
  });
}

// Helper to block a port
async function blockPort(port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(port, () => {
      server.removeListener('error', reject);
      resolve(server);
    });
  });
}

// Helper to close a server
async function closeServer(server: Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

describe('McpServerService', () => {
  let service: McpServerService;

  beforeEach(() => {
    service = new McpServerService();
  });

  afterEach(async () => {
    // Ensure server is stopped after each test
    try {
      await service.stop();
    } catch {
      // Ignore errors if server wasn't started
    }
  });

  // ============================================================
  // Task 2.1: Server Lifecycle Tests
  // Requirements: 1.1, 5.1, 5.2
  // ============================================================

  describe('start', () => {
    it('should start server on default port 3001', async () => {
      const result = await service.start();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.port).toBe(3001);
        expect(result.value.url).toBe('http://localhost:3001');
      }
    });

    it('should start server on specified port', async () => {
      const result = await service.start(3005);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.port).toBe(3005);
        expect(result.value.url).toBe('http://localhost:3005');
      }
    });

    it('should return ALREADY_RUNNING error when server is already running', async () => {
      // Start the server first
      const firstResult = await service.start();
      expect(firstResult.ok).toBe(true);

      // Try to start again
      const secondResult = await service.start();

      expect(secondResult.ok).toBe(false);
      if (!secondResult.ok) {
        expect(secondResult.error.type).toBe('ALREADY_RUNNING');
        if (secondResult.error.type === 'ALREADY_RUNNING') {
          expect(secondResult.error.port).toBe(3001);
        }
      }
    });

    it('should return PORT_IN_USE error when port is already in use', async () => {
      // Block port 3001
      let blockingServer: Server | null = null;
      try {
        blockingServer = await blockPort(3001);

        const result = await service.start(3001);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('PORT_IN_USE');
          if (result.error.type === 'PORT_IN_USE') {
            expect(result.error.port).toBe(3001);
          }
        }
      } finally {
        if (blockingServer) {
          await closeServer(blockingServer);
        }
      }
    });

    it('should handle network errors gracefully', async () => {
      // This is a general test for network error handling
      // We can't easily simulate all network errors, but the service
      // should handle any errors during server creation gracefully
      const result = await service.start(-1); // Invalid port

      expect(result.ok).toBe(false);
      if (!result.ok) {
        // Should be either PORT_IN_USE or NETWORK_ERROR for invalid port
        expect(['PORT_IN_USE', 'NETWORK_ERROR']).toContain(result.error.type);
      }
    });
  });

  describe('stop', () => {
    it('should stop a running server', async () => {
      await service.start();
      expect(service.getStatus().isRunning).toBe(true);

      await service.stop();
      expect(service.getStatus().isRunning).toBe(false);
    });

    it('should be safe to call stop when not running', async () => {
      // Should not throw
      await expect(service.stop()).resolves.not.toThrow();
    });

    it('should reset status after stopping', async () => {
      await service.start();
      await service.stop();

      const status = service.getStatus();
      expect(status.isRunning).toBe(false);
      expect(status.port).toBeNull();
      expect(status.url).toBeNull();
    });
  });

  describe('getStatus', () => {
    it('should return not running status initially', () => {
      const status = service.getStatus();

      expect(status.isRunning).toBe(false);
      expect(status.port).toBeNull();
      expect(status.url).toBeNull();
    });

    it('should return running status after start', async () => {
      await service.start();

      const status = service.getStatus();
      expect(status.isRunning).toBe(true);
      expect(status.port).toBe(3001);
      expect(status.url).toBe('http://localhost:3001');
    });

    it('should return not running status after stop', async () => {
      await service.start();
      await service.stop();

      const status = service.getStatus();
      expect(status.isRunning).toBe(false);
      expect(status.port).toBeNull();
      expect(status.url).toBeNull();
    });
  });

  describe('onStatusChange', () => {
    it('should notify callback on server start', async () => {
      const callback = vi.fn();
      const unsubscribe = service.onStatusChange(callback);

      await service.start();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          isRunning: true,
          port: 3001,
          url: 'http://localhost:3001',
        })
      );

      unsubscribe();
    });

    it('should notify callback on server stop', async () => {
      const callback = vi.fn();

      await service.start();

      const unsubscribe = service.onStatusChange(callback);
      await service.stop();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          isRunning: false,
          port: null,
          url: null,
        })
      );

      unsubscribe();
    });

    it('should unsubscribe correctly', async () => {
      const callback = vi.fn();
      const unsubscribe = service.onStatusChange(callback);

      // Unsubscribe immediately
      unsubscribe();

      await service.start();

      // Should not be called after unsubscribe
      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple subscribers', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unsubscribe1 = service.onStatusChange(callback1);
      const unsubscribe2 = service.onStatusChange(callback2);

      await service.start();

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();

      unsubscribe1();
      unsubscribe2();
    });
  });

  // ============================================================
  // Task 2.1: MCP Protocol Integration Tests
  // Requirements: 1.2, 1.3
  // ============================================================

  describe('MCP Protocol Integration', () => {
    it('should initialize MCP server with required capabilities', async () => {
      const result = await service.start();

      expect(result.ok).toBe(true);
      // The server should be running and accepting MCP connections
      const status = service.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it('should allow multiple start/stop cycles', async () => {
      // First cycle
      let result = await service.start();
      expect(result.ok).toBe(true);
      await service.stop();
      expect(service.getStatus().isRunning).toBe(false);

      // Second cycle
      result = await service.start();
      expect(result.ok).toBe(true);
      await service.stop();
      expect(service.getStatus().isRunning).toBe(false);

      // Third cycle on different port
      result = await service.start(3002);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.port).toBe(3002);
      }
    });
  });

  // ============================================================
  // Task 2.1: Port Conflict Detection Tests
  // Requirements: 5.1, 5.2
  // ============================================================

  describe('Port Conflict Detection', () => {
    it('should detect conflict with Remote UI server on same port', async () => {
      // Simulate Remote UI server on port 3000
      let blockingServer: Server | null = null;
      try {
        blockingServer = await blockPort(3000);

        // MCP should start on its own port (3001) without conflict
        const result = await service.start(3001);
        expect(result.ok).toBe(true);

        // But trying to start on 3000 should fail
        const service2 = new McpServerService();
        const result2 = await service2.start(3000);
        expect(result2.ok).toBe(false);
        if (!result2.ok) {
          expect(result2.error.type).toBe('PORT_IN_USE');
        }
      } finally {
        if (blockingServer) {
          await closeServer(blockingServer);
        }
      }
    });

    it('should allow MCP and Remote UI to run on different ports simultaneously', async () => {
      // This test verifies requirement 5.1
      // MCP on 3001, simulated Remote UI on 3000
      let blockingServer: Server | null = null;
      try {
        blockingServer = await blockPort(3000);

        const result = await service.start(3001);
        expect(result.ok).toBe(true);

        // Both should be running (we check MCP is running)
        expect(service.getStatus().isRunning).toBe(true);
      } finally {
        if (blockingServer) {
          await closeServer(blockingServer);
        }
      }
    });
  });
});
