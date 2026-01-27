/**
 * Shared components barrel export
 *
 * This module exports all shared UI components used by both
 * Electron renderer and Remote UI applications.
 */

// UI components - basic building blocks
export * from './ui';

// Spec components
export * from './spec';

// Bug components
export * from './bug';

// Workflow components
export * from './workflow';

// Agent components
export * from './agent';

// Review & Inspection components
export * from './review';

// Execution components
export * from './execution';

// Project components
export * from './project';

// Schedule Task components
export * from './schedule';

// Migration components (runtime-agents-restructure feature)
export * from './migration';

// Git components (git-diff-viewer feature)
// Task 10.5: Move git components to shared
export * from './git';

// Component categories will be added as they are migrated
// export * from './tabs';
