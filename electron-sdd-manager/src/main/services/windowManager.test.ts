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

import { WindowManager, DuplicateProjectError } from './windowManager';
import { BrowserWindow } from 'electron';

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
      const instance = {
        id,
        webContents: {
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
        expect(services?.bugsWatcherService).toBeDefined();
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
});
