/**
 * UnifiedCommandsetInstaller
 * 統合コマンドセットインストーラー - 複数のコマンドセットを統一的なインターフェースで管理
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 12.1, 12.2, 12.3
 * common-commands-installer: Extended with common commands integration (Tasks 3.1, 3.2)
 */

import { mkdir } from 'fs/promises';
import path from 'path';
import { CcSddWorkflowInstaller, InstallOptions, InstallResult, InstallError, Result } from './ccSddWorkflowInstaller';
import { BugWorkflowInstaller } from './bugWorkflowInstaller';
import { addPermissionsToProject } from './permissionsService';
import { REQUIRED_PERMISSIONS } from './projectChecker';
import { projectConfigService, ProfileConfig, CommandsetVersionRecord } from './layoutConfigService';
import { CommandsetDefinitionManager } from './commandsetDefinitionManager';
import {
  CommonCommandsInstallerService,
  CommonCommandConflict,
  CommonCommandDecision,
  CommonCommandsInstallResult,
  type InstallError as CommonCommandsInstallError,
} from './experimentalToolsInstallerService';

/**
 * Commandset names
 */
export type CommandsetName = 'cc-sdd' | 'cc-sdd-agent' | 'bug' | 'document-review' | 'spec-manager';

/**
 * Profile names
 */
export type ProfileName = 'cc-sdd' | 'cc-sdd-agent' | 'spec-manager';

/**
 * Progress callback
 */
export type ProgressCallback = (current: number, total: number, currentCommandset: string) => void;

/**
 * CLAUDE.md update result
 */
export interface ClaudeMdUpdateResult {
  readonly action: 'created' | 'merged' | 'skipped';
  readonly reason?: 'already_exists';
}

/**
 * Permissions update result
 */
export interface PermissionsUpdateResult {
  readonly added: readonly string[];
  readonly alreadyExists: readonly string[];
  readonly total: number;
}

/**
 * Settings update result
 */
export interface SettingsUpdateResult {
  readonly action: 'merged' | 'skipped';
  readonly mergedFiles: readonly string[];
}

/**
 * Unified install result
 * common-commands-installer: Extended with commonCommands and commonCommandConflicts
 */
export interface UnifiedInstallResult {
  readonly commandsets: ReadonlyMap<CommandsetName, InstallResult>;
  readonly claudeMd: ClaudeMdUpdateResult;
  readonly permissions: PermissionsUpdateResult;
  readonly settings: SettingsUpdateResult;
  readonly summary: {
    readonly totalInstalled: number;
    readonly totalSkipped: number;
    readonly totalFailed: number;
  };
  /** Common commands install result (Task 3.1) */
  readonly commonCommands?: CommonCommandsInstallResult;
  /** Common command conflicts for UI confirmation (Task 3.1) */
  readonly commonCommandConflicts?: readonly CommonCommandConflict[];
}

/**
 * Commandset status
 */
export interface CommandsetStatus {
  readonly name: CommandsetName;
  readonly installedFiles: number;
  readonly missingFiles: number;
  readonly totalFiles: number;
  readonly missingComponents: string[];
}

/**
 * Unified install status
 */
export interface UnifiedInstallStatus {
  readonly commandsets: ReadonlyMap<CommandsetName, CommandsetStatus>;
  readonly completenessScore: number; // 0-100
  readonly isMinimalSetupComplete: boolean;
  readonly missingComponents: string[];
}

/**
 * Profile configuration
 */
interface Profile {
  readonly name: ProfileName;
  readonly description: string;
  readonly commandsets: readonly CommandsetName[];
}

/**
 * Unified Commandset Installer
 * 複数のコマンドセットインストーラーを統一的に管理
 * common-commands-installer: Extended with CommonCommandsInstallerService integration
 */
export class UnifiedCommandsetInstaller {
  private ccSddInstaller: CcSddWorkflowInstaller;
  private bugInstaller: BugWorkflowInstaller;
  private definitionManager: CommandsetDefinitionManager;
  private commonCommandsInstaller: CommonCommandsInstallerService;

