/**
 * Services exports
 * Requirements: workflow-auto-execution, spec-store-decomposition
 *
 * Note: AutoExecutionService was removed as part of deprecated-auto-execution-service-cleanup.
 * Use useAutoExecution hook which communicates with Main Process via IPC.
 * See: auto-execution-main-process feature
 */

// Spec Sync Service (spec-store-decomposition)
export { SpecSyncService, specSyncService } from './specSyncService';
export type { SpecSyncServiceCallbacks } from './specSyncService';

// Spec Watcher Service (spec-store-decomposition)
export { SpecWatcherService, specWatcherService } from './specWatcherService';
export type { SpecWatcherServiceDeps } from './specWatcherService';
