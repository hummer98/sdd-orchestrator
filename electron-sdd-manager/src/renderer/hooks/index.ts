/**
 * Renderer hooks barrel export
 *
 * This module exports all custom React hooks that are specific to the
 * Electron renderer process. Shared hooks are in ../shared/hooks.
 */

// idle-time-project-level-reporting Task 5.1: Export useWindowFocusTracker
// Requirements: 2.1, 2.2, 2.3, 2.4 - Window focus-based activity tracking
export { useWindowFocusTracker } from './useWindowFocusTracker';
export type { UseWindowFocusTrackerReturn } from './useWindowFocusTracker';
export { FOCUS_ACTIVITY_UPDATE_INTERVAL_MS } from './useWindowFocusTracker';

// idle-time-project-level-reporting Task 2.1: Export useIdleTimeSync
// Requirements: 1.1, 1.2, 1.3, 3.1-3.4, 4.1-4.3 - Idle time sync with priority control
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
export { useConvertBugToWorktree } from './useConvertBugToWorktree';
