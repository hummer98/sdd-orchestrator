/**
 * ProjectFileList Component
 *
 * project-config-editor Task 3.1: Project file list display
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.2
 * project-docs-viewer Task 6.1: Docs セクション追加
 *
 * Features:
 * - Three sections: CLAUDE.md, Steering Files, Docs (project-docs-viewer)
 * - Selected file highlighting
 * - Empty state handling
 */

import { FileText, FolderOpen } from 'lucide-react';
import { clsx } from 'clsx';
import type { ProjectFilesState, ProjectFileInfo } from '@shared/api/types';
import { DocsTreeSection } from '@shared/components/project';

export interface ProjectFileListProps {
  /** Project files state */
  files: ProjectFilesState;
  /** Currently selected file path (absolute) */
  selectedFilePath: string | null;
  /** Callback when a file is selected */
  onSelectFile: (filePath: string, fileName: string) => void;
  /** Project root path */
  projectPath: string;
}

/**
 * File list item component
 */
interface FileListItemProps {
  file: ProjectFileInfo;
  isSelected: boolean;
  onClick: () => void;
}

function FileListItem({ file, isSelected, onClick }: FileListItemProps) {
  return (
    <button
      onClick={onClick}
      data-selected={isSelected}
      className={clsx(
        'w-full flex items-center gap-2 px-3 py-2 text-left text-sm rounded-md',
        'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
        isSelected
          ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
      )}
    >
      <FileText className="w-4 h-4 shrink-0" />
      <span className="truncate">{file.fileName}</span>
    </button>
  );
}

/**
 * Section header component
 */
interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
}

function SectionHeader({ title, icon }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
      {icon}
      {title}
    </div>
  );
}

/**
 * ProjectFileList - Displays project configuration files
 */
export function ProjectFileList({
  files,
  selectedFilePath,
  onSelectFile,
  projectPath,
}: ProjectFileListProps) {
  const { claudeMd, steeringFiles, isLoading, error } = files;

  const getAbsolutePath = (relativePath: string) => {
    // Browser-compatible path join (avoid Node.js 'path' module in renderer)
    const base = projectPath.endsWith('/') ? projectPath.slice(0, -1) : projectPath;
    const rel = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
    return `${base}/${rel}`;
  };

  const handleFileClick = (file: ProjectFileInfo) => {
    const absolutePath = getAbsolutePath(file.relativePath);
    onSelectFile(absolutePath, file.fileName);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">読み込み中...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <span className="text-sm text-red-500 dark:text-red-400">{error}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto" data-testid="project-file-list">
      {/* CLAUDE.md Section */}
      {claudeMd && (
        <div className="mb-4">
          <SectionHeader title="CLAUDE.md" icon={<FileText className="w-3 h-3" />} />
          <div className="px-1">
            <FileListItem
              file={claudeMd}
              isSelected={selectedFilePath === getAbsolutePath(claudeMd.relativePath)}
              onClick={() => handleFileClick(claudeMd)}
            />
          </div>
        </div>
      )}

      {/* Steering Files Section */}
      <div className="mb-4">
        <SectionHeader title="Steering Files" icon={<FolderOpen className="w-3 h-3" />} />
        <div className="px-1">
          {steeringFiles.length > 0 ? (
            steeringFiles.map((file) => (
              <FileListItem
                key={file.relativePath}
                file={file}
                isSelected={selectedFilePath === getAbsolutePath(file.relativePath)}
                onClick={() => handleFileClick(file)}
              />
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500 italic">
              ファイルなし
            </div>
          )}
        </div>
      </div>

      {/* Docs Section - project-docs-viewer Task 6.1 */}
      {/* Requirement 5.1: Section order is CLAUDE.md -> Steering Files -> Docs */}
      <DocsTreeSection
        docsTree={files.docsTree}
        projectPath={projectPath}
        selectedFilePath={selectedFilePath}
        onSelectFile={onSelectFile}
      />
    </div>
  );
}