  /**
   * Predefined profiles
   */
  private static readonly PROFILES: Record<ProfileName, Profile> = {
    'cc-sdd': {
      name: 'cc-sdd',
      description: 'cc-sdd workflow commands with bug and document-review',
      commandsets: ['cc-sdd', 'bug', 'document-review']
    },
    'cc-sdd-agent': {
      name: 'cc-sdd-agent',
      description: 'cc-sdd-agent commands with bug, document-review, and agents',
      commandsets: ['cc-sdd-agent', 'bug', 'document-review']
    },
    'spec-manager': {
      name: 'spec-manager',
      description: 'spec-manager commands with bug and document-review',
      commandsets: ['spec-manager', 'bug', 'document-review']
    }
  };

  /**
   * Create unified installer
   * @param ccSddInstaller - CC-SDD workflow installer
   * @param bugInstaller - Bug workflow installer
   * @param templateDir - Template directory
   */
  constructor(
    ccSddInstaller: CcSddWorkflowInstaller,
    bugInstaller: BugWorkflowInstaller,
    templateDir: string
  ) {
    this.ccSddInstaller = ccSddInstaller;
    this.bugInstaller = bugInstaller;
    this.definitionManager = new CommandsetDefinitionManager();
    // common-commands-installer: Initialize common commands installer
    // Uses either provided template path or default path
    const commonTemplateDir = path.join(templateDir, 'commands', 'common');
    this.commonCommandsInstaller = new CommonCommandsInstallerService(commonTemplateDir);
  }

