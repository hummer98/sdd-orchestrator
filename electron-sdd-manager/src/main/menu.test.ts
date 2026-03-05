/**
 * Menu Module Tests
 * Requirements: 1.1, 1.2, 1.3 (sidebar-refactor)
 * multi-window-integration Task 5.1: WindowManager.createWindow integration
 * multi-window-integration Task 5.2: Focused window menu context tracking
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

// Mock WindowManager
const mockWindowManagerCreateWindow = vi.fn();
const mockWindowManagerOnWindowFocus = vi.fn();
const mockWindowManagerGetWindowProject = vi.fn();
const mockWindowManagerGetAllWindowIds = vi.fn(() => [] as number[]);
const mockWindowManagerGetWindow = vi.fn();

vi.mock('./services/windowManager', () => ({
  getWindowManager: vi.fn(() => ({
    createWindow: mockWindowManagerCreateWindow,
    onWindowFocus: mockWindowManagerOnWindowFocus,
    getWindowProject: mockWindowManagerGetWindowProject,
    getAllWindowIds: mockWindowManagerGetAllWindowIds,
    getWindow: mockWindowManagerGetWindow,
  })),
}));

// Mock globalEventBus (trpc-full-migration: webContents.send -> eventBus.emit)
const mockEmit = vi.fn();
vi.mock('./trpc/services/globalEventBus', () => ({
  getGlobalEventBus: vi.fn(() => ({
    emit: mockEmit,
    on: vi.fn(),
    off: vi.fn(),
  })),
}));

vi.mock('./trpc/services/eventBus', () => ({
  EVENT_NAMES: {
    MENU_OPEN_PROJECT: 'events:menu-open-project',
    MENU_INSTALL_CLI: 'events:menu-install-cli',
    MENU_INSTALL_COMMANDSET: 'events:menu-install-commandset',
    MENU_INSTALL_EXPERIMENTAL_DEBUG: 'events:menu-install-experimental-debug',
    MENU_INSTALL_EXPERIMENTAL_GEMINI: 'events:menu-install-experimental-gemini',
    MENU_RESET_LAYOUT: 'events:menu-reset-layout',
    MENU_TOGGLE_REMOTE_SERVER: 'events:menu-toggle-remote-server',
  },
}));

// Import after mocks
import { createMenu, updateMenu, setMenuProjectPath, updateWindowTitle, initializeMenuFocusTracking } from './menu';
import { getConfigStore } from './services/configStore';

describe('Menu Module', () => {
  let mockWindow: Partial<BrowserWindow>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEmit.mockClear();
    mockWindowManagerCreateWindow.mockClear();
    mockWindowManagerOnWindowFocus.mockClear();
    mockWindowManagerGetWindowProject.mockClear();
    mockWindowManagerGetAllWindowIds.mockClear().mockReturnValue([]);
    mockWindowManagerGetWindow.mockClear();

    mockWindow = {
      id: 1,
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

  // ============================================================
  // multi-window-integration Task 5.1: WindowManager.createWindow integration
  // ============================================================
  describe('multi-window Task 5.1: WindowManager.createWindow integration', () => {
    describe('New Window menu item', () => {
      it('should create a new window via WindowManager.createWindow() when "New Window" is clicked', () => {
        const newMockWindow = {
          id: 2,
          webContents: {
            send: vi.fn(),
            isLoading: vi.fn().mockReturnValue(false),
            once: vi.fn(),
          } as unknown as Electron.WebContents,
        };
        mockWindowManagerCreateWindow.mockReturnValue(newMockWindow);

        createMenu();

        const menuTemplate = vi.mocked(Menu.buildFromTemplate).mock.calls[0][0];
        const fileMenu = menuTemplate.find((item: any) => item.label === 'ファイル') as any;
        const newWindowItem = fileMenu.submenu.find((item: any) => item.label === '新しいウィンドウ');

        newWindowItem.click();

        expect(mockWindowManagerCreateWindow).toHaveBeenCalledOnce();
      });
    });

    describe('Recent project selection with project-less window', () => {
      it('should open recent project in a window without a project when one exists', () => {
        // Setup: Mock recent projects
        const mockGetRecentProjects = vi.fn(() => ['/path/to/project1']);
        vi.mocked(getConfigStore).mockReturnValue({
          getRecentProjects: mockGetRecentProjects,
          addRecentProject: vi.fn(),
          removeRecentProject: vi.fn(),
        } as any);

        // Setup: A window without project exists (windowId=1)
        const projectlessWindow = {
          id: 1,
          webContents: {
            send: vi.fn(),
            isLoading: vi.fn().mockReturnValue(false),
            once: vi.fn(),
          } as unknown as Electron.WebContents,
        };

        vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(projectlessWindow as BrowserWindow);
        vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([projectlessWindow as BrowserWindow]);

        // WindowManager reports that windowId=1 has no project
        mockWindowManagerGetAllWindowIds.mockReturnValue([1]);
        mockWindowManagerGetWindowProject.mockReturnValue(null);
        mockWindowManagerGetWindow.mockReturnValue(projectlessWindow);

        createMenu();

        const menuTemplate = vi.mocked(Menu.buildFromTemplate).mock.calls[0][0];
        const fileMenu = menuTemplate.find((item: any) => item.label === 'ファイル') as any;
        const recentProjectsMenu = fileMenu.submenu.find((item: any) => item.label === '最近のプロジェクト');
        const firstProject = recentProjectsMenu.submenu[0];

        firstProject.click();

        // Should NOT create a new window (use existing project-less window)
        expect(mockWindowManagerCreateWindow).not.toHaveBeenCalled();
        // Should emit event to open project in the project-less window
        expect(mockEmit).toHaveBeenCalledWith('events:menu-open-project', { projectPath: '/path/to/project1' });
      });

      it('should create a new window via WindowManager when all windows have projects', () => {
        // Setup: Mock recent projects
        const mockGetRecentProjects = vi.fn(() => ['/path/to/project2']);
        vi.mocked(getConfigStore).mockReturnValue({
          getRecentProjects: mockGetRecentProjects,
          addRecentProject: vi.fn(),
          removeRecentProject: vi.fn(),
        } as any);

        // Setup: All windows have projects
        const windowWithProject = {
          id: 1,
          webContents: {
            send: vi.fn(),
            isLoading: vi.fn().mockReturnValue(false),
            once: vi.fn(),
          } as unknown as Electron.WebContents,
        };

        vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(windowWithProject as BrowserWindow);
        vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([windowWithProject as BrowserWindow]);

        // WindowManager reports that windowId=1 has a project
        mockWindowManagerGetAllWindowIds.mockReturnValue([1]);
        mockWindowManagerGetWindowProject.mockReturnValue('/path/to/project1');

        // New window created by WindowManager
        const newWindow = {
          id: 2,
          webContents: {
            send: vi.fn(),
            isLoading: vi.fn().mockReturnValue(false),
            once: vi.fn(),
          } as unknown as Electron.WebContents,
        };
        mockWindowManagerCreateWindow.mockReturnValue(newWindow);
        // After creating new window, getAllWindows returns both
        vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([windowWithProject as BrowserWindow, newWindow as BrowserWindow]);

        createMenu();

        const menuTemplate = vi.mocked(Menu.buildFromTemplate).mock.calls[0][0];
        const fileMenu = menuTemplate.find((item: any) => item.label === 'ファイル') as any;
        const recentProjectsMenu = fileMenu.submenu.find((item: any) => item.label === '最近のプロジェクト');
        const firstProject = recentProjectsMenu.submenu[0];

        firstProject.click();

        // Should create a new window via WindowManager
        expect(mockWindowManagerCreateWindow).toHaveBeenCalledOnce();
        expect(mockEmit).toHaveBeenCalledWith('events:menu-open-project', { projectPath: '/path/to/project2' });
      });

      it('should create a new window via WindowManager when no windows exist', () => {
        // Setup: Mock recent projects
        const mockGetRecentProjects = vi.fn(() => ['/path/to/project1']);
        vi.mocked(getConfigStore).mockReturnValue({
          getRecentProjects: mockGetRecentProjects,
          addRecentProject: vi.fn(),
          removeRecentProject: vi.fn(),
        } as any);

        // Setup: No windows exist
        vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(null);
        vi.mocked(BrowserWindow.getAllWindows).mockReturnValueOnce([]);
        mockWindowManagerGetAllWindowIds.mockReturnValue([]);

        // WindowManager creates new window
        const newWindow = {
          id: 1,
          webContents: {
            send: vi.fn(),
            isLoading: vi.fn().mockReturnValue(false),
            once: vi.fn(),
          } as unknown as Electron.WebContents,
        };
        mockWindowManagerCreateWindow.mockReturnValue(newWindow);
        // After creating window, getAllWindows returns it
        mockWindowManagerCreateWindow.mockImplementation(() => {
          vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([newWindow as BrowserWindow]);
          return newWindow;
        });

        createMenu();

        const menuTemplate = vi.mocked(Menu.buildFromTemplate).mock.calls[0][0];
        const fileMenu = menuTemplate.find((item: any) => item.label === 'ファイル') as any;
        const recentProjectsMenu = fileMenu.submenu.find((item: any) => item.label === '最近のプロジェクト');
        const firstProject = recentProjectsMenu.submenu[0];

        firstProject.click();

        expect(mockWindowManagerCreateWindow).toHaveBeenCalledOnce();
        expect(mockEmit).toHaveBeenCalledWith('events:menu-open-project', { projectPath: '/path/to/project1' });
      });
    });

    describe('Open Project Dialog with WindowManager', () => {
      it('should create window via WindowManager if no window exists when opening project dialog', async () => {
        // Setup: No windows exist
        vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(null);
        vi.mocked(BrowserWindow.getAllWindows).mockReturnValueOnce([]);

        const newWindow = {
          id: 1,
          webContents: {
            send: vi.fn(),
            isLoading: vi.fn().mockReturnValue(false),
            once: vi.fn(),
          } as unknown as Electron.WebContents,
        };
        mockWindowManagerCreateWindow.mockImplementation(() => {
          vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([newWindow as BrowserWindow]);
          return newWindow;
        });

        // Mock dialog result
        vi.mocked(dialog.showOpenDialog).mockResolvedValue({
          canceled: false,
          filePaths: ['/selected/project'],
        } as any);

        createMenu();

        const menuTemplate = vi.mocked(Menu.buildFromTemplate).mock.calls[0][0];
        const fileMenu = menuTemplate.find((item: any) => item.label === 'ファイル') as any;
        const openProjectItem = fileMenu.submenu.find((item: any) => item.label === 'プロジェクトを開く...');

        await openProjectItem.click();

        expect(mockWindowManagerCreateWindow).toHaveBeenCalledOnce();
        expect(dialog.showOpenDialog).toHaveBeenCalledWith(newWindow, {
          properties: ['openDirectory'],
          title: 'プロジェクトディレクトリを選択',
        });
        expect(mockEmit).toHaveBeenCalledWith('events:menu-open-project', { projectPath: '/selected/project' });
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

        const menuTemplate = vi.mocked(Menu.buildFromTemplate).mock.calls[0][0];
        const fileMenu = menuTemplate.find((item: any) => item.label === 'ファイル') as any;
        const openProjectItem = fileMenu.submenu.find((item: any) => item.label === 'プロジェクトを開く...');

        await openProjectItem.click();

        expect(mockWindowManagerCreateWindow).not.toHaveBeenCalled();
        expect(dialog.showOpenDialog).toHaveBeenCalled();
      });

      it('should wait for window to load before sending event when project is selected', async () => {
        // Setup: No windows exist
        vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(null);
        vi.mocked(BrowserWindow.getAllWindows).mockReturnValueOnce([]);

        const mockLoadingWindow = {
          id: 1,
          webContents: {
            send: vi.fn(),
            isLoading: vi.fn().mockReturnValue(true),
            once: vi.fn((event: string, callback: () => void) => {
              if (event === 'did-finish-load') {
                callback();
              }
            }),
          } as unknown as Electron.WebContents,
        };

        mockWindowManagerCreateWindow.mockImplementation(() => {
          vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([mockLoadingWindow as BrowserWindow]);
          return mockLoadingWindow;
        });

        // Mock dialog result
        vi.mocked(dialog.showOpenDialog).mockResolvedValue({
          canceled: false,
          filePaths: ['/selected/project'],
        } as any);

        createMenu();

        const menuTemplate = vi.mocked(Menu.buildFromTemplate).mock.calls[0][0];
        const fileMenu = menuTemplate.find((item: any) => item.label === 'ファイル') as any;
        const openProjectItem = fileMenu.submenu.find((item: any) => item.label === 'プロジェクトを開く...');

        await openProjectItem.click();

        expect(mockLoadingWindow.webContents.once).toHaveBeenCalledWith('did-finish-load', expect.any(Function));
        expect(mockEmit).toHaveBeenCalledWith('events:menu-open-project', { projectPath: '/selected/project' });
      });
    });
  });

  // ============================================================
  // multi-window-integration Task 5.2: Focused window menu context tracking
  // ============================================================
  describe('multi-window Task 5.2: Focused window menu context tracking', () => {
    it('should register onWindowFocus callback via initializeMenuFocusTracking', () => {
      initializeMenuFocusTracking();

      expect(mockWindowManagerOnWindowFocus).toHaveBeenCalledOnce();
      expect(mockWindowManagerOnWindowFocus).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should call setMenuProjectPath with the focused window project path when a window gains focus', () => {
      initializeMenuFocusTracking();

      // Extract the callback registered via onWindowFocus
      const focusCallback = mockWindowManagerOnWindowFocus.mock.calls[0][0];

      // Simulate window focus with windowId=1 that has a project
      mockWindowManagerGetWindowProject.mockReturnValue('/path/to/my-project');
      focusCallback(1);

      // setMenuProjectPath should be called, rebuilding the menu
      // We verify this by checking the menu was rebuilt
      expect(Menu.buildFromTemplate).toHaveBeenCalled();
      expect(Menu.setApplicationMenu).toHaveBeenCalled();
    });

    it('should call setMenuProjectPath(null) when a window without project gains focus', () => {
      initializeMenuFocusTracking();

      const focusCallback = mockWindowManagerOnWindowFocus.mock.calls[0][0];

      // Simulate window focus with windowId=2 that has no project
      mockWindowManagerGetWindowProject.mockReturnValue(null);
      focusCallback(2);

      // Menu should be rebuilt
      expect(Menu.buildFromTemplate).toHaveBeenCalled();

      // Verify that project-dependent menu items are disabled
      // We can check by creating the menu and inspecting the template
      const menuTemplate = vi.mocked(Menu.buildFromTemplate).mock.calls.at(-1)?.[0];
      const toolsMenu = menuTemplate?.find((item: any) => item.label === 'ツール') as any;
      const installCommandsetItem = toolsMenu?.submenu?.find((item: any) =>
        item.label === 'コマンドセットをインストール...'
      );

      expect(installCommandsetItem?.enabled).toBe(false);
    });

    it('should enable project-dependent menu items when focused window has a project', () => {
      initializeMenuFocusTracking();

      const focusCallback = mockWindowManagerOnWindowFocus.mock.calls[0][0];

      // Simulate window focus with windowId=1 that has a project
      mockWindowManagerGetWindowProject.mockReturnValue('/path/to/project');
      focusCallback(1);

      // Verify that project-dependent menu items are enabled
      const menuTemplate = vi.mocked(Menu.buildFromTemplate).mock.calls.at(-1)?.[0];
      const toolsMenu = menuTemplate?.find((item: any) => item.label === 'ツール') as any;
      const installCommandsetItem = toolsMenu?.submenu?.find((item: any) =>
        item.label === 'コマンドセットをインストール...'
      );

      expect(installCommandsetItem?.enabled).toBe(true);
    });
  });

  describe('Menu items - Open Recent Project (legacy tests)', () => {
    it('should not create window if window already exists when opening recent project', () => {
      // Setup: Mock recent projects
      const mockGetRecentProjects = vi.fn(() => ['/path/to/project1']);
      vi.mocked(getConfigStore).mockReturnValue({
        getRecentProjects: mockGetRecentProjects,
        addRecentProject: vi.fn(),
        removeRecentProject: vi.fn(),
      } as any);

      // Setup: Window exists with no project
      vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(mockWindow as BrowserWindow);
      vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([mockWindow as BrowserWindow]);

      // WindowManager reports window without project
      mockWindowManagerGetAllWindowIds.mockReturnValue([1]);
      mockWindowManagerGetWindowProject.mockReturnValue(null);
      mockWindowManagerGetWindow.mockReturnValue(mockWindow);

      createMenu();

      // Get the menu template
      const menuTemplate = vi.mocked(Menu.buildFromTemplate).mock.calls[0][0];
      const fileMenu = menuTemplate.find((item: any) => item.label === 'ファイル') as any;
      const recentProjectsMenu = fileMenu.submenu.find((item: any) => item.label === '最近のプロジェクト');
      const firstProject = recentProjectsMenu.submenu[0];

      // Trigger the click handler
      firstProject.click();

      // Verify createWindow was NOT called (use existing project-less window)
      expect(mockWindowManagerCreateWindow).not.toHaveBeenCalled();
      expect(mockEmit).toHaveBeenCalledWith('events:menu-open-project', { projectPath: '/path/to/project1' });
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
      mockWindowManagerGetAllWindowIds.mockReturnValue([]);

      const mockLoadingWindow = {
        id: 1,
        webContents: {
          send: vi.fn(),
          isLoading: vi.fn().mockReturnValue(true),
          once: vi.fn((event: string, callback: () => void) => {
            // Simulate did-finish-load event
            if (event === 'did-finish-load') {
              callback();
            }
          }),
        } as unknown as Electron.WebContents,
      };

      mockWindowManagerCreateWindow.mockImplementation(() => {
        vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([mockLoadingWindow as BrowserWindow]);
        return mockLoadingWindow;
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
      // Verify eventBus.emit was called after load
      expect(mockEmit).toHaveBeenCalledWith('events:menu-open-project', { projectPath: '/path/to/project1' });
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

      // Verify the eventBus was used instead of webContents.send
      expect(mockEmit).toHaveBeenCalledWith('events:menu-install-commandset', { _src: 'menu' });
    });
  });
});
