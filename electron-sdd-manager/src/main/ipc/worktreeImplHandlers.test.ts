/**
 * Worktree Impl Handlers Tests
 * TDD: Testing impl start with automatic worktree creation
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6 (git-worktree-support)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock WorktreeService
const mockWorktreeService = {
  isOnMainBranch: vi.fn(),
  getCurrentBranch: vi.fn(),
  createWorktree: vi.fn(),
  removeWorktree: vi.fn(),
  resolveWorktreePath: vi.fn(),
};

// Mock fileService
const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();

vi.mock('../services/worktreeService', () => ({
  WorktreeService: vi.fn().mockImplementation(() => mockWorktreeService),
}));

vi.mock('fs/promises', () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
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

import {
  handleImplStartWithWorktree,
  getWorktreeCwd,
  type ImplStartWithWorktreeResult,
} from './worktreeImplHandlers';

describe('Worktree Impl Start Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('handleImplStartWithWorktree', () => {
    const projectPath = '/Users/test/my-project';
    const specPath = '/Users/test/my-project/.kiro/specs/my-feature';
    const featureName = 'my-feature';

    it('should return error when not on main branch (Requirement 1.1, 1.2)', async () => {
      mockWorktreeService.isOnMainBranch.mockResolvedValue({ ok: true, value: false });
      mockWorktreeService.getCurrentBranch.mockResolvedValue({ ok: true, value: 'feature/other' });

      const result = await handleImplStartWithWorktree(projectPath, specPath, featureName);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_ON_MAIN_BRANCH');
        expect(result.error.currentBranch).toBe('feature/other');
      }
    });

    it('should create worktree and update spec.json when on main branch (Requirement 1.3, 1.4, 1.5)', async () => {
      const worktreeInfo = {
        path: '../my-project-worktrees/my-feature',
        absolutePath: '/Users/test/my-project-worktrees/my-feature',
        branch: 'feature/my-feature',
        created_at: '2026-01-12T12:00:00.000Z',
      };

      mockWorktreeService.isOnMainBranch.mockResolvedValue({ ok: true, value: true });
      mockWorktreeService.createWorktree.mockResolvedValue({ ok: true, value: worktreeInfo });

      // Mock spec.json reading
      const existingSpecJson = {
        feature_name: 'my-feature',
        phase: 'tasks-generated',
        approvals: {
          requirements: { generated: true, approved: true },
          design: { generated: true, approved: true },
          tasks: { generated: true, approved: true },
        },
      };
      mockReadFile.mockResolvedValue(JSON.stringify(existingSpecJson));
      mockWriteFile.mockResolvedValue(undefined);

      const result = await handleImplStartWithWorktree(projectPath, specPath, featureName);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.worktreePath).toBe(worktreeInfo.absolutePath);
        expect(result.value.worktreeConfig.path).toBe(worktreeInfo.path);
        expect(result.value.worktreeConfig.branch).toBe(worktreeInfo.branch);
      }

      // Verify spec.json was updated with worktree field
      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenJson = JSON.parse(writeCall[1]);
      expect(writtenJson.worktree).toBeDefined();
      expect(writtenJson.worktree.path).toBe(worktreeInfo.path);
      expect(writtenJson.worktree.branch).toBe(worktreeInfo.branch);
    });

    it('should return git error when worktree creation fails (Requirement 1.6)', async () => {
      mockWorktreeService.isOnMainBranch.mockResolvedValue({ ok: true, value: true });
      mockWorktreeService.createWorktree.mockResolvedValue({
        ok: false,
        error: { type: 'GIT_ERROR', message: 'Failed to create worktree' },
      });

      const result = await handleImplStartWithWorktree(projectPath, specPath, featureName);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('GIT_ERROR');
      }
    });

    it('should return error when worktree already exists', async () => {
      mockWorktreeService.isOnMainBranch.mockResolvedValue({ ok: true, value: true });
      mockWorktreeService.createWorktree.mockResolvedValue({
        ok: false,
        error: { type: 'WORKTREE_EXISTS', path: '../my-project-worktrees/my-feature' },
      });

      const result = await handleImplStartWithWorktree(projectPath, specPath, featureName);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('WORKTREE_EXISTS');
      }
    });

    it('should return error when branch already exists', async () => {
      mockWorktreeService.isOnMainBranch.mockResolvedValue({ ok: true, value: true });
      mockWorktreeService.createWorktree.mockResolvedValue({
        ok: false,
        error: { type: 'BRANCH_EXISTS', branch: 'feature/my-feature' },
      });

      const result = await handleImplStartWithWorktree(projectPath, specPath, featureName);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('BRANCH_EXISTS');
      }
    });

    it('should return error when spec.json read fails', async () => {
      mockWorktreeService.isOnMainBranch.mockResolvedValue({ ok: true, value: true });
      mockWorktreeService.createWorktree.mockResolvedValue({
        ok: true,
        value: {
          path: '../my-project-worktrees/my-feature',
          absolutePath: '/Users/test/my-project-worktrees/my-feature',
          branch: 'feature/my-feature',
          created_at: '2026-01-12T12:00:00.000Z',
        },
      });
      mockReadFile.mockRejectedValue(new Error('File not found'));

      // Should rollback worktree creation on spec.json read failure
      mockWorktreeService.removeWorktree.mockResolvedValue({ ok: true, value: undefined });

      const result = await handleImplStartWithWorktree(projectPath, specPath, featureName);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('SPEC_JSON_ERROR');
      }
      // Verify rollback was attempted
      expect(mockWorktreeService.removeWorktree).toHaveBeenCalledWith(featureName);
    });

    it('should return error when spec.json write fails and rollback worktree', async () => {
      mockWorktreeService.isOnMainBranch.mockResolvedValue({ ok: true, value: true });
      mockWorktreeService.createWorktree.mockResolvedValue({
        ok: true,
        value: {
          path: '../my-project-worktrees/my-feature',
          absolutePath: '/Users/test/my-project-worktrees/my-feature',
          branch: 'feature/my-feature',
          created_at: '2026-01-12T12:00:00.000Z',
        },
      });
      const existingSpecJson = {
        feature_name: 'my-feature',
        phase: 'tasks-generated',
      };
      mockReadFile.mockResolvedValue(JSON.stringify(existingSpecJson));
      mockWriteFile.mockRejectedValue(new Error('Permission denied'));

      // Should rollback worktree creation on spec.json write failure
      mockWorktreeService.removeWorktree.mockResolvedValue({ ok: true, value: undefined });

      const result = await handleImplStartWithWorktree(projectPath, specPath, featureName);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('SPEC_JSON_ERROR');
      }
      // Verify rollback was attempted
      expect(mockWorktreeService.removeWorktree).toHaveBeenCalledWith(featureName);
    });
  });

  describe('getWorktreeCwd', () => {
    const projectPath = '/Users/test/my-project';

    it('should return worktree absolute path when spec has worktree config (Requirement 3.1, 3.2)', () => {
      const specJson = {
        feature_name: 'my-feature',
        phase: 'tasks-generated',
        worktree: {
          path: '../my-project-worktrees/my-feature',
          branch: 'feature/my-feature',
          created_at: '2026-01-12T12:00:00.000Z',
        },
      };

      mockWorktreeService.resolveWorktreePath.mockReturnValue(
        '/Users/test/my-project-worktrees/my-feature'
      );

      const result = getWorktreeCwd(projectPath, specJson);

      expect(result).toBe('/Users/test/my-project-worktrees/my-feature');
    });

    it('should return project path when spec has no worktree config', () => {
      const specJson = {
        feature_name: 'my-feature',
        phase: 'tasks-generated',
        // no worktree field
      };

      const result = getWorktreeCwd(projectPath, specJson);

      expect(result).toBe(projectPath);
    });

    it('should return project path when worktree field is null', () => {
      const specJson = {
        feature_name: 'my-feature',
        phase: 'tasks-generated',
        worktree: null,
      };

      const result = getWorktreeCwd(projectPath, specJson as unknown);

      expect(result).toBe(projectPath);
    });

    it('should return project path when worktree field is invalid', () => {
      const specJson = {
        feature_name: 'my-feature',
        phase: 'tasks-generated',
        worktree: {
          // missing required fields
          path: '../my-project-worktrees/my-feature',
        },
      };

      const result = getWorktreeCwd(projectPath, specJson as unknown);

      expect(result).toBe(projectPath);
    });
  });
});