  /**
   * Install a specific commandset
   * @param projectPath - Project root path
   * @param commandsetName - Commandset name
   * @param options - Install options
   * Requirements: 1.3, 1.4
   */
  async installCommandset(
    projectPath: string,
    commandsetName: CommandsetName,
    options?: InstallOptions
  ): Promise<Result<InstallResult, InstallError>> {
    switch (commandsetName) {
      case 'cc-sdd': {
        // Install cc-sdd commands and settings
        const commandResult = await this.ccSddInstaller.installCommands(projectPath, 'cc-sdd', options);
        if (!commandResult.ok) return commandResult;

        const settingsResult = await this.ccSddInstaller.installSettings(projectPath, options);
        if (!settingsResult.ok) return settingsResult;

        // Install helper scripts (merge-helper-scripts feature)
        const scriptsResult = await this.ccSddInstaller.installScripts(projectPath, options);
        if (!scriptsResult.ok) return scriptsResult;

        // Add required permissions
        await addPermissionsToProject(projectPath, [...REQUIRED_PERMISSIONS]);

        return {
          ok: true,
          value: {
            installed: [...commandResult.value.installed, ...settingsResult.value.installed, ...scriptsResult.value.installed],
            skipped: [...commandResult.value.skipped, ...settingsResult.value.skipped, ...scriptsResult.value.skipped],
            overwritten: [...commandResult.value.overwritten, ...settingsResult.value.overwritten, ...scriptsResult.value.overwritten]
          }
        };
      }
      case 'cc-sdd-agent': {
        // Install cc-sdd-agent commands, agents, and settings
        const commandResult = await this.ccSddInstaller.installCommands(projectPath, 'cc-sdd-agent', options);
        if (!commandResult.ok) return commandResult;

        const agentResult = await this.ccSddInstaller.installAgents(projectPath, options);
        if (!agentResult.ok) return agentResult;

        const settingsResult = await this.ccSddInstaller.installSettings(projectPath, options);
        if (!settingsResult.ok) return settingsResult;

        // Install helper scripts (merge-helper-scripts feature)
        const scriptsResult = await this.ccSddInstaller.installScripts(projectPath, options);
        if (!scriptsResult.ok) return scriptsResult;

        // Add required permissions
        await addPermissionsToProject(projectPath, [...REQUIRED_PERMISSIONS]);

        return {
          ok: true,
          value: {
            installed: [...commandResult.value.installed, ...agentResult.value.installed, ...settingsResult.value.installed, ...scriptsResult.value.installed],
            skipped: [...commandResult.value.skipped, ...agentResult.value.skipped, ...settingsResult.value.skipped, ...scriptsResult.value.skipped],
            overwritten: [...commandResult.value.overwritten, ...agentResult.value.overwritten, ...settingsResult.value.overwritten, ...scriptsResult.value.overwritten]
          }
        };
      }
      case 'bug': {
        const result = await this.bugInstaller.installAll(projectPath, options);
        if (!result.ok) return result;
        return {
          ok: true,
          value: {
            installed: [
              ...result.value.commands.installed,
              ...result.value.templates.installed
            ],
            skipped: [
              ...result.value.commands.skipped,
              ...result.value.templates.skipped
            ],
            overwritten: [
              ...result.value.commands.overwritten,
              ...result.value.templates.overwritten
            ]
          }
        };
      }
      case 'document-review': {
        // Install document-review commands
        const result = await this.ccSddInstaller.installCommands(projectPath, 'document-review', options);
        if (!result.ok) return result;
        return {
          ok: true,
          value: {
            installed: result.value.installed,
            skipped: result.value.skipped,
            overwritten: result.value.overwritten
          }
        };
      }
      case 'spec-manager': {
        // Install spec-manager commands and settings
        const commandResult = await this.ccSddInstaller.installCommands(projectPath, 'spec-manager', options);
        if (!commandResult.ok) return commandResult;

        // Install generate-release command from cc-sdd-agent template
        // Requirements: 2.1, 2.2 (generate-release-command feature)
        const generateReleaseResult = await this.ccSddInstaller.installSingleCommand(
          projectPath,
          'cc-sdd-agent',
          'generate-release',
          options
        );

        const settingsResult = await this.ccSddInstaller.installSettings(projectPath, options);
        if (!settingsResult.ok) return settingsResult;

        // Install helper scripts (merge-helper-scripts feature)
        const scriptsResult = await this.ccSddInstaller.installScripts(projectPath, options);
        if (!scriptsResult.ok) return scriptsResult;

        // Add required permissions
        await addPermissionsToProject(projectPath, [...REQUIRED_PERMISSIONS]);

        // Merge generate-release result into command result
        const mergedInstalled = [...commandResult.value.installed];
        const mergedSkipped = [...commandResult.value.skipped];
        const mergedOverwritten = [...commandResult.value.overwritten];
        if (generateReleaseResult.ok) {
          mergedInstalled.push(...generateReleaseResult.value.installed);
          mergedSkipped.push(...generateReleaseResult.value.skipped);
          mergedOverwritten.push(...generateReleaseResult.value.overwritten);
        }

        return {
          ok: true,
          value: {
            installed: [...mergedInstalled, ...settingsResult.value.installed, ...scriptsResult.value.installed],
            skipped: [...mergedSkipped, ...settingsResult.value.skipped, ...scriptsResult.value.skipped],
            overwritten: [...mergedOverwritten, ...settingsResult.value.overwritten, ...scriptsResult.value.overwritten]
          }
        };
      }
      default:
        return {
          ok: false,
          error: { type: 'TEMPLATE_NOT_FOUND', path: `Unknown commandset: ${commandsetName}` }
        };
    }
  }

  /**
   * Install by profile
   * @param projectPath - Project root path
   * @param profileName - Profile name
   * @param options - Install options
   * @param progressCallback - Progress callback
   * Requirements: 3.2, 3.3
   */
  async installByProfile(
    projectPath: string,
    profileName: ProfileName,
    options?: InstallOptions,
    progressCallback?: ProgressCallback
  ): Promise<Result<UnifiedInstallResult, InstallError>> {
    const profile = UnifiedCommandsetInstaller.PROFILES[profileName];
    if (!profile) {
      return {
        ok: false,
        error: { type: 'TEMPLATE_NOT_FOUND', path: `Unknown profile: ${profileName}` }
      };
    }

    const result = await this.installMultiple(projectPath, profile.commandsets, options, progressCallback);

    // Save profile configuration after successful installation
    if (result.ok) {
      await this.saveProfileConfig(projectPath, profileName);
    }

    return result;
  }

