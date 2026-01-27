/**
 * ConvertWorktreeService
 * 通常SpecからWorktreeモードへの変換処理を統括
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 * (convert-spec-to-worktree feature)
 *
 * worktree-convert-spec-optimization:
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3
 */

import * as path from 'path';
import * as fsPromises from 'fs/promises';
import { logger } from './logger';
import type { WorktreeService } from './worktreeService';
import type { FileService } from './fileService';
import type { EventLogService } from './eventLogService';
import type { WorktreeInfo } from '../../renderer/types/worktree';
import { hasWorktreePath, isImplStarted } from '../../renderer/types/worktree';

/**
 * Specのgitコミット状態
 * Requirements: 1.2 (worktree-convert-spec-optimization)
 *
 * - untracked: 未コミット（untracked または staged）
 * - committed-clean: コミット済み・差分なし
 * - committed-dirty: コミット済み・差分あり
 */
export type SpecCommitStatus = 'untracked' | 'committed-clean' | 'committed-dirty';

/**
 * Error types for ConvertWorktreeService operations
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6 (convert-spec-to-worktree)
 * Requirements: 4.2 (worktree-convert-spec-optimization - 新規エラータイプ追加)
 */
export type ConvertError =
  | { type: 'NOT_ON_MAIN_BRANCH'; currentBranch: string }
  | { type: 'SPEC_NOT_FOUND'; specPath: string }
  | { type: 'ALREADY_WORKTREE_MODE'; specPath: string }
  | { type: 'IMPL_ALREADY_STARTED'; specPath: string }
  | { type: 'SPEC_HAS_UNCOMMITTED_CHANGES'; specPath: string; files: string[] } // worktree-convert-spec-optimization: 新規
  | { type: 'BRANCH_CREATE_FAILED'; message: string }
  | { type: 'WORKTREE_CREATE_FAILED'; message: string }
  | { type: 'FILE_MOVE_FAILED'; message: string }
  | { type: 'SYMLINK_CREATE_FAILED'; message: string }
  | { type: 'SPEC_JSON_UPDATE_FAILED'; message: string }
  | { type: 'SPEC_NOT_IN_WORKTREE'; specPath: string }; // worktree-convert-spec-optimization: 新規

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
 * Requirements: 5.1-5.6 (convert-spec-to-worktree)
 * Requirements: 4.2 (worktree-convert-spec-optimization)
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
    // worktree-convert-spec-optimization: 新規エラータイプ
    case 'SPEC_HAS_UNCOMMITTED_CHANGES':
      return `Specに未コミットの変更があります。先にコミットしてください。\n変更ファイル: ${error.files.join(', ')}`;
    case 'SPEC_NOT_IN_WORKTREE':
      return `Worktree内にSpecが見つかりません: ${error.specPath}`;
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
 * Requirements: 2.1, 2.2, 2.3, 2.4, 5.1-5.6 (convert-spec-to-worktree)
 * worktree-convert-spec-optimization: 1.1, 1.2, 1.3, 2.1-2.3, 3.1-3.3, 4.1, 4.3
 */
export class ConvertWorktreeService {
  private worktreeService: WorktreeService;
  private fileService: FileService;
  private eventLogService: EventLogService | null;
  private fs: FsPromisesInterface;

  constructor(
    worktreeService: WorktreeService,
    fileService: FileService,
    fsPromisesOverride?: FsPromisesInterface,
    eventLogService?: EventLogService
  ) {
    this.worktreeService = worktreeService;
    this.fileService = fileService;
    this.eventLogService = eventLogService || null;
    this.fs = fsPromisesOverride || fsPromises;
  }

  // ============================================================
  // worktree-convert-spec-optimization: Task 1.2
  // getSpecStatus() - Specのgitコミット状態を取得
  // Requirements: 1.1, 1.2, 1.3
  // ============================================================

