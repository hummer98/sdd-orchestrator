/**
 * Project Store
 * Manages current project and recent projects state
 * Requirements: 1.1-1.5, 4.1-4.6
 * debatex-document-review Inspection Fix 7.2: Load projectDefaultScheme on project selection
 */

import { create } from 'zustand';
import type { KiroValidation, SelectProjectResult } from '../types';
import { useSpecStore } from './specStore';
// bugs-view-unification Task 6.1: Use shared bugStore with IpcApiClient
import { useSharedBugStore } from '../../shared/stores/bugStore';
import { IpcApiClient } from '../../shared/api/IpcApiClient';
import { useAgentStore } from './agentStore';

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
  | { type: 'PERMISSION_DENIED'; path: string }
  | { type: 'MERGE_ERROR'; message: string };

/** パーミッションチェック結果 */
export interface PermissionsCheckResult {
  readonly allPresent: boolean;
  readonly missing: readonly string[];
  readonly present: readonly string[];
}

/** Profile configuration type (header-profile-badge feature) */
export type ProfileName = 'cc-sdd' | 'cc-sdd-agent' | 'spec-manager';
export interface ProfileConfig {
  readonly name: ProfileName;
  readonly installedAt: string;
}

/** Steering check result (steering-verification-integration feature) */
export interface SteeringCheckResult {
  readonly verificationMdExists: boolean;
}

/** Release check result (steering-release-integration feature) */
export interface ReleaseCheckResult {
  readonly releaseMdExists: boolean;
}

interface ProjectState {
  currentProject: string | null;
  recentProjects: string[];
  kiroValidation: KiroValidation | null;
  isLoading: boolean;
  error: string | null;
  // Unified project selection results (unified-project-selection feature)
  lastSelectResult: SelectProjectResult | null;
  // Note: specs/bugs are managed by specStore/bugStore (SSOT)
  // spec-manager extensions
  specManagerCheck: SpecManagerCheckResult | null;
  installLoading: boolean;
  installResult: {
    commands: InstallResult;
    settings: InstallResult;
  } | null;
  installError: InstallError | null;
  // permissions check
  permissionsCheck: PermissionsCheckResult | null;
  permissionsFixLoading: boolean;
  // header-profile-badge feature
  // Requirements: 3.1, 3.2
  installedProfile: ProfileConfig | null;
  profileLoading: boolean;
  // steering-verification-integration feature
  // Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
  steeringCheck: SteeringCheckResult | null;
  steeringGenerateLoading: boolean;
  // steering-release-integration feature
  // Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
  releaseCheck: ReleaseCheckResult | null;
  releaseGenerateLoading: boolean;
}

/** シェル許可追加結果 */
export interface AddPermissionsResult {
  readonly added: readonly string[];
  readonly alreadyExists: readonly string[];
  readonly total: number;
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
  // shell permissions
  addShellPermissions: () => Promise<AddPermissionsResult | null>;
  fixPermissions: () => Promise<void>;
  // steering-verification-integration feature
  checkSteeringFiles: (projectPath: string) => Promise<void>;
  generateVerificationMd: () => Promise<void>;
  // steering-release-integration feature
  checkReleaseFiles: (projectPath: string) => Promise<void>;
  generateReleaseMd: () => Promise<void>;
}

type ProjectStore = ProjectState & ProjectActions;