  /**
   * Save profile configuration to .kiro/sdd-orchestrator.json
   * NOTE: This method is deprecated as profile config is now saved separately from commandset versions.
   * The profile is saved via projectConfigService.saveProfile which preserves v3 format.
   * @param projectPath - Project root path
   * @param profileName - Profile name
   */
  private async saveProfileConfig(
    projectPath: string,
    profileName: ProfileName
  ): Promise<void> {
    const config: ProfileConfig = {
      name: profileName,
      installedAt: new Date().toISOString(),
    };

    try {
      // Note: saveProfile now preserves v3 format after commandset versions are recorded
      await projectConfigService.saveProfile(projectPath, config);
    } catch (error) {
      // Log but don't fail installation if config can't be saved
      console.warn('[UnifiedCommandsetInstaller] Failed to save profile config:', error);
    }
  }

  /**
   * Install all commandsets (equivalent to cc-sdd-agent profile with all commandsets)
   * @param projectPath - Project root path
   * @param options - Install options
   * @param progressCallback - Progress callback
   * Requirements: 3.1, 3.4
   */
  async installAll(
    projectPath: string,
    options?: InstallOptions,
    progressCallback?: ProgressCallback
  ): Promise<Result<UnifiedInstallResult, InstallError>> {
    // Install all unique commandsets from cc-sdd-agent profile (most comprehensive)
    const allCommandsets: CommandsetName[] = ['cc-sdd-agent', 'bug', 'document-review'];
    return this.installMultiple(projectPath, allCommandsets, options, progressCallback);
  }

  /**
   * Install multiple commandsets
   * @param projectPath - Project root path
   * @param commandsets - Commandsets to install
   * @param options - Install options
   * @param progressCallback - Progress callback
   * Requirements: 3.1, 3.3, 3.4
   * Requirements (commandset-version-detection): 1.1, 1.2, 1.3, 1.4
   */
  private async installMultiple(
    projectPath: string,
    commandsets: readonly CommandsetName[],
    options?: InstallOptions,
    progressCallback?: ProgressCallback
  ): Promise<Result<UnifiedInstallResult, InstallError>> {
    const resultMap = new Map<CommandsetName, InstallResult>();
    const successfullyInstalled: CommandsetName[] = [];
    let totalInstalled = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    const total = commandsets.length;
    let current = 0;

    for (const commandset of commandsets) {
      current++;
      if (progressCallback) {
        progressCallback(current, total, commandset);
      }

      const result = await this.installCommandset(projectPath, commandset, options);

      if (result.ok) {
        const value = result.value;
        resultMap.set(commandset, value);
        totalInstalled += value.installed.length;
        totalSkipped += value.skipped.length;
        // Track successfully installed commandsets for version recording
        if (value.installed.length > 0 || value.overwritten.length > 0) {
          successfullyInstalled.push(commandset);
        }
      } else {
        // Continue on failure
        totalFailed++;
        resultMap.set(commandset, { installed: [], skipped: [], overwritten: [] });
      }
    }

    // Record versions for successfully installed commandsets
    // Requirements (commandset-version-detection): 1.1, 1.2, 1.3, 1.4
    if (successfullyInstalled.length > 0) {
      await this.recordCommandsetVersions(projectPath, successfullyInstalled);
    }

    // Ensure required project directories exist (.kiro/steering, .kiro/specs)
    await this.ensureProjectDirectories(projectPath);

    // common-commands-installer Task 3.1: Check for common command conflicts
    let commonCommands: CommonCommandsInstallResult | undefined;
    let commonCommandConflicts: readonly CommonCommandConflict[] | undefined;

    try {
      const conflicts = await this.commonCommandsInstaller.checkConflicts(projectPath);

      if (conflicts.length > 0) {
        // Return conflicts for UI confirmation
        commonCommandConflicts = conflicts;
        console.log('[UnifiedCommandsetInstaller] Common command conflicts found', {
          count: conflicts.length,
          commands: conflicts.map(c => c.name),
        });
      } else {
        // No conflicts - auto-install all common commands
        const installResult = await this.commonCommandsInstaller.installAllCommands(projectPath, []);
        if (installResult.ok) {
          commonCommands = installResult.value;
          commonCommandConflicts = [];
          console.log('[UnifiedCommandsetInstaller] Common commands auto-installed', {
            installed: installResult.value.totalInstalled,
          });
        }
      }
    } catch (error) {
      // Log warning but don't fail profile installation
      console.warn('[UnifiedCommandsetInstaller] Failed to process common commands', { error });
      commonCommandConflicts = [];
    }

    return {
      ok: true,
      value: {
        commandsets: resultMap,
        claudeMd: { action: 'merged' },
        permissions: { added: [], alreadyExists: [], total: 0 },
        settings: { action: 'merged', mergedFiles: [] },
        summary: {
          totalInstalled,
          totalSkipped,
          totalFailed
        },
        commonCommands,
        commonCommandConflicts,
      }
    };
  }

