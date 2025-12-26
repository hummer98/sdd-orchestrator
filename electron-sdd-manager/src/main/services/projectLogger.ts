/**
 * Project Logger Service
 * Writes logs to project-specific and global log files
 *
 * Requirements:
 * - 1.1, 1.2, 1.3, 1.4: Project-specific log files
 * - 3.1, 3.2, 3.3, 3.4: Global log maintenance
 * - 4.1, 4.2, 4.3: Project context in log entries
 * - 5.4: Fallback to global log on error
 * - 7.1, 7.2, 7.3, 7.4: LogRotationManager integration
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { LogRotationManager, type LogRotationManagerService } from './logRotationManager';

/**
 * Log entry structure with project context
 * Requirements: 4.1, 4.2
 */
export interface LogEntry {
  /** ISO 8601 format timestamp */
  timestamp: string;
  /** Log level */
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  /** Project identifier (path or 'global') */
  projectId: string;
  /** Log message */
  message: string;
  /** Additional data (optional) */
  data?: unknown;
}

/**
 * Format a log message with project context
 * Requirements: 4.1, 4.2, 4.3
 *
 * @param level - Log level
 * @param projectId - Project path or 'global'
 * @param message - Log message
 * @param data - Additional data
 * @returns Formatted log string
 */
export function formatMessage(
  level: string,
  projectId: string,
  message: string,
  data?: unknown
): string {
  const timestamp = new Date().toISOString();
  const dataStr = data !== undefined ? ` ${JSON.stringify(data)}` : '';
  return `[${timestamp}] [${level}] [${projectId}] ${message}${dataStr}\n`;
}

/**
 * ProjectLogger Service Interface
 * Requirements: 1.1-1.4, 3.1-3.4, 4.1-4.3
 */
export interface ProjectLoggerService {
  /**
   * Set current project and initialize project log stream
   * @param projectPath Project root path or null to clear
   */
  setCurrentProject(projectPath: string | null): void;

  /**
   * Get current project path
   */
  getCurrentProject(): string | null;

  /**
   * Get project log file path
   */
  getProjectLogPath(): string | null;

  /**
   * Get global log file path
   */
  getGlobalLogPath(): string;

  /**
   * INFO level log
   */
  info(message: string, data?: unknown): void;

  /**
   * DEBUG level log
   */
  debug(message: string, data?: unknown): void;

  /**
   * WARN level log
   */
  warn(message: string, data?: unknown): void;

  /**
   * ERROR level log
   */
  error(message: string, data?: unknown): void;
}

/**
 * ProjectLogger Implementation
 * Manages project-specific and global log streams
 * Integrates with LogRotationManager for file rotation and cleanup
 */
export class ProjectLogger implements ProjectLoggerService {
  private globalLogPath: string;
  private globalStream: fs.WriteStream | null = null;
  private projectLogPath: string | null = null;
  private projectStream: fs.WriteStream | null = null;
  private currentProjectPath: string | null = null;
  /** LogRotationManager instance for rotation and cleanup (Requirement 7.1) */
  private rotationManager: LogRotationManagerService;

  constructor() {
    // Initialize LogRotationManager (Requirement 7.1)
    this.rotationManager = new LogRotationManager();
    // Determine global logs directory based on whether app is packaged
    let logsDir: string;

    if (app.isPackaged) {
      // Production: Use macOS standard log directory
      // ~/Library/Logs/SDD Orchestrator/
      logsDir = path.join(app.getPath('logs'));
    } else {
      // Development: Use project directory (electron-sdd-manager/logs)
      const projectRoot = path.resolve(__dirname, '..', '..', '..');
      logsDir = path.join(projectRoot, 'logs');
    }

    // Ensure logs directory exists
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    this.globalLogPath = path.join(logsDir, 'main.log');
    this.initGlobalStream();
  }

  /**
   * Initialize global log stream
   */
  private initGlobalStream(): void {
    try {
      this.globalStream = fs.createWriteStream(this.globalLogPath, { flags: 'a' });
      this.globalStream.on('error', (err) => {
        console.error('Global log stream error:', err);
      });
      this.write('INFO', 'Logger initialized', { logPath: this.globalLogPath });
    } catch (error) {
      console.error('Failed to initialize global log stream:', error);
    }
  }

  /**
   * Initialize project log stream
   * Requirements: 2.1, 2.2
   */
  private initProjectStream(projectPath: string): void {
    const logDir = path.join(projectPath, '.kiro', 'logs');

    // Ensure project logs directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    this.projectLogPath = path.join(logDir, 'main.log');

    try {
      this.projectStream = fs.createWriteStream(this.projectLogPath, { flags: 'a' });
      this.projectStream.on('error', (err) => {
        console.error('Project log stream error:', err);
        // Fallback: close project stream and continue with global only
        this.closeProjectStream();
      });
    } catch (error) {
      console.error('Failed to initialize project log stream:', error);
      this.projectStream = null;
      this.projectLogPath = null;
    }
  }

