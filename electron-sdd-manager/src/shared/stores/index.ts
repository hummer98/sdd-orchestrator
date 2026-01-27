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

// MCP store (mcp-server-integration)
export { useMcpStore, resetMcpStore, getMcpStore } from './mcpStore';
export type { McpStoreState, McpStoreActions, McpStore, McpServerStatus } from './mcpStore';

// Schedule Task store (schedule-task-execution feature)
// Task 4.1: scheduleTaskStoreを作成
// Requirements: 全UI, 9.2
export {
  useScheduleTaskStore,
  resetScheduleTaskStore,
  getScheduleTaskStore,
} from './scheduleTaskStore';
export type {
  ScheduleTaskState,
  ScheduleTaskActions,
  ScheduleTaskStore,
  ScheduleTaskElectronAPI,
} from './scheduleTaskStore';

// GitView store (git-diff-viewer feature)
// Task 10.5: Move gitViewStore to shared
// Requirements: 4.1, 4.2, 10.3, 10.4
export {
  useSharedGitViewStore,
  resetSharedGitViewStore,
  getSharedGitViewStore,
} from './gitViewStore';

