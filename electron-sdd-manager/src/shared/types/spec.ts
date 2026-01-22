/**
 * Shared Spec Types
 *
 * Type definitions for spec-related data shared by both
 * Electron renderer and Remote UI applications.
 *
 * spec-list-unification: Moved from renderer/stores/spec/types.ts
 */

import type { SpecPhase } from '@shared/api/types';

/**
 * Extended SpecMetadata with phase info for display
 * Used by SpecListItem and related components
 */
export interface SpecMetadataWithPhase {
  readonly name: string;
  readonly phase: SpecPhase;
  readonly updatedAt: string;
}

/**
 * Sort field options for spec list
 */
export type SpecSortBy = 'name' | 'updatedAt' | 'phase';

/**
 * Sort order options
 */
export type SpecSortOrder = 'asc' | 'desc';

/**
 * Status filter options (phase or 'all')
 */
export type SpecStatusFilter = SpecPhase | 'all';
