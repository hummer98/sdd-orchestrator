/**
 * useIncrementalTokenAggregator Hook Tests
 *
 * TDD: Tests for incremental token aggregation to avoid re-aggregating all logs on each update.
 * Performance fix: Rainbow spinner issue when logs are large.
 *
 * main-process-log-parser Task 10.9: Updated to use ParsedLogEntry type
 * Logs are now pre-parsed by Main process, so we work with ParsedLogEntry instead of LogEntry.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIncrementalTokenAggregator } from './useIncrementalTokenAggregator';
import type { ParsedLogEntry } from '@shared/api/types';

describe('useIncrementalTokenAggregator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to create ParsedLogEntry with result tokens
  const createLogWithTokens = (id: string, inputTokens: number, outputTokens: number, timestamp: number): ParsedLogEntry => ({
    id,
    type: 'result',
    timestamp,
    engineId: 'claude',
    result: {
      content: 'Done',
      isError: false,
      inputTokens,
      outputTokens,
    },
  });

  // Helper to create ParsedLogEntry without tokens
  const createLogWithoutTokens = (id: string, text: string, timestamp: number): ParsedLogEntry => ({
    id,
    type: 'text',
    timestamp,
    engineId: 'claude',
    text: {
      content: text,
      role: 'assistant',
    },
  });

  describe('Basic aggregation', () => {
    it('should aggregate tokens from logs', () => {
      const logs: ParsedLogEntry[] = [
        createLogWithTokens('log-1', 100, 50, 1000),
        createLogWithTokens('log-2', 200, 100, 2000),
      ];

      const { result } = renderHook(() => useIncrementalTokenAggregator(logs));

      expect(result.current?.inputTokens).toBe(300);
      expect(result.current?.outputTokens).toBe(150);
      expect(result.current?.totalTokens).toBe(450);
    });

    it('should return zero for empty logs', () => {
      const { result } = renderHook(() => useIncrementalTokenAggregator([]));

      expect(result.current?.inputTokens).toBe(0);
      expect(result.current?.outputTokens).toBe(0);
      expect(result.current?.totalTokens).toBe(0);
    });

    it('should handle logs without token info', () => {
      const logs: ParsedLogEntry[] = [
        createLogWithoutTokens('log-1', 'Hello', 1000),
        createLogWithoutTokens('log-2', 'World', 2000),
      ];

      const { result } = renderHook(() => useIncrementalTokenAggregator(logs));

      expect(result.current?.inputTokens).toBe(0);
      expect(result.current?.outputTokens).toBe(0);
      expect(result.current?.totalTokens).toBe(0);
    });
  });

  describe('Incremental aggregation (performance)', () => {
    it('should incrementally add tokens when new logs are appended', () => {
      const initialLogs: ParsedLogEntry[] = [
        createLogWithTokens('log-1', 100, 50, 1000),
        createLogWithTokens('log-2', 200, 100, 2000),
      ];

      const { result, rerender } = renderHook(
        ({ logs }) => useIncrementalTokenAggregator(logs),
        { initialProps: { logs: initialLogs } }
      );

      expect(result.current?.inputTokens).toBe(300);
      expect(result.current?.outputTokens).toBe(150);

      // Append new log
      const updatedLogs: ParsedLogEntry[] = [
        ...initialLogs,
        createLogWithTokens('log-3', 50, 25, 3000),
      ];

      rerender({ logs: updatedLogs });

      // Should have accumulated totals
      expect(result.current?.inputTokens).toBe(350);
      expect(result.current?.outputTokens).toBe(175);
      expect(result.current?.totalTokens).toBe(525);
    });

    it('should efficiently handle large log arrays', () => {
      // Start with 100 logs
      const initialLogs: ParsedLogEntry[] = Array.from({ length: 100 }, (_, i) =>
        createLogWithTokens(`log-${i}`, 10, 5, i * 1000)
      );

      const { result, rerender } = renderHook(
        ({ logs }) => useIncrementalTokenAggregator(logs),
        { initialProps: { logs: initialLogs } }
      );

      expect(result.current?.inputTokens).toBe(1000); // 100 * 10
      expect(result.current?.outputTokens).toBe(500); // 100 * 5

      // Append 5 new logs
      const newLogs: ParsedLogEntry[] = Array.from({ length: 5 }, (_, i) =>
        createLogWithTokens(`log-${100 + i}`, 20, 10, (100 + i) * 1000)
      );
      const updatedLogs = [...initialLogs, ...newLogs];

      rerender({ logs: updatedLogs });

      // Should have correct totals
      expect(result.current?.inputTokens).toBe(1100); // 1000 + 5*20
      expect(result.current?.outputTokens).toBe(550); // 500 + 5*10
    });

    it('should reset aggregation when logs are cleared', () => {
      const initialLogs: ParsedLogEntry[] = [
        createLogWithTokens('log-1', 100, 50, 1000),
        createLogWithTokens('log-2', 200, 100, 2000),
      ];

      const { result, rerender } = renderHook(
        ({ logs }) => useIncrementalTokenAggregator(logs),
        { initialProps: { logs: initialLogs } }
      );

      expect(result.current?.inputTokens).toBe(300);

      // Clear logs (new agent started)
      const newLogs: ParsedLogEntry[] = [
        createLogWithTokens('new-log-1', 50, 25, 5000),
      ];

      rerender({ logs: newLogs });

      // Should only have new log's tokens
      expect(result.current?.inputTokens).toBe(50);
      expect(result.current?.outputTokens).toBe(25);
    });
  });

  describe('Mixed log types', () => {
    it('should aggregate from result events', () => {
      const logs: ParsedLogEntry[] = [
        createLogWithTokens('result-1', 500, 1000, 1000),
      ];

      const { result } = renderHook(() => useIncrementalTokenAggregator(logs));

      expect(result.current?.inputTokens).toBe(500);
      expect(result.current?.outputTokens).toBe(1000);
    });

    it('should ignore text and error entries without tokens', () => {
      const logs: ParsedLogEntry[] = [
        { id: 'error-1', type: 'error', timestamp: 1000 },
        { id: 'input-1', type: 'input', timestamp: 2000, text: { content: 'input', role: 'user' } },
        createLogWithTokens('log-1', 100, 50, 3000),
      ];

      const { result } = renderHook(() => useIncrementalTokenAggregator(logs));

      expect(result.current?.inputTokens).toBe(100);
      expect(result.current?.outputTokens).toBe(50);
    });
  });

  describe('disabled state', () => {
    it('should return undefined when disabled', () => {
      const logs: ParsedLogEntry[] = [
        createLogWithTokens('log-1', 100, 50, 1000),
      ];

      const { result } = renderHook(() => useIncrementalTokenAggregator(logs, false));

      expect(result.current).toBeUndefined();
    });

    it('should return tokens when enabled', () => {
      const logs: ParsedLogEntry[] = [
        createLogWithTokens('log-1', 100, 50, 1000),
      ];

      const { result } = renderHook(() => useIncrementalTokenAggregator(logs, true));

      expect(result.current).toBeDefined();
      expect(result.current!.inputTokens).toBe(100);
    });
  });
});
