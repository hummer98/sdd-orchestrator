/**
 * Project Router tests
 * Task 4.1: projectルーターとZodスキーマを実装する
 * Task 4.4: 統合テスト追加（レガシーprojectHandlers.tsのエッジケース引き継ぎ）
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.6
 *
 * Verifies: projectRouter, fileService, specManagerService
 * Verifies: Grep "projectRouter" in router.ts (Task 4.1 _Verify)
 *
 * Tests cover:
 * - All 9 procedures (selectProject, showOpenDialog, validateKiroDirectory,
 *   getInitialProjectPath, setProjectPath, getWindowProject, setWindowProject,
 *   createNewWindow, getIsE2ETest)
 * - Zod schema validation (valid/invalid inputs)
 * - ctx.services DI pattern
 * - Exclusive control for project selection
 * - Error propagation
 * - Edge cases from legacy projectHandlers.ts (Task 4.4)
 */
import { describe, it, expect, vi } from 'vitest';
import { createTestCaller, createMockServices } from '../helpers/test-helpers';

describe('Project Router (project.ts)', () => {
  // ============================================================
  // selectProject (mutation)
  // Legacy: SELECT_PROJECT (projectHandlers.ts + handlers.ts)
  // ============================================================

  describe('selectProject', () => {
    it('should call selectProject service with the given path', async () => {
      const mockSelectProject = vi.fn().mockResolvedValue({
        success: true,
        projectPath: '/test/project',
        kiroValidation: { exists: true, hasSpecs: true, hasSteering: true },
        specs: [],
        bugs: [],
        specJsonMap: {},
      });
      const caller = createTestCaller({
        selectProject: mockSelectProject,
      });

      const result = await caller.project.selectProject({ projectPath: '/test/project' });
      expect(result.success).toBe(true);
      expect(result.projectPath).toBe('/test/project');
      expect(mockSelectProject).toHaveBeenCalledWith('/test/project');
    });

    it('should return error result when project selection fails', async () => {
      const mockSelectProject = vi.fn().mockResolvedValue({
        success: false,
        projectPath: '/bad/path',
        kiroValidation: { exists: false, hasSpecs: false, hasSteering: false },
        specs: [],
        bugs: [],
        specJsonMap: {},
        error: { type: 'PATH_NOT_EXISTS', path: '/bad/path' },
      });
      const caller = createTestCaller({
        selectProject: mockSelectProject,
      });

      const result = await caller.project.selectProject({ projectPath: '/bad/path' });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error when selection is already in progress', async () => {
      const mockSelectProject = vi.fn().mockResolvedValue({
        success: false,
        projectPath: '/test/project',
        kiroValidation: { exists: false, hasSpecs: false, hasSteering: false },
        specs: [],
        bugs: [],
        specJsonMap: {},
        error: { type: 'SELECTION_IN_PROGRESS' },
      });
      const caller = createTestCaller({
        selectProject: mockSelectProject,
      });

      const result = await caller.project.selectProject({ projectPath: '/test/project' });
      expect(result.success).toBe(false);
    });

    it('should reject empty projectPath via Zod validation', async () => {
      const caller = createTestCaller();
      await expect(
        caller.project.selectProject({ projectPath: '' }),
      ).rejects.toThrow();
    });

    it('should include specJsonMap in successful result', async () => {
      const mockSelectProject = vi.fn().mockResolvedValue({
        success: true,
        projectPath: '/test/project',
        kiroValidation: { exists: true, hasSpecs: true, hasSteering: true },
        specs: [{ name: 'my-feature' }],
        bugs: [],
        specJsonMap: {
          'my-feature': {
            feature_name: 'my-feature',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
            language: 'ja',
            phase: 'spec-init',
            approvals: {
              requirements: { generated: false, approved: false },
              design: { generated: false, approved: false },
              tasks: { generated: false, approved: false },
            },
          },
        },
      });
      const caller = createTestCaller({
        selectProject: mockSelectProject,
      });

      const result = await caller.project.selectProject({ projectPath: '/test/project' });
      expect(result.specJsonMap).toHaveProperty('my-feature');
    });
  });

  // ============================================================
  // showOpenDialog (mutation)
  // Legacy: SHOW_OPEN_DIALOG (fileHandlers.ts)
  // ============================================================

  describe('showOpenDialog', () => {
    it('should return selected directory path', async () => {
      const mockShowOpenDialog = vi.fn().mockResolvedValue('/selected/path');
      const caller = createTestCaller({
        showOpenDialog: mockShowOpenDialog,
      });

      const result = await caller.project.showOpenDialog();
      expect(result).toBe('/selected/path');
      expect(mockShowOpenDialog).toHaveBeenCalledOnce();
    });

    it('should return null when dialog is canceled', async () => {
      const mockShowOpenDialog = vi.fn().mockResolvedValue(null);
      const caller = createTestCaller({
        showOpenDialog: mockShowOpenDialog,
      });

      const result = await caller.project.showOpenDialog();
      expect(result).toBeNull();
    });
  });

  // ============================================================
  // validateKiroDirectory (query)
  // Legacy: VALIDATE_KIRO_DIRECTORY (projectHandlers.ts)
  // ============================================================

  describe('validateKiroDirectory', () => {
    it('should return validation result from fileService', async () => {
      const mockFileService = {
        validateKiroDirectory: vi.fn().mockResolvedValue({
          exists: true,
          hasSpecs: true,
          hasSteering: true,
        }),
      } as any;
      const caller = createTestCaller({
        fileService: mockFileService,
      });

      const result = await caller.project.validateKiroDirectory({ path: '/test/project' });
      expect(result.exists).toBe(true);
      expect(result.hasSpecs).toBe(true);
      expect(result.hasSteering).toBe(true);
      expect(mockFileService.validateKiroDirectory).toHaveBeenCalledWith('/test/project');
    });

    it('should return false fields when .kiro does not exist', async () => {
      const mockFileService = {
        validateKiroDirectory: vi.fn().mockResolvedValue({
          exists: false,
          hasSpecs: false,
          hasSteering: false,
        }),
      } as any;
      const caller = createTestCaller({
        fileService: mockFileService,
      });

      const result = await caller.project.validateKiroDirectory({ path: '/no-kiro' });
      expect(result.exists).toBe(false);
    });

    it('should reject empty path via Zod validation', async () => {
      const caller = createTestCaller();
      await expect(
        caller.project.validateKiroDirectory({ path: '' }),
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // getInitialProjectPath (query)
  // Legacy: GET_INITIAL_PROJECT_PATH (projectHandlers.ts)
  // ============================================================

  describe('getInitialProjectPath', () => {
    it('should return initial project path from context', async () => {
      const caller = createTestCaller({
        getInitialProjectPath: vi.fn().mockReturnValue('/initial/project'),
      });

      const result = await caller.project.getInitialProjectPath();
      expect(result).toBe('/initial/project');
    });

    it('should return null when no initial project path is set', async () => {
      const caller = createTestCaller({
        getInitialProjectPath: vi.fn().mockReturnValue(null),
      });

      const result = await caller.project.getInitialProjectPath();
      expect(result).toBeNull();
    });
  });

  // ============================================================
  // setProjectPath (mutation)
  // Legacy: SET_PROJECT_PATH (projectHandlers.ts)
  // ============================================================

  describe('setProjectPath', () => {
    it('should call setProjectPath service with the given path', async () => {
      const mockSetProjectPath = vi.fn().mockResolvedValue(undefined);
      const caller = createTestCaller({
        setProjectPath: mockSetProjectPath,
      });

      await caller.project.setProjectPath({ projectPath: '/new/project' });
      expect(mockSetProjectPath).toHaveBeenCalledWith('/new/project');
    });

    it('should reject empty projectPath via Zod validation', async () => {
      const caller = createTestCaller();
      await expect(
        caller.project.setProjectPath({ projectPath: '' }),
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // getWindowProject (query)
  // Legacy: GET_WINDOW_PROJECT (channels.ts defined, not yet implemented)
  // ============================================================

  describe('getWindowProject', () => {
    it('should return current project path for the window', async () => {
      const caller = createTestCaller({
        getCurrentProjectPath: vi.fn().mockReturnValue('/window/project'),
      });

      const result = await caller.project.getWindowProject();
      expect(result).toBe('/window/project');
    });

    it('should return null when no project is selected', async () => {
      const caller = createTestCaller({
        getCurrentProjectPath: vi.fn().mockReturnValue(null),
      });

      const result = await caller.project.getWindowProject();
      expect(result).toBeNull();
    });
  });

  // ============================================================
  // setWindowProject (mutation)
  // Legacy: SET_WINDOW_PROJECT (channels.ts defined, not yet implemented)
  // ============================================================

  describe('setWindowProject', () => {
    it('should call setProjectPath with the given path', async () => {
      const mockSetProjectPath = vi.fn().mockResolvedValue(undefined);
      const caller = createTestCaller({
        setProjectPath: mockSetProjectPath,
      });

      await caller.project.setWindowProject({ projectPath: '/window/project' });
      expect(mockSetProjectPath).toHaveBeenCalledWith('/window/project');
    });

    it('should reject empty projectPath via Zod validation', async () => {
      const caller = createTestCaller();
      await expect(
        caller.project.setWindowProject({ projectPath: '' }),
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // createNewWindow (mutation)
  // Legacy: CREATE_NEW_WINDOW (channels.ts defined, not yet implemented)
  // ============================================================

  describe('createNewWindow', () => {
    it('should call createNewWindow service', async () => {
      const mockCreateNewWindow = vi.fn().mockResolvedValue(undefined);
      const caller = createTestCaller({
        createNewWindow: mockCreateNewWindow,
      });

      await caller.project.createNewWindow();
      expect(mockCreateNewWindow).toHaveBeenCalledOnce();
    });
  });

  // ============================================================
  // getIsE2ETest (query)
  // Legacy: GET_IS_E2E_TEST (projectHandlers.ts)
  // ============================================================

  describe('getIsE2ETest', () => {
    it('should return E2E test flag from context', async () => {
      const caller = createTestCaller({
        getIsE2ETest: vi.fn().mockReturnValue(true),
      });

      const result = await caller.project.getIsE2ETest();
      expect(result).toBe(true);
    });

    it('should return false when not in E2E test mode', async () => {
      const caller = createTestCaller({
        getIsE2ETest: vi.fn().mockReturnValue(false),
      });

      const result = await caller.project.getIsE2ETest();
      expect(result).toBe(false);
    });
  });

  // ============================================================
  // Task 4.4: レガシーprojectHandlers.tsからのエッジケース引き継ぎ
  // Legacy: projectHandlers.test.ts validateProjectPath, selection lock
  // ============================================================

  describe('Task 4.4 Edge Cases: selectProject error types', () => {
    it('should handle PATH_NOT_EXISTS error type', async () => {
      const mockSelectProject = vi.fn().mockResolvedValue({
        success: false,
        projectPath: '/nonexistent/path',
        kiroValidation: { exists: false, hasSpecs: false, hasSteering: false },
        specs: [],
        bugs: [],
        specJsonMap: {},
        error: { type: 'PATH_NOT_EXISTS', path: '/nonexistent/path' },
      });
      const caller = createTestCaller({
        selectProject: mockSelectProject,
      });

      const result = await caller.project.selectProject({ projectPath: '/nonexistent/path' });
      expect(result.success).toBe(false);
      expect(result.error).toEqual({ type: 'PATH_NOT_EXISTS', path: '/nonexistent/path' });
    });

    it('should handle NOT_A_DIRECTORY error type', async () => {
      const mockSelectProject = vi.fn().mockResolvedValue({
        success: false,
        projectPath: '/file/path',
        kiroValidation: { exists: false, hasSpecs: false, hasSteering: false },
        specs: [],
        bugs: [],
        specJsonMap: {},
        error: { type: 'NOT_A_DIRECTORY', path: '/file/path' },
      });
      const caller = createTestCaller({
        selectProject: mockSelectProject,
      });

      const result = await caller.project.selectProject({ projectPath: '/file/path' });
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('NOT_A_DIRECTORY');
    });

    it('should handle PERMISSION_DENIED error type', async () => {
      const mockSelectProject = vi.fn().mockResolvedValue({
        success: false,
        projectPath: '/restricted/path',
        kiroValidation: { exists: false, hasSpecs: false, hasSteering: false },
        specs: [],
        bugs: [],
        specJsonMap: {},
        error: { type: 'PERMISSION_DENIED', path: '/restricted/path' },
      });
      const caller = createTestCaller({
        selectProject: mockSelectProject,
      });

      const result = await caller.project.selectProject({ projectPath: '/restricted/path' });
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('PERMISSION_DENIED');
    });

    it('should handle INTERNAL_ERROR from service', async () => {
      const mockSelectProject = vi.fn().mockResolvedValue({
        success: false,
        projectPath: '/test/project',
        kiroValidation: { exists: false, hasSpecs: false, hasSteering: false },
        specs: [],
        bugs: [],
        specJsonMap: {},
        error: { type: 'INTERNAL_ERROR', message: 'Unexpected error occurred' },
      });
      const caller = createTestCaller({
        selectProject: mockSelectProject,
      });

      const result = await caller.project.selectProject({ projectPath: '/test/project' });
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('INTERNAL_ERROR');
    });
  });

  describe('Task 4.4 Edge Cases: validateKiroDirectory field combinations', () => {
    it('should return exists=true with hasSpecs=false and hasSteering=false', async () => {
      const mockFileService = {
        validateKiroDirectory: vi.fn().mockResolvedValue({
          exists: true,
          hasSpecs: false,
          hasSteering: false,
        }),
      } as any;
      const caller = createTestCaller({
        fileService: mockFileService,
      });

      const result = await caller.project.validateKiroDirectory({ path: '/empty-kiro' });
      expect(result.exists).toBe(true);
      expect(result.hasSpecs).toBe(false);
      expect(result.hasSteering).toBe(false);
    });

    it('should return exists=true with hasSpecs=true and hasSteering=false', async () => {
      const mockFileService = {
        validateKiroDirectory: vi.fn().mockResolvedValue({
          exists: true,
          hasSpecs: true,
          hasSteering: false,
        }),
      } as any;
      const caller = createTestCaller({
        fileService: mockFileService,
      });

      const result = await caller.project.validateKiroDirectory({ path: '/specs-only' });
      expect(result.exists).toBe(true);
      expect(result.hasSpecs).toBe(true);
      expect(result.hasSteering).toBe(false);
    });
  });

  describe('Task 4.4 Edge Cases: service error propagation', () => {
    it('should propagate error when selectProject service throws', async () => {
      const mockSelectProject = vi.fn().mockRejectedValue(
        new Error('Service unavailable'),
      );
      const caller = createTestCaller({
        selectProject: mockSelectProject,
      });

      await expect(
        caller.project.selectProject({ projectPath: '/test/project' }),
      ).rejects.toThrow();
    });

    it('should propagate error when showOpenDialog service throws', async () => {
      const mockShowOpenDialog = vi.fn().mockRejectedValue(
        new Error('Dialog error'),
      );
      const caller = createTestCaller({
        showOpenDialog: mockShowOpenDialog,
      });

      await expect(caller.project.showOpenDialog()).rejects.toThrow();
    });

    it('should propagate error when setProjectPath service throws', async () => {
      const mockSetProjectPath = vi.fn().mockRejectedValue(
        new Error('IO error'),
      );
      const caller = createTestCaller({
        setProjectPath: mockSetProjectPath,
      });

      await expect(
        caller.project.setProjectPath({ projectPath: '/test/project' }),
      ).rejects.toThrow();
    });

    it('should propagate error when validateKiroDirectory service throws', async () => {
      const mockFileService = {
        validateKiroDirectory: vi.fn().mockRejectedValue(
          new Error('File system error'),
        ),
      } as any;
      const caller = createTestCaller({
        fileService: mockFileService,
      });

      await expect(
        caller.project.validateKiroDirectory({ path: '/test/project' }),
      ).rejects.toThrow();
    });
  });

  describe('Task 4.4 Edge Cases: selectProject with bugWarnings and specJsonMap', () => {
    it('should include bugWarnings in successful result when bugs have parse errors', async () => {
      const mockSelectProject = vi.fn().mockResolvedValue({
        success: true,
        projectPath: '/test/project',
        kiroValidation: { exists: true, hasSpecs: true, hasSteering: true },
        specs: [],
        bugs: [{ name: 'test-bug' }],
        specJsonMap: {},
        bugWarnings: ['Failed to parse bug.json for invalid-bug'],
      });
      const caller = createTestCaller({
        selectProject: mockSelectProject,
      });

      const result = await caller.project.selectProject({ projectPath: '/test/project' });
      expect(result.success).toBe(true);
      expect(result.bugWarnings).toContain('Failed to parse bug.json for invalid-bug');
    });

    it('should return multiple specs with their specJsonMap entries', async () => {
      const mockSelectProject = vi.fn().mockResolvedValue({
        success: true,
        projectPath: '/test/project',
        kiroValidation: { exists: true, hasSpecs: true, hasSteering: true },
        specs: [{ name: 'feature-a' }, { name: 'feature-b' }],
        bugs: [],
        specJsonMap: {
          'feature-a': {
            feature_name: 'feature-a',
            phase: 'tasks-generated',
            approvals: {
              requirements: { generated: true, approved: true },
              design: { generated: true, approved: true },
              tasks: { generated: true, approved: true },
            },
          },
          'feature-b': {
            feature_name: 'feature-b',
            phase: 'initialized',
            approvals: {
              requirements: { generated: false, approved: false },
              design: { generated: false, approved: false },
              tasks: { generated: false, approved: false },
            },
          },
        },
      });
      const caller = createTestCaller({
        selectProject: mockSelectProject,
      });

      const result = await caller.project.selectProject({ projectPath: '/test/project' });
      expect(result.success).toBe(true);
      expect(Object.keys(result.specJsonMap)).toHaveLength(2);
      expect(result.specJsonMap['feature-a'].phase).toBe('tasks-generated');
      expect(result.specJsonMap['feature-b'].phase).toBe('initialized');
    });
  });

  // ============================================================
  // Task 4.4: 統合テスト - 複数プロシージャの連携
  // ============================================================

  describe('Task 4.4 Integration: Multiple project procedures with shared context', () => {
    it('should execute multiple project procedures with the same caller', async () => {
      const mockFileService = {
        validateKiroDirectory: vi.fn().mockResolvedValue({
          exists: true,
          hasSpecs: true,
          hasSteering: true,
        }),
      } as any;
      const mockSelectProject = vi.fn().mockResolvedValue({
        success: true,
        projectPath: '/test/project',
        kiroValidation: { exists: true, hasSpecs: true, hasSteering: true },
        specs: [],
        bugs: [],
        specJsonMap: {},
      });
      const mockSetProjectPath = vi.fn().mockResolvedValue(undefined);
      const mockShowOpenDialog = vi.fn().mockResolvedValue('/selected/path');

      const caller = createTestCaller({
        fileService: mockFileService,
        selectProject: mockSelectProject,
        setProjectPath: mockSetProjectPath,
        showOpenDialog: mockShowOpenDialog,
        getCurrentProjectPath: vi.fn().mockReturnValue('/test/project'),
        getInitialProjectPath: vi.fn().mockReturnValue('/initial/project'),
        getIsE2ETest: vi.fn().mockReturnValue(false),
      });

      // 1. showOpenDialog
      const dialogResult = await caller.project.showOpenDialog();
      expect(dialogResult).toBe('/selected/path');

      // 2. selectProject
      const selectResult = await caller.project.selectProject({ projectPath: '/test/project' });
      expect(selectResult.success).toBe(true);

      // 3. validateKiroDirectory
      const validation = await caller.project.validateKiroDirectory({ path: '/test/project' });
      expect(validation.exists).toBe(true);

      // 4. getInitialProjectPath
      const initialPath = await caller.project.getInitialProjectPath();
      expect(initialPath).toBe('/initial/project');

      // 5. setProjectPath
      await caller.project.setProjectPath({ projectPath: '/new/project' });
      expect(mockSetProjectPath).toHaveBeenCalledWith('/new/project');

      // 6. getWindowProject
      const windowProject = await caller.project.getWindowProject();
      expect(windowProject).toBe('/test/project');

      // 7. getIsE2ETest
      const isE2E = await caller.project.getIsE2ETest();
      expect(isE2E).toBe(false);
    });
  });
});
