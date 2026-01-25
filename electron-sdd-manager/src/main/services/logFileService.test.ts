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

  // =============================================================================
  // runtime-agents-restructure: Tasks 3.1-3.4 - Category-aware log operations
  // Requirements: 2.1, 2.2, 2.3, 1.2, 1.4, 1.6, 1.7, 6.1, 6.2, 5.1, 5.2, 5.3, 7.1
  // =============================================================================
  describe('Category-aware operations (Tasks 3.1-3.4)', () => {
    describe('appendLogWithCategory (Task 3.2)', () => {
      it('should write log to specs/{specId}/logs/ path (Req 1.2)', async () => {
        const entry: LogEntry = {
          timestamp: '2025-11-26T10:00:00Z',
          stream: 'stdout',
          data: 'Spec log entry',
        };

        await service.appendLogWithCategory('specs', 'my-feature', 'agent-001', entry);

        // Verify file was created at new path structure
        const filePath = path.join(testDir, 'specs', 'my-feature', 'logs', 'agent-001.log');
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(content.trim());
        expect(parsed.data).toBe('Spec log entry');
      });

      it('should write log to bugs/{bugId}/logs/ path (Req 1.4)', async () => {
        const entry: LogEntry = {
          timestamp: '2025-11-26T10:00:00Z',
          stream: 'stdout',
          data: 'Bug log entry',
        };

        await service.appendLogWithCategory('bugs', 'login-error', 'agent-002', entry);

        // Verify file was created at bugs path
        const filePath = path.join(testDir, 'bugs', 'login-error', 'logs', 'agent-002.log');
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(content.trim());
        expect(parsed.data).toBe('Bug log entry');
      });

      it('should write log to project/logs/ path (Req 1.6)', async () => {
        const entry: LogEntry = {
          timestamp: '2025-11-26T10:00:00Z',
          stream: 'stdout',
          data: 'Project log entry',
        };

        await service.appendLogWithCategory('project', '', 'agent-003', entry);

        // Verify file was created at project path
        const filePath = path.join(testDir, 'project', 'logs', 'agent-003.log');
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(content.trim());
        expect(parsed.data).toBe('Project log entry');
      });

      it('should auto-create logs/ subdirectory (Req 1.7)', async () => {
        const entry: LogEntry = {
          timestamp: '2025-11-26T10:00:00Z',
          stream: 'stdout',
          data: 'Test',
        };

        await service.appendLogWithCategory('specs', 'new-spec', 'agent-001', entry);

        // Verify logs directory was created
        const logsDir = path.join(testDir, 'specs', 'new-spec', 'logs');
        const stats = await fs.stat(logsDir);
        expect(stats.isDirectory()).toBe(true);
      });
    });

    describe('readLogWithFallback (Task 3.3)', () => {
      it('should read from new path first (Req 6.1)', async () => {
        const entry: LogEntry = {
          timestamp: '2025-11-26T10:00:00Z',
          stream: 'stdout',
          data: 'New path entry',
        };

        await service.appendLogWithCategory('specs', 'my-feature', 'agent-001', entry);

        const result = await service.readLogWithFallback('specs', 'my-feature', 'agent-001');
        expect(result.isLegacy).toBe(false);
        expect(result.entries).toHaveLength(1);
        expect(result.entries[0].data).toBe('New path entry');
      });

      it('should fall back to legacy path when new path not found (Req 6.2)', async () => {
        // Create legacy log at old path (specs/{specId}/logs/)
        const legacyDir = path.join(testDir, 'my-feature', 'logs');
        await fs.mkdir(legacyDir, { recursive: true });
        const legacyEntry: LogEntry = {
          timestamp: '2025-11-26T10:00:00Z',
          stream: 'stdout',
          data: 'Legacy path entry',
        };
        await fs.writeFile(
          path.join(legacyDir, 'agent-001.log'),
          JSON.stringify(legacyEntry) + '\n',
          'utf-8'
        );

        const result = await service.readLogWithFallback('specs', 'my-feature', 'agent-001');
        expect(result.isLegacy).toBe(true);
        expect(result.entries).toHaveLength(1);
        expect(result.entries[0].data).toBe('Legacy path entry');
      });

      it('should return empty entries when neither path exists', async () => {
        const result = await service.readLogWithFallback('specs', 'non-existent', 'agent-001');
        expect(result.isLegacy).toBe(false);
        expect(result.entries).toHaveLength(0);
      });

      it('should prefer new path over legacy path when both exist', async () => {
        // Create new path log
        const newEntry: LogEntry = {
          timestamp: '2025-11-26T10:00:00Z',
          stream: 'stdout',
          data: 'New path entry',
        };
        await service.appendLogWithCategory('specs', 'my-feature', 'agent-001', newEntry);

        // Also create legacy log
        const legacyDir = path.join(testDir, 'my-feature', 'logs');
        await fs.mkdir(legacyDir, { recursive: true });
        const legacyEntry: LogEntry = {
          timestamp: '2025-11-26T09:00:00Z',
          stream: 'stdout',
          data: 'Legacy path entry',
        };
        await fs.writeFile(
          path.join(legacyDir, 'agent-001.log'),
          JSON.stringify(legacyEntry) + '\n',
          'utf-8'
        );

        const result = await service.readLogWithFallback('specs', 'my-feature', 'agent-001');
        expect(result.isLegacy).toBe(false);
        expect(result.entries[0].data).toBe('New path entry');
      });
    });

    describe('hasLegacyLogs (Task 3.4)', () => {
      it('should return true when legacy logs exist for spec', async () => {
        // Create legacy log at old path
        const legacyDir = path.join(testDir, 'my-feature', 'logs');
        await fs.mkdir(legacyDir, { recursive: true });
        await fs.writeFile(path.join(legacyDir, 'agent-001.log'), 'test\n', 'utf-8');

        const hasLegacy = await service.hasLegacyLogs('my-feature');
        expect(hasLegacy).toBe(true);
      });

      it('should return true when legacy logs exist for bug with bug: prefix', async () => {
        // Create legacy log at old path with bug: prefix
        const legacyDir = path.join(testDir, 'bug:login-error', 'logs');
        await fs.mkdir(legacyDir, { recursive: true });
        await fs.writeFile(path.join(legacyDir, 'agent-001.log'), 'test\n', 'utf-8');

        const hasLegacy = await service.hasLegacyLogs('bug:login-error');
        expect(hasLegacy).toBe(true);
      });

      it('should return false when no legacy logs exist', async () => {
        const hasLegacy = await service.hasLegacyLogs('non-existent');
        expect(hasLegacy).toBe(false);
      });

      it('should return false when legacy directory exists but is empty', async () => {
        const legacyDir = path.join(testDir, 'empty-spec', 'logs');
        await fs.mkdir(legacyDir, { recursive: true });

        const hasLegacy = await service.hasLegacyLogs('empty-spec');
        expect(hasLegacy).toBe(false);
      });
    });

    describe('getLegacyLogInfo (Task 3.4)', () => {
      it('should return file count and total size', async () => {
        // Create legacy logs
        const legacyDir = path.join(testDir, 'my-feature', 'logs');
        await fs.mkdir(legacyDir, { recursive: true });

        const log1Content = '{"data":"entry1"}\n'.repeat(10); // ~190 bytes
        const log2Content = '{"data":"entry2"}\n'.repeat(5); // ~95 bytes

        await fs.writeFile(path.join(legacyDir, 'agent-001.log'), log1Content, 'utf-8');
        await fs.writeFile(path.join(legacyDir, 'agent-002.log'), log2Content, 'utf-8');

        const info = await service.getLegacyLogInfo('my-feature');
        expect(info).not.toBeNull();
        expect(info?.fileCount).toBe(2);
        expect(info?.totalSize).toBeGreaterThan(0);
      });

      it('should return null when no legacy logs exist', async () => {
        const info = await service.getLegacyLogInfo('non-existent');
        expect(info).toBeNull();
      });

      it('should only count .log files', async () => {
        const legacyDir = path.join(testDir, 'my-feature', 'logs');
        await fs.mkdir(legacyDir, { recursive: true });

        await fs.writeFile(path.join(legacyDir, 'agent-001.log'), 'test\n', 'utf-8');
        await fs.writeFile(path.join(legacyDir, 'README.txt'), 'ignore\n', 'utf-8');

        const info = await service.getLegacyLogInfo('my-feature');
        expect(info?.fileCount).toBe(1);
      });
    });
  });
});
