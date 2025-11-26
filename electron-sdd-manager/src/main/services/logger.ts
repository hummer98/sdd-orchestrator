/**
 * Logger Service
 * Writes logs to file for debugging main process
 */

import * as fs from 'fs';
import * as path from 'path';

class Logger {
  private logPath: string;
  private stream: fs.WriteStream | null = null;

  constructor() {
    // Use project directory for logs (electron-sdd-manager/logs)
    const projectRoot = path.resolve(__dirname, '..', '..', '..');
    const logsDir = path.join(projectRoot, 'logs');

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
    console.log(formatted.trim());
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
