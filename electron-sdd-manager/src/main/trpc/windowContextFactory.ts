/**
 * WindowContextFactory
 * multi-window-integration Task 2.1
 * Requirements: 3.1, 3.2, 3.3
 *
 * Creates a per-request tRPC context factory that resolves the window
 * from event.sender and injects window-specific services into ContextServices.
 *
 * Design Decisions:
 * - DD-002: event.sender.id -> WindowManager.getWindowIdByWebContents (primary, O(1) map lookup)
 *           BrowserWindow.fromWebContents as secondary fallback
 * - DD-003: Focused window fallback when window cannot be identified (last resort)
 * - Per-window property closure binding for selectProject, getCurrentProjectPath, etc.
 */

import { BrowserWindow } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { createContext, type Context, type ContextServices } from './context';
import { projectLogger } from '../services/projectLogger';

/**
 * WindowManager interface subset used by WindowContextFactory.
 * Avoids importing the full WindowManager class (which has side effects).
 */
export interface WindowManagerLike {
  getWindowIdByWebContents(webContentsId: number): number | null;
  getWindowContext(windowId: number): {
    windowId: number;
    projectPath: string | null;
    services: Record<string, any> | null;
  } | null;
  getFocusedWindowId(): number | null;
  getWindowProject(windowId: number): string | null;
  getWindowServices(windowId: number): Record<string, any> | null;
}

/**
 * Context creation function type matching electron-trpc's createContext signature
 */
export type WindowContextCreateFn = (opts: { event: IpcMainInvokeEvent }) => Promise<Context>;

/**
 * Create a window context factory that produces per-request tRPC contexts.
 *
 * Each tRPC request's context is resolved from event.sender:
 * 1. event.sender.id -> WindowManager.getWindowIdByWebContents() (primary, O(1))
 * 2. BrowserWindow.fromWebContents(event.sender) as secondary fallback
 * 3. getFocusedWindowId() as last resort (for tool menu operations)
 * 4. Overlay per-window services on top of shared services
 *
 * @param windowManager - WindowManager instance for window state lookup
 * @param sharedServices - Shared services (FileService, ConfigStore, etc.)
 * @returns A createContext function for electron-trpc's createIPCHandler
 */
export function createWindowContextFactory(
  windowManager: WindowManagerLike,
  sharedServices: Partial<ContextServices>,
): WindowContextCreateFn {
  return async (opts: { event: IpcMainInvokeEvent }): Promise<Context> => {
    const { event } = opts;

    // Step 1: Resolve window from event.sender
    // Primary path: Use WindowManager's webContentsToWindowId map (registered at createWindow time)
    // This is more reliable than BrowserWindow.fromWebContents which can return null
    // when the webContents is being set up or the BrowserWindow reference is stale.
    let windowId: number | undefined;
    let windowContext: ReturnType<WindowManagerLike['getWindowContext']> = null;

    const senderWebContentsId = event.sender?.id;

    // Primary: WindowManager's webContentsToWindowId map (O(1) lookup, registered at window creation)
    if (senderWebContentsId !== undefined) {
      const resolvedWindowId = windowManager.getWindowIdByWebContents(senderWebContentsId);
      if (resolvedWindowId !== null) {
        windowId = resolvedWindowId;
        windowContext = windowManager.getWindowContext(resolvedWindowId);
      }
    }

    // Secondary: BrowserWindow.fromWebContents (Electron API fallback)
    if (!windowContext) {
      const browserWindow = BrowserWindow.fromWebContents(event.sender);
      if (browserWindow) {
        windowId = browserWindow.id;
        windowContext = windowManager.getWindowContext(browserWindow.id);
        if (windowContext) {
          projectLogger.warn('[WindowContextFactory] Resolved via BrowserWindow.fromWebContents fallback', {
            senderWebContentsId,
            windowId: browserWindow.id,
          });
        }
      }
    }

    // Last resort: focused window (only for tool menu operations where sender may not be resolvable)
    if (!windowContext) {
      const focusedId = windowManager.getFocusedWindowId();
      if (focusedId !== null) {
        projectLogger.warn('[WindowContextFactory] Window not found from event.sender, falling back to focused window', {
          senderWebContentsId,
          focusedWindowId: focusedId,
        });
        windowId = focusedId;
        windowContext = windowManager.getWindowContext(focusedId);
      }
    }

    // Step 2: Build per-window service overrides
    const perWindowOverrides: Partial<ContextServices> = {};

    if (windowId !== undefined) {
      perWindowOverrides.windowId = windowId;
    }

    if (windowContext) {
      const projectPath = windowContext.projectPath;
      const services = windowContext.services;

      // Per-window getCurrentProjectPath closure
      perWindowOverrides.getCurrentProjectPath = () => projectPath;

      // Per-window getSpecManagerService closure
      if (services?.specManagerService) {
        perWindowOverrides.getSpecManagerService = () => services.specManagerService;
      }

      // Per-window selectProject closure binding (windowId is baked in)
      if (sharedServices.selectProject) {
        const baseSelectProject = sharedServices.selectProject;
        perWindowOverrides.selectProject = ((path: string) =>
          (baseSelectProject as any)(path, windowId)) as any;
      }
    }

    // Step 3: Merge: defaults <- shared <- per-window
    const mergedServices: Partial<ContextServices> = {
      ...sharedServices,
      ...perWindowOverrides,
    };

    return createContext(mergedServices);
  };
}
