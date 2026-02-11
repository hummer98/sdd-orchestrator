/**
 * Project Store
 * Manages current project and recent projects state
 * Requirements: 1.1-1.5, 4.1-4.6
 * debatex-document-review Inspection Fix 7.2: Load projectDefaultScheme on project selection
 */

import { create } from 'zustand';
import type { KiroValidation, SelectProjectResult } from '../types';
import { useSpecStore } from './specStore';
// bugs-view-unification Task 6.1: Use shared bugStore
import { useSharedBugStore } from '../../shared/stores/bugStore';
// trpc-full-migration Task 11.4: tRPC vanilla client replaces IpcApiClient
// trpc-bug-migration: BugsChangeEvent import removed (adapter eliminated)
import { useAgentStore, type AgentInfo } from './agentStore';
// jj-merge-support Task 12.5: Import ToolCheck type
import type { ToolCheck } from '../../shared/types';
// trpc-full-migration Task 3.2: Use tRPC vanilla client for config operations
import { getVanillaClient } from '../../shared/trpc/vanillaClient';

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
  // jj-merge-support feature
  // Requirements: 3.5, 4.1, 9.1, 9.2, 9.3, 9.4
  jjCheck: ToolCheck | null;
  jjInstallIgnored: boolean;
  jjInstallLoading: boolean;
  jjInstallError: string | null;
}

/** シェル許可追加結果 */
export interface AddPermissionsResult {
  readonly added: readonly string[];
  readonly alreadyExists: readonly string[];
  readonly total: number;
}

