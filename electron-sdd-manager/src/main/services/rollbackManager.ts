/**
 * RollbackManager
 * インストール操作のバックアップとロールバック機能を提供
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import { readFile, writeFile, mkdir, access, readdir, rm, copyFile } from 'fs/promises';
import { join, relative, dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { CommandsetName } from './unifiedCommandsetInstaller';
import { Result } from './ccSddWorkflowInstaller';

/**
 * Backup ID type (UUID)
 */
export type BackupId = string;

/**
 * Install history entry
 * Requirements: 9.3
 */
export interface InstallHistory {
  readonly id: BackupId;
  readonly timestamp: string; // ISO 8601
  readonly commandsets: readonly CommandsetName[];
  readonly files: readonly string[]; // List of backed up files
}

/**
 * Rollback result
 * Requirements: 9.4
 */
export interface RollbackResult {
  readonly restoredFiles: readonly string[];
  readonly failedFiles: readonly string[];
}

/**
 * Backup error types
 */
export type BackupError = {
  type: 'BACKUP_CREATION_FAILED';
  message: string;
};

/**
 * Rollback error types
 * Requirements: 9.4
 */
export type RollbackError =
  | { type: 'BACKUP_NOT_FOUND'; id: BackupId }
  | { type: 'RESTORE_FAILED'; files: readonly string[] };

/**
 * Maximum number of backup entries to keep
 * Requirements: 9.5
 */
const MAX_HISTORY_ENTRIES = 10;

/**
 * Paths to backup for each commandset
 */
const COMMANDSET_BACKUP_PATHS: Record<CommandsetName, string[]> = {
  'cc-sdd': [
    '.claude/commands/kiro',
    '.claude/agents/kiro',
    '.kiro/settings',
  ],
  'bug': [
    '.claude/commands/kiro',
    '.kiro/settings/templates/bugs',
  ],
  'spec-manager': [
    '.claude/commands/kiro',
  ],
};

/**
 * Check if a file/directory exists
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
 * Recursively get all files in a directory
 */
async function getAllFiles(dirPath: string, basePath: string): Promise<string[]> {
  const files: string[] = [];

  if (!(await fileExists(dirPath))) {
    return files;
  }

  const entries = await readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await getAllFiles(fullPath, basePath));
    } else {
      files.push(relative(basePath, fullPath));
    }
  }

  return files;
}

/**
 * RollbackManager
 * インストール操作のバックアップとロールバック機能を提供
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */
export class RollbackManager {
  /**
   * Create backup before installation
   * Requirements: 9.1
   * @param projectPath - Project root path
   * @param commandsets - Commandsets being installed
   * @returns Backup ID on success
   */
  async createBackup(
    projectPath: string,
    commandsets: readonly CommandsetName[]
  ): Promise<Result<BackupId, BackupError>> {
    try {
      const backupId = uuidv4();
      const backupDir = join(projectPath, '.kiro', '.backups', backupId);

      // Ensure backup directory exists
      await mkdir(backupDir, { recursive: true });

      // Collect files to backup
      const filesToBackup: string[] = [];

      // Get paths for each commandset
      for (const commandset of commandsets) {
        const paths = COMMANDSET_BACKUP_PATHS[commandset] || [];
        for (const relativePath of paths) {
          const fullPath = join(projectPath, relativePath);
          const files = await getAllFiles(fullPath, projectPath);
          filesToBackup.push(...files);
        }
      }

      // Also backup CLAUDE.md if it exists
      const claudeMdPath = join(projectPath, 'CLAUDE.md');
      if (await fileExists(claudeMdPath)) {
        filesToBackup.push('CLAUDE.md');
      }

      // Deduplicate
      const uniqueFiles = [...new Set(filesToBackup)];

      // Copy files to backup directory
      for (const file of uniqueFiles) {
        const sourcePath = join(projectPath, file);
        const targetPath = join(backupDir, file);

        if (await fileExists(sourcePath)) {
          await mkdir(dirname(targetPath), { recursive: true });
          await copyFile(sourcePath, targetPath);
        }
      }

      // Record in history
      const historyEntry: InstallHistory = {
        id: backupId,
        timestamp: new Date().toISOString(),
        commandsets: [...commandsets],
        files: uniqueFiles,
      };

      await this.addToHistory(projectPath, historyEntry);

      // Clean up old backups if limit exceeded
      await this.cleanupOldBackups(projectPath);

      return { ok: true, value: backupId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        error: { type: 'BACKUP_CREATION_FAILED', message },
      };
    }
  }

