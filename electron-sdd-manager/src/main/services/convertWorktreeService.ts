/**
 * ConvertWorktreeService
 * 通常SpecからWorktreeモードへの変換処理を統括
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 * (convert-spec-to-worktree feature)
 */

import * as path from 'path';
import * as fsPromises from 'fs/promises';
import { logger } from './logger';
import type { WorktreeService } from './worktreeService';
import type { FileService } from './fileService';
import type { WorktreeInfo } from '../../renderer/types/worktree';
import { hasWorktreePath, isImplStarted } from '../../renderer/types/worktree';

/**
 * Error types for ConvertWorktreeService operations
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
export type ConvertError =
  | { type: 'NOT_ON_MAIN_BRANCH'; currentBranch: string }
  | { type: 'SPEC_NOT_FOUND'; specPath: string }
  | { type: 'ALREADY_WORKTREE_MODE'; specPath: string }
  | { type: 'IMPL_ALREADY_STARTED'; specPath: string }
  | { type: 'BRANCH_CREATE_FAILED'; message: string }
  | { type: 'WORKTREE_CREATE_FAILED'; message: string }
  | { type: 'FILE_MOVE_FAILED'; message: string }
  | { type: 'SYMLINK_CREATE_FAILED'; message: string }
  | { type: 'SPEC_JSON_UPDATE_FAILED'; message: string };

/**
 * Result type for ConvertWorktreeService operations
 * Uses ConvertError for error type instead of WorktreeError
 */
export type ConvertResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ConvertError };

/**
 * File system operations interface for dependency injection
 */
export interface FsPromisesInterface {
  access(path: string): Promise<void>;
  mkdir(path: string, options?: { recursive: boolean }): Promise<string | undefined>;
  cp(src: string, dest: string, options?: { recursive: boolean }): Promise<void>;
  rm(path: string, options?: { recursive: boolean; force?: boolean }): Promise<void>;
  readFile?(path: string, encoding: BufferEncoding): Promise<string>;
  writeFile?(path: string, content: string, encoding: BufferEncoding): Promise<void>;
}

/**
 * Get user-friendly error message for ConvertError
 * Requirements: 5.1-5.6
 */
export function getConvertErrorMessage(error: ConvertError): string {
  switch (error.type) {
    case 'NOT_ON_MAIN_BRANCH':
      return `mainブランチでのみ変換できます。現在: ${error.currentBranch}`;
    case 'SPEC_NOT_FOUND':
      return '仕様が見つかりません';
    case 'ALREADY_WORKTREE_MODE':
      return '既にWorktreeモードです';
    case 'IMPL_ALREADY_STARTED':
      return '実装開始後は変換できません';
    case 'BRANCH_CREATE_FAILED':
      return `ブランチ作成に失敗しました: ${error.message}`;
    case 'WORKTREE_CREATE_FAILED':
      return `Worktree作成に失敗しました: ${error.message}`;
    case 'FILE_MOVE_FAILED':
      return `ファイル移動に失敗しました: ${error.message}`;
    case 'SYMLINK_CREATE_FAILED':
      return `シンボリックリンク作成に失敗しました: ${error.message}`;
    case 'SPEC_JSON_UPDATE_FAILED':
      return `spec.json更新に失敗しました: ${error.message}`;
    default:
      return '不明なエラーが発生しました';
  }
}

/**
 * ConvertWorktreeService class
 * Handles conversion of normal Spec to Worktree mode
 * Requirements: 2.1, 2.2, 2.3, 2.4, 5.1-5.6
 */
export class ConvertWorktreeService {
  private worktreeService: WorktreeService;
  private fileService: FileService;
  private fs: FsPromisesInterface;

  constructor(
    worktreeService: WorktreeService,
    fileService: FileService,
    fsPromisesOverride?: FsPromisesInterface
  ) {
    this.worktreeService = worktreeService;
    this.fileService = fileService;
    this.fs = fsPromisesOverride || fsPromises;
  }

