/**
 * SettingsFileManager
 * 設定ファイルの競合検出とマージ戦略の適用
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { access } from 'fs/promises';
import { join } from 'path';
import { CommandsetName } from './unifiedCommandsetInstaller';
import { Result } from './ccSddWorkflowInstaller';
import { CC_SDD_SETTINGS } from './ccSddWorkflowInstaller';
import { BUG_TEMPLATES } from './bugWorkflowInstaller';

/**
 * Merge strategy types
 * Requirements: 6.3
 */
export type MergeStrategy = 'overwrite' | 'merge' | 'skip' | 'newer-version';

/**
 * Settings conflict information
 * Requirements: 6.1, 6.2
 */
export interface SettingsConflict {
  readonly filePath: string;
  readonly conflictingCommandsets: readonly CommandsetName[];
  readonly recommendedStrategy: MergeStrategy;
}

/**
 * Settings merge result
 */
export interface SettingsMergeResult {
  readonly merged: readonly string[];
  readonly skipped: readonly string[];
  readonly conflicts: readonly SettingsConflict[];
}

/**
 * Settings validation result
 * Requirements: 6.4
 */
export interface SettingsValidationResult {
  readonly isValid: boolean;
  readonly existingFiles: readonly string[];
  readonly missingFiles: readonly string[];
}

/**
 * Merge error types
 */
export type MergeError =
  | { type: 'READ_ERROR'; path: string; message: string }
  | { type: 'WRITE_ERROR'; path: string; message: string };

/**
 * Required settings files for each commandset
 */
const REQUIRED_SETTINGS: Record<CommandsetName, readonly string[]> = {
  'cc-sdd': [
    'rules/ears-format.md',
    'rules/tasks-generation.md',
    'rules/tasks-parallel-analysis.md',
    'templates/specs/init.json',
    'templates/specs/requirements-init.md',
    'templates/specs/requirements.md',
    'templates/specs/design.md',
    'templates/specs/tasks.md',
  ],
  'bug': [
    'templates/bugs/report.md',
    'templates/bugs/analysis.md',
    'templates/bugs/fix.md',
    'templates/bugs/verification.md',
  ],
  'spec-manager': [],
};

/**
 * Merge strategy by file type
 */
const STRATEGY_BY_PATH: Record<string, MergeStrategy> = {
  'rules/': 'skip', // Don't overwrite rule customizations
  'templates/': 'newer-version', // Use newer version for templates
  '.json': 'merge', // Merge JSON files
};

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * SettingsFileManager
 * 設定ファイルの競合検出とマージを管理
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
export class SettingsFileManager {
  /**
   * Detect potential conflicts between commandsets
   * Requirements: 6.1, 6.2
   * @param commandsets - Commandsets being installed
   */
  async detectConflicts(
    commandsets: readonly CommandsetName[]
  ): Promise<SettingsConflict[]> {
    const conflicts: SettingsConflict[] = [];
    const fileToCommandsets = new Map<string, CommandsetName[]>();

    // Build map of files to commandsets
    for (const commandset of commandsets) {
      const files = REQUIRED_SETTINGS[commandset] || [];
      for (const file of files) {
        const existing = fileToCommandsets.get(file) || [];
        existing.push(commandset);
        fileToCommandsets.set(file, existing);
      }
    }

    // Find files that belong to multiple commandsets
    for (const [file, owners] of fileToCommandsets) {
      if (owners.length > 1) {
        conflicts.push({
          filePath: file,
          conflictingCommandsets: owners,
          recommendedStrategy: this.getMergeStrategyForFile(file),
        });
      }
    }

    return conflicts;
  }

  /**
   * Merge settings files according to strategy
   * Requirements: 6.2, 6.3
   * @param projectPath - Project root path
   * @param conflicts - Detected conflicts
   * @param strategy - Merge strategy to apply
   */
  async mergeSettings(
    _projectPath: string,
    conflicts: readonly SettingsConflict[],
    strategy: MergeStrategy
  ): Promise<Result<SettingsMergeResult, MergeError>> {
    const merged: string[] = [];
    const skipped: string[] = [];

    // For now, just track what would be merged or skipped
    for (const conflict of conflicts) {
      const effectiveStrategy = strategy === 'newer-version'
        ? conflict.recommendedStrategy
        : strategy;

      if (effectiveStrategy === 'skip') {
        skipped.push(conflict.filePath);
      } else {
        merged.push(conflict.filePath);
      }
    }

    return {
      ok: true,
      value: {
        merged,
        skipped,
        conflicts,
      },
    };
  }

  /**
   * Validate settings file completeness
   * Requirements: 6.4
   * @param projectPath - Project root path
   */
  async validateSettings(projectPath: string): Promise<SettingsValidationResult> {
    const existingFiles: string[] = [];
    const missingFiles: string[] = [];

    // Check all required settings for cc-sdd
    const allRequired = [
      ...REQUIRED_SETTINGS['cc-sdd'],
      ...REQUIRED_SETTINGS['bug'],
    ];

    for (const file of allRequired) {
      const filePath = join(projectPath, '.kiro', 'settings', file);
      if (await fileExists(filePath)) {
        existingFiles.push(file);
      } else {
        missingFiles.push(file);
      }
    }

    return {
      isValid: missingFiles.length === 0,
      existingFiles,
      missingFiles,
    };
  }

  /**
   * Get merge strategy for a specific file
   * Requirements: 6.3
   * @param filePath - Relative file path
   */
  getMergeStrategyForFile(filePath: string): MergeStrategy {
    // Check path patterns
    for (const [pattern, strategy] of Object.entries(STRATEGY_BY_PATH)) {
      if (filePath.includes(pattern)) {
        return strategy;
      }
    }

    // Default strategy
    return 'newer-version';
  }

  /**
   * Get list of required files for commandsets
   * Requirements: 6.4
   * @param commandsets - Commandsets to check
   */
  getRequiredFiles(commandsets: readonly CommandsetName[]): readonly string[] {
    const files: string[] = [];

    for (const commandset of commandsets) {
      const required = REQUIRED_SETTINGS[commandset] || [];
      files.push(...required);
    }

    // Deduplicate
    return [...new Set(files)];
  }
}
