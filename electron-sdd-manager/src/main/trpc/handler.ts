/**
 * tRPC IPC Handler setup
 * Task 1.1: handler.tsからコンテキストへのサービス渡しを設定する
 * multi-window-integration Task 2.2: IPCHandler Singleton pattern
 * Requirements: 1.1, 1.2, 1.3, 3.1, 8.1, 8.2, 8.3, 8.4, 8.5
 * DD-001: IPCHandler Singleton + attachWindow pattern
 * DD-006: tRPC Contextへのサービス注入
 *
 * multi-window-integration Task 7.3: setupTRPCHandler is deprecated.
 * Use initializeTRPCHandler (Singleton IPCHandler with attachWindow) for multi-window.
 *
 * Handler-injected services (not in productionServices.ts):
 * - eventBus: Global EventBus for tRPC Subscription event distribution
 * - getInitialSelectResult: Cached startup project selection result (Pull model)
 * - clearInitialSelectResult: Clear cached startup project selection result
 */
import { createIPCHandler } from 'electron-trpc/main';
import { appRouter } from './router';
import { createContext, type ContextServices } from './context';
import { projectLogger } from '../services/projectLogger';
import { createProductionServices } from './productionServices';
import { getInitialSelectResult as getInitialSelectResultImpl, clearInitialSelectResult } from './helpers/projectState';
import { getGlobalEventBus } from './services/globalEventBus';
import { createWindowContextFactory, type WindowManagerLike } from './windowContextFactory';

// Type-safe wrapper: projectSetup returns SelectProjectResult,
// but ContextServices expects SelectProjectResultLike (structurally compatible superset)
const getInitialSelectResult: ContextServices['getInitialSelectResult'] =
  () => getInitialSelectResultImpl() as ReturnType<ContextServices['getInitialSelectResult']>;

/**
 * WindowManager interface subset for initializeTRPCHandler.
 * Extends WindowManagerLike with IPCHandler management methods.
 */
interface WindowManagerForHandler extends WindowManagerLike {
  getIPCHandler(): { attachWindow(win: Electron.BrowserWindow): void; detachWindow?(win: Electron.BrowserWindow): void } | null;
  setIPCHandler(handler: { attachWindow(win: Electron.BrowserWindow): void; detachWindow?(win: Electron.BrowserWindow): void }): void;
}

/**
 * Initialize tRPC IPC handler with multi-window support.
 * Uses Singleton IPCHandler pattern (DD-001):
 * - First call: creates IPCHandler with createWindowContextFactory
 * - Subsequent calls: attaches window to existing IPCHandler
 *
 * @param windowManager - WindowManager instance for window state lookup and IPCHandler storage
 * @param window - The BrowserWindow to attach
 * @param serviceOverrides - Optional partial service overrides for DI (testing)
 */
export function initializeTRPCHandler(
  windowManager: WindowManagerForHandler,
  window: Electron.BrowserWindow,
  serviceOverrides?: Partial<ContextServices>,
): void {
  try {
    // Check if IPCHandler already exists (DD-001: Singleton)
    const existingHandler = windowManager.getIPCHandler();
    if (existingHandler) {
      // Attach this window to existing IPCHandler
      existingHandler.attachWindow(window);
      projectLogger.info('[trpc] Window attached to existing IPCHandler', { windowId: window.id });
      return;
    }

    // First call: create IPCHandler with WindowContextFactory
    const productionDefaults = createProductionServices();
    const sharedServices: Partial<ContextServices> = {
      ...productionDefaults,
      ...serviceOverrides,
      // Handler-injected services
      getInitialSelectResult,
      clearInitialSelectResult,
      eventBus: getGlobalEventBus(),
    };

    // Create per-request context factory using WindowContextFactory
    const contextFactory = createWindowContextFactory(windowManager, sharedServices);

    const ipcHandler = createIPCHandler({
      router: appRouter,
      windows: [window],
      createContext: contextFactory,
    });

    // Store IPCHandler on WindowManager (SSOT)
    windowManager.setIPCHandler(ipcHandler);

    projectLogger.info('[trpc] IPCHandler created and stored on WindowManager', { windowId: window.id });
  } catch (error) {
    projectLogger.error('[trpc] Failed to initialize tRPC handler', { error });
  }
}

/**
 * Sets up the tRPC IPC handler for the given BrowserWindow.
 * This enables Renderer processes to call tRPC procedures via IPC.
 *
 * @deprecated Use initializeTRPCHandler for multi-window support.
 * This function is kept for backward compatibility during migration.
 *
 * @param window - The BrowserWindow instance to attach the handler to
 * @param serviceOverrides - Optional partial service overrides for DI (testing)
 */
export function setupTRPCHandler(
  window: Electron.BrowserWindow,
  serviceOverrides?: Partial<ContextServices>,
): void {
  try {
    // Resolve all production services as defaults, then apply overrides
    const productionDefaults = createProductionServices();
    const mergedOverrides: Partial<ContextServices> = {
      ...productionDefaults,
      ...serviceOverrides,
      // Handler-injected services: These are NOT in productionServices.ts
      // because they depend on module-level singletons that must be wired here.
      getInitialSelectResult,
      clearInitialSelectResult,
      eventBus: getGlobalEventBus(),
    };

    projectLogger.info('[trpc] Handler-injected services wired', {
      hasEventBus: !!mergedOverrides.eventBus,
      hasGetInitialSelectResult: typeof mergedOverrides.getInitialSelectResult === 'function',
      hasClearInitialSelectResult: typeof mergedOverrides.clearInitialSelectResult === 'function',
      initialSelectResultValue: mergedOverrides.getInitialSelectResult?.() !== null ? 'cached' : 'null',
    });

    createIPCHandler({
      router: appRouter,
      windows: [window],
      createContext: async () => createContext(mergedOverrides),
    });
    projectLogger.info('[trpc] IPC handler registered successfully');
  } catch (error) {
    projectLogger.error('[trpc] Failed to register IPC handler', { error });
  }
}
