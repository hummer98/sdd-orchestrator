/**
 * Project File Handlers
 *
 * project-config-editor Task 2.2: IPC handlers for project file operations
 * Requirements: 3.1, 4.1, 5.4
 *
 * Handlers:
 * - PROJECT_FILE_LIST: List CLAUDE.md and steering files
 * - PROJECT_FILE_READ: Read file content
 * - PROJECT_FILE_WRITE: Write file content
 *
 * Events:
 * - PROJECT_FILE_CHANGED: External file change notification
 */

import { BrowserWindow } from 'electron';
import { safeHandle } from './ipcUtils';
import * as path from 'path';
import * as fs from 'fs/promises';

import { IPC_CHANNELS } from './channels';
import { ProjectFileWatcherService } from '../services/ProjectFileWatcherService';
import { projectLogger as logger } from '../services/projectLogger';
import type { ProjectFilesState, DocsTreeNode, DocsFileExtension } from '../../shared/api/types';

// =============================================================================
// Dependencies
// =============================================================================

export interface ProjectFileHandlersDependencies {
  /** Function to get current project path */
  getCurrentProjectPath: () => string | null;
}

// =============================================================================
// Service Instance
// =============================================================================

let projectFileWatcherService: ProjectFileWatcherService | null = null;

/**
 * Get or create ProjectFileWatcherService instance
 */
export function getProjectFileWatcherService(): ProjectFileWatcherService {
  if (!projectFileWatcherService) {
    projectFileWatcherService = new ProjectFileWatcherService();
  }
  return projectFileWatcherService;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Validate that file path is within project directory
 */
function validateFilePath(filePath: string, projectPath: string): boolean {
  const resolvedPath = path.resolve(filePath);
  const resolvedProject = path.resolve(projectPath);
  return resolvedPath.startsWith(resolvedProject + path.sep) || resolvedPath === resolvedProject;
}

/** Supported file extensions for docs folder */
const SUPPORTED_EXTENSIONS = new Set(['md', 'pdf', 'html']);

/**
 * Check if a file has a supported extension for docs
 */
function getSupportedExtension(fileName: string): DocsFileExtension | null {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext && SUPPORTED_EXTENSIONS.has(ext)) {
    return ext as DocsFileExtension;
  }
  return null;
}

/**
 * List docs folder files recursively and build tree structure
 * project-docs-viewer Task 3.1
 * Requirements: 1.1, 1.2, 1.3, 1.4
 *
 * @param projectPath - Project root path
 * @returns Array of DocsTreeNode representing the tree structure
 */
export async function listDocsFilesCore(projectPath: string): Promise<DocsTreeNode[]> {
  const docsPath = path.join(projectPath, 'docs');

  try {
    return await buildTreeRecursive(docsPath, '');
  } catch (error: any) {
    // Requirement 1.2: Return empty array when docs/ doesn't exist
    if (error?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Recursively build tree structure from directory
 */
async function buildTreeRecursive(dirPath: string, relativePath: string): Promise<DocsTreeNode[]> {
  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const nodes: DocsTreeNode[] = [];

  for (const entry of entries) {
    // Requirement 1.4: Exclude hidden files/folders
    if (entry.name.startsWith('.')) {
      continue;
    }

    const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      // Recursively process subdirectory
      const children = await buildTreeRecursive(
        path.join(dirPath, entry.name),
        entryRelativePath
      );

      nodes.push({
        name: entry.name,
        relativePath: entryRelativePath,
        type: 'directory',
        children,
      });
    } else if (entry.isFile()) {
      // Requirement 1.1: Only include .md, .pdf, .html files
      const extension = getSupportedExtension(entry.name);
      if (extension) {
        nodes.push({
          name: entry.name,
          relativePath: entryRelativePath,
          type: 'file',
          extension,
        });
      }
    }
  }

  // Requirement 1.3: Sort alphabetically (directories first, then files)
  nodes.sort((a, b) => {
    // Directories before files
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    // Alphabetical within same type
    return a.name.localeCompare(b.name);
  });

  return nodes;
}

/**
 * List project files (CLAUDE.md and steering files)
 * Exported as core function for WebSocket handler use
 */
export async function listProjectFilesCore(projectPath: string): Promise<ProjectFilesState> {
  const result: ProjectFilesState = {
    claudeMd: null,
    steeringFiles: [],
    docsTree: [], // project-docs-viewer Task 3.2: Populated by listDocsFilesCore
    isLoading: false,
    error: null,
  };

  // project-docs-viewer Task 3.2: Get docs tree
  result.docsTree = await listDocsFilesCore(projectPath);

  // Check CLAUDE.md
  const claudeMdPath = path.join(projectPath, 'CLAUDE.md');
  try {
    await fs.access(claudeMdPath);
    result.claudeMd = {
      relativePath: 'CLAUDE.md',
      fileName: 'CLAUDE.md',
      group: 'claude',
      exists: true,
    };
  } catch {
    // CLAUDE.md does not exist
    result.claudeMd = null;
  }

  // List steering files
  const steeringDir = path.join(projectPath, '.kiro', 'steering');
  try {
    const entries = await fs.readdir(steeringDir, { withFileTypes: true });
    const mdFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && !entry.name.startsWith('.'))
      .map((entry) => ({
        relativePath: path.join('.kiro', 'steering', entry.name),
        fileName: entry.name,
        group: 'steering' as const,
        exists: true,
      }))
      .sort((a, b) => a.fileName.localeCompare(b.fileName));

    result.steeringFiles = mdFiles;
  } catch {
    // Steering directory does not exist
    result.steeringFiles = [];
  }

  return result;
}

/**
 * Read project file content
 * Exported as core function for WebSocket handler use
 */
export async function readProjectFileCore(projectPath: string, filePath: string): Promise<string> {
  if (!validateFilePath(filePath, projectPath)) {
    throw new Error('File path must be within project directory');
  }
  return fs.readFile(filePath, 'utf-8');
}

/**
 * Write project file content
 * Exported as core function for WebSocket handler use
 */
export async function writeProjectFileCore(
  projectPath: string,
  filePath: string,
  content: string
): Promise<void> {
  if (!validateFilePath(filePath, projectPath)) {
    throw new Error('File path must be within project directory');
  }
  await fs.writeFile(filePath, content, 'utf-8');
  logger.info('[projectFileHandlers] File saved', { filePath });
}

// =============================================================================
// Handler Registration
// =============================================================================

/**
 * Register project file IPC handlers
 */
export function registerProjectFileHandlers(deps: ProjectFileHandlersDependencies): void {
  const { getCurrentProjectPath } = deps;

  // Initialize watcher service
  const watcherService = getProjectFileWatcherService();

  // Register change callback to broadcast to all windows
  watcherService.onChange((filePath) => {
    logger.debug('[projectFileHandlers] File changed, broadcasting', { filePath });

    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.PROJECT_FILE_CHANGED, filePath);
      }
    }
  });

  // ============================================================
  // PROJECT_FILE_LIST: List CLAUDE.md and steering files
  // Requirements: 2.1, 2.2, 2.3
  // ============================================================

  safeHandle(IPC_CHANNELS.PROJECT_FILE_LIST, async () => {
    logger.debug('[projectFileHandlers] PROJECT_FILE_LIST called');

    const projectPath = getCurrentProjectPath();
    if (!projectPath) {
      throw new Error('Project not selected');
    }

    const result = await listProjectFilesCore(projectPath);
    logger.debug('[projectFileHandlers] PROJECT_FILE_LIST result', {
      hasClaude: result.claudeMd !== null,
      steeringCount: result.steeringFiles.length,
    });

    return result;
  });

  // ============================================================
  // PROJECT_FILE_READ: Read file content
  // Requirements: 3.1
  // ============================================================

  safeHandle(IPC_CHANNELS.PROJECT_FILE_READ, async (_event, filePath: string) => {
    logger.debug('[projectFileHandlers] PROJECT_FILE_READ called', { filePath });

    const projectPath = getCurrentProjectPath();
    if (!projectPath) {
      throw new Error('Project not selected');
    }

    return readProjectFileCore(projectPath, filePath);
  });

  // ============================================================
  // PROJECT_FILE_WRITE: Write file content
  // Requirements: 4.1
  // ============================================================

  safeHandle(
    IPC_CHANNELS.PROJECT_FILE_WRITE,
    async (_event, filePath: string, content: string) => {
      logger.debug('[projectFileHandlers] PROJECT_FILE_WRITE called', { filePath });

      const projectPath = getCurrentProjectPath();
      if (!projectPath) {
        throw new Error('Project not selected');
      }

      await writeProjectFileCore(projectPath, filePath, content);
    }
  );
}

// =============================================================================
// Watcher Control (called from handlers.ts on project selection)
// =============================================================================

/**
 * Start project file watcher for the given project
 */
export async function startProjectFileWatcher(projectPath: string): Promise<void> {
  const watcherService = getProjectFileWatcherService();
  await watcherService.start(projectPath);
  logger.info('[projectFileHandlers] Started project file watcher', { projectPath });
}

/**
 * Stop project file watcher
 */
export async function stopProjectFileWatcher(): Promise<void> {
  const watcherService = getProjectFileWatcherService();
  await watcherService.stop();
  logger.info('[projectFileHandlers] Stopped project file watcher');
}
