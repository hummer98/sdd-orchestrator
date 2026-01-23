/**
 * MetricsFileWriter Tests
 * TDD tests for Task 1.2: Metrics file writing service
 * Requirements: 4.1, 4.2
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, mkdir, access } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { MetricsFileWriter } from './metricsFileWriter';
import type { AiMetricRecord, HumanMetricRecord, LifecycleMetricRecord } from '../types/metrics';

describe('MetricsFileWriter', () => {
  let tempDir: string;
  let writer: MetricsFileWriter;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'metrics-test-'));
    writer = new MetricsFileWriter();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // ==========================================================================
  // Requirement 4.1: .kiro/metrics.jsonl as SSOT
  // ==========================================================================
  describe('file path (Requirement 4.1)', () => {
    it('should write to .kiro/metrics.jsonl', async () => {
      const record: AiMetricRecord = {
        type: 'ai',
        spec: 'test-spec',
        phase: 'requirements',
        start: '2025-01-15T10:00:00.000Z',
        end: '2025-01-15T10:05:30.000Z',
        ms: 330000,
      };

      await writer.appendRecord(tempDir, record);

      const expectedPath = join(tempDir, '.kiro', 'metrics.jsonl');
      await expect(access(expectedPath)).resolves.toBeUndefined();
    });

    it('should create .kiro directory if it does not exist', async () => {
      const record: AiMetricRecord = {
        type: 'ai',
        spec: 'test-spec',
        phase: 'requirements',
        start: '2025-01-15T10:00:00.000Z',
        end: '2025-01-15T10:05:30.000Z',
        ms: 330000,
      };

      await writer.appendRecord(tempDir, record);

      const kiroPath = join(tempDir, '.kiro');
      await expect(access(kiroPath)).resolves.toBeUndefined();
    });
  });

  // ==========================================================================
  // Requirement 4.2: Append 1 record per line in JSONL format
  // ==========================================================================
  describe('JSONL format (Requirement 4.2)', () => {
    it('should write record as single line JSON', async () => {
      const record: AiMetricRecord = {
        type: 'ai',
        spec: 'test-spec',
        phase: 'requirements',
        start: '2025-01-15T10:00:00.000Z',
        end: '2025-01-15T10:05:30.000Z',
        ms: 330000,
      };

      await writer.appendRecord(tempDir, record);

      const content = await readFile(join(tempDir, '.kiro', 'metrics.jsonl'), 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());
      expect(lines).toHaveLength(1);

      // Verify it's valid JSON
      const parsed = JSON.parse(lines[0]);
      expect(parsed).toEqual(record);
    });

    it('should append multiple records on separate lines', async () => {
      const record1: AiMetricRecord = {
        type: 'ai',
        spec: 'test-spec',
        phase: 'requirements',
        start: '2025-01-15T10:00:00.000Z',
        end: '2025-01-15T10:05:30.000Z',
        ms: 330000,
      };

      const record2: HumanMetricRecord = {
        type: 'human',
        spec: 'test-spec',
        start: '2025-01-15T10:05:30.000Z',
        end: '2025-01-15T10:08:15.000Z',
        ms: 165000,
      };

      await writer.appendRecord(tempDir, record1);
      await writer.appendRecord(tempDir, record2);

      const content = await readFile(join(tempDir, '.kiro', 'metrics.jsonl'), 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());
      expect(lines).toHaveLength(2);

      expect(JSON.parse(lines[0])).toEqual(record1);
      expect(JSON.parse(lines[1])).toEqual(record2);
    });

    it('should handle all metric record types', async () => {
      const aiRecord: AiMetricRecord = {
        type: 'ai',
        spec: 'test-spec',
        phase: 'design',
        start: '2025-01-15T10:00:00.000Z',
        end: '2025-01-15T10:05:30.000Z',
        ms: 330000,
      };

      const humanRecord: HumanMetricRecord = {
        type: 'human',
        spec: 'test-spec',
        start: '2025-01-15T10:05:30.000Z',
        end: '2025-01-15T10:08:15.000Z',
        ms: 165000,
      };

      const lifecycleRecord: LifecycleMetricRecord = {
        type: 'lifecycle',
        spec: 'test-spec',
        event: 'start',
        timestamp: '2025-01-15T09:55:00.000Z',
      };

      await writer.appendRecord(tempDir, aiRecord);
      await writer.appendRecord(tempDir, humanRecord);
      await writer.appendRecord(tempDir, lifecycleRecord);

      const content = await readFile(join(tempDir, '.kiro', 'metrics.jsonl'), 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());
      expect(lines).toHaveLength(3);

      expect(JSON.parse(lines[0]).type).toBe('ai');
      expect(JSON.parse(lines[1]).type).toBe('human');
      expect(JSON.parse(lines[2]).type).toBe('lifecycle');
    });
  });

  // ==========================================================================
  // Validation with Zod
  // ==========================================================================
  describe('record validation', () => {
    it('should reject invalid record type', async () => {
      const invalidRecord = {
        type: 'invalid',
        spec: 'test-spec',
      };

      await expect(writer.appendRecord(tempDir, invalidRecord as any)).rejects.toThrow();
    });

    it('should reject record with missing required fields', async () => {
      const invalidRecord = {
        type: 'ai',
        spec: 'test-spec',
        // missing phase, start, end, ms
      };

      await expect(writer.appendRecord(tempDir, invalidRecord as any)).rejects.toThrow();
    });

    it('should reject record with negative ms', async () => {
      const invalidRecord: AiMetricRecord = {
        type: 'ai',
        spec: 'test-spec',
        phase: 'requirements',
        start: '2025-01-15T10:00:00.000Z',
        end: '2025-01-15T10:05:30.000Z',
        ms: -100,
      };

      await expect(writer.appendRecord(tempDir, invalidRecord)).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Edge cases
  // ==========================================================================
  describe('edge cases', () => {
    it('should append to existing file', async () => {
      // Create directory and pre-existing file
      await mkdir(join(tempDir, '.kiro'), { recursive: true });
      const existingRecord: AiMetricRecord = {
        type: 'ai',
        spec: 'existing-spec',
        phase: 'requirements',
        start: '2025-01-14T10:00:00.000Z',
        end: '2025-01-14T10:05:30.000Z',
        ms: 100000,
      };
      const existingContent = JSON.stringify(existingRecord) + '\n';
      const filePath = join(tempDir, '.kiro', 'metrics.jsonl');
      await import('fs/promises').then((fs) => fs.writeFile(filePath, existingContent));

      // Append new record
      const newRecord: HumanMetricRecord = {
        type: 'human',
        spec: 'new-spec',
        start: '2025-01-15T10:05:30.000Z',
        end: '2025-01-15T10:08:15.000Z',
        ms: 165000,
      };

      await writer.appendRecord(tempDir, newRecord);

      const content = await readFile(filePath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());
      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0]).spec).toBe('existing-spec');
      expect(JSON.parse(lines[1]).spec).toBe('new-spec');
    });

    it('should handle lifecycle complete with totalMs', async () => {
      const record: LifecycleMetricRecord = {
        type: 'lifecycle',
        spec: 'test-spec',
        event: 'complete',
        timestamp: '2025-01-15T14:30:00.000Z',
        totalMs: 16500000,
      };

      await writer.appendRecord(tempDir, record);

      const content = await readFile(join(tempDir, '.kiro', 'metrics.jsonl'), 'utf-8');
      const parsed = JSON.parse(content.trim());
      expect(parsed.totalMs).toBe(16500000);
    });
  });
});