  /**
   * Specのgitコミット状態を取得する
   * Requirements: 1.1, 1.2, 1.3 (worktree-convert-spec-optimization)
   *
   * @param specPath - Specディレクトリの相対パス（.kiro/specs/{feature}）
   * @returns SpecCommitStatus
   *
   * 判定ロジック:
   * 1. git status --porcelain specPath を実行
   * 2. 出力が空 → committed-clean
   * 3. 出力に ?? または A がある → untracked（未コミット）
   * 4. 出力に M, D, R 等がある → committed-dirty（差分あり）
   * 5. 複数状態混在時: committed-dirty > untracked > committed-clean
   */
  async getSpecStatus(specPath: string): Promise<ConvertResult<SpecCommitStatus>> {
    logger.debug('[ConvertWorktreeService] getSpecStatus called', { specPath });

    const result = await this.worktreeService.checkUncommittedSpecChanges(specPath);
    if (!result.ok) {
      // Propagate git error
      return {
        ok: false,
        error: { type: 'SPEC_NOT_FOUND', specPath },
      };
    }

    const { statusOutput } = result.value;

    // 出力が空 → committed-clean
    if (!statusOutput || statusOutput.trim() === '') {
      logger.debug('[ConvertWorktreeService] Spec status: committed-clean', { specPath });
      return { ok: true, value: 'committed-clean' };
    }

    // Parse each line to determine status
    // git status --porcelain format: XY filename
    // X = index status, Y = worktree status
    const lines = statusOutput.split('\n').filter(line => line.trim());

    let hasUntracked = false;
    let hasModified = false;

    for (const line of lines) {
      const xy = line.slice(0, 2);
      const x = xy[0]; // index status
      const y = xy[1]; // worktree status

      // Check for untracked: ?? or staged new file: A
      if (xy === '??') {
        hasUntracked = true;
        continue;
      }
      if (x === 'A' && y === ' ') {
        hasUntracked = true;
        continue;
      }

      // Check for modified/deleted/renamed (committed-dirty)
      // M, D, R in either X or Y position (except A which is handled above)
      if (x === 'M' || x === 'D' || x === 'R' || y === 'M' || y === 'D' || y === 'R') {
        hasModified = true;
      }
    }

    // Priority: committed-dirty > untracked > committed-clean
    if (hasModified) {
      logger.debug('[ConvertWorktreeService] Spec status: committed-dirty', { specPath });
      return { ok: true, value: 'committed-dirty' };
    }

    if (hasUntracked) {
      logger.debug('[ConvertWorktreeService] Spec status: untracked', { specPath });
      return { ok: true, value: 'untracked' };
    }

    // Default to committed-clean if no matches (shouldn't happen with non-empty output)
    logger.debug('[ConvertWorktreeService] Spec status: committed-clean (fallback)', { specPath });
    return { ok: true, value: 'committed-clean' };
  }

