/**
 * CommandsetVersionService
 * コマンドセットバージョンのチェックとアップデート検出
 * Requirements (commandset-version-detection): 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { projectConfigService } from './layoutConfigService';
import { CommandsetDefinitionManager } from './commandsetDefinitionManager';
import type { CommandsetName } from './unifiedCommandsetInstaller';

/**
 * Individual commandset version information
 * Requirements (commandset-version-detection): 2.1
 */
export interface CommandsetVersionInfo {
  readonly name: CommandsetName;
  readonly bundleVersion: string;
  readonly installedVersion?: string;
  readonly installedAt?: string;
  readonly updateRequired: boolean;
}

/**
 * Version check result for a project
 * Requirements (commandset-version-detection): 2.1, 2.5
 */
export interface VersionCheckResult {
  readonly projectPath: string;
  readonly commandsets: readonly CommandsetVersionInfo[];
  readonly anyUpdateRequired: boolean;
  readonly hasCommandsets: boolean;
  readonly legacyProject: boolean;
}

/**
 * Known commandset names that we check
 */
const KNOWN_COMMANDSETS: readonly CommandsetName[] = [
  'cc-sdd',
  'cc-sdd-agent',
  'bug',
  'document-review',
  'spec-manager',
];

/**
 * CommandsetVersionService
 * コマンドセットのバージョンチェックと更新検出
 * Requirements (commandset-version-detection): 2.1, 2.2, 2.3, 2.4, 2.5
 */
export class CommandsetVersionService {
  private readonly definitionManager: CommandsetDefinitionManager;

  constructor() {
    this.definitionManager = new CommandsetDefinitionManager();
  }

  /**
   * Check commandset versions for a project
   * Requirements (commandset-version-detection): 2.1, 2.5
   * @param projectPath - Project root path
   * @returns Version check result
   */
  async checkVersions(projectPath: string): Promise<VersionCheckResult> {
    // Load installed versions from project config
    const installedVersions = await projectConfigService.loadCommandsetVersions(projectPath);

    // Determine if this is a legacy project (no commandsets field)
    const hasCommandsets = installedVersions !== undefined;
    const legacyProject = !hasCommandsets;

    // Build version info for each known commandset
    const commandsets: CommandsetVersionInfo[] = KNOWN_COMMANDSETS.map(name => {
      const bundleVersion = this.definitionManager.getVersion(name);
      const installed = installedVersions?.[name];

      // Determine if update is required
      // Requirements (commandset-version-detection): 2.2
      const updateRequired = this.isUpdateRequired(installed?.version, bundleVersion);

      return {
        name,
        bundleVersion,
        installedVersion: installed?.version,
        installedAt: installed?.installedAt,
        updateRequired,
      };
    });

    // Calculate anyUpdateRequired
    const anyUpdateRequired = commandsets.some(c => c.updateRequired);

    return {
      projectPath,
      commandsets,
      anyUpdateRequired,
      hasCommandsets,
      legacyProject,
    };
  }

  /**
   * Determine if an update is required
   * Requirements (commandset-version-detection): 2.2
   * @param installedVersion - Currently installed version (undefined means not installed)
   * @param bundleVersion - Version bundled in the app
   * @returns true if update is required
   */
  private isUpdateRequired(installedVersion: string | undefined, bundleVersion: string): boolean {
    // If not installed, don't require update (user hasn't opted in)
    if (installedVersion === undefined) {
      return false;
    }

    // Handle invalid version format as 0.0.0 (needs update)
    // Requirements (commandset-version-detection): 2.4
    const semverPattern = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
    if (!semverPattern.test(installedVersion)) {
      return true;
    }

    // Use definition manager's version comparison
    return this.definitionManager.isNewerVersion(installedVersion, bundleVersion);
  }

  /**
   * Get list of commandsets that need updating
   * @param projectPath - Project root path
   * @returns List of commandset names that need updating
   */
  async getUpdatableCommandsets(projectPath: string): Promise<readonly CommandsetName[]> {
    const result = await this.checkVersions(projectPath);
    return result.commandsets
      .filter(c => c.updateRequired)
      .map(c => c.name);
  }
}
