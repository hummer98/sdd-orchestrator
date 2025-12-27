/**
 * useTextSearch Hook Tests
 * TDD: Testing text search logic
 * Requirements: artifact-editor-search 2.1, 2.2, 2.3, 2.4, 2.5, 5.2, 5.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTextSearch } from './useTextSearch';
import { useEditorStore } from '../stores/editorStore';

describe('useTextSearch', () => {
  beforeEach(() => {
    // Reset store state
    useEditorStore.setState({
      content: '',
      searchQuery: '',
      caseSensitive: false,
      matches: [],
      activeMatchIndex: -1,
      searchVisible: false,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('match calculation', () => {
    it('should find all matches in content', () => {
      useEditorStore.setState({
        content: 'test content test more test',
        searchQuery: 'test',
        caseSensitive: false,
      });

      renderHook(() => useTextSearch());

      const state = useEditorStore.getState();
      expect(state.matches).toHaveLength(3);
      expect(state.matches[0]).toEqual({ start: 0, end: 4 });
      expect(state.matches[1]).toEqual({ start: 13, end: 17 });
      expect(state.matches[2]).toEqual({ start: 23, end: 27 });
    });

    it('should return empty array when query is empty', () => {
      useEditorStore.setState({
        content: 'test content',
        searchQuery: '',
        caseSensitive: false,
      });

      renderHook(() => useTextSearch());

      const state = useEditorStore.getState();
      expect(state.matches).toEqual([]);
    });

    it('should return empty array when no matches found', () => {
      useEditorStore.setState({
        content: 'hello world',
        searchQuery: 'xyz',
        caseSensitive: false,
      });

      renderHook(() => useTextSearch());

      const state = useEditorStore.getState();
      expect(state.matches).toEqual([]);
      expect(state.activeMatchIndex).toBe(-1);
    });

    it('should handle case insensitive search by default', () => {
      useEditorStore.setState({
        content: 'Test TEST test TeSt',
        searchQuery: 'test',
        caseSensitive: false,
      });

      renderHook(() => useTextSearch());

      const state = useEditorStore.getState();
      expect(state.matches).toHaveLength(4);
    });

    it('should handle case sensitive search when enabled', () => {
      useEditorStore.setState({
        content: 'Test TEST test TeSt',
        searchQuery: 'test',
        caseSensitive: true,
      });

      renderHook(() => useTextSearch());

      const state = useEditorStore.getState();
      expect(state.matches).toHaveLength(1);
      expect(state.matches[0]).toEqual({ start: 10, end: 14 });
    });

    it('should set activeMatchIndex to 0 when matches exist', () => {
      useEditorStore.setState({
        content: 'test content test',
        searchQuery: 'test',
        caseSensitive: false,
      });

      renderHook(() => useTextSearch());

      const state = useEditorStore.getState();
      expect(state.activeMatchIndex).toBe(0);
    });

    it('should set activeMatchIndex to -1 when no matches', () => {
      useEditorStore.setState({
        content: 'hello world',
        searchQuery: 'xyz',
        caseSensitive: false,
      });

      renderHook(() => useTextSearch());

      const state = useEditorStore.getState();
      expect(state.activeMatchIndex).toBe(-1);
    });
  });

  describe('reactive updates', () => {
    it('should recalculate matches when query changes', () => {
      useEditorStore.setState({
        content: 'hello world hello',
        searchQuery: 'hello',
        caseSensitive: false,
      });

      const { rerender } = renderHook(() => useTextSearch());

      expect(useEditorStore.getState().matches).toHaveLength(2);

      act(() => {
        useEditorStore.getState().setSearchQuery('world');
      });

      rerender();

      expect(useEditorStore.getState().matches).toHaveLength(1);
      expect(useEditorStore.getState().matches[0]).toEqual({ start: 6, end: 11 });
    });

    it('should recalculate matches when content changes', () => {
      useEditorStore.setState({
        content: 'test content',
        searchQuery: 'test',
        caseSensitive: false,
      });

      const { rerender } = renderHook(() => useTextSearch());

      expect(useEditorStore.getState().matches).toHaveLength(1);

      act(() => {
        useEditorStore.getState().setContent('test content test test');
      });

      rerender();

      expect(useEditorStore.getState().matches).toHaveLength(3);
    });

    it('should recalculate matches when caseSensitive changes', () => {
      useEditorStore.setState({
        content: 'Test TEST test',
        searchQuery: 'test',
        caseSensitive: false,
      });

      const { rerender } = renderHook(() => useTextSearch());

      expect(useEditorStore.getState().matches).toHaveLength(3);

      act(() => {
        useEditorStore.getState().setCaseSensitive(true);
      });

      rerender();

      expect(useEditorStore.getState().matches).toHaveLength(1);
    });
  });

  describe('totalCount', () => {
    it('should return correct total count from hook', () => {
      useEditorStore.setState({
        content: 'test test test',
        searchQuery: 'test',
        caseSensitive: false,
      });

      const { result } = renderHook(() => useTextSearch());

      expect(result.current.totalCount).toBe(3);
    });

    it('should return 0 when no matches', () => {
      useEditorStore.setState({
        content: 'hello world',
        searchQuery: 'xyz',
        caseSensitive: false,
      });

      const { result } = renderHook(() => useTextSearch());

      expect(result.current.totalCount).toBe(0);
    });
  });

  describe('currentIndex', () => {
    it('should return 1-based index for display', () => {
      useEditorStore.setState({
        content: 'test test test',
        searchQuery: 'test',
        caseSensitive: false,
      });

      const { result } = renderHook(() => useTextSearch());

      // First match, so current should be 1
      expect(result.current.currentIndex).toBe(1);
    });

    it('should return 0 when no matches', () => {
      useEditorStore.setState({
        content: 'hello world',
        searchQuery: 'xyz',
        caseSensitive: false,
      });

      const { result } = renderHook(() => useTextSearch());

      expect(result.current.currentIndex).toBe(0);
    });

    it('should update when activeMatchIndex changes', () => {
      useEditorStore.setState({
        content: 'test test test',
        searchQuery: 'test',
        caseSensitive: false,
      });

      const { result, rerender } = renderHook(() => useTextSearch());

      expect(result.current.currentIndex).toBe(1);

      act(() => {
        useEditorStore.getState().navigateNext();
      });

      rerender();

      expect(result.current.currentIndex).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      useEditorStore.setState({
        content: '',
        searchQuery: 'test',
        caseSensitive: false,
      });

      renderHook(() => useTextSearch());

      const state = useEditorStore.getState();
      expect(state.matches).toEqual([]);
    });

    it('should handle special characters in query', () => {
      useEditorStore.setState({
        content: 'hello (world) hello (world)',
        searchQuery: '(world)',
        caseSensitive: false,
      });

      renderHook(() => useTextSearch());

      const state = useEditorStore.getState();
      expect(state.matches).toHaveLength(2);
    });

    it('should handle overlapping patterns correctly', () => {
      useEditorStore.setState({
        content: 'aaaa',
        searchQuery: 'aa',
        caseSensitive: false,
      });

      renderHook(() => useTextSearch());

      const state = useEditorStore.getState();
      // Non-overlapping matches: positions 0-2 and 2-4 should not both be returned
      // Standard search returns non-overlapping: [0,2] only, then next starts at 2
      // We expect 2 matches: 0-2 and 2-4
      expect(state.matches).toHaveLength(2);
    });

    it('should handle unicode characters', () => {
      useEditorStore.setState({
        content: '日本語テスト日本語',
        searchQuery: '日本語',
        caseSensitive: false,
      });

      renderHook(() => useTextSearch());

      const state = useEditorStore.getState();
      expect(state.matches).toHaveLength(2);
    });
  });
});
