/**
 * WebSocket Handler - GitHub Issue/PR Integration Tests
 *
 * github-issue-integration: Task 12.1
 * Requirements: 11.5
 *
 * Tests for GET_ISSUES, GET_ISSUE_DETAIL, GET_PULL_REQUESTS, CREATE_ISSUE,
 * GET_GITHUB_CONNECTION_STATUS message types in webSocketHandler.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';

// =============================================================================
// Test Helpers
// =============================================================================

function createMockWebSocket(): WebSocket {
  const ws = {
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
    readyState: WebSocket.OPEN,
    OPEN: WebSocket.OPEN,
  } as unknown as WebSocket;
  return ws;
}

function createMockRequest(ip: string): IncomingMessage {
  return {
    socket: {
      remoteAddress: ip,
    },
    headers: {},
  } as unknown as IncomingMessage;
}

function createMockWss() {
  let connectionHandler: ((ws: WebSocket, req: IncomingMessage) => void) | null = null;
  const mockWss = {
    on: vi.fn((event: string, handler: (ws: WebSocket, req: IncomingMessage) => void) => {
      if (event === 'connection') {
        connectionHandler = handler;
      }
    }),
    clients: new Set<WebSocket>(),
  } as unknown as WebSocketServer;
  return { mockWss, getConnectionHandler: () => connectionHandler };
}

/**
 * Connects a client and sends a message, then returns the response
 */
async function sendMessageAndGetResponse(
  handler: InstanceType<typeof import('./webSocketHandler').WebSocketHandler>,
  mockWss: WebSocketServer,
  getConnectionHandler: () => ((ws: WebSocket, req: IncomingMessage) => void) | null,
  messageType: string,
  payload?: Record<string, unknown>,
  requestId?: string,
) {
  handler.initialize(mockWss);

  const mockWs = createMockWebSocket();
  const mockReq = createMockRequest('127.0.0.1');

  const connHandler = getConnectionHandler();
  if (!connHandler) throw new Error('No connection handler');
  connHandler(mockWs, mockReq);

  // Find the message handler
  const onCall = (mockWs.on as ReturnType<typeof vi.fn>).mock.calls.find(
    (call: unknown[]) => call[0] === 'message'
  );
  if (!onCall) throw new Error('No message handler');
  const messageHandler = onCall[1] as (data: Buffer | string) => void;

  // Send message
  const msg = JSON.stringify({
    type: messageType,
    payload,
    requestId: requestId || 'test-req-1',
    timestamp: Date.now(),
  });

  messageHandler(msg);

  // Wait for async handling - find the response matching our requestId
  const rid = requestId || 'test-req-1';
  let matchedResponse: Record<string, unknown> | null = null;

  await vi.waitFor(() => {
    const calls = (mockWs.send as ReturnType<typeof vi.fn>).mock.calls;
    for (const call of calls) {
      const parsed = JSON.parse(call[0] as string);
      if (parsed.requestId === rid) {
        matchedResponse = parsed;
      }
    }
    expect(matchedResponse).not.toBeNull();
  });

  return matchedResponse!;
}

// =============================================================================
// Tests
// =============================================================================

