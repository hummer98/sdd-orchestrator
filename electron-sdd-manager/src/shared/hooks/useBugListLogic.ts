/**
 * Shared Bug List Logic Hook
 *
 * bugs-view-unification Task 3.1: useBugListLogicフックを作成する
 *
 * Provides sorting, filtering, and text search logic for bug lists.
 * Used by both Electron BugList and Remote-UI BugsView.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { useMemo, useState, useCallback } from 'react';
import type { BugMetadata } from '@shared/api/types';

/**
 * Bug phase type
 * bug-deploy-phase: Requirements 1.1 - includes deployed phase
 */
type BugPhase = 'reported' | 'analyzed' | 'fixed' | 'verified' | 'deployed';

// =============================================================================
// Types
// =============================================================================

/**
 * Bug phase filter options
 * Requirements: 2.3, 2.4
 */
export type BugPhaseFilter = 'all' | BugPhase;

/**
 * Bug phase filter options for UI display
 */
export const BUG_PHASE_FILTER_OPTIONS: { value: BugPhaseFilter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'reported', label: '報告済' },
  { value: 'analyzed', label: '分析済' },
  { value: 'fixed', label: '修正済' },
  { value: 'verified', label: '検証済' },
  { value: 'deployed', label: 'デプロイ完了' },
];

export interface UseBugListLogicOptions {
  /** Bug list */
  bugs: readonly BugMetadata[];
  /** Initial phase filter (default: 'all') */
  initialPhaseFilter?: BugPhaseFilter;
  /** Enable text search (default: false) */
  enableTextSearch?: boolean;
}

export interface UseBugListLogicResult {
  /** Filtered and sorted bug list */
  filteredBugs: BugMetadata[];
  /** Current phase filter */
  phaseFilter: BugPhaseFilter;
  /** Current search query (only effective when enableTextSearch is true) */
  searchQuery: string;
  /** Set phase filter (Requirements: 2.5) */
  setPhaseFilter: (filter: BugPhaseFilter) => void;
  /** Set search query (Requirements: 2.5) */
  setSearchQuery: (query: string) => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * useBugListLogic - Shared logic for bug list sorting/filtering
 *
 * @example
 * // In BugsView (Remote-UI) with text search
 * const { filteredBugs, searchQuery, setSearchQuery } = useBugListLogic({
 *   bugs,
 *   enableTextSearch: true,
 * });
 *
 * @example
 * // In BugList (Electron) with phase filter
 * const { filteredBugs, phaseFilter, setPhaseFilter } = useBugListLogic({
 *   bugs,
 *   initialPhaseFilter: 'all',
 * });
 */
export function useBugListLogic(options: UseBugListLogicOptions): UseBugListLogicResult {
  const {
    bugs,
    initialPhaseFilter = 'all',
    enableTextSearch = false,
  } = options;

  // State
  const [phaseFilter, setPhaseFilterState] = useState<BugPhaseFilter>(initialPhaseFilter);
  const [searchQuery, setSearchQueryState] = useState('');

  // Filter by phase (Requirements: 2.3, 2.4)
  const phaseFiltered = useMemo(() => {
    if (phaseFilter === 'all') return [...bugs];
    return bugs.filter((bug) => bug.phase === phaseFilter);
  }, [bugs, phaseFilter]);

  // Filter by text search (Requirements: 2.2)
  const textFiltered = useMemo(() => {
    if (!enableTextSearch || !searchQuery.trim()) return phaseFiltered;
    const query = searchQuery.toLowerCase();
    return phaseFiltered.filter((bug) => bug.name.toLowerCase().includes(query));
  }, [phaseFiltered, searchQuery, enableTextSearch]);

  // Sort by updatedAt descending (Requirements: 2.1)
  const filteredBugs = useMemo(() => {
    return [...textFiltered].sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [textFiltered]);

  // Memoized setters (Requirements: 2.5)
  const setPhaseFilter = useCallback((value: BugPhaseFilter) => setPhaseFilterState(value), []);
  const setSearchQuery = useCallback((value: string) => setSearchQueryState(value), []);

  // Return value (Requirements: 2.6)
  return {
    filteredBugs,
    phaseFilter,
    searchQuery,
    setPhaseFilter,
    setSearchQuery,
  };
}
