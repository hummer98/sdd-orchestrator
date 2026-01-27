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

  // =============================================================================
  // agent-state-file-ssot: Task 1.1 - readRecordsForSpec
  // Requirements: 1.1 - Read agent records for a specific spec
  // =============================================================================
  describe('readRecordsForSpec (Task 1.1)', () => {
    it('should return only records for the specified specId', async () => {
      // Create records for different specs
      const recordSpecA1: AgentRecord = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-1',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude',
      };

      const recordSpecA2: AgentRecord = {
        agentId: 'agent-002',
        specId: 'spec-a',
        phase: 'design',
        pid: 12346,
        sessionId: 'session-2',
        status: 'completed',
        startedAt: '2025-11-26T10:01:00Z',
        lastActivityAt: '2025-11-26T10:05:00Z',
        command: 'claude',
      };

      const recordSpecB: AgentRecord = {
        agentId: 'agent-003',
        specId: 'spec-b',
        phase: 'requirements',
        pid: 12347,
        sessionId: 'session-3',
        status: 'running',
        startedAt: '2025-11-26T10:02:00Z',
        lastActivityAt: '2025-11-26T10:02:00Z',
        command: 'claude',
      };

      await service.writeRecord(recordSpecA1);
      await service.writeRecord(recordSpecA2);
      await service.writeRecord(recordSpecB);

      const specARecords = await service.readRecordsForSpec('spec-a');

      expect(specARecords).toHaveLength(2);
      expect(specARecords.map((r) => r.agentId)).toContain('agent-001');
      expect(specARecords.map((r) => r.agentId)).toContain('agent-002');
      expect(specARecords.map((r) => r.agentId)).not.toContain('agent-003');
    });

    it('should return empty array when spec directory does not exist', async () => {
      const records = await service.readRecordsForSpec('non-existent-spec');
      expect(records).toHaveLength(0);
    });

    it('should return empty array when spec directory is empty', async () => {
      // Create empty directory
      await fs.mkdir(path.join(testDir, 'empty-spec'), { recursive: true });
      const records = await service.readRecordsForSpec('empty-spec');
      expect(records).toHaveLength(0);
    });

    it('should skip corrupted JSON files', async () => {
      const validRecord: AgentRecord = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-1',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude',
      };

      await service.writeRecord(validRecord);

      // Write corrupted JSON file
      const corruptedPath = path.join(testDir, 'spec-a', 'agent-corrupted.json');
      await fs.writeFile(corruptedPath, 'not valid json {{{', 'utf-8');

      const records = await service.readRecordsForSpec('spec-a');

      expect(records).toHaveLength(1);
      expect(records[0].agentId).toBe('agent-001');
    });
  });

  // =============================================================================
  // agent-state-file-ssot: Task 1.2 - readProjectAgents
  // Requirements: 1.2 - Read project-level agent records (specId = "")
  // =============================================================================
  describe('readProjectAgents (Task 1.2)', () => {
    it('should return records with empty specId (ProjectAgent)', async () => {
      // Create project-level agent (empty specId)
      const projectAgent: AgentRecord = {
        agentId: 'agent-project-001',
        specId: '',
        phase: 'steering',
        pid: 12345,
        sessionId: 'session-project',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude',
      };

      // Create spec-level agent
      const specAgent: AgentRecord = {
        agentId: 'agent-spec-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12346,
        sessionId: 'session-spec',
        status: 'running',
        startedAt: '2025-11-26T10:01:00Z',
        lastActivityAt: '2025-11-26T10:01:00Z',
        command: 'claude',
      };

      await service.writeRecord(projectAgent);
      await service.writeRecord(specAgent);

      const projectAgents = await service.readProjectAgents();

      expect(projectAgents).toHaveLength(1);
      expect(projectAgents[0].agentId).toBe('agent-project-001');
      expect(projectAgents[0].specId).toBe('');
    });

    it('should return empty array when no project agents exist', async () => {
      // Create only spec-level agents
      const specAgent: AgentRecord = {
        agentId: 'agent-spec-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-1',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude',
      };

      await service.writeRecord(specAgent);

      const projectAgents = await service.readProjectAgents();
      expect(projectAgents).toHaveLength(0);
    });
  });

  // =============================================================================
  // agent-state-file-ssot: Task 1.3 - getRunningAgentCounts
  // Requirements: 1.3 - Get running agent counts per spec
  // =============================================================================
  describe('getRunningAgentCounts (Task 1.3)', () => {
    it('should return Map<specId, runningCount>', async () => {
      // Create agents with different statuses
      const runningAgent1: AgentRecord = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-1',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude',
      };

      const runningAgent2: AgentRecord = {
        agentId: 'agent-002',
        specId: 'spec-a',
        phase: 'design',
        pid: 12346,
        sessionId: 'session-2',
        status: 'running',
        startedAt: '2025-11-26T10:01:00Z',
        lastActivityAt: '2025-11-26T10:01:00Z',
        command: 'claude',
      };

      const completedAgent: AgentRecord = {
        agentId: 'agent-003',
        specId: 'spec-a',
        phase: 'tasks',
        pid: 12347,
        sessionId: 'session-3',
        status: 'completed',
        startedAt: '2025-11-26T10:02:00Z',
        lastActivityAt: '2025-11-26T10:05:00Z',
        command: 'claude',
      };

      const runningAgentSpecB: AgentRecord = {
        agentId: 'agent-004',
        specId: 'spec-b',
        phase: 'requirements',
        pid: 12348,
        sessionId: 'session-4',
        status: 'running',
        startedAt: '2025-11-26T10:03:00Z',
        lastActivityAt: '2025-11-26T10:03:00Z',
        command: 'claude',
      };

      await service.writeRecord(runningAgent1);
      await service.writeRecord(runningAgent2);
      await service.writeRecord(completedAgent);
      await service.writeRecord(runningAgentSpecB);

      const counts = await service.getRunningAgentCounts();

      expect(counts).toBeInstanceOf(Map);
      expect(counts.get('spec-a')).toBe(2); // 2 running, 1 completed
      expect(counts.get('spec-b')).toBe(1); // 1 running
    });

    it('should return 0 for specs with only non-running agents', async () => {
      const completedAgent: AgentRecord = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-1',
        status: 'completed',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:05:00Z',
        command: 'claude',
      };

      await service.writeRecord(completedAgent);

      const counts = await service.getRunningAgentCounts();

      expect(counts.get('spec-a')).toBe(0);
    });

    it('should return empty Map when no agents exist', async () => {
      const counts = await service.getRunningAgentCounts();

      expect(counts).toBeInstanceOf(Map);
      expect(counts.size).toBe(0);
    });

    it('should handle empty specId (ProjectAgent)', async () => {
      const projectAgent: AgentRecord = {
        agentId: 'agent-001',
        specId: '',
        phase: 'steering',
        pid: 12345,
        sessionId: 'session-1',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude',
      };

      await service.writeRecord(projectAgent);

      const counts = await service.getRunningAgentCounts();

      expect(counts.get('')).toBe(1);
    });

    it('should count only running status', async () => {
      // Create agents with different statuses
      const statuses = ['running', 'completed', 'interrupted', 'hang', 'failed'] as const;

      for (let i = 0; i < statuses.length; i++) {
        await service.writeRecord({
          agentId: `agent-${i}`,
          specId: 'spec-test',
          phase: 'requirements',
          pid: 12345 + i,
          sessionId: `session-${i}`,
          status: statuses[i],
          startedAt: '2025-11-26T10:00:00Z',
          lastActivityAt: '2025-11-26T10:00:00Z',
          command: 'claude',
        });
      }

      const counts = await service.getRunningAgentCounts();

      // Only 1 agent with 'running' status
      expect(counts.get('spec-test')).toBe(1);
    });
  });

  // =============================================================================
  // runtime-agents-restructure: Task 2.1-2.3 - Category-aware path generation
  // Requirements: 3.1, 1.1, 1.3, 1.5
  // =============================================================================
  describe('Category-aware operations (Tasks 2.1-2.3)', () => {
    describe('writeRecordWithCategory (Task 2.2)', () => {
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

        await service.writeRecordWithCategory('specs', 'my-feature', record);

        // Verify file was created at new path structure
        const filePath = path.join(testDir, 'specs', 'my-feature', 'agent-001.json');
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        expect(parsed.agentId).toBe('agent-001');
      });

      it('should write bug-bound agent to bugs/{bugId}/ path', async () => {
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

        await service.writeRecordWithCategory('bugs', 'login-error', record);

        // Verify file was created at bugs path
        const filePath = path.join(testDir, 'bugs', 'login-error', 'agent-002.json');
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        expect(parsed.agentId).toBe('agent-002');
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

        await service.writeRecordWithCategory('project', '', record);

        // Verify file was created at project path
        const filePath = path.join(testDir, 'project', 'agent-003.json');
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        expect(parsed.agentId).toBe('agent-003');
      });
    });

    describe('readRecordsFor (Task 2.3)', () => {
      it('should read records from specs/{specId}/', async () => {
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

        const records = await service.readRecordsFor('specs', 'my-feature');
        expect(records).toHaveLength(1);
        expect(records[0].agentId).toBe('agent-001');
      });

      it('should read records from bugs/{bugId}/', async () => {
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

        await service.writeRecordWithCategory('bugs', 'login-error', record);

        const records = await service.readRecordsFor('bugs', 'login-error');
        expect(records).toHaveLength(1);
        expect(records[0].agentId).toBe('agent-002');
      });

      it('should read records from project/', async () => {
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

        const records = await service.readRecordsFor('project', '');
        expect(records).toHaveLength(1);
        expect(records[0].agentId).toBe('agent-003');
      });

      it('should return empty array for non-existent category path', async () => {
        const records = await service.readRecordsFor('specs', 'non-existent');
        expect(records).toHaveLength(0);
      });
    });

    describe('readRecordWithCategory', () => {
      it('should read spec-bound agent record', async () => {
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

        const result = await service.readRecordWithCategory('specs', 'my-feature', 'agent-001');
        expect(result).not.toBeNull();
        expect(result?.agentId).toBe('agent-001');
      });

      it('should return null for non-existent record', async () => {
        const result = await service.readRecordWithCategory('specs', 'my-feature', 'non-existent');
        expect(result).toBeNull();
      });
    });

    describe('readRecordsForBug (Task 2.3)', () => {
      it('should be alias for readRecordsFor with bugs category', async () => {
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

        await service.writeRecordWithCategory('bugs', 'login-error', record);

        const records = await service.readRecordsForBug('login-error');
        expect(records).toHaveLength(1);
        expect(records[0].agentId).toBe('agent-002');
      });
    });
  });

  // =============================================================================
  // llm-stream-log-parser: Task 6.1 - engineId field support
  // Requirements: 2.1 - engineId in AgentRecord
  // =============================================================================
  describe('engineId field support (Task 6.1)', () => {
    it('should write and read engineId field', async () => {
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
        engineId: 'claude',
      };

      await service.writeRecord(record);

      const result = await service.readRecord('spec-a', 'agent-001');

      expect(result).not.toBeNull();
      expect(result?.engineId).toBe('claude');
    });

    it('should write and read gemini engineId', async () => {
      const record: AgentRecord = {
        agentId: 'agent-002',
        specId: 'spec-b',
        phase: 'requirements',
        pid: 12346,
        sessionId: 'session-uuid-002',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'gemini -p "/kiro:spec-requirements"',
        engineId: 'gemini',
      };

      await service.writeRecord(record);

      const result = await service.readRecord('spec-b', 'agent-002');

      expect(result).not.toBeNull();
      expect(result?.engineId).toBe('gemini');
    });

    it('should handle records without engineId (backward compatibility)', async () => {
      const record: AgentRecord = {
        agentId: 'agent-003',
        specId: 'spec-c',
        phase: 'requirements',
        pid: 12347,
        sessionId: 'session-uuid-003',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
        // No engineId - for backward compatibility
      };

      await service.writeRecord(record);

      const result = await service.readRecord('spec-c', 'agent-003');

      expect(result).not.toBeNull();
      expect(result?.engineId).toBeUndefined();
    });

    it('should persist engineId in file content', async () => {
      const record: AgentRecord = {
        agentId: 'agent-004',
        specId: 'spec-d',
        phase: 'design',
        pid: 12348,
        sessionId: 'session-uuid-004',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude',
        engineId: 'gemini',
      };

      await service.writeRecord(record);

      // Read file directly to verify JSON content
      const filePath = path.join(testDir, 'spec-d', 'agent-004.json');
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.engineId).toBe('gemini');
    });

    it('should preserve engineId in readRecordsForSpec', async () => {
      const record1: AgentRecord = {
        agentId: 'agent-001',
        specId: 'spec-e',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-1',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude',
        engineId: 'claude',
      };

      const record2: AgentRecord = {
        agentId: 'agent-002',
        specId: 'spec-e',
        phase: 'design',
        pid: 12346,
        sessionId: 'session-2',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'gemini',
        engineId: 'gemini',
      };

      await service.writeRecord(record1);
      await service.writeRecord(record2);

      const records = await service.readRecordsForSpec('spec-e');

      expect(records).toHaveLength(2);

      const claudeRecord = records.find((r) => r.agentId === 'agent-001');
      const geminiRecord = records.find((r) => r.agentId === 'agent-002');

      expect(claudeRecord?.engineId).toBe('claude');
      expect(geminiRecord?.engineId).toBe('gemini');
    });
  });

  // =============================================================================
  // metrics-file-based-tracking: Task 1.1 - ExecutionEntry type and executions field
  // Requirements: 1.1, 1.2, 1.3
  // =============================================================================
  describe('executions field support (Task 1.1)', () => {
    it('should write and read executions field', async () => {
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
        executions: [
          {
            startedAt: '2025-11-26T10:00:00Z',
            prompt: '/kiro:spec-requirements test-feature',
          },
        ],
      };

      await service.writeRecord(record);

      const result = await service.readRecord('spec-a', 'agent-001');

      expect(result).not.toBeNull();
      expect(result?.executions).toBeDefined();
      expect(result?.executions).toHaveLength(1);
      expect(result?.executions?.[0].startedAt).toBe('2025-11-26T10:00:00Z');
      expect(result?.executions?.[0].prompt).toBe('/kiro:spec-requirements test-feature');
      expect(result?.executions?.[0].endedAt).toBeUndefined();
    });

    it('should write and read executions with endedAt', async () => {
      const record: AgentRecord = {
        agentId: 'agent-002',
        specId: 'spec-b',
        phase: 'design',
        pid: 12346,
        sessionId: 'session-uuid-002',
        status: 'completed',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:05:00Z',
        command: 'claude -p "/kiro:spec-design"',
        executions: [
          {
            startedAt: '2025-11-26T10:00:00Z',
            endedAt: '2025-11-26T10:05:00Z',
            prompt: '/kiro:spec-design test-feature',
          },
        ],
      };

      await service.writeRecord(record);

      const result = await service.readRecord('spec-b', 'agent-002');

      expect(result).not.toBeNull();
      expect(result?.executions?.[0].endedAt).toBe('2025-11-26T10:05:00Z');
    });

    it('should handle multiple executions (resume scenarios)', async () => {
      const record: AgentRecord = {
        agentId: 'agent-003',
        specId: 'spec-c',
        phase: 'impl',
        pid: 12347,
        sessionId: 'session-uuid-003',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:30:00Z',
        command: 'claude',
        executions: [
          {
            startedAt: '2025-11-26T10:00:00Z',
            endedAt: '2025-11-26T10:10:00Z',
            prompt: '/kiro:spec-impl test-feature 1',
          },
          {
            startedAt: '2025-11-26T10:15:00Z',
            endedAt: '2025-11-26T10:25:00Z',
            prompt: 'continue',
          },
          {
            startedAt: '2025-11-26T10:30:00Z',
            prompt: 'continue again',
          },
        ],
      };

      await service.writeRecord(record);

      const result = await service.readRecord('spec-c', 'agent-003');

      expect(result).not.toBeNull();
      expect(result?.executions).toHaveLength(3);
      expect(result?.executions?.[0].endedAt).toBe('2025-11-26T10:10:00Z');
      expect(result?.executions?.[1].endedAt).toBe('2025-11-26T10:25:00Z');
      expect(result?.executions?.[2].endedAt).toBeUndefined();
    });

    it('should handle records without executions (backward compatibility)', async () => {
      const record: AgentRecord = {
        agentId: 'agent-004',
        specId: 'spec-d',
        phase: 'requirements',
        pid: 12348,
        sessionId: 'session-uuid-004',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude',
        // No executions - for backward compatibility
      };

      await service.writeRecord(record);

      const result = await service.readRecord('spec-d', 'agent-004');

      expect(result).not.toBeNull();
      expect(result?.executions).toBeUndefined();
    });

    it('should persist executions in file content', async () => {
      const record: AgentRecord = {
        agentId: 'agent-005',
        specId: 'spec-e',
        phase: 'design',
        pid: 12349,
        sessionId: 'session-uuid-005',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude',
        executions: [
          {
            startedAt: '2025-11-26T10:00:00Z',
            prompt: 'test prompt',
          },
        ],
      };

      await service.writeRecord(record);

      // Read file directly to verify JSON content
      const filePath = path.join(testDir, 'spec-e', 'agent-005.json');
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.executions).toBeDefined();
      expect(parsed.executions).toHaveLength(1);
      expect(parsed.executions[0].startedAt).toBe('2025-11-26T10:00:00Z');
      expect(parsed.executions[0].prompt).toBe('test prompt');
    });

    it('should update executions via updateRecord', async () => {
      const record: AgentRecord = {
        agentId: 'agent-006',
        specId: 'spec-f',
        phase: 'impl',
        pid: 12350,
        sessionId: 'session-uuid-006',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude',
        executions: [
          {
            startedAt: '2025-11-26T10:00:00Z',
            prompt: 'initial prompt',
          },
        ],
      };

      await service.writeRecord(record);

      // Update with new executions (simulating resume)
      await service.updateRecord('spec-f', 'agent-006', {
        executions: [
          {
            startedAt: '2025-11-26T10:00:00Z',
            endedAt: '2025-11-26T10:05:00Z',
            prompt: 'initial prompt',
          },
          {
            startedAt: '2025-11-26T10:10:00Z',
            prompt: 'resume prompt',
          },
        ],
      });

      const result = await service.readRecord('spec-f', 'agent-006');

      expect(result?.executions).toHaveLength(2);
      expect(result?.executions?.[0].endedAt).toBe('2025-11-26T10:05:00Z');
      expect(result?.executions?.[1].prompt).toBe('resume prompt');
    });

    it('should preserve executions in readRecordsForSpec', async () => {
      const record1: AgentRecord = {
        agentId: 'agent-001',
        specId: 'spec-g',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-1',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude',
        executions: [
          {
            startedAt: '2025-11-26T10:00:00Z',
            prompt: 'prompt 1',
          },
        ],
      };

      const record2: AgentRecord = {
        agentId: 'agent-002',
        specId: 'spec-g',
        phase: 'design',
        pid: 12346,
        sessionId: 'session-2',
        status: 'running',
        startedAt: '2025-11-26T10:05:00Z',
        lastActivityAt: '2025-11-26T10:05:00Z',
        command: 'claude',
        executions: [
          {
            startedAt: '2025-11-26T10:05:00Z',
            prompt: 'prompt 2',
          },
        ],
      };

      await service.writeRecord(record1);
      await service.writeRecord(record2);

      const records = await service.readRecordsForSpec('spec-g');

      expect(records).toHaveLength(2);

      const agent1 = records.find((r) => r.agentId === 'agent-001');
      const agent2 = records.find((r) => r.agentId === 'agent-002');

      expect(agent1?.executions?.[0].prompt).toBe('prompt 1');
      expect(agent2?.executions?.[0].prompt).toBe('prompt 2');
    });
  });
});
