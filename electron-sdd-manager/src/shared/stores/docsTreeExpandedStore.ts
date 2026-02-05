/**
 * docsTreeExpandedStore
 *
 * project-docs-viewer Task 2.1: docs/ ツリーの展開状態管理ストア
 * Requirements: 3.1, 3.2, 3.3, 3.4
 *
 * Responsibilities:
 * - フォルダパスをキーとした展開状態（boolean）の管理
 * - セッション中のみ有効（永続化不要）
 * - 初期状態は全フォルダ折りたたみ（空 Map）
 *
 * Design Decision: DD-002 in design.md
 * - 新規ストアを shared/stores/ に配置（Remote UI 対応準備）
 */

import { create } from 'zustand';

// =============================================================================
// Types
// =============================================================================

export interface DocsTreeExpandedState {
  /** フォルダパス -> 展開状態 */
  expandedDirs: Map<string, boolean>;
}

export interface DocsTreeExpandedActions {
  /** フォルダ展開/折りたたみ切替 */
  toggleDir: (dirPath: string) => void;
  /** 全リセット（アプリ再起動相当） */
  reset: () => void;
  /** フォルダが展開されているかチェック */
  isExpanded: (dirPath: string) => boolean;
}

export type DocsTreeExpandedStore = DocsTreeExpandedState & DocsTreeExpandedActions;

// =============================================================================
// Initial State
// =============================================================================

const initialState: DocsTreeExpandedState = {
  expandedDirs: new Map<string, boolean>(),
};

// =============================================================================
// Store
// =============================================================================

export const useDocsTreeExpandedStore = create<DocsTreeExpandedStore>((set, get) => ({
  // Initial state
  ...initialState,

  // Actions
  toggleDir: (dirPath: string) => {
    set((state) => {
      const newMap = new Map(state.expandedDirs);
      const currentValue = newMap.get(dirPath) ?? false;
      newMap.set(dirPath, !currentValue);
      return { expandedDirs: newMap };
    });
  },

  reset: () => {
    set({ expandedDirs: new Map<string, boolean>() });
  },

  isExpanded: (dirPath: string) => {
    return get().expandedDirs.get(dirPath) ?? false;
  },
}));

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Reset store to initial state (for testing)
 */
export function resetDocsTreeExpandedStore(): void {
  useDocsTreeExpandedStore.setState({
    expandedDirs: new Map<string, boolean>(),
  });
}

/**
 * Get current store state (for testing)
 */
export function getDocsTreeExpandedStore(): DocsTreeExpandedStore {
  return useDocsTreeExpandedStore.getState();
}
