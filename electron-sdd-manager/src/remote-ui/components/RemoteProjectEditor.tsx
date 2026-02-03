/**
 * RemoteProjectEditor Component
 *
 * project-config-editor Task 6.2: Remote UIエディタコンポーネント
 * Requirements: 6.3 (Mobile詳細ページ)
 *
 * Features:
 * - WebSocketApiClient経由でファイル読み書き
 * - MDEditorを使用したMarkdown編集機能
 * - 保存ショートカット（Cmd+S / Ctrl+S）と通知
 * - 未保存インジケーター
 */

import React, { useEffect, useCallback } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Save, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { useProjectEditorStore } from '@shared/stores/projectEditorStore';
import type { ApiClient, ProjectFileInfo } from '@shared/api/types';

// =============================================================================
// Types
// =============================================================================

export interface RemoteProjectEditorProps {
  /** File to edit */
  file: ProjectFileInfo;
  /** API client instance */
  apiClient: ApiClient;
  /** Callback when save succeeds */
  onSaveSuccess?: () => void;
  /** Callback when save fails */
  onSaveError?: (error: string) => void;
  /** Test ID for E2E testing */
  testId?: string;
}

// =============================================================================
// Component
// =============================================================================

export function RemoteProjectEditor({
  file,
  apiClient,
  onSaveSuccess,
  onSaveError,
  testId = 'remote-project-editor',
}: RemoteProjectEditorProps): React.ReactElement {
  // ---------------------------------------------------------------------------
  // Store
  // ---------------------------------------------------------------------------

  const {
    content,
    isDirty,
    isSaving,
    error,
    loadFile,
    setContent,
    save,
  } = useProjectEditorStore();

  // ---------------------------------------------------------------------------
  // Load File on Mount or File Change
  // ---------------------------------------------------------------------------

  useEffect(() => {
    loadFile(apiClient, file.relativePath, file.fileName);
  }, [apiClient, file.relativePath, file.fileName, loadFile]);

  // ---------------------------------------------------------------------------
  // Keyboard Shortcut Handler
  // ---------------------------------------------------------------------------

  const handleSave = useCallback(async () => {
    if (!isDirty) return;

    await save(apiClient);

    // Check for error after save
    const currentError = useProjectEditorStore.getState().error;
    if (currentError) {
      onSaveError?.(currentError);
    } else {
      onSaveSuccess?.();
    }
  }, [apiClient, isDirty, save, onSaveSuccess, onSaveError]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+S (Mac) or Ctrl+S (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSave]);

  // ---------------------------------------------------------------------------
  // Content Change Handler
  // ---------------------------------------------------------------------------

  const handleContentChange = useCallback(
    (value?: string) => {
      setContent(value ?? '');
    },
    [setContent]
  );

  // ---------------------------------------------------------------------------
  // Render Error State
  // ---------------------------------------------------------------------------

  if (error) {
    return (
      <div
        data-testid="project-editor-error"
        className="flex flex-col items-center justify-center h-full p-8 text-center"
      >
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render Editor
  // ---------------------------------------------------------------------------

  return (
    <div
      data-testid={testId}
      className="flex flex-col h-full bg-white dark:bg-gray-900"
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {file.fileName}
          </span>
          {isDirty && (
            <span
              data-testid="dirty-indicator"
              className="w-2 h-2 rounded-full bg-orange-500"
              title="未保存の変更があります"
            />
          )}
        </div>
        <button
          data-testid="save-button"
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            isDirty && !isSaving
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
          )}
        >
          <Save className="w-4 h-4" />
          {isSaving ? '保存中...' : '保存'}
        </button>
      </header>

      {/* Editor */}
      <div className="flex-1 overflow-hidden" data-color-mode="auto">
        <MDEditor
          value={content}
          onChange={handleContentChange}
          height="100%"
          preview="edit"
          hideToolbar={false}
          enableScroll={true}
          visibleDragbar={false}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Exports
// =============================================================================

export default RemoteProjectEditor;
