/**
 * tRPC Preload Module
 * Requirements: 3.1, 3.2
 *
 * Exposes electron-trpc IPC channel to the Renderer process.
 * This module is imported from preload/index.ts (DD-002).
 *
 * The exposeElectronTRPC() call is deferred until the 'loaded' event
 * to ensure proper contextBridge initialization.
 */
import { exposeElectronTRPC } from 'electron-trpc/main';

process.once('loaded', () => {
  exposeElectronTRPC();
});
