/**
 * Store exports
 */

import { useProjectStore } from './projectStore';
import { useSpecStore } from './specStore';
import { useEditorStore } from './editorStore';
import { useNotificationStore } from './notificationStore';
import { useAgentStore } from './agentStore';
import { useWorkflowStore } from './workflowStore';
import { useRemoteAccessStore } from './remoteAccessStore';
import { useConnectionStore } from './connectionStore';
import { useVersionStatusStore } from './versionStatusStore';
// bugs-view-unification Task 6.1: Import shared bugStore instead of renderer-specific
import { useSharedBugStore } from '../../shared/stores/bugStore';

// Re-export all stores
export { useProjectStore } from './projectStore';
// header-profile-badge feature: export ProfileConfig type
export type { ProfileName, ProfileConfig } from './projectStore';
export { useSpecStore } from './specStore';
export { useEditorStore } from './editorStore';
export { useNotificationStore, notify } from './notificationStore';
export { useAgentStore } from './agentStore';
export type { AgentInfo, AgentStatus, LogEntry } from './agentStore';
// Task 2: Workflow Store (simplified in Task 5.1)
// NOTE: AutoExecutionStatus moved to types/index.ts as part of spec-scoped-auto-execution-state Task 5.1
export { useWorkflowStore, DEFAULT_AUTO_EXECUTION_PERMISSIONS, DEFAULT_COMMAND_PREFIX, COMMAND_PREFIXES } from './workflowStore';
export type { AutoExecutionPermissions, ExecutionSummary, CommandPrefix } from './workflowStore';
// Task 4.2: Remote Access Store (mobile-remote-access)
export { useRemoteAccessStore, STORAGE_KEY as REMOTE_ACCESS_STORAGE_KEY } from './remoteAccessStore';
// bugs-view-unification Task 6.1: Export shared bugStore (SSOT)
// Re-export useSharedBugStore for backward compatibility
export { useSharedBugStore } from '../../shared/stores/bugStore';
export type { SharedBugState, SharedBugActions, SharedBugStore } from '../../shared/stores/bugStore';
// SSH Remote Project Store (Requirements: 6.1, 7.1, 7.2)
export { useConnectionStore } from './connectionStore';
export type { ConnectionStatus, ProjectType, ConnectionInfo, RecentRemoteProject, ConnectionState } from './connectionStore';
// Version Status Store (commandset-version-detection feature)
// Requirements: 3.1
export { useVersionStatusStore } from './versionStatusStore';

/**
 * Expose stores to window for E2E testing and debugging via MCP
 * Always available - no security risk as users can access via DevTools anyway
 *
 * Usage from MCP (eval is blocked by CSP, use these helpers instead):
 *   window.__STORES__.project.getState()        // Get current state
 *   window.__STORES__.project.setState({...})   // Update state
 *   window.__STORES__.spec.getState().specs     // Access specific field
 *
 * Available stores: project, spec, editor, notification, agent, workflow, remoteAccess, bug, connection, versionStatus
 */
(window as any).__STORES__ = {
  // Each store exposes getState() and setState() for MCP compatibility
  project: {
    getState: () => useProjectStore.getState(),
    setState: (state: Parameters<typeof useProjectStore.setState>[0]) => useProjectStore.setState(state),
    subscribe: useProjectStore.subscribe,
  },
  spec: {
    getState: () => useSpecStore.getState(),
    setState: (state: Parameters<typeof useSpecStore.setState>[0]) => useSpecStore.setState(state),
    subscribe: useSpecStore.subscribe,
  },
  editor: {
    getState: () => useEditorStore.getState(),
    setState: (state: Parameters<typeof useEditorStore.setState>[0]) => useEditorStore.setState(state),
    subscribe: useEditorStore.subscribe,
  },
  notification: {
    getState: () => useNotificationStore.getState(),
    setState: (state: Parameters<typeof useNotificationStore.setState>[0]) => useNotificationStore.setState(state),
    subscribe: useNotificationStore.subscribe,
  },
  agent: {
    getState: () => useAgentStore.getState(),
    setState: (state: Parameters<typeof useAgentStore.setState>[0]) => useAgentStore.setState(state),
    subscribe: useAgentStore.subscribe,
  },
  workflow: {
    getState: () => useWorkflowStore.getState(),
    setState: (state: Parameters<typeof useWorkflowStore.setState>[0]) => useWorkflowStore.setState(state),
    subscribe: useWorkflowStore.subscribe,
  },
  remoteAccess: {
    getState: () => useRemoteAccessStore.getState(),
    setState: (state: Parameters<typeof useRemoteAccessStore.setState>[0]) => useRemoteAccessStore.setState(state),
    subscribe: useRemoteAccessStore.subscribe,
  },
  // bugs-view-unification Task 6.1: Use shared bugStore (SSOT)
  bug: {
    getState: () => useSharedBugStore.getState(),
    setState: (state: Parameters<typeof useSharedBugStore.setState>[0]) => useSharedBugStore.setState(state),
    subscribe: useSharedBugStore.subscribe,
  },
  connection: {
    getState: () => useConnectionStore.getState(),
    setState: (state: Parameters<typeof useConnectionStore.setState>[0]) => useConnectionStore.setState(state),
    subscribe: useConnectionStore.subscribe,
  },
  versionStatus: {
    getState: () => useVersionStatusStore.getState(),
    setState: (state: Parameters<typeof useVersionStatusStore.setState>[0]) => useVersionStatusStore.setState(state),
    subscribe: useVersionStatusStore.subscribe,
  },
};
