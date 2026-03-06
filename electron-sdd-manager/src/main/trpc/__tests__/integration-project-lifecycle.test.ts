/**
 * Integration Test: Project Selection -> Service Lifecycle
 * multi-window-integration Task 9.3
 * Requirements: 1.5, 3.5, 3.6, 5.1
 * Integration Point: Design.md "Test 3: プロジェクト選択とサービスライフサイクル"
 *
 * Tests the end-to-end flow of:
 * - selectProject(path, windowId) creating PerWindowServices
 * - closeWindow cleaning up Watchers and removing Map entries
 * - Duplicate project detection returning DUPLICATE_PROJECT error
 *
 * Components under test:
 * - WindowManager (real, with mocked Electron BrowserWindow)
 * - selectProject (from projectSetup, heavily mocked dependencies)
 * - PerWindowServices lifecycle
 *
 * Mock boundaries:
 * - Electron BrowserWindow, app, screen (mocked)
 * - FileService, BugService (mocked)
 * - SpecManagerService, WatcherServices (mocked via WindowManager)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================
// Mock Electron
// ============================================================

const mockBrowserWindows: Map<number, any> = new Map();
let nextWindowId = 1;

function createMockBrowserWindow(overrides?: Partial<any>) {
  const id = nextWindowId++;
  const handlers: Record<string, Function[]> = {};
  const win = {
    id,
    isDestroyed: vi.fn(() => false),
    isMaximized: vi.fn(() => false),
    isMinimized: vi.fn(() => false),
    close: vi.fn(() => {
      // Trigger closed event
      const closedHandlers = handlers['closed'] || [];
      closedHandlers.forEach((h) => h());
    }),
    focus: vi.fn(),
    restore: vi.fn(),
    show: vi.fn(),
    maximize: vi.fn(),
    setTitle: vi.fn(),
    loadURL: vi.fn(),
    loadFile: vi.fn(),
    getBounds: vi.fn(() => ({ x: 100, y: 100, width: 1200, height: 800 })),
    on: vi.fn((event: string, handler: Function) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
    }),
    once: vi.fn((event: string, handler: Function) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
      // Simulate ready-to-show
      if (event === 'ready-to-show') {
        setTimeout(() => handler(), 0);
      }
    }),
    webContents: {
      id: id * 100,
      openDevTools: vi.fn(),
    },
    // Helper to fire event manually
    _triggerEvent: (event: string) => {
      const eventHandlers = handlers[event] || [];
      eventHandlers.forEach((h) => h());
    },
    ...overrides,
  };
  mockBrowserWindows.set(id, win);
  return win;
}

vi.mock('electron', () => {
  return {
    BrowserWindow: class MockBrowserWindow {
      constructor() {
        const win = createMockBrowserWindow();
        Object.assign(this, win);
        return win as any;
      }
      static getAllWindows() {
        return Array.from(mockBrowserWindows.values());
      }
      static getFocusedWindow() {
        return mockBrowserWindows.values().next().value ?? null;
      }
      static fromWebContents() {
        return null;
      }
    },
    app: {
      isPackaged: false,
      getVersion: vi.fn(() => '1.0.0'),
      getPath: vi.fn(() => '/tmp'),
      getAppPath: vi.fn(() => '/test/app'),
      whenReady: vi.fn(() => Promise.resolve()),
    },
    screen: {
      getPrimaryDisplay: vi.fn(() => ({
        workArea: { x: 0, y: 0, width: 1920, height: 1080 },
      })),
      getAllDisplays: vi.fn(() => [
        { workArea: { x: 0, y: 0, width: 1920, height: 1080 } },
      ]),
    },
  };
});

// Mock projectLogger
vi.mock('../../services/projectLogger', () => ({
  projectLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    setCurrentProject: vi.fn(),
  },
}));

// Mock configStore
vi.mock('../../services/configStore', () => ({
  getConfigStore: vi.fn(() => ({
    getWindowBounds: vi.fn(() => null),
    setMultiWindowStates: vi.fn(),
    getMultiWindowStates: vi.fn(() => []),
    addRecentProject: vi.fn(),
  })),
}));

// Mock layoutConfigService
vi.mock('../../services/layoutConfigService', () => ({
  layoutConfigService: {
    loadSkipPermissions: vi.fn().mockResolvedValue(false),
    saveSkipPermissions: vi.fn(),
    loadProjectDefaults: vi.fn().mockResolvedValue(undefined),
    saveProjectDefaults: vi.fn(),
    loadProfile: vi.fn().mockResolvedValue(null),
    loadRemoteUiAutoStart: vi.fn().mockResolvedValue(false),
    saveRemoteUiAutoStart: vi.fn(),
  },
}));

// Mock SpecManagerService and Watcher services
vi.mock('../../services/specManagerService', () => ({
  SpecManagerService: vi.fn(() => ({
    readSpecs: vi.fn().mockResolvedValue([]),
    restoreAgents: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../services/specsWatcherService', () => ({
  SpecsWatcherService: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
}));

vi.mock('../../services/agentRecordWatcherService', () => ({
  AgentRecordWatcherService: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
}));

vi.mock('../../services/bugsWatcherService', () => ({
  BugsWatcherService: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
}));

vi.mock('../../services/metricsService', () => ({
  MetricsService: vi.fn(() => ({
    setProjectPath: vi.fn(),
  })),
}));

vi.mock('../../services/metricsFileWriter', () => ({
  MetricsFileWriter: vi.fn(() => ({})),
}));

vi.mock('../../services/metricsFileReader', () => ({
  MetricsFileReader: vi.fn(() => ({})),
}));

vi.mock('../../services/autoExecutionCoordinator', () => ({
  AutoExecutionCoordinator: vi.fn(() => ({
    resetAll: vi.fn(),
    on: vi.fn(),
  })),
}));

vi.mock('../../services/fileService', () => ({
  FileService: vi.fn(() => ({
    readSpecs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    validateKiroDirectory: vi.fn().mockResolvedValue({ exists: true, hasSpecs: true, hasSteering: true }),
  })),
}));

// ============================================================
// Integration Tests
// ============================================================

describe('Task 9.3: プロジェクト選択→サービスライフサイクルの統合テスト', () => {
  let WindowManager: typeof import('../../services/windowManager').WindowManager;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockBrowserWindows.clear();
    nextWindowId = 1;

    // Dynamic import to get fresh module
    const module = await import('../../services/windowManager');
    WindowManager = module.WindowManager;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setWindowProject後のPerWindowServices生成', () => {
    it('setWindowProjectでPerWindowServicesが生成されること', () => {
      const wm = new WindowManager();
      const win = wm.createWindow();

      const result = wm.setWindowProject(win.id, '/project/A');

      expect(result.ok).toBe(true);

      // Verify services were created
      const services = wm.getWindowServices(win.id);
      expect(services).not.toBeNull();
      expect(services).toHaveProperty('specManagerService');
      expect(services).toHaveProperty('specsWatcherService');
      expect(services).toHaveProperty('agentRecordWatcherService');
      // bugsWatcherService removed (github-issue-integration)
      expect(services).toHaveProperty('metricsService');
      expect(services).toHaveProperty('autoExecutionCoordinator');
    });

    it('setWindowProjectで正しいprojectPathが設定されること', () => {
      const wm = new WindowManager();
      const win = wm.createWindow();

      wm.setWindowProject(win.id, '/project/A');

      expect(wm.getWindowProject(win.id)).toBe('/project/A');
    });

    it('getWindowContextが完全なコンテキストを返すこと', () => {
      const wm = new WindowManager();
      const win = wm.createWindow();

      wm.setWindowProject(win.id, '/project/A');

      const ctx = wm.getWindowContext(win.id);
      expect(ctx).not.toBeNull();
      expect(ctx!.windowId).toBe(win.id);
      expect(ctx!.projectPath).toBe('/project/A');
      expect(ctx!.services).not.toBeNull();
    });
  });

  describe('closeWindow後のWatcher停止とMapクリーンアップ', () => {
    it('ウィンドウクローズ後にWindowStateが削除されること', () => {
      const wm = new WindowManager();
      const win = wm.createWindow();

      wm.setWindowProject(win.id, '/project/A');

      // Verify window exists
      expect(wm.getWindowProject(win.id)).toBe('/project/A');
      expect(wm.getAllWindowIds()).toContain(win.id);

      // Close window (triggers 'closed' event)
      wm.closeWindow(win.id);

      // Verify state is cleaned up
      expect(wm.getWindowProject(win.id)).toBeNull();
      expect(wm.getAllWindowIds()).not.toContain(win.id);
    });

    it('ウィンドウクローズ後にPerWindowServicesが削除されること', () => {
      const wm = new WindowManager();
      const win = wm.createWindow();

      wm.setWindowProject(win.id, '/project/A');

      // Verify services exist
      const servicesBefore = wm.getWindowServices(win.id);
      expect(servicesBefore).not.toBeNull();

      // Close window
      wm.closeWindow(win.id);

      // Verify services are cleaned up
      const servicesAfter = wm.getWindowServices(win.id);
      expect(servicesAfter).toBeNull();
    });

    it('ウィンドウクローズ後にWatcher停止メソッドが呼ばれること', () => {
      const wm = new WindowManager();
      const win = wm.createWindow();

      wm.setWindowProject(win.id, '/project/A');

      // Get services reference before close
      const services = wm.getWindowServices(win.id)!;
      const specsStop = services.specsWatcherService.stop;
      const agentRecordStop = services.agentRecordWatcherService.stop;
      // bugsWatcherService removed (github-issue-integration)
      const autoExecReset = services.autoExecutionCoordinator.resetAll;

      // Close window
      wm.closeWindow(win.id);

      // Verify watchers were stopped
      expect(specsStop).toHaveBeenCalled();
      expect(agentRecordStop).toHaveBeenCalled();
      expect(autoExecReset).toHaveBeenCalled();
    });

    it('ウィンドウクローズ後にprojectWindowMapから削除されること', () => {
      const wm = new WindowManager();
      const win = wm.createWindow();

      wm.setWindowProject(win.id, '/project/A');

      // Verify project is mapped
      expect(wm.checkDuplicate('/project/A')).toBe(win.id);

      // Close window
      wm.closeWindow(win.id);

      // Verify project mapping is removed
      expect(wm.checkDuplicate('/project/A')).toBeNull();
    });

    it('ウィンドウクローズ後にwebContentsToWindowIdから削除されること', () => {
      const wm = new WindowManager();
      const win = wm.createWindow();

      // Verify webContents mapping exists
      const webContentsId = win.webContents.id;
      expect(wm.getWindowIdByWebContents(webContentsId)).toBe(win.id);

      // Close window
      wm.closeWindow(win.id);

      // Verify webContents mapping is removed
      expect(wm.getWindowIdByWebContents(webContentsId)).toBeNull();
    });
  });

  describe('重複プロジェクト選択の検出', () => {
    it('同一プロジェクトを別ウィンドウで開こうとするとDUPLICATE_PROJECTエラーが返されること', () => {
      const wm = new WindowManager();
      const winA = wm.createWindow();
      const winB = wm.createWindow();

      // Window A opens project
      const resultA = wm.setWindowProject(winA.id, '/project/A');
      expect(resultA.ok).toBe(true);

      // Window B tries to open same project
      const resultB = wm.setWindowProject(winB.id, '/project/A');
      expect(resultB.ok).toBe(false);

      if (!resultB.ok) {
        expect(resultB.error.type).toBe('DUPLICATE_PROJECT');
        expect(resultB.error.existingWindowId).toBe(winA.id);
        expect(resultB.error.projectPath).toBe('/project/A');
      }
    });

    it('ウィンドウクローズ後に同じプロジェクトを別ウィンドウで開けること', () => {
      const wm = new WindowManager();
      const winA = wm.createWindow();
      const winB = wm.createWindow();

      // Window A opens project
      wm.setWindowProject(winA.id, '/project/A');

      // Close window A
      wm.closeWindow(winA.id);

      // Window B should now be able to open the same project
      const resultB = wm.setWindowProject(winB.id, '/project/A');
      expect(resultB.ok).toBe(true);
      expect(wm.getWindowProject(winB.id)).toBe('/project/A');
    });

    it('checkDuplicateが既存ウィンドウIDを返すこと', () => {
      const wm = new WindowManager();
      const win = wm.createWindow();

      wm.setWindowProject(win.id, '/project/A');

      expect(wm.checkDuplicate('/project/A')).toBe(win.id);
      expect(wm.checkDuplicate('/project/B')).toBeNull();
    });

    it('異なるプロジェクトはそれぞれ別のウィンドウで開けること', () => {
      const wm = new WindowManager();
      const winA = wm.createWindow();
      const winB = wm.createWindow();

      const resultA = wm.setWindowProject(winA.id, '/project/A');
      const resultB = wm.setWindowProject(winB.id, '/project/B');

      expect(resultA.ok).toBe(true);
      expect(resultB.ok).toBe(true);
      expect(wm.getWindowProject(winA.id)).toBe('/project/A');
      expect(wm.getWindowProject(winB.id)).toBe('/project/B');
    });
  });

  describe('複合ライフサイクルシナリオ', () => {
    it('3ウィンドウの作成→プロジェクト設定→1つクローズ→残り2つの整合性', () => {
      const wm = new WindowManager();
      const win1 = wm.createWindow();
      const win2 = wm.createWindow();
      const win3 = wm.createWindow();

      wm.setWindowProject(win1.id, '/project/A');
      wm.setWindowProject(win2.id, '/project/B');
      wm.setWindowProject(win3.id, '/project/C');

      // Verify all 3 windows are tracked
      expect(wm.getAllWindowIds().length).toBe(3);

      // Close window 2
      wm.closeWindow(win2.id);

      // Verify only 2 windows remain
      expect(wm.getAllWindowIds().length).toBe(2);
      expect(wm.getWindowProject(win1.id)).toBe('/project/A');
      expect(wm.getWindowProject(win2.id)).toBeNull(); // removed
      expect(wm.getWindowProject(win3.id)).toBe('/project/C');

      // Project B should now be available for re-opening
      expect(wm.checkDuplicate('/project/B')).toBeNull();
    });

    it('プロジェクト切り替え（同一ウィンドウで別プロジェクトを開く）', () => {
      const wm = new WindowManager();
      const win = wm.createWindow();

      // Open project A
      wm.setWindowProject(win.id, '/project/A');
      expect(wm.getWindowProject(win.id)).toBe('/project/A');
      expect(wm.checkDuplicate('/project/A')).toBe(win.id);

      // Switch to project B
      wm.setWindowProject(win.id, '/project/B');
      expect(wm.getWindowProject(win.id)).toBe('/project/B');
      expect(wm.checkDuplicate('/project/B')).toBe(win.id);

      // Project A should no longer be tracked as duplicate
      expect(wm.checkDuplicate('/project/A')).toBeNull();
    });

    it('onWindowCloseコールバックがクローズ時に呼ばれること', () => {
      const wm = new WindowManager();
      const closeCallback = vi.fn();
      wm.onWindowClose(closeCallback);

      const win = wm.createWindow();
      wm.setWindowProject(win.id, '/project/A');

      wm.closeWindow(win.id);

      expect(closeCallback).toHaveBeenCalledWith(win.id);
    });
  });
});
