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
      window.electronAPI.validateKiroDirectory = vi.fn().mockResolvedValue(mockValidation);
      window.electronAPI.addRecentProject = vi.fn().mockResolvedValue(undefined);

      await useProjectStore.getState().selectProject('/test/project');

      const state = useProjectStore.getState();
      expect(state.currentProject).toBe('/test/project');
      expect(state.kiroValidation).toEqual(mockValidation);
    });

    it('should set isLoading during selection', async () => {
      window.electronAPI.validateKiroDirectory = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ exists: true, hasSpecs: true, hasSteering: true }), 100))
      );
      window.electronAPI.addRecentProject = vi.fn().mockResolvedValue(undefined);

      const selectPromise = useProjectStore.getState().selectProject('/test/project');

      // Check loading state during operation
      expect(useProjectStore.getState().isLoading).toBe(true);

      await selectPromise;

      // Check loading state after completion
      expect(useProjectStore.getState().isLoading).toBe(false);
    });

    it('should set error on validation failure', async () => {
      window.electronAPI.validateKiroDirectory = vi.fn().mockRejectedValue(new Error('Validation failed'));

      await useProjectStore.getState().selectProject('/invalid/path');

      const state = useProjectStore.getState();
      expect(state.error).toBeTruthy();
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
});
