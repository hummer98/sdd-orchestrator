/**
 * WorktreeService
 * Git worktree operations wrapper for Spec-Driven Development
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7, 7.6, 7.7, 8.1, 8.2 (git-worktree-support)
 * Requirements: 3.1, 3.3, 3.4, 4.6 (bugs-worktree-support)
 * Requirements: 2.1, 2.2, 2.3, 2.4, 4.1 (worktree-spec-symlink)
 */

import { exec as nodeExec } from 'child_process';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { logger } from './logger';
import type {
  WorktreeConfig,
  WorktreeInfo,
  WorktreeServiceResult,
} from '../../renderer/types/worktree';
import type { EntityType } from './worktreeHelpers';
import { getWorktreeBasePath as getWorktreeBasePathHelper } from './worktreeHelpers';
// spec-event-log: Event logging for worktree operations
import { getDefaultEventLogService } from './eventLogService';
import type { EventLogInput } from '../../shared/types';

/**
 * Type for exec function for dependency injection
 * Matches Node.js child_process.exec callback signature
 */
export type ExecFunction = (
  command: string,
  options: { cwd: string },
  callback: (error: Error | null, stdout: string, stderr: string) => void
) => { kill: () => void };

/**
 * Git branch name forbidden characters and patterns
 * Based on git-check-ref-format rules
 */
