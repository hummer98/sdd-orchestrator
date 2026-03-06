/**
 * WindowManager Service
 * Manages multiple windows, projects, and per-window services
 * Requirements: 1.1-1.5, 3.1-3.4, 4.1-4.6, 5.2-5.4
 *
 * multi-window-integration Task 1.1-1.4:
 * - PerWindowServices with MetricsService and AutoExecutionCoordinator
 * - webContentsToWindowId mapping and context resolution
 * - IPCHandler management (attach/detach)
 * - normalizePath with symlink resolution (realpathSync)
 */

import { BrowserWindow, app, screen } from 'electron';
import { join } from 'path';
import { existsSync, realpathSync } from 'fs';
import { SpecManagerService } from './specManagerService';
import { SpecsWatcherService } from './specsWatcherService';
import { AgentRecordWatcherService } from './agentRecordWatcherService';
// BugsWatcherService removed (github-issue-integration)
import { MetricsService } from './metricsService';
import { MetricsFileWriter } from './metricsFileWriter';
import { MetricsFileReader } from './metricsFileReader';
import { AutoExecutionCoordinator } from './autoExecutionCoordinator';
import { FileService } from './fileService';
import { getConfigStore } from './configStore';
// agent-error-notification: logger.ts -> projectLogger migration (Requirements 1.2, 1.3, 1.5)
import { projectLogger as logger } from './projectLogger';
import { layoutConfigService } from './layoutConfigService';
import type { WindowBounds } from '../../renderer/types';

/**
 * Window bounds with position and size
 */
export interface WindowBoundsExtended extends WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * State for a single window
 */
export interface WindowState {
  windowId: number;
  projectPath: string | null;
  bounds: WindowBoundsExtended;
  isMaximized: boolean;
  isMinimized: boolean;
}

/**
 * Per-window service instances
 * multi-window-integration Task 1.1: Added MetricsService and AutoExecutionCoordinator
 */
export interface PerWindowServices {
  specManagerService: SpecManagerService;
  specsWatcherService: SpecsWatcherService;
  agentRecordWatcherService: AgentRecordWatcherService;
  bugsWatcherService?: unknown; // Deprecated: github-issue-integration
  metricsService: MetricsService;
  autoExecutionCoordinator: AutoExecutionCoordinator;
}

/**
 * Per-window context combining windowId, projectPath, and services
 * multi-window-integration Task 1.2: Context resolution for tRPC
 */
export interface PerWindowContext {
  windowId: number;
  projectPath: string | null;
  services: PerWindowServices | null;
}

/**
 * Multi-window state for persistence
 */
export interface MultiWindowState {
  projectPath: string;
  bounds: WindowBoundsExtended;
  isMaximized: boolean;
  isMinimized: boolean;
}

/**
 * Duplicate project error
 */
export interface DuplicateProjectError {
  type: 'DUPLICATE_PROJECT';
  existingWindowId: number;
  projectPath: string;
}

/**
 * Result type for operations
 */
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Window creation options
 */
export interface CreateWindowOptions {
  projectPath?: string;
  bounds?: WindowBoundsExtended;
  isMaximized?: boolean;
}

/**
 * Default window bounds
 */
const DEFAULT_BOUNDS: WindowBoundsExtended = {
  x: 100,
  y: 100,
  width: 1200,
  height: 800,
};

/**
 * Normalize project path for comparison
 * Removes trailing slashes and resolves symlinks via realpathSync
 * multi-window-integration Task 1.4: Added symlink resolution
 */
function normalizePath(projectPath: string): string {
  try {
    // Resolve symlinks first, then remove trailing slashes
    const resolved = realpathSync(projectPath);
    return resolved.replace(/\/+$/, '');
  } catch {
    // If path does not exist (realpathSync fails), fall back to trailing slash removal only
    return projectPath.replace(/\/+$/, '');
  }
}

/**
 * IPCHandler interface for type-safe access
 * multi-window-integration Task 1.3
 */
interface IPCHandlerLike {
  attachWindow(window: BrowserWindow): void;
  detachWindow?(window: BrowserWindow): void;
}

