/**
 * Project Store
 * Manages current project and recent projects state
 * Requirements: 1.1-1.5, 4.1-4.6
 */

import { create } from 'zustand';
import type { KiroValidation } from '../types';

/** spec-managerファイルチェック結果 */
export interface FileCheckResult {
  readonly allPresent: boolean;
  readonly missing: readonly string[];
  readonly present: readonly string[];
}

/** spec-manager完全チェック結果 */
export interface SpecManagerCheckResult {
  readonly commands: FileCheckResult;
  readonly settings: FileCheckResult;
  readonly allPresent: boolean;
}

/** インストール結果 */
export interface InstallResult {
  readonly installed: readonly string[];
  readonly skipped: readonly string[];
  readonly overwritten: readonly string[];
}

/** インストールエラー */
export type InstallError =
  | { type: 'TEMPLATE_NOT_FOUND'; path: string }
  | { type: 'WRITE_ERROR'; path: string; message: string }
  | { type: 'PERMISSION_DENIED'; path: string };

interface ProjectState {
  currentProject: string | null;
  recentProjects: string[];
  kiroValidation: KiroValidation | null;
  isLoading: boolean;
  error: string | null;
  // spec-manager extensions
  specManagerCheck: SpecManagerCheckResult | null;
  installLoading: boolean;
  installResult: {
    commands: InstallResult;
    settings: InstallResult;
  } | null;
  installError: InstallError | null;
}

interface ProjectActions {
  selectProject: (path: string) => Promise<void>;
  loadRecentProjects: () => Promise<void>;
  loadInitialProject: () => Promise<void>;
  clearProject: () => void;
  clearError: () => void;
  // spec-manager extensions
  checkSpecManagerFiles: (projectPath: string) => Promise<void>;
  installCommands: () => Promise<void>;
  installSettings: () => Promise<void>;
  installAll: () => Promise<void>;
  forceReinstallAll: () => Promise<void>;
  clearInstallResult: () => void;
}

type ProjectStore = ProjectState & ProjectActions;

export const useProjectStore = create<ProjectStore>((set, get) => ({
  // Initial state
  currentProject: null,
  recentProjects: [],
  kiroValidation: null,
  isLoading: false,
  error: null,
  specManagerCheck: null,
  installLoading: false,
  installResult: null,
  installError: null,

  // Actions
  selectProject: async (path: string) => {
    set({ isLoading: true, error: null, specManagerCheck: null, installResult: null, installError: null });

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

      // Check spec-manager files after project selection
      await get().checkSpecManagerFiles(path);
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
      specManagerCheck: null,
      installResult: null,
      installError: null,
    });
  },

  clearError: () => {
    set({ error: null });
  },

  // ============================================================
  // spec-manager Extensions
  // Requirements: 4.1-4.6
  // ============================================================

  /**
   * Check spec-manager files (commands and settings)
   * Requirements: 4.1, 4.2
   */
  checkSpecManagerFiles: async (projectPath: string) => {
    try {
      const result = await window.electronAPI.checkSpecManagerFiles(projectPath);
      set({ specManagerCheck: result });
    } catch (error) {
      console.error('[projectStore] Failed to check spec-manager files:', error);
    }
  },

  /**
   * Install missing Slash Commands
   * Requirements: 4.3, 4.5
   */
  installCommands: async () => {
    const { currentProject, specManagerCheck } = get();
    if (!currentProject || !specManagerCheck) return;

    set({ installLoading: true, installError: null });

    try {
      const result = await window.electronAPI.installSpecManagerCommands(
        currentProject,
        specManagerCheck.commands.missing
      );

      if (result.ok) {
        set({
          installResult: {
            commands: result.value,
            settings: { installed: [], skipped: [], overwritten: [] },
          },
          installLoading: false,
        });

        // Refresh check result
        await get().checkSpecManagerFiles(currentProject);
      } else {
        set({
          installError: result.error,
          installLoading: false,
        });
      }
    } catch (error) {
      set({
        installError: {
          type: 'WRITE_ERROR',
          path: '',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        installLoading: false,
      });
    }
  },

  /**
   * Install missing SDD settings
   * Requirements: 4.3, 4.5
   */
  installSettings: async () => {
    const { currentProject, specManagerCheck } = get();
    if (!currentProject || !specManagerCheck) return;

    set({ installLoading: true, installError: null });

    try {
      const result = await window.electronAPI.installSpecManagerSettings(
        currentProject,
        specManagerCheck.settings.missing
      );

      if (result.ok) {
        set({
          installResult: {
            commands: { installed: [], skipped: [], overwritten: [] },
            settings: result.value,
          },
          installLoading: false,
        });

        // Refresh check result
        await get().checkSpecManagerFiles(currentProject);
      } else {
        set({
          installError: result.error,
          installLoading: false,
        });
      }
    } catch (error) {
      set({
        installError: {
          type: 'WRITE_ERROR',
          path: '',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        installLoading: false,
      });
    }
  },

  /**
   * Install all missing spec-manager files
   * Requirements: 4.3, 4.5
   */
  installAll: async () => {
    const { currentProject } = get();
    if (!currentProject) return;

    set({ installLoading: true, installError: null });

    try {
      const result = await window.electronAPI.installSpecManagerAll(currentProject);

      if (result.ok) {
        set({
          installResult: result.value,
          installLoading: false,
        });

        // Refresh check result
        await get().checkSpecManagerFiles(currentProject);
      } else {
        set({
          installError: result.error,
          installLoading: false,
        });
      }
    } catch (error) {
      set({
        installError: {
          type: 'WRITE_ERROR',
          path: '',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        installLoading: false,
      });
    }
  },

  /**
   * Force reinstall all spec-manager files (overwrite existing)
   */
  forceReinstallAll: async () => {
    const { currentProject } = get();
    if (!currentProject) return;

    set({ installLoading: true, installError: null });

    try {
      const result = await window.electronAPI.forceReinstallSpecManagerAll(currentProject);

      if (result.ok) {
        set({
          installResult: result.value,
          installLoading: false,
        });

        // Refresh check result
        await get().checkSpecManagerFiles(currentProject);
      } else {
        set({
          installError: result.error,
          installLoading: false,
        });
      }
    } catch (error) {
      set({
        installError: {
          type: 'WRITE_ERROR',
          path: '',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        installLoading: false,
      });
    }
  },

  /**
   * Clear install result
   */
  clearInstallResult: () => {
    set({ installResult: null, installError: null });
  },
}));
