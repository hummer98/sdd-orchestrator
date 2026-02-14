/**
 * ProjectFileEditor Component
 *
 * project-config-editor Task 3.2: Project file markdown editor
 * project-docs-viewer Task 7.1: PDF/HTML ビューア切替追加
 * Requirements: 3.4, 4.1, 4.2, 4.3, 4.4, 6.1, 6.2, 6.3
 *
 * Features:
 * - Markdown editing with MDEditor (.md files)
 * - PDF viewing with PdfViewer (.pdf files) - project-docs-viewer
 * - HTML preview with HtmlViewer (.html files) - project-docs-viewer
 * - Cmd+S/Ctrl+S save shortcut (md only)
 * - Dirty indicator (md only)
 * - Edit/Preview mode toggle (md only)
 */

import { useEffect, useCallback, useMemo } from 'react';
import { Save, Eye, Edit, Circle, Loader2 } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import { clsx } from 'clsx';
import { useShallow } from 'zustand/react/shallow';
import { useProjectEditorStore } from '@shared/stores/projectEditorStore';
import { useNotificationStore } from '@shared/stores/notificationStore';
import { MermaidCodeRenderer } from '@shared/components/markdown';
import { PdfViewer, HtmlViewer } from '@shared/components/project';

// =============================================================================
// Types
// =============================================================================

type FileType = 'md' | 'pdf' | 'html' | 'unknown';

/**
 * Detect file type from file path
 * project-docs-viewer Task 7.1
 */
function detectFileType(filePath: string | null): FileType {
  if (!filePath) return 'unknown';

  const extension = filePath.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'md':
      return 'md';
    case 'pdf':
      return 'pdf';
    case 'html':
    case 'htm':
      return 'html';
    default:
      return 'unknown';
  }
}

export interface ProjectFileEditorProps {
  /** Callback to handle save (receives apiClient internally) */
  onSave: () => Promise<void>;
}

/**
 * ProjectFileEditor - Editor for project configuration files
 * Supports .md (editable), .pdf (view only), .html (view only)
 */
export function ProjectFileEditor({ onSave }: ProjectFileEditorProps) {
  // zustand-selector-optimization: useShallow for state + action fields
  const {
    currentFilePath,
    currentFileName,
    content,
    isDirty,
    isSaving,
    mode,
    error,
    setContent,
    setMode,
  } = useProjectEditorStore(
    useShallow(s => ({
      currentFilePath: s.currentFilePath,
      currentFileName: s.currentFileName,
      content: s.content,
      isDirty: s.isDirty,
      isSaving: s.isSaving,
      mode: s.mode,
      error: s.error,
      setContent: s.setContent,
      setMode: s.setMode,
    }))
  );

  // zustand-selector-optimization: individual selector (action-only)
  const showNotification = useNotificationStore(s => s.showNotification);

  // project-docs-viewer Task 7.1: Detect file type for viewer switching
  const fileType = useMemo(() => detectFileType(currentFilePath), [currentFilePath]);

  // Handle save with notification
  const handleSave = useCallback(async () => {
    if (!isDirty || isSaving) return;

    try {
      await onSave();
      showNotification({
        type: 'success',
        message: '保存しました',
      });
    } catch (err) {
      showNotification({
        type: 'error',
        message: `保存に失敗しました: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    }
  }, [isDirty, isSaving, onSave, showNotification]);

  // Keyboard shortcut for save (Cmd+S / Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // No file loaded - show placeholder
  if (!currentFilePath) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-950">
        <span className="text-gray-400 dark:text-gray-500">
          ファイルを選択してください
        </span>
      </div>
    );
  }

  // project-docs-viewer Task 7.1: PDF Viewer (Requirement 6.2)
  if (fileType === 'pdf') {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-950" data-testid="project-file-editor">
        {/* Simple header for PDF files */}
        <div className="flex items-center px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {currentFileName}
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          <PdfViewer filePath={currentFilePath} />
        </div>
      </div>
    );
  }

  // project-docs-viewer Task 7.1: HTML Viewer (Requirement 6.3)
  if (fileType === 'html') {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-950" data-testid="project-file-editor">
        {/* Simple header for HTML files */}
        <div className="flex items-center px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {currentFileName}
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          <HtmlViewer content={content} />
        </div>
      </div>
    );
  }

  // Default: Markdown Editor (Requirement 6.1)
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950" data-testid="project-file-editor">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {currentFileName}
          </span>
          {isDirty && (
            <Circle
              className="w-2 h-2 fill-orange-500 text-orange-500"
              data-testid="dirty-indicator"
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* project-editor-dark-mode: Requirement 3.1, 3.3 - ボタングループスタイル（ArtifactEditorと同一） */}
          {/* Mode toggle - Button group style */}
          <div className="flex items-center" data-testid="mode-toggle-group">
            <button
              onClick={() => setMode('edit')}
              className={clsx(
                'px-3 py-1 text-sm rounded-l-md border',
                mode === 'edit'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600'
              )}
              aria-label="編集"
              data-testid="edit-mode-button"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMode('preview')}
              className={clsx(
                'px-3 py-1 text-sm rounded-r-md border-t border-r border-b',
                mode === 'preview'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600'
              )}
              aria-label="プレビュー"
              data-testid="preview-mode-button"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md',
              'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
              isDirty && !isSaving
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            )}
            aria-label="保存"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            保存
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Editor */}
      {/* project-editor-dark-mode: Requirement 1.1 - カラーモードをdarkに固定 */}
      <div className="flex-1 overflow-hidden" data-color-mode="dark">
        <MDEditor
          value={content}
          onChange={(value) => setContent(value || '')}
          preview={mode}
          height="100%"
          hideToolbar={mode === 'preview'}
          previewOptions={{
            components: {
              code: MermaidCodeRenderer,
            },
          }}
        />
      </div>
    </div>
  );
}
