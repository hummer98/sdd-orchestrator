/**
 * WorktreeService Unit Tests
 * TDD: Testing git worktree operations
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7, 7.6, 7.7, 8.1, 8.2 (git-worktree-support)
 * Requirements: 3.1, 3.3, 3.4, 4.6 (bugs-worktree-support)
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
        expect(result.value.path).toContain('new-feature');
        expect(result.value.absolutePath).toContain('my-project-worktrees');
        expect(result.value.absolutePath).toContain('new-feature');
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
    it('should resolve relative path to absolute path', () => {
      const mockExec = createMockExec([]);
      const service = new WorktreeService(projectPath, mockExec);

      const relativePath = '../my-project-worktrees/feature-name';
      const result = service.resolveWorktreePath(relativePath);

      expect(path.isAbsolute(result)).toBe(true);
      expect(result).toContain('my-project-worktrees');
      expect(result).toContain('feature-name');
    });

    it('should throw for paths outside parent directory', () => {
      const mockExec = createMockExec([]);
      const service = new WorktreeService(projectPath, mockExec);

      const maliciousPath = '../../../etc/passwd';

      expect(() => service.resolveWorktreePath(maliciousPath)).toThrow();
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
    it('should return worktree path when config is provided', () => {
      const mockExec = createMockExec([]);
      const service = new WorktreeService(projectPath, mockExec);

      const config = {
        path: '../my-project-worktrees/my-feature',
        branch: 'feature/my-feature',
        created_at: '2026-01-12T12:00:00+09:00',
      };

      const result = service.getWatchPath('my-feature', config);

      expect(path.isAbsolute(result)).toBe(true);
      expect(result).toContain('my-project-worktrees');
    });

    it('should return project path when no config is provided', () => {
      const mockExec = createMockExec([]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = service.getWatchPath('my-feature', undefined);

      expect(result).toBe(projectPath);
    });
  });

  describe('getWorktreePath', () => {
    it('should generate correct worktree path', () => {
      const mockExec = createMockExec([]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = service.getWorktreePath('my-feature');

      expect(result.relative).toBe('../my-project-worktrees/my-feature');
      expect(result.absolute).toContain('my-project-worktrees');
      expect(result.absolute).toContain('my-feature');
    });
  });

  // ============================================================
  // bugs-worktree-support Task 3.1: Bugs worktree path generation
  // Requirements: 3.3, 3.7
  // ============================================================
  describe('getBugWorktreePath', () => {
    it('should generate correct bug worktree path with bugs subdirectory', () => {
      const mockExec = createMockExec([]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = service.getBugWorktreePath('memory-leak-fix');

      expect(result.relative).toBe('../my-project-worktrees/bugs/memory-leak-fix');
      expect(result.absolute).toContain('my-project-worktrees/bugs');
      expect(result.absolute).toContain('memory-leak-fix');
    });

    it('should handle bug names with hyphens correctly', () => {
      const mockExec = createMockExec([]);
      const service = new WorktreeService(projectPath, mockExec);

      const result = service.getBugWorktreePath('fix-issue-123');

      expect(result.relative).toBe('../my-project-worktrees/bugs/fix-issue-123');
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
        expect(result.value.path).toContain('bugs/test-bug');
        expect(result.value.absolutePath).toContain('my-project-worktrees/bugs');
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
});
