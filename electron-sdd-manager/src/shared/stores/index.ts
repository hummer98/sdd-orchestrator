/**
 * Shared stores barrel export
 *
 * This module exports all Zustand stores that are shared between
 * Electron renderer and Remote UI applications.
 */

// Spec store
export { useSharedSpecStore, resetSharedSpecStore, getSharedSpecStore } from './specStore';
export type { SharedSpecState, SharedSpecActions, SharedSpecStore } from './specStore';

// Bug store
export { useSharedBugStore, resetSharedBugStore, getSharedBugStore } from './bugStore';
export type { SharedBugState, SharedBugActions, SharedBugStore } from './bugStore';

// Agent store
export { useSharedAgentStore, resetSharedAgentStore, getSharedAgentStore } from './agentStore';
export type { SharedAgentState, SharedAgentActions, SharedAgentStore } from './agentStore';

// Execution store
export { useSharedExecutionStore, resetSharedExecutionStore, getSharedExecutionStore } from './executionStore';
export type {
  SharedExecutionState,
  SharedExecutionActions,
  SharedExecutionStore,
  ExecutionStateEntry,
} from './executionStore';

// Bug Auto Execution store (bug-auto-execution-per-bug-state)
export {
  useBugAutoExecutionStore,
  initBugAutoExecutionIpcListeners,
  cleanupBugAutoExecutionIpcListeners,
  DEFAULT_BUG_AUTO_EXECUTION_RUNTIME,
} from './bugAutoExecutionStore';
export type {
  BugAutoExecutionRuntimeState,
  BugAutoExecutionRuntimeMap,
} from './bugAutoExecutionStore';
