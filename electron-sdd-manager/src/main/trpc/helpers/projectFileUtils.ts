/**
 * Project File Utilities
 * trpc-full-migration Task 11.2: ipc/projectFileUtils.ts から trpc/helpers/ に移動
 *
 * Functions:
 * - listProjectFilesCore: List CLAUDE.md and steering files
 * - readProjectFileCore: Read file content with path validation
 * - writeProjectFileCore: Write file content with path validation
 * - listDocsFilesCore: List docs folder files recursively
 * - startProjectFileWatcher: Start file watcher for project
 * - stopProjectFileWatcher: Stop file watcher
 * - initProjectFileWatcher: Initialize watcher with change callback
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { ProjectFileWatcherService } from '../../services/ProjectFileWatcherService';
import { projectLogger as logger } from '../../services/projectLogger';
import { getGlobalEventBus } from '../services/globalEventBus';
import { EVENT_NAMES } from '../services/eventBus';
import type { ProjectFilesState, DocsTreeNode, DocsFileExtension } from '../../../shared/api/types';

// =============================================================================
// Service Instance
// =============================================================================

let projectFileWatcherService: ProjectFileWatcherService | null = null;

export function getProjectFileWatcherService(): ProjectFileWatcherService {
  if (!projectFileWatcherService) {
    projectFileWatcherService = new ProjectFileWatcherService();
  }
  return projectFileWatcherService;
}

// =============================================================================
// Helper Functions
// =============================================================================

function validateFilePath(filePath: string, projectPath: string): boolean {
  const resolvedPath = path.resolve(filePath);
  const resolvedProject = path.resolve(projectPath);
  return resolvedPath.startsWith(resolvedProject + path.sep) || resolvedPath === resolvedProject;
}

const SUPPORTED_EXTENSIONS = new Set(['md', 'pdf', 'html']);

function getSupportedExtension(fileName: string): DocsFileExtension | null {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext && SUPPORTED_EXTENSIONS.has(ext)) {
    return ext as DocsFileExtension;
  }
  return null;
}

export async function listDocsFilesCore(projectPath: string): Promise<DocsTreeNode[]> {
  const docsPath = path.join(projectPath, 'docs');
  try {
    return await buildTreeRecursive(docsPath, '');
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

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
    if (entry.name.startsWith('.')) continue;

    const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      const children = await buildTreeRecursive(path.join(dirPath, entry.name), entryRelativePath);
      nodes.push({ name: entry.name, relativePath: entryRelativePath, type: 'directory', children });
    } else if (entry.isFile()) {
      const extension = getSupportedExtension(entry.name);
      if (extension) {
        nodes.push({ name: entry.name, relativePath: entryRelativePath, type: 'file', extension });
      }
    }
  }

  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return nodes;
}

export async function listProjectFilesCore(projectPath: string): Promise<ProjectFilesState> {
  const result: ProjectFilesState = {
    claudeMd: null, steeringFiles: [], docsTree: [], isLoading: false, error: null,
  };

  result.docsTree = await listDocsFilesCore(projectPath);

  const claudeMdPath = path.join(projectPath, 'CLAUDE.md');
  try {
    await fs.access(claudeMdPath);
    result.claudeMd = { relativePath: 'CLAUDE.md', fileName: 'CLAUDE.md', group: 'claude', exists: true };
  } catch {
    result.claudeMd = null;
  }

  const steeringDir = path.join(projectPath, '.kiro', 'steering');
  try {
    const entries = await fs.readdir(steeringDir, { withFileTypes: true });
    result.steeringFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && !entry.name.startsWith('.'))
      .map((entry) => ({
        relativePath: path.join('.kiro', 'steering', entry.name),
        fileName: entry.name, group: 'steering' as const, exists: true,
      }))
      .sort((a, b) => a.fileName.localeCompare(b.fileName));
  } catch {
    result.steeringFiles = [];
  }

  return result;
}

export async function readProjectFileCore(projectPath: string, filePath: string): Promise<string> {
  if (!validateFilePath(filePath, projectPath)) {
    throw new Error('File path must be within project directory');
  }
  return fs.readFile(filePath, 'utf-8');
}

export async function writeProjectFileCore(projectPath: string, filePath: string, content: string): Promise<void> {
  if (!validateFilePath(filePath, projectPath)) {
    throw new Error('File path must be within project directory');
  }
  await fs.writeFile(filePath, content, 'utf-8');
  logger.info('[projectFileUtils] File saved', { filePath });
}

// =============================================================================
// Watcher Control
// =============================================================================

export function initProjectFileWatcher(): void {
  const watcherService = getProjectFileWatcherService();
  watcherService.onChange((filePath) => {
    logger.debug('[projectFileUtils] File changed, broadcasting via EventBus', { filePath });
    // Emit to EventBus for tRPC Subscription (primary path after IPC removal)
    getGlobalEventBus().emit(EVENT_NAMES.PROJECT_FILE_CHANGED, { filePath });
  });
}

export async function startProjectFileWatcher(projectPath: string): Promise<void> {
  const watcherService = getProjectFileWatcherService();
  await watcherService.start(projectPath);
  logger.info('[projectFileUtils] Started project file watcher', { projectPath });
}

export async function stopProjectFileWatcher(): Promise<void> {
  const watcherService = getProjectFileWatcherService();
  await watcherService.stop();
  logger.info('[projectFileUtils] Stopped project file watcher');
}
