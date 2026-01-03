/**
 * SpecListStore Tests
 * TDD: Testing Spec list state management
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSpecListStore } from './specListStore';
import type { SpecMetadata } from '../../types';

const mockSpecs: SpecMetadata[] = [
  {
    name: 'feature-a',
    path: '/project/.kiro/specs/feature-a',
    phase: 'design-generated',
    updatedAt: '2024-01-15T10:00:00Z',
    approvals: {
      requirements: { generated: true, approved: true },
      design: { generated: true, approved: false },
      tasks: { generated: false, approved: false },
    },
  },
  {
    name: 'feature-b',
    path: '/project/.kiro/specs/feature-b',
    phase: 'tasks-generated',
    updatedAt: '2024-01-16T10:00:00Z',
    approvals: {
      requirements: { generated: true, approved: true },
      design: { generated: true, approved: true },
      tasks: { generated: true, approved: true },
    },
  },
  {
    name: 'feature-c',
    path: '/project/.kiro/specs/feature-c',
    phase: 'initialized',
    updatedAt: '2024-01-14T10:00:00Z',
    approvals: {
      requirements: { generated: false, approved: false },
      design: { generated: false, approved: false },
      tasks: { generated: false, approved: false },
    },
  },
];

describe('useSpecListStore', () => {
  beforeEach(() => {
    // Reset store state
    useSpecListStore.setState({
      specs: [],
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      statusFilter: 'all',
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useSpecListStore.getState();
      expect(state.specs).toEqual([]);
      expect(state.sortBy).toBe('updatedAt');
      expect(state.sortOrder).toBe('desc');
      expect(state.statusFilter).toBe('all');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('loadSpecs', () => {
    it('should load specs from project path (Req 1.2)', async () => {
      window.electronAPI.readSpecs = vi.fn().mockResolvedValue(mockSpecs);

      await useSpecListStore.getState().loadSpecs('/project');

      const state = useSpecListStore.getState();
      expect(state.specs).toHaveLength(3);
      expect(window.electronAPI.readSpecs).toHaveBeenCalledWith('/project');
    });

    it('should set isLoading to true during fetch (Req 1.7)', async () => {
      window.electronAPI.readSpecs = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockSpecs), 100))
      );

      const loadPromise = useSpecListStore.getState().loadSpecs('/project');

      expect(useSpecListStore.getState().isLoading).toBe(true);

      await loadPromise;

      expect(useSpecListStore.getState().isLoading).toBe(false);
    });

    it('should set error state if loadSpecs fails (Req 1.8)', async () => {
      window.electronAPI.readSpecs = vi.fn().mockRejectedValue(new Error('Network error'));

      await useSpecListStore.getState().loadSpecs('/project');

      const state = useSpecListStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('setSpecs', () => {
    it('should set specs directly for unified project selection (Req 1.3)', () => {
      useSpecListStore.getState().setSpecs(mockSpecs);

      const state = useSpecListStore.getState();
      expect(state.specs).toHaveLength(3);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('sorting (Req 1.5)', () => {
    beforeEach(() => {
      useSpecListStore.setState({ specs: mockSpecs });
    });

    it('should sort by name ascending', () => {
      useSpecListStore.getState().setSortBy('name');
      useSpecListStore.getState().setSortOrder('asc');

      const sorted = useSpecListStore.getState().getSortedFilteredSpecs();
      expect(sorted[0].name).toBe('feature-a');
      expect(sorted[2].name).toBe('feature-c');
    });

    it('should sort by name descending', () => {
      useSpecListStore.getState().setSortBy('name');
      useSpecListStore.getState().setSortOrder('desc');

      const sorted = useSpecListStore.getState().getSortedFilteredSpecs();
      expect(sorted[0].name).toBe('feature-c');
      expect(sorted[2].name).toBe('feature-a');
    });

    it('should sort by updatedAt descending (most recent first)', () => {
      useSpecListStore.getState().setSortBy('updatedAt');
      useSpecListStore.getState().setSortOrder('desc');

      const sorted = useSpecListStore.getState().getSortedFilteredSpecs();
      expect(sorted[0].name).toBe('feature-b'); // Most recent
      expect(sorted[2].name).toBe('feature-c'); // Oldest
    });

    it('should sort by phase', () => {
      useSpecListStore.getState().setSortBy('phase');
      useSpecListStore.getState().setSortOrder('asc');

      const sorted = useSpecListStore.getState().getSortedFilteredSpecs();
      expect(sorted[0].phase).toBe('design-generated');
      expect(sorted[1].phase).toBe('initialized');
      expect(sorted[2].phase).toBe('tasks-generated');
    });
  });

  describe('filtering (Req 1.5)', () => {
    beforeEach(() => {
      useSpecListStore.setState({ specs: mockSpecs });
    });

    it('should filter by phase', () => {
      useSpecListStore.getState().setStatusFilter('initialized');

      const filtered = useSpecListStore.getState().getSortedFilteredSpecs();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('feature-c');
    });

    it('should show all specs when filter is "all"', () => {
      useSpecListStore.getState().setStatusFilter('all');

      const filtered = useSpecListStore.getState().getSortedFilteredSpecs();
      expect(filtered).toHaveLength(3);
    });

    it('should return empty array when no specs match filter', () => {
      useSpecListStore.getState().setStatusFilter('implementation-complete');

      const filtered = useSpecListStore.getState().getSortedFilteredSpecs();
      expect(filtered).toHaveLength(0);
    });
  });

  describe('getSortedFilteredSpecs (Req 1.4)', () => {
    beforeEach(() => {
      useSpecListStore.setState({ specs: mockSpecs });
    });

    it('should apply both sorting and filtering', () => {
      useSpecListStore.getState().setStatusFilter('all');
      useSpecListStore.getState().setSortBy('name');
      useSpecListStore.getState().setSortOrder('asc');

      const result = useSpecListStore.getState().getSortedFilteredSpecs();
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('feature-a');
    });

    it('should return filtered and sorted copy without mutating original', () => {
      useSpecListStore.getState().setSortBy('name');
      useSpecListStore.getState().setSortOrder('desc');

      const result1 = useSpecListStore.getState().getSortedFilteredSpecs();
      const result2 = useSpecListStore.getState().getSortedFilteredSpecs();

      // Should return new array each time
      expect(result1).not.toBe(result2);
      // Original specs should be unchanged
      expect(useSpecListStore.getState().specs[0].name).toBe('feature-a');
    });
  });

  describe('updateSpecMetadata (Req 1.6)', () => {
    it('should refresh single spec metadata in list', async () => {
      window.electronAPI.readSpecs = vi.fn().mockResolvedValue([
        { ...mockSpecs[0], phase: 'tasks-generated' },
        ...mockSpecs.slice(1),
      ]);

      useSpecListStore.setState({ specs: mockSpecs });

      await useSpecListStore.getState().updateSpecMetadata('feature-a', '/project');

      expect(window.electronAPI.readSpecs).toHaveBeenCalledWith('/project');
      const state = useSpecListStore.getState();
      expect(state.specs[0].phase).toBe('tasks-generated');
    });
  });

  describe('state setters', () => {
    it('setSortBy should update sortBy', () => {
      useSpecListStore.getState().setSortBy('name');
      expect(useSpecListStore.getState().sortBy).toBe('name');
    });

    it('setSortOrder should update sortOrder', () => {
      useSpecListStore.getState().setSortOrder('asc');
      expect(useSpecListStore.getState().sortOrder).toBe('asc');
    });

    it('setStatusFilter should update statusFilter', () => {
      useSpecListStore.getState().setStatusFilter('design-generated');
      expect(useSpecListStore.getState().statusFilter).toBe('design-generated');
    });
  });
});