/**
 * WindowManager Service
 * Manages multiple windows and their associated projects and services
 */
export class WindowManager {
  // Window ID -> WindowState mapping
  private windowStates: Map<number, WindowState> = new Map();

  // Project path -> Window ID mapping (for O(1) duplicate check)
  private projectWindowMap: Map<string, number> = new Map();

  // Window ID -> PerWindowServices mapping
  private windowServices: Map<number, PerWindowServices> = new Map();

  // webContents ID -> Window ID mapping (for O(1) tRPC context resolution)
  // multi-window-integration Task 1.2
  private webContentsToWindowId: Map<number, number> = new Map();

  // Window ID -> BrowserWindow reference (for detachWindow on close)
  // Needed because BrowserWindow.getAllWindows() may not contain the window after it's closed
  private windowReferences: Map<number, BrowserWindow> = new Map();

  // IPCHandler instance (Singleton pattern - DD-001)
  // multi-window-integration Task 1.3
  private ipcHandler: IPCHandlerLike | null = null;

  // Event callbacks
  private focusCallbacks: ((windowId: number) => void)[] = [];
  private closeCallbacks: ((windowId: number) => void)[] = [];

  // E2E test mode detection
  private isE2ETest = process.argv.includes('--e2e-test');

  /**
   * Create a new window
   * Requirements: 1.1, 1.2
   */
  createWindow(options?: CreateWindowOptions): BrowserWindow {
    const isDev = !app.isPackaged && !this.isE2ETest;
    const configStore = getConfigStore();

    // Get bounds from options, saved config, or defaults
    let bounds = options?.bounds || configStore.getWindowBounds() || DEFAULT_BOUNDS;

    // Validate bounds are within display
    bounds = this.validateDisplayBounds(bounds);

    const window = new BrowserWindow({
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      minWidth: 800,
      minHeight: 600,
      title: isDev ? 'SDD Orchestrator (dev)' : 'SDD Orchestrator',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: !this.isE2ETest,
        preload: join(__dirname, '../../preload/index.js'),
      },
      show: false,
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    });

    // Create initial window state
    const windowState: WindowState = {
      windowId: window.id,
      projectPath: null,
      bounds,
      isMaximized: options?.isMaximized || false,
      isMinimized: false,
    };
    this.windowStates.set(window.id, windowState);

    // multi-window-integration Task 1.2: Register webContents ID -> window ID mapping
    this.webContentsToWindowId.set(window.webContents.id, window.id);

    // Store window reference for detachWindow on close
    this.windowReferences.set(window.id, window);

    // Set up event handlers
    this.setupWindowEventHandlers(window);

    // multi-window-integration Task 1.3: Attach window to IPCHandler if it exists
    if (this.ipcHandler) {
      this.ipcHandler.attachWindow(window);
    }

    // Show window when ready
    window.once('ready-to-show', () => {
      window.show();
      if (options?.isMaximized) {
        window.maximize();
      }
    });

    // Load the app
    if (isDev) {
      window.loadURL('http://localhost:5173');
      window.webContents.openDevTools();
    } else {
      window.loadFile(join(__dirname, '../../renderer/index.html'));
    }

    // Set project if provided
    if (options?.projectPath) {
      this.setWindowProject(window.id, options.projectPath);
    }

