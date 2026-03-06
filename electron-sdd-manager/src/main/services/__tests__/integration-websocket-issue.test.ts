/**
 * Integration Test: WebSocket Handler Issue Operations
 * github-issue-integration: Task 15.5
 * Requirements: 11.5
 * Integration Point: Remote UI WebSocket route
 *
 * Tests the end-to-end flow of:
 * - WebSocket handler (GET_ISSUES, GET_ISSUE_DETAIL, CREATE_ISSUE, etc.)
 *   correctly delegating to IssueProvider
 * - Error responses propagated correctly
 * - Missing issueProvider returns NOT_CONFIGURED error
 *
 * Mock boundaries:
 * - WebSocket (mocked)
 * - IssueProvider (mocked)
 * - WebSocketServer (mocked)
 *
 * Strategy:
 * The WebSocketHandler processes messages via its private handleMessage method
 * which is called on WebSocket 'message' events. We set up the handler with a
 * mock WebSocketServer, simulate client connections, and verify the response
 * messages sent back through the WebSocket.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import { WebSocketHandler, type IssueProvider } from '../webSocketHandler';

// Mock dependencies used by WebSocketHandler
vi.mock('../logBuffer', () => ({
  LogBuffer: class MockLogBuffer {
    addEntry = vi.fn();
    getEntries = vi.fn().mockReturnValue([]);
    getEntriesSince = vi.fn().mockReturnValue([]);
    clear = vi.fn();
  },
  defaultLogBuffer: {
    addEntry: vi.fn(),
    getEntries: vi.fn().mockReturnValue([]),
    getEntriesSince: vi.fn().mockReturnValue([]),
    clear: vi.fn(),
  },
}));

vi.mock('../../utils/rateLimiter', () => ({
  RateLimiter: class MockRateLimiter {
    consume = vi.fn().mockResolvedValue(true);
  },
  defaultRateLimiter: {
    consume: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../../utils/ipValidator', () => ({
  isPrivateIP: vi.fn().mockReturnValue(true),
}));

vi.mock('../eventLogService', () => ({
  getDefaultEventLogService: vi.fn().mockReturnValue(null),
}));

vi.mock('../GitService', () => ({
  GitService: class MockGitService {},
}));

vi.mock('../GitFileWatcherService', () => ({
  GitFileWatcherService: class MockGitFileWatcherService {},
}));

vi.mock('../fileService', () => ({
  FileService: class MockFileService {},
}));

vi.mock('../worktreeService', () => ({
  WorktreeService: class MockWorktreeService {},
}));

vi.mock('../convertWorktreeService', () => ({
  ConvertWorktreeService: class MockConvertWorktreeService {},
  getConvertErrorMessage: vi.fn(),
}));

vi.mock('../../trpc/helpers/projectFileUtils', () => ({
  listProjectFilesCore: vi.fn(),
  readProjectFileCore: vi.fn(),
  writeProjectFileCore: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

/**
 * Creates a mock WebSocket client that captures sent messages.
 */
function createMockClient() {
  const sentMessages: any[] = [];
  const ws = new EventEmitter();
  (ws as any).send = vi.fn((data: string) => {
    sentMessages.push(JSON.parse(data));
  });
  (ws as any).readyState = 1; // WebSocket.OPEN
  (ws as any).close = vi.fn();
  return { ws, sentMessages };
}

/**
 * Creates a mock WebSocketServer.
 */
function createMockWSS() {
  const wss = new EventEmitter();
  return wss;
}

/**
 * Creates a mock HTTP IncomingMessage for connection handling.
 */
function createMockRequest() {
  return {
    socket: {
      remoteAddress: '127.0.0.1',
    },
    headers: {},
    url: '/',
  };
}

