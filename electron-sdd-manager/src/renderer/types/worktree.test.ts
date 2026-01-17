/**
 * Worktree Types Unit Tests
 * TDD: Testing worktree type definitions and type guards
 * Requirements: 2.1, 2.2, 2.3 (git-worktree-support)
 */

import { describe, it, expect } from 'vitest';
import {
  isWorktreeConfig,
  hasWorktreePath,
  isImplStarted,
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

    // worktree-execution-ui: path is now optional, this test updated
    it('should return true for missing path (normal mode)', () => {
      const config = {
        branch: 'feature/my-feature',
        created_at: '2026-01-12T12:00:00+09:00',
      };
      expect(isWorktreeConfig(config)).toBe(true);
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

    // worktree-execution-ui: path is now optional, empty path is valid (treated as normal mode)
    it('should return true for empty path (treated as normal mode)', () => {
      const config = {
        path: '',
        branch: 'feature/my-feature',
        created_at: '2026-01-12T12:00:00+09:00',
      };
      expect(isWorktreeConfig(config)).toBe(true);
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

    // worktree-execution-ui: path type is not checked since path is optional
    it('should return false for wrong types on branch and created_at', () => {
      // path with wrong type doesn't fail since path is optional
      expect(isWorktreeConfig({ path: 123, branch: 'test', created_at: 'test' })).toBe(true);
      expect(isWorktreeConfig({ path: 'test', branch: 123, created_at: 'test' })).toBe(false);
      expect(isWorktreeConfig({ path: 'test', branch: 'test', created_at: 123 })).toBe(false);
    });
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

// =============================================================================
// worktree-execution-ui: Task 1.1 - Extended tests for new requirements
// Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3
// =============================================================================

describe('WorktreeConfig with optional path (worktree-execution-ui)', () => {
  describe('isWorktreeConfig with optional path', () => {
    // Requirement 1.1: path field is now optional
    it('should return true for config without path (normal mode)', () => {
      const config = {
        branch: 'feature/my-feature',
        created_at: '2026-01-17T12:00:00Z',
      };
      expect(isWorktreeConfig(config)).toBe(true);
    });

    // Requirement 1.2: worktree mode config (with path)
    it('should return true for config with path (worktree mode)', () => {
      const config: WorktreeConfig = {
        path: '../sdd-orchestrator-worktrees/my-feature',
        branch: 'feature/my-feature',
        created_at: '2026-01-17T12:00:00Z',
      };
      expect(isWorktreeConfig(config)).toBe(true);
    });

    // Requirement 2.1: isWorktreeConfig validates branch + created_at only
    it('should return false if branch is missing', () => {
      const config = {
        created_at: '2026-01-17T12:00:00Z',
      };
      expect(isWorktreeConfig(config)).toBe(false);
    });

    it('should return false if created_at is missing', () => {
      const config = {
        branch: 'feature/my-feature',
      };
      expect(isWorktreeConfig(config)).toBe(false);
    });
  });
});

describe('hasWorktreePath (worktree-execution-ui)', () => {
  // Requirement 2.2: hasWorktreePath checks for path presence
  it('should return true when worktree.path exists', () => {
    const specJson = {
      worktree: {
        path: '../sdd-orchestrator-worktrees/my-feature',
        branch: 'feature/my-feature',
        created_at: '2026-01-17T12:00:00Z',
      },
    };
    expect(hasWorktreePath(specJson)).toBe(true);
  });

  it('should return false when worktree exists but path is absent (normal mode)', () => {
    const specJson = {
      worktree: {
        branch: 'feature/my-feature',
        created_at: '2026-01-17T12:00:00Z',
      },
    };
    expect(hasWorktreePath(specJson)).toBe(false);
  });

  it('should return false when worktree is undefined', () => {
    const specJson = {};
    expect(hasWorktreePath(specJson)).toBe(false);
  });

  it('should return false when worktree is null', () => {
    const specJson = { worktree: null };
    expect(hasWorktreePath(specJson)).toBe(false);
  });

  it('should return false when worktree.path is empty string', () => {
    const specJson = {
      worktree: {
        path: '',
        branch: 'feature/my-feature',
        created_at: '2026-01-17T12:00:00Z',
      },
    };
    expect(hasWorktreePath(specJson)).toBe(false);
  });
});

describe('isImplStarted (worktree-execution-ui)', () => {
  // Requirement 2.3: isImplStarted checks for branch presence
  it('should return true when worktree.branch exists (worktree mode)', () => {
    const specJson = {
      worktree: {
        path: '../sdd-orchestrator-worktrees/my-feature',
        branch: 'feature/my-feature',
        created_at: '2026-01-17T12:00:00Z',
      },
    };
    expect(isImplStarted(specJson)).toBe(true);
  });

  it('should return true when worktree.branch exists (normal mode)', () => {
    const specJson = {
      worktree: {
        branch: 'main',
        created_at: '2026-01-17T12:00:00Z',
      },
    };
    expect(isImplStarted(specJson)).toBe(true);
  });

  // Requirement 1.4: impl not started when worktree field does not exist
  it('should return false when worktree is undefined', () => {
    const specJson = {};
    expect(isImplStarted(specJson)).toBe(false);
  });

  it('should return false when worktree is null', () => {
    const specJson = { worktree: null };
    expect(isImplStarted(specJson)).toBe(false);
  });

  it('should return false when worktree.branch is empty string', () => {
    const specJson = {
      worktree: {
        branch: '',
        created_at: '2026-01-17T12:00:00Z',
      },
    };
    expect(isImplStarted(specJson)).toBe(false);
  });

  it('should return false when worktree.branch is missing', () => {
    const specJson = {
      worktree: {
        created_at: '2026-01-17T12:00:00Z',
      },
    };
    expect(isImplStarted(specJson)).toBe(false);
  });
});
