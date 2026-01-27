/**
 * RecoveryEngine Tests
 * agent-stale-recovery: Task 8.2 - RecoveryEngine unit tests
 * Requirements: 4.1, 4.2, 4.6, 5.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RecoveryEngine, RecoveryResult } from './RecoveryEngine';
import { LogAnalyzer, RecoveryAction } from './LogAnalyzer';
import { AgentRecordService, AgentRecord } from '../agentRecordService';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

describe('RecoveryEngine', () => {
  let tempDir: string;
  let engine: RecoveryEngine;
  let recordService: AgentRecordService;
  let logAnalyzer: LogAnalyzer;
  let mockNotify: ReturnType<typeof vi.fn>;
  let mockResumeAgent: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recovery-engine-test-'));
    recordService = new AgentRecordService(path.join(tempDir, '.kiro', 'runtime', 'agents'));
    logAnalyzer = new LogAnalyzer(tempDir);
    mockNotify = vi.fn();
    mockResumeAgent = vi.fn().mockResolvedValue(undefined);

    engine = new RecoveryEngine(recordService, logAnalyzer, mockNotify, mockResumeAgent);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('recoverAgent', () => {
    it('should mark agent as completed when log shows completion', async () => {
      // Requirements: 4.1
      const record: AgentRecord = {
        agentId: 'agent-001',
        specId: 'test-spec',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-uuid',
        status: 'running',
        startedAt: '2026-01-28T00:00:00Z',
        lastActivityAt: '2026-01-28T00:05:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
        autoResumeCount: 0,
      };

      await recordService.writeRecord(record);

      // Mock log analyzer to return 'complete'
      vi.spyOn(logAnalyzer, 'analyzeLog').mockResolvedValue('complete' as RecoveryAction);

      const result = await engine.recoverAgent(record);

      expect(result.action).toBe('completed');
      expect(result.agentId).toBe('agent-001');

      // Verify status was updated to 'completed'
      const updatedRecord = await recordService.readRecord('test-spec', 'agent-001');
      expect(updatedRecord?.status).toBe('completed');
    });

    it('should resume agent when log shows interrupted state', async () => {
      // Requirements: 4.2
      const record: AgentRecord = {
        agentId: 'agent-002',
        specId: 'test-spec',
        phase: 'requirements',
        pid: 12346,
        sessionId: 'session-uuid',
        status: 'running',
        startedAt: '2026-01-28T00:00:00Z',
        lastActivityAt: '2026-01-28T00:05:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
        autoResumeCount: 0,
      };

      await recordService.writeRecord(record);

      // Mock log analyzer to return 'resume'
      vi.spyOn(logAnalyzer, 'analyzeLog').mockResolvedValue('resume' as RecoveryAction);
      // Mock process alive check to return false (process not running)
      vi.spyOn(recordService, 'checkProcessAlive').mockReturnValue(false);

      const result = await engine.recoverAgent(record);

      expect(result.action).toBe('resumed');
      expect(result.agentId).toBe('agent-002');

      // Verify resume was called
      expect(mockResumeAgent).toHaveBeenCalledWith('agent-002');

      // Verify autoResumeCount was incremented
      const updatedRecord = await recordService.readRecord('test-spec', 'agent-002');
      expect(updatedRecord?.autoResumeCount).toBe(1);
    });

    it('should kill process before resume if alive', async () => {
      // Requirements: 4.4
      const record: AgentRecord = {
        agentId: 'agent-003',
        specId: 'test-spec',
        phase: 'requirements',
        pid: 12347,
        sessionId: 'session-uuid',
        status: 'running',
        startedAt: '2026-01-28T00:00:00Z',
        lastActivityAt: '2026-01-28T00:05:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
        autoResumeCount: 0,
      };

      await recordService.writeRecord(record);

      vi.spyOn(logAnalyzer, 'analyzeLog').mockResolvedValue('resume' as RecoveryAction);
      // Mock process alive check to return true (process is running)
      vi.spyOn(recordService, 'checkProcessAlive').mockReturnValue(true);
      const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

      const result = await engine.recoverAgent(record);

      expect(result.action).toBe('resumed');
      // Verify process.kill was called with SIGKILL
      expect(killSpy).toHaveBeenCalledWith(12347, 'SIGKILL');
      expect(mockResumeAgent).toHaveBeenCalled();
    });

    it('should mark agent as failed when log shows error', async () => {
      // Requirements: 4.6, 4.7
      const record: AgentRecord = {
        agentId: 'agent-004',
        specId: 'test-spec',
        phase: 'requirements',
        pid: 12348,
        sessionId: 'session-uuid',
        status: 'running',
        startedAt: '2026-01-28T00:00:00Z',
        lastActivityAt: '2026-01-28T00:05:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
        autoResumeCount: 0,
      };

      await recordService.writeRecord(record);

      vi.spyOn(logAnalyzer, 'analyzeLog').mockResolvedValue('fail' as RecoveryAction);

      const result = await engine.recoverAgent(record);

      expect(result.action).toBe('failed');
      expect(result.agentId).toBe('agent-004');

      // Verify status was updated to 'failed'
      const updatedRecord = await recordService.readRecord('test-spec', 'agent-004');
      expect(updatedRecord?.status).toBe('failed');

      // Verify toast notification was sent
      expect(mockNotify).toHaveBeenCalledWith(
        expect.stringContaining('agent-004'),
        'error'
      );
    });

    it('should skip recovery for interrupted agents', async () => {
      // Requirements: 3.5
      const record: AgentRecord = {
        agentId: 'agent-005',
        specId: 'test-spec',
        phase: 'requirements',
        pid: 12349,
        sessionId: 'session-uuid',
        status: 'interrupted',
        startedAt: '2026-01-28T00:00:00Z',
        lastActivityAt: '2026-01-28T00:05:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
        autoResumeCount: 0,
      };

      await recordService.writeRecord(record);

      const result = await engine.recoverAgent(record);

      expect(result.action).toBe('skipped');
      expect(result.reason).toContain('interrupted');

      // Verify no changes were made
      const unchangedRecord = await recordService.readRecord('test-spec', 'agent-005');
      expect(unchangedRecord?.status).toBe('interrupted');
    });

    it('should fail when autoResumeCount exceeds limit', async () => {
      // Requirements: 5.2, 5.3
      const record: AgentRecord = {
        agentId: 'agent-006',
        specId: 'test-spec',
        phase: 'requirements',
        pid: 12350,
        sessionId: 'session-uuid',
        status: 'running',
        startedAt: '2026-01-28T00:00:00Z',
        lastActivityAt: '2026-01-28T00:05:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
        autoResumeCount: 3,  // Already at limit
      };

      await recordService.writeRecord(record);

      vi.spyOn(logAnalyzer, 'analyzeLog').mockResolvedValue('resume' as RecoveryAction);

      const result = await engine.recoverAgent(record);

      expect(result.action).toBe('limit_exceeded');

      // Verify status was updated to 'failed'
      const updatedRecord = await recordService.readRecord('test-spec', 'agent-006');
      expect(updatedRecord?.status).toBe('failed');

      // Verify toast notification about limit was sent
      expect(mockNotify).toHaveBeenCalledWith(
        expect.stringContaining('上限'),
        'error'
      );
    });
  });
});
