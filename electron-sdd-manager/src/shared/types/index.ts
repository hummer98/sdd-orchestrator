/**
 * Shared types barrel export
 *
 * This module exports all shared TypeScript types and interfaces
 * used by both Electron renderer and Remote UI applications.
 */

// Review & Inspection types
export * from './review';

// Execution types
export * from './execution';

// Execute options types (execute-method-unification feature)
export * from './executeOptions';

// Event log types (spec-event-log feature)
// Requirements: 4.1, 4.2, 4.3
export * from './eventLog';

// Worktree types and utilities (git-worktree-support feature)
// Requirements: 2.1, 2.2, 2.3
export * from './worktree';
