/**
 * Specs Change Event Types
 * Shared type definitions for spec file change events
 *
 * Migrated from legacy Electron API type definitions (Task 11.3)
 * Canonical definition also exists in main/services/specsWatcherService.ts
 * This shared version is used by Renderer-side specWatcherService.
 *
 * Requirements: file-change-push-notification 2.1, 2.4
 */

import type { SpecJson } from '../../renderer/types';

/**
 * Specs change event type
 * Push-based notification: includes file content and error information
 */
export interface SpecsChangeEvent {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  path: string;
  specId?: string;
  /**
   * File content (push-based)
   * - For spec.json: SpecJson type
   * - For artifacts: string (Markdown content)
   * - On error: null
   * - When not set: undefined (backward compatibility)
   */
  content?: SpecJson | string | null;
  /**
   * Error message when file read fails
   */
  error?: string;
}
