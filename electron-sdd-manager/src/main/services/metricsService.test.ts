/**
 * MetricsService Tests
 * TDD tests for Task 2.1: Metrics service core implementation
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.12, 3.1, 3.2, 3.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { MetricsService } from './metricsService';
import type { HumanSessionData } from '../types/metrics';

describe('MetricsService', () => {
  let tempDir: string;
  let service: MetricsService;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'metrics-service-test-'));
    service = new MetricsService();
    // Initialize project path for the service
    service.setProjectPath(tempDir);
    // Mock timers
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T10:00:00.000Z'));
  });

  afterEach(async () => {
    vi.useRealTimers();
    await rm(tempDir, { recursive: true, force: true });
  });

  // ==========================================================================
  // File-based AI Metrics (metrics-file-based-tracking)
  // Requirements: 3.2, 3.3
  // ==========================================================================
  describe('recordAiSessionFromFile (metrics-file-based-tracking)', () => {
    it('should record AI metric from provided timestamps', async () => {
      const start = '2025-01-15T10:00:00.000Z';
      const end = '2025-01-15T10:05:30.000Z';
      
      await service.recordAiSessionFromFile('test-spec', 'requirements', start, end);

      // Check file was written
      const content = await readFile(join(tempDir, '.kiro', 'metrics.jsonl'), 'utf-8');
      const record = JSON.parse(content.trim());

      expect(record.type).toBe('ai');
      expect(record.spec).toBe('test-spec');
      expect(record.phase).toBe('requirements');
      expect(record.start).toBe(start);
      expect(record.end).toBe(end);
      expect(record.ms).toBe(330000); // 5 min 30 sec = 330000ms
    });

    it('should do nothing when project path is not set', async () => {
      const serviceWithoutPath = new MetricsService();
      await serviceWithoutPath.recordAiSessionFromFile(
        'test-spec', 
        'requirements', 
        '2025-01-15T10:00:00.000Z', 
        '2025-01-15T10:01:00.000Z'
      );
      
      // Should not throw and no file should be created
      const filePath = join(tempDir, '.kiro', 'metrics.jsonl');
      await expect(readFile(filePath, 'utf-8')).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Requirement 2.12: Record human session (IPC handler)
  // ==========================================================================
  describe('recordHumanSession (Requirement 2.12)', () => {
    it('should record human session data', async () => {
      const session: HumanSessionData = {
        specId: 'test-spec',
        start: '2025-01-15T10:05:30.000Z',
        end: '2025-01-15T10:08:15.000Z',
        ms: 165000,
      };

      await service.recordHumanSession(session);

      const content = await readFile(join(tempDir, '.kiro', 'metrics.jsonl'), 'utf-8');
      const record = JSON.parse(content.trim());

      expect(record.type).toBe('human');
      expect(record.spec).toBe('test-spec');
      expect(record.start).toBe('2025-01-15T10:05:30.000Z');
      expect(record.end).toBe('2025-01-15T10:08:15.000Z');
      expect(record.ms).toBe(165000);
    });
  });

  // ==========================================================================
  // Requirement 3.1: Spec lifecycle start
  // ==========================================================================
  describe('startSpecLifecycle (Requirement 3.1)', () => {
    it('should record spec lifecycle start event', async () => {
      await service.startSpecLifecycle('test-spec');

      const content = await readFile(join(tempDir, '.kiro', 'metrics.jsonl'), 'utf-8');
      const record = JSON.parse(content.trim());

      expect(record.type).toBe('lifecycle');
      expect(record.spec).toBe('test-spec');
      expect(record.event).toBe('start');
      expect(record.timestamp).toBe('2025-01-15T10:00:00.000Z');
      expect(record.totalMs).toBeUndefined();
    });

    it('should store lifecycle start for later total calculation', () => {
      service.startSpecLifecycle('test-spec');

      const lifecycle = service.getActiveLifecycle('test-spec');
      expect(lifecycle).toBeDefined();
      expect(lifecycle?.specId).toBe('test-spec');
      expect(lifecycle?.startTimestamp).toBe('2025-01-15T10:00:00.000Z');
    });
  });

  // ==========================================================================
  // Requirement 3.2: Spec lifecycle complete
  // ==========================================================================
  describe('completeSpecLifecycle (Requirement 3.2)', () => {
    it('should record spec lifecycle complete with totalMs', async () => {
      await service.startSpecLifecycle('test-spec');

      // Advance time by 4 hours 35 minutes
      vi.advanceTimersByTime(4 * 60 * 60 * 1000 + 35 * 60 * 1000);

      await service.completeSpecLifecycle('test-spec');

      const content = await readFile(join(tempDir, '.kiro', 'metrics.jsonl'), 'utf-8');
      const lines = content.split('\n').filter((l) => l.trim());
      expect(lines).toHaveLength(2);

      const completeRecord = JSON.parse(lines[1]);
      expect(completeRecord.type).toBe('lifecycle');
      expect(completeRecord.event).toBe('complete');
      expect(completeRecord.timestamp).toBe('2025-01-15T14:35:00.000Z');
      expect(completeRecord.totalMs).toBe(16500000); // 4h 35m in ms
    });

    it('should do nothing when lifecycle was not started', async () => {
      // Should not throw
      await service.completeSpecLifecycle('non-existent');
    });

    it('should clear active lifecycle after completion', async () => {
      await service.startSpecLifecycle('test-spec');
      vi.advanceTimersByTime(1000);
      await service.completeSpecLifecycle('test-spec');

      expect(service.getActiveLifecycle('test-spec')).toBeUndefined();
    });
  });

  // ==========================================================================
  // Requirement 3.3: Save lifecycle to metrics.jsonl
  // ==========================================================================
  describe('lifecycle persistence (Requirement 3.3)', () => {
    it('should persist both start and complete events', async () => {
      await service.startSpecLifecycle('test-spec');
      vi.advanceTimersByTime(60000);
      await service.completeSpecLifecycle('test-spec');

      const content = await readFile(join(tempDir, '.kiro', 'metrics.jsonl'), 'utf-8');
      const lines = content.split('\n').filter((l) => l.trim());

      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0]).event).toBe('start');
      expect(JSON.parse(lines[1]).event).toBe('complete');
    });
  });

  // ==========================================================================
  // getMetricsForSpec: Aggregate metrics for a spec
  // ==========================================================================
  describe('getMetricsForSpec', () => {
    it('should aggregate AI and human time for a spec', async () => {
      // Write some test data
      await mkdir(join(tempDir, '.kiro'), { recursive: true });
      const records = [
        JSON.stringify({
          type: 'ai',
          spec: 'test-spec',
          phase: 'requirements',
          start: '2025-01-15T10:00:00.000Z',
          end: '2025-01-15T10:05:00.000Z',
          ms: 300000,
        }),
        JSON.stringify({
          type: 'ai',
          spec: 'test-spec',
          phase: 'design',
          start: '2025-01-15T10:10:00.000Z',
          end: '2025-01-15T10:15:00.000Z',
          ms: 300000,
        }),
        JSON.stringify({
          type: 'human',
          spec: 'test-spec',
          start: '2025-01-15T10:05:00.000Z',
          end: '2025-01-15T10:08:00.000Z',
          ms: 180000,
        }),
        JSON.stringify({
          type: 'lifecycle',
          spec: 'test-spec',
          event: 'start',
          timestamp: '2025-01-15T09:55:00.000Z',
        }),
      ].join('\n') + '\n';

      await import('fs/promises').then((fs) =>
        fs.writeFile(join(tempDir, '.kiro', 'metrics.jsonl'), records)
      );

      const metrics = await service.getMetricsForSpec('test-spec');

      expect(metrics.specId).toBe('test-spec');
      expect(metrics.totalAiTimeMs).toBe(600000); // 300k + 300k
      expect(metrics.totalHumanTimeMs).toBe(180000);
      expect(metrics.status).toBe('in-progress'); // No complete event
    });

    it('should return completed status when lifecycle complete exists', async () => {
      await mkdir(join(tempDir, '.kiro'), { recursive: true });
      const records = [
        JSON.stringify({
          type: 'lifecycle',
          spec: 'test-spec',
          event: 'start',
          timestamp: '2025-01-15T09:55:00.000Z',
        }),
        JSON.stringify({
          type: 'lifecycle',
          spec: 'test-spec',
          event: 'complete',
          timestamp: '2025-01-15T14:30:00.000Z',
          totalMs: 16500000,
        }),
      ].join('\n') + '\n';

      await import('fs/promises').then((fs) =>
        fs.writeFile(join(tempDir, '.kiro', 'metrics.jsonl'), records)
      );

      const metrics = await service.getMetricsForSpec('test-spec');

      expect(metrics.status).toBe('completed');
      expect(metrics.totalElapsedMs).toBe(16500000);
    });

    it('should return zero times for spec with no records', async () => {
      const metrics = await service.getMetricsForSpec('non-existent');

      expect(metrics.totalAiTimeMs).toBe(0);
      expect(metrics.totalHumanTimeMs).toBe(0);
      expect(metrics.totalElapsedMs).toBeNull();
      expect(metrics.status).toBe('in-progress');
    });

    it('should calculate phase metrics', async () => {
      await mkdir(join(tempDir, '.kiro'), { recursive: true });
      const records = [
        JSON.stringify({
          type: 'ai',
          spec: 'test-spec',
          phase: 'requirements',
          start: '2025-01-15T10:00:00.000Z',
          end: '2025-01-15T10:05:00.000Z',
          ms: 300000,
        }),
        JSON.stringify({
          type: 'ai',
          spec: 'test-spec',
          phase: 'design',
          start: '2025-01-15T10:10:00.000Z',
          end: '2025-01-15T10:20:00.000Z',
          ms: 600000,
        }),
      ].join('\n') + '\n';

      await import('fs/promises').then((fs) =>
        fs.writeFile(join(tempDir, '.kiro', 'metrics.jsonl'), records)
      );

      const metrics = await service.getMetricsForSpec('test-spec');

      expect(metrics.phaseMetrics.requirements.aiTimeMs).toBe(300000);
      expect(metrics.phaseMetrics.design.aiTimeMs).toBe(600000);
      expect(metrics.phaseMetrics.tasks.aiTimeMs).toBe(0);
      expect(metrics.phaseMetrics.impl.aiTimeMs).toBe(0);
    });
  });

  // ==========================================================================
  // Task 8.1: Project metrics aggregation (Requirements 8.1, 8.2, 8.3)
  // ==========================================================================
  describe('getProjectMetrics (Task 8.1)', () => {
    it('should aggregate total AI time across all specs (Requirement 8.1)', async () => {
      await mkdir(join(tempDir, '.kiro'), { recursive: true });
      const records = [
        JSON.stringify({
          type: 'ai',
          spec: 'spec-1',
          phase: 'requirements',
          start: '2025-01-15T10:00:00.000Z',
          end: '2025-01-15T10:05:00.000Z',
          ms: 300000, // 5 minutes
        }),
        JSON.stringify({
          type: 'ai',
          spec: 'spec-2',
          phase: 'design',
          start: '2025-01-15T11:00:00.000Z',
          end: '2025-01-15T11:10:00.000Z',
          ms: 600000, // 10 minutes
        }),
        JSON.stringify({
          type: 'ai',
          spec: 'spec-1',
          phase: 'design',
          start: '2025-01-15T10:10:00.000Z',
          end: '2025-01-15T10:15:00.000Z',
          ms: 300000, // 5 minutes
        }),
      ].join('\n') + '\n';

      await import('fs/promises').then((fs) =>
        fs.writeFile(join(tempDir, '.kiro', 'metrics.jsonl'), records)
      );

      const projectMetrics = await service.getProjectMetrics();

      expect(projectMetrics.totalAiTimeMs).toBe(1200000); // 300k + 600k + 300k = 20 minutes
    });

    it('should aggregate total human time across all specs (Requirement 8.2)', async () => {
      await mkdir(join(tempDir, '.kiro'), { recursive: true });
      const records = [
        JSON.stringify({
          type: 'human',
          spec: 'spec-1',
          start: '2025-01-15T10:05:00.000Z',
          end: '2025-01-15T10:08:00.000Z',
          ms: 180000, // 3 minutes
        }),
        JSON.stringify({
          type: 'human',
          spec: 'spec-2',
          start: '2025-01-15T11:10:00.000Z',
          end: '2025-01-15T11:15:00.000Z',
          ms: 300000, // 5 minutes
        }),
      ].join('\n') + '\n';

      await import('fs/promises').then((fs) =>
        fs.writeFile(join(tempDir, '.kiro', 'metrics.jsonl'), records)
      );

      const projectMetrics = await service.getProjectMetrics();

      expect(projectMetrics.totalHumanTimeMs).toBe(480000); // 180k + 300k = 8 minutes
    });

    it('should count completed and in-progress specs (Requirement 8.3)', async () => {
      await mkdir(join(tempDir, '.kiro'), { recursive: true });
      const records = [
        // spec-1: completed
        JSON.stringify({
          type: 'lifecycle',
          spec: 'spec-1',
          event: 'start',
          timestamp: '2025-01-15T09:00:00.000Z',
        }),
        JSON.stringify({
          type: 'lifecycle',
          spec: 'spec-1',
          event: 'complete',
          timestamp: '2025-01-15T14:00:00.000Z',
          totalMs: 18000000,
        }),
        // spec-2: in-progress (started but not completed)
        JSON.stringify({
          type: 'lifecycle',
          spec: 'spec-2',
          event: 'start',
          timestamp: '2025-01-15T15:00:00.000Z',
        }),
        // spec-3: in-progress (has AI time but no lifecycle events)
        JSON.stringify({
          type: 'ai',
          spec: 'spec-3',
          phase: 'requirements',
          start: '2025-01-15T16:00:00.000Z',
          end: '2025-01-15T16:05:00.000Z',
          ms: 300000,
        }),
      ].join('\n') + '\n';

      await import('fs/promises').then((fs) =>
        fs.writeFile(join(tempDir, '.kiro', 'metrics.jsonl'), records)
      );

      const projectMetrics = await service.getProjectMetrics();

      expect(projectMetrics.completedSpecCount).toBe(1); // spec-1 is completed
      expect(projectMetrics.inProgressSpecCount).toBe(2); // spec-2 and spec-3 are in-progress
    });

    it('should return zeros when no metrics exist', async () => {
      const projectMetrics = await service.getProjectMetrics();

      expect(projectMetrics.totalAiTimeMs).toBe(0);
      expect(projectMetrics.totalHumanTimeMs).toBe(0);
      expect(projectMetrics.completedSpecCount).toBe(0);
      expect(projectMetrics.inProgressSpecCount).toBe(0);
    });

    it('should return zeros when no project path is set', async () => {
      const serviceWithoutPath = new MetricsService();

      const projectMetrics = await serviceWithoutPath.getProjectMetrics();

      expect(projectMetrics.totalAiTimeMs).toBe(0);
      expect(projectMetrics.totalHumanTimeMs).toBe(0);
      expect(projectMetrics.completedSpecCount).toBe(0);
      expect(projectMetrics.inProgressSpecCount).toBe(0);
    });

    it('should aggregate metrics from multiple record types', async () => {
      await mkdir(join(tempDir, '.kiro'), { recursive: true });
      const records = [
        // AI records
        JSON.stringify({
          type: 'ai',
          spec: 'spec-1',
          phase: 'requirements',
          start: '2025-01-15T10:00:00.000Z',
          end: '2025-01-15T10:05:00.000Z',
          ms: 300000,
        }),
        // Human records
        JSON.stringify({
          type: 'human',
          spec: 'spec-1',
          start: '2025-01-15T10:05:00.000Z',
          end: '2025-01-15T10:10:00.000Z',
          ms: 300000,
        }),
        // Lifecycle records
        JSON.stringify({
          type: 'lifecycle',
          spec: 'spec-1',
          event: 'start',
          timestamp: '2025-01-15T09:00:00.000Z',
        }),
        JSON.stringify({
          type: 'lifecycle',
          spec: 'spec-1',
          event: 'complete',
          timestamp: '2025-01-15T14:00:00.000Z',
          totalMs: 18000000,
        }),
      ].join('\n') + '\n';

      await import('fs/promises').then((fs) =>
        fs.writeFile(join(tempDir, '.kiro', 'metrics.jsonl'), records)
      );

      const projectMetrics = await service.getProjectMetrics();

      expect(projectMetrics.totalAiTimeMs).toBe(300000);
      expect(projectMetrics.totalHumanTimeMs).toBe(300000);
      expect(projectMetrics.completedSpecCount).toBe(1);
      expect(projectMetrics.inProgressSpecCount).toBe(0);
    });
  });
});