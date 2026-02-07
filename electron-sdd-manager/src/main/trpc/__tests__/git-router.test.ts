/**
 * Git Router tests
 * Task 8.1: gitルーターとZodスキーマを実装する
 * Requirements: 7.1, 7.2, 7.3
 * Method: gitRouter, worktreeService, gitService
 * Verify: Grep "gitRouter" in router.ts
 *
 * Tests all 13 procedures:
 * - getStatus (query): Get git status for a project
 * - getDiff (query): Get diff for a specific file
 * - watchChanges (mutation): Start watching for file changes
 * - unwatchChanges (mutation): Stop watching for file changes
 * - worktreeCheckMain (query): Check if on main/master branch
 * - worktreeCreate (mutation): Create a new worktree
 * - worktreeRemove (mutation): Remove a worktree
 * - worktreeResolvePath (query): Resolve worktree relative path
 * - worktreeImplStart (mutation): Start impl with worktree
 * - normalModeImplStart (mutation): Start impl in normal mode
 * - worktreeRebaseFromMain (mutation): Rebase worktree from main
 * - convertCheck (query): Check if spec can be converted to worktree
 * - convertToWorktree (mutation): Convert spec to worktree mode
 *
 * Legacy handlers: gitHandlers.ts, worktreeHandlers.ts, worktreeImplHandlers.ts
 * All services accessed via ctx.services for testability (DD-006).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestCaller, createMockServices } from '../helpers/test-helpers';
import type { ContextServices } from '../context';

describe('Git Router', () => {
  let mockServices: ContextServices;

  beforeEach(() => {
    mockServices = createMockServices();
  });

  // ============================================================
  // getStatus
  // ============================================================

  describe('getStatus', () => {
    it('should return git status for a project path', async () => {
      const mockResult = {
        success: true,
        data: {
          files: [{ path: 'src/index.ts', status: 'modified' }],
          mode: 'normal',
        },
      };
      mockServices.gitGetStatus = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.getStatus({ projectPath: '/test/project' });

      expect(result).toEqual(mockResult);
      expect(mockServices.gitGetStatus).toHaveBeenCalledWith('/test/project');
    });

    it('should throw when gitGetStatus is not initialized', async () => {
      mockServices.gitGetStatus = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.git.getStatus({ projectPath: '/test/project' }))
        .rejects.toThrow();
    });

    it('should validate input - empty projectPath should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.git.getStatus({ projectPath: '' }))
        .rejects.toThrow();
    });
  });

  // ============================================================
  // getDiff
  // ============================================================

  describe('getDiff', () => {
    it('should return diff for a specific file', async () => {
      const mockResult = {
        success: true,
        data: '--- a/src/index.ts\n+++ b/src/index.ts\n@@ -1 +1 @@\n-old\n+new',
      };
      mockServices.gitGetDiff = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.getDiff({ projectPath: '/test/project', filePath: 'src/index.ts' });

      expect(result).toEqual(mockResult);
      expect(mockServices.gitGetDiff).toHaveBeenCalledWith('/test/project', 'src/index.ts');
    });

    it('should throw when gitGetDiff is not initialized', async () => {
      mockServices.gitGetDiff = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.git.getDiff({ projectPath: '/test/project', filePath: 'src/index.ts' }))
        .rejects.toThrow();
    });

    it('should validate input - empty projectPath should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.git.getDiff({ projectPath: '', filePath: 'src/index.ts' }))
        .rejects.toThrow();
    });
  });

  // ============================================================
  // watchChanges
  // ============================================================

  describe('watchChanges', () => {
    it('should start watching for file changes', async () => {
      const mockResult = { success: true, data: undefined };
      mockServices.gitWatchChanges = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.watchChanges({ projectPath: '/test/project' });

      expect(result).toEqual(mockResult);
      expect(mockServices.gitWatchChanges).toHaveBeenCalledWith('/test/project');
    });

    it('should throw when gitWatchChanges is not initialized', async () => {
      mockServices.gitWatchChanges = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.git.watchChanges({ projectPath: '/test/project' }))
        .rejects.toThrow();
    });

    it('should validate input - empty projectPath should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.git.watchChanges({ projectPath: '' }))
        .rejects.toThrow();
    });
  });

  // ============================================================
  // unwatchChanges
  // ============================================================

  describe('unwatchChanges', () => {
    it('should stop watching for file changes', async () => {
      const mockResult = { success: true, data: undefined };
      mockServices.gitUnwatchChanges = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.unwatchChanges({ projectPath: '/test/project' });

      expect(result).toEqual(mockResult);
      expect(mockServices.gitUnwatchChanges).toHaveBeenCalledWith('/test/project');
    });

    it('should throw when gitUnwatchChanges is not initialized', async () => {
      mockServices.gitUnwatchChanges = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.git.unwatchChanges({ projectPath: '/test/project' }))
        .rejects.toThrow();
    });
  });

  // ============================================================
  // worktreeCheckMain
  // ============================================================

  describe('worktreeCheckMain', () => {
    it('should return isMain and currentBranch', async () => {
      const mockResult = { ok: true, value: { isMain: true, currentBranch: 'main' } };
      mockServices.worktreeCheckMain = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.worktreeCheckMain({ projectPath: '/test/project' });

      expect(result).toEqual(mockResult);
      expect(mockServices.worktreeCheckMain).toHaveBeenCalledWith('/test/project');
    });

    it('should return error when not on main branch', async () => {
      const mockResult = { ok: true, value: { isMain: false, currentBranch: 'feature/test' } };
      mockServices.worktreeCheckMain = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.worktreeCheckMain({ projectPath: '/test/project' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.isMain).toBe(false);
        expect(result.value.currentBranch).toBe('feature/test');
      }
    });

    it('should throw when worktreeCheckMain is not initialized', async () => {
      mockServices.worktreeCheckMain = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.git.worktreeCheckMain({ projectPath: '/test/project' }))
        .rejects.toThrow();
    });

    it('should validate input - empty projectPath should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.git.worktreeCheckMain({ projectPath: '' }))
        .rejects.toThrow();
    });
  });

  // ============================================================
  // worktreeCreate
  // ============================================================

  describe('worktreeCreate', () => {
    it('should create a worktree and return info', async () => {
      const mockResult = {
        ok: true,
        value: {
          path: '.kiro/worktrees/specs/my-feature',
          absolutePath: '/test/project/.kiro/worktrees/specs/my-feature',
          branch: 'feature/my-feature',
          created_at: '2026-02-06T12:00:00Z',
        },
      };
      mockServices.worktreeCreate = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.worktreeCreate({
        projectPath: '/test/project',
        featureName: 'my-feature',
      });

      expect(result).toEqual(mockResult);
      expect(mockServices.worktreeCreate).toHaveBeenCalledWith('/test/project', 'my-feature');
    });

    it('should return error when creation fails', async () => {
      const mockResult = {
        ok: false,
        error: { type: 'WORKTREE_CREATE_FAILED', message: 'Branch already exists' },
      };
      mockServices.worktreeCreate = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.worktreeCreate({
        projectPath: '/test/project',
        featureName: 'existing-feature',
      });

      expect(result.ok).toBe(false);
    });

    it('should throw when worktreeCreate is not initialized', async () => {
      mockServices.worktreeCreate = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.git.worktreeCreate({
        projectPath: '/test/project',
        featureName: 'my-feature',
      })).rejects.toThrow();
    });

    it('should validate input - empty featureName should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.git.worktreeCreate({
        projectPath: '/test/project',
        featureName: '',
      })).rejects.toThrow();
    });
  });

  // ============================================================
  // worktreeRemove
  // ============================================================

  describe('worktreeRemove', () => {
    it('should remove a worktree', async () => {
      const mockResult = { ok: true, value: undefined };
      mockServices.worktreeRemove = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.worktreeRemove({
        projectPath: '/test/project',
        featureName: 'my-feature',
      });

      expect(result).toEqual(mockResult);
      expect(mockServices.worktreeRemove).toHaveBeenCalledWith('/test/project', 'my-feature');
    });

    it('should throw when worktreeRemove is not initialized', async () => {
      mockServices.worktreeRemove = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.git.worktreeRemove({
        projectPath: '/test/project',
        featureName: 'my-feature',
      })).rejects.toThrow();
    });
  });

  // ============================================================
  // worktreeResolvePath
  // ============================================================

  describe('worktreeResolvePath', () => {
    it('should resolve a worktree relative path to absolute path', async () => {
      const mockResult = { ok: true, value: { absolutePath: '/test/project/.kiro/worktrees/specs/my-feature' } };
      mockServices.worktreeResolvePath = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.worktreeResolvePath({
        projectPath: '/test/project',
        relativePath: '.kiro/worktrees/specs/my-feature',
      });

      expect(result).toEqual(mockResult);
      expect(mockServices.worktreeResolvePath).toHaveBeenCalledWith(
        '/test/project',
        '.kiro/worktrees/specs/my-feature',
      );
    });

    it('should return error for invalid path', async () => {
      const mockResult = {
        ok: false,
        error: { type: 'PATH_VALIDATION_ERROR', path: '../escape', reason: 'Path escapes project root' },
      };
      mockServices.worktreeResolvePath = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.worktreeResolvePath({
        projectPath: '/test/project',
        relativePath: '../escape',
      });

      expect(result.ok).toBe(false);
    });

    it('should throw when worktreeResolvePath is not initialized', async () => {
      mockServices.worktreeResolvePath = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.git.worktreeResolvePath({
        projectPath: '/test/project',
        relativePath: '.kiro/worktrees/specs/test',
      })).rejects.toThrow();
    });
  });

  // ============================================================
  // worktreeImplStart
  // ============================================================

  describe('worktreeImplStart', () => {
    it('should start impl with worktree creation', async () => {
      const mockResult = {
        ok: true,
        value: {
          worktreePath: '/test/project/.kiro/worktrees/specs/my-feature',
          worktreeConfig: {
            path: '.kiro/worktrees/specs/my-feature',
            branch: 'feature/my-feature',
            created_at: '2026-02-06T12:00:00Z',
          },
        },
      };
      mockServices.worktreeImplStart = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.worktreeImplStart({
        projectPath: '/test/project',
        specPath: '/test/project/.kiro/specs/my-feature',
        featureName: 'my-feature',
      });

      expect(result).toEqual(mockResult);
      expect(mockServices.worktreeImplStart).toHaveBeenCalledWith(
        '/test/project',
        '/test/project/.kiro/specs/my-feature',
        'my-feature',
      );
    });

    it('should return error when not on main branch', async () => {
      const mockResult = {
        ok: false,
        error: { type: 'NOT_ON_MAIN_BRANCH', currentBranch: 'feature/other' },
      };
      mockServices.worktreeImplStart = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.worktreeImplStart({
        projectPath: '/test/project',
        specPath: '/test/project/.kiro/specs/my-feature',
        featureName: 'my-feature',
      });

      expect(result.ok).toBe(false);
    });

    it('should throw when worktreeImplStart is not initialized', async () => {
      mockServices.worktreeImplStart = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.git.worktreeImplStart({
        projectPath: '/test/project',
        specPath: '/test/project/.kiro/specs/my-feature',
        featureName: 'my-feature',
      })).rejects.toThrow();
    });

    it('should validate input - empty featureName should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.git.worktreeImplStart({
        projectPath: '/test/project',
        specPath: '/test/project/.kiro/specs/my-feature',
        featureName: '',
      })).rejects.toThrow();
    });
  });

  // ============================================================
  // normalModeImplStart
  // ============================================================

  describe('normalModeImplStart', () => {
    it('should start impl in normal mode (without worktree)', async () => {
      const mockResult = {
        ok: true,
        value: { branch: 'main' },
      };
      mockServices.normalModeImplStart = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.normalModeImplStart({
        projectPath: '/test/project',
        specPath: '/test/project/.kiro/specs/my-feature',
      });

      expect(result).toEqual(mockResult);
      expect(mockServices.normalModeImplStart).toHaveBeenCalledWith(
        '/test/project',
        '/test/project/.kiro/specs/my-feature',
      );
    });

    it('should throw when normalModeImplStart is not initialized', async () => {
      mockServices.normalModeImplStart = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.git.normalModeImplStart({
        projectPath: '/test/project',
        specPath: '/test/project/.kiro/specs/my-feature',
      })).rejects.toThrow();
    });
  });

  // ============================================================
  // worktreeRebaseFromMain
  // ============================================================

  describe('worktreeRebaseFromMain', () => {
    it('should rebase worktree from main using current project path', async () => {
      const mockResult = { ok: true, value: { success: true, alreadyUpToDate: false } };
      mockServices.worktreeRebaseFromMain = vi.fn().mockResolvedValue(mockResult);
      mockServices.getCurrentProjectPath = vi.fn().mockReturnValue('/test/project');

      const caller = createTestCaller(mockServices);
      const result = await caller.git.worktreeRebaseFromMain({
        specOrBugPath: '.kiro/specs/my-feature',
      });

      expect(result).toEqual(mockResult);
      expect(mockServices.worktreeRebaseFromMain).toHaveBeenCalledWith(
        '/test/project',
        '.kiro/specs/my-feature',
      );
    });

    it('should return already up to date', async () => {
      const mockResult = { ok: true, value: { success: true, alreadyUpToDate: true } };
      mockServices.worktreeRebaseFromMain = vi.fn().mockResolvedValue(mockResult);
      mockServices.getCurrentProjectPath = vi.fn().mockReturnValue('/test/project');

      const caller = createTestCaller(mockServices);
      const result = await caller.git.worktreeRebaseFromMain({
        specOrBugPath: '.kiro/specs/my-feature',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.alreadyUpToDate).toBe(true);
      }
    });

    it('should throw when no project is selected', async () => {
      mockServices.getCurrentProjectPath = vi.fn().mockReturnValue(null);

      const caller = createTestCaller(mockServices);
      await expect(caller.git.worktreeRebaseFromMain({
        specOrBugPath: '.kiro/specs/my-feature',
      })).rejects.toThrow();
    });

    it('should throw when worktreeRebaseFromMain is not initialized', async () => {
      mockServices.worktreeRebaseFromMain = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.git.worktreeRebaseFromMain({
        specOrBugPath: '.kiro/specs/my-feature',
      })).rejects.toThrow();
    });
  });

  // ============================================================
  // convertCheck
  // ============================================================

  describe('convertCheck', () => {
    it('should return true when spec can be converted', async () => {
      const mockResult = { ok: true, value: true };
      mockServices.convertCheck = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.convertCheck({
        projectPath: '/test/project',
        specPath: '/test/project/.kiro/specs/my-feature',
      });

      expect(result).toEqual(mockResult);
      expect(mockServices.convertCheck).toHaveBeenCalledWith(
        '/test/project',
        '/test/project/.kiro/specs/my-feature',
      );
    });

    it('should return error when spec cannot be converted', async () => {
      const mockResult = {
        ok: false,
        error: { type: 'NOT_ON_MAIN_BRANCH', currentBranch: 'feature/other' },
      };
      mockServices.convertCheck = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.convertCheck({
        projectPath: '/test/project',
        specPath: '/test/project/.kiro/specs/my-feature',
      });

      expect(result.ok).toBe(false);
    });

    it('should throw when convertCheck is not initialized', async () => {
      mockServices.convertCheck = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.git.convertCheck({
        projectPath: '/test/project',
        specPath: '/test/project/.kiro/specs/my-feature',
      })).rejects.toThrow();
    });
  });

  // ============================================================
  // convertToWorktree
  // ============================================================

  describe('convertToWorktree', () => {
    it('should convert a spec to worktree mode', async () => {
      const mockResult = {
        ok: true,
        value: {
          path: '.kiro/worktrees/specs/my-feature',
          absolutePath: '/test/project/.kiro/worktrees/specs/my-feature',
          branch: 'feature/my-feature',
          created_at: '2026-02-06T12:00:00Z',
        },
      };
      mockServices.convertToWorktree = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.convertToWorktree({
        projectPath: '/test/project',
        specPath: '/test/project/.kiro/specs/my-feature',
        featureName: 'my-feature',
      });

      expect(result).toEqual(mockResult);
      expect(mockServices.convertToWorktree).toHaveBeenCalledWith(
        '/test/project',
        '/test/project/.kiro/specs/my-feature',
        'my-feature',
      );
    });

    it('should return error when conversion fails', async () => {
      const mockResult = {
        ok: false,
        error: { type: 'ALREADY_WORKTREE_MODE', specPath: '/test/project/.kiro/specs/my-feature' },
      };
      mockServices.convertToWorktree = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.convertToWorktree({
        projectPath: '/test/project',
        specPath: '/test/project/.kiro/specs/my-feature',
        featureName: 'my-feature',
      });

      expect(result.ok).toBe(false);
    });

    it('should throw when convertToWorktree is not initialized', async () => {
      mockServices.convertToWorktree = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.git.convertToWorktree({
        projectPath: '/test/project',
        specPath: '/test/project/.kiro/specs/my-feature',
        featureName: 'my-feature',
      })).rejects.toThrow();
    });

    it('should validate input - empty featureName should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.git.convertToWorktree({
        projectPath: '/test/project',
        specPath: '/test/project/.kiro/specs/my-feature',
        featureName: '',
      })).rejects.toThrow();
    });
  });

  // ============================================================
  // Router registration
  // ============================================================

  describe('router registration', () => {
    it('should have git namespace accessible from appRouter', async () => {
      const caller = createTestCaller(mockServices);
      expect(caller.git).toBeDefined();
    });

    it('should have all 13 procedures defined', async () => {
      const caller = createTestCaller(mockServices);
      expect(typeof caller.git.getStatus).toBe('function');
      expect(typeof caller.git.getDiff).toBe('function');
      expect(typeof caller.git.watchChanges).toBe('function');
      expect(typeof caller.git.unwatchChanges).toBe('function');
      expect(typeof caller.git.worktreeCheckMain).toBe('function');
      expect(typeof caller.git.worktreeCreate).toBe('function');
      expect(typeof caller.git.worktreeRemove).toBe('function');
      expect(typeof caller.git.worktreeResolvePath).toBe('function');
      expect(typeof caller.git.worktreeImplStart).toBe('function');
      expect(typeof caller.git.normalModeImplStart).toBe('function');
      expect(typeof caller.git.worktreeRebaseFromMain).toBe('function');
      expect(typeof caller.git.convertCheck).toBe('function');
      expect(typeof caller.git.convertToWorktree).toBe('function');
    });
  });

  // ============================================================
  // Zod schema validation
  // ============================================================

  describe('Zod schema validation', () => {
    it('should export getStatusInputSchema with required projectPath', async () => {
      const { getStatusInputSchema } = await import('../routers/git');
      expect(getStatusInputSchema).toBeDefined();

      expect(getStatusInputSchema.safeParse({ projectPath: '/test' }).success).toBe(true);
      expect(getStatusInputSchema.safeParse({ projectPath: '' }).success).toBe(false);
    });

    it('should export getDiffInputSchema with required projectPath and filePath', async () => {
      const { getDiffInputSchema } = await import('../routers/git');
      expect(getDiffInputSchema).toBeDefined();

      expect(getDiffInputSchema.safeParse({
        projectPath: '/test',
        filePath: 'src/index.ts',
      }).success).toBe(true);

      // Empty filePath is allowed (for full diff)
      expect(getDiffInputSchema.safeParse({
        projectPath: '/test',
        filePath: '',
      }).success).toBe(true);

      expect(getDiffInputSchema.safeParse({ projectPath: '' }).success).toBe(false);
    });

    it('should export worktreeCreateInputSchema', async () => {
      const { worktreeCreateInputSchema } = await import('../routers/git');
      expect(worktreeCreateInputSchema).toBeDefined();

      expect(worktreeCreateInputSchema.safeParse({
        projectPath: '/test',
        featureName: 'my-feature',
      }).success).toBe(true);

      expect(worktreeCreateInputSchema.safeParse({
        projectPath: '/test',
        featureName: '',
      }).success).toBe(false);
    });

    it('should export worktreeResolvePathInputSchema', async () => {
      const { worktreeResolvePathInputSchema } = await import('../routers/git');
      expect(worktreeResolvePathInputSchema).toBeDefined();

      expect(worktreeResolvePathInputSchema.safeParse({
        projectPath: '/test',
        relativePath: '.kiro/worktrees/specs/test',
      }).success).toBe(true);
    });

    it('should export worktreeImplStartInputSchema', async () => {
      const { worktreeImplStartInputSchema } = await import('../routers/git');
      expect(worktreeImplStartInputSchema).toBeDefined();

      expect(worktreeImplStartInputSchema.safeParse({
        projectPath: '/test',
        specPath: '/test/.kiro/specs/my-feature',
        featureName: 'my-feature',
      }).success).toBe(true);

      expect(worktreeImplStartInputSchema.safeParse({
        projectPath: '/test',
        specPath: '/test/.kiro/specs/my-feature',
        featureName: '',
      }).success).toBe(false);
    });

    it('should export normalModeImplStartInputSchema', async () => {
      const { normalModeImplStartInputSchema } = await import('../routers/git');
      expect(normalModeImplStartInputSchema).toBeDefined();

      expect(normalModeImplStartInputSchema.safeParse({
        projectPath: '/test',
        specPath: '/test/.kiro/specs/my-feature',
      }).success).toBe(true);
    });

    it('should export worktreeRebaseInputSchema', async () => {
      const { worktreeRebaseInputSchema } = await import('../routers/git');
      expect(worktreeRebaseInputSchema).toBeDefined();

      expect(worktreeRebaseInputSchema.safeParse({
        specOrBugPath: '.kiro/specs/my-feature',
      }).success).toBe(true);

      expect(worktreeRebaseInputSchema.safeParse({
        specOrBugPath: '',
      }).success).toBe(false);
    });

    it('should export convertCheckInputSchema', async () => {
      const { convertCheckInputSchema } = await import('../routers/git');
      expect(convertCheckInputSchema).toBeDefined();

      expect(convertCheckInputSchema.safeParse({
        projectPath: '/test',
        specPath: '/test/.kiro/specs/my-feature',
      }).success).toBe(true);
    });

    it('should export convertToWorktreeInputSchema', async () => {
      const { convertToWorktreeInputSchema } = await import('../routers/git');
      expect(convertToWorktreeInputSchema).toBeDefined();

      expect(convertToWorktreeInputSchema.safeParse({
        projectPath: '/test',
        specPath: '/test/.kiro/specs/my-feature',
        featureName: 'my-feature',
      }).success).toBe(true);

      expect(convertToWorktreeInputSchema.safeParse({
        projectPath: '/test',
        specPath: '/test/.kiro/specs/my-feature',
        featureName: '',
      }).success).toBe(false);
    });
  });

  // ============================================================
  // Edge cases inherited from legacy handlers
  // Task 8.3: gitHandlers.ts, worktreeHandlers.ts, worktreeImplHandlers.ts
  // の知識を引き継ぐ統合テスト
  // ============================================================

  describe('edge cases (legacy handler knowledge)', () => {
    it('getStatus: should propagate service error result', async () => {
      const mockResult = {
        success: false,
        error: { type: 'system_error', message: 'git not found' },
      };
      mockServices.gitGetStatus = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.getStatus({ projectPath: '/test/project' });

      expect(result.success).toBe(false);
    });

    it('worktreeRebaseFromMain: uses getCurrentProjectPath from context', async () => {
      const mockRebase = vi.fn().mockResolvedValue({ ok: true, value: { success: true } });
      const mockGetPath = vi.fn().mockReturnValue('/custom/project');
      mockServices.worktreeRebaseFromMain = mockRebase;
      mockServices.getCurrentProjectPath = mockGetPath;

      const caller = createTestCaller(mockServices);
      await caller.git.worktreeRebaseFromMain({
        specOrBugPath: '.kiro/specs/test',
      });

      expect(mockGetPath).toHaveBeenCalled();
      expect(mockRebase).toHaveBeenCalledWith('/custom/project', '.kiro/specs/test');
    });

    it('getDiff: should handle empty diff result', async () => {
      const mockResult = { success: true, data: '' };
      mockServices.gitGetDiff = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.getDiff({ projectPath: '/test/project', filePath: 'unchanged.ts' });

      expect(result.success).toBe(true);
      expect(result.data).toBe('');
    });

    // --- Legacy gitHandlers.ts edge cases ---

    it('getStatus: should return status with multiple file entries', async () => {
      const mockResult = {
        success: true,
        data: {
          files: [
            { path: 'src/index.ts', status: 'modified' },
            { path: 'README.md', status: 'added' },
            { path: 'old.txt', status: 'deleted' },
          ],
          mode: 'worktree',
        },
      };
      mockServices.gitGetStatus = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.getStatus({ projectPath: '/test/project' });

      expect(result.success).toBe(true);
      expect(result.data.files).toHaveLength(3);
      expect(result.data.mode).toBe('worktree');
    });

    it('watchChanges: should return error result from service', async () => {
      const mockResult = {
        success: false,
        error: { type: 'system_error', message: 'Failed to start watching' },
      };
      mockServices.gitWatchChanges = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.watchChanges({ projectPath: '/test/project' });

      expect(result.success).toBe(false);
    });

    it('unwatchChanges: should return error result from service', async () => {
      const mockResult = {
        success: false,
        error: { type: 'system_error', message: 'Failed to stop watching' },
      };
      mockServices.gitUnwatchChanges = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.unwatchChanges({ projectPath: '/test/project' });

      expect(result.success).toBe(false);
    });

    // --- Legacy worktreeHandlers.ts edge cases ---

    it('worktreeCheckMain: should handle GIT_ERROR from service', async () => {
      const mockResult = {
        ok: false,
        error: { type: 'GIT_ERROR', message: 'not a git repository' },
      };
      mockServices.worktreeCheckMain = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.worktreeCheckMain({ projectPath: '/test/project' });

      expect(result.ok).toBe(false);
    });

    it('worktreeCreate: should handle WORKTREE_EXISTS error', async () => {
      const mockResult = {
        ok: false,
        error: { type: 'WORKTREE_EXISTS', path: '/path/to/worktree' },
      };
      mockServices.worktreeCreate = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.worktreeCreate({
        projectPath: '/test/project',
        featureName: 'existing-feature',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('WORKTREE_EXISTS');
      }
    });

    it('worktreeCreate: should handle BRANCH_EXISTS error', async () => {
      const mockResult = {
        ok: false,
        error: { type: 'BRANCH_EXISTS', branch: 'feature/existing' },
      };
      mockServices.worktreeCreate = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.worktreeCreate({
        projectPath: '/test/project',
        featureName: 'existing-feature',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('BRANCH_EXISTS');
      }
    });

    it('worktreeRemove: should return GIT_ERROR on failure', async () => {
      const mockResult = {
        ok: false,
        error: { type: 'GIT_ERROR', message: 'worktree not found' },
      };
      mockServices.worktreeRemove = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.worktreeRemove({
        projectPath: '/test/project',
        featureName: 'nonexistent',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('GIT_ERROR');
      }
    });

    it('worktreeResolvePath: should return PATH_VALIDATION_ERROR for invalid path', async () => {
      const mockResult = {
        ok: false,
        error: { type: 'PATH_VALIDATION_ERROR', path: '../../../etc/passwd', reason: 'Path validation failed' },
      };
      mockServices.worktreeResolvePath = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.worktreeResolvePath({
        projectPath: '/test/project',
        relativePath: '../../../etc/passwd',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('PATH_VALIDATION_ERROR');
      }
    });

    // --- Legacy worktreeImplHandlers.ts edge cases ---

    it('worktreeImplStart: should return SPEC_JSON_ERROR when spec.json update fails', async () => {
      const mockResult = {
        ok: false,
        error: { type: 'SPEC_JSON_ERROR', message: 'File not found' },
      };
      mockServices.worktreeImplStart = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.worktreeImplStart({
        projectPath: '/test/project',
        specPath: '/test/project/.kiro/specs/my-feature',
        featureName: 'my-feature',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('SPEC_JSON_ERROR');
      }
    });

    it('normalModeImplStart: should return SPEC_JSON_ERROR when spec.json update fails', async () => {
      const mockResult = {
        ok: false,
        error: { type: 'SPEC_JSON_ERROR', message: 'Permission denied' },
      };
      mockServices.normalModeImplStart = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.normalModeImplStart({
        projectPath: '/test/project',
        specPath: '/test/project/.kiro/specs/my-feature',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('SPEC_JSON_ERROR');
      }
    });

    it('worktreeRebaseFromMain: should return error result from service', async () => {
      const mockResult = {
        ok: false,
        error: { type: 'REBASE_CONFLICT', message: 'Conflicts detected during rebase' },
      };
      mockServices.worktreeRebaseFromMain = vi.fn().mockResolvedValue(mockResult);
      mockServices.getCurrentProjectPath = vi.fn().mockReturnValue('/test/project');

      const caller = createTestCaller(mockServices);
      const result = await caller.git.worktreeRebaseFromMain({
        specOrBugPath: '.kiro/specs/my-feature',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('REBASE_CONFLICT');
      }
    });

    it('convertToWorktree: should return ALREADY_WORKTREE_MODE error', async () => {
      const mockResult = {
        ok: false,
        error: { type: 'ALREADY_WORKTREE_MODE', specPath: '/test/project/.kiro/specs/existing' },
      };
      mockServices.convertToWorktree = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.convertToWorktree({
        projectPath: '/test/project',
        specPath: '/test/project/.kiro/specs/existing',
        featureName: 'existing',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('ALREADY_WORKTREE_MODE');
      }
    });

    it('convertCheck: should return NOT_ON_MAIN_BRANCH error', async () => {
      const mockResult = {
        ok: false,
        error: { type: 'NOT_ON_MAIN_BRANCH', currentBranch: 'feature/test' },
      };
      mockServices.convertCheck = vi.fn().mockResolvedValue(mockResult);

      const caller = createTestCaller(mockServices);
      const result = await caller.git.convertCheck({
        projectPath: '/test/project',
        specPath: '/test/project/.kiro/specs/my-feature',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_ON_MAIN_BRANCH');
      }
    });
  });
});
