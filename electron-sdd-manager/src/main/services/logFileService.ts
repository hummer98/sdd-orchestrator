/**
 * LogFileService
 * Manages log files for SDD Agents in JSONL format
 * Requirements: 9.3
 */

import * as fs from 'fs/promises';
import * as path from 'path';

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
