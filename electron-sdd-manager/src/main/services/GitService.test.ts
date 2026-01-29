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
      // Mock getStatus to return worktree mode
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

      // Verify the git diff command is correct for worktree mode
      // Should be: git diff master...HEAD -- src/test.ts
      const diffCall = execGitCalls.find(args => args[0] === 'diff');
      expect(diffCall).toEqual(['diff', 'master...HEAD', '--', 'src/test.ts']);

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
});
