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
});
