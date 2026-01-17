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
   * Check if currently on main/master branch
   * Requirements: 1.1, 1.2
   */
  async isOnMainBranch(): Promise<WorktreeServiceResult<boolean>> {
    const result = await this.getCurrentBranch();
    if (!result.ok) {
      return result;
    }
    const branch = result.value;
    return { ok: true, value: branch === 'main' || branch === 'master' };
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
    if (currentBranch !== 'main' && currentBranch !== 'master') {
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
    if (currentBranch !== 'main' && currentBranch !== 'master') {
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
   *
   * @param specPath - Relative path to spec directory (e.g., .kiro/specs/{feature})
   * @returns Object with hasChanges flag and list of changed files
   */
  async checkUncommittedSpecChanges(specPath: string): Promise<WorktreeServiceResult<{ hasChanges: boolean; files: string[] }>> {
    // git status --porcelain shows files with changes
    // Filter to only spec directory
    const result = await this.execGit(`git status --porcelain "${specPath}"`);
    if (!result.ok) {
      return result;
    }

    const output = result.value;
    if (!output) {
      return { ok: true, value: { hasChanges: false, files: [] } };
    }

    // Parse git status output: each line is "XY filename"
    const files = output.split('\n').filter(line => line.trim()).map(line => line.slice(3));

    return { ok: true, value: { hasChanges: files.length > 0, files } };
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
  // Creates symlinks for logs and runtime directories
  // ============================================================

  /**
   * Create symlinks in worktree to preserve logs in main repository
   *
   * Creates symlinks for:
   * - .kiro/logs/ → main repo's .kiro/logs/ (preserved - Requirement 2.3)
   * - .kiro/runtime/ → main repo's .kiro/runtime/ (preserved - Requirement 2.3)
   * - .kiro/specs/{feature}/ → main repo's .kiro/specs/{feature}/ (new - Requirement 2.1)
   *
   * worktree-spec-symlink: Changed from individual logs symlink to entire spec directory
   * - Removed: .kiro/specs/{feature}/logs/ symlink (Requirement 2.4)
   * - Added: .kiro/specs/{feature}/ symlink (Requirement 2.1)
   * - If worktree spec directory exists, it's deleted before creating symlink (Requirement 2.2)
   *
   * @param worktreeAbsolutePath - Absolute path to the worktree
   * @param featureName - Feature name for spec directory symlink
   * @returns void on success
   */
  async createSymlinksForWorktree(
    worktreeAbsolutePath: string,
    featureName: string
  ): Promise<WorktreeServiceResult<void>> {
    // worktree-spec-symlink: Symlink entire spec directory instead of just logs
    // This allows Electron app to monitor tasks.md changes in real-time
    const symlinks = [
      {
        target: path.join(this.projectPath, '.kiro', 'logs'),
        link: path.join(worktreeAbsolutePath, '.kiro', 'logs'),
      },
      {
        target: path.join(this.projectPath, '.kiro', 'runtime'),
        link: path.join(worktreeAbsolutePath, '.kiro', 'runtime'),
      },
      // worktree-spec-symlink Requirement 2.1: Create symlink for entire spec directory
      // Replaced: .kiro/specs/{feature}/logs/ (Requirement 2.4)
      {
        target: path.join(this.projectPath, '.kiro', 'specs', featureName),
        link: path.join(worktreeAbsolutePath, '.kiro', 'specs', featureName),
      },
    ];

    for (const { target, link } of symlinks) {
      try {
        // For logs and runtime directories, ensure target exists in main repo
        // For spec directory, it should already exist (contains spec.json, requirements.md, etc.)
        const isSpecSymlink = link.includes(path.join('.kiro', 'specs', featureName));
        if (!isSpecSymlink) {
          await fsPromises.mkdir(target, { recursive: true });
        }

        // worktree-spec-symlink Requirement 2.2:
        // Remove existing directory/file in worktree if exists before creating symlink
        try {
          const stat = await fsPromises.lstat(link);
          if (stat.isDirectory() && !stat.isSymbolicLink()) {
            // For spec directory, this removes the checkout-created directory
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

    logger.info('[WorktreeService] Symlinks created for worktree', {
      worktreePath: worktreeAbsolutePath,
      featureName,
    });
    return { ok: true, value: undefined };
  }

  // ============================================================
  // worktree-spec-symlink Task 3: prepareWorktreeForMerge
  // Prepares worktree for merge by removing symlink and resetting spec directory
  // Requirements: 3.2, 3.3, 3.4, 4.2 (worktree-spec-symlink)
  // ============================================================

  /**
   * Execute a git command in a specific directory (not the main project)
   */
  private execGitInDir(command: string, cwd: string): Promise<WorktreeServiceResult<string>> {
    return new Promise((resolve) => {
      this.execFn(
        command,
        { cwd },
        (error, stdout, _stderr) => {
          if (error) {
            const message = error.message || String(error);
            logger.error('[WorktreeService] Git command failed', { command, cwd, error: message });
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
   * Prepare worktree for merge by removing spec symlink and resetting spec directory
   *
   * This function should be called before merging worktree branch to main:
   * 1. Deletes the spec directory symlink in worktree (Requirement 3.2)
   * 2. Executes git reset .kiro/specs/{feature}/ in worktree (Requirement 3.3)
   * 3. Executes git checkout .kiro/specs/{feature}/ in worktree (Requirement 3.4)
   *
   * After this, the worktree has no spec file changes, avoiding merge conflicts.
   *
   * @param featureName - Feature name
   * @returns void on success
   */
  async prepareWorktreeForMerge(featureName: string): Promise<WorktreeServiceResult<void>> {
    const { absolute: worktreePath } = this.getWorktreePath(featureName);
    const specPath = `.kiro/specs/${featureName}`;
    const specSymlinkPath = path.join(worktreePath, specPath);

    // Step 1: Delete spec symlink (Requirement 3.2)
    try {
      const stat = await fsPromises.lstat(specSymlinkPath);
      if (stat.isSymbolicLink()) {
        await fsPromises.unlink(specSymlinkPath);
        logger.info('[WorktreeService] Spec symlink deleted', { specSymlinkPath });
      } else if (stat.isDirectory()) {
        // If it's a directory (not symlink), still remove it
        await fsPromises.rm(specSymlinkPath, { recursive: true });
        logger.info('[WorktreeService] Spec directory deleted', { specSymlinkPath });
      }
    } catch {
      // Symlink/directory doesn't exist, which is fine
      logger.debug('[WorktreeService] Spec symlink not found (already removed or never created)', { specSymlinkPath });
    }

    // Step 2: Execute git reset on spec directory (Requirement 3.3)
    // This unstages any changes in the spec directory
    const resetResult = await this.execGitInDir(`git reset "${specPath}"`, worktreePath);
    if (!resetResult.ok) {
      return resetResult;
    }
    logger.info('[WorktreeService] Git reset executed on spec directory', { specPath, worktreePath });

    // Step 3: Execute git checkout on spec directory (Requirement 3.4)
    // This restores the spec directory to HEAD state
    const checkoutResult = await this.execGitInDir(`git checkout "${specPath}"`, worktreePath);
    if (!checkoutResult.ok) {
      return checkoutResult;
    }
    logger.info('[WorktreeService] Git checkout executed on spec directory', { specPath, worktreePath });

    logger.info('[WorktreeService] Worktree prepared for merge', { featureName, worktreePath });
    return { ok: true, value: undefined };
  }
}
