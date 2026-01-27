/**
 * ConvertBugWorktreeService
 * Bug を Worktree モードに変換する処理を統括
 * bug-worktree-spec-alignment: Spec の ConvertWorktreeService と同等の動作を Bug に適用
 *
 * Requirements: 1.1-1.4, 2.1-2.3, 3.1-3.4, 4.1-4.4, 5.1-5.4
 */

import * as path from 'path';
import * as fsPromises from 'fs/promises';
import { logger } from './logger';
import type { WorktreeService } from './worktreeService';
import type { BugService } from './bugService';
import type { EventLogService } from './eventLogService';
import type { WorktreeInfo } from '../../renderer/types/worktree';

/**
 * Bug の git コミット状態
 * Requirements: 1.1, 1.2, 1.3, 1.4 (bug-worktree-spec-alignment)
 *
 * - untracked: 未コミット（untracked または staged）
 * - committed-clean: コミット済み・差分なし
 * - committed-dirty: コミット済み・差分あり
 */
export type BugCommitStatus = 'untracked' | 'committed-clean' | 'committed-dirty';

/**
 * Error types for ConvertBugWorktreeService operations
 * Requirements: 5.1, 5.2, 5.3, 5.4 (bug-worktree-spec-alignment)
 */
export type ConvertBugError =
  | { type: 'NOT_ON_MAIN_BRANCH'; currentBranch: string }
  | { type: 'BUG_NOT_FOUND'; bugPath: string }
  | { type: 'ALREADY_WORKTREE_MODE'; bugPath: string }
  | { type: 'BUG_HAS_UNCOMMITTED_CHANGES'; bugPath: string; files: string[] }
  | { type: 'BRANCH_CREATE_FAILED'; message: string }
  | { type: 'WORKTREE_CREATE_FAILED'; message: string }
  | { type: 'FILE_MOVE_FAILED'; message: string }
  | { type: 'SYMLINK_CREATE_FAILED'; message: string }
  | { type: 'BUG_JSON_UPDATE_FAILED'; message: string }
  | { type: 'BUG_NOT_IN_WORKTREE'; bugPath: string };

/**
 * Result type for ConvertBugWorktreeService operations
 */
export type ConvertBugResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ConvertBugError };

/**
 * File system operations interface for dependency injection
 */
export interface FsPromisesInterface {
  access(path: string): Promise<void>;
  mkdir(path: string, options?: { recursive: boolean }): Promise<string | undefined>;
  cp(src: string, dest: string, options?: { recursive: boolean }): Promise<void>;
  rm(path: string, options?: { recursive: boolean; force?: boolean }): Promise<void>;
}

/**
 * Get user-friendly error message for ConvertBugError
 * Requirements: 5.1-5.4 (bug-worktree-spec-alignment)
 */
export function getConvertBugErrorMessage(error: ConvertBugError): string {
  switch (error.type) {
    case 'NOT_ON_MAIN_BRANCH':
      return `mainブランチでのみ変換できます。現在: ${error.currentBranch}`;
    case 'BUG_NOT_FOUND':
      return 'Bugが見つかりません';
    case 'ALREADY_WORKTREE_MODE':
      return '既にWorktreeモードです';
    case 'BUG_HAS_UNCOMMITTED_CHANGES':
      return `Bugに未コミットの変更があります。先にコミットしてください。\n変更ファイル: ${error.files.join(', ')}`;
    case 'BUG_NOT_IN_WORKTREE':
      return `Worktree内にBugが見つかりません: ${error.bugPath}`;
    case 'BRANCH_CREATE_FAILED':
      return `ブランチ作成に失敗しました: ${error.message}`;
    case 'WORKTREE_CREATE_FAILED':
      return `Worktree作成に失敗しました: ${error.message}`;
    case 'FILE_MOVE_FAILED':
      return `ファイル移動に失敗しました: ${error.message}`;
    case 'SYMLINK_CREATE_FAILED':
      return `シンボリックリンク作成に失敗しました: ${error.message}`;
    case 'BUG_JSON_UPDATE_FAILED':
      return `bug.json更新に失敗しました: ${error.message}`;
    default:
      return '不明なエラーが発生しました';
  }
}

/**
 * ConvertBugWorktreeService class
 * Handles conversion of Bug to Worktree mode
 * Requirements: 1.1-1.4, 2.1-2.3, 3.1-3.4, 4.1-4.4, 5.1-5.4
 */
