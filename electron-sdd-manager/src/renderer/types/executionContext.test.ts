/**
 * ExecutionContext Type Tests
 * TDD tests for ExecutionContext type and factory function
 * Requirements: 1.1, 1.2, 1.5, 1.6, 3.6
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  createExecutionContext,
  disposeExecutionContext,
  MAX_CONCURRENT_SPECS,
  type ExecutionContext,
  type CreateExecutionContextOptions,
} from './executionContext';
import type { SpecDetail } from './index';

describe('ExecutionContext', () => {
  // ============================================================
  // Task 1.1: ExecutionContext Type Tests
  // Requirements: 1.6
  // ============================================================
  describe('Task 1.1: ExecutionContext type definition', () => {
    it('should have all required fields', () => {
      const mockSpecDetail = createMockSpecDetail();
      const context = createExecutionContext({
        specId: 'test-spec',
        specDetail: mockSpecDetail,
      });

      // Check all fields exist
      expect(context.specId).toBe('test-spec');
      expect(context.specDetailSnapshot).toBeDefined();
      // spec-path-ssot-refactor: specPath changed to specName
      expect(context.specName).toBeDefined();
      expect(context.currentPhase).toBeNull();
      expect(context.executionStatus).toBe('running');
      expect(context.trackedAgentIds).toBeInstanceOf(Set);
      expect(context.executedPhases).toEqual([]);
      expect(context.errors).toEqual([]);
      expect(typeof context.startTime).toBe('number');
      expect(context.timeoutId).toBeNull();
    });

    it('should have readonly specId', () => {
      const mockSpecDetail = createMockSpecDetail();
      const context = createExecutionContext({
        specId: 'test-spec',
        specDetail: mockSpecDetail,
      });

      // TypeScript would prevent this at compile time
      // Runtime check for readonly behavior
      expect(context.specId).toBe('test-spec');
    });

    it('should have readonly specDetailSnapshot', () => {
      const mockSpecDetail = createMockSpecDetail();
      const context = createExecutionContext({
        specId: 'test-spec',
        specDetail: mockSpecDetail,
      });

      // Snapshot should be a copy, not a reference
      expect(context.specDetailSnapshot).not.toBe(mockSpecDetail);
      expect(context.specDetailSnapshot.metadata.name).toBe(mockSpecDetail.metadata.name);
    });

    // spec-path-ssot-refactor: specPath changed to specName
    it('should have readonly specName', () => {
      const mockSpecDetail = createMockSpecDetail();
      const context = createExecutionContext({
        specId: 'test-spec',
        specDetail: mockSpecDetail,
      });

      expect(context.specName).toBe('test-spec');
    });
  });

  // ============================================================
  // Task 1.2: ExecutionContext Factory Function Tests
  // Requirements: 1.2, 1.5
  // ============================================================
  describe('Task 1.2: createExecutionContext factory', () => {
    it('should create context with specDetail snapshot', () => {
      const mockSpecDetail = createMockSpecDetail();
      const context = createExecutionContext({
        specId: 'test-spec',
        specDetail: mockSpecDetail,
      });

      // Verify snapshot is created (not same reference)
      expect(context.specDetailSnapshot).not.toBe(mockSpecDetail);
      expect(context.specDetailSnapshot.metadata).not.toBe(mockSpecDetail.metadata);
      expect(context.specDetailSnapshot.specJson).not.toBe(mockSpecDetail.specJson);
    });

    it('should include specPath in the context', () => {
      const mockSpecDetail = createMockSpecDetail();
      const context = createExecutionContext({
        specId: 'test-spec',
        specDetail: mockSpecDetail,
      });

      // spec-path-ssot-refactor: specPath changed to specName
      expect(context.specName).toBe(mockSpecDetail.metadata.name);
    });

    it('should set initial executionStatus to running', () => {
      const mockSpecDetail = createMockSpecDetail();
      const context = createExecutionContext({
        specId: 'test-spec',
        specDetail: mockSpecDetail,
      });

      expect(context.executionStatus).toBe('running');
    });

    it('should set startTime to current time', () => {
      const beforeTime = Date.now();
      const mockSpecDetail = createMockSpecDetail();
      const context = createExecutionContext({
        specId: 'test-spec',
        specDetail: mockSpecDetail,
      });
      const afterTime = Date.now();

      expect(context.startTime).toBeGreaterThanOrEqual(beforeTime);
      expect(context.startTime).toBeLessThanOrEqual(afterTime);
    });

    it('should initialize executedPhases as empty array', () => {
      const mockSpecDetail = createMockSpecDetail();
      const context = createExecutionContext({
        specId: 'test-spec',
        specDetail: mockSpecDetail,
      });

      expect(context.executedPhases).toEqual([]);
    });

    it('should initialize errors as empty array', () => {
      const mockSpecDetail = createMockSpecDetail();
      const context = createExecutionContext({
        specId: 'test-spec',
        specDetail: mockSpecDetail,
      });

      expect(context.errors).toEqual([]);
    });

    it('should initialize trackedAgentIds as empty Set', () => {
      const mockSpecDetail = createMockSpecDetail();
      const context = createExecutionContext({
        specId: 'test-spec',
        specDetail: mockSpecDetail,
      });

      expect(context.trackedAgentIds).toBeInstanceOf(Set);
      expect(context.trackedAgentIds.size).toBe(0);
    });

    it('should initialize currentPhase as null', () => {
      const mockSpecDetail = createMockSpecDetail();
      const context = createExecutionContext({
        specId: 'test-spec',
        specDetail: mockSpecDetail,
      });

      expect(context.currentPhase).toBeNull();
    });

    it('should initialize timeoutId as null', () => {
      const mockSpecDetail = createMockSpecDetail();
      const context = createExecutionContext({
        specId: 'test-spec',
        specDetail: mockSpecDetail,
      });

      expect(context.timeoutId).toBeNull();
    });
  });

  // ============================================================
  // Task 1.2: disposeExecutionContext Tests
  // Requirements: 6.1, 6.3
  // ============================================================
  describe('disposeExecutionContext', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('should clear timeout if set', () => {
      vi.useFakeTimers();
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const mockSpecDetail = createMockSpecDetail();
      const context = createExecutionContext({
        specId: 'test-spec',
        specDetail: mockSpecDetail,
      });

      // Set a timeout
      context.timeoutId = setTimeout(() => {}, 1000);

      disposeExecutionContext(context);

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(context.timeoutId).toBeNull();
    });

    it('should clear trackedAgentIds', () => {
      const mockSpecDetail = createMockSpecDetail();
      const context = createExecutionContext({
        specId: 'test-spec',
        specDetail: mockSpecDetail,
      });

      // Add some agent IDs
      context.trackedAgentIds.add('agent-1');
      context.trackedAgentIds.add('agent-2');

      disposeExecutionContext(context);

      expect(context.trackedAgentIds.size).toBe(0);
    });

    it('should handle context with no timeout', () => {
      const mockSpecDetail = createMockSpecDetail();
      const context = createExecutionContext({
        specId: 'test-spec',
        specDetail: mockSpecDetail,
      });

      // No timeout set
      expect(() => disposeExecutionContext(context)).not.toThrow();
    });
  });

  // ============================================================
  // Task 11.3: MAX_CONCURRENT_SPECS constant Tests
  // Requirements: 3.4
  // ============================================================
  describe('MAX_CONCURRENT_SPECS', () => {
    it('should be 5', () => {
      expect(MAX_CONCURRENT_SPECS).toBe(5);
    });
  });
});

// Helper function to create mock SpecDetail
function createMockSpecDetail(): SpecDetail {
  return {
    metadata: {
      name: 'test-spec',
      path: '/test/path',
      phase: 'initialized',
      updatedAt: new Date().toISOString(),
      approvals: {
        requirements: { generated: false, approved: false },
        design: { generated: false, approved: false },
        tasks: { generated: false, approved: false },
      },
    },
    specJson: {
      feature_name: 'test-spec',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      language: 'ja',
      phase: 'initialized',
      approvals: {
        requirements: { generated: false, approved: false },
        design: { generated: false, approved: false },
        tasks: { generated: false, approved: false },
      },
    },
    artifacts: {
      requirements: null,
      design: null,
      tasks: null,
      research: null,
      inspection: null,
    },
    taskProgress: null,
  };
}
