/**
 * Shared module barrel export
 *
 * This module exports all shared components, hooks, stores, and types
 * that are used by both Electron renderer and Remote UI.
 */

// Components - selective exports to avoid conflicts
export {
  // UI components
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  Spinner,
  Toast,
  // Spec components
  SpecListItem,
  // Bug components
  BugListItem,
  // Workflow components
  PhaseItem,
} from './components';

export type {
  ButtonProps,
  ButtonVariant,
  ButtonSize,
  CardProps,
  ModalProps,
  ModalSize,
  SpinnerProps,
  SpinnerSize,
  ToastProps,
  ToastType,
  ToastAction,
  SpecListItemProps,
  BugListItemProps,
  PhaseItemProps,
  // Workflow types from components
  WorkflowPhase,
  PhaseStatus,
} from './components';

// Hooks
export * from './hooks';

// Stores (placeholder for now)
// export * from './stores';

// API - export everything
export * from './api';

// Types (placeholder for now)
// export * from './types';

// Providers
export * from './providers';
