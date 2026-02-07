/**
 * tRPC IPC Handler setup
 * Task 1.1: handler.tsからコンテキストへのサービス渡しを設定する
 * Requirements: 1.1, 1.2, 1.3, 8.1, 8.2, 8.3, 8.4, 8.5
 * DD-006: tRPC Contextへのサービス注入
 *
 * Registers the tRPC IPC handler for the given BrowserWindow.
 * Called from createWindow() after the window is created (DD-005).
 * Passes createContext factory to createIPCHandler for service DI.
 */
import { createIPCHandler } from 'electron-trpc/main';
import { appRouter } from './router';
import { createContext, type ContextServices } from './context';
import { projectLogger } from '../services/projectLogger';
import { createProductionServices } from './productionServices';

/**
 * Sets up the tRPC IPC handler for the given BrowserWindow.
 * This enables Renderer processes to call tRPC procedures via IPC.
 *
 * Production services are automatically resolved via createProductionServices().
 * Tests can override individual services via serviceOverrides parameter.
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
    };

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
