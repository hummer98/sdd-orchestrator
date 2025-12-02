/**
 * Token Aggregator Tests
 * TDD: Test token aggregation from log entries
 */

import { describe, it, expect } from 'vitest';
import { aggregateTokens, type TokenUsage } from './tokenAggregator';
import type { LogEntry } from '../types';

describe('tokenAggregator', () => {
  describe('aggregateTokens', () => {
    it('should return zero tokens for empty logs', () => {
      const result = aggregateTokens([]);

      expect(result.inputTokens).toBe(0);
      expect(result.outputTokens).toBe(0);
      expect(result.totalTokens).toBe(0);
    });

    it('should return zero tokens for logs without token data', () => {
      const logs: LogEntry[] = [
        {
          id: 'log-1',
          stream: 'stdout',
          data: '{"type":"assistant","message":{"content":[{"type":"text","text":"Hello"}]}}',
          timestamp: Date.now(),
        },
      ];

      const result = aggregateTokens(logs);

      expect(result.inputTokens).toBe(0);
      expect(result.outputTokens).toBe(0);
      expect(result.totalTokens).toBe(0);
    });

    it('should aggregate tokens from single log entry', () => {
      const logs: LogEntry[] = [
        {
          id: 'log-1',
          stream: 'stdout',
          data: '{"type":"assistant","message":{"usage":{"input_tokens":100,"output_tokens":50}}}',
          timestamp: Date.now(),
        },
      ];

      const result = aggregateTokens(logs);

      expect(result.inputTokens).toBe(100);
      expect(result.outputTokens).toBe(50);
      expect(result.totalTokens).toBe(150);
    });

    it('should aggregate tokens from multiple log entries', () => {
      const logs: LogEntry[] = [
        {
          id: 'log-1',
          stream: 'stdout',
          data: '{"type":"assistant","message":{"usage":{"input_tokens":100,"output_tokens":50}}}',
          timestamp: Date.now(),
        },
        {
          id: 'log-2',
          stream: 'stdout',
          data: '{"type":"assistant","message":{"usage":{"input_tokens":200,"output_tokens":100}}}',
          timestamp: Date.now(),
        },
      ];

      const result = aggregateTokens(logs);

      expect(result.inputTokens).toBe(300);
      expect(result.outputTokens).toBe(150);
      expect(result.totalTokens).toBe(450);
    });

    it('should handle multiple JSON lines in single log entry', () => {
      const logs: LogEntry[] = [
        {
          id: 'log-1',
          stream: 'stdout',
          data: '{"type":"assistant","message":{"usage":{"input_tokens":100,"output_tokens":50}}}\n{"type":"assistant","message":{"usage":{"input_tokens":200,"output_tokens":100}}}',
          timestamp: Date.now(),
        },
      ];

      const result = aggregateTokens(logs);

      expect(result.inputTokens).toBe(300);
      expect(result.outputTokens).toBe(150);
      expect(result.totalTokens).toBe(450);
    });

    it('should ignore stderr logs', () => {
      const logs: LogEntry[] = [
        {
          id: 'log-1',
          stream: 'stderr',
          data: '{"type":"assistant","message":{"usage":{"input_tokens":100,"output_tokens":50}}}',
          timestamp: Date.now(),
        },
      ];

      const result = aggregateTokens(logs);

      expect(result.inputTokens).toBe(0);
      expect(result.outputTokens).toBe(0);
      expect(result.totalTokens).toBe(0);
    });

    it('should ignore stdin logs', () => {
      const logs: LogEntry[] = [
        {
          id: 'log-1',
          stream: 'stdin',
          data: 'user input',
          timestamp: Date.now(),
        },
      ];

      const result = aggregateTokens(logs);

      expect(result.inputTokens).toBe(0);
      expect(result.outputTokens).toBe(0);
      expect(result.totalTokens).toBe(0);
    });

    it('should handle invalid JSON gracefully', () => {
      const logs: LogEntry[] = [
        {
          id: 'log-1',
          stream: 'stdout',
          data: 'not valid json',
          timestamp: Date.now(),
        },
        {
          id: 'log-2',
          stream: 'stdout',
          data: '{"type":"assistant","message":{"usage":{"input_tokens":100,"output_tokens":50}}}',
          timestamp: Date.now(),
        },
      ];

      const result = aggregateTokens(logs);

      expect(result.inputTokens).toBe(100);
      expect(result.outputTokens).toBe(50);
      expect(result.totalTokens).toBe(150);
    });

    it('should handle partial usage data', () => {
      const logs: LogEntry[] = [
        {
          id: 'log-1',
          stream: 'stdout',
          data: '{"type":"assistant","message":{"usage":{"input_tokens":100}}}',
          timestamp: Date.now(),
        },
        {
          id: 'log-2',
          stream: 'stdout',
          data: '{"type":"assistant","message":{"usage":{"output_tokens":50}}}',
          timestamp: Date.now(),
        },
      ];

      const result = aggregateTokens(logs);

      expect(result.inputTokens).toBe(100);
      expect(result.outputTokens).toBe(50);
      expect(result.totalTokens).toBe(150);
    });

    it('should handle result type with usage data', () => {
      const logs: LogEntry[] = [
        {
          id: 'log-1',
          stream: 'stdout',
          data: '{"type":"result","usage":{"input_tokens":500,"output_tokens":250}}',
          timestamp: Date.now(),
        },
      ];

      const result = aggregateTokens(logs);

      expect(result.inputTokens).toBe(500);
      expect(result.outputTokens).toBe(250);
      expect(result.totalTokens).toBe(750);
    });
  });
});
