/**
 * Project Store Tests
 * TDD: Testing project state management
 * Requirements: 1.1-1.5
 * Requirements (header-profile-badge): 3.1, 3.2, 4.1, 4.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useProjectStore } from './projectStore';
import { useSpecStore } from './specStore';
import { useBugStore } from './bugStore';

describe('useProjectStore', () => {
  beforeEach(() => {
    // Reset store state
    useProjectStore.setState({
      currentProject: null,
      recentProjects: [],
      kiroValidation: null,
      isLoading: false,
      error: null,
      permissionsCheck: null,
      lastSelectResult: null,
      // header-profile-badge feature
      installedProfile: null,
      profileLoading: false,
      // Note: specs/bugs are now managed by specStore/bugStore (SSOT)
    });
    // Reset specStore and bugStore
    useSpecStore.setState({ specs: [], selectedSpec: null, specDetail: null });
    useBugStore.setState({ bugs: [], selectedBug: null, bugDetail: null });
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have null currentProject initially', () => {
      const state = useProjectStore.getState();
      expect(state.currentProject).toBeNull();
    });

    it('should have empty recentProjects initially', () => {
      const state = useProjectStore.getState();
      expect(state.recentProjects).toEqual([]);
    });

    it('should not be loading initially', () => {
      const state = useProjectStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('selectProject', () => {
    it('should set currentProject when valid path selected', async () => {
      const mockValidation = { exists: true, hasSpecs: true, hasSteering: true };
      // spec-metadata-ssot-refactor: SpecMetadata only has name and path
      const mockSpecs = [{ name: 'test-spec', path: '/test/spec' }];
      const mockBugs = [{ name: 'test-bug', path: '/test/bug', phase: 'reported', updatedAt: '2024-01-01' }];
      // spec-metadata-ssot-refactor: specJson contains phase/updatedAt
      const mockSpecJson = {
        feature_name: 'test-spec',
        phase: 'design-generated',
        updated_at: '2024-01-01T00:00:00Z',
        approvals: {
          requirements: { generated: true, approved: true },
          design: { generated: true, approved: false },
          tasks: { generated: false, approved: false },
        },
      };

      // spec-metadata-ssot-refactor: specJsonMap is returned from Main process
      const mockSpecJsonMap = { 'test-spec': mockSpecJson };

      window.electronAPI.selectProject = vi.fn().mockResolvedValue({
        success: true,
        projectPath: '/test/project',
        kiroValidation: mockValidation,
        specs: mockSpecs,
        bugs: mockBugs,
        specJsonMap: mockSpecJsonMap,  // spec-metadata-ssot-refactor
      });
      window.electronAPI.getRecentProjects = vi.fn().mockResolvedValue([]);
      window.electronAPI.checkSpecManagerFiles = vi.fn().mockResolvedValue({
        commands: { allPresent: true, missing: [], present: [] },
        settings: { allPresent: true, missing: [], present: [] },
        allPresent: true,
      });
      window.electronAPI.checkRequiredPermissions = vi.fn().mockResolvedValue({
        allPresent: true,
        missing: [],
        present: [],
      });

      await useProjectStore.getState().selectProject('/test/project');

      const state = useProjectStore.getState();
      expect(state.currentProject).toBe('/test/project');
      expect(state.kiroValidation).toEqual(mockValidation);
      // specs/bugs are delegated to specStore/bugStore (SSOT)
      expect(useSpecStore.getState().specs).toEqual(mockSpecs);
      expect(useBugStore.getState().bugs).toEqual(mockBugs);
      // spec-metadata-ssot-refactor: Verify specJsonMap is set from IPC result
      const specJsonMap = useSpecStore.getState().specJsonMap;
      expect(specJsonMap.get('test-spec')).toEqual(mockSpecJson);
    });

    it('should set isLoading during selection', async () => {
      window.electronAPI.selectProject = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          success: true,
          projectPath: '/test/project',
          kiroValidation: { exists: true, hasSpecs: true, hasSteering: true },
          specs: [],
          bugs: [],
          specJsonMap: {},  // spec-metadata-ssot-refactor
        }), 100))
      );
      window.electronAPI.getRecentProjects = vi.fn().mockResolvedValue([]);
      window.electronAPI.checkSpecManagerFiles = vi.fn().mockResolvedValue({
        commands: { allPresent: true, missing: [], present: [] },
        settings: { allPresent: true, missing: [], present: [] },
        allPresent: true,
      });
      window.electronAPI.checkRequiredPermissions = vi.fn().mockResolvedValue({
        allPresent: true,
        missing: [],
        present: [],
      });

      const selectPromise = useProjectStore.getState().selectProject('/test/project');

      // Check loading state during operation
      expect(useProjectStore.getState().isLoading).toBe(true);

      await selectPromise;

      // Check loading state after completion
      expect(useProjectStore.getState().isLoading).toBe(false);
    });

    it('should set error on selection failure', async () => {
      window.electronAPI.selectProject = vi.fn().mockResolvedValue({
        success: false,
        projectPath: '/invalid/path',
        kiroValidation: { exists: false, hasSpecs: false, hasSteering: false },
        specs: [],
        bugs: [],
        error: { type: 'PATH_NOT_EXISTS', path: '/invalid/path' },
      });

      await useProjectStore.getState().selectProject('/invalid/path');

      const state = useProjectStore.getState();
      expect(state.error).toBeTruthy();
      expect(state.error).toContain('パスが存在しません');
    });

    it('should clear selected spec before switching projects (Bug fix: spec-item-flash-wrong-content)', async () => {
      // Setup: Set a selected spec from previous project
      useSpecStore.setState({
        selectedSpec: { name: 'old-spec', path: '/old-project/.kiro/specs/old-spec' },
        specDetail: { metadata: { name: 'old-spec', path: '/old-project/.kiro/specs/old-spec' } } as never,
      });

      const mockValidation = { exists: true, hasSpecs: true, hasSteering: true };
      window.electronAPI.selectProject = vi.fn().mockResolvedValue({
        success: true,
        projectPath: '/new-project',
        kiroValidation: mockValidation,
        specs: [{ name: 'new-spec', path: '/new-project/.kiro/specs/new-spec' }],
        bugs: [],
        specJsonMap: {},
      });
      window.electronAPI.getRecentProjects = vi.fn().mockResolvedValue([]);
      window.electronAPI.checkSpecManagerFiles = vi.fn().mockResolvedValue({
        commands: { allPresent: true, missing: [], present: [] },
        settings: { allPresent: true, missing: [], present: [] },
        allPresent: true,
      });
      window.electronAPI.checkRequiredPermissions = vi.fn().mockResolvedValue({
        allPresent: true,
        missing: [],
        present: [],
      });

      // Switch to new project
      await useProjectStore.getState().selectProject('/new-project');

      // Selected spec should be cleared (not pointing to old project's spec)
      const specState = useSpecStore.getState();
      expect(specState.selectedSpec).toBeNull();
      expect(specState.specDetail).toBeNull();
    });
  });

  describe('loadRecentProjects', () => {
    it('should load recent projects from config', async () => {
      const mockProjects = ['/project1', '/project2'];
      window.electronAPI.getRecentProjects = vi.fn().mockResolvedValue(mockProjects);

      await useProjectStore.getState().loadRecentProjects();

      const state = useProjectStore.getState();
      expect(state.recentProjects).toEqual(mockProjects);
    });
  });

  describe('clearProject', () => {
    it('should clear currentProject and validation', () => {
      // Set some state first
      useProjectStore.setState({
        currentProject: '/test/project',
        kiroValidation: { exists: true, hasSpecs: true, hasSteering: true },
      });

      useProjectStore.getState().clearProject();

      const state = useProjectStore.getState();
      expect(state.currentProject).toBeNull();
      expect(state.kiroValidation).toBeNull();
    });
  });

  describe('permissions check', () => {
    it('should check permissions after project selection', async () => {
      const mockValidation = { exists: true, hasSpecs: true, hasSteering: true };
      const mockPermissionsCheck = {
        allPresent: false,
        missing: ['Bash(task:*)'],
        present: ['Bash(git:*)', 'Bash(npm:*)'],
      };

      window.electronAPI.selectProject = vi.fn().mockResolvedValue({
        success: true,
        projectPath: '/test/project',
        kiroValidation: mockValidation,
        specs: [],
        bugs: [],
        specJsonMap: {},  // spec-metadata-ssot-refactor
      });
      window.electronAPI.getRecentProjects = vi.fn().mockResolvedValue([]);
      window.electronAPI.checkSpecManagerFiles = vi.fn().mockResolvedValue({
        commands: { allPresent: true, missing: [], present: [] },
        settings: { allPresent: true, missing: [], present: [] },
        allPresent: true,
      });
      window.electronAPI.checkRequiredPermissions = vi.fn().mockResolvedValue(mockPermissionsCheck);

      await useProjectStore.getState().selectProject('/test/project');

      const state = useProjectStore.getState();
      expect(state.permissionsCheck).toEqual(mockPermissionsCheck);
      expect(window.electronAPI.checkRequiredPermissions).toHaveBeenCalledWith('/test/project');
    });

    it('should set allPresent to true when all permissions exist', async () => {
      const mockValidation = { exists: true, hasSpecs: true, hasSteering: true };
      const mockPermissionsCheck = {
        allPresent: true,
        missing: [],
        present: ['Bash(task:*)', 'Bash(git:*)', 'Bash(npm:*)'],
      };

      window.electronAPI.selectProject = vi.fn().mockResolvedValue({
        success: true,
        projectPath: '/test/project',
        kiroValidation: mockValidation,
        specs: [],
        bugs: [],
        specJsonMap: {},  // spec-metadata-ssot-refactor
      });
      window.electronAPI.getRecentProjects = vi.fn().mockResolvedValue([]);
      window.electronAPI.checkSpecManagerFiles = vi.fn().mockResolvedValue({
        commands: { allPresent: true, missing: [], present: [] },
        settings: { allPresent: true, missing: [], present: [] },
        allPresent: true,
      });
      window.electronAPI.checkRequiredPermissions = vi.fn().mockResolvedValue(mockPermissionsCheck);

      await useProjectStore.getState().selectProject('/test/project');

      const state = useProjectStore.getState();
      expect(state.permissionsCheck?.allPresent).toBe(true);
      expect(state.permissionsCheck?.missing).toHaveLength(0);
    });

    it('should handle permissions check failure gracefully', async () => {
      const mockValidation = { exists: true, hasSpecs: true, hasSteering: true };

      window.electronAPI.selectProject = vi.fn().mockResolvedValue({
        success: true,
        projectPath: '/test/project',
        kiroValidation: mockValidation,
        specs: [],
        bugs: [],
        specJsonMap: {},  // spec-metadata-ssot-refactor
      });
      window.electronAPI.getRecentProjects = vi.fn().mockResolvedValue([]);
      window.electronAPI.checkSpecManagerFiles = vi.fn().mockResolvedValue({
        commands: { allPresent: true, missing: [], present: [] },
        settings: { allPresent: true, missing: [], present: [] },
        allPresent: true,
      });
      window.electronAPI.checkRequiredPermissions = vi.fn().mockRejectedValue(new Error('Check failed'));

      await useProjectStore.getState().selectProject('/test/project');

      const state = useProjectStore.getState();
      // Should still succeed project selection even if permissions check fails
      expect(state.currentProject).toBe('/test/project');
      // permissionsCheck should be null on error
      expect(state.permissionsCheck).toBeNull();
    });
  });

  // ============================================================
  // Profile Badge (header-profile-badge feature)
  // Requirements: 3.1, 3.2, 4.1, 4.2
  // ============================================================

  describe('profile management', () => {
    it('should have null installedProfile initially', () => {
      const state = useProjectStore.getState();
      expect(state.installedProfile).toBeNull();
    });

    it('should load profile after project selection', async () => {
      const mockProfile = { name: 'cc-sdd', installedAt: '2024-01-01T00:00:00Z' };
      const mockValidation = { exists: true, hasSpecs: true, hasSteering: true };

      window.electronAPI.selectProject = vi.fn().mockResolvedValue({
        success: true,
        projectPath: '/test/project',
        kiroValidation: mockValidation,
        specs: [],
        bugs: [],
        specJsonMap: {},
      });
      window.electronAPI.getRecentProjects = vi.fn().mockResolvedValue([]);
      window.electronAPI.checkSpecManagerFiles = vi.fn().mockResolvedValue({
        commands: { allPresent: true, missing: [], present: [] },
        settings: { allPresent: true, missing: [], present: [] },
        allPresent: true,
      });
      window.electronAPI.checkRequiredPermissions = vi.fn().mockResolvedValue({
        allPresent: true,
        missing: [],
        present: [],
      });
      window.electronAPI.loadProfile = vi.fn().mockResolvedValue(mockProfile);

      await useProjectStore.getState().selectProject('/test/project');

      const state = useProjectStore.getState();
      expect(state.installedProfile).toEqual(mockProfile);
      expect(window.electronAPI.loadProfile).toHaveBeenCalledWith('/test/project');
    });

    it('should set installedProfile to null when no profile is installed', async () => {
      const mockValidation = { exists: true, hasSpecs: true, hasSteering: true };

      window.electronAPI.selectProject = vi.fn().mockResolvedValue({
        success: true,
        projectPath: '/test/project',
        kiroValidation: mockValidation,
        specs: [],
        bugs: [],
        specJsonMap: {},
      });
      window.electronAPI.getRecentProjects = vi.fn().mockResolvedValue([]);
      window.electronAPI.checkSpecManagerFiles = vi.fn().mockResolvedValue({
        commands: { allPresent: true, missing: [], present: [] },
        settings: { allPresent: true, missing: [], present: [] },
        allPresent: true,
      });
      window.electronAPI.checkRequiredPermissions = vi.fn().mockResolvedValue({
        allPresent: true,
        missing: [],
        present: [],
      });
      window.electronAPI.loadProfile = vi.fn().mockResolvedValue(null);

      await useProjectStore.getState().selectProject('/test/project');

      const state = useProjectStore.getState();
      expect(state.installedProfile).toBeNull();
    });

    it('should clear profile when switching projects', async () => {
      // Set up initial profile
      useProjectStore.setState({
        currentProject: '/old-project',
        installedProfile: { name: 'spec-manager', installedAt: '2024-01-01' },
      });

      const mockValidation = { exists: true, hasSpecs: true, hasSteering: true };
      const newProfile = { name: 'cc-sdd-agent', installedAt: '2024-06-01' };

      window.electronAPI.selectProject = vi.fn().mockResolvedValue({
        success: true,
        projectPath: '/new-project',
        kiroValidation: mockValidation,
        specs: [],
        bugs: [],
        specJsonMap: {},
      });
      window.electronAPI.getRecentProjects = vi.fn().mockResolvedValue([]);
      window.electronAPI.checkSpecManagerFiles = vi.fn().mockResolvedValue({
        commands: { allPresent: true, missing: [], present: [] },
        settings: { allPresent: true, missing: [], present: [] },
        allPresent: true,
      });
      window.electronAPI.checkRequiredPermissions = vi.fn().mockResolvedValue({
        allPresent: true,
        missing: [],
        present: [],
      });
      window.electronAPI.loadProfile = vi.fn().mockResolvedValue(newProfile);

      await useProjectStore.getState().selectProject('/new-project');

      const state = useProjectStore.getState();
      expect(state.installedProfile).toEqual(newProfile);
    });

    it('should handle profile loading error gracefully', async () => {
      const mockValidation = { exists: true, hasSpecs: true, hasSteering: true };

      window.electronAPI.selectProject = vi.fn().mockResolvedValue({
        success: true,
        projectPath: '/test/project',
        kiroValidation: mockValidation,
        specs: [],
        bugs: [],
        specJsonMap: {},
      });
      window.electronAPI.getRecentProjects = vi.fn().mockResolvedValue([]);
      window.electronAPI.checkSpecManagerFiles = vi.fn().mockResolvedValue({
        commands: { allPresent: true, missing: [], present: [] },
        settings: { allPresent: true, missing: [], present: [] },
        allPresent: true,
      });
      window.electronAPI.checkRequiredPermissions = vi.fn().mockResolvedValue({
        allPresent: true,
        missing: [],
        present: [],
      });
      window.electronAPI.loadProfile = vi.fn().mockRejectedValue(new Error('Load failed'));

      await useProjectStore.getState().selectProject('/test/project');

      const state = useProjectStore.getState();
      // Should still succeed project selection even if profile load fails
      expect(state.currentProject).toBe('/test/project');
      expect(state.installedProfile).toBeNull();
    });

    it('should clear profile when clearing project', () => {
      useProjectStore.setState({
        currentProject: '/test/project',
        installedProfile: { name: 'cc-sdd', installedAt: '2024-01-01' },
      });

      useProjectStore.getState().clearProject();

      const state = useProjectStore.getState();
      expect(state.currentProject).toBeNull();
      expect(state.installedProfile).toBeNull();
    });
  });
});
