/**
 * WindowContextFactory unit tests
 * multi-window-integration Task 2.1 / 2.4
 * Requirements: 3.1, 3.2, 3.3
 *
 * Verifies:
 * - createWindowContextFactory returns a createContext function
 * - Different event.sender produces different projectPath contexts
 * - Window not found falls back to focused window with log
 * - Per-window services are injected into ContextServices
 * - Per-window property closure binding (selectProject, getCurrentProjectPath, etc.)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ContextServices } from '../context';

// Mock electron
const mockFromWebContents = vi.fn();
const mockGetFocusedWindow = vi.fn();

vi.mock('electron', () => ({
  BrowserWindow: {
    fromWebContents: (...args: any[]) => mockFromWebContents(...args),
    getFocusedWindow: () => mockGetFocusedWindow(),
    getAllWindows: vi.fn(() => []),
  },
  app: {
    isPackaged: false,
    getVersion: vi.fn(() => '1.0.0'),
    getPath: vi.fn(() => '/tmp'),
    getAppPath: vi.fn(() => '/test/app'),
  },
  screen: {
    getPrimaryDisplay: vi.fn(() => ({
      workArea: { x: 0, y: 0, width: 1920, height: 1080 },
    })),
    getAllDisplays: vi.fn(() => [
      { workArea: { x: 0, y: 0, width: 1920, height: 1080 } },
    ]),
  },
}));

// Mock projectLogger
vi.mock('../../services/projectLogger', () => ({
  projectLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Create a mock WindowManager
function createMockWindowManager(config: {
  windows: Map<number, {
    windowId: number;
    projectPath: string | null;
    services: any;
  }>;
  webContentsToWindowId: Map<number, number>;
  focusedWindowId?: number;
}) {
  return {
    getWindowIdByWebContents: vi.fn((webContentsId: number) => {
      return config.webContentsToWindowId.get(webContentsId) ?? null;
    }),
    getWindowContext: vi.fn((windowId: number) => {
      return config.windows.get(windowId) ?? null;
    }),
    getFocusedWindowId: vi.fn(() => config.focusedWindowId ?? null),
    getWindowProject: vi.fn((windowId: number) => {
      const win = config.windows.get(windowId);
      return win?.projectPath ?? null;
    }),
    getWindowServices: vi.fn((windowId: number) => {
      const win = config.windows.get(windowId);
      return win?.services ?? null;
    }),
  };
}

describe('createWindowContextFactory', () => {
  let createWindowContextFactory: typeof import('../windowContextFactory').createWindowContextFactory;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import('../windowContextFactory');
    createWindowContextFactory = module.createWindowContextFactory;
  });

  it('should return a createContext function', () => {
    const mockWM = createMockWindowManager({
      windows: new Map(),
      webContentsToWindowId: new Map(),
    });

    const sharedServices: Partial<ContextServices> = {};
    const contextFn = createWindowContextFactory(mockWM as any, sharedServices);

    expect(typeof contextFn).toBe('function');
  });

  it('should resolve windowId from event.sender via BrowserWindow.fromWebContents', async () => {
    const mockWM = createMockWindowManager({
      windows: new Map([
        [1, { windowId: 1, projectPath: '/project-a', services: { specManagerService: { readSpecs: vi.fn() } } }],
      ]),
      webContentsToWindowId: new Map([[101, 1]]),
    });

    const mockSender = { id: 101 };
    const mockBrowserWindow = { id: 1, webContents: mockSender };
    mockFromWebContents.mockReturnValue(mockBrowserWindow);

    const sharedServices: Partial<ContextServices> = {
      fileService: null,
      configStore: null,
    };
    const contextFn = createWindowContextFactory(mockWM as any, sharedServices);

    const ctx = await contextFn({ event: { sender: mockSender } as any });

    expect(ctx.services.windowId).toBe(1);
    expect(ctx.services.getCurrentProjectPath()).toBe('/project-a');
  });

  it('should produce different contexts for different event.senders (different windows)', async () => {
    const mockWM = createMockWindowManager({
      windows: new Map([
        [1, { windowId: 1, projectPath: '/project-a', services: { specManagerService: { readSpecs: vi.fn() } } }],
        [2, { windowId: 2, projectPath: '/project-b', services: { specManagerService: { readSpecs: vi.fn() } } }],
      ]),
      webContentsToWindowId: new Map([[101, 1], [102, 2]]),
    });

    const mockSenderA = { id: 101 };
    const mockSenderB = { id: 102 };
    const mockBrowserWindowA = { id: 1, webContents: mockSenderA };
    const mockBrowserWindowB = { id: 2, webContents: mockSenderB };

    mockFromWebContents.mockImplementation((sender: any) => {
      if (sender === mockSenderA) return mockBrowserWindowA;
      if (sender === mockSenderB) return mockBrowserWindowB;
      return null;
    });

    const sharedServices: Partial<ContextServices> = {};
    const contextFn = createWindowContextFactory(mockWM as any, sharedServices);

    const ctxA = await contextFn({ event: { sender: mockSenderA } as any });
    const ctxB = await contextFn({ event: { sender: mockSenderB } as any });

    // Different windows should produce different projectPaths
    expect(ctxA.services.getCurrentProjectPath()).toBe('/project-a');
    expect(ctxB.services.getCurrentProjectPath()).toBe('/project-b');
    expect(ctxA.services.windowId).toBe(1);
    expect(ctxB.services.windowId).toBe(2);
  });

  it('should fall back to focused window when BrowserWindow.fromWebContents returns null', async () => {
    const { projectLogger } = await import('../../services/projectLogger');
    const mockWM = createMockWindowManager({
      windows: new Map([
        [3, { windowId: 3, projectPath: '/project-c', services: { specManagerService: { readSpecs: vi.fn() } } }],
      ]),
      webContentsToWindowId: new Map(),
      focusedWindowId: 3,
    });

    mockFromWebContents.mockReturnValue(null);

    const sharedServices: Partial<ContextServices> = {};
    const contextFn = createWindowContextFactory(mockWM as any, sharedServices);

    const ctx = await contextFn({ event: { sender: { id: 999 } } as any });

    // Should fall back to focused window
    expect(ctx.services.windowId).toBe(3);
    expect(ctx.services.getCurrentProjectPath()).toBe('/project-c');
    // Should log a warning
    expect(projectLogger.warn).toHaveBeenCalled();
  });

  it('should use shared services as base and overlay per-window services', async () => {
    const mockSpecManager = { readSpecs: vi.fn().mockResolvedValue([]) };
    const mockWM = createMockWindowManager({
      windows: new Map([
        [1, {
          windowId: 1,
          projectPath: '/project-a',
          services: { specManagerService: mockSpecManager },
        }],
      ]),
      webContentsToWindowId: new Map([[101, 1]]),
    });

    const mockSender = { id: 101 };
    const mockBrowserWindow = { id: 1, webContents: mockSender };
    mockFromWebContents.mockReturnValue(mockBrowserWindow);

    const mockConfigStore = { getRecentProjects: vi.fn().mockReturnValue([]) };
    const sharedServices: Partial<ContextServices> = {
      configStore: mockConfigStore as any,
      fileService: null,
    };
    const contextFn = createWindowContextFactory(mockWM as any, sharedServices);

    const ctx = await contextFn({ event: { sender: mockSender } as any });

    // Shared services should be present
    expect(ctx.services.configStore).toBe(mockConfigStore);
    // Per-window services should be overlaid
    expect(ctx.services.getSpecManagerService()).toBe(mockSpecManager);
  });

  it('should bind selectProject with windowId via closure', async () => {
    const mockSelectProject = vi.fn().mockResolvedValue({
      success: true,
      projectPath: '/project-a',
      kiroValidation: { exists: true, hasSpecs: true, hasSteering: true },
      specs: [],
      bugs: [],
      specJsonMap: {},
    });

    const mockWM = createMockWindowManager({
      windows: new Map([
        [1, { windowId: 1, projectPath: '/project-a', services: null }],
      ]),
      webContentsToWindowId: new Map([[101, 1]]),
    });

    const mockSender = { id: 101 };
    const mockBrowserWindow = { id: 1, webContents: mockSender };
    mockFromWebContents.mockReturnValue(mockBrowserWindow);

    const sharedServices: Partial<ContextServices> = {
      selectProject: mockSelectProject,
    };
    const contextFn = createWindowContextFactory(mockWM as any, sharedServices);

    const ctx = await contextFn({ event: { sender: mockSender } as any });

    // selectProject should be a window-bound closure
    await ctx.services.selectProject('/new-project');

    // The underlying selectProject should have been called with both path and windowId
    expect(mockSelectProject).toHaveBeenCalledWith('/new-project', 1);
  });

  it('should return default context when no window can be resolved and no focused window', async () => {
    const mockWM = createMockWindowManager({
      windows: new Map(),
      webContentsToWindowId: new Map(),
      focusedWindowId: undefined,
    });

    mockFromWebContents.mockReturnValue(null);

    const sharedServices: Partial<ContextServices> = {};
    const contextFn = createWindowContextFactory(mockWM as any, sharedServices);

    const ctx = await contextFn({ event: { sender: { id: 999 } } as any });

    // windowId should be undefined (no window resolved)
    expect(ctx.services.windowId).toBeUndefined();
    // getCurrentProjectPath should use default (null)
    expect(ctx.services.getCurrentProjectPath()).toBeNull();
  });

  it('should produce per-window getSpecManagerService that returns window-specific instance', async () => {
    const mockSpecManagerA = { readSpecs: vi.fn().mockResolvedValue(['spec-a']) };
    const mockSpecManagerB = { readSpecs: vi.fn().mockResolvedValue(['spec-b']) };

    const mockWM = createMockWindowManager({
      windows: new Map([
        [1, { windowId: 1, projectPath: '/project-a', services: { specManagerService: mockSpecManagerA } }],
        [2, { windowId: 2, projectPath: '/project-b', services: { specManagerService: mockSpecManagerB } }],
      ]),
      webContentsToWindowId: new Map([[101, 1], [102, 2]]),
    });

    const mockSenderA = { id: 101 };
    const mockSenderB = { id: 102 };
    mockFromWebContents.mockImplementation((sender: any) => {
      if (sender === mockSenderA) return { id: 1, webContents: mockSenderA };
      if (sender === mockSenderB) return { id: 2, webContents: mockSenderB };
      return null;
    });

    const sharedServices: Partial<ContextServices> = {};
    const contextFn = createWindowContextFactory(mockWM as any, sharedServices);

    const ctxA = await contextFn({ event: { sender: mockSenderA } as any });
    const ctxB = await contextFn({ event: { sender: mockSenderB } as any });

    // Each context should return its own specManagerService
    expect(ctxA.services.getSpecManagerService()).toBe(mockSpecManagerA);
    expect(ctxB.services.getSpecManagerService()).toBe(mockSpecManagerB);
    expect(ctxA.services.getSpecManagerService()).not.toBe(mockSpecManagerB);
  });

  it('should resolve window via getWindowIdByWebContents without BrowserWindow.fromWebContents', async () => {
    const mockSpecManager = { readSpecs: vi.fn() };
    const mockWM = createMockWindowManager({
      windows: new Map([
        [1, { windowId: 1, projectPath: '/project-a', services: { specManagerService: mockSpecManager } }],
      ]),
      webContentsToWindowId: new Map([[101, 1]]),
    });

    // BrowserWindow.fromWebContents returns null — simulating the case where
    // Electron API fails but WindowManager's internal map succeeds
    mockFromWebContents.mockReturnValue(null);

    const sharedServices: Partial<ContextServices> = {};
    const contextFn = createWindowContextFactory(mockWM as any, sharedServices);

    const ctx = await contextFn({ event: { sender: { id: 101 } } as any });

    // Should resolve via primary path (getWindowIdByWebContents)
    expect(mockWM.getWindowIdByWebContents).toHaveBeenCalledWith(101);
    expect(ctx.services.windowId).toBe(1);
    expect(ctx.services.getCurrentProjectPath()).toBe('/project-a');
    expect(ctx.services.getSpecManagerService()).toBe(mockSpecManager);
    // BrowserWindow.fromWebContents should NOT have been called (primary path succeeded)
    expect(mockFromWebContents).not.toHaveBeenCalled();
  });

  it('should return context with null projectPath for window without project', async () => {
    const mockWM = createMockWindowManager({
      windows: new Map([
        [1, { windowId: 1, projectPath: null, services: null }],
      ]),
      webContentsToWindowId: new Map([[101, 1]]),
    });

    const mockSender = { id: 101 };
    const mockBrowserWindow = { id: 1, webContents: mockSender };
    mockFromWebContents.mockReturnValue(mockBrowserWindow);

    const sharedServices: Partial<ContextServices> = {};
    const contextFn = createWindowContextFactory(mockWM as any, sharedServices);

    const ctx = await contextFn({ event: { sender: mockSender } as any });

    expect(ctx.services.windowId).toBe(1);
    expect(ctx.services.getCurrentProjectPath()).toBeNull();
  });
});