describe('WebSocketHandler - GitHub Issue Integration (Task 12.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET_ISSUES message handler', () => {
    it('should route GET_ISSUES to handleGetIssues and return ISSUES_LIST response', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { mockWss, getConnectionHandler } = createMockWss();
      const handler = new WebSocketHandler();

      const mockIssues = [
        { number: 1, title: 'Test Issue', state: 'open', labels: [], assignees: [] },
        { number: 2, title: 'Another Issue', state: 'open', labels: [], assignees: [] },
      ];

      handler.setIssueProvider({
        getIssues: vi.fn().mockResolvedValue({ ok: true, value: mockIssues }),
        getIssueDetail: vi.fn(),
        getPullRequests: vi.fn(),
        createIssue: vi.fn(),
        getConnectionStatus: vi.fn(),
      });

      const response = await sendMessageAndGetResponse(
        handler, mockWss, getConnectionHandler, 'GET_ISSUES', {}, 'req-issues-1'
      );

      expect(response.type).toBe('ISSUES_LIST');
      expect(response.requestId).toBe('req-issues-1');
      expect(response.payload).toEqual(mockIssues);
    });

    it('should return ERROR when issueProvider is not set', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { mockWss, getConnectionHandler } = createMockWss();
      const handler = new WebSocketHandler();

      const response = await sendMessageAndGetResponse(
        handler, mockWss, getConnectionHandler, 'GET_ISSUES', {}, 'req-issues-2'
      );

      expect(response.type).toBe('ERROR');
      expect(response.payload.code).toBe('NOT_CONFIGURED');
    });
  });

  describe('GET_ISSUE_DETAIL message handler', () => {
    it('should route GET_ISSUE_DETAIL and return ISSUE_DETAIL response', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { mockWss, getConnectionHandler } = createMockWss();
      const handler = new WebSocketHandler();

      const mockIssueDetail = {
        issue: { number: 42, title: 'Test', state: 'open', labels: [] },
        comments: [{ id: 1, body: 'test comment', user: { login: 'user' } }],
      };

      handler.setIssueProvider({
        getIssues: vi.fn(),
        getIssueDetail: vi.fn().mockResolvedValue({ ok: true, value: mockIssueDetail }),
        getPullRequests: vi.fn(),
        createIssue: vi.fn(),
        getConnectionStatus: vi.fn(),
      });

      const response = await sendMessageAndGetResponse(
        handler, mockWss, getConnectionHandler, 'GET_ISSUE_DETAIL',
        { issueNumber: 42 }, 'req-detail-1'
      );

      expect(response.type).toBe('ISSUE_DETAIL');
      expect(response.requestId).toBe('req-detail-1');
      expect(response.payload.issue.number).toBe(42);
    });

    it('should return ERROR when issueNumber is missing', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { mockWss, getConnectionHandler } = createMockWss();
      const handler = new WebSocketHandler();

      handler.setIssueProvider({
        getIssues: vi.fn(),
        getIssueDetail: vi.fn(),
        getPullRequests: vi.fn(),
        createIssue: vi.fn(),
        getConnectionStatus: vi.fn(),
      });

      const response = await sendMessageAndGetResponse(
        handler, mockWss, getConnectionHandler, 'GET_ISSUE_DETAIL',
        {}, 'req-detail-2'
      );

      expect(response.type).toBe('ERROR');
      expect(response.payload.code).toBe('INVALID_PAYLOAD');
    });
  });

  describe('GET_PULL_REQUESTS message handler', () => {
    it('should route GET_PULL_REQUESTS and return PULL_REQUESTS_LIST response', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { mockWss, getConnectionHandler } = createMockWss();
      const handler = new WebSocketHandler();

      const mockPRs = [
        { number: 10, title: 'PR 1', state: 'open', head: { ref: 'feature' }, base: { ref: 'main' } },
      ];

      handler.setIssueProvider({
        getIssues: vi.fn(),
        getIssueDetail: vi.fn(),
        getPullRequests: vi.fn().mockResolvedValue({ ok: true, value: mockPRs }),
        createIssue: vi.fn(),
        getConnectionStatus: vi.fn(),
      });

      const response = await sendMessageAndGetResponse(
        handler, mockWss, getConnectionHandler, 'GET_PULL_REQUESTS', {}, 'req-prs-1'
      );

      expect(response.type).toBe('PULL_REQUESTS_LIST');
      expect(response.requestId).toBe('req-prs-1');
      expect(response.payload).toEqual(mockPRs);
    });
  });

  describe('CREATE_ISSUE message handler', () => {
    it('should route CREATE_ISSUE and return ISSUE_CREATED response', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { mockWss, getConnectionHandler } = createMockWss();
      const handler = new WebSocketHandler();

      const createdIssue = { number: 99, title: 'New Issue', state: 'open', labels: [{ name: 'status:triage' }] };

      handler.setIssueProvider({
        getIssues: vi.fn(),
        getIssueDetail: vi.fn(),
        getPullRequests: vi.fn(),
        createIssue: vi.fn().mockResolvedValue({ ok: true, value: createdIssue }),
        getConnectionStatus: vi.fn(),
      });

      const response = await sendMessageAndGetResponse(
        handler, mockWss, getConnectionHandler, 'CREATE_ISSUE',
        { title: 'New Issue', body: 'Description', labels: [], assignees: [] },
        'req-create-1'
      );

      expect(response.type).toBe('ISSUE_CREATED');
      expect(response.requestId).toBe('req-create-1');
      expect(response.payload.number).toBe(99);
    });

    it('should return ERROR when title is missing', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { mockWss, getConnectionHandler } = createMockWss();
      const handler = new WebSocketHandler();

      handler.setIssueProvider({
        getIssues: vi.fn(),
        getIssueDetail: vi.fn(),
        getPullRequests: vi.fn(),
        createIssue: vi.fn(),
        getConnectionStatus: vi.fn(),
      });

      const response = await sendMessageAndGetResponse(
        handler, mockWss, getConnectionHandler, 'CREATE_ISSUE',
        { body: 'No title' },
        'req-create-2'
      );

      expect(response.type).toBe('ERROR');
      expect(response.payload.code).toBe('INVALID_PAYLOAD');
    });

    it('should return ERROR when createIssue fails', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { mockWss, getConnectionHandler } = createMockWss();
      const handler = new WebSocketHandler();

      handler.setIssueProvider({
        getIssues: vi.fn(),
        getIssueDetail: vi.fn(),
        getPullRequests: vi.fn(),
        createIssue: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'AUTH_FAILED', message: 'Invalid token' },
        }),
        getConnectionStatus: vi.fn(),
      });

      const response = await sendMessageAndGetResponse(
        handler, mockWss, getConnectionHandler, 'CREATE_ISSUE',
        { title: 'New Issue', body: 'Description' },
        'req-create-3'
      );

      expect(response.type).toBe('ERROR');
      expect(response.payload.code).toBe('AUTH_FAILED');
    });
  });

  describe('GET_GITHUB_CONNECTION_STATUS message handler', () => {
    it('should route GET_GITHUB_CONNECTION_STATUS and return GITHUB_CONNECTION_STATUS response', async () => {
      const { WebSocketHandler } = await import('./webSocketHandler');
      const { mockWss, getConnectionHandler } = createMockWss();
      const handler = new WebSocketHandler();

      const mockStatus = {
        configured: true,
        connected: true,
        user: { login: 'testuser', avatar_url: 'https://example.com/avatar.png' },
        repoInfo: { owner: 'org', repo: 'project', baseUrl: 'https://api.github.com' },
        error: null,
      };

      handler.setIssueProvider({
        getIssues: vi.fn(),
        getIssueDetail: vi.fn(),
        getPullRequests: vi.fn(),
        createIssue: vi.fn(),
        getConnectionStatus: vi.fn().mockResolvedValue({ ok: true, value: mockStatus }),
      });

      const response = await sendMessageAndGetResponse(
        handler, mockWss, getConnectionHandler, 'GET_GITHUB_CONNECTION_STATUS',
        {}, 'req-status-1'
      );

      expect(response.type).toBe('GITHUB_CONNECTION_STATUS');
      expect(response.requestId).toBe('req-status-1');
      expect(response.payload.connected).toBe(true);
      expect(response.payload.user.login).toBe('testuser');
    });
  });
});
