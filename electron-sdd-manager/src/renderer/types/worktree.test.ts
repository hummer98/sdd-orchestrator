/**
 * Worktree Types Unit Tests
 * TDD: Testing worktree type definitions and type guards
 * Requirements: 2.1, 2.2, 2.3 (git-worktree-support)
 */

import { describe, it, expect } from 'vitest';
import {
  isWorktreeConfig,
  isWorktreeMode,
  type WorktreeConfig,
  type WorktreeError,
  type WorktreeInfo,
  type WorktreeServiceResult,
} from './worktree';

describe('WorktreeConfig type guard', () => {
  describe('isWorktreeConfig', () => {
    it('should return true for valid WorktreeConfig', () => {
      const config: WorktreeConfig = {
        path: '../sdd-orchestrator-worktrees/my-feature',
        branch: 'feature/my-feature',
        created_at: '2026-01-12T12:00:00+09:00',
      };
      expect(isWorktreeConfig(config)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isWorktreeConfig(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isWorktreeConfig(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isWorktreeConfig('string')).toBe(false);
      expect(isWorktreeConfig(123)).toBe(false);
      expect(isWorktreeConfig(true)).toBe(false);
    });

    it('should return false for missing path', () => {
      const config = {
        branch: 'feature/my-feature',
        created_at: '2026-01-12T12:00:00+09:00',
      };
      expect(isWorktreeConfig(config)).toBe(false);
    });

    it('should return false for missing branch', () => {
      const config = {
        path: '../sdd-orchestrator-worktrees/my-feature',
        created_at: '2026-01-12T12:00:00+09:00',
      };
      expect(isWorktreeConfig(config)).toBe(false);
    });

    it('should return false for missing created_at', () => {
      const config = {
        path: '../sdd-orchestrator-worktrees/my-feature',
        branch: 'feature/my-feature',
      };
      expect(isWorktreeConfig(config)).toBe(false);
    });

    it('should return false for empty path', () => {
      const config = {
        path: '',
        branch: 'feature/my-feature',
        created_at: '2026-01-12T12:00:00+09:00',
      };
      expect(isWorktreeConfig(config)).toBe(false);
    });

    it('should return false for empty branch', () => {
      const config = {
        path: '../sdd-orchestrator-worktrees/my-feature',
        branch: '',
        created_at: '2026-01-12T12:00:00+09:00',
      };
      expect(isWorktreeConfig(config)).toBe(false);
    });

    it('should return false for empty created_at', () => {
      const config = {
        path: '../sdd-orchestrator-worktrees/my-feature',
        branch: 'feature/my-feature',
        created_at: '',
      };
      expect(isWorktreeConfig(config)).toBe(false);
    });

    it('should return false for wrong types', () => {
      expect(isWorktreeConfig({ path: 123, branch: 'test', created_at: 'test' })).toBe(false);
      expect(isWorktreeConfig({ path: 'test', branch: 123, created_at: 'test' })).toBe(false);
      expect(isWorktreeConfig({ path: 'test', branch: 'test', created_at: 123 })).toBe(false);
    });
  });
});

describe('isWorktreeMode', () => {
  it('should return true when worktree field is valid', () => {
    const specJson = {
      worktree: {
        path: '../sdd-orchestrator-worktrees/my-feature',
        branch: 'feature/my-feature',
        created_at: '2026-01-12T12:00:00+09:00',
      },
    };
    expect(isWorktreeMode(specJson)).toBe(true);
  });

  it('should return false when worktree field is undefined', () => {
    const specJson = {};
    expect(isWorktreeMode(specJson)).toBe(false);
  });

  it('should return false when worktree field is null', () => {
    const specJson = { worktree: null };
    expect(isWorktreeMode(specJson)).toBe(false);
  });

  it('should return false when worktree field is invalid', () => {
    const specJson = {
      worktree: {
        path: '../sdd-orchestrator-worktrees/my-feature',
        // missing branch and created_at
      },
    };
    expect(isWorktreeMode(specJson)).toBe(false);
  });

  it('should work with full SpecJson-like object', () => {
    const specJson = {
      feature_name: 'my-feature',
      created_at: '2026-01-12T12:00:00+09:00',
      updated_at: '2026-01-12T12:00:00+09:00',
      language: 'ja',
      phase: 'tasks-generated',
      approvals: {
        requirements: { generated: true, approved: true },
        design: { generated: true, approved: true },
        tasks: { generated: true, approved: true },
      },
      worktree: {
        path: '../sdd-orchestrator-worktrees/my-feature',
        branch: 'feature/my-feature',
        created_at: '2026-01-12T12:00:00+09:00',
      },
    };
    expect(isWorktreeMode(specJson)).toBe(true);
  });
});

describe('WorktreeError type', () => {
  it('should support NOT_ON_MAIN_BRANCH error', () => {
    const error: WorktreeError = {
      type: 'NOT_ON_MAIN_BRANCH',
      currentBranch: 'feature/some-branch',
    };
    expect(error.type).toBe('NOT_ON_MAIN_BRANCH');
    expect(error.currentBranch).toBe('feature/some-branch');
  });

  it('should support WORKTREE_EXISTS error', () => {
    const error: WorktreeError = {
      type: 'WORKTREE_EXISTS',
      path: '../sdd-orchestrator-worktrees/my-feature',
    };
    expect(error.type).toBe('WORKTREE_EXISTS');
    expect(error.path).toBe('../sdd-orchestrator-worktrees/my-feature');
  });

  it('should support BRANCH_EXISTS error', () => {
    const error: WorktreeError = {
      type: 'BRANCH_EXISTS',
      branch: 'feature/my-feature',
    };
    expect(error.type).toBe('BRANCH_EXISTS');
    expect(error.branch).toBe('feature/my-feature');
  });

  it('should support GIT_ERROR error', () => {
    const error: WorktreeError = {
      type: 'GIT_ERROR',
      message: 'fatal: not a git repository',
    };
    expect(error.type).toBe('GIT_ERROR');
    expect(error.message).toBe('fatal: not a git repository');
  });

  it('should support PATH_NOT_FOUND error', () => {
    const error: WorktreeError = {
      type: 'PATH_NOT_FOUND',
      path: '/nonexistent/path',
    };
    expect(error.type).toBe('PATH_NOT_FOUND');
    expect(error.path).toBe('/nonexistent/path');
  });

  it('should support PATH_VALIDATION_ERROR error', () => {
    const error: WorktreeError = {
      type: 'PATH_VALIDATION_ERROR',
      path: '../../outside',
      reason: 'Path traversal detected',
    };
    expect(error.type).toBe('PATH_VALIDATION_ERROR');
    expect(error.path).toBe('../../outside');
    expect(error.reason).toBe('Path traversal detected');
  });

  it('should support INVALID_FEATURE_NAME error', () => {
    const error: WorktreeError = {
      type: 'INVALID_FEATURE_NAME',
      featureName: 'my feature',
      reason: 'Feature name contains spaces',
    };
    expect(error.type).toBe('INVALID_FEATURE_NAME');
    expect(error.featureName).toBe('my feature');
    expect(error.reason).toBe('Feature name contains spaces');
  });
});

describe('WorktreeInfo type', () => {
  it('should have all required fields', () => {
    const info: WorktreeInfo = {
      path: '../sdd-orchestrator-worktrees/my-feature',
      absolutePath: '/Users/test/sdd-orchestrator-worktrees/my-feature',
      branch: 'feature/my-feature',
      created_at: '2026-01-12T12:00:00+09:00',
    };

    expect(info.path).toBe('../sdd-orchestrator-worktrees/my-feature');
    expect(info.absolutePath).toBe('/Users/test/sdd-orchestrator-worktrees/my-feature');
    expect(info.branch).toBe('feature/my-feature');
    expect(info.created_at).toBe('2026-01-12T12:00:00+09:00');
  });
});

describe('WorktreeServiceResult type', () => {
  it('should represent success result', () => {
    const result: WorktreeServiceResult<string> = {
      ok: true,
      value: 'success',
    };
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('success');
    }
  });

  it('should represent error result', () => {
    const result: WorktreeServiceResult<string> = {
      ok: false,
      error: { type: 'GIT_ERROR', message: 'error' },
    };
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('GIT_ERROR');
    }
  });
});
