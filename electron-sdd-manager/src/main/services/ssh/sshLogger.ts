/**
 * SSH Logger
 * Logs SSH connection and file operations for debugging
 * Requirements: 10.1, 10.2, 10.3
 */

import { logger } from '../logger';

/**
 * SSH log entry types
 */
export type SSHLogEntryType = 'connection' | 'file-operation' | 'command' | 'protocol';

/**
 * SSH log entry structure
 */
export interface SSHLogEntry {
  readonly timestamp: string;
  readonly type: SSHLogEntryType;
  readonly host?: string;
  readonly port?: number;
  readonly user?: string;
  readonly status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'success';
  readonly error?: string;
  readonly operation?: string;
  readonly path?: string;
  readonly size?: number;
  readonly command?: string;
  readonly exitCode?: number;
  readonly protocolMessage?: string;
  readonly protocolDetails?: Record<string, unknown>;
}

/**
 * Maximum number of log entries to keep in memory
 */
const MAX_LOG_ENTRIES = 1000;

/**
 * SSH Logger class
 * Provides structured logging for SSH operations
 */
export class SSHLogger {
  private logEntries: SSHLogEntry[] = [];
  private debugMode: boolean = false;

  /**
   * Log a connection event
   */
  logConnection(
    host: string,
    port: number,
    user: string,
    status: 'connecting' | 'connected' | 'disconnected' | 'error',
    error?: string
  ): void {
    const entry: SSHLogEntry = {
      timestamp: new Date().toISOString(),
      type: 'connection',
      host,
      port,
      user,
      status,
      error,
    };

    this.addEntry(entry);
    this.logToConsole('SSH Connection', entry);
  }

  /**
   * Log a file operation
   */
  logFileOperation(
    operation: 'read' | 'write' | 'stat' | 'readdir' | 'mkdir' | 'rm',
    path: string,
    status: 'success' | 'error',
    error?: string,
    size?: number
  ): void {
    const entry: SSHLogEntry = {
      timestamp: new Date().toISOString(),
      type: 'file-operation',
      operation,
      path,
      status,
      error,
      size,
    };

    this.addEntry(entry);
    this.logToConsole('SSH File Operation', entry);
  }

  /**
   * Log a command execution
   */
  logCommand(
    command: string,
    status: 'success' | 'error',
    exitCode: number,
    error?: string
  ): void {
    const entry: SSHLogEntry = {
      timestamp: new Date().toISOString(),
      type: 'command',
      command,
      status,
      exitCode,
      error,
    };

    this.addEntry(entry);
    this.logToConsole('SSH Command', entry);
  }

  /**
   * Log protocol-level debug information
   * Only logs when debug mode is enabled
   */
  logProtocolDebug(message: string, details?: Record<string, unknown>): void {
    if (!this.debugMode) {
      return;
    }

    const entry: SSHLogEntry = {
      timestamp: new Date().toISOString(),
      type: 'protocol',
      status: 'success',
      protocolMessage: message,
      protocolDetails: details,
    };

    this.addEntry(entry);
    logger.debug('[SSH Protocol]', { message, details });
  }

  /**
   * Get recent log entries
   */
  getRecentLogs(limit: number = 100): SSHLogEntry[] {
    return this.logEntries.slice(-limit).reverse();
  }

  /**
   * Enable or disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    logger.info('[SSHLogger] Debug mode', { enabled });
  }

  /**
   * Check if debug mode is enabled
   */
  isDebugMode(): boolean {
    return this.debugMode;
  }

  /**
   * Clear all log entries
   */
  clearLogs(): void {
    this.logEntries = [];
    logger.info('[SSHLogger] Logs cleared');
  }

  /**
   * Export logs as JSON string
   */
  exportLogs(): string {
    return JSON.stringify(this.logEntries, null, 2);
  }

  /**
   * Export logs to file
   * Returns the file path on success
   */
  async exportLogsToFile(filePath: string): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
    try {
      const fs = await import('fs/promises');
      const content = this.exportLogs();
      await fs.writeFile(filePath, content, 'utf-8');
      logger.info('[SSHLogger] Logs exported to file', { filePath });
      return { ok: true, path: filePath };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[SSHLogger] Failed to export logs', { filePath, error: message });
      return { ok: false, error: message };
    }
  }

  /**
   * Get log statistics
   */
  getLogStats(): {
    totalEntries: number;
    connectionEvents: number;
    fileOperations: number;
    commands: number;
    errors: number;
  } {
    const stats = {
      totalEntries: this.logEntries.length,
      connectionEvents: 0,
      fileOperations: 0,
      commands: 0,
      errors: 0,
    };

    for (const entry of this.logEntries) {
      switch (entry.type) {
        case 'connection':
          stats.connectionEvents++;
          break;
        case 'file-operation':
          stats.fileOperations++;
          break;
        case 'command':
          stats.commands++;
          break;
      }
      if (entry.status === 'error') {
        stats.errors++;
      }
    }

    return stats;
  }

  /**
   * Add entry to log buffer
   */
  private addEntry(entry: SSHLogEntry): void {
    this.logEntries.push(entry);

    // Trim to max entries
    if (this.logEntries.length > MAX_LOG_ENTRIES) {
      this.logEntries = this.logEntries.slice(-MAX_LOG_ENTRIES);
    }
  }

  /**
   * Log to console/file via main logger
   */
  private logToConsole(prefix: string, entry: SSHLogEntry): void {
    const message = `[${prefix}] ${entry.status}`;
    const details = {
      host: entry.host,
      port: entry.port,
      operation: entry.operation,
      path: entry.path,
      command: entry.command,
      exitCode: entry.exitCode,
      error: entry.error,
    };

    if (entry.status === 'error') {
      logger.error(message, details);
    } else if (this.debugMode) {
      logger.debug(message, details);
    } else {
      logger.info(message, details);
    }
  }
}

// Singleton instance
let sshLogger: SSHLogger | null = null;

export function getSSHLogger(): SSHLogger {
  if (!sshLogger) {
    sshLogger = new SSHLogger();
  }
  return sshLogger;
}
