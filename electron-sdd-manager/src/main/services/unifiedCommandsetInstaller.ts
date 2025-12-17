/**
 * UnifiedCommandsetInstaller
 * 統合コマンドセットインストーラー - 複数のコマンドセットを統一的なインターフェースで管理
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 12.1, 12.2, 12.3
 */

import { CcSddWorkflowInstaller, InstallOptions, InstallResult, InstallError, Result } from './ccSddWorkflowInstaller';
import { BugWorkflowInstaller } from './bugWorkflowInstaller';

/**
 * Commandset names
 */
export type CommandsetName = 'cc-sdd' | 'bug' | 'spec-manager';

/**
 * Profile names
 */
export type ProfileName = 'minimal' | 'standard' | 'full' | 'lightweight-bug-fix-only';

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
 */
export class UnifiedCommandsetInstaller {
  private ccSddInstaller: CcSddWorkflowInstaller;
  private bugInstaller: BugWorkflowInstaller;
  private templateDir: string;

  /**
   * Predefined profiles
   */
  private static readonly PROFILES: Record<ProfileName, Profile> = {
    'minimal': {
      name: 'minimal',
      description: 'Minimal setup with basic spec-manager commands',
      commandsets: ['cc-sdd'] // Spec-manager basic commands included in cc-sdd
    },
    'standard': {
      name: 'standard',
      description: 'Standard setup with cc-sdd full commands and bug workflow',
      commandsets: ['cc-sdd', 'bug']
    },
    'full': {
      name: 'full',
      description: 'Full setup with all commandsets, agents, and settings',
      commandsets: ['cc-sdd', 'bug']
    },
    'lightweight-bug-fix-only': {
      name: 'lightweight-bug-fix-only',
      description: 'Lightweight setup with bug workflow only',
      commandsets: ['bug']
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
    this.templateDir = templateDir;
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
        const result = await this.ccSddInstaller.installAll(projectPath, options);
        if (!result.ok) return result;
        // Extract only commands from the full result
        return {
          ok: true,
          value: {
            installed: [
              ...result.value.commands.installed,
              ...result.value.agents.installed,
              ...result.value.settings.installed
            ],
            skipped: [
              ...result.value.commands.skipped,
              ...result.value.agents.skipped,
              ...result.value.settings.skipped
            ],
            overwritten: [
              ...result.value.commands.overwritten,
              ...result.value.agents.overwritten,
              ...result.value.settings.overwritten
            ]
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
      case 'spec-manager':
        // spec-manager is part of cc-sdd
        return this.installCommandset(projectPath, 'cc-sdd', options);
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

    return this.installMultiple(projectPath, profile.commandsets, options, progressCallback);
  }

  /**
   * Install all commandsets
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
    const allCommandsets: CommandsetName[] = ['cc-sdd', 'bug'];
    return this.installMultiple(projectPath, allCommandsets, options, progressCallback);
  }

  /**
   * Install multiple commandsets
   * @param projectPath - Project root path
   * @param commandsets - Commandsets to install
   * @param options - Install options
   * @param progressCallback - Progress callback
   * Requirements: 3.1, 3.3, 3.4
   */
  private async installMultiple(
    projectPath: string,
    commandsets: readonly CommandsetName[],
    options?: InstallOptions,
    progressCallback?: ProgressCallback
  ): Promise<Result<UnifiedInstallResult, InstallError>> {
    const resultMap = new Map<CommandsetName, InstallResult>();
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
      } else {
        // Continue on failure
        totalFailed++;
        resultMap.set(commandset, { installed: [], skipped: [], overwritten: [] });
      }
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
        }
      }
    };
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
}