  /**
   * Record commandset versions to sdd-orchestrator.json
   * Requirements (commandset-version-detection): 1.1, 1.2, 1.3, 1.4
   * @param projectPath - Project root path
   * @param commandsets - Successfully installed commandset names
   */
  private async recordCommandsetVersions(
    projectPath: string,
    commandsets: CommandsetName[]
  ): Promise<void> {
    const now = new Date().toISOString();
    const versionRecords: Record<string, CommandsetVersionRecord> = {};

    for (const name of commandsets) {
      const version = this.definitionManager.getVersion(name);
      versionRecords[name] = {
        version,
        installedAt: now,
      };
    }

    try {
      await projectConfigService.saveCommandsetVersions(projectPath, versionRecords);
    } catch (error) {
      // Log but don't fail installation if version recording fails
      console.warn('[UnifiedCommandsetInstaller] Failed to record commandset versions:', error);
    }
  }

  /**
   * Ensure required project directories exist
   * Creates .kiro/steering, .kiro/specs, and .kiro/bugs directories if they don't exist
   * Bug fix: bugs-folder-creation - Added .kiro/bugs to ensure directory exists for file watching
   * @param projectPath - Project root path
   */
  private async ensureProjectDirectories(projectPath: string): Promise<void> {
    const requiredDirs = [
      path.join(projectPath, '.kiro', 'steering'),
      path.join(projectPath, '.kiro', 'specs'),
      path.join(projectPath, '.kiro', 'bugs'),
    ];

    for (const dir of requiredDirs) {
      try {
        await mkdir(dir, { recursive: true });
      } catch (error) {
        // Log but don't fail installation if directory creation fails
        console.warn(`[UnifiedCommandsetInstaller] Failed to create directory: ${dir}`, error);
      }
    }
  }

