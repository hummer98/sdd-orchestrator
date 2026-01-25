/**
 * configHandlers.test.ts
 * Unit tests for config-related IPC handlers
 * Task 1.1: TDD - Write tests first
 * Requirements: 1.1, 2.1, 2.2, 2.3, 4.1, 4.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './channels';
import type { LayoutValues, ConfigStore } from '../services/configStore';
import type { projectConfigService, ProfileConfig, ProjectDefaults } from '../services/layoutConfigService';

// Type definition for layoutConfigService
type LayoutConfigService = typeof projectConfigService;

// Mock electron with app for logger
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  app: {
    isPackaged: false,
    getPath: vi.fn(() => '/tmp'),
  },
}));

// Mock logger to avoid file system operations
vi.mock('../services/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('configHandlers', () => {
  // Mock services
  let mockConfigStore: {
    getHangThreshold: ReturnType<typeof vi.fn>;
    setHangThreshold: ReturnType<typeof vi.fn>;
    getLayout: ReturnType<typeof vi.fn>;
    setLayout: ReturnType<typeof vi.fn>;
    resetLayout: ReturnType<typeof vi.fn>;
  };

  let mockLayoutConfigService: {
    loadSkipPermissions: ReturnType<typeof vi.fn>;
    saveSkipPermissions: ReturnType<typeof vi.fn>;
    loadProjectDefaults: ReturnType<typeof vi.fn>;
    saveProjectDefaults: ReturnType<typeof vi.fn>;
    loadProfile: ReturnType<typeof vi.fn>;
  };

  // Store registered handlers for testing
  const registeredHandlers: Map<string, (...args: unknown[]) => Promise<unknown>> = new Map();

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset handlers map
    registeredHandlers.clear();

    // Capture registered handlers
    vi.mocked(ipcMain.handle).mockImplementation((channel: string, handler: (...args: unknown[]) => Promise<unknown>) => {
      registeredHandlers.set(channel, handler);
      return undefined as unknown as Electron.IpcMain;
    });

    // Initialize mock services
    mockConfigStore = {
      getHangThreshold: vi.fn(),
      setHangThreshold: vi.fn(),
      getLayout: vi.fn(),
      setLayout: vi.fn(),
      resetLayout: vi.fn(),
    };

    mockLayoutConfigService = {
      loadSkipPermissions: vi.fn(),
      saveSkipPermissions: vi.fn(),
      loadProjectDefaults: vi.fn(),
      saveProjectDefaults: vi.fn(),
      loadProfile: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('registerConfigHandlers', () => {
    it('should register all config-related IPC handlers', async () => {
      // Import the module (which will be implemented)
      const { registerConfigHandlers } = await import('./configHandlers');

      // Register handlers with mock dependencies
      registerConfigHandlers({
        configStore: mockConfigStore as unknown as ConfigStore,
        layoutConfigService: mockLayoutConfigService as unknown as LayoutConfigService,
      });

      // Verify all config handlers are registered
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.GET_HANG_THRESHOLD, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.SET_HANG_THRESHOLD, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.LOAD_LAYOUT_CONFIG, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.SAVE_LAYOUT_CONFIG, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.RESET_LAYOUT_CONFIG, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.LOAD_SKIP_PERMISSIONS, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.SAVE_SKIP_PERMISSIONS, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.LOAD_PROJECT_DEFAULTS, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.SAVE_PROJECT_DEFAULTS, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.LOAD_PROFILE, expect.any(Function));
    });
  });

  describe('GET_HANG_THRESHOLD handler', () => {
    it('should return hang threshold from configStore', async () => {
      const { registerConfigHandlers } = await import('./configHandlers');

      mockConfigStore.getHangThreshold.mockReturnValue(300000);

      registerConfigHandlers({
        configStore: mockConfigStore as unknown as ConfigStore,
        layoutConfigService: mockLayoutConfigService as unknown as LayoutConfigService,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.GET_HANG_THRESHOLD);
      expect(handler).toBeDefined();

      const result = await handler!({} as Electron.IpcMainInvokeEvent);
      expect(result).toBe(300000);
      expect(mockConfigStore.getHangThreshold).toHaveBeenCalled();
    });
  });

  describe('SET_HANG_THRESHOLD handler', () => {
    it('should set hang threshold via configStore', async () => {
      const { registerConfigHandlers } = await import('./configHandlers');

      registerConfigHandlers({
        configStore: mockConfigStore as unknown as ConfigStore,
        layoutConfigService: mockLayoutConfigService as unknown as LayoutConfigService,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.SET_HANG_THRESHOLD);
      expect(handler).toBeDefined();

      await handler!({} as Electron.IpcMainInvokeEvent, 600000);
      expect(mockConfigStore.setHangThreshold).toHaveBeenCalledWith(600000);
    });
  });

  describe('LOAD_LAYOUT_CONFIG handler', () => {
    it('should return layout config from configStore', async () => {
      const { registerConfigHandlers } = await import('./configHandlers');

      const mockLayout: LayoutValues = {
        leftPaneWidth: 320,
        rightPaneWidth: 360,
        bottomPaneHeight: 240,
        agentListHeight: 200,
      };
      mockConfigStore.getLayout.mockReturnValue(mockLayout);

      registerConfigHandlers({
        configStore: mockConfigStore as unknown as ConfigStore,
        layoutConfigService: mockLayoutConfigService as unknown as LayoutConfigService,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.LOAD_LAYOUT_CONFIG);
      expect(handler).toBeDefined();

      const result = await handler!({} as Electron.IpcMainInvokeEvent);
      expect(result).toEqual(mockLayout);
      expect(mockConfigStore.getLayout).toHaveBeenCalled();
    });

    it('should return null when no layout is configured', async () => {
      const { registerConfigHandlers } = await import('./configHandlers');

      mockConfigStore.getLayout.mockReturnValue(null);

      registerConfigHandlers({
        configStore: mockConfigStore as unknown as ConfigStore,
        layoutConfigService: mockLayoutConfigService as unknown as LayoutConfigService,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.LOAD_LAYOUT_CONFIG);
      const result = await handler!({} as Electron.IpcMainInvokeEvent);
      expect(result).toBeNull();
    });
  });

  describe('SAVE_LAYOUT_CONFIG handler', () => {
    it('should save layout config via configStore', async () => {
      const { registerConfigHandlers } = await import('./configHandlers');

      registerConfigHandlers({
        configStore: mockConfigStore as unknown as ConfigStore,
        layoutConfigService: mockLayoutConfigService as unknown as LayoutConfigService,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.SAVE_LAYOUT_CONFIG);
      expect(handler).toBeDefined();

      const layout: LayoutValues = {
        leftPaneWidth: 400,
        rightPaneWidth: 400,
        bottomPaneHeight: 300,
        agentListHeight: 250,
      };
      await handler!({} as Electron.IpcMainInvokeEvent, layout);
      expect(mockConfigStore.setLayout).toHaveBeenCalledWith(layout);
    });
  });

  describe('RESET_LAYOUT_CONFIG handler', () => {
    it('should reset layout config via configStore', async () => {
      const { registerConfigHandlers } = await import('./configHandlers');

      registerConfigHandlers({
        configStore: mockConfigStore as unknown as ConfigStore,
        layoutConfigService: mockLayoutConfigService as unknown as LayoutConfigService,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.RESET_LAYOUT_CONFIG);
      expect(handler).toBeDefined();

      await handler!({} as Electron.IpcMainInvokeEvent);
      expect(mockConfigStore.resetLayout).toHaveBeenCalled();
    });
  });

  describe('LOAD_SKIP_PERMISSIONS handler', () => {
    it('should return skip permissions from layoutConfigService', async () => {
      const { registerConfigHandlers } = await import('./configHandlers');

      mockLayoutConfigService.loadSkipPermissions.mockResolvedValue(true);

      registerConfigHandlers({
        configStore: mockConfigStore as unknown as ConfigStore,
        layoutConfigService: mockLayoutConfigService as unknown as LayoutConfigService,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.LOAD_SKIP_PERMISSIONS);
      expect(handler).toBeDefined();

      const result = await handler!({} as Electron.IpcMainInvokeEvent, '/path/to/project');
      expect(result).toBe(true);
      expect(mockLayoutConfigService.loadSkipPermissions).toHaveBeenCalledWith('/path/to/project');
    });
  });

  describe('SAVE_SKIP_PERMISSIONS handler', () => {
    it('should save skip permissions via layoutConfigService', async () => {
      const { registerConfigHandlers } = await import('./configHandlers');

      registerConfigHandlers({
        configStore: mockConfigStore as unknown as ConfigStore,
        layoutConfigService: mockLayoutConfigService as unknown as LayoutConfigService,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.SAVE_SKIP_PERMISSIONS);
      expect(handler).toBeDefined();

      await handler!({} as Electron.IpcMainInvokeEvent, '/path/to/project', true);
      expect(mockLayoutConfigService.saveSkipPermissions).toHaveBeenCalledWith('/path/to/project', true);
    });
  });

  describe('LOAD_PROJECT_DEFAULTS handler', () => {
    it('should return project defaults from layoutConfigService', async () => {
      const { registerConfigHandlers } = await import('./configHandlers');

      const mockDefaults: ProjectDefaults = {
        documentReview: { scheme: 'claude-code' },
      };
      mockLayoutConfigService.loadProjectDefaults.mockResolvedValue(mockDefaults);

      registerConfigHandlers({
        configStore: mockConfigStore as unknown as ConfigStore,
        layoutConfigService: mockLayoutConfigService as unknown as LayoutConfigService,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.LOAD_PROJECT_DEFAULTS);
      expect(handler).toBeDefined();

      const result = await handler!({} as Electron.IpcMainInvokeEvent, '/path/to/project');
      expect(result).toEqual(mockDefaults);
      expect(mockLayoutConfigService.loadProjectDefaults).toHaveBeenCalledWith('/path/to/project');
    });

    it('should return undefined when no defaults are configured', async () => {
      const { registerConfigHandlers } = await import('./configHandlers');

      mockLayoutConfigService.loadProjectDefaults.mockResolvedValue(undefined);

      registerConfigHandlers({
        configStore: mockConfigStore as unknown as ConfigStore,
        layoutConfigService: mockLayoutConfigService as unknown as LayoutConfigService,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.LOAD_PROJECT_DEFAULTS);
      const result = await handler!({} as Electron.IpcMainInvokeEvent, '/path/to/project');
      expect(result).toBeUndefined();
    });
  });

  describe('SAVE_PROJECT_DEFAULTS handler', () => {
    it('should save project defaults via layoutConfigService', async () => {
      const { registerConfigHandlers } = await import('./configHandlers');

      registerConfigHandlers({
        configStore: mockConfigStore as unknown as ConfigStore,
        layoutConfigService: mockLayoutConfigService as unknown as LayoutConfigService,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.SAVE_PROJECT_DEFAULTS);
      expect(handler).toBeDefined();

      const defaults: ProjectDefaults = {
        documentReview: { scheme: 'gemini-cli' },
      };
      await handler!({} as Electron.IpcMainInvokeEvent, '/path/to/project', defaults);
      expect(mockLayoutConfigService.saveProjectDefaults).toHaveBeenCalledWith('/path/to/project', defaults);
    });
  });

  describe('LOAD_PROFILE handler', () => {
    it('should return profile from layoutConfigService', async () => {
      const { registerConfigHandlers } = await import('./configHandlers');

      const mockProfile: ProfileConfig = {
        name: 'cc-sdd',
        installedAt: '2026-01-25T00:00:00Z',
      };
      mockLayoutConfigService.loadProfile.mockResolvedValue(mockProfile);

      registerConfigHandlers({
        configStore: mockConfigStore as unknown as ConfigStore,
        layoutConfigService: mockLayoutConfigService as unknown as LayoutConfigService,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.LOAD_PROFILE);
      expect(handler).toBeDefined();

      const result = await handler!({} as Electron.IpcMainInvokeEvent, '/path/to/project');
      expect(result).toEqual(mockProfile);
      expect(mockLayoutConfigService.loadProfile).toHaveBeenCalledWith('/path/to/project');
    });

    it('should return null when no profile is configured', async () => {
      const { registerConfigHandlers } = await import('./configHandlers');

      mockLayoutConfigService.loadProfile.mockResolvedValue(null);

      registerConfigHandlers({
        configStore: mockConfigStore as unknown as ConfigStore,
        layoutConfigService: mockLayoutConfigService as unknown as LayoutConfigService,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.LOAD_PROFILE);
      const result = await handler!({} as Electron.IpcMainInvokeEvent, '/path/to/project');
      expect(result).toBeNull();
    });
  });

  describe('ConfigHandlersDependencies interface', () => {
    it('should accept mock dependencies with proper interface', async () => {
      const { registerConfigHandlers } = await import('./configHandlers');

      // This test verifies the interface by ensuring our mock matches it
      const dependencies = {
        configStore: mockConfigStore as unknown as ConfigStore,
        layoutConfigService: mockLayoutConfigService as unknown as LayoutConfigService,
      };

      // Should not throw
      expect(() => registerConfigHandlers(dependencies)).not.toThrow();
    });
  });
});
