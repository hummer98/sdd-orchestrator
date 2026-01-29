/**
 * Install Handlers
 * IPC handlers for installation-related operations
 *
 * Task 2.1: installHandlers.ts を新規作成し、インストール関連ハンドラーを実装する
 * Requirements: 1.2, 2.1, 2.2, 4.1, 4.2
 *
 * Migrated handlers from handlers.ts:
 * - CHECK_SPEC_MANAGER_FILES, INSTALL_SPEC_MANAGER_COMMANDS, INSTALL_SPEC_MANAGER_SETTINGS
 * - INSTALL_SPEC_MANAGER_ALL, FORCE_REINSTALL_SPEC_MANAGER_ALL
 * - CHECK_CLAUDE_MD_EXISTS, INSTALL_CLAUDE_MD
 * - CHECK_CC_SDD_WORKFLOW_STATUS, INSTALL_CC_SDD_WORKFLOW
 * - CHECK_COMMANDSET_STATUS, INSTALL_COMMANDSET_BY_PROFILE
 * - CHECK_AGENT_FOLDER_EXISTS, DELETE_AGENT_FOLDER
 * - INSTALL_EXPERIMENTAL_DEBUG, CHECK_EXPERIMENTAL_TOOL_EXISTS
 * - INSTALL_EXPERIMENTAL_GEMINI_DOC_REVIEW, CHECK_EXPERIMENTAL_GEMINI_DOC_REVIEW_EXISTS
 * - GET_CLI_INSTALL_STATUS, INSTALL_CLI_COMMAND
 * - CHECK_COMMANDSET_VERSIONS, CONFIRM_COMMON_COMMANDS
 */

import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from './channels';
import { access, rm } from 'fs/promises';
import { join } from 'path';
import { logger } from '../services/logger';
import type { CommandInstallerService } from '../services/commandInstallerService';
import type { ProjectChecker } from '../services/projectChecker';
import type { CcSddWorkflowInstaller } from '../services/ccSddWorkflowInstaller';
import type {
  UnifiedCommandsetInstaller,
  ProfileName,
  UnifiedInstallResult,
  UnifiedInstallStatus,
} from '../services/unifiedCommandsetInstaller';
import type {
  ExperimentalToolsInstallerService,
  InstallOptions as ExperimentalInstallOptions,
  InstallResult as ExperimentalInstallResult,
  InstallError as ExperimentalInstallError,
  CheckResult as ExperimentalCheckResult,
  Result as ExperimentalResult,
} from '../services/experimentalToolsInstallerService';
import type { CommandsetVersionService } from '../services/commandsetVersionService';
import type { CliInstallStatus, CliInstallResult, InstallLocation } from '../services/cliInstallerService';
import type { SpecManagerService } from '../services/specManagerService';

/**
 * Manual install instructions type (matches getManualInstallInstructions return type)
 */
export interface ManualInstallInstructions {
  title: string;
  steps: string[];
  command: string;
  usage: {
    title: string;
    examples: Array<{ command: string; description: string }>;
  };
  pathNote?: string;
}

/**
 * Dependencies required for install handlers
 * Requirements: 2.1, 2.2 - Dependency injection for testability
 */
export interface InstallHandlersDependencies {
  /** CommandInstallerService instance for spec-manager installation */
  commandInstallerService: CommandInstallerService;
  /** ProjectChecker instance for checking project files */
  projectChecker: ProjectChecker;
  /** CcSddWorkflowInstaller instance for cc-sdd workflow installation */
  ccSddWorkflowInstaller: CcSddWorkflowInstaller;
  /** UnifiedCommandsetInstaller instance for profile-based installation */
  unifiedCommandsetInstaller: UnifiedCommandsetInstaller;
  /** ExperimentalToolsInstallerService instance for experimental tools */
  experimentalToolsInstaller: ExperimentalToolsInstallerService;
  /** CommandsetVersionService instance for version checking */
  commandsetVersionService: CommandsetVersionService;
  /** Function to get CLI install status */
  getCliInstallStatus: (location?: InstallLocation) => Promise<CliInstallStatus>;
  /** Function to install CLI command */
  installCliCommand: (location?: InstallLocation) => Promise<CliInstallResult>;
  /** Function to get manual install instructions */
  getManualInstallInstructions: (location?: InstallLocation) => ManualInstallInstructions;
  /**
   * Function to get SpecManagerService instance for Agent startup
   * claudemd-profile-install-merge: Added for CLAUDE.md merge Agent
   * Requirements: 2.1, 2.4
   */
  getSpecManagerService?: () => SpecManagerService | null;
}

