/**
 * Log Rotation Manager
 * Handles log file rotation based on size and date
 *
 * Requirements:
 * - 5.1: Date-based rotation
 * - 5.2: Size-based rotation (10MB threshold)
 * - 5.3: Old file cleanup (30 days retention)
 */

import * as path from 'path';
import { stat, rename, readdir, unlink } from 'fs/promises';

/**
 * Options for LogRotationManager
 */
export interface LogRotationOptions {
  /** Rotation threshold in MB (default: 10) */
  rotationThresholdMB?: number;
  /** Default retention days (default: 30) */
  defaultRetentionDays?: number;
}

/**
 * Service Interface for Log Rotation
 * Requirements: 5.1, 5.2, 5.3
 */
export interface LogRotationManagerService {
  /**
   * Check if rotation is needed and rotate if necessary
   * @param logPath Target log file path
   * @param currentSize Current file size in bytes
   * @returns true if rotation was performed
   */
  checkAndRotate(logPath: string, currentSize: number): Promise<boolean>;

  /**
   * Check if date-based rotation is needed
   * @param logPath Target log file path
   * @returns true if rotation was performed
   */
  checkDateRotation(logPath: string): Promise<boolean>;

  /**
   * Clean up old log files
   * @param logDir Log directory path
   * @param retentionDays Number of days to keep logs
   */
  cleanupOldFiles(logDir: string, retentionDays: number): Promise<void>;

  /**
   * Get the rotation threshold in bytes
   */
  getRotationThreshold(): number;

  /**
   * Get default retention days
   */
  getDefaultRetentionDays(): number;
}

/**
 * LogRotationManager Implementation
 * Manages log file rotation and cleanup
 */
export class LogRotationManager implements LogRotationManagerService {
  private readonly rotationThreshold: number;
  private readonly defaultRetentionDays: number;
  private lastRotationDate: Map<string, string> = new Map();

  constructor(options?: LogRotationOptions) {
    this.rotationThreshold = (options?.rotationThresholdMB ?? 10) * 1024 * 1024;
    this.defaultRetentionDays = options?.defaultRetentionDays ?? 30;
  }

  /**
   * Check and perform rotation if needed
   * Requirements: 5.2
   */
  async checkAndRotate(logPath: string, currentSize: number): Promise<boolean> {
    try {
      // Initialize or update last rotation date
      const today = this.getTodayString();
      if (!this.lastRotationDate.has(logPath)) {
        this.lastRotationDate.set(logPath, today);
      }

      // Check if size exceeds threshold
      if (currentSize >= this.rotationThreshold) {
        await this.rotateFile(logPath);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking rotation:', error);
      return false;
    }
  }

  /**
   * Check if date-based rotation is needed
   * Requirements: 5.1
   */
  async checkDateRotation(logPath: string): Promise<boolean> {
    try {
      const today = this.getTodayString();
      const lastDate = this.lastRotationDate.get(logPath);

      if (lastDate && lastDate !== today) {
        // Date has changed, perform rotation
        await this.rotateFile(logPath);
        this.lastRotationDate.set(logPath, today);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking date rotation:', error);
      return false;
    }
  }

  /**
   * Rotate the log file
   * Renames current file to main.YYYY-MM-DD.N.log format
   */
  private async rotateFile(logPath: string): Promise<void> {
    try {
      const logDir = path.dirname(logPath);
      const today = this.getTodayString();

      // Get next sequence number
      const sequenceNumber = await this.getNextSequenceNumber(logDir, today);

      // Build rotated filename: main.YYYY-MM-DD.N.log
      const rotatedName = `main.${today}.${sequenceNumber}.log`;
      const rotatedPath = path.join(logDir, rotatedName);

      // Rename current log to rotated name
      await rename(logPath, rotatedPath);

      // Update last rotation date
      this.lastRotationDate.set(logPath, today);
    } catch (error) {
      console.error('Error rotating file:', error);
      throw error;
    }
  }

  /**
   * Get the next sequence number for today's rotated files
   */
  private async getNextSequenceNumber(logDir: string, date: string): Promise<number> {
    try {
      const files = await readdir(logDir);
      const pattern = new RegExp(`^main\\.${date}\\.(\\d+)\\.log$`);

      let maxSequence = 0;
      for (const file of files) {
        const fileName = typeof file === 'string' ? file : file.name;
        const match = fileName.match(pattern);
        if (match) {
          const seq = parseInt(match[1], 10);
          if (seq > maxSequence) {
            maxSequence = seq;
          }
        }
      }

      return maxSequence + 1;
    } catch {
      return 1;
    }
  }

  /**
   * Clean up old log files beyond retention period
   * Requirements: 5.3
   */
  async cleanupOldFiles(logDir: string, retentionDays: number): Promise<void> {
    try {
      const files = await readdir(logDir);
      const cutoffDateStr = this.getCutoffDateString(retentionDays);

      for (const file of files) {
        const fileName = typeof file === 'string' ? file : file.name;

        // Parse date from filename: main.YYYY-MM-DD.N.log
        const dateMatch = fileName.match(/^main\.(\d{4}-\d{2}-\d{2})\.\d+\.log$/);
        if (dateMatch) {
          const fileDateStr = dateMatch[1];
          // String comparison works for YYYY-MM-DD format
          if (fileDateStr < cutoffDateStr) {
            try {
              await unlink(path.join(logDir, fileName));
            } catch (unlinkError) {
              console.error(`Failed to delete old log file ${fileName}:`, unlinkError);
              // Continue with other files
            }
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up old files:', error);
      // Don't throw, just log the error
    }
  }

  /**
   * Get today's date as YYYY-MM-DD string
   */
  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Get cutoff date string for retention (YYYY-MM-DD format)
   */
  private getCutoffDateString(retentionDays: number): string {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    return cutoff.toISOString().split('T')[0];
  }

  /**
   * Get the rotation threshold in bytes
   */
  getRotationThreshold(): number {
    return this.rotationThreshold;
  }

  /**
   * Get default retention days
   */
  getDefaultRetentionDays(): number {
    return this.defaultRetentionDays;
  }
}

// Default instance
export const logRotationManager = new LogRotationManager();
