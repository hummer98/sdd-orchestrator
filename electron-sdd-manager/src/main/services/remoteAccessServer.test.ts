/**
 * RemoteAccessServer Unit Tests
 * TDD: Testing HTTP/WebSocket server lifecycle and port management
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createServer } from 'net';
import { RemoteAccessServer, ServerError } from './remoteAccessServer';

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
    it('should start server on default port 8765', async () => {
      const result = await server.start();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.port).toBe(8765);
        expect(result.value.url).toContain(':8765');
      }
    });

    it('should start server on specified port within range', async () => {
      const result = await server.start(8770);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.port).toBe(8770);
        expect(result.value.url).toContain(':8770');
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
      // Start a dummy server on port 8765
      const blockingServer = createServer();
      await new Promise<void>((resolve) => {
        blockingServer.listen(8765, () => resolve());
      });

      try {
        const result = await server.start(8765);

        expect(result.ok).toBe(true);
        if (result.ok) {
          // Should use port 8766 since 8765 is blocked
          expect(result.value.port).toBe(8766);
        }
      } finally {
        await new Promise<void>((resolve) => {
          blockingServer.close(() => resolve());
        });
      }
    });

    it('should return error when all ports are in use', async () => {
      // Block ports 8765-8775
      const blockingServers: ReturnType<typeof createServer>[] = [];

      try {
        for (let port = 8765; port <= 8775; port++) {
          const blockingServer = createServer();
          await new Promise<void>((resolve) => {
            blockingServer.listen(port, () => resolve());
          });
          blockingServers.push(blockingServer);
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
    });

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
      await server.start(8765);

      const status = server.getStatus();
      expect(status.isRunning).toBe(true);
      expect(status.port).toBe(8765);
      expect(status.url).toContain(':8765');
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
      // Block port 8765
      const blockingServer = createServer();
      await new Promise<void>((resolve) => {
        blockingServer.listen(8765, () => resolve());
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