const FORBIDDEN_CHARS = /[\s~^:?*\[\]\\]/;
const CONSECUTIVE_DOTS = /\.\./;
const AT_BRACE = /@\{/;

/**
 * Validate if a feature name is valid for git branch naming
 * Requirements: 1.3, 1.4 (design.md - INVALID_FEATURE_NAME error)
 *
 * @param featureName - Feature name to validate
 * @returns true if valid, false otherwise
 */
export function isValidFeatureName(featureName: string): boolean {
  if (!featureName || featureName.length === 0) {
    return false;
  }

  // Check for forbidden characters
  if (FORBIDDEN_CHARS.test(featureName)) {
    return false;
  }

  // Check for consecutive dots
  if (CONSECUTIVE_DOTS.test(featureName)) {
    return false;
  }

  // Check for @{
  if (AT_BRACE.test(featureName)) {
    return false;
  }

  // Check for leading/trailing dots
  if (featureName.startsWith('.') || featureName.endsWith('.')) {
    return false;
  }

  return true;
}

/**
 * Validate feature name and return Result type
 *
 * @param featureName - Feature name to validate
 * @returns Result with void on success, WorktreeError on failure
 */
export function validateFeatureName(featureName: string): WorktreeServiceResult<void> {
  if (!isValidFeatureName(featureName)) {
    return {
      ok: false,
      error: {
        type: 'INVALID_FEATURE_NAME',
        featureName,
        reason: 'Feature name contains invalid characters for git branch naming',
      },
    };
  }
  return { ok: true, value: undefined };
}

/**
 * WorktreeService class for git worktree operations
 * Requirements: 1.1-1.7, 7.6, 7.7, 8.1, 8.2 (git-worktree-support)
 */
export class WorktreeService {
  private projectPath: string;
  private execFn: ExecFunction;

  constructor(projectPath: string, execFn?: ExecFunction) {
    this.projectPath = projectPath;
    // Use injected exec or default to node's exec
    this.execFn = execFn || (nodeExec as unknown as ExecFunction);
  }

  // ============================================================
  // spec-event-log: Event Logging Helper
  // ============================================================

  /**
   * Log a worktree event using EventLogService
   * Fire-and-forget pattern: errors are logged but not propagated
   * Requirements: 1.6, 1.7 (spec-event-log)
   */
  private logWorktreeEvent(specId: string, event: EventLogInput): void {
    getDefaultEventLogService().logEvent(
      this.projectPath,
      specId,
      event
    ).catch(() => {
      // Errors are logged internally by EventLogService
    });
  }

  /**
   * Execute a git command in the project directory
   */
  private execGit(command: string): Promise<WorktreeServiceResult<string>> {
    return new Promise((resolve) => {
      this.execFn(
        command,
        { cwd: this.projectPath },
        (error, stdout, _stderr) => {
          if (error) {
            const message = error.message || String(error);
            logger.error('[WorktreeService] Git command failed', { command, error: message });
            resolve({
              ok: false,
              error: { type: 'GIT_ERROR', message },
            });
          } else {
            resolve({ ok: true, value: stdout.trim() });
          }
        }
      );
    });
  }

  /**
   * Wait for worktree checkout to complete by monitoring index.lock
   * worktree-checkout-not-complete: Ensures filesystem sync before returning
   *
   * @param worktreeName - Name of the worktree (used in .git/worktrees/{name}/)
   * @param timeout - Maximum wait time in milliseconds (default: 10000)
   * @returns true if checkout completed, false if timeout
   */
  private async waitForWorktreeReady(worktreeName: string, timeout = 10000): Promise<boolean> {
    const lockFile = path.join(this.projectPath, '.git', 'worktrees', worktreeName, 'index.lock');
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (!fs.existsSync(lockFile)) {
        logger.debug('[WorktreeService] Worktree checkout complete', { worktreeName, waitedMs: Date.now() - startTime });
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    logger.warn('[WorktreeService] Worktree checkout timeout', { worktreeName, timeout });
    return false;
  }

  /**
   * Get current git branch
   */
  async getCurrentBranch(): Promise<WorktreeServiceResult<string>> {
    return this.execGit('git branch --show-current');
  }

  /**
   * Check if currently on main/master/dev branch
   * Requirements: 1.1, 1.2
   */
  async isOnMainBranch(): Promise<WorktreeServiceResult<boolean>> {
    const result = await this.getCurrentBranch();
    if (!result.ok) {
      return result;
    }
    const branch = result.value;
    return { ok: true, value: branch === 'main' || branch === 'master' || branch === 'dev' };
  }

  /**
   * Get worktree path for a feature
   * Requirements: 1.1, 4.1 (worktree-internal-path)
   *
   * @param featureName - Feature name
   * @returns Object with relative and absolute paths
   *
   * 変更: .kiro/worktrees/specs/{feature} 形式に変更
   */
  getWorktreePath(featureName: string): { relative: string; absolute: string } {
    // worktree-internal-path: プロジェクト内の.kiro/worktrees/specs/に配置
    const relative = `.kiro/worktrees/specs/${featureName}`;
    const absolute = path.resolve(this.projectPath, relative);
    return { relative, absolute };
  }

  /**
   * Create a worktree for a feature
   * Requirements: 1.3, 1.4, 1.7
   *
   * @param featureName - Feature name (will be used for branch: feature/{featureName})
   * @returns WorktreeInfo on success
   */
  async createWorktree(featureName: string): Promise<WorktreeServiceResult<WorktreeInfo>> {
    // Validate feature name
    const validation = validateFeatureName(featureName);
    if (!validation.ok) {
      return validation;
    }

    // Check if on main branch
    const branchResult = await this.getCurrentBranch();
    if (!branchResult.ok) {
      return branchResult;
    }

    const currentBranch = branchResult.value;
    if (currentBranch !== 'main' && currentBranch !== 'master' && currentBranch !== 'dev') {
      return {
        ok: false,
        error: { type: 'NOT_ON_MAIN_BRANCH', currentBranch },
      };
    }

    const branchName = `feature/${featureName}`;
    const { relative: relativePath, absolute: absolutePath } = this.getWorktreePath(featureName);

    // Create the feature branch
    const createBranchResult = await this.execGit(`git branch ${branchName}`);
    if (!createBranchResult.ok) {
      // Check if branch already exists (execGit returns GIT_ERROR type)
      if (createBranchResult.error.type === 'GIT_ERROR' &&
          createBranchResult.error.message.includes('already exists')) {
        return {
          ok: false,
          error: { type: 'BRANCH_EXISTS', branch: branchName },
        };
      }
      // no-commits-recovery: Check if repo has no commits
      if (createBranchResult.error.type === 'GIT_ERROR' &&
          createBranchResult.error.message.includes('not a valid object name')) {
        return {
          ok: false,
          error: {
            type: 'NO_COMMITS_IN_REPO',
            message: 'リポジトリにコミットが存在しません。Worktreeを作成するには、最初のコミットが必要です。\n\n解決方法:\n  git add .\n  git commit -m "Initial commit"',
          },
        };
      }
      return createBranchResult;
    }

    // Create the worktree
    const createWorktreeResult = await this.execGit(`git worktree add "${absolutePath}" ${branchName}`);
    if (!createWorktreeResult.ok) {
      // Rollback: delete the branch we just created
      await this.execGit(`git branch -d ${branchName}`).catch(() => {
        logger.warn('[WorktreeService] Failed to rollback branch creation', { branchName });
      });

      // Check if worktree already exists (execGit returns GIT_ERROR type)
      if (createWorktreeResult.error.type === 'GIT_ERROR' &&
          createWorktreeResult.error.message.includes('already exists')) {
        return {
          ok: false,
          error: { type: 'WORKTREE_EXISTS', path: absolutePath },
        };
      }
      return createWorktreeResult;
    }

    // worktree-checkout-not-complete: Wait for checkout to complete before returning
    await this.waitForWorktreeReady(featureName);

    const worktreeInfo: WorktreeInfo = {
      path: relativePath,
      absolutePath,
      branch: branchName,
      created_at: new Date().toISOString(),
    };

    logger.info('[WorktreeService] Worktree created', worktreeInfo);

    // spec-event-log: Log worktree:create event (Requirement 1.6)
    this.logWorktreeEvent(featureName, {
      type: 'worktree:create',
      message: `Worktree created: ${branchName}`,
      worktreePath: relativePath,
      branch: branchName,
    });

    return { ok: true, value: worktreeInfo };
  }

  /**
   * Remove a worktree and its branch
   * Requirements: 7.6, 7.7
   *
   * @param featureName - Feature name
   */
  async removeWorktree(featureName: string): Promise<WorktreeServiceResult<void>> {
    const branchName = `feature/${featureName}`;
    const { absolute: absolutePath } = this.getWorktreePath(featureName);

    // Remove worktree (force to handle uncommitted changes)
    const removeResult = await this.execGit(`git worktree remove "${absolutePath}" --force`);
    if (!removeResult.ok) {
      return removeResult;
    }

    // Delete the branch
    const deleteBranchResult = await this.execGit(`git branch -d ${branchName}`);
    if (!deleteBranchResult.ok) {
      // Try force delete if normal delete fails
      const forceDeleteResult = await this.execGit(`git branch -D ${branchName}`);
      if (!forceDeleteResult.ok) {
        logger.warn('[WorktreeService] Failed to delete branch', { branchName, error: forceDeleteResult.error });
        // Don't return error - worktree was removed successfully
      }
    }

    logger.info('[WorktreeService] Worktree removed', { featureName, absolutePath, branchName });

    // spec-event-log: Log worktree:delete event (Requirement 1.7)
    this.logWorktreeEvent(featureName, {
      type: 'worktree:delete',
      message: `Worktree deleted: ${branchName}`,
      worktreePath: this.getWorktreePath(featureName).relative,
      branch: branchName,
    });

    return { ok: true, value: undefined };
  }

  /**
   * Resolve a relative worktree path to absolute path
   * Requirements: 3.1, 3.2, 3.3 (worktree-internal-path)
   *
   * @param relativePath - Relative path from spec.json
   * @returns Absolute path
   * @throws Error if path validation fails
   *
   * セキュリティ検証（変更）:
   * - path.resolve + path.normalize でパス正規化
   * - 変更前: プロジェクト親ディレクトリ内に収まることを検証
   * - 変更後: プロジェクトディレクトリ内に収まることを検証
   * - `..`を含む相対パスでもプロジェクト内に解決される場合は許可
   */
  resolveWorktreePath(relativePath: string): string {
    const resolved = path.resolve(this.projectPath, relativePath);
    const normalized = path.normalize(resolved);

    // worktree-internal-path: セキュリティ検証を「プロジェクトディレクトリ内」に変更
    // パスがプロジェクトディレクトリ内であることを検証
    // normalized は /path/to/project/... の形式になる
    // projectPath + path.sep を使って、projectPath自体ではなくその配下を検証
    const projectPathWithSep = this.projectPath.endsWith(path.sep)
      ? this.projectPath
      : this.projectPath + path.sep;

    if (!normalized.startsWith(projectPathWithSep) && normalized !== this.projectPath) {
      throw new Error(`Path validation failed: ${relativePath} resolves outside project directory`);
    }

    return normalized;
  }

  /**
   * Check if a worktree exists for a feature
   *
   * @param featureName - Feature name
   * @returns true if worktree exists
   */
  async worktreeExists(featureName: string): Promise<boolean> {
    const result = await this.execGit('git worktree list');
    if (!result.ok) {
      return false;
    }

    const branchName = `feature/${featureName}`;
    return result.value.includes(`[${branchName}]`);
  }

  /**
   * Get watch path for file monitoring
   * Requirements: 8.1, 8.2
   *
   * @param _specId - Spec ID (not used currently but kept for interface compatibility)
   * @param worktreeConfig - Worktree configuration from spec.json
   * @returns Absolute path to watch
   */
  getWatchPath(_specId: string, worktreeConfig?: WorktreeConfig): string {
    // worktree-execution-ui: path is now optional, check before using
    if (worktreeConfig && worktreeConfig.path) {
      return this.resolveWorktreePath(worktreeConfig.path);
    }
    return this.projectPath;
  }

  // ============================================================
  // bugs-worktree-directory-mode Task 2.1-2.4: 汎用Entity API
  // Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
  // ============================================================

  /**
   * Get worktree path for an entity (specs or bugs)
   * Requirements: 2.1
   *
   * @param type - Entity type ('specs' | 'bugs')
   * @param name - Entity name
   * @returns Object with relative and absolute paths
   */
  getEntityWorktreePath(type: EntityType, name: string): { relative: string; absolute: string } {
    return getWorktreeBasePathHelper(this.projectPath, type, name);
  }

  /**
   * Create a worktree for an entity (specs or bugs)
   * Requirements: 2.2, 2.5, 2.6
   *
   * @param type - Entity type ('specs' | 'bugs')
   * @param name - Entity name
   * @returns WorktreeInfo on success
   */
  async createEntityWorktree(type: EntityType, name: string): Promise<WorktreeServiceResult<WorktreeInfo>> {
    // Validate name
    const validation = validateFeatureName(name);
    if (!validation.ok) {
      return validation;
    }

    // Check if on main branch
    const branchResult = await this.getCurrentBranch();
    if (!branchResult.ok) {
      return branchResult;
    }

    const currentBranch = branchResult.value;
    if (currentBranch !== 'main' && currentBranch !== 'master' && currentBranch !== 'dev') {
      return {
        ok: false,
        error: { type: 'NOT_ON_MAIN_BRANCH', currentBranch },
      };
    }

    // Branch prefix depends on type
    const branchPrefix = type === 'specs' ? 'feature' : 'bugfix';
    const branchName = `${branchPrefix}/${name}`;
    const { relative: relativePath, absolute: absolutePath } = this.getEntityWorktreePath(type, name);

    // Create the branch
    const createBranchResult = await this.execGit(`git branch ${branchName}`);
    if (!createBranchResult.ok) {
      if (createBranchResult.error.type === 'GIT_ERROR' &&
          createBranchResult.error.message.includes('already exists')) {
        return {
          ok: false,
          error: { type: 'BRANCH_EXISTS', branch: branchName },
        };
      }
      return createBranchResult;
    }

    // Create the worktree
    const createWorktreeResult = await this.execGit(`git worktree add "${absolutePath}" ${branchName}`);
    if (!createWorktreeResult.ok) {
      // Rollback: delete the branch we just created
      await this.execGit(`git branch -d ${branchName}`).catch(() => {
        logger.warn('[WorktreeService] Failed to rollback branch creation', { branchName });
      });

      if (createWorktreeResult.error.type === 'GIT_ERROR' &&
          createWorktreeResult.error.message.includes('already exists')) {
        return {
          ok: false,
          error: { type: 'WORKTREE_EXISTS', path: absolutePath },
        };
      }
      return createWorktreeResult;
    }

    // Wait for checkout to complete
    await this.waitForWorktreeReady(name);

    const worktreeInfo: WorktreeInfo = {
      path: relativePath,
      absolutePath,
      branch: branchName,
      created_at: new Date().toISOString(),
    };

    logger.info('[WorktreeService] Entity worktree created', { type, ...worktreeInfo });
    return { ok: true, value: worktreeInfo };
  }

  /**
   * Remove an entity worktree and its branch
   * Requirements: 2.3
   *
   * @param type - Entity type ('specs' | 'bugs')
   * @param name - Entity name
   * @returns void on success
   */
  async removeEntityWorktree(type: EntityType, name: string): Promise<WorktreeServiceResult<void>> {
    const branchPrefix = type === 'specs' ? 'feature' : 'bugfix';
    const branchName = `${branchPrefix}/${name}`;
    const { absolute: absolutePath } = this.getEntityWorktreePath(type, name);

    // Remove worktree (force to handle uncommitted changes)
    const removeResult = await this.execGit(`git worktree remove "${absolutePath}" --force`);
    if (!removeResult.ok) {
      return removeResult;
    }

    // Delete the branch
    const deleteBranchResult = await this.execGit(`git branch -d ${branchName}`);
    if (!deleteBranchResult.ok) {
      // Try force delete if normal delete fails
      const forceDeleteResult = await this.execGit(`git branch -D ${branchName}`);
      if (!forceDeleteResult.ok) {
        logger.warn('[WorktreeService] Failed to delete branch', { branchName, error: forceDeleteResult.error });
        // Don't return error - worktree was removed successfully
      }
    }

    logger.info('[WorktreeService] Entity worktree removed', { type, name, absolutePath, branchName });
    return { ok: true, value: undefined };
  }

  // ============================================================
  // bugs-worktree-support Task 3.1: Bugs worktree path generation
  // Requirements: 3.3, 3.7
  // ============================================================

  /**
   * Get worktree path for a bug
   * Requirements: 1.2, 4.2 (worktree-internal-path)
   *
   * @param bugName - Bug name (directory name)
   * @returns Object with relative and absolute paths
   *
   * 変更: .kiro/worktrees/bugs/{bug} 形式に変更
   */
  getBugWorktreePath(bugName: string): { relative: string; absolute: string } {
    // worktree-internal-path: プロジェクト内の.kiro/worktrees/bugs/に配置
    const relative = `.kiro/worktrees/bugs/${bugName}`;
    const absolute = path.resolve(this.projectPath, relative);
    return { relative, absolute };
  }

  // ============================================================
  // bugs-worktree-support Task 3.2: Bugs worktree creation
  // Requirements: 3.1, 3.2, 3.3, 3.4, 3.6
  // ============================================================

  /**
   * Create a worktree for a bug
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.6
   *
   * @param bugName - Bug name (will be used for branch: bugfix/{bugName})
   * @returns WorktreeInfo on success
   */
  async createBugWorktree(bugName: string): Promise<WorktreeServiceResult<WorktreeInfo>> {
    // Validate bug name (reuse feature name validation)
    const validation = validateFeatureName(bugName);
    if (!validation.ok) {
      return validation;
    }

    // Check if on main branch
    const branchResult = await this.getCurrentBranch();
    if (!branchResult.ok) {
      return branchResult;
    }

    const currentBranch = branchResult.value;
    if (currentBranch !== 'main' && currentBranch !== 'master' && currentBranch !== 'dev') {
      return {
        ok: false,
        error: { type: 'NOT_ON_MAIN_BRANCH', currentBranch },
      };
    }

    // Bug branches use bugfix/ prefix
    const branchName = `bugfix/${bugName}`;
    const { relative: relativePath, absolute: absolutePath } = this.getBugWorktreePath(bugName);

    // Create the bugfix branch
    const createBranchResult = await this.execGit(`git branch ${branchName}`);
    if (!createBranchResult.ok) {
      // Check if branch already exists
      if (createBranchResult.error.type === 'GIT_ERROR' &&
          createBranchResult.error.message.includes('already exists')) {
        return {
          ok: false,
          error: { type: 'BRANCH_EXISTS', branch: branchName },
        };
      }
      return createBranchResult;
    }

    // Create the worktree
    const createWorktreeResult = await this.execGit(`git worktree add "${absolutePath}" ${branchName}`);
    if (!createWorktreeResult.ok) {
      // Rollback: delete the branch we just created
      await this.execGit(`git branch -d ${branchName}`).catch(() => {
        logger.warn('[WorktreeService] Failed to rollback branch creation', { branchName });
      });

      // Check if worktree already exists
      if (createWorktreeResult.error.type === 'GIT_ERROR' &&
          createWorktreeResult.error.message.includes('already exists')) {
        return {
          ok: false,
          error: { type: 'WORKTREE_EXISTS', path: absolutePath },
        };
      }
      return createWorktreeResult;
    }

    // worktree-checkout-not-complete: Wait for checkout to complete before returning
    await this.waitForWorktreeReady(bugName);

    const worktreeInfo: WorktreeInfo = {
      path: relativePath,
      absolutePath,
      branch: branchName,
      created_at: new Date().toISOString(),
    };

    logger.info('[WorktreeService] Bug worktree created', worktreeInfo);
    return { ok: true, value: worktreeInfo };
  }

  // ============================================================
  // bugs-worktree-support Task 3.3: Bugs worktree removal
  // Requirements: 4.6
  // ============================================================

  /**
   * Remove a bug worktree and its branch
   * Requirements: 4.6
   *
   * @param bugName - Bug name
   * @returns void on success
   */
  async removeBugWorktree(bugName: string): Promise<WorktreeServiceResult<void>> {
    const branchName = `bugfix/${bugName}`;
    const { absolute: absolutePath } = this.getBugWorktreePath(bugName);

    // Remove worktree (force to handle uncommitted changes)
    const removeResult = await this.execGit(`git worktree remove "${absolutePath}" --force`);
    if (!removeResult.ok) {
      return removeResult;
    }

    // Delete the branch
    const deleteBranchResult = await this.execGit(`git branch -d ${branchName}`);
    if (!deleteBranchResult.ok) {
      // Try force delete if normal delete fails
      const forceDeleteResult = await this.execGit(`git branch -D ${branchName}`);
      if (!forceDeleteResult.ok) {
        logger.warn('[WorktreeService] Failed to delete bug branch', { branchName, error: forceDeleteResult.error });
        // Don't return error - worktree was removed successfully
      }
    }

    logger.info('[WorktreeService] Bug worktree removed', { bugName, absolutePath, branchName });
    return { ok: true, value: undefined };
  }

  // ============================================================
  // Spec commit check for worktree mode
  // Ensures spec files are committed before creating worktree
  // ============================================================

  /**
   * Check if there are uncommitted changes in a spec directory
   * worktree-convert-spec-optimization: statusOutputを追加して状態判定に使用
   *
   * @param specPath - Relative path to spec directory (e.g., .kiro/specs/{feature})
   * @returns Object with hasChanges flag, list of changed files, and raw status output
   */
  async checkUncommittedSpecChanges(specPath: string): Promise<WorktreeServiceResult<{ hasChanges: boolean; files: string[]; statusOutput: string }>> {
    // git status --porcelain shows files with changes
    // Filter to only spec directory
    const result = await this.execGit(`git status --porcelain "${specPath}"`);
    if (!result.ok) {
      return result;
    }

    const output = result.value;
    if (!output) {
      return { ok: true, value: { hasChanges: false, files: [], statusOutput: '' } };
    }

    // Parse git status output: each line is "XY filename"
    const files = output.split('\n').filter(line => line.trim()).map(line => line.slice(3));

    return { ok: true, value: { hasChanges: files.length > 0, files, statusOutput: output } };
  }

  /**
   * Check if there are uncommitted changes in a bug directory
   * bug-worktree-spec-alignment: Same logic as checkUncommittedSpecChanges for Bugs
   * Requirements: 1.1, 1.2, 1.3, 1.4 (bug-worktree-spec-alignment)
   *
   * @param bugPath - Relative path to bug directory (e.g., .kiro/bugs/{bugName})
   * @returns Object with hasChanges flag, list of changed files, and raw status output
   */
  async checkUncommittedBugChanges(bugPath: string): Promise<WorktreeServiceResult<{ hasChanges: boolean; files: string[]; statusOutput: string }>> {
    // git status --porcelain shows files with changes
    // Filter to only bug directory
    const result = await this.execGit(`git status --porcelain "${bugPath}"`);
    if (!result.ok) {
      return result;
    }

    const output = result.value;
    if (!output) {
      return { ok: true, value: { hasChanges: false, files: [], statusOutput: '' } };
    }

    // Parse git status output: each line is "XY filename"
    const files = output.split('\n').filter(line => line.trim()).map(line => line.slice(3));

    return { ok: true, value: { hasChanges: files.length > 0, files, statusOutput: output } };
  }

  /**
   * Commit spec changes before creating worktree
   *
   * @param specPath - Relative path to spec directory (e.g., .kiro/specs/{feature})
   * @param featureName - Feature name for commit message
   * @returns void on success
   */
  async commitSpecChanges(specPath: string, featureName: string): Promise<WorktreeServiceResult<void>> {
    // Stage all changes in spec directory
    const addResult = await this.execGit(`git add "${specPath}"`);
    if (!addResult.ok) {
      return addResult;
    }

    // Commit with descriptive message
    const commitMessage = `docs(spec): add spec for ${featureName}`;
    const commitResult = await this.execGit(`git commit -m "${commitMessage}"`);
    if (!commitResult.ok) {
      return commitResult;
    }

    logger.info('[WorktreeService] Spec changes committed', { specPath, featureName });
    return { ok: true, value: undefined };
  }

  // ============================================================
  // Symlink creation for worktree mode
  // Creates symlinks for logs and runtime directories only
  // spec-worktree-early-creation: Spec symlink removed (Requirements 5.1)
  // ============================================================

  /**
   * Create symlinks in worktree to preserve logs in main repository
   *
   * Creates symlinks for:
   * - .kiro/logs/ → main repo's .kiro/logs/ (preserved)
   * - .kiro/runtime/ → main repo's .kiro/runtime/ (preserved)
   *
   * spec-worktree-early-creation: Spec directory symlink REMOVED
   * - Spec files are now real files in worktree (not symlinks)
   * - This simplifies the workflow and avoids Glob symlink issues
   *
   * @param worktreeAbsolutePath - Absolute path to the worktree
   * @param _featureName - Feature name (kept for API compatibility, no longer used)
   * @returns void on success
   */
  async createSymlinksForWorktree(
    worktreeAbsolutePath: string,
    _featureName: string
  ): Promise<WorktreeServiceResult<void>> {
    // Directory symlinks for logs and runtime only
    // spec-worktree-early-creation: Spec symlink removed
    const directorySymlinks = [
      {
        target: path.join(this.projectPath, '.kiro', 'logs'),
        link: path.join(worktreeAbsolutePath, '.kiro', 'logs'),
      },
      {
        target: path.join(this.projectPath, '.kiro', 'runtime'),
        link: path.join(worktreeAbsolutePath, '.kiro', 'runtime'),
      },
    ];

    // Create directory symlinks for logs and runtime
    for (const { target, link } of directorySymlinks) {
      try {
        // Ensure target exists in main repo
        await fsPromises.mkdir(target, { recursive: true });

        // Remove existing directory/file in worktree if exists
        try {
          const stat = await fsPromises.lstat(link);
          if (stat.isDirectory() && !stat.isSymbolicLink()) {
            await fsPromises.rm(link, { recursive: true });
            logger.debug('[WorktreeService] Removed existing directory before symlink', { link });
          } else {
            await fsPromises.unlink(link);
          }
        } catch {
          // Link doesn't exist, which is fine
        }

        // Ensure parent directory exists in worktree
        await fsPromises.mkdir(path.dirname(link), { recursive: true });

        // Create symlink
        await fsPromises.symlink(target, link);

        logger.debug('[WorktreeService] Symlink created', { target, link });
      } catch (error) {
        logger.error('[WorktreeService] Failed to create symlink', {
          target,
          link,
          error: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: {
            type: 'GIT_ERROR',
            message: `Failed to create symlink: ${error instanceof Error ? error.message : String(error)}`,
          },
        };
      }
    }

    logger.info('[WorktreeService] Symlinks created for worktree (logs/runtime only)', {
      worktreePath: worktreeAbsolutePath,
    });
    return { ok: true, value: undefined };
  }

  // spec-worktree-early-creation: prepareWorktreeForMerge() REMOVED
  // - Spec files are now real files in worktree (not symlinks)
  // - No special preparation needed for merge

  // ============================================================
  // worktree-rebase-from-main: Task 2.1 - executeRebaseFromMain
  // Requirements: 4.1, 5.1, 5.2, 5.3, 5.4, 10.1, 10.2
  // ============================================================

  /**
   * Execute rebase-worktree.sh script to rebase worktree branch from main
   * Requirements: 4.1, 5.1, 5.2, 5.3, 5.4, 10.1, 10.2
   *
   * @param specOrBugPath - Relative path to spec or bug directory (e.g., .kiro/specs/my-feature or .kiro/bugs/my-bug)
   * @returns RebaseResult on success, RebaseError on failure
   */
  async executeRebaseFromMain(
    specOrBugPath: string
  ): Promise<WorktreeServiceResult<{ success: true; alreadyUpToDate?: boolean }>> {
    // Extract feature/bug name from path
    const pathParts = specOrBugPath.split('/');
    const entityName = pathParts[pathParts.length - 1];
    const entityType = pathParts[1]; // 'specs' or 'bugs'

    // Determine script argument format
    let scriptArg: string;
    if (entityType === 'bugs') {
      scriptArg = `bug:${entityName}`;
    } else {
      scriptArg = entityName;
    }

    // Check if rebase-worktree.sh exists
    const scriptPath = path.join(this.projectPath, '.kiro', 'scripts', 'rebase-worktree.sh');
    if (!fs.existsSync(scriptPath)) {
      logger.error('[WorktreeService] rebase-worktree.sh not found', { scriptPath });
      return {
        ok: false,
        error: {
          type: 'SCRIPT_NOT_FOUND',
          message: 'Script not found. Please reinstall commandset.',
        },
      };
    }

    // Execute rebase-worktree.sh
    logger.info('[WorktreeService] Executing rebase-worktree.sh', { scriptArg, specOrBugPath });
    const result = await this.execGit(`.kiro/scripts/rebase-worktree.sh ${scriptArg}`);

    if (result.ok) {
      const output = result.value;
      // Check if "Already up to date" in output
      if (output.includes('Already up to date')) {
        logger.info('[WorktreeService] Worktree is already up to date with main', { scriptArg });
        return { ok: true, value: { success: true, alreadyUpToDate: true } };
      }

      logger.info('[WorktreeService] Rebase completed successfully', { scriptArg });
      return { ok: true, value: { success: true } };
    }

    // Handle errors - execGit always returns GIT_ERROR type with message property
    const gitError = result.error as { type: 'GIT_ERROR'; message: string };
    const errorMessage = gitError.message;

    // Check if script not found error (ENOENT)
    if (errorMessage.includes('ENOENT') || errorMessage.includes('no such file')) {
      logger.error('[WorktreeService] rebase-worktree.sh not found', { scriptPath, error: errorMessage });
      return {
        ok: false,
        error: {
          type: 'SCRIPT_NOT_FOUND',
          message: 'Script not found. Please reinstall commandset.',
        },
      };
    }

    // Check exit code for conflict detection (exit code 1)
    if (errorMessage.includes('Exit code 1') || errorMessage.includes('Conflict detected')) {
      logger.warn('[WorktreeService] Conflict detected during rebase, starting AI resolution', { scriptArg });

      // Trigger AI conflict resolution
      const resolveResult = await this.resolveConflictWithAI(specOrBugPath, 7);
      if (resolveResult.ok) {
        logger.info('[WorktreeService] AI conflict resolution succeeded', { scriptArg });
        return { ok: true, value: { success: true } };
      }

      // resolveConflictWithAI returns CONFLICT_RESOLUTION_FAILED with reason property
      const conflictError = resolveResult.error as { type: 'CONFLICT_RESOLUTION_FAILED'; message: string; reason: string };
      logger.error('[WorktreeService] AI conflict resolution failed', {
        scriptArg,
        error: conflictError,
      });
      return {
        ok: false,
        error: {
          type: 'CONFLICT_RESOLUTION_FAILED',
          message: 'Failed to resolve conflict. Please resolve manually.',
          reason: conflictError.reason || 'Unknown error',
        },
      };
    }

    // Other errors
    logger.error('[WorktreeService] Rebase failed', { scriptArg, error: errorMessage });
    return {
      ok: false,
      error: {
        type: 'GIT_ERROR',
        message: `Rebase failed: ${errorMessage}`,
      },
    };
  }

  /**
   * Resolve rebase conflict with AI
   * Requirements: 4.1, 4.2, 4.3, 4.4, 10.5
   *
   * @param specOrBugPath - Path to spec or bug directory
   * @param maxRetries - Maximum number of retry attempts
   * @returns void on success, error on failure
   */
  private async resolveConflictWithAI(
    specOrBugPath: string,
    maxRetries: number
  ): Promise<WorktreeServiceResult<void>> {
    logger.info('[WorktreeService] Starting AI conflict resolution', { specOrBugPath, maxRetries });

    // Check if jj is available
    const jjAvailableResult = await this.execGit('command -v jj');
    const useJj = jjAvailableResult.ok;

    logger.info('[WorktreeService] VCS detection', { useJj });

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      logger.info('[WorktreeService] AI conflict resolution attempt', { attempt, maxRetries });

      // Attempt AI conflict resolution
      // Note: Actual AI resolution logic is mocked via (this as any).mockResolveConflict for testing
      // In production, this would call a real AI service
      const resolved = (this as any).mockResolveConflict
        ? await (this as any).mockResolveConflict()
        : false;

      if (resolved) {
        // AI successfully resolved the conflict, continue rebase
        logger.info('[WorktreeService] AI resolved conflict, continuing rebase', { attempt });

        const continueCommand = useJj ? 'jj squash' : 'git rebase --continue';
        const continueResult = await this.execGit(continueCommand);

        if (continueResult.ok) {
          logger.info('[WorktreeService] Rebase continued successfully after AI resolution');
          return { ok: true, value: undefined };
        } else {
          // execGit always returns GIT_ERROR type with message property
          const gitError = continueResult.error as { type: 'GIT_ERROR'; message: string };
          logger.error('[WorktreeService] Failed to continue rebase after AI resolution', {
            error: gitError.message,
          });
          // Continue to next attempt if continue failed
        }
      } else {
        logger.warn('[WorktreeService] AI failed to resolve conflict', { attempt });
      }

      // If this is not the last attempt, continue to next retry
      if (attempt < maxRetries) {
        continue;
      }
    }

    // All attempts failed, abort rebase
    logger.error('[WorktreeService] AI conflict resolution failed after max retries', { maxRetries });

    const abortCommand = useJj ? 'jj undo' : 'git rebase --abort';
    const abortResult = await this.execGit(abortCommand);

    if (!abortResult.ok) {
      // execGit always returns GIT_ERROR type with message property
      const gitError = abortResult.error as { type: 'GIT_ERROR'; message: string };
      logger.error('[WorktreeService] Failed to abort rebase', { error: gitError.message });
    } else {
      logger.info('[WorktreeService] Rebase aborted successfully');
    }

    return {
      ok: false,
      error: {
        type: 'CONFLICT_RESOLUTION_FAILED',
        message: 'Failed to resolve conflict after maximum retries',
        reason: 'max_retries_exceeded',
      },
    };
  }
}
