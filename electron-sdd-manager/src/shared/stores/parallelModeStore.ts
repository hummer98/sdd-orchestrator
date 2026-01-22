/**
 * parallelModeStore
 * parallel-task-impl: Task 4
 *
 * Shared store for parallel mode UI state.
 * Tracks whether parallel mode is enabled and caches parse results.
 * Requirements: 5.1-5.3
 */

import { create } from 'zustand';

// =============================================================================
// Types
// =============================================================================

/**
 * Simplified ParseResult for UI caching
 * Full ParseResult is defined in taskParallelParser.ts
 */
export interface CachedParseResult {
  readonly groups: readonly unknown[];
  readonly totalTasks: number;
  readonly parallelTasks: number;
}

/**
 * Parallel mode state
 * Requirements: 5.1
 */
export interface ParallelModeState {
  /** Whether parallel mode is enabled globally */
  parallelModeEnabled: boolean;
  /** Currently selected spec ID (for context) */
  selectedSpecId: string | null;
  /** Cached parse results per spec */
  parseResults: Map<string, CachedParseResult>;
}

/**
 * Parallel mode actions
 * Requirements: 5.2, 5.3
 */
export interface ParallelModeActions {
  /** Set parallel mode enabled state */
  setParallelModeEnabled: (enabled: boolean) => void;
  /** Toggle parallel mode */
  toggleParallelMode: () => void;
  /** Set selected spec ID */
  setSelectedSpecId: (specId: string | null) => void;
  /** Set parse result for a spec */
  setParseResult: (specId: string, result: CachedParseResult) => void;
  /** Get parse result for a spec */
  getParseResult: (specId: string) => CachedParseResult | null;
  /** Clear parse result for a spec */
  clearParseResult: (specId: string) => void;
  /** Check if a spec has parallel tasks */
  hasParallelTasks: (specId: string) => boolean;
}

export type ParallelModeStore = ParallelModeState & ParallelModeActions;

// =============================================================================
// Store
// =============================================================================

export const useParallelModeStore = create<ParallelModeStore>((set, get) => ({
  // Initial state
  parallelModeEnabled: false,
  selectedSpecId: null,
  parseResults: new Map(),

  // Actions
  setParallelModeEnabled: (enabled: boolean) => {
    set({ parallelModeEnabled: enabled });
  },

  toggleParallelMode: () => {
    set((state) => ({ parallelModeEnabled: !state.parallelModeEnabled }));
  },

  setSelectedSpecId: (specId: string | null) => {
    set({ selectedSpecId: specId });
  },

  setParseResult: (specId: string, result: CachedParseResult) => {
    set((state) => {
      const newMap = new Map(state.parseResults);
      newMap.set(specId, result);
      return { parseResults: newMap };
    });
  },

  getParseResult: (specId: string) => {
    return get().parseResults.get(specId) ?? null;
  },

  clearParseResult: (specId: string) => {
    set((state) => {
      const newMap = new Map(state.parseResults);
      newMap.delete(specId);
      return { parseResults: newMap };
    });
  },

  hasParallelTasks: (specId: string) => {
    const result = get().parseResults.get(specId);
    return result ? result.parallelTasks > 0 : false;
  },
}));

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Reset store to initial state (for testing)
 */
export function resetParallelModeStore(): void {
  useParallelModeStore.setState({
    parallelModeEnabled: false,
    selectedSpecId: null,
    parseResults: new Map(),
  });
}

/**
 * Get current store state (for testing)
 */
export function getParallelModeStore(): ParallelModeStore {
  return useParallelModeStore.getState();
}
