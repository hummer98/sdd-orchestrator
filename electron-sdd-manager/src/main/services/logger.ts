/**
 * Logger Service
 * Writes logs to file for debugging main process
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

class Logger {
  private logPath: string;
  private stream: fs.WriteStream | null = null;

  constructor() {
    // Determine logs directory based on whether app is packaged
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

    this.logPath = path.join(logsDir, 'main.log');
    this.initStream();
  }

  private initStream(): void {
    try {
      this.stream = fs.createWriteStream(this.logPath, { flags: 'a' });
      this.info('Logger initialized', { logPath: this.logPath });
    } catch (error) {
      console.error('Failed to initialize log stream:', error);
    }
  }

  private formatMessage(level: string, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] ${message}${dataStr}\n`;
  }

  private write(level: string, message: string, data?: unknown): void {
    const formatted = this.formatMessage(level, message, data);

    // Write to file
    if (this.stream) {
      this.stream.write(formatted);
    }

    // Also write to console for development
    // Wrap in try-catch to prevent EPIPE errors during shutdown
    try {
      console.log(formatted.trim());
    } catch {
      // Ignore console errors (e.g., EPIPE during app shutdown)
    }
  }

  info(message: string, data?: unknown): void {
    this.write('INFO', message, data);
  }

  debug(message: string, data?: unknown): void {
    this.write('DEBUG', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.write('WARN', message, data);
  }

  error(message: string, data?: unknown): void {
    this.write('ERROR', message, data);
  }

  getLogPath(): string {
    return this.logPath;
  }
}

// Singleton instance
export const logger = new Logger();
