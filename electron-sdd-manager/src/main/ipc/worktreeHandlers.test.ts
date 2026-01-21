/**
 * Worktree IPC Handlers Tests
 * TDD: Testing IPC handlers for git worktree operations
 * Requirements: 1.1, 1.3, 1.6 (git-worktree-support)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IPC_CHANNELS } from './channels';

// Unmock this module to test the actual implementation
vi.unmock('./worktreeHandlers');

// Mock WorktreeService
const mockWorktreeService = {
  isOnMainBranch: vi.fn(),
  getCurrentBranch: vi.fn(),
  createWorktree: vi.fn(),
  removeWorktree: vi.fn(),
  resolveWorktreePath: vi.fn(),
};

vi.mock('../services/worktreeService', () => ({
  WorktreeService: vi.fn().mockImplementation(() => mockWorktreeService),
}));

// Mock logger
vi.mock('../services/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Worktree IPC Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('IPC Channels', () => {
    it('should define WORKTREE_CHECK_MAIN channel', () => {
      expect(IPC_CHANNELS.WORKTREE_CHECK_MAIN).toBe('worktree:check-main');
    });

    it('should define WORKTREE_CREATE channel', () => {
      expect(IPC_CHANNELS.WORKTREE_CREATE).toBe('worktree:create');
    });

    it('should define WORKTREE_REMOVE channel', () => {
      expect(IPC_CHANNELS.WORKTREE_REMOVE).toBe('worktree:remove');
    });

    it('should define WORKTREE_RESOLVE_PATH channel', () => {
      expect(IPC_CHANNELS.WORKTREE_RESOLVE_PATH).toBe('worktree:resolve-path');
    });
  });

  describe('worktree:check-main handler', () => {
    it('should return isMain: true and currentBranch when on main', async () => {
      mockWorktreeService.isOnMainBranch.mockResolvedValue({ ok: true, value: true });
      mockWorktreeService.getCurrentBranch.mockResolvedValue({ ok: true, value: 'main' });

      const { handleWorktreeCheckMain } = await import('./worktreeHandlers');
      const result = await handleWorktreeCheckMain('/test/project');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.isMain).toBe(true);
        expect(result.value.currentBranch).toBe('main');
      }
    });

    it('should return isMain: false when on feature branch', async () => {
      mockWorktreeService.isOnMainBranch.mockResolvedValue({ ok: true, value: false });
      mockWorktreeService.getCurrentBranch.mockResolvedValue({ ok: true, value: 'feature/test' });

      const { handleWorktreeCheckMain } = await import('./worktreeHandlers');
      const result = await handleWorktreeCheckMain('/test/project');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.isMain).toBe(false);
        expect(result.value.currentBranch).toBe('feature/test');
      }
    });

    it('should return GIT_ERROR on git failure', async () => {
      mockWorktreeService.isOnMainBranch.mockResolvedValue({
        ok: false,
        error: { type: 'GIT_ERROR', message: 'not a git repository' },
      });

      const { handleWorktreeCheckMain } = await import('./worktreeHandlers');
      const result = await handleWorktreeCheckMain('/test/project');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('GIT_ERROR');
      }
    });
  });

  describe('worktree:create handler', () => {
    it('should create worktree and return WorktreeInfo', async () => {
      const worktreeInfo = {
        path: '../my-project-worktrees/my-feature',
        absolutePath: '/Users/test/my-project-worktrees/my-feature',
        branch: 'feature/my-feature',
        created_at: '2026-01-12T12:00:00.000Z',
      };
      mockWorktreeService.createWorktree.mockResolvedValue({ ok: true, value: worktreeInfo });

      const { handleWorktreeCreate } = await import('./worktreeHandlers');
      const result = await handleWorktreeCreate('/test/project', 'my-feature');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.branch).toBe('feature/my-feature');
        expect(result.value.path).toContain('my-feature');
      }
    });

    it('should return NOT_ON_MAIN_BRANCH error when not on main', async () => {
      mockWorktreeService.createWorktree.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_ON_MAIN_BRANCH', currentBranch: 'feature/other' },
      });

      const { handleWorktreeCreate } = await import('./worktreeHandlers');
      const result = await handleWorktreeCreate('/test/project', 'my-feature');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_ON_MAIN_BRANCH');
      }
    });

    it('should return WORKTREE_EXISTS error when worktree already exists', async () => {
      mockWorktreeService.createWorktree.mockResolvedValue({
        ok: false,
        error: { type: 'WORKTREE_EXISTS', path: '/path/to/worktree' },
      });

      const { handleWorktreeCreate } = await import('./worktreeHandlers');
      const result = await handleWorktreeCreate('/test/project', 'my-feature');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('WORKTREE_EXISTS');
      }
    });

    it('should return GIT_ERROR on git failure', async () => {
      mockWorktreeService.createWorktree.mockResolvedValue({
        ok: false,
        error: { type: 'GIT_ERROR', message: 'failed to create worktree' },
      });

      const { handleWorktreeCreate } = await import('./worktreeHandlers');
      const result = await handleWorktreeCreate('/test/project', 'my-feature');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('GIT_ERROR');
      }
    });
  });

  describe('worktree:remove handler', () => {
    it('should remove worktree successfully', async () => {
      mockWorktreeService.removeWorktree.mockResolvedValue({ ok: true, value: undefined });

      const { handleWorktreeRemove } = await import('./worktreeHandlers');
      const result = await handleWorktreeRemove('/test/project', 'my-feature');

      expect(result.ok).toBe(true);
    });

    it('should return GIT_ERROR on failure', async () => {
      mockWorktreeService.removeWorktree.mockResolvedValue({
        ok: false,
        error: { type: 'GIT_ERROR', message: 'worktree not found' },
      });

      const { handleWorktreeRemove } = await import('./worktreeHandlers');
      const result = await handleWorktreeRemove('/test/project', 'my-feature');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('GIT_ERROR');
      }
    });
  });

  describe('worktree:resolve-path handler', () => {
    it('should resolve relative path to absolute path', async () => {
      mockWorktreeService.resolveWorktreePath.mockReturnValue(
        '/Users/test/my-project-worktrees/my-feature'
      );

      const { handleWorktreeResolvePath } = await import('./worktreeHandlers');
      const result = await handleWorktreeResolvePath(
        '/test/project',
        '../my-project-worktrees/my-feature'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.absolutePath).toBe('/Users/test/my-project-worktrees/my-feature');
      }
    });

    it('should return error for invalid path', async () => {
      mockWorktreeService.resolveWorktreePath.mockImplementation(() => {
        throw new Error('Path validation failed');
      });

      const { handleWorktreeResolvePath } = await import('./worktreeHandlers');
      const result = await handleWorktreeResolvePath('/test/project', '../../../etc/passwd');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('PATH_VALIDATION_ERROR');
      }
    });
  });
});