    logger.info('[WindowManager] Window created', { windowId: window.id });
    return window;
  }

  /**
   * Set up event handlers for a window
   */
  private setupWindowEventHandlers(window: BrowserWindow): void {
    // Focus event
    window.on('focus', () => {
      this.focusCallbacks.forEach((cb) => cb(window.id));
    });

    // Close event
    window.on('closed', () => {
      this.handleWindowClose(window.id);
    });

    // Save bounds on move/resize
    window.on('move', () => {
      this.updateWindowBounds(window);
    });

    window.on('resize', () => {
      this.updateWindowBounds(window);
    });
  }

  /**
   * Handle window close
   * multi-window-integration Task 1.1: Added MetricsService/AutoExecutionCoordinator cleanup
   * multi-window-integration Task 1.2: Remove webContentsToWindowId entry
   * multi-window-integration Task 1.3: Call detachWindow on IPCHandler
   */
  private handleWindowClose(windowId: number): void {
    const state = this.windowStates.get(windowId);

    // Clean up project mapping
    if (state?.projectPath) {
      this.projectWindowMap.delete(normalizePath(state.projectPath));
    }

    // multi-window-integration Task 1.3: Detach window from IPCHandler
    const windowRef = this.windowReferences.get(windowId);
    if (this.ipcHandler && windowRef) {
      this.ipcHandler.detachWindow?.(windowRef);
    }
    this.windowReferences.delete(windowId);

    // multi-window-integration Task 1.2: Remove webContents mapping
    // Find and remove the webContents entry for this window
    for (const [webContentsId, winId] of this.webContentsToWindowId) {
      if (winId === windowId) {
        this.webContentsToWindowId.delete(webContentsId);
        break;
      }
    }

    // Clean up services
    // multi-window-integration Task 1.1: Added MetricsService/AutoExecutionCoordinator cleanup
    const services = this.windowServices.get(windowId);
    if (services) {
      services.specsWatcherService.stop();
      services.agentRecordWatcherService.stop();
      // bugsWatcherService removed (github-issue-integration)
      // multi-window-integration Task 1.1: Stop new services
      services.autoExecutionCoordinator.resetAll();
    }
    this.windowServices.delete(windowId);

    // Remove from state
    this.windowStates.delete(windowId);

    // Notify callbacks
    this.closeCallbacks.forEach((cb) => cb(windowId));

    logger.info('[WindowManager] Window closed', { windowId });
  }

  /**
   * Update window bounds in state
   */
  private updateWindowBounds(window: BrowserWindow): void {
    if (window.isDestroyed()) return;

    const state = this.windowStates.get(window.id);
    if (state && !window.isMaximized() && !window.isMinimized()) {
      const bounds = window.getBounds();
      state.bounds = bounds as WindowBoundsExtended;
      state.isMaximized = window.isMaximized();
      state.isMinimized = window.isMinimized();
    }
  }

  /**
   * Close a window
   * Requirements: 1.4
   */
  closeWindow(windowId: number): void {
    const window = this.getWindow(windowId);
    if (window && !window.isDestroyed()) {
      window.close();
    } else {
      // If window is already destroyed, just clean up state
      this.handleWindowClose(windowId);
    }
  }

  /**
   * Get window by ID
   */
  getWindow(windowId: number): BrowserWindow | null {
    const windows = BrowserWindow.getAllWindows();
    return windows.find((w) => w.id === windowId) || null;
  }

  /**
   * Get all window IDs
   */
  getAllWindowIds(): number[] {
    return Array.from(this.windowStates.keys());
  }

  /**
   * Get window ID by webContents ID
   * multi-window-integration Task 1.2: O(1) lookup for tRPC context resolution
   */
  getWindowIdByWebContents(webContentsId: number): number | null {
    return this.webContentsToWindowId.get(webContentsId) ?? null;
  }

  /**
   * Get per-window context (windowId, projectPath, services)
   * multi-window-integration Task 1.2: Context resolution for tRPC
   */
  getWindowContext(windowId: number): PerWindowContext | null {
    const state = this.windowStates.get(windowId);
    if (!state) {
      return null;
    }

    return {
      windowId: state.windowId,
      projectPath: state.projectPath,
      services: this.windowServices.get(windowId) || null,
    };
  }

  /**
   * Get IPCHandler instance
   * multi-window-integration Task 1.3
   */
  getIPCHandler(): IPCHandlerLike | null {
    return this.ipcHandler;
  }

  /**
   * Set IPCHandler instance
   * multi-window-integration Task 1.3
   */
  setIPCHandler(handler: IPCHandlerLike): void {
    this.ipcHandler = handler;
  }

  /**
   * Set project for a window
   * Requirements: 1.2, 3.3
   */
  setWindowProject(
    windowId: number,
    projectPath: string
  ): Result<void, DuplicateProjectError> {
    const normalizedPath = normalizePath(projectPath);

    // Check for duplicate
    const existingWindowId = this.checkDuplicate(projectPath);
    if (existingWindowId !== null && existingWindowId !== windowId) {
      return {
        ok: false,
        error: {
          type: 'DUPLICATE_PROJECT',
          existingWindowId,
          projectPath,
        },
      };
    }

    // Get current state
    const state = this.windowStates.get(windowId);
    if (!state) {
      logger.warn('[WindowManager] Window not found', { windowId });
      return { ok: true, value: undefined };
    }

    // Remove old project mapping if exists
    if (state.projectPath) {
      this.projectWindowMap.delete(normalizePath(state.projectPath));
    }

    // Update state
    state.projectPath = projectPath;
    this.projectWindowMap.set(normalizedPath, windowId);

    // Update window title
    const window = this.getWindow(windowId);
    if (window) {
      const projectName = projectPath.split('/').pop() || projectPath;
      const isDev = !app.isPackaged;
      const baseTitle = isDev ? 'SDD Orchestrator (dev)' : 'SDD Orchestrator';
      window.setTitle(`${baseTitle} - ${projectName}`);
    }

    // Create per-window services
    this.createWindowServices(windowId, projectPath);

    logger.info('[WindowManager] Project set for window', { windowId, projectPath });
    return { ok: true, value: undefined };
  }

  /**
   * Get project for a window
   */
  getWindowProject(windowId: number): string | null {
    const state = this.windowStates.get(windowId);
    return state?.projectPath || null;
  }

  /**
   * Get window by project path
   * Requirements: 3.3
   */
  getWindowByProject(projectPath: string): BrowserWindow | null {
    const normalizedPath = normalizePath(projectPath);
    const windowId = this.projectWindowMap.get(normalizedPath);
    if (windowId === undefined) {
      return null;
    }
    return this.getWindow(windowId);
  }

  /**
   * Check if project is already open in another window
   * Requirements: 3.1, 3.3
   */
  checkDuplicate(projectPath: string): number | null {
    const normalizedPath = normalizePath(projectPath);
    return this.projectWindowMap.get(normalizedPath) ?? null;
  }

  /**
   * Focus a window
   * Requirements: 3.1
   */
  focusWindow(windowId: number): void {
    const window = this.getWindow(windowId);
    if (window && !window.isDestroyed()) {
      window.focus();
    }
  }

  /**
   * Restore and focus a window (for minimized windows)
   * Requirements: 3.2
   */
  restoreAndFocus(windowId: number): void {
    const window = this.getWindow(windowId);
    if (window && !window.isDestroyed()) {
      if (window.isMinimized()) {
        window.restore();
      }
      window.focus();
    }
  }

  /**
   * Create per-window services
   * Requirements: 5.3, 5.4
   * multi-window-integration Task 1.1: Added MetricsService and AutoExecutionCoordinator
   */
  private createWindowServices(windowId: number, projectPath: string): void {
    // Stop existing services if any
    const existingServices = this.windowServices.get(windowId);
    if (existingServices) {
      existingServices.specsWatcherService.stop();
      existingServices.agentRecordWatcherService.stop();
      // bugsWatcherService removed (github-issue-integration)
      existingServices.autoExecutionCoordinator.resetAll();
    }

    // Create new services
    const fileService = new FileService();
    const services: PerWindowServices = {
      // skip-permissions-main-process: Inject layoutConfigService for skipPermissions auto-fetch
      specManagerService: new SpecManagerService(projectPath, { layoutConfigService }),
      specsWatcherService: new SpecsWatcherService(projectPath, fileService),
      agentRecordWatcherService: new AgentRecordWatcherService(projectPath),
      // bugsWatcherService removed (github-issue-integration)
      // multi-window-integration Task 1.1: Per-window MetricsService and AutoExecutionCoordinator
      metricsService: new MetricsService(logger, new MetricsFileWriter(logger), new MetricsFileReader(logger)),
      autoExecutionCoordinator: new AutoExecutionCoordinator(),
    };

    this.windowServices.set(windowId, services);
    logger.info('[WindowManager] Window services created', { windowId, projectPath });
  }

  /**
   * Get services for a window
   * Requirements: 5.3
   */
  getWindowServices(windowId: number): PerWindowServices | null {
    return this.windowServices.get(windowId) || null;
  }

  /**
   * Register focus callback
   * Requirements: 2.1
   */
  onWindowFocus(callback: (windowId: number) => void): void {
    this.focusCallbacks.push(callback);
  }

  /**
   * Register close callback
   * Requirements: 1.4
   */
  onWindowClose(callback: (windowId: number) => void): void {
    this.closeCallbacks.push(callback);
  }

  /**
   * Save all window states to config
   * Requirements: 4.1, 4.5
   */
  saveAllWindowStates(): void {
    const states: MultiWindowState[] = [];

    for (const [windowId, state] of this.windowStates) {
      // Only save windows with projects
      if (state.projectPath) {
        const window = this.getWindow(windowId);
        const bounds = window?.isDestroyed() ? state.bounds : window?.getBounds() as WindowBoundsExtended || state.bounds;

        states.push({
          projectPath: state.projectPath,
          bounds,
          isMaximized: window?.isMaximized() || false,
          isMinimized: window?.isMinimized() || false,
        });
      }
    }

    const configStore = getConfigStore();
    configStore.setMultiWindowStates(states);
    logger.info('[WindowManager] Window states saved', { count: states.length });
  }

  /**
   * Restore windows from saved state
   * Requirements: 4.2, 4.3, 4.4
   */
  restoreWindows(): { restored: number; skipped: string[] } {
    const configStore = getConfigStore();
    const savedStates = configStore.getMultiWindowStates();

    let restored = 0;
    const skipped: string[] = [];

    for (const state of savedStates) {
      // Check if project still exists
      if (!state.projectPath || !existsSync(state.projectPath)) {
        if (state.projectPath) {
          skipped.push(state.projectPath);
          logger.warn('[WindowManager] Skipping non-existent project', { projectPath: state.projectPath });
        }
        continue;
      }

      // Validate display bounds
      const validatedBounds = this.validateDisplayBounds(state.bounds);

      // Create window with saved state
      this.createWindow({
        projectPath: state.projectPath,
        bounds: validatedBounds,
        isMaximized: state.isMaximized,
      });

      restored++;
    }

    // If no windows were restored, create a default window
    // This handles: first launch (no saved states), all saved projects missing
    if (restored === 0) {
      this.createWindow();
      restored = 1;
    }

    logger.info('[WindowManager] Windows restored', { restored, skipped: skipped.length });
    return { restored, skipped };
  }

  /**
   * Validate that bounds are within a display
   * Requirements: 4.6
   */
  validateDisplayBounds(bounds: WindowBoundsExtended): WindowBoundsExtended {
    const displays = screen.getAllDisplays();
    const primaryDisplay = screen.getPrimaryDisplay();

    // Check if bounds are within any display
    const isWithinDisplay = displays.some((display) => {
      const { x, y, width, height } = display.workArea;
      return (
        bounds.x >= x &&
        bounds.y >= y &&
        bounds.x + bounds.width <= x + width &&
        bounds.y + bounds.height <= y + height
      );
    });

    if (isWithinDisplay) {
      return bounds;
    }

    // Move to primary display if off-screen
    const { workArea } = primaryDisplay;
    return {
      x: workArea.x + 50,
      y: workArea.y + 50,
      width: Math.min(bounds.width, workArea.width - 100),
      height: Math.min(bounds.height, workArea.height - 100),
    };
  }

  /**
   * Get the currently focused window ID
   */
  getFocusedWindowId(): number | null {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow && this.windowStates.has(focusedWindow.id)) {
      return focusedWindow.id;
    }
    return null;
  }

}

// Singleton instance
let windowManager: WindowManager | null = null;

/**
 * Get the WindowManager singleton
 */
export function getWindowManager(): WindowManager {
  if (!windowManager) {
    windowManager = new WindowManager();
  }
  return windowManager;
}

/**
 * Reset WindowManager (for testing)
 */
export function resetWindowManager(): void {
  windowManager = null;
}