  /**
   * Close project log stream
   */
  private closeProjectStream(): void {
    if (this.projectStream) {
      try {
        this.projectStream.close();
      } catch {
        // Ignore close errors
      }
      this.projectStream = null;
    }
    this.projectLogPath = null;
  }

  /**
   * Write log entry to appropriate streams
   * Requirements: 1.4, 3.1, 3.2, 5.4, 7.2, 7.3
   */
  private write(level: string, message: string, data?: unknown): void {
    const projectId = this.currentProjectPath || 'global';
    const formatted = formatMessage(level, projectId, message, data);

    // Always write to global stream
    if (this.globalStream) {
      try {
        this.globalStream.write(formatted);
        // Check rotation for global log (Requirement 7.2)
        this.checkAndRotateStream(this.globalLogPath, this.globalStream, 'global');
      } catch {
        // If global stream fails, try console
        console.error('Failed to write to global log');
      }
    }

    // Write to project stream if available
    if (this.projectStream && this.currentProjectPath && this.projectLogPath) {
      try {
        this.projectStream.write(formatted);
        // Check rotation for project log (Requirement 7.2)
        this.checkAndRotateStream(this.projectLogPath, this.projectStream, 'project');
      } catch (error) {
        // Fallback: log error and continue with global only
        console.error('Failed to write to project log, falling back to global:', error);
        this.closeProjectStream();
      }
    }

    // Also write to console for development
    // Only write if stdout is writable to prevent EIO/EPIPE errors
    try {
      if (process.stdout && process.stdout.writable) {
        console.log(formatted.trim());
      }
    } catch {
      // Ignore console errors
    }
  }

  /**
   * Check if rotation is needed and recreate stream if necessary
   * Requirements: 7.2, 7.3
   */
  private async checkAndRotateStream(
    logPath: string,
    stream: fs.WriteStream,
    streamType: 'global' | 'project'
  ): Promise<void> {
    try {
      const currentSize = stream.bytesWritten || 0;
      const needsRotation = await this.rotationManager.checkAndRotate(logPath, currentSize);

      if (needsRotation) {
        // Recreate stream after rotation (Requirement 7.3)
        if (streamType === 'global') {
          this.globalStream?.close();
          this.globalStream = fs.createWriteStream(this.globalLogPath, { flags: 'a' });
          this.globalStream.on('error', (err) => {
            console.error('Global log stream error:', err);
          });
        } else if (streamType === 'project' && this.currentProjectPath) {
          this.projectStream?.close();
          this.projectStream = fs.createWriteStream(logPath, { flags: 'a' });
          this.projectStream.on('error', (err) => {
            console.error('Project log stream error:', err);
            this.closeProjectStream();
          });
        }
      }
    } catch (error) {
      // Log rotation error should not stop logging
      console.error('Error during rotation check:', error);
    }
  }

  /**
   * Set current project and switch log stream
   * Requirements: 1.1, 1.2, 7.4
   */
  setCurrentProject(projectPath: string | null): void {
    // Close existing project stream if any
    this.closeProjectStream();

    this.currentProjectPath = projectPath;

    if (projectPath) {
      this.initProjectStream(projectPath);
      this.write('INFO', `Project set: ${projectPath}`);

      // Cleanup old log files in the new project (Requirement 7.4)
      const logDir = path.join(projectPath, '.kiro', 'logs');
      const retentionDays = this.rotationManager.getDefaultRetentionDays();
      this.rotationManager.cleanupOldFiles(logDir, retentionDays).catch((error) => {
        console.error('Failed to cleanup old log files:', error);
      });
    }
  }

  /**
   * Get current project path
   */
  getCurrentProject(): string | null {
    return this.currentProjectPath;
  }

  /**
   * Get project log file path
   * Requirements: 6.1, 6.3
   */
  getProjectLogPath(): string | null {
    return this.projectLogPath;
  }

  /**
   * Get global log file path
   */
  getGlobalLogPath(): string {
    return this.globalLogPath;
  }

  /**
   * INFO level log
   */
  info(message: string, data?: unknown): void {
    this.write('INFO', message, data);
  }

  /**
   * DEBUG level log
   */
  debug(message: string, data?: unknown): void {
    this.write('DEBUG', message, data);
  }

  /**
   * WARN level log
   */
  warn(message: string, data?: unknown): void {
    this.write('WARN', message, data);
  }

  /**
   * ERROR level log
   */
  error(message: string, data?: unknown): void {
    this.write('ERROR', message, data);
  }
}

// Singleton instance for backward compatibility with existing logger
export const projectLogger = new ProjectLogger();
