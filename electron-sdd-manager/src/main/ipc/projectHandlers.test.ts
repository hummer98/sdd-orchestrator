/**
 * Project Handlers Unit Tests
 *
 * Task 4.1: projectHandlers.ts のユニットテスト
 * Requirements: 1.4, 2.1, 2.2, 2.3, 4.1, 4.2, 6.2
 *
 * TDD Approach: Tests written before implementation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { IpcMainInvokeEvent } from 'electron';
import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './channels';

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  app: {
    isPackaged: false,
    getVersion: vi.fn().mockReturnValue('1.0.0-test'),
    getPath: vi.fn(() => '/tmp'),
  },
  shell: {
    openPath: vi.fn().mockResolvedValue(''),
  },
  BrowserWindow: {
    fromWebContents: vi.fn().mockReturnValue({ id: 1 }),
  },
}));

// Mock path module
vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return {
    ...actual,
    dirname: (p: string) => p.split('/').slice(0, -1).join('/'),
  };
});

// Mock fs/promises - simple auto-mock
vi.mock('fs/promises');
import * as fsPromises from 'fs/promises';
const mockFs = vi.mocked(fsPromises);

// Mock logger
vi.mock('../services/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock projectLogger
const mockGetProjectLogPath = vi.fn().mockReturnValue('/test/project/.kiro/logs/main.log');
vi.mock('../services/projectLogger', () => ({
  projectLogger: {
    getProjectLogPath: mockGetProjectLogPath,
  },
}));

// Mock menu
vi.mock('../menu', () => ({
  updateMenu: vi.fn(),
}));

// Mock permissionsService
const mockAddShellPermissions = vi.fn().mockResolvedValue({ ok: true, value: true });
const mockAddPermissionsToProject = vi.fn().mockResolvedValue({ ok: true, value: true });
const mockCheckRequiredPermissions = vi.fn().mockResolvedValue({
  ok: true,
  value: { allPresent: true, missing: [], present: ['read', 'write'] },
});
vi.mock('../services/permissionsService', () => ({
  addShellPermissions: mockAddShellPermissions,
  addPermissionsToProject: mockAddPermissionsToProject,
  checkRequiredPermissions: mockCheckRequiredPermissions,
}));

// Mock projectChecker
vi.mock('../services/projectChecker', () => ({
  REQUIRED_PERMISSIONS: ['read', 'write'],
}));

describe('projectHandlers', () => {
  // Store registered handlers for testing
  const registeredHandlers: Map<string, (...args: unknown[]) => Promise<unknown>> = new Map();

  // Mock dependencies
  let mockFileService: {
    validateKiroDirectory: ReturnType<typeof vi.fn>;
  };

  let mockConfigStore: {
    getRecentProjects: ReturnType<typeof vi.fn>;
    addRecentProject: ReturnType<typeof vi.fn>;
  };

  let mockGetCurrentProjectPath: ReturnType<typeof vi.fn>;
  let mockSetProjectPath: ReturnType<typeof vi.fn>;
  let mockSelectProject: ReturnType<typeof vi.fn>;
  let mockGetInitialProjectPath: ReturnType<typeof vi.fn>;
  let mockStartSpecsWatcher: ReturnType<typeof vi.fn>;
  let mockStartAgentRecordWatcher: ReturnType<typeof vi.fn>;
  let mockStartBugsWatcher: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset handlers map
    registeredHandlers.clear();

    // Reset fs/promises mocks
    mockFs.access.mockResolvedValue(undefined);
    mockFs.stat.mockResolvedValue({ isDirectory: () => true } as unknown as import('fs').Stats);
    mockFs.readdir.mockResolvedValue([]);

    // Reset permissions mocks
    mockAddShellPermissions.mockResolvedValue({ ok: true, value: true });
    mockAddPermissionsToProject.mockResolvedValue({ ok: true, value: true });
    mockCheckRequiredPermissions.mockResolvedValue({
      ok: true,
      value: { allPresent: true, missing: [], present: ['read', 'write'] },
    });

    // Capture registered handlers
    vi.mocked(ipcMain.handle).mockImplementation((channel: string, handler: (...args: unknown[]) => Promise<unknown>) => {
      registeredHandlers.set(channel, handler);
      return undefined as unknown as Electron.IpcMain;
    });

    // Initialize mock dependencies
    mockFileService = {
      validateKiroDirectory: vi.fn().mockResolvedValue({ exists: true, hasSpecs: true, hasSteering: true }),
    };

    mockConfigStore = {
      getRecentProjects: vi.fn().mockReturnValue(['/project1', '/project2']),
      addRecentProject: vi.fn(),
    };

    mockGetCurrentProjectPath = vi.fn().mockReturnValue('/test/project');
    mockSetProjectPath = vi.fn().mockResolvedValue(undefined);
    mockSelectProject = vi.fn().mockResolvedValue({
      success: true,
      projectPath: '/test/project',
      kiroValidation: { exists: true, hasSpecs: true, hasSteering: true },
      specs: [],
      bugs: [],
      specJsonMap: {},
    });
    mockGetInitialProjectPath = vi.fn().mockReturnValue('/initial/project');
    mockStartSpecsWatcher = vi.fn().mockResolvedValue(undefined);
    mockStartAgentRecordWatcher = vi.fn();
    mockStartBugsWatcher = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('registerProjectHandlers', () => {
    it('should register all project-related IPC handlers', async () => {
      const { registerProjectHandlers } = await import('./projectHandlers');

      registerProjectHandlers({
        fileService: mockFileService as unknown as import('../services/fileService').FileService,
        configStore: mockConfigStore as unknown as import('../services/configStore').ConfigStore,
        getCurrentProjectPath: mockGetCurrentProjectPath,
        setProjectPath: mockSetProjectPath,
        selectProject: mockSelectProject,
        getInitialProjectPath: mockGetInitialProjectPath,
        startSpecsWatcher: mockStartSpecsWatcher,
        startAgentRecordWatcher: mockStartAgentRecordWatcher,
        startBugsWatcher: mockStartBugsWatcher,
      });

      // Verify expected handlers are registered
      expect(registeredHandlers.has(IPC_CHANNELS.VALIDATE_KIRO_DIRECTORY)).toBe(true);
      expect(registeredHandlers.has(IPC_CHANNELS.SET_PROJECT_PATH)).toBe(true);
      expect(registeredHandlers.has(IPC_CHANNELS.SELECT_PROJECT)).toBe(true);
      expect(registeredHandlers.has(IPC_CHANNELS.GET_RECENT_PROJECTS)).toBe(true);
      expect(registeredHandlers.has(IPC_CHANNELS.ADD_RECENT_PROJECT)).toBe(true);
      expect(registeredHandlers.has(IPC_CHANNELS.GET_APP_VERSION)).toBe(true);
      expect(registeredHandlers.has(IPC_CHANNELS.GET_PLATFORM)).toBe(true);
      expect(registeredHandlers.has(IPC_CHANNELS.GET_INITIAL_PROJECT_PATH)).toBe(true);
      expect(registeredHandlers.has(IPC_CHANNELS.GET_IS_E2E_TEST)).toBe(true);
      expect(registeredHandlers.has(IPC_CHANNELS.GET_PROJECT_LOG_PATH)).toBe(true);
      expect(registeredHandlers.has(IPC_CHANNELS.OPEN_LOG_IN_BROWSER)).toBe(true);
      expect(registeredHandlers.has(IPC_CHANNELS.ADD_SHELL_PERMISSIONS)).toBe(true);
      expect(registeredHandlers.has(IPC_CHANNELS.ADD_MISSING_PERMISSIONS)).toBe(true);
      expect(registeredHandlers.has(IPC_CHANNELS.CHECK_REQUIRED_PERMISSIONS)).toBe(true);
    });

    it('should call ipcMain.handle for each channel', async () => {
      const { registerProjectHandlers } = await import('./projectHandlers');

      registerProjectHandlers({
        fileService: mockFileService as unknown as import('../services/fileService').FileService,
        configStore: mockConfigStore as unknown as import('../services/configStore').ConfigStore,
        getCurrentProjectPath: mockGetCurrentProjectPath,
        setProjectPath: mockSetProjectPath,
        selectProject: mockSelectProject,
        getInitialProjectPath: mockGetInitialProjectPath,
        startSpecsWatcher: mockStartSpecsWatcher,
        startAgentRecordWatcher: mockStartAgentRecordWatcher,
        startBugsWatcher: mockStartBugsWatcher,
      });

      // Check total number of handlers registered
      expect(ipcMain.handle).toHaveBeenCalledTimes(14);
    });
  });

  describe('VALIDATE_KIRO_DIRECTORY handler', () => {
    it('should call fileService.validateKiroDirectory with the provided path', async () => {
      const { registerProjectHandlers } = await import('./projectHandlers');

      registerProjectHandlers({
        fileService: mockFileService as unknown as import('../services/fileService').FileService,
        configStore: mockConfigStore as unknown as import('../services/configStore').ConfigStore,
        getCurrentProjectPath: mockGetCurrentProjectPath,
        setProjectPath: mockSetProjectPath,
        selectProject: mockSelectProject,
        getInitialProjectPath: mockGetInitialProjectPath,
        startSpecsWatcher: mockStartSpecsWatcher,
        startAgentRecordWatcher: mockStartAgentRecordWatcher,
        startBugsWatcher: mockStartBugsWatcher,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.VALIDATE_KIRO_DIRECTORY);
      expect(handler).toBeDefined();

      const mockEvent = {} as IpcMainInvokeEvent;
      await handler!(mockEvent, '/test/path');

      expect(mockFileService.validateKiroDirectory).toHaveBeenCalledWith('/test/path');
    });
  });

  describe('SET_PROJECT_PATH handler', () => {
    it('should call setProjectPath with the provided path', async () => {
      const { registerProjectHandlers } = await import('./projectHandlers');

      registerProjectHandlers({
        fileService: mockFileService as unknown as import('../services/fileService').FileService,
        configStore: mockConfigStore as unknown as import('../services/configStore').ConfigStore,
        getCurrentProjectPath: mockGetCurrentProjectPath,
        setProjectPath: mockSetProjectPath,
        selectProject: mockSelectProject,
        getInitialProjectPath: mockGetInitialProjectPath,
        startSpecsWatcher: mockStartSpecsWatcher,
        startAgentRecordWatcher: mockStartAgentRecordWatcher,
        startBugsWatcher: mockStartBugsWatcher,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.SET_PROJECT_PATH);
      expect(handler).toBeDefined();

      const mockEvent = {} as IpcMainInvokeEvent;
      await handler!(mockEvent, '/new/project/path');

      expect(mockSetProjectPath).toHaveBeenCalledWith('/new/project/path');
    });
  });

  describe('SELECT_PROJECT handler', () => {
    it('should call selectProject and return result', async () => {
      const { registerProjectHandlers } = await import('./projectHandlers');

      registerProjectHandlers({
        fileService: mockFileService as unknown as import('../services/fileService').FileService,
        configStore: mockConfigStore as unknown as import('../services/configStore').ConfigStore,
        getCurrentProjectPath: mockGetCurrentProjectPath,
        setProjectPath: mockSetProjectPath,
        selectProject: mockSelectProject,
        getInitialProjectPath: mockGetInitialProjectPath,
        startSpecsWatcher: mockStartSpecsWatcher,
        startAgentRecordWatcher: mockStartAgentRecordWatcher,
        startBugsWatcher: mockStartBugsWatcher,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.SELECT_PROJECT);
      expect(handler).toBeDefined();

      const mockEvent = { sender: {} } as IpcMainInvokeEvent;
      const result = await handler!(mockEvent, '/test/project');

      expect(mockSelectProject).toHaveBeenCalledWith('/test/project');
      expect(result).toEqual({
        success: true,
        projectPath: '/test/project',
        kiroValidation: { exists: true, hasSpecs: true, hasSteering: true },
        specs: [],
        bugs: [],
        specJsonMap: {},
      });
    });

    it('should start file watchers on successful selection', async () => {
      const { registerProjectHandlers } = await import('./projectHandlers');

      registerProjectHandlers({
        fileService: mockFileService as unknown as import('../services/fileService').FileService,
        configStore: mockConfigStore as unknown as import('../services/configStore').ConfigStore,
        getCurrentProjectPath: mockGetCurrentProjectPath,
        setProjectPath: mockSetProjectPath,
        selectProject: mockSelectProject,
        getInitialProjectPath: mockGetInitialProjectPath,
        startSpecsWatcher: mockStartSpecsWatcher,
        startAgentRecordWatcher: mockStartAgentRecordWatcher,
        startBugsWatcher: mockStartBugsWatcher,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.SELECT_PROJECT);
      const mockEvent = { sender: {} } as IpcMainInvokeEvent;
      await handler!(mockEvent, '/test/project');

      expect(mockStartSpecsWatcher).toHaveBeenCalled();
      expect(mockStartAgentRecordWatcher).toHaveBeenCalled();
      expect(mockStartBugsWatcher).toHaveBeenCalled();
    });
  });

  describe('GET_RECENT_PROJECTS handler', () => {
    it('should return recent projects from configStore', async () => {
      const { registerProjectHandlers } = await import('./projectHandlers');

      registerProjectHandlers({
        fileService: mockFileService as unknown as import('../services/fileService').FileService,
        configStore: mockConfigStore as unknown as import('../services/configStore').ConfigStore,
        getCurrentProjectPath: mockGetCurrentProjectPath,
        setProjectPath: mockSetProjectPath,
        selectProject: mockSelectProject,
        getInitialProjectPath: mockGetInitialProjectPath,
        startSpecsWatcher: mockStartSpecsWatcher,
        startAgentRecordWatcher: mockStartAgentRecordWatcher,
        startBugsWatcher: mockStartBugsWatcher,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.GET_RECENT_PROJECTS);
      expect(handler).toBeDefined();

      const mockEvent = {} as IpcMainInvokeEvent;
      const result = await handler!(mockEvent);

      expect(mockConfigStore.getRecentProjects).toHaveBeenCalled();
      expect(result).toEqual(['/project1', '/project2']);
    });
  });

  describe('ADD_RECENT_PROJECT handler', () => {
    it('should add project to recent projects and update menu', async () => {
      const { registerProjectHandlers } = await import('./projectHandlers');

      registerProjectHandlers({
        fileService: mockFileService as unknown as import('../services/fileService').FileService,
        configStore: mockConfigStore as unknown as import('../services/configStore').ConfigStore,
        getCurrentProjectPath: mockGetCurrentProjectPath,
        setProjectPath: mockSetProjectPath,
        selectProject: mockSelectProject,
        getInitialProjectPath: mockGetInitialProjectPath,
        startSpecsWatcher: mockStartSpecsWatcher,
        startAgentRecordWatcher: mockStartAgentRecordWatcher,
        startBugsWatcher: mockStartBugsWatcher,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.ADD_RECENT_PROJECT);
      expect(handler).toBeDefined();

      const mockEvent = {} as IpcMainInvokeEvent;
      await handler!(mockEvent, '/new/project');

      expect(mockConfigStore.addRecentProject).toHaveBeenCalledWith('/new/project');
    });
  });

  describe('GET_APP_VERSION handler', () => {
    it('should return app version', async () => {
      const { registerProjectHandlers } = await import('./projectHandlers');
      const { app } = await import('electron');

      registerProjectHandlers({
        fileService: mockFileService as unknown as import('../services/fileService').FileService,
        configStore: mockConfigStore as unknown as import('../services/configStore').ConfigStore,
        getCurrentProjectPath: mockGetCurrentProjectPath,
        setProjectPath: mockSetProjectPath,
        selectProject: mockSelectProject,
        getInitialProjectPath: mockGetInitialProjectPath,
        startSpecsWatcher: mockStartSpecsWatcher,
        startAgentRecordWatcher: mockStartAgentRecordWatcher,
        startBugsWatcher: mockStartBugsWatcher,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.GET_APP_VERSION);
      expect(handler).toBeDefined();

      const mockEvent = {} as IpcMainInvokeEvent;
      const result = await handler!(mockEvent);

      expect(app.getVersion).toHaveBeenCalled();
      expect(result).toBe('1.0.0-test');
    });
  });

  describe('GET_PLATFORM handler', () => {
    it('should return process platform', async () => {
      const { registerProjectHandlers } = await import('./projectHandlers');

      registerProjectHandlers({
        fileService: mockFileService as unknown as import('../services/fileService').FileService,
        configStore: mockConfigStore as unknown as import('../services/configStore').ConfigStore,
        getCurrentProjectPath: mockGetCurrentProjectPath,
        setProjectPath: mockSetProjectPath,
        selectProject: mockSelectProject,
        getInitialProjectPath: mockGetInitialProjectPath,
        startSpecsWatcher: mockStartSpecsWatcher,
        startAgentRecordWatcher: mockStartAgentRecordWatcher,
        startBugsWatcher: mockStartBugsWatcher,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.GET_PLATFORM);
      expect(handler).toBeDefined();

      const mockEvent = {} as IpcMainInvokeEvent;
      const result = await handler!(mockEvent);

      expect(result).toBe(process.platform);
    });
  });

  describe('GET_INITIAL_PROJECT_PATH handler', () => {
    it('should return initial project path', async () => {
      const { registerProjectHandlers } = await import('./projectHandlers');

      registerProjectHandlers({
        fileService: mockFileService as unknown as import('../services/fileService').FileService,
        configStore: mockConfigStore as unknown as import('../services/configStore').ConfigStore,
        getCurrentProjectPath: mockGetCurrentProjectPath,
        setProjectPath: mockSetProjectPath,
        selectProject: mockSelectProject,
        getInitialProjectPath: mockGetInitialProjectPath,
        startSpecsWatcher: mockStartSpecsWatcher,
        startAgentRecordWatcher: mockStartAgentRecordWatcher,
        startBugsWatcher: mockStartBugsWatcher,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.GET_INITIAL_PROJECT_PATH);
      expect(handler).toBeDefined();

      const mockEvent = {} as IpcMainInvokeEvent;
      const result = await handler!(mockEvent);

      expect(mockGetInitialProjectPath).toHaveBeenCalled();
      expect(result).toBe('/initial/project');
    });
  });

  describe('GET_IS_E2E_TEST handler', () => {
    it('should return false when not in E2E test mode', async () => {
      const { registerProjectHandlers } = await import('./projectHandlers');

      registerProjectHandlers({
        fileService: mockFileService as unknown as import('../services/fileService').FileService,
        configStore: mockConfigStore as unknown as import('../services/configStore').ConfigStore,
        getCurrentProjectPath: mockGetCurrentProjectPath,
        setProjectPath: mockSetProjectPath,
        selectProject: mockSelectProject,
        getInitialProjectPath: mockGetInitialProjectPath,
        startSpecsWatcher: mockStartSpecsWatcher,
        startAgentRecordWatcher: mockStartAgentRecordWatcher,
        startBugsWatcher: mockStartBugsWatcher,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.GET_IS_E2E_TEST);
      expect(handler).toBeDefined();

      const mockEvent = {} as IpcMainInvokeEvent;
      const result = await handler!(mockEvent);

      expect(result).toBe(false);
    });
  });

  describe('GET_PROJECT_LOG_PATH handler', () => {
    it('should return project log path', async () => {
      const { registerProjectHandlers } = await import('./projectHandlers');

      registerProjectHandlers({
        fileService: mockFileService as unknown as import('../services/fileService').FileService,
        configStore: mockConfigStore as unknown as import('../services/configStore').ConfigStore,
        getCurrentProjectPath: mockGetCurrentProjectPath,
        setProjectPath: mockSetProjectPath,
        selectProject: mockSelectProject,
        getInitialProjectPath: mockGetInitialProjectPath,
        startSpecsWatcher: mockStartSpecsWatcher,
        startAgentRecordWatcher: mockStartAgentRecordWatcher,
        startBugsWatcher: mockStartBugsWatcher,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.GET_PROJECT_LOG_PATH);
      expect(handler).toBeDefined();

      const mockEvent = {} as IpcMainInvokeEvent;
      const result = await handler!(mockEvent);

      expect(mockGetProjectLogPath).toHaveBeenCalled();
      expect(result).toBe('/test/project/.kiro/logs/main.log');
    });
  });

  describe('Permissions handlers', () => {
    it('ADD_SHELL_PERMISSIONS should add shell permissions', async () => {
      const { registerProjectHandlers } = await import('./projectHandlers');

      registerProjectHandlers({
        fileService: mockFileService as unknown as import('../services/fileService').FileService,
        configStore: mockConfigStore as unknown as import('../services/configStore').ConfigStore,
        getCurrentProjectPath: mockGetCurrentProjectPath,
        setProjectPath: mockSetProjectPath,
        selectProject: mockSelectProject,
        getInitialProjectPath: mockGetInitialProjectPath,
        startSpecsWatcher: mockStartSpecsWatcher,
        startAgentRecordWatcher: mockStartAgentRecordWatcher,
        startBugsWatcher: mockStartBugsWatcher,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.ADD_SHELL_PERMISSIONS);
      expect(handler).toBeDefined();

      const mockEvent = {} as IpcMainInvokeEvent;
      const result = await handler!(mockEvent, '/test/project');

      expect(mockAddShellPermissions).toHaveBeenCalledWith('/test/project');
      expect(result).toBe(true);
    });

    it('ADD_MISSING_PERMISSIONS should add missing permissions', async () => {
      const { registerProjectHandlers } = await import('./projectHandlers');

      registerProjectHandlers({
        fileService: mockFileService as unknown as import('../services/fileService').FileService,
        configStore: mockConfigStore as unknown as import('../services/configStore').ConfigStore,
        getCurrentProjectPath: mockGetCurrentProjectPath,
        setProjectPath: mockSetProjectPath,
        selectProject: mockSelectProject,
        getInitialProjectPath: mockGetInitialProjectPath,
        startSpecsWatcher: mockStartSpecsWatcher,
        startAgentRecordWatcher: mockStartAgentRecordWatcher,
        startBugsWatcher: mockStartBugsWatcher,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.ADD_MISSING_PERMISSIONS);
      expect(handler).toBeDefined();

      const mockEvent = {} as IpcMainInvokeEvent;
      const result = await handler!(mockEvent, '/test/project', ['read', 'write']);

      expect(mockAddPermissionsToProject).toHaveBeenCalledWith('/test/project', ['read', 'write']);
      expect(result).toBe(true);
    });

    it('CHECK_REQUIRED_PERMISSIONS should check required permissions', async () => {
      const { registerProjectHandlers } = await import('./projectHandlers');

      registerProjectHandlers({
        fileService: mockFileService as unknown as import('../services/fileService').FileService,
        configStore: mockConfigStore as unknown as import('../services/configStore').ConfigStore,
        getCurrentProjectPath: mockGetCurrentProjectPath,
        setProjectPath: mockSetProjectPath,
        selectProject: mockSelectProject,
        getInitialProjectPath: mockGetInitialProjectPath,
        startSpecsWatcher: mockStartSpecsWatcher,
        startAgentRecordWatcher: mockStartAgentRecordWatcher,
        startBugsWatcher: mockStartBugsWatcher,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.CHECK_REQUIRED_PERMISSIONS);
      expect(handler).toBeDefined();

      const mockEvent = {} as IpcMainInvokeEvent;
      const result = await handler!(mockEvent, '/test/project');

      expect(mockCheckRequiredPermissions).toHaveBeenCalled();
      expect(result).toEqual({ allPresent: true, missing: [], present: ['read', 'write'] });
    });
  });

  describe('validateProjectPath', () => {
    it('should return success for valid path', async () => {
      const { validateProjectPath } = await import('./projectHandlers');

      const result = await validateProjectPath('/valid/path');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('/valid/path');
      }
    });

    it('should return error for non-existent path', async () => {
      const { validateProjectPath } = await import('./projectHandlers');

      mockFs.access.mockRejectedValueOnce(new Error('ENOENT'));

      const result = await validateProjectPath('/nonexistent/path');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('PATH_NOT_EXISTS');
      }
    });

    it('should return error for non-directory path', async () => {
      const { validateProjectPath } = await import('./projectHandlers');

      mockFs.stat.mockResolvedValueOnce({ isDirectory: () => false } as unknown as import('fs').Stats);

      const result = await validateProjectPath('/file/path');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_A_DIRECTORY');
      }
    });

    it('should return error for permission denied', async () => {
      const { validateProjectPath } = await import('./projectHandlers');

      mockFs.readdir.mockRejectedValueOnce(new Error('EACCES'));

      const result = await validateProjectPath('/restricted/path');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('PERMISSION_DENIED');
      }
    });
  });

  describe('isProjectSelectionInProgress', () => {
    it('should return current selection state', async () => {
      const { isProjectSelectionInProgress } = await import('./projectHandlers');

      // Initial state should be false
      expect(isProjectSelectionInProgress()).toBe(false);
    });
  });
});

describe('ProjectHandlersDependencies interface', () => {
  it('should require all necessary dependencies', async () => {
    const { registerProjectHandlers } = await import('./projectHandlers');

    // This is a compile-time check - if the interface is wrong, TypeScript will fail
    const deps = {
      fileService: {
        validateKiroDirectory: vi.fn(),
      } as unknown as import('../services/fileService').FileService,
      configStore: {
        getRecentProjects: vi.fn(),
        addRecentProject: vi.fn(),
      } as unknown as import('../services/configStore').ConfigStore,
      getCurrentProjectPath: vi.fn(),
      setProjectPath: vi.fn(),
      selectProject: vi.fn(),
      getInitialProjectPath: vi.fn(),
      startSpecsWatcher: vi.fn(),
      startAgentRecordWatcher: vi.fn(),
      startBugsWatcher: vi.fn(),
    };

    // Should not throw
    expect(() => registerProjectHandlers(deps)).not.toThrow();
  });
});

describe('agent-stale-recovery: Task 14.1 - OrphanDetector integration', () => {
  let mockOrphanDetector: {
    detectOrphans: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockOrphanDetector = {
      detectOrphans: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('should call OrphanDetector.detectOrphans after successful project selection', async () => {
    const { registerProjectHandlers } = await import('./projectHandlers');

    registerProjectHandlers({
      fileService: mockFileService as unknown as import('../services/fileService').FileService,
      configStore: mockConfigStore as unknown as import('../services/configStore').ConfigStore,
      getCurrentProjectPath: mockGetCurrentProjectPath,
      setProjectPath: mockSetProjectPath,
      selectProject: mockSelectProject,
      getInitialProjectPath: mockGetInitialProjectPath,
      startSpecsWatcher: mockStartSpecsWatcher,
      startAgentRecordWatcher: mockStartAgentRecordWatcher,
      startBugsWatcher: mockStartBugsWatcher,
      orphanDetector: mockOrphanDetector as unknown as import('../services/stale-recovery/OrphanDetector').OrphanDetector,
    });

    const handler = registeredHandlers.get(IPC_CHANNELS.SELECT_PROJECT);
    expect(handler).toBeDefined();

    const mockEvent = { sender: {} } as IpcMainInvokeEvent;
    await handler!(mockEvent, '/test/project');

    // Should call OrphanDetector.detectOrphans with project path
    expect(mockOrphanDetector.detectOrphans).toHaveBeenCalledWith('/test/project');
  });

  it('should not call OrphanDetector.detectOrphans if project selection fails', async () => {
    const { registerProjectHandlers } = await import('./projectHandlers');

    // Mock selectProject to return failure
    mockSelectProject.mockResolvedValueOnce({
      success: false,
      error: { type: 'PATH_NOT_EXISTS', path: '/test/invalid' },
    });

    registerProjectHandlers({
      fileService: mockFileService as unknown as import('../services/fileService').FileService,
      configStore: mockConfigStore as unknown as import('../services/configStore').ConfigStore,
      getCurrentProjectPath: mockGetCurrentProjectPath,
      setProjectPath: mockSetProjectPath,
      selectProject: mockSelectProject,
      getInitialProjectPath: mockGetInitialProjectPath,
      startSpecsWatcher: mockStartSpecsWatcher,
      startAgentRecordWatcher: mockStartAgentRecordWatcher,
      startBugsWatcher: mockStartBugsWatcher,
      orphanDetector: mockOrphanDetector as unknown as import('../services/stale-recovery/OrphanDetector').OrphanDetector,
    });

    const handler = registeredHandlers.get(IPC_CHANNELS.SELECT_PROJECT);
    const mockEvent = { sender: {} } as IpcMainInvokeEvent;
    await handler!(mockEvent, '/test/invalid');

    // Should not call OrphanDetector on failure
    expect(mockOrphanDetector.detectOrphans).not.toHaveBeenCalled();
  });

  it('should handle OrphanDetector errors gracefully', async () => {
    const { registerProjectHandlers } = await import('./projectHandlers');

    // Mock OrphanDetector to throw error
    mockOrphanDetector.detectOrphans.mockRejectedValueOnce(new Error('Orphan detection failed'));

    registerProjectHandlers({
      fileService: mockFileService as unknown as import('../services/fileService').FileService,
      configStore: mockConfigStore as unknown as import('../services/configStore').ConfigStore,
      getCurrentProjectPath: mockGetCurrentProjectPath,
      setProjectPath: mockSetProjectPath,
      selectProject: mockSelectProject,
      getInitialProjectPath: mockGetInitialProjectPath,
      startSpecsWatcher: mockStartSpecsWatcher,
      startAgentRecordWatcher: mockStartAgentRecordWatcher,
      startBugsWatcher: mockStartBugsWatcher,
      orphanDetector: mockOrphanDetector as unknown as import('../services/stale-recovery/OrphanDetector').OrphanDetector,
    });

    const handler = registeredHandlers.get(IPC_CHANNELS.SELECT_PROJECT);
    const mockEvent = { sender: {} } as IpcMainInvokeEvent;

    // Should not throw - orphan detection errors should be caught
    await expect(handler!(mockEvent, '/test/project')).resolves.toBeDefined();
  });
});
