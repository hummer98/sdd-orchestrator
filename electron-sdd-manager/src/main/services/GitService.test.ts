/**
 * GitService Tests
 *
 * worktree-gitview-diff-bug: Added worktree mode integration tests
 * - Worktree environment detection
 * - baseBranch detection in worktree
 * - Diff command generation for worktree mode
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitService } from './GitService';

describe('GitService', () => {
  let gitService: GitService;

  beforeEach(() => {
    gitService = new GitService();
  });

  describe('Interface', () => {
    it('should have getStatus method', () => {
      expect(gitService.getStatus).toBeDefined();
      expect(typeof gitService.getStatus).toBe('function');
    });

    it('should have getDiff method', () => {
      expect(gitService.getDiff).toBeDefined();
      expect(typeof gitService.getDiff).toBe('function');
    });

    it('should have detectBaseBranch method', () => {
      expect(gitService.detectBaseBranch).toBeDefined();
      expect(typeof gitService.detectBaseBranch).toBe('function');
    });
  });

  describe('getStatus - Integration', () => {
    it('should return error for non-existent path', async () => {
      const result = await gitService.getStatus('/non/existent/path');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('validation_error');
        expect(result.error.message).toContain('Not a git repository');
      }
    });

    it('should return error for non-git directory', async () => {
      const result = await gitService.getStatus('/tmp');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('validation_error');
      }
    });

    // Real integration test - only runs if we're in a git repo
    it.skip('should return git status for current worktree (manual test)', async () => {
      // This test is skipped in CI but can be run manually
      const currentDir = process.cwd();
      const result = await gitService.getStatus(currentDir);

      if (result.success) {
        expect(result.data.files).toBeInstanceOf(Array);
        expect(result.data.mode).toMatch(/worktree|normal/);
      }
    });
  });

  describe('getDiff - Integration', () => {
    it('should return error for non-git directory', async () => {
      const result = await gitService.getDiff('/tmp', 'test.txt');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('validation_error');
        expect(result.error.message).toContain('Not a git repository');
      }
    });

    it('should generate correct git diff command for worktree mode', async () => {
      // worktree-gitview-diff-bug fix:
      // In worktree mode, getDiff tries uncommitted changes first (git diff HEAD),
      // then committed changes (git diff baseBranch...HEAD)
      const mockGetStatus = vi.spyOn(gitService, 'getStatus').mockResolvedValue({
        success: true,
        data: {
          files: [{ path: 'src/test.ts', status: 'M' }],
          baseBranch: 'master',
          mode: 'worktree',
        },
      });

      // Mock execGit to capture the arguments
      const execGitCalls: string[][] = [];
      const mockExecGit = vi
        .spyOn(gitService as never, 'execGit')
        .mockImplementation((_cwd: string, args: string[]) => {
          execGitCalls.push(args);
          return Promise.resolve({ success: true, data: 'diff output' });
        });

      // Mock validateGitRepository to pass
      vi.spyOn(gitService as never, 'validateGitRepository').mockResolvedValue({
        success: true,
        data: undefined,
      });

      await gitService.getDiff('/test/project', 'src/test.ts');

      // First call: uncommitted changes (git diff HEAD)
      expect(execGitCalls[0]).toEqual(['diff', 'HEAD', '--', 'src/test.ts']);
      // Second call: committed changes (git diff baseBranch...HEAD)
      expect(execGitCalls[1]).toEqual(['diff', 'master...HEAD', '--', 'src/test.ts']);

      mockGetStatus.mockRestore();
      mockExecGit.mockRestore();
    });

    it('should generate correct git diff command for normal mode', async () => {
      // Mock getStatus to return normal mode
      const mockGetStatus = vi.spyOn(gitService, 'getStatus').mockResolvedValue({
        success: true,
        data: {
          files: [{ path: 'src/test.ts', status: 'M' }],
          mode: 'normal',
        },
      });

      // Mock execGit to capture the arguments
      const execGitCalls: string[][] = [];
      const mockExecGit = vi
        .spyOn(gitService as never, 'execGit')
        .mockImplementation((_cwd: string, args: string[]) => {
          execGitCalls.push(args);
          return Promise.resolve({ success: true, data: 'diff output' });
        });

      // Mock validateGitRepository to pass
      vi.spyOn(gitService as never, 'validateGitRepository').mockResolvedValue({
        success: true,
        data: undefined,
      });

      await gitService.getDiff('/test/project', 'src/test.ts');

      // Verify the git diff command is correct for normal mode
      // Should be: git diff -- src/test.ts
      const diffCall = execGitCalls.find(args => args[0] === 'diff');
      expect(diffCall).toEqual(['diff', '--', 'src/test.ts']);

      mockGetStatus.mockRestore();
      mockExecGit.mockRestore();
    });

    it.skip('should reject paths with parent directory references (integration test)', async () => {
      // This test requires a valid git repository
      // Skip in unit tests, run manually for integration testing
      const currentDir = process.cwd();
      const result = await gitService.getDiff(currentDir, '../etc/passwd');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('validation_error');
        expect(result.error.message).toContain('Invalid file path');
      }
    });

    it.skip('should reject absolute paths (integration test)', async () => {
      // This test requires a valid git repository
      // Skip in unit tests, run manually for integration testing
      const currentDir = process.cwd();
      const result = await gitService.getDiff(currentDir, '/etc/passwd');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('validation_error');
      }
    });
  });

  describe('detectBaseBranch', () => {
    it('should return error for non-git directory', async () => {
      const result = await gitService.detectBaseBranch('/tmp');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toMatch(/validation_error|git_error/);
      }
    });

    it.skip('should detect base branch from worktree HEAD file (integration test)', async () => {
      // This test requires a valid worktree environment
      // Skip in unit tests, run manually in worktree
      const currentDir = process.cwd();
      const result = await gitService.detectBaseBranch(currentDir);

      if (result.success) {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('string');
        expect(result.data.length).toBeGreaterThan(0);
      }
    });

    it.skip('should fallback to current branch for non-worktree (integration test)', async () => {
      // This test requires a valid non-worktree git repository
      // Skip in unit tests, run manually
      const currentDir = process.cwd();
      const result = await gitService.detectBaseBranch(currentDir);

      if (result.success) {
        expect(result.data).toBeTruthy();
      }
    });

    it.skip('should handle detached HEAD state with fallback (integration test)', async () => {
      // This test requires a repository in detached HEAD state
      // Skip in unit tests, manual testing only
      const currentDir = process.cwd();
      const result = await gitService.detectBaseBranch(currentDir);

      // Should still succeed with fallback
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeTruthy();
      }
    });
  });

  // ============================================================
  // worktree-gitview-diff-bug: Worktree Mode Integration Tests
  // ============================================================
  describe('Worktree Mode - getDiff Integration', () => {
    it('should try uncommitted changes first, then committed changes in worktree mode', async () => {
      // worktree-gitview-diff-bug fix:
      // In worktree mode, getDiff() now tries uncommitted changes first (git diff HEAD),
      // then falls back to committed changes (git diff baseBranch...HEAD)
      const mockGetStatus = vi.spyOn(gitService, 'getStatus').mockResolvedValue({
        success: true,
        data: {
          files: [{ path: 'src/feature.ts', status: 'M' }],
          baseBranch: 'main',
          mode: 'worktree',
        },
      });

      // Mock execGit to capture the arguments
      const execGitCalls: string[][] = [];
      const mockExecGit = vi
        .spyOn(gitService as never, 'execGit')
        .mockImplementation((_cwd: string, args: string[]) => {
          execGitCalls.push(args);
          // Return non-empty diff for uncommitted changes
          return Promise.resolve({ success: true, data: 'diff output' });
        });

      // Mock validateGitRepository to pass
      vi.spyOn(gitService as never, 'validateGitRepository').mockResolvedValue({
        success: true,
        data: undefined,
      });

      await gitService.getDiff('/worktree/path', 'src/feature.ts');

      // Verify first call is for uncommitted changes (git diff HEAD)
      expect(execGitCalls[0]).toEqual(['diff', 'HEAD', '--', 'src/feature.ts']);
      // Verify second call is for committed changes (git diff baseBranch...HEAD)
      expect(execGitCalls[1]).toEqual(['diff', 'main...HEAD', '--', 'src/feature.ts']);

      mockGetStatus.mockRestore();
      mockExecGit.mockRestore();
    });

    it('should return uncommitted diff when available in worktree mode', async () => {
      const mockGetStatus = vi.spyOn(gitService, 'getStatus').mockResolvedValue({
        success: true,
        data: {
          files: [{ path: 'src/feature.ts', status: 'M' }],
          baseBranch: 'main',
          mode: 'worktree',
        },
      });

      const mockExecGit = vi
        .spyOn(gitService as never, 'execGit')
        .mockImplementation((_cwd: string, args: string[]) => {
          if (args[1] === 'HEAD') {
            return Promise.resolve({ success: true, data: 'uncommitted diff output' });
          }
          return Promise.resolve({ success: true, data: 'committed diff output' });
        });

      vi.spyOn(gitService as never, 'validateGitRepository').mockResolvedValue({
        success: true,
        data: undefined,
      });

      const result = await gitService.getDiff('/worktree/path', 'src/feature.ts');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('uncommitted diff output');
      }

      mockGetStatus.mockRestore();
      mockExecGit.mockRestore();
    });

    it('should fallback to committed diff when uncommitted is empty in worktree mode', async () => {
      const mockGetStatus = vi.spyOn(gitService, 'getStatus').mockResolvedValue({
        success: true,
        data: {
          files: [{ path: 'src/feature.ts', status: 'M' }],
          baseBranch: 'main',
          mode: 'worktree',
        },
      });

      const mockExecGit = vi
        .spyOn(gitService as never, 'execGit')
        .mockImplementation((_cwd: string, args: string[]) => {
          if (args[1] === 'HEAD') {
            // Empty uncommitted changes
            return Promise.resolve({ success: true, data: '' });
          }
          // Return committed diff
          return Promise.resolve({ success: true, data: 'committed diff output' });
        });

      vi.spyOn(gitService as never, 'validateGitRepository').mockResolvedValue({
        success: true,
        data: undefined,
      });

      const result = await gitService.getDiff('/worktree/path', 'src/feature.ts');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('committed diff output');
      }

      mockGetStatus.mockRestore();
      mockExecGit.mockRestore();
    });

    it('should use simple diff for normal mode (no baseBranch)', async () => {
      // Mock getStatus to return normal mode (no baseBranch)
      const mockGetStatus = vi.spyOn(gitService, 'getStatus').mockResolvedValue({
        success: true,
        data: {
          files: [{ path: 'src/file.ts', status: 'M' }],
          mode: 'normal',
        },
      });

      const execGitCalls: string[][] = [];
      const mockExecGit = vi
        .spyOn(gitService as never, 'execGit')
        .mockImplementation((_cwd: string, args: string[]) => {
          execGitCalls.push(args);
          return Promise.resolve({ success: true, data: 'diff output' });
        });

      vi.spyOn(gitService as never, 'validateGitRepository').mockResolvedValue({
        success: true,
        data: undefined,
      });

      await gitService.getDiff('/normal/project', 'src/file.ts');

      // Verify the git diff command does NOT include baseBranch
      const diffCall = execGitCalls.find(args => args[0] === 'diff');
      expect(diffCall).toEqual(['diff', '--', 'src/file.ts']);

      mockGetStatus.mockRestore();
      mockExecGit.mockRestore();
    });

    it('should handle worktree with master as baseBranch', async () => {
      const mockGetStatus = vi.spyOn(gitService, 'getStatus').mockResolvedValue({
        success: true,
        data: {
          files: [{ path: 'src/feature.ts', status: 'A' }],
          baseBranch: 'master',
          mode: 'worktree',
        },
      });

      const execGitCalls: string[][] = [];
      const mockExecGit = vi
        .spyOn(gitService as never, 'execGit')
        .mockImplementation((_cwd: string, args: string[]) => {
          execGitCalls.push(args);
          return Promise.resolve({ success: true, data: 'new file diff' });
        });

      vi.spyOn(gitService as never, 'validateGitRepository').mockResolvedValue({
        success: true,
        data: undefined,
      });

      await gitService.getDiff('/worktree/path', 'src/feature.ts');

      // First call should be for uncommitted changes
      expect(execGitCalls[0]).toEqual(['diff', 'HEAD', '--', 'src/feature.ts']);
      // Second call should use master as baseBranch
      expect(execGitCalls[1]).toEqual(['diff', 'master...HEAD', '--', 'src/feature.ts']);

      mockGetStatus.mockRestore();
      mockExecGit.mockRestore();
    });
  });

  describe('Worktree Mode - getStatus Integration', () => {
    it('should return worktree mode when .git is a file (worktree indicator)', async () => {
      // This test verifies the logic flow when isWorktreeEnvironment returns true
      const mockIsWorktree = vi.spyOn(gitService as never, 'isWorktreeEnvironment').mockResolvedValue(true);
      const mockGetWorktreeStatus = vi.spyOn(gitService as never, 'getWorktreeStatus').mockResolvedValue({
        success: true,
        data: {
          files: [{ path: 'src/feature.ts', status: 'M' }],
          baseBranch: 'main',
          mode: 'worktree',
        },
      });
      vi.spyOn(gitService as never, 'validateGitRepository').mockResolvedValue({
        success: true,
        data: undefined,
      });

      const result = await gitService.getStatus('/worktree/path');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.mode).toBe('worktree');
        expect(result.data.baseBranch).toBe('main');
      }

      mockIsWorktree.mockRestore();
      mockGetWorktreeStatus.mockRestore();
    });

    it('should return normal mode when .git is a directory', async () => {
      const mockIsWorktree = vi.spyOn(gitService as never, 'isWorktreeEnvironment').mockResolvedValue(false);
      const mockGetNormalStatus = vi.spyOn(gitService as never, 'getNormalStatus').mockResolvedValue({
        success: true,
        data: {
          files: [{ path: 'src/file.ts', status: 'M' }],
          mode: 'normal',
        },
      });
      vi.spyOn(gitService as never, 'validateGitRepository').mockResolvedValue({
        success: true,
        data: undefined,
      });

      const result = await gitService.getStatus('/normal/project');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.mode).toBe('normal');
        expect(result.data.baseBranch).toBeUndefined();
      }

      mockIsWorktree.mockRestore();
      mockGetNormalStatus.mockRestore();
    });
  });

  describe('Worktree Mode - Edge Cases', () => {
    it('should handle untracked file in worktree mode', async () => {
      // Untracked files should generate synthetic diff regardless of mode
      const mockGetStatus = vi.spyOn(gitService, 'getStatus').mockResolvedValue({
        success: true,
        data: {
          files: [{ path: 'src/newFile.ts', status: '??' }],
          baseBranch: 'main',
          mode: 'worktree',
        },
      });

      const mockGenerateUntrackedDiff = vi
        .spyOn(gitService as never, 'generateUntrackedDiff')
        .mockResolvedValue({
          success: true,
          data: 'diff --git a/src/newFile.ts b/src/newFile.ts\nnew file mode 100644\n...',
        });

      vi.spyOn(gitService as never, 'validateGitRepository').mockResolvedValue({
        success: true,
        data: undefined,
      });

      const result = await gitService.getDiff('/worktree/path', 'src/newFile.ts');

      expect(result.success).toBe(true);
      expect(mockGenerateUntrackedDiff).toHaveBeenCalledWith('/worktree/path', 'src/newFile.ts');

      mockGetStatus.mockRestore();
      mockGenerateUntrackedDiff.mockRestore();
    });

    it('should return empty diff when file has no changes from baseBranch', async () => {
      const mockGetStatus = vi.spyOn(gitService, 'getStatus').mockResolvedValue({
        success: true,
        data: {
          files: [{ path: 'src/unchanged.ts', status: 'M' }],
          baseBranch: 'main',
          mode: 'worktree',
        },
      });

      const mockExecGit = vi
        .spyOn(gitService as never, 'execGit')
        .mockResolvedValue({ success: true, data: '' }); // Empty diff

      vi.spyOn(gitService as never, 'validateGitRepository').mockResolvedValue({
        success: true,
        data: undefined,
      });

      const result = await gitService.getDiff('/worktree/path', 'src/unchanged.ts');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('');
      }

      mockGetStatus.mockRestore();
      mockExecGit.mockRestore();
    });

    it('should handle error when baseBranch is not found', async () => {
      const mockGetStatus = vi.spyOn(gitService, 'getStatus').mockResolvedValue({
        success: true,
        data: {
          files: [{ path: 'src/feature.ts', status: 'M' }],
          baseBranch: 'non-existent-branch',
          mode: 'worktree',
        },
      });

      const mockExecGit = vi
        .spyOn(gitService as never, 'execGit')
        .mockResolvedValue({
          success: false,
          error: {
            type: 'git_error',
            message: "fatal: ambiguous argument 'non-existent-branch...HEAD': unknown revision",
          },
        });

      vi.spyOn(gitService as never, 'validateGitRepository').mockResolvedValue({
        success: true,
        data: undefined,
      });

      const result = await gitService.getDiff('/worktree/path', 'src/feature.ts');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('unknown revision');
      }

      mockGetStatus.mockRestore();
      mockExecGit.mockRestore();
    });
  });
});
