/**
 * Config Router tests
 * Task 3.1: configルーターに全22プロシージャを定義する
 * Task 3.3: レガシーハンドラ削除に伴う統合テスト（エッジケース追加）
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 *
 * Verifies: configRouter, configStore, layoutConfigService
 * Verifies: Grep "configRouter" in router.ts (Task 3.1 _Verify)
 *
 * Tests cover:
 * - All 22 procedures (RecentProjects, HangThreshold, LayoutConfig,
 *   SkipPermissions, ProjectDefaults, Profile, EngineConfig, ToolPath,
 *   VcsScheme, RemoteUiAutoStart)
 * - Zod schema validation (valid/invalid inputs)
 * - ctx.services DI pattern
 * - Error propagation
 * - Edge cases inherited from legacy handler tests (Task 3.3)
 */
import { describe, it, expect, vi } from 'vitest';
import { createTestCaller } from '../helpers/test-helpers';

describe('Config Router (config.ts)', () => {
  // ============================================================
  // RecentProjects procedures (2 procedures)
  // Legacy: GET_RECENT_PROJECTS, ADD_RECENT_PROJECT (projectHandlers.ts)
  // ============================================================

  describe('getRecentProjects', () => {
    it('should return recent projects from configStore', async () => {
      const mockConfigStore = {
        getRecentProjects: vi.fn().mockReturnValue(['/project1', '/project2']),
        addRecentProject: vi.fn(),
        removeRecentProject: vi.fn(),
        getHangThreshold: vi.fn().mockReturnValue(30000),
        setHangThreshold: vi.fn(),
      };
      const caller = createTestCaller({ configStore: mockConfigStore });

      const result = await caller.config.getRecentProjects();
      expect(result).toEqual(['/project1', '/project2']);
      expect(mockConfigStore.getRecentProjects).toHaveBeenCalledOnce();
    });

    it('should return empty array when no recent projects', async () => {
      const mockConfigStore = {
        getRecentProjects: vi.fn().mockReturnValue([]),
        addRecentProject: vi.fn(),
        removeRecentProject: vi.fn(),
        getHangThreshold: vi.fn().mockReturnValue(30000),
        setHangThreshold: vi.fn(),
      };
      const caller = createTestCaller({ configStore: mockConfigStore });

      const result = await caller.config.getRecentProjects();
      expect(result).toEqual([]);
    });
  });

  describe('addRecentProject', () => {
    it('should add project to recent projects via configStore', async () => {
      const mockConfigStore = {
        getRecentProjects: vi.fn().mockReturnValue([]),
        addRecentProject: vi.fn(),
        removeRecentProject: vi.fn(),
        getHangThreshold: vi.fn().mockReturnValue(30000),
        setHangThreshold: vi.fn(),
      };
      const caller = createTestCaller({ configStore: mockConfigStore });

      await caller.config.addRecentProject({ path: '/new/project' });
      expect(mockConfigStore.addRecentProject).toHaveBeenCalledWith('/new/project');
    });

    it('should reject empty path', async () => {
      const caller = createTestCaller();
      await expect(caller.config.addRecentProject({ path: '' })).rejects.toThrow();
    });
  });

  // ============================================================
  // HangThreshold procedures (2 procedures)
  // Legacy: GET_HANG_THRESHOLD, SET_HANG_THRESHOLD
  // ============================================================

  describe('getHangThreshold', () => {
    it('should return hang threshold from configStore', async () => {
      const mockConfigStore = {
        getRecentProjects: vi.fn().mockReturnValue([]),
        addRecentProject: vi.fn(),
        removeRecentProject: vi.fn(),
        getHangThreshold: vi.fn().mockReturnValue(300000),
        setHangThreshold: vi.fn(),
      };
      const caller = createTestCaller({ configStore: mockConfigStore });

      const result = await caller.config.getHangThreshold();
      expect(result).toBe(300000);
      expect(mockConfigStore.getHangThreshold).toHaveBeenCalledOnce();
    });
  });

  describe('setHangThreshold', () => {
    it('should set hang threshold via configStore', async () => {
      const mockConfigStore = {
        getRecentProjects: vi.fn().mockReturnValue([]),
        addRecentProject: vi.fn(),
        removeRecentProject: vi.fn(),
        getHangThreshold: vi.fn().mockReturnValue(30000),
        setHangThreshold: vi.fn(),
      };
      const caller = createTestCaller({ configStore: mockConfigStore });

      await caller.config.setHangThreshold({ threshold: 600000 });
      expect(mockConfigStore.setHangThreshold).toHaveBeenCalledWith(600000);
    });

    it('should reject negative threshold', async () => {
      const caller = createTestCaller();
      await expect(caller.config.setHangThreshold({ threshold: -1 })).rejects.toThrow();
    });
  });

  // ============================================================
  // LayoutConfig procedures (3 procedures)
  // Legacy: LOAD_LAYOUT_CONFIG, SAVE_LAYOUT_CONFIG, RESET_LAYOUT_CONFIG
  // ============================================================

  describe('loadLayoutConfig', () => {
    it('should return layout config from configStore', async () => {
      const mockLayout = {
        leftPaneWidth: 320,
        rightPaneWidth: 360,
        bottomPaneHeight: 240,
        agentListHeight: 200,
      };
      const mockConfigStore = {
        getRecentProjects: vi.fn().mockReturnValue([]),
        addRecentProject: vi.fn(),
        removeRecentProject: vi.fn(),
        getHangThreshold: vi.fn().mockReturnValue(30000),
        setHangThreshold: vi.fn(),
        getLayout: vi.fn().mockReturnValue(mockLayout),
      };
      const caller = createTestCaller({ configStore: mockConfigStore as any });

      const result = await caller.config.loadLayoutConfig();
      expect(result).toEqual(mockLayout);
    });

    it('should return null when no layout config', async () => {
      const mockConfigStore = {
        getRecentProjects: vi.fn().mockReturnValue([]),
        addRecentProject: vi.fn(),
        removeRecentProject: vi.fn(),
        getHangThreshold: vi.fn().mockReturnValue(30000),
        setHangThreshold: vi.fn(),
        getLayout: vi.fn().mockReturnValue(null),
      };
      const caller = createTestCaller({ configStore: mockConfigStore as any });

      const result = await caller.config.loadLayoutConfig();
      expect(result).toBeNull();
    });
  });

  describe('saveLayoutConfig', () => {
    it('should save layout config via configStore', async () => {
      const mockLayout = {
        leftPaneWidth: 400,
        rightPaneWidth: 300,
        bottomPaneHeight: 200,
        agentListHeight: 150,
      };
      const mockConfigStore = {
        getRecentProjects: vi.fn().mockReturnValue([]),
        addRecentProject: vi.fn(),
        removeRecentProject: vi.fn(),
        getHangThreshold: vi.fn().mockReturnValue(30000),
        setHangThreshold: vi.fn(),
        setLayout: vi.fn(),
      };
      const caller = createTestCaller({ configStore: mockConfigStore as any });

      await caller.config.saveLayoutConfig({ config: mockLayout });
      expect(mockConfigStore.setLayout).toHaveBeenCalledWith(mockLayout);
    });
  });

  describe('resetLayoutConfig', () => {
    it('should reset layout via configStore', async () => {
      const mockConfigStore = {
        getRecentProjects: vi.fn().mockReturnValue([]),
        addRecentProject: vi.fn(),
        removeRecentProject: vi.fn(),
        getHangThreshold: vi.fn().mockReturnValue(30000),
        setHangThreshold: vi.fn(),
        resetLayout: vi.fn(),
      };
      const caller = createTestCaller({ configStore: mockConfigStore as any });

      await caller.config.resetLayoutConfig();
      expect(mockConfigStore.resetLayout).toHaveBeenCalledOnce();
    });
  });

  // ============================================================
  // SkipPermissions procedures (2 procedures)
  // Legacy: LOAD_SKIP_PERMISSIONS, SAVE_SKIP_PERMISSIONS
  // ============================================================

  describe('loadSkipPermissions', () => {
    it('should return skip permissions from layoutConfigService', async () => {
      const mockLayoutConfigService = {
        loadSkipPermissions: vi.fn().mockResolvedValue(true),
      };
      const caller = createTestCaller({
        layoutConfigService: mockLayoutConfigService as any,
        getCurrentProjectPath: vi.fn().mockReturnValue('/test/project'),
      });

      const result = await caller.config.loadSkipPermissions({ projectPath: '/test/project' });
      expect(result).toBe(true);
      expect(mockLayoutConfigService.loadSkipPermissions).toHaveBeenCalledWith('/test/project');
    });
  });

  describe('saveSkipPermissions', () => {
    it('should save skip permissions via layoutConfigService', async () => {
      const mockLayoutConfigService = {
        saveSkipPermissions: vi.fn().mockResolvedValue(undefined),
      };
      const caller = createTestCaller({
        layoutConfigService: mockLayoutConfigService as any,
      });

      await caller.config.saveSkipPermissions({
        projectPath: '/test/project',
        skipPermissions: true,
      });
      expect(mockLayoutConfigService.saveSkipPermissions).toHaveBeenCalledWith(
        '/test/project',
        true,
      );
    });
  });

  // ============================================================
  // ProjectDefaults procedures (2 procedures)
  // Legacy: LOAD_PROJECT_DEFAULTS, SAVE_PROJECT_DEFAULTS
  // ============================================================

  describe('loadProjectDefaults', () => {
    it('should return project defaults from layoutConfigService', async () => {
      const mockDefaults = { documentReview: { scheme: 'claude-code' as const } };
      const mockLayoutConfigService = {
        loadProjectDefaults: vi.fn().mockResolvedValue(mockDefaults),
      };
      const caller = createTestCaller({
        layoutConfigService: mockLayoutConfigService as any,
      });

      const result = await caller.config.loadProjectDefaults({ projectPath: '/test/project' });
      expect(result).toEqual(mockDefaults);
    });

    it('should return null when no project defaults', async () => {
      const mockLayoutConfigService = {
        loadProjectDefaults: vi.fn().mockResolvedValue(undefined),
      };
      const caller = createTestCaller({
        layoutConfigService: mockLayoutConfigService as any,
      });

      const result = await caller.config.loadProjectDefaults({ projectPath: '/test/project' });
      expect(result).toBeNull();
    });
  });

  describe('saveProjectDefaults', () => {
    it('should save project defaults via layoutConfigService', async () => {
      const mockDefaults = { documentReview: { scheme: 'debatex' as const } };
      const mockLayoutConfigService = {
        saveProjectDefaults: vi.fn().mockResolvedValue(undefined),
      };
      const caller = createTestCaller({
        layoutConfigService: mockLayoutConfigService as any,
      });

      await caller.config.saveProjectDefaults({
        projectPath: '/test/project',
        defaults: mockDefaults,
      });
      expect(mockLayoutConfigService.saveProjectDefaults).toHaveBeenCalledWith(
        '/test/project',
        mockDefaults,
      );
    });
  });

  // ============================================================
  // Profile procedures (1 procedure)
  // Legacy: LOAD_PROFILE
  // ============================================================

  describe('loadProfile', () => {
    it('should return profile from layoutConfigService', async () => {
      const mockProfile = { name: 'cc-sdd' as const, installedAt: '2026-01-01T00:00:00Z' };
      const mockLayoutConfigService = {
        loadProfile: vi.fn().mockResolvedValue(mockProfile),
      };
      const caller = createTestCaller({
        layoutConfigService: mockLayoutConfigService as any,
      });

      const result = await caller.config.loadProfile({ projectPath: '/test/project' });
      expect(result).toEqual(mockProfile);
    });

    it('should return null when no profile', async () => {
      const mockLayoutConfigService = {
        loadProfile: vi.fn().mockResolvedValue(null),
      };
      const caller = createTestCaller({
        layoutConfigService: mockLayoutConfigService as any,
      });

      const result = await caller.config.loadProfile({ projectPath: '/test/project' });
      expect(result).toBeNull();
    });
  });

  // ============================================================
  // EngineConfig procedures (3 procedures)
  // Legacy: LOAD_ENGINE_CONFIG, SAVE_ENGINE_CONFIG, GET_AVAILABLE_LLM_ENGINES
  // ============================================================

  describe('loadEngineConfig', () => {
    it('should return engine config from engineConfigService', async () => {
      const mockConfig = { default: 'claude' as const };
      const mockEngineConfigService = {
        loadEngineConfig: vi.fn().mockResolvedValue(mockConfig),
        saveEngineConfig: vi.fn(),
      };
      const caller = createTestCaller({
        engineConfigService: mockEngineConfigService as any,
      });

      const result = await caller.config.loadEngineConfig({ projectPath: '/test/project' });
      expect(result).toEqual(mockConfig);
      expect(mockEngineConfigService.loadEngineConfig).toHaveBeenCalledWith('/test/project');
    });
  });

  describe('saveEngineConfig', () => {
    it('should save engine config via engineConfigService', async () => {
      const mockConfig = { default: 'gemini' as const, impl: 'claude' as const };
      const mockEngineConfigService = {
        loadEngineConfig: vi.fn(),
        saveEngineConfig: vi.fn().mockResolvedValue(undefined),
      };
      const caller = createTestCaller({
        engineConfigService: mockEngineConfigService as any,
      });

      await caller.config.saveEngineConfig({
        projectPath: '/test/project',
        config: mockConfig,
      });
      expect(mockEngineConfigService.saveEngineConfig).toHaveBeenCalledWith(
        '/test/project',
        mockConfig,
      );
    });
  });

  describe('getAvailableLlmEngines', () => {
    it('should return available engines from getAvailableLlmEngines service', async () => {
      const mockEngines = [
        { id: 'claude' as const, label: 'Claude' },
        { id: 'gemini' as const, label: 'Gemini' },
      ];
      const caller = createTestCaller({
        getAvailableLlmEngines: vi.fn().mockReturnValue(mockEngines),
      });

      const result = await caller.config.getAvailableLlmEngines();
      expect(result).toEqual(mockEngines);
    });
  });

  // ============================================================
  // ToolPath procedures (3 procedures)
  // Legacy: GET_TOOL_STATUSES, SET_TOOL_PATH, RESOLVE_TOOL
  // ============================================================

  describe('getToolStatuses', () => {
    it('should return tool statuses from toolPathResolverService', async () => {
      const mockStatuses = [
        {
          definition: { name: 'claude', required: true, versionCommand: '--version', installGuidance: '' },
          resolution: { resolved: true, path: '/usr/local/bin/claude', source: 'well-known' as const },
        },
      ];
      const caller = createTestCaller({
        toolPathResolverService: {
          getAllStatuses: vi.fn().mockReturnValue(mockStatuses),
          resolveTool: vi.fn(),
        } as any,
      });

      const result = await caller.config.getToolStatuses();
      expect(result).toEqual(mockStatuses);
    });
  });

  describe('setToolPath', () => {
    it('should set tool path and return resolution result', async () => {
      const mockResult = { resolved: true, path: '/custom/bin/claude', source: 'manual' as const };
      const mockConfigStore = {
        getRecentProjects: vi.fn().mockReturnValue([]),
        addRecentProject: vi.fn(),
        removeRecentProject: vi.fn(),
        getHangThreshold: vi.fn().mockReturnValue(30000),
        setHangThreshold: vi.fn(),
        setToolPath: vi.fn(),
      };
      const caller = createTestCaller({
        configStore: mockConfigStore as any,
        toolPathResolverService: {
          getAllStatuses: vi.fn(),
          resolveTool: vi.fn().mockResolvedValue(mockResult),
        } as any,
      });

      const result = await caller.config.setToolPath({ tool: 'claude', path: '/custom/bin/claude' });
      expect(result).toEqual(mockResult);
      expect(mockConfigStore.setToolPath).toHaveBeenCalledWith('claude', '/custom/bin/claude');
    });

    it('should accept null path to clear manual override', async () => {
      const mockResult = { resolved: true, path: '/usr/local/bin/claude', source: 'well-known' as const };
      const mockConfigStore = {
        getRecentProjects: vi.fn().mockReturnValue([]),
        addRecentProject: vi.fn(),
        removeRecentProject: vi.fn(),
        getHangThreshold: vi.fn().mockReturnValue(30000),
        setHangThreshold: vi.fn(),
        setToolPath: vi.fn(),
      };
      const caller = createTestCaller({
        configStore: mockConfigStore as any,
        toolPathResolverService: {
          getAllStatuses: vi.fn(),
          resolveTool: vi.fn().mockResolvedValue(mockResult),
        } as any,
      });

      const result = await caller.config.setToolPath({ tool: 'claude', path: null });
      expect(mockConfigStore.setToolPath).toHaveBeenCalledWith('claude', null);
      expect(result).toEqual(mockResult);
    });
  });

  describe('resolveTool', () => {
    it('should resolve tool via toolPathResolverService', async () => {
      const mockResult = { resolved: true, path: '/usr/local/bin/jj', source: 'well-known' as const };
      const caller = createTestCaller({
        toolPathResolverService: {
          getAllStatuses: vi.fn(),
          resolveTool: vi.fn().mockResolvedValue(mockResult),
        } as any,
      });

      const result = await caller.config.resolveTool({ tool: 'jj' });
      expect(result).toEqual(mockResult);
    });
  });

  // ============================================================
  // VcsScheme procedures (2 procedures)
  // Legacy: VCS_SCHEME_GET, VCS_SCHEME_SET (handlers.ts)
  // ============================================================

  describe('getVcsScheme', () => {
    it('should return VCS scheme from settingsFileManager', async () => {
      const caller = createTestCaller({
        settingsFileManager: {
          getVcsScheme: vi.fn().mockResolvedValue({ ok: true, value: 'git' }),
          setVcsScheme: vi.fn(),
        } as any,
      });

      const result = await caller.config.getVcsScheme({ projectPath: '/test/project' });
      expect(result).toBe('git');
    });

    it('should default to git on error', async () => {
      const caller = createTestCaller({
        settingsFileManager: {
          getVcsScheme: vi.fn().mockResolvedValue({
            ok: false,
            error: { type: 'READ_ERROR', path: '', message: 'File not found' },
          }),
          setVcsScheme: vi.fn(),
        } as any,
      });

      const result = await caller.config.getVcsScheme({ projectPath: '/test/project' });
      expect(result).toBe('git');
    });
  });

  describe('setVcsScheme', () => {
    it('should set VCS scheme via settingsFileManager', async () => {
      const mockSettingsFileManager = {
        getVcsScheme: vi.fn(),
        setVcsScheme: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
      };
      const caller = createTestCaller({
        settingsFileManager: mockSettingsFileManager as any,
        toolPathResolverService: {
          getAllStatuses: vi.fn(),
          resolveTool: vi.fn(),
          getStatus: vi.fn().mockReturnValue({
            definition: { name: 'jj', required: false, versionCommand: '--version', installGuidance: '' },
            resolution: { resolved: true, path: '/usr/local/bin/jj', source: 'well-known' },
          }),
        } as any,
      });

      const result = await caller.config.setVcsScheme({
        projectPath: '/test/project',
        scheme: 'jj',
      });
      expect(result).toEqual({ success: true });
    });

    it('should reject setting jj when jj is not available', async () => {
      const caller = createTestCaller({
        settingsFileManager: {
          getVcsScheme: vi.fn(),
          setVcsScheme: vi.fn(),
        } as any,
        toolPathResolverService: {
          getAllStatuses: vi.fn(),
          resolveTool: vi.fn(),
          getStatus: vi.fn().mockReturnValue(null),
        } as any,
      });

      const result = await caller.config.setVcsScheme({
        projectPath: '/test/project',
        scheme: 'jj',
      });
      expect(result).toEqual({ success: false, error: expect.any(String) });
    });

    it('should allow setting git without jj availability check', async () => {
      const caller = createTestCaller({
        settingsFileManager: {
          getVcsScheme: vi.fn(),
          setVcsScheme: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
        } as any,
        toolPathResolverService: {
          getAllStatuses: vi.fn(),
          resolveTool: vi.fn(),
          getStatus: vi.fn(),
        } as any,
      });

      const result = await caller.config.setVcsScheme({
        projectPath: '/test/project',
        scheme: 'git',
      });
      expect(result).toEqual({ success: true });
    });
  });

  // ============================================================
  // RemoteUiAutoStart procedures (2 procedures)
  // Legacy: LOAD_REMOTE_UI_AUTO_START, SAVE_REMOTE_UI_AUTO_START
  // ============================================================

  describe('loadRemoteUiAutoStart', () => {
    it('should return remote UI auto start from layoutConfigService', async () => {
      const mockLayoutConfigService = {
        loadRemoteUiAutoStart: vi.fn().mockResolvedValue(true),
      };
      const caller = createTestCaller({
        layoutConfigService: mockLayoutConfigService as any,
      });

      const result = await caller.config.loadRemoteUiAutoStart({ projectPath: '/test/project' });
      expect(result).toBe(true);
    });

    it('should return false when not set', async () => {
      const mockLayoutConfigService = {
        loadRemoteUiAutoStart: vi.fn().mockResolvedValue(false),
      };
      const caller = createTestCaller({
        layoutConfigService: mockLayoutConfigService as any,
      });

      const result = await caller.config.loadRemoteUiAutoStart({ projectPath: '/test/project' });
      expect(result).toBe(false);
    });
  });

  describe('saveRemoteUiAutoStart', () => {
    it('should save remote UI auto start via layoutConfigService', async () => {
      const mockLayoutConfigService = {
        saveRemoteUiAutoStart: vi.fn().mockResolvedValue(undefined),
      };
      const caller = createTestCaller({
        layoutConfigService: mockLayoutConfigService as any,
      });

      await caller.config.saveRemoteUiAutoStart({
        projectPath: '/test/project',
        enabled: true,
      });
      expect(mockLayoutConfigService.saveRemoteUiAutoStart).toHaveBeenCalledWith(
        '/test/project',
        true,
      );
    });
  });

  // ============================================================
  // Zod Schema Validation Tests
  // Requirements: 2.3
  // ============================================================

  describe('Zod Schema Validation', () => {
    it('addRecentProject should reject non-string path', async () => {
      const caller = createTestCaller();
      await expect(caller.config.addRecentProject({ path: 123 as any })).rejects.toThrow();
    });

    it('setHangThreshold should reject non-number threshold', async () => {
      const caller = createTestCaller();
      await expect(caller.config.setHangThreshold({ threshold: 'abc' as any })).rejects.toThrow();
    });

    it('saveLayoutConfig should reject invalid layout (negative numbers)', async () => {
      const caller = createTestCaller();
      await expect(
        caller.config.saveLayoutConfig({
          config: {
            leftPaneWidth: -1,
            rightPaneWidth: 300,
            bottomPaneHeight: 200,
            agentListHeight: 150,
          },
        }),
      ).rejects.toThrow();
    });

    it('setVcsScheme should reject invalid scheme', async () => {
      const caller = createTestCaller();
      await expect(
        caller.config.setVcsScheme({ projectPath: '/test', scheme: 'svn' as any }),
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // Error Handling Tests
  // ============================================================

  describe('Error Handling', () => {
    it('should propagate error when configStore.getRecentProjects throws', async () => {
      const mockConfigStore = {
        getRecentProjects: vi.fn().mockImplementation(() => {
          throw new Error('Store unavailable');
        }),
        addRecentProject: vi.fn(),
        removeRecentProject: vi.fn(),
        getHangThreshold: vi.fn(),
        setHangThreshold: vi.fn(),
      };
      const caller = createTestCaller({ configStore: mockConfigStore });

      await expect(caller.config.getRecentProjects()).rejects.toThrow();
    });

    it('should propagate error when layoutConfigService.loadProfile throws', async () => {
      const mockLayoutConfigService = {
        loadProfile: vi.fn().mockRejectedValue(new Error('File read error')),
      };
      const caller = createTestCaller({
        layoutConfigService: mockLayoutConfigService as any,
      });

      await expect(
        caller.config.loadProfile({ projectPath: '/test/project' }),
      ).rejects.toThrow();
    });

    it('should propagate error when engineConfigService.loadEngineConfig throws', async () => {
      const mockEngineConfigService = {
        loadEngineConfig: vi.fn().mockRejectedValue(new Error('Config read error')),
      };
      const caller = createTestCaller({
        engineConfigService: mockEngineConfigService as any,
      });

      await expect(
        caller.config.loadEngineConfig({ projectPath: '/test/project' }),
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // Integration: All config procedures with shared context
  // ============================================================

  describe('Integration: All config procedures with shared context', () => {
    it('should execute multiple config procedures with the same caller', async () => {
      const mockConfigStore = {
        getRecentProjects: vi.fn().mockReturnValue(['/project1']),
        addRecentProject: vi.fn(),
        removeRecentProject: vi.fn(),
        getHangThreshold: vi.fn().mockReturnValue(300000),
        setHangThreshold: vi.fn(),
        getLayout: vi.fn().mockReturnValue({ leftPaneWidth: 320, rightPaneWidth: 360, bottomPaneHeight: 240, agentListHeight: 200 }),
        setLayout: vi.fn(),
        resetLayout: vi.fn(),
        setToolPath: vi.fn(),
      };
      const mockLayoutConfigService = {
        loadSkipPermissions: vi.fn().mockResolvedValue(false),
        saveSkipPermissions: vi.fn().mockResolvedValue(undefined),
        loadProjectDefaults: vi.fn().mockResolvedValue(undefined),
        saveProjectDefaults: vi.fn().mockResolvedValue(undefined),
        loadProfile: vi.fn().mockResolvedValue(null),
        loadRemoteUiAutoStart: vi.fn().mockResolvedValue(false),
        saveRemoteUiAutoStart: vi.fn().mockResolvedValue(undefined),
      };
      const caller = createTestCaller({
        configStore: mockConfigStore as any,
        layoutConfigService: mockLayoutConfigService as any,
      });

      // Execute multiple procedures
      const recentProjects = await caller.config.getRecentProjects();
      const hangThreshold = await caller.config.getHangThreshold();
      const layout = await caller.config.loadLayoutConfig();

      expect(recentProjects).toEqual(['/project1']);
      expect(hangThreshold).toBe(300000);
      expect(layout).toEqual({ leftPaneWidth: 320, rightPaneWidth: 360, bottomPaneHeight: 240, agentListHeight: 200 });
    });
  });

  // ============================================================
  // Task 3.3: レガシーConfigハンドラ由来のエッジケース
  // レガシーハンドラ削除に伴い、エッジケースをtRPCルーターテストに引き継ぎ
  // Requirements: 2.4, 2.5
  // ============================================================

  describe('Edge Cases (from legacy config handler tests)', () => {
    describe('saveSkipPermissions with false value', () => {
      it('should save skip permissions as false', async () => {
        const mockLayoutConfigService = {
          saveSkipPermissions: vi.fn().mockResolvedValue(undefined),
        };
        const caller = createTestCaller({
          layoutConfigService: mockLayoutConfigService as any,
        });

        await caller.config.saveSkipPermissions({
          projectPath: '/test/project',
          skipPermissions: false,
        });
        expect(mockLayoutConfigService.saveSkipPermissions).toHaveBeenCalledWith(
          '/test/project',
          false,
        );
      });
    });

    describe('saveRemoteUiAutoStart with false value', () => {
      it('should save remote UI auto start as false', async () => {
        const mockLayoutConfigService = {
          saveRemoteUiAutoStart: vi.fn().mockResolvedValue(undefined),
        };
        const caller = createTestCaller({
          layoutConfigService: mockLayoutConfigService as any,
        });

        await caller.config.saveRemoteUiAutoStart({
          projectPath: '/test/project',
          enabled: false,
        });
        expect(mockLayoutConfigService.saveRemoteUiAutoStart).toHaveBeenCalledWith(
          '/test/project',
          false,
        );
      });
    });

    describe('saveLayoutConfig with specific layout values', () => {
      it('should correctly pass all layout fields including optional ones', async () => {
        const mockLayout = {
          leftPaneWidth: 400,
          rightPaneWidth: 400,
          bottomPaneHeight: 300,
          agentListHeight: 250,
          projectAgentPanelHeight: 180,
          globalAgentPanelHeight: 220,
          viewMode: 'git-diff' as const,
        };
        const mockConfigStore = {
          getRecentProjects: vi.fn().mockReturnValue([]),
          addRecentProject: vi.fn(),
          removeRecentProject: vi.fn(),
          getHangThreshold: vi.fn().mockReturnValue(30000),
          setHangThreshold: vi.fn(),
          setLayout: vi.fn(),
        };
        const caller = createTestCaller({ configStore: mockConfigStore as any });

        await caller.config.saveLayoutConfig({ config: mockLayout });
        expect(mockConfigStore.setLayout).toHaveBeenCalledWith(mockLayout);
      });
    });

    describe('saveProjectDefaults with various schemes', () => {
      it('should save project defaults with gemini-cli scheme', async () => {
        const mockDefaults = { documentReview: { scheme: 'gemini-cli' as const } };
        const mockLayoutConfigService = {
          saveProjectDefaults: vi.fn().mockResolvedValue(undefined),
        };
        const caller = createTestCaller({
          layoutConfigService: mockLayoutConfigService as any,
        });

        await caller.config.saveProjectDefaults({
          projectPath: '/test/project',
          defaults: mockDefaults,
        });
        expect(mockLayoutConfigService.saveProjectDefaults).toHaveBeenCalledWith(
          '/test/project',
          mockDefaults,
        );
      });

      it('should save project defaults with debatex scheme', async () => {
        const mockDefaults = { documentReview: { scheme: 'debatex' as const } };
        const mockLayoutConfigService = {
          saveProjectDefaults: vi.fn().mockResolvedValue(undefined),
        };
        const caller = createTestCaller({
          layoutConfigService: mockLayoutConfigService as any,
        });

        await caller.config.saveProjectDefaults({
          projectPath: '/test/project',
          defaults: mockDefaults,
        });
        expect(mockLayoutConfigService.saveProjectDefaults).toHaveBeenCalledWith(
          '/test/project',
          mockDefaults,
        );
      });
    });
  });

  // ============================================================
  // Task 3.3: Additional Error Propagation (comprehensive coverage)
  // Requirements: 2.5
  // ============================================================

  describe('Additional Error Propagation', () => {
    it('should propagate error when toolPathResolverService.getAllStatuses throws', async () => {
      const caller = createTestCaller({
        toolPathResolverService: {
          getAllStatuses: vi.fn().mockImplementation(() => {
            throw new Error('Service unavailable');
          }),
          resolveTool: vi.fn(),
          getStatus: vi.fn(),
        } as any,
      });

      await expect(caller.config.getToolStatuses()).rejects.toThrow();
    });

    it('should propagate error when toolPathResolverService.resolveTool throws', async () => {
      const caller = createTestCaller({
        toolPathResolverService: {
          getAllStatuses: vi.fn(),
          resolveTool: vi.fn().mockRejectedValue(new Error('Resolution failed')),
          getStatus: vi.fn(),
        } as any,
      });

      await expect(caller.config.resolveTool({ tool: 'claude' })).rejects.toThrow();
    });

    it('should propagate error when settingsFileManager.setVcsScheme throws', async () => {
      const caller = createTestCaller({
        settingsFileManager: {
          getVcsScheme: vi.fn(),
          setVcsScheme: vi.fn().mockRejectedValue(new Error('Write error')),
        } as any,
        toolPathResolverService: {
          getAllStatuses: vi.fn(),
          resolveTool: vi.fn(),
          getStatus: vi.fn().mockReturnValue(null),
        } as any,
      });

      // Setting to 'git' doesn't check jj availability
      await expect(
        caller.config.setVcsScheme({ projectPath: '/test', scheme: 'git' }),
      ).rejects.toThrow();
    });

    it('should propagate error when layoutConfigService.saveSkipPermissions throws', async () => {
      const caller = createTestCaller({
        layoutConfigService: {
          saveSkipPermissions: vi.fn().mockRejectedValue(new Error('Write error')),
        } as any,
      });

      await expect(
        caller.config.saveSkipPermissions({ projectPath: '/test', skipPermissions: true }),
      ).rejects.toThrow();
    });

    it('should propagate error when configStore.setHangThreshold throws', async () => {
      const mockConfigStore = {
        getRecentProjects: vi.fn().mockReturnValue([]),
        addRecentProject: vi.fn(),
        removeRecentProject: vi.fn(),
        getHangThreshold: vi.fn(),
        setHangThreshold: vi.fn().mockImplementation(() => {
          throw new Error('Store error');
        }),
      };
      const caller = createTestCaller({ configStore: mockConfigStore });

      await expect(
        caller.config.setHangThreshold({ threshold: 60000 }),
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // Task 3.3: Additional Zod Schema Validation (comprehensive)
  // Requirements: 2.3, 2.5
  // ============================================================

  describe('Additional Zod Schema Validation', () => {
    it('should reject empty projectPath for loadSkipPermissions', async () => {
      const caller = createTestCaller();
      await expect(
        caller.config.loadSkipPermissions({ projectPath: '' }),
      ).rejects.toThrow();
    });

    it('should reject empty projectPath for loadProjectDefaults', async () => {
      const caller = createTestCaller();
      await expect(
        caller.config.loadProjectDefaults({ projectPath: '' }),
      ).rejects.toThrow();
    });

    it('should reject empty projectPath for loadProfile', async () => {
      const caller = createTestCaller();
      await expect(
        caller.config.loadProfile({ projectPath: '' }),
      ).rejects.toThrow();
    });

    it('should reject empty projectPath for loadEngineConfig', async () => {
      const caller = createTestCaller();
      await expect(
        caller.config.loadEngineConfig({ projectPath: '' }),
      ).rejects.toThrow();
    });

    it('should reject empty tool name for resolveTool', async () => {
      const caller = createTestCaller();
      await expect(
        caller.config.resolveTool({ tool: '' }),
      ).rejects.toThrow();
    });

    it('should reject empty tool name for setToolPath', async () => {
      const caller = createTestCaller();
      await expect(
        caller.config.setToolPath({ tool: '', path: '/usr/bin/tool' }),
      ).rejects.toThrow();
    });

    it('should reject empty projectPath for saveEngineConfig', async () => {
      const caller = createTestCaller();
      await expect(
        caller.config.saveEngineConfig({ projectPath: '', config: {} }),
      ).rejects.toThrow();
    });

    it('should reject empty projectPath for loadRemoteUiAutoStart', async () => {
      const caller = createTestCaller();
      await expect(
        caller.config.loadRemoteUiAutoStart({ projectPath: '' }),
      ).rejects.toThrow();
    });

    it('should reject empty projectPath for saveRemoteUiAutoStart', async () => {
      const caller = createTestCaller();
      await expect(
        caller.config.saveRemoteUiAutoStart({ projectPath: '', enabled: true }),
      ).rejects.toThrow();
    });

    it('should reject empty projectPath for getVcsScheme', async () => {
      const caller = createTestCaller();
      await expect(
        caller.config.getVcsScheme({ projectPath: '' }),
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // Task 3.3: Full Integration - All 22 procedures in sequence
  // Requirements: 2.5
  // ============================================================

  describe('Full Integration: All 22 config procedures', () => {
    it('should successfully call all 22 procedures with comprehensive mock context', async () => {
      const mockConfigStore = {
        getRecentProjects: vi.fn().mockReturnValue(['/project1', '/project2']),
        addRecentProject: vi.fn(),
        removeRecentProject: vi.fn(),
        getHangThreshold: vi.fn().mockReturnValue(300000),
        setHangThreshold: vi.fn(),
        getLayout: vi.fn().mockReturnValue({
          leftPaneWidth: 320,
          rightPaneWidth: 360,
          bottomPaneHeight: 240,
          agentListHeight: 200,
        }),
        setLayout: vi.fn(),
        resetLayout: vi.fn(),
        setToolPath: vi.fn(),
      };
      const mockLayoutConfigService = {
        loadSkipPermissions: vi.fn().mockResolvedValue(true),
        saveSkipPermissions: vi.fn().mockResolvedValue(undefined),
        loadProjectDefaults: vi.fn().mockResolvedValue({ documentReview: { scheme: 'claude-code' } }),
        saveProjectDefaults: vi.fn().mockResolvedValue(undefined),
        loadProfile: vi.fn().mockResolvedValue({ name: 'cc-sdd', installedAt: '2026-01-01T00:00:00Z' }),
        loadRemoteUiAutoStart: vi.fn().mockResolvedValue(true),
        saveRemoteUiAutoStart: vi.fn().mockResolvedValue(undefined),
      };
      const mockEngineConfigService = {
        loadEngineConfig: vi.fn().mockResolvedValue({ default: 'claude' }),
        saveEngineConfig: vi.fn().mockResolvedValue(undefined),
      };
      const mockToolPathResolverService = {
        getAllStatuses: vi.fn().mockReturnValue([
          {
            definition: { name: 'claude', required: true, versionCommand: '--version', installGuidance: '' },
            resolution: { resolved: true, path: '/usr/local/bin/claude', source: 'well-known' },
          },
        ]),
        resolveTool: vi.fn().mockResolvedValue({ resolved: true, path: '/usr/local/bin/claude', source: 'well-known' }),
        getStatus: vi.fn().mockReturnValue(null),
      };
      const mockSettingsFileManager = {
        getVcsScheme: vi.fn().mockResolvedValue({ ok: true, value: 'git' }),
        setVcsScheme: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
      };

      const caller = createTestCaller({
        configStore: mockConfigStore as any,
        layoutConfigService: mockLayoutConfigService as any,
        engineConfigService: mockEngineConfigService as any,
        toolPathResolverService: mockToolPathResolverService as any,
        settingsFileManager: mockSettingsFileManager as any,
        getAvailableLlmEngines: vi.fn().mockReturnValue([
          { id: 'claude', label: 'Claude' },
          { id: 'gemini', label: 'Gemini' },
        ]),
      });

      // 1. getRecentProjects
      const recentProjects = await caller.config.getRecentProjects();
      expect(recentProjects).toEqual(['/project1', '/project2']);

      // 2. addRecentProject
      await caller.config.addRecentProject({ path: '/new/project' });
      expect(mockConfigStore.addRecentProject).toHaveBeenCalledWith('/new/project');

      // 3. getHangThreshold
      const threshold = await caller.config.getHangThreshold();
      expect(threshold).toBe(300000);

      // 4. setHangThreshold
      await caller.config.setHangThreshold({ threshold: 600000 });
      expect(mockConfigStore.setHangThreshold).toHaveBeenCalledWith(600000);

      // 5. loadLayoutConfig
      const layout = await caller.config.loadLayoutConfig();
      expect(layout).toEqual({
        leftPaneWidth: 320,
        rightPaneWidth: 360,
        bottomPaneHeight: 240,
        agentListHeight: 200,
      });

      // 6. saveLayoutConfig
      await caller.config.saveLayoutConfig({
        config: { leftPaneWidth: 400, rightPaneWidth: 400, bottomPaneHeight: 300, agentListHeight: 250 },
      });
      expect(mockConfigStore.setLayout).toHaveBeenCalled();

      // 7. resetLayoutConfig
      await caller.config.resetLayoutConfig();
      expect(mockConfigStore.resetLayout).toHaveBeenCalled();

      // 8. loadSkipPermissions
      const skipPerms = await caller.config.loadSkipPermissions({ projectPath: '/test' });
      expect(skipPerms).toBe(true);

      // 9. saveSkipPermissions
      await caller.config.saveSkipPermissions({ projectPath: '/test', skipPermissions: false });
      expect(mockLayoutConfigService.saveSkipPermissions).toHaveBeenCalledWith('/test', false);

      // 10. loadProjectDefaults
      const defaults = await caller.config.loadProjectDefaults({ projectPath: '/test' });
      expect(defaults).toEqual({ documentReview: { scheme: 'claude-code' } });

      // 11. saveProjectDefaults
      await caller.config.saveProjectDefaults({
        projectPath: '/test',
        defaults: { documentReview: { scheme: 'debatex' } },
      });
      expect(mockLayoutConfigService.saveProjectDefaults).toHaveBeenCalled();

      // 12. loadProfile
      const profile = await caller.config.loadProfile({ projectPath: '/test' });
      expect(profile).toEqual({ name: 'cc-sdd', installedAt: '2026-01-01T00:00:00Z' });

      // 13. loadEngineConfig
      const engineConfig = await caller.config.loadEngineConfig({ projectPath: '/test' });
      expect(engineConfig).toEqual({ default: 'claude' });

      // 14. saveEngineConfig
      await caller.config.saveEngineConfig({
        projectPath: '/test',
        config: { default: 'gemini' },
      });
      expect(mockEngineConfigService.saveEngineConfig).toHaveBeenCalled();

      // 15. getAvailableLlmEngines
      const engines = await caller.config.getAvailableLlmEngines();
      expect(engines).toEqual([
        { id: 'claude', label: 'Claude' },
        { id: 'gemini', label: 'Gemini' },
      ]);

      // 16. getToolStatuses
      const statuses = await caller.config.getToolStatuses();
      expect(statuses).toHaveLength(1);
      expect(statuses[0].definition.name).toBe('claude');

      // 17. setToolPath
      const setPathResult = await caller.config.setToolPath({ tool: 'claude', path: '/custom/claude' });
      expect(setPathResult.resolved).toBe(true);

      // 18. resolveTool
      const resolveResult = await caller.config.resolveTool({ tool: 'claude' });
      expect(resolveResult.resolved).toBe(true);

      // 19. getVcsScheme
      const vcsScheme = await caller.config.getVcsScheme({ projectPath: '/test' });
      expect(vcsScheme).toBe('git');

      // 20. setVcsScheme
      const setVcsResult = await caller.config.setVcsScheme({ projectPath: '/test', scheme: 'git' });
      expect(setVcsResult.success).toBe(true);

      // 21. loadRemoteUiAutoStart
      const autoStart = await caller.config.loadRemoteUiAutoStart({ projectPath: '/test' });
      expect(autoStart).toBe(true);

      // 22. saveRemoteUiAutoStart
      await caller.config.saveRemoteUiAutoStart({ projectPath: '/test', enabled: false });
      expect(mockLayoutConfigService.saveRemoteUiAutoStart).toHaveBeenCalledWith('/test', false);
    });
  });
});
