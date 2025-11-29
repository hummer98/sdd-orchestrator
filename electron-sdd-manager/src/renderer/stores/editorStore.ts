/**
 * Editor Store
 * Manages editor state including dirty tracking
 * Requirements: 7.1-7.7, 9.1-9.4
 */

import { create } from 'zustand';

type ArtifactType = 'requirements' | 'design' | 'tasks' | 'research';

interface EditorState {
  activeTab: ArtifactType;
  content: string;
  originalContent: string;
  isDirty: boolean;
  isSaving: boolean;
  mode: 'edit' | 'preview';
  currentPath: string | null;
  error: string | null;
}

interface EditorActions {
  setActiveTab: (tab: ArtifactType) => void;
  setContent: (content: string) => void;
  setMode: (mode: EditorState['mode']) => void;
  save: () => Promise<void>;
  discardChanges: () => void;
  loadArtifact: (specPath: string, artifact: ArtifactType) => Promise<void>;
  clearEditor: () => void;
}

type EditorStore = EditorState & EditorActions;

export const useEditorStore = create<EditorStore>((set, get) => ({
  // Initial state
  activeTab: 'requirements',
  content: '',
  originalContent: '',
  isDirty: false,
  isSaving: false,
  mode: 'edit',
  currentPath: null,
  error: null,

  // Actions
  setActiveTab: (tab: ArtifactType) => {
    set({ activeTab: tab });
  },

  setContent: (content: string) => {
    const { originalContent } = get();
    set({
      content,
      isDirty: content !== originalContent,
    });
  },

  setMode: (mode: EditorState['mode']) => {
    set({ mode });
  },

  save: async () => {
    const { content, currentPath, isDirty } = get();

    if (!currentPath || !isDirty) {
      return;
    }

    set({ isSaving: true, error: null });

    try {
      await window.electronAPI.writeFile(currentPath, content);
      set({
        originalContent: content,
        isDirty: false,
        isSaving: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '保存に失敗しました',
        isSaving: false,
      });
    }
  },

  discardChanges: () => {
    const { originalContent } = get();
    set({
      content: originalContent,
      isDirty: false,
    });
  },

  loadArtifact: async (specPath: string, artifact: ArtifactType) => {
    const artifactPath = `${specPath}/${artifact}.md`;

    set({
      activeTab: artifact,
      currentPath: artifactPath,
      error: null,
    });

    try {
      const content = await window.electronAPI.readArtifact(artifactPath);
      set({
        content,
        originalContent: content,
        isDirty: false,
      });
    } catch (error) {
      // File doesn't exist - set empty content
      set({
        content: '',
        originalContent: '',
        isDirty: false,
      });
    }
  },

  clearEditor: () => {
    set({
      content: '',
      originalContent: '',
      isDirty: false,
      currentPath: null,
      error: null,
    });
  },
}));
