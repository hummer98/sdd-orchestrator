/**
 * Metrics Types Tests
 * TDD tests for Task 1.1: Metrics record schema and types
 * Requirements: 4.3, 4.4, 4.5, 4.6
 */

import { describe, it, expect } from 'vitest';
import {
  AiMetricRecordSchema,
  HumanMetricRecordSchema,
  LifecycleMetricRecordSchema,
  MetricRecordSchema,
  type AiMetricRecord,
  type HumanMetricRecord,
  type LifecycleMetricRecord,
  type MetricRecord,
  type WorkflowPhase,
} from './metrics';

describe('Metrics Types', () => {
  // ==========================================================================
  // Requirement 4.3: AI metric record format
  // ==========================================================================
  describe('AiMetricRecord', () => {
    it('should validate a valid AI metric record', () => {
      const record: AiMetricRecord = {
        type: 'ai',
        spec: 'my-feature',
        phase: 'requirements',
        start: '2025-01-15T10:00:00.000Z',
        end: '2025-01-15T10:05:30.000Z',
        ms: 330000,
      };

      const result = AiMetricRecordSchema.safeParse(record);
      expect(result.success).toBe(true);
    });

    it('should validate all workflow phases', () => {
      const phases: WorkflowPhase[] = ['requirements', 'design', 'tasks', 'impl'];

      for (const phase of phases) {
        const record: AiMetricRecord = {
          type: 'ai',
          spec: 'test-spec',
          phase,
          start: '2025-01-15T10:00:00.000Z',
          end: '2025-01-15T10:05:30.000Z',
          ms: 330000,
        };

        const result = AiMetricRecordSchema.safeParse(record);
        expect(result.success, `Phase ${phase} should be valid`).toBe(true);
      }
    });

    it('should reject invalid type', () => {
      const record = {
        type: 'invalid',
        spec: 'my-feature',
        phase: 'requirements',
        start: '2025-01-15T10:00:00.000Z',
        end: '2025-01-15T10:05:30.000Z',
        ms: 330000,
      };

      const result = AiMetricRecordSchema.safeParse(record);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const record = {
        type: 'ai',
        spec: 'my-feature',
        // missing phase, start, end, ms
      };

      const result = AiMetricRecordSchema.safeParse(record);
      expect(result.success).toBe(false);
    });

    it('should reject negative ms value', () => {
      const record = {
        type: 'ai',
        spec: 'my-feature',
        phase: 'requirements',
        start: '2025-01-15T10:00:00.000Z',
        end: '2025-01-15T10:05:30.000Z',
        ms: -100,
      };

      const result = AiMetricRecordSchema.safeParse(record);
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Requirement 4.4: Human metric record format
  // ==========================================================================
  describe('HumanMetricRecord', () => {
    it('should validate a valid human metric record', () => {
      const record: HumanMetricRecord = {
        type: 'human',
        spec: 'my-feature',
        start: '2025-01-15T10:05:30.000Z',
        end: '2025-01-15T10:08:15.000Z',
        ms: 165000,
      };

      const result = HumanMetricRecordSchema.safeParse(record);
      expect(result.success).toBe(true);
    });

    it('should reject invalid type', () => {
      const record = {
        type: 'ai',
        spec: 'my-feature',
        start: '2025-01-15T10:05:30.000Z',
        end: '2025-01-15T10:08:15.000Z',
        ms: 165000,
      };

      const result = HumanMetricRecordSchema.safeParse(record);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const record = {
        type: 'human',
        spec: 'my-feature',
        // missing start, end, ms
      };

      const result = HumanMetricRecordSchema.safeParse(record);
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Requirement 4.5: Lifecycle metric record with ISO8601 timestamps
  // ==========================================================================
  describe('LifecycleMetricRecord', () => {
    it('should validate a lifecycle start event', () => {
      const record: LifecycleMetricRecord = {
        type: 'lifecycle',
        spec: 'my-feature',
        event: 'start',
        timestamp: '2025-01-15T09:55:00.000Z',
      };

      const result = LifecycleMetricRecordSchema.safeParse(record);
      expect(result.success).toBe(true);
    });

    it('should validate a lifecycle complete event with totalMs', () => {
      const record: LifecycleMetricRecord = {
        type: 'lifecycle',
        spec: 'my-feature',
        event: 'complete',
        timestamp: '2025-01-15T14:30:00.000Z',
        totalMs: 16500000,
      };

      const result = LifecycleMetricRecordSchema.safeParse(record);
      expect(result.success).toBe(true);
    });

    it('should allow start event without totalMs', () => {
      const record = {
        type: 'lifecycle',
        spec: 'my-feature',
        event: 'start',
        timestamp: '2025-01-15T09:55:00.000Z',
      };

      const result = LifecycleMetricRecordSchema.safeParse(record);
      expect(result.success).toBe(true);
    });

    it('should reject invalid event type', () => {
      const record = {
        type: 'lifecycle',
        spec: 'my-feature',
        event: 'invalid',
        timestamp: '2025-01-15T09:55:00.000Z',
      };

      const result = LifecycleMetricRecordSchema.safeParse(record);
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Requirement 4.6: MetricRecord union type (ms in milliseconds)
  // ==========================================================================
  describe('MetricRecord (Union)', () => {
    it('should parse AI metric record', () => {
      const record = {
        type: 'ai',
        spec: 'my-feature',
        phase: 'requirements',
        start: '2025-01-15T10:00:00.000Z',
        end: '2025-01-15T10:05:30.000Z',
        ms: 330000,
      };

      const result = MetricRecordSchema.safeParse(record);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('ai');
      }
    });

    it('should parse human metric record', () => {
      const record = {
        type: 'human',
        spec: 'my-feature',
        start: '2025-01-15T10:05:30.000Z',
        end: '2025-01-15T10:08:15.000Z',
        ms: 165000,
      };

      const result = MetricRecordSchema.safeParse(record);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('human');
      }
    });

    it('should parse lifecycle metric record', () => {
      const record = {
        type: 'lifecycle',
        spec: 'my-feature',
        event: 'start',
        timestamp: '2025-01-15T09:55:00.000Z',
      };

      const result = MetricRecordSchema.safeParse(record);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('lifecycle');
      }
    });

    it('should reject unknown type', () => {
      const record = {
        type: 'unknown',
        spec: 'my-feature',
      };

      const result = MetricRecordSchema.safeParse(record);
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // ISO8601 Timestamp validation (Requirement 4.5)
  // ==========================================================================
  describe('ISO8601 Timestamp validation', () => {
    it('should accept ISO8601 formatted timestamps', () => {
      const validTimestamps = [
        '2025-01-15T10:00:00.000Z',
        '2025-01-15T10:00:00Z',
        '2025-12-31T23:59:59.999Z',
      ];

      for (const timestamp of validTimestamps) {
        const record = {
          type: 'lifecycle',
          spec: 'test',
          event: 'start',
          timestamp,
        };
        const result = LifecycleMetricRecordSchema.safeParse(record);
        expect(result.success, `Timestamp ${timestamp} should be valid`).toBe(true);
      }
    });
  });

  // ==========================================================================
  // Milliseconds validation (Requirement 4.6)
  // ==========================================================================
  describe('Milliseconds field validation', () => {
    it('should accept non-negative integers for ms', () => {
      const validMs = [0, 1, 1000, 330000, 16500000];

      for (const ms of validMs) {
        const record = {
          type: 'ai',
          spec: 'test',
          phase: 'requirements',
          start: '2025-01-15T10:00:00.000Z',
          end: '2025-01-15T10:05:30.000Z',
          ms,
        };
        const result = AiMetricRecordSchema.safeParse(record);
        expect(result.success, `ms=${ms} should be valid`).toBe(true);
      }
    });

    it('should reject negative ms values', () => {
      const record = {
        type: 'ai',
        spec: 'test',
        phase: 'requirements',
        start: '2025-01-15T10:00:00.000Z',
        end: '2025-01-15T10:05:30.000Z',
        ms: -1,
      };
      const result = AiMetricRecordSchema.safeParse(record);
      expect(result.success).toBe(false);
    });
  });
});
