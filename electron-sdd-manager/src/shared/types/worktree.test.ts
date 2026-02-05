/**
 * Worktree Types Tests
 *
 * vcs-scheme-switching: Task 1.1 - VcsScheme type and WorktreeConfig extension
 * Requirements: 3.1, 3.2
 */

import { describe, it, expect } from 'vitest';
import {
  hasWorktreePath,
  isImplStarted,
  isWorktreeConfig,
  isValidVcsScheme,
  getWorktreeVcsScheme,
  type VcsScheme,
  type WorktreeConfig,
} from './worktree';

// =============================================================================
// Task 1.1: VcsScheme Type Definition Tests
// Requirements: 3.1, 3.2
// =============================================================================

describe('VcsScheme Type', () => {
  describe('isValidVcsScheme', () => {
    it('should return true for "git"', () => {
      expect(isValidVcsScheme('git')).toBe(true);
    });

    it('should return true for "jj"', () => {
      expect(isValidVcsScheme('jj')).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isValidVcsScheme('svn')).toBe(false);
      expect(isValidVcsScheme('mercurial')).toBe(false);
      expect(isValidVcsScheme('')).toBe(false);
      expect(isValidVcsScheme(null)).toBe(false);
      expect(isValidVcsScheme(undefined)).toBe(false);
      expect(isValidVcsScheme(123)).toBe(false);
    });
  });

  describe('getWorktreeVcsScheme', () => {
    it('should return "git" as default when vcsScheme is not set', () => {
      const worktreeConfig: WorktreeConfig = {
        branch: 'feature/test',
        created_at: '2026-02-05T10:00:00Z',
        enabled: true,
      };
      expect(getWorktreeVcsScheme(worktreeConfig)).toBe('git');
    });

    it('should return "git" when vcsScheme is explicitly "git"', () => {
      const worktreeConfig: WorktreeConfig = {
        branch: 'feature/test',
        created_at: '2026-02-05T10:00:00Z',
        enabled: true,
        vcsScheme: 'git',
      };
      expect(getWorktreeVcsScheme(worktreeConfig)).toBe('git');
    });

    it('should return "jj" when vcsScheme is "jj"', () => {
      const worktreeConfig: WorktreeConfig = {
        branch: 'feature/test',
        created_at: '2026-02-05T10:00:00Z',
        enabled: true,
        vcsScheme: 'jj',
      };
      expect(getWorktreeVcsScheme(worktreeConfig)).toBe('jj');
    });

    it('should return "git" for null worktree config', () => {
      expect(getWorktreeVcsScheme(null)).toBe('git');
    });

    it('should return "git" for undefined worktree config', () => {
      expect(getWorktreeVcsScheme(undefined)).toBe('git');
    });
  });
});

// =============================================================================
// Existing Tests (preserved)
// =============================================================================

describe('Worktree Types', () => {
  describe('hasWorktreePath', () => {
    it('should return true when worktree.path exists and is non-empty', () => {
      const specJson = {
        worktree: {
          path: '.kiro/worktrees/specs/my-feature',
          branch: 'feature/my-feature',
          created_at: '2026-02-05T10:00:00Z',
        },
      };
      expect(hasWorktreePath(specJson)).toBe(true);
    });

    it('should return false when worktree.path is empty', () => {
      const specJson = {
        worktree: {
          path: '',
          branch: 'feature/my-feature',
          created_at: '2026-02-05T10:00:00Z',
        },
      };
      expect(hasWorktreePath(specJson)).toBe(false);
    });

    it('should return false when worktree.path does not exist', () => {
      const specJson = {
        worktree: {
          branch: 'feature/my-feature',
          created_at: '2026-02-05T10:00:00Z',
        },
      };
      expect(hasWorktreePath(specJson)).toBe(false);
    });

    it('should return false when worktree is null', () => {
      const specJson = { worktree: null };
      expect(hasWorktreePath(specJson)).toBe(false);
    });

    it('should return false when specJson is null', () => {
      expect(hasWorktreePath(null)).toBe(false);
    });

    it('should return false when specJson is undefined', () => {
      expect(hasWorktreePath(undefined)).toBe(false);
    });
  });

  describe('isImplStarted', () => {
    it('should return true when worktree.branch exists', () => {
      const specJson = {
        worktree: {
          branch: 'feature/my-feature',
          created_at: '2026-02-05T10:00:00Z',
        },
      };
      expect(isImplStarted(specJson)).toBe(true);
    });

    it('should return false when worktree.branch is empty', () => {
      const specJson = {
        worktree: {
          branch: '',
          created_at: '2026-02-05T10:00:00Z',
        },
      };
      expect(isImplStarted(specJson)).toBe(false);
    });

    it('should return false when worktree does not exist', () => {
      const specJson = {};
      expect(isImplStarted(specJson)).toBe(false);
    });
  });

  describe('isWorktreeConfig', () => {
    it('should return true for valid config with branch and created_at', () => {
      const config = {
        branch: 'feature/test',
        created_at: '2026-02-05T10:00:00Z',
      };
      expect(isWorktreeConfig(config)).toBe(true);
    });

    it('should return true for valid config with vcsScheme', () => {
      const config = {
        branch: 'feature/test',
        created_at: '2026-02-05T10:00:00Z',
        vcsScheme: 'jj',
      };
      expect(isWorktreeConfig(config)).toBe(true);
    });

    it('should return false for config without branch', () => {
      const config = {
        created_at: '2026-02-05T10:00:00Z',
      };
      expect(isWorktreeConfig(config)).toBe(false);
    });

    it('should return false for config without created_at', () => {
      const config = {
        branch: 'feature/test',
      };
      expect(isWorktreeConfig(config)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isWorktreeConfig(null)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isWorktreeConfig('string')).toBe(false);
    });
  });
});