export class ConvertBugWorktreeService {
  private worktreeService: WorktreeService;
  private bugService: BugService;
  private eventLogService: EventLogService | null;
  private fs: FsPromisesInterface;

  constructor(
    worktreeService: WorktreeService,
    bugService: BugService,
    fsPromisesOverride?: FsPromisesInterface,
    eventLogService?: EventLogService
  ) {
    this.worktreeService = worktreeService;
    this.bugService = bugService;
    this.eventLogService = eventLogService || null;
    this.fs = fsPromisesOverride || fsPromises;
  }

  // ============================================================
  // Task 2.2: getBugStatus() - Bug の git コミット状態を取得
  // Requirements: 1.1, 1.2, 1.3, 1.4
  // ============================================================

  /**
   * Bug の git コミット状態を取得する
   * Requirements: 1.1, 1.2, 1.3, 1.4 (bug-worktree-spec-alignment)
   *
   * @param bugPath - Bug ディレクトリの相対パス（.kiro/bugs/{bugName}）
   * @returns BugCommitStatus
   *
   * 判定ロジック:
   * 1. git status --porcelain bugPath を実行
   * 2. 出力が空 → committed-clean
   * 3. 出力に ?? または A がある → untracked（未コミット）
   * 4. 出力に M, D, R 等がある → committed-dirty（差分あり）
   * 5. 複数状態混在時: committed-dirty > untracked > committed-clean
   */
  async getBugStatus(bugPath: string): Promise<ConvertBugResult<BugCommitStatus>> {
    logger.debug('[ConvertBugWorktreeService] getBugStatus called', { bugPath });

    const result = await this.worktreeService.checkUncommittedBugChanges(bugPath);
    if (!result.ok) {
      // Propagate git error
      return {
        ok: false,
        error: { type: 'BUG_NOT_FOUND', bugPath },
      };
    }

    const { statusOutput } = result.value;

    // 出力が空 → committed-clean
    if (!statusOutput || statusOutput.trim() === '') {
      logger.debug('[ConvertBugWorktreeService] Bug status: committed-clean', { bugPath });
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
      logger.debug('[ConvertBugWorktreeService] Bug status: committed-dirty', { bugPath });
      return { ok: true, value: 'committed-dirty' };
    }

    if (hasUntracked) {
      logger.debug('[ConvertBugWorktreeService] Bug status: untracked', { bugPath });
      return { ok: true, value: 'untracked' };
    }

    // Default to committed-clean if no matches (shouldn't happen with non-empty output)
    logger.debug('[ConvertBugWorktreeService] Bug status: committed-clean (fallback)', { bugPath });
    return { ok: true, value: 'committed-clean' };
  }

  // ============================================================
  // Task 2.3: canConvert() - Bug を Worktree に変換可能かチェック
  // Requirements: 1.2, 1.3, 1.4, 5.1
  // ============================================================

  /**
   * Check if a bug can be converted to worktree mode
   * Requirements: 1.2, 1.3, 1.4, 5.1 (bug-worktree-spec-alignment)
   *
   * @param projectPath - Project root path
   * @param bugPath - Bug directory path
   * @returns true if convertible, error otherwise
   */
  async canConvert(
    projectPath: string,
    bugPath: string
  ): Promise<ConvertBugResult<boolean>> {
    logger.debug('[ConvertBugWorktreeService] canConvert called', { projectPath, bugPath });

    // 1. Check if on main branch
    const isMainResult = await this.worktreeService.isOnMainBranch();
    if (!isMainResult.ok) {
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
      logger.warn('[ConvertBugWorktreeService] Not on main branch', { currentBranch });
      return {
        ok: false,
        error: { type: 'NOT_ON_MAIN_BRANCH', currentBranch },
      };
    }

    // 2. Check if bug exists (bug.json)
    try {
      const bugJsonPath = path.join(bugPath, 'bug.json');
      await this.fs.access(bugJsonPath);
    } catch {
      logger.warn('[ConvertBugWorktreeService] Bug not found', { bugPath });
      return {
        ok: false,
        error: { type: 'BUG_NOT_FOUND', bugPath },
      };
    }

    // 3. Read bug.json and validate
    const bugJsonResult = await this.bugService.readBugJson(bugPath);
    if (!bugJsonResult.ok || bugJsonResult.value === null) {
      logger.warn('[ConvertBugWorktreeService] Failed to read bug.json', { bugPath });
      return {
        ok: false,
        error: { type: 'BUG_NOT_FOUND', bugPath },
      };
    }

    const bugJson = bugJsonResult.value;

    // 4. Check if already in worktree mode (has worktree field)
    if (bugJson.worktree) {
      logger.warn('[ConvertBugWorktreeService] Already in worktree mode', { bugPath });
      return {
        ok: false,
        error: { type: 'ALREADY_WORKTREE_MODE', bugPath },
      };
    }

    // 5. Check bug commit status
    // Requirements: 1.4 - コミット済み・差分ありの場合はエラー
    const statusResult = await this.getBugStatus(bugPath);
    if (!statusResult.ok) {
      return statusResult;
    }

    if (statusResult.value === 'committed-dirty') {
      // Get changed files list for error message
      const changesResult = await this.worktreeService.checkUncommittedBugChanges(bugPath);
      const files = changesResult.ok ? changesResult.value.files : [];
      logger.warn('[ConvertBugWorktreeService] Bug has uncommitted changes', { bugPath, files });
      return {
        ok: false,
        error: { type: 'BUG_HAS_UNCOMMITTED_CHANGES', bugPath, files },
      };
    }

    logger.info('[ConvertBugWorktreeService] Bug can be converted', { bugPath, status: statusResult.value });
    return { ok: true, value: true };
  }

