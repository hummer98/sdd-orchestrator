/**
 * docsTreeExpandedStore Tests
 *
 * TDD: Tests written first for project-docs-viewer Task 2.1
 * Requirements: 3.1, 3.2, 3.3, 3.4
 *
 * Test cases:
 * - Initial state (all folders collapsed)
 * - toggleDir action (expand/collapse)
 * - reset action
 * - isExpanded helper
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  useDocsTreeExpandedStore,
  resetDocsTreeExpandedStore,
  getDocsTreeExpandedStore,
} from './docsTreeExpandedStore';

describe('docsTreeExpandedStore', () => {
  beforeEach(() => {
    resetDocsTreeExpandedStore();
  });

  describe('initial state', () => {
    // Requirement 3.4: Initial state is all folders collapsed (empty Map)
    it('should have empty expandedDirs Map', () => {
      const state = getDocsTreeExpandedStore();
      expect(state.expandedDirs.size).toBe(0);
    });
  });

  describe('toggleDir action', () => {
    // Requirement 3.1: Toggle folder expand/collapse
    it('should expand a collapsed folder', () => {
      getDocsTreeExpandedStore().toggleDir('api');

      const state = getDocsTreeExpandedStore();
      expect(state.expandedDirs.get('api')).toBe(true);
    });

    it('should collapse an expanded folder', () => {
      // First expand
      getDocsTreeExpandedStore().toggleDir('api');
      expect(getDocsTreeExpandedStore().expandedDirs.get('api')).toBe(true);

      // Then collapse
      getDocsTreeExpandedStore().toggleDir('api');
      expect(getDocsTreeExpandedStore().expandedDirs.get('api')).toBe(false);
    });

    it('should toggle nested folder paths', () => {
      getDocsTreeExpandedStore().toggleDir('api/v1');
      getDocsTreeExpandedStore().toggleDir('api/v2');

      const state = getDocsTreeExpandedStore();
      expect(state.expandedDirs.get('api/v1')).toBe(true);
      expect(state.expandedDirs.get('api/v2')).toBe(true);
    });

    it('should toggle multiple independent folders', () => {
      getDocsTreeExpandedStore().toggleDir('api');
      getDocsTreeExpandedStore().toggleDir('docs');
      getDocsTreeExpandedStore().toggleDir('guides');

      const state = getDocsTreeExpandedStore();
      expect(state.expandedDirs.get('api')).toBe(true);
      expect(state.expandedDirs.get('docs')).toBe(true);
      expect(state.expandedDirs.get('guides')).toBe(true);
    });
  });

  describe('isExpanded helper', () => {
    it('should return false for non-expanded folder', () => {
      const state = getDocsTreeExpandedStore();
      expect(state.isExpanded('api')).toBe(false);
    });

    it('should return true for expanded folder', () => {
      getDocsTreeExpandedStore().toggleDir('api');

      const state = getDocsTreeExpandedStore();
      expect(state.isExpanded('api')).toBe(true);
    });

    it('should return false after toggle back to collapsed', () => {
      getDocsTreeExpandedStore().toggleDir('api');
      getDocsTreeExpandedStore().toggleDir('api');

      const state = getDocsTreeExpandedStore();
      expect(state.isExpanded('api')).toBe(false);
    });
  });

  describe('reset action', () => {
    // Requirement 3.3: Reset on app restart (all folders collapse)
    it('should clear all expanded folders', () => {
      // Expand some folders
      getDocsTreeExpandedStore().toggleDir('api');
      getDocsTreeExpandedStore().toggleDir('docs');
      getDocsTreeExpandedStore().toggleDir('guides/getting-started');

      // Verify they are expanded
      expect(getDocsTreeExpandedStore().expandedDirs.size).toBeGreaterThan(0);

      // Reset
      getDocsTreeExpandedStore().reset();

      // Verify all are collapsed
      const state = getDocsTreeExpandedStore();
      expect(state.expandedDirs.size).toBe(0);
    });

    it('should be callable multiple times', () => {
      getDocsTreeExpandedStore().toggleDir('api');
      getDocsTreeExpandedStore().reset();
      getDocsTreeExpandedStore().reset();

      const state = getDocsTreeExpandedStore();
      expect(state.expandedDirs.size).toBe(0);
    });
  });

  describe('state persistence (on-memory)', () => {
    // Requirement 3.2: Tab switching should preserve state
    it('should preserve expanded state across multiple accesses', () => {
      getDocsTreeExpandedStore().toggleDir('api');
      getDocsTreeExpandedStore().toggleDir('docs');

      // Simulate "tab switching" by just accessing the store again
      const state1 = getDocsTreeExpandedStore();
      const state2 = getDocsTreeExpandedStore();

      expect(state1.isExpanded('api')).toBe(true);
      expect(state2.isExpanded('api')).toBe(true);
      expect(state1.isExpanded('docs')).toBe(true);
      expect(state2.isExpanded('docs')).toBe(true);
    });
  });
});
