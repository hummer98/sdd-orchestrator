/**
 * AgentRecordService Tests
 * Requirements: 5.5, 5.6, 5.7
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  AgentRecordService,
  AgentRecord,
  writeRecord,
  readRecord,
  readAllRecords,
  updateRecord,
  checkProcessAlive,
} from './agentRecordService';

describe('AgentRecordService', () => {
  let testDir: string;
  let service: AgentRecordService;

  beforeEach(async () => {
    // Create a temporary directory for testing
    testDir = path.join(os.tmpdir(), `agent-record-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    service = new AgentRecordService(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // Task 22.1: Agent Record書き込み
  describe('writeRecord', () => {
    it('should write agent record to correct location', async () => {
      const record: AgentRecord = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-uuid-001',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
      };

      await service.writeRecord(record);

      // Verify file was created
      const filePath = path.join(testDir, 'spec-a', 'agent-001.json');
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.agentId).toBe('agent-001');
      expect(parsed.specId).toBe('spec-a');
      expect(parsed.pid).toBe(12345);
    });

    it('should create directory structure if not exists', async () => {
      const record: AgentRecord = {
        agentId: 'agent-001',
        specId: 'new-spec',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-uuid-001',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
      };

      await service.writeRecord(record);

      // Verify directory was created
      const dirPath = path.join(testDir, 'new-spec');
      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  // Task 22.2: Agent Record読み込み
  describe('readRecord', () => {
    it('should read agent record', async () => {
      const record: AgentRecord = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-uuid-001',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
      };

      await service.writeRecord(record);

      const result = await service.readRecord('spec-a', 'agent-001');

      expect(result).not.toBeNull();
      expect(result?.agentId).toBe('agent-001');
      expect(result?.pid).toBe(12345);
    });

    it('should return null for non-existent file', async () => {
      const result = await service.readRecord('non-existent-spec', 'non-existent-agent');
      expect(result).toBeNull();
    });
  });

  describe('readAllRecords', () => {
    it('should read all agent records', async () => {
      const record1: AgentRecord = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-uuid-001',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
      };

      const record2: AgentRecord = {
        agentId: 'agent-002',
        specId: 'spec-a',
        phase: 'design',
        pid: 12346,
        sessionId: 'session-uuid-002',
        status: 'completed',
        startedAt: '2025-11-26T10:01:00Z',
        lastActivityAt: '2025-11-26T10:05:00Z',
        command: 'claude -p "/kiro:spec-design"',
      };

      const record3: AgentRecord = {
        agentId: 'agent-003',
        specId: 'spec-b',
        phase: 'requirements',
        pid: 12347,
        sessionId: 'session-uuid-003',
        status: 'running',
        startedAt: '2025-11-26T10:02:00Z',
        lastActivityAt: '2025-11-26T10:02:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
      };

      await service.writeRecord(record1);
      await service.writeRecord(record2);
      await service.writeRecord(record3);

      const allRecords = await service.readAllRecords();

      expect(allRecords).toHaveLength(3);
      expect(allRecords.map((r) => r.agentId)).toContain('agent-001');
      expect(allRecords.map((r) => r.agentId)).toContain('agent-002');
      expect(allRecords.map((r) => r.agentId)).toContain('agent-003');
    });

    it('should return empty array when no files exist', async () => {
      const allRecords = await service.readAllRecords();
      expect(allRecords).toHaveLength(0);
    });
  });

  // Task 22.3: Agent Record更新
  describe('updateRecord', () => {
    it('should update status in agent record', async () => {
      const record: AgentRecord = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-uuid-001',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
      };

      await service.writeRecord(record);
      await service.updateRecord('spec-a', 'agent-001', { status: 'completed' });

      const result = await service.readRecord('spec-a', 'agent-001');
      expect(result?.status).toBe('completed');
    });

    it('should update lastActivityAt in agent record', async () => {
      const record: AgentRecord = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-uuid-001',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
      };

      await service.writeRecord(record);
      const newTime = '2025-11-26T10:05:00Z';
      await service.updateRecord('spec-a', 'agent-001', { lastActivityAt: newTime });

      const result = await service.readRecord('spec-a', 'agent-001');
      expect(result?.lastActivityAt).toBe(newTime);
    });

    it('should update sessionId in agent record', async () => {
      const record: AgentRecord = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: '',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
      };

      await service.writeRecord(record);
      const newSessionId = 'parsed-session-id-uuid';
      await service.updateRecord('spec-a', 'agent-001', { sessionId: newSessionId });

      const result = await service.readRecord('spec-a', 'agent-001');
      expect(result?.sessionId).toBe(newSessionId);
    });

    it('should throw error for non-existent file', async () => {
      await expect(
        service.updateRecord('non-existent', 'non-existent', { status: 'completed' })
      ).rejects.toThrow();
    });
  });

  // Task 22.4: プロセス生存確認
  describe('checkProcessAlive', () => {
    it('should return true for current process', () => {
      // Use current process PID which should be alive
      const result = service.checkProcessAlive(process.pid);
      expect(result).toBe(true);
    });

    it('should return false for non-existent PID', () => {
      // Use a very high PID that's unlikely to exist
      const result = service.checkProcessAlive(999999999);
      expect(result).toBe(false);
    });

    it('should return false for PID 0', () => {
      const result = service.checkProcessAlive(0);
      expect(result).toBe(false);
    });
  });

  describe('deleteRecord', () => {
    it('should delete agent record', async () => {
      const record: AgentRecord = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-uuid-001',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
      };

      await service.writeRecord(record);
      await service.deleteRecord('spec-a', 'agent-001');

      const result = await service.readRecord('spec-a', 'agent-001');
      expect(result).toBeNull();
    });

    it('should not throw when deleting non-existent file', async () => {
      await expect(
        service.deleteRecord('non-existent', 'non-existent')
      ).resolves.not.toThrow();
    });
  });
});
