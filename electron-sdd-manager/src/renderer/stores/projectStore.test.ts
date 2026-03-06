/**
 * Project Store Tests
 * TDD: Testing project state management
 * Requirements: 1.1-1.5
 * Requirements (header-profile-badge): 3.1, 3.2, 4.1, 4.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// trpc-full-migration Task 3.2: Mock tRPC vanilla client for config operations
// trpc-full-migration Task 4.3: Added project mock for selectProject
const mockVanillaClient = {
  config: {
    getRecentProjects: { query: vi.fn().mockResolvedValue([]) },
    loadProfile: { query: vi.fn().mockResolvedValue(null) },
    loadRemoteUiAutoStart: { query: vi.fn().mockResolvedValue(false) },
    loadSkipPermissions: { query: vi.fn().mockResolvedValue(false) },
    loadProjectDefaults: { query: vi.fn().mockResolvedValue(null) },
    addRecentProject: { mutate: vi.fn() },
  },
  project: {
    selectProject: { mutate: vi.fn() },
    showOpenDialog: { mutate: vi.fn() },
  },
  // trpc-full-migration Task 5.3: Mock spec procedures for steering/release/verification
  spec: {
    checkSteeringFiles: { query: vi.fn().mockResolvedValue({ verificationMdExists: false }) },
    checkReleaseMd: { query: vi.fn().mockResolvedValue({ releaseMdExists: false }) },
    generateVerificationMd: { mutate: vi.fn() },
    generateReleaseMd: { mutate: vi.fn() },
  },
  // trpc-full-migration Task 6.2: Mock agent procedures
  agent: {
    getAllAgents: { query: vi.fn().mockResolvedValue({}) },
    getRunningAgentCounts: { query: vi.fn().mockResolvedValue({}) },
    getLogs: { query: vi.fn().mockResolvedValue([]) },
  },
  // trpc-full-migration Task 10.6: Mock install procedures
  install: {
    checkSpecManagerFiles: { query: vi.fn().mockResolvedValue({ commands: { allPresent: true, missing: [], present: [] }, settings: { allPresent: true, missing: [], present: [] }, allPresent: true }) },
    installSpecManagerCommands: { mutate: vi.fn() },
    installSpecManagerSettings: { mutate: vi.fn() },
    installSpecManagerAll: { mutate: vi.fn() },
    forceReinstallSpecManagerAll: { mutate: vi.fn() },
    checkJjAvailability: { query: vi.fn().mockResolvedValue({ name: 'jj', available: false }) },
    installJj: { mutate: vi.fn().mockResolvedValue({ success: true }) },
    ignoreJjInstall: { mutate: vi.fn().mockResolvedValue({ success: true }) },
  },
  // trpc-full-migration Task 10.6: Mock misc procedures
  misc: {
    checkRequiredPermissions: { query: vi.fn().mockResolvedValue({ allPresent: true, missing: [], present: [] }) },
    addShellPermissions: { mutate: vi.fn() },
    addMissingPermissions: { mutate: vi.fn() },
  },
  // trpc-full-migration Task 11.4: Mock events namespace for tRPC Subscriptions
  // (specWatcherService.startWatching and bugStore.startWatching use these)
  events: {
    onSpecsChanged: { subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }) },
    onBugsChanged: { subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }) },
  },
};
vi.mock('../../shared/trpc/vanillaClient', () => ({
  getVanillaClient: () => mockVanillaClient,
}));

import { useProjectStore } from './projectStore';
import { useSpecStore } from './specStore';
// bugStore removed (github-issue-integration)

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
    // bugStore removed (github-issue-integration)
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

      mockVanillaClient.project.selectProject.mutate.mockResolvedValue({
        success: true,
        projectPath: '/test/project',
        kiroValidation: mockValidation,
        specs: mockSpecs,
        bugs: mockBugs,
        specJsonMap: mockSpecJsonMap,  // spec-metadata-ssot-refactor
      });
      mockVanillaClient.config.getRecentProjects.query.mockResolvedValue([]);
      mockVanillaClient.install.checkSpecManagerFiles.query.mockResolvedValue({
        commands: { allPresent: true, missing: [], present: [] },
        settings: { allPresent: true, missing: [], present: [] },
        allPresent: true,
      });
      mockVanillaClient.misc.checkRequiredPermissions.query.mockResolvedValue({
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
      // bugStore removed (github-issue-integration)
      // spec-metadata-ssot-refactor: Verify specJsonMap is set from IPC result
      const specJsonMap = useSpecStore.getState().specJsonMap;
      expect(specJsonMap.get('test-spec')).toEqual(mockSpecJson);
    });

    it('should set isLoading during selection', async () => {
      mockVanillaClient.project.selectProject.mutate.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          success: true,
          projectPath: '/test/project',
          kiroValidation: { exists: true, hasSpecs: true, hasSteering: true },
          specs: [],
          bugs: [],
          specJsonMap: {},  // spec-metadata-ssot-refactor
        }), 100))
      );
      mockVanillaClient.config.getRecentProjects.query.mockResolvedValue([]);
      mockVanillaClient.install.checkSpecManagerFiles.query.mockResolvedValue({
        commands: { allPresent: true, missing: [], present: [] },
        settings: { allPresent: true, missing: [], present: [] },
        allPresent: true,
      });
      mockVanillaClient.misc.checkRequiredPermissions.query.mockResolvedValue({
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
      mockVanillaClient.project.selectProject.mutate.mockResolvedValue({
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
      mockVanillaClient.project.selectProject.mutate.mockResolvedValue({
        success: true,
        projectPath: '/new-project',
        kiroValidation: mockValidation,
        specs: [{ name: 'new-spec', path: '/new-project/.kiro/specs/new-spec' }],
        bugs: [],
        specJsonMap: {},
      });
      mockVanillaClient.config.getRecentProjects.query.mockResolvedValue([]);
      mockVanillaClient.install.checkSpecManagerFiles.query.mockResolvedValue({
        commands: { allPresent: true, missing: [], present: [] },
        settings: { allPresent: true, missing: [], present: [] },
        allPresent: true,
      });
      mockVanillaClient.misc.checkRequiredPermissions.query.mockResolvedValue({
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
      mockVanillaClient.project.selectProject.mutate.mockResolvedValue({
        success: true,
        projectPath: '/test/project',
        kiroValidation: mockValidation,
        specs: [],
        bugs: [],
        specJsonMap: {},
      });
      mockVanillaClient.config.getRecentProjects.query.mockResolvedValue([]);
      mockVanillaClient.install.checkSpecManagerFiles.query.mockResolvedValue({
        commands: { allPresent: true, missing: [], present: [] },
        settings: { allPresent: true, missing: [], present: [] },
        allPresent: true,
      });
      mockVanillaClient.misc.checkRequiredPermissions.query.mockResolvedValue({
        allPresent: true,
        missing: [],
        present: [],
      });
      // trpc-full-migration Task 11.4: Event listeners now use tRPC Subscription (Task 9.2)
      mockVanillaClient.config.loadProfile.query.mockResolvedValue(null);
      // trpc-full-migration Task 5.3: checkSteeringFiles via tRPC
      mockVanillaClient.spec.checkSteeringFiles.query.mockResolvedValue({
        verificationMdExists: true,
      });
      // Mock loadSkipPermissions to return true for this project
      mockVanillaClient.config.loadSkipPermissions.query.mockResolvedValue(true);

      // agent-facade-action-only: skipPermissions is on SSOT (useSharedAgentStore)
      const { useSharedAgentStore } = await import('@shared/stores/agentStore');
      useSharedAgentStore.setState({ skipPermissions: false });

      await useProjectStore.getState().selectProject('/test/project');

      // Verify loadSkipPermissions was called with the project path
      expect(mockVanillaClient.config.loadSkipPermissions.query).toHaveBeenCalledWith({ projectPath: '/test/project' });

      // Verify skipPermissions was set in SSOT
      expect(useSharedAgentStore.getState().skipPermissions).toBe(true);
    });
  });

  describe('loadRecentProjects', () => {
    it('should load recent projects from config', async () => {
      const mockProjects = ['/project1', '/project2'];
      mockVanillaClient.config.getRecentProjects.query.mockResolvedValue(mockProjects);

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

      mockVanillaClient.project.selectProject.mutate.mockResolvedValue({
        success: true,
        projectPath: '/test/project',
        kiroValidation: mockValidation,
        specs: [],
        bugs: [],
        specJsonMap: {},  // spec-metadata-ssot-refactor
      });
      mockVanillaClient.config.getRecentProjects.query.mockResolvedValue([]);
      mockVanillaClient.install.checkSpecManagerFiles.query.mockResolvedValue({
        commands: { allPresent: true, missing: [], present: [] },
        settings: { allPresent: true, missing: [], present: [] },
        allPresent: true,
      });
      mockVanillaClient.misc.checkRequiredPermissions.query.mockResolvedValue(mockPermissionsCheck);

      await useProjectStore.getState().selectProject('/test/project');

      const state = useProjectStore.getState();
      expect(state.permissionsCheck).toEqual(mockPermissionsCheck);
      expect(mockVanillaClient.misc.checkRequiredPermissions.query).toHaveBeenCalledWith({ projectPath: '/test/project' });
    });

    it('should set allPresent to true when all permissions exist', async () => {
      const mockValidation = { exists: true, hasSpecs: true, hasSteering: true };
      const mockPermissionsCheck = {
        allPresent: true,
        missing: [],
        present: ['Bash(task:*)', 'Bash(git:*)', 'Bash(npm:*)'],
      };

      mockVanillaClient.project.selectProject.mutate.mockResolvedValue({
        success: true,
        projectPath: '/test/project',
        kiroValidation: mockValidation,
        specs: [],
        bugs: [],
        specJsonMap: {},  // spec-metadata-ssot-refactor
      });
      mockVanillaClient.config.getRecentProjects.query.mockResolvedValue([]);
      mockVanillaClient.install.checkSpecManagerFiles.query.mockResolvedValue({
        commands: { allPresent: true, missing: [], present: [] },
        settings: { allPresent: true, missing: [], present: [] },
        allPresent: true,
      });
      mockVanillaClient.misc.checkRequiredPermissions.query.mockResolvedValue(mockPermissionsCheck);

      await useProjectStore.getState().selectProject('/test/project');

      const state = useProjectStore.getState();
      expect(state.permissionsCheck?.allPresent).toBe(true);
      expect(state.permissionsCheck?.missing).toHaveLength(0);
    });

    it('should handle permissions check failure gracefully', async () => {
      const mockValidation = { exists: true, hasSpecs: true, hasSteering: true };

      mockVanillaClient.project.selectProject.mutate.mockResolvedValue({
        success: true,
        projectPath: '/test/project',
        kiroValidation: mockValidation,
        specs: [],
        bugs: [],
        specJsonMap: {},  // spec-metadata-ssot-refactor
      });
      mockVanillaClient.config.getRecentProjects.query.mockResolvedValue([]);
      mockVanillaClient.install.checkSpecManagerFiles.query.mockResolvedValue({
        commands: { allPresent: true, missing: [], present: [] },
        settings: { allPresent: true, missing: [], present: [] },
        allPresent: true,
      });
      mockVanillaClient.misc.checkRequiredPermissions.query.mockRejectedValue(new Error('Check failed'));

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

      mockVanillaClient.project.selectProject.mutate.mockResolvedValue({
        success: true,
        projectPath: '/test/project',
        kiroValidation: mockValidation,
        specs: [],
        bugs: [],
        specJsonMap: {},
      });
      mockVanillaClient.config.getRecentProjects.query.mockResolvedValue([]);
      mockVanillaClient.install.checkSpecManagerFiles.query.mockResolvedValue({
        commands: { allPresent: true, missing: [], present: [] },
        settings: { allPresent: true, missing: [], present: [] },
        allPresent: true,
      });
      mockVanillaClient.misc.checkRequiredPermissions.query.mockResolvedValue({
        allPresent: true,
        missing: [],
        present: [],
      });
      mockVanillaClient.config.loadProfile.query.mockResolvedValue(mockProfile);

      await useProjectStore.getState().selectProject('/test/project');

      const state = useProjectStore.getState();
      expect(state.installedProfile).toEqual(mockProfile);
      expect(mockVanillaClient.config.loadProfile.query).toHaveBeenCalledWith({ projectPath: '/test/project' });
    });

    it('should set installedProfile to null when no profile is installed', async () => {
      const mockValidation = { exists: true, hasSpecs: true, hasSteering: true };

      mockVanillaClient.project.selectProject.mutate.mockResolvedValue({
        success: true,
        projectPath: '/test/project',
        kiroValidation: mockValidation,
        specs: [],
        bugs: [],
        specJsonMap: {},
      });
      mockVanillaClient.config.getRecentProjects.query.mockResolvedValue([]);
      mockVanillaClient.install.checkSpecManagerFiles.query.mockResolvedValue({
        commands: { allPresent: true, missing: [], present: [] },
        settings: { allPresent: true, missing: [], present: [] },
        allPresent: true,
      });
      mockVanillaClient.misc.checkRequiredPermissions.query.mockResolvedValue({
        allPresent: true,
        missing: [],
        present: [],
      });
      mockVanillaClient.config.loadProfile.query.mockResolvedValue(null);

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

      mockVanillaClient.project.selectProject.mutate.mockResolvedValue({
        success: true,
        projectPath: '/new-project',
        kiroValidation: mockValidation,
        specs: [],
        bugs: [],
        specJsonMap: {},
      });
      mockVanillaClient.config.getRecentProjects.query.mockResolvedValue([]);
      mockVanillaClient.install.checkSpecManagerFiles.query.mockResolvedValue({
        commands: { allPresent: true, missing: [], present: [] },
        settings: { allPresent: true, missing: [], present: [] },
        allPresent: true,
      });
      mockVanillaClient.misc.checkRequiredPermissions.query.mockResolvedValue({
        allPresent: true,
        missing: [],
        present: [],
      });
      mockVanillaClient.config.loadProfile.query.mockResolvedValue(newProfile);

      await useProjectStore.getState().selectProject('/new-project');

      const state = useProjectStore.getState();
      expect(state.installedProfile).toEqual(newProfile);
    });

    it('should handle profile loading error gracefully', async () => {
      const mockValidation = { exists: true, hasSpecs: true, hasSteering: true };

      mockVanillaClient.project.selectProject.mutate.mockResolvedValue({
        success: true,
        projectPath: '/test/project',
        kiroValidation: mockValidation,
        specs: [],
        bugs: [],
        specJsonMap: {},
      });
      mockVanillaClient.config.getRecentProjects.query.mockResolvedValue([]);
      mockVanillaClient.install.checkSpecManagerFiles.query.mockResolvedValue({
        commands: { allPresent: true, missing: [], present: [] },
        settings: { allPresent: true, missing: [], present: [] },
        allPresent: true,
      });
      mockVanillaClient.misc.checkRequiredPermissions.query.mockResolvedValue({
        allPresent: true,
        missing: [],
        present: [],
      });
      mockVanillaClient.config.loadProfile.query.mockRejectedValue(new Error('Load failed'));

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
      // trpc-full-migration Task 5.3: checkReleaseMd via tRPC
      mockVanillaClient.spec.checkReleaseMd.query.mockResolvedValue(mockReleaseCheck);

      await useProjectStore.getState().checkReleaseFiles('/test/project');

      expect(mockVanillaClient.spec.checkReleaseMd.query).toHaveBeenCalledWith({ projectPath: '/test/project' });
      expect(useProjectStore.getState().releaseCheck).toEqual(mockReleaseCheck);
    });

    it('should set releaseCheck to null on error', async () => {
      // trpc-full-migration Task 5.3: checkReleaseMd via tRPC
      mockVanillaClient.spec.checkReleaseMd.query.mockRejectedValue(new Error('Check failed'));

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

      // trpc-full-migration Task 5.3: generateReleaseMd via tRPC
      mockVanillaClient.spec.generateReleaseMd.mutate.mockResolvedValue(mockAgentInfo);
      const addAgentSpy = vi.spyOn(useAgentStore.getState(), 'addAgent');
      const selectForProjectAgentsSpy = vi.spyOn(useAgentStore.getState(), 'selectForProjectAgents');
      const selectAgentSpy = vi.spyOn(useAgentStore.getState(), 'selectAgent');

      await useProjectStore.getState().generateReleaseMd();

      expect(mockVanillaClient.spec.generateReleaseMd.mutate).toHaveBeenCalledWith({ projectPath: '/test/project' });
      expect(addAgentSpy).toHaveBeenCalledWith('', mockAgentInfo);
      expect(selectForProjectAgentsSpy).toHaveBeenCalled();
      expect(selectAgentSpy).toHaveBeenCalledWith('agent-123');
      expect(useProjectStore.getState().releaseGenerateLoading).toBe(false);
    });

    it('should not generate release.md when no project selected', async () => {
      useProjectStore.setState({ currentProject: null });

      await useProjectStore.getState().generateReleaseMd();

      // trpc-full-migration Task 5.3: generateReleaseMd via tRPC
      expect(mockVanillaClient.spec.generateReleaseMd.mutate).not.toHaveBeenCalled();
    });

    it('should handle generateReleaseMd error gracefully', async () => {
      useProjectStore.setState({ currentProject: '/test/project' });
      // trpc-full-migration Task 5.3: generateReleaseMd via tRPC
      mockVanillaClient.spec.generateReleaseMd.mutate.mockRejectedValue(new Error('Generate failed'));

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

      mockVanillaClient.project.selectProject.mutate.mockResolvedValue({
        success: true,
        projectPath: '/test/project',
        kiroValidation: mockValidation,
        specs: [],
        bugs: [],
        specJsonMap: {},
      });
      mockVanillaClient.config.getRecentProjects.query.mockResolvedValue([]);
      mockVanillaClient.install.checkSpecManagerFiles.query.mockResolvedValue({
        commands: { allPresent: true, missing: [], present: [] },
        settings: { allPresent: true, missing: [], present: [] },
        allPresent: true,
      });
      mockVanillaClient.misc.checkRequiredPermissions.query.mockResolvedValue({
        allPresent: true,
        missing: [],
        present: [],
      });
      mockVanillaClient.install.checkJjAvailability.query.mockResolvedValue(mockJjCheck);
      mockVanillaClient.config.loadSkipPermissions.query.mockResolvedValue({
        jjInstallIgnored: false,
      });

      await useProjectStore.getState().selectProject('/test/project');

      const state = useProjectStore.getState();
      expect(mockVanillaClient.install.checkJjAvailability.query).toHaveBeenCalled();
      expect(state.jjCheck).toEqual(mockJjCheck);
    });

    it('should skip jj check when jjInstallIgnored is true', async () => {
      const mockValidation = { exists: true, hasSpecs: true, hasSteering: true };

      mockVanillaClient.project.selectProject.mutate.mockResolvedValue({
        success: true,
        projectPath: '/test/project',
        kiroValidation: mockValidation,
        specs: [],
        bugs: [],
        specJsonMap: {},
      });
      mockVanillaClient.config.getRecentProjects.query.mockResolvedValue([]);
      mockVanillaClient.install.checkSpecManagerFiles.query.mockResolvedValue({
        commands: { allPresent: true, missing: [], present: [] },
        settings: { allPresent: true, missing: [], present: [] },
        allPresent: true,
      });
      mockVanillaClient.misc.checkRequiredPermissions.query.mockResolvedValue({
        allPresent: true,
        missing: [],
        present: [],
      });
      mockVanillaClient.install.checkJjAvailability.query.mockResolvedValue({ name: 'jj', available: false });
      mockVanillaClient.config.loadSkipPermissions.query.mockResolvedValue({
        jjInstallIgnored: true,
      });

      await useProjectStore.getState().selectProject('/test/project');

      const state = useProjectStore.getState();
      // checkJjAvailability should not be called when jjInstallIgnored is true
      expect(mockVanillaClient.install.checkJjAvailability.query).not.toHaveBeenCalled();
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

      mockVanillaClient.install.installJj.mutate.mockResolvedValue({ success: true });
      mockVanillaClient.install.checkJjAvailability.query.mockResolvedValue(mockJjCheckAfter);

      await useProjectStore.getState().installJj();

      expect(mockVanillaClient.install.installJj.mutate).toHaveBeenCalled();
      expect(mockVanillaClient.install.checkJjAvailability.query).toHaveBeenCalled();

      const state = useProjectStore.getState();
      expect(state.jjCheck).toEqual(mockJjCheckAfter);
      expect(state.jjInstallLoading).toBe(false);
      expect(state.jjInstallError).toBeNull();
    });

    it('should set loading state during jj installation', async () => {
      useProjectStore.setState({ currentProject: '/test/project' });

      let loadingDuringInstall = false;
      mockVanillaClient.install.installJj.mutate.mockImplementation(async () => {
        loadingDuringInstall = useProjectStore.getState().jjInstallLoading;
        return { success: true };
      });
      mockVanillaClient.install.checkJjAvailability.query.mockResolvedValue({
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

      mockVanillaClient.install.installJj.mutate.mockResolvedValue({
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

      mockVanillaClient.install.ignoreJjInstall.mutate.mockResolvedValue({ success: true });

      await useProjectStore.getState().ignoreJjInstall();

      expect(mockVanillaClient.install.ignoreJjInstall.mutate).toHaveBeenCalledWith({ projectPath: '/test/project', ignored: true });

      const state = useProjectStore.getState();
      expect(state.jjInstallIgnored).toBe(true);
    });

    it('should not install jj when no project selected', async () => {
      useProjectStore.setState({ currentProject: null });

      await useProjectStore.getState().installJj();

      expect(mockVanillaClient.install.installJj.mutate).not.toHaveBeenCalled();
    });

    it('should not ignore jj install when no project selected', async () => {
      useProjectStore.setState({ currentProject: null });

      await useProjectStore.getState().ignoreJjInstall();

      expect(mockVanillaClient.install.ignoreJjInstall.mutate).not.toHaveBeenCalled();
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

      mockVanillaClient.project.selectProject.mutate.mockResolvedValue({
        success: true,
        projectPath: '/test/project',
        kiroValidation: mockValidation,
        specs: [],
        bugs: [],
        specJsonMap: {},
      });
      mockVanillaClient.config.getRecentProjects.query.mockResolvedValue([]);
      mockVanillaClient.install.checkSpecManagerFiles.query.mockResolvedValue({
        commands: { allPresent: true, missing: [], present: [] },
        settings: { allPresent: true, missing: [], present: [] },
        allPresent: true,
      });
      mockVanillaClient.misc.checkRequiredPermissions.query.mockResolvedValue({
        allPresent: true,
        missing: [],
        present: [],
      });
      mockVanillaClient.config.loadSkipPermissions.query.mockResolvedValue(false);
      mockVanillaClient.config.loadRemoteUiAutoStart.query.mockResolvedValue(true);

      // Mock remoteAccessStore.startServer
      const startServerSpy = vi.spyOn(useRemoteAccessStore.getState(), 'startServer').mockResolvedValue();

      await useProjectStore.getState().selectProject('/test/project');

      expect(mockVanillaClient.config.loadRemoteUiAutoStart.query).toHaveBeenCalledWith({ projectPath: '/test/project' });
      expect(startServerSpy).toHaveBeenCalled();
    });

    it('should not auto-start remote server when remoteUiAutoStart is false', async () => {
      const { useRemoteAccessStore } = await import('./remoteAccessStore');

      // Reset store state
      useRemoteAccessStore.setState({ isRunning: false });

      const mockValidation = { exists: true, hasSpecs: true, hasSteering: true };

      mockVanillaClient.project.selectProject.mutate.mockResolvedValue({
        success: true,
        projectPath: '/test/project',
        kiroValidation: mockValidation,
        specs: [],
        bugs: [],
        specJsonMap: {},
      });
      mockVanillaClient.config.getRecentProjects.query.mockResolvedValue([]);
      mockVanillaClient.install.checkSpecManagerFiles.query.mockResolvedValue({
        commands: { allPresent: true, missing: [], present: [] },
        settings: { allPresent: true, missing: [], present: [] },
        allPresent: true,
      });
      mockVanillaClient.misc.checkRequiredPermissions.query.mockResolvedValue({
        allPresent: true,
        missing: [],
        present: [],
      });
      mockVanillaClient.config.loadSkipPermissions.query.mockResolvedValue(false);
      mockVanillaClient.config.loadRemoteUiAutoStart.query.mockResolvedValue(false);

      const startServerSpy = vi.spyOn(useRemoteAccessStore.getState(), 'startServer').mockResolvedValue();

      await useProjectStore.getState().selectProject('/test/project');

      expect(mockVanillaClient.config.loadRemoteUiAutoStart.query).toHaveBeenCalledWith({ projectPath: '/test/project' });
      expect(startServerSpy).not.toHaveBeenCalled();
    });

    it('should not auto-start remote server when server is already running (double start prevention)', async () => {
      const { useRemoteAccessStore } = await import('./remoteAccessStore');

      // Server already running
      useRemoteAccessStore.setState({ isRunning: true });

      const mockValidation = { exists: true, hasSpecs: true, hasSteering: true };

      mockVanillaClient.project.selectProject.mutate.mockResolvedValue({
        success: true,
        projectPath: '/test/project',
        kiroValidation: mockValidation,
        specs: [],
        bugs: [],
        specJsonMap: {},
      });
      mockVanillaClient.config.getRecentProjects.query.mockResolvedValue([]);
      mockVanillaClient.install.checkSpecManagerFiles.query.mockResolvedValue({
        commands: { allPresent: true, missing: [], present: [] },
        settings: { allPresent: true, missing: [], present: [] },
        allPresent: true,
      });
      mockVanillaClient.misc.checkRequiredPermissions.query.mockResolvedValue({
        allPresent: true,
        missing: [],
        present: [],
      });
      mockVanillaClient.config.loadSkipPermissions.query.mockResolvedValue(false);
      mockVanillaClient.config.loadRemoteUiAutoStart.query.mockResolvedValue(true);

      const startServerSpy = vi.spyOn(useRemoteAccessStore.getState(), 'startServer').mockResolvedValue();

      await useProjectStore.getState().selectProject('/test/project');

      expect(mockVanillaClient.config.loadRemoteUiAutoStart.query).toHaveBeenCalledWith({ projectPath: '/test/project' });
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
      // bugStore removed (github-issue-integration)

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

      mockVanillaClient.project.selectProject.mutate.mockResolvedValue({
        success: true,
        projectPath: '/test/project',
        kiroValidation: mockValidation,
        specs: mockSpecs,
        bugs: [],
        specJsonMap: mockSpecJsonMap,
      });
      mockVanillaClient.config.getRecentProjects.query.mockResolvedValue([]);
      mockVanillaClient.install.checkSpecManagerFiles.query.mockResolvedValue({
        commands: { allPresent: true, missing: [], present: [] },
        settings: { allPresent: true, missing: [], present: [] },
        allPresent: true,
      });
      mockVanillaClient.misc.checkRequiredPermissions.query.mockResolvedValue({
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
