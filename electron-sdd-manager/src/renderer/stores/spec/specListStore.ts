/**
 * SpecListStore
 * Manages Spec list state (specs array, sorting, filtering)
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
 * spec-metadata-ssot-refactor: Added specJsonMap for SSOT principle
 */

import { create } from 'zustand';
import type { SpecMetadata, SpecJson, SpecPhase } from '../../types';
import type { SpecListState, SpecListActions, SpecMetadataWithPhase } from './types';
import { DEFAULT_SPEC_LIST_STATE } from './types';

type SpecListStore = SpecListState & SpecListActions;

/**
 * Unknown phase placeholder for specs without valid specJson
 * spec-metadata-ssot-refactor: Used when specJson cannot be loaded
 */
const UNKNOWN_PHASE: SpecPhase = 'initialized';
const UNKNOWN_DATE = '1970-01-01T00:00:00.000Z';

export const useSpecListStore = create<SpecListStore>((set, get) => ({
  // Initial state
  ...DEFAULT_SPEC_LIST_STATE,

  // Actions

  /**
   * Load specs from project path
   * Requirement 1.2: loadSpecs action to fetch specs from project path
   * Requirement 1.7: Set isLoading to true during fetch
   * Requirement 1.8: Set error state on failure
   * spec-metadata-ssot-refactor: Also loads specJsons for phase/updatedAt
   */
  loadSpecs: async (projectPath: string) => {
    set({ isLoading: true, error: null });

    try {
      const specs = await window.electronAPI.readSpecs(projectPath);
      set({ specs, isLoading: false });

      // spec-metadata-ssot-refactor: Load specJsons after loading specs
      await get().loadSpecJsons(projectPath);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load specs',
        isLoading: false,
      });
    }
  },

  /**
   * Load specJsons for all specs
   * spec-metadata-ssot-refactor: Task 3.1 - Build specJsonMap
   */
  loadSpecJsons: async (_projectPath: string) => {
    const { specs } = get();
    const newSpecJsonMap = new Map<string, SpecJson>();

    for (const spec of specs) {
      try {
        const specJson = await window.electronAPI.readSpecJson(spec.path);
        newSpecJsonMap.set(spec.name, specJson);
      } catch (error) {
        // Skip specs with invalid spec.json
        console.warn(`[specListStore] Failed to load specJson for ${spec.name}:`, error);
      }
    }

    set({ specJsonMap: newSpecJsonMap });
    console.log(`[specListStore] Loaded ${newSpecJsonMap.size} specJsons`);
  },

  /**
   * Set specs directly
   * Requirement 1.3: setSpecs action for unified project selection integration
   */
  setSpecs: (specs: SpecMetadata[]) => {
    set({ specs, isLoading: false, error: null });
  },

  /**
   * Set specJsonMap directly from selectProject result
   * spec-metadata-ssot-refactor: Replaces async loadSpecJsons for initial load
   * This allows setting specJsonMap synchronously from IPC result
   */
  setSpecJsonMap: (specJsonMap: Record<string, SpecJson>) => {
    // Convert Record to Map
    const newMap = new Map<string, SpecJson>(Object.entries(specJsonMap));
    set({ specJsonMap: newMap });
    console.log(`[specListStore] Set specJsonMap with ${newMap.size} entries`);
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
   * Get sorted and filtered specs with phase info
   * Requirement 1.4: getSortedFilteredSpecs selector for sorted/filtered spec list
   * spec-metadata-ssot-refactor: Task 3.2, 3.3 - Use specJsonMap for filtering/sorting
   */
  getSortedFilteredSpecs: (): SpecMetadataWithPhase[] => {
    const { specs, specJsonMap, sortBy, sortOrder, statusFilter } = get();

    // Convert to SpecMetadataWithPhase using specJsonMap
    const specsWithPhase: SpecMetadataWithPhase[] = specs.map((spec) => {
      const specJson = specJsonMap.get(spec.name);
      return {
        name: spec.name,
        path: spec.path,
        phase: specJson?.phase ?? UNKNOWN_PHASE,
        updatedAt: specJson?.updated_at ?? UNKNOWN_DATE,
      };
    });

    // Filter
    let filtered = specsWithPhase;
    if (statusFilter !== 'all') {
      filtered = specsWithPhase.filter((spec) => spec.phase === statusFilter);
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
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
   * spec-metadata-ssot-refactor: Also updates specJsonMap
   */
  updateSpecMetadata: async (specId: string, projectPath: string) => {
    try {
      // Re-read specs list
      const specs = await window.electronAPI.readSpecs(projectPath);
      set({ specs });

      // Also update specJsonMap for the specific spec
      const spec = specs.find((s) => s.name === specId);
      if (spec) {
        try {
          const specJson = await window.electronAPI.readSpecJson(spec.path);
          const { specJsonMap } = get();
          const newMap = new Map(specJsonMap);
          newMap.set(specId, specJson);
          set({ specJsonMap: newMap });
        } catch (error) {
          console.warn(`[specListStore] Failed to update specJson for ${specId}:`, error);
        }
      }

      console.log('[specListStore] updateSpecMetadata completed:', specId);
    } catch (error) {
      console.error('[specListStore] Failed to update spec metadata:', error);
    }
  },
}));
