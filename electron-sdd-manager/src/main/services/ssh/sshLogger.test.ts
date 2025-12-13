/**
 * SSHLogger Unit Tests
 * TDD: Testing SSH operation logging
 * Requirements: 10.1, 10.2, 10.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SSHLogger, type SSHLogEntry } from './sshLogger';

// Mock logger
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    getLogFile: vi.fn().mockReturnValue('/path/to/log'),
  },
}));

describe('SSHLogger', () => {
  let sshLogger: SSHLogger;

  beforeEach(() => {
    vi.clearAllMocks();
    sshLogger = new SSHLogger();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logConnection', () => {
    it('should log successful connection', () => {
      sshLogger.logConnection('host.example.com', 22, 'user', 'connected');

      const entries = sshLogger.getRecentLogs(10);
      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('connection');
      expect(entries[0].host).toBe('host.example.com');
      expect(entries[0].status).toBe('connected');
    });

    it('should log failed connection with error', () => {
      sshLogger.logConnection('host.example.com', 22, 'user', 'error', 'Connection refused');

      const entries = sshLogger.getRecentLogs(10);
      expect(entries[0].status).toBe('error');
      expect(entries[0].error).toBe('Connection refused');
    });

    it('should include timestamp', () => {
      const before = Date.now();
      sshLogger.logConnection('host.example.com', 22, 'user', 'connecting');
      const after = Date.now();

      const entries = sshLogger.getRecentLogs(10);
      const timestamp = new Date(entries[0].timestamp).getTime();
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('logFileOperation', () => {
    it('should log file read operation', () => {
      sshLogger.logFileOperation('read', '/path/to/file.txt', 'success');

      const entries = sshLogger.getRecentLogs(10);
      expect(entries[0].type).toBe('file-operation');
      expect(entries[0].operation).toBe('read');
      expect(entries[0].path).toBe('/path/to/file.txt');
      expect(entries[0].status).toBe('success');
    });

    it('should log file write operation with size', () => {
      sshLogger.logFileOperation('write', '/path/to/output.txt', 'success', undefined, 1024);

      const entries = sshLogger.getRecentLogs(10);
      expect(entries[0].operation).toBe('write');
      expect(entries[0].size).toBe(1024);
    });

    it('should log file operation error', () => {
      sshLogger.logFileOperation('read', '/path/to/missing.txt', 'error', 'File not found');

      const entries = sshLogger.getRecentLogs(10);
      expect(entries[0].status).toBe('error');
      expect(entries[0].error).toBe('File not found');
    });
  });

  describe('logCommand', () => {
    it('should log command execution', () => {
      sshLogger.logCommand('echo "hello"', 'success', 0);

      const entries = sshLogger.getRecentLogs(10);
      expect(entries[0].type).toBe('command');
      expect(entries[0].command).toBe('echo "hello"');
      expect(entries[0].exitCode).toBe(0);
    });

    it('should log command with non-zero exit code', () => {
      sshLogger.logCommand('exit 1', 'error', 1);

      const entries = sshLogger.getRecentLogs(10);
      expect(entries[0].status).toBe('error');
      expect(entries[0].exitCode).toBe(1);
    });
  });

  describe('getRecentLogs', () => {
    it('should return limited number of entries', () => {
      for (let i = 0; i < 20; i++) {
        sshLogger.logConnection(`host${i}.example.com`, 22, 'user', 'connected');
      }

      const entries = sshLogger.getRecentLogs(5);
      expect(entries).toHaveLength(5);
    });

    it('should return most recent entries first', () => {
      sshLogger.logConnection('first.example.com', 22, 'user', 'connected');
      sshLogger.logConnection('second.example.com', 22, 'user', 'connected');
      sshLogger.logConnection('third.example.com', 22, 'user', 'connected');

      const entries = sshLogger.getRecentLogs(10);
      expect(entries[0].host).toBe('third.example.com');
      expect(entries[2].host).toBe('first.example.com');
    });
  });

  describe('setDebugMode', () => {
    it('should enable debug logging', () => {
      sshLogger.setDebugMode(true);

      expect(sshLogger.isDebugMode()).toBe(true);
    });

    it('should disable debug logging', () => {
      sshLogger.setDebugMode(true);
      sshLogger.setDebugMode(false);

      expect(sshLogger.isDebugMode()).toBe(false);
    });
  });

  describe('logProtocolDebug', () => {
    it('should log protocol details when debug mode is enabled', () => {
      sshLogger.setDebugMode(true);
      sshLogger.logProtocolDebug('SSH handshake', { version: '2.0' });

      const entries = sshLogger.getRecentLogs(10);
      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('protocol');
    });

    it('should not log protocol details when debug mode is disabled', () => {
      sshLogger.setDebugMode(false);
      sshLogger.logProtocolDebug('SSH handshake', { version: '2.0' });

      const entries = sshLogger.getRecentLogs(10);
      expect(entries).toHaveLength(0);
    });
  });

  describe('clearLogs', () => {
    it('should clear all logs', () => {
      sshLogger.logConnection('host.example.com', 22, 'user', 'connected');
      sshLogger.logConnection('host2.example.com', 22, 'user', 'connected');

      sshLogger.clearLogs();

      const entries = sshLogger.getRecentLogs(10);
      expect(entries).toHaveLength(0);
    });
  });

  describe('exportLogs', () => {
    it('should export logs as JSON string', () => {
      sshLogger.logConnection('host.example.com', 22, 'user', 'connected');

      const exported = sshLogger.exportLogs();
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].host).toBe('host.example.com');
    });
  });

  describe('exportLogsToFile', () => {
    it('should export logs to a file', async () => {
      const fs = await import('fs/promises');
      const os = await import('os');
      const path = await import('path');

      sshLogger.logConnection('host.example.com', 22, 'user', 'connected');
      sshLogger.logCommand('ls -la', 'success', 0);

      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sshlogger-test-'));
      const filePath = path.join(tempDir, 'ssh-logs.json');

      try {
        const result = await sshLogger.exportLogsToFile(filePath);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.path).toBe(filePath);

          const content = await fs.readFile(filePath, 'utf-8');
          const parsed = JSON.parse(content);
          expect(parsed).toHaveLength(2);
          expect(parsed[0].type).toBe('connection');
          expect(parsed[1].type).toBe('command');
        }
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should return error for invalid path', async () => {
      const result = await sshLogger.exportLogsToFile('/invalid/path/that/does/not/exist/logs.json');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeTruthy();
      }
    });
  });

  describe('getLogStats', () => {
    it('should return log statistics', () => {
      sshLogger.logConnection('host.example.com', 22, 'user', 'connected');
      sshLogger.logConnection('host2.example.com', 22, 'user', 'error', 'Failed');
      sshLogger.logFileOperation('read', '/path', 'success');
      sshLogger.logFileOperation('write', '/path', 'error', 'No permission');
      sshLogger.logCommand('ls', 'success', 0);

      const stats = sshLogger.getLogStats();

      expect(stats.totalEntries).toBe(5);
      expect(stats.connectionEvents).toBe(2);
      expect(stats.fileOperations).toBe(2);
      expect(stats.commands).toBe(1);
      expect(stats.errors).toBe(2);
    });

    it('should return zero counts for empty log', () => {
      const stats = sshLogger.getLogStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.connectionEvents).toBe(0);
      expect(stats.fileOperations).toBe(0);
      expect(stats.commands).toBe(0);
      expect(stats.errors).toBe(0);
    });
  });
});
