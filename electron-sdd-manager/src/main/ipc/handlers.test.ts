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

// ============================================================
// Unified Project Selection (unified-project-selection feature)
// Requirements: 1.1, 1.2, 1.6, 5.1-5.4, 6.1-6.4
// ============================================================

describe('IPC Handlers - Unified Project Selection (Task 1.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SELECT_PROJECT channel', () => {
    it('should define SELECT_PROJECT channel constant', async () => {
      const { IPC_CHANNELS } = await import('./channels');
      expect(IPC_CHANNELS.SELECT_PROJECT).toBe('ipc:select-project');
    });

    it('should register select-project handler', async () => {
      const { registerIpcHandlers } = await import('./handlers');
      registerIpcHandlers();

      const handleCalls = (ipcMain.handle as any).mock.calls;
      const hasSelectProject = handleCalls.some(
        ([channel]: [string]) => channel === 'ipc:select-project'
      );
      expect(hasSelectProject).toBe(true);
    });
  });
});

describe('Project Path Validation (Task 1.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate path exists before selection', async () => {
    // This test verifies that selectProject returns PATH_NOT_EXISTS error
    // when the specified path does not exist on the filesystem
    const { validateProjectPath } = await import('./handlers');
    const result = await validateProjectPath('/nonexistent/path');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('PATH_NOT_EXISTS');
    }
  });

  it('should validate path is a directory', async () => {
    // This test verifies that selectProject returns NOT_A_DIRECTORY error
    // when the specified path is a file, not a directory
    const { validateProjectPath } = await import('./handlers');
    // Use a known file path for testing
    const result = await validateProjectPath('/etc/hosts');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('NOT_A_DIRECTORY');
    }
  });

  it('should return success for valid directory path', async () => {
    const { validateProjectPath } = await import('./handlers');
    // Use a known directory path
    const result = await validateProjectPath('/tmp');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('/tmp');
    }
  });
});

describe('Project Initialization (Task 1.3)', () => {
  it('should export selectProject function', async () => {
    const { selectProject } = await import('./handlers');
    expect(typeof selectProject).toBe('function');
  });

  it('should return SelectProjectResult type with all required fields', async () => {
    // The selectProject function should return a result with projectPath, kiroValidation, specs, bugs
    const { selectProject } = await import('./handlers');
    const result = await selectProject('/tmp');

    // Check required fields exist
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('projectPath');
    expect(result).toHaveProperty('kiroValidation');
    expect(result).toHaveProperty('specs');
    expect(result).toHaveProperty('bugs');
  });

  it('should return error result for non-existent path', async () => {
    const { selectProject } = await import('./handlers');
    const result = await selectProject('/nonexistent/path');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.type).toBe('PATH_NOT_EXISTS');
  });
});

describe('Exclusive Control (Task 1.5)', () => {
  it('should export isProjectSelectionInProgress function', async () => {
    const { isProjectSelectionInProgress } = await import('./handlers');
    expect(typeof isProjectSelectionInProgress).toBe('function');
  });

  it('should return false when no selection is in progress', async () => {
    const { isProjectSelectionInProgress, resetProjectSelectionLock } = await import('./handlers');
    resetProjectSelectionLock(); // Reset for clean state
    expect(isProjectSelectionInProgress()).toBe(false);
  });

  it('should prevent concurrent project selections', async () => {
    const { selectProject, isProjectSelectionInProgress, setProjectSelectionLock, resetProjectSelectionLock } = await import('./handlers');
    resetProjectSelectionLock(); // Reset for clean state

    // Simulate a lock being held
    setProjectSelectionLock(true);

    // Attempt another selection - should fail with SELECTION_IN_PROGRESS
    const result = await selectProject('/tmp');

    expect(result.success).toBe(false);
    expect(result.error?.type).toBe('SELECTION_IN_PROGRESS');

    resetProjectSelectionLock(); // Cleanup
  });
});
