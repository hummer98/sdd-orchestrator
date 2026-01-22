/**
 * parallelModeStore Tests
 * parallel-task-impl: Task 4
 *
 * Tests for the parallel mode UI state store.
 * Requirements: 5.1-5.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useParallelModeStore,
  resetParallelModeStore,
  getParallelModeStore,
} from './parallelModeStore';

describe('parallelModeStore', () => {
  beforeEach(() => {
    resetParallelModeStore();
  });

  // =============================================================================
  // State management
  // Requirements: 5.1
  // =============================================================================
  describe('initial state', () => {
    it('should have parallelModeEnabled as false by default', () => {
      const state = getParallelModeStore();
      expect(state.parallelModeEnabled).toBe(false);
    });

    it('should have selectedSpecId as null by default', () => {
      const state = getParallelModeStore();
      expect(state.selectedSpecId).toBeNull();
    });

    it('should have empty parseResults map by default', () => {
      const state = getParallelModeStore();
      expect(state.parseResults.size).toBe(0);
    });
  });

  // =============================================================================
  // Toggle parallel mode
  // Requirements: 5.2
  // =============================================================================
  describe('setParallelModeEnabled', () => {
    it('should enable parallel mode', () => {
      const store = getParallelModeStore();
      store.setParallelModeEnabled(true);

      expect(getParallelModeStore().parallelModeEnabled).toBe(true);
    });

    it('should disable parallel mode', () => {
      const store = getParallelModeStore();
      store.setParallelModeEnabled(true);
      store.setParallelModeEnabled(false);

      expect(getParallelModeStore().parallelModeEnabled).toBe(false);
    });
  });

  // =============================================================================
  // Toggle for specific spec
  // Requirements: 5.2
  // =============================================================================
  describe('toggleParallelMode', () => {
    it('should toggle parallel mode from false to true', () => {
      const store = getParallelModeStore();
      store.toggleParallelMode();

      expect(getParallelModeStore().parallelModeEnabled).toBe(true);
    });

    it('should toggle parallel mode from true to false', () => {
      const store = getParallelModeStore();
      store.setParallelModeEnabled(true);
      store.toggleParallelMode();

      expect(getParallelModeStore().parallelModeEnabled).toBe(false);
    });
  });

  // =============================================================================
  // Spec selection tracking
  // Requirements: 5.3
  // =============================================================================
  describe('setSelectedSpecId', () => {
    it('should set the selected spec ID', () => {
      const store = getParallelModeStore();
      store.setSelectedSpecId('my-feature');

      expect(getParallelModeStore().selectedSpecId).toBe('my-feature');
    });

    it('should allow setting to null', () => {
      const store = getParallelModeStore();
      store.setSelectedSpecId('my-feature');
      store.setSelectedSpecId(null);

      expect(getParallelModeStore().selectedSpecId).toBeNull();
    });
  });

  // =============================================================================
  // Parse results caching
  // =============================================================================
  describe('setParseResult', () => {
    it('should store parse result for a spec', () => {
      const store = getParallelModeStore();
      const parseResult = {
        groups: [],
        totalTasks: 5,
        parallelTasks: 2,
      };

      store.setParseResult('my-feature', parseResult);

      expect(getParallelModeStore().parseResults.get('my-feature')).toEqual(parseResult);
    });

    it('should update existing parse result', () => {
      const store = getParallelModeStore();
      const parseResult1 = { groups: [], totalTasks: 5, parallelTasks: 2 };
      const parseResult2 = { groups: [], totalTasks: 10, parallelTasks: 5 };

      store.setParseResult('my-feature', parseResult1);
      store.setParseResult('my-feature', parseResult2);

      expect(getParallelModeStore().parseResults.get('my-feature')).toEqual(parseResult2);
    });
  });

  describe('getParseResult', () => {
    it('should return null for non-existent spec', () => {
      const store = getParallelModeStore();
      const result = store.getParseResult('non-existent');

      expect(result).toBeNull();
    });

    it('should return cached parse result', () => {
      const store = getParallelModeStore();
      const parseResult = { groups: [], totalTasks: 5, parallelTasks: 2 };

      store.setParseResult('my-feature', parseResult);
      const result = store.getParseResult('my-feature');

      expect(result).toEqual(parseResult);
    });
  });

  describe('clearParseResult', () => {
    it('should remove parse result for a spec', () => {
      const store = getParallelModeStore();
      const parseResult = { groups: [], totalTasks: 5, parallelTasks: 2 };

      store.setParseResult('my-feature', parseResult);
      store.clearParseResult('my-feature');

      expect(store.getParseResult('my-feature')).toBeNull();
    });

    it('should not affect other specs', () => {
      const store = getParallelModeStore();
      const parseResult1 = { groups: [], totalTasks: 5, parallelTasks: 2 };
      const parseResult2 = { groups: [], totalTasks: 10, parallelTasks: 5 };

      store.setParseResult('feature-1', parseResult1);
      store.setParseResult('feature-2', parseResult2);
      store.clearParseResult('feature-1');

      expect(store.getParseResult('feature-1')).toBeNull();
      expect(store.getParseResult('feature-2')).toEqual(parseResult2);
    });
  });

  // =============================================================================
  // Has parallel tasks helper
  // =============================================================================
  describe('hasParallelTasks', () => {
    it('should return false for non-existent spec', () => {
      const store = getParallelModeStore();
      expect(store.hasParallelTasks('non-existent')).toBe(false);
    });

    it('should return false when parallelTasks is 0', () => {
      const store = getParallelModeStore();
      store.setParseResult('my-feature', { groups: [], totalTasks: 5, parallelTasks: 0 });

      expect(store.hasParallelTasks('my-feature')).toBe(false);
    });

    it('should return true when parallelTasks > 0', () => {
      const store = getParallelModeStore();
      store.setParseResult('my-feature', { groups: [], totalTasks: 5, parallelTasks: 3 });

      expect(store.hasParallelTasks('my-feature')).toBe(true);
    });
  });
});
