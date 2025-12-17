/**
 * LoggingService Tests
 * TDD: 構造化ログと診断情報の記録のテスト
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  LoggingService,
  LogLevel,
  LogContext,
  LogEntry,
} from './loggingService';

describe('LoggingService', () => {
  let loggingService: LoggingService;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'logging-service-test-'));
    loggingService = new LoggingService();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('log', () => {
    it('should log messages with INFO level by default', () => {
      loggingService.log('INFO', 'Test message');
      const entries = loggingService.getLogEntries();

      expect(entries.length).toBe(1);
      expect(entries[0].level).toBe('INFO');
      expect(entries[0].message).toBe('Test message');
    });

    it('should log messages with specified level', () => {
      loggingService.setLogLevel('DEBUG'); // Enable all levels
      loggingService.log('DEBUG', 'Debug message');
      loggingService.log('WARN', 'Warning message');
      loggingService.log('ERROR', 'Error message');

      const entries = loggingService.getLogEntries();
      expect(entries.length).toBe(3);
      expect(entries[0].level).toBe('DEBUG');
      expect(entries[1].level).toBe('WARN');
      expect(entries[2].level).toBe('ERROR');
    });

    it('should include context information in log entries', () => {
      const context: LogContext = {
        filePath: '/test/path.md',
        step: 'install',
        commandset: 'cc-sdd',
        duration: 100,
      };

      loggingService.log('INFO', 'Installing commandset', context);
      const entries = loggingService.getLogEntries();

      expect(entries[0].context).toEqual(context);
    });

    it('should include timestamp in log entries', () => {
      const before = Date.now();
      loggingService.log('INFO', 'Test message');
      const after = Date.now();

      const entries = loggingService.getLogEntries();
      const timestamp = new Date(entries[0].timestamp).getTime();

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('setLogLevel', () => {
    it('should filter log entries below the set level', () => {
      loggingService.setLogLevel('WARN');

      loggingService.log('DEBUG', 'Debug message');
      loggingService.log('INFO', 'Info message');
      loggingService.log('WARN', 'Warning message');
      loggingService.log('ERROR', 'Error message');

      const entries = loggingService.getLogEntries();
      expect(entries.length).toBe(2);
      expect(entries[0].level).toBe('WARN');
      expect(entries[1].level).toBe('ERROR');
    });

    it('should accept DEBUG level and log all messages', () => {
      loggingService.setLogLevel('DEBUG');

      loggingService.log('DEBUG', 'Debug message');
      loggingService.log('INFO', 'Info message');

      const entries = loggingService.getLogEntries();
      expect(entries.length).toBe(2);
    });

    it('should accept ERROR level and log only ERROR messages', () => {
      loggingService.setLogLevel('ERROR');

      loggingService.log('DEBUG', 'Debug message');
      loggingService.log('INFO', 'Info message');
      loggingService.log('WARN', 'Warning message');
      loggingService.log('ERROR', 'Error message');

      const entries = loggingService.getLogEntries();
      expect(entries.length).toBe(1);
      expect(entries[0].level).toBe('ERROR');
    });
  });

  describe('writeLogFile', () => {
    it('should write log entries to file', async () => {
      loggingService.log('INFO', 'Test message 1');
      loggingService.log('WARN', 'Test message 2');

      await loggingService.writeLogFile(tempDir);

      const logPath = path.join(tempDir, '.kiro', '.install.log');
      const content = await fs.readFile(logPath, 'utf-8');

      expect(content).toContain('Test message 1');
      expect(content).toContain('Test message 2');
    });

    it('should create .kiro directory if it does not exist', async () => {
      loggingService.log('INFO', 'Test message');

      await loggingService.writeLogFile(tempDir);

      const kiroDir = path.join(tempDir, '.kiro');
      const stat = await fs.stat(kiroDir);
      expect(stat.isDirectory()).toBe(true);
    });

    it('should append to existing log file', async () => {
      loggingService.log('INFO', 'First message');
      await loggingService.writeLogFile(tempDir);

      const loggingService2 = new LoggingService();
      loggingService2.log('INFO', 'Second message');
      await loggingService2.writeLogFile(tempDir);

      const logPath = path.join(tempDir, '.kiro', '.install.log');
      const content = await fs.readFile(logPath, 'utf-8');

      expect(content).toContain('First message');
      expect(content).toContain('Second message');
    });

    it('should write structured JSON log entries', async () => {
      const context: LogContext = {
        commandset: 'cc-sdd',
        duration: 500,
      };
      loggingService.log('INFO', 'Test message', context);
      await loggingService.writeLogFile(tempDir);

      const logPath = path.join(tempDir, '.kiro', '.install.log');
      const content = await fs.readFile(logPath, 'utf-8');
      const lines = content.trim().split('\n');

      // Each line should be valid JSON
      for (const line of lines) {
        const parsed = JSON.parse(line);
        expect(parsed).toHaveProperty('timestamp');
        expect(parsed).toHaveProperty('level');
        expect(parsed).toHaveProperty('message');
      }
    });
  });

  describe('getStatistics', () => {
    it('should return statistics about log entries', () => {
      loggingService.log('INFO', 'Info message');
      loggingService.log('WARN', 'Warning message');
      loggingService.log('ERROR', 'Error message');
      loggingService.log('INFO', 'Another info message');

      const stats = loggingService.getStatistics();

      expect(stats.total).toBe(4);
      expect(stats.byLevel.INFO).toBe(2);
      expect(stats.byLevel.WARN).toBe(1);
      expect(stats.byLevel.ERROR).toBe(1);
      expect(stats.byLevel.DEBUG).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all log entries', () => {
      loggingService.log('INFO', 'Message 1');
      loggingService.log('INFO', 'Message 2');

      loggingService.clear();

      const entries = loggingService.getLogEntries();
      expect(entries.length).toBe(0);
    });
  });

  describe('debug mode', () => {
    it('should include detailed context in debug mode', () => {
      loggingService.setDebugMode(true);
      loggingService.setLogLevel('DEBUG');

      const detailedContext: LogContext = {
        filePath: '/path/to/file.md',
        step: 'installing',
        commandset: 'cc-sdd',
        duration: 100,
        internalState: { key: 'value' },
      };

      loggingService.log('DEBUG', 'Detailed debug message', detailedContext);

      const entries = loggingService.getLogEntries();
      expect(entries[0].context?.internalState).toEqual({ key: 'value' });
    });

    it('should exclude internal state when debug mode is off', () => {
      loggingService.setDebugMode(false);
      loggingService.setLogLevel('DEBUG');

      const detailedContext: LogContext = {
        filePath: '/path/to/file.md',
        internalState: { key: 'value' },
      };

      loggingService.log('DEBUG', 'Message', detailedContext);

      const entries = loggingService.getLogEntries();
      expect(entries[0].context?.internalState).toBeUndefined();
    });
  });

  describe('convenience methods', () => {
    it('should provide debug() method', () => {
      loggingService.setLogLevel('DEBUG');
      loggingService.debug('Debug message');

      const entries = loggingService.getLogEntries();
      expect(entries[0].level).toBe('DEBUG');
    });

    it('should provide info() method', () => {
      loggingService.info('Info message');

      const entries = loggingService.getLogEntries();
      expect(entries[0].level).toBe('INFO');
    });

    it('should provide warn() method', () => {
      loggingService.warn('Warning message');

      const entries = loggingService.getLogEntries();
      expect(entries[0].level).toBe('WARN');
    });

    it('should provide error() method with stack trace', () => {
      const error = new Error('Test error');
      loggingService.error('Error occurred', { error: error.stack });

      const entries = loggingService.getLogEntries();
      expect(entries[0].level).toBe('ERROR');
      expect(entries[0].context?.error).toContain('Test error');
    });
  });
});
