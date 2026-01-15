/**
 * BugJson Type Tests
 * Requirements: 1.1, 1.2, 1.3, 1.4 (bugs-worktree-support)
 */

import { describe, it, expect } from 'vitest';
import {
  isBugWorktreeConfig,
  isBugWorktreeMode,
  type BugJson,
  type BugWorktreeConfig,
} from './bugJson';

describe('BugWorktreeConfig', () => {
  describe('isBugWorktreeConfig', () => {
    it('should return true for valid worktree config', () => {
      const config: BugWorktreeConfig = {
        path: '../project-worktrees/bugs/test-bug',
        branch: 'bugfix/test-bug',
        created_at: '2025-01-15T00:00:00Z',
      };
      expect(isBugWorktreeConfig(config)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isBugWorktreeConfig(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isBugWorktreeConfig(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isBugWorktreeConfig('string')).toBe(false);
      expect(isBugWorktreeConfig(123)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isBugWorktreeConfig({})).toBe(false);
    });

    it('should return false for missing path', () => {
      const config = {
        branch: 'bugfix/test-bug',
        created_at: '2025-01-15T00:00:00Z',
      };
      expect(isBugWorktreeConfig(config)).toBe(false);
    });

    it('should return false for empty path', () => {
      const config = {
        path: '',
        branch: 'bugfix/test-bug',
        created_at: '2025-01-15T00:00:00Z',
      };
      expect(isBugWorktreeConfig(config)).toBe(false);
    });

    it('should return false for missing branch', () => {
      const config = {
        path: '../project-worktrees/bugs/test-bug',
        created_at: '2025-01-15T00:00:00Z',
      };
      expect(isBugWorktreeConfig(config)).toBe(false);
    });

    it('should return false for empty branch', () => {
      const config = {
        path: '../project-worktrees/bugs/test-bug',
        branch: '',
        created_at: '2025-01-15T00:00:00Z',
      };
      expect(isBugWorktreeConfig(config)).toBe(false);
    });

    it('should return false for missing created_at', () => {
      const config = {
        path: '../project-worktrees/bugs/test-bug',
        branch: 'bugfix/test-bug',
      };
      expect(isBugWorktreeConfig(config)).toBe(false);
    });

    it('should return false for empty created_at', () => {
      const config = {
        path: '../project-worktrees/bugs/test-bug',
        branch: 'bugfix/test-bug',
        created_at: '',
      };
      expect(isBugWorktreeConfig(config)).toBe(false);
    });
  });
});

describe('BugJson', () => {
  describe('isBugWorktreeMode', () => {
    it('should return true when worktree field exists with valid config', () => {
      const bugJson: BugJson = {
        bug_name: 'test-bug',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
        worktree: {
          path: '../project-worktrees/bugs/test-bug',
          branch: 'bugfix/test-bug',
          created_at: '2025-01-15T00:00:00Z',
        },
      };
      expect(isBugWorktreeMode(bugJson)).toBe(true);
    });

    it('should return false when worktree field is undefined', () => {
      const bugJson: BugJson = {
        bug_name: 'test-bug',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
      };
      expect(isBugWorktreeMode(bugJson)).toBe(false);
    });

    it('should return false when worktree field is invalid', () => {
      const bugJson = {
        bug_name: 'test-bug',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
        worktree: {
          path: '', // Invalid: empty path
          branch: 'bugfix/test-bug',
          created_at: '2025-01-15T00:00:00Z',
        },
      };
      expect(isBugWorktreeMode(bugJson)).toBe(false);
    });

    it('should return false for object with no worktree field', () => {
      const obj = {
        bug_name: 'test-bug',
      };
      expect(isBugWorktreeMode(obj)).toBe(false);
    });
  });
});

describe('BugJson Type Structure', () => {
  it('should have the correct structure without worktree', () => {
    const bugJson: BugJson = {
      bug_name: 'memory-leak-fix',
      created_at: '2025-01-15T00:00:00Z',
      updated_at: '2025-01-15T12:00:00Z',
    };

    expect(bugJson.bug_name).toBe('memory-leak-fix');
    expect(bugJson.created_at).toBe('2025-01-15T00:00:00Z');
    expect(bugJson.updated_at).toBe('2025-01-15T12:00:00Z');
    expect(bugJson.worktree).toBeUndefined();
  });

  it('should have the correct structure with worktree', () => {
    const bugJson: BugJson = {
      bug_name: 'memory-leak-fix',
      created_at: '2025-01-15T00:00:00Z',
      updated_at: '2025-01-15T12:00:00Z',
      worktree: {
        path: '../project-worktrees/bugs/memory-leak-fix',
        branch: 'bugfix/memory-leak-fix',
        created_at: '2025-01-15T10:00:00Z',
      },
    };

    expect(bugJson.bug_name).toBe('memory-leak-fix');
    expect(bugJson.worktree).toBeDefined();
    expect(bugJson.worktree?.path).toBe('../project-worktrees/bugs/memory-leak-fix');
    expect(bugJson.worktree?.branch).toBe('bugfix/memory-leak-fix');
    expect(bugJson.worktree?.created_at).toBe('2025-01-15T10:00:00Z');
  });
});