  /**
   * Check if a spec can be converted to worktree mode
   * Requirements: 2.2, 5.1, 5.2, 5.3, 5.4
   *
   * @param projectPath - Project root path
   * @param specPath - Spec directory path
   * @returns true if convertible, error otherwise
   */
  async canConvert(
    projectPath: string,
    specPath: string
  ): Promise<ConvertResult<boolean>> {
    logger.debug('[ConvertWorktreeService] canConvert called', { projectPath, specPath });

    // 1. Check if on main branch
    // Requirements: 2.2, 5.1
    const isMainResult = await this.worktreeService.isOnMainBranch();
    if (!isMainResult.ok) {
      // Convert WorktreeError to ConvertError
      const branchResult = await this.worktreeService.getCurrentBranch();
      const currentBranch = branchResult.ok ? branchResult.value : 'unknown';
      return {
        ok: false,
        error: { type: 'NOT_ON_MAIN_BRANCH', currentBranch },
      };
    }
    if (!isMainResult.value) {
      const branchResult = await this.worktreeService.getCurrentBranch();
      const currentBranch = branchResult.ok ? branchResult.value : 'unknown';
      logger.warn('[ConvertWorktreeService] Not on main branch', { currentBranch });
      return {
        ok: false,
        error: { type: 'NOT_ON_MAIN_BRANCH', currentBranch },
      };
    }

    // 2. Check if spec exists
    // Requirements: 5.2
    try {
      const specJsonPath = path.join(specPath, 'spec.json');
      await this.fs.access(specJsonPath);
    } catch {
      logger.warn('[ConvertWorktreeService] Spec not found', { specPath });
      return {
        ok: false,
        error: { type: 'SPEC_NOT_FOUND', specPath },
      };
    }

    // 3. Read spec.json and validate
    const specJsonResult = await this.fileService.readSpecJson(specPath);
    if (!specJsonResult.ok) {
      logger.warn('[ConvertWorktreeService] Failed to read spec.json', { specPath });
      return {
        ok: false,
        error: { type: 'SPEC_NOT_FOUND', specPath },
      };
    }

    const specJson = specJsonResult.value;

    // 4. Check if already in worktree mode (has worktree.path)
    // Requirements: 5.3
    if (hasWorktreePath(specJson)) {
      logger.warn('[ConvertWorktreeService] Already in worktree mode', { specPath });
      return {
        ok: false,
        error: { type: 'ALREADY_WORKTREE_MODE', specPath },
      };
    }

    // 5. Check if impl already started (has worktree.branch but no path)
    // Requirements: 5.4
    if (isImplStarted(specJson)) {
      logger.warn('[ConvertWorktreeService] Impl already started', { specPath });
      return {
        ok: false,
        error: { type: 'IMPL_ALREADY_STARTED', specPath },
      };
    }

    logger.info('[ConvertWorktreeService] Spec can be converted', { specPath });
    return { ok: true, value: true };
  }

