/**
 * Remote Access E2E Tests
 * Task 7.2: End-to-end tests for mobile UI interactions
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 *
 * Tests mobile UI to server connection and operations,
 * reconnection behavior, and multiple client scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocket } from 'ws';
import { RemoteAccessServer } from './remoteAccessServer';
import { WebSocketHandler } from './webSocketHandler';
import { LogBuffer } from './logBuffer';
import { RateLimiter } from '../utils/rateLimiter';

// Use unique port offset to avoid conflicts between test files
let e2eTestPortOffset = 100;

describe('Remote Access E2E Tests (Task 7.2)', () => {
  let server: RemoteAccessServer;
  let wsHandler: WebSocketHandler;
  let logBuffer: LogBuffer;
  let rateLimiter: RateLimiter;
  let serverUrl: string;
  let basePort: number;

  beforeEach(async () => {
    // Use unique port per test
    basePort = 8765 + (e2eTestPortOffset++ % 10);
    logBuffer = new LogBuffer({ maxEntries: 100 });
    rateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
    wsHandler = new WebSocketHandler({ logBuffer, rateLimiter });
    server = new RemoteAccessServer();

    // Start server for E2E tests, will auto-select port if needed
    const startResult = await server.start(basePort);
    if (!startResult.ok) {
      // If port is in use, try without specifying port
      const retryResult = await server.start();
      if (!retryResult.ok) {
        throw new Error('Failed to start server for E2E tests');
      }
      serverUrl = retryResult.value.url;
    } else {
      serverUrl = startResult.value.url;
    }

    // Use server's internal WebSocketHandler instead of creating a new one
    wsHandler = server.getWebSocketHandler();
  });

  afterEach(async () => {
    try {
      wsHandler.disconnectAll();
      await server.stop();
    } catch {
      // Ignore errors during cleanup
    }
    // Wait for port release
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  describe('Mobile UI Connection Flow', () => {
    it('should successfully connect from mobile client and receive INIT', async () => {
      // Simulate mobile client connection
      const mobileClient = new WebSocket(serverUrl);

      const initMessage = await new Promise<{
        type: string;
        payload: { project: string; specs: unknown[]; logs: unknown[] };
      }>((resolve, reject) => {
        mobileClient.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'INIT') {
            resolve(message);
          }
        });
        mobileClient.on('error', reject);
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      expect(initMessage.type).toBe('INIT');
      expect(initMessage.payload).toHaveProperty('project');
      expect(initMessage.payload).toHaveProperty('specs');
      expect(initMessage.payload).toHaveProperty('logs');

      mobileClient.close();
    });

    it('should show correct client count in server status', async () => {
      const mobileClient = new WebSocket(serverUrl);

      // Wait for INIT message to ensure connection is fully registered
      await new Promise<void>((resolve) => {
        mobileClient.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'INIT') resolve();
        });
      });

      expect(wsHandler.getClientCount()).toBeGreaterThanOrEqual(1);

      mobileClient.close();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(wsHandler.getClientCount()).toBe(0);
    });
  });

  describe('Mobile UI Spec Operations', () => {
    it('should allow mobile client to request and receive spec list', async () => {
      const stateProvider = {
        getProjectPath: () => '/mobile/project',
        getSpecs: vi.fn().mockResolvedValue([
          { id: 'mobile-spec-1', name: 'Mobile Feature', phase: 'requirements' },
          { id: 'mobile-spec-2', name: 'Another Feature', phase: 'implementation' },
        ]),
      };
      wsHandler.setStateProvider(stateProvider);

      const mobileClient = new WebSocket(serverUrl);

      // Wait for INIT
      await new Promise<void>((resolve) => {
        mobileClient.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'INIT') resolve();
        });
      });

      // Clear listener for INIT
      mobileClient.removeAllListeners('message');

      // Request specs
      const specsResponse = await new Promise<{
        type: string;
        payload: { specs: Array<{ id: string; name: string }> };
      }>((resolve, reject) => {
        mobileClient.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'SPECS_UPDATED') resolve(msg);
        });
        mobileClient.send(
          JSON.stringify({ type: 'GET_SPECS', timestamp: Date.now() })
        );
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      expect(specsResponse.type).toBe('SPECS_UPDATED');
      expect(specsResponse.payload.specs.length).toBe(2);
      expect(specsResponse.payload.specs[0].name).toBe('Mobile Feature');

      mobileClient.close();
    });

    it('should allow mobile client to execute workflow phase', async () => {
      const workflowController = {
        executePhase: vi.fn().mockResolvedValue({
          ok: true,
          value: { agentId: 'mobile-agent-001' },
        }),
        stopAgent: vi.fn(),
        resumeAgent: vi.fn(),
      };
      wsHandler.setWorkflowController(workflowController);

      const mobileClient = new WebSocket(serverUrl);

      // Wait for INIT
      await new Promise<void>((resolve) => {
        mobileClient.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'INIT') resolve();
        });
      });

      mobileClient.removeAllListeners('message');

      const phaseResponse = await new Promise<{
        type: string;
        payload: { specId: string; phase: string; agentId: string };
      }>((resolve, reject) => {
        mobileClient.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'PHASE_STARTED') resolve(msg);
          if (msg.type === 'ERROR') reject(new Error(msg.payload.message));
        });
        mobileClient.send(
          JSON.stringify({
            type: 'EXECUTE_PHASE',
            payload: { specId: 'mobile-spec-1', phase: 'design' },
            timestamp: Date.now(),
          })
        );
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      expect(phaseResponse.type).toBe('PHASE_STARTED');
      expect(phaseResponse.payload.specId).toBe('mobile-spec-1');
      expect(phaseResponse.payload.phase).toBe('design');
      expect(phaseResponse.payload.agentId).toBe('mobile-agent-001');

      expect(workflowController.executePhase).toHaveBeenCalledWith(
        'mobile-spec-1',
        'design'
      );

      mobileClient.close();
    });

    it('should allow mobile client to stop running workflow', async () => {
      const workflowController = {
        executePhase: vi.fn(),
        stopAgent: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
        resumeAgent: vi.fn(),
      };
      wsHandler.setWorkflowController(workflowController);

      const mobileClient = new WebSocket(serverUrl);

      // Wait for INIT
      await new Promise<void>((resolve) => {
        mobileClient.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'INIT') resolve();
        });
      });

      mobileClient.removeAllListeners('message');

      const stopResponse = await new Promise<{
        type: string;
        payload: { agentId: string };
      }>((resolve, reject) => {
        mobileClient.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'WORKFLOW_STOPPED') resolve(msg);
          if (msg.type === 'ERROR') reject(new Error(msg.payload.message));
        });
        mobileClient.send(
          JSON.stringify({
            type: 'STOP_WORKFLOW',
            payload: { agentId: 'running-agent' },
            timestamp: Date.now(),
          })
        );
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      expect(stopResponse.type).toBe('WORKFLOW_STOPPED');
      expect(stopResponse.payload.agentId).toBe('running-agent');

      mobileClient.close();
    });
  });

  describe('Reconnection Behavior', () => {
    it('should handle server restart and allow client reconnection', async () => {
      const mobileClient1 = new WebSocket(serverUrl);

      // Wait for INIT
      await new Promise<void>((resolve) => {
        mobileClient1.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'INIT') resolve();
        });
      });

      // Client receives close event on server stop
      const closePromise = new Promise<void>((resolve) => {
        mobileClient1.on('close', () => resolve());
      });

      // Stop server
      await server.stop();
      await closePromise;

      // Verify client disconnected
      expect(mobileClient1.readyState).toBe(WebSocket.CLOSED);

      // Restart server
      const restartResult = await server.start(basePort);
      expect(restartResult.ok).toBe(true);

      if (restartResult.ok) {
        const wss = server.getWebSocketServer();
        if (wss) {
          // Need new handler after restart
          wsHandler = new WebSocketHandler({ logBuffer, rateLimiter });
          wsHandler.initialize(wss);
        }

        // Reconnect client
        const mobileClient2 = new WebSocket(restartResult.value.url);

        const reconnected = await new Promise<boolean>((resolve) => {
          mobileClient2.on('open', () => resolve(true));
          mobileClient2.on('error', () => resolve(false));
          setTimeout(() => resolve(false), 5000);
        });

        expect(reconnected).toBe(true);
        mobileClient2.close();
      }
    });

    it('should receive INIT message after reconnection', async () => {
      const stateProvider = {
        getProjectPath: () => '/reconnect/project',
        getSpecs: vi.fn().mockResolvedValue([
          { id: 'reconnect-spec', name: 'Reconnect Test', phase: 'ready' },
        ]),
      };
      wsHandler.setStateProvider(stateProvider);

      // First connection
      const client1 = new WebSocket(serverUrl);

      await new Promise<void>((resolve) => {
        client1.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'INIT') resolve();
        });
      });

      client1.close();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Reconnect
      const client2 = new WebSocket(serverUrl);

      const initAfterReconnect = await new Promise<{
        type: string;
        payload: { project: string };
      }>((resolve, reject) => {
        client2.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'INIT') resolve(msg);
        });
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      expect(initAfterReconnect.type).toBe('INIT');
      expect(initAfterReconnect.payload.project).toBe('/reconnect/project');

      client2.close();
    });
  });

  describe('Multiple Clients Simultaneous Connection', () => {
    it('should handle multiple mobile clients connecting simultaneously', async () => {
      const NUM_CLIENTS = 5;
      const clients: WebSocket[] = [];

      try {
        // Connect multiple clients
        for (let i = 0; i < NUM_CLIENTS; i++) {
          clients.push(new WebSocket(serverUrl));
        }

        // Wait for all to receive INIT
        await Promise.all(
          clients.map(
            (client) =>
              new Promise<void>((resolve, reject) => {
                client.on('message', (data) => {
                  const msg = JSON.parse(data.toString());
                  if (msg.type === 'INIT') resolve();
                });
                client.on('error', reject);
                setTimeout(() => reject(new Error('Timeout')), 5000);
              })
          )
        );

        // All clients should be connected
        expect(wsHandler.getClientCount()).toBe(NUM_CLIENTS);
      } finally {
        // Close all clients
        for (const client of clients) {
          client.close();
        }
      }
    });

    it('should broadcast messages to all connected clients', async () => {
      const clients: WebSocket[] = [];
      const NUM_CLIENTS = 3;

      try {
        // Connect multiple clients
        for (let i = 0; i < NUM_CLIENTS; i++) {
          const client = new WebSocket(serverUrl);
          clients.push(client);
        }

        // Wait for all to receive INIT
        await Promise.all(
          clients.map(
            (client) =>
              new Promise<void>((resolve) => {
                client.on('message', (data) => {
                  const msg = JSON.parse(data.toString());
                  if (msg.type === 'INIT') resolve();
                });
              })
          )
        );

        // Clear listeners and set up message collectors
        const receivedMessages: Map<number, unknown[]> = new Map();
        clients.forEach((client, idx) => {
          client.removeAllListeners('message');
          receivedMessages.set(idx, []);
          client.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'AGENT_OUTPUT') {
              receivedMessages.get(idx)!.push(msg);
            }
          });
        });

        // Broadcast a message
        wsHandler.broadcastAgentOutput(
          'broadcast-agent',
          'stdout',
          'Broadcast test message',
          'info'
        );

        // Wait for broadcast propagation
        await new Promise((resolve) => setTimeout(resolve, 300));

        // All clients should have received the message
        for (let i = 0; i < NUM_CLIENTS; i++) {
          const messages = receivedMessages.get(i);
          expect(messages!.length).toBeGreaterThanOrEqual(1);
          expect(messages![0]).toMatchObject({
            type: 'AGENT_OUTPUT',
            payload: {
              agentId: 'broadcast-agent',
              data: 'Broadcast test message',
            },
          });
        }
      } finally {
        for (const client of clients) {
          client.close();
        }
      }
    });

    it('should handle one client disconnecting while others remain connected', async () => {
      const client1 = new WebSocket(serverUrl);
      const client2 = new WebSocket(serverUrl);
      const client3 = new WebSocket(serverUrl);

      try {
        // Wait for all INIT
        await Promise.all([
          new Promise<void>((resolve) => {
            client1.on('message', (data) => {
              const msg = JSON.parse(data.toString());
              if (msg.type === 'INIT') resolve();
            });
          }),
          new Promise<void>((resolve) => {
            client2.on('message', (data) => {
              const msg = JSON.parse(data.toString());
              if (msg.type === 'INIT') resolve();
            });
          }),
          new Promise<void>((resolve) => {
            client3.on('message', (data) => {
              const msg = JSON.parse(data.toString());
              if (msg.type === 'INIT') resolve();
            });
          }),
        ]);

        expect(wsHandler.getClientCount()).toBe(3);

        // Disconnect one client
        client2.close();

        await new Promise((resolve) => setTimeout(resolve, 200));

        // Other clients should remain connected
        expect(wsHandler.getClientCount()).toBe(2);
        expect(client1.readyState).toBe(WebSocket.OPEN);
        expect(client3.readyState).toBe(WebSocket.OPEN);

        // Clear listeners and set up for broadcast test
        client1.removeAllListeners('message');

        const receivedMessages: unknown[] = [];
        client1.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'AGENT_OUTPUT') {
            receivedMessages.push(msg);
          }
        });

        wsHandler.broadcastAgentOutput('test-agent', 'stdout', 'After disconnect', 'info');

        await new Promise((resolve) => setTimeout(resolve, 200));

        expect(receivedMessages.length).toBeGreaterThanOrEqual(1);
      } finally {
        client1.close();
        client3.close();
      }
    });

    it('should enforce maximum connection limit', async () => {
      // Create handler with low max client limit
      const limitedHandler = new WebSocketHandler({
        logBuffer,
        rateLimiter,
        maxClients: 3,
      });

      const wss = server.getWebSocketServer();
      if (wss) {
        limitedHandler.initialize(wss);
      }

      const clients: WebSocket[] = [];

      try {
        // Connect up to the limit
        for (let i = 0; i < 3; i++) {
          const client = new WebSocket(serverUrl);
          await new Promise<void>((resolve, reject) => {
            client.on('message', (data) => {
              const msg = JSON.parse(data.toString());
              if (msg.type === 'INIT') resolve();
            });
            client.on('error', reject);
            setTimeout(() => reject(new Error('Timeout')), 5000);
          });
          clients.push(client);
        }

        expect(limitedHandler.getClientCount()).toBe(3);

        // Try to connect one more client
        const extraClient = new WebSocket(serverUrl);

        const wasRejected = await new Promise<boolean>((resolve) => {
          extraClient.on('close', (code) => {
            // 1013 = "Try again later" - used for max connections
            resolve(code === 1013);
          });
          extraClient.on('open', () => {
            // If it opens, wait a bit to see if it gets closed
            setTimeout(() => resolve(false), 500);
          });
          setTimeout(() => resolve(false), 2000);
        });

        expect(wasRejected).toBe(true);
      } finally {
        for (const client of clients) {
          client.close();
        }
        limitedHandler.disconnectAll();
      }
    });
  });

  describe('Real-time Log Streaming', () => {
    it('should stream logs to mobile client in real-time', async () => {
      const mobileClient = new WebSocket(serverUrl);

      // Wait for INIT
      await new Promise<void>((resolve) => {
        mobileClient.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'INIT') resolve();
        });
      });

      mobileClient.removeAllListeners('message');

      const receivedLogs: unknown[] = [];
      mobileClient.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'AGENT_OUTPUT') {
          receivedLogs.push(msg);
        }
      });

      // Stream multiple logs rapidly
      for (let i = 0; i < 10; i++) {
        wsHandler.broadcastAgentOutput('streaming-agent', 'stdout', `Log ${i}`, 'agent');
      }

      // Wait for all messages
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(receivedLogs.length).toBe(10);
      expect((receivedLogs[0] as { payload: { data: string } }).payload.data).toBe('Log 0');
      expect((receivedLogs[9] as { payload: { data: string } }).payload.data).toBe('Log 9');

      mobileClient.close();
    });

    it('should include recent log history in INIT message for late-joining client', async () => {
      // Add logs before client connects using broadcastAgentOutput
      // This adds logs to the internal LogBuffer
      for (let i = 0; i < 5; i++) {
        wsHandler.broadcastAgentOutput('history-agent', 'stdout', `Historical log ${i}`, 'info');
      }

      // Wait a bit for logs to be processed
      await new Promise((resolve) => setTimeout(resolve, 100));

      const lateClient = new WebSocket(serverUrl);

      const initMessage = await new Promise<{
        type: string;
        payload: { logs: Array<{ data: string }> };
      }>((resolve, reject) => {
        lateClient.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'INIT') resolve(msg);
        });
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      expect(initMessage.type).toBe('INIT');
      // Logs may include entries from other tests, so check for at least 5
      expect(initMessage.payload.logs.length).toBeGreaterThanOrEqual(5);
      // Check that our historical logs are included
      const hasHistoricalLogs = initMessage.payload.logs.some(
        (log) => log.data === 'Historical log 0'
      );
      expect(hasHistoricalLogs).toBe(true);

      lateClient.close();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid message format gracefully', async () => {
      const mobileClient = new WebSocket(serverUrl);

      // Wait for INIT
      await new Promise<void>((resolve) => {
        mobileClient.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'INIT') resolve();
        });
      });

      mobileClient.removeAllListeners('message');

      const errorResponse = await new Promise<{ type: string; payload: { code: string } }>(
        (resolve, reject) => {
          mobileClient.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'ERROR') resolve(msg);
          });
          mobileClient.send('not valid json');
          setTimeout(() => reject(new Error('Timeout')), 5000);
        }
      );

      expect(errorResponse.type).toBe('ERROR');
      expect(errorResponse.payload.code).toBe('INVALID_JSON');

      mobileClient.close();
    });

    it('should handle unknown message type gracefully', async () => {
      const mobileClient = new WebSocket(serverUrl);

      // Wait for INIT
      await new Promise<void>((resolve) => {
        mobileClient.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'INIT') resolve();
        });
      });

      mobileClient.removeAllListeners('message');

      const errorResponse = await new Promise<{ type: string; payload: { code: string } }>(
        (resolve, reject) => {
          mobileClient.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'ERROR') resolve(msg);
          });
          mobileClient.send(
            JSON.stringify({
              type: 'UNKNOWN_COMMAND',
              timestamp: Date.now(),
            })
          );
          setTimeout(() => reject(new Error('Timeout')), 5000);
        }
      );

      expect(errorResponse.type).toBe('ERROR');
      expect(errorResponse.payload.code).toBe('UNKNOWN_MESSAGE_TYPE');

      mobileClient.close();
    });

    it('should handle workflow execution error gracefully', async () => {
      const workflowController = {
        executePhase: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'SPEC_NOT_FOUND', message: 'Spec not found' },
        }),
        stopAgent: vi.fn(),
        resumeAgent: vi.fn(),
      };
      wsHandler.setWorkflowController(workflowController);

      const mobileClient = new WebSocket(serverUrl);

      // Wait for INIT
      await new Promise<void>((resolve) => {
        mobileClient.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'INIT') resolve();
        });
      });

      mobileClient.removeAllListeners('message');

      const errorResponse = await new Promise<{
        type: string;
        payload: { code: string; message: string };
      }>((resolve, reject) => {
        mobileClient.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'ERROR') resolve(msg);
        });
        mobileClient.send(
          JSON.stringify({
            type: 'EXECUTE_PHASE',
            payload: { specId: 'nonexistent', phase: 'requirements' },
            timestamp: Date.now(),
          })
        );
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      expect(errorResponse.type).toBe('ERROR');
      expect(errorResponse.payload.code).toBe('SPEC_NOT_FOUND');

      mobileClient.close();
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on rapid requests', async () => {
      // Create handler with strict rate limit
      const strictRateLimiter = new RateLimiter({ maxRequests: 5, windowMs: 60000 });
      const strictHandler = new WebSocketHandler({
        logBuffer,
        rateLimiter: strictRateLimiter,
      });

      const wss = server.getWebSocketServer();
      if (wss) {
        strictHandler.initialize(wss);
      }

      const mobileClient = new WebSocket(serverUrl);

      // Wait for INIT
      await new Promise<void>((resolve) => {
        mobileClient.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'INIT') resolve();
        });
      });

      mobileClient.removeAllListeners('message');

      const responses: Array<{ type: string }> = [];
      mobileClient.on('message', (data) => {
        responses.push(JSON.parse(data.toString()));
      });

      // Send more requests than limit
      for (let i = 0; i < 10; i++) {
        mobileClient.send(
          JSON.stringify({
            type: 'GET_SPECS',
            timestamp: Date.now(),
          })
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Should have some RATE_LIMITED responses
      const rateLimitedResponses = responses.filter((r) => r.type === 'RATE_LIMITED');
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      mobileClient.close();
      strictHandler.disconnectAll();
    });
  });
});
