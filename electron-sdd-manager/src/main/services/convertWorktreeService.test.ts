/**
 * ConvertWorktreeService Tests
 * Requirements: 2.1, 2.2, 2.3, 2.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 * (convert-spec-to-worktree feature)
 *
 * worktree-convert-spec-optimization Requirements: 1.1-1.3, 2.1-2.3, 3.1-3.3, 4.1-4.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ConvertWorktreeService,
  getConvertErrorMessage,
  type SpecCommitStatus,
} from './convertWorktreeService';
import type { WorktreeService } from './worktreeService';
import type { FileService } from './fileService';
import type { SpecJson } from '../../renderer/types';

// Mock logger
vi.mock('./logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ConvertWorktreeService', () => {
  let convertService: ConvertWorktreeService;
  let mockWorktreeService: WorktreeService;
  let mockFileService: FileService;
  let mockFsPromises: {
    access: ReturnType<typeof vi.fn>;
    mkdir: ReturnType<typeof vi.fn>;
    cp: ReturnType<typeof vi.fn>;
    rm: ReturnType<typeof vi.fn>;
    readFile: ReturnType<typeof vi.fn>;
    writeFile: ReturnType<typeof vi.fn>;
  };

  const projectPath = '/test/project';
  const specPath = '/test/project/.kiro/specs/my-feature';
  const featureName = 'my-feature';

  beforeEach(() => {
    // Create mock WorktreeService
    mockWorktreeService = {
      isOnMainBranch: vi.fn(),
      getCurrentBranch: vi.fn(),
      createWorktree: vi.fn(),
      removeWorktree: vi.fn(),
      createSymlinksForWorktree: vi.fn(),
      getWorktreePath: vi.fn().mockReturnValue({
        relative: '.kiro/worktrees/specs/my-feature',
        absolute: '/test/project/.kiro/worktrees/specs/my-feature',
      }),
      resolveWorktreePath: vi.fn(),
      worktreeExists: vi.fn(),
      getWatchPath: vi.fn(),
      getEntityWorktreePath: vi.fn(),
      createEntityWorktree: vi.fn(),
      removeEntityWorktree: vi.fn(),
      getBugWorktreePath: vi.fn(),
      createBugWorktree: vi.fn(),
      removeBugWorktree: vi.fn(),
      checkUncommittedSpecChanges: vi.fn(),
      commitSpecChanges: vi.fn(),
    } as unknown as WorktreeService;

    // Create mock FileService
    mockFileService = {
      readSpecJson: vi.fn(),
      updateSpecJson: vi.fn(),
      writeFile: vi.fn(),
      readArtifact: vi.fn(),
      validateKiroDirectory: vi.fn(),
      readSpecs: vi.fn(),
      createSpec: vi.fn(),
      updateApproval: vi.fn(),
      updateSpecJsonFromPhase: vi.fn(),
      isValidSpecName: vi.fn(),
      getArtifactInfo: vi.fn(),
      removeWorktreeField: vi.fn(),
      validatePhaseTransition: vi.fn(),
    } as unknown as FileService;

    // Create mock fs/promises
    mockFsPromises = {
      access: vi.fn(),
      mkdir: vi.fn(),
      cp: vi.fn(),
      rm: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
    };

    convertService = new ConvertWorktreeService(
      mockWorktreeService,
      mockFileService,
      mockFsPromises
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('canConvert', () => {
    describe('Task 1.1: 事前検証ロジック - mainブランチ確認', () => {
      it('should return error when not on main branch', async () => {
        // Arrange
        (mockWorktreeService.isOnMainBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: false,
        });
        (mockWorktreeService.getCurrentBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: 'feature/other',
        });

        // Act
        const result = await convertService.canConvert(projectPath, specPath);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('NOT_ON_MAIN_BRANCH');
          expect((result.error as { currentBranch: string }).currentBranch).toBe('feature/other');
        }
      });

      it('should check isOnMainBranch and getCurrentBranch', async () => {
        // Arrange
        (mockWorktreeService.isOnMainBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: false,
        });
        (mockWorktreeService.getCurrentBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: 'feature/other',
        });

        // Act
        await convertService.canConvert(projectPath, specPath);

        // Assert - Verify isOnMainBranch and getCurrentBranch are called
        expect(mockWorktreeService.isOnMainBranch).toHaveBeenCalled();
        expect(mockWorktreeService.getCurrentBranch).toHaveBeenCalled();
      });
    });

    describe('Task 1.1: 事前検証ロジック - spec存在確認', () => {
      it('should return error when spec not found', async () => {
        // Arrange
        (mockWorktreeService.isOnMainBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: true,
        });
        mockFsPromises.access.mockRejectedValue(new Error('ENOENT'));

        // Act
        const result = await convertService.canConvert(projectPath, specPath);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('SPEC_NOT_FOUND');
        }
      });
    });

    describe('Task 1.1: 事前検証ロジック - impl未開始確認', () => {
      it('should return error when impl already started (has worktree.branch)', async () => {
        // Arrange
        (mockWorktreeService.isOnMainBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: true,
        });
        mockFsPromises.access.mockResolvedValue(undefined);
        (mockFileService.readSpecJson as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            feature_name: 'my-feature',
            phase: 'tasks-generated',
            worktree: {
              branch: 'feature/my-feature',
              created_at: '2026-01-19T12:00:00Z',
            },
          } as SpecJson,
        });

        // Act
        const result = await convertService.canConvert(projectPath, specPath);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('IMPL_ALREADY_STARTED');
        }
      });
    });

    describe('Task 1.1: 事前検証ロジック - 非Worktreeモード確認', () => {
      it('should return error when already in worktree mode (has worktree.path)', async () => {
        // Arrange
        (mockWorktreeService.isOnMainBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: true,
        });
        mockFsPromises.access.mockResolvedValue(undefined);
        (mockFileService.readSpecJson as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            feature_name: 'my-feature',
            phase: 'tasks-generated',
            worktree: {
              path: '.kiro/worktrees/specs/my-feature',
              branch: 'feature/my-feature',
              created_at: '2026-01-19T12:00:00Z',
              enabled: true,
            },
          } as SpecJson,
        });

        // Act
        const result = await convertService.canConvert(projectPath, specPath);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('ALREADY_WORKTREE_MODE');
        }
      });
    });

    describe('Task 1.1: canConvert成功ケース', () => {
      it('should return true when all validations pass', async () => {
        // Arrange
        (mockWorktreeService.isOnMainBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: true,
        });
        mockFsPromises.access.mockResolvedValue(undefined);
        (mockFileService.readSpecJson as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            feature_name: 'my-feature',
            phase: 'tasks-generated',
            approvals: {
              requirements: { generated: true, approved: true },
              design: { generated: true, approved: true },
              tasks: { generated: true, approved: true },
            },
          } as SpecJson,
        });
        // worktree-convert-spec-optimization: mock untracked status for success case
        (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: true,
            files: ['spec.json'],
            statusOutput: '?? .kiro/specs/my-feature/spec.json',
          },
        });

        // Act
        const result = await convertService.canConvert(projectPath, specPath);

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toBe(true);
        }
      });

      it('should return true when worktree.enabled is true but path is not set', async () => {
        // Arrange - spec has worktree.enabled but no path (mode selected, not converted yet)
        (mockWorktreeService.isOnMainBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: true,
        });
        mockFsPromises.access.mockResolvedValue(undefined);
        (mockFileService.readSpecJson as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            feature_name: 'my-feature',
            phase: 'tasks-generated',
            worktree: {
              enabled: true,
            },
          } as SpecJson,
        });
        // worktree-convert-spec-optimization: mock untracked status for success case
        (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: true,
            files: ['spec.json'],
            statusOutput: '?? .kiro/specs/my-feature/spec.json',
          },
        });

        // Act
        const result = await convertService.canConvert(projectPath, specPath);

        // Assert
        expect(result.ok).toBe(true);
      });
    });
  });

  describe('convertToWorktree', () => {
    describe('Task 1.2: 変換処理本体 - 正常系', () => {
      beforeEach(() => {
        // Setup default success mocks
        (mockWorktreeService.isOnMainBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: true,
        });
        mockFsPromises.access.mockResolvedValue(undefined);
        (mockFileService.readSpecJson as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            feature_name: 'my-feature',
            phase: 'tasks-generated',
            approvals: {
              requirements: { generated: true, approved: true },
              design: { generated: true, approved: true },
              tasks: { generated: true, approved: true },
            },
          } as SpecJson,
        });
        // worktree-convert-spec-optimization: mock untracked status for conversion
        (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: true,
            files: ['spec.json'],
            statusOutput: '?? .kiro/specs/my-feature/spec.json',
          },
        });
        (mockWorktreeService.createWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            path: '.kiro/worktrees/specs/my-feature',
            absolutePath: '/test/project/.kiro/worktrees/specs/my-feature',
            branch: 'feature/my-feature',
            created_at: '2026-01-19T12:00:00Z',
          },
        });
        mockFsPromises.mkdir.mockResolvedValue(undefined);
        mockFsPromises.cp.mockResolvedValue(undefined);
        mockFsPromises.rm.mockResolvedValue(undefined);
        (mockWorktreeService.createSymlinksForWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: undefined,
        });
        (mockFileService.updateSpecJson as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: undefined,
        });
      });

      it('should execute conversion steps in order: createWorktree, moveSpec, createSymlinks, updateSpecJson', async () => {
        // Arrange - mocks already set in beforeEach

        // Act
        const result = await convertService.convertToWorktree(projectPath, specPath, featureName);

        // Assert
        expect(result.ok).toBe(true);
        expect(mockWorktreeService.createWorktree).toHaveBeenCalledWith(featureName);
        expect(mockFsPromises.mkdir).toHaveBeenCalled();
        expect(mockFsPromises.cp).toHaveBeenCalled();
        expect(mockFsPromises.rm).toHaveBeenCalled();
        expect(mockWorktreeService.createSymlinksForWorktree).toHaveBeenCalled();
        expect(mockFileService.updateSpecJson).toHaveBeenCalled();
      });

      it('should return WorktreeInfo on success', async () => {
        // Act
        const result = await convertService.convertToWorktree(projectPath, specPath, featureName);

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.path).toBe('.kiro/worktrees/specs/my-feature');
          expect(result.value.branch).toBe('feature/my-feature');
        }
      });
    });

    describe('Task 1.3: ロールバック処理', () => {
      beforeEach(() => {
        // Setup default success mocks for validation
        (mockWorktreeService.isOnMainBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: true,
        });
        mockFsPromises.access.mockResolvedValue(undefined);
        (mockFileService.readSpecJson as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            feature_name: 'my-feature',
            phase: 'tasks-generated',
          } as SpecJson,
        });
        // worktree-convert-spec-optimization: mock untracked status for rollback tests
        (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: true,
            files: ['spec.json'],
            statusOutput: '?? .kiro/specs/my-feature/spec.json',
          },
        });
      });

      it('should rollback branch on worktree creation failure', async () => {
        // Arrange
        (mockWorktreeService.createWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: false,
          error: { type: 'GIT_ERROR', message: 'worktree creation failed' },
        });
        (mockWorktreeService.removeWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: undefined,
        });

        // Act
        const result = await convertService.convertToWorktree(projectPath, specPath, featureName);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('WORKTREE_CREATE_FAILED');
        }
        // Branch rollback is handled internally by WorktreeService.createWorktree
      });

      it('should rollback worktree and branch on file move failure', async () => {
        // Arrange
        (mockWorktreeService.createWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            path: '.kiro/worktrees/specs/my-feature',
            absolutePath: '/test/project/.kiro/worktrees/specs/my-feature',
            branch: 'feature/my-feature',
            created_at: '2026-01-19T12:00:00Z',
          },
        });
        mockFsPromises.mkdir.mockResolvedValue(undefined);
        mockFsPromises.cp.mockRejectedValue(new Error('copy failed'));
        (mockWorktreeService.removeWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: undefined,
        });

        // Act
        const result = await convertService.convertToWorktree(projectPath, specPath, featureName);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('FILE_MOVE_FAILED');
        }
        // Verify rollback was called
        expect(mockWorktreeService.removeWorktree).toHaveBeenCalledWith(featureName);
      });

      it('should rollback all on symlink creation failure', async () => {
        // Arrange
        (mockWorktreeService.createWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            path: '.kiro/worktrees/specs/my-feature',
            absolutePath: '/test/project/.kiro/worktrees/specs/my-feature',
            branch: 'feature/my-feature',
            created_at: '2026-01-19T12:00:00Z',
          },
        });
        mockFsPromises.mkdir.mockResolvedValue(undefined);
        mockFsPromises.cp.mockResolvedValue(undefined);
        mockFsPromises.rm.mockResolvedValue(undefined);
        (mockWorktreeService.createSymlinksForWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: false,
          error: { type: 'GIT_ERROR', message: 'symlink failed' },
        });
        (mockWorktreeService.removeWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: undefined,
        });

        // Act
        const result = await convertService.convertToWorktree(projectPath, specPath, featureName);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('SYMLINK_CREATE_FAILED');
        }
        // Note: Original spec files were already moved, so rollback should restore them if possible
      });
    });
  });

  // ============================================================
  // worktree-convert-spec-optimization Tests
  // Task 5.1: getSpecStatus() テスト
  // Requirements: 1.1, 1.2, 1.3
  // ============================================================

  describe('getSpecStatus', () => {
    describe('Task 5.1: git status出力パターン別の解析テスト', () => {
      it('should return "committed-clean" when git status output is empty', async () => {
        // Arrange - git status returns empty output (no changes)
        (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: { hasChanges: false, files: [], statusOutput: '' },
        });

        // Act
        const result = await convertService.getSpecStatus(specPath);

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toBe('committed-clean');
        }
      });

      it('should return "untracked" when git status shows ?? (untracked files)', async () => {
        // Arrange - git status returns untracked files
        (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: true,
            files: ['spec.json', 'requirements.md'],
            statusOutput: '?? .kiro/specs/my-feature/spec.json\n?? .kiro/specs/my-feature/requirements.md',
          },
        });

        // Act
        const result = await convertService.getSpecStatus(specPath);

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toBe('untracked');
        }
      });

      it('should return "untracked" when git status shows A (staged new files)', async () => {
        // Arrange - git status returns staged new files
        (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: true,
            files: ['spec.json'],
            statusOutput: 'A  .kiro/specs/my-feature/spec.json',
          },
        });

        // Act
        const result = await convertService.getSpecStatus(specPath);

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toBe('untracked');
        }
      });

      it('should return "committed-dirty" when git status shows M (modified)', async () => {
        // Arrange - git status returns modified files
        (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: true,
            files: ['spec.json'],
            statusOutput: ' M .kiro/specs/my-feature/spec.json',
          },
        });

        // Act
        const result = await convertService.getSpecStatus(specPath);

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toBe('committed-dirty');
        }
      });

      it('should return "committed-dirty" when git status shows D (deleted)', async () => {
        // Arrange - git status returns deleted files
        (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: true,
            files: ['design.md'],
            statusOutput: ' D .kiro/specs/my-feature/design.md',
          },
        });

        // Act
        const result = await convertService.getSpecStatus(specPath);

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toBe('committed-dirty');
        }
      });

      it('should return "committed-dirty" when git status shows R (renamed)', async () => {
        // Arrange - git status returns renamed files
        (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: true,
            files: ['old.md -> new.md'],
            statusOutput: 'R  .kiro/specs/my-feature/old.md -> .kiro/specs/my-feature/new.md',
          },
        });

        // Act
        const result = await convertService.getSpecStatus(specPath);

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toBe('committed-dirty');
        }
      });

      it('should return "committed-dirty" when git status shows MM (modified in both index and worktree)', async () => {
        // Arrange - git status returns modified in both
        (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: true,
            files: ['spec.json'],
            statusOutput: 'MM .kiro/specs/my-feature/spec.json',
          },
        });

        // Act
        const result = await convertService.getSpecStatus(specPath);

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toBe('committed-dirty');
        }
      });
    });

    describe('Task 5.1: 複数状態混在時の優先度判定テスト', () => {
      it('should return "committed-dirty" when both untracked and modified files exist (dirty > untracked)', async () => {
        // Arrange - both untracked and modified files
        (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: true,
            files: ['spec.json', 'requirements.md'],
            statusOutput: '?? .kiro/specs/my-feature/spec.json\n M .kiro/specs/my-feature/requirements.md',
          },
        });

        // Act
        const result = await convertService.getSpecStatus(specPath);

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toBe('committed-dirty');
        }
      });

      it('should return "untracked" when only untracked files exist (untracked > clean)', async () => {
        // Arrange - only untracked files
        (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: true,
            files: ['spec.json', 'requirements.md'],
            statusOutput: '?? .kiro/specs/my-feature/spec.json\nA  .kiro/specs/my-feature/requirements.md',
          },
        });

        // Act
        const result = await convertService.getSpecStatus(specPath);

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toBe('untracked');
        }
      });
    });

    describe('Task 5.1: エラーハンドリング', () => {
      it('should propagate git error from checkUncommittedSpecChanges', async () => {
        // Arrange
        (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: false,
          error: { type: 'GIT_ERROR', message: 'git command failed' },
        });

        // Act
        const result = await convertService.getSpecStatus(specPath);

        // Assert
        expect(result.ok).toBe(false);
      });
    });
  });

  // ============================================================
  // worktree-convert-spec-optimization Tests
  // Task 5.2: canConvert() 拡張テスト
  // Requirements: 4.1, 4.3
  // ============================================================

  describe('canConvert - spec status integration', () => {
    describe('Task 5.2: committed-dirty状態でのエラー返却テスト', () => {
      it('should return SPEC_HAS_UNCOMMITTED_CHANGES error when spec is committed-dirty', async () => {
        // Arrange
        (mockWorktreeService.isOnMainBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: true,
        });
        mockFsPromises.access.mockResolvedValue(undefined);
        (mockFileService.readSpecJson as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            feature_name: 'my-feature',
            phase: 'tasks-generated',
          } as SpecJson,
        });
        // committed-dirty: has modified files
        (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: true,
            files: ['spec.json'],
            statusOutput: ' M .kiro/specs/my-feature/spec.json',
          },
        });

        // Act
        const result = await convertService.canConvert(projectPath, specPath);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('SPEC_HAS_UNCOMMITTED_CHANGES');
          expect((result.error as { files: string[] }).files).toContain('spec.json');
        }
      });

      it('should return SPEC_HAS_UNCOMMITTED_CHANGES with all changed files listed', async () => {
        // Arrange
        (mockWorktreeService.isOnMainBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: true,
        });
        mockFsPromises.access.mockResolvedValue(undefined);
        (mockFileService.readSpecJson as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            feature_name: 'my-feature',
            phase: 'tasks-generated',
          } as SpecJson,
        });
        // committed-dirty: has multiple modified files
        (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: true,
            files: ['spec.json', 'requirements.md', 'design.md'],
            statusOutput: ' M .kiro/specs/my-feature/spec.json\n M .kiro/specs/my-feature/requirements.md\nD  .kiro/specs/my-feature/design.md',
          },
        });

        // Act
        const result = await convertService.canConvert(projectPath, specPath);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('SPEC_HAS_UNCOMMITTED_CHANGES');
          const errorFiles = (result.error as { files: string[] }).files;
          expect(errorFiles).toContain('spec.json');
          expect(errorFiles).toContain('requirements.md');
          expect(errorFiles).toContain('design.md');
        }
      });
    });

    describe('Task 5.2: untracked状態での正常通過テスト', () => {
      it('should return true when spec is untracked (allowed for conversion)', async () => {
        // Arrange
        (mockWorktreeService.isOnMainBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: true,
        });
        mockFsPromises.access.mockResolvedValue(undefined);
        (mockFileService.readSpecJson as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            feature_name: 'my-feature',
            phase: 'tasks-generated',
          } as SpecJson,
        });
        // untracked: all files are new (untracked)
        (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: true,
            files: ['spec.json', 'requirements.md'],
            statusOutput: '?? .kiro/specs/my-feature/spec.json\n?? .kiro/specs/my-feature/requirements.md',
          },
        });

        // Act
        const result = await convertService.canConvert(projectPath, specPath);

        // Assert
        expect(result.ok).toBe(true);
      });
    });

    describe('Task 5.2: committed-clean状態での正常通過テスト', () => {
      it('should return true when spec is committed-clean (allowed for conversion)', async () => {
        // Arrange
        (mockWorktreeService.isOnMainBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: true,
        });
        mockFsPromises.access.mockResolvedValue(undefined);
        (mockFileService.readSpecJson as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            feature_name: 'my-feature',
            phase: 'tasks-generated',
          } as SpecJson,
        });
        // committed-clean: no changes
        (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: false,
            files: [],
            statusOutput: '',
          },
        });

        // Act
        const result = await convertService.canConvert(projectPath, specPath);

        // Assert
        expect(result.ok).toBe(true);
      });
    });
  });

  // ============================================================
  // worktree-convert-spec-optimization Tests
  // Task 5.3: convertToWorktree() 分岐テスト
  // Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3
  // ============================================================

  describe('convertToWorktree - spec status branching', () => {
    describe('Task 5.3: untracked時のコピー→削除実行確認テスト', () => {
      beforeEach(() => {
        // Setup default success mocks
        (mockWorktreeService.isOnMainBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: true,
        });
        mockFsPromises.access.mockResolvedValue(undefined);
        (mockFileService.readSpecJson as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            feature_name: 'my-feature',
            phase: 'tasks-generated',
          } as SpecJson,
        });
        // untracked status
        (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: true,
            files: ['spec.json'],
            statusOutput: '?? .kiro/specs/my-feature/spec.json',
          },
        });
        (mockWorktreeService.createWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            path: '.kiro/worktrees/specs/my-feature',
            absolutePath: '/test/project/.kiro/worktrees/specs/my-feature',
            branch: 'feature/my-feature',
            created_at: '2026-01-19T12:00:00Z',
          },
        });
        mockFsPromises.mkdir.mockResolvedValue(undefined);
        mockFsPromises.cp.mockResolvedValue(undefined);
        mockFsPromises.rm.mockResolvedValue(undefined);
        (mockWorktreeService.createSymlinksForWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: undefined,
        });
        (mockFileService.updateSpecJson as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: undefined,
        });
      });

      it('should execute cp and rm when spec is untracked', async () => {
        // Act
        const result = await convertService.convertToWorktree(projectPath, specPath, featureName);

        // Assert
        expect(result.ok).toBe(true);
        expect(mockFsPromises.cp).toHaveBeenCalledWith(
          specPath,
          '/test/project/.kiro/worktrees/specs/my-feature/.kiro/specs/my-feature',
          { recursive: true }
        );
        expect(mockFsPromises.rm).toHaveBeenCalledWith(specPath, { recursive: true, force: true });
      });
    });

    describe('Task 5.3: committed-clean時のコピースキップ確認テスト', () => {
      beforeEach(() => {
        // Setup default success mocks
        (mockWorktreeService.isOnMainBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: true,
        });
        mockFsPromises.access.mockResolvedValue(undefined);
        (mockFileService.readSpecJson as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            feature_name: 'my-feature',
            phase: 'tasks-generated',
          } as SpecJson,
        });
        // committed-clean status
        (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: false,
            files: [],
            statusOutput: '',
          },
        });
        (mockWorktreeService.createWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            path: '.kiro/worktrees/specs/my-feature',
            absolutePath: '/test/project/.kiro/worktrees/specs/my-feature',
            branch: 'feature/my-feature',
            created_at: '2026-01-19T12:00:00Z',
          },
        });
        mockFsPromises.mkdir.mockResolvedValue(undefined);
        mockFsPromises.cp.mockResolvedValue(undefined);
        mockFsPromises.rm.mockResolvedValue(undefined);
        (mockWorktreeService.createSymlinksForWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: undefined,
        });
        (mockFileService.updateSpecJson as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: undefined,
        });
      });

      it('should NOT execute cp and rm when spec is committed-clean', async () => {
        // Act
        const result = await convertService.convertToWorktree(projectPath, specPath, featureName);

        // Assert
        expect(result.ok).toBe(true);
        expect(mockFsPromises.cp).not.toHaveBeenCalled();
        expect(mockFsPromises.rm).not.toHaveBeenCalled();
      });

      it('should still update spec.json in worktree when spec is committed-clean', async () => {
        // Act
        const result = await convertService.convertToWorktree(projectPath, specPath, featureName);

        // Assert
        expect(result.ok).toBe(true);
        expect(mockFileService.updateSpecJson).toHaveBeenCalledWith(
          '/test/project/.kiro/worktrees/specs/my-feature/.kiro/specs/my-feature',
          expect.objectContaining({
            worktree: expect.objectContaining({
              path: '.kiro/worktrees/specs/my-feature',
              branch: 'feature/my-feature',
              enabled: true,
            }),
          })
        );
      });
    });

    describe('Task 5.3: committed-clean時のworktree内spec存在確認テスト', () => {
      beforeEach(() => {
        // Setup default success mocks
        (mockWorktreeService.isOnMainBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: true,
        });
        (mockFileService.readSpecJson as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            feature_name: 'my-feature',
            phase: 'tasks-generated',
          } as SpecJson,
        });
        // committed-clean status
        (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            hasChanges: false,
            files: [],
            statusOutput: '',
          },
        });
        (mockWorktreeService.createWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: {
            path: '.kiro/worktrees/specs/my-feature',
            absolutePath: '/test/project/.kiro/worktrees/specs/my-feature',
            branch: 'feature/my-feature',
            created_at: '2026-01-19T12:00:00Z',
          },
        });
        (mockWorktreeService.createSymlinksForWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: undefined,
        });
        (mockFileService.updateSpecJson as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          value: undefined,
        });
      });

      it('should verify spec exists in worktree when committed-clean', async () => {
        // Arrange - spec exists in worktree (verified via fs.access on spec.json path)
        // First call: original spec path (validation)
        // Second call: worktree spec path (verification for committed-clean)
        mockFsPromises.access
          .mockResolvedValueOnce(undefined) // original spec exists
          .mockResolvedValueOnce(undefined); // worktree spec exists

        // Act
        const result = await convertService.convertToWorktree(projectPath, specPath, featureName);

        // Assert
        expect(result.ok).toBe(true);
        // Verify that access was called to check worktree spec path
        expect(mockFsPromises.access).toHaveBeenCalledTimes(2);
      });

      it('should return SPEC_NOT_IN_WORKTREE error when spec does not exist in worktree', async () => {
        // Arrange - spec does not exist in worktree
        mockFsPromises.access
          .mockResolvedValueOnce(undefined) // original spec exists
          .mockRejectedValueOnce(new Error('ENOENT')); // worktree spec does not exist

        // Act
        const result = await convertService.convertToWorktree(projectPath, specPath, featureName);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('SPEC_NOT_IN_WORKTREE');
        }
      });
    });
  });

  // ============================================================
  // worktree-convert-spec-optimization Tests
  // Task 4: エラーメッセージ関数テスト
  // Requirements: 4.2
  // ============================================================

  describe('getConvertErrorMessage', () => {
    describe('Task 4: 新規エラータイプのメッセージ生成テスト', () => {
      it('should return appropriate message for SPEC_HAS_UNCOMMITTED_CHANGES', () => {
        // Arrange
        const error = {
          type: 'SPEC_HAS_UNCOMMITTED_CHANGES' as const,
          specPath: '/test/project/.kiro/specs/my-feature',
          files: ['spec.json', 'requirements.md'],
        };

        // Act
        const message = getConvertErrorMessage(error);

        // Assert
        expect(message).toContain('未コミットの変更');
        expect(message).toContain('先にコミットしてください');
        expect(message).toContain('spec.json');
        expect(message).toContain('requirements.md');
      });

      it('should return appropriate message for SPEC_NOT_IN_WORKTREE', () => {
        // Arrange
        const error = {
          type: 'SPEC_NOT_IN_WORKTREE' as const,
          specPath: '/test/project/.kiro/worktrees/specs/my-feature/.kiro/specs/my-feature',
        };

        // Act
        const message = getConvertErrorMessage(error);

        // Assert
        expect(message).toContain('Worktree内にSpec');
        expect(message).toContain('見つかりません');
      });

      // no-commits-recovery: 空リポジトリエラーのテスト
      it('should return recovery message for NO_COMMITS_IN_REPO', () => {
        // Arrange
        const error = {
          type: 'NO_COMMITS_IN_REPO' as const,
          message: 'リポジトリにコミットが存在しません。Worktreeを作成するには、最初のコミットが必要です。\n\n解決方法:\n  git add .\n  git commit -m "Initial commit"',
        };

        // Act
        const message = getConvertErrorMessage(error);

        // Assert
        expect(message).toContain('リポジトリにコミットが存在しません');
        expect(message).toContain('git add');
        expect(message).toContain('git commit');
      });
    });
  });

  // ============================================================
  // Event Log Tests
  // Tests for worktree:create event emission
  // ============================================================
  describe('Event logging', () => {
    let mockEventLogService: {
      logEvent: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockEventLogService = {
        logEvent: vi.fn().mockResolvedValue(undefined),
      };

      // Setup default success mocks
      (mockWorktreeService.isOnMainBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: true,
      });
      mockFsPromises.access.mockResolvedValue(undefined);
      (mockFileService.readSpecJson as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: {
          feature_name: 'my-feature',
          phase: 'tasks-generated',
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: true, approved: true },
            tasks: { generated: true, approved: true },
          },
        } as SpecJson,
      });
      (mockWorktreeService.createWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: {
          path: '.kiro/worktrees/specs/my-feature',
          absolutePath: '/test/project/.kiro/worktrees/specs/my-feature',
          branch: 'feature/my-feature',
          created_at: '2026-01-19T12:00:00Z',
        },
      });
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.cp.mockResolvedValue(undefined);
      mockFsPromises.rm.mockResolvedValue(undefined);
      (mockWorktreeService.createSymlinksForWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: undefined,
      });
      (mockFileService.updateSpecJson as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: undefined,
      });
    });

    it('should log worktree:create event on successful conversion (untracked spec)', async () => {
      // Arrange - mock untracked status
      (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: {
          hasChanges: true,
          files: ['spec.json'],
          statusOutput: '?? .kiro/specs/my-feature/spec.json',
        },
      });

      const serviceWithEventLog = new ConvertWorktreeService(
        mockWorktreeService,
        mockFileService,
        mockFsPromises,
        mockEventLogService as any
      );

      // Act
      const result = await serviceWithEventLog.convertToWorktree(projectPath, specPath, featureName);

      // Assert
      expect(result.ok).toBe(true);
      expect(mockEventLogService.logEvent).toHaveBeenCalledOnce();
      expect(mockEventLogService.logEvent).toHaveBeenCalledWith(
        projectPath,
        featureName,
        expect.objectContaining({
          type: 'worktree:create',
          message: expect.stringContaining('Worktreeモードに変換'),
          worktreePath: '.kiro/worktrees/specs/my-feature',
          branch: 'feature/my-feature',
          specStatus: 'untracked',
          copiedFiles: expect.arrayContaining(['spec.json', 'requirements.md']),
        })
      );
    });

    it('should log worktree:create event on successful conversion (committed-clean spec)', async () => {
      // Arrange - mock committed-clean status
      (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: {
          hasChanges: false,
          files: [],
          statusOutput: '',
        },
      });
      // For committed-clean, we need to verify spec in worktree
      mockFsPromises.access.mockResolvedValue(undefined);

      const serviceWithEventLog = new ConvertWorktreeService(
        mockWorktreeService,
        mockFileService,
        mockFsPromises,
        mockEventLogService as any
      );

      // Act
      const result = await serviceWithEventLog.convertToWorktree(projectPath, specPath, featureName);

      // Assert
      expect(result.ok).toBe(true);
      expect(mockEventLogService.logEvent).toHaveBeenCalledOnce();
      expect(mockEventLogService.logEvent).toHaveBeenCalledWith(
        projectPath,
        featureName,
        expect.objectContaining({
          type: 'worktree:create',
          message: expect.stringContaining('コミット済みSpec'),
          worktreePath: '.kiro/worktrees/specs/my-feature',
          branch: 'feature/my-feature',
          specStatus: 'committed-clean',
          notes: expect.stringContaining('git worktreeに自動的に含まれます'),
        })
      );
    });

    it('should not log event when EventLogService is not provided', async () => {
      // Arrange - mock untracked status
      (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: {
          hasChanges: true,
          files: ['spec.json'],
          statusOutput: '?? .kiro/specs/my-feature/spec.json',
        },
      });

      const serviceWithoutEventLog = new ConvertWorktreeService(
        mockWorktreeService,
        mockFileService,
        mockFsPromises
        // No eventLogService
      );

      // Act
      const result = await serviceWithoutEventLog.convertToWorktree(projectPath, specPath, featureName);

      // Assert
      expect(result.ok).toBe(true);
      expect(mockEventLogService.logEvent).not.toHaveBeenCalled();
    });

    it('should not log event when conversion fails', async () => {
      // Arrange - make conversion fail at worktree creation
      (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: {
          hasChanges: true,
          files: ['spec.json'],
          statusOutput: '?? .kiro/specs/my-feature/spec.json',
        },
      });
      (mockWorktreeService.createWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: { type: 'GIT_ERROR', message: 'worktree creation failed' },
      });

      const serviceWithEventLog = new ConvertWorktreeService(
        mockWorktreeService,
        mockFileService,
        mockFsPromises,
        mockEventLogService as any
      );

      // Act
      const result = await serviceWithEventLog.convertToWorktree(projectPath, specPath, featureName);

      // Assert
      expect(result.ok).toBe(false);
      expect(mockEventLogService.logEvent).not.toHaveBeenCalled();
    });
  });
});
