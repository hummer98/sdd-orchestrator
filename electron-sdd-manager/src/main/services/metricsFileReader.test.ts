/**
 * MetricsFileReader Tests
 * TDD tests for Task 1.3: Metrics file reading service
 * Requirements: 7.4
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { MetricsFileReader } from './metricsFileReader';
import type { AiMetricRecord, HumanMetricRecord, LifecycleMetricRecord } from '../types/metrics';

describe('MetricsFileReader', () => {
  let tempDir: string;
  let reader: MetricsFileReader;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'metrics-reader-test-'));
    reader = new MetricsFileReader();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // ==========================================================================
  // Requirement 7.4: Read and parse JSONL with error recovery
  // ==========================================================================
  describe('readAllRecords (Requirement 7.4)', () => {
    it('should return empty array when file does not exist', async () => {
      const records = await reader.readAllRecords(tempDir);
      expect(records).toEqual([]);
    });

    it('should read all valid records from file', async () => {
      await mkdir(join(tempDir, '.kiro'), { recursive: true });

      const records: string[] = [
        JSON.stringify({
          type: 'ai',
          spec: 'spec-1',
          phase: 'requirements',
          start: '2025-01-15T10:00:00.000Z',
          end: '2025-01-15T10:05:30.000Z',
          ms: 330000,
        }),
        JSON.stringify({
          type: 'human',
          spec: 'spec-1',
          start: '2025-01-15T10:05:30.000Z',
          end: '2025-01-15T10:08:15.000Z',
          ms: 165000,
        }),
        JSON.stringify({
          type: 'lifecycle',
          spec: 'spec-1',
          event: 'start',
          timestamp: '2025-01-15T09:55:00.000Z',
        }),
      ];

      await writeFile(
        join(tempDir, '.kiro', 'metrics.jsonl'),
        records.join('\n') + '\n',
        'utf-8'
      );

      const result = await reader.readAllRecords(tempDir);
      expect(result).toHaveLength(3);
      expect(result[0].type).toBe('ai');
      expect(result[1].type).toBe('human');
      expect(result[2].type).toBe('lifecycle');
    });

    it('should skip invalid JSON lines and continue parsing', async () => {
      await mkdir(join(tempDir, '.kiro'), { recursive: true });

      const content = [
        JSON.stringify({
          type: 'ai',
          spec: 'spec-1',
          phase: 'requirements',
          start: '2025-01-15T10:00:00.000Z',
          end: '2025-01-15T10:05:30.000Z',
          ms: 330000,
        }),
        'invalid json {{{',  // Invalid JSON
        JSON.stringify({
          type: 'human',
          spec: 'spec-1',
          start: '2025-01-15T10:05:30.000Z',
          end: '2025-01-15T10:08:15.000Z',
          ms: 165000,
        }),
      ].join('\n') + '\n';

      await writeFile(
        join(tempDir, '.kiro', 'metrics.jsonl'),
        content,
        'utf-8'
      );

      const result = await reader.readAllRecords(tempDir);
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('ai');
      expect(result[1].type).toBe('human');
    });

    it('should skip records that fail schema validation', async () => {
      await mkdir(join(tempDir, '.kiro'), { recursive: true });

      const content = [
        JSON.stringify({
          type: 'ai',
          spec: 'spec-1',
          phase: 'requirements',
          start: '2025-01-15T10:00:00.000Z',
          end: '2025-01-15T10:05:30.000Z',
          ms: 330000,
        }),
        JSON.stringify({
          type: 'unknown_type',  // Invalid type
          spec: 'spec-1',
        }),
        JSON.stringify({
          type: 'ai',
          spec: 'spec-1',
          phase: 'requirements',
          start: '2025-01-15T10:00:00.000Z',
          end: '2025-01-15T10:05:30.000Z',
          ms: -100,  // Invalid negative ms
        }),
      ].join('\n') + '\n';

      await writeFile(
        join(tempDir, '.kiro', 'metrics.jsonl'),
        content,
        'utf-8'
      );

      const result = await reader.readAllRecords(tempDir);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('ai');
    });

    it('should handle empty file', async () => {
      await mkdir(join(tempDir, '.kiro'), { recursive: true });
      await writeFile(join(tempDir, '.kiro', 'metrics.jsonl'), '', 'utf-8');

      const result = await reader.readAllRecords(tempDir);
      expect(result).toEqual([]);
    });

    it('should handle file with only empty lines', async () => {
      await mkdir(join(tempDir, '.kiro'), { recursive: true });
      await writeFile(join(tempDir, '.kiro', 'metrics.jsonl'), '\n\n\n', 'utf-8');

      const result = await reader.readAllRecords(tempDir);
      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // readRecordsForSpec: Filter by spec ID
  // ==========================================================================
  describe('readRecordsForSpec', () => {
    it('should return only records for specified spec', async () => {
      await mkdir(join(tempDir, '.kiro'), { recursive: true });

      const content = [
        JSON.stringify({
          type: 'ai',
          spec: 'spec-1',
          phase: 'requirements',
          start: '2025-01-15T10:00:00.000Z',
          end: '2025-01-15T10:05:30.000Z',
          ms: 330000,
        }),
        JSON.stringify({
          type: 'ai',
          spec: 'spec-2',
          phase: 'design',
          start: '2025-01-15T11:00:00.000Z',
          end: '2025-01-15T11:10:00.000Z',
          ms: 600000,
        }),
        JSON.stringify({
          type: 'human',
          spec: 'spec-1',
          start: '2025-01-15T10:05:30.000Z',
          end: '2025-01-15T10:08:15.000Z',
          ms: 165000,
        }),
      ].join('\n') + '\n';

      await writeFile(
        join(tempDir, '.kiro', 'metrics.jsonl'),
        content,
        'utf-8'
      );

      const result = await reader.readRecordsForSpec(tempDir, 'spec-1');
      expect(result).toHaveLength(2);
      expect(result.every((r) => r.spec === 'spec-1')).toBe(true);
    });

    it('should return empty array when no records match spec', async () => {
      await mkdir(join(tempDir, '.kiro'), { recursive: true });

      const content = [
        JSON.stringify({
          type: 'ai',
          spec: 'spec-1',
          phase: 'requirements',
          start: '2025-01-15T10:00:00.000Z',
          end: '2025-01-15T10:05:30.000Z',
          ms: 330000,
        }),
      ].join('\n') + '\n';

      await writeFile(
        join(tempDir, '.kiro', 'metrics.jsonl'),
        content,
        'utf-8'
      );

      const result = await reader.readRecordsForSpec(tempDir, 'non-existent-spec');
      expect(result).toEqual([]);
    });

    it('should return empty array when file does not exist', async () => {
      const result = await reader.readRecordsForSpec(tempDir, 'spec-1');
      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // Type-safe record retrieval
  // ==========================================================================
  describe('type-safe record retrieval', () => {
    it('should correctly type AI records', async () => {
      await mkdir(join(tempDir, '.kiro'), { recursive: true });

      const aiRecord: AiMetricRecord = {
        type: 'ai',
        spec: 'test-spec',
        phase: 'design',
        start: '2025-01-15T10:00:00.000Z',
        end: '2025-01-15T10:05:30.000Z',
        ms: 330000,
      };

      await writeFile(
        join(tempDir, '.kiro', 'metrics.jsonl'),
        JSON.stringify(aiRecord) + '\n',
        'utf-8'
      );

      const records = await reader.readAllRecords(tempDir);
      expect(records).toHaveLength(1);

      const record = records[0];
      if (record.type === 'ai') {
        // TypeScript should know this is AiMetricRecord
        expect(record.phase).toBe('design');
        expect(record.ms).toBe(330000);
      } else {
        throw new Error('Expected AI record');
      }
    });

    it('should correctly type lifecycle records with optional totalMs', async () => {
      await mkdir(join(tempDir, '.kiro'), { recursive: true });

      const lifecycleComplete: LifecycleMetricRecord = {
        type: 'lifecycle',
        spec: 'test-spec',
        event: 'complete',
        timestamp: '2025-01-15T14:30:00.000Z',
        totalMs: 16500000,
      };

      await writeFile(
        join(tempDir, '.kiro', 'metrics.jsonl'),
        JSON.stringify(lifecycleComplete) + '\n',
        'utf-8'
      );

      const records = await reader.readAllRecords(tempDir);
      expect(records).toHaveLength(1);

      const record = records[0];
      if (record.type === 'lifecycle') {
        expect(record.event).toBe('complete');
        expect(record.totalMs).toBe(16500000);
      } else {
        throw new Error('Expected lifecycle record');
      }
    });
  });
});
