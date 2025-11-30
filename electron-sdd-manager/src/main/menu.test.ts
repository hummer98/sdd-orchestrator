/**
 * Menu Module Tests
 * Requirements: 1.1, 1.2, 1.3 (sidebar-refactor)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserWindow, app, dialog, Menu } from 'electron';

// Mock electron modules
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    name: 'SDD Orchestrator',
    on: vi.fn(),
    whenReady: vi.fn().mockResolvedValue(undefined),
  },
  BrowserWindow: {
    getFocusedWindow: vi.fn(),
    getAllWindows: vi.fn(),
  },
  Menu: {
    buildFromTemplate: vi.fn().mockReturnValue({}),
    setApplicationMenu: vi.fn(),
  },
  dialog: {
    showOpenDialog: vi.fn(),
    showMessageBox: vi.fn(),
  },
}));

// Mock configStore
vi.mock('./services/configStore', () => ({
  getConfigStore: vi.fn(() => ({
    getRecentProjects: vi.fn(() => []),
    addRecentProject: vi.fn(),
    removeRecentProject: vi.fn(),
  })),
}));

// Import after mocks
import { createMenu, updateMenu, setMenuProjectPath, updateWindowTitle } from './menu';

describe('Menu Module', () => {
  let mockWindow: Partial<BrowserWindow>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockWindow = {
      webContents: {
        send: vi.fn(),
      } as unknown as Electron.WebContents,
      setTitle: vi.fn(),
    };

    vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(mockWindow as BrowserWindow);
    vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([mockWindow as BrowserWindow]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createMenu', () => {
    it('should build and set application menu', () => {
      createMenu();

      expect(Menu.buildFromTemplate).toHaveBeenCalled();
      expect(Menu.setApplicationMenu).toHaveBeenCalled();
    });
  });

  describe('updateMenu', () => {
    it('should rebuild menu when called', () => {
      updateMenu();

      expect(Menu.buildFromTemplate).toHaveBeenCalled();
      expect(Menu.setApplicationMenu).toHaveBeenCalled();
    });
  });

  describe('setMenuProjectPath', () => {
    it('should update project path and rebuild menu', () => {
      setMenuProjectPath('/path/to/project');

      expect(Menu.buildFromTemplate).toHaveBeenCalled();
      expect(Menu.setApplicationMenu).toHaveBeenCalled();
    });

    it('should accept null to clear project path', () => {
      setMenuProjectPath(null);

      expect(Menu.buildFromTemplate).toHaveBeenCalled();
      expect(Menu.setApplicationMenu).toHaveBeenCalled();
    });
  });

  describe('updateWindowTitle', () => {
    it('should update window title with project name in dev mode', () => {
      // app.isPackaged is false in our mock (dev mode)
      updateWindowTitle('my-project');

      // In dev mode, title should include (dev)
      expect(mockWindow.setTitle).toHaveBeenCalledWith('SDD Orchestrator (dev) - my-project');
    });

    it('should set default title with (dev) suffix when project name is null in dev mode', () => {
      // app.isPackaged is false in our mock (dev mode)
      updateWindowTitle(null);

      expect(mockWindow.setTitle).toHaveBeenCalledWith('SDD Orchestrator (dev)');
    });

    it('should handle case when no window is available', () => {
      vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(null);
      vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([]);

      // Should not throw
      expect(() => updateWindowTitle('my-project')).not.toThrow();
    });

    it('should use first window from getAllWindows when no focused window', () => {
      vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(null);
      vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([mockWindow as BrowserWindow]);

      updateWindowTitle('my-project');

      expect(mockWindow.setTitle).toHaveBeenCalledWith('SDD Orchestrator (dev) - my-project');
    });
  });
});