  /**
   * Check if a spec can be converted to worktree mode
   * Requirements: 2.2, 5.1, 5.2, 5.3, 5.4 (convert-spec-to-worktree)
   * worktree-convert-spec-optimization: 4.1, 4.3 (committed-dirty check)
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

    // 6. worktree-convert-spec-optimization: Check spec commit status
    // Requirements: 4.1, 4.3 - コミット済み・差分ありの場合はエラー
    const statusResult = await this.getSpecStatus(specPath);
    if (!statusResult.ok) {
      return statusResult;
    }

    if (statusResult.value === 'committed-dirty') {
      // Get changed files list for error message
      const changesResult = await this.worktreeService.checkUncommittedSpecChanges(specPath);
      const files = changesResult.ok ? changesResult.value.files : [];
      logger.warn('[ConvertWorktreeService] Spec has uncommitted changes', { specPath, files });
      return {
        ok: false,
        error: { type: 'SPEC_HAS_UNCOMMITTED_CHANGES', specPath, files },
      };
    }

    logger.info('[ConvertWorktreeService] Spec can be converted', { specPath, status: statusResult.value });
    return { ok: true, value: true };
  }

  /**
   * Convert a normal spec to worktree mode
   * Requirements: 2.1 (convert-spec-to-worktree)
   * worktree-convert-spec-optimization: 2.1-2.3, 3.1-3.3
   *
   * Processing order:
   * 1. Pre-validation (main branch, impl not started, not worktree mode, not committed-dirty)
   * 2. Get spec status (untracked or committed-clean)
   * 3. git branch feature/{featureName} creation
   * 4. git worktree add .kiro/worktrees/specs/{featureName} feature/{featureName}
   * 5. Move spec directory to worktree's .kiro/specs/{featureName} (untracked only)
   * 6. Verify spec exists in worktree (committed-clean only)
   * 7. Create logs/runtime symlinks
   * 8. Update spec.json with worktree config
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

    // Step 0: Pre-validation (includes committed-dirty check)
    const canConvertResult = await this.canConvert(projectPath, specPath);
    if (!canConvertResult.ok) {
      return canConvertResult;
    }

    // Step 1: Get spec status for conditional processing
    // worktree-convert-spec-optimization: Requirements 2.1, 3.1
    const statusResult = await this.getSpecStatus(specPath);
    if (!statusResult.ok) {
      return statusResult;
    }
    const specStatus = statusResult.value;
    logger.info('[ConvertWorktreeService] Spec status determined', { specPath, specStatus });

    // Step 2: Create worktree (branch + worktree add)
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
    const worktreeSpecPath = path.join(
      worktreeInfo.absolutePath,
      '.kiro',
      'specs',
      featureName
    );

    // Step 3: Spec file handling based on status
    // worktree-convert-spec-optimization: Requirements 2.1-2.3, 3.1-3.3
    let copiedFiles: string[] = [];
    if (specStatus === 'untracked') {
      // Task 3.1: 未コミットspecの移動処理
      // Requirements: 2.1, 2.2, 2.3
      try {
        // Create destination directory
        await this.fs.mkdir(path.dirname(worktreeSpecPath), { recursive: true });

        // Copy spec directory to worktree
        await this.fs.cp(specPath, worktreeSpecPath, { recursive: true });

        // Collect list of copied files (relative to spec directory)
        copiedFiles = ['spec.json', 'requirements.md', 'design.md', 'tasks.md', 'research.md', 'events.jsonl'];

        // Remove original spec directory (after successful copy)
        await this.fs.rm(specPath, { recursive: true, force: true });

        logger.info('[ConvertWorktreeService] Spec files moved to worktree (untracked)', {
          from: specPath,
          to: worktreeSpecPath,
          copiedFiles,
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
    } else if (specStatus === 'committed-clean') {
      // Task 3.2: コミット済み・差分なしspecのスキップ処理
      // Requirements: 3.1, 3.2, 3.3
      // コピー処理をスキップ（git worktree作成で自動含有）
      // main側のspecディレクトリを削除しない
      logger.info('[ConvertWorktreeService] Skipping spec move (committed-clean)', {
        specPath,
        worktreeSpecPath,
      });

      // Verify spec exists in worktree after creation
      // Requirements: 3.3
      try {
        const worktreeSpecJsonPath = path.join(worktreeSpecPath, 'spec.json');
        await this.fs.access(worktreeSpecJsonPath);
        logger.debug('[ConvertWorktreeService] Spec verified in worktree', { worktreeSpecJsonPath });
      } catch {
        logger.error('[ConvertWorktreeService] Spec not found in worktree after creation', {
          worktreeSpecPath,
        });
        await this.rollbackWorktree(featureName);
        return {
          ok: false,
          error: { type: 'SPEC_NOT_IN_WORKTREE', specPath: worktreeSpecPath },
        };
      }
    }

    // Step 4: Create symlinks for logs/runtime
    // Requirements: 2.1 (Step 5)
    const symlinkResult = await this.worktreeService.createSymlinksForWorktree(
      worktreeInfo.absolutePath,
      featureName
    );
    if (!symlinkResult.ok) {
      // Note: At this point, original spec files may have been moved (untracked case)
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

    // Log worktree:create event with conversion details
    if (this.eventLogService) {
      await this.eventLogService.logEvent(projectPath, featureName, {
        type: 'worktree:create',
        message: `Worktreeモードに変換: ${specStatus === 'untracked' ? 'Specファイルをコピー' : 'コミット済みSpecを利用'}`,
        worktreePath: worktreeInfo.path,
        branch: worktreeInfo.branch,
        specStatus,
        copiedFiles: copiedFiles.length > 0 ? copiedFiles : undefined,
        notes: specStatus === 'committed-clean' ? 'コミット済みSpecはgit worktreeに自動的に含まれます' : undefined,
      });
    }

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
