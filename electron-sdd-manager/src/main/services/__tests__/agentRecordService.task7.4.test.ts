/**
 * AgentRecordService Task 7.4 Tests
 * Tests for internal methods using category-aware paths
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4
 * - readRecord should use category-aware readRecordWithCategory
 * - writeRecord should use category-aware writeRecordWithCategory
 * - updateRecord should work correctly with new paths
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { AgentRecordService, AgentRecord } from '../agentRecordService';

describe('AgentRecordService Task 7.4: Internal methods category-aware', () => {
  let testDir: string;
  let service: AgentRecordService;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `agent-record-task74-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    service = new AgentRecordService(testDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('writeRecord - category-aware (Task 7.4)', () => {
    it('should write spec-bound agent to specs/{specId}/ path', async () => {
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

      await service.writeRecord(record);

      // Verify file was written to category-aware path
      const expectedPath = path.join(testDir, 'specs', 'my-feature', 'agent-001.json');
      const content = await fs.readFile(expectedPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.agentId).toBe('agent-001');
      expect(parsed.specId).toBe('my-feature');
    });

    it('should write bug-bound agent to bugs/{bugId}/ path', async () => {
      const record: AgentRecord = {
        agentId: 'agent-002',
        specId: 'bug:fix-memory-leak',
        phase: 'fix',
        pid: 12346,
        sessionId: 'session-2',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude',
      };

      await service.writeRecord(record);

      // Verify file was written to bugs path (without 'bug:' prefix in directory)
      const expectedPath = path.join(testDir, 'bugs', 'fix-memory-leak', 'agent-002.json');
      const content = await fs.readFile(expectedPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.agentId).toBe('agent-002');
      expect(parsed.specId).toBe('bug:fix-memory-leak');
    });

    it('should write project agent to project/ path', async () => {
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

      await service.writeRecord(record);

      // Verify file was written to project path
      const expectedPath = path.join(testDir, 'project', 'agent-003.json');
      const content = await fs.readFile(expectedPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.agentId).toBe('agent-003');
      expect(parsed.specId).toBe('');
    });
  });

  describe('readRecord - category-aware (Task 7.4)', () => {
    it('should read spec-bound agent from specs/{specId}/ path', async () => {
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

      // Write using category-aware method
      await service.writeRecordWithCategory('specs', 'my-feature', record);

      // Read using old method (should internally use category-aware read)
      const result = await service.readRecord('my-feature', 'agent-001');
      expect(result).not.toBeNull();
      expect(result?.agentId).toBe('agent-001');
      expect(result?.specId).toBe('my-feature');
    });

    it('should read bug-bound agent from bugs/{bugId}/ path', async () => {
      const record: AgentRecord = {
        agentId: 'agent-002',
        specId: 'bug:fix-memory-leak',
        phase: 'fix',
        pid: 12346,
        sessionId: 'session-2',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude',
      };

      // Write using category-aware method
      await service.writeRecordWithCategory('bugs', 'fix-memory-leak', record);

      // Read using old method with full specId (should determine category)
      const result = await service.readRecord('bug:fix-memory-leak', 'agent-002');
      expect(result).not.toBeNull();
      expect(result?.agentId).toBe('agent-002');
      expect(result?.specId).toBe('bug:fix-memory-leak');
    });

    it('should read project agent from project/ path', async () => {
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

      // Write using category-aware method
      await service.writeRecordWithCategory('project', '', record);

      // Read using old method with empty specId
      const result = await service.readRecord('', 'agent-003');
      expect(result).not.toBeNull();
      expect(result?.agentId).toBe('agent-003');
      expect(result?.specId).toBe('');
    });

    it('should return null for non-existent record', async () => {
      const result = await service.readRecord('my-feature', 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('updateRecord - category-aware (Task 7.4)', () => {
    it('should update spec-bound agent in specs/{specId}/ path', async () => {
      // Create initial record
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

      await service.writeRecordWithCategory('specs', 'my-feature', record);

      // Update using old method
      await service.updateRecord('my-feature', 'agent-001', {
        status: 'completed',
        lastActivityAt: '2025-11-26T10:05:00Z',
      });

      // Verify update was written to category-aware path
      const expectedPath = path.join(testDir, 'specs', 'my-feature', 'agent-001.json');
      const content = await fs.readFile(expectedPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.status).toBe('completed');
      expect(parsed.lastActivityAt).toBe('2025-11-26T10:05:00Z');
    });

    it('should update bug-bound agent in bugs/{bugId}/ path', async () => {
      // Create initial record
      const record: AgentRecord = {
        agentId: 'agent-002',
        specId: 'bug:fix-memory-leak',
        phase: 'fix',
        pid: 12346,
        sessionId: 'session-2',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude',
      };

      await service.writeRecordWithCategory('bugs', 'fix-memory-leak', record);

      // Update using old method with full specId
      await service.updateRecord('bug:fix-memory-leak', 'agent-002', {
        status: 'completed',
        lastActivityAt: '2025-11-26T10:05:00Z',
      });

      // Verify update was written to category-aware path
      const expectedPath = path.join(testDir, 'bugs', 'fix-memory-leak', 'agent-002.json');
      const content = await fs.readFile(expectedPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.status).toBe('completed');
      expect(parsed.lastActivityAt).toBe('2025-11-26T10:05:00Z');
    });

    it('should update project agent in project/ path', async () => {
      // Create initial record
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

      await service.writeRecordWithCategory('project', '', record);

      // Update using old method with empty specId
      await service.updateRecord('', 'agent-003', {
        status: 'completed',
        lastActivityAt: '2025-11-26T10:05:00Z',
      });

      // Verify update was written to category-aware path
      const expectedPath = path.join(testDir, 'project', 'agent-003.json');
      const content = await fs.readFile(expectedPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.status).toBe('completed');
      expect(parsed.lastActivityAt).toBe('2025-11-26T10:05:00Z');
    });

    it('should throw error when updating non-existent record', async () => {
      await expect(
        service.updateRecord('my-feature', 'non-existent', { status: 'completed' })
      ).rejects.toThrow('Agent record not found: my-feature/non-existent');
    });
  });
});
