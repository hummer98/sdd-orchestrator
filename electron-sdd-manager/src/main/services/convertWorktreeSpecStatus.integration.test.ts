/**
 * ConvertWorktreeService Spec Status Integration Tests
 * worktree-convert-spec-optimization Task 6
 * Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 5.2, 5.3
 *
 * NOTE: These tests use mocked git commands but real file system operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { ConvertWorktreeService, getConvertErrorMessage, type SpecCommitStatus } from './convertWorktreeService';
import type { FileService } from './fileService';
import type { WorktreeService } from './worktreeService';
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

describe('ConvertWorktreeService Spec Status Integration Tests', () => {
  let testDir: string;
  let specsDir: string;
  let worktreeSpecsDir: string;
  let mockWorktreeService: WorktreeService;
  let mockFileService: FileService;
  let convertService: ConvertWorktreeService;

  const featureName = 'test-feature';

  beforeEach(async () => {
    testDir = join(tmpdir(), `convert-worktree-spec-status-test-${Date.now()}`);
    specsDir = join(testDir, '.kiro', 'specs');
    worktreeSpecsDir = join(testDir, '.kiro', 'worktrees', 'specs');
    await mkdir(specsDir, { recursive: true });

    // Create mock WorktreeService
    mockWorktreeService = {
      isOnMainBranch: vi.fn(),
      getCurrentBranch: vi.fn(),
      createWorktree: vi.fn(),
      removeWorktree: vi.fn(),
      createSymlinksForWorktree: vi.fn(),
      getWorktreePath: vi.fn().mockReturnValue({
        relative: `.kiro/worktrees/specs/${featureName}`,
        absolute: join(testDir, '.kiro', 'worktrees', 'specs', featureName),
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

    // Setup default success mocks
    (mockWorktreeService.isOnMainBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      value: true,
    });
    (mockWorktreeService.getCurrentBranch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      value: 'main',
    });

    // Create convertService with real fs access (passed as undefined to use real fs)
    convertService = new ConvertWorktreeService(
      mockWorktreeService,
      mockFileService
    );
  });

  afterEach(async () => {
    vi.clearAllMocks();
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // ============================================================
  // Task 6: 実際のgitリポジトリを使用した状態判定の統合テスト
  // Requirements: 1.1
  // ============================================================
  describe('Task 6: Spec status determination', () => {
    it('should correctly determine "committed-clean" status from git status output', async () => {
      // Arrange - git status returns empty (committed-clean)
      (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: {
          hasChanges: false,
          files: [],
          statusOutput: '',
        },
      });

      const specPath = join(specsDir, featureName);
      await mkdir(specPath, { recursive: true });
      await writeFile(join(specPath, 'spec.json'), JSON.stringify({
        feature_name: featureName,
        phase: 'tasks-generated',
      }));

      // Act
      const result = await convertService.getSpecStatus(specPath);

      // Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('committed-clean');
      }
    });

    it('should correctly determine "untracked" status from git status output', async () => {
      // Arrange - git status returns untracked files
      (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: {
          hasChanges: true,
          files: ['spec.json', 'requirements.md'],
          statusOutput: '?? .kiro/specs/test-feature/spec.json\n?? .kiro/specs/test-feature/requirements.md',
        },
      });

      const specPath = join(specsDir, featureName);
      await mkdir(specPath, { recursive: true });

      // Act
      const result = await convertService.getSpecStatus(specPath);

      // Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('untracked');
      }
    });

    it('should correctly determine "committed-dirty" status from git status output', async () => {
      // Arrange - git status returns modified files
      (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: {
          hasChanges: true,
          files: ['spec.json'],
          statusOutput: ' M .kiro/specs/test-feature/spec.json',
        },
      });

      const specPath = join(specsDir, featureName);
      await mkdir(specPath, { recursive: true });

      // Act
      const result = await convertService.getSpecStatus(specPath);

      // Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('committed-dirty');
      }
    });

    it('should apply priority rule: committed-dirty > untracked when mixed', async () => {
      // Arrange - git status returns both untracked and modified files
      (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: {
          hasChanges: true,
          files: ['spec.json', 'new-file.md'],
          statusOutput: ' M .kiro/specs/test-feature/spec.json\n?? .kiro/specs/test-feature/new-file.md',
        },
      });

      const specPath = join(specsDir, featureName);
      await mkdir(specPath, { recursive: true });

      // Act
      const result = await convertService.getSpecStatus(specPath);

      // Assert - committed-dirty takes priority
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('committed-dirty');
      }
    });
  });

  // ============================================================
  // Task 6: 未コミットspec -> worktree変換の完全フロー確認
  // Requirements: 2.1
  // ============================================================
  describe('Task 6: Untracked spec to worktree conversion flow', () => {
    it('should execute full conversion flow for untracked spec', async () => {
      // Arrange
      const specPath = join(specsDir, featureName);
      await mkdir(specPath, { recursive: true });
      await writeFile(join(specPath, 'spec.json'), JSON.stringify({
        feature_name: featureName,
        phase: 'tasks-generated',
      }));

      (mockFileService.readSpecJson as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: {
          feature_name: featureName,
          phase: 'tasks-generated',
        } as SpecJson,
      });

      // Untracked status
      (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: {
          hasChanges: true,
          files: ['spec.json'],
          statusOutput: '?? .kiro/specs/test-feature/spec.json',
        },
      });

      const worktreePath = join(worktreeSpecsDir, featureName);
      (mockWorktreeService.createWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: {
          path: `.kiro/worktrees/specs/${featureName}`,
          absolutePath: worktreePath,
          branch: `feature/${featureName}`,
          created_at: new Date().toISOString(),
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

      // Act
      const result = await convertService.convertToWorktree(testDir, specPath, featureName);

      // Assert
      expect(result.ok).toBe(true);
      expect(mockWorktreeService.createWorktree).toHaveBeenCalledWith(featureName);
      expect(mockWorktreeService.createSymlinksForWorktree).toHaveBeenCalled();
      expect(mockFileService.updateSpecJson).toHaveBeenCalledWith(
        expect.stringContaining('worktrees/specs/test-feature'),
        expect.objectContaining({
          worktree: expect.objectContaining({
            enabled: true,
            branch: `feature/${featureName}`,
          }),
        })
      );
    });

    it('should copy and remove spec files for untracked spec', async () => {
      // Arrange
      const specPath = join(specsDir, featureName);
      await mkdir(specPath, { recursive: true });
      const specJsonContent = {
        feature_name: featureName,
        phase: 'tasks-generated',
      };
      await writeFile(join(specPath, 'spec.json'), JSON.stringify(specJsonContent));
      await writeFile(join(specPath, 'requirements.md'), '# Requirements');

      (mockFileService.readSpecJson as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: specJsonContent as SpecJson,
      });

      // Untracked status
      (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: {
          hasChanges: true,
          files: ['spec.json', 'requirements.md'],
          statusOutput: '?? .kiro/specs/test-feature/spec.json\n?? .kiro/specs/test-feature/requirements.md',
        },
      });

      const worktreePath = join(worktreeSpecsDir, featureName);
      await mkdir(worktreePath, { recursive: true });
      const worktreeSpecPath = join(worktreePath, '.kiro', 'specs', featureName);
      await mkdir(worktreeSpecPath, { recursive: true });

      (mockWorktreeService.createWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: {
          path: `.kiro/worktrees/specs/${featureName}`,
          absolutePath: worktreePath,
          branch: `feature/${featureName}`,
          created_at: new Date().toISOString(),
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

      // Act
      const result = await convertService.convertToWorktree(testDir, specPath, featureName);

      // Assert - Verify files were copied to worktree and original deleted
      expect(result.ok).toBe(true);

      // Check destination files exist
      const destSpecJson = await readFile(join(worktreeSpecPath, 'spec.json'), 'utf-8');
      expect(JSON.parse(destSpecJson).feature_name).toBe(featureName);

      // Check source files were removed
      try {
        await readFile(join(specPath, 'spec.json'), 'utf-8');
        expect.fail('Source spec.json should have been deleted');
      } catch (error) {
        // Expected - file should not exist
        expect((error as NodeJS.ErrnoException).code).toBe('ENOENT');
      }
    });
  });

  // ============================================================
  // Task 6: コミット済み・差分なしspec -> worktree変換の完全フロー確認
  // Requirements: 3.1
  // ============================================================
  describe('Task 6: Committed-clean spec to worktree conversion flow', () => {
    it('should skip copy/delete for committed-clean spec', async () => {
      // Arrange
      const specPath = join(specsDir, featureName);
      await mkdir(specPath, { recursive: true });
      const specJsonContent = {
        feature_name: featureName,
        phase: 'tasks-generated',
      };
      await writeFile(join(specPath, 'spec.json'), JSON.stringify(specJsonContent));

      (mockFileService.readSpecJson as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: specJsonContent as SpecJson,
      });

      // Committed-clean status
      (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: {
          hasChanges: false,
          files: [],
          statusOutput: '',
        },
      });

      const worktreePath = join(worktreeSpecsDir, featureName);
      await mkdir(worktreePath, { recursive: true });

      // For committed-clean, the spec is auto-included by git worktree
      // Simulate this by creating the spec in worktree path
      const worktreeSpecPath = join(worktreePath, '.kiro', 'specs', featureName);
      await mkdir(worktreeSpecPath, { recursive: true });
      await writeFile(join(worktreeSpecPath, 'spec.json'), JSON.stringify(specJsonContent));

      (mockWorktreeService.createWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: {
          path: `.kiro/worktrees/specs/${featureName}`,
          absolutePath: worktreePath,
          branch: `feature/${featureName}`,
          created_at: new Date().toISOString(),
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

      // Act
      const result = await convertService.convertToWorktree(testDir, specPath, featureName);

      // Assert
      expect(result.ok).toBe(true);

      // Verify original spec still exists (not deleted for committed-clean)
      const originalContent = await readFile(join(specPath, 'spec.json'), 'utf-8');
      expect(JSON.parse(originalContent).feature_name).toBe(featureName);
    });

    it('should verify spec exists in worktree for committed-clean spec', async () => {
      // Arrange
      const specPath = join(specsDir, featureName);
      await mkdir(specPath, { recursive: true });
      const specJsonContent = {
        feature_name: featureName,
        phase: 'tasks-generated',
      };
      await writeFile(join(specPath, 'spec.json'), JSON.stringify(specJsonContent));

      (mockFileService.readSpecJson as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: specJsonContent as SpecJson,
      });

      // Committed-clean status
      (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: {
          hasChanges: false,
          files: [],
          statusOutput: '',
        },
      });

      const worktreePath = join(worktreeSpecsDir, featureName);
      await mkdir(worktreePath, { recursive: true });

      // Worktree spec does NOT exist (simulating error case)
      // No worktreeSpecPath created

      (mockWorktreeService.createWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: {
          path: `.kiro/worktrees/specs/${featureName}`,
          absolutePath: worktreePath,
          branch: `feature/${featureName}`,
          created_at: new Date().toISOString(),
        },
      });

      (mockWorktreeService.removeWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: undefined,
      });

      // Act
      const result = await convertService.convertToWorktree(testDir, specPath, featureName);

      // Assert - Should fail with SPEC_NOT_IN_WORKTREE
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('SPEC_NOT_IN_WORKTREE');
      }

      // Verify rollback was called
      expect(mockWorktreeService.removeWorktree).toHaveBeenCalledWith(featureName);
    });
  });

  // ============================================================
  // Task 6: コミット済み・差分ありspec -> エラー確認
  // Requirements: 4.1
  // ============================================================
  describe('Task 6: Committed-dirty spec conversion error', () => {
    it('should return SPEC_HAS_UNCOMMITTED_CHANGES error for committed-dirty spec', async () => {
      // Arrange
      const specPath = join(specsDir, featureName);
      await mkdir(specPath, { recursive: true });
      await writeFile(join(specPath, 'spec.json'), JSON.stringify({
        feature_name: featureName,
        phase: 'tasks-generated',
      }));

      (mockFileService.readSpecJson as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: {
          feature_name: featureName,
          phase: 'tasks-generated',
        } as SpecJson,
      });

      // Committed-dirty status
      const changedFiles = ['spec.json', 'requirements.md'];
      (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: {
          hasChanges: true,
          files: changedFiles,
          statusOutput: ' M .kiro/specs/test-feature/spec.json\n M .kiro/specs/test-feature/requirements.md',
        },
      });

      // Act
      const result = await convertService.canConvert(testDir, specPath);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('SPEC_HAS_UNCOMMITTED_CHANGES');
        expect((result.error as { files: string[] }).files).toContain('spec.json');
        expect((result.error as { files: string[] }).files).toContain('requirements.md');
      }

      // Verify error message
      if (!result.ok) {
        const message = getConvertErrorMessage(result.error);
        expect(message).toContain('未コミットの変更');
        expect(message).toContain('spec.json');
      }
    });

    it('should not create worktree or branch for committed-dirty spec', async () => {
      // Arrange
      const specPath = join(specsDir, featureName);
      await mkdir(specPath, { recursive: true });
      await writeFile(join(specPath, 'spec.json'), JSON.stringify({
        feature_name: featureName,
        phase: 'tasks-generated',
      }));

      (mockFileService.readSpecJson as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: {
          feature_name: featureName,
          phase: 'tasks-generated',
        } as SpecJson,
      });

      // Committed-dirty status
      (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: {
          hasChanges: true,
          files: ['spec.json'],
          statusOutput: ' M .kiro/specs/test-feature/spec.json',
        },
      });

      // Act
      const result = await convertService.convertToWorktree(testDir, specPath, featureName);

      // Assert
      expect(result.ok).toBe(false);
      expect(mockWorktreeService.createWorktree).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Task 6: spec.jsonのworktreeフィールド更新確認
  // Requirements: 5.1, 5.2, 5.3
  // ============================================================
  describe('Task 6: spec.json worktree field update', () => {
    it('should update worktree field in worktree spec.json after successful conversion', async () => {
      // Arrange
      const specPath = join(specsDir, featureName);
      await mkdir(specPath, { recursive: true });
      await writeFile(join(specPath, 'spec.json'), JSON.stringify({
        feature_name: featureName,
        phase: 'tasks-generated',
      }));

      (mockFileService.readSpecJson as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: {
          feature_name: featureName,
          phase: 'tasks-generated',
        } as SpecJson,
      });

      // Untracked status
      (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: {
          hasChanges: true,
          files: ['spec.json'],
          statusOutput: '?? .kiro/specs/test-feature/spec.json',
        },
      });

      const worktreePath = join(worktreeSpecsDir, featureName);
      await mkdir(worktreePath, { recursive: true });
      const worktreeSpecPath = join(worktreePath, '.kiro', 'specs', featureName);
      await mkdir(worktreeSpecPath, { recursive: true });

      const createdAt = new Date().toISOString();
      (mockWorktreeService.createWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: {
          path: `.kiro/worktrees/specs/${featureName}`,
          absolutePath: worktreePath,
          branch: `feature/${featureName}`,
          created_at: createdAt,
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

      // Act
      const result = await convertService.convertToWorktree(testDir, specPath, featureName);

      // Assert
      expect(result.ok).toBe(true);

      // Verify updateSpecJson was called with correct worktree field
      expect(mockFileService.updateSpecJson).toHaveBeenCalledWith(
        worktreeSpecPath,
        {
          worktree: {
            path: `.kiro/worktrees/specs/${featureName}`,
            branch: `feature/${featureName}`,
            created_at: createdAt,
            enabled: true,
          },
        }
      );
    });

    it('should NOT update main spec.json for committed-clean conversion', async () => {
      // For committed-clean conversion, main spec.json should not be modified
      // Only worktree spec.json gets the worktree field added

      // Arrange
      const specPath = join(specsDir, featureName);
      await mkdir(specPath, { recursive: true });
      const originalSpecJson = {
        feature_name: featureName,
        phase: 'tasks-generated',
      };
      await writeFile(join(specPath, 'spec.json'), JSON.stringify(originalSpecJson));

      (mockFileService.readSpecJson as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: originalSpecJson as SpecJson,
      });

      // Committed-clean status
      (mockWorktreeService.checkUncommittedSpecChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: {
          hasChanges: false,
          files: [],
          statusOutput: '',
        },
      });

      const worktreePath = join(worktreeSpecsDir, featureName);
      await mkdir(worktreePath, { recursive: true });
      const worktreeSpecPath = join(worktreePath, '.kiro', 'specs', featureName);
      await mkdir(worktreeSpecPath, { recursive: true });
      await writeFile(join(worktreeSpecPath, 'spec.json'), JSON.stringify(originalSpecJson));

      (mockWorktreeService.createWorktree as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: {
          path: `.kiro/worktrees/specs/${featureName}`,
          absolutePath: worktreePath,
          branch: `feature/${featureName}`,
          created_at: new Date().toISOString(),
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

      // Act
      await convertService.convertToWorktree(testDir, specPath, featureName);

      // Assert - updateSpecJson should only be called for worktree spec, not main spec
      expect(mockFileService.updateSpecJson).toHaveBeenCalledTimes(1);
      expect(mockFileService.updateSpecJson).toHaveBeenCalledWith(
        worktreeSpecPath,
        expect.objectContaining({
          worktree: expect.anything(),
        })
      );

      // Verify main spec.json is unchanged
      const mainContent = await readFile(join(specPath, 'spec.json'), 'utf-8');
      const mainSpecJson = JSON.parse(mainContent);
      expect(mainSpecJson.worktree).toBeUndefined();
    });
  });
});
