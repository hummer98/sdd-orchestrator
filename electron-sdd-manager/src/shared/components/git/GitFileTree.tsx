/**
 * GitFileTree Component
 * File tree component for displaying changed files in git diff viewer
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 10.3, 10.4, 11.2, 12.1
 * git-diff-viewer Task 11.1: Keyboard navigation
 * git-diff-viewer Task 12.2: File tree virtualization with @tanstack/react-virtual
 *
 * This component is shared between Electron and Remote UI.
 */

import { useMemo, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronRight, ChevronDown, Plus, Circle, Minus, FileQuestion } from 'lucide-react';
import { useApi } from '@shared/api/ApiClientProvider';
import { useSharedGitViewStore } from '@shared/stores/gitViewStore';
import type { GitFileStatus } from '@shared/api/types';

/** Threshold for enabling virtualization */
const VIRTUALIZATION_THRESHOLD = 100;
const ITEM_HEIGHT = 28; // Height of each tree item in pixels

/** Tree node types */
interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  status?: GitFileStatus['status'];
  children?: TreeNode[];
}

/** Flat item for virtualized rendering */
interface FlatTreeItem {
  node: TreeNode;
  depth: number;
  isExpanded?: boolean;
  fileCount?: number;
}

/**
 * Build tree structure from flat file list
 */
function buildTree(files: GitFileStatus[]): TreeNode[] {
  const root: TreeNode[] = [];
  const nodeMap = new Map<string, TreeNode>();

  // Sort files for consistent ordering
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

  for (const file of sortedFiles) {
    const parts = file.path.split('/');
    let currentPath = '';
    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      // Check if this node already exists
      let node = nodeMap.get(currentPath);

      if (!node) {
        node = {
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'directory',
          status: isFile ? file.status : undefined,
          children: isFile ? undefined : [],
        };
        nodeMap.set(currentPath, node);

        // Add to current level
        currentLevel.push(node);

        // Sort directories first, then alphabetically
        currentLevel.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
      }

      if (!isFile && node.children) {
        currentLevel = node.children;
      }
    }
  }

  return root;
}

/**
 * Count all files in a directory (including nested)
 */
function countFiles(node: TreeNode): number {
  if (node.type === 'file') {
    return 1;
  }
  return node.children?.reduce((sum, child) => sum + countFiles(child), 0) ?? 0;
}

/**
 * Flatten tree into list for virtualized rendering
 * Only includes visible items based on expanded dirs
 */
function flattenTreeForRendering(
  nodes: TreeNode[],
  expandedDirs: Map<string, boolean>,
  depth: number = 0
): FlatTreeItem[] {
  const result: FlatTreeItem[] = [];

  for (const node of nodes) {
    if (node.type === 'file') {
      result.push({ node, depth });
    } else {
      const isExpanded = expandedDirs.get(node.path) ?? false;
      const fileCount = countFiles(node);
      result.push({ node, depth, isExpanded, fileCount });

      if (isExpanded && node.children) {
        result.push(...flattenTreeForRendering(node.children, expandedDirs, depth + 1));
      }
    }
  }

  return result;
}

/** Navigation item type for keyboard navigation */
interface NavigationItem {
  path: string;
  type: 'file' | 'directory';
}

/**
 * Flatten tree into navigable list (only visible items based on expanded dirs)
 * git-diff-viewer Task 11.1: For keyboard navigation
 */
function flattenTreeForNavigation(
  nodes: TreeNode[],
  expandedDirs: Map<string, boolean>
): NavigationItem[] {
  const result: NavigationItem[] = [];

  function traverse(nodeList: TreeNode[]): void {
    for (const node of nodeList) {
      result.push({ path: node.path, type: node.type });
      if (node.type === 'directory' && node.children) {
        const isExpanded = expandedDirs.get(node.path) ?? false;
        if (isExpanded) {
          traverse(node.children);
        }
      }
    }
  }

  traverse(nodes);
  return result;
}

