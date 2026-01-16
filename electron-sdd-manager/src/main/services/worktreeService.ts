/**
 * WorktreeService
 * Git worktree operations wrapper for Spec-Driven Development
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7, 7.6, 7.7, 8.1, 8.2 (git-worktree-support)
 * Requirements: 3.1, 3.3, 3.4, 4.6 (bugs-worktree-support)
 */

import { exec as nodeExec } from 'child_process';
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
  private projectName: string;
  private execFn: ExecFunction;

  constructor(projectPath: string, execFn?: ExecFunction) {
    this.projectPath = projectPath;
    this.projectName = path.basename(projectPath);
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
   *
   * @param featureName - Feature name
   * @returns Object with relative and absolute paths
   */
  getWorktreePath(featureName: string): { relative: string; absolute: string } {
    const worktreeDir = `${this.projectName}-worktrees`;
    const relative = `../${worktreeDir}/${featureName}`;
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
   * Requirements: 8.1, 8.2 (security validation)
   *
   * @param relativePath - Relative path from spec.json
   * @returns Absolute path
   * @throws Error if path validation fails
   */
  resolveWorktreePath(relativePath: string): string {
    const resolved = path.resolve(this.projectPath, relativePath);
    const normalized = path.normalize(resolved);

    // Security check: path must be within parent directory of project
    const parentDir = path.dirname(this.projectPath);
    if (!normalized.startsWith(parentDir)) {
      throw new Error(`Path validation failed: ${relativePath} resolves outside parent directory`);
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
   * Requirements: 3.3, 3.7
   *
   * @param bugName - Bug name (directory name)
   * @returns Object with relative and absolute paths
   */
  getBugWorktreePath(bugName: string): { relative: string; absolute: string } {
    const worktreeDir = `${this.projectName}-worktrees`;
    // Bugs go into a 'bugs' subdirectory
    const relative = `../${worktreeDir}/bugs/${bugName}`;
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
}
