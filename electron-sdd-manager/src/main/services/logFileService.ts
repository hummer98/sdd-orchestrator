/**
 * LogFileService
 * Manages log files for SDD Agents in JSONL format
 * Requirements: 9.3
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { AgentCategory, getCategoryBasePath, getLogPath } from './agentCategory';

export interface LogEntry {
  timestamp: string;
  stream: 'stdout' | 'stderr';
  data: string;
}

/**
 * Service for managing log files
 * Log files are stored at: {basePath}/{specId}/logs/{agentId}.log
 */
export class LogFileService {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /**
   * Get the file path for a log file
   * Path: {basePath}/{specId}/logs/{agentId}.log
   */
  private getFilePath(specId: string, agentId: string): string {
    return path.join(this.basePath, specId, 'logs', `${agentId}.log`);
  }

  /**
   * Append a log entry to the log file
   * Requirements: 9.3
   */
  async appendLog(specId: string, agentId: string, entry: LogEntry): Promise<void> {
    const dirPath = path.join(this.basePath, specId, 'logs');
    const filePath = this.getFilePath(specId, agentId);

    // Ensure directory exists
    await fs.mkdir(dirPath, { recursive: true });

    // Append entry as JSONL
    const line = JSON.stringify(entry) + '\n';
    await fs.appendFile(filePath, line, 'utf-8');
  }

  /**
   * Read all log entries from a log file
   * Requirements: 9.3
   */
  async readLog(specId: string, agentId: string): Promise<LogEntry[]> {
    const filePath = this.getFilePath(specId, agentId);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim() !== '');

      return lines.map((line) => JSON.parse(line) as LogEntry);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Clear a log file (write empty file)
   */
  async clearLog(specId: string, agentId: string): Promise<void> {
    const filePath = this.getFilePath(specId, agentId);

    try {
      await fs.writeFile(filePath, '', 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist, nothing to clear
    }
  }

  /**
   * Delete a log file
   */
  async deleteLog(specId: string, agentId: string): Promise<void> {
    const filePath = this.getFilePath(specId, agentId);

    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist, nothing to delete
    }
  }

  // =============================================================================
  // runtime-agents-restructure: Category-aware operations
  // Requirements: 2.1, 2.2, 2.3, 1.2, 1.4, 1.6, 1.7, 6.1, 6.2, 5.1, 5.2, 5.3, 7.1
  // =============================================================================

  /**
   * Get file path using category-aware structure
   * @param category - 'specs' | 'bugs' | 'project'
   * @param entityId - specId or bugId (empty for project)
   * @param agentId - agent ID
   */
  private getFilePathWithCategory(category: AgentCategory, entityId: string, agentId: string): string {
    return getLogPath(this.basePath, category, entityId, agentId);
  }

  /**
   * Get legacy file path (old structure)
   * Path: {basePath}/{specId}/logs/{agentId}.log
   */
  private getLegacyFilePath(specId: string, agentId: string): string {
    return path.join(this.basePath, specId, 'logs', `${agentId}.log`);
  }

  /**
   * Get legacy directory path
   */
  private getLegacyDirPath(specId: string): string {
    return path.join(this.basePath, specId, 'logs');
  }

  /**
   * Append a log entry to category-aware path
   * Requirements: 2.1, 7.1, 1.2, 1.4, 1.6, 1.7
   * @param category - 'specs' | 'bugs' | 'project'
   * @param entityId - specId or bugId (empty for project)
   * @param agentId - agent ID
   * @param entry - log entry to append
   */
  async appendLogWithCategory(
    category: AgentCategory,
    entityId: string,
    agentId: string,
    entry: LogEntry
  ): Promise<void> {
    const categoryPath = getCategoryBasePath(this.basePath, category, entityId);
    const logsDir = path.join(categoryPath, 'logs');
    const filePath = this.getFilePathWithCategory(category, entityId, agentId);

    // Ensure logs directory exists (Requirement 1.7)
    await fs.mkdir(logsDir, { recursive: true });

    // Append entry as JSONL
    const line = JSON.stringify(entry) + '\n';
    await fs.appendFile(filePath, line, 'utf-8');
  }

  /**
   * Read log with fallback to legacy path
   * Requirements: 2.2, 6.1, 6.2
   * @param category - 'specs' | 'bugs' | 'project'
   * @param entityId - specId or bugId (empty for project)
   * @param agentId - agent ID
   * @returns Log entries and whether they were read from legacy path
   */
  async readLogWithFallback(
    category: AgentCategory,
    entityId: string,
    agentId: string
  ): Promise<{ entries: LogEntry[]; isLegacy: boolean }> {
    // First, try new path
    const newPath = this.getFilePathWithCategory(category, entityId, agentId);
    try {
      const content = await fs.readFile(newPath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim() !== '');
      const entries = lines.map((line) => JSON.parse(line) as LogEntry);
      return { entries, isLegacy: false };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    // Fall back to legacy path
    // For specs, legacy path is: {basePath}/{specId}/logs/{agentId}.log
    // For bugs with 'bug:' prefix: {basePath}/bug:{bugId}/logs/{agentId}.log
    let legacySpecId = entityId;
    if (category === 'bugs') {
      legacySpecId = `bug:${entityId}`;
    } else if (category === 'project') {
      // Project agents don't have legacy paths
      return { entries: [], isLegacy: false };
    }

    const legacyPath = this.getLegacyFilePath(legacySpecId, agentId);
    try {
      const content = await fs.readFile(legacyPath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim() !== '');
      const entries = lines.map((line) => JSON.parse(line) as LogEntry);
      return { entries, isLegacy: true };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { entries: [], isLegacy: false };
      }
      throw error;
    }
  }

  /**
   * Check if legacy logs exist for a specId
   * Requirements: 5.1, 5.2
   * @param specId - spec ID (including 'bug:' prefix for bugs)
   * @returns true if legacy logs exist
   */
  async hasLegacyLogs(specId: string): Promise<boolean> {
    const legacyDir = this.getLegacyDirPath(specId);

    try {
      const files = await fs.readdir(legacyDir);
      return files.some((file) => file.endsWith('.log'));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get legacy log info (file count and total size)
   * Requirements: 5.3
   * @param specId - spec ID (including 'bug:' prefix for bugs)
   * @returns File count and total size, or null if no legacy logs
   */
  async getLegacyLogInfo(specId: string): Promise<{ fileCount: number; totalSize: number } | null> {
    const legacyDir = this.getLegacyDirPath(specId);

    try {
      const files = await fs.readdir(legacyDir);
      const logFiles = files.filter((file) => file.endsWith('.log'));

      if (logFiles.length === 0) {
        return null;
      }

      let totalSize = 0;
      for (const file of logFiles) {
        const filePath = path.join(legacyDir, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
      }

      return { fileCount: logFiles.length, totalSize };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
}

// Factory functions for convenience
let defaultService: LogFileService | null = null;

export function getLogFileService(basePath: string): LogFileService {
  return new LogFileService(basePath);
}

export function initDefaultLogFileService(basePath: string): LogFileService {
  defaultService = new LogFileService(basePath);
  return defaultService;
}

export function getDefaultLogFileService(): LogFileService {
  if (!defaultService) {
    throw new Error('LogFileService not initialized. Call initDefaultLogFileService first.');
  }
  return defaultService;
}

// Standalone functions that use the default service
export async function appendLog(specId: string, agentId: string, entry: LogEntry): Promise<void> {
  return getDefaultLogFileService().appendLog(specId, agentId, entry);
}

export async function readLog(specId: string, agentId: string): Promise<LogEntry[]> {
  return getDefaultLogFileService().readLog(specId, agentId);
}
