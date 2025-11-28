/**
 * Project Store
 * Manages current project and recent projects state
 * Requirements: 1.1-1.5
 */

import { create } from 'zustand';
import type { KiroValidation } from '../types';

interface ProjectState {
  currentProject: string | null;
  recentProjects: string[];
  kiroValidation: KiroValidation | null;
  isLoading: boolean;
  error: string | null;
}

interface ProjectActions {
  selectProject: (path: string) => Promise<void>;
  loadRecentProjects: () => Promise<void>;
  loadInitialProject: () => Promise<void>;
  clearProject: () => void;
  clearError: () => void;
}

type ProjectStore = ProjectState & ProjectActions;

export const useProjectStore = create<ProjectStore>((set, get) => ({
  // Initial state
  currentProject: null,
  recentProjects: [],
  kiroValidation: null,
  isLoading: false,
  error: null,

  // Actions
  selectProject: async (path: string) => {
    set({ isLoading: true, error: null });

    try {
      const validation = await window.electronAPI.validateKiroDirectory(path);

      set({
        currentProject: path,
        kiroValidation: validation,
        isLoading: false,
      });

      // Add to recent projects
      await window.electronAPI.addRecentProject(path);
      await get().loadRecentProjects();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'プロジェクトの選択に失敗しました',
        isLoading: false,
      });
    }
  },

  loadRecentProjects: async () => {
    try {
      const projects = await window.electronAPI.getRecentProjects();
      set({ recentProjects: projects });
    } catch (error) {
      console.error('Failed to load recent projects:', error);
    }
  },

  loadInitialProject: async () => {
    try {
      const initialPath = await window.electronAPI.getInitialProjectPath();
      if (initialPath) {
        // If initial project path was provided via command line, select it
        await get().selectProject(initialPath);
      }
    } catch (error) {
      console.error('Failed to load initial project:', error);
    }
  },

  clearProject: () => {
    set({
      currentProject: null,
      kiroValidation: null,
      error: null,
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));