/**
 * Status icon component
 */
function StatusIcon({ status }: { status: GitFileStatus['status'] }): React.ReactElement {
  switch (status) {
    case 'A':
      return (
        <Plus
          className="w-3 h-3 text-green-500"
          data-testid="status-icon-A"
        />
      );
    case 'M':
      return (
        <Circle
          className="w-3 h-3 text-yellow-500 fill-yellow-500"
          data-testid="status-icon-M"
        />
      );
    case 'D':
      return (
        <Minus
          className="w-3 h-3 text-red-500"
          data-testid="status-icon-D"
        />
      );
    case '??':
      return (
        <FileQuestion
          className="w-3 h-3 text-gray-400"
          data-testid="status-icon-??"
        />
      );
    default:
      return (
        <Circle
          className="w-3 h-3 text-gray-400"
          data-testid={`status-icon-${status}`}
        />
      );
  }
}

/**
 * File node component
 */
function FileNode({
  node,
  depth,
  isSelected,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  isSelected: boolean;
  onSelect: (path: string) => void;
}): React.ReactElement {
  const handleClick = useCallback(() => {
    onSelect(node.path);
  }, [node.path, onSelect]);

  return (
    <div
      className={`flex items-center px-2 py-1 cursor-pointer rounded ${
        isSelected
          ? 'bg-blue-100 dark:bg-blue-900'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onClick={handleClick}
      data-testid={`file-node-${node.path}`}
    >
      <StatusIcon status={node.status!} />
      <span className="ml-2 text-sm truncate text-gray-700 dark:text-gray-200">{node.name}</span>
    </div>
  );
}

/**
 * Directory node component (flat version for virtualization)
 */
function DirectoryNodeFlat({
  node,
  depth,
  isExpanded,
  fileCount,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  isExpanded: boolean;
  fileCount: number;
  onToggle: (path: string) => void;
}): React.ReactElement {
  const handleClick = useCallback(() => {
    onToggle(node.path);
  }, [node.path, onToggle]);

  return (
    <div
      className="flex items-center px-2 py-1 cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-gray-800"
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onClick={handleClick}
      data-testid={`dir-node-${node.path}`}
    >
      {isExpanded ? (
        <ChevronDown className="w-4 h-4 text-gray-500" data-testid="collapse-icon" />
      ) : (
        <ChevronRight className="w-4 h-4 text-gray-500" data-testid="collapse-icon" />
      )}
      <span className="ml-1 text-sm font-medium text-gray-700 dark:text-gray-200">{node.name}</span>
      <span className="ml-2 text-xs text-gray-400">({fileCount})</span>
    </div>
  );
}

/**
 * Virtualized tree renderer using @tanstack/react-virtual
 * Task 12.2: Performance optimization for 100+ files
 */
function VirtualizedTreeRenderer({
  items,
  selectedFilePath,
  onSelectFile,
  onToggleDir,
  parentRef,
}: {
  items: FlatTreeItem[];
  selectedFilePath: string | null;
  onSelectFile: (path: string) => void;
  onToggleDir: (path: string) => void;
  parentRef: React.RefObject<HTMLDivElement | null>;
}): React.ReactElement {
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
  });

  return (
    <div
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        width: '100%',
        position: 'relative',
      }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const item = items[virtualRow.index];
        const { node, depth, isExpanded, fileCount } = item;

        return (
          <div
            key={node.path}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {node.type === 'file' ? (
              <FileNode
                node={node}
                depth={depth}
                isSelected={selectedFilePath === node.path}
                onSelect={onSelectFile}
              />
            ) : (
              <DirectoryNodeFlat
                node={node}
                depth={depth}
                isExpanded={isExpanded ?? false}
                fileCount={fileCount ?? 0}
                onToggle={onToggleDir}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Directory node component (recursive version for non-virtualized rendering)
 */
function DirectoryNode({
  node,
  isExpanded,
  onToggle,
  children,
}: {
  node: TreeNode;
  isExpanded: boolean;
  onToggle: (path: string) => void;
  children: React.ReactNode;
}): React.ReactElement {
  const fileCount = useMemo(() => countFiles(node), [node]);

  const handleClick = useCallback(() => {
    onToggle(node.path);
  }, [node.path, onToggle]);

  return (
    <div>
      <div
        className="flex items-center px-2 py-1 cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        onClick={handleClick}
        data-testid={`dir-node-${node.path}`}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500" data-testid="collapse-icon" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" data-testid="collapse-icon" />
        )}
        <span className="ml-1 text-sm font-medium text-gray-700 dark:text-gray-200">{node.name}</span>
        <span className="ml-2 text-xs text-gray-400">({fileCount})</span>
      </div>
      {isExpanded && (
        <div className="ml-4">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Recursive tree renderer (for small file counts)
 */
function TreeRenderer({
  nodes,
  selectedFilePath,
  expandedDirs,
  onSelectFile,
  onToggleDir,
}: {
  nodes: TreeNode[];
  selectedFilePath: string | null;
  expandedDirs: Map<string, boolean>;
  onSelectFile: (path: string) => void;
  onToggleDir: (path: string) => void;
}): React.ReactElement {
  return (
    <>
      {nodes.map((node) => {
        if (node.type === 'file') {
          return (
            <FileNode
              key={node.path}
              node={node}
              depth={0}
              isSelected={selectedFilePath === node.path}
              onSelect={onSelectFile}
            />
          );
        }

        const isExpanded = expandedDirs.get(node.path) ?? false;

        return (
          <DirectoryNode
            key={node.path}
            node={node}
            isExpanded={isExpanded}
            onToggle={onToggleDir}
          >
            {node.children && (
              <TreeRendererNested
                nodes={node.children}
                selectedFilePath={selectedFilePath}
                expandedDirs={expandedDirs}
                onSelectFile={onSelectFile}
                onToggleDir={onToggleDir}
                depth={1}
              />
            )}
          </DirectoryNode>
        );
      })}
    </>
  );
}

/**
 * Nested tree renderer with depth tracking (for non-virtualized mode)
 */
function TreeRendererNested({
  nodes,
  selectedFilePath,
  expandedDirs,
  onSelectFile,
  onToggleDir,
  depth,
}: {
  nodes: TreeNode[];
  selectedFilePath: string | null;
  expandedDirs: Map<string, boolean>;
  onSelectFile: (path: string) => void;
  onToggleDir: (path: string) => void;
  depth: number;
}): React.ReactElement {
  return (
    <>
      {nodes.map((node) => {
        if (node.type === 'file') {
          return (
            <FileNode
              key={node.path}
              node={node}
              depth={0}
              isSelected={selectedFilePath === node.path}
              onSelect={onSelectFile}
            />
          );
        }

        const isExpanded = expandedDirs.get(node.path) ?? false;

        return (
          <DirectoryNode
            key={node.path}
            node={node}
            isExpanded={isExpanded}
            onToggle={onToggleDir}
          >
            {node.children && (
              <TreeRendererNested
                nodes={node.children}
                selectedFilePath={selectedFilePath}
                expandedDirs={expandedDirs}
                onSelectFile={onSelectFile}
                onToggleDir={onToggleDir}
                depth={depth + 1}
              />
            )}
          </DirectoryNode>
        );
      })}
    </>
  );
}

/**
 * GitFileTree - Displays a tree of changed files
 *
 * Features:
 * - Hierarchical directory structure
 * - File selection for diff viewing
 * - Directory expand/collapse
 * - Empty state message
 * - Status icons (A: green+, M: yellow dot, D: red-, ??: gray question)
 * - Keyboard navigation (ArrowUp/Down, Enter, Space) - Task 11.1
 * - Virtualized rendering for 100+ files - Task 12.2
 */
export function GitFileTree(): React.ReactElement {
  const apiClient = useApi();
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    cachedStatus,
    selectedFilePath,
    expandedDirs,
    selectFile,
    toggleDir,
  } = useSharedGitViewStore();

  // Build tree structure from flat file list
  const tree = useMemo(() => {
    if (!cachedStatus?.files) {
      return [];
    }
    return buildTree(cachedStatus.files);
  }, [cachedStatus?.files]);

  // Total file count for virtualization decision
  const totalFileCount = cachedStatus?.files?.length ?? 0;
  const useVirtualization = totalFileCount > VIRTUALIZATION_THRESHOLD;

  // Flatten tree for virtualized rendering (only when needed)
  const flatItems = useMemo(() => {
    if (!useVirtualization) return [];
    return flattenTreeForRendering(tree, expandedDirs);
  }, [tree, expandedDirs, useVirtualization]);

  // Flatten tree for keyboard navigation (only visible items)
  const navigationItems = useMemo(() => {
    return flattenTreeForNavigation(tree, expandedDirs);
  }, [tree, expandedDirs]);

  // Handle file selection
  const handleSelectFile = useCallback((filePath: string) => {
    selectFile(apiClient, filePath);
  }, [apiClient, selectFile]);

  // Handle directory toggle
  const handleToggleDir = useCallback((dirPath: string) => {
    toggleDir(dirPath);
  }, [toggleDir]);

  // Get only file items from navigation (for keyboard navigation)
  const fileItems = useMemo(() => {
    return navigationItems.filter(item => item.type === 'file');
  }, [navigationItems]);

  // git-diff-viewer Task 11.1: Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (fileItems.length === 0) return;

    const currentIndex = selectedFilePath
      ? fileItems.findIndex(item => item.path === selectedFilePath)
      : -1;

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        // If nothing selected, select first file
        if (currentIndex === -1) {
          const firstFile = fileItems[0];
          selectFile(apiClient, firstFile.path);
        } else if (currentIndex < fileItems.length - 1) {
          // Move to next file
          const nextFile = fileItems[currentIndex + 1];
          selectFile(apiClient, nextFile.path);
        }
        // If at last file, do nothing (boundary)
        break;
      }

      case 'ArrowUp': {
        e.preventDefault();
        if (currentIndex > 0) {
          // Move to previous file
          const prevFile = fileItems[currentIndex - 1];
          selectFile(apiClient, prevFile.path);
        }
        // If at first file or not selected, do nothing
        break;
      }

      case ' ': {
        e.preventDefault();
        // Find the directory that contains the currently selected file
        if (selectedFilePath) {
          const parts = selectedFilePath.split('/');
          if (parts.length > 1) {
            // Get parent directory
            const parentDir = parts.slice(0, -1).join('/');
            toggleDir(parentDir);
          }
        }
        break;
      }

      case 'Enter': {
        e.preventDefault();
        // Re-fetch diff for currently selected file
        if (selectedFilePath) {
          selectFile(apiClient, selectedFilePath);
        }
        break;
      }
    }
  }, [fileItems, selectedFilePath, selectFile, toggleDir, apiClient]);

  // Empty state
  if (!cachedStatus || cachedStatus.files.length === 0) {
    return (
      <div
        className="h-full flex items-center justify-center text-gray-400 p-4 text-center"
        data-testid="empty-message"
      >
        変更されたファイルはありません
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-auto p-2 outline-none"
      data-testid="file-list"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {useVirtualization ? (
        <VirtualizedTreeRenderer
          items={flatItems}
          selectedFilePath={selectedFilePath}
          onSelectFile={handleSelectFile}
          onToggleDir={handleToggleDir}
          parentRef={containerRef}
        />
      ) : (
        <TreeRenderer
          nodes={tree}
          selectedFilePath={selectedFilePath}
          expandedDirs={expandedDirs}
          onSelectFile={handleSelectFile}
          onToggleDir={handleToggleDir}
        />
      )}
    </div>
  );
}

export default GitFileTree;