  /**
   * Convert a normal spec to worktree mode
   * Requirements: 2.1
   *
   * Processing order:
   * 1. Pre-validation (main branch, impl not started, not worktree mode)
   * 2. git branch feature/{featureName} creation
   * 3. git worktree add .kiro/worktrees/specs/{featureName} feature/{featureName}
   * 4. Move spec directory to worktree's .kiro/specs/{featureName}
   * 5. Create logs/runtime symlinks
   * 6. Update spec.json with worktree config
   *
   * @param projectPath - Project root path
   * @param specPath - Spec directory path
   * @param featureName - Feature name
   * @returns WorktreeInfo on success
   */
  async convertToWorktree(
    projectPath: string,
    specPath: string,
    featureName: string
  ): Promise<ConvertResult<WorktreeInfo>> {
    logger.info('[ConvertWorktreeService] convertToWorktree started', {
      projectPath,
      specPath,
      featureName,
    });

    // Step 0: Pre-validation
    const canConvertResult = await this.canConvert(projectPath, specPath);
    if (!canConvertResult.ok) {
      return canConvertResult;
    }

    // Step 1: Create worktree (branch + worktree add)
    // Requirements: 2.1 (Step 1, 2)
    const createResult = await this.worktreeService.createWorktree(featureName);
    if (!createResult.ok) {
      const errorMessage = 'message' in createResult.error
        ? (createResult.error as { message: string }).message
        : createResult.error.type;
      logger.error('[ConvertWorktreeService] Failed to create worktree', {
        featureName,
        error: createResult.error,
      });
      return {
        ok: false,
        error: { type: 'WORKTREE_CREATE_FAILED', message: errorMessage },
      };
    }

    const worktreeInfo = createResult.value;

    // Step 2: Move spec files to worktree
    // Requirements: 2.1 (Step 4)
    try {
      const worktreeSpecPath = path.join(
        worktreeInfo.absolutePath,
        '.kiro',
        'specs',
        featureName
      );

      // Create destination directory
      await this.fs.mkdir(path.dirname(worktreeSpecPath), { recursive: true });

      // Copy spec directory to worktree
      await this.fs.cp(specPath, worktreeSpecPath, { recursive: true });

      // Remove original spec directory
      await this.fs.rm(specPath, { recursive: true, force: true });

      logger.info('[ConvertWorktreeService] Spec files moved to worktree', {
        from: specPath,
        to: worktreeSpecPath,
      });
    } catch (error) {
      // Rollback: remove worktree
      logger.error('[ConvertWorktreeService] Failed to move spec files, rolling back', {
        featureName,
        error: error instanceof Error ? error.message : String(error),
      });
      await this.rollbackWorktree(featureName);
      return {
        ok: false,
        error: {
          type: 'FILE_MOVE_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }

    // Step 3: Create symlinks for logs/runtime
    // Requirements: 2.1 (Step 5)
    const symlinkResult = await this.worktreeService.createSymlinksForWorktree(
      worktreeInfo.absolutePath,
      featureName
    );
    if (!symlinkResult.ok) {
      // Note: At this point, original spec files have been moved
      // We could try to restore them, but for now we just log the error
      logger.error('[ConvertWorktreeService] Failed to create symlinks', {
        featureName,
        error: symlinkResult.error,
      });
      // Rollback is complex here because files are already moved
      // For now, we report the error but the worktree is partially set up
      return {
        ok: false,
        error: {
          type: 'SYMLINK_CREATE_FAILED',
          message: 'message' in symlinkResult.error
            ? (symlinkResult.error as { message: string }).message
            : symlinkResult.error.type,
        },
      };
    }

    // Step 4: Update spec.json with worktree config
    // Requirements: 2.1 (Step 6)
    const newSpecPath = path.join(
      worktreeInfo.absolutePath,
      '.kiro',
      'specs',
      featureName
    );
    const updateResult = await this.fileService.updateSpecJson(newSpecPath, {
      worktree: {
        path: worktreeInfo.path,
        branch: worktreeInfo.branch,
        created_at: worktreeInfo.created_at,
        enabled: true,
      },
    });

    if (!updateResult.ok) {
      logger.error('[ConvertWorktreeService] Failed to update spec.json', {
        featureName,
        error: updateResult.error,
      });
      return {
        ok: false,
        error: {
          type: 'SPEC_JSON_UPDATE_FAILED',
          message: 'message' in updateResult.error
            ? (updateResult.error as { message?: string }).message || 'unknown'
            : updateResult.error.type,
        },
      };
    }

    logger.info('[ConvertWorktreeService] Conversion completed successfully', {
      featureName,
      worktreePath: worktreeInfo.path,
    });

    return { ok: true, value: worktreeInfo };
  }

  /**
   * Rollback worktree creation
   * @param featureName - Feature name
   */
  private async rollbackWorktree(featureName: string): Promise<void> {
    logger.warn('[ConvertWorktreeService] Rolling back worktree', { featureName });
    try {
      await this.worktreeService.removeWorktree(featureName);
      logger.info('[ConvertWorktreeService] Rollback completed', { featureName });
    } catch (error) {
      logger.error('[ConvertWorktreeService] Rollback failed', {
        featureName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
