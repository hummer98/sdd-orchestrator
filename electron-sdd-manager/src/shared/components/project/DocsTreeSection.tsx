/**
 * DocsTreeSection Component
 *
 * project-docs-viewer Task 4.1: docs/ フォルダのツリー表示コンポーネント
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.3, 6.4
 *
 * Features:
 * - ツリーノードの再帰的レンダリング
 * - フォルダ展開/折りたたみ UI
 * - ファイル選択時のコールバック
 * - 拡張子ベースのアイコン表示
 */

import { useCallback } from 'react';
import { FileText, FileCode, File, FolderOpen, Folder, BookOpen } from 'lucide-react';
import { clsx } from 'clsx';
import type { DocsTreeNode, DocsFileExtension } from '@shared/api/types';
import { useDocsTreeExpandedStore } from '@shared/stores/docsTreeExpandedStore';

// =============================================================================
// Constants
// =============================================================================

/** Base indentation padding in pixels */
const BASE_PADDING = 16;
/** Indentation increment per depth level */
const INDENT_INCREMENT = 16;

// =============================================================================
// Types
// =============================================================================

export interface DocsTreeSectionProps {
  /** Tree structure data */
  docsTree: DocsTreeNode[];
  /** Project root path */
  projectPath: string;
  /** Currently selected file path */
  selectedFilePath: string | null;
  /** File selection callback */
  onSelectFile: (filePath: string, fileName: string) => void;
}

// =============================================================================
// Helper Components
// =============================================================================

/**
 * File type icon based on extension
 * Requirement 6.4
 */
function FileTypeIcon({ extension }: { extension?: DocsFileExtension }): React.ReactElement {
  switch (extension) {
    case 'md':
      return <FileText className="w-4 h-4 text-blue-500" data-testid="file-icon-md" />;
    case 'pdf':
      return <File className="w-4 h-4 text-red-500" data-testid="file-icon-pdf" />;
    case 'html':
      return <FileCode className="w-4 h-4 text-orange-500" data-testid="file-icon-html" />;
    default:
      return <File className="w-4 h-4 text-gray-400" data-testid="file-icon-default" />;
  }
}

/**
 * File node component
 */
interface FileNodeProps {
  node: DocsTreeNode;
  depth: number;
  isSelected: boolean;
  projectPath: string;
  onSelect: (filePath: string, fileName: string) => void;
}

function FileNode({ node, depth, isSelected, projectPath, onSelect }: FileNodeProps): React.ReactElement {
  const handleClick = useCallback(() => {
    const fullPath = `${projectPath}/docs/${node.relativePath}`;
    onSelect(fullPath, node.name);
  }, [node.relativePath, node.name, projectPath, onSelect]);

  const paddingLeft = BASE_PADDING + depth * INDENT_INCREMENT;

  return (
    <button
      onClick={handleClick}
      data-testid={`file-node-${node.relativePath}`}
      data-selected={isSelected}
      className={clsx(
        'w-full flex items-center gap-2 py-1.5 text-left text-sm rounded-md',
        'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
        isSelected
          ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
      )}
      style={{ paddingLeft: `${paddingLeft}px` }}
    >
      <FileTypeIcon extension={node.extension} />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

/**
 * Directory node component
 */
interface DirectoryNodeProps {
  node: DocsTreeNode;
  depth: number;
  projectPath: string;
  selectedFilePath: string | null;
  onSelectFile: (filePath: string, fileName: string) => void;
}

function DirectoryNode({
  node,
  depth,
  projectPath,
  selectedFilePath,
  onSelectFile,
}: DirectoryNodeProps): React.ReactElement {
  // zustand-selector-optimization: individual selectors
  // Subscribe to the computed boolean value (not the isExpanded function)
  // so component re-renders when expandedDirs changes for this path
  const expanded = useDocsTreeExpandedStore(s => s.expandedDirs.get(node.relativePath) ?? false);
  const toggleDir = useDocsTreeExpandedStore(s => s.toggleDir);

  const handleToggle = useCallback(() => {
    toggleDir(node.relativePath);
  }, [node.relativePath, toggleDir]);

  const paddingLeft = BASE_PADDING + depth * INDENT_INCREMENT;

  return (
    <div>
      <button
        onClick={handleToggle}
        data-testid={`dir-node-${node.relativePath}`}
        className={clsx(
          'w-full flex items-center gap-2 py-1.5 text-left text-sm rounded-md',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
          'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
        )}
        style={{ paddingLeft: `${paddingLeft}px` }}
      >
        {expanded ? (
          <FolderOpen className="w-4 h-4 text-yellow-500" data-testid="folder-expanded-icon" />
        ) : (
          <Folder className="w-4 h-4 text-yellow-500" data-testid="folder-collapsed-icon" />
        )}
        <span className="truncate font-medium">{node.name}</span>
      </button>

      {/* Render children when expanded */}
      {expanded && node.children && (
        <TreeNodes
          nodes={node.children}
          depth={depth + 1}
          projectPath={projectPath}
          selectedFilePath={selectedFilePath}
          onSelectFile={onSelectFile}
        />
      )}
    </div>
  );
}

/**
 * Recursive tree node renderer
 */
interface TreeNodesProps {
  nodes: DocsTreeNode[];
  depth: number;
  projectPath: string;
  selectedFilePath: string | null;
  onSelectFile: (filePath: string, fileName: string) => void;
}

function TreeNodes({
  nodes,
  depth,
  projectPath,
  selectedFilePath,
  onSelectFile,
}: TreeNodesProps): React.ReactElement {
  return (
    <>
      {nodes.map((node) => {
        if (node.type === 'directory') {
          return (
            <DirectoryNode
              key={node.relativePath}
              node={node}
              depth={depth}
              projectPath={projectPath}
              selectedFilePath={selectedFilePath}
              onSelectFile={onSelectFile}
            />
          );
        }

        const fullPath = `${projectPath}/docs/${node.relativePath}`;
        const isSelected = selectedFilePath === fullPath;

        return (
          <FileNode
            key={node.relativePath}
            node={node}
            depth={depth}
            isSelected={isSelected}
            projectPath={projectPath}
            onSelect={onSelectFile}
          />
        );
      })}
    </>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * DocsTreeSection - Displays docs folder content as tree
 */
export function DocsTreeSection({
  docsTree,
  projectPath,
  selectedFilePath,
  onSelectFile,
}: DocsTreeSectionProps): React.ReactElement {
  // Empty state
  if (docsTree.length === 0) {
    return (
      <div data-testid="docs-tree-section">
        {/* Section Header - Requirement 5.2 */}
        <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          <BookOpen className="w-3 h-3" />
          Docs
        </div>
        {/* Empty message - Requirement 5.3 */}
        <div className="px-4 py-2 text-sm text-gray-400 dark:text-gray-500 italic">
          ファイルなし
        </div>
      </div>
    );
  }

  return (
    <div data-testid="docs-tree-section">
      {/* Section Header - Requirement 5.2 */}
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        <BookOpen className="w-3 h-3" />
        Docs
      </div>

      {/* Tree content */}
      <div className="px-1">
        <TreeNodes
          nodes={docsTree}
          depth={0}
          projectPath={projectPath}
          selectedFilePath={selectedFilePath}
          onSelectFile={onSelectFile}
        />
      </div>
    </div>
  );
}

export default DocsTreeSection;
