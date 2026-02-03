/**
 * ProjectDetailPage Component
 *
 * project-config-editor Task 6.3: モバイル詳細ページコンポーネント
 * Requirements: 6.3 (Mobile詳細ページ), 6.4 (Mobile戻るボタン)
 *
 * Features:
 * - 戻るボタン付きヘッダー
 * - RemoteProjectEditorをラップ
 * - 既存SpecDetailPageパターンに準拠
 */

import React, { useCallback } from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { RemoteProjectEditor } from './RemoteProjectEditor';
import type { ApiClient, ProjectFileInfo } from '@shared/api/types';

// =============================================================================
// Types
// =============================================================================

export interface ProjectDetailPageProps {
  /** File to edit */
  file: ProjectFileInfo;
  /** API client instance */
  apiClient: ApiClient;
  /** Back button click callback */
  onBack: () => void;
  /** Callback when save succeeds (for toast notification) */
  onSaveSuccess?: () => void;
  /** Callback when save fails (for error notification) */
  onSaveError?: (error: string) => void;
  /** Test ID for E2E testing */
  testId?: string;
}

// =============================================================================
// Component
// =============================================================================

export function ProjectDetailPage({
  file,
  apiClient,
  onBack,
  onSaveSuccess,
  onSaveError,
  testId = 'project-detail-page',
}: ProjectDetailPageProps): React.ReactElement {
  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSaveSuccess = useCallback(() => {
    onSaveSuccess?.();
  }, [onSaveSuccess]);

  const handleSaveError = useCallback(
    (error: string) => {
      onSaveError?.(error);
    },
    [onSaveError]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      data-testid={testId}
      className="flex flex-col h-full bg-white dark:bg-gray-900"
    >
      {/* Header with Back Button (Req 6.4) */}
      <header
        data-testid="project-detail-header"
        className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0"
      >
        <button
          data-testid="project-detail-back-button"
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <FileText className="w-5 h-5 text-blue-500" />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate flex-1">
          {file.fileName}
        </h1>
      </header>

      {/* Main Content Area (Req 6.3) */}
      <div className="flex-1 overflow-hidden">
        <RemoteProjectEditor
          file={file}
          apiClient={apiClient}
          onSaveSuccess={handleSaveSuccess}
          onSaveError={handleSaveError}
          testId="remote-project-editor"
        />
      </div>
    </div>
  );
}

// =============================================================================
// Exports
// =============================================================================

export default ProjectDetailPage;