  /**
   * Check installation status for all commandsets
   * @param projectPath - Project root path
   * Requirements: 4.1, 4.2, 4.3
   */
  async checkAllInstallStatus(projectPath: string): Promise<UnifiedInstallStatus> {
    const statusMap = new Map<CommandsetName, CommandsetStatus>();

    // Check cc-sdd status
    const ccSddStatus = await this.ccSddInstaller.checkInstallStatus(projectPath);
    const ccSddTotalFiles = ccSddStatus.commands.installed.length + ccSddStatus.commands.missing.length +
                            ccSddStatus.agents.installed.length + ccSddStatus.agents.missing.length +
                            ccSddStatus.settings.installed.length + ccSddStatus.settings.missing.length;
    const ccSddInstalledFiles = ccSddStatus.commands.installed.length +
                                ccSddStatus.agents.installed.length +
                                ccSddStatus.settings.installed.length;
    const ccSddMissingFiles = ccSddStatus.commands.missing.length +
                              ccSddStatus.agents.missing.length +
                              ccSddStatus.settings.missing.length;

    statusMap.set('cc-sdd', {
      name: 'cc-sdd',
      installedFiles: ccSddInstalledFiles,
      missingFiles: ccSddMissingFiles,
      totalFiles: ccSddTotalFiles,
      missingComponents: [
        ...ccSddStatus.commands.missing,
        ...ccSddStatus.agents.missing,
        ...ccSddStatus.settings.missing
      ]
    });

    // Check bug status
    const bugStatus = await this.bugInstaller.checkInstallStatus(projectPath);
    const bugTotalFiles = bugStatus.commands.installed.length + bugStatus.commands.missing.length +
                          bugStatus.templates.installed.length + bugStatus.templates.missing.length;
    const bugInstalledFiles = bugStatus.commands.installed.length + bugStatus.templates.installed.length;
    const bugMissingFiles = bugStatus.commands.missing.length + bugStatus.templates.missing.length;

    statusMap.set('bug', {
      name: 'bug',
      installedFiles: bugInstalledFiles,
      missingFiles: bugMissingFiles,
      totalFiles: bugTotalFiles,
      missingComponents: [
        ...bugStatus.commands.missing,
        ...bugStatus.templates.missing
      ]
    });

    // Calculate completeness score
    let totalInstalledFiles = 0;
    let totalFiles = 0;
    const allMissingComponents: string[] = [];

    for (const status of statusMap.values()) {
      totalInstalledFiles += status.installedFiles;
      totalFiles += status.totalFiles;
      allMissingComponents.push(...status.missingComponents);
    }

    const completenessScore = totalFiles > 0 ? Math.round((totalInstalledFiles / totalFiles) * 100) : 0;

    // Check minimal setup completion
    const isMinimalSetupComplete = this.checkMinimalSetupComplete(statusMap);

    return {
      commandsets: statusMap,
      completenessScore,
      isMinimalSetupComplete,
      missingComponents: allMissingComponents
    };
  }

  /**
   * Check if minimal setup is complete
   * @param projectPath - Project root path
   * Requirements: 4.5
   */
  async isMinimalSetupComplete(projectPath: string): Promise<boolean> {
    const status = await this.checkAllInstallStatus(projectPath);
    return status.isMinimalSetupComplete;
  }

  /**
   * Check if minimal setup is complete from status map
   * @param statusMap - Status map
   */
  private checkMinimalSetupComplete(statusMap: Map<CommandsetName, CommandsetStatus>): boolean {
    // Minimal setup requires cc-sdd commandset
    const ccSddStatus = statusMap.get('cc-sdd');
    if (!ccSddStatus) {
      return false;
    }

    // At least 80% of cc-sdd files should be installed for minimal setup
    const ccSddCompleteness = ccSddStatus.totalFiles > 0
      ? (ccSddStatus.installedFiles / ccSddStatus.totalFiles) * 100
      : 0;

    return ccSddCompleteness >= 80;
  }

  /**
   * Install common commands with user decisions for conflicts
   * common-commands-installer Task 3.2: User decision handling
   * Requirements: 3.4, 3.5
   * @param projectPath - Project root path
   * @param decisions - User decisions for conflicting files
   * @returns Install result
   */
  async installCommonCommandsWithDecisions(
    projectPath: string,
    decisions: CommonCommandDecision[]
  ): Promise<Result<CommonCommandsInstallResult, CommonCommandsInstallError>> {
    console.log('[UnifiedCommandsetInstaller] Installing common commands with decisions', {
      projectPath,
      decisionsCount: decisions.length,
    });

    const result = await this.commonCommandsInstaller.installAllCommands(projectPath, decisions);

    if (result.ok) {
      console.log('[UnifiedCommandsetInstaller] Common commands installed', {
        installed: result.value.totalInstalled,
        skipped: result.value.totalSkipped,
        failed: result.value.totalFailed,
      });
    } else {
      console.warn('[UnifiedCommandsetInstaller] Common commands installation failed', {
        error: result.error,
      });
    }

    return result;
  }
}
