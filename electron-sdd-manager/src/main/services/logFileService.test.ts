/**
 * LogFileService Tests
 * Requirements: 9.3
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { LogFileService, LogEntry, appendLog, readLog } from './logFileService';

describe('LogFileService', () => {
  let testDir: string;
  let service: LogFileService;

  beforeEach(async () => {
    // Create a temporary directory for testing
    testDir = path.join(os.tmpdir(), `log-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    service = new LogFileService(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // Task 23.1: ログファイル書き込み
  describe('appendLog', () => {
    it('should append log entry to file', async () => {
      const entry: LogEntry = {
        timestamp: '2025-11-26T10:00:00Z',
        stream: 'stdout',
        data: 'Hello, World!',
      };

      await service.appendLog('spec-a', 'agent-001', entry);

      // Verify file was created
      const filePath = path.join(testDir, 'spec-a', 'logs', 'agent-001.log');
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content.trim());

      expect(parsed.timestamp).toBe('2025-11-26T10:00:00Z');
      expect(parsed.stream).toBe('stdout');
      expect(parsed.data).toBe('Hello, World!');
    });

    it('should append multiple log entries in JSONL format', async () => {
      const entry1: LogEntry = {
        timestamp: '2025-11-26T10:00:00Z',
        stream: 'stdout',
        data: 'First line',
      };

      const entry2: LogEntry = {
        timestamp: '2025-11-26T10:00:01Z',
        stream: 'stderr',
        data: 'Second line',
      };

      await service.appendLog('spec-a', 'agent-001', entry1);
      await service.appendLog('spec-a', 'agent-001', entry2);

      // Verify both entries were appended
      const filePath = path.join(testDir, 'spec-a', 'logs', 'agent-001.log');
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0]).data).toBe('First line');
      expect(JSON.parse(lines[1]).data).toBe('Second line');
    });

    it('should create directory structure if not exists', async () => {
      const entry: LogEntry = {
        timestamp: '2025-11-26T10:00:00Z',
        stream: 'stdout',
        data: 'Test',
      };

      await service.appendLog('new-spec', 'agent-001', entry);

      // Verify directory was created
      const dirPath = path.join(testDir, 'new-spec', 'logs');
      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should handle stderr stream', async () => {
      const entry: LogEntry = {
        timestamp: '2025-11-26T10:00:00Z',
        stream: 'stderr',
        data: 'Error message',
      };

      await service.appendLog('spec-a', 'agent-001', entry);

      const filePath = path.join(testDir, 'spec-a', 'logs', 'agent-001.log');
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content.trim());

      expect(parsed.stream).toBe('stderr');
      expect(parsed.data).toBe('Error message');
    });
  });

  // Task 23.2: ログファイル読み込み
  describe('readLog', () => {
    it('should read log file and parse entries', async () => {
      const entry1: LogEntry = {
        timestamp: '2025-11-26T10:00:00Z',
        stream: 'stdout',
        data: 'First line',
      };

      const entry2: LogEntry = {
        timestamp: '2025-11-26T10:00:01Z',
        stream: 'stderr',
        data: 'Second line',
      };

      await service.appendLog('spec-a', 'agent-001', entry1);
      await service.appendLog('spec-a', 'agent-001', entry2);

      const entries = await service.readLog('spec-a', 'agent-001');

      expect(entries).toHaveLength(2);
      expect(entries[0].data).toBe('First line');
      expect(entries[0].stream).toBe('stdout');
      expect(entries[1].data).toBe('Second line');
      expect(entries[1].stream).toBe('stderr');
    });

    it('should return empty array for non-existent log file', async () => {
      const entries = await service.readLog('non-existent', 'agent-001');
      expect(entries).toHaveLength(0);
    });

    it('should handle empty log file', async () => {
      // Create empty log file
      const specDir = path.join(testDir, 'spec-a');
      await fs.mkdir(specDir, { recursive: true });
      await fs.writeFile(path.join(specDir, 'agent-001.log'), '');

      const entries = await service.readLog('spec-a', 'agent-001');
      expect(entries).toHaveLength(0);
    });

    it('should handle log file with empty lines', async () => {
      const entry: LogEntry = {
        timestamp: '2025-11-26T10:00:00Z',
        stream: 'stdout',
        data: 'Test',
      };

      await service.appendLog('spec-a', 'agent-001', entry);

      // Add some empty lines
      const filePath = path.join(testDir, 'spec-a', 'agent-001.log');
      await fs.appendFile(filePath, '\n\n');

      const entries = await service.readLog('spec-a', 'agent-001');
      expect(entries).toHaveLength(1);
      expect(entries[0].data).toBe('Test');
    });
  });

  describe('clearLog', () => {
    it('should clear log file', async () => {
      const entry: LogEntry = {
        timestamp: '2025-11-26T10:00:00Z',
        stream: 'stdout',
        data: 'Test',
      };

      await service.appendLog('spec-a', 'agent-001', entry);
      await service.clearLog('spec-a', 'agent-001');

      const entries = await service.readLog('spec-a', 'agent-001');
      expect(entries).toHaveLength(0);
    });

    it('should not throw when clearing non-existent log', async () => {
      await expect(
        service.clearLog('non-existent', 'agent-001')
      ).resolves.not.toThrow();
    });
  });

  describe('deleteLog', () => {
    it('should delete log file', async () => {
      const entry: LogEntry = {
        timestamp: '2025-11-26T10:00:00Z',
        stream: 'stdout',
        data: 'Test',
      };

      await service.appendLog('spec-a', 'agent-001', entry);
      await service.deleteLog('spec-a', 'agent-001');

      const filePath = path.join(testDir, 'spec-a', 'agent-001.log');
      await expect(fs.stat(filePath)).rejects.toThrow();
    });

    it('should not throw when deleting non-existent log', async () => {
      await expect(
        service.deleteLog('non-existent', 'agent-001')
      ).resolves.not.toThrow();
    });
  });
});
