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

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'ipc:resume-agent',
        'agent-123',
        undefined
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
