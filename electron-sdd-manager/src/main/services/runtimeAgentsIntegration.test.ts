/**
 * Runtime Agents Restructure Integration Tests
 * Requirements: 7.1, 7.2, 7.3, 1.1, 1.2, 2.1, 4.2, 6.1
 *
 * Task 7.1: Existing AgentRecord read locations updated
 * Task 7.2: Existing log read locations updated
 * Task 7.3: .gitignore verification
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { AgentRecordService, AgentRecord } from './agentRecordService';
import { LogFileService, LogEntry } from './logFileService';
import { determineCategory, getEntityIdFromSpecId } from './agentCategory';

describe('Runtime Agents Restructure Integration', () => {
  let testDir: string;
  let agentRecordService: AgentRecordService;
  let logFileService: LogFileService;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `runtime-agents-integration-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    agentRecordService = new AgentRecordService(testDir);
    logFileService = new LogFileService(testDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // =============================================================================
  // Task 7.1: AgentRecord backward compatibility
  // Requirements: 3.2, 3.3, 3.4
  // =============================================================================
  describe('AgentRecord backward compatibility (Task 7.1)', () => {
    it('should read spec-bound agents from new path', async () => {
      // Write using new method
      const record: AgentRecord = {
        agentId: 'agent-001',
        specId: 'my-feature',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-1',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude',
      };

      await agentRecordService.writeRecordWithCategory('specs', 'my-feature', record);

      // Read using new method
      const records = await agentRecordService.readRecordsFor('specs', 'my-feature');
      expect(records).toHaveLength(1);
      expect(records[0].agentId).toBe('agent-001');
    });

    it('should read bug-bound agents from new path', async () => {
      const record: AgentRecord = {
        agentId: 'agent-002',
        specId: 'bug:login-error',
        phase: 'fix',
        pid: 12346,
        sessionId: 'session-2',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude',
      };

      await agentRecordService.writeRecordWithCategory('bugs', 'login-error', record);

      const records = await agentRecordService.readRecordsForBug('login-error');
      expect(records).toHaveLength(1);
      expect(records[0].agentId).toBe('agent-002');
    });

    it('should read project agents from new path', async () => {
      const record: AgentRecord = {
        agentId: 'agent-003',
        specId: '',
        phase: 'steering',
        pid: 12347,
        sessionId: 'session-3',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude',
      };

      await agentRecordService.writeRecordWithCategory('project', '', record);

      const records = await agentRecordService.readRecordsFor('project', '');
      expect(records).toHaveLength(1);
      expect(records[0].agentId).toBe('agent-003');
    });

    it('should correctly determine category from specId', () => {
      expect(determineCategory('')).toBe('project');
      expect(determineCategory('bug:login-error')).toBe('bugs');
      expect(determineCategory('my-feature')).toBe('specs');
    });

    it('should correctly extract entityId from specId', () => {
      expect(getEntityIdFromSpecId('')).toBe('');
      expect(getEntityIdFromSpecId('bug:login-error')).toBe('login-error');
      expect(getEntityIdFromSpecId('my-feature')).toBe('my-feature');
    });
  });

  // =============================================================================
  // Task 7.2: Log read backward compatibility
  // Requirements: 6.1, 6.2, 6.3
  // =============================================================================
  describe('Log read backward compatibility (Task 7.2)', () => {
    it('should write logs to new path and read them back', async () => {
      const entry: LogEntry = {
        timestamp: '2025-11-26T10:00:00Z',
        stream: 'stdout',
        data: 'New path log entry',
      };

      await logFileService.appendLogWithCategory('specs', 'my-feature', 'agent-001', entry);

      const result = await logFileService.readLogWithFallback('specs', 'my-feature', 'agent-001');
      expect(result.isLegacy).toBe(false);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].data).toBe('New path log entry');
    });

    it('should fall back to legacy path when new path has no logs', async () => {
      // Create legacy log
      const legacyDir = path.join(testDir, 'my-feature', 'logs');
      await fs.mkdir(legacyDir, { recursive: true });
      const legacyEntry: LogEntry = {
        timestamp: '2025-11-26T09:00:00Z',
        stream: 'stdout',
        data: 'Legacy path log entry',
      };
      await fs.writeFile(
        path.join(legacyDir, 'agent-001.log'),
        JSON.stringify(legacyEntry) + '\n',
        'utf-8'
      );

      const result = await logFileService.readLogWithFallback('specs', 'my-feature', 'agent-001');
      expect(result.isLegacy).toBe(true);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].data).toBe('Legacy path log entry');
    });

    it('should prefer new path over legacy path when both exist', async () => {
      // Create new path log
      const newEntry: LogEntry = {
        timestamp: '2025-11-26T10:00:00Z',
        stream: 'stdout',
        data: 'New path (preferred)',
      };
      await logFileService.appendLogWithCategory('specs', 'my-feature', 'agent-001', newEntry);

      // Create legacy log
      const legacyDir = path.join(testDir, 'my-feature', 'logs');
      await fs.mkdir(legacyDir, { recursive: true });
      const legacyEntry: LogEntry = {
        timestamp: '2025-11-26T09:00:00Z',
        stream: 'stdout',
        data: 'Legacy path (ignored)',
      };
      await fs.writeFile(
        path.join(legacyDir, 'agent-001.log'),
        JSON.stringify(legacyEntry) + '\n',
        'utf-8'
      );

      const result = await logFileService.readLogWithFallback('specs', 'my-feature', 'agent-001');
      expect(result.isLegacy).toBe(false);
      expect(result.entries[0].data).toBe('New path (preferred)');
    });

    it('should detect legacy logs via hasLegacyLogs', async () => {
      // No legacy logs
      expect(await logFileService.hasLegacyLogs('my-feature')).toBe(false);

      // Create legacy log
      const legacyDir = path.join(testDir, 'my-feature', 'logs');
      await fs.mkdir(legacyDir, { recursive: true });
      await fs.writeFile(path.join(legacyDir, 'agent-001.log'), '{"data":"test"}\n', 'utf-8');

      expect(await logFileService.hasLegacyLogs('my-feature')).toBe(true);
    });

    it('should provide legacy log info via getLegacyLogInfo', async () => {
      // Create legacy logs
      const legacyDir = path.join(testDir, 'my-feature', 'logs');
      await fs.mkdir(legacyDir, { recursive: true });
      await fs.writeFile(path.join(legacyDir, 'agent-001.log'), '{"data":"test1"}\n', 'utf-8');
      await fs.writeFile(path.join(legacyDir, 'agent-002.log'), '{"data":"test2"}\n', 'utf-8');

      const info = await logFileService.getLegacyLogInfo('my-feature');
      expect(info).not.toBeNull();
      expect(info?.fileCount).toBe(2);
      expect(info?.totalSize).toBeGreaterThan(0);
    });
  });

  // =============================================================================
  // Task 7.3: Directory structure verification
  // Requirements: 7.2, 7.3
  // =============================================================================
  describe('Directory structure (Task 7.3)', () => {
    it('should create specs/{specId}/ directory structure', async () => {
      const record: AgentRecord = {
        agentId: 'agent-001',
        specId: 'my-feature',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-1',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude',
      };

      await agentRecordService.writeRecordWithCategory('specs', 'my-feature', record);

      const specDir = path.join(testDir, 'specs', 'my-feature');
      const exists = await fs.access(specDir).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should create bugs/{bugId}/ directory structure', async () => {
      const record: AgentRecord = {
        agentId: 'agent-002',
        specId: 'bug:login-error',
        phase: 'fix',
        pid: 12346,
        sessionId: 'session-2',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude',
      };

      await agentRecordService.writeRecordWithCategory('bugs', 'login-error', record);

      const bugDir = path.join(testDir, 'bugs', 'login-error');
      const exists = await fs.access(bugDir).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should create project/ directory structure', async () => {
      const record: AgentRecord = {
        agentId: 'agent-003',
        specId: '',
        phase: 'steering',
        pid: 12347,
        sessionId: 'session-3',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude',
      };

      await agentRecordService.writeRecordWithCategory('project', '', record);

      const projectDir = path.join(testDir, 'project');
      const exists = await fs.access(projectDir).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should create logs/ subdirectory for spec logs', async () => {
      const entry: LogEntry = {
        timestamp: '2025-11-26T10:00:00Z',
        stream: 'stdout',
        data: 'test',
      };

      await logFileService.appendLogWithCategory('specs', 'my-feature', 'agent-001', entry);

      const logsDir = path.join(testDir, 'specs', 'my-feature', 'logs');
      const exists = await fs.access(logsDir).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should create logs/ subdirectory for bug logs', async () => {
      const entry: LogEntry = {
        timestamp: '2025-11-26T10:00:00Z',
        stream: 'stdout',
        data: 'test',
      };

      await logFileService.appendLogWithCategory('bugs', 'login-error', 'agent-002', entry);

      const logsDir = path.join(testDir, 'bugs', 'login-error', 'logs');
      const exists = await fs.access(logsDir).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should create logs/ subdirectory for project logs', async () => {
      const entry: LogEntry = {
        timestamp: '2025-11-26T10:00:00Z',
        stream: 'stdout',
        data: 'test',
      };

      await logFileService.appendLogWithCategory('project', '', 'agent-003', entry);

      const logsDir = path.join(testDir, 'project', 'logs');
      const exists = await fs.access(logsDir).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });
});
