/**
 * Store exports
 */

import { useProjectStore } from './projectStore';
import { useSpecStore } from './specStore';
import { useEditorStore } from './editorStore';
import { useExecutionStore } from './executionStore';
import { useNotificationStore } from './notificationStore';
import { useAgentStore } from './agentStore';
import { useWorkflowStore } from './workflowStore';
import { useRemoteAccessStore } from './remoteAccessStore';
import { useBugStore } from './bugStore';
import { useConnectionStore } from './connectionStore';

// Re-export all stores
export { useProjectStore } from './projectStore';
export { useSpecStore } from './specStore';
export { useEditorStore } from './editorStore';
export { useExecutionStore } from './executionStore';
export { useNotificationStore, notify } from './notificationStore';
export { useAgentStore } from './agentStore';
export type { AgentInfo, AgentStatus, LogEntry } from './agentStore';
// Task 2: Workflow Store
export { useWorkflowStore, DEFAULT_AUTO_EXECUTION_PERMISSIONS, DEFAULT_COMMAND_PREFIX, COMMAND_PREFIXES } from './workflowStore';
export type { AutoExecutionPermissions, ValidationOptions, AutoExecutionStatus, ExecutionSummary, CommandPrefix } from './workflowStore';
// Task 4.2: Remote Access Store (mobile-remote-access)
export { useRemoteAccessStore, STORAGE_KEY as REMOTE_ACCESS_STORAGE_KEY } from './remoteAccessStore';
// Bug Workflow Store
export { useBugStore } from './bugStore';
// SSH Remote Project Store (Requirements: 6.1, 7.1, 7.2)
export { useConnectionStore } from './connectionStore';
export type { ConnectionStatus, ProjectType, ConnectionInfo, RecentRemoteProject, ConnectionState } from './connectionStore';

/**
 * Expose stores to window for E2E testing and debugging
 * Always available - no security risk as users can access via DevTools anyway
 */
(window as any).__STORES__ = {
  projectStore: useProjectStore,
  specStore: useSpecStore,
  editorStore: useEditorStore,
  executionStore: useExecutionStore,
  notificationStore: useNotificationStore,
  agentStore: useAgentStore,
  workflowStore: useWorkflowStore,
  remoteAccessStore: useRemoteAccessStore,
  bugStore: useBugStore,
  connectionStore: useConnectionStore,
};
