/**
 * LoggingService
 * 構造化ログと診断情報の記録
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6
 */

import { writeFile, mkdir, appendFile, access } from 'fs/promises';
import { join } from 'path';
import { CommandsetName } from './unifiedCommandsetInstaller';

/**
 * Log level types
 * Requirements: 13.2
 */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/**
 * Log context information
 * Requirements: 13.3
 */
export interface LogContext {
  readonly filePath?: string;
  readonly step?: string;
  readonly commandset?: CommandsetName;
  readonly duration?: number; // milliseconds
  readonly error?: string;
  readonly internalState?: Record<string, unknown>;
  readonly [key: string]: unknown;
}

/**
 * Log entry structure
 * Requirements: 13.1
 */
export interface LogEntry {
  readonly timestamp: string; // ISO 8601
  readonly level: LogLevel;
  readonly message: string;
  readonly context?: LogContext;
}

/**
 * Log statistics
 * Requirements: 13.5
 */
export interface LogStatistics {
  readonly total: number;
  readonly byLevel: Record<LogLevel, number>;
}

/**
 * Log level priority (higher = more important)
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
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
 * LoggingService
 * 構造化ログと診断情報の記録を提供
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6
 */
export class LoggingService {
  private entries: LogEntry[] = [];
  private currentLevel: LogLevel = 'INFO';
  private debugMode: boolean = false;

  /**
   * Set log level
   * Messages below this level will not be recorded
   * Requirements: 13.2
   * @param level - Minimum log level to record
   */
  setLogLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /**
   * Get current log level
   */
  getLogLevel(): LogLevel {
    return this.currentLevel;
  }

  /**
   * Set debug mode
   * When enabled, includes detailed internal state in logs
   * Requirements: 13.6
   * @param enabled - Whether to enable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Check if debug mode is enabled
   */
  isDebugMode(): boolean {
    return this.debugMode;
  }

  /**
   * Log a message with specified level
   * Requirements: 13.1, 13.3
   * @param level - Log level
   * @param message - Log message
   * @param context - Optional context information
   */
  log(level: LogLevel, message: string, context?: LogContext): void {
    // Filter by log level
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.currentLevel]) {
      return;
    }

    // Process context (remove internal state if debug mode is off)
    let processedContext: LogContext | undefined = undefined;
    if (context) {
      if (this.debugMode) {
        processedContext = context;
      } else {
        // Exclude internalState when debug mode is off
        const { internalState, ...rest } = context;
        processedContext = Object.keys(rest).length > 0 ? rest : undefined;
      }
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: processedContext,
    };

    this.entries.push(entry);
  }

  /**
   * Log a DEBUG message
   * Requirements: 13.1
   * @param message - Log message
   * @param context - Optional context information
   */
  debug(message: string, context?: LogContext): void {
    this.log('DEBUG', message, context);
  }

  /**
   * Log an INFO message
   * Requirements: 13.1
   * @param message - Log message
   * @param context - Optional context information
   */
  info(message: string, context?: LogContext): void {
    this.log('INFO', message, context);
  }

  /**
   * Log a WARN message
   * Requirements: 13.1
   * @param message - Log message
   * @param context - Optional context information
   */
  warn(message: string, context?: LogContext): void {
    this.log('WARN', message, context);
  }

  /**
   * Log an ERROR message
   * Requirements: 13.1, 13.3
   * @param message - Log message
   * @param context - Optional context information (should include error stack trace)
   */
  error(message: string, context?: LogContext): void {
    this.log('ERROR', message, context);
  }

  /**
   * Get all log entries
   * @returns Array of log entries
   */
  getLogEntries(): readonly LogEntry[] {
    return [...this.entries];
  }

  /**
   * Clear all log entries
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Get statistics about log entries
   * Requirements: 13.5
   * @returns Log statistics
   */
  getStatistics(): LogStatistics {
    const byLevel: Record<LogLevel, number> = {
      DEBUG: 0,
      INFO: 0,
      WARN: 0,
      ERROR: 0,
    };

    for (const entry of this.entries) {
      byLevel[entry.level]++;
    }

    return {
      total: this.entries.length,
      byLevel,
    };
  }

  /**
   * Write log entries to file
   * Requirements: 13.4
   * @param projectPath - Project root path
   */
  async writeLogFile(projectPath: string): Promise<void> {
    const kiroDir = join(projectPath, '.kiro');
    const logPath = join(kiroDir, '.install.log');

    // Ensure .kiro directory exists
    if (!(await fileExists(kiroDir))) {
      await mkdir(kiroDir, { recursive: true });
    }

    // Format entries as JSON lines
    const logContent = this.entries
      .map((entry) => JSON.stringify(entry))
      .join('\n') + '\n';

    // Append to log file (create if doesn't exist)
    if (await fileExists(logPath)) {
      await appendFile(logPath, logContent, 'utf-8');
    } else {
      await writeFile(logPath, logContent, 'utf-8');
    }
  }

  /**
   * Format log entry for console output
   * @param entry - Log entry to format
   * @returns Formatted string
   */
  formatEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp;
    const level = entry.level.padEnd(5);
    const message = entry.message;
    const context = entry.context
      ? ` | ${JSON.stringify(entry.context)}`
      : '';

    return `[${timestamp}] ${level} ${message}${context}`;
  }
}

/**
 * Global logging service instance
 * Can be used as a singleton for convenience
 */
export const globalLogger = new LoggingService();
