/**
 * projectEditorStore
 *
 * project-config-editor Task 1.2: Projectファイル編集状態を管理するZustand store
 * Requirements: 4.1, 4.4, 5.2
 *
 * Responsibilities:
 * - 編集中ファイルパス、コンテンツ、dirty状態の管理
 * - 外部変更通知状態の管理
 * - エディタモード（edit/preview）管理
 *
 * Design Decision: DD-001 in design.md
 * - 専用のprojectEditorStoreを新規作成（editorStoreはSpec/Bug用に最適化されており概念が異なる）
 *
 * Design Decision: DD-006 in design.md
 * - shared/stores/に配置（Remote UIでも同一のエディタ状態管理が必要）
 */

import { create } from 'zustand';
import type { ApiClient } from '../api/types';

// =============================================================================
// Types
// =============================================================================

/**
 * Extended ApiClient interface for project file operations
 * These methods will be added to ApiClient in Task 5.1/5.2
 */
interface ProjectFileApiClient extends ApiClient {
  readProjectFile?: (filePath: string) => Promise<{ ok: true; value: string } | { ok: false; error: { type: string; message: string } }>;
  writeProjectFile?: (filePath: string, content: string) => Promise<{ ok: true; value: void } | { ok: false; error: { type: string; message: string } }>;
}

export interface ProjectEditorState {
  /** Current file path (absolute) */
  currentFilePath: string | null;
  /** Current file name (display) */
  currentFileName: string | null;
  /** Current editor content */
  content: string;
  /** Original content (for dirty detection) */
  originalContent: string;
  /** Whether content has unsaved changes */
  isDirty: boolean;
  /** Whether save operation is in progress */
  isSaving: boolean;
  /** Error message (if any) */
  error: string | null;
  /** Editor mode: edit or preview */
  mode: 'edit' | 'preview';
  /** Whether external change was detected for current file */
  externalChangeDetected: boolean;
}

export interface ProjectEditorActions {
  /**
   * Load a file into the editor
   * @param apiClient - API client for file operations
   * @param filePath - Absolute path to file
   * @param fileName - Display file name
   */
  loadFile: (apiClient: ProjectFileApiClient, filePath: string, fileName: string) => Promise<void>;

  /**
   * Update editor content
   * Also updates isDirty based on comparison with originalContent
   * @param content - New content
   */
  setContent: (content: string) => void;

  /**
   * Save current content to file
   * @param apiClient - API client for file operations
   */
  save: (apiClient: ProjectFileApiClient) => Promise<void>;

  /**
   * Set editor mode
   * @param mode - 'edit' or 'preview'
   */
  setMode: (mode: 'edit' | 'preview') => void;

  /**
   * Handle external file change notification
   * @param apiClient - API client for file operations
   * @param reload - Whether to reload file (true) or ignore change (false)
   */
  handleExternalChange: (apiClient: ProjectFileApiClient, reload: boolean) => Promise<void>;

  /**
   * Clear editor state (reset to initial)
   */
  clearEditor: () => void;

  /**
   * Set external change detected flag
   * Called when file watcher detects changes
   * @param detected - Whether external change was detected
   */
  setExternalChangeDetected: (detected: boolean) => void;
}

export type ProjectEditorStore = ProjectEditorState & ProjectEditorActions;

// =============================================================================
// Initial State
// =============================================================================

const initialState: ProjectEditorState = {
  currentFilePath: null,
  currentFileName: null,
  content: '',
  originalContent: '',
  isDirty: false,
  isSaving: false,
  error: null,
  // project-editor-dark-mode: Requirement 2.2 - デフォルト表示モードをpreviewに変更
  mode: 'preview',
  externalChangeDetected: false,
};

// =============================================================================
// Store
// =============================================================================

export const useProjectEditorStore = create<ProjectEditorStore>((set, get) => ({
  // Initial state
  ...initialState,

  // Actions
  loadFile: async (apiClient: ProjectFileApiClient, filePath: string, fileName: string) => {
    // Check if readProjectFile is available
    if (!apiClient.readProjectFile) {
      set({
        error: 'readProjectFile not available on ApiClient',
        currentFilePath: filePath,
        currentFileName: fileName,
        content: '',
        originalContent: '',
        isDirty: false,
        externalChangeDetected: false,
      });
      return;
    }

    set({ error: null });

    const result = await apiClient.readProjectFile(filePath);

    if (result.ok) {
      set({
        currentFilePath: filePath,
        currentFileName: fileName,
        content: result.value,
        originalContent: result.value,
        isDirty: false,
        externalChangeDetected: false,
        error: null,
      });
    } else {
      // project-docs-viewer Task 8.1: Clear selection when file doesn't exist
      // Requirement 4.3: If selected file no longer exists, clear selection
      set({
        currentFilePath: null,
        currentFileName: null,
        content: '',
        originalContent: '',
        isDirty: false,
        externalChangeDetected: false,
        error: result.error.message,
      });
    }
  },

  setContent: (content: string) => {
    const { originalContent } = get();
    set({
      content,
      isDirty: content !== originalContent,
    });
  },

  save: async (apiClient: ProjectFileApiClient) => {
    const { currentFilePath, content } = get();

    // Cannot save without a loaded file
    if (!currentFilePath) {
      return;
    }

    // Check if writeProjectFile is available
    if (!apiClient.writeProjectFile) {
      set({ error: 'writeProjectFile not available on ApiClient' });
      return;
    }

    set({ isSaving: true, error: null });

    const result = await apiClient.writeProjectFile(currentFilePath, content);

    if (result.ok) {
      set({
        isSaving: false,
        originalContent: content,
        isDirty: false,
      });
    } else {
      set({
        isSaving: false,
        error: result.error.message,
      });
    }
  },

  setMode: (mode: 'edit' | 'preview') => {
    set({ mode });
  },

  handleExternalChange: async (apiClient: ProjectFileApiClient, reload: boolean) => {
    if (reload) {
      const { currentFilePath, currentFileName } = get();
      if (currentFilePath && currentFileName) {
        await get().loadFile(apiClient, currentFilePath, currentFileName);
      }
    } else {
      // Just clear the external change flag, keep current content
      set({ externalChangeDetected: false });
    }
  },

  clearEditor: () => {
    set(initialState);
  },

  setExternalChangeDetected: (detected: boolean) => {
    set({ externalChangeDetected: detected });
  },
}));

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Reset store to initial state (for testing)
 */
export function resetProjectEditorStore(): void {
  useProjectEditorStore.setState(initialState);
}

/**
 * Get current store state (for testing)
 */
export function getProjectEditorStore(): ProjectEditorStore {
  return useProjectEditorStore.getState();
}
