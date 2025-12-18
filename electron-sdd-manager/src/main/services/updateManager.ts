/**
 * UpdateManager
 * インストール済みコマンドセットのバージョン検出とアップデート機能
 * Requirements: 14.1, 14.2, 14.4
 * Note: Phase 2スケルトン実装 - 将来的に完全実装
 */

import { readFile, readdir, access } from 'fs/promises';
import { join } from 'path';
import { CommandsetName } from './unifiedCommandsetInstaller';
import { Result } from './ccSddWorkflowInstaller';

/**
 * Version information
 * Requirements: 14.2
 */
export interface VersionInfo {
  readonly current: string; // Semantic version
  readonly latest: string;
  readonly updateAvailable: boolean;
}

/**
 * Available update information
 * Requirements: 14.3
 */
export interface UpdateAvailable {
  readonly commandset: CommandsetName;
  readonly currentVersion: string;
  readonly latestVersion: string;
  readonly changes: readonly string[]; // Change summary
}

/**
 * Update result
 * Requirements: 14.1
 */
export interface UpdateResult {
  readonly updated: readonly CommandsetName[];
  readonly skipped: readonly CommandsetName[];
  readonly failed: readonly CommandsetName[];
}

/**
 * Update error types
 */
export type UpdateError =
  | { type: 'VERSION_DETECTION_FAILED'; commandset: CommandsetName }
  | { type: 'UPDATE_FAILED'; commandset: CommandsetName; message: string }
  | { type: 'UPDATE_NOT_IMPLEMENTED'; message: string };

/**
 * Version pattern for detecting version in files
 * Format: <!-- version: x.y.z -->
 */
const VERSION_PATTERN = /<!--\s*version:\s*(\d+\.\d+\.\d+(?:-[\w.]+)?)\s*-->/;

/**
 * Semantic version pattern
 */
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

/**
 * Current latest versions (will be fetched from remote in future)
 * This is a placeholder for Phase 2 complete implementation
 */
const LATEST_VERSIONS: Record<CommandsetName, string> = {
  'cc-sdd': '1.0.0',
  'cc-sdd-agent': '1.0.0',
  'bug': '1.0.0',
  'document-review': '1.0.0',
  'spec-manager': '1.0.0',
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
 * Compare two semantic versions
 * @returns negative if a < b, 0 if a == b, positive if a > b
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.replace(/-.*$/, '').split('.').map(Number);
  const partsB = b.replace(/-.*$/, '').split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const diff = (partsA[i] || 0) - (partsB[i] || 0);
    if (diff !== 0) return diff;
  }

  return 0;
}

/**
 * UpdateManager
 * コマンドセットのバージョン管理とアップデート機能を提供
 * Requirements: 14.1, 14.2, 14.4
 */
export class UpdateManager {
  /**
   * Detect version of installed commandset
   * Requirements: 14.2
   * @param projectPath - Project root path
   * @param commandsetName - Commandset name
   */
  async detectVersion(
    projectPath: string,
    commandsetName: CommandsetName
  ): Promise<VersionInfo> {
    const latest = LATEST_VERSIONS[commandsetName] || '1.0.0';
    let current = '0.0.0';

    try {
      // Get first command file to check version
      const commandDir = join(projectPath, '.claude', 'commands', 'kiro');

      if (!(await fileExists(commandDir))) {
        return { current, latest, updateAvailable: compareVersions(current, latest) < 0 };
      }

      // Get files in command directory
      const files = await readdir(commandDir);
      const commandFiles = files.filter(f => f.endsWith('.md'));

      if (commandFiles.length === 0) {
        return { current, latest, updateAvailable: compareVersions(current, latest) < 0 };
      }

      // Read first command file to extract version
      const firstFile = commandFiles[0];
      const filePath = join(commandDir, firstFile);
      const content = await readFile(filePath, 'utf-8');

      // Extract version from comment
      const match = content.match(VERSION_PATTERN);
      if (match && SEMVER_PATTERN.test(match[1])) {
        current = match[1];
      }
    } catch {
      // Failed to detect version, use default
    }

    return {
      current,
      latest,
      updateAvailable: compareVersions(current, latest) < 0,
    };
  }

  /**
   * Check for available updates
   * Requirements: 14.3
   * @param projectPath - Project root path
   */
  async checkAvailableUpdates(projectPath: string): Promise<readonly UpdateAvailable[]> {
    const updates: UpdateAvailable[] = [];
    const commandsets: CommandsetName[] = ['cc-sdd', 'bug'];

    for (const commandset of commandsets) {
      const versionInfo = await this.detectVersion(projectPath, commandset);

      if (versionInfo.updateAvailable) {
        updates.push({
          commandset,
          currentVersion: versionInfo.current,
          latestVersion: versionInfo.latest,
          changes: [], // Will be populated in Phase 2 complete implementation
        });
      }
    }

    return updates;
  }

  /**
   * Update all commandsets to latest version
   * Requirements: 14.1
   * Note: Skeleton implementation for Phase 2
   * @param projectPath - Project root path
   */
  async updateAll(
    _projectPath: string
  ): Promise<Result<UpdateResult, UpdateError>> {
    // Phase 2: This is a skeleton implementation
    // Full implementation will include:
    // - Automatic backup before update (using RollbackManager)
    // - Download latest templates from source
    // - Apply updates with merge handling
    // - Validation after update

    return {
      ok: false,
      error: {
        type: 'UPDATE_NOT_IMPLEMENTED',
        message: 'Update functionality will be implemented in Phase 2. For now, please reinstall with force option.',
      },
    };
  }

  /**
   * Get change summary for an update
   * Note: Skeleton implementation for Phase 2
   * @param _commandset - Commandset name
   * @param _fromVersion - Current version
   * @param _toVersion - Target version
   */
  async getChangeSummary(
    _commandset: CommandsetName,
    _fromVersion: string,
    _toVersion: string
  ): Promise<readonly string[]> {
    // Phase 2: Will return list of changes between versions
    // For now, return empty array
    return [];
  }
}
