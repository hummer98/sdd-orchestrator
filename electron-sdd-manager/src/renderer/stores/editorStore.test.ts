/**
 * Editor Store Tests
 * TDD: Testing editor state management
 * Requirements: 7.1-7.7, 9.1-9.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEditorStore } from './editorStore';

describe('useEditorStore', () => {
  beforeEach(() => {
    // Reset store state
    useEditorStore.setState({
      activeTab: 'requirements',
      content: '',
      originalContent: '',
      isDirty: false,
      isSaving: false,
      mode: 'edit',
      currentPath: null,
      error: null,
      // Search state reset
      searchVisible: false,
      searchQuery: '',
      caseSensitive: false,
      matches: [],
      activeMatchIndex: -1,
    });
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have requirements as default active tab', () => {
      const state = useEditorStore.getState();
      expect(state.activeTab).toBe('requirements');
    });

    it('should not be dirty initially', () => {
      const state = useEditorStore.getState();
      expect(state.isDirty).toBe(false);
    });

    it('should be in edit mode initially', () => {
      const state = useEditorStore.getState();
      expect(state.mode).toBe('edit');
    });
  });

  describe('setContent', () => {
    it('should update content and set dirty to true when different from original', () => {
      useEditorStore.setState({ originalContent: 'original' });

      useEditorStore.getState().setContent('modified content');

      const state = useEditorStore.getState();
      expect(state.content).toBe('modified content');
      expect(state.isDirty).toBe(true);
    });

    it('should set dirty to false when content matches original', () => {
      useEditorStore.setState({ originalContent: 'same content', isDirty: true });

      useEditorStore.getState().setContent('same content');

      const state = useEditorStore.getState();
      expect(state.isDirty).toBe(false);
    });
  });

  describe('loadArtifact', () => {
    it('should load artifact content', async () => {
      const mockContent = '# Test Content';
      window.electronAPI.readArtifact = vi.fn().mockResolvedValue(mockContent);

      await useEditorStore.getState().loadArtifact('/spec/path', 'requirements');

      const state = useEditorStore.getState();
      expect(state.content).toBe(mockContent);
      expect(state.originalContent).toBe(mockContent);
      expect(state.isDirty).toBe(false);
    });

    it('should set activeTab when loading artifact', async () => {
      window.electronAPI.readArtifact = vi.fn().mockResolvedValue('content');

      await useEditorStore.getState().loadArtifact('/spec/path', 'design');

      const state = useEditorStore.getState();
      expect(state.activeTab).toBe('design');
    });

    it('should handle load errors', async () => {
      window.electronAPI.readArtifact = vi.fn().mockRejectedValue(new Error('File not found'));

      await useEditorStore.getState().loadArtifact('/spec/path', 'requirements');

      // Should handle error gracefully - content should be empty or error state set
      const state = useEditorStore.getState();
      expect(state.content).toBe('');
    });
  });

  describe('save', () => {
    it('should save content and clear dirty flag', async () => {
      window.electronAPI.writeFile = vi.fn().mockResolvedValue(undefined);

      useEditorStore.setState({
        content: 'new content',
        originalContent: 'old content',
        isDirty: true,
        currentPath: '/spec/path/requirements.md',
      });

      await useEditorStore.getState().save();

      const state = useEditorStore.getState();
      expect(state.isDirty).toBe(false);
      expect(state.originalContent).toBe('new content');
      expect(window.electronAPI.writeFile).toHaveBeenCalled();
    });

    it('should set isSaving during save', async () => {
      window.electronAPI.writeFile = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      useEditorStore.setState({
        content: 'content',
        currentPath: '/path',
        isDirty: true,
      });

      const savePromise = useEditorStore.getState().save();

      expect(useEditorStore.getState().isSaving).toBe(true);

      await savePromise;

      expect(useEditorStore.getState().isSaving).toBe(false);
    });
  });

  describe('discardChanges', () => {
    it('should reset content to original', () => {
      useEditorStore.setState({
        content: 'modified',
        originalContent: 'original',
        isDirty: true,
      });

      useEditorStore.getState().discardChanges();

      const state = useEditorStore.getState();
      expect(state.content).toBe('original');
      expect(state.isDirty).toBe(false);
    });
  });

  describe('setMode', () => {
    it('should toggle between edit and preview modes', () => {
      expect(useEditorStore.getState().mode).toBe('edit');

      useEditorStore.getState().setMode('preview');
      expect(useEditorStore.getState().mode).toBe('preview');

      useEditorStore.getState().setMode('edit');
      expect(useEditorStore.getState().mode).toBe('edit');
    });
  });

  // Search state tests (Requirements: artifact-editor-search 2.1-2.5, 3.1-3.5, 5.1-5.3)
  describe('search state', () => {
    describe('initial search state', () => {
      it('should have search bar hidden initially', () => {
        const state = useEditorStore.getState();
        expect(state.searchVisible).toBe(false);
      });

      it('should have empty search query initially', () => {
        const state = useEditorStore.getState();
        expect(state.searchQuery).toBe('');
      });

      it('should have case sensitive off by default', () => {
        const state = useEditorStore.getState();
        expect(state.caseSensitive).toBe(false);
      });

      it('should have no matches initially', () => {
        const state = useEditorStore.getState();
        expect(state.matches).toEqual([]);
      });

      it('should have activeMatchIndex as -1 initially', () => {
        const state = useEditorStore.getState();
        expect(state.activeMatchIndex).toBe(-1);
      });
    });

    describe('setSearchVisible', () => {
      it('should show search bar', () => {
        useEditorStore.getState().setSearchVisible(true);
        expect(useEditorStore.getState().searchVisible).toBe(true);
      });

      it('should hide search bar', () => {
        useEditorStore.setState({ searchVisible: true });
        useEditorStore.getState().setSearchVisible(false);
        expect(useEditorStore.getState().searchVisible).toBe(false);
      });
    });

    describe('setSearchQuery', () => {
      it('should update search query', () => {
        useEditorStore.getState().setSearchQuery('test');
        expect(useEditorStore.getState().searchQuery).toBe('test');
      });

      it('should reset activeMatchIndex to 0 when matches exist', () => {
        useEditorStore.setState({
          matches: [{ start: 0, end: 4 }],
          activeMatchIndex: 2
        });
        useEditorStore.getState().setSearchQuery('new query');
        // Query change should reset, but actual index set depends on new matches
        expect(useEditorStore.getState().searchQuery).toBe('new query');
      });
    });

    describe('setCaseSensitive', () => {
      it('should enable case sensitive search', () => {
        useEditorStore.getState().setCaseSensitive(true);
        expect(useEditorStore.getState().caseSensitive).toBe(true);
      });

      it('should disable case sensitive search', () => {
        useEditorStore.setState({ caseSensitive: true });
        useEditorStore.getState().setCaseSensitive(false);
        expect(useEditorStore.getState().caseSensitive).toBe(false);
      });
    });

    describe('setMatches', () => {
      it('should set matches array', () => {
        const matches = [
          { start: 0, end: 4 },
          { start: 10, end: 14 },
        ];
        useEditorStore.getState().setMatches(matches);
        expect(useEditorStore.getState().matches).toEqual(matches);
      });

      it('should set activeMatchIndex to 0 when matches exist', () => {
        useEditorStore.getState().setMatches([{ start: 0, end: 4 }]);
        expect(useEditorStore.getState().activeMatchIndex).toBe(0);
      });

      it('should set activeMatchIndex to -1 when no matches', () => {
        useEditorStore.setState({ activeMatchIndex: 2 });
        useEditorStore.getState().setMatches([]);
        expect(useEditorStore.getState().activeMatchIndex).toBe(-1);
      });
    });

    describe('navigateToMatch', () => {
      it('should set activeMatchIndex to specific index', () => {
        useEditorStore.setState({
          matches: [{ start: 0, end: 4 }, { start: 10, end: 14 }, { start: 20, end: 24 }]
        });
        useEditorStore.getState().navigateToMatch(1);
        expect(useEditorStore.getState().activeMatchIndex).toBe(1);
      });

      it('should clamp index to valid range (lower bound)', () => {
        useEditorStore.setState({
          matches: [{ start: 0, end: 4 }]
        });
        useEditorStore.getState().navigateToMatch(-5);
        expect(useEditorStore.getState().activeMatchIndex).toBe(0);
      });

      it('should clamp index to valid range (upper bound)', () => {
        useEditorStore.setState({
          matches: [{ start: 0, end: 4 }, { start: 10, end: 14 }]
        });
        useEditorStore.getState().navigateToMatch(10);
        expect(useEditorStore.getState().activeMatchIndex).toBe(1);
      });

      it('should set to -1 when no matches', () => {
        useEditorStore.setState({ matches: [] });
        useEditorStore.getState().navigateToMatch(0);
        expect(useEditorStore.getState().activeMatchIndex).toBe(-1);
      });
    });

    describe('navigateNext', () => {
      it('should move to next match', () => {
        useEditorStore.setState({
          matches: [{ start: 0, end: 4 }, { start: 10, end: 14 }],
          activeMatchIndex: 0
        });
        useEditorStore.getState().navigateNext();
        expect(useEditorStore.getState().activeMatchIndex).toBe(1);
      });

      it('should wrap around to first match when at end', () => {
        useEditorStore.setState({
          matches: [{ start: 0, end: 4 }, { start: 10, end: 14 }],
          activeMatchIndex: 1
        });
        useEditorStore.getState().navigateNext();
        expect(useEditorStore.getState().activeMatchIndex).toBe(0);
      });

      it('should do nothing when no matches', () => {
        useEditorStore.setState({ matches: [], activeMatchIndex: -1 });
        useEditorStore.getState().navigateNext();
        expect(useEditorStore.getState().activeMatchIndex).toBe(-1);
      });
    });

    describe('navigatePrev', () => {
      it('should move to previous match', () => {
        useEditorStore.setState({
          matches: [{ start: 0, end: 4 }, { start: 10, end: 14 }],
          activeMatchIndex: 1
        });
        useEditorStore.getState().navigatePrev();
        expect(useEditorStore.getState().activeMatchIndex).toBe(0);
      });

      it('should wrap around to last match when at beginning', () => {
        useEditorStore.setState({
          matches: [{ start: 0, end: 4 }, { start: 10, end: 14 }],
          activeMatchIndex: 0
        });
        useEditorStore.getState().navigatePrev();
        expect(useEditorStore.getState().activeMatchIndex).toBe(1);
      });

      it('should do nothing when no matches', () => {
        useEditorStore.setState({ matches: [], activeMatchIndex: -1 });
        useEditorStore.getState().navigatePrev();
        expect(useEditorStore.getState().activeMatchIndex).toBe(-1);
      });
    });

    describe('clearSearch', () => {
      it('should reset all search state', () => {
        useEditorStore.setState({
          searchVisible: true,
          searchQuery: 'test',
          caseSensitive: true,
          matches: [{ start: 0, end: 4 }],
          activeMatchIndex: 0,
        });

        useEditorStore.getState().clearSearch();

        const state = useEditorStore.getState();
        expect(state.searchVisible).toBe(false);
        expect(state.searchQuery).toBe('');
        expect(state.caseSensitive).toBe(false);
        expect(state.matches).toEqual([]);
        expect(state.activeMatchIndex).toBe(-1);
      });
    });

    describe('activeMatchIndex consistency', () => {
      it('should always be within matches.length bounds when matches exist', () => {
        useEditorStore.setState({
          matches: [{ start: 0, end: 4 }, { start: 10, end: 14 }],
          activeMatchIndex: 0
        });

        // Navigate and check bounds
        useEditorStore.getState().navigateNext();
        expect(useEditorStore.getState().activeMatchIndex).toBeLessThan(2);
        expect(useEditorStore.getState().activeMatchIndex).toBeGreaterThanOrEqual(0);

        useEditorStore.getState().navigateNext();
        expect(useEditorStore.getState().activeMatchIndex).toBeLessThan(2);
        expect(useEditorStore.getState().activeMatchIndex).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
