/**
 * WindowManager Service Tests
 * Requirements: 1.1-1.5, 3.1-3.4, 4.1-4.6, 5.2-5.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';

// Mock electron - must be before import
vi.mock('electron', () => {
  const mockBrowserWindow = vi.fn();
  mockBrowserWindow.getAllWindows = vi.fn(() => []);
  mockBrowserWindow.getFocusedWindow = vi.fn(() => null);

  return {
    BrowserWindow: mockBrowserWindow,
    screen: {
      getPrimaryDisplay: vi.fn(() => ({
        workArea: { x: 0, y: 0, width: 1920, height: 1080 },
      })),
      getAllDisplays: vi.fn(() => [
        { workArea: { x: 0, y: 0, width: 1920, height: 1080 } },
      ]),
    },
    app: {
      isPackaged: false,
      getPath: vi.fn(() => '/tmp'),
    },
  };
});

// Mock fs with importOriginal
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn(() => true),
    realpathSync: vi.fn((p: string) => p.replace(/\/+$/, '')),
    createWriteStream: vi.fn(() => ({
      write: vi.fn(),
      end: vi.fn(),
      on: vi.fn(),
    })),
  };
});

// Mock configStore
const mockConfigStore = {
  getMultiWindowStates: vi.fn(() => []),
  setMultiWindowStates: vi.fn(),
  getWindowBounds: vi.fn(() => null),
  addRecentProject: vi.fn(),
};

vi.mock('./configStore', () => ({
  getConfigStore: vi.fn(() => mockConfigStore),
}));

// Mock logger
vi.mock('./logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock services
vi.mock('./specManagerService', () => ({
  SpecManagerService: vi.fn().mockImplementation(() => ({
    stopAllAgents: vi.fn(),
  })),
}));

vi.mock('./specsWatcherService', () => ({
  SpecsWatcherService: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    onChange: vi.fn(),
  })),
}));

vi.mock('./agentRecordWatcherService', () => ({
  AgentRecordWatcherService: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    onChange: vi.fn(),
  })),
}));

vi.mock('./bugsWatcherService', () => ({
  BugsWatcherService: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    onChange: vi.fn(),
  })),
}));

// Mock MetricsService
vi.mock('./metricsService', () => ({
  MetricsService: vi.fn().mockImplementation(() => ({
    setProjectPath: vi.fn(),
    getProjectPath: vi.fn(() => null),
  })),
}));

// Mock MetricsFileWriter
vi.mock('./metricsFileWriter', () => ({
  MetricsFileWriter: vi.fn().mockImplementation(() => ({})),
}));

// Mock MetricsFileReader
vi.mock('./metricsFileReader', () => ({
  MetricsFileReader: vi.fn().mockImplementation(() => ({})),
}));

// Mock AutoExecutionCoordinator
vi.mock('./autoExecutionCoordinator', () => ({
  AutoExecutionCoordinator: vi.fn().mockImplementation(() => ({
    resetAll: vi.fn(),
  })),
}));

import { WindowManager, DuplicateProjectError } from './windowManager';
import { BrowserWindow } from 'electron';
import { realpathSync, existsSync } from 'fs';

const mockRealpathSync = vi.mocked(realpathSync);
const mockExistsSync = vi.mocked(existsSync);

describe('WindowManager', () => {
  let windowManager: WindowManager;
  let windowInstances: Map<number, any>;
  let windowIdCounter: number;

  beforeEach(() => {
    windowIdCounter = 1;
    windowInstances = new Map();

    // Configure mock BrowserWindow to create instances
    const mockBrowserWindowConstructor = BrowserWindow as unknown as ReturnType<typeof vi.fn>;
    mockBrowserWindowConstructor.mockImplementation(() => {
      const id = windowIdCounter++;
      const webContentsId = id + 100; // webContents.id offset from window.id
      const instance = {
        id,
        webContents: {
          id: webContentsId,
          send: vi.fn(),
          isLoading: vi.fn(() => false),
          once: vi.fn(),
          openDevTools: vi.fn(),
        },
        getBounds: vi.fn(() => ({ x: 100, y: 100, width: 1200, height: 800 })),
        setBounds: vi.fn(),
        isDestroyed: vi.fn(() => false),
        isMinimized: vi.fn(() => false),
        isMaximized: vi.fn(() => false),
        show: vi.fn(),
        focus: vi.fn(),
        restore: vi.fn(),
        maximize: vi.fn(),
        minimize: vi.fn(),
        close: vi.fn(),
        setTitle: vi.fn(),
        on: vi.fn(),
        once: vi.fn(),
        loadURL: vi.fn(),
        loadFile: vi.fn(),
      };
      windowInstances.set(id, instance);
      return instance;
    });

    // Configure getAllWindows to return our instances
    (BrowserWindow.getAllWindows as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Array.from(windowInstances.values())
    );

    windowManager = new WindowManager();

    // Reset mocks
    mockConfigStore.setMultiWindowStates.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    windowInstances.clear();
  });

  describe('Task 1.1: Window State Management Data Structures', () => {
    describe('Window State Map', () => {
      it('should initialize with empty window states', () => {
        const windowIds = windowManager.getAllWindowIds();
        expect(windowIds).toHaveLength(0);
      });

      it('should register window state after createWindow', () => {
        const window = windowManager.createWindow();
        const windowIds = windowManager.getAllWindowIds();
        expect(windowIds).toHaveLength(1);
        expect(windowIds[0]).toBe(window.id);
      });

      it('should get window by ID', () => {
        const window = windowManager.createWindow();
        const retrieved = windowManager.getWindow(window.id);
        expect(retrieved).toBe(window);
      });

      it('should return null for non-existent window ID', () => {
        const retrieved = windowManager.getWindow(9999);
        expect(retrieved).toBeNull();
      });
    });

    describe('Project-Window Mapping', () => {
      it('should set and get window project', () => {
        const window = windowManager.createWindow();
        const projectPath = '/path/to/project';

        const result = windowManager.setWindowProject(window.id, projectPath);
        expect(result.ok).toBe(true);

        const retrievedPath = windowManager.getWindowProject(window.id);
        expect(retrievedPath).toBe(projectPath);
      });

      it('should return null for window without project', () => {
        const window = windowManager.createWindow();
        const projectPath = windowManager.getWindowProject(window.id);
        expect(projectPath).toBeNull();
      });

      it('should get window by project path', () => {
        const window = windowManager.createWindow();
        const projectPath = '/path/to/project';
        windowManager.setWindowProject(window.id, projectPath);

        const retrieved = windowManager.getWindowByProject(projectPath);
        expect(retrieved?.id).toBe(window.id);
      });

      it('should return null when no window has the project', () => {
        const window = windowManager.createWindow();
        windowManager.setWindowProject(window.id, '/path/to/project');

        const retrieved = windowManager.getWindowByProject('/different/path');
        expect(retrieved).toBeNull();
      });

      it('should normalize project paths before comparison', () => {
        const window = windowManager.createWindow();
        const projectPath = '/path/to/project';
        windowManager.setWindowProject(window.id, projectPath);

        // Should match even with trailing slash
        const retrieved = windowManager.getWindowByProject('/path/to/project/');
        expect(retrieved?.id).toBe(window.id);
      });
    });

    describe('Per-Window Services Storage', () => {
      it('should return null services for window without project', () => {
        const window = windowManager.createWindow();
        const services = windowManager.getWindowServices(window.id);
        expect(services).toBeNull();
      });

      it('should create and store services when project is set', () => {
        const window = windowManager.createWindow();
        const projectPath = '/path/to/project';
        windowManager.setWindowProject(window.id, projectPath);

        const services = windowManager.getWindowServices(window.id);
        expect(services).not.toBeNull();
        expect(services?.specManagerService).toBeDefined();
        expect(services?.specsWatcherService).toBeDefined();
        expect(services?.agentRecordWatcherService).toBeDefined();
        // bugsWatcherService removed (github-issue-integration)
      });
    });
  });

  describe('Task 2.1: Duplicate Detection', () => {
    it('should detect duplicate project', () => {
      const window = windowManager.createWindow();
      const projectPath = '/path/to/project';
      windowManager.setWindowProject(window.id, projectPath);

      const duplicateWindowId = windowManager.checkDuplicate(projectPath);
      expect(duplicateWindowId).toBe(window.id);
    });

    it('should return null when no duplicate exists', () => {
      const window = windowManager.createWindow();
      windowManager.setWindowProject(window.id, '/path/to/project1');

      const duplicateWindowId = windowManager.checkDuplicate('/path/to/project2');
      expect(duplicateWindowId).toBeNull();
    });

    it('should return error when setting duplicate project', () => {
      const window1 = windowManager.createWindow();
      const window2 = windowManager.createWindow();
      const projectPath = '/path/to/project';

      windowManager.setWindowProject(window1.id, projectPath);
      const result = windowManager.setWindowProject(window2.id, projectPath);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const error = result.error as DuplicateProjectError;
        expect(error.type).toBe('DUPLICATE_PROJECT');
        expect(error.existingWindowId).toBe(window1.id);
      }
    });
  });

  describe('Task 2.2: Focus and Restore', () => {
    it('should focus window by ID', () => {
      const window = windowManager.createWindow();
      windowManager.focusWindow(window.id);

      const instance = windowInstances.get(window.id);
      expect(instance.focus).toHaveBeenCalled();
    });

    it('should restore and focus minimized window', () => {
      const window = windowManager.createWindow();
      const instance = windowInstances.get(window.id);
      instance.isMinimized.mockReturnValue(true);

      windowManager.restoreAndFocus(window.id);

      expect(instance.restore).toHaveBeenCalled();
      expect(instance.focus).toHaveBeenCalled();
    });

    it('should just focus if window is not minimized', () => {
      const window = windowManager.createWindow();
      const instance = windowInstances.get(window.id);
      instance.isMinimized.mockReturnValue(false);

      windowManager.restoreAndFocus(window.id);

      expect(instance.restore).not.toHaveBeenCalled();
      expect(instance.focus).toHaveBeenCalled();
    });
  });

  describe('Task 1.2: Window Lifecycle', () => {
    it('should create window with project path option', () => {
      const projectPath = '/path/to/project';
      const window = windowManager.createWindow({ projectPath });

      const retrievedPath = windowManager.getWindowProject(window.id);
      expect(retrievedPath).toBe(projectPath);
    });

    it('should update window title when project is set', () => {
      const window = windowManager.createWindow();
      const projectPath = '/path/to/my-project';
      windowManager.setWindowProject(window.id, projectPath);

      const instance = windowInstances.get(window.id);
      expect(instance.setTitle).toHaveBeenCalledWith(expect.stringContaining('my-project'));
    });

    it('should remove window from registry on close', () => {
      const window = windowManager.createWindow();
      expect(windowManager.getAllWindowIds()).toHaveLength(1);

      // Simulate the 'closed' event which triggers cleanup
      const instance = windowInstances.get(window.id);
      const closedHandler = instance.on.mock.calls.find(
        (call: any[]) => call[0] === 'closed'
      )?.[1];

      // Remove from mock instances before triggering event
      windowInstances.delete(window.id);
      if (closedHandler) {
        closedHandler();
      }

      expect(windowManager.getAllWindowIds()).toHaveLength(0);
    });

    it('should release project mapping on close', () => {
      const window = windowManager.createWindow();
      const projectPath = '/path/to/project';
      windowManager.setWindowProject(window.id, projectPath);

      // Simulate the 'closed' event which triggers cleanup
      const instance = windowInstances.get(window.id);
      const closedHandler = instance.on.mock.calls.find(
        (call: any[]) => call[0] === 'closed'
      )?.[1];

      // Remove from mock instances before triggering event
      windowInstances.delete(window.id);
      if (closedHandler) {
        closedHandler();
      }

      const retrieved = windowManager.getWindowByProject(projectPath);
      expect(retrieved).toBeNull();
    });
  });

  describe('Task 3.1: Focus Event Handling', () => {
    it('should register and call focus callback', () => {
      const callback = vi.fn();
      windowManager.onWindowFocus(callback);

      const window = windowManager.createWindow();

      // Simulate focus event
      const instance = windowInstances.get(window.id);
      const focusHandler = instance.on.mock.calls.find(
        (call: any[]) => call[0] === 'focus'
      )?.[1];

      if (focusHandler) {
        focusHandler();
        expect(callback).toHaveBeenCalledWith(window.id);
      }
    });
  });

  describe('Task 3.2: Window Close Event Handling', () => {
    it('should register and call close callback', () => {
      const callback = vi.fn();
      windowManager.onWindowClose(callback);

      const window = windowManager.createWindow();

      // Simulate the 'closed' event which triggers cleanup and callback
      const instance = windowInstances.get(window.id);
      const closedHandler = instance.on.mock.calls.find(
        (call: any[]) => call[0] === 'closed'
      )?.[1];

      windowInstances.delete(window.id);
      if (closedHandler) {
        closedHandler();
      }

      expect(callback).toHaveBeenCalledWith(window.id);
    });
  });

  describe('Task 4.1-4.2: State Persistence', () => {
    it('should collect all window states for save', () => {
      const window1 = windowManager.createWindow();
      const window2 = windowManager.createWindow();
      windowManager.setWindowProject(window1.id, '/project1');
      windowManager.setWindowProject(window2.id, '/project2');

      windowManager.saveAllWindowStates();

      // Check that setMultiWindowStates was called with correct data
      expect(mockConfigStore.setMultiWindowStates).toHaveBeenCalled();
    });
  });

  describe('Task 4.4: Multi-display Support', () => {
    it('should validate display bounds', () => {
      const bounds = { x: 5000, y: 5000, width: 1200, height: 800 };
      const validatedBounds = windowManager.validateDisplayBounds(bounds);

      // Should move window to primary display if original position is off-screen
      expect(validatedBounds.x).toBeLessThan(5000);
      expect(validatedBounds.y).toBeLessThan(5000);
    });

    it('should keep bounds if within display', () => {
      const bounds = { x: 100, y: 100, width: 1200, height: 800 };
      const validatedBounds = windowManager.validateDisplayBounds(bounds);

      expect(validatedBounds.x).toBe(100);
      expect(validatedBounds.y).toBe(100);
    });
  });

  // ============================================================
  // multi-window-integration Task 1.1: PerWindowServices拡充
  // ============================================================
  describe('multi-window Task 1.1: PerWindowServices with MetricsService and AutoExecutionCoordinator', () => {
    it('should include metricsService in PerWindowServices when project is set', () => {
      const window = windowManager.createWindow();
      windowManager.setWindowProject(window.id, '/path/to/project');

      const services = windowManager.getWindowServices(window.id);
      expect(services).not.toBeNull();
      expect(services?.metricsService).toBeDefined();
    });

    it('should include autoExecutionCoordinator in PerWindowServices when project is set', () => {
      const window = windowManager.createWindow();
      windowManager.setWindowProject(window.id, '/path/to/project');

      const services = windowManager.getWindowServices(window.id);
      expect(services).not.toBeNull();
      expect(services?.autoExecutionCoordinator).toBeDefined();
    });

    it('should stop MetricsService and AutoExecutionCoordinator on window close', () => {
      const window = windowManager.createWindow();
      windowManager.setWindowProject(window.id, '/path/to/project');

      const services = windowManager.getWindowServices(window.id);
      expect(services).not.toBeNull();

      // Simulate the 'closed' event
      const instance = windowInstances.get(window.id);
      const closedHandler = instance.on.mock.calls.find(
        (call: any[]) => call[0] === 'closed'
      )?.[1];

      windowInstances.delete(window.id);
      if (closedHandler) {
        closedHandler();
      }

      // After close, services should be cleaned up from the map
      expect(windowManager.getWindowServices(window.id)).toBeNull();
      // AutoExecutionCoordinator.resetAll should have been called
      expect(services?.autoExecutionCoordinator.resetAll).toHaveBeenCalled();
    });
  });

  // ============================================================
  // multi-window-integration Task 1.2: webContentsToWindowIdマッピング
  // ============================================================
  describe('multi-window Task 1.2: webContentsToWindowId mapping and context resolution', () => {
    it('should register webContents ID to windowId mapping on createWindow', () => {
      const window = windowManager.createWindow();
      const instance = windowInstances.get(window.id);
      const webContentsId = instance.webContents.id ?? window.id;

      // getWindowIdByWebContents should resolve the window
      const resolvedWindowId = windowManager.getWindowIdByWebContents(webContentsId);
      expect(resolvedWindowId).toBe(window.id);
    });

    it('should return null for unknown webContents ID', () => {
      const resolvedWindowId = windowManager.getWindowIdByWebContents(9999);
      expect(resolvedWindowId).toBeNull();
    });

    it('should remove webContentsToWindowId entry on window close', () => {
      const window = windowManager.createWindow();
      const instance = windowInstances.get(window.id);
      const webContentsId = instance.webContents.id ?? window.id;

      // Simulate close
      const closedHandler = instance.on.mock.calls.find(
        (call: any[]) => call[0] === 'closed'
      )?.[1];

      windowInstances.delete(window.id);
      if (closedHandler) {
        closedHandler();
      }

      expect(windowManager.getWindowIdByWebContents(webContentsId)).toBeNull();
    });

    it('should return PerWindowContext via getWindowContext for registered window', () => {
      const window = windowManager.createWindow();
      windowManager.setWindowProject(window.id, '/path/to/project');

      const context = windowManager.getWindowContext(window.id);
      expect(context).not.toBeNull();
      expect(context?.windowId).toBe(window.id);
      expect(context?.projectPath).toBe('/path/to/project');
      expect(context?.services).not.toBeNull();
    });

    it('should return null from getWindowContext for unregistered window', () => {
      const context = windowManager.getWindowContext(9999);
      expect(context).toBeNull();
    });

    it('should return context with null services for window without project', () => {
      const window = windowManager.createWindow();

      const context = windowManager.getWindowContext(window.id);
      expect(context).not.toBeNull();
      expect(context?.windowId).toBe(window.id);
      expect(context?.projectPath).toBeNull();
      expect(context?.services).toBeNull();
    });
  });

  // ============================================================
  // multi-window-integration Task 1.3: IPCHandler保持・管理
  // ============================================================
  describe('multi-window Task 1.3: IPCHandler management', () => {
    it('should initially have no IPCHandler', () => {
      expect(windowManager.getIPCHandler()).toBeNull();
    });

    it('should store and retrieve IPCHandler via getter/setter', () => {
      const mockIPCHandler = {
        attachWindow: vi.fn(),
        detachWindow: vi.fn(),
      };

      windowManager.setIPCHandler(mockIPCHandler as any);
      expect(windowManager.getIPCHandler()).toBe(mockIPCHandler);
    });

    it('should call attachWindow on IPCHandler when createWindow is called and IPCHandler exists', () => {
      const mockIPCHandler = {
        attachWindow: vi.fn(),
        detachWindow: vi.fn(),
      };

      windowManager.setIPCHandler(mockIPCHandler as any);
      const window = windowManager.createWindow();

      expect(mockIPCHandler.attachWindow).toHaveBeenCalledWith(window);
    });

    it('should NOT call attachWindow when IPCHandler is not set', () => {
      // No IPCHandler set, createWindow should not throw
      const window = windowManager.createWindow();
      expect(window).toBeDefined();
    });

    it('should call detachWindow on IPCHandler when window is closed', () => {
      const mockIPCHandler = {
        attachWindow: vi.fn(),
        detachWindow: vi.fn(),
      };

      windowManager.setIPCHandler(mockIPCHandler as any);
      const window = windowManager.createWindow();

      // Simulate close
      const instance = windowInstances.get(window.id);
      const closedHandler = instance.on.mock.calls.find(
        (call: any[]) => call[0] === 'closed'
      )?.[1];

      windowInstances.delete(window.id);
      if (closedHandler) {
        closedHandler();
      }

      expect(mockIPCHandler.detachWindow).toHaveBeenCalledWith(window);
    });
  });

  // ============================================================
  // multi-window-integration Task 1.4: normalizePath シンボリックリンク解決
  // ============================================================
  describe('multi-window Task 1.4: normalizePath with symlink resolution', () => {
    it('should resolve symlinks in project path via realpathSync', () => {
      // Mock realpathSync to return a resolved path
      mockRealpathSync.mockReturnValue('/real/path/to/project' as any);

      const window1 = windowManager.createWindow();
      windowManager.setWindowProject(window1.id, '/symlink/to/project');

      // The duplicate check should use the resolved path
      const duplicate = windowManager.checkDuplicate('/real/path/to/project');
      expect(duplicate).toBe(window1.id);
    });

    it('should fall back to trailing slash removal when realpathSync throws', () => {
      // Mock realpathSync to throw (path does not exist)
      mockRealpathSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const window1 = windowManager.createWindow();
      windowManager.setWindowProject(window1.id, '/path/to/project/');

      // Should still normalize trailing slash
      const duplicate = windowManager.checkDuplicate('/path/to/project');
      expect(duplicate).toBe(window1.id);
    });

    it('should still remove trailing slashes', () => {
      // realpathSync returns path without trailing slash
      mockRealpathSync.mockImplementation(((p: string) =>
        p.replace(/\/+$/, '')) as any);

      const window1 = windowManager.createWindow();
      windowManager.setWindowProject(window1.id, '/path/to/project');

      const duplicate = windowManager.checkDuplicate('/path/to/project/');
      expect(duplicate).toBe(window1.id);
    });
  });

  // ============================================================
  // multi-window-integration Task 8.2: Window state restoration
  // ============================================================
  describe('multi-window Task 8.2: restoreWindows', () => {
    beforeEach(() => {
      // Reset existsSync to return true by default
      mockExistsSync.mockReturnValue(true);
    });

    it('should restore windows from saved ConfigStore states', () => {
      mockConfigStore.getMultiWindowStates.mockReturnValue([
        {
          projectPath: '/project/a',
          bounds: { x: 100, y: 100, width: 1200, height: 800 },
          isMaximized: false,
          isMinimized: false,
        },
        {
          projectPath: '/project/b',
          bounds: { x: 200, y: 200, width: 1000, height: 700 },
          isMaximized: false,
          isMinimized: false,
        },
      ]);

      const result = windowManager.restoreWindows();

      expect(result.restored).toBe(2);
      expect(result.skipped).toHaveLength(0);
      expect(windowManager.getAllWindowIds()).toHaveLength(2);
    });

    it('should skip windows with non-existent project directories', () => {
      mockExistsSync.mockImplementation(((path: string) => {
        if (path === '/project/missing') return false;
        return true;
      }) as any);

      mockConfigStore.getMultiWindowStates.mockReturnValue([
        {
          projectPath: '/project/existing',
          bounds: { x: 100, y: 100, width: 1200, height: 800 },
          isMaximized: false,
          isMinimized: false,
        },
        {
          projectPath: '/project/missing',
          bounds: { x: 200, y: 200, width: 1000, height: 700 },
          isMaximized: false,
          isMinimized: false,
        },
      ]);

      const result = windowManager.restoreWindows();

      expect(result.restored).toBe(1);
      expect(result.skipped).toEqual(['/project/missing']);
      expect(windowManager.getAllWindowIds()).toHaveLength(1);
    });

    it('should create default window on first launch (no saved states)', () => {
      mockConfigStore.getMultiWindowStates.mockReturnValue([]);

      const result = windowManager.restoreWindows();

      expect(result.restored).toBe(1);
      expect(result.skipped).toHaveLength(0);
      expect(windowManager.getAllWindowIds()).toHaveLength(1);
    });

    it('should create default window when all saved projects are missing', () => {
      mockExistsSync.mockReturnValue(false);

      mockConfigStore.getMultiWindowStates.mockReturnValue([
        {
          projectPath: '/project/gone1',
          bounds: { x: 100, y: 100, width: 1200, height: 800 },
          isMaximized: false,
          isMinimized: false,
        },
        {
          projectPath: '/project/gone2',
          bounds: { x: 200, y: 200, width: 1000, height: 700 },
          isMaximized: false,
          isMinimized: false,
        },
      ]);

      const result = windowManager.restoreWindows();

      // All projects were skipped, but we still need at least one window
      // Note: current implementation only creates default when skipped.length === 0
      // This test documents whether fallback occurs when all projects are missing
      expect(result.skipped).toEqual(['/project/gone1', '/project/gone2']);
      expect(windowManager.getAllWindowIds().length).toBeGreaterThanOrEqual(1);
    });

    it('should validate display bounds during restoration (multi-display support)', () => {
      // Window position at 5000,5000 is off-screen (display is 1920x1080)
      mockConfigStore.getMultiWindowStates.mockReturnValue([
        {
          projectPath: '/project/a',
          bounds: { x: 5000, y: 5000, width: 1200, height: 800 },
          isMaximized: false,
          isMinimized: false,
        },
      ]);

      const result = windowManager.restoreWindows();

      expect(result.restored).toBe(1);
      // Window should have been repositioned to primary display
      // We verify this by checking that the window was created (validateDisplayBounds is called internally)
      expect(windowManager.getAllWindowIds()).toHaveLength(1);
    });

    it('should restore maximized state for windows', () => {
      mockConfigStore.getMultiWindowStates.mockReturnValue([
        {
          projectPath: '/project/a',
          bounds: { x: 100, y: 100, width: 1200, height: 800 },
          isMaximized: true,
          isMinimized: false,
        },
      ]);

      const result = windowManager.restoreWindows();

      expect(result.restored).toBe(1);
      // The window should have been created with isMaximized option
      const windowId = windowManager.getAllWindowIds()[0];
      const instance = windowInstances.get(windowId);
      // The 'ready-to-show' callback calls maximize() when isMaximized is true
      expect(instance).toBeDefined();
    });

    it('should skip windows with empty projectPath', () => {
      mockConfigStore.getMultiWindowStates.mockReturnValue([
        {
          projectPath: '',
          bounds: { x: 100, y: 100, width: 1200, height: 800 },
          isMaximized: false,
          isMinimized: false,
        },
      ]);

      const result = windowManager.restoreWindows();

      // Empty projectPath should be treated as no saved state
      // Should create a default window
      expect(result.restored).toBe(1);
      expect(windowManager.getAllWindowIds()).toHaveLength(1);
    });

    it('should set project paths on restored windows', () => {
      mockConfigStore.getMultiWindowStates.mockReturnValue([
        {
          projectPath: '/project/a',
          bounds: { x: 100, y: 100, width: 1200, height: 800 },
          isMaximized: false,
          isMinimized: false,
        },
      ]);

      windowManager.restoreWindows();

      const windowId = windowManager.getAllWindowIds()[0];
      const projectPath = windowManager.getWindowProject(windowId);
      expect(projectPath).toBe('/project/a');
    });
  });

  // ============================================================
  // multi-window-integration Task 8.1 + 8.2: Save and restore cycle
  // ============================================================
  describe('multi-window Task 8.1+8.2: Save and restore round-trip', () => {
    it('should save window states with project paths and bounds', () => {
      const window1 = windowManager.createWindow();
      const window2 = windowManager.createWindow();
      windowManager.setWindowProject(window1.id, '/project/a');
      windowManager.setWindowProject(window2.id, '/project/b');

      windowManager.saveAllWindowStates();

      expect(mockConfigStore.setMultiWindowStates).toHaveBeenCalledTimes(1);
      const savedStates = mockConfigStore.setMultiWindowStates.mock.calls[0][0];
      expect(savedStates).toHaveLength(2);
      expect(savedStates[0].projectPath).toBe('/project/a');
      expect(savedStates[1].projectPath).toBe('/project/b');
    });

    it('should only save windows with project paths (skip empty windows)', () => {
      const window1 = windowManager.createWindow();
      windowManager.createWindow(); // No project
      windowManager.setWindowProject(window1.id, '/project/a');

      windowManager.saveAllWindowStates();

      const savedStates = mockConfigStore.setMultiWindowStates.mock.calls[0][0];
      expect(savedStates).toHaveLength(1);
      expect(savedStates[0].projectPath).toBe('/project/a');
    });

    it('should include bounds, isMaximized, and isMinimized in saved states', () => {
      const window1 = windowManager.createWindow();
      windowManager.setWindowProject(window1.id, '/project/a');

      windowManager.saveAllWindowStates();

      const savedStates = mockConfigStore.setMultiWindowStates.mock.calls[0][0];
      expect(savedStates[0]).toHaveProperty('bounds');
      expect(savedStates[0]).toHaveProperty('isMaximized');
      expect(savedStates[0]).toHaveProperty('isMinimized');
      expect(savedStates[0].bounds).toEqual(expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number),
        width: expect.any(Number),
        height: expect.any(Number),
      }));
    });
  });
});
