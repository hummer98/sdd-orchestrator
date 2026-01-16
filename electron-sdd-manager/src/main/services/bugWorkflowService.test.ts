/**
 * BugWorkflowService Tests
 * bugs-worktree-support Task 19.2: 自動実行時のworktree作成フローのテスト
 * Requirements: 12.1, 12.2, 12.3
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BugWorkflowService } from './bugWorkflowService';
import type { ConfigStore } from './configStore';
import type { WorktreeService } from './worktreeService';
import type { BugService } from './bugService';
import type { WorktreeInfo, WorktreeServiceResult } from '../../renderer/types/worktree';

// Mock dependencies
const mockConfigStore: Partial<ConfigStore> = {
  getBugsWorktreeDefault: vi.fn(),
};

const mockWorktreeInfo: WorktreeInfo = {
  path: '../test-project-worktrees/bugs/test-bug',
  absolutePath: '/path/to/test-project-worktrees/bugs/test-bug',
  branch: 'bugfix/test-bug',
  created_at: '2025-01-15T10:00:00Z',
};

const mockWorktreeService = {
  createBugWorktree: vi.fn(),
  isOnMainBranch: vi.fn(),
  getBugWorktreePath: vi.fn(),
};

const mockBugService = {
  addWorktreeField: vi.fn(),
  readBugJson: vi.fn(),
};

describe('BugWorkflowService', () => {
  let service: BugWorkflowService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BugWorkflowService(
      mockConfigStore as ConfigStore,
      () => mockWorktreeService as unknown as WorktreeService,
      mockBugService as unknown as BugService
    );

    // Default mocks
    (mockConfigStore.getBugsWorktreeDefault as ReturnType<typeof vi.fn>).mockReturnValue(false);
    mockWorktreeService.isOnMainBranch.mockResolvedValue({ ok: true, value: true });
    mockWorktreeService.createBugWorktree.mockResolvedValue({
      ok: true,
      value: mockWorktreeInfo,
    });
    mockBugService.addWorktreeField.mockResolvedValue({ ok: true, value: undefined });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('startBugFixWithAutoWorktree', () => {
    // ============================================================
    // bugs-worktree-support Task 19.2: 自動実行時のworktree作成フロー
    // Requirements: 12.1, 12.2, 12.3
    // ============================================================

    it('should reference bugsWorktreeDefault setting from configStore', async () => {
      // Requirements: 12.1
      const projectPath = '/path/to/project';
      const bugName = 'test-bug';
      const bugPath = '/path/to/project/.kiro/bugs/test-bug';

      await service.startBugFixWithAutoWorktree(bugName, projectPath, bugPath);

      expect(mockConfigStore.getBugsWorktreeDefault).toHaveBeenCalled();
    });

    it('should create worktree when bugsWorktreeDefault is true', async () => {
      // Requirements: 12.2
      (mockConfigStore.getBugsWorktreeDefault as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const projectPath = '/path/to/project';
      const bugName = 'test-bug';
      const bugPath = '/path/to/project/.kiro/bugs/test-bug';

      const result = await service.startBugFixWithAutoWorktree(bugName, projectPath, bugPath);

      expect(mockWorktreeService.createBugWorktree).toHaveBeenCalledWith(bugName);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).not.toBeNull();
        expect(result.value?.path).toBe(mockWorktreeInfo.path);
        expect(result.value?.branch).toBe(mockWorktreeInfo.branch);
      }
    });

    it('should not create worktree when bugsWorktreeDefault is false', async () => {
      // Requirements: 12.3
      (mockConfigStore.getBugsWorktreeDefault as ReturnType<typeof vi.fn>).mockReturnValue(false);
      const projectPath = '/path/to/project';
      const bugName = 'test-bug';
      const bugPath = '/path/to/project/.kiro/bugs/test-bug';

      const result = await service.startBugFixWithAutoWorktree(bugName, projectPath, bugPath);

      expect(mockWorktreeService.createBugWorktree).not.toHaveBeenCalled();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });

    it('should update bug.json with worktree field when worktree is created', async () => {
      // Requirements: 12.2, 12.4
      (mockConfigStore.getBugsWorktreeDefault as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const projectPath = '/path/to/project';
      const bugName = 'test-bug';
      const bugPath = '/path/to/project/.kiro/bugs/test-bug';

      await service.startBugFixWithAutoWorktree(bugName, projectPath, bugPath);

      expect(mockBugService.addWorktreeField).toHaveBeenCalledWith(
        bugPath,
        expect.objectContaining({
          path: mockWorktreeInfo.path,
          branch: mockWorktreeInfo.branch,
          created_at: mockWorktreeInfo.created_at,
        })
      );
    });

    it('should return error when not on main branch', async () => {
      // Requirements: 12.1 - mainブランチ外でのエラーハンドリング
      (mockConfigStore.getBugsWorktreeDefault as ReturnType<typeof vi.fn>).mockReturnValue(true);
      mockWorktreeService.createBugWorktree.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_ON_MAIN_BRANCH', currentBranch: 'feature/other' },
      });
      const projectPath = '/path/to/project';
      const bugName = 'test-bug';
      const bugPath = '/path/to/project/.kiro/bugs/test-bug';

      const result = await service.startBugFixWithAutoWorktree(bugName, projectPath, bugPath);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_ON_MAIN_BRANCH');
      }
    });

    it('should return error when worktree creation fails', async () => {
      (mockConfigStore.getBugsWorktreeDefault as ReturnType<typeof vi.fn>).mockReturnValue(true);
      mockWorktreeService.createBugWorktree.mockResolvedValue({
        ok: false,
        error: { type: 'GIT_ERROR', message: 'Failed to create worktree' },
      });
      const projectPath = '/path/to/project';
      const bugName = 'test-bug';
      const bugPath = '/path/to/project/.kiro/bugs/test-bug';

      const result = await service.startBugFixWithAutoWorktree(bugName, projectPath, bugPath);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('GIT_ERROR');
      }
    });

    it('should use the same worktree creation logic as UI checkbox (DRY principle)', async () => {
      // Requirements: 12.4
      // The service should create worktree using the same method as handleBugWorktreeCreate in bugWorktreeHandlers
      (mockConfigStore.getBugsWorktreeDefault as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const projectPath = '/path/to/project';
      const bugName = 'test-bug';
      const bugPath = '/path/to/project/.kiro/bugs/test-bug';

      await service.startBugFixWithAutoWorktree(bugName, projectPath, bugPath);

      // Same sequence as handleBugWorktreeCreate:
      // 1. Call worktreeService.createBugWorktree
      expect(mockWorktreeService.createBugWorktree).toHaveBeenCalledWith(bugName);
      // 2. Call bugService.addWorktreeField with the worktree config
      expect(mockBugService.addWorktreeField).toHaveBeenCalled();
    });
  });

  describe('shouldCreateWorktreeForAutoExecution', () => {
    it('should return true when bugsWorktreeDefault is true', () => {
      // Requirements: 12.1
      (mockConfigStore.getBugsWorktreeDefault as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const result = service.shouldCreateWorktreeForAutoExecution();

      expect(result).toBe(true);
    });

    it('should return false when bugsWorktreeDefault is false', () => {
      // Requirements: 12.3
      (mockConfigStore.getBugsWorktreeDefault as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const result = service.shouldCreateWorktreeForAutoExecution();

      expect(result).toBe(false);
    });
  });
});
