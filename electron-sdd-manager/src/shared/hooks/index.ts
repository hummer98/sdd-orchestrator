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
