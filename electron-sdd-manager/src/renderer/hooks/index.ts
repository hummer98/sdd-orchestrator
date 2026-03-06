/**
 * Renderer hooks barrel export
 *
 * This module exports all custom React hooks that are specific to the
 * Electron renderer process. Shared hooks are in ../shared/hooks.
 */

// idle-time-project-level-reporting Task 2.1: Export useIdleTimeSync
// Requirements: 1.1, 1.2, 1.3, 4.1-4.3 - Idle time sync using HumanActivityTracker
export { useIdleTimeSync } from './useIdleTimeSync';
export type { UseIdleTimeSyncOptions } from './useIdleTimeSync';
export { IDLE_SYNC_INTERVAL_MS } from './useIdleTimeSync';

// Existing hooks (exported for convenience)
export { useElectronWorkflowState } from './useElectronWorkflowState';
export { useHumanActivity } from './useHumanActivity';
export { useTextSearch } from './useTextSearch';
export { useSearchKeyboard } from './useSearchKeyboard';
export { useAutoExecution } from './useAutoExecution';
export { useConvertToWorktree } from './useConvertToWorktree';
// useConvertBugToWorktree removed (github-issue-integration)
