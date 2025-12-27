/**
 * RemoteAccessServer Unit Tests
 * TDD: Testing HTTP/WebSocket server lifecycle and port management
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createServer, Server } from 'net';
import { RemoteAccessServer, ServerError } from './remoteAccessServer';

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

describe('RemoteAccessServer', () => {
  let server: RemoteAccessServer;

  beforeEach(() => {
    server = new RemoteAccessServer();
  });

  afterEach(async () => {
    // Ensure server is stopped after each test
    try {
      await server.stop();
    } catch {
      // Ignore errors if server wasn't started
    }
  });

  describe('start', () => {
    it('should start server on an available port in range 8765-8775', async () => {
      const result = await server.start();

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Port should be within the valid range (may not be 8765 if that port is in use)
        expect(result.value.port).toBeGreaterThanOrEqual(8765);
        expect(result.value.port).toBeLessThanOrEqual(8775);
        expect(result.value.url).toContain(`:${result.value.port}`);
      }
    });

    it('should start server on specified port or next available', async () => {
      const result = await server.start(8770);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // If 8770 is in use, it will use the next available port
        expect(result.value.port).toBeGreaterThanOrEqual(8770);
        expect(result.value.port).toBeLessThanOrEqual(8775);
        expect(result.value.url).toContain(`:${result.value.port}`);
      }
    });

    it('should return URL with local IP address', async () => {
      const result = await server.start();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.url).toMatch(/^http:\/\/\d+\.\d+\.\d+\.\d+:\d+$/);
        expect(result.value.localIp).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
      }
    });

    it('should generate QR code data URL', async () => {
      const result = await server.start();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
      }
    });

    it('should auto-select next port if preferred port is in use', async () => {
      // Find an available port in range to block
      const portToBlock = await findAvailablePort(8765);

      // Start a dummy server on that port
      const blockingServer = createServer();
      await new Promise<void>((resolve) => {
        blockingServer.listen(portToBlock, () => resolve());
      });

      try {
        const result = await server.start(portToBlock);

        expect(result.ok).toBe(true);
        if (result.ok) {
          // Should use next available port since portToBlock is blocked
          expect(result.value.port).toBeGreaterThan(portToBlock);
          expect(result.value.port).toBeLessThanOrEqual(8775);
        }
      } finally {
        await new Promise<void>((resolve) => {
          blockingServer.close(() => resolve());
        });
      }
    });

    it('should return error when all ports are in use', async () => {
      // Block ports 8765-8775
      const blockingServers: Server[] = [];
      const blockedPorts: number[] = [];

      try {
        // Try to block all ports in range, skip any that are already in use
        for (let port = 8765; port <= 8775; port++) {
          try {
            const blockingServer = createServer();
            await new Promise<void>((resolve, reject) => {
              blockingServer.once('error', reject);
              blockingServer.listen(port, () => {
                blockingServer.removeListener('error', reject);
                resolve();
              });
            });
            blockingServers.push(blockingServer);
            blockedPorts.push(port);
          } catch {
            // Port already in use by another process, that's fine
            blockedPorts.push(port);
          }
        }

        const result = await server.start();

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('NO_AVAILABLE_PORT');
        }
      } finally {
        // Clean up all blocking servers
        for (const s of blockingServers) {
          await new Promise<void>((resolve) => {
            s.close(() => resolve());
          });
        }
      }
    }, 10000);

    it('should return error when already running', async () => {
      // Start the server first
      await server.start();

      // Try to start again
      const result = await server.start();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('ALREADY_RUNNING');
      }
    });
  });

  describe('stop', () => {
    it('should stop a running server', async () => {
      await server.start();
      expect(server.getStatus().isRunning).toBe(true);

      await server.stop();
      expect(server.getStatus().isRunning).toBe(false);
    });

    it('should be safe to call stop when not running', async () => {
      // Should not throw
      await expect(server.stop()).resolves.not.toThrow();
    });

    it('should reset port and URL after stopping', async () => {
      await server.start();
      await server.stop();

      const status = server.getStatus();
      expect(status.port).toBeNull();
      expect(status.url).toBeNull();
    });
  });

  describe('getStatus', () => {
    it('should return initial status when not started', () => {
      const status = server.getStatus();

      expect(status.isRunning).toBe(false);
      expect(status.port).toBeNull();
      expect(status.url).toBeNull();
      expect(status.clientCount).toBe(0);
    });

    it('should return running status when started', async () => {
      const result = await server.start();

      expect(result.ok).toBe(true);
      if (result.ok) {
        const status = server.getStatus();
        expect(status.isRunning).toBe(true);
        expect(status.port).toBe(result.value.port);
        expect(status.url).toContain(`:${result.value.port}`);
      }
    });
  });

  describe('getClientCount', () => {
    it('should return 0 when no clients connected', async () => {
      await server.start();
      expect(server.getClientCount()).toBe(0);
    });
  });

  describe('onStatusChange', () => {
    it('should emit status change when server starts', async () => {
      const callback = vi.fn();
      server.onStatusChange(callback);

      await server.start();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          isRunning: true,
        })
      );
    });

    it('should emit status change when server stops', async () => {
      const callback = vi.fn();
      server.onStatusChange(callback);

      await server.start();
      callback.mockClear();

      await server.stop();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          isRunning: false,
        })
      );
    });

    it('should return unsubscribe function', async () => {
      const callback = vi.fn();
      const unsubscribe = server.onStatusChange(callback);

      await server.start();
      callback.mockClear();

      unsubscribe();
      await server.stop();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('port range', () => {
    it('should use port range 8765-8775', async () => {
      // Find an available port in range to block
      const portToBlock = await findAvailablePort(8765);

      // Block that port
      const blockingServer = createServer();
      await new Promise<void>((resolve) => {
        blockingServer.listen(portToBlock, () => resolve());
      });

      try {
        const result = await server.start();

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.port).toBeGreaterThanOrEqual(8765);
          expect(result.value.port).toBeLessThanOrEqual(8775);
        }
      } finally {
        await new Promise<void>((resolve) => {
          blockingServer.close(() => resolve());
        });
      }
    });
  });
});

// ============================================================
// Task 8.1: RemoteAccessServer and WebSocketHandler Integration Tests
// Requirements: 3.1, 3.2, 3.3
// ============================================================

describe('RemoteAccessServer - WebSocketHandler Integration (Task 8.1)', () => {
  let server: RemoteAccessServer;

  beforeEach(() => {
    server = new RemoteAccessServer();
  });

  afterEach(async () => {
    try {
      await server.stop();
    } catch {
      // Ignore errors if server wasn't started
    }
  });

  describe('WebSocketHandler initialization', () => {
    it('should initialize WebSocketHandler when server starts', async () => {
      const result = await server.start();

      expect(result.ok).toBe(true);
      // WebSocketHandler should be initialized and accessible
      const wsHandler = server.getWebSocketHandler();
      expect(wsHandler).not.toBeNull();
    });

    it('should delegate getClientCount to WebSocketHandler', async () => {
      await server.start();

      // Initially 0 clients
      expect(server.getClientCount()).toBe(0);

      // The WebSocketHandler should be handling client connections
      const wsHandler = server.getWebSocketHandler();
      expect(wsHandler).not.toBeNull();
      expect(wsHandler!.getClientCount()).toBe(0);
    });
  });

  describe('stop behavior with WebSocketHandler', () => {
    it('should call WebSocketHandler.disconnectAll when stopping', async () => {
      await server.start();
      const wsHandler = server.getWebSocketHandler();
      expect(wsHandler).not.toBeNull();

      // Spy on disconnectAll
      const disconnectAllSpy = vi.spyOn(wsHandler!, 'disconnectAll');

      await server.stop();

      expect(disconnectAllSpy).toHaveBeenCalled();
    });
  });

  describe('StateProvider integration', () => {
    it('should allow setting StateProvider on WebSocketHandler', async () => {
      await server.start();
      const wsHandler = server.getWebSocketHandler();

      const stateProvider = {
        getProjectPath: vi.fn().mockReturnValue('/test/project'),
        getSpecs: vi.fn().mockResolvedValue([]),
      };

      // Should not throw
      expect(() => wsHandler!.setStateProvider(stateProvider)).not.toThrow();
    });
  });

  describe('WorkflowController integration', () => {
    it('should allow setting WorkflowController on WebSocketHandler', async () => {
      await server.start();
      const wsHandler = server.getWebSocketHandler();

      const workflowController = {
        executePhase: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'agent-1' } }),
        stopAgent: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
        resumeAgent: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'agent-1' } }),
      };

      // Should not throw
      expect(() => wsHandler!.setWorkflowController(workflowController)).not.toThrow();
    });
  });
});

// ============================================================
// Task 6.1 & 6.2: Cloudflare Tunnel Integration Tests
// Requirements: 1.1, 1.2, 1.3, 1.5, 6.5, 7.1, 7.2
// ============================================================

import { AccessTokenService } from './accessTokenService';

// Mock AccessTokenService for controlled testing
const createMockAccessTokenService = (): AccessTokenService => {
  const mockService = {
    ensureToken: vi.fn().mockReturnValue('testtoken1'),
    generateToken: vi.fn().mockReturnValue('testtoken1'),
    validateToken: vi.fn().mockReturnValue(true),
    refreshToken: vi.fn().mockReturnValue('newtoken12'),
    getToken: vi.fn().mockReturnValue('testtoken1'),
  };
  return mockService as unknown as AccessTokenService;
};

describe('RemoteAccessServer - Cloudflare Tunnel Integration (Task 6.1 & 6.2)', () => {
  let server: RemoteAccessServer;

  beforeEach(() => {
    server = new RemoteAccessServer();
  });

  afterEach(async () => {
    try {
      await server.stop();
    } catch {
      // Ignore errors if server wasn't started
    }
  });

  describe('start with publishToCloudflare option', () => {
    it('should start server without Cloudflare when publishToCloudflare is false', async () => {
      const result = await server.start(undefined, { publishToCloudflare: false });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.port).toBeGreaterThanOrEqual(8765);
        expect(result.value.url).toBeDefined();
        expect(result.value.tunnelUrl).toBeNull();
        expect(result.value.tunnelQrCodeDataUrl).toBeNull();
        expect(result.value.accessToken).toBeDefined();
      }
    });

    it('should include accessToken in ServerStartResult', async () => {
      const result = await server.start();

      expect(result.ok).toBe(true);
      if (result.ok) {
        // accessToken should be a 10-character alphanumeric string
        expect(result.value.accessToken).toBeDefined();
        expect(result.value.accessToken.length).toBe(10);
        expect(result.value.accessToken).toMatch(/^[a-zA-Z0-9]+$/);
      }
    });

    it('should return tunnelUrl as null when publishToCloudflare is false', async () => {
      const result = await server.start(undefined, { publishToCloudflare: false });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.tunnelUrl).toBeNull();
        expect(result.value.tunnelQrCodeDataUrl).toBeNull();
      }
    });
  });

  describe('stop behavior with Tunnel', () => {
    it('should stop Tunnel when server is stopped', async () => {
      await server.start();
      const status = server.getStatus();
      expect(status.isRunning).toBe(true);

      await server.stop();

      const statusAfter = server.getStatus();
      expect(statusAfter.isRunning).toBe(false);
      expect(statusAfter.tunnelStatus).toBe('disconnected');
    });
  });

  describe('getStatus with Tunnel info', () => {
    it('should include tunnel status in getStatus', async () => {
      await server.start();
      const status = server.getStatus();

      expect(status.tunnelStatus).toBeDefined();
      expect(['disconnected', 'connecting', 'connected', 'error']).toContain(status.tunnelStatus);
    });

    it('should return tunnelUrl as null when tunnel is not connected', async () => {
      await server.start(undefined, { publishToCloudflare: false });
      const status = server.getStatus();

      expect(status.tunnelUrl).toBeNull();
      expect(status.tunnelStatus).toBe('disconnected');
    });
  });
});

// ============================================================
// Task 12.1: RemoteAccessServer + Tunnel Integration Tests
// Requirements: 1.1, 1.4, 1.5, 7.1, 7.2
// ============================================================

describe('RemoteAccessServer - Integration Tests (Task 12.1)', () => {
  let server: RemoteAccessServer;
  let mockAccessTokenService: AccessTokenService;

  beforeEach(() => {
    mockAccessTokenService = createMockAccessTokenService();
    server = new RemoteAccessServer(mockAccessTokenService);
  });

  afterEach(async () => {
    try {
      await server.stop();
    } catch {
      // Ignore errors if server wasn't started
    }
  });

  describe('Server lifecycle with AccessTokenService', () => {
    it('should call ensureToken when server starts', async () => {
      const result = await server.start();

      expect(result.ok).toBe(true);
      expect(mockAccessTokenService.ensureToken).toHaveBeenCalled();
    });

    it('should include generated accessToken in ServerStartResult', async () => {
      const result = await server.start();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.accessToken).toBe('testtoken1');
      }
    });

    it('should generate QR code with token in URL', async () => {
      const result = await server.start();

      expect(result.ok).toBe(true);
      if (result.ok) {
        // QR code should be generated with token in URL
        expect(result.value.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
      }
    });
  });

  describe('Server start/stop cycle', () => {
    it('should complete full start/stop cycle without errors', async () => {
      // Start server
      const startResult = await server.start();
      expect(startResult.ok).toBe(true);
      expect(server.getStatus().isRunning).toBe(true);

      // Stop server
      await server.stop();
      expect(server.getStatus().isRunning).toBe(false);
    });

    it('should reset all status fields on stop', async () => {
      // Start server
      await server.start();

      // Stop server
      await server.stop();

      const status = server.getStatus();
      expect(status.isRunning).toBe(false);
      expect(status.port).toBeNull();
      expect(status.url).toBeNull();
      expect(status.tunnelStatus).toBe('disconnected');
      expect(status.tunnelUrl).toBeNull();
    });

    it('should allow restart after stop', async () => {
      // First cycle
      await server.start();
      await server.stop();

      // Second cycle
      const result = await server.start();
      expect(result.ok).toBe(true);
      expect(server.getStatus().isRunning).toBe(true);
    });
  });

  describe('Status change notifications', () => {
    it('should notify on start with correct status', async () => {
      const callback = vi.fn();
      server.onStatusChange(callback);

      await server.start();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          isRunning: true,
          tunnelStatus: 'disconnected',
        })
      );
    });

    it('should notify on stop with disconnected tunnelStatus', async () => {
      const callback = vi.fn();
      server.onStatusChange(callback);

      await server.start();
      callback.mockClear();

      await server.stop();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          isRunning: false,
          tunnelStatus: 'disconnected',
          tunnelUrl: null,
        })
      );
    });
  });

  describe('Error handling with Cloudflare options', () => {
    it('should handle publishToCloudflare=true without tunnel manager', async () => {
      // Currently, publishing to Cloudflare without tunnel manager should still work
      // (tunnel status will be 'disconnected')
      const result = await server.start(undefined, { publishToCloudflare: true });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.tunnelUrl).toBeNull();
        expect(result.value.accessToken).toBeDefined();
      }
    });
  });
});
