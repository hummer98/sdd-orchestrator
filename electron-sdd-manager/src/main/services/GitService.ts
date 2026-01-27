import { spawn } from 'child_process';
import { access, readFile } from 'fs/promises';
import { join } from 'path';
import type { Result } from '../../shared/types';
import type { ApiError, GitStatusResult, GitFileStatus } from '../../shared/api/types';

/**
 * GitService - Main Process service for git operations
 *
 * Executes git CLI commands safely and returns structured diff data.
 * Follows Electron Process Boundary Rules: git operations are performed in Main Process only.
 */
export class GitService {
  /**
   * Get git status for a project
   * - worktree environment: git diff <base>...HEAD --name-status
   * - normal branch: git status --porcelain
   */
  async getStatus(projectPath: string): Promise<Result<GitStatusResult, ApiError>> {
    try {
      // Validate project path
      const validation = await this.validateGitRepository(projectPath);
      if (!validation.success) {
        return validation;
      }

      // Detect if this is a worktree environment
      const isWorktree = await this.isWorktreeEnvironment(projectPath);

      if (isWorktree) {
        return await this.getWorktreeStatus(projectPath);
      } else {
        return await this.getNormalStatus(projectPath);
      }
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'system_error',
          message: `Failed to get git status: ${error instanceof Error ? error.message : String(error)}`,
        },
      };
    }
  }

  /**
   * Get diff for a specific file
   */
  async getDiff(projectPath: string, filePath: string): Promise<Result<string, ApiError>> {
    try {
      // Validate project path
      const validation = await this.validateGitRepository(projectPath);
      if (!validation.success) {
        return validation;
      }

      // Validate file path (should be relative to project root)
      if (filePath.startsWith('/') || filePath.includes('..')) {
        return {
          success: false,
          error: {
            type: 'validation_error',
            message: `Invalid file path: ${filePath}. Must be a relative path from project root.`,
          },
        };
      }

      // Check if file is untracked
      const statusResult = await this.getStatus(projectPath);
      if (!statusResult.success) {
        return statusResult;
      }

      const fileStatus = statusResult.data.files.find(f => f.path === filePath);

      if (fileStatus?.status === '??') {
        // For untracked files, read the file and generate a synthetic diff
        return await this.generateUntrackedDiff(projectPath, filePath);
      }

      // For tracked files, use git diff
      const args = ['diff', filePath];
      if (statusResult.data.mode === 'worktree' && statusResult.data.baseBranch) {
        args.unshift('HEAD');
        args[0] = `${statusResult.data.baseBranch}...HEAD`;
      }

      const diffOutput = await this.execGit(projectPath, args);

      if (!diffOutput.success) {
        return diffOutput;
      }

      return {
        success: true,
        data: diffOutput.data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'system_error',
          message: `Failed to get diff: ${error instanceof Error ? error.message : String(error)}`,
        },
      };
    }
  }

  /**
   * Detect base branch for worktree
   */
  async detectBaseBranch(projectPath: string): Promise<Result<string, ApiError>> {
    try {
      // Try to read .git/worktrees/{name}/HEAD
      const gitDir = join(projectPath, '.git');

      try {
        // Check if this is a worktree (has .git file pointing to worktrees)
        const gitFile = await readFile(gitDir, 'utf-8');

        if (gitFile.startsWith('gitdir:')) {
          const worktreePath = gitFile.replace('gitdir:', '').trim();
          const headFile = join(projectPath, worktreePath, 'HEAD');

          const headContent = await readFile(headFile, 'utf-8');

          if (headContent.startsWith('ref:')) {
            // Get the base branch from worktree list
            const baseBranch = await this.getWorktreeBaseBranch(projectPath);
            return {
              success: true,
              data: baseBranch || 'master',
            };
          }
        }
      } catch {
        // Not a worktree, fallback to current branch
      }

      // Fallback: get current branch
      const currentBranch = await this.execGit(projectPath, ['branch', '--show-current']);

      if (!currentBranch.success) {
        return currentBranch;
      }

      return {
        success: true,
        data: currentBranch.data.trim() || 'HEAD',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'git_error',
          message: `Failed to detect base branch: ${error instanceof Error ? error.message : String(error)}`,
        },
      };
    }
  }

  /**
   * Validate that the project path is a valid git repository
   */
  private async validateGitRepository(projectPath: string): Promise<Result<void, ApiError>> {
    try {
      // Check if directory exists
      await access(projectPath);

      // Check if .git exists
      const gitDir = join(projectPath, '.git');
      await access(gitDir);

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'validation_error',
          message: `Not a git repository: ${projectPath}`,
        },
      };
    }
  }

  /**
   * Check if this is a worktree environment
   */
  private async isWorktreeEnvironment(projectPath: string): Promise<boolean> {
    try {
      const gitDir = join(projectPath, '.git');
      const gitFile = await readFile(gitDir, 'utf-8');
      return gitFile.startsWith('gitdir:');
    } catch {
      return false;
    }
  }

  /**
   * Get git status for worktree environment
   */
  private async getWorktreeStatus(projectPath: string): Promise<Result<GitStatusResult, ApiError>> {
    const baseBranchResult = await this.detectBaseBranch(projectPath);

    if (!baseBranchResult.success) {
      return baseBranchResult;
    }

    const baseBranch = baseBranchResult.data;

    // Get committed changes: git diff <base>...HEAD --name-status
    const committedResult = await this.execGit(projectPath, [
      'diff',
      `${baseBranch}...HEAD`,
      '--name-status',
    ]);

    if (!committedResult.success) {
      return committedResult;
    }

    // Get uncommitted changes: git status --porcelain
    const uncommittedResult = await this.execGit(projectPath, ['status', '--porcelain']);

    if (!uncommittedResult.success) {
      return uncommittedResult;
    }

    // Parse both outputs and merge
    const committedFiles = this.parseNameStatus(committedResult.data);
    const uncommittedFiles = this.parsePorcelain(uncommittedResult.data);

    // Merge files (uncommitted takes precedence)
    const fileMap = new Map<string, GitFileStatus>();

    for (const file of committedFiles) {
      fileMap.set(file.path, file);
    }

    for (const file of uncommittedFiles) {
      fileMap.set(file.path, file);
    }

    return {
      success: true,
      data: {
        files: Array.from(fileMap.values()),
        baseBranch,
        mode: 'worktree',
      },
    };
  }

  /**
   * Get git status for normal branch environment
   */
  private async getNormalStatus(projectPath: string): Promise<Result<GitStatusResult, ApiError>> {
    const statusResult = await this.execGit(projectPath, ['status', '--porcelain']);

    if (!statusResult.success) {
      return statusResult;
    }

    const files = this.parsePorcelain(statusResult.data);

    return {
      success: true,
      data: {
        files,
        mode: 'normal',
      },
    };
  }

  /**
   * Parse git diff --name-status output
   */
  private parseNameStatus(output: string): GitFileStatus[] {
    const files: GitFileStatus[] = [];
    const lines = output.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const match = line.match(/^([AMD])\s+(.+)$/);
      if (match) {
        const [, status, path] = match;
        files.push({
          path,
          status: status as 'A' | 'M' | 'D',
        });
      }
    }

    return files;
  }

  /**
   * Parse git status --porcelain output
   */
  private parsePorcelain(output: string): GitFileStatus[] {
    const files: GitFileStatus[] = [];
    const lines = output.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const statusCode = line.substring(0, 2).trim();
      const path = line.substring(3).trim();

      let status: GitFileStatus['status'];

      if (statusCode === '??') {
        status = '??';
      } else if (statusCode.includes('M')) {
        status = 'M';
      } else if (statusCode.includes('A')) {
        status = 'A';
      } else if (statusCode.includes('D')) {
        status = 'D';
      } else {
        status = 'M'; // Default to Modified
      }

      files.push({ path, status });
    }

    return files;
  }

  /**
   * Get worktree base branch from git worktree list
   */
  private async getWorktreeBaseBranch(projectPath: string): Promise<string> {
    try {
      const result = await this.execGit(projectPath, ['worktree', 'list']);

      if (!result.success) {
        return 'master';
      }

      // Parse worktree list output to find main worktree
      const lines = result.data.split('\n').filter(line => line.trim());
      const mainWorktree = lines.find(line => !line.includes('detached'));

      if (mainWorktree) {
        const match = mainWorktree.match(/\[([^\]]+)\]$/);
        if (match) {
          return match[1];
        }
      }

      return 'master';
    } catch {
      return 'master';
    }
  }

  /**
   * Generate synthetic diff for untracked files
   */
  private async generateUntrackedDiff(projectPath: string, filePath: string): Promise<Result<string, ApiError>> {
    try {
      const fullPath = join(projectPath, filePath);
      const content = await readFile(fullPath, 'utf-8');

      // Generate diff with all lines as additions
      const lines = content.split('\n');
      const diffLines = [
        `diff --git a/${filePath} b/${filePath}`,
        'new file mode 100644',
        `--- /dev/null`,
        `+++ b/${filePath}`,
        `@@ -0,0 +1,${lines.length} @@`,
        ...lines.map(line => `+${line}`),
      ];

      return {
        success: true,
        data: diffLines.join('\n'),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'system_error',
          message: `Failed to read untracked file: ${error instanceof Error ? error.message : String(error)}`,
        },
      };
    }
  }

  /**
   * Execute git command with spawn
   */
  private execGit(cwd: string, args: string[]): Promise<Result<string, ApiError>> {
    return new Promise((resolve) => {
      const git = spawn('git', args, {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      git.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      git.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      git.on('error', (error) => {
        resolve({
          success: false,
          error: {
            type: 'git_error',
            message: `Git command failed: ${error.message}. Is git installed?`,
          },
        });
      });

      git.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            data: stdout,
          });
        } else {
          resolve({
            success: false,
            error: {
              type: 'git_error',
              message: `Git command failed with code ${code}: ${stderr || stdout}`,
            },
          });
        }
      });
    });
  }
}
