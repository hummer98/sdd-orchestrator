/**
 * IPC Handler Utilities
 *
 * E2E-fix: Common utilities for IPC handler registration.
 * Provides idempotent handler registration to prevent duplicate registration errors
 * that occur in E2E test environments where the app may be re-initialized.
 */

import { ipcMain } from 'electron';

/**
 * Safely register an IPC handler (idempotent)
 *
 * E2E-fix: Removes existing handler before registering new one to prevent
 * "Attempted to register a second handler" errors in test environments.
 *
 * @param channel - The IPC channel name
 * @param handler - The handler function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function safeHandle(channel: string, handler: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => any): void {
  try {
    ipcMain.removeHandler(channel);
  } catch {
    // Handler doesn't exist yet, ignore
  }
  ipcMain.handle(channel, handler);
}

/**
 * Safely remove an IPC handler
 *
 * @param channel - The IPC channel name to remove
 */
export function safeRemoveHandler(channel: string): void {
  try {
    ipcMain.removeHandler(channel);
  } catch {
    // Handler doesn't exist, ignore
  }
}

/**
 * Create a handler registration guard
 *
 * Returns a function that tracks whether handlers have been registered
 * to prevent duplicate registration.
 *
 * @param _name - Name for logging purposes (reserved for future use)
 * @returns Object with isRegistered() and setRegistered() methods
 */
export function createRegistrationGuard(_name: string): {
  isRegistered: () => boolean;
  setRegistered: (value: boolean) => void;
} {
  let registered = false;
  return {
    isRegistered: () => registered,
    setRegistered: (value: boolean) => {
      registered = value;
    },
  };
}
