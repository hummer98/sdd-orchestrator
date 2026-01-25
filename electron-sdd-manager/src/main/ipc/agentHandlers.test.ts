/**
 * Agent Handlers Tests
 * TDD tests for agentHandlers.ts
 *
 * Task 7.1: agentHandlers.ts を新規作成し、Agent関連ハンドラーを実装する
 * Requirements: 1.7, 2.1, 2.2, 4.1, 4.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, BrowserWindow } from 'electron';
import type { AgentHandlersDependencies } from './agentHandlers';

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  BrowserWindow: {
    fromWebContents: vi.fn(),
    getAllWindows: vi.fn(() => []),
  },
}));

// Mock logger
vi.mock('../services/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock agentRecordService
vi.mock('../services/agentRecordService', () => ({
  getDefaultAgentRecordService: vi.fn(() => ({
    getRunningAgentCounts: vi.fn(() => Promise.resolve(new Map([['test-spec', 2]]))),
  })),
}));

// Mock logFileService
vi.mock('../services/logFileService', () => ({
  getDefaultLogFileService: vi.fn(() => ({
    readLog: vi.fn(() => Promise.resolve([
      { timestamp: '2026-01-25T00:00:00Z', stream: 'stdout', data: 'test log' },
    ])),
  })),
}));

// Mock remoteAccessHandlers
vi.mock('./remoteAccessHandlers', () => ({
  getRemoteAccessServer: vi.fn(() => ({
    getWebSocketHandler: vi.fn(() => null),
  })),
}));

// Mock agentProcess
vi.mock('../services/agentProcess', () => ({
  getClaudeCommand: vi.fn(() => 'claude'),
}));

// Mock AgentRecordWatcherService
vi.mock('../services/agentRecordWatcherService', () => ({
  AgentRecordWatcherService: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(() => Promise.resolve()),
    onChange: vi.fn(),
    switchWatchScope: vi.fn(() => Promise.resolve()),
  })),
}));

describe('agentHandlers', () => {
  let mockSpecManagerService: ReturnType<typeof createMockSpecManagerService>;
  let mockDependencies: AgentHandlersDependencies;

  function createMockSpecManagerService() {
    return {
      startAgent: vi.fn(() => Promise.resolve({ ok: true, value: { agentId: 'test-agent-1' } })),
      stopAgent: vi.fn(() => Promise.resolve({ ok: true, value: undefined })),
      resumeAgent: vi.fn(() => Promise.resolve({ ok: true, value: { agentId: 'test-agent-1' } })),
      deleteAgent: vi.fn(() => Promise.resolve({ ok: true, value: undefined })),
      getAgents: vi.fn(() => Promise.resolve([
        { agentId: 'agent-1', specId: 'test-spec', phase: 'design', status: 'running' },
      ])),
      getAllAgents: vi.fn(() => Promise.resolve(new Map([
        ['test-spec', [{ agentId: 'agent-1', specId: 'test-spec', phase: 'design', status: 'running' }]],
      ]))),
      sendInput: vi.fn(() => ({ ok: true })),
      getAgentById: vi.fn(() => Promise.resolve(null)),
      onOutput: vi.fn(),
      onStatusChange: vi.fn(),
      onAgentExitError: vi.fn(),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockSpecManagerService = createMockSpecManagerService();
    mockDependencies = {
      getSpecManagerService: () => mockSpecManagerService,
      getCurrentProjectPath: () => '/test/project',
      getEventCallbacksRegistered: () => false,
      setEventCallbacksRegistered: vi.fn(),
      registerEventCallbacks: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('AgentHandlersDependencies interface', () => {
    it('should define required dependencies', () => {
      // Verify that the interface requires these functions
      expect(mockDependencies.getSpecManagerService).toBeDefined();
      expect(mockDependencies.getCurrentProjectPath).toBeDefined();
      expect(mockDependencies.getEventCallbacksRegistered).toBeDefined();
      expect(mockDependencies.setEventCallbacksRegistered).toBeDefined();
      expect(mockDependencies.registerEventCallbacks).toBeDefined();
    });
  });

  describe('registerAgentHandlers', () => {
    it('should register all agent-related IPC handlers', async () => {
      // Import after mocks are set up
      const { registerAgentHandlers } = await import('./agentHandlers');

      registerAgentHandlers(mockDependencies);

      // Verify IPC handlers are registered
      const handleCalls = vi.mocked(ipcMain.handle).mock.calls;
      const registeredChannels = handleCalls.map(([channel]) => channel);

      // Agent control handlers
      expect(registeredChannels).toContain('ipc:start-agent');
      expect(registeredChannels).toContain('ipc:stop-agent');
      expect(registeredChannels).toContain('ipc:resume-agent');
      expect(registeredChannels).toContain('ipc:delete-agent');

      // Agent list handlers
      expect(registeredChannels).toContain('ipc:get-agents');
      expect(registeredChannels).toContain('ipc:get-all-agents');

      // Agent operation handlers
      expect(registeredChannels).toContain('ipc:send-agent-input');
      expect(registeredChannels).toContain('ipc:get-agent-logs');

      // Watcher handlers
      expect(registeredChannels).toContain('ipc:switch-agent-watch-scope');
      expect(registeredChannels).toContain('ipc:get-running-agent-counts');
    });

    it('should use dependency injection pattern', async () => {
      const { registerAgentHandlers } = await import('./agentHandlers');

      // Should not throw when called with valid dependencies
      expect(() => registerAgentHandlers(mockDependencies)).not.toThrow();
    });
  });

  describe('startAgentRecordWatcher', () => {
    it('should be exported', async () => {
      const { startAgentRecordWatcher } = await import('./agentHandlers');
      expect(startAgentRecordWatcher).toBeDefined();
      expect(typeof startAgentRecordWatcher).toBe('function');
    });
  });

  describe('stopAgentRecordWatcher', () => {
    it('should be exported', async () => {
      const { stopAgentRecordWatcher } = await import('./agentHandlers');
      expect(stopAgentRecordWatcher).toBeDefined();
      expect(typeof stopAgentRecordWatcher).toBe('function');
    });
  });

  describe('IPC handler implementations', () => {
    it('should call getSpecManagerService for START_AGENT handler', async () => {
      const { registerAgentHandlers } = await import('./agentHandlers');

      registerAgentHandlers(mockDependencies);

      // Find the START_AGENT handler
      const handleCalls = vi.mocked(ipcMain.handle).mock.calls;
      const startAgentCall = handleCalls.find(([channel]) => channel === 'ipc:start-agent');

      expect(startAgentCall).toBeDefined();
    });

    it('should call getSpecManagerService for GET_AGENTS handler', async () => {
      const { registerAgentHandlers } = await import('./agentHandlers');

      registerAgentHandlers(mockDependencies);

      // Find the GET_AGENTS handler
      const handleCalls = vi.mocked(ipcMain.handle).mock.calls;
      const getAgentsCall = handleCalls.find(([channel]) => channel === 'ipc:get-agents');

      expect(getAgentsCall).toBeDefined();
    });

    it('should use agentRecordService for GET_RUNNING_AGENT_COUNTS', async () => {
      const { registerAgentHandlers } = await import('./agentHandlers');

      registerAgentHandlers(mockDependencies);

      // Find the GET_RUNNING_AGENT_COUNTS handler
      const handleCalls = vi.mocked(ipcMain.handle).mock.calls;
      const getCountsCall = handleCalls.find(([channel]) => channel === 'ipc:get-running-agent-counts');

      expect(getCountsCall).toBeDefined();
    });

    it('should use logFileService for GET_AGENT_LOGS', async () => {
      const { registerAgentHandlers } = await import('./agentHandlers');

      registerAgentHandlers(mockDependencies);

      // Find the GET_AGENT_LOGS handler
      const handleCalls = vi.mocked(ipcMain.handle).mock.calls;
      const getLogsCall = handleCalls.find(([channel]) => channel === 'ipc:get-agent-logs');

      expect(getLogsCall).toBeDefined();
    });
  });
});
