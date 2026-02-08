/**
 * Preload Script
 * trpc-full-migration Task 11.1: electronAPI完全削除
 *
 * After full tRPC migration, the preload script only loads the
 * electron-trpc preload module which calls exposeElectronTRPC().
 * All IPC communication now goes through tRPC procedures.
 */

import { contextBridge } from 'electron';
// electron-trpc: Load tRPC preload module (DD-002)
// This calls exposeElectronTRPC() to set up the tRPC IPC bridge
import './trpc';

// Detect E2E mode from additionalArguments
const isE2E = process.argv.includes('--is-e2e');

if (isE2E) {
  // Expose isE2E flag to Renderer
  contextBridge.exposeInMainWorld('isE2E', true);
  console.info('[Preload] E2E mode detected and flag exposed');
}