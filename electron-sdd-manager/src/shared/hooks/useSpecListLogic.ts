/**
 * Shared Spec List Logic Hook
 *
 * Provides sorting, filtering, and text search logic for spec lists.
 * Used by both Electron SpecList and Remote-UI SpecsView.
 *
 * spec-list-unification: Extracted from specListStore and SpecsView
 */

import { useMemo, useState, useCallback } from 'react';
import type { SpecJson, SpecPhase } from '@shared/api/types';
import type {
  SpecMetadataWithPhase,
  SpecSortBy,
  SpecSortOrder,
  SpecStatusFilter,
} from '@shared/types/spec';

// =============================================================================
// Types
// =============================================================================

export interface UseSpecListLogicOptions {
  /** Spec list (requires name property) */
  specs: readonly { name: string }[];
  /** Map of spec name to SpecJson */
  specJsonMap: ReadonlyMap<string, SpecJson> | Map<string, SpecJson>;
  /** Initial sort field (default: 'updatedAt') */
  initialSortBy?: SpecSortBy;
  /** Initial sort order (default: 'desc') */
  initialSortOrder?: SpecSortOrder;
  /** Initial status filter (default: 'all') */
  initialStatusFilter?: SpecStatusFilter;
  /** Enable text search (default: false) */
  enableTextSearch?: boolean;
}

export interface UseSpecListLogicResult {
  /** Sorted and filtered specs with phase info */
  filteredSpecs: SpecMetadataWithPhase[];
  /** Current sort field */
  sortBy: SpecSortBy;
  /** Current sort order */
  sortOrder: SpecSortOrder;
  /** Current status filter */
  statusFilter: SpecStatusFilter;
  /** Current search query (if enabled) */
  searchQuery: string;
  /** Set sort field */
  setSortBy: (sortBy: SpecSortBy) => void;
  /** Set sort order */
  setSortOrder: (order: SpecSortOrder) => void;
  /** Set status filter */
  setStatusFilter: (filter: SpecStatusFilter) => void;
  /** Set search query (if enabled) */
  setSearchQuery: (query: string) => void;
}

// =============================================================================
// Constants
// =============================================================================

const UNKNOWN_PHASE: SpecPhase = 'initialized';
const UNKNOWN_DATE = '1970-01-01T00:00:00.000Z';

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * useSpecListLogic - Shared logic for spec list sorting/filtering
 *
 * @example
 * // In SpecsView (Remote-UI) with text search
 * const { filteredSpecs, searchQuery, setSearchQuery } = useSpecListLogic({
 *   specs,
 *   specJsonMap,
 *   enableTextSearch: true,
 * });
 *
 * @example
 * // In SpecList (Electron) with status filter
 * const { filteredSpecs, statusFilter, setStatusFilter } = useSpecListLogic({
 *   specs,
 *   specJsonMap,
 *   initialStatusFilter: 'all',
 * });
 */
export function useSpecListLogic(options: UseSpecListLogicOptions): UseSpecListLogicResult {
  const {
    specs,
    specJsonMap,
    initialSortBy = 'updatedAt',
    initialSortOrder = 'desc',
    initialStatusFilter = 'all',
    enableTextSearch = false,
  } = options;

  // State
  const [sortBy, setSortByState] = useState<SpecSortBy>(initialSortBy);
  const [sortOrder, setSortOrderState] = useState<SpecSortOrder>(initialSortOrder);
  const [statusFilter, setStatusFilterState] = useState<SpecStatusFilter>(initialStatusFilter);
  const [searchQuery, setSearchQueryState] = useState('');

  // Convert to SpecMetadataWithPhase
  const specsWithPhase = useMemo((): SpecMetadataWithPhase[] => {
    return specs.map((spec) => {
      const specJson = specJsonMap.get(spec.name);
      return {
        name: spec.name,
        phase: specJson?.phase ?? UNKNOWN_PHASE,
        updatedAt: specJson?.updated_at ?? UNKNOWN_DATE,
      };
    });
  }, [specs, specJsonMap]);

  // Filter by status
  const statusFiltered = useMemo(() => {
    if (statusFilter === 'all') return specsWithPhase;
    return specsWithPhase.filter((spec) => spec.phase === statusFilter);
  }, [specsWithPhase, statusFilter]);

  // Filter by text search (if enabled)
  const textFiltered = useMemo(() => {
    if (!enableTextSearch || !searchQuery.trim()) return statusFiltered;
    const query = searchQuery.toLowerCase();
    return statusFiltered.filter((spec) => spec.name.toLowerCase().includes(query));
  }, [statusFiltered, searchQuery, enableTextSearch]);

  // Sort
  const filteredSpecs = useMemo(() => {
    return [...textFiltered].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'phase':
          comparison = a.phase.localeCompare(b.phase);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [textFiltered, sortBy, sortOrder]);

  // Memoized setters
  const setSortBy = useCallback((value: SpecSortBy) => setSortByState(value), []);
  const setSortOrder = useCallback((value: SpecSortOrder) => setSortOrderState(value), []);
  const setStatusFilter = useCallback((value: SpecStatusFilter) => setStatusFilterState(value), []);
  const setSearchQuery = useCallback((value: string) => setSearchQueryState(value), []);

  return {
    filteredSpecs,
    sortBy,
    sortOrder,
    statusFilter,
    searchQuery,
    setSortBy,
    setSortOrder,
    setStatusFilter,
    setSearchQuery,
  };
}
