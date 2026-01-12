/**
 * Remote Access IPC Handlers Tests
 * TDD: Testing IPC handlers for Remote Access Server management
 * Requirements: 1.1, 1.2, 1.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ipcMain, BrowserWindow } from 'electron';

// Mock electron with all required APIs
vi.mock('electron', () => {
  const mockBrowserWindow = vi.fn().mockImplementation(() => ({
    loadFile: vi.fn(),
    loadURL: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    show: vi.fn(),
    isDestroyed: vi.fn().mockReturnValue(false),
    webContents: {
      send: vi.fn(),
      on: vi.fn(),
    },
  }));
  (mockBrowserWindow as any).fromWebContents = vi.fn();
  (mockBrowserWindow as any).getAllWindows = vi.fn().mockReturnValue([]);

  return {
    app: {
      isPackaged: false,
      name: 'SDD Orchestrator',
      getPath: vi.fn((name: string) => `/tmp/test-${name}`),
      getName: vi.fn(() => 'SDD Orchestrator'),
      setName: vi.fn(),
      getVersion: vi.fn(() => '0.0.0-test'),
      commandLine: {
        getSwitchValue: vi.fn(() => ''),
        hasSwitch: vi.fn(() => false),
        appendSwitch: vi.fn(),
      },
      quit: vi.fn(),
      on: vi.fn(),
      whenReady: vi.fn(() => Promise.resolve()),
    },
    ipcMain: {
      handle: vi.fn(),
      on: vi.fn(),
      removeHandler: vi.fn(),
      removeListener: vi.fn(),
    },
    BrowserWindow: mockBrowserWindow,
    Menu: {
      buildFromTemplate: vi.fn(),
      setApplicationMenu: vi.fn(),
    },
    nativeTheme: {
      shouldUseDarkColors: false,
      themeSource: 'system',
      on: vi.fn(),
    },
  };
});

// Mock RemoteAccessServer
const mockStart = vi.fn();
const mockStop = vi.fn();
const mockGetStatus = vi.fn();
const mockOnStatusChange = vi.fn();
const mockGetClientCount = vi.fn();

vi.mock('../services/remoteAccessServer', () => ({
  RemoteAccessServer: vi.fn().mockImplementation(() => ({
    start: mockStart,
    stop: mockStop,
    getStatus: mockGetStatus,
    onStatusChange: mockOnStatusChange,
    getClientCount: mockGetClientCount,
  })),
}));

// Mock logger
vi.mock('../services/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock the main index to prevent it from running during tests
vi.mock('../index', () => ({}));

describe('Remote Access IPC Handlers (Task 4.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('IPC Channel Constants', () => {
    it('should export remote access channel constants', async () => {
      const { IPC_CHANNELS } = await import('./channels');

      expect(IPC_CHANNELS.START_REMOTE_SERVER).toBe('remote-access:start');
      expect(IPC_CHANNELS.STOP_REMOTE_SERVER).toBe('remote-access:stop');
      expect(IPC_CHANNELS.GET_REMOTE_SERVER_STATUS).toBe('remote-access:get-status');
      expect(IPC_CHANNELS.REMOTE_SERVER_STATUS_CHANGED).toBe('remote-access:status-changed');
      expect(IPC_CHANNELS.REMOTE_CLIENT_COUNT_CHANGED).toBe('remote-access:client-count-changed');
    });
  });

  describe('registerRemoteAccessHandlers', () => {
    it('should register start-remote-server handler', async () => {
      const { registerRemoteAccessHandlers } = await import('./remoteAccessHandlers');
      registerRemoteAccessHandlers();

      const handleCalls = (ipcMain.handle as any).mock.calls;
      const hasStartRemoteServer = handleCalls.some(
        ([channel]: [string]) => channel === 'remote-access:start'
      );
      expect(hasStartRemoteServer).toBe(true);
    });

    it('should register stop-remote-server handler', async () => {
      const { registerRemoteAccessHandlers } = await import('./remoteAccessHandlers');
      registerRemoteAccessHandlers();

      const handleCalls = (ipcMain.handle as any).mock.calls;
      const hasStopRemoteServer = handleCalls.some(
        ([channel]: [string]) => channel === 'remote-access:stop'
      );
      expect(hasStopRemoteServer).toBe(true);
    });

    it('should register get-remote-server-status handler', async () => {
      const { registerRemoteAccessHandlers } = await import('./remoteAccessHandlers');
      registerRemoteAccessHandlers();

      const handleCalls = (ipcMain.handle as any).mock.calls;
      const hasGetStatus = handleCalls.some(
        ([channel]: [string]) => channel === 'remote-access:get-status'
      );
      expect(hasGetStatus).toBe(true);
    });
  });

  describe('START_REMOTE_SERVER handler', () => {
    it('should call server.start with preferred port', async () => {
      const { registerRemoteAccessHandlers, getRemoteAccessServer } = await import('./remoteAccessHandlers');
      registerRemoteAccessHandlers();

      mockStart.mockResolvedValue({
        ok: true,
        value: {
          port: 8765,
          url: 'http://192.168.1.1:8765',
          qrCodeDataUrl: 'data:image/png;base64,test',
          localIp: '192.168.1.1',
        },
      });

      // Get the handler function
      const handleCalls = (ipcMain.handle as any).mock.calls;
      const startHandler = handleCalls.find(
        ([channel]: [string]) => channel === 'remote-access:start'
      )?.[1];

      expect(startHandler).toBeDefined();

      const result = await startHandler({}, 8765);

      expect(mockStart).toHaveBeenCalledWith(8765);
      expect(result).toEqual({
        ok: true,
        value: {
          port: 8765,
          url: 'http://192.168.1.1:8765',
          qrCodeDataUrl: 'data:image/png;base64,test',
          localIp: '192.168.1.1',
        },
      });
    });

    it('should return error when server fails to start', async () => {
      const { registerRemoteAccessHandlers } = await import('./remoteAccessHandlers');
      registerRemoteAccessHandlers();

      mockStart.mockResolvedValue({
        ok: false,
        error: { type: 'NO_AVAILABLE_PORT', triedPorts: [8765, 8766, 8767] },
      });

      const handleCalls = (ipcMain.handle as any).mock.calls;
      const startHandler = handleCalls.find(
        ([channel]: [string]) => channel === 'remote-access:start'
      )?.[1];

      const result = await startHandler({});

      expect(result.ok).toBe(false);
      expect(result.error.type).toBe('NO_AVAILABLE_PORT');
    });
  });

  describe('STOP_REMOTE_SERVER handler', () => {
    it('should call server.stop', async () => {
      const { registerRemoteAccessHandlers } = await import('./remoteAccessHandlers');
      registerRemoteAccessHandlers();

      mockStop.mockResolvedValue(undefined);

      const handleCalls = (ipcMain.handle as any).mock.calls;
      const stopHandler = handleCalls.find(
        ([channel]: [string]) => channel === 'remote-access:stop'
      )?.[1];

      expect(stopHandler).toBeDefined();

      await stopHandler({});

      expect(mockStop).toHaveBeenCalled();
    });
  });

  describe('GET_REMOTE_SERVER_STATUS handler', () => {
    it('should return server status', async () => {
      const { registerRemoteAccessHandlers } = await import('./remoteAccessHandlers');
      registerRemoteAccessHandlers();

      const mockStatus = {
        isRunning: true,
        port: 8765,
        url: 'http://192.168.1.1:8765',
        clientCount: 2,
      };
      mockGetStatus.mockReturnValue(mockStatus);

      const handleCalls = (ipcMain.handle as any).mock.calls;
      const statusHandler = handleCalls.find(
        ([channel]: [string]) => channel === 'remote-access:get-status'
      )?.[1];

      expect(statusHandler).toBeDefined();

      const result = await statusHandler({});

      expect(mockGetStatus).toHaveBeenCalled();
      expect(result).toEqual(mockStatus);
    });
  });

  describe('Status change notification', () => {
    it('should send status change to renderer when server status changes', async () => {
      const mockWindow = {
        isDestroyed: vi.fn().mockReturnValue(false),
        webContents: {
          send: vi.fn(),
        },
      };
      (BrowserWindow.getAllWindows as any).mockReturnValue([mockWindow]);

      let statusCallback: ((status: any) => void) | null = null;
      mockOnStatusChange.mockImplementation((callback: (status: any) => void) => {
        statusCallback = callback;
        return () => {};
      });

      const { registerRemoteAccessHandlers, setupStatusNotifications } = await import('./remoteAccessHandlers');
      registerRemoteAccessHandlers();
      setupStatusNotifications();

      // Simulate status change
      const newStatus = {
        isRunning: true,
        port: 8765,
        url: 'http://192.168.1.1:8765',
        clientCount: 1,
      };

      if (statusCallback) {
        statusCallback(newStatus);
      }

      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        'remote-access:status-changed',
        newStatus
      );
    });

    it('should not send to destroyed windows', async () => {
      const mockWindow = {
        isDestroyed: vi.fn().mockReturnValue(true),
        webContents: {
          send: vi.fn(),
        },
      };
      (BrowserWindow.getAllWindows as any).mockReturnValue([mockWindow]);

      let statusCallback: ((status: any) => void) | null = null;
      mockOnStatusChange.mockImplementation((callback: (status: any) => void) => {
        statusCallback = callback;
        return () => {};
      });

      const { registerRemoteAccessHandlers, setupStatusNotifications } = await import('./remoteAccessHandlers');
      registerRemoteAccessHandlers();
      setupStatusNotifications();

      if (statusCallback) {
        statusCallback({ isRunning: true, port: 8765, url: 'http://192.168.1.1:8765', clientCount: 1 });
      }

      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('getRemoteAccessServer', () => {
    it('should return the singleton server instance', async () => {
      const { getRemoteAccessServer, registerRemoteAccessHandlers } = await import('./remoteAccessHandlers');
      registerRemoteAccessHandlers();

      const server1 = getRemoteAccessServer();
      const server2 = getRemoteAccessServer();

      expect(server1).toBe(server2);
    });
  });
});

// ============================================================
// Task 8.2: StateProvider Integration Tests
// Requirements: 3.1, 3.2, 3.3
// ============================================================

describe('StateProvider Integration (Task 8.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createStateProvider', () => {
    it('should create a StateProvider that returns project path', async () => {
      const { createStateProvider } = await import('./remoteAccessHandlers');

      const mockProjectPath = '/test/project';
      const mockGetSpecs = vi.fn().mockResolvedValue([
        { id: 'spec-1', name: 'Feature A', phase: 'design' },
      ]);

      const stateProvider = createStateProvider(mockProjectPath, mockGetSpecs);

      expect(stateProvider.getProjectPath()).toBe(mockProjectPath);
    });

    it('should create a StateProvider that returns specs from getter', async () => {
      const { createStateProvider } = await import('./remoteAccessHandlers');

      const mockProjectPath = '/test/project';
      const mockSpecs = [
        { id: 'spec-1', name: 'Feature A', phase: 'design' },
        { id: 'spec-2', name: 'Feature B', phase: 'tasks' },
      ];
      const mockGetSpecs = vi.fn().mockResolvedValue(mockSpecs);

      const stateProvider = createStateProvider(mockProjectPath, mockGetSpecs);

      const specs = await stateProvider.getSpecs();

      expect(mockGetSpecs).toHaveBeenCalled();
      expect(specs).toEqual(mockSpecs);
    });

    it('should return empty array when getSpecs returns null', async () => {
      const { createStateProvider } = await import('./remoteAccessHandlers');

      const mockGetSpecs = vi.fn().mockResolvedValue(null);

      const stateProvider = createStateProvider('/test', mockGetSpecs);

      const specs = await stateProvider.getSpecs();

      expect(specs).toEqual([]);
    });
  });

  describe('setupStateProvider', () => {
    it('should set StateProvider on WebSocketHandler when server is running', async () => {
      const { setupStateProvider, getRemoteAccessServer, registerRemoteAccessHandlers } = await import('./remoteAccessHandlers');
      registerRemoteAccessHandlers();

      const server = getRemoteAccessServer();
      const mockWsHandler = {
        setStateProvider: vi.fn(),
      };

      // Mock getWebSocketHandler to return our mock
      (server as any).getWebSocketHandler = vi.fn().mockReturnValue(mockWsHandler);

      const mockProjectPath = '/test/project';
      const mockGetSpecs = vi.fn().mockResolvedValue([]);

      setupStateProvider(mockProjectPath, mockGetSpecs);

      expect(mockWsHandler.setStateProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          getProjectPath: expect.any(Function),
          getSpecs: expect.any(Function),
        })
      );
    });
  });
});

// ============================================================
// Task 8.3: WorkflowController Integration Tests
// Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
// ============================================================

// ============================================================
// Task 1.1: StateProvider.getBugs() Tests (internal-webserver-sync feature)
// Requirements: 1.1, 5.5, 6.1
// ============================================================

describe('StateProvider.getBugs() Integration (Task 1.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createStateProvider with getBugs', () => {
    it('should create a StateProvider with getBugs method', async () => {
      const { createStateProvider } = await import('./remoteAccessHandlers');

      const mockProjectPath = '/test/project';
      const mockGetSpecs = vi.fn().mockResolvedValue([]);
      const mockGetBugs = vi.fn().mockResolvedValue([
        { name: 'bug-1', phase: 'reported', updatedAt: '2025-01-01T00:00:00Z' },
      ]);

      const stateProvider = createStateProvider(mockProjectPath, mockGetSpecs, mockGetBugs);

      expect(stateProvider.getBugs).toBeDefined();
    });

    it('should return bugs from getBugs getter', async () => {
      const { createStateProvider } = await import('./remoteAccessHandlers');

      const mockBugs = [
        { name: 'bug-1', phase: 'reported', updatedAt: '2025-01-01T00:00:00Z' },
        { name: 'bug-2', phase: 'analyzed', updatedAt: '2025-01-02T00:00:00Z' },
      ];
      const mockGetBugs = vi.fn().mockResolvedValue(mockBugs);

      const stateProvider = createStateProvider('/test', vi.fn().mockResolvedValue([]), mockGetBugs);

      const bugs = await stateProvider.getBugs();

      expect(mockGetBugs).toHaveBeenCalled();
      expect(bugs).toEqual(mockBugs);
    });

    it('should return empty array when getBugs returns null', async () => {
      const { createStateProvider } = await import('./remoteAccessHandlers');

      const mockGetBugs = vi.fn().mockResolvedValue(null);

      const stateProvider = createStateProvider('/test', vi.fn().mockResolvedValue([]), mockGetBugs);

      const bugs = await stateProvider.getBugs();

      expect(bugs).toEqual([]);
    });

    it('should return empty array when getBugs is not provided', async () => {
      const { createStateProvider } = await import('./remoteAccessHandlers');

      // createStateProvider without getBugs parameter
      const stateProvider = createStateProvider('/test', vi.fn().mockResolvedValue([]));

      const bugs = await stateProvider.getBugs();

      expect(bugs).toEqual([]);
    });
  });
});

describe('WorkflowController Integration (Task 8.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createWorkflowController', () => {
    it('should create a WorkflowController with executePhase', async () => {
      const { createWorkflowController } = await import('./remoteAccessHandlers');

      const mockSpecManagerService = {
        executePhase: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'agent-123' } }),
        stopAgent: vi.fn(),
        resumeAgent: vi.fn(),
      };

      const controller = createWorkflowController(mockSpecManagerService as any);

      const result = await controller.executePhase('spec-1', 'requirements');

      expect(mockSpecManagerService.executePhase).toHaveBeenCalledWith({
        specId: 'spec-1',
        phase: 'requirements',
        featureName: 'spec-1',
      });
      expect(result.ok).toBe(true);
    });

    it('should create a WorkflowController with stopAgent', async () => {
      const { createWorkflowController } = await import('./remoteAccessHandlers');

      const mockSpecManagerService = {
        executePhase: vi.fn(),
        stopAgent: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
        resumeAgent: vi.fn(),
      };

      const controller = createWorkflowController(mockSpecManagerService as any);

      const result = await controller.stopAgent('agent-123');

      expect(mockSpecManagerService.stopAgent).toHaveBeenCalledWith('agent-123');
      expect(result.ok).toBe(true);
    });

    it('should create a WorkflowController with resumeAgent', async () => {
      const { createWorkflowController } = await import('./remoteAccessHandlers');

      const mockSpecManagerService = {
        executePhase: vi.fn(),
        stopAgent: vi.fn(),
        resumeAgent: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'agent-123' } }),
      };

      const controller = createWorkflowController(mockSpecManagerService as any);

      const result = await controller.resumeAgent('agent-123');

      expect(mockSpecManagerService.resumeAgent).toHaveBeenCalledWith('agent-123');
      expect(result.ok).toBe(true);
    });

    it('should handle executePhase errors', async () => {
      const { createWorkflowController } = await import('./remoteAccessHandlers');

      const mockSpecManagerService = {
        executePhase: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'SPAWN_ERROR', message: 'Failed to spawn agent' },
        }),
        stopAgent: vi.fn(),
        resumeAgent: vi.fn(),
      };

      const controller = createWorkflowController(mockSpecManagerService as any);

      const result = await controller.executePhase('spec-1', 'requirements');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('SPAWN_ERROR');
      }
    });
  });

  describe('setupWorkflowController', () => {
    it('should set WorkflowController on WebSocketHandler when server is running', async () => {
      const { setupWorkflowController, getRemoteAccessServer, registerRemoteAccessHandlers } = await import('./remoteAccessHandlers');
      registerRemoteAccessHandlers();

      const server = getRemoteAccessServer();
      const mockWsHandler = {
        setWorkflowController: vi.fn(),
      };

      // Mock getWebSocketHandler to return our mock
      (server as any).getWebSocketHandler = vi.fn().mockReturnValue(mockWsHandler);

      const mockSpecManagerService = {
        executePhase: vi.fn(),
        stopAgent: vi.fn(),
        resumeAgent: vi.fn(),
      };

      setupWorkflowController(mockSpecManagerService as any);

      expect(mockWsHandler.setWorkflowController).toHaveBeenCalledWith(
        expect.objectContaining({
          executePhase: expect.any(Function),
          stopAgent: expect.any(Function),
          resumeAgent: expect.any(Function),
        })
      );
    });
  });
});

// ============================================================
// Task 2.1: WorkflowController.executeBugPhase() Tests
// Requirements: 6.2, 6.7 (internal-webserver-sync)
// ============================================================

describe('WorkflowController.executeBugPhase() (Task 2.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executeBugPhase', () => {
    it('should execute bug analyze phase successfully', async () => {
      const { createWorkflowController } = await import('./remoteAccessHandlers');

      const mockSpecManagerService = {
        executePhase: vi.fn(),
        stopAgent: vi.fn(),
        resumeAgent: vi.fn(),
        startAgent: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'agent-bug-123' } }),
      };

      const controller = createWorkflowController(mockSpecManagerService as any);

      expect(controller.executeBugPhase).toBeDefined();

      const result = await controller.executeBugPhase!('my-bug', 'analyze');

      expect(mockSpecManagerService.startAgent).toHaveBeenCalledWith(expect.objectContaining({
        specId: '',
        phase: 'bug-analyze',
      }));
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.agentId).toBe('agent-bug-123');
      }
    });

    it('should execute bug fix phase successfully', async () => {
      const { createWorkflowController } = await import('./remoteAccessHandlers');

      const mockSpecManagerService = {
        executePhase: vi.fn(),
        stopAgent: vi.fn(),
        resumeAgent: vi.fn(),
        startAgent: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'agent-bug-456' } }),
      };

      const controller = createWorkflowController(mockSpecManagerService as any);

      const result = await controller.executeBugPhase!('my-bug', 'fix');

      expect(mockSpecManagerService.startAgent).toHaveBeenCalledWith(expect.objectContaining({
        specId: '',
        phase: 'bug-fix',
      }));
      expect(result.ok).toBe(true);
    });

    it('should execute bug verify phase successfully', async () => {
      const { createWorkflowController } = await import('./remoteAccessHandlers');

      const mockSpecManagerService = {
        executePhase: vi.fn(),
        stopAgent: vi.fn(),
        resumeAgent: vi.fn(),
        startAgent: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'agent-bug-789' } }),
      };

      const controller = createWorkflowController(mockSpecManagerService as any);

      const result = await controller.executeBugPhase!('my-bug', 'verify');

      expect(mockSpecManagerService.startAgent).toHaveBeenCalledWith(expect.objectContaining({
        specId: '',
        phase: 'bug-verify',
      }));
      expect(result.ok).toBe(true);
    });

    it('should handle executeBugPhase errors', async () => {
      const { createWorkflowController } = await import('./remoteAccessHandlers');

      const mockSpecManagerService = {
        executePhase: vi.fn(),
        stopAgent: vi.fn(),
        resumeAgent: vi.fn(),
        startAgent: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'SPAWN_ERROR', message: 'Failed to spawn bug agent' },
        }),
      };

      const controller = createWorkflowController(mockSpecManagerService as any);

      const result = await controller.executeBugPhase!('my-bug', 'analyze');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('SPAWN_ERROR');
      }
    });

    it('should pass allowedTools for bug-analyze phase', async () => {
      const { createWorkflowController } = await import('./remoteAccessHandlers');

      const mockSpecManagerService = {
        executePhase: vi.fn(),
        stopAgent: vi.fn(),
        resumeAgent: vi.fn(),
        startAgent: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'agent-bug-123' } }),
      };

      const controller = createWorkflowController(mockSpecManagerService as any);

      await controller.executeBugPhase!('my-bug', 'analyze');

      // args should contain --allowedTools with the tools for bug-analyze phase
      const callArgs = mockSpecManagerService.startAgent.mock.calls[0][0];
      expect(callArgs.args).toContain('--allowedTools');
      // bug-analyze should have: Bash, Read, Write, Edit, Glob, Grep
      expect(callArgs.args).toContain('Bash');
      expect(callArgs.args).toContain('Read');
      expect(callArgs.args).toContain('Write');
      expect(callArgs.args).toContain('Edit');
      expect(callArgs.args).toContain('Glob');
      expect(callArgs.args).toContain('Grep');
      // AskUserQuestion should NOT be included
      expect(callArgs.args).not.toContain('AskUserQuestion');
    });

    it('should pass allowedTools for bug-fix phase', async () => {
      const { createWorkflowController } = await import('./remoteAccessHandlers');

      const mockSpecManagerService = {
        executePhase: vi.fn(),
        stopAgent: vi.fn(),
        resumeAgent: vi.fn(),
        startAgent: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'agent-bug-456' } }),
      };

      const controller = createWorkflowController(mockSpecManagerService as any);

      await controller.executeBugPhase!('my-bug', 'fix');

      const callArgs = mockSpecManagerService.startAgent.mock.calls[0][0];
      expect(callArgs.args).toContain('--allowedTools');
      expect(callArgs.args).not.toContain('AskUserQuestion');
    });

    it('should pass allowedTools for bug-verify phase', async () => {
      const { createWorkflowController } = await import('./remoteAccessHandlers');

      const mockSpecManagerService = {
        executePhase: vi.fn(),
        stopAgent: vi.fn(),
        resumeAgent: vi.fn(),
        startAgent: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'agent-bug-789' } }),
      };

      const controller = createWorkflowController(mockSpecManagerService as any);

      await controller.executeBugPhase!('my-bug', 'verify');

      const callArgs = mockSpecManagerService.startAgent.mock.calls[0][0];
      expect(callArgs.args).toContain('--allowedTools');
      // bug-verify should have: Bash, Read, Write, Edit, Glob, Grep (no AskUserQuestion)
      expect(callArgs.args).not.toContain('AskUserQuestion');
    });
  });
});

// ============================================================
// Task 2.2: WorkflowController.executeValidation() Tests
// Requirements: 6.3, 6.7 (internal-webserver-sync)
// ============================================================

describe('WorkflowController.executeValidation() (Task 2.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executeValidation', () => {
    it('should execute gap validation successfully', async () => {
      const { createWorkflowController } = await import('./remoteAccessHandlers');

      const mockSpecManagerService = {
        executePhase: vi.fn(),
        stopAgent: vi.fn(),
        resumeAgent: vi.fn(),
        startAgent: vi.fn(),
        executeValidation: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'agent-validate-123' } }),
      };

      const controller = createWorkflowController(mockSpecManagerService as any);

      expect(controller.executeValidation).toBeDefined();

      const result = await controller.executeValidation!('my-spec', 'gap');

      expect(mockSpecManagerService.executeValidation).toHaveBeenCalledWith({
        specId: 'my-spec',
        type: 'gap',
        featureName: 'my-spec',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.agentId).toBe('agent-validate-123');
      }
    });

    it('should execute design validation successfully', async () => {
      const { createWorkflowController } = await import('./remoteAccessHandlers');

      const mockSpecManagerService = {
        executePhase: vi.fn(),
        stopAgent: vi.fn(),
        resumeAgent: vi.fn(),
        startAgent: vi.fn(),
        executeValidation: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'agent-validate-456' } }),
      };

      const controller = createWorkflowController(mockSpecManagerService as any);

      const result = await controller.executeValidation!('my-spec', 'design');

      expect(mockSpecManagerService.executeValidation).toHaveBeenCalledWith({
        specId: 'my-spec',
        type: 'design',
        featureName: 'my-spec',
      });
      expect(result.ok).toBe(true);
    });

    it('should handle executeValidation errors', async () => {
      const { createWorkflowController } = await import('./remoteAccessHandlers');

      const mockSpecManagerService = {
        executePhase: vi.fn(),
        stopAgent: vi.fn(),
        resumeAgent: vi.fn(),
        startAgent: vi.fn(),
        executeValidation: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'SPAWN_ERROR', message: 'Failed to spawn validation agent' },
        }),
      };

      const controller = createWorkflowController(mockSpecManagerService as any);

      const result = await controller.executeValidation!('my-spec', 'gap');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('SPAWN_ERROR');
      }
    });
  });
});

// ============================================================
// Task 2.3: WorkflowController.executeDocumentReview() Tests
// Requirements: 6.4, 6.7 (internal-webserver-sync)
// ============================================================

describe('WorkflowController.executeDocumentReview() (Task 2.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executeDocumentReview', () => {
    it('should execute document review successfully', async () => {
      const { createWorkflowController } = await import('./remoteAccessHandlers');

      const mockSpecManagerService = {
        executePhase: vi.fn(),
        stopAgent: vi.fn(),
        resumeAgent: vi.fn(),
        startAgent: vi.fn(),
        executeValidation: vi.fn(),
        executeDocumentReview: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'agent-review-123' } }),
      };

      const controller = createWorkflowController(mockSpecManagerService as any);

      expect(controller.executeDocumentReview).toBeDefined();

      const result = await controller.executeDocumentReview!('my-spec');

      expect(mockSpecManagerService.executeDocumentReview).toHaveBeenCalledWith({
        specId: 'my-spec',
        featureName: 'my-spec',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.agentId).toBe('agent-review-123');
      }
    });

    it('should handle executeDocumentReview errors', async () => {
      const { createWorkflowController } = await import('./remoteAccessHandlers');

      const mockSpecManagerService = {
        executePhase: vi.fn(),
        stopAgent: vi.fn(),
        resumeAgent: vi.fn(),
        startAgent: vi.fn(),
        executeValidation: vi.fn(),
        executeDocumentReview: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'SPAWN_ERROR', message: 'Failed to spawn review agent' },
        }),
      };

      const controller = createWorkflowController(mockSpecManagerService as any);

      const result = await controller.executeDocumentReview!('my-spec');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('SPAWN_ERROR');
      }
    });
  });
});
