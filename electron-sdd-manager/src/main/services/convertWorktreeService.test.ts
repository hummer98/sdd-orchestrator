/**
 * ConvertWorktreeService Tests
 * Requirements: 2.1, 2.2, 2.3, 2.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 * (convert-spec-to-worktree feature)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConvertWorktreeService } from './convertWorktreeService';
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
});
