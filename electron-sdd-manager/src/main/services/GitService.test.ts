import { describe, it, expect, beforeEach } from 'vitest';
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
