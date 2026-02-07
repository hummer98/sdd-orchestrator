/**
 * toolPathStore
 * well-known-tool-paths feature
 * Task 4.1: toolPathStoreを実装する
 *
 * Shared store for tool path state (Renderer-side cache).
 * Tracks tool path resolution statuses for claude, jj, jq.
 * Requirements: 2.2, 2.3
 */

import { create } from 'zustand';
import type { ToolStatus, ToolResolutionResult } from '../types/toolPath';
// trpc-full-migration Task 3.2: Use tRPC vanilla client for config operations
import { getVanillaClient } from '../trpc/vanillaClient';

// =============================================================================
// Types
// =============================================================================

/**
 * Tool path store state
 * Requirements: 2.2, 2.3
 */
export interface ToolPathStoreState {
  /** Tool statuses */
  statuses: ToolStatus[];
  /** Loading state */
  isLoading: boolean;
  /** Error message (null when no error) */
  error: string | null;
}

/**
 * Tool path store actions
 * Requirements: 2.2, 2.3
 */
export interface ToolPathStoreActions {
  /** Fetch all tool statuses from Main process */
  fetchStatuses: () => Promise<void>;
  /** Set manual path for a tool */
  setToolPath: (tool: string, path: string | null) => Promise<void>;
  /** Re-resolve a single tool */
  resolveTool: (tool: string) => Promise<void>;
  /** Get status by tool name */
  getStatusByName: (name: string) => ToolStatus | undefined;
  /** Check if claude is resolved (convenience method) */
  isClaudeResolved: () => boolean;
}

export type ToolPathStore = ToolPathStoreState & ToolPathStoreActions;

// =============================================================================
// Store
// =============================================================================

export const useToolPathStore = create<ToolPathStore>((set, get) => ({
  // Initial state
  statuses: [],
  isLoading: false,
  error: null,

  // Actions
  // trpc-full-migration Task 3.2: Use tRPC for tool path operations
  fetchStatuses: async () => {
    set({ isLoading: true, error: null });

    try {
      const statuses = await getVanillaClient().config.getToolStatuses.query();
      set({ statuses: statuses as ToolStatus[], isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message, isLoading: false });
    }
  },

  setToolPath: async (tool: string, path: string | null) => {
    try {
      const result = await getVanillaClient().config.setToolPath.mutate({ tool, path }) as ToolResolutionResult;
      // Update the status for the specified tool
      set((state) => ({
        statuses: state.statuses.map((s) =>
          s.definition.name === tool ? { ...s, resolution: result } : s
        ),
        error: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message });
    }
  },

  resolveTool: async (tool: string) => {
    try {
      const result = await getVanillaClient().config.resolveTool.query({ tool }) as ToolResolutionResult;
      // Update the status for the specified tool
      set((state) => ({
        statuses: state.statuses.map((s) =>
          s.definition.name === tool ? { ...s, resolution: result } : s
        ),
        error: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message });
    }
  },

  getStatusByName: (name: string) => {
    return get().statuses.find((s) => s.definition.name === name);
  },

  isClaudeResolved: () => {
    const claudeStatus = get().statuses.find(
      (s) => s.definition.name === 'claude'
    );
    return claudeStatus?.resolution.resolved ?? false;
  },
}));

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Reset store to initial state (for testing)
 */
export function resetToolPathStore(): void {
  useToolPathStore.setState({
    statuses: [],
    isLoading: false,
    error: null,
  });
}

/**
 * Get current store state (for testing)
 */
export function getToolPathStore(): ToolPathStore {
  return useToolPathStore.getState();
}
