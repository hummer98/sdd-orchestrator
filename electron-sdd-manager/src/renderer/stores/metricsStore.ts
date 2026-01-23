/**
 * Metrics Store (Zustand)
 * Task 6.1: Metrics store implementation
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2
 *
 * Provides runtime state management for metrics data in the renderer process.
 * Fetches metrics from Main process via IPC and exposes them to UI components.
 */

import { create } from 'zustand';
import type { SpecMetrics, ProjectMetrics } from '../../main/types/metrics';

// =============================================================================
// Types
// =============================================================================

/**
 * API client interface for metrics operations
 * Used for dependency injection in tests
 */
export interface MetricsApiClient {
  getSpecMetrics(specId: string): Promise<{ ok: true; value: SpecMetrics } | { ok: false; error: string }>;
  getProjectMetrics(): Promise<{ ok: true; value: ProjectMetrics } | { ok: false; error: string }>;
}

/**
 * Metrics state
 */
interface MetricsState {
  /** Current spec metrics (null if not loaded) */
  currentMetrics: SpecMetrics | null;

  /** Loading state */
  isLoading: boolean;

  /** Error message (null if no error) */
  error: string | null;

  /** Project-wide metrics (optional feature) */
  projectMetrics: ProjectMetrics | null;
}

/**
 * Metrics actions
 */
interface MetricsActions {
  /**
   * Load metrics for a specific spec
   * Requirement 5.1: Load metrics for selected spec
   */
  loadMetrics(specId: string, apiClient: MetricsApiClient): Promise<void>;

  /**
   * Load project-wide metrics
   * Optional feature for requirements 8.1-8.3
   */
  loadProjectMetrics(apiClient: MetricsApiClient): Promise<void>;

  /**
   * Clear current metrics
   * Used when spec selection changes or on unmount
   */
  clearMetrics(): void;

  /**
   * Update metrics directly (for external updates/events)
   * Used when METRICS_UPDATED IPC event is received
   */
  updateMetrics(metrics: SpecMetrics): void;
}

type MetricsStore = MetricsState & MetricsActions;

// =============================================================================
// Store Implementation
// =============================================================================

/**
 * Create the metrics store
 * Following the pattern used by other stores in the codebase (notificationStore, etc.)
 */
export const useMetricsStore = create<MetricsStore>((set) => ({
  // Initial state
  currentMetrics: null,
  isLoading: false,
  error: null,
  projectMetrics: null,

  // Actions
  loadMetrics: async (specId: string, apiClient: MetricsApiClient) => {
    set({ isLoading: true, error: null });

    const result = await apiClient.getSpecMetrics(specId);

    if (result.ok) {
      set({
        currentMetrics: result.value,
        isLoading: false,
        error: null,
      });
    } else {
      set({
        currentMetrics: null,
        isLoading: false,
        error: result.error,
      });
    }
  },

  loadProjectMetrics: async (apiClient: MetricsApiClient) => {
    const result = await apiClient.getProjectMetrics();

    if (result.ok) {
      set({
        projectMetrics: result.value,
      });
    }
  },

  clearMetrics: () => {
    set({
      currentMetrics: null,
      error: null,
    });
  },

  updateMetrics: (metrics: SpecMetrics) => {
    set({
      currentMetrics: metrics,
    });
  },
}));

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Reset the store to initial state
 * Used in tests for cleanup between test cases
 */
export function resetMetricsStore(): void {
  useMetricsStore.setState({
    currentMetrics: null,
    isLoading: false,
    error: null,
    projectMetrics: null,
  });
}

/**
 * Get the current store state
 * Useful for tests that need to check state synchronously
 */
export function getMetricsStore(): MetricsStore {
  return useMetricsStore.getState();
}
