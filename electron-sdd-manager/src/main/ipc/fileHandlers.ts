/**
 * File Handlers
 * IPC handlers for file-related operations
 *
 * Task 3.1: fileHandlers.ts を新規作成し、ファイル操作関連ハンドラーを実装する
 * Requirements: 1.3, 2.1, 2.2, 4.1, 4.2
 *
 * Migrated handlers from handlers.ts:
 * - SHOW_OPEN_DIALOG
 * - READ_ARTIFACT, WRITE_ARTIFACT, WRITE_FILE
 * - OPEN_IN_VSCODE
 */

import { ipcMain, dialog } from 'electron';
import { spawn } from 'child_process';
import * as path from 'path';
import { IPC_CHANNELS } from './channels';
import type { FileService } from '../services/fileService';
import { logger } from '../services/logger';

/**
 * Dependencies required for file handlers
 * Requirements: 2.1, 2.2 - Dependency injection for testability
 */
export interface FileHandlersDependencies {
  /** FileService instance for file operations */
  fileService: FileService;
  /** Function to get the current project path */
  getCurrentProjectPath: () => string | null;
}

/**
 * Register all file-related IPC handlers
 * Requirements: 1.3, 2.1, 4.1, 4.2
 *
 * @param deps - Dependencies for file handlers (fileService, getCurrentProjectPath)
 */
export function registerFileHandlers(deps: FileHandlersDependencies): void {
  const { fileService, getCurrentProjectPath } = deps;

  // ============================================================
  // File Dialog
  // ============================================================

  ipcMain.handle(IPC_CHANNELS.SHOW_OPEN_DIALOG, async () => {
    logger.debug('[fileHandlers] SHOW_OPEN_DIALOG called');

    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'プロジェクトディレクトリを選択',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  // ============================================================
  // Artifact Read/Write
  // spec-path-ssot-refactor: Change from artifactPath to (specName, filename)
  // bug-artifact-content-not-displayed: Add entityType to support both specs and bugs
  // Main process resolves the full path using resolveSpecPath or resolveBugPath
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.READ_ARTIFACT,
    async (_event, name: string, filename: string, entityType: 'spec' | 'bug' = 'spec') => {
      logger.debug('[fileHandlers] READ_ARTIFACT called', { name, filename, entityType });

      const currentProjectPath = getCurrentProjectPath();
      if (!currentProjectPath) {
        throw new Error('Project not selected');
      }

      // Use appropriate path resolver based on entityType
      const pathResult = entityType === 'bug'
        ? await fileService.resolveBugPath(currentProjectPath, name)
        : await fileService.resolveSpecPath(currentProjectPath, name);
      if (!pathResult.ok) {
        throw new Error(`${entityType === 'bug' ? 'Bug' : 'Spec'} not found: ${name}`);
      }

      const artifactPath = path.join(pathResult.value, filename);
      const result = await fileService.readArtifact(artifactPath);
      if (!result.ok) {
        throw new Error(`Failed to read artifact: ${result.error.type}`);
      }

      return result.value;
    }
  );

  // Bug fix: worktree-artifact-save
  // writeArtifact uses the same path resolution as readArtifact
  // This ensures artifacts are saved to the correct location (worktree or main)
  ipcMain.handle(
    IPC_CHANNELS.WRITE_ARTIFACT,
    async (_event, name: string, filename: string, content: string, entityType: 'spec' | 'bug' = 'spec') => {
      logger.debug('[fileHandlers] WRITE_ARTIFACT called', { name, filename, entityType });

      const currentProjectPath = getCurrentProjectPath();
      if (!currentProjectPath) {
        throw new Error('Project not selected');
      }

      // Use appropriate path resolver based on entityType (same as readArtifact)
      const pathResult = entityType === 'bug'
        ? await fileService.resolveBugPath(currentProjectPath, name)
        : await fileService.resolveSpecPath(currentProjectPath, name);
      if (!pathResult.ok) {
        throw new Error(`${entityType === 'bug' ? 'Bug' : 'Spec'} not found: ${name}`);
      }

      const artifactPath = path.join(pathResult.value, filename);
      const result = await fileService.writeFile(artifactPath, content);
      if (!result.ok) {
        throw new Error(`Failed to write artifact: ${result.error.type}`);
      }
    }
  );

  // ============================================================
  // Direct File Write
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.WRITE_FILE,
    async (_event, filePath: string, content: string) => {
      logger.debug('[fileHandlers] WRITE_FILE called', { filePath });

      const result = await fileService.writeFile(filePath, content);
      if (!result.ok) {
        throw new Error(`Failed to write file: ${result.error.type}`);
      }
    }
  );

  // ============================================================
  // VSCode Integration
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.OPEN_IN_VSCODE,
    async (_event, projectPath: string) => {
      logger.info('[fileHandlers] OPEN_IN_VSCODE called', { projectPath });

      try {
        // Spawn VSCode with detached mode to prevent it from being killed when app closes
        const child = spawn('code', [projectPath], {
          detached: true,
          stdio: 'ignore',
        });

        // Unref to allow parent process to exit independently
        child.unref();

        logger.info('[fileHandlers] VSCode launched successfully', { projectPath });
      } catch (error) {
        logger.error('[fileHandlers] Failed to launch VSCode', { projectPath, error });
        throw new Error(`VSCodeの起動に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  );

  logger.info('[fileHandlers] File handlers registered');
}
