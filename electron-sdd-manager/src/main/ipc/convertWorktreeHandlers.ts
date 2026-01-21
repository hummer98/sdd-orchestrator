/**
 * ConvertWorktreeHandlers
 * IPC handlers for converting normal spec to worktree mode
 * Requirements: 3.1, 3.2, 3.3 (convert-spec-to-worktree feature)
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './channels';
import { logger } from '../services/logger';
import { getCurrentProjectPath } from './handlers';
import { ConvertWorktreeService, type ConvertResult } from '../services/convertWorktreeService';
import { WorktreeService } from '../services/worktreeService';
import { FileService } from '../services/fileService';
import type { WorktreeInfo } from '../../renderer/types/worktree';

/**
 * Create a ConvertWorktreeService instance for the current project
 * @param projectPath Project root path
 */
function createConvertService(projectPath: string): ConvertWorktreeService {
  const worktreeService = new WorktreeService(projectPath);
  const fileService = new FileService();
  return new ConvertWorktreeService(worktreeService, fileService);
}

/**
 * Register IPC handlers for convert-to-worktree operations
 * Uses getCurrentProjectPath() to get project context dynamically
 * Requirements: 3.1, 3.2, 3.3
 */
export function registerConvertWorktreeHandlers(): void {
  logger.info('[ConvertWorktreeHandlers] Registering handlers');

  // Handler: Check if spec can be converted
  // Requirements: 3.1
  // spec-path-ssot-refactor: Changed from specPath to specName, resolve path using resolveSpecPath
  ipcMain.handle(
    IPC_CHANNELS.CONVERT_CHECK,
    async (_event, projectPath: string, specName: string): Promise<ConvertResult<boolean>> => {
      logger.debug('[ConvertWorktreeHandlers] CONVERT_CHECK called', { projectPath, specName });

      // Use provided projectPath or fall back to current
      const resolvedProjectPath = projectPath || getCurrentProjectPath();
      if (!resolvedProjectPath) {
        logger.error('[ConvertWorktreeHandlers] No project path set');
        return {
          ok: false,
          error: { type: 'SPEC_NOT_FOUND', specPath: specName },
        };
      }

      // spec-path-ssot-refactor: Resolve specName to full path
      const fileService = new FileService();
      const specPathResult = await fileService.resolveSpecPath(resolvedProjectPath, specName);
      if (!specPathResult.ok) {
        logger.warn('[ConvertWorktreeHandlers] Spec not found', { specName });
        return {
          ok: false,
          error: { type: 'SPEC_NOT_FOUND', specPath: specName },
        };
      }

      const convertService = createConvertService(resolvedProjectPath);
      return await convertService.canConvert(resolvedProjectPath, specPathResult.value);
    }
  );

  // Handler: Execute conversion to worktree mode
  // Requirements: 3.2
  // spec-path-ssot-refactor: Changed from specPath to specName, resolve path using resolveSpecPath
  ipcMain.handle(
    IPC_CHANNELS.CONVERT_TO_WORKTREE,
    async (
      _event,
      projectPath: string,
      specName: string,
      featureName: string
    ): Promise<ConvertResult<WorktreeInfo>> => {
      logger.info('[ConvertWorktreeHandlers] CONVERT_TO_WORKTREE called', {
        projectPath,
        specName,
        featureName,
      });

      // Use provided projectPath or fall back to current
      const resolvedProjectPath = projectPath || getCurrentProjectPath();
      if (!resolvedProjectPath) {
        logger.error('[ConvertWorktreeHandlers] No project path set');
        return {
          ok: false,
          error: { type: 'SPEC_NOT_FOUND', specPath: specName },
        };
      }

      // spec-path-ssot-refactor: Resolve specName to full path
      const fileService = new FileService();
      const specPathResult = await fileService.resolveSpecPath(resolvedProjectPath, specName);
      if (!specPathResult.ok) {
        logger.warn('[ConvertWorktreeHandlers] Spec not found', { specName });
        return {
          ok: false,
          error: { type: 'SPEC_NOT_FOUND', specPath: specName },
        };
      }

      const convertService = createConvertService(resolvedProjectPath);
      return await convertService.convertToWorktree(resolvedProjectPath, specPathResult.value, featureName);
    }
  );

  logger.info('[ConvertWorktreeHandlers] Handlers registered');
}

/**
 * Unregister IPC handlers for convert-to-worktree operations
 * Used for cleanup in tests or when switching projects
 */
export function unregisterConvertWorktreeHandlers(): void {
  logger.debug('[ConvertWorktreeHandlers] Unregistering handlers');
  ipcMain.removeHandler(IPC_CHANNELS.CONVERT_CHECK);
  ipcMain.removeHandler(IPC_CHANNELS.CONVERT_TO_WORKTREE);
}
