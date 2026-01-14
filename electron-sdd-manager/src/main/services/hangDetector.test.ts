/**
 * HangDetector Tests
 * Requirements: 5.3
 * agent-state-file-ssot: Updated to use AgentRecordService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { HangDetector } from './hangDetector';
import { AgentRecordService, AgentRecord } from './agentRecordService';

// Helper to wait for async operations
const flushPromises = () => new Promise(process.nextTick);

describe('HangDetector', () => {
  let testDir: string;
  let recordService: AgentRecordService;
  let detector: HangDetector;

  beforeEach(async () => {
    vi.useFakeTimers();
    testDir = path.join(os.tmpdir(), `hang-detector-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    recordService = new AgentRecordService(testDir);
    detector = new HangDetector(recordService);
  });

  afterEach(async () => {
    detector.stop();
    vi.useRealTimers();
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // Task 25.1: 定期チェックタイマー
  describe('start/stop', () => {
    it('should start hang detection timer', () => {
      const callback = vi.fn();
      detector.onHangDetected(callback);
      detector.start(300000, 60000); // 5 min threshold, 1 min interval

      // Should not trigger yet
      expect(callback).not.toHaveBeenCalled();
    });

    it('should stop hang detection timer', () => {
      const callback = vi.fn();
      detector.onHangDetected(callback);
      detector.start(300000, 60000);
      detector.stop();

      // Advance time beyond interval
      vi.advanceTimersByTime(120000);

      // Should not trigger after stop
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('hang detection', () => {
    it('should detect hanging agents', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Create an agent record with old lastActivityAt
      const hangingRecord: AgentRecord = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-001',
        status: 'running',
        startedAt: new Date(now - 600000).toISOString(), // 10 min ago
        lastActivityAt: new Date(now - 600000).toISOString(), // 10 min ago
        command: 'claude',
      };

      await recordService.writeRecord(hangingRecord);

      const callback = vi.fn();
      detector.onHangDetected(callback);
      detector.start(300000, 60000); // 5 min threshold, 1 min interval

      // Advance time by 1 minute (interval)
      vi.advanceTimersByTime(60000);
      await flushPromises();

      // Should detect the hanging agent
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        agentId: 'agent-001',
      }));
    });

    it('should not detect active agents', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Create an active agent record
      const activeRecord: AgentRecord = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-001',
        status: 'running',
        startedAt: new Date(now - 120000).toISOString(), // 2 min ago
        lastActivityAt: new Date(now - 60000).toISOString(), // 1 min ago
        command: 'claude',
      };

      await recordService.writeRecord(activeRecord);

      const callback = vi.fn();
      detector.onHangDetected(callback);
      detector.start(300000, 60000); // 5 min threshold, 1 min interval

      // Advance time by 1 minute (interval)
      vi.advanceTimersByTime(60000);
      await flushPromises();

      // Should not detect the active agent
      expect(callback).not.toHaveBeenCalled();
    });

    it('should not detect completed agents', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Create a completed agent record with old lastActivityAt
      const completedRecord: AgentRecord = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-001',
        status: 'completed',
        startedAt: new Date(now - 600000).toISOString(), // 10 min ago
        lastActivityAt: new Date(now - 600000).toISOString(), // 10 min ago
        command: 'claude',
      };

      await recordService.writeRecord(completedRecord);

      const callback = vi.fn();
      detector.onHangDetected(callback);
      detector.start(300000, 60000);

      // Advance time by 1 minute (interval)
      vi.advanceTimersByTime(60000);
      await flushPromises();

      // Should not detect completed agents
      expect(callback).not.toHaveBeenCalled();
    });

    it('should update agent status to hang when detected', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const hangingRecord: AgentRecord = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-001',
        status: 'running',
        startedAt: new Date(now - 600000).toISOString(),
        lastActivityAt: new Date(now - 600000).toISOString(),
        command: 'claude',
      };

      await recordService.writeRecord(hangingRecord);

      detector.start(300000, 60000);
      vi.advanceTimersByTime(60000);
      await flushPromises();

      // Check that status was updated in file
      const record = await recordService.readRecord('spec-a', 'agent-001');
      expect(record?.status).toBe('hang');
    });

    it('should only detect each hanging agent once', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const hangingRecord: AgentRecord = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-001',
        status: 'running',
        startedAt: new Date(now - 600000).toISOString(),
        lastActivityAt: new Date(now - 600000).toISOString(),
        command: 'claude',
      };

      await recordService.writeRecord(hangingRecord);

      const callback = vi.fn();
      detector.onHangDetected(callback);
      detector.start(300000, 60000);

      // Advance by multiple intervals
      vi.advanceTimersByTime(60000);
      await flushPromises();
      vi.advanceTimersByTime(60000);
      await flushPromises();
      vi.advanceTimersByTime(60000);
      await flushPromises();

      // Should only be called once (status changes to 'hang' after first detection)
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('setThreshold', () => {
    it('should update threshold', async () => {
      detector.setThreshold(600000); // 10 minutes

      const now = Date.now();
      vi.setSystemTime(now);

      // Agent hanging for 7 minutes (below new threshold)
      const record: AgentRecord = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-001',
        status: 'running',
        startedAt: new Date(now - 420000).toISOString(), // 7 min ago
        lastActivityAt: new Date(now - 420000).toISOString(), // 7 min ago
        command: 'claude',
      };

      await recordService.writeRecord(record);

      const callback = vi.fn();
      detector.onHangDetected(callback);
      detector.start(600000, 60000);

      vi.advanceTimersByTime(60000);
      await flushPromises();

      // Should not detect (7 min < 10 min threshold)
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
