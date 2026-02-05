/**
 * tRPC IPC Handler setup
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 *
 * Registers the tRPC IPC handler for the given BrowserWindow.
 * Called from createWindow() after the window is created (DD-005).
 */
import { createIPCHandler } from 'electron-trpc/main';
import { appRouter } from './router';
import { projectLogger } from '../services/projectLogger';

/**
 * Sets up the tRPC IPC handler for the given BrowserWindow.
 * This enables Renderer processes to call tRPC procedures via IPC.
 *
 * @param window - The BrowserWindow instance to attach the handler to
 */
export function setupTRPCHandler(window: Electron.BrowserWindow): void {
  try {
    createIPCHandler({
      router: appRouter,
      windows: [window],
    });
    projectLogger.info('[trpc] IPC handler registered successfully');
  } catch (error) {
    projectLogger.error('[trpc] Failed to register IPC handler', { error });
  }
}
