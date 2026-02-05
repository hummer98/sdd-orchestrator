/**
 * ProjectView Component
 *
 * project-config-editor Task 6.1: Remote UIファイル一覧コンポーネント
 * Requirements: 6.2 (Mobileファイル一覧)
 *
 * Features:
 * - CLAUDE.md / Steering Filesの2グループ表示
 * - ファイル選択時にnavigationStackでProjectDetailPageへ遷移
 * - 既存SpecsViewパターンに準拠
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FileText, FolderOpen } from 'lucide-react';
import { clsx } from 'clsx';
import { Spinner } from '@shared/components/ui/Spinner';
import type { ApiClient, ProjectFileInfo, ProjectFilesState } from '@shared/api/types';

// =============================================================================
// Types
// =============================================================================

export interface ProjectViewProps {
  /** API client instance */
  apiClient: ApiClient;
  /** Currently selected file path (for highlight) */
  selectedFilePath?: string | null;
  /** Called when a file is selected */
  onSelectFile: (file: ProjectFileInfo) => void;
  /** Test ID for E2E testing */
  testId?: string;
}

// =============================================================================
// Component
// =============================================================================

export function ProjectView({
  apiClient,
  selectedFilePath,
  onSelectFile,
  testId = 'project-view',
}: ProjectViewProps): React.ReactElement {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [files, setFiles] = useState<ProjectFilesState>({
    claudeMd: null,
    steeringFiles: [],
    docsTree: [], // project-docs-viewer Task 1.1
    isLoading: true,
    error: null,
  });

  // ---------------------------------------------------------------------------
  // Load Files
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let isMounted = true;

    async function loadFiles() {
      if (!apiClient.listProjectFiles) {
        if (isMounted) {
          setFiles({
            claudeMd: null,
            steeringFiles: [],
            docsTree: [], // project-docs-viewer Task 1.1
            isLoading: false,
            error: 'listProjectFiles not available',
          });
        }
        return;
      }

      const result = await apiClient.listProjectFiles();

      if (!isMounted) return;

      if (result.ok) {
        setFiles({
          ...result.value,
          isLoading: false,
          error: null,
        });
      } else {
        setFiles({
          claudeMd: null,
          steeringFiles: [],
          docsTree: [], // project-docs-viewer Task 1.1
          isLoading: false,
          error: result.error.message,
        });
      }
    }

    loadFiles();

    return () => {
      isMounted = false;
    };
  }, [apiClient]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSelectFile = useCallback(
    (file: ProjectFileInfo) => {
      onSelectFile(file);
    },
    [onSelectFile]
  );

  // ---------------------------------------------------------------------------
  // Render Loading State
  // ---------------------------------------------------------------------------

  if (files.isLoading) {
    return (
      <div
        data-testid="project-view-loading"
        className="flex items-center justify-center h-full p-8"
      >
        <Spinner size="lg" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render Error State
  // ---------------------------------------------------------------------------

  if (files.error) {
    return (
      <div
        data-testid="project-view-error"
        className="flex flex-col items-center justify-center h-full p-8 text-center"
      >
        <div className="text-red-500 mb-2">
          <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
        </div>
        <p className="text-red-600 dark:text-red-400">{files.error}</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render Empty State
  // ---------------------------------------------------------------------------

  const hasFiles = files.claudeMd || files.steeringFiles.length > 0;

  if (!hasFiles) {
    return (
      <div
        data-testid="project-view-empty"
        className="flex flex-col items-center justify-center h-full p-8 text-center"
      >
        <FolderOpen className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
          プロジェクトファイルがありません
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          CLAUDE.mdまたはSteeringファイルを追加してください
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render File List
  // ---------------------------------------------------------------------------

  return (
    <div data-testid={testId} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {/* CLAUDE.md Section */}
        {files.claudeMd && (
          <div data-testid="project-files-claude-section" className="mb-4">
            <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                CLAUDE.md
              </h3>
            </div>
            <FileListItem
              file={files.claudeMd}
              isSelected={selectedFilePath === files.claudeMd.relativePath}
              onSelect={handleSelectFile}
            />
          </div>
        )}

        {/* Steering Files Section */}
        <div data-testid="project-files-steering-section">
          <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Steering Files
            </h3>
          </div>
          {files.steeringFiles.length > 0 ? (
            files.steeringFiles.map((file) => (
              <FileListItem
                key={file.relativePath}
                file={file}
                isSelected={selectedFilePath === file.relativePath}
                onSelect={handleSelectFile}
              />
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              ファイルなし
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

interface FileListItemProps {
  file: ProjectFileInfo;
  isSelected: boolean;
  onSelect: (file: ProjectFileInfo) => void;
}

function FileListItem({
  file,
  isSelected,
  onSelect,
}: FileListItemProps): React.ReactElement {
  const handleClick = useCallback(() => {
    onSelect(file);
  }, [file, onSelect]);

  return (
    <button
      data-testid={`project-file-${file.fileName}`}
      data-selected={isSelected}
      onClick={handleClick}
      className={clsx(
        'w-full px-4 py-3 flex items-center gap-3 text-left transition-colors',
        'border-b border-gray-100 dark:border-gray-800',
        isSelected
          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300'
      )}
    >
      <FileText
        className={clsx(
          'w-5 h-5 shrink-0',
          isSelected ? 'text-blue-500' : 'text-gray-400'
        )}
      />
      <span className="text-sm font-medium truncate">{file.fileName}</span>
    </button>
  );
}

// =============================================================================
// Exports
// =============================================================================

export default ProjectView;
