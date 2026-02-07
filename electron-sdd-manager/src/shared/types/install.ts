/**
 * Install Types
 * Shared type definitions for CLI and commandset installation
 *
 * Migrated from legacy Electron API type definitions (Task 11.3)
 * Canonical definitions also exist in:
 *   - main/services/cliInstallerService.ts (CliInstallResult)
 *   - main/services/experimentalToolsInstallerService.ts (CommonCommand*)
 *
 * Requirements: spec-manager install, common-commands-installer
 */

/**
 * CLI install result
 */
export interface CliInstallResult {
  readonly success: boolean;
  readonly message: string;
  readonly requiresSudo: boolean;
  readonly command?: string;
}

/**
 * CLI install instructions
 */
export interface CliInstallInstructions {
  readonly title: string;
  readonly steps: readonly string[];
  readonly command: string;
  readonly usage: {
    readonly title: string;
    readonly examples: ReadonlyArray<{ command: string; description: string }>;
  };
  readonly pathNote?: string;
}

/**
 * Common command conflict info
 * (common-commands-installer feature)
 */
export interface CommonCommandConflict {
  readonly name: string;
  readonly existingPath: string;
}

/**
 * Common command decision for conflict resolution
 * (common-commands-installer feature)
 */
export interface CommonCommandDecision {
  readonly name: string;
  readonly action: 'skip' | 'overwrite';
}

/**
 * Common commands install result
 * (common-commands-installer feature)
 */
export interface CommonCommandsInstallResult {
  readonly totalInstalled: number;
  readonly totalSkipped: number;
  readonly totalFailed: number;
  readonly installedCommands: readonly string[];
  readonly skippedCommands: readonly string[];
  readonly failedCommands: readonly string[];
}
