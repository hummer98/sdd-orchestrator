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

// Mock index module (createWindow)
vi.mock('./index', () => ({
  createWindow: vi.fn(),
}));

// Import after mocks
import { createMenu, updateMenu, setMenuProjectPath, updateWindowTitle } from './menu';
import { getConfigStore } from './services/configStore';
import { createWindow } from './index';

describe('Menu Module', () => {
  let mockWindow: Partial<BrowserWindow>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createWindow).mockClear();

    mockWindow = {
      webContents: {
        send: vi.fn(),
        isLoading: vi.fn().mockReturnValue(false),
        once: vi.fn(),
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

  describe('Menu items - Open Recent Project', () => {
    it('should create window if no window exists when opening recent project', () => {
      // Setup: Mock recent projects
      const mockGetRecentProjects = vi.fn(() => ['/path/to/project1', '/path/to/project2']);
      vi.mocked(getConfigStore).mockReturnValue({
        getRecentProjects: mockGetRecentProjects,
        addRecentProject: vi.fn(),
        removeRecentProject: vi.fn(),
      } as any);

      // Setup: No windows exist
      vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(null);
      vi.mocked(BrowserWindow.getAllWindows).mockReturnValueOnce([]);

      // After createWindow is called, return the new window
      vi.mocked(createWindow).mockImplementation(() => {
        vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([mockWindow as BrowserWindow]);
      });

      createMenu();

      // Get the menu template to find the recent project menu item
      const menuTemplate = vi.mocked(Menu.buildFromTemplate).mock.calls[0][0];

      // Find "File" menu -> "Recent Projects" submenu -> first project item
      const fileMenu = menuTemplate.find((item: any) => item.label === 'ファイル') as any;
      const recentProjectsMenu = fileMenu.submenu.find((item: any) => item.label === '最近のプロジェクト');
      const firstProject = recentProjectsMenu.submenu[0];

      // Trigger the click handler
      firstProject.click();

      // Verify createWindow was called
      expect(createWindow).toHaveBeenCalledOnce();
      expect(mockWindow.webContents!.send).toHaveBeenCalledWith('menu:open-project', '/path/to/project1');
    });

    it('should not create window if window already exists when opening recent project', () => {
      // Setup: Mock recent projects
      const mockGetRecentProjects = vi.fn(() => ['/path/to/project1']);
      vi.mocked(getConfigStore).mockReturnValue({
        getRecentProjects: mockGetRecentProjects,
        addRecentProject: vi.fn(),
        removeRecentProject: vi.fn(),
      } as any);

      // Setup: Window exists
      vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(mockWindow as BrowserWindow);
      vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([mockWindow as BrowserWindow]);

      createMenu();

      // Get the menu template
      const menuTemplate = vi.mocked(Menu.buildFromTemplate).mock.calls[0][0];
      const fileMenu = menuTemplate.find((item: any) => item.label === 'ファイル') as any;
      const recentProjectsMenu = fileMenu.submenu.find((item: any) => item.label === '最近のプロジェクト');
      const firstProject = recentProjectsMenu.submenu[0];

      // Trigger the click handler
      firstProject.click();

      // Verify createWindow was NOT called
      expect(createWindow).not.toHaveBeenCalled();
      expect(mockWindow.webContents!.send).toHaveBeenCalledWith('menu:open-project', '/path/to/project1');
    });

    it('should wait for window to load before sending event when opening recent project', () => {
      // Setup: Mock recent projects
      const mockGetRecentProjects = vi.fn(() => ['/path/to/project1']);
      vi.mocked(getConfigStore).mockReturnValue({
        getRecentProjects: mockGetRecentProjects,
        addRecentProject: vi.fn(),
        removeRecentProject: vi.fn(),
      } as any);

      // Setup: No windows exist, and window is loading after creation
      vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(null);
      vi.mocked(BrowserWindow.getAllWindows).mockReturnValueOnce([]);

      const mockLoadingWindow = {
        webContents: {
          send: vi.fn(),
          isLoading: vi.fn().mockReturnValue(true),
          once: vi.fn((event, callback) => {
            // Simulate did-finish-load event
            if (event === 'did-finish-load') {
              callback();
            }
          }),
        } as unknown as Electron.WebContents,
      };

      vi.mocked(createWindow).mockImplementation(() => {
        vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([mockLoadingWindow as BrowserWindow]);
      });

      createMenu();

      // Get the menu template
      const menuTemplate = vi.mocked(Menu.buildFromTemplate).mock.calls[0][0];
      const fileMenu = menuTemplate.find((item: any) => item.label === 'ファイル') as any;
      const recentProjectsMenu = fileMenu.submenu.find((item: any) => item.label === '最近のプロジェクト');
      const firstProject = recentProjectsMenu.submenu[0];

      // Trigger the click handler
      firstProject.click();

      // Verify window.webContents.once was called to wait for load
      expect(mockLoadingWindow.webContents.once).toHaveBeenCalledWith('did-finish-load', expect.any(Function));
      // Verify send was called after load
      expect(mockLoadingWindow.webContents.send).toHaveBeenCalledWith('menu:open-project', '/path/to/project1');
    });
  });

  describe('Menu items - Open Project Dialog', () => {
    it('should create window if no window exists when opening project dialog', async () => {
      // Setup: No windows exist
      vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(null);
      vi.mocked(BrowserWindow.getAllWindows).mockReturnValueOnce([]);

      // After createWindow is called, return the new window
      vi.mocked(createWindow).mockImplementation(() => {
        vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([mockWindow as BrowserWindow]);
      });

      // Mock dialog result
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: false,
        filePaths: ['/selected/project'],
      } as any);

      createMenu();

      // Get the menu template
      const menuTemplate = vi.mocked(Menu.buildFromTemplate).mock.calls[0][0];
      const fileMenu = menuTemplate.find((item: any) => item.label === 'ファイル') as any;
      const openProjectItem = fileMenu.submenu.find((item: any) => item.label === 'プロジェクトを開く...');

      // Trigger the click handler
      await openProjectItem.click();

      // Verify createWindow was called
      expect(createWindow).toHaveBeenCalledOnce();
      expect(dialog.showOpenDialog).toHaveBeenCalledWith(mockWindow, {
        properties: ['openDirectory'],
        title: 'プロジェクトディレクトリを選択',
      });
      expect(mockWindow.webContents!.send).toHaveBeenCalledWith('menu:open-project', '/selected/project');
    });

    it('should not create window if window already exists when opening project dialog', async () => {
      // Setup: Window exists
      vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(mockWindow as BrowserWindow);
      vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([mockWindow as BrowserWindow]);

      // Mock dialog result
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: false,
        filePaths: ['/selected/project'],
      } as any);

      createMenu();

      // Get the menu template
      const menuTemplate = vi.mocked(Menu.buildFromTemplate).mock.calls[0][0];
      const fileMenu = menuTemplate.find((item: any) => item.label === 'ファイル') as any;
      const openProjectItem = fileMenu.submenu.find((item: any) => item.label === 'プロジェクトを開く...');

      // Trigger the click handler
      await openProjectItem.click();

      // Verify createWindow was NOT called
      expect(createWindow).not.toHaveBeenCalled();
      expect(dialog.showOpenDialog).toHaveBeenCalled();
    });

    it('should wait for window to load before sending event when project is selected', async () => {
      // Setup: No windows exist
      vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(null);
      vi.mocked(BrowserWindow.getAllWindows).mockReturnValueOnce([]);

      const mockLoadingWindow = {
        webContents: {
          send: vi.fn(),
          isLoading: vi.fn().mockReturnValue(true),
          once: vi.fn((event, callback) => {
            if (event === 'did-finish-load') {
              callback();
            }
          }),
        } as unknown as Electron.WebContents,
      };

      vi.mocked(createWindow).mockImplementation(() => {
        vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([mockLoadingWindow as BrowserWindow]);
      });

      // Mock dialog result
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: false,
        filePaths: ['/selected/project'],
      } as any);

      createMenu();

      // Get the menu template
      const menuTemplate = vi.mocked(Menu.buildFromTemplate).mock.calls[0][0];
      const fileMenu = menuTemplate.find((item: any) => item.label === 'ファイル') as any;
      const openProjectItem = fileMenu.submenu.find((item: any) => item.label === 'プロジェクトを開く...');

      // Trigger the click handler
      await openProjectItem.click();

      // Verify window.webContents.once was called to wait for load
      expect(mockLoadingWindow.webContents.once).toHaveBeenCalledWith('did-finish-load', expect.any(Function));
      // Verify send was called after load
      expect(mockLoadingWindow.webContents.send).toHaveBeenCalledWith('menu:open-project', '/selected/project');
    });
  });

  describe('Menu items - Install Commandset', () => {
    it('should have Install Commandset menu item in Tools menu', () => {
      // Setup: Project is selected
      setMenuProjectPath('/path/to/project');

      createMenu();

      // Get the menu template
      const menuTemplate = vi.mocked(Menu.buildFromTemplate).mock.calls[0][0];
      const toolsMenu = menuTemplate.find((item: any) => item.label === 'ツール') as any;

      // Find the install commandset menu item
      const installCommandsetItem = toolsMenu.submenu.find((item: any) =>
        item.label === 'コマンドセットをインストール...'
      );

      expect(installCommandsetItem).toBeDefined();
      expect(installCommandsetItem.enabled).toBe(true);
    });

    it('should have Install Commandset menu item disabled when no project is selected', () => {
      // Setup: No project selected
      setMenuProjectPath(null);

      createMenu();

      // Get the menu template
      const menuTemplate = vi.mocked(Menu.buildFromTemplate).mock.calls[0][0];
      const toolsMenu = menuTemplate.find((item: any) => item.label === 'ツール') as any;

      // Find the install commandset menu item
      const installCommandsetItem = toolsMenu.submenu.find((item: any) =>
        item.label === 'コマンドセットをインストール...'
      );

      expect(installCommandsetItem).toBeDefined();
      expect(installCommandsetItem.enabled).toBe(false);
    });

    it('should send MENU_INSTALL_COMMANDSET event when clicked', () => {
      // Setup: Project is selected and window exists
      setMenuProjectPath('/path/to/project');
      vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(mockWindow as BrowserWindow);
      vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([mockWindow as BrowserWindow]);

      createMenu();

      // Get the menu template
      const menuTemplate = vi.mocked(Menu.buildFromTemplate).mock.calls[0][0];
      const toolsMenu = menuTemplate.find((item: any) => item.label === 'ツール') as any;
      const installCommandsetItem = toolsMenu.submenu.find((item: any) =>
        item.label === 'コマンドセットをインストール...'
      );

      // Trigger the click handler
      installCommandsetItem.click();

      // Verify the correct IPC channel was sent
      expect(mockWindow.webContents!.send).toHaveBeenCalledWith('menu:install-commandset');
    });
  });
});