  /**
   * Rollback to a previous backup
   * Requirements: 9.2, 9.4, 9.6
   * @param projectPath - Project root path
   * @param backupId - Backup ID to restore
   */
  async rollback(
    projectPath: string,
    backupId: BackupId
  ): Promise<Result<RollbackResult, RollbackError>> {
    const backupDir = join(projectPath, '.kiro', '.backups', backupId);

    // Check if backup exists
    if (!(await fileExists(backupDir))) {
      return {
        ok: false,
        error: { type: 'BACKUP_NOT_FOUND', id: backupId },
      };
    }

    const restoredFiles: string[] = [];
    const failedFiles: string[] = [];

    // Get all files in backup
    const files = await getAllFiles(backupDir, backupDir);

    // Restore each file
    for (const file of files) {
      const sourcePath = join(backupDir, file);
      const targetPath = join(projectPath, file);

      try {
        await mkdir(dirname(targetPath), { recursive: true });
        await copyFile(sourcePath, targetPath);
        restoredFiles.push(file);
      } catch {
        failedFiles.push(file);
      }
    }

    // If there were failed files, return error
    if (failedFiles.length > 0 && restoredFiles.length === 0) {
      return {
        ok: false,
        error: { type: 'RESTORE_FAILED', files: failedFiles },
      };
    }

    return {
      ok: true,
      value: { restoredFiles, failedFiles },
    };
  }

  /**
   * Get rollback history
   * Requirements: 9.3
   * @param projectPath - Project root path
   * @returns History entries in reverse chronological order (most recent first)
   */
  async getHistory(projectPath: string): Promise<readonly InstallHistory[]> {
    const historyPath = join(projectPath, '.kiro', '.install-history.json');

    if (!(await fileExists(historyPath))) {
      return [];
    }

    try {
      const content = await readFile(historyPath, 'utf-8');
      const history: InstallHistory[] = JSON.parse(content);

      // Sort by timestamp descending (most recent first)
      return history.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch {
      return [];
    }
  }

  /**
   * Add entry to history
   * @param projectPath - Project root path
   * @param entry - History entry to add
   */
  private async addToHistory(projectPath: string, entry: InstallHistory): Promise<void> {
    const historyPath = join(projectPath, '.kiro', '.install-history.json');
    const kiroDir = join(projectPath, '.kiro');

    // Ensure .kiro directory exists
    if (!(await fileExists(kiroDir))) {
      await mkdir(kiroDir, { recursive: true });
    }

    // Load existing history
    let history: InstallHistory[] = [];
    if (await fileExists(historyPath)) {
      try {
        const content = await readFile(historyPath, 'utf-8');
        history = JSON.parse(content);
      } catch {
        history = [];
      }
    }

    // Add new entry
    history.push(entry);

    // Write back
    await writeFile(historyPath, JSON.stringify(history, null, 2), 'utf-8');
  }

  /**
   * Clean up old backups when limit is exceeded
   * Requirements: 9.5
   * @param projectPath - Project root path
   */
  private async cleanupOldBackups(projectPath: string): Promise<void> {
    const history = await this.getHistory(projectPath);

    if (history.length <= MAX_HISTORY_ENTRIES) {
      return;
    }

    // Get entries to remove (oldest ones)
    const entriesToRemove = history.slice(MAX_HISTORY_ENTRIES);

    // Delete backup directories
    for (const entry of entriesToRemove) {
      const backupDir = join(projectPath, '.kiro', '.backups', entry.id);
      if (await fileExists(backupDir)) {
        await rm(backupDir, { recursive: true, force: true });
      }
    }

    // Update history file
    const historyPath = join(projectPath, '.kiro', '.install-history.json');
    const newHistory = history.slice(0, MAX_HISTORY_ENTRIES);
    await writeFile(historyPath, JSON.stringify(newHistory, null, 2), 'utf-8');
  }
}