export const useProjectStore = create<ProjectStore>((set, get) => ({
  // Initial state
  currentProject: null,
  recentProjects: [],
  kiroValidation: null,
  isLoading: false,
  error: null,
  lastSelectResult: null,
  // Note: specs/bugs are managed by specStore/bugStore (SSOT)
  specManagerCheck: null,
  installLoading: false,
  installResult: null,
  installError: null,
  permissionsCheck: null,
  permissionsFixLoading: false,
  // header-profile-badge feature
  installedProfile: null,
  profileLoading: false,
  // steering-verification-integration feature
  steeringCheck: null,
  steeringGenerateLoading: false,
  // steering-release-integration feature
  releaseCheck: null,
  releaseGenerateLoading: false,

  // Actions
  // ============================================================
  // Unified Project Selection (unified-project-selection feature)
  // Requirements: 2.1-2.3
  // ============================================================
  selectProject: async (path: string) => {
    // Bug fix: spec-item-flash-wrong-content - clear selected spec before switching projects
    // to prevent showing old project's spec data momentarily
    useSpecStore.getState().clearSelectedSpec();

    set({
      isLoading: true,
      error: null,
      specManagerCheck: null,
      installResult: null,
      installError: null,
      permissionsCheck: null,
      lastSelectResult: null,
      // steering-verification-integration feature
      steeringCheck: null,
      // steering-release-integration feature
      releaseCheck: null,
    });

    try {
      // Use new unified selectProject IPC
      const result = await window.electronAPI.selectProject(path);

      if (!result.success) {
        // Convert error to user-friendly message
        let errorMessage = 'プロジェクトの選択に失敗しました';
        if (result.error) {
          switch (result.error.type) {
            case 'PATH_NOT_EXISTS':
              errorMessage = `パスが存在しません: ${result.error.path}`;
              break;
            case 'NOT_A_DIRECTORY':
              errorMessage = `ディレクトリではありません: ${result.error.path}`;
              break;
            case 'PERMISSION_DENIED':
              errorMessage = `アクセス権限がありません: ${result.error.path}`;
              break;
            case 'SELECTION_IN_PROGRESS':
              errorMessage = '別のプロジェクト選択が進行中です';
              break;
            case 'INTERNAL_ERROR':
              errorMessage = result.error.message;
              break;
          }
        }

        set({
          error: errorMessage,
          isLoading: false,
          lastSelectResult: result,
        });
        return;
      }

      // Success: update store with results
      // Note: specs/bugs are delegated to specStore/bugStore (SSOT)
      set({
        currentProject: result.projectPath,
        kiroValidation: result.kiroValidation,
        isLoading: false,
        lastSelectResult: result,
      });

      // Sync specs/bugs to their dedicated stores (unified-project-selection: Task 4.1)
      // This ensures specStore and bugStore are updated for components that use them
      if (result.specs) {
        useSpecStore.getState().setSpecs(result.specs);
        // spec-metadata-ssot-refactor: Set specJsonMap from selectProject result
        // Main process already read all specJsons, no need for separate IPC calls
        useSpecStore.getState().setSpecJsonMap(result.specJsonMap);
      }
      // bugs-view-unification Task 6.1: Use shared bugStore
      if (result.bugs) {
        useSharedBugStore.getState().updateBugs(result.bugs);
      }

      // Bug fix: empty bug directory handling - show warning toast for skipped directories
      if (result.bugWarnings && result.bugWarnings.length > 0) {
        const { notify } = await import('./notificationStore');
        for (const warning of result.bugWarnings) {
          notify.warning(warning);
        }
      }

      // Bug fix: agent-log-shows-selection-without-spec
      // Clear agent selection when switching projects to prevent stale agent logs
      useAgentStore.getState().selectAgent(null);

      // agent-watcher-optimization Task 5.1: Load lightweight running agent counts for badge display
      // This is called early so SpecList can show badges without waiting for full agent data
      useAgentStore.getState().loadRunningAgentCounts();

      // Register event listeners for file watchers (File as SSOT)
      // Note: Watchers are started by Main process in SELECT_PROJECT IPC handler
      // Here we only register the event listeners on Renderer side
      await useSpecStore.getState().startWatching();
      // bugs-view-unification Task 6.1: Use shared bugStore with IpcApiClient
      const ipcApiClient = new IpcApiClient();
      useSharedBugStore.getState().startWatching(ipcApiClient);

      // Load recent projects (configStore already updated on main process)
      await get().loadRecentProjects();

      // Check spec-manager files after project selection
      await get().checkSpecManagerFiles(path);

      // Check required permissions after project selection
      try {
        const permissionsCheck = await window.electronAPI.checkRequiredPermissions(path);
        set({ permissionsCheck });
      } catch (error) {
        console.error('[projectStore] Failed to check required permissions:', error);
        // Don't fail project selection if permissions check fails
        set({ permissionsCheck: null });
      }

      // header-profile-badge feature: Load installed profile
      // Requirements: 3.1, 4.1
      try {
        const profile = await window.electronAPI.loadProfile(path);
        set({ installedProfile: profile as ProfileConfig | null });
      } catch (error) {
        console.error('[projectStore] Failed to load profile:', error);
        // Don't fail project selection if profile load fails
        set({ installedProfile: null });
      }

      // steering-verification-integration feature: Check steering files
      // Requirements: 3.1, 3.2
      try {
        await get().checkSteeringFiles(path);
      } catch (error) {
        console.error('[projectStore] Failed to check steering files:', error);
        // Don't fail project selection if steering check fails
        set({ steeringCheck: null });
      }

      // steering-release-integration feature: Check release files
      // Requirements: 3.2
      try {
        await get().checkReleaseFiles(path);
      } catch (error) {
        console.error('[projectStore] Failed to check release files:', error);
        // Don't fail project selection if release check fails
        set({ releaseCheck: null });
      }

      // Bug fix: skip-permissions-not-loaded
      // Load skipPermissions as part of selectProject to ensure it's loaded
      // regardless of which code path triggers project selection (menu, RecentProjects, etc.)
      await useAgentStore.getState().loadSkipPermissions(path);

      // ============================================================
      // debatex-document-review Inspection Fix 7.2: Load project default scheme
      // Requirements: 4.2 - spec.json未設定時のプロジェクトデフォルト適用
      // Load projectDefaultScheme from sdd-orchestrator.json and cache in specDetailStore
      // ============================================================
      try {
        const projectDefaults = await window.electronAPI.loadProjectDefaults(path);
        const defaultScheme = projectDefaults?.documentReview?.scheme;
        // Import dynamically to avoid circular dependency
        const { useSpecDetailStore } = await import('./spec/specDetailStore');
        useSpecDetailStore.getState().setProjectDefaultScheme(
          defaultScheme as import('@shared/registry').ReviewerScheme | undefined
        );
        console.log('[projectStore] Loaded projectDefaultScheme:', defaultScheme);
      } catch (error) {
        console.error('[projectStore] Failed to load project defaults:', error);
        // Don't fail project selection if defaults load fails
        // specDetailStore.projectDefaultScheme will remain undefined, falling back to DEFAULT_REVIEWER_SCHEME
      }
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
      lastSelectResult: null,
      // Note: specs/bugs are managed by specStore/bugStore (SSOT)
      specManagerCheck: null,
      installResult: null,
      installError: null,
      permissionsCheck: null,
      permissionsFixLoading: false,
      // header-profile-badge feature
      installedProfile: null,
      profileLoading: false,
      // steering-verification-integration feature
      steeringCheck: null,
      steeringGenerateLoading: false,
      // steering-release-integration feature
      releaseCheck: null,
      releaseGenerateLoading: false,
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

  // ============================================================
  // Shell Permissions
  // ============================================================

  /**
   * Add standard shell permissions to project's settings.local.json
   */
  addShellPermissions: async () => {
    const { currentProject } = get();
    if (!currentProject) return null;

    try {
      const result = await window.electronAPI.addShellPermissions(currentProject);
      return result;
    } catch (error) {
      console.error('[projectStore] Failed to add shell permissions:', error);
      return null;
    }
  },

  /**
   * Fix missing permissions by adding them and refreshing the check
   */
  fixPermissions: async () => {
    const { currentProject, permissionsCheck } = get();
    if (!currentProject) return;
    if (!permissionsCheck || permissionsCheck.missing.length === 0) return;

    set({ permissionsFixLoading: true });

    try {
      // Add missing permissions directly (not from standard-commands.txt)
      await window.electronAPI.addMissingPermissions(currentProject, [...permissionsCheck.missing]);

      // Refresh permissions check
      const newPermissionsCheck = await window.electronAPI.checkRequiredPermissions(currentProject);
      set({ permissionsCheck: newPermissionsCheck, permissionsFixLoading: false });
    } catch (error) {
      console.error('[projectStore] Failed to fix permissions:', error);
      set({ permissionsFixLoading: false });
    }
  },

  // ============================================================
  // Steering Files Check (steering-verification-integration feature)
  // Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
  // ============================================================

  /**
   * Check steering files (verification.md)
   * Requirements: 3.1, 3.2
   */
  checkSteeringFiles: async (projectPath: string) => {
    try {
      const result = await window.electronAPI.checkSteeringFiles(projectPath);
      set({ steeringCheck: result });
    } catch (error) {
      console.error('[projectStore] Failed to check steering files:', error);
      set({ steeringCheck: null });
    }
  },

  /**
   * Generate verification.md file by launching steering-verification agent
   * Task 6.2: executeProjectAgent を使用してエージェント起動
   * Requirements: 3.3, 3.4 (ボタンクリックでエージェント起動)
   */
  generateVerificationMd: async () => {
    const { currentProject } = get();
    if (!currentProject) return;

    set({ steeringGenerateLoading: true });

    try {
      // Launch steering-verification agent and get AgentInfo
      const agentInfo = await window.electronAPI.generateVerificationMd(currentProject);

      // Add agent to Project Agents panel (specId='' means project agent)
      useAgentStore.getState().addAgent('', agentInfo);
      // Select Project Agents tab and the new agent
      useAgentStore.getState().selectForProjectAgents();
      useAgentStore.getState().selectAgent(agentInfo.agentId);

      // Note: steeringCheck will be refreshed when the agent completes
      // and the file watcher detects the new verification.md file
      set({ steeringGenerateLoading: false });
    } catch (error) {
      console.error('[projectStore] Failed to generate verification.md:', error);
      set({ steeringGenerateLoading: false });
    }
  },

  // ============================================================
  // Release Files Check (steering-release-integration feature)
  // Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
  // ============================================================

  /**
   * Check release files (release.md)
   * Requirements: 3.2
   */
  checkReleaseFiles: async (projectPath: string) => {
    try {
      const result = await window.electronAPI.checkReleaseMd(projectPath);
      set({ releaseCheck: result });
    } catch (error) {
      console.error('[projectStore] Failed to check release files:', error);
      set({ releaseCheck: null });
    }
  },

  /**
   * Generate release.md file by launching steering-release agent
   * Requirements: 3.4 (ボタンクリックでエージェント起動)
   */
  generateReleaseMd: async () => {
    const { currentProject } = get();
    if (!currentProject) return;

    set({ releaseGenerateLoading: true });

    try {
      // Launch steering-release agent and get AgentInfo
      const agentInfo = await window.electronAPI.generateReleaseMd(currentProject);

      // Add agent to Project Agents panel (specId='' means project agent)
      useAgentStore.getState().addAgent('', agentInfo);
      // Select Project Agents tab and the new agent
      useAgentStore.getState().selectForProjectAgents();
      useAgentStore.getState().selectAgent(agentInfo.agentId);

      // Note: releaseCheck will be refreshed when the agent completes
      // and the file watcher detects the new release.md file
      set({ releaseGenerateLoading: false });
    } catch (error) {
      console.error('[projectStore] Failed to generate release.md:', error);
      set({ releaseGenerateLoading: false });
    }
  },
}));
