/**
 * Remote UI Hooks Barrel Export
 *
 * Provides centralized exports for all Remote UI hooks.
 * mobile-layout-refine: Added useNavigationStack
 */

// Navigation state management for mobile layout
export { useNavigationStack } from './useNavigationStack';
export type {
  MobileTab,
  SpecDetailContext,
  BugDetailContext,
  DetailContext,
  NavigationState,
  UseNavigationStackOptions,
  UseNavigationStackReturn,
} from './useNavigationStack';

// Workflow state for Remote UI
export { useRemoteWorkflowState } from './useRemoteWorkflowState';
export type { UseRemoteWorkflowStateConfig } from './useRemoteWorkflowState';
