/**
 * Preload Script
 * trpc-full-migration Task 11.1: electronAPI完全削除
 *
 * After full tRPC migration, the preload script only loads the
 * electron-trpc preload module which calls exposeElectronTRPC().
 * All IPC communication now goes through tRPC procedures.
 */

// electron-trpc: Load tRPC preload module (DD-002)
// This calls exposeElectronTRPC() to set up the tRPC IPC bridge
import './trpc';
