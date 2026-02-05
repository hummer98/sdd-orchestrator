/**
 * Project Store Tests
 * TDD: Testing project state management
 * Requirements: 1.1-1.5
 * Requirements (header-profile-badge): 3.1, 3.2, 4.1, 4.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useProjectStore } from './projectStore';
import { useSpecStore } from './specStore';
// bugs-view-unification Task 6.1: Use shared bugStore
import { useSharedBugStore, resetSharedBugStore } from '../../shared/stores/bugStore';

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
    // bugs-view-unification Task 6.1: Use shared bugStore
    resetSharedBugStore();
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
      // bugs-view-unification Task 6.1: Use shared bugStore
      expect(useSharedBugStore.getState().bugs).toEqual(mockBugs);
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

    it('should load skipPermissions setting from project config (Bug fix: skip-permissions-not-loaded)', async () => {
      // This test ensures skipPermissions is loaded as part of selectProject,
      // not as a separate call in App.tsx. This prevents the bug where
      // selecting a project from RecentProjects does not load skipPermissions.
      const { useAgentStore } = await import('./agentStore');

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
      // Additional mocks required by selectProject
      window.electronAPI.getRunningAgentCounts = vi.fn().mockResolvedValue({});
      window.electronAPI.onSpecsChanged = vi.fn().mockReturnValue(() => {});
      window.electronAPI.onBugsChanged = vi.fn().mockReturnValue(() => {});
      window.electronAPI.loadProfile = vi.fn().mockResolvedValue(null);
      window.electronAPI.checkSteeringFiles = vi.fn().mockResolvedValue({
        allPresent: true,
        missing: [],
        present: [],
      });
      // Mock loadSkipPermissions to return true for this project
      window.electronAPI.loadSkipPermissions = vi.fn().mockResolvedValue(true);

      // Ensure initial state is false
      useAgentStore.setState({ skipPermissions: false });

      await useProjectStore.getState().selectProject('/test/project');

      // Verify loadSkipPermissions was called with the project path
      expect(window.electronAPI.loadSkipPermissions).toHaveBeenCalledWith('/test/project');

      // Verify skipPermissions was set in agentStore
      expect(useAgentStore.getState().skipPermissions).toBe(true);
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

  // ============================================================
  // Release Files Check (steering-release-integration feature)
  // Requirements: 3.2, 3.4
  // ============================================================

  describe('release management', () => {
    it('should have null releaseCheck initially', () => {
      const state = useProjectStore.getState();
      expect(state.releaseCheck).toBeNull();
    });

    it('should have releaseGenerateLoading false initially', () => {
      const state = useProjectStore.getState();
      expect(state.releaseGenerateLoading).toBe(false);
    });

    it('should check release files and update state', async () => {
      const mockReleaseCheck = { releaseMdExists: true };
      window.electronAPI.checkReleaseMd = vi.fn().mockResolvedValue(mockReleaseCheck);

      await useProjectStore.getState().checkReleaseFiles('/test/project');

      expect(window.electronAPI.checkReleaseMd).toHaveBeenCalledWith('/test/project');
      expect(useProjectStore.getState().releaseCheck).toEqual(mockReleaseCheck);
    });

    it('should set releaseCheck to null on error', async () => {
      window.electronAPI.checkReleaseMd = vi.fn().mockRejectedValue(new Error('Check failed'));

      await useProjectStore.getState().checkReleaseFiles('/test/project');

      expect(useProjectStore.getState().releaseCheck).toBeNull();
    });

    it('should generate release.md and add agent to store', async () => {
      const { useAgentStore } = await import('./agentStore');
      const mockAgentInfo = {
        agentId: 'agent-123',
        specId: '',
        phase: 'steering-release',
        status: 'running',
      };

      // Setup project state
      useProjectStore.setState({ currentProject: '/test/project' });

      window.electronAPI.generateReleaseMd = vi.fn().mockResolvedValue(mockAgentInfo);
      const addAgentSpy = vi.spyOn(useAgentStore.getState(), 'addAgent');
      const selectForProjectAgentsSpy = vi.spyOn(useAgentStore.getState(), 'selectForProjectAgents');
      const selectAgentSpy = vi.spyOn(useAgentStore.getState(), 'selectAgent');

      await useProjectStore.getState().generateReleaseMd();

      expect(window.electronAPI.generateReleaseMd).toHaveBeenCalledWith('/test/project');
      expect(addAgentSpy).toHaveBeenCalledWith('', mockAgentInfo);
      expect(selectForProjectAgentsSpy).toHaveBeenCalled();
      expect(selectAgentSpy).toHaveBeenCalledWith('agent-123');
      expect(useProjectStore.getState().releaseGenerateLoading).toBe(false);
    });

    it('should not generate release.md when no project selected', async () => {
      useProjectStore.setState({ currentProject: null });
      window.electronAPI.generateReleaseMd = vi.fn();

      await useProjectStore.getState().generateReleaseMd();

      expect(window.electronAPI.generateReleaseMd).not.toHaveBeenCalled();
    });

    it('should handle generateReleaseMd error gracefully', async () => {
      useProjectStore.setState({ currentProject: '/test/project' });
      window.electronAPI.generateReleaseMd = vi.fn().mockRejectedValue(new Error('Generate failed'));

      await useProjectStore.getState().generateReleaseMd();

      // Should set loading to false even on error
      expect(useProjectStore.getState().releaseGenerateLoading).toBe(false);
    });
  });

  // ============================================================
  // jj Installation (jj-merge-support feature)
  // Task 12.5: ProjectStore への jj関連 state 追加
  // Requirements: 3.5, 4.1, 9.1, 9.2, 9.3, 9.4
  // ============================================================

  describe('jj installation management', () => {
    it('should have null jjCheck initially', () => {
      const state = useProjectStore.getState();
      expect(state.jjCheck).toBeNull();
    });

    it('should have jjInstallIgnored false initially', () => {
      const state = useProjectStore.getState();
      expect(state.jjInstallIgnored).toBe(false);
    });

    it('should have jjInstallLoading false initially', () => {
      const state = useProjectStore.getState();
      expect(state.jjInstallLoading).toBe(false);
    });

    it('should have jjInstallError null initially', () => {
      const state = useProjectStore.getState();
      expect(state.jjInstallError).toBeNull();
    });

    it('should check jj availability after project selection', async () => {
      const mockValidation = { exists: true, hasSpecs: true, hasSteering: true };
      const mockJjCheck = { name: 'jj', available: false, installGuidance: 'brew install jj' };

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
      window.electronAPI.checkJjAvailability = vi.fn().mockResolvedValue(mockJjCheck);
      window.electronAPI.loadSkipPermissions = vi.fn().mockResolvedValue({
        jjInstallIgnored: false,
      });

      await useProjectStore.getState().selectProject('/test/project');

      const state = useProjectStore.getState();
      expect(window.electronAPI.checkJjAvailability).toHaveBeenCalled();
      expect(state.jjCheck).toEqual(mockJjCheck);
    });

    it('should skip jj check when jjInstallIgnored is true', async () => {
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
      window.electronAPI.checkJjAvailability = vi.fn();
      window.electronAPI.loadSkipPermissions = vi.fn().mockResolvedValue({
        jjInstallIgnored: true,
      });

      await useProjectStore.getState().selectProject('/test/project');

      const state = useProjectStore.getState();
      expect(window.electronAPI.checkJjAvailability).not.toHaveBeenCalled();
      expect(state.jjCheck).toBeNull();
      expect(state.jjInstallIgnored).toBe(true);
    });

    it('should install jj via brew and re-check availability', async () => {
      const mockJjCheckBefore = { name: 'jj', available: false, installGuidance: 'brew install jj' };
      const mockJjCheckAfter = { name: 'jj', available: true, version: '0.10.0' };

      useProjectStore.setState({
        currentProject: '/test/project',
        jjCheck: mockJjCheckBefore,
      });

      window.electronAPI.installJj = vi.fn().mockResolvedValue({ success: true });
      window.electronAPI.checkJjAvailability = vi.fn().mockResolvedValue(mockJjCheckAfter);

      await useProjectStore.getState().installJj();

      expect(window.electronAPI.installJj).toHaveBeenCalled();
      expect(window.electronAPI.checkJjAvailability).toHaveBeenCalled();

      const state = useProjectStore.getState();
      expect(state.jjCheck).toEqual(mockJjCheckAfter);
      expect(state.jjInstallLoading).toBe(false);
      expect(state.jjInstallError).toBeNull();
    });

    it('should set loading state during jj installation', async () => {
      useProjectStore.setState({ currentProject: '/test/project' });

      let loadingDuringInstall = false;
      window.electronAPI.installJj = vi.fn().mockImplementation(async () => {
        loadingDuringInstall = useProjectStore.getState().jjInstallLoading;
        return { success: true };
      });
      window.electronAPI.checkJjAvailability = vi.fn().mockResolvedValue({
        name: 'jj',
        available: true,
        version: '0.10.0'
      });

      await useProjectStore.getState().installJj();

      expect(loadingDuringInstall).toBe(true);
      expect(useProjectStore.getState().jjInstallLoading).toBe(false);
    });

    it('should handle jj installation error', async () => {
      useProjectStore.setState({ currentProject: '/test/project' });

      window.electronAPI.installJj = vi.fn().mockResolvedValue({
        success: false,
        error: 'Homebrew not found'
      });

      await useProjectStore.getState().installJj();

      const state = useProjectStore.getState();
      expect(state.jjInstallError).toBe('Homebrew not found');
      expect(state.jjInstallLoading).toBe(false);
    });

    it('should ignore jj installation and update state', async () => {
      useProjectStore.setState({
        currentProject: '/test/project',
        jjInstallIgnored: false,
      });

      window.electronAPI.ignoreJjInstall = vi.fn().mockResolvedValue({ success: true });

      await useProjectStore.getState().ignoreJjInstall();

      expect(window.electronAPI.ignoreJjInstall).toHaveBeenCalledWith('/test/project', true);

      const state = useProjectStore.getState();
      expect(state.jjInstallIgnored).toBe(true);
    });

    it('should not install jj when no project selected', async () => {
      useProjectStore.setState({ currentProject: null });
      window.electronAPI.installJj = vi.fn();

      await useProjectStore.getState().installJj();

      expect(window.electronAPI.installJj).not.toHaveBeenCalled();
    });

    it('should not ignore jj install when no project selected', async () => {
      useProjectStore.setState({ currentProject: null });
      window.electronAPI.ignoreJjInstall = vi.fn();

      await useProjectStore.getState().ignoreJjInstall();

      expect(window.electronAPI.ignoreJjInstall).not.toHaveBeenCalled();
    });

    it('should clear jj state when clearing project', () => {
      useProjectStore.setState({
        currentProject: '/test/project',
        jjCheck: { name: 'jj', available: true, version: '0.10.0' },
        jjInstallIgnored: true,
        jjInstallLoading: false,
        jjInstallError: 'some error',
      });

      useProjectStore.getState().clearProject();

      const state = useProjectStore.getState();
      expect(state.jjCheck).toBeNull();
      expect(state.jjInstallIgnored).toBe(false);
      expect(state.jjInstallLoading).toBe(false);
      expect(state.jjInstallError).toBeNull();
    });
  });

  // ============================================================
  // Remote UI Auto Start (remote-ui-auto-start feature)
  // Task 3.1: Auto-start logic in selectProject
  // Requirements: 2.1, 2.2, 2.3
  // ============================================================

  describe('remote UI auto-start', () => {
    it('should auto-start remote server when remoteUiAutoStart is true and server not running', async () => {
      const { useRemoteAccessStore } = await import('./remoteAccessStore');

      // Reset store state
      useRemoteAccessStore.setState({ isRunning: false });

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
      window.electronAPI.loadSkipPermissions = vi.fn().mockResolvedValue(false);
      window.electronAPI.loadRemoteUiAutoStart = vi.fn().mockResolvedValue(true);

      // Mock remoteAccessStore.startServer
      const startServerSpy = vi.spyOn(useRemoteAccessStore.getState(), 'startServer').mockResolvedValue();

      await useProjectStore.getState().selectProject('/test/project');

      expect(window.electronAPI.loadRemoteUiAutoStart).toHaveBeenCalledWith('/test/project');
      expect(startServerSpy).toHaveBeenCalled();
    });

    it('should not auto-start remote server when remoteUiAutoStart is false', async () => {
      const { useRemoteAccessStore } = await import('./remoteAccessStore');

      // Reset store state
      useRemoteAccessStore.setState({ isRunning: false });

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
      window.electronAPI.loadSkipPermissions = vi.fn().mockResolvedValue(false);
      window.electronAPI.loadRemoteUiAutoStart = vi.fn().mockResolvedValue(false);

      const startServerSpy = vi.spyOn(useRemoteAccessStore.getState(), 'startServer').mockResolvedValue();

      await useProjectStore.getState().selectProject('/test/project');

      expect(window.electronAPI.loadRemoteUiAutoStart).toHaveBeenCalledWith('/test/project');
      expect(startServerSpy).not.toHaveBeenCalled();
    });

    it('should not auto-start remote server when server is already running (double start prevention)', async () => {
      const { useRemoteAccessStore } = await import('./remoteAccessStore');

      // Server already running
      useRemoteAccessStore.setState({ isRunning: true });

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
      window.electronAPI.loadSkipPermissions = vi.fn().mockResolvedValue(false);
      window.electronAPI.loadRemoteUiAutoStart = vi.fn().mockResolvedValue(true);

      const startServerSpy = vi.spyOn(useRemoteAccessStore.getState(), 'startServer').mockResolvedValue();

      await useProjectStore.getState().selectProject('/test/project');

      expect(window.electronAPI.loadRemoteUiAutoStart).toHaveBeenCalledWith('/test/project');
      expect(startServerSpy).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // startup-project-selection-fix: applySelectProjectResult
  // Task 3.1: Unified result application for startup broadcast
  // Requirements: 2.1, 2.4
  // ============================================================

  describe('applySelectProjectResult', () => {
    it('should expose applySelectProjectResult action', () => {
      expect(typeof useProjectStore.getState().applySelectProjectResult).toBe('function');
    });

    it('should update store on successful result', async () => {
      const mockResult = {
        success: true,
        projectPath: '/test/project',
        kiroValidation: { exists: true, hasSpecs: true, hasSteering: true },
        specs: [{ name: 'test-spec', path: '/test/spec' }],
        bugs: [{ name: 'test-bug', path: '/test/bug', phase: 'reported', updatedAt: '2024-01-01' }],
        specJsonMap: {
          'test-spec': {
            feature_name: 'test-spec',
            phase: 'design-generated',
            updated_at: '2024-01-01T00:00:00Z',
            approvals: {
              requirements: { generated: true, approved: true },
              design: { generated: true, approved: false },
              tasks: { generated: false, approved: false },
            },
          },
        },
      };

      await useProjectStore.getState().applySelectProjectResult(mockResult);

      const state = useProjectStore.getState();
      expect(state.currentProject).toBe('/test/project');
      expect(state.kiroValidation).toEqual(mockResult.kiroValidation);
      expect(state.lastSelectResult).toEqual(mockResult);

      // Verify specs/bugs are synced to their stores
      expect(useSpecStore.getState().specs).toEqual(mockResult.specs);
      expect(useSharedBugStore.getState().bugs).toEqual(mockResult.bugs);

      // Verify specJsonMap is synced
      const specJsonMap = useSpecStore.getState().specJsonMap;
      expect(specJsonMap.get('test-spec')).toEqual(mockResult.specJsonMap['test-spec']);
    });

    it('should set error state on failed result', async () => {
      const mockResult = {
        success: false,
        projectPath: '/invalid/path',
        kiroValidation: { exists: false, hasSpecs: false, hasSteering: false },
        specs: [],
        bugs: [],
        specJsonMap: {},
        error: { type: 'PATH_NOT_EXISTS' as const, path: '/invalid/path' },
      };

      await useProjectStore.getState().applySelectProjectResult(mockResult);

      const state = useProjectStore.getState();
      expect(state.error).toBeTruthy();
      expect(state.currentProject).toBeNull();
    });

    it('should clear loading state after application', async () => {
      const mockResult = {
        success: true,
        projectPath: '/test/project',
        kiroValidation: { exists: true, hasSpecs: true, hasSteering: true },
        specs: [],
        bugs: [],
        specJsonMap: {},
      };

      // Set loading state before
      useProjectStore.setState({ isLoading: true });

      await useProjectStore.getState().applySelectProjectResult(mockResult);

      expect(useProjectStore.getState().isLoading).toBe(false);
    });
  });

  // ============================================================
  // startup-project-selection-fix: selectProject refactoring
  // Task 3.2: Verify selectProject uses applySelectProjectResult
  // Requirements: 2.3, 3.3
  // ============================================================

  describe('selectProject with applySelectProjectResult', () => {
    it('should call applySelectProjectResult internally for store updates', async () => {
      const mockValidation = { exists: true, hasSpecs: true, hasSteering: true };
      const mockSpecs = [{ name: 'test-spec', path: '/test/spec' }];
      const mockSpecJsonMap = {
        'test-spec': {
          feature_name: 'test-spec',
          phase: 'design-generated',
          updated_at: '2024-01-01T00:00:00Z',
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: true, approved: false },
            tasks: { generated: false, approved: false },
          },
        },
      };

      window.electronAPI.selectProject = vi.fn().mockResolvedValue({
        success: true,
        projectPath: '/test/project',
        kiroValidation: mockValidation,
        specs: mockSpecs,
        bugs: [],
        specJsonMap: mockSpecJsonMap,
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

      // Spy on applySelectProjectResult
      const applyResultSpy = vi.spyOn(useProjectStore.getState(), 'applySelectProjectResult');

      await useProjectStore.getState().selectProject('/test/project');

      // Verify applySelectProjectResult was called with the IPC result
      expect(applyResultSpy).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        projectPath: '/test/project',
      }));

      // Verify store state is correct (same behavior as before)
      const state = useProjectStore.getState();
      expect(state.currentProject).toBe('/test/project');
      expect(state.kiroValidation).toEqual(mockValidation);
      expect(useSpecStore.getState().specs).toEqual(mockSpecs);
    });
  });
});
