/**
 * MigrationService
 * Handles lazy migration of legacy logs to the new runtime/agents structure
 *
 * Requirements: 5.1, 5.2, 5.4, 5.5, 5.6
 *
 * Legacy path: {basePath}/{specId}/logs/agent-{id}.log
 * New path: {basePath}/{category}/{entityId}/logs/agent-{id}.log
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { determineCategory, getEntityIdFromSpecId, getCategoryBasePath } from './agentCategory';
import { logger } from './logger';

export interface MigrationInfo {
  specId: string;
  fileCount: number;
  totalSize: number;
}

export interface MigrationResult {
  success: boolean;
  migratedFiles: number;
  error?: string;
}

/**
 * Service for managing legacy log migration
 * Requirements: 5.1, 5.2, 5.4, 5.5, 5.6
 */
export class MigrationService {
  private basePath: string;
  private declinedSpecs: Set<string> = new Set();

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /**
   * Get legacy logs directory path
   */
  private getLegacyLogsDir(specId: string): string {
    return path.join(this.basePath, specId, 'logs');
  }

  /**
   * Get new logs directory path based on category
   */
  private getNewLogsDir(specId: string): string {
    const category = determineCategory(specId);
    const entityId = getEntityIdFromSpecId(specId);
    const categoryPath = getCategoryBasePath(this.basePath, category, entityId);
    return path.join(categoryPath, 'logs');
  }

  /**
   * Check if migration is needed for a spec/bug
   * Requirements: 5.1, 5.2, 5.5
   *
   * @param specId - spec ID (including 'bug:' prefix for bugs)
   * @returns MigrationInfo if migration is needed, null otherwise
   */
  async checkMigrationNeeded(specId: string): Promise<MigrationInfo | null> {
    // Check if already declined this session (Req 5.5)
    if (this.declinedSpecs.has(specId)) {
      return null;
    }

    const legacyDir = this.getLegacyLogsDir(specId);

    try {
      const files = await fs.readdir(legacyDir);
      const logFiles = files.filter((file) => file.endsWith('.log'));

      if (logFiles.length === 0) {
        return null;
      }

      // Calculate total size
      let totalSize = 0;
      for (const file of logFiles) {
        const filePath = path.join(legacyDir, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
      }

      return {
        specId,
        fileCount: logFiles.length,
        totalSize,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Migrate logs from legacy path to new path
   * Requirements: 5.4, 5.6
   *
   * @param specId - spec ID (including 'bug:' prefix for bugs)
   * @returns MigrationResult
   */
  async migrateSpec(specId: string): Promise<MigrationResult> {
    const legacyDir = this.getLegacyLogsDir(specId);
    const newDir = this.getNewLogsDir(specId);

    try {
      // Check if legacy logs exist
      const files = await fs.readdir(legacyDir);
      const logFiles = files.filter((file) => file.endsWith('.log'));

      if (logFiles.length === 0) {
        return {
          success: false,
          migratedFiles: 0,
          error: 'No legacy logs found',
        };
      }

      // Ensure new directory exists
      await fs.mkdir(newDir, { recursive: true });

      let migratedCount = 0;
      const progressInterval = 10;

      for (const file of logFiles) {
        const srcPath = path.join(legacyDir, file);
        const destPath = path.join(newDir, file);

        // Check if destination already exists
        try {
          await fs.access(destPath);
          // File already exists at destination, skip
          logger.debug('[MigrationService] Skipping existing file', { file, specId });
          continue;
        } catch {
          // File doesn't exist, proceed with copy
        }

        // Copy file to new location
        await fs.copyFile(srcPath, destPath);
        migratedCount++;

        // Log progress (every 10 files)
        if (migratedCount % progressInterval === 0) {
          logger.info('[MigrationService] Migration progress', {
            specId,
            migratedFiles: migratedCount,
            totalFiles: logFiles.length,
          });
        }
      }

      // Delete original files after all copies complete
      for (const file of logFiles) {
        const srcPath = path.join(legacyDir, file);
        try {
          await fs.unlink(srcPath);
        } catch {
          // Ignore delete errors for individual files
        }
      }

      // Try to remove the empty legacy logs directory (Req 5.6)
      try {
        const remainingFiles = await fs.readdir(legacyDir);
        if (remainingFiles.length === 0) {
          await fs.rmdir(legacyDir);
          logger.info('[MigrationService] Removed empty legacy logs directory', { legacyDir });

          // Also try to remove parent spec directory if empty
          const specDir = path.dirname(legacyDir);
          const specDirContents = await fs.readdir(specDir);
          if (specDirContents.length === 0) {
            await fs.rmdir(specDir);
            logger.info('[MigrationService] Removed empty legacy spec directory', { specDir });
          }
        }
      } catch {
        // Ignore cleanup errors
      }

      logger.info('[MigrationService] Migration completed', {
        specId,
        migratedFiles: migratedCount,
      });

      return {
        success: true,
        migratedFiles: migratedCount,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[MigrationService] Migration failed', { specId, error: message });

      return {
        success: false,
        migratedFiles: 0,
        error: message,
      };
    }
  }

  /**
   * Decline migration for a spec (remembered for this session)
   * Requirements: 5.5
   *
   * @param specId - spec ID to decline
   */
  declineMigration(specId: string): void {
    this.declinedSpecs.add(specId);
    logger.info('[MigrationService] Migration declined', { specId });
  }

  /**
   * Check if migration was declined for a spec
   *
   * @param specId - spec ID to check
   * @returns true if declined
   */
  isDeclined(specId: string): boolean {
    return this.declinedSpecs.has(specId);
  }
}

// Factory functions for convenience
let defaultService: MigrationService | null = null;

export function getMigrationService(basePath: string): MigrationService {
  return new MigrationService(basePath);
}

export function initDefaultMigrationService(basePath: string): MigrationService {
  defaultService = new MigrationService(basePath);
  return defaultService;
}

export function getDefaultMigrationService(): MigrationService {
  if (!defaultService) {
    throw new Error('MigrationService not initialized. Call initDefaultMigrationService first.');
  }
  return defaultService;
}
