/**
 * SpecListStore
 * Manages Spec list state (specs array, sorting, filtering)
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
 */

import { create } from 'zustand';
import type { SpecMetadata } from '../../types';
import type { SpecListState, SpecListActions } from './types';
import { DEFAULT_SPEC_LIST_STATE } from './types';

type SpecListStore = SpecListState & SpecListActions;

export const useSpecListStore = create<SpecListStore>((set, get) => ({
  // Initial state
  ...DEFAULT_SPEC_LIST_STATE,

  // Actions

  /**
   * Load specs from project path
   * Requirement 1.2: loadSpecs action to fetch specs from project path
   * Requirement 1.7: Set isLoading to true during fetch
   * Requirement 1.8: Set error state on failure
   */
  loadSpecs: async (projectPath: string) => {
    set({ isLoading: true, error: null });

    try {
      const specs = await window.electronAPI.readSpecs(projectPath);
      set({ specs, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load specs',
        isLoading: false,
      });
    }
  },

  /**
   * Set specs directly
   * Requirement 1.3: setSpecs action for unified project selection integration
   */
  setSpecs: (specs: SpecMetadata[]) => {
    set({ specs, isLoading: false, error: null });
  },

  /**
   * Set sort field
   * Requirement 1.5: Manage sort state (sortBy)
   */
  setSortBy: (sortBy: SpecListState['sortBy']) => {
    set({ sortBy });
  },

  /**
   * Set sort order
   * Requirement 1.5: Manage sort state (sortOrder)
   */
  setSortOrder: (order: SpecListState['sortOrder']) => {
    set({ sortOrder: order });
  },

  /**
   * Set status filter
   * Requirement 1.5: Manage filter state (statusFilter)
   */
  setStatusFilter: (filter: SpecListState['statusFilter']) => {
    set({ statusFilter: filter });
  },

  /**
   * Get sorted and filtered specs
   * Requirement 1.4: getSortedFilteredSpecs selector for sorted/filtered spec list
   */
  getSortedFilteredSpecs: () => {
    const { specs, sortBy, sortOrder, statusFilter } = get();

    // Filter
    let filtered = [...specs];
    if (statusFilter !== 'all') {
      filtered = specs.filter((spec) => spec.phase === statusFilter);
    }

    // Sort
    const sorted = filtered.sort((a, b) => {
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

    return sorted;
  },

  /**
   * Update single spec metadata in list
   * Requirement 1.6: updateSpecMetadata action to refresh single spec metadata in list
   */
  updateSpecMetadata: async (specId: string, projectPath: string) => {
    try {
      // Re-read specs list
      const specs = await window.electronAPI.readSpecs(projectPath);
      set({ specs });
      console.log('[specListStore] updateSpecMetadata completed:', specId);
    } catch (error) {
      console.error('[specListStore] Failed to update spec metadata:', error);
    }
  },
}));
