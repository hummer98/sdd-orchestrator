/**
 * ConvertBugWorktreeService Tests
 * bug-worktree-spec-alignment feature
 * Requirements: 1.1-1.4, 2.1-2.3, 3.1-3.4, 4.1-4.4, 5.1-5.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ConvertBugWorktreeService,
  getConvertBugErrorMessage,
  type BugCommitStatus,
} from './convertBugWorktreeService';
import type { WorktreeService } from './worktreeService';
import type { BugService } from './bugService';
import type { BugJson } from '../../renderer/types';

// Mock logger
vi.mock('./logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ConvertBugWorktreeService', () => {
  let convertService: ConvertBugWorktreeService;
  let mockWorktreeService: WorktreeService;
  let mockBugService: BugService;
  let mockFsPromises: {
    access: ReturnType<typeof vi.fn>;
    mkdir: ReturnType<typeof vi.fn>;
    cp: ReturnType<typeof vi.fn>;
    rm: ReturnType<typeof vi.fn>;
  };

  const projectPath = '/test/project';
  const bugPath = '/test/project/.kiro/bugs/my-bug';
  const bugName = 'my-bug';

  beforeEach(() => {
    // Create mock WorktreeService
    mockWorktreeService = {
      isOnMainBranch: vi.fn(),
      getCurrentBranch: vi.fn(),
      createBugWorktree: vi.fn(),
      removeBugWorktree: vi.fn(),
      createSymlinksForWorktree: vi.fn(),
      getBugWorktreePath: vi.fn().mockReturnValue({
        relative: '.kiro/worktrees/bugs/my-bug',
        absolute: '/test/project/.kiro/worktrees/bugs/my-bug',
      }),
      checkUncommittedBugChanges: vi.fn(),
    } as unknown as WorktreeService;

    // Create mock BugService
    mockBugService = {
      readBugJson: vi.fn(),
      addWorktreeField: vi.fn(),
      bugExists: vi.fn(),
    } as unknown as BugService;

    // Create mock fs/promises
    mockFsPromises = {
      access: vi.fn(),
      mkdir: vi.fn(),
      cp: vi.fn(),
      rm: vi.fn(),
    };

    convertService = new ConvertBugWorktreeService(
      mockWorktreeService,
      mockBugService,
      mockFsPromises
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Task 2.1: BugCommitStatus型とConvertBugError型の定義テスト
  // Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 5.2, 5.3, 5.4
  // ============================================================

  describe('Type definitions', () => {
    describe('BugCommitStatus type', () => {
      it('should define untracked, committed-clean, committed-dirty values', () => {
        // Type-level test - these should compile without errors
        const status1: BugCommitStatus = 'untracked';
        const status2: BugCommitStatus = 'committed-clean';
        const status3: BugCommitStatus = 'committed-dirty';

        expect(status1).toBe('untracked');
        expect(status2).toBe('committed-clean');
        expect(status3).toBe('committed-dirty');
      });
    });

    describe('getConvertBugErrorMessage', () => {
      it('should return appropriate message for NOT_ON_MAIN_BRANCH', () => {
        const error = { type: 'NOT_ON_MAIN_BRANCH' as const, currentBranch: 'feature/test' };
        const message = getConvertBugErrorMessage(error);
        expect(message).toContain('mainブランチ');
        expect(message).toContain('feature/test');
      });

      it('should return appropriate message for BUG_NOT_FOUND', () => {
        const error = { type: 'BUG_NOT_FOUND' as const, bugPath: '/path/to/bug' };
        const message = getConvertBugErrorMessage(error);
        expect(message).toContain('Bugが見つかりません');
      });

      it('should return appropriate message for ALREADY_WORKTREE_MODE', () => {
        const error = { type: 'ALREADY_WORKTREE_MODE' as const, bugPath: '/path/to/bug' };
        const message = getConvertBugErrorMessage(error);
        expect(message).toContain('Worktreeモード');
      });

      it('should return appropriate message for BUG_HAS_UNCOMMITTED_CHANGES', () => {
        const error = {
          type: 'BUG_HAS_UNCOMMITTED_CHANGES' as const,
          bugPath: '/path/to/bug',
          files: ['report.md', 'analysis.md'],
        };
        const message = getConvertBugErrorMessage(error);
        expect(message).toContain('未コミットの変更');
        expect(message).toContain('report.md');
        expect(message).toContain('analysis.md');
      });

      it('should return appropriate message for BRANCH_CREATE_FAILED', () => {
        const error = { type: 'BRANCH_CREATE_FAILED' as const, message: 'branch error' };
        const message = getConvertBugErrorMessage(error);
        expect(message).toContain('ブランチ作成に失敗');
      });

      it('should return appropriate message for WORKTREE_CREATE_FAILED', () => {
        const error = { type: 'WORKTREE_CREATE_FAILED' as const, message: 'worktree error' };
        const message = getConvertBugErrorMessage(error);
        expect(message).toContain('Worktree作成に失敗');
      });

      it('should return appropriate message for FILE_MOVE_FAILED', () => {
        const error = { type: 'FILE_MOVE_FAILED' as const, message: 'file error' };
        const message = getConvertBugErrorMessage(error);
        expect(message).toContain('ファイル移動に失敗');
      });

      it('should return appropriate message for SYMLINK_CREATE_FAILED', () => {
        const error = { type: 'SYMLINK_CREATE_FAILED' as const, message: 'symlink error' };
        const message = getConvertBugErrorMessage(error);
        expect(message).toContain('シンボリックリンク作成に失敗');
      });

      it('should return appropriate message for BUG_JSON_UPDATE_FAILED', () => {
        const error = { type: 'BUG_JSON_UPDATE_FAILED' as const, message: 'json error' };
        const message = getConvertBugErrorMessage(error);
        expect(message).toContain('bug.json更新に失敗');
      });

      it('should return appropriate message for BUG_NOT_IN_WORKTREE', () => {
        const error = { type: 'BUG_NOT_IN_WORKTREE' as const, bugPath: '/path/to/bug' };
        const message = getConvertBugErrorMessage(error);
        expect(message).toContain('Worktree内にBugが見つかりません');
      });
    });
  });

  // ============================================================
  // Task 2.2: getBugStatusメソッドのテスト
  // Requirements: 1.1, 1.2, 1.3, 1.4
  // ============================================================

  describe('getBugStatus', () => {
    describe('Task 2.2: git status出力パターン別の解析テスト', () => {
      it('should return "committed-clean" when git status output is empty', async () => {
        (mockWorktreeService.checkUncommittedBugChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: { hasChanges: false, files: [], statusOutput: '' },
        });

        const result = await convertService.getBugStatus(bugPath);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toBe('committed-clean');
        }
      });

      it('should return "untracked" when git status shows ?? (untracked files)', async () => {
        (mockWorktreeService.checkUncommittedBugChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: true,
            files: ['bug.json', 'report.md'],
            statusOutput: '?? .kiro/bugs/my-bug/bug.json\n?? .kiro/bugs/my-bug/report.md',
          },
        });

        const result = await convertService.getBugStatus(bugPath);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toBe('untracked');
        }
      });

      it('should return "untracked" when git status shows A (staged new files)', async () => {
        (mockWorktreeService.checkUncommittedBugChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: true,
            files: ['bug.json'],
            statusOutput: 'A  .kiro/bugs/my-bug/bug.json',
          },
        });

        const result = await convertService.getBugStatus(bugPath);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toBe('untracked');
        }
      });

      it('should return "committed-dirty" when git status shows M (modified)', async () => {
        (mockWorktreeService.checkUncommittedBugChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: true,
            files: ['report.md'],
            statusOutput: ' M .kiro/bugs/my-bug/report.md',
          },
        });

        const result = await convertService.getBugStatus(bugPath);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toBe('committed-dirty');
        }
      });

      it('should return "committed-dirty" when git status shows D (deleted)', async () => {
        (mockWorktreeService.checkUncommittedBugChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: true,
            files: ['analysis.md'],
            statusOutput: ' D .kiro/bugs/my-bug/analysis.md',
          },
        });

        const result = await convertService.getBugStatus(bugPath);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toBe('committed-dirty');
        }
      });

      it('should return "committed-dirty" when both untracked and modified files exist (dirty > untracked)', async () => {
        (mockWorktreeService.checkUncommittedBugChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: true,
            files: ['bug.json', 'report.md'],
            statusOutput: '?? .kiro/bugs/my-bug/bug.json\n M .kiro/bugs/my-bug/report.md',
          },
        });

        const result = await convertService.getBugStatus(bugPath);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toBe('committed-dirty');
        }
      });
    });

    describe('Task 2.2: エラーハンドリング', () => {
      it('should propagate git error from checkUncommittedBugChanges', async () => {
        (mockWorktreeService.checkUncommittedBugChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: false,
          error: { type: 'GIT_ERROR', message: 'git command failed' },
        });

        const result = await convertService.getBugStatus(bugPath);

        expect(result.ok).toBe(false);
      });
    });
  });

  // ============================================================
  // Task 2.3: canConvertメソッドのテスト
  // Requirements: 1.2, 1.3, 1.4, 5.1
  // ============================================================

  describe('canConvert', () => {
    describe('Task 2.3: 事前検証ロジック - mainブランチ確認', () => {
      it('should return error when not on main branch', async () => {
        (mockWorktreeService.isOnMainBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: false,
        });
        (mockWorktreeService.getCurrentBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: 'feature/other',
        });

        const result = await convertService.canConvert(projectPath, bugPath);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('NOT_ON_MAIN_BRANCH');
          expect((result.error as { currentBranch: string }).currentBranch).toBe('feature/other');
        }
      });
    });

    describe('Task 2.3: 事前検証ロジック - bug存在確認', () => {
      it('should return error when bug not found', async () => {
        (mockWorktreeService.isOnMainBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: true,
        });
        mockFsPromises.access.mockRejectedValue(new Error('ENOENT'));

        const result = await convertService.canConvert(projectPath, bugPath);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('BUG_NOT_FOUND');
        }
      });
    });

    describe('Task 2.3: 事前検証ロジック - 既存worktreeモード確認', () => {
      it('should return error when already in worktree mode', async () => {
        (mockWorktreeService.isOnMainBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: true,
        });
        mockFsPromises.access.mockResolvedValue(undefined);
        (mockBugService.readBugJson as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            bug_name: 'my-bug',
            created_at: '2026-01-22T12:00:00Z',
            updated_at: '2026-01-22T12:00:00Z',
            worktree: {
              path: '.kiro/worktrees/bugs/my-bug',
              branch: 'bugfix/my-bug',
              created_at: '2026-01-22T12:00:00Z',
            },
          } as BugJson,
        });

        const result = await convertService.canConvert(projectPath, bugPath);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('ALREADY_WORKTREE_MODE');
        }
      });
    });

    describe('Task 2.3: committed-dirty状態でのエラー確認', () => {
      it('should return BUG_HAS_UNCOMMITTED_CHANGES error when bug is committed-dirty', async () => {
        (mockWorktreeService.isOnMainBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: true,
        });
        mockFsPromises.access.mockResolvedValue(undefined);
        (mockBugService.readBugJson as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            bug_name: 'my-bug',
            created_at: '2026-01-22T12:00:00Z',
            updated_at: '2026-01-22T12:00:00Z',
          } as BugJson,
        });
        (mockWorktreeService.checkUncommittedBugChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: true,
            files: ['report.md'],
            statusOutput: ' M .kiro/bugs/my-bug/report.md',
          },
        });

        const result = await convertService.canConvert(projectPath, bugPath);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('BUG_HAS_UNCOMMITTED_CHANGES');
        }
      });
    });

    describe('Task 2.3: canConvert成功ケース', () => {
      it('should return true when all validations pass (untracked)', async () => {
        (mockWorktreeService.isOnMainBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: true,
        });
        mockFsPromises.access.mockResolvedValue(undefined);
        (mockBugService.readBugJson as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            bug_name: 'my-bug',
            created_at: '2026-01-22T12:00:00Z',
            updated_at: '2026-01-22T12:00:00Z',
          } as BugJson,
        });
        (mockWorktreeService.checkUncommittedBugChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: true,
            files: ['bug.json'],
            statusOutput: '?? .kiro/bugs/my-bug/bug.json',
          },
        });

        const result = await convertService.canConvert(projectPath, bugPath);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toBe(true);
        }
      });

      it('should return true when all validations pass (committed-clean)', async () => {
        (mockWorktreeService.isOnMainBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: true,
        });
        mockFsPromises.access.mockResolvedValue(undefined);
        (mockBugService.readBugJson as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            bug_name: 'my-bug',
            created_at: '2026-01-22T12:00:00Z',
            updated_at: '2026-01-22T12:00:00Z',
          } as BugJson,
        });
        (mockWorktreeService.checkUncommittedBugChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: false,
            files: [],
            statusOutput: '',
          },
        });

        const result = await convertService.canConvert(projectPath, bugPath);

        expect(result.ok).toBe(true);
      });
    });
  });

  // ============================================================
  // Task 2.4 & 2.5: convertToWorktreeメソッドのテスト
  // Requirements: 2.1-2.3, 3.1-3.4, 5.1-5.4
  // ============================================================

  describe('convertToWorktree', () => {
    describe('Task 2.4: 変換処理本体 - worktree作成まで', () => {
      beforeEach(() => {
        // Setup default success mocks
        (mockWorktreeService.isOnMainBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: true,
        });
        mockFsPromises.access.mockResolvedValue(undefined);
        (mockBugService.readBugJson as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            bug_name: 'my-bug',
            created_at: '2026-01-22T12:00:00Z',
            updated_at: '2026-01-22T12:00:00Z',
          } as BugJson,
        });
        (mockWorktreeService.checkUncommittedBugChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: true,
            files: ['bug.json'],
            statusOutput: '?? .kiro/bugs/my-bug/bug.json',
          },
        });
        (mockWorktreeService.createBugWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            path: '.kiro/worktrees/bugs/my-bug',
            absolutePath: '/test/project/.kiro/worktrees/bugs/my-bug',
            branch: 'bugfix/my-bug',
            created_at: '2026-01-22T12:00:00Z',
          },
        });
        mockFsPromises.mkdir.mockResolvedValue(undefined);
        mockFsPromises.cp.mockResolvedValue(undefined);
        mockFsPromises.rm.mockResolvedValue(undefined);
        (mockWorktreeService.createSymlinksForWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: undefined,
        });
        (mockBugService.addWorktreeField as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: undefined,
        });
      });

      it('should call createBugWorktree with correct bug name', async () => {
        const result = await convertService.convertToWorktree(projectPath, bugPath, bugName);

        expect(result.ok).toBe(true);
        expect(mockWorktreeService.createBugWorktree).toHaveBeenCalledWith(bugName);
      });

      it('should return WORKTREE_CREATE_FAILED on worktree creation failure', async () => {
        (mockWorktreeService.createBugWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: false,
          error: { type: 'GIT_ERROR', message: 'worktree creation failed' },
        });

        const result = await convertService.convertToWorktree(projectPath, bugPath, bugName);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('WORKTREE_CREATE_FAILED');
        }
      });
    });

    describe('Task 2.5: ファイル処理 - untracked時', () => {
      beforeEach(() => {
        (mockWorktreeService.isOnMainBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: true,
        });
        mockFsPromises.access.mockResolvedValue(undefined);
        (mockBugService.readBugJson as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            bug_name: 'my-bug',
            created_at: '2026-01-22T12:00:00Z',
            updated_at: '2026-01-22T12:00:00Z',
          } as BugJson,
        });
        // untracked status
        (mockWorktreeService.checkUncommittedBugChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: true,
            files: ['bug.json'],
            statusOutput: '?? .kiro/bugs/my-bug/bug.json',
          },
        });
        (mockWorktreeService.createBugWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            path: '.kiro/worktrees/bugs/my-bug',
            absolutePath: '/test/project/.kiro/worktrees/bugs/my-bug',
            branch: 'bugfix/my-bug',
            created_at: '2026-01-22T12:00:00Z',
          },
        });
        mockFsPromises.mkdir.mockResolvedValue(undefined);
        mockFsPromises.cp.mockResolvedValue(undefined);
        mockFsPromises.rm.mockResolvedValue(undefined);
        (mockWorktreeService.createSymlinksForWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: undefined,
        });
        (mockBugService.addWorktreeField as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: undefined,
        });
      });

      it('should execute cp and rm when bug is untracked', async () => {
        const result = await convertService.convertToWorktree(projectPath, bugPath, bugName);

        expect(result.ok).toBe(true);
        expect(mockFsPromises.cp).toHaveBeenCalledWith(
          bugPath,
          '/test/project/.kiro/worktrees/bugs/my-bug/.kiro/bugs/my-bug',
          { recursive: true }
        );
        expect(mockFsPromises.rm).toHaveBeenCalledWith(bugPath, { recursive: true, force: true });
      });

      it('should rollback on file copy failure', async () => {
        mockFsPromises.cp.mockRejectedValue(new Error('copy failed'));
        (mockWorktreeService.removeBugWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: undefined,
        });

        const result = await convertService.convertToWorktree(projectPath, bugPath, bugName);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('FILE_MOVE_FAILED');
        }
        expect(mockWorktreeService.removeBugWorktree).toHaveBeenCalledWith(bugName);
      });
    });

    describe('Task 2.5: ファイル処理 - committed-clean時', () => {
      beforeEach(() => {
        (mockWorktreeService.isOnMainBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: true,
        });
        (mockBugService.readBugJson as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            bug_name: 'my-bug',
            created_at: '2026-01-22T12:00:00Z',
            updated_at: '2026-01-22T12:00:00Z',
          } as BugJson,
        });
        // committed-clean status
        (mockWorktreeService.checkUncommittedBugChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: false,
            files: [],
            statusOutput: '',
          },
        });
        (mockWorktreeService.createBugWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            path: '.kiro/worktrees/bugs/my-bug',
            absolutePath: '/test/project/.kiro/worktrees/bugs/my-bug',
            branch: 'bugfix/my-bug',
            created_at: '2026-01-22T12:00:00Z',
          },
        });
        (mockWorktreeService.createSymlinksForWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: undefined,
        });
        (mockBugService.addWorktreeField as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: undefined,
        });
      });

      it('should NOT execute cp and rm when bug is committed-clean', async () => {
        // First access: bug.json check
        // Second access: worktree bug.json verification
        mockFsPromises.access
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce(undefined);

        const result = await convertService.convertToWorktree(projectPath, bugPath, bugName);

        expect(result.ok).toBe(true);
        expect(mockFsPromises.cp).not.toHaveBeenCalled();
        expect(mockFsPromises.rm).not.toHaveBeenCalled();
      });

      it('should verify bug exists in worktree when committed-clean', async () => {
        mockFsPromises.access
          .mockResolvedValueOnce(undefined) // bug.json check
          .mockResolvedValueOnce(undefined); // worktree bug.json verification

        const result = await convertService.convertToWorktree(projectPath, bugPath, bugName);

        expect(result.ok).toBe(true);
        // Should have checked access to worktree bug.json
        expect(mockFsPromises.access).toHaveBeenCalledTimes(2);
      });

      it('should return BUG_NOT_IN_WORKTREE when bug does not exist in worktree', async () => {
        mockFsPromises.access
          .mockResolvedValueOnce(undefined) // bug.json check
          .mockRejectedValueOnce(new Error('ENOENT')); // worktree bug.json not found
        (mockWorktreeService.removeBugWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: undefined,
        });

        const result = await convertService.convertToWorktree(projectPath, bugPath, bugName);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('BUG_NOT_IN_WORKTREE');
        }
      });
    });

    describe('Task 2.6: シンボリックリンク作成とbug.json更新', () => {
      beforeEach(() => {
        (mockWorktreeService.isOnMainBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: true,
        });
        mockFsPromises.access.mockResolvedValue(undefined);
        (mockBugService.readBugJson as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            bug_name: 'my-bug',
            created_at: '2026-01-22T12:00:00Z',
            updated_at: '2026-01-22T12:00:00Z',
          } as BugJson,
        });
        (mockWorktreeService.checkUncommittedBugChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: true,
            files: ['bug.json'],
            statusOutput: '?? .kiro/bugs/my-bug/bug.json',
          },
        });
        (mockWorktreeService.createBugWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            path: '.kiro/worktrees/bugs/my-bug',
            absolutePath: '/test/project/.kiro/worktrees/bugs/my-bug',
            branch: 'bugfix/my-bug',
            created_at: '2026-01-22T12:00:00Z',
          },
        });
        mockFsPromises.mkdir.mockResolvedValue(undefined);
        mockFsPromises.cp.mockResolvedValue(undefined);
        mockFsPromises.rm.mockResolvedValue(undefined);
      });

      it('should call createSymlinksForWorktree after file handling', async () => {
        (mockWorktreeService.createSymlinksForWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: undefined,
        });
        (mockBugService.addWorktreeField as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: undefined,
        });

        const result = await convertService.convertToWorktree(projectPath, bugPath, bugName);

        expect(result.ok).toBe(true);
        expect(mockWorktreeService.createSymlinksForWorktree).toHaveBeenCalledWith(
          '/test/project/.kiro/worktrees/bugs/my-bug',
          bugName
        );
      });

      it('should return SYMLINK_CREATE_FAILED on symlink creation failure', async () => {
        (mockWorktreeService.createSymlinksForWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: false,
          error: { type: 'GIT_ERROR', message: 'symlink failed' },
        });

        const result = await convertService.convertToWorktree(projectPath, bugPath, bugName);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('SYMLINK_CREATE_FAILED');
        }
      });

      it('should call addWorktreeField with correct config', async () => {
        (mockWorktreeService.createSymlinksForWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: undefined,
        });
        (mockBugService.addWorktreeField as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: undefined,
        });

        const result = await convertService.convertToWorktree(projectPath, bugPath, bugName);

        expect(result.ok).toBe(true);
        expect(mockBugService.addWorktreeField).toHaveBeenCalledWith(
          '/test/project/.kiro/worktrees/bugs/my-bug/.kiro/bugs/my-bug',
          expect.objectContaining({
            path: '.kiro/worktrees/bugs/my-bug',
            branch: 'bugfix/my-bug',
          })
        );
      });

      it('should return BUG_JSON_UPDATE_FAILED on addWorktreeField failure', async () => {
        (mockWorktreeService.createSymlinksForWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: undefined,
        });
        (mockBugService.addWorktreeField as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: false,
          error: { type: 'WRITE_ERROR', path: bugPath, message: 'write failed' },
        });

        const result = await convertService.convertToWorktree(projectPath, bugPath, bugName);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('BUG_JSON_UPDATE_FAILED');
        }
      });
    });

    describe('Complete success flow', () => {
      it('should return WorktreeInfo on success', async () => {
        (mockWorktreeService.isOnMainBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: true,
        });
        mockFsPromises.access.mockResolvedValue(undefined);
        (mockBugService.readBugJson as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            bug_name: 'my-bug',
            created_at: '2026-01-22T12:00:00Z',
            updated_at: '2026-01-22T12:00:00Z',
          } as BugJson,
        });
        (mockWorktreeService.checkUncommittedBugChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: true,
            files: ['bug.json'],
            statusOutput: '?? .kiro/bugs/my-bug/bug.json',
          },
        });
        (mockWorktreeService.createBugWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            path: '.kiro/worktrees/bugs/my-bug',
            absolutePath: '/test/project/.kiro/worktrees/bugs/my-bug',
            branch: 'bugfix/my-bug',
            created_at: '2026-01-22T12:00:00Z',
          },
        });
        mockFsPromises.mkdir.mockResolvedValue(undefined);
        mockFsPromises.cp.mockResolvedValue(undefined);
        mockFsPromises.rm.mockResolvedValue(undefined);
        (mockWorktreeService.createSymlinksForWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: undefined,
        });
        (mockBugService.addWorktreeField as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: undefined,
        });

        const result = await convertService.convertToWorktree(projectPath, bugPath, bugName);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.path).toBe('.kiro/worktrees/bugs/my-bug');
          expect(result.value.branch).toBe('bugfix/my-bug');
        }
      });
    });
  });
});
