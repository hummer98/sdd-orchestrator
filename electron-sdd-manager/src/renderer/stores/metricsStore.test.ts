/**
 * metricsStore Tests
 * TDD tests for Task 6.1: Metrics store (Zustand)
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMetricsStore, resetMetricsStore, getMetricsStore } from './metricsStore';
import type { SpecMetrics, ProjectMetrics } from '../../main/types/metrics';

// Mock the API client
const mockApiClient = {
  getSpecMetrics: vi.fn(),
  getProjectMetrics: vi.fn(),
};

describe('metricsStore', () => {
  beforeEach(() => {
    resetMetricsStore();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Initial State
  // ==========================================================================
  describe('initial state', () => {
    it('should have null current metrics', () => {
      const state = getMetricsStore();
      expect(state.currentMetrics).toBeNull();
    });

    it('should not be loading initially', () => {
      const state = getMetricsStore();
      expect(state.isLoading).toBe(false);
    });

    it('should have no error initially', () => {
      const state = getMetricsStore();
      expect(state.error).toBeNull();
    });

    it('should have null project metrics', () => {
      const state = getMetricsStore();
      expect(state.projectMetrics).toBeNull();
    });
  });

  // ==========================================================================
  // Requirement 5.1: Load metrics for spec
  // ==========================================================================
  describe('loadMetrics (Requirement 5.1)', () => {
    it('should set loading state while fetching', async () => {
      const mockMetrics: SpecMetrics = {
        specId: 'test-spec',
        totalAiTimeMs: 300000,
        totalHumanTimeMs: 180000,
        totalElapsedMs: null,
        phaseMetrics: {
          requirements: { aiTimeMs: 100000, humanTimeMs: 60000, status: 'completed' },
          design: { aiTimeMs: 200000, humanTimeMs: 120000, status: 'completed' },
          tasks: { aiTimeMs: 0, humanTimeMs: 0, status: 'pending' },
          impl: { aiTimeMs: 0, humanTimeMs: 0, status: 'pending' },
        },
        status: 'in-progress',
      };

      mockApiClient.getSpecMetrics.mockResolvedValue({ ok: true, value: mockMetrics });

      const loadPromise = getMetricsStore().loadMetrics('test-spec', mockApiClient as any);

      // Should be loading
      expect(getMetricsStore().isLoading).toBe(true);

      await loadPromise;

      // Should not be loading after completion
      expect(getMetricsStore().isLoading).toBe(false);
    });

    it('should store fetched metrics', async () => {
      const mockMetrics: SpecMetrics = {
        specId: 'test-spec',
        totalAiTimeMs: 300000,
        totalHumanTimeMs: 180000,
        totalElapsedMs: 16500000,
        phaseMetrics: {
          requirements: { aiTimeMs: 100000, humanTimeMs: 60000, status: 'completed' },
          design: { aiTimeMs: 200000, humanTimeMs: 120000, status: 'completed' },
          tasks: { aiTimeMs: 0, humanTimeMs: 0, status: 'pending' },
          impl: { aiTimeMs: 0, humanTimeMs: 0, status: 'pending' },
        },
        status: 'completed',
      };

      mockApiClient.getSpecMetrics.mockResolvedValue({ ok: true, value: mockMetrics });

      await getMetricsStore().loadMetrics('test-spec', mockApiClient as any);

      const state = getMetricsStore();
      expect(state.currentMetrics).toEqual(mockMetrics);
      expect(state.error).toBeNull();
    });

    it('should handle API error', async () => {
      mockApiClient.getSpecMetrics.mockResolvedValue({ ok: false, error: 'Failed to fetch' });

      await getMetricsStore().loadMetrics('test-spec', mockApiClient as any);

      const state = getMetricsStore();
      expect(state.error).toBe('Failed to fetch');
      expect(state.currentMetrics).toBeNull();
      expect(state.isLoading).toBe(false);
    });
  });

  // ==========================================================================
  // loadProjectMetrics (Optional)
  // ==========================================================================
  describe('loadProjectMetrics', () => {
    it('should store project-wide metrics', async () => {
      const mockProjectMetrics: ProjectMetrics = {
        totalAiTimeMs: 900000,
        totalHumanTimeMs: 540000,
        completedSpecCount: 2,
        inProgressSpecCount: 3,
      };

      mockApiClient.getProjectMetrics.mockResolvedValue({ ok: true, value: mockProjectMetrics });

      await getMetricsStore().loadProjectMetrics(mockApiClient as any);

      const state = getMetricsStore();
      expect(state.projectMetrics).toEqual(mockProjectMetrics);
    });
  });

  // ==========================================================================
  // clearMetrics
  // ==========================================================================
  describe('clearMetrics', () => {
    it('should clear current metrics', async () => {
      // First load some metrics
      const mockMetrics: SpecMetrics = {
        specId: 'test-spec',
        totalAiTimeMs: 300000,
        totalHumanTimeMs: 180000,
        totalElapsedMs: null,
        phaseMetrics: {
          requirements: { aiTimeMs: 100000, humanTimeMs: 60000, status: 'completed' },
          design: { aiTimeMs: 0, humanTimeMs: 0, status: 'pending' },
          tasks: { aiTimeMs: 0, humanTimeMs: 0, status: 'pending' },
          impl: { aiTimeMs: 0, humanTimeMs: 0, status: 'pending' },
        },
        status: 'in-progress',
      };

      mockApiClient.getSpecMetrics.mockResolvedValue({ ok: true, value: mockMetrics });
      await getMetricsStore().loadMetrics('test-spec', mockApiClient as any);

      // Clear
      getMetricsStore().clearMetrics();

      const state = getMetricsStore();
      expect(state.currentMetrics).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  // ==========================================================================
  // updateMetrics (for external updates/events)
  // ==========================================================================
  describe('updateMetrics', () => {
    it('should update current metrics directly', () => {
      const metrics: SpecMetrics = {
        specId: 'test-spec',
        totalAiTimeMs: 500000,
        totalHumanTimeMs: 250000,
        totalElapsedMs: null,
        phaseMetrics: {
          requirements: { aiTimeMs: 250000, humanTimeMs: 125000, status: 'completed' },
          design: { aiTimeMs: 250000, humanTimeMs: 125000, status: 'completed' },
          tasks: { aiTimeMs: 0, humanTimeMs: 0, status: 'pending' },
          impl: { aiTimeMs: 0, humanTimeMs: 0, status: 'pending' },
        },
        status: 'in-progress',
      };

      getMetricsStore().updateMetrics(metrics);

      expect(getMetricsStore().currentMetrics).toEqual(metrics);
    });
  });

  // ==========================================================================
  // React Hook Integration
  // ==========================================================================
  describe('useMetricsStore hook', () => {
    it('should export useMetricsStore hook', () => {
      expect(useMetricsStore).toBeDefined();
      expect(typeof useMetricsStore).toBe('function');
    });
  });
});