  // ============================================================
  // Task 2.4 & 2.5 & 2.6: convertToWorktree() - Bug を Worktree モードに変換
  // Requirements: 2.1-2.3, 3.1-3.4, 4.1-4.4, 5.1-5.4
  // ============================================================

  /**
   * Convert a bug to worktree mode
   * Requirements: 2.1-2.3, 3.1-3.4, 4.1-4.4, 5.1-5.4
   *
   * Processing order:
   * 1. Pre-validation (main branch, bug exists, not worktree mode, not committed-dirty)
   * 2. Get bug status (untracked or committed-clean)
   * 3. git branch bugfix/{bugName} creation
   * 4. git worktree add .kiro/worktrees/bugs/{bugName} bugfix/{bugName}
   * 5. Move bug directory to worktree's .kiro/bugs/{bugName} (untracked only)
   * 6. Verify bug exists in worktree (committed-clean only)
   * 7. Create logs/runtime symlinks
   * 8. Update bug.json with worktree config
   *
   * @param projectPath - Project root path
   * @param bugPath - Bug directory path
   * @param bugName - Bug name
   * @returns WorktreeInfo on success
   */
  async convertToWorktree(
    projectPath: string,
    bugPath: string,
    bugName: string
  ): Promise<ConvertBugResult<WorktreeInfo>> {
    logger.info('[ConvertBugWorktreeService] convertToWorktree started', {
      projectPath,
      bugPath,
      bugName,
    });

    // Step 0: Pre-validation (includes committed-dirty check)
    const canConvertResult = await this.canConvert(projectPath, bugPath);
    if (!canConvertResult.ok) {
      return canConvertResult;
    }

    // Step 1: Get bug status for conditional processing
    const statusResult = await this.getBugStatus(bugPath);
    if (!statusResult.ok) {
      return statusResult;
    }
    const bugStatus = statusResult.value;
    logger.info('[ConvertBugWorktreeService] Bug status determined', { bugPath, bugStatus });

    // Step 2: Create worktree (branch + worktree add)
    const createResult = await this.worktreeService.createBugWorktree(bugName);
    if (!createResult.ok) {
      const errorMessage = 'message' in createResult.error
        ? (createResult.error as { message: string }).message
        : createResult.error.type;
      logger.error('[ConvertBugWorktreeService] Failed to create worktree', {
        bugName,
        error: createResult.error,
      });
      return {
        ok: false,
        error: { type: 'WORKTREE_CREATE_FAILED', message: errorMessage },
      };
    }

    const worktreeInfo = createResult.value;
    const worktreeBugPath = path.join(
      worktreeInfo.absolutePath,
      '.kiro',
      'bugs',
      bugName
    );

    // Step 3: Bug file handling based on status
    let copiedFiles: string[] = [];
    if (bugStatus === 'untracked') {
      // Task 2.5: 未コミット bug の移動処理
      // Requirements: 2.1, 2.2, 2.3
      try {
        // Create destination directory
        await this.fs.mkdir(path.dirname(worktreeBugPath), { recursive: true });

        // Copy bug directory to worktree
        await this.fs.cp(bugPath, worktreeBugPath, { recursive: true });

        // Collect list of copied files (relative to bug directory)
        copiedFiles = ['bug.json', 'report.md', 'analysis.md', 'fix.md', 'verification.md', 'events.jsonl'];

        // Remove original bug directory (after successful copy)
        await this.fs.rm(bugPath, { recursive: true, force: true });

        logger.info('[ConvertBugWorktreeService] Bug files moved to worktree (untracked)', {
          from: bugPath,
          to: worktreeBugPath,
          copiedFiles,
        });
      } catch (error) {
        // Rollback: remove worktree
        logger.error('[ConvertBugWorktreeService] Failed to move bug files, rolling back', {
          bugName,
          error: error instanceof Error ? error.message : String(error),
        });
        await this.rollbackWorktree(bugName);
        return {
          ok: false,
          error: {
            type: 'FILE_MOVE_FAILED',
            message: error instanceof Error ? error.message : String(error),
          },
        };
      }
    } else if (bugStatus === 'committed-clean') {
      // Task 2.5: コミット済み・差分なし bug のスキップ処理
      // Requirements: 3.1, 3.2, 3.3
      // コピー処理をスキップ（git worktree作成で自動含有）
      // main側のbugディレクトリを削除しない
      logger.info('[ConvertBugWorktreeService] Skipping bug move (committed-clean)', {
        bugPath,
        worktreeBugPath,
      });

      // Verify bug exists in worktree after creation
      // Requirements: 3.3
      try {
        const worktreeBugJsonPath = path.join(worktreeBugPath, 'bug.json');
        await this.fs.access(worktreeBugJsonPath);
        logger.debug('[ConvertBugWorktreeService] Bug verified in worktree', { worktreeBugJsonPath });
      } catch {
        logger.error('[ConvertBugWorktreeService] Bug not found in worktree after creation', {
          worktreeBugPath,
        });
        await this.rollbackWorktree(bugName);
        return {
          ok: false,
          error: { type: 'BUG_NOT_IN_WORKTREE', bugPath: worktreeBugPath },
        };
      }
    }

    // Step 4: Create symlinks for logs/runtime
    // Requirements: 4.1, 4.2, 4.3, 4.4
    const symlinkResult = await this.worktreeService.createSymlinksForWorktree(
      worktreeInfo.absolutePath,
      bugName
    );
    if (!symlinkResult.ok) {
      logger.error('[ConvertBugWorktreeService] Failed to create symlinks', {
        bugName,
        error: symlinkResult.error,
      });
      // Note: At this point, original bug files may have been moved (untracked case)
      // We report the error but the worktree is partially set up
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

    // Step 5: Update bug.json with worktree config
    const updateResult = await this.bugService.addWorktreeField(worktreeBugPath, {
      path: worktreeInfo.path,
      branch: worktreeInfo.branch,
      created_at: worktreeInfo.created_at,
    });

    if (!updateResult.ok) {
      logger.error('[ConvertBugWorktreeService] Failed to update bug.json', {
        bugName,
        error: updateResult.error,
      });
      return {
        ok: false,
        error: {
          type: 'BUG_JSON_UPDATE_FAILED',
          message: 'message' in updateResult.error
            ? (updateResult.error as { message?: string }).message || 'unknown'
            : updateResult.error.type,
        },
      };
    }

    logger.info('[ConvertBugWorktreeService] Conversion completed successfully', {
      bugName,
      worktreePath: worktreeInfo.path,
    });

    // Log worktree:create event with conversion details
    if (this.eventLogService) {
      await this.eventLogService.logBugEvent(projectPath, bugName, {
        type: 'worktree:create',
        message: `Worktreeモードに変換: ${bugStatus === 'untracked' ? 'Bugファイルをコピー' : 'コミット済みBugを利用'}`,
        worktreePath: worktreeInfo.path,
        branch: worktreeInfo.branch,
        specStatus: bugStatus,
        copiedFiles: copiedFiles.length > 0 ? copiedFiles : undefined,
        notes: bugStatus === 'committed-clean' ? 'コミット済みBugはgit worktreeに自動的に含まれます' : undefined,
      });
    }

    return { ok: true, value: worktreeInfo };
  }

  /**
   * Rollback worktree creation
   * @param bugName - Bug name
   */
  private async rollbackWorktree(bugName: string): Promise<void> {
    logger.warn('[ConvertBugWorktreeService] Rolling back worktree', { bugName });
    try {
      await this.worktreeService.removeBugWorktree(bugName);
      logger.info('[ConvertBugWorktreeService] Rollback completed', { bugName });
    } catch (error) {
      logger.error('[ConvertBugWorktreeService] Rollback failed', {
        bugName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
