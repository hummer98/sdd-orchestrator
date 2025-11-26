/**
 * Spec Store Tests
 * TDD: Testing spec list and detail state management
 * Requirements: 2.1-2.6, 3.1-3.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSpecStore } from './specStore';
import type { SpecMetadata } from '../types';

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
    readyForImplementation: false,
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
    readyForImplementation: true,
  },
  {
    name: 'feature-c',
    path: '/project/.kiro/specs/feature-c',
    phase: 'init',
    updatedAt: '2024-01-14T10:00:00Z',
    approvals: {
      requirements: { generated: false, approved: false },
      design: { generated: false, approved: false },
      tasks: { generated: false, approved: false },
    },
    readyForImplementation: false,
  },
];

describe('useSpecStore', () => {
  beforeEach(() => {
    // Reset store state
    useSpecStore.setState({
      specs: [],
      selectedSpec: null,
      specDetail: null,
      sortBy: 'name',
      sortOrder: 'asc',
      statusFilter: 'all',
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe('loadSpecs', () => {
    it('should load specs from project', async () => {
      window.electronAPI.readSpecs = vi.fn().mockResolvedValue(mockSpecs);

      await useSpecStore.getState().loadSpecs('/project');

      const state = useSpecStore.getState();
      expect(state.specs).toHaveLength(3);
    });

    it('should set isLoading during load', async () => {
      window.electronAPI.readSpecs = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockSpecs), 100))
      );

      const loadPromise = useSpecStore.getState().loadSpecs('/project');

      expect(useSpecStore.getState().isLoading).toBe(true);

      await loadPromise;

      expect(useSpecStore.getState().isLoading).toBe(false);
    });
  });

  describe('sorting', () => {
    beforeEach(() => {
      useSpecStore.setState({ specs: mockSpecs });
    });

    it('should sort by name ascending', () => {
      useSpecStore.getState().setSortBy('name');
      useSpecStore.getState().setSortOrder('asc');

      const sorted = useSpecStore.getState().getSortedFilteredSpecs();
      expect(sorted[0].name).toBe('feature-a');
      expect(sorted[2].name).toBe('feature-c');
    });

    it('should sort by name descending', () => {
      useSpecStore.getState().setSortBy('name');
      useSpecStore.getState().setSortOrder('desc');

      const sorted = useSpecStore.getState().getSortedFilteredSpecs();
      expect(sorted[0].name).toBe('feature-c');
      expect(sorted[2].name).toBe('feature-a');
    });

    it('should sort by updatedAt', () => {
      useSpecStore.getState().setSortBy('updatedAt');
      useSpecStore.getState().setSortOrder('desc');

      const sorted = useSpecStore.getState().getSortedFilteredSpecs();
      expect(sorted[0].name).toBe('feature-b'); // Most recent
      expect(sorted[2].name).toBe('feature-c'); // Oldest
    });
  });

  describe('filtering', () => {
    beforeEach(() => {
      useSpecStore.setState({ specs: mockSpecs });
    });

    it('should filter by phase', () => {
      useSpecStore.getState().setStatusFilter('init');

      const filtered = useSpecStore.getState().getSortedFilteredSpecs();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('feature-c');
    });

    it('should show all specs when filter is "all"', () => {
      useSpecStore.getState().setStatusFilter('all');

      const filtered = useSpecStore.getState().getSortedFilteredSpecs();
      expect(filtered).toHaveLength(3);
    });
  });

  describe('selectSpec', () => {
    it('should set selected spec and load details', async () => {
      const mockSpecJson = {
        feature_name: 'feature-a',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        language: 'ja',
        phase: 'design-generated',
        approvals: mockSpecs[0].approvals,
        ready_for_implementation: false,
      };

      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(mockSpecJson);

      await useSpecStore.getState().selectSpec(mockSpecs[0]);

      const state = useSpecStore.getState();
      expect(state.selectedSpec).toEqual(mockSpecs[0]);
      expect(state.specDetail).toBeTruthy();
    });
  });
});
