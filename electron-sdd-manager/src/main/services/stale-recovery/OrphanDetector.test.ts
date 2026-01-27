/**
 * OrphanDetector Tests
 * agent-stale-recovery: Task 8.1 - OrphanDetector unit tests
 * Requirements: 1.1, 1.2, 1.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OrphanDetector } from './OrphanDetector';
import { RecoveryEngine, RecoveryResult } from './RecoveryEngine';
import { AgentRecordService, AgentRecord } from '../agentRecordService';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

describe('OrphanDetector', () => {
  let tempDir: string;
  let detector: OrphanDetector;
  let recordService: AgentRecordService;
  let mockRecoveryEngine: RecoveryEngine;
  let mockRecoverAgent: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'orphan-detector-test-'));
    const agentsBasePath = path.join(tempDir, '.kiro', 'runtime', 'agents');
    recordService = new AgentRecordService(agentsBasePath);

    // Mock RecoveryEngine
    mockRecoverAgent = vi.fn().mockResolvedValue({
      agentId: 'test-agent',
      action: 'completed',
    } as RecoveryResult);

    mockRecoveryEngine = {
      recoverAgent: mockRecoverAgent,
    } as unknown as RecoveryEngine;

    detector = new OrphanDetector(recordService, mockRecoveryEngine);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('detectOrphans', () => {
    it('should detect orphan agent (status:running, process not alive)', async () => {
      // Requirements: 1.1, 1.2
      const orphanRecord: AgentRecord = {
        agentId: 'agent-001',
        specId: 'test-spec',
        phase: 'requirements',
        pid: 99999, // Non-existent PID
        sessionId: 'session-uuid',
        status: 'running',
        startedAt: '2026-01-28T00:00:00Z',
        lastActivityAt: '2026-01-28T00:05:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
        autoResumeCount: 0,
      };

      await recordService.writeRecord(orphanRecord);

      // Mock checkProcessAlive to return false
      vi.spyOn(recordService, 'checkProcessAlive').mockReturnValue(false);

      await detector.detectOrphans(tempDir);

      // Verify RecoveryEngine.recoverAgent was called
      // Requirements: 1.3
      expect(mockRecoverAgent).toHaveBeenCalledWith(
        expect.objectContaining({ agentId: 'agent-001' })
      );
    });

    it('should skip completed agents', async () => {
      // Requirements: 1.2 - only status:running agents are checked
      const completedRecord: AgentRecord = {
        agentId: 'agent-002',
        specId: 'test-spec',
        phase: 'requirements',
        pid: 99998,
        sessionId: 'session-uuid',
        status: 'completed',
        startedAt: '2026-01-28T00:00:00Z',
        lastActivityAt: '2026-01-28T00:05:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
        autoResumeCount: 0,
      };

      await recordService.writeRecord(completedRecord);

      await detector.detectOrphans(tempDir);

      // Verify RecoveryEngine was not called
      expect(mockRecoverAgent).not.toHaveBeenCalled();
    });

    it('should skip interrupted agents', async () => {
      // Requirements: 1.2
      const interruptedRecord: AgentRecord = {
        agentId: 'agent-003',
        specId: 'test-spec',
        phase: 'requirements',
        pid: 99997,
        sessionId: 'session-uuid',
        status: 'interrupted',
        startedAt: '2026-01-28T00:00:00Z',
        lastActivityAt: '2026-01-28T00:05:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
        autoResumeCount: 0,
      };

      await recordService.writeRecord(interruptedRecord);

      await detector.detectOrphans(tempDir);

      expect(mockRecoverAgent).not.toHaveBeenCalled();
    });

    it('should skip running agents with alive process', async () => {
      // Requirements: 1.2 - process alive means not orphan
      const aliveRecord: AgentRecord = {
        agentId: 'agent-004',
        specId: 'test-spec',
        phase: 'requirements',
        pid: process.pid, // Current process PID (alive)
        sessionId: 'session-uuid',
        status: 'running',
        startedAt: '2026-01-28T00:00:00Z',
        lastActivityAt: '2026-01-28T00:05:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
        autoResumeCount: 0,
      };

      await recordService.writeRecord(aliveRecord);

      // Use real checkProcessAlive (will return true for current process)
      await detector.detectOrphans(tempDir);

      expect(mockRecoverAgent).not.toHaveBeenCalled();
    });

    it('should handle multiple orphan agents', async () => {
      // Requirements: 1.1
      const orphan1: AgentRecord = {
        agentId: 'agent-005',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 99996,
        sessionId: 'session-uuid-1',
        status: 'running',
        startedAt: '2026-01-28T00:00:00Z',
        lastActivityAt: '2026-01-28T00:05:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
        autoResumeCount: 0,
      };

      const orphan2: AgentRecord = {
        agentId: 'agent-006',
        specId: 'spec-b',
        phase: 'design',
        pid: 99995,
        sessionId: 'session-uuid-2',
        status: 'running',
        startedAt: '2026-01-28T00:00:00Z',
        lastActivityAt: '2026-01-28T00:05:00Z',
        command: 'claude -p "/kiro:spec-design"',
        autoResumeCount: 0,
      };

      await recordService.writeRecord(orphan1);
      await recordService.writeRecord(orphan2);

      vi.spyOn(recordService, 'checkProcessAlive').mockReturnValue(false);

      await detector.detectOrphans(tempDir);

      // Verify both orphans were processed
      expect(mockRecoverAgent).toHaveBeenCalledTimes(2);
      expect(mockRecoverAgent).toHaveBeenCalledWith(
        expect.objectContaining({ agentId: 'agent-005' })
      );
      expect(mockRecoverAgent).toHaveBeenCalledWith(
        expect.objectContaining({ agentId: 'agent-006' })
      );
    });
  });
});
