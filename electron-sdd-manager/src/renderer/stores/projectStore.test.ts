/**
 * Project Store Tests
 * TDD: Testing project state management
 * Requirements: 1.1-1.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useProjectStore } from './projectStore';

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
      specs: [],
      bugs: [],
    });
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
      const mockSpecs = [{ name: 'test-spec', path: '/test/spec', phase: 'initialized', updatedAt: '2024-01-01', approvals: { requirements: { generated: false, approved: false }, design: { generated: false, approved: false }, tasks: { generated: false, approved: false } } }];
      const mockBugs = [{ name: 'test-bug', path: '/test/bug', phase: 'reported', updatedAt: '2024-01-01' }];

      window.electronAPI.selectProject = vi.fn().mockResolvedValue({
        success: true,
        projectPath: '/test/project',
        kiroValidation: mockValidation,
        specs: mockSpecs,
        bugs: mockBugs,
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
      expect(state.specs).toEqual(mockSpecs);
      expect(state.bugs).toEqual(mockBugs);
    });

    it('should set isLoading during selection', async () => {
      window.electronAPI.selectProject = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          success: true,
          projectPath: '/test/project',
          kiroValidation: { exists: true, hasSpecs: true, hasSteering: true },
          specs: [],
          bugs: [],
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
});
