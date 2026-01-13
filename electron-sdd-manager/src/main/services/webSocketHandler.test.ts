/**
 * WebSocketHandler Tests
 * Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 5.1-5.8, 8.5, 9.1, 9.3, 9.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';

// ============================================================
// Task 3.1: WebSocketHandler Basic Functionality Tests
// Requirements: 8.5, 9.1
// ============================================================

describe('WebSocketHandler - Basic Functionality (Task 3.1)', () => {
  let mockWss: WebSocketServer;
  let connectionHandler: ((ws: WebSocket, req: IncomingMessage) => void) | null;

  beforeEach(() => {
    connectionHandler = null;
    mockWss = {
      on: vi.fn((event: string, handler: (ws: WebSocket, req: IncomingMessage) => void) => {
        if (event === 'connection') {
          connectionHandler = handler;
        }
      }),
      clients: new Set<WebSocket>(),
    } as unknown as WebSocketServer;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('should register connection handler on WebSocketServer', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const handler = new WebSocketHandler();

      handler.initialize(mockWss);

      expect(mockWss.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });
  });

  describe('IP validation on connection', () => {
    it('should accept connections from private IP addresses', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const handler = new WebSocketHandler();
      handler.initialize(mockWss);

      // Create mock WebSocket and request
      const mockWs = createMockWebSocket();
      const mockReq = createMockRequest('192.168.1.100');

      // Trigger connection
      expect(connectionHandler).not.toBeNull();
      connectionHandler!(mockWs, mockReq);

      // Should not close the connection
      expect(mockWs.close).not.toHaveBeenCalled();
      expect(handler.getClientCount()).toBe(1);
    });

    it('should reject connections from public IP addresses', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const handler = new WebSocketHandler();
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      const mockReq = createMockRequest('8.8.8.8');

      connectionHandler!(mockWs, mockReq);

      // Should close the connection with 403 status
      expect(mockWs.close).toHaveBeenCalledWith(1008, 'Connection from non-private IP rejected');
      expect(handler.getClientCount()).toBe(0);
    });

    it('should accept connections from loopback addresses', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const handler = new WebSocketHandler();
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      const mockReq = createMockRequest('127.0.0.1');

      connectionHandler!(mockWs, mockReq);

      expect(mockWs.close).not.toHaveBeenCalled();
      expect(handler.getClientCount()).toBe(1);
    });
  });

  describe('client count tracking', () => {
    it('should track number of connected clients', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const handler = new WebSocketHandler();
      handler.initialize(mockWss);

      expect(handler.getClientCount()).toBe(0);

      // Connect first client
      const mockWs1 = createMockWebSocket();
      connectionHandler!(mockWs1, createMockRequest('192.168.1.1'));
      expect(handler.getClientCount()).toBe(1);

      // Connect second client
      const mockWs2 = createMockWebSocket();
      connectionHandler!(mockWs2, createMockRequest('192.168.1.2'));
      expect(handler.getClientCount()).toBe(2);
    });

    it('should decrement client count on disconnect', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const handler = new WebSocketHandler();
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));
      expect(handler.getClientCount()).toBe(1);

      // Trigger close event
      const closeHandler = mockWs.on.mock.calls.find(([event]) => event === 'close')?.[1];
      closeHandler?.();
      expect(handler.getClientCount()).toBe(0);
    });
  });

  describe('max connections limit', () => {
    it('should reject connections when max clients reached', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const handler = new WebSocketHandler({ maxClients: 2 });
      handler.initialize(mockWss);

      // Connect 2 clients (max)
      const mockWs1 = createMockWebSocket();
      const mockWs2 = createMockWebSocket();
      connectionHandler!(mockWs1, createMockRequest('192.168.1.1'));
      connectionHandler!(mockWs2, createMockRequest('192.168.1.2'));
      expect(handler.getClientCount()).toBe(2);

      // Try to connect third client
      const mockWs3 = createMockWebSocket();
      connectionHandler!(mockWs3, createMockRequest('192.168.1.3'));

      expect(mockWs3.close).toHaveBeenCalledWith(1013, 'Maximum connections reached');
    });
  });

  describe('disconnectAll', () => {
    it('should disconnect all connected clients', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const handler = new WebSocketHandler();
      handler.initialize(mockWss);

      // Connect multiple clients
      const mockWs1 = createMockWebSocket();
      const mockWs2 = createMockWebSocket();
      connectionHandler!(mockWs1, createMockRequest('192.168.1.1'));
      connectionHandler!(mockWs2, createMockRequest('192.168.1.2'));

      handler.disconnectAll();

      expect(mockWs1.close).toHaveBeenCalledWith(1001, 'Server shutting down');
      expect(mockWs2.close).toHaveBeenCalledWith(1001, 'Server shutting down');
    });
  });
});

// ============================================================
// Helper Functions
// ============================================================

function createMockWebSocket(): WebSocket & { on: ReturnType<typeof vi.fn> } {
  const eventHandlers = new Map<string, ((...args: unknown[]) => void)[]>();
  const mockWs = {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, []);
      }
      eventHandlers.get(event)!.push(handler);
      return mockWs;
    }),
    off: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
    readyState: 1, // WebSocket.OPEN
    emit: (event: string, ...args: unknown[]) => {
      const handlers = eventHandlers.get(event) || [];
      handlers.forEach((h) => h(...args));
    },
  };
  return mockWs as unknown as WebSocket & { on: ReturnType<typeof vi.fn> };
}

// ============================================================
// Task 3.2: Message Routing Tests
// Requirements: 9.3, 9.4
// ============================================================

describe('WebSocketHandler - Message Routing (Task 3.2)', () => {
  let mockWss: WebSocketServer;
  let connectionHandler: ((ws: WebSocket, req: IncomingMessage) => void) | null;

  beforeEach(() => {
    vi.useFakeTimers();
    connectionHandler = null;
    mockWss = {
      on: vi.fn((event: string, handler: (ws: WebSocket, req: IncomingMessage) => void) => {
        if (event === 'connection') {
          connectionHandler = handler;
        }
      }),
      clients: new Set<WebSocket>(),
    } as unknown as WebSocketServer;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('JSON parsing and validation', () => {
    it('should send error for invalid JSON', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');
      const mockRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });

      const handler = new WebSocketHandler({ rateLimiter: mockRateLimiter });
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      // Get message handler
      const messageHandler = mockWs.on.mock.calls.find(([event]) => event === 'message')?.[1];
      expect(messageHandler).toBeDefined();

      // Send invalid JSON
      await messageHandler!(Buffer.from('not valid json'));

      // Wait for async processing
      await vi.runAllTimersAsync();

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"ERROR"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"code":"INVALID_JSON"')
      );
    });

    it('should send error for invalid message structure', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');
      const mockRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });

      const handler = new WebSocketHandler({ rateLimiter: mockRateLimiter });
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      const messageHandler = mockWs.on.mock.calls.find(([event]) => event === 'message')?.[1];

      // Send JSON without required fields
      await messageHandler!(JSON.stringify({ data: 'test' }));

      await vi.runAllTimersAsync();

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"ERROR"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"code":"INVALID_MESSAGE"')
      );
    });

    it('should send error for unknown message type', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');
      const mockRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });

      const handler = new WebSocketHandler({ rateLimiter: mockRateLimiter });
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      const messageHandler = mockWs.on.mock.calls.find(([event]) => event === 'message')?.[1];

      // Send valid JSON with unknown message type
      await messageHandler!(JSON.stringify({
        type: 'UNKNOWN_TYPE',
        timestamp: Date.now(),
      }));

      await vi.runAllTimersAsync();

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"ERROR"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"code":"UNKNOWN_MESSAGE_TYPE"')
      );
    });
  });

  describe('rate limiting', () => {
    it('should apply rate limiting on messages', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');

      // Create rate limiter with low limit for testing
      const mockRateLimiter = new RateLimiter({ maxRequests: 2, windowMs: 60000 });

      const handler = new WebSocketHandler({ rateLimiter: mockRateLimiter });
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      const messageHandler = mockWs.on.mock.calls.find(([event]) => event === 'message')?.[1];

      const validMessage = JSON.stringify({
        type: 'GET_SPECS',
        timestamp: Date.now(),
      });

      // First two messages should pass
      await messageHandler!(validMessage);
      await messageHandler!(validMessage);

      // Third message should be rate limited
      await messageHandler!(validMessage);

      await vi.runAllTimersAsync();

      // Should receive RATE_LIMITED message
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"RATE_LIMITED"')
      );
    });

    it('should include retryAfter in rate limit response', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');

      const mockRateLimiter = new RateLimiter({ maxRequests: 1, windowMs: 60000 });

      const handler = new WebSocketHandler({ rateLimiter: mockRateLimiter });
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      const messageHandler = mockWs.on.mock.calls.find(([event]) => event === 'message')?.[1];

      const validMessage = JSON.stringify({
        type: 'GET_SPECS',
        timestamp: Date.now(),
      });

      // Use up the rate limit
      await messageHandler!(validMessage);
      // This should trigger rate limit
      await messageHandler!(validMessage);

      await vi.runAllTimersAsync();

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"retryAfter"')
      );
    });
  });
});

function createMockRequest(remoteAddress: string): IncomingMessage {
  // Create a mock socket with the remoteAddress property
  const mockSocket = {
    remoteAddress,
    // Add minimum required socket properties
    readable: true,
    writable: true,
    destroyed: false,
    on: vi.fn().mockReturnThis(),
    once: vi.fn().mockReturnThis(),
    emit: vi.fn().mockReturnThis(),
    removeListener: vi.fn().mockReturnThis(),
    addListener: vi.fn().mockReturnThis(),
    prependListener: vi.fn().mockReturnThis(),
    prependOnceListener: vi.fn().mockReturnThis(),
    setTimeout: vi.fn().mockReturnThis(),
  };

  // Create mock IncomingMessage with the mock socket
  const req = {
    socket: mockSocket,
    headers: {},
    method: 'GET',
    url: '/',
  } as unknown as IncomingMessage;

  return req;
}

// ============================================================
// Task 3.3: Project/Spec State Distribution Tests
// Requirements: 3.1, 3.2, 3.3, 4.2
// ============================================================

describe('WebSocketHandler - Project/Spec State Distribution (Task 3.3)', () => {
  let mockWss: WebSocketServer;
  let connectionHandler: ((ws: WebSocket, req: IncomingMessage) => void) | null;

  beforeEach(() => {
    vi.useFakeTimers();
    connectionHandler = null;
    mockWss = {
      on: vi.fn((event: string, handler: (ws: WebSocket, req: IncomingMessage) => void) => {
        if (event === 'connection') {
          connectionHandler = handler;
        }
      }),
      clients: new Set<WebSocket>(),
    } as unknown as WebSocketServer;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('setStateProvider', () => {
    it('should allow setting a state provider', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const handler = new WebSocketHandler();

      const stateProvider = {
        getProjectPath: vi.fn().mockReturnValue('/test/project'),
        getSpecs: vi.fn().mockResolvedValue([]),
      };

      // Should not throw
      expect(() => handler.setStateProvider(stateProvider)).not.toThrow();
    });
  });

  describe('INIT message on connection', () => {
    it('should send INIT message with project info on new connection', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');
      const { LogBuffer } = await import('./logBuffer');

      const mockRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
      const mockLogBuffer = new LogBuffer({ maxEntries: 100 });

      const handler = new WebSocketHandler({
        rateLimiter: mockRateLimiter,
        logBuffer: mockLogBuffer,
      });

      // Set state provider
      const stateProvider = {
        getProjectPath: vi.fn().mockReturnValue('/test/project'),
        getSpecs: vi.fn().mockResolvedValue([
          { id: 'spec-1', name: 'Test Spec', phase: 'requirements' },
        ]),
      };
      handler.setStateProvider(stateProvider);
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      // Wait for async processing
      await vi.runAllTimersAsync();

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"INIT"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('/test/project')
      );
    });

    it('should include recent logs in INIT message', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');
      const { LogBuffer } = await import('./logBuffer');

      const mockRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
      const mockLogBuffer = new LogBuffer({ maxEntries: 100 });

      // Add some logs
      mockLogBuffer.add({
        timestamp: Date.now(),
        agentId: 'agent-1',
        stream: 'stdout',
        data: 'Test log entry',
        type: 'info',
      });

      const handler = new WebSocketHandler({
        rateLimiter: mockRateLimiter,
        logBuffer: mockLogBuffer,
      });

      const stateProvider = {
        getProjectPath: vi.fn().mockReturnValue('/test/project'),
        getSpecs: vi.fn().mockResolvedValue([]),
      };
      handler.setStateProvider(stateProvider);
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      await vi.runAllTimersAsync();

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"logs"')
      );
    });
  });

  describe('GET_SPECS message handling', () => {
    it('should respond with spec list when receiving GET_SPECS', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');

      const mockRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
      const handler = new WebSocketHandler({ rateLimiter: mockRateLimiter });

      const stateProvider = {
        getProjectPath: vi.fn().mockReturnValue('/test/project'),
        getSpecs: vi.fn().mockResolvedValue([
          { id: 'spec-1', name: 'Feature A', phase: 'design' },
          { id: 'spec-2', name: 'Feature B', phase: 'tasks' },
        ]),
      };
      handler.setStateProvider(stateProvider);
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      // Clear initial INIT message
      mockWs.send.mockClear();

      const messageHandler = mockWs.on.mock.calls.find(([event]) => event === 'message')?.[1];

      await messageHandler!(JSON.stringify({
        type: 'GET_SPECS',
        timestamp: Date.now(),
      }));

      await vi.runAllTimersAsync();

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"SPECS_UPDATED"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('Feature A')
      );
    });
  });

  describe('broadcast functionality', () => {
    it('should broadcast SPECS_UPDATED to all clients', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const handler = new WebSocketHandler();
      handler.initialize(mockWss);

      // Connect multiple clients
      const mockWs1 = createMockWebSocket();
      const mockWs2 = createMockWebSocket();
      connectionHandler!(mockWs1, createMockRequest('192.168.1.1'));
      connectionHandler!(mockWs2, createMockRequest('192.168.1.2'));

      // Clear initial messages
      mockWs1.send.mockClear();
      mockWs2.send.mockClear();

      // Broadcast message
      handler.broadcast({
        type: 'SPECS_UPDATED',
        payload: { specs: [] },
        timestamp: Date.now(),
      });

      expect(mockWs1.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"SPECS_UPDATED"')
      );
      expect(mockWs2.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"SPECS_UPDATED"')
      );
    });

    it('should broadcast SPEC_CHANGED for individual spec updates', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const handler = new WebSocketHandler();
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      mockWs.send.mockClear();

      handler.broadcast({
        type: 'SPEC_CHANGED',
        payload: { specId: 'spec-1', spec: { phase: 'design' } },
        timestamp: Date.now(),
      });

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"SPEC_CHANGED"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"specId":"spec-1"')
      );
    });
  });
});

// ============================================================
// Task 3.4: Workflow Operation Commands Tests
// Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.8
// ============================================================

describe('WebSocketHandler - Workflow Operations (Task 3.4)', () => {
  let mockWss: WebSocketServer;
  let connectionHandler: ((ws: WebSocket, req: IncomingMessage) => void) | null;

  beforeEach(() => {
    vi.useFakeTimers();
    connectionHandler = null;
    mockWss = {
      on: vi.fn((event: string, handler: (ws: WebSocket, req: IncomingMessage) => void) => {
        if (event === 'connection') {
          connectionHandler = handler;
        }
      }),
      clients: new Set<WebSocket>(),
    } as unknown as WebSocketServer;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('setWorkflowController', () => {
    it('should allow setting a workflow controller', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const handler = new WebSocketHandler();

      const workflowController = {
        executePhase: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'agent-1' } }),
        stopAgent: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
        resumeAgent: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'agent-1' } }),
      };

      expect(() => handler.setWorkflowController(workflowController)).not.toThrow();
    });
  });

  describe('EXECUTE_PHASE message handling', () => {
    it('should execute phase and send PHASE_STARTED on success', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');

      const mockRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
      const handler = new WebSocketHandler({ rateLimiter: mockRateLimiter });

      const workflowController = {
        executePhase: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'agent-123' } }),
        stopAgent: vi.fn(),
        resumeAgent: vi.fn(),
      };
      handler.setWorkflowController(workflowController);
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      mockWs.send.mockClear();

      const messageHandler = mockWs.on.mock.calls.find(([event]) => event === 'message')?.[1];

      await messageHandler!(JSON.stringify({
        type: 'EXECUTE_PHASE',
        payload: { specId: 'test-spec', phase: 'requirements' },
        timestamp: Date.now(),
      }));

      await vi.runAllTimersAsync();

      expect(workflowController.executePhase).toHaveBeenCalledWith('test-spec', 'requirements');
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"PHASE_STARTED"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"agentId":"agent-123"')
      );
    });

    it('should send ERROR on phase execution failure', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');

      const mockRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
      const handler = new WebSocketHandler({ rateLimiter: mockRateLimiter });

      const workflowController = {
        executePhase: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'SPAWN_ERROR', message: 'Failed to spawn agent' },
        }),
        stopAgent: vi.fn(),
        resumeAgent: vi.fn(),
      };
      handler.setWorkflowController(workflowController);
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      mockWs.send.mockClear();

      const messageHandler = mockWs.on.mock.calls.find(([event]) => event === 'message')?.[1];

      await messageHandler!(JSON.stringify({
        type: 'EXECUTE_PHASE',
        payload: { specId: 'test-spec', phase: 'design' },
        timestamp: Date.now(),
      }));

      await vi.runAllTimersAsync();

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"ERROR"')
      );
    });

    it('should send ERROR when no workflow controller is set', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');

      const mockRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
      const handler = new WebSocketHandler({ rateLimiter: mockRateLimiter });
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      mockWs.send.mockClear();

      const messageHandler = mockWs.on.mock.calls.find(([event]) => event === 'message')?.[1];

      await messageHandler!(JSON.stringify({
        type: 'EXECUTE_PHASE',
        payload: { specId: 'test-spec', phase: 'requirements' },
        timestamp: Date.now(),
      }));

      await vi.runAllTimersAsync();

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"ERROR"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"code":"NO_CONTROLLER"')
      );
    });
  });

  describe('STOP_WORKFLOW message handling', () => {
    it('should stop agent and send confirmation', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');

      const mockRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
      const handler = new WebSocketHandler({ rateLimiter: mockRateLimiter });

      const workflowController = {
        executePhase: vi.fn(),
        stopAgent: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
        resumeAgent: vi.fn(),
      };
      handler.setWorkflowController(workflowController);
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      mockWs.send.mockClear();

      const messageHandler = mockWs.on.mock.calls.find(([event]) => event === 'message')?.[1];

      await messageHandler!(JSON.stringify({
        type: 'STOP_WORKFLOW',
        payload: { agentId: 'agent-456' },
        timestamp: Date.now(),
      }));

      await vi.runAllTimersAsync();

      expect(workflowController.stopAgent).toHaveBeenCalledWith('agent-456');
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"WORKFLOW_STOPPED"')
      );
    });
  });

  describe('RESUME_WORKFLOW message handling', () => {
    it('should resume agent and send confirmation', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');

      const mockRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
      const handler = new WebSocketHandler({ rateLimiter: mockRateLimiter });

      const workflowController = {
        executePhase: vi.fn(),
        stopAgent: vi.fn(),
        resumeAgent: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'agent-789' } }),
      };
      handler.setWorkflowController(workflowController);
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      mockWs.send.mockClear();

      const messageHandler = mockWs.on.mock.calls.find(([event]) => event === 'message')?.[1];

      await messageHandler!(JSON.stringify({
        type: 'RESUME_WORKFLOW',
        payload: { agentId: 'agent-789' },
        timestamp: Date.now(),
      }));

      await vi.runAllTimersAsync();

      expect(workflowController.resumeAgent).toHaveBeenCalledWith('agent-789');
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"WORKFLOW_RESUMED"')
      );
    });
  });
});

// ============================================================
// Task 3.5: Real-time Log Distribution Tests
// Requirements: 4.1, 4.5
// ============================================================

describe('WebSocketHandler - Real-time Log Distribution (Task 3.5)', () => {
  let mockWss: WebSocketServer;
  let connectionHandler: ((ws: WebSocket, req: IncomingMessage) => void) | null;

  beforeEach(() => {
    vi.useFakeTimers();
    connectionHandler = null;
    mockWss = {
      on: vi.fn((event: string, handler: (ws: WebSocket, req: IncomingMessage) => void) => {
        if (event === 'connection') {
          connectionHandler = handler;
        }
      }),
      clients: new Set<WebSocket>(),
    } as unknown as WebSocketServer;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('broadcastAgentOutput', () => {
    it('should broadcast AGENT_OUTPUT to all connected clients', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { LogBuffer } = await import('./logBuffer');

      const mockLogBuffer = new LogBuffer({ maxEntries: 100 });
      const handler = new WebSocketHandler({ logBuffer: mockLogBuffer });
      handler.initialize(mockWss);

      // Connect clients
      const mockWs1 = createMockWebSocket();
      const mockWs2 = createMockWebSocket();
      connectionHandler!(mockWs1, createMockRequest('192.168.1.1'));
      connectionHandler!(mockWs2, createMockRequest('192.168.1.2'));

      mockWs1.send.mockClear();
      mockWs2.send.mockClear();

      // Broadcast agent output
      handler.broadcastAgentOutput('agent-123', 'stdout', 'Hello from agent');

      expect(mockWs1.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"AGENT_OUTPUT"')
      );
      expect(mockWs1.send).toHaveBeenCalledWith(
        expect.stringContaining('"agentId":"agent-123"')
      );
      expect(mockWs1.send).toHaveBeenCalledWith(
        expect.stringContaining('"stream":"stdout"')
      );
      expect(mockWs2.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"AGENT_OUTPUT"')
      );
    });

    it('should add log entry to LogBuffer', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { LogBuffer } = await import('./logBuffer');

      const mockLogBuffer = new LogBuffer({ maxEntries: 100 });
      const handler = new WebSocketHandler({ logBuffer: mockLogBuffer });
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      // Broadcast agent output
      handler.broadcastAgentOutput('agent-456', 'stderr', 'Error message');

      const logs = mockLogBuffer.getAll();
      expect(logs.length).toBe(1);
      expect(logs[0].agentId).toBe('agent-456');
      expect(logs[0].stream).toBe('stderr');
      expect(logs[0].data).toBe('Error message');
    });

    it('should correctly classify log types', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { LogBuffer } = await import('./logBuffer');

      const mockLogBuffer = new LogBuffer({ maxEntries: 100 });
      const handler = new WebSocketHandler({ logBuffer: mockLogBuffer });
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      // Test different log types
      handler.broadcastAgentOutput('agent-1', 'stdout', 'Normal output', 'info');
      handler.broadcastAgentOutput('agent-1', 'stderr', 'Error output', 'error');
      handler.broadcastAgentOutput('agent-1', 'stdout', 'Warning message', 'warning');
      handler.broadcastAgentOutput('agent-1', 'stdout', 'Agent message', 'agent');

      const logs = mockLogBuffer.getAll();
      expect(logs.length).toBe(4);
      expect(logs[0].type).toBe('info');
      expect(logs[1].type).toBe('error');
      expect(logs[2].type).toBe('warning');
      expect(logs[3].type).toBe('agent');
    });
  });

  describe('broadcastAgentStatus', () => {
    it('should broadcast AGENT_STATUS to all connected clients', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const handler = new WebSocketHandler();
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      mockWs.send.mockClear();

      handler.broadcastAgentStatus('agent-789', 'completed');

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"AGENT_STATUS"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"agentId":"agent-789"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"status":"completed"')
      );
    });
  });

  describe('broadcastPhaseCompleted', () => {
    it('should broadcast PHASE_COMPLETED to all connected clients', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const handler = new WebSocketHandler();
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      mockWs.send.mockClear();

      handler.broadcastPhaseCompleted('test-spec', 'requirements', { success: true });

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"PHASE_COMPLETED"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"specId":"test-spec"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"phase":"requirements"')
      );
    });
  });
});

// ============================================================
// Task 1.1 & 1.2: StateProvider.getBugs() Tests (internal-webserver-sync feature)
// Requirements: 1.1, 5.5, 6.1
// ============================================================

describe('WebSocketHandler - StateProvider.getBugs() (Task 1.1 & 1.2)', () => {
  let mockWss: WebSocketServer;
  let connectionHandler: ((ws: WebSocket, req: IncomingMessage) => void) | null;

  beforeEach(() => {
    vi.useFakeTimers();
    connectionHandler = null;
    mockWss = {
      on: vi.fn((event: string, handler: (ws: WebSocket, req: IncomingMessage) => void) => {
        if (event === 'connection') {
          connectionHandler = handler;
        }
      }),
      clients: new Set<WebSocket>(),
    } as unknown as WebSocketServer;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('StateProvider getBugs interface', () => {
    it('should allow setting a state provider with getBugs method', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const handler = new WebSocketHandler();

      const stateProvider = {
        getProjectPath: vi.fn().mockReturnValue('/test/project'),
        getSpecs: vi.fn().mockResolvedValue([]),
        getBugs: vi.fn().mockResolvedValue([
          { name: 'bug-1', phase: 'reported', updatedAt: '2025-01-01T00:00:00Z' },
        ]),
      };

      // Should not throw
      expect(() => handler.setStateProvider(stateProvider)).not.toThrow();
    });
  });

  describe('INIT message with bugs', () => {
    it('should include bugs in INIT message when getBugs is provided', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');
      const { LogBuffer } = await import('./logBuffer');

      const mockRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
      const mockLogBuffer = new LogBuffer({ maxEntries: 100 });

      const handler = new WebSocketHandler({
        rateLimiter: mockRateLimiter,
        logBuffer: mockLogBuffer,
      });

      const stateProvider = {
        getProjectPath: vi.fn().mockReturnValue('/test/project'),
        getSpecs: vi.fn().mockResolvedValue([]),
        getBugs: vi.fn().mockResolvedValue([
          { name: 'bug-1', phase: 'reported', updatedAt: '2025-01-01T00:00:00Z' },
          { name: 'bug-2', phase: 'analyzed', updatedAt: '2025-01-02T00:00:00Z' },
        ]),
      };
      handler.setStateProvider(stateProvider);
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      await vi.runAllTimersAsync();

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"INIT"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"bugs"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('bug-1')
      );
    });

    it('should include empty bugs array when getBugs is not provided', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');
      const { LogBuffer } = await import('./logBuffer');

      const mockRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
      const mockLogBuffer = new LogBuffer({ maxEntries: 100 });

      const handler = new WebSocketHandler({
        rateLimiter: mockRateLimiter,
        logBuffer: mockLogBuffer,
      });

      // StateProvider without getBugs
      const stateProvider = {
        getProjectPath: vi.fn().mockReturnValue('/test/project'),
        getSpecs: vi.fn().mockResolvedValue([]),
      };
      handler.setStateProvider(stateProvider);
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      await vi.runAllTimersAsync();

      // Should still have bugs field with empty array
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"bugs":[]')
      );
    });
  });

  describe('GET_BUGS message handling', () => {
    it('should respond with bugs list when receiving GET_BUGS', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');

      const mockRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
      const handler = new WebSocketHandler({ rateLimiter: mockRateLimiter });

      const stateProvider = {
        getProjectPath: vi.fn().mockReturnValue('/test/project'),
        getSpecs: vi.fn().mockResolvedValue([]),
        getBugs: vi.fn().mockResolvedValue([
          { name: 'bug-1', phase: 'reported', updatedAt: '2025-01-01T00:00:00Z' },
        ]),
      };
      handler.setStateProvider(stateProvider);
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      mockWs.send.mockClear();

      const messageHandler = mockWs.on.mock.calls.find(([event]) => event === 'message')?.[1];

      await messageHandler!(JSON.stringify({
        type: 'GET_BUGS',
        timestamp: Date.now(),
      }));

      await vi.runAllTimersAsync();

      expect(stateProvider.getBugs).toHaveBeenCalled();
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"BUGS_UPDATED"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('bug-1')
      );
    });

    it('should return empty bugs array when getBugs is not provided', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');

      const mockRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
      const handler = new WebSocketHandler({ rateLimiter: mockRateLimiter });

      // StateProvider without getBugs
      const stateProvider = {
        getProjectPath: vi.fn().mockReturnValue('/test/project'),
        getSpecs: vi.fn().mockResolvedValue([]),
      };
      handler.setStateProvider(stateProvider);
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      mockWs.send.mockClear();

      const messageHandler = mockWs.on.mock.calls.find(([event]) => event === 'message')?.[1];

      await messageHandler!(JSON.stringify({
        type: 'GET_BUGS',
        timestamp: Date.now(),
      }));

      await vi.runAllTimersAsync();

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"BUGS_UPDATED"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"bugs":[]')
      );
    });
  });

  describe('broadcastBugsUpdated', () => {
    it('should broadcast BUGS_UPDATED to all connected clients', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const handler = new WebSocketHandler();
      handler.initialize(mockWss);

      // Connect multiple clients
      const mockWs1 = createMockWebSocket();
      const mockWs2 = createMockWebSocket();
      connectionHandler!(mockWs1, createMockRequest('192.168.1.1'));
      connectionHandler!(mockWs2, createMockRequest('192.168.1.2'));

      mockWs1.send.mockClear();
      mockWs2.send.mockClear();

      const bugs = [
        { name: 'bug-1', phase: 'reported' as const, updatedAt: '2025-01-01T00:00:00Z', path: '/test/bug-1', reportedAt: '2025-01-01T00:00:00Z' },
      ];
      handler.broadcastBugsUpdated(bugs);

      expect(mockWs1.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"BUGS_UPDATED"')
      );
      expect(mockWs2.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"BUGS_UPDATED"')
      );
    });
  });
});

// ============================================================
// Task 3.1.2: EXECUTE_BUG_PHASE Message Handler Tests
// Requirements: 6.2 (internal-webserver-sync)
// ============================================================

describe('WebSocketHandler - EXECUTE_BUG_PHASE Handler (Task 3.1.2)', () => {
  let mockWss: WebSocketServer;
  let connectionHandler: ((ws: WebSocket, req: IncomingMessage) => void) | null;

  beforeEach(() => {
    vi.useFakeTimers();
    connectionHandler = null;
    mockWss = {
      on: vi.fn((event: string, handler: (ws: WebSocket, req: IncomingMessage) => void) => {
        if (event === 'connection') {
          connectionHandler = handler;
        }
      }),
      clients: new Set<WebSocket>(),
    } as unknown as WebSocketServer;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('EXECUTE_BUG_PHASE message handling', () => {
    it('should execute bug phase and send BUG_PHASE_STARTED on success', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');

      const mockRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
      const handler = new WebSocketHandler({ rateLimiter: mockRateLimiter });

      const workflowController = {
        executePhase: vi.fn(),
        stopAgent: vi.fn(),
        resumeAgent: vi.fn(),
        executeBugPhase: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'agent-bug-123' } }),
      };
      handler.setWorkflowController(workflowController);
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      mockWs.send.mockClear();

      const messageHandler = mockWs.on.mock.calls.find(([event]) => event === 'message')?.[1];

      await messageHandler!(JSON.stringify({
        type: 'EXECUTE_BUG_PHASE',
        payload: { bugName: 'my-bug', phase: 'analyze' },
        timestamp: Date.now(),
      }));

      await vi.runAllTimersAsync();

      expect(workflowController.executeBugPhase).toHaveBeenCalledWith('my-bug', 'analyze');
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"BUG_PHASE_STARTED"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"agentId":"agent-bug-123"')
      );
    });

    it('should send ERROR when executeBugPhase is not supported', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');

      const mockRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
      const handler = new WebSocketHandler({ rateLimiter: mockRateLimiter });

      // WorkflowController without executeBugPhase
      const workflowController = {
        executePhase: vi.fn(),
        stopAgent: vi.fn(),
        resumeAgent: vi.fn(),
      };
      handler.setWorkflowController(workflowController);
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      mockWs.send.mockClear();

      const messageHandler = mockWs.on.mock.calls.find(([event]) => event === 'message')?.[1];

      await messageHandler!(JSON.stringify({
        type: 'EXECUTE_BUG_PHASE',
        payload: { bugName: 'my-bug', phase: 'analyze' },
        timestamp: Date.now(),
      }));

      await vi.runAllTimersAsync();

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"ERROR"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"code":"NOT_SUPPORTED"')
      );
    });

    it('should send ERROR on bug phase execution failure', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');

      const mockRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
      const handler = new WebSocketHandler({ rateLimiter: mockRateLimiter });

      const workflowController = {
        executePhase: vi.fn(),
        stopAgent: vi.fn(),
        resumeAgent: vi.fn(),
        executeBugPhase: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'SPAWN_ERROR', message: 'Failed to spawn bug agent' },
        }),
      };
      handler.setWorkflowController(workflowController);
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      mockWs.send.mockClear();

      const messageHandler = mockWs.on.mock.calls.find(([event]) => event === 'message')?.[1];

      await messageHandler!(JSON.stringify({
        type: 'EXECUTE_BUG_PHASE',
        payload: { bugName: 'my-bug', phase: 'fix' },
        timestamp: Date.now(),
      }));

      await vi.runAllTimersAsync();

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"ERROR"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"code":"SPAWN_ERROR"')
      );
    });
  });
});

// ============================================================
// Task 3.3: EXECUTE_DOCUMENT_REVIEW Message Handler Tests
// Requirements: 6.4 (internal-webserver-sync)
// ============================================================

describe('WebSocketHandler - EXECUTE_DOCUMENT_REVIEW Handler (Task 3.3)', () => {
  let mockWss: WebSocketServer;
  let connectionHandler: ((ws: WebSocket, req: IncomingMessage) => void) | null;

  beforeEach(() => {
    vi.useFakeTimers();
    connectionHandler = null;
    mockWss = {
      on: vi.fn((event: string, handler: (ws: WebSocket, req: IncomingMessage) => void) => {
        if (event === 'connection') {
          connectionHandler = handler;
        }
      }),
      clients: new Set<WebSocket>(),
    } as unknown as WebSocketServer;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('EXECUTE_DOCUMENT_REVIEW message handling', () => {
    it('should execute document review and send DOCUMENT_REVIEW_STARTED on success', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');

      const mockRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
      const handler = new WebSocketHandler({ rateLimiter: mockRateLimiter });

      const workflowController = {
        executePhase: vi.fn(),
        stopAgent: vi.fn(),
        resumeAgent: vi.fn(),
        executeDocumentReview: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'agent-review-123' } }),
      };
      handler.setWorkflowController(workflowController);
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      mockWs.send.mockClear();

      const messageHandler = mockWs.on.mock.calls.find(([event]) => event === 'message')?.[1];

      await messageHandler!(JSON.stringify({
        type: 'EXECUTE_DOCUMENT_REVIEW',
        payload: { specId: 'my-spec' },
        timestamp: Date.now(),
      }));

      await vi.runAllTimersAsync();

      expect(workflowController.executeDocumentReview).toHaveBeenCalledWith('my-spec');
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"DOCUMENT_REVIEW_STARTED"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"agentId":"agent-review-123"')
      );
    });

    it('should send ERROR when executeDocumentReview is not supported', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');

      const mockRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
      const handler = new WebSocketHandler({ rateLimiter: mockRateLimiter });

      const workflowController = {
        executePhase: vi.fn(),
        stopAgent: vi.fn(),
        resumeAgent: vi.fn(),
      };
      handler.setWorkflowController(workflowController);
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      mockWs.send.mockClear();

      const messageHandler = mockWs.on.mock.calls.find(([event]) => event === 'message')?.[1];

      await messageHandler!(JSON.stringify({
        type: 'EXECUTE_DOCUMENT_REVIEW',
        payload: { specId: 'my-spec' },
        timestamp: Date.now(),
      }));

      await vi.runAllTimersAsync();

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"ERROR"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"code":"NOT_SUPPORTED"')
      );
    });
  });
});

// ============================================================
// Task 3.4: Broadcast Methods Tests
// Requirements: 6.5, 6.6 (internal-webserver-sync)
// ============================================================

describe('WebSocketHandler - Broadcast Methods (Task 3.4)', () => {
  let mockWss: WebSocketServer;
  let connectionHandler: ((ws: WebSocket, req: IncomingMessage) => void) | null;

  beforeEach(() => {
    vi.useFakeTimers();
    connectionHandler = null;
    mockWss = {
      on: vi.fn((event: string, handler: (ws: WebSocket, req: IncomingMessage) => void) => {
        if (event === 'connection') {
          connectionHandler = handler;
        }
      }),
      clients: new Set<WebSocket>(),
    } as unknown as WebSocketServer;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('broadcastTaskProgress', () => {
    it('should broadcast TASK_PROGRESS to all connected clients', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const handler = new WebSocketHandler();
      handler.initialize(mockWss);

      const mockWs1 = createMockWebSocket();
      const mockWs2 = createMockWebSocket();
      connectionHandler!(mockWs1, createMockRequest('192.168.1.1'));
      connectionHandler!(mockWs2, createMockRequest('192.168.1.2'));

      mockWs1.send.mockClear();
      mockWs2.send.mockClear();

      handler.broadcastTaskProgress('spec-1', '1.1', 'completed');

      expect(mockWs1.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"TASK_PROGRESS"')
      );
      expect(mockWs1.send).toHaveBeenCalledWith(
        expect.stringContaining('"specId":"spec-1"')
      );
      expect(mockWs1.send).toHaveBeenCalledWith(
        expect.stringContaining('"taskId":"1.1"')
      );
      expect(mockWs2.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"TASK_PROGRESS"')
      );
    });
  });

  describe('broadcastSpecUpdated', () => {
    it('should broadcast SPEC_UPDATED to all connected clients', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const handler = new WebSocketHandler();
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      mockWs.send.mockClear();

      handler.broadcastSpecUpdated('spec-1', { phase: 'design', status: 'completed' });

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"SPEC_UPDATED"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"specId":"spec-1"')
      );
    });
  });
});

// ============================================================
// Task 5.1: Token Authentication Tests
// Requirements: 3.4, 3.5, 7.3, 7.4 (cloudflare-tunnel-integration)
// ============================================================

describe('WebSocketHandler - Token Authentication (Task 5.1)', () => {
  let mockWss: WebSocketServer;
  let connectionHandler: ((ws: WebSocket, req: IncomingMessage) => void) | null;

  // Mock AccessTokenService
  const mockAccessTokenService = {
    validateToken: vi.fn(),
    ensureToken: vi.fn(),
    getToken: vi.fn(),
    generateToken: vi.fn(),
    refreshToken: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    connectionHandler = null;
    mockWss = {
      on: vi.fn((event: string, handler: (ws: WebSocket, req: IncomingMessage) => void) => {
        if (event === 'connection') {
          connectionHandler = handler;
        }
      }),
      clients: new Set<WebSocket>(),
    } as unknown as WebSocketServer;
    mockAccessTokenService.validateToken.mockReset();
  });

  function createMockRequestWithToken(ip: string, token?: string): IncomingMessage {
    const url = token ? `/?token=${token}` : '/';
    return {
      socket: {
        remoteAddress: ip,
      },
      url,
      headers: {
        'x-forwarded-for': undefined,
      },
    } as unknown as IncomingMessage;
  }

  describe('token validation on connection', () => {
    it('should accept connection with valid token', async () => {
      mockAccessTokenService.validateToken.mockReturnValue(true);

      const { WebSocketHandler } = await import('./webSocketHandler');
      const handler = new WebSocketHandler({
        accessTokenService: mockAccessTokenService as any,
        requireTokenAuth: true,
        skipTokenForPrivateIp: false, // Enforce token for all IPs
      });
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      const mockReq = createMockRequestWithToken('192.168.1.100', 'valid-token');

      connectionHandler!(mockWs, mockReq);

      expect(mockAccessTokenService.validateToken).toHaveBeenCalledWith('valid-token');
      expect(mockWs.close).not.toHaveBeenCalled();
      expect(handler.getClientCount()).toBe(1);
    });

    it('should reject connection with invalid token', async () => {
      mockAccessTokenService.validateToken.mockReturnValue(false);

      const { WebSocketHandler } = await import('./webSocketHandler');
      const handler = new WebSocketHandler({
        accessTokenService: mockAccessTokenService as any,
        requireTokenAuth: true,
        skipTokenForPrivateIp: false, // Enforce token for all IPs
      });
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      const mockReq = createMockRequestWithToken('192.168.1.100', 'invalid-token');

      connectionHandler!(mockWs, mockReq);

      expect(mockAccessTokenService.validateToken).toHaveBeenCalledWith('invalid-token');
      expect(mockWs.close).toHaveBeenCalledWith(4001, 'Unauthorized: Invalid token');
      expect(handler.getClientCount()).toBe(0);
    });

    it('should reject connection without token when auth is required', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const handler = new WebSocketHandler({
        accessTokenService: mockAccessTokenService as any,
        requireTokenAuth: true,
        skipTokenForPrivateIp: false, // Enforce token for all IPs
      });
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      const mockReq = createMockRequestWithToken('192.168.1.100'); // No token

      connectionHandler!(mockWs, mockReq);

      expect(mockWs.close).toHaveBeenCalledWith(4001, 'Unauthorized: Token required');
      expect(handler.getClientCount()).toBe(0);
    });

    it('should allow connection without token when auth is not required', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const handler = new WebSocketHandler({
        requireTokenAuth: false,
      });
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      const mockReq = createMockRequestWithToken('192.168.1.100'); // No token

      connectionHandler!(mockWs, mockReq);

      expect(mockWs.close).not.toHaveBeenCalled();
      expect(handler.getClientCount()).toBe(1);
    });

    it('should skip token validation for private IPs when configured', async () => {
      mockAccessTokenService.validateToken.mockReturnValue(true);

      const { WebSocketHandler } = await import('./webSocketHandler');
      const handler = new WebSocketHandler({
        accessTokenService: mockAccessTokenService as any,
        requireTokenAuth: true,
        skipTokenForPrivateIp: true,
      });
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      const mockReq = createMockRequestWithToken('192.168.1.100'); // No token, but private IP

      connectionHandler!(mockWs, mockReq);

      expect(mockAccessTokenService.validateToken).not.toHaveBeenCalled();
      expect(mockWs.close).not.toHaveBeenCalled();
      expect(handler.getClientCount()).toBe(1);
    });

    it('should require token for non-private IPs even with skipTokenForPrivateIp', async () => {
      mockAccessTokenService.validateToken.mockReturnValue(true);

      const { WebSocketHandler } = await import('./webSocketHandler');
      const handler = new WebSocketHandler({
        accessTokenService: mockAccessTokenService as any,
        requireTokenAuth: true,
        skipTokenForPrivateIp: true,
      });
      handler.initialize(mockWss);

      // Simulate Cloudflare forwarding - CF uses x-forwarded-for header
      const mockWs = createMockWebSocket();
      const mockReq = {
        socket: { remoteAddress: '127.0.0.1' }, // Cloudflare worker connects locally
        url: '/?token=valid-token',
        headers: {
          'cf-connecting-ip': '203.0.113.50', // Real client IP from Cloudflare
          'x-forwarded-for': undefined,
        },
      } as unknown as IncomingMessage;

      connectionHandler!(mockWs, mockReq);

      // Should validate token because real IP is public
      expect(mockAccessTokenService.validateToken).toHaveBeenCalledWith('valid-token');
    });
  });
});

// ============================================================
// spec-phase-auto-update Task 7: Phase update broadcast tests
// Requirements: 5.3, 5.4
// ============================================================

describe('WebSocketHandler - Phase Update Broadcasts (spec-phase-auto-update)', () => {
  let mockWss: WebSocketServer;
  let connectionHandler: ((ws: WebSocket, req: IncomingMessage) => void) | null;

  // Helper function to create mock WebSocket
  function createMockWebSocket(): WebSocket {
    return {
      readyState: WebSocket.OPEN,
      send: vi.fn(),
      close: vi.fn(),
      on: vi.fn(),
    } as unknown as WebSocket;
  }

  // Helper function to create mock request
  function createMockRequest(ip: string): IncomingMessage {
    return {
      socket: { remoteAddress: ip },
      headers: {},
    } as unknown as IncomingMessage;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    connectionHandler = null;
    mockWss = {
      on: vi.fn((event: string, handler: (ws: WebSocket, req: IncomingMessage) => void) => {
        if (event === 'connection') {
          connectionHandler = handler;
        }
      }),
      clients: new Set<WebSocket>(),
    } as unknown as WebSocketServer;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('broadcastPhaseUpdated', () => {
    it('should broadcast phase update to all connected clients', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const handler = new WebSocketHandler();
      handler.initialize(mockWss);

      // Connect multiple clients
      const mockWs1 = createMockWebSocket();
      const mockWs2 = createMockWebSocket();
      connectionHandler!(mockWs1, createMockRequest('192.168.1.1'));
      connectionHandler!(mockWs2, createMockRequest('192.168.1.2'));

      // Clear send mocks (to ignore INIT messages)
      mockWs1.send = vi.fn();
      mockWs2.send = vi.fn();

      // Broadcast phase update
      handler.broadcastSpecUpdated('test-feature', { phase: 'inspection-complete' });

      // Both clients should receive the broadcast
      expect(mockWs1.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"SPEC_UPDATED"')
      );
      expect(mockWs1.send).toHaveBeenCalledWith(
        expect.stringContaining('"phase":"inspection-complete"')
      );
      expect(mockWs2.send).toHaveBeenCalledWith(
        expect.stringContaining('"specId":"test-feature"')
      );
    });

    it('should broadcast deploy-complete phase update', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const handler = new WebSocketHandler();
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      mockWs.send = vi.fn();

      handler.broadcastSpecUpdated('my-spec', { phase: 'deploy-complete' });

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"phase":"deploy-complete"')
      );
    });
  });
});

// ============================================================
// remote-ui-react-migration Task 6: SAVE_FILE/GET_SPEC_DETAIL Handler Tests
// Requirements: 10.2, 2.5, 7.4
// ============================================================

describe('WebSocketHandler - SAVE_FILE Handler (remote-ui-react-migration Task 6.1-6.2)', () => {
  let mockWss: WebSocketServer;
  let connectionHandler: ((ws: WebSocket, req: IncomingMessage) => void) | null;

  beforeEach(() => {
    vi.useFakeTimers();
    connectionHandler = null;
    mockWss = {
      on: vi.fn((event: string, handler: (ws: WebSocket, req: IncomingMessage) => void) => {
        if (event === 'connection') {
          connectionHandler = handler;
        }
      }),
      clients: new Set<WebSocket>(),
    } as unknown as WebSocketServer;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('SAVE_FILE message handling', () => {
    it('should save file and send FILE_SAVED on success', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');

      const mockRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
      const handler = new WebSocketHandler({ rateLimiter: mockRateLimiter });

      const mockFileService = {
        writeFile: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
      };
      handler.setFileService(mockFileService as any);
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      mockWs.send.mockClear();

      const messageHandler = mockWs.on.mock.calls.find(([event]) => event === 'message')?.[1];

      await messageHandler!(JSON.stringify({
        type: 'SAVE_FILE',
        payload: { filePath: '/test/project/file.md', content: 'test content' },
        requestId: 'req-save-1',
        timestamp: Date.now(),
      }));

      await vi.runAllTimersAsync();

      expect(mockFileService.writeFile).toHaveBeenCalledWith('/test/project/file.md', 'test content');
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"FILE_SAVED"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"requestId":"req-save-1"')
      );
    });

    it('should send ERROR on file save failure', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');

      const mockRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
      const handler = new WebSocketHandler({ rateLimiter: mockRateLimiter });

      const mockFileService = {
        writeFile: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'WRITE_ERROR', path: '/test/file.md', message: 'Permission denied' },
        }),
      };
      handler.setFileService(mockFileService as any);
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      mockWs.send.mockClear();

      const messageHandler = mockWs.on.mock.calls.find(([event]) => event === 'message')?.[1];

      await messageHandler!(JSON.stringify({
        type: 'SAVE_FILE',
        payload: { filePath: '/test/file.md', content: 'content' },
        requestId: 'req-save-2',
        timestamp: Date.now(),
      }));

      await vi.runAllTimersAsync();

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"ERROR"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"code":"WRITE_ERROR"')
      );
    });

    it('should send ERROR when fileService is not configured', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');

      const mockRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
      const handler = new WebSocketHandler({ rateLimiter: mockRateLimiter });
      // No fileService set
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      mockWs.send.mockClear();

      const messageHandler = mockWs.on.mock.calls.find(([event]) => event === 'message')?.[1];

      await messageHandler!(JSON.stringify({
        type: 'SAVE_FILE',
        payload: { filePath: '/test/file.md', content: 'content' },
        timestamp: Date.now(),
      }));

      await vi.runAllTimersAsync();

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"ERROR"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"code":"NOT_CONFIGURED"')
      );
    });

    it('should send ERROR when filePath or content is missing', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');

      const mockRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
      const handler = new WebSocketHandler({ rateLimiter: mockRateLimiter });

      const mockFileService = {
        writeFile: vi.fn(),
      };
      handler.setFileService(mockFileService as any);
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      mockWs.send.mockClear();

      const messageHandler = mockWs.on.mock.calls.find(([event]) => event === 'message')?.[1];

      // Missing content
      await messageHandler!(JSON.stringify({
        type: 'SAVE_FILE',
        payload: { filePath: '/test/file.md' },
        timestamp: Date.now(),
      }));

      await vi.runAllTimersAsync();

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"ERROR"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"code":"INVALID_PAYLOAD"')
      );
    });
  });
});

describe('WebSocketHandler - GET_SPEC_DETAIL Handler (remote-ui-react-migration Task 6.1, 6.3)', () => {
  let mockWss: WebSocketServer;
  let connectionHandler: ((ws: WebSocket, req: IncomingMessage) => void) | null;

  beforeEach(() => {
    vi.useFakeTimers();
    connectionHandler = null;
    mockWss = {
      on: vi.fn((event: string, handler: (ws: WebSocket, req: IncomingMessage) => void) => {
        if (event === 'connection') {
          connectionHandler = handler;
        }
      }),
      clients: new Set<WebSocket>(),
    } as unknown as WebSocketServer;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('GET_SPEC_DETAIL message handling', () => {
    it('should return spec detail when specDetailProvider is configured', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');

      const mockRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
      const handler = new WebSocketHandler({ rateLimiter: mockRateLimiter });

      const mockSpecDetail = {
        name: 'test-feature',
        path: '/project/.kiro/specs/test-feature',
        phase: 'design-generated',
        specJson: { feature_name: 'test-feature', phase: 'design-generated' },
        artifacts: { requirements: { exists: true }, design: { exists: true } },
      };

      const mockSpecDetailProvider = {
        getSpecDetail: vi.fn().mockResolvedValue({ ok: true, value: mockSpecDetail }),
      };
      handler.setSpecDetailProvider(mockSpecDetailProvider as any);
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      mockWs.send.mockClear();

      const messageHandler = mockWs.on.mock.calls.find(([event]) => event === 'message')?.[1];

      await messageHandler!(JSON.stringify({
        type: 'GET_SPEC_DETAIL',
        payload: { specId: 'test-feature' },
        requestId: 'req-detail-1',
        timestamp: Date.now(),
      }));

      await vi.runAllTimersAsync();

      expect(mockSpecDetailProvider.getSpecDetail).toHaveBeenCalledWith('test-feature');
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"SPEC_DETAIL"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"specId":"test-feature"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"requestId":"req-detail-1"')
      );
    });

    it('should send ERROR when spec is not found', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');

      const mockRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
      const handler = new WebSocketHandler({ rateLimiter: mockRateLimiter });

      const mockSpecDetailProvider = {
        getSpecDetail: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'NOT_FOUND', message: 'Spec not found' },
        }),
      };
      handler.setSpecDetailProvider(mockSpecDetailProvider as any);
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      mockWs.send.mockClear();

      const messageHandler = mockWs.on.mock.calls.find(([event]) => event === 'message')?.[1];

      await messageHandler!(JSON.stringify({
        type: 'GET_SPEC_DETAIL',
        payload: { specId: 'non-existent' },
        requestId: 'req-detail-2',
        timestamp: Date.now(),
      }));

      await vi.runAllTimersAsync();

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"ERROR"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"code":"NOT_FOUND"')
      );
    });

    it('should send ERROR when specDetailProvider is not configured', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');

      const mockRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
      const handler = new WebSocketHandler({ rateLimiter: mockRateLimiter });
      // No specDetailProvider set
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      mockWs.send.mockClear();

      const messageHandler = mockWs.on.mock.calls.find(([event]) => event === 'message')?.[1];

      await messageHandler!(JSON.stringify({
        type: 'GET_SPEC_DETAIL',
        payload: { specId: 'test-feature' },
        timestamp: Date.now(),
      }));

      await vi.runAllTimersAsync();

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"ERROR"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"code":"NOT_CONFIGURED"')
      );
    });

    it('should send ERROR when specId is missing', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { RateLimiter } = await import('../utils/rateLimiter');

      const mockRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
      const handler = new WebSocketHandler({ rateLimiter: mockRateLimiter });

      const mockSpecDetailProvider = {
        getSpecDetail: vi.fn(),
      };
      handler.setSpecDetailProvider(mockSpecDetailProvider as any);
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      mockWs.send.mockClear();

      const messageHandler = mockWs.on.mock.calls.find(([event]) => event === 'message')?.[1];

      await messageHandler!(JSON.stringify({
        type: 'GET_SPEC_DETAIL',
        payload: {},
        timestamp: Date.now(),
      }));

      await vi.runAllTimersAsync();

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"ERROR"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"code":"INVALID_PAYLOAD"')
      );
    });
  });
});

// ============================================================
// agent-ask-execution Task 6: ASK_PROJECT/ASK_SPEC Message Handler Tests
// Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
// ============================================================

describe('WebSocketHandler - ASK_PROJECT/ASK_SPEC Handlers (agent-ask-execution)', () => {
  let mockWss: WebSocketServer;
  let connectionHandler: ((ws: WebSocket, req: IncomingMessage) => void) | null;

  // Helper function to create mock WebSocket
  function createMockWebSocket(): WebSocket {
    return {
      readyState: WebSocket.OPEN,
      send: vi.fn(),
      close: vi.fn(),
      on: vi.fn(),
    } as unknown as WebSocket;
  }

  // Helper function to create mock request
  function createMockRequest(ip: string): IncomingMessage {
    return {
      socket: { remoteAddress: ip },
      headers: {},
    } as unknown as IncomingMessage;
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    connectionHandler = null;
    mockWss = {
      on: vi.fn((event: string, handler: (ws: WebSocket, req: IncomingMessage) => void) => {
        if (event === 'connection') {
          connectionHandler = handler;
        }
      }),
      clients: new Set<WebSocket>(),
    } as unknown as WebSocketServer;

    vi.doMock('./accessTokenService', () => ({
      accessTokenService: {
        validateToken: vi.fn(() => true),
      },
    }));
  });

  describe('ASK_PROJECT message handling (Requirement 6.1, 6.3)', () => {
    it('should send error when projectPath or prompt is missing', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const handler = new WebSocketHandler();
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      const mockMessageHandler = vi.fn();
      mockWs.on = vi.fn((event: string, handlerFn: (data: string) => void) => {
        if (event === 'message') {
          mockMessageHandler.mockImplementation(handlerFn);
        }
      });

      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      // Send ASK_PROJECT without projectPath
      const message = JSON.stringify({
        type: 'ASK_PROJECT',
        payload: { prompt: 'test' },
        requestId: 'req-1',
        timestamp: Date.now(),
      });
      mockMessageHandler(message);

      // Wait for async handling
      await new Promise(resolve => setTimeout(resolve, 50));

      // Without workflowController, should send NO_CONTROLLER error
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"ERROR"')
      );
    });
  });

  describe('ASK_SPEC message handling (Requirement 6.2, 6.4)', () => {
    it('should send error when specId or prompt is missing', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const handler = new WebSocketHandler();
      handler.initialize(mockWss);

      const mockWs = createMockWebSocket();
      const mockMessageHandler = vi.fn();
      mockWs.on = vi.fn((event: string, handlerFn: (data: string) => void) => {
        if (event === 'message') {
          mockMessageHandler.mockImplementation(handlerFn);
        }
      });

      connectionHandler!(mockWs, createMockRequest('192.168.1.1'));

      // Send ASK_SPEC without specId
      const message = JSON.stringify({
        type: 'ASK_SPEC',
        payload: { prompt: 'test prompt' },
        requestId: 'req-1',
        timestamp: Date.now(),
      });
      mockMessageHandler(message);

      await new Promise(resolve => setTimeout(resolve, 50));

      // Without workflowController, should send NO_CONTROLLER error
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"ERROR"')
      );
    });
  });
});
