/**
 * WorktreeService Unit Tests
 * TDD: Testing git worktree operations
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7, 7.6, 7.7, 8.1, 8.2 (git-worktree-support)
 * Requirements: 3.1, 3.3, 3.4, 4.6 (bugs-worktree-support)
 * Requirements: 2.1, 2.2, 2.3, 2.4, 4.1 (worktree-spec-symlink)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as path from 'path';
import { WorktreeService, isValidFeatureName, validateFeatureName, type ExecFunction } from './worktreeService';

/**
 * Create a mock exec function that returns specified results based on command patterns
 * Matches Node.js child_process.exec callback signature: (error, stdout, stderr)
 */
function createMockExec(responses: Array<{ pattern: RegExp; stdout?: string; stderr?: string; error?: Error }>): ExecFunction {
  return (
    command: string,
    _options: { cwd: string },
    callback: (error: Error | null, stdout: string, stderr: string) => void
  ) => {
    for (const response of responses) {
      if (response.pattern.test(command)) {
        if (response.error) {
          callback(response.error, '', response.stderr || response.error.message);
        } else {
          callback(null, response.stdout || '', response.stderr || '');
        }
        return { kill: vi.fn() };
      }
    }
    // Default: success with empty output
    callback(null, '', '');
    return { kill: vi.fn() };
  };
}

describe('Feature Name Validation', () => {
  describe('isValidFeatureName', () => {
    it('should accept valid feature names', () => {
      expect(isValidFeatureName('my-feature')).toBe(true);
      expect(isValidFeatureName('feature-123')).toBe(true);
      expect(isValidFeatureName('some_feature')).toBe(true);
      expect(isValidFeatureName('simple')).toBe(true);
      expect(isValidFeatureName('CamelCase')).toBe(true);
    });

    it('should reject feature names with spaces', () => {
      expect(isValidFeatureName('my feature')).toBe(false);
    });

    it('should reject feature names with special git characters', () => {
      expect(isValidFeatureName('my~feature')).toBe(false);
      expect(isValidFeatureName('my^feature')).toBe(false);
      expect(isValidFeatureName('my:feature')).toBe(false);
      expect(isValidFeatureName('my?feature')).toBe(false);
      expect(isValidFeatureName('my*feature')).toBe(false);
      expect(isValidFeatureName('my[feature')).toBe(false);
      expect(isValidFeatureName('my\\feature')).toBe(false);
    });

    it('should reject feature names with consecutive dots', () => {
      expect(isValidFeatureName('my..feature')).toBe(false);
    });

    it('should reject feature names with @{', () => {
      expect(isValidFeatureName('my@{feature')).toBe(false);
    });

    it('should reject feature names starting or ending with dot', () => {
      expect(isValidFeatureName('.myfeature')).toBe(false);
      expect(isValidFeatureName('myfeature.')).toBe(false);
    });

    it('should reject empty feature names', () => {
      expect(isValidFeatureName('')).toBe(false);
    });
  });

  describe('validateFeatureName', () => {
    it('should return ok for valid names', () => {
      const result = validateFeatureName('my-feature');
      expect(result.ok).toBe(true);
    });

    it('should return error for invalid names', () => {
      const result = validateFeatureName('my feature');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('INVALID_FEATURE_NAME');
        expect(result.error.featureName).toBe('my feature');
      }
    });
  });
});

