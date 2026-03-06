/**
 * Shared stores barrel export
 *
 * This module exports all Zustand stores that are shared between
 * Electron renderer and Remote UI applications.
 */

// Spec store
export { useSharedSpecStore, resetSharedSpecStore, getSharedSpecStore } from './specStore';
export type { SharedSpecState, SharedSpecActions, SharedSpecStore } from './specStore';

// Bug store removed (github-issue-integration)

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

// Bug Auto Execution store removed (github-issue-integration)

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
// git-view-source-mode: Extended with 'source' diffMode
export {
  useSharedGitViewStore,
  resetSharedGitViewStore,
  getSharedGitViewStore,
} from './gitViewStore';
export type { GitViewDiffMode, GitViewViewMode } from './gitViewStore';

// Notification store (worktree-rebase-from-main)
// Task 12.2, 12.3: Shared notification interface for stores
export { useNotificationStore, setNotificationHandler } from './notificationStore';
export type { NotificationData, SharedNotificationStore } from './notificationStore';

// Project Editor store (project-config-editor feature)
// Task 1.2: Project file editing state management
// Requirements: 4.1, 4.4, 5.2
export {
  useProjectEditorStore,
  resetProjectEditorStore,
  getProjectEditorStore,
} from './projectEditorStore';
export type {
  ProjectEditorState,
  ProjectEditorActions,
  ProjectEditorStore,
} from './projectEditorStore';

// Issue store (github-issue-integration feature)
// Task 6.1: Issue/PR state management
// Requirements: 2.2, 2.3, 2.5, 2.6, 9.1
export { issueStore, resetIssueStore, getIssueStore } from './issueStore';
export type { IssueStoreState, IssueStoreActions, IssueStore } from './issueStore';

// Docs Tree Expanded store (project-docs-viewer feature)
// Task 2.1: docs/ ツリー展開状態管理ストア
// Requirements: 3.1, 3.2, 3.3, 3.4
export {
  useDocsTreeExpandedStore,
  resetDocsTreeExpandedStore,
  getDocsTreeExpandedStore,
} from './docsTreeExpandedStore';
export type {
  DocsTreeExpandedState,
  DocsTreeExpandedActions,
  DocsTreeExpandedStore,
} from './docsTreeExpandedStore';

