/**
 * Application Lifecycle Helpers
 *
 * Testable cleanup logic extracted from index.ts.
 * Entry point (index.ts) must have zero exports to prevent Vite from generating
 * an entry shim that causes double module evaluation in production builds.
 */

import { projectLogger as logger } from './services/projectLogger';
import { getAgentWatchdog } from './services/agentLifecycleSetup';
import { getRemoteAccessServer } from './services/remoteAccessSetup';
// multi-window-integration Task 8.1: Window state persistence on quit
import { getWindowManager } from './services/windowManager';

/**
 * Cleanup function called on app quit.
 * Stops agent watchdog and remote UI server.
 */
export async function cleanupOnQuit(): Promise<void> {
  logger.info('[main] Starting cleanup on quit');

  // multi-window-integration Task 8.1: Save all window states before cleanup
  // This must happen first, while windows are still available
  try {
    const windowManager = getWindowManager();
    windowManager.saveAllWindowStates();
    logger.info('[main] Window states saved');
  } catch (error) {
    logger.warn('[main] Error saving window states', { error });
  }

  // Stop agent watchdog
  try {
    const watchdog = getAgentWatchdog();
    if (watchdog) {
      watchdog.stop();
      logger.info('[main] Agent watchdog stopped');
    }
  } catch (error) {
    logger.warn('[main] Error stopping agent watchdog', { error });
  }

  // Stop remote UI server if running
  try {
    const server = getRemoteAccessServer();
    const status = server.getStatus();
    if (status.isRunning) {
      await server.stop();
      logger.info('[main] Remote UI server stopped');
    }
  } catch (error) {
    logger.warn('[main] Error stopping remote UI server', { error });
  }
}
