/**
 * IPC Handlers Tests
 * TDD: Testing IPC handlers for Agent management and configuration
 * Requirements: 5.1-5.8, 9.1-9.10, 10.1-10.3, 13.1, 13.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ipcMain } from 'electron';

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
    removeHandler: vi.fn(),
    removeListener: vi.fn(),
  },
  dialog: {
    showOpenDialog: vi.fn(),
  },
  app: {
    getVersion: vi.fn().mockReturnValue('0.1.0'),
    getPath: vi.fn().mockReturnValue('/tmp'),
  },
  BrowserWindow: {
    fromWebContents: vi.fn(),
    getAllWindows: vi.fn().mockReturnValue([]),
  },
}));

// Mock services
vi.mock('../services/configStore', () => ({
  getConfigStore: vi.fn(() => ({
    getRecentProjects: vi.fn().mockReturnValue([]),
    addRecentProject: vi.fn(),
    getHangThreshold: vi.fn().mockReturnValue(300000),
    setHangThreshold: vi.fn(),
  })),
}));

vi.mock('../menu', () => ({
  updateMenu: vi.fn(),
}));

describe('IPC Handlers - Agent Management (Task 27.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('start-agent channel', () => {
    it('should register start-agent handler', async () => {
      const { registerIpcHandlers } = await import('./handlers');
      registerIpcHandlers();

      const handleCalls = (ipcMain.handle as any).mock.calls;
      const hasStartAgent = handleCalls.some(
        ([channel]: [string]) => channel === 'ipc:start-agent'
      );
      expect(hasStartAgent).toBe(true);
    });
  });

  describe('stop-agent channel', () => {
    it('should register stop-agent handler', async () => {
      const { registerIpcHandlers } = await import('./handlers');
      registerIpcHandlers();

      const handleCalls = (ipcMain.handle as any).mock.calls;
      const hasStopAgent = handleCalls.some(
        ([channel]: [string]) => channel === 'ipc:stop-agent'
      );
      expect(hasStopAgent).toBe(true);
    });
  });

  describe('resume-agent channel', () => {
    it('should register resume-agent handler', async () => {
      const { registerIpcHandlers } = await import('./handlers');
      registerIpcHandlers();

      const handleCalls = (ipcMain.handle as any).mock.calls;
      const hasResumeAgent = handleCalls.some(
        ([channel]: [string]) => channel === 'ipc:resume-agent'
      );
      expect(hasResumeAgent).toBe(true);
    });
  });

  describe('get-agents channel', () => {
    it('should register get-agents handler', async () => {
      const { registerIpcHandlers } = await import('./handlers');
      registerIpcHandlers();

      const handleCalls = (ipcMain.handle as any).mock.calls;
      const hasGetAgents = handleCalls.some(
        ([channel]: [string]) => channel === 'ipc:get-agents'
      );
      expect(hasGetAgents).toBe(true);
    });
  });

  describe('get-all-agents channel', () => {
    it('should register get-all-agents handler', async () => {
      const { registerIpcHandlers } = await import('./handlers');
      registerIpcHandlers();

      const handleCalls = (ipcMain.handle as any).mock.calls;
      const hasGetAllAgents = handleCalls.some(
        ([channel]: [string]) => channel === 'ipc:get-all-agents'
      );
      expect(hasGetAllAgents).toBe(true);
    });
  });

  describe('send-agent-input channel', () => {
    it('should register send-agent-input handler', async () => {
      const { registerIpcHandlers } = await import('./handlers');
      registerIpcHandlers();

      const handleCalls = (ipcMain.handle as any).mock.calls;
      const hasSendAgentInput = handleCalls.some(
        ([channel]: [string]) => channel === 'ipc:send-agent-input'
      );
      expect(hasSendAgentInput).toBe(true);
    });
  });
});

describe('IPC Handlers - Agent Events (Task 27.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('agent-output event channel', () => {
    it('should define agent-output channel constant', async () => {
      const { IPC_CHANNELS } = await import('./channels');
      expect(IPC_CHANNELS.AGENT_OUTPUT).toBe('ipc:agent-output');
    });
  });

  describe('agent-status-change event channel', () => {
    it('should define agent-status-change channel constant', async () => {
      const { IPC_CHANNELS } = await import('./channels');
      expect(IPC_CHANNELS.AGENT_STATUS_CHANGE).toBe('ipc:agent-status-change');
    });
  });
});

describe('IPC Handlers - Configuration (Task 27.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('get-hang-threshold channel', () => {
    it('should register get-hang-threshold handler', async () => {
      const { registerIpcHandlers } = await import('./handlers');
      registerIpcHandlers();

      const handleCalls = (ipcMain.handle as any).mock.calls;
      const hasGetHangThreshold = handleCalls.some(
        ([channel]: [string]) => channel === 'ipc:get-hang-threshold'
      );
      expect(hasGetHangThreshold).toBe(true);
    });
  });

  describe('set-hang-threshold channel', () => {
    it('should register set-hang-threshold handler', async () => {
      const { registerIpcHandlers } = await import('./handlers');
      registerIpcHandlers();

      const handleCalls = (ipcMain.handle as any).mock.calls;
      const hasSetHangThreshold = handleCalls.some(
        ([channel]: [string]) => channel === 'ipc:set-hang-threshold'
      );
      expect(hasSetHangThreshold).toBe(true);
    });
  });
});

describe('IPC Channel Constants', () => {
  it('should export all required channel constants', async () => {
    const { IPC_CHANNELS } = await import('./channels');

    // Agent management channels (Task 27.1)
    expect(IPC_CHANNELS.START_AGENT).toBe('ipc:start-agent');
    expect(IPC_CHANNELS.STOP_AGENT).toBe('ipc:stop-agent');
    expect(IPC_CHANNELS.RESUME_AGENT).toBe('ipc:resume-agent');
    expect(IPC_CHANNELS.GET_AGENTS).toBe('ipc:get-agents');
    expect(IPC_CHANNELS.GET_ALL_AGENTS).toBe('ipc:get-all-agents');
    expect(IPC_CHANNELS.SEND_AGENT_INPUT).toBe('ipc:send-agent-input');

    // Agent event channels (Task 27.2)
    expect(IPC_CHANNELS.AGENT_OUTPUT).toBe('ipc:agent-output');
    expect(IPC_CHANNELS.AGENT_STATUS_CHANGE).toBe('ipc:agent-status-change');

    // Config channels (Task 27.3)
    expect(IPC_CHANNELS.GET_HANG_THRESHOLD).toBe('ipc:get-hang-threshold');
    expect(IPC_CHANNELS.SET_HANG_THRESHOLD).toBe('ipc:set-hang-threshold');
  });
});
