/**
 * Shared hooks barrel export
 *
 * This module exports all custom React hooks that are shared between
 * Electron renderer and Remote UI applications.
 */

export { useDeviceType } from './useDeviceType';
export type { DeviceType, DeviceTypeInfo } from './useDeviceType';

// agent-launch-optimistic-ui: Optimistic UI state management hook
export { useLaunchingState } from './useLaunchingState';
export type {
  UseLaunchingStateOptions,
  UseLaunchingStateReturn,
} from './useLaunchingState';

// spec-list-unification: Shared spec list sorting/filtering logic
export { useSpecListLogic } from './useSpecListLogic';
export type {
  UseSpecListLogicOptions,
  UseSpecListLogicResult,
} from './useSpecListLogic';

// spec-workflow-unification: Shared workflow handlers for Electron and Remote UI
export { useSpecWorkflowHandlers } from './useSpecWorkflowHandlers';
export type {
  UseSpecWorkflowHandlersConfig,
  UseSpecWorkflowHandlersReturn,
} from './useSpecWorkflowHandlers';

// agent-log-perf: Incremental log parsing for performance
export { useIncrementalLogParser } from './useIncrementalLogParser';

// agent-log-perf: Incremental token aggregation for performance
export { useIncrementalTokenAggregator } from './useIncrementalTokenAggregator';
export type { TokenUsage } from './useIncrementalTokenAggregator';

// submit-shortcut-key: Keyboard shortcut for dialog form submission
export { useSubmitShortcut } from './useSubmitShortcut';
export type {
  UseSubmitShortcutOptions,
  UseSubmitShortcutReturn,
} from './useSubmitShortcut';
