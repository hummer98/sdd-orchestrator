/**
 * Editor Store
 * Manages editor state including dirty tracking and search functionality
 * Requirements: 7.1-7.7, 9.1-9.4, artifact-editor-search 2.1-2.5, 3.1-3.5, 5.1-5.3
 * Bug fix: search-scroll-to-match
 */

import { create } from 'zustand';

/** Spec artifact types */
type SpecArtifactType = 'requirements' | 'design' | 'tasks' | 'research';
/** Bug artifact types */
type BugArtifactType = 'report' | 'analysis' | 'fix' | 'verification';
/** Dynamic artifact types for document review and inspection files */
type DynamicArtifactType =
  | `document-review-${number}`
  | `document-review-${number}-reply`
  | `inspection-${number}`;
/** All artifact types */
export type ArtifactType = SpecArtifactType | BugArtifactType | DynamicArtifactType;

/** Search match position */
export interface SearchMatch {
  start: number;
  end: number;
}

interface EditorState {
  activeTab: ArtifactType;
  content: string;
  originalContent: string;
  isDirty: boolean;
  isSaving: boolean;
  mode: 'edit' | 'preview';
  currentPath: string | null;
  // Bug fix: worktree-artifact-save - Store entityType for writeArtifact
  currentEntityType: 'spec' | 'bug';
  error: string | null;
  // Search state
  searchVisible: boolean;
  searchQuery: string;
  caseSensitive: boolean;
  matches: SearchMatch[];
  activeMatchIndex: number;
}

interface EditorActions {
  setActiveTab: (tab: ArtifactType) => void;
  setContent: (content: string) => void;
  setMode: (mode: EditorState['mode']) => void;
  save: () => Promise<void>;
  discardChanges: () => void;
  // bug-artifact-content-not-displayed: Add entityType to support both specs and bugs
  loadArtifact: (name: string, artifact: ArtifactType, entityType?: 'spec' | 'bug') => Promise<void>;
  clearEditor: () => void;
  // Search actions
  setSearchVisible: (visible: boolean) => void;
  setSearchQuery: (query: string) => void;
  setCaseSensitive: (caseSensitive: boolean) => void;
  setMatches: (matches: SearchMatch[]) => void;
  navigateToMatch: (index: number) => void;
  navigateNext: () => void;
  navigatePrev: () => void;
  clearSearch: () => void;
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
  // Bug fix: worktree-artifact-save - Store entityType for writeArtifact
  currentEntityType: 'spec',
  error: null,
  // Search initial state
  searchVisible: false,
  searchQuery: '',
  caseSensitive: false,
  matches: [],
  activeMatchIndex: -1,

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
    const { content, currentPath, currentEntityType, isDirty, activeTab } = get();

    if (!currentPath || !isDirty) {
      return;
    }

    set({ isSaving: true, error: null });

    try {
      // Bug fix: worktree-artifact-save
      // Parse currentPath (format: "name:artifact") to extract name
      // Use writeArtifact with path resolution instead of writeFile
      const [name] = currentPath.split(':');
      const filename = `${activeTab}.md`;
      await window.electronAPI.writeArtifact(name, filename, content, currentEntityType);
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

  // spec-path-ssot-refactor: Changed from specPath to specName
  // bug-artifact-content-not-displayed: Add entityType to support both specs and bugs
  loadArtifact: async (name: string, artifact: ArtifactType, entityType: 'spec' | 'bug' = 'spec') => {
    // Handle both base artifacts and dynamic document review files
    // For currentPath tracking, we now use name:artifact format
    const artifactKey = `${name}:${artifact}`;

    // Check if switching to a different file (not initial load or same file)
    const { currentPath } = get();
    const isNewFile = currentPath !== null && currentPath !== artifactKey;

    // Clear content and search state when switching to a different file
    // Bug fix: spec-item-flash-wrong-content - clear content immediately to prevent showing old data
    if (isNewFile) {
      set({
        activeTab: artifact,
        currentPath: artifactKey,
        // Bug fix: worktree-artifact-save - Store entityType for writeArtifact
        currentEntityType: entityType,
        content: '',
        originalContent: '',
        isDirty: false,
        error: null,
        // Clear search state
        searchVisible: false,
        searchQuery: '',
        caseSensitive: false,
        matches: [],
        activeMatchIndex: -1,
      });
    } else {
      set({
        activeTab: artifact,
        currentPath: artifactKey,
        // Bug fix: worktree-artifact-save - Store entityType for writeArtifact
        currentEntityType: entityType,
        error: null,
      });
    }

    try {
      // spec-path-ssot-refactor: Use (name, filename) instead of full path
      // bug-artifact-content-not-displayed: Pass entityType to use correct path resolver
      const content = await window.electronAPI.readArtifact(name, `${artifact}.md`, entityType);
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
      // Bug fix: worktree-artifact-save - Reset entityType
      currentEntityType: 'spec',
      error: null,
    });
  },

  // Search actions
  setSearchVisible: (visible: boolean) => {
    set({ searchVisible: visible });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setCaseSensitive: (caseSensitive: boolean) => {
    set({ caseSensitive });
  },

  setMatches: (matches: SearchMatch[]) => {
    set({
      matches,
      activeMatchIndex: matches.length > 0 ? 0 : -1,
    });
  },

  navigateToMatch: (index: number) => {
    const { matches } = get();
    if (matches.length === 0) {
      set({ activeMatchIndex: -1 });
      return;
    }
    // Clamp index to valid range
    const clampedIndex = Math.max(0, Math.min(index, matches.length - 1));
    set({ activeMatchIndex: clampedIndex });
  },

  navigateNext: () => {
    const { matches, activeMatchIndex } = get();
    if (matches.length === 0) {
      return;
    }
    const nextIndex = (activeMatchIndex + 1) % matches.length;
    set({ activeMatchIndex: nextIndex });
  },

  navigatePrev: () => {
    const { matches, activeMatchIndex } = get();
    if (matches.length === 0) {
      return;
    }
    const prevIndex = activeMatchIndex <= 0 ? matches.length - 1 : activeMatchIndex - 1;
    set({ activeMatchIndex: prevIndex });
  },

  clearSearch: () => {
    set({
      searchVisible: false,
      searchQuery: '',
      caseSensitive: false,
      matches: [],
      activeMatchIndex: -1,
    });
  },
}));