describe('Integration: WebSocket Handler Issue Operations', () => {
  let handler: WebSocketHandler;
  let mockIssueProvider: IssueProvider;

  beforeEach(() => {
    handler = new WebSocketHandler({
      requireTokenAuth: false,
    });

    mockIssueProvider = {
      getIssues: vi.fn().mockResolvedValue({
        ok: true,
        value: [
          { number: 1, title: 'Bug fix', state: 'open' },
          { number: 2, title: 'Feature', state: 'open' },
        ],
      }),
      getIssueDetail: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          number: 42,
          title: 'Test issue',
          body: 'Description',
          comments: [],
        },
      }),
      getPullRequests: vi.fn().mockResolvedValue({
        ok: true,
        value: [
          { number: 10, title: 'PR 1', state: 'open' },
        ],
      }),
      createIssue: vi.fn().mockResolvedValue({
        ok: true,
        value: { number: 50, title: 'New issue', state: 'open' },
      }),
      getConnectionStatus: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          configured: true,
          connected: true,
          user: { login: 'test-user' },
        },
      }),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Helper: Connect a mock client to the handler and send a message.
   * Returns the messages sent back to the client.
   */
  async function sendMessage(
    handlerInstance: WebSocketHandler,
    messageType: string,
    payload?: Record<string, unknown>,
    requestId?: string,
  ): Promise<any[]> {
    const wss = createMockWSS();
    handlerInstance.initialize(wss as any);

    const { ws, sentMessages } = createMockClient();
    const req = createMockRequest();

    // Simulate connection
    wss.emit('connection', ws, req);

    // Wait for INIT message to be processed
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Clear INIT messages
    sentMessages.length = 0;

    // Send the test message
    const message = JSON.stringify({
      type: messageType,
      payload,
      requestId: requestId || 'test-req-1',
      timestamp: Date.now(),
    });

    ws.emit('message', Buffer.from(message));

    // Wait for async handler to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    return sentMessages;
  }

  // ==========================================================================
  // GET_ISSUES
  // ==========================================================================

  describe('GET_ISSUES handler', () => {
    it('should delegate to IssueProvider.getIssues and return ISSUES_LIST', async () => {
      handler.setIssueProvider(mockIssueProvider);

      const responses = await sendMessage(handler, 'GET_ISSUES', { filters: { state: 'open' } });

      // Verify: IssueProvider called
      expect(mockIssueProvider.getIssues).toHaveBeenCalledWith({ state: 'open' });

      // Verify: Response sent with correct type
      const issuesResponse = responses.find((r) => r.type === 'ISSUES_LIST');
      expect(issuesResponse).toBeDefined();
      expect(issuesResponse!.requestId).toBe('test-req-1');
    });

    it('should return ERROR when IssueProvider is not configured', async () => {
      // Don't set issue provider
      const responses = await sendMessage(handler, 'GET_ISSUES');

      const errorResponse = responses.find((r) => r.type === 'ERROR');
      expect(errorResponse).toBeDefined();
      expect(errorResponse!.payload.code).toBe('NOT_CONFIGURED');
    });

    it('should return ERROR when IssueProvider returns error', async () => {
      (mockIssueProvider.getIssues as any).mockResolvedValue({
        ok: false,
        error: { type: 'AUTH_FAILED', message: 'Bad credentials' },
      });
      handler.setIssueProvider(mockIssueProvider);

      const responses = await sendMessage(handler, 'GET_ISSUES');

      const errorResponse = responses.find((r) => r.type === 'ERROR');
      expect(errorResponse).toBeDefined();
      expect(errorResponse!.payload.code).toBe('AUTH_FAILED');
    });
  });

  // ==========================================================================
  // GET_ISSUE_DETAIL
  // ==========================================================================

  describe('GET_ISSUE_DETAIL handler', () => {
    it('should delegate to IssueProvider.getIssueDetail and return ISSUE_DETAIL', async () => {
      handler.setIssueProvider(mockIssueProvider);

      const responses = await sendMessage(handler, 'GET_ISSUE_DETAIL', { issueNumber: 42 });

      expect(mockIssueProvider.getIssueDetail).toHaveBeenCalledWith(42);

      const detailResponse = responses.find((r) => r.type === 'ISSUE_DETAIL');
      expect(detailResponse).toBeDefined();
    });

    it('should return ERROR when issueNumber is missing', async () => {
      handler.setIssueProvider(mockIssueProvider);

      const responses = await sendMessage(handler, 'GET_ISSUE_DETAIL', {});

      const errorResponse = responses.find((r) => r.type === 'ERROR');
      expect(errorResponse).toBeDefined();
      expect(errorResponse!.payload.code).toBe('INVALID_PAYLOAD');
    });

    it('should return ERROR when IssueProvider is not configured', async () => {
      const responses = await sendMessage(handler, 'GET_ISSUE_DETAIL', { issueNumber: 42 });

      const errorResponse = responses.find((r) => r.type === 'ERROR');
      expect(errorResponse).toBeDefined();
      expect(errorResponse!.payload.code).toBe('NOT_CONFIGURED');
    });
  });

  // ==========================================================================
  // GET_PULL_REQUESTS
  // ==========================================================================

  describe('GET_PULL_REQUESTS handler', () => {
    it('should delegate to IssueProvider.getPullRequests and return PULL_REQUESTS_LIST', async () => {
      handler.setIssueProvider(mockIssueProvider);

      const responses = await sendMessage(handler, 'GET_PULL_REQUESTS', { filters: { state: 'open' } });

      expect(mockIssueProvider.getPullRequests).toHaveBeenCalledWith({ state: 'open' });

      const prResponse = responses.find((r) => r.type === 'PULL_REQUESTS_LIST');
      expect(prResponse).toBeDefined();
    });

    it('should return ERROR when IssueProvider is not configured', async () => {
      const responses = await sendMessage(handler, 'GET_PULL_REQUESTS');

      const errorResponse = responses.find((r) => r.type === 'ERROR');
      expect(errorResponse).toBeDefined();
      expect(errorResponse!.payload.code).toBe('NOT_CONFIGURED');
    });
  });

  // ==========================================================================
  // CREATE_ISSUE
  // ==========================================================================

  describe('CREATE_ISSUE handler', () => {
    it('should delegate to IssueProvider.createIssue and return ISSUE_CREATED', async () => {
      handler.setIssueProvider(mockIssueProvider);

      const responses = await sendMessage(handler, 'CREATE_ISSUE', {
        title: 'New bug report',
        body: 'Description of the bug',
        labels: ['bug'],
        assignees: ['developer'],
      });

      expect(mockIssueProvider.createIssue).toHaveBeenCalledWith({
        title: 'New bug report',
        body: 'Description of the bug',
        labels: ['bug'],
        assignees: ['developer'],
      });

      const createResponse = responses.find((r) => r.type === 'ISSUE_CREATED');
      expect(createResponse).toBeDefined();
    });

    it('should return ERROR when title is missing', async () => {
      handler.setIssueProvider(mockIssueProvider);

      const responses = await sendMessage(handler, 'CREATE_ISSUE', {
        body: 'No title provided',
      });

      const errorResponse = responses.find((r) => r.type === 'ERROR');
      expect(errorResponse).toBeDefined();
      expect(errorResponse!.payload.code).toBe('INVALID_PAYLOAD');
    });

    it('should return ERROR when IssueProvider is not configured', async () => {
      const responses = await sendMessage(handler, 'CREATE_ISSUE', {
        title: 'Test',
        body: 'Body',
      });

      const errorResponse = responses.find((r) => r.type === 'ERROR');
      expect(errorResponse).toBeDefined();
      expect(errorResponse!.payload.code).toBe('NOT_CONFIGURED');
    });

    it('should propagate API error from IssueProvider', async () => {
      (mockIssueProvider.createIssue as any).mockResolvedValue({
        ok: false,
        error: { type: 'VALIDATION_ERROR', message: 'Title too long' },
      });
      handler.setIssueProvider(mockIssueProvider);

      const responses = await sendMessage(handler, 'CREATE_ISSUE', {
        title: 'Test issue',
        body: 'Body',
      });

      const errorResponse = responses.find((r) => r.type === 'ERROR');
      expect(errorResponse).toBeDefined();
      expect(errorResponse!.payload.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==========================================================================
  // GET_GITHUB_CONNECTION_STATUS
  // ==========================================================================

  describe('GET_GITHUB_CONNECTION_STATUS handler', () => {
    it('should delegate to IssueProvider.getConnectionStatus and return GITHUB_CONNECTION_STATUS', async () => {
      handler.setIssueProvider(mockIssueProvider);

      const responses = await sendMessage(handler, 'GET_GITHUB_CONNECTION_STATUS');

      expect(mockIssueProvider.getConnectionStatus).toHaveBeenCalled();

      const statusResponse = responses.find((r) => r.type === 'GITHUB_CONNECTION_STATUS');
      expect(statusResponse).toBeDefined();
    });

    it('should return ERROR when IssueProvider is not configured', async () => {
      const responses = await sendMessage(handler, 'GET_GITHUB_CONNECTION_STATUS');

      const errorResponse = responses.find((r) => r.type === 'ERROR');
      expect(errorResponse).toBeDefined();
      expect(errorResponse!.payload.code).toBe('NOT_CONFIGURED');
    });

    it('should propagate error from IssueProvider', async () => {
      (mockIssueProvider.getConnectionStatus as any).mockResolvedValue({
        ok: false,
        error: { type: 'NETWORK_ERROR', message: 'Cannot reach GitHub' },
      });
      handler.setIssueProvider(mockIssueProvider);

      const responses = await sendMessage(handler, 'GET_GITHUB_CONNECTION_STATUS');

      const errorResponse = responses.find((r) => r.type === 'ERROR');
      expect(errorResponse).toBeDefined();
      expect(errorResponse!.payload.code).toBe('NETWORK_ERROR');
    });
  });

  // ==========================================================================
  // Full WebSocket Issue Lifecycle
  // ==========================================================================

  describe('Full WebSocket issue lifecycle', () => {
    it('should support get issues -> get detail -> create issue flow', async () => {
      handler.setIssueProvider(mockIssueProvider);

      // Step 1: Get issues list
      const listResponses = await sendMessage(handler, 'GET_ISSUES', {}, 'req-1');
      expect(listResponses.find((r) => r.type === 'ISSUES_LIST')).toBeDefined();

      // Step 2: Get issue detail (re-create handler for new connection)
      const handler2 = new WebSocketHandler({ requireTokenAuth: false });
      handler2.setIssueProvider(mockIssueProvider);
      const detailResponses = await sendMessage(handler2, 'GET_ISSUE_DETAIL', { issueNumber: 42 }, 'req-2');
      expect(detailResponses.find((r) => r.type === 'ISSUE_DETAIL')).toBeDefined();

      // Step 3: Create issue
      const handler3 = new WebSocketHandler({ requireTokenAuth: false });
      handler3.setIssueProvider(mockIssueProvider);
      const createResponses = await sendMessage(handler3, 'CREATE_ISSUE', {
        title: 'New issue from Remote UI',
        body: 'Created via WebSocket',
      }, 'req-3');
      expect(createResponses.find((r) => r.type === 'ISSUE_CREATED')).toBeDefined();
    });
  });
});