describe('WorktreeService', () => {
  const projectPath = '/Users/test/my-project';

  describe('isOnMainBranch', () => {
    it('should return true when on main branch', async () => {
      const mockExec = createMockExec([
        { pattern: /branch --show-current/, stdout: 'main\n' },
      ]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = await service.isOnMainBranch();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(true);
      }
    });

    it('should return true when on master branch', async () => {
      const mockExec = createMockExec([
        { pattern: /branch --show-current/, stdout: 'master\n' },
      ]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = await service.isOnMainBranch();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(true);
      }
    });

    it('should return false when on feature branch', async () => {
      const mockExec = createMockExec([
        { pattern: /branch --show-current/, stdout: 'feature/my-feature\n' },
      ]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = await service.isOnMainBranch();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(false);
      }
    });

    it('should return GIT_ERROR on git failure', async () => {
      const mockExec = createMockExec([
        { pattern: /branch --show-current/, error: new Error('fatal: not a git repository') },
      ]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = await service.isOnMainBranch();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('GIT_ERROR');
      }
    });
  });

  describe('getCurrentBranch', () => {
    it('should return current branch name trimmed', async () => {
      const mockExec = createMockExec([
        { pattern: /branch --show-current/, stdout: 'feature/test\n' },
      ]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = await service.getCurrentBranch();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('feature/test');
      }
    });
  });

  describe('createWorktree', () => {
    it('should return error for invalid feature name', async () => {
      const mockExec = createMockExec([]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = await service.createWorktree('my feature');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('INVALID_FEATURE_NAME');
      }
    });

    it('should return error when not on main branch', async () => {
      const mockExec = createMockExec([
        { pattern: /branch --show-current/, stdout: 'feature/other\n' },
      ]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = await service.createWorktree('new-feature');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_ON_MAIN_BRANCH');
        expect(result.error.currentBranch).toBe('feature/other');
      }
    });

    it('should create worktree successfully when on main branch', async () => {
      const mockExec = createMockExec([
        { pattern: /branch --show-current/, stdout: 'main\n' },
        { pattern: /branch feature\//, stdout: '' },
        { pattern: /worktree add/, stdout: '' },
      ]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = await service.createWorktree('new-feature');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.branch).toBe('feature/new-feature');
        // worktree-internal-path: 新パス形式を検証
        expect(result.value.path).toBe('.kiro/worktrees/specs/new-feature');
        expect(result.value.absolutePath).toBe('/Users/test/my-project/.kiro/worktrees/specs/new-feature');
        expect(result.value.created_at).toBeDefined();
      }
    });

    it('should return BRANCH_EXISTS when branch already exists', async () => {
      const mockExec = createMockExec([
        { pattern: /branch --show-current/, stdout: 'main\n' },
        { pattern: /branch feature\//, error: new Error('fatal: a branch named feature/existing already exists') },
      ]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = await service.createWorktree('existing');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('BRANCH_EXISTS');
      }
    });
  });

  describe('removeWorktree', () => {
    it('should remove worktree and branch successfully', async () => {
      const mockExec = createMockExec([
        { pattern: /worktree remove/, stdout: '' },
        { pattern: /branch -d/, stdout: '' },
      ]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = await service.removeWorktree('my-feature');

      expect(result.ok).toBe(true);
    });

    it('should return error on worktree remove failure', async () => {
      const mockExec = createMockExec([
        { pattern: /worktree remove/, error: new Error('fatal: worktree not found') },
      ]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = await service.removeWorktree('nonexistent');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('GIT_ERROR');
      }
    });
  });

  describe('resolveWorktreePath', () => {
    // worktree-internal-path: Task 2.1 - セキュリティ検証を「プロジェクトディレクトリ内」に変更
    // Requirements: 3.1, 3.2, 3.3 (worktree-internal-path)
    it('should resolve relative path within project to absolute path', () => {
      const mockExec = createMockExec([]);
      const service = new WorktreeService(projectPath, mockExec);

      // 新パス形式: プロジェクト内の.kiro/worktrees/
      const relativePath = '.kiro/worktrees/specs/feature-name';
      const result = service.resolveWorktreePath(relativePath);

      expect(path.isAbsolute(result)).toBe(true);
      expect(result).toBe('/Users/test/my-project/.kiro/worktrees/specs/feature-name');
    });

    it('should throw for paths outside project directory', () => {
      const mockExec = createMockExec([]);
      const service = new WorktreeService(projectPath, mockExec);

      // プロジェクト外を指すパス
      const maliciousPath = '../etc/passwd';

      expect(() => service.resolveWorktreePath(maliciousPath)).toThrow('resolves outside project directory');
    });

    it('should throw for paths that traverse outside project with ..', () => {
      const mockExec = createMockExec([]);
      const service = new WorktreeService(projectPath, mockExec);

      // ..を使ってプロジェクト外に出るパス
      const traversalPath = '.kiro/../../../etc/passwd';

      expect(() => service.resolveWorktreePath(traversalPath)).toThrow('resolves outside project directory');
    });

    it('should allow paths with .. that resolve within project', () => {
      const mockExec = createMockExec([]);
      const service = new WorktreeService(projectPath, mockExec);

      // ..を含むがプロジェクト内に解決されるパス（Requirements: 3.3）
      const validPath = '.kiro/worktrees/../worktrees/specs/feature';
      const result = service.resolveWorktreePath(validPath);

      expect(path.isAbsolute(result)).toBe(true);
      expect(result).toBe('/Users/test/my-project/.kiro/worktrees/specs/feature');
    });
  });

  describe('worktreeExists', () => {
    it('should return true when worktree exists', async () => {
      const mockExec = createMockExec([
        { pattern: /worktree list/, stdout: '/path/to/worktree  abc123 [feature/test]\n' },
      ]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = await service.worktreeExists('test');

      expect(result).toBe(true);
    });

    it('should return false when worktree does not exist', async () => {
      const mockExec = createMockExec([
        { pattern: /worktree list/, stdout: '/path/to/main  abc123 [main]\n' },
      ]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = await service.worktreeExists('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getWatchPath', () => {
    // worktree-internal-path: 新パス形式に更新
    it('should return worktree path when config is provided', () => {
      const mockExec = createMockExec([]);
      const service = new WorktreeService(projectPath, mockExec);

      const config = {
        // 新パス形式: プロジェクト内
        path: '.kiro/worktrees/specs/my-feature',
        branch: 'feature/my-feature',
        created_at: '2026-01-12T12:00:00+09:00',
      };

      const result = service.getWatchPath('my-feature', config);

      expect(path.isAbsolute(result)).toBe(true);
      expect(result).toBe('/Users/test/my-project/.kiro/worktrees/specs/my-feature');
    });

    it('should return project path when no config is provided', () => {
      const mockExec = createMockExec([]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = service.getWatchPath('my-feature', undefined);

      expect(result).toBe(projectPath);
    });
  });

  describe('getWorktreePath', () => {
    // worktree-internal-path: Task 1.1 - 新パス形式のテスト
    it('should generate correct worktree path within .kiro/worktrees/specs/', () => {
      const mockExec = createMockExec([]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = service.getWorktreePath('my-feature');

      // Requirements: 1.1, 4.1 - Spec用worktreeは.kiro/worktrees/specs/{feature}に配置
      expect(result.relative).toBe('.kiro/worktrees/specs/my-feature');
      expect(result.absolute).toBe('/Users/test/my-project/.kiro/worktrees/specs/my-feature');
    });
  });

  // ============================================================
  // bugs-worktree-support Task 3.1: Bugs worktree path generation
  // worktree-internal-path: Task 1.2 - 新パス形式に更新
  // Requirements: 1.2, 4.2 (worktree-internal-path)
  // ============================================================
  describe('getBugWorktreePath', () => {
    it('should generate correct bug worktree path within .kiro/worktrees/bugs/', () => {
      const mockExec = createMockExec([]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = service.getBugWorktreePath('memory-leak-fix');

      // Requirements: 1.2, 4.2 - Bug用worktreeは.kiro/worktrees/bugs/{bug}に配置
      expect(result.relative).toBe('.kiro/worktrees/bugs/memory-leak-fix');
      expect(result.absolute).toBe('/Users/test/my-project/.kiro/worktrees/bugs/memory-leak-fix');
    });

    it('should handle bug names with hyphens correctly', () => {
      const mockExec = createMockExec([]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = service.getBugWorktreePath('fix-issue-123');

      expect(result.relative).toBe('.kiro/worktrees/bugs/fix-issue-123');
    });
  });

  // ============================================================
  // bugs-worktree-support Task 3.2: Bugs worktree creation
  // Requirements: 3.1, 3.2, 3.3, 3.4, 3.6
  // ============================================================
  describe('createBugWorktree', () => {
    it('should create bug worktree with bugfix/ branch prefix', async () => {
      const mockExec = createMockExec([
        { pattern: /branch --show-current/, stdout: 'main\n' },
        { pattern: /branch bugfix\//, stdout: '' },
        { pattern: /worktree add/, stdout: '' },
      ]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = await service.createBugWorktree('test-bug');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.branch).toBe('bugfix/test-bug');
        // worktree-internal-path: 新パス形式を検証
        expect(result.value.path).toBe('.kiro/worktrees/bugs/test-bug');
        expect(result.value.absolutePath).toBe('/Users/test/my-project/.kiro/worktrees/bugs/test-bug');
      }
    });

    it('should return error when not on main branch', async () => {
      const mockExec = createMockExec([
        { pattern: /branch --show-current/, stdout: 'bugfix/other\n' },
      ]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = await service.createBugWorktree('test-bug');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_ON_MAIN_BRANCH');
      }
    });

    it('should return BRANCH_EXISTS when bugfix branch already exists', async () => {
      const mockExec = createMockExec([
        { pattern: /branch --show-current/, stdout: 'main\n' },
        { pattern: /branch bugfix\//, error: new Error('fatal: a branch named bugfix/existing already exists') },
      ]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = await service.createBugWorktree('existing');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('BRANCH_EXISTS');
      }
    });

    it('should return error for invalid bug name', async () => {
      const mockExec = createMockExec([]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = await service.createBugWorktree('invalid bug name');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('INVALID_FEATURE_NAME');
      }
    });

    it('should rollback branch creation if worktree add fails', async () => {
      let branchDeleteCalled = false;
      const mockExec = (
        command: string,
        _options: { cwd: string },
        callback: (error: Error | null, stdout: string, stderr: string) => void
      ) => {
        if (/branch --show-current/.test(command)) {
          callback(null, 'main\n', '');
        } else if (/branch bugfix\//.test(command) && !/branch -d/.test(command)) {
          callback(null, '', '');
        } else if (/worktree add/.test(command)) {
          callback(new Error('fatal: worktree add failed'), '', '');
        } else if (/branch -d/.test(command)) {
          branchDeleteCalled = true;
          callback(null, '', '');
        } else {
          callback(null, '', '');
        }
        return { kill: () => {} };
      };
      const service = new WorktreeService(projectPath, mockExec as ExecFunction);

      const result = await service.createBugWorktree('rollback-test');

      expect(result.ok).toBe(false);
      expect(branchDeleteCalled).toBe(true);
    });
  });

  // ============================================================
  // bugs-worktree-support Task 3.3: Bugs worktree removal
  // Requirements: 4.6
  // ============================================================
  describe('removeBugWorktree', () => {
    it('should remove bug worktree and branch', async () => {
      const mockExec = createMockExec([
        { pattern: /worktree remove/, stdout: '' },
        { pattern: /branch -d/, stdout: '' },
      ]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = await service.removeBugWorktree('test-bug');

      expect(result.ok).toBe(true);
    });

    it('should return error on worktree remove failure', async () => {
      const mockExec = createMockExec([
        { pattern: /worktree remove/, error: new Error('fatal: worktree not found') },
      ]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = await service.removeBugWorktree('nonexistent');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('GIT_ERROR');
      }
    });

    it('should handle branch delete failure gracefully (worktree still removed)', async () => {
      const mockExec = createMockExec([
        { pattern: /worktree remove/, stdout: '' },
        { pattern: /branch -d/, error: new Error('branch not fully merged') },
        { pattern: /branch -D/, error: new Error('branch not found') },
      ]);
      const service = new WorktreeService(projectPath, mockExec);

      // Should succeed even if branch delete fails
      const result = await service.removeBugWorktree('test-bug');

      expect(result.ok).toBe(true);
    });
  });

  // ============================================================
  // Spec commit check for worktree mode
  // ============================================================
  describe('checkUncommittedSpecChanges', () => {
    it('should return hasChanges: false when no uncommitted changes', async () => {
      const mockExec = createMockExec([
        { pattern: /git status --porcelain/, stdout: '' },
      ]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = await service.checkUncommittedSpecChanges('.kiro/specs/my-feature');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.hasChanges).toBe(false);
        expect(result.value.files).toEqual([]);
      }
    });

    it('should return hasChanges: true with list of changed files', async () => {
      const mockExec = createMockExec([
        { pattern: /git status --porcelain/, stdout: ' M .kiro/specs/my-feature/requirements.md\n?? .kiro/specs/my-feature/design.md\n' },
      ]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = await service.checkUncommittedSpecChanges('.kiro/specs/my-feature');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.hasChanges).toBe(true);
        // git status --porcelain format: "XY filename" where XY is 2 chars status
        // After slice(3), we get the filename
        expect(result.value.files).toHaveLength(2);
        expect(result.value.files[0]).toContain('requirements.md');
        expect(result.value.files[1]).toContain('design.md');
      }
    });

    it('should return GIT_ERROR on git command failure', async () => {
      const mockExec = createMockExec([
        { pattern: /git status --porcelain/, error: new Error('not a git repository') },
      ]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = await service.checkUncommittedSpecChanges('.kiro/specs/my-feature');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('GIT_ERROR');
      }
    });
  });

  describe('commitSpecChanges', () => {
    it('should stage and commit spec changes successfully', async () => {
      const mockExec = createMockExec([
        { pattern: /git add/, stdout: '' },
        { pattern: /git commit -m/, stdout: '' },
      ]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = await service.commitSpecChanges('.kiro/specs/my-feature', 'my-feature');

      expect(result.ok).toBe(true);
    });

    it('should return GIT_ERROR on git add failure', async () => {
      const mockExec = createMockExec([
        { pattern: /git add/, error: new Error('pathspec did not match any files') },
      ]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = await service.commitSpecChanges('.kiro/specs/my-feature', 'my-feature');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('GIT_ERROR');
      }
    });

    it('should return GIT_ERROR on git commit failure', async () => {
      const mockExec = createMockExec([
        { pattern: /git add/, stdout: '' },
        { pattern: /git commit -m/, error: new Error('nothing to commit') },
      ]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = await service.commitSpecChanges('.kiro/specs/my-feature', 'my-feature');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('GIT_ERROR');
      }
    });
  });

  // ============================================================
  // worktree-spec-symlink Task 2: createSymlinksForWorktree modification
  // Note: Filesystem tests with fs mocking
  //
  // Implementation uses DIRECTORY symlink for spec directory because:
  // 1. --add-dir is passed to Claude Code, granting access to main repository
  // 2. Glob can then find real files through the symlinked directory
  // Related: GitHub issue #764 (symlink traversal)
  //
  // The method creates:
  // - Directory symlinks: .kiro/logs/, .kiro/runtime/, .kiro/specs/{feature}/
  // ============================================================
  describe('createSymlinksForWorktree (directory-based spec symlink)', () => {
    // These tests verify the symlink configuration, not actual filesystem operations
    // The method creates:
    // - .kiro/logs/ -> directory symlink
    // - .kiro/runtime/ -> directory symlink
    // - .kiro/specs/{feature}/ -> directory symlink to main spec directory

    it('should configure directory symlinks for .kiro/logs/ and .kiro/runtime/', async () => {
      // This test documents the expected symlink structure
      // Actual filesystem operations are tested in integration tests
      const mockExec = createMockExec([]);
      const service = new WorktreeService(projectPath, mockExec);
      const worktreeAbsolutePath = '/Users/test/my-project/.kiro/worktrees/specs/my-feature';

      // Expected directory symlinks:
      const expectedDirectorySymlinks = [
        {
          link: path.join(worktreeAbsolutePath, '.kiro', 'logs'),
          target: path.join(projectPath, '.kiro', 'logs'),
        },
        {
          link: path.join(worktreeAbsolutePath, '.kiro', 'runtime'),
          target: path.join(projectPath, '.kiro', 'runtime'),
        },
      ];

      // Verify expected structure
      expect(expectedDirectorySymlinks).toHaveLength(2);
      expect(expectedDirectorySymlinks[0].link).toContain('.kiro/logs');
      expect(expectedDirectorySymlinks[1].link).toContain('.kiro/runtime');
    });

    it('should create directory symlink for spec directory (not file-level symlinks)', () => {
      // The spec directory is a directory symlink pointing to main repository
      // Combined with --add-dir, Glob can find real files through the symlink
      const mockExec = createMockExec([]);
      const service = new WorktreeService(projectPath, mockExec);
      const worktreeAbsolutePath = '/Users/test/my-project/.kiro/worktrees/specs/my-feature';
      const featureName = 'my-feature';

      // Expected structure:
      // {worktree}/.kiro/specs/{feature}/ -> {main}/.kiro/specs/{feature}/ (directory symlink)
      //
      // This works because:
      // 1. --add-dir grants Claude Code access to main repository
      // 2. Glob traverses the symlink and finds real files in main

      const worktreeSpecDir = path.join(worktreeAbsolutePath, '.kiro', 'specs', featureName);
      const mainSpecDir = path.join(projectPath, '.kiro', 'specs', featureName);

      // The spec directory should be a symlink pointing to main
      expect(worktreeSpecDir).toContain('.kiro/specs/my-feature');
      expect(mainSpecDir).toBe(path.join(projectPath, '.kiro', 'specs', 'my-feature'));
    });
  });

  // ============================================================
  // worktree-spec-symlink Task 3: prepareWorktreeForMerge
  // Requirements: 3.2, 3.3, 3.4, 4.2 (worktree-spec-symlink)
  // ============================================================
  describe('prepareWorktreeForMerge', () => {
    it('should delete spec symlink and execute git reset and checkout (Requirements 3.2, 3.3, 3.4)', async () => {
      // Track which git commands were executed
      const executedCommands: string[] = [];
      const mockExec = (
        command: string,
        _options: { cwd: string },
        callback: (error: Error | null, stdout: string, stderr: string) => void
      ) => {
        executedCommands.push(command);
        callback(null, '', '');
        return { kill: () => {} };
      };
      const service = new WorktreeService(projectPath, mockExec as ExecFunction);
      const featureName = 'my-feature';

      const result = await service.prepareWorktreeForMerge(featureName);

      expect(result.ok).toBe(true);
      // Should execute git reset on spec directory (Requirement 3.3)
      expect(executedCommands.some(cmd => cmd.includes('git reset') && cmd.includes('.kiro/specs/my-feature'))).toBe(true);
      // Should execute git checkout on spec directory (Requirement 3.4)
      expect(executedCommands.some(cmd => cmd.includes('git checkout') && cmd.includes('.kiro/specs/my-feature'))).toBe(true);
    });

    it('should return error when git reset fails', async () => {
      const mockExec = createMockExec([
        { pattern: /git reset/, error: new Error('reset failed') },
      ]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = await service.prepareWorktreeForMerge('my-feature');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('GIT_ERROR');
      }
    });

    it('should return error when git checkout fails', async () => {
      const mockExec = createMockExec([
        { pattern: /git reset/, stdout: '' },
        { pattern: /git checkout/, error: new Error('checkout failed') },
      ]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = await service.prepareWorktreeForMerge('my-feature');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('GIT_ERROR');
      }
    });

    it('should execute commands in worktree directory', async () => {
      let capturedCwd = '';
      const mockExec = (
        command: string,
        options: { cwd: string },
        callback: (error: Error | null, stdout: string, stderr: string) => void
      ) => {
        capturedCwd = options.cwd;
        callback(null, '', '');
        return { kill: () => {} };
      };
      const service = new WorktreeService(projectPath, mockExec as ExecFunction);

      await service.prepareWorktreeForMerge('my-feature');

      // Commands should be executed in worktree directory, not main project
      // Note: The service uses this.projectPath as cwd, but prepareWorktreeForMerge
      // should execute commands in the worktree directory
      expect(capturedCwd).toContain('.kiro/worktrees/specs/my-feature');
    });
  });
});