/**
 * Register all install-related IPC handlers
 * Requirements: 1.2, 2.1, 4.1, 4.2
 *
 * @param deps - Dependencies for install handlers
 */
export function registerInstallHandlers(deps: InstallHandlersDependencies): void {
  const {
    commandInstallerService,
    projectChecker,
    unifiedCommandsetInstaller,
    experimentalToolsInstaller,
    commandsetVersionService,
    getCliInstallStatus,
    installCliCommand,
    getManualInstallInstructions,
  } = deps;

  // ============================================================
  // spec-manager Install Handlers (Requirements: 4.1-4.6)
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.CHECK_SPEC_MANAGER_FILES,
    async (_event, projectPath: string) => {
      // Only log if there are issues (normal checks are silent)
      const result = await projectChecker.checkAll(projectPath);
      const hasIssues = !result.allPresent;
      if (hasIssues) {
        logger.info('[installHandlers] CHECK_SPEC_MANAGER_FILES called', { projectPath });
      }
      return result;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.INSTALL_SPEC_MANAGER_COMMANDS,
    async (_event, projectPath: string, missingCommands: string[]) => {
      logger.info('[installHandlers] INSTALL_SPEC_MANAGER_COMMANDS called', { projectPath, missingCommands });
      return commandInstallerService.installCommands(projectPath, missingCommands);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.INSTALL_SPEC_MANAGER_SETTINGS,
    async (_event, projectPath: string, missingSettings: string[]) => {
      logger.info('[installHandlers] INSTALL_SPEC_MANAGER_SETTINGS called', { projectPath, missingSettings });
      return commandInstallerService.installSettings(projectPath, missingSettings);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.INSTALL_SPEC_MANAGER_ALL,
    async (_event, projectPath: string) => {
      logger.info('[installHandlers] INSTALL_SPEC_MANAGER_ALL called', { projectPath });
      return commandInstallerService.installAll(projectPath);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.FORCE_REINSTALL_SPEC_MANAGER_ALL,
    async (_event, projectPath: string) => {
      logger.info('[installHandlers] FORCE_REINSTALL_SPEC_MANAGER_ALL called', { projectPath });
      return commandInstallerService.forceReinstallAll(projectPath);
    }
  );

  // ============================================================
  // Unified Commandset Install Handlers (commandset-unified-installer feature)
  // Requirements: 11.1
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.CHECK_COMMANDSET_STATUS,
    async (_event, projectPath: string): Promise<UnifiedInstallStatus> => {
      logger.info('[installHandlers] CHECK_COMMANDSET_STATUS called', { projectPath });
      return unifiedCommandsetInstaller.checkAllInstallStatus(projectPath);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.INSTALL_COMMANDSET_BY_PROFILE,
    async (
      event,
      projectPath: string,
      profileName: ProfileName,
      options?: { force?: boolean }
    ): Promise<{ ok: true; value: UnifiedInstallResult } | { ok: false; error: { type: string; message: string } }> => {
      logger.info('[installHandlers] INSTALL_COMMANDSET_BY_PROFILE called', { projectPath, profileName, options });

      const window = BrowserWindow.fromWebContents(event.sender);

      // Progress callback to send updates to renderer
      const progressCallback = (current: number, total: number, currentCommandset: string) => {
        if (window && !window.isDestroyed()) {
          // We don't have a dedicated channel for progress, so we just log it
          logger.debug('[installHandlers] Install progress', { current, total, currentCommandset });
        }
      };

      const result = await unifiedCommandsetInstaller.installByProfile(
        projectPath,
        profileName,
        options,
        progressCallback
      );

      if (!result.ok) {
        logger.error('[installHandlers] INSTALL_COMMANDSET_BY_PROFILE failed', { error: result.error });
        const err = result.error;
        const errorMessage = 'message' in err ? err.message : ('path' in err ? err.path : 'Installation failed');
        return {
          ok: false,
          error: { type: err.type, message: errorMessage }
        };
      }

      logger.info('[installHandlers] INSTALL_COMMANDSET_BY_PROFILE succeeded', {
        profileName,
        totalInstalled: result.value.summary.totalInstalled,
        totalSkipped: result.value.summary.totalSkipped,
        totalFailed: result.value.summary.totalFailed
      });

      // claudemd-profile-install-merge: Start claudemd-merge Agent for cc-sdd/cc-sdd-agent profiles
      // Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
      if (profileName === 'cc-sdd' || profileName === 'cc-sdd-agent') {
        const specManagerService = deps.getSpecManagerService?.();
        if (specManagerService) {
          // Fire-and-forget: Don't await the Agent startup
          // Requirements: 2.4, 2.5 - Background execution, return result immediately
          specManagerService.startAgent({
            specId: '',
            phase: 'claudemd-merge',
            command: 'claude',
            args: ['/internal:claudemd-merge'],
            group: 'doc',
          }).then((agentResult) => {
            if (agentResult.ok) {
              logger.info('[installHandlers] claudemd-merge agent started', { agentId: agentResult.value.agentId });
            } else {
              // Requirements: 2.6 - Agent startup failure is logged as warning only
              logger.warn('[installHandlers] Failed to start claudemd-merge agent', { error: agentResult.error });
            }
          }).catch((error) => {
            // Requirements: 2.6 - Catch any unexpected errors
            logger.warn('[installHandlers] Failed to start claudemd-merge agent', { error: error instanceof Error ? error.message : String(error) });
          });
        } else {
          logger.warn('[installHandlers] SpecManagerService not available for claudemd-merge agent');
        }
      }

      return result;
    }
  );

  // ============================================================
  // Common Commands Install Handler (common-commands-installer feature)
  // Requirements: 3.4, 3.5
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.CONFIRM_COMMON_COMMANDS,
    async (
      _event,
      projectPath: string,
      decisions: { name: string; action: 'skip' | 'overwrite' }[]
    ): Promise<{
      ok: true;
      value: {
        totalInstalled: number;
        totalSkipped: number;
        totalFailed: number;
        installedCommands: readonly string[];
        skippedCommands: readonly string[];
        failedCommands: readonly string[];
      };
    } | {
      ok: false;
      error: { type: string; path?: string; message?: string };
    }> => {
      logger.info('[installHandlers] CONFIRM_COMMON_COMMANDS called', {
        projectPath,
        decisionsCount: decisions.length,
      });

      const result = await unifiedCommandsetInstaller.installCommonCommandsWithDecisions(
        projectPath,
        decisions
      );

      if (!result.ok) {
        logger.error('[installHandlers] CONFIRM_COMMON_COMMANDS failed', { error: result.error });
        return {
          ok: false,
          error: result.error,
        };
      }

      logger.info('[installHandlers] CONFIRM_COMMON_COMMANDS succeeded', {
        totalInstalled: result.value.totalInstalled,
        totalSkipped: result.value.totalSkipped,
        totalFailed: result.value.totalFailed,
      });

      return result;
    }
  );

  // ============================================================
  // Agent Folder Management (commandset-profile-agent-cleanup)
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.CHECK_AGENT_FOLDER_EXISTS,
    async (_event, projectPath: string): Promise<boolean> => {
      logger.info('[installHandlers] CHECK_AGENT_FOLDER_EXISTS called', { projectPath });
      const agentFolderPath = join(projectPath, '.claude', 'agents', 'kiro');
      try {
        await access(agentFolderPath);
        return true;
      } catch {
        return false;
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.DELETE_AGENT_FOLDER,
    async (_event, projectPath: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      logger.info('[installHandlers] DELETE_AGENT_FOLDER called', { projectPath });
      const agentFolderPath = join(projectPath, '.claude', 'agents', 'kiro');
      try {
        await rm(agentFolderPath, { recursive: true, force: true });
        logger.info('[installHandlers] Agent folder deleted successfully', { agentFolderPath });
        return { ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('[installHandlers] Failed to delete agent folder', { agentFolderPath, error: message });
        return { ok: false, error: message };
      }
    }
  );

  // ============================================================
  // Experimental Tools Install (experimental-tools-installer feature)
  // Requirements: 2.1-2.4, 3.1-3.6, 4.1-4.4, 7.1-7.4
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.INSTALL_EXPERIMENTAL_DEBUG,
    async (
      _event,
      projectPath: string,
      options?: ExperimentalInstallOptions
    ): Promise<ExperimentalResult<ExperimentalInstallResult, ExperimentalInstallError>> => {
      logger.info('[installHandlers] INSTALL_EXPERIMENTAL_DEBUG called', { projectPath, options });
      return experimentalToolsInstaller.installDebugAgent(projectPath, options);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.CHECK_EXPERIMENTAL_TOOL_EXISTS,
    async (
      _event,
      projectPath: string,
      toolType: 'debug'
    ): Promise<ExperimentalCheckResult> => {
      logger.info('[installHandlers] CHECK_EXPERIMENTAL_TOOL_EXISTS called', { projectPath, toolType });
      return experimentalToolsInstaller.checkTargetExists(projectPath, toolType);
    }
  );

  // ============================================================
  // gemini-document-review Task 3.2: Gemini Document Review Install
  // Requirements: 1.2, 1.3, 1.4, 1.5, 1.6
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.INSTALL_EXPERIMENTAL_GEMINI_DOC_REVIEW,
    async (
      _event,
      projectPath: string,
      options?: ExperimentalInstallOptions
    ): Promise<ExperimentalResult<ExperimentalInstallResult, ExperimentalInstallError>> => {
      logger.info('[installHandlers] INSTALL_EXPERIMENTAL_GEMINI_DOC_REVIEW called', { projectPath, options });
      return experimentalToolsInstaller.installGeminiDocumentReview(projectPath, options);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.CHECK_EXPERIMENTAL_GEMINI_DOC_REVIEW_EXISTS,
    async (
      _event,
      projectPath: string
    ): Promise<ExperimentalCheckResult> => {
      logger.info('[installHandlers] CHECK_EXPERIMENTAL_GEMINI_DOC_REVIEW_EXISTS called', { projectPath });
      return experimentalToolsInstaller.checkGeminiDocumentReviewExists(projectPath);
    }
  );

  // ============================================================
  // CLI Install Handlers
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.GET_CLI_INSTALL_STATUS,
    async (_event, location: 'user' | 'system' = 'user') => {
      logger.info(`[installHandlers] GET_CLI_INSTALL_STATUS called (location: ${location})`);
      return getCliInstallStatus(location);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.INSTALL_CLI_COMMAND,
    async (_event, location: 'user' | 'system' = 'user') => {
      logger.info(`[installHandlers] INSTALL_CLI_COMMAND called (location: ${location})`);
      const result = await installCliCommand(location);
      return {
        ...result,
        instructions: getManualInstallInstructions(location),
      };
    }
  );

  // ============================================================
  // Commandset Version Check (commandset-version-detection feature)
  // Requirements: 2.1
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.CHECK_COMMANDSET_VERSIONS,
    async (_event, projectPath: string) => {
      logger.info('[installHandlers] CHECK_COMMANDSET_VERSIONS called', { projectPath });
      const result = await commandsetVersionService.checkVersions(projectPath);
      logger.info('[installHandlers] checkCommandsetVersions succeeded', {
        anyUpdateRequired: result.anyUpdateRequired,
        hasCommandsets: result.hasCommandsets,
      });
      return result;
    }
  );

  logger.info('[installHandlers] Install handlers registered');
}
