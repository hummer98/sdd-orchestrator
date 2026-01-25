/**
 * Preload API Tests
 * TDD: Testing preload API exposure for Agent management and configuration
 * Task 28: Preload API拡張
 * Requirements: 5.1-5.8, 9.1-9.10, 10.1-10.3, 13.1, 13.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock electron before importing preload
const mockIpcRenderer = {
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
};

const mockContextBridge = {
  exposeInMainWorld: vi.fn(),
};

vi.mock('electron', () => ({
  contextBridge: mockContextBridge,
  ipcRenderer: mockIpcRenderer,
}));

// Mock IPC_CHANNELS to avoid circular dependency
vi.mock('../main/ipc/channels', () => ({
  IPC_CHANNELS: {
    SHOW_OPEN_DIALOG: 'ipc:show-open-dialog',
    VALIDATE_KIRO_DIRECTORY: 'ipc:validate-kiro-directory',
    READ_SPECS: 'ipc:read-specs',
    READ_SPEC_JSON: 'ipc:read-spec-json',
    READ_ARTIFACT: 'ipc:read-artifact',
    CREATE_SPEC: 'ipc:create-spec',
    WRITE_FILE: 'ipc:write-file',
    UPDATE_APPROVAL: 'ipc:update-approval',
    EXECUTE_COMMAND: 'ipc:execute-command',
    CANCEL_EXECUTION: 'ipc:cancel-execution',
    COMMAND_OUTPUT: 'ipc:command-output',
    START_AGENT: 'ipc:start-agent',
    STOP_AGENT: 'ipc:stop-agent',
    RESUME_AGENT: 'ipc:resume-agent',
    GET_AGENTS: 'ipc:get-agents',
    GET_ALL_AGENTS: 'ipc:get-all-agents',
    SEND_AGENT_INPUT: 'ipc:send-agent-input',
    AGENT_OUTPUT: 'ipc:agent-output',
    AGENT_STATUS_CHANGE: 'ipc:agent-status-change',
    GET_RECENT_PROJECTS: 'ipc:get-recent-projects',
    ADD_RECENT_PROJECT: 'ipc:add-recent-project',
    GET_HANG_THRESHOLD: 'ipc:get-hang-threshold',
    SET_HANG_THRESHOLD: 'ipc:set-hang-threshold',
    GET_APP_VERSION: 'ipc:get-app-version',
    // MCP Server (mcp-server-integration feature)
    // Requirements: 6.3, 6.4
    MCP_START: 'mcp:start',
    MCP_STOP: 'mcp:stop',
    MCP_GET_STATUS: 'mcp:get-status',
    MCP_GET_SETTINGS: 'mcp:get-settings',
    MCP_SET_ENABLED: 'mcp:set-enabled',
    MCP_SET_PORT: 'mcp:set-port',
    // Schedule Task channels (Task 3.3)
    SCHEDULE_TASK_GET_ALL: 'schedule-task:get-all',
    SCHEDULE_TASK_GET: 'schedule-task:get',
    SCHEDULE_TASK_CREATE: 'schedule-task:create',
    SCHEDULE_TASK_UPDATE: 'schedule-task:update',
    SCHEDULE_TASK_DELETE: 'schedule-task:delete',
    SCHEDULE_TASK_EXECUTE_IMMEDIATELY: 'schedule-task:execute-immediately',
    SCHEDULE_TASK_GET_QUEUE: 'schedule-task:get-queue',
    SCHEDULE_TASK_GET_RUNNING: 'schedule-task:get-running',
    SCHEDULE_TASK_STATUS_CHANGED: 'schedule-task:status-changed',
    // Idle Time Sync (Task 7.1)
    SCHEDULE_TASK_REPORT_IDLE_TIME: 'schedule-task:report-idle-time',
    // release-button-api-fix: Project Command Execution
    // Requirements: 1.1, 4.3
    EXECUTE_PROJECT_COMMAND: 'ipc:execute-project-command',
  },
}));

describe('Preload API - Task 28.1: Agent管理API公開', () => {
  let exposedAPI: Record<string, unknown>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Import preload to trigger contextBridge.exposeInMainWorld
    await import('./index');

    // Get the exposed API from the mock call
    const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls[0];
    expect(exposeCall).toBeDefined();
    expect(exposeCall[0]).toBe('electronAPI');
    exposedAPI = exposeCall[1];
  });

  describe('startAgent', () => {
    it('should expose startAgent function', () => {
      expect(typeof exposedAPI.startAgent).toBe('function');
    });

    it('should invoke ipc:start-agent with correct parameters', async () => {
      const mockAgentInfo = {
        agentId: 'agent-123',
        specId: 'spec-1',
        phase: 'requirement',
        pid: 12345,
        sessionId: 'session-abc',
        status: 'running',
        startedAt: '2025-11-26T00:00:00Z',
        lastActivityAt: '2025-11-26T00:00:00Z',
      };
      mockIpcRenderer.invoke.mockResolvedValue(mockAgentInfo);

      const result = await (exposedAPI.startAgent as Function)(
        'spec-1',
        'requirement',
        'claude',
        ['-p', 'command'],
        'doc',
        'session-123'
      );

      // skip-permissions-main-process: skipPermissions removed from preload API
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'ipc:start-agent',
        'spec-1',
        'requirement',
        'claude',
        ['-p', 'command'],
        'doc',
        'session-123'
      );
      expect(result).toEqual(mockAgentInfo);
    });
  });

  describe('stopAgent', () => {
    it('should expose stopAgent function', () => {
      expect(typeof exposedAPI.stopAgent).toBe('function');
    });

    it('should invoke ipc:stop-agent with agentId', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(undefined);

      await (exposedAPI.stopAgent as Function)('agent-123');

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'ipc:stop-agent',
        'agent-123'
      );
    });
  });

  describe('resumeAgent', () => {
    it('should expose resumeAgent function', () => {
      expect(typeof exposedAPI.resumeAgent).toBe('function');
    });

    it('should invoke ipc:resume-agent with agentId', async () => {
      const mockAgentInfo = {
        agentId: 'agent-123',
        specId: 'spec-1',
        phase: 'requirement',
        pid: 12346,
        sessionId: 'session-abc',
        status: 'running',
        startedAt: '2025-11-26T00:00:00Z',
        lastActivityAt: '2025-11-26T00:01:00Z',
      };
      mockIpcRenderer.invoke.mockResolvedValue(mockAgentInfo);

      const result = await (exposedAPI.resumeAgent as Function)('agent-123');

      // skip-permissions-main-process: skipPermissions removed from preload API
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'ipc:resume-agent',
        'agent-123',
        undefined  // prompt
      );
      expect(result).toEqual(mockAgentInfo);
    });
  });

  describe('getAgents', () => {
    it('should expose getAgents function', () => {
      expect(typeof exposedAPI.getAgents).toBe('function');
    });

    it('should invoke ipc:get-agents with specId', async () => {
      const mockAgents = [
        {
          agentId: 'agent-1',
          specId: 'spec-1',
          phase: 'requirement',
          status: 'completed',
        },
        {
          agentId: 'agent-2',
          specId: 'spec-1',
          phase: 'design',
          status: 'running',
        },
      ];
      mockIpcRenderer.invoke.mockResolvedValue(mockAgents);

      const result = await (exposedAPI.getAgents as Function)('spec-1');

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'ipc:get-agents',
        'spec-1'
      );
      expect(result).toEqual(mockAgents);
    });
  });

  describe('getAllAgents', () => {
    it('should expose getAllAgents function', () => {
      expect(typeof exposedAPI.getAllAgents).toBe('function');
    });

    it('should invoke ipc:get-all-agents', async () => {
      const mockAllAgents = {
        'spec-1': [{ agentId: 'agent-1', status: 'running' }],
        'spec-2': [{ agentId: 'agent-2', status: 'completed' }],
      };
      mockIpcRenderer.invoke.mockResolvedValue(mockAllAgents);

      const result = await (exposedAPI.getAllAgents as Function)();

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('ipc:get-all-agents');
      expect(result).toEqual(mockAllAgents);
    });
  });

  describe('sendAgentInput', () => {
    it('should expose sendAgentInput function', () => {
      expect(typeof exposedAPI.sendAgentInput).toBe('function');
    });

    it('should invoke ipc:send-agent-input with agentId and input', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(undefined);

      await (exposedAPI.sendAgentInput as Function)('agent-123', 'user input');

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'ipc:send-agent-input',
        'agent-123',
        'user input'
      );
    });
  });

  describe('onAgentOutput', () => {
    it('should expose onAgentOutput function', () => {
      expect(typeof exposedAPI.onAgentOutput).toBe('function');
    });

    it('should register listener for ipc:agent-output', () => {
      const callback = vi.fn();

      (exposedAPI.onAgentOutput as Function)(callback);

      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'ipc:agent-output',
        expect.any(Function)
      );
    });

    it('should return cleanup function that removes listener', () => {
      const callback = vi.fn();

      const cleanup = (exposedAPI.onAgentOutput as Function)(callback);

      expect(typeof cleanup).toBe('function');

      cleanup();

      expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith(
        'ipc:agent-output',
        expect.any(Function)
      );
    });

    it('should call callback with agentId, stream, and data', () => {
      const callback = vi.fn();
      let registeredHandler: Function;

      mockIpcRenderer.on.mockImplementation((_channel, handler) => {
        registeredHandler = handler;
      });

      (exposedAPI.onAgentOutput as Function)(callback);

      // Simulate IPC event
      registeredHandler!({}, 'agent-123', 'stdout', 'output data');

      expect(callback).toHaveBeenCalledWith('agent-123', 'stdout', 'output data');
    });
  });

  describe('onAgentStatusChange', () => {
    it('should expose onAgentStatusChange function', () => {
      expect(typeof exposedAPI.onAgentStatusChange).toBe('function');
    });

    it('should register listener for ipc:agent-status-change', () => {
      const callback = vi.fn();

      (exposedAPI.onAgentStatusChange as Function)(callback);

      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'ipc:agent-status-change',
        expect.any(Function)
      );
    });

    it('should return cleanup function that removes listener', () => {
      const callback = vi.fn();

      const cleanup = (exposedAPI.onAgentStatusChange as Function)(callback);

      expect(typeof cleanup).toBe('function');

      cleanup();

      expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith(
        'ipc:agent-status-change',
        expect.any(Function)
      );
    });

    it('should call callback with agentId and status', () => {
      const callback = vi.fn();
      let registeredHandler: Function;

      mockIpcRenderer.on.mockImplementation((_channel, handler) => {
        registeredHandler = handler;
      });

      (exposedAPI.onAgentStatusChange as Function)(callback);

      // Simulate IPC event
      registeredHandler!({}, 'agent-123', 'completed');

      expect(callback).toHaveBeenCalledWith('agent-123', 'completed');
    });
  });
});

describe('Preload API - Task 28.2: 設定API拡張', () => {
  let exposedAPI: Record<string, unknown>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Import preload to trigger contextBridge.exposeInMainWorld
    await import('./index');

    // Get the exposed API from the mock call
    const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls[0];
    exposedAPI = exposeCall[1];
  });

  describe('getHangThreshold', () => {
    it('should expose getHangThreshold function', () => {
      expect(typeof exposedAPI.getHangThreshold).toBe('function');
    });

    it('should invoke ipc:get-hang-threshold', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(300000);

      const result = await (exposedAPI.getHangThreshold as Function)();

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('ipc:get-hang-threshold');
      expect(result).toBe(300000);
    });
  });

  describe('setHangThreshold', () => {
    it('should expose setHangThreshold function', () => {
      expect(typeof exposedAPI.setHangThreshold).toBe('function');
    });

    it('should invoke ipc:set-hang-threshold with threshold value', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(undefined);

      await (exposedAPI.setHangThreshold as Function)(600000);

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'ipc:set-hang-threshold',
        600000
      );
    });
  });
});

describe('Preload API - contextBridge Integration', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should expose API via contextBridge.exposeInMainWorld', async () => {
    await import('./index');

    expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
      'electronAPI',
      expect.any(Object)
    );
  });

  it('should expose all required Agent management methods', async () => {
    await import('./index');

    const exposedAPI = mockContextBridge.exposeInMainWorld.mock.calls[0][1];

    // Task 28.1: Agent管理API
    expect(exposedAPI).toHaveProperty('startAgent');
    expect(exposedAPI).toHaveProperty('stopAgent');
    expect(exposedAPI).toHaveProperty('resumeAgent');
    expect(exposedAPI).toHaveProperty('getAgents');
    expect(exposedAPI).toHaveProperty('getAllAgents');
    expect(exposedAPI).toHaveProperty('sendAgentInput');
    expect(exposedAPI).toHaveProperty('onAgentOutput');
    expect(exposedAPI).toHaveProperty('onAgentStatusChange');
  });

  it('should expose all required Config methods', async () => {
    await import('./index');

    const exposedAPI = mockContextBridge.exposeInMainWorld.mock.calls[0][1];

    // Task 28.2: 設定API拡張
    expect(exposedAPI).toHaveProperty('getHangThreshold');
    expect(exposedAPI).toHaveProperty('setHangThreshold');
  });
});

describe('Preload API - Type Export', () => {
  it('should export ElectronAPI type', async () => {
    const preloadModule = await import('./index');

    // The type export should be available (compile-time check)
    // We can verify the module structure has the expected exports
    expect(preloadModule).toBeDefined();
  });
});

describe('Preload API - Task 6.3: MCP Server API', () => {
  let exposedAPI: Record<string, unknown>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Import preload to trigger contextBridge.exposeInMainWorld
    await import('./index');

    // Get the exposed API from the mock call
    const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls[0];
    exposedAPI = exposeCall[1];
  });

  describe('mcpServer object', () => {
    it('should expose mcpServer object with all required methods', () => {
      expect(exposedAPI.mcpServer).toBeDefined();
      const mcpServer = exposedAPI.mcpServer as Record<string, unknown>;

      // Requirements 6.3, 6.4: MCP server control methods
      expect(typeof mcpServer.start).toBe('function');
      expect(typeof mcpServer.stop).toBe('function');
      expect(typeof mcpServer.getStatus).toBe('function');
      expect(typeof mcpServer.getSettings).toBe('function');
      expect(typeof mcpServer.setEnabled).toBe('function');
      expect(typeof mcpServer.setPort).toBe('function');
    });
  });

  describe('mcpServer.start', () => {
    it('should invoke mcp:start with optional port parameter', async () => {
      const mockResult = { ok: true, value: { port: 3001, url: 'http://localhost:3001' } };
      mockIpcRenderer.invoke.mockResolvedValue(mockResult);

      const mcpServer = exposedAPI.mcpServer as Record<string, Function>;
      const result = await mcpServer.start(3001);

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('mcp:start', 3001);
      expect(result).toEqual(mockResult);
    });

    it('should invoke mcp:start without port parameter', async () => {
      const mockResult = { ok: true, value: { port: 3001, url: 'http://localhost:3001' } };
      mockIpcRenderer.invoke.mockResolvedValue(mockResult);

      const mcpServer = exposedAPI.mcpServer as Record<string, Function>;
      const result = await mcpServer.start();

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('mcp:start', undefined);
      expect(result).toEqual(mockResult);
    });
  });

  describe('mcpServer.stop', () => {
    it('should invoke mcp:stop', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(undefined);

      const mcpServer = exposedAPI.mcpServer as Record<string, Function>;
      await mcpServer.stop();

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('mcp:stop');
    });
  });

  describe('mcpServer.getStatus', () => {
    it('should invoke mcp:get-status', async () => {
      const mockStatus = { isRunning: true, port: 3001, url: 'http://localhost:3001' };
      mockIpcRenderer.invoke.mockResolvedValue(mockStatus);

      const mcpServer = exposedAPI.mcpServer as Record<string, Function>;
      const result = await mcpServer.getStatus();

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('mcp:get-status');
      expect(result).toEqual(mockStatus);
    });
  });

  describe('mcpServer.getSettings', () => {
    it('should invoke mcp:get-settings', async () => {
      const mockSettings = { enabled: true, port: 3001 };
      mockIpcRenderer.invoke.mockResolvedValue(mockSettings);

      const mcpServer = exposedAPI.mcpServer as Record<string, Function>;
      const result = await mcpServer.getSettings();

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('mcp:get-settings');
      expect(result).toEqual(mockSettings);
    });
  });

  describe('mcpServer.setEnabled', () => {
    it('should invoke mcp:set-enabled with enabled=true', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(undefined);

      const mcpServer = exposedAPI.mcpServer as Record<string, Function>;
      await mcpServer.setEnabled(true);

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('mcp:set-enabled', true);
    });

    it('should invoke mcp:set-enabled with enabled=false', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(undefined);

      const mcpServer = exposedAPI.mcpServer as Record<string, Function>;
      await mcpServer.setEnabled(false);

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('mcp:set-enabled', false);
    });
  });

  describe('mcpServer.setPort', () => {
    it('should invoke mcp:set-port with port number', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(undefined);

      const mcpServer = exposedAPI.mcpServer as Record<string, Function>;
      await mcpServer.setPort(3002);

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('mcp:set-port', 3002);
    });
  });
});

describe('Preload API - Task 3.3: Schedule Task API', () => {
  let exposedAPI: Record<string, unknown>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Import preload to trigger contextBridge.exposeInMainWorld
    await import('./index');

    // Get the exposed API from the mock call
    const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls[0];
    exposedAPI = exposeCall[1];
  });

  describe('scheduleTaskGetAll', () => {
    it('should expose scheduleTaskGetAll function', () => {
      expect(typeof exposedAPI.scheduleTaskGetAll).toBe('function');
    });

    it('should invoke schedule-task:get-all with projectPath', async () => {
      const mockTasks = [
        { id: 'task-1', name: 'Task 1', enabled: true },
        { id: 'task-2', name: 'Task 2', enabled: false },
      ];
      mockIpcRenderer.invoke.mockResolvedValue(mockTasks);

      const result = await (exposedAPI.scheduleTaskGetAll as Function)('/path/to/project');

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'schedule-task:get-all',
        { projectPath: '/path/to/project' }
      );
      expect(result).toEqual(mockTasks);
    });
  });

  describe('scheduleTaskGet', () => {
    it('should expose scheduleTaskGet function', () => {
      expect(typeof exposedAPI.scheduleTaskGet).toBe('function');
    });

    it('should invoke schedule-task:get with projectPath and taskId', async () => {
      const mockTask = { id: 'task-1', name: 'Task 1', enabled: true };
      mockIpcRenderer.invoke.mockResolvedValue(mockTask);

      const result = await (exposedAPI.scheduleTaskGet as Function)('/path/to/project', 'task-1');

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'schedule-task:get',
        { projectPath: '/path/to/project', taskId: 'task-1' }
      );
      expect(result).toEqual(mockTask);
    });
  });

  describe('scheduleTaskCreate', () => {
    it('should expose scheduleTaskCreate function', () => {
      expect(typeof exposedAPI.scheduleTaskCreate).toBe('function');
    });

    it('should invoke schedule-task:create with projectPath and task input', async () => {
      const taskInput = {
        name: 'New Task',
        enabled: true,
        schedule: { type: 'interval', hoursInterval: 24, waitForIdle: false },
        prompts: [{ order: 0, content: 'Test prompt' }],
        avoidance: { targets: [], behavior: 'skip' },
        workflow: { enabled: false },
        behavior: 'wait',
      };
      const mockResult = { ok: true, value: { id: 'task-new', ...taskInput } };
      mockIpcRenderer.invoke.mockResolvedValue(mockResult);

      const result = await (exposedAPI.scheduleTaskCreate as Function)('/path/to/project', taskInput);

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'schedule-task:create',
        { projectPath: '/path/to/project', task: taskInput }
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('scheduleTaskUpdate', () => {
    it('should expose scheduleTaskUpdate function', () => {
      expect(typeof exposedAPI.scheduleTaskUpdate).toBe('function');
    });

    it('should invoke schedule-task:update with projectPath, taskId and updates', async () => {
      const updates = { enabled: false };
      const mockResult = { ok: true, value: { id: 'task-1', name: 'Task 1', enabled: false } };
      mockIpcRenderer.invoke.mockResolvedValue(mockResult);

      const result = await (exposedAPI.scheduleTaskUpdate as Function)('/path/to/project', 'task-1', updates);

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'schedule-task:update',
        { projectPath: '/path/to/project', taskId: 'task-1', updates }
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('scheduleTaskDelete', () => {
    it('should expose scheduleTaskDelete function', () => {
      expect(typeof exposedAPI.scheduleTaskDelete).toBe('function');
    });

    it('should invoke schedule-task:delete with projectPath and taskId', async () => {
      const mockResult = { ok: true, value: undefined };
      mockIpcRenderer.invoke.mockResolvedValue(mockResult);

      const result = await (exposedAPI.scheduleTaskDelete as Function)('/path/to/project', 'task-1');

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'schedule-task:delete',
        { projectPath: '/path/to/project', taskId: 'task-1' }
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('scheduleTaskExecuteImmediately', () => {
    it('should expose scheduleTaskExecuteImmediately function', () => {
      expect(typeof exposedAPI.scheduleTaskExecuteImmediately).toBe('function');
    });

    it('should invoke schedule-task:execute-immediately with projectPath, taskId and optional force', async () => {
      const mockResult = { ok: true, value: { taskId: 'task-1', startedAt: 1234567890, agentIds: ['agent-1'] } };
      mockIpcRenderer.invoke.mockResolvedValue(mockResult);

      const result = await (exposedAPI.scheduleTaskExecuteImmediately as Function)('/path/to/project', 'task-1', true);

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'schedule-task:execute-immediately',
        { projectPath: '/path/to/project', taskId: 'task-1', force: true }
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('scheduleTaskGetQueue', () => {
    it('should expose scheduleTaskGetQueue function', () => {
      expect(typeof exposedAPI.scheduleTaskGetQueue).toBe('function');
    });

    it('should invoke schedule-task:get-queue with projectPath', async () => {
      const mockQueue = [{ taskId: 'task-1', queuedAt: 1234567890, reason: 'schedule' }];
      mockIpcRenderer.invoke.mockResolvedValue(mockQueue);

      const result = await (exposedAPI.scheduleTaskGetQueue as Function)('/path/to/project');

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'schedule-task:get-queue',
        { projectPath: '/path/to/project' }
      );
      expect(result).toEqual(mockQueue);
    });
  });

  describe('scheduleTaskGetRunning', () => {
    it('should expose scheduleTaskGetRunning function', () => {
      expect(typeof exposedAPI.scheduleTaskGetRunning).toBe('function');
    });

    it('should invoke schedule-task:get-running with projectPath', async () => {
      const mockRunning = [{ taskId: 'task-1', promptIndex: 0, agentId: 'agent-1' }];
      mockIpcRenderer.invoke.mockResolvedValue(mockRunning);

      const result = await (exposedAPI.scheduleTaskGetRunning as Function)('/path/to/project');

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'schedule-task:get-running',
        { projectPath: '/path/to/project' }
      );
      expect(result).toEqual(mockRunning);
    });
  });

  describe('onScheduleTaskStatusChanged', () => {
    it('should expose onScheduleTaskStatusChanged function', () => {
      expect(typeof exposedAPI.onScheduleTaskStatusChanged).toBe('function');
    });

    it('should register listener for schedule-task:status-changed', () => {
      const callback = vi.fn();

      (exposedAPI.onScheduleTaskStatusChanged as Function)(callback);

      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'schedule-task:status-changed',
        expect.any(Function)
      );
    });

    it('should return cleanup function that removes listener', () => {
      const callback = vi.fn();

      const cleanup = (exposedAPI.onScheduleTaskStatusChanged as Function)(callback);

      expect(typeof cleanup).toBe('function');

      cleanup();

      expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith(
        'schedule-task:status-changed',
        expect.any(Function)
      );
    });

    it('should call callback with status event', () => {
      const callback = vi.fn();
      let registeredHandler: Function;

      mockIpcRenderer.on.mockImplementation((_channel, handler) => {
        registeredHandler = handler;
      });

      (exposedAPI.onScheduleTaskStatusChanged as Function)(callback);

      // Simulate IPC event
      const event = { type: 'task-queued', timestamp: 1234567890, taskId: 'task-1', reason: 'schedule' };
      registeredHandler!({}, event);

      expect(callback).toHaveBeenCalledWith(event);
    });
  });
});

// ============================================================
// release-button-api-fix: Task 2.1 - executeProjectCommand API
// Requirements: 1.1, 4.3
// ============================================================
describe('Preload API - Task 2.1: executeProjectCommand API', () => {
  let exposedAPI: Record<string, unknown>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Import preload to trigger contextBridge.exposeInMainWorld
    await import('./index');

    // Get the exposed API from the mock call
    const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls[0];
    exposedAPI = exposeCall[1];
  });

  describe('executeProjectCommand', () => {
    it('should expose executeProjectCommand function', () => {
      expect(typeof exposedAPI.executeProjectCommand).toBe('function');
    });

    it('should invoke ipc:execute-project-command with correct parameters', async () => {
      const mockAgentInfo = {
        agentId: 'agent-123',
        specId: '',
        phase: 'release',
        pid: 12345,
        sessionId: 'session-abc',
        status: 'running',
        startedAt: '2026-01-24T00:00:00Z',
        lastActivityAt: '2026-01-24T00:00:00Z',
        command: 'claude',
        args: '/release',
      };
      mockIpcRenderer.invoke.mockResolvedValue(mockAgentInfo);

      const result = await (exposedAPI.executeProjectCommand as Function)(
        '/path/to/project',
        '/release',
        'release'
      );

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'ipc:execute-project-command',
        '/path/to/project',
        '/release',
        'release'
      );
      expect(result).toEqual(mockAgentInfo);
    });

    it('should return AgentInfo on success', async () => {
      const mockAgentInfo = {
        agentId: 'agent-456',
        specId: '',
        phase: 'ask',
        pid: 54321,
        sessionId: 'session-xyz',
        status: 'running',
        startedAt: '2026-01-24T00:01:00Z',
        lastActivityAt: '2026-01-24T00:01:00Z',
        command: 'claude',
        args: '/kiro:project-ask "prompt"',
      };
      mockIpcRenderer.invoke.mockResolvedValue(mockAgentInfo);

      const result = await (exposedAPI.executeProjectCommand as Function)(
        '/path/to/project',
        '/kiro:project-ask "prompt"',
        'ask'
      );

      expect(result).toHaveProperty('agentId', 'agent-456');
      expect(result).toHaveProperty('phase', 'ask');
      expect(result).toHaveProperty('status', 'running');
    });
  });

  describe('executeAskProject removal', () => {
    it('should NOT expose executeAskProject function (removed)', () => {
      // Requirements: 4.3 - executeAskProject must be removed from preload
      expect(exposedAPI.executeAskProject).toBeUndefined();
    });
  });
});

describe('Preload API - Task 13.1: SSH Remote Project API', () => {
  let exposedAPI: Record<string, unknown>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Import preload to trigger contextBridge.exposeInMainWorld
    await import('./index');

    // Get the exposed API from the mock call
    const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls[0];
    exposedAPI = exposeCall[1];
  });

  describe('sshConnect', () => {
    it('should expose sshConnect function', () => {
      expect(typeof exposedAPI.sshConnect).toBe('function');
    });

    it('should invoke ssh:connect with URI', async () => {
      const mockResult = { ok: true, value: undefined };
      mockIpcRenderer.invoke.mockResolvedValue(mockResult);

      const result = await (exposedAPI.sshConnect as Function)('ssh://user@host.com/path');

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'ssh:connect',
        'ssh://user@host.com/path'
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('sshDisconnect', () => {
    it('should expose sshDisconnect function', () => {
      expect(typeof exposedAPI.sshDisconnect).toBe('function');
    });

    it('should invoke ssh:disconnect', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(undefined);

      await (exposedAPI.sshDisconnect as Function)();

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('ssh:disconnect');
    });
  });

  describe('getSSHStatus', () => {
    it('should expose getSSHStatus function', () => {
      expect(typeof exposedAPI.getSSHStatus).toBe('function');
    });

    it('should invoke ssh:get-status', async () => {
      mockIpcRenderer.invoke.mockResolvedValue('connected');

      const result = await (exposedAPI.getSSHStatus as Function)();

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('ssh:get-status');
      expect(result).toBe('connected');
    });
  });

  describe('getSSHConnectionInfo', () => {
    it('should expose getSSHConnectionInfo function', () => {
      expect(typeof exposedAPI.getSSHConnectionInfo).toBe('function');
    });

    it('should invoke ssh:get-connection-info', async () => {
      const connectionInfo = {
        host: 'host.com',
        port: 22,
        user: 'user',
        connectedAt: new Date(),
        bytesTransferred: 1024,
      };
      mockIpcRenderer.invoke.mockResolvedValue(connectionInfo);

      const result = await (exposedAPI.getSSHConnectionInfo as Function)();

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('ssh:get-connection-info');
      expect(result).toEqual(connectionInfo);
    });
  });

  describe('getRecentRemoteProjects', () => {
    it('should expose getRecentRemoteProjects function', () => {
      expect(typeof exposedAPI.getRecentRemoteProjects).toBe('function');
    });

    it('should invoke ssh:get-recent-remote-projects', async () => {
      const projects = [
        { uri: 'ssh://user@host.com/path', displayName: 'host.com', lastConnectedAt: '2025-01-01', connectionSuccessful: true },
      ];
      mockIpcRenderer.invoke.mockResolvedValue(projects);

      const result = await (exposedAPI.getRecentRemoteProjects as Function)();

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('ssh:get-recent-remote-projects');
      expect(result).toEqual(projects);
    });
  });

  describe('removeRecentRemoteProject', () => {
    it('should expose removeRecentRemoteProject function', () => {
      expect(typeof exposedAPI.removeRecentRemoteProject).toBe('function');
    });

    it('should invoke ssh:remove-recent-remote-project with URI', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(undefined);

      await (exposedAPI.removeRecentRemoteProject as Function)('ssh://user@host.com/path');

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'ssh:remove-recent-remote-project',
        'ssh://user@host.com/path'
      );
    });
  });

  describe('onSSHStatusChanged', () => {
    it('should expose onSSHStatusChanged function', () => {
      expect(typeof exposedAPI.onSSHStatusChanged).toBe('function');
    });

    it('should register listener for ssh:status-changed', () => {
      const callback = vi.fn();

      (exposedAPI.onSSHStatusChanged as Function)(callback);

      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'ssh:status-changed',
        expect.any(Function)
      );
    });

    it('should return cleanup function that removes listener', () => {
      const callback = vi.fn();

      const cleanup = (exposedAPI.onSSHStatusChanged as Function)(callback);

      expect(typeof cleanup).toBe('function');

      cleanup();

      expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith(
        'ssh:status-changed',
        expect.any(Function)
      );
    });
  });
});

// ============================================================
// Task 7.1: Idle Time Sync API
// Requirements: 4.3 (アイドル検出時キュー追加)
// ============================================================

describe('Preload API - Task 7.1: Idle Time Sync', () => {
  let exposedAPI: Record<string, unknown>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Import preload to trigger contextBridge.exposeInMainWorld
    await import('./index');

    // Get the exposed API from the mock call
    const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls[0];
    exposedAPI = exposeCall[1];
  });

  describe('reportIdleTime', () => {
    it('should expose reportIdleTime function', () => {
      expect(typeof exposedAPI.reportIdleTime).toBe('function');
    });

    it('should invoke schedule-task:report-idle-time with lastActivityTime', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(undefined);

      const lastActivityTime = Date.now();
      await (exposedAPI.reportIdleTime as Function)(lastActivityTime);

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'schedule-task:report-idle-time',
        lastActivityTime
      );
    });

    it('should return Promise<void>', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(undefined);

      const result = await (exposedAPI.reportIdleTime as Function)(Date.now());

      expect(result).toBeUndefined();
    });
  });
});