interface ProjectActions {
  selectProject: (path: string) => Promise<void>;
  // startup-project-selection-fix Task 3.1: Unified result application
  // Requirements: 2.1, 2.4
  applySelectProjectResult: (result: SelectProjectResult) => Promise<void>;
  loadRecentProjects: () => Promise<void>;
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
  // jj-merge-support feature
  // Requirements: 4.1, 5.1
  installJj: () => Promise<void>;
  ignoreJjInstall: () => Promise<void>;
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
  // jj-merge-support feature
  jjCheck: null,
  jjInstallIgnored: false,
  jjInstallLoading: false,
  jjInstallError: null,

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
      // jj-merge-support feature
      jjCheck: null,
      jjInstallIgnored: false,
      jjInstallLoading: false,
      jjInstallError: null,
    });

    try {
      // trpc-full-migration Task 4.3: Use tRPC for selectProject
      const result = await getVanillaClient().project.selectProject.mutate({ projectPath: path }) as unknown as SelectProjectResult;

      // startup-project-selection-fix Task 3.2: Use unified applySelectProjectResult
      // Requirements: 2.3, 3.3 - Same update logic for UI selection and startup broadcast
      await get().applySelectProjectResult(result);

      // If selection failed, applySelectProjectResult already set error state
      if (!result.success) {
        return;
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
      // trpc-bug-migration: Set project path and start watching via tRPC (apiClient=null)
      useSharedBugStore.getState().setProjectPath(path);
      useSharedBugStore.getState().startWatching(null);

      // Load recent projects (configStore already updated on main process)
      await get().loadRecentProjects();

      // Check spec-manager files after project selection
      await get().checkSpecManagerFiles(path);

      // Check required permissions after project selection
      try {
        // trpc-full-migration Task 10.6: Use tRPC for checkRequiredPermissions
        const permissionsCheck = await getVanillaClient().misc.checkRequiredPermissions.query({ projectPath: path });
        set({ permissionsCheck });
      } catch (error) {
        console.error('[projectStore] Failed to check required permissions:', error);
        // Don't fail project selection if permissions check fails
        set({ permissionsCheck: null });
      }

      // header-profile-badge feature: Load installed profile
      // Requirements: 3.1, 4.1
      // trpc-full-migration Task 3.2: Use tRPC for loadProfile
      try {
        const profile = await getVanillaClient().config.loadProfile.query({ projectPath: path });
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
      // remote-ui-auto-start feature: Auto-start Remote UI server
      // Task 3.1: Check setting and start server if enabled
      // Requirements: 2.1, 2.2, 2.3
      // ============================================================
      // trpc-full-migration Task 3.2: Use tRPC for loadRemoteUiAutoStart
      try {
        const remoteUiAutoStart = await getVanillaClient().config.loadRemoteUiAutoStart.query({ projectPath: path });
        if (remoteUiAutoStart) {
          // Import remoteAccessStore dynamically to avoid circular dependency
          const { useRemoteAccessStore } = await import('./remoteAccessStore');
          const remoteState = useRemoteAccessStore.getState();

          // Requirements 2.2: Prevent double start
          if (!remoteState.isRunning) {
            try {
              await remoteState.startServer();
              console.log('[projectStore] Remote UI server auto-started');
            } catch (startError) {
              // Requirements 2.3: Show error notification without blocking UI
              const { notify } = await import('./notificationStore');
              notify.error('Remote UIサーバーの自動起動に失敗しました');
              console.error('[projectStore] Failed to auto-start remote server:', startError);
            }
          }
        }
      } catch (error) {
        console.error('[projectStore] Failed to load remoteUiAutoStart setting:', error);
        // Don't fail project selection if remote UI auto-start check fails
      }

      // jj-merge-support feature: Check jj availability
      // Requirements: 3.1, 9.1, 9.4
      // Load jjInstallIgnored setting from the project settings
      // trpc-full-migration Task 3.2: Use tRPC for loadSkipPermissions
      let jjInstallIgnored = false;
      try {
        const skipPermissions = await getVanillaClient().config.loadSkipPermissions.query({ projectPath: path });
        // skipPermissions can be a boolean (old format) or an object with jjInstallIgnored (new format)
        if (typeof skipPermissions === 'object' && skipPermissions !== null) {
          jjInstallIgnored = (skipPermissions as unknown as { jjInstallIgnored?: boolean }).jjInstallIgnored || false;
        }
      } catch (error) {
        console.error('[projectStore] Failed to load jjInstallIgnored:', error);
      }

      // Only check jj if not explicitly ignored
      if (!jjInstallIgnored) {
        try {
          // trpc-full-migration Task 10.6: Use tRPC for checkJjAvailability
          const jjCheck = await getVanillaClient().install.checkJjAvailability.query();
          set({ jjCheck, jjInstallIgnored });
        } catch (error) {
          console.error('[projectStore] Failed to check jj availability:', error);
          // Don't fail project selection if jj check fails
          set({ jjCheck: null, jjInstallIgnored });
        }
      } else {
        // jj check is ignored, skip the check
        set({ jjCheck: null, jjInstallIgnored: true });
      }

      // ============================================================
      // debatex-document-review Inspection Fix 7.2: Load project default scheme
      // Requirements: 4.2 - spec.json未設定時のプロジェクトデフォルト適用
      // Load projectDefaultScheme from sdd-orchestrator.json and cache in specDetailStore
      // ============================================================
      // trpc-full-migration Task 3.2: Use tRPC for loadProjectDefaults
      try {
        const projectDefaults = await getVanillaClient().config.loadProjectDefaults.query({ projectPath: path });
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

  // ============================================================
  // startup-project-selection-fix Task 3.1: Unified Result Application
  // Requirements: 2.1, 2.4
  // ============================================================
  /**
   * Apply SelectProjectResult to store (for startup broadcast and direct selection)
   * This is the shared logic for updating store state from SelectProjectResult
   * @param result - The SelectProjectResult from Main process
   */
  applySelectProjectResult: async (result: SelectProjectResult) => {
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
        currentProject: null,
      });
      return;
    }

    // Success: update store with results
    set({
      currentProject: result.projectPath,
      kiroValidation: result.kiroValidation,
      isLoading: false,
      lastSelectResult: result,
    });

    // Sync specs/bugs to their dedicated stores (unified-project-selection: Task 4.1)
    if (result.specs) {
      useSpecStore.getState().setSpecs(result.specs);
      useSpecStore.getState().setSpecJsonMap(result.specJsonMap);
    }
    if (result.bugs) {
      useSharedBugStore.getState().updateBugs(result.bugs);
    }

    // Register Renderer-side file watcher event listeners
    // Both startWatching implementations are idempotent (clean up existing subscriptions first)
    // This ensures watchers are registered in both the SDD_PROJECT_PATH startup path
    // (which only calls applySelectProjectResult) and the UI selection path
    // (which calls selectProject → applySelectProjectResult → startWatching again)
    await useSpecStore.getState().startWatching();
    useSharedBugStore.getState().setProjectPath(result.projectPath);
    useSharedBugStore.getState().startWatching(null);
  },

  // trpc-full-migration Task 3.2: Use tRPC for getRecentProjects
  loadRecentProjects: async () => {
    try {
      const projects = await getVanillaClient().config.getRecentProjects.query();
      set({ recentProjects: projects });
    } catch (error) {
      console.error('Failed to load recent projects:', error);
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
      // jj-merge-support feature
      jjCheck: null,
      jjInstallIgnored: false,
      jjInstallLoading: false,
      jjInstallError: null,
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
      // trpc-full-migration Task 10.6: Use tRPC for checkSpecManagerFiles
      const result = await getVanillaClient().install.checkSpecManagerFiles.query({ projectPath });
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
      // trpc-full-migration Task 10.6: Use tRPC for installSpecManagerCommands
      const result = await getVanillaClient().install.installSpecManagerCommands.mutate({
        projectPath: currentProject,
        missingCommands: [...specManagerCheck.commands.missing],
      });

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
          installError: result.error as InstallError,
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
      // trpc-full-migration Task 10.6: Use tRPC for installSpecManagerSettings
      const result = await getVanillaClient().install.installSpecManagerSettings.mutate({
        projectPath: currentProject,
        missingSettings: [...specManagerCheck.settings.missing],
      });

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
          installError: result.error as InstallError,
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
      // trpc-full-migration Task 10.6: Use tRPC for installSpecManagerAll
      const result = await getVanillaClient().install.installSpecManagerAll.mutate({ projectPath: currentProject });

      if (result.ok) {
        set({
          installResult: result.value,
          installLoading: false,
        });

        // Refresh check result
        await get().checkSpecManagerFiles(currentProject);
      } else {
        set({
          installError: result.error as InstallError,
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
      // trpc-full-migration Task 10.6: Use tRPC for forceReinstallSpecManagerAll
      const result = await getVanillaClient().install.forceReinstallSpecManagerAll.mutate({ projectPath: currentProject });

      if (result.ok) {
        set({
          installResult: result.value,
          installLoading: false,
        });

        // Refresh check result
        await get().checkSpecManagerFiles(currentProject);
      } else {
        set({
          installError: result.error as InstallError,
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
      // trpc-full-migration Task 10.6: Use tRPC for addShellPermissions
      const result = await getVanillaClient().misc.addShellPermissions.mutate({ projectPath: currentProject });
      if (result.ok) {
        return result.value as AddPermissionsResult;
      }
      return null;
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
      // trpc-full-migration Task 10.6: Use tRPC for addMissingPermissions
      await getVanillaClient().misc.addMissingPermissions.mutate({ projectPath: currentProject, permissions: [...permissionsCheck.missing] });

      // Refresh permissions check
      // trpc-full-migration Task 10.6: Use tRPC for checkRequiredPermissions
      const newPermissionsCheck = await getVanillaClient().misc.checkRequiredPermissions.query({ projectPath: currentProject });
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
   * Check steering files (verification-commands.md)
   * Requirements: 3.1, 3.2
   */
  checkSteeringFiles: async (projectPath: string) => {
    try {
      // trpc-full-migration Task 5.3: Use tRPC for checkSteeringFiles
      const result = await getVanillaClient().spec.checkSteeringFiles.query({ projectPath });
      set({ steeringCheck: result });
    } catch (error) {
      console.error('[projectStore] Failed to check steering files:', error);
      set({ steeringCheck: null });
    }
  },

  /**
   * Generate verification-commands.md file by launching steering-verification agent
   * Task 6.2: executeProjectAgent を使用してエージェント起動
   * Requirements: 3.3, 3.4 (ボタンクリックでエージェント起動)
   */
  generateVerificationMd: async () => {
    const { currentProject } = get();
    if (!currentProject) return;

    set({ steeringGenerateLoading: true });

    try {
      // Launch steering-verification agent and get AgentInfo
      // trpc-full-migration Task 5.3: Use tRPC for generateVerificationMd
      // trpc-full-migration: Cast to AgentInfo (tRPC infers wider AgentStatus from server-side type)
      const agentInfo = await getVanillaClient().spec.generateVerificationMd.mutate({ projectPath: currentProject }) as unknown as AgentInfo;

      // Add agent to Project Agents panel (specId='' means project agent)
      useAgentStore.getState().addAgent('', agentInfo);
      // Select Project Agents tab and the new agent
      useAgentStore.getState().selectForProjectAgents();
      useAgentStore.getState().selectAgent(agentInfo.agentId);

      // Note: steeringCheck will be refreshed when the agent completes
      // and the file watcher detects the new verification-commands.md file
      set({ steeringGenerateLoading: false });
    } catch (error) {
      console.error('[projectStore] Failed to generate verification-commands.md:', error);
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
      // trpc-full-migration Task 5.3: Use tRPC for checkReleaseMd
      const result = await getVanillaClient().spec.checkReleaseMd.query({ projectPath });
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
      // trpc-full-migration Task 5.3: Use tRPC for generateReleaseMd
      // trpc-full-migration: Cast to AgentInfo (tRPC infers wider AgentStatus from server-side type)
      const agentInfo = await getVanillaClient().spec.generateReleaseMd.mutate({ projectPath: currentProject }) as unknown as AgentInfo;

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

  // ============================================================
  // jj Installation (jj-merge-support feature)
  // Task 12.5: ProjectStore への jj関連 state 追加
  // Requirements: 4.1, 9.1, 9.3
  // ============================================================

  /**
   * Install jj via Homebrew and re-check availability
   * Requirements: 4.1, 4.3
   */
  installJj: async () => {
    const { currentProject } = get();
    if (!currentProject) return;

    set({ jjInstallLoading: true, jjInstallError: null });

    try {
      // trpc-full-migration Task 10.6: Use tRPC for installJj
      const result = await getVanillaClient().install.installJj.mutate();

      if (result.success) {
        // Installation succeeded, re-check jj availability
        // trpc-full-migration Task 10.6: Use tRPC for checkJjAvailability
        const jjCheck = await getVanillaClient().install.checkJjAvailability.query();
        set({ jjCheck, jjInstallLoading: false, jjInstallError: null });
      } else {
        // Installation failed
        set({
          jjInstallError: result.error || 'Installation failed',
          jjInstallLoading: false,
        });
      }
    } catch (error) {
      set({
        jjInstallError: error instanceof Error ? error.message : 'Unknown error',
        jjInstallLoading: false,
      });
    }
  },

  /**
   * Ignore jj installation warnings for this project
   * Requirements: 5.1
   */
  ignoreJjInstall: async () => {
    const { currentProject } = get();
    if (!currentProject) return;

    try {
      // trpc-full-migration Task 10.6: Use tRPC for ignoreJjInstall
      const result = await getVanillaClient().install.ignoreJjInstall.mutate({ projectPath: currentProject, ignored: true });

      if (result.success) {
        set({ jjInstallIgnored: true });
      } else {
        console.error('[projectStore] Failed to ignore jj install:', result.error);
      }
    } catch (error) {
      console.error('[projectStore] Failed to ignore jj install:', error);
    }
  },
}));
