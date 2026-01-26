/**
 * Tests for parserTypes.ts
 * Task 1.1: Parser Types Unit Tests
 * Requirements: 1.3, 4.3
 */

import { describe, it, expect } from 'vitest';
import type {
  ParsedLogEntry,
  LogStreamParser,
  DeltaAccumulator,
} from './parserTypes';
import type { LLMEngineId } from '@shared/registry';

describe('parserTypes', () => {
  describe('ParsedLogEntry', () => {
    it('should support engineId field (Requirements: 4.3)', () => {
      const entry: ParsedLogEntry = {
        id: 'test-1',
        type: 'text',
        engineId: 'claude',
        text: {
          content: 'Hello',
          role: 'assistant',
        },
      };

      expect(entry.engineId).toBe('claude');
    });

    it('should allow gemini as engineId', () => {
      const entry: ParsedLogEntry = {
        id: 'test-2',
        type: 'system',
        engineId: 'gemini',
        session: {
          model: 'gemini-pro',
        },
      };

      expect(entry.engineId).toBe('gemini');
    });

    it('should make engineId optional for backward compatibility', () => {
      const entry: ParsedLogEntry = {
        id: 'test-3',
        type: 'result',
        result: {
          content: 'Done',
          isError: false,
        },
      };

      expect(entry.engineId).toBeUndefined();
    });

    it('should support all existing entry types', () => {
      const types: ParsedLogEntry['type'][] = [
        'system',
        'assistant',
        'tool_use',
        'tool_result',
        'result',
        'text',
        'error',
        'input',
      ];

      types.forEach((type) => {
        const entry: ParsedLogEntry = {
          id: `test-${type}`,
          type,
        };
        expect(entry.type).toBe(type);
      });
    });
  });

  describe('LogStreamParser interface', () => {
    it('should define parseLine method (Requirements: 1.3)', () => {
      // Create a mock implementation to verify interface
      const mockParser: LogStreamParser = {
        parseLine: (jsonLine: string): ParsedLogEntry[] => {
          return [{ id: 'mock-1', type: 'text' }];
        },
        parseData: (data: string): ParsedLogEntry[] => {
          return [{ id: 'mock-2', type: 'text' }];
        },
      };

      const result = mockParser.parseLine('{}');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('text');
    });

    it('should define parseData method (Requirements: 1.3)', () => {
      const mockParser: LogStreamParser = {
        parseLine: (): ParsedLogEntry[] => [],
        parseData: (data: string): ParsedLogEntry[] => {
          const lines = data.split('\n').filter((l) => l.trim());
          return lines.map((_, i) => ({ id: `entry-${i}`, type: 'text' }));
        },
      };

      const result = mockParser.parseData('line1\nline2');
      expect(result).toHaveLength(2);
    });
  });

  describe('DeltaAccumulator interface', () => {
    it('should define required fields (Requirements: 3.1)', () => {
      const accumulator: DeltaAccumulator = {
        currentMessageId: 'msg-1',
        accumulatedContent: 'Hello ',
        role: 'assistant',
      };

      expect(accumulator.currentMessageId).toBe('msg-1');
      expect(accumulator.accumulatedContent).toBe('Hello ');
      expect(accumulator.role).toBe('assistant');
    });

    it('should allow null currentMessageId for reset state', () => {
      const accumulator: DeltaAccumulator = {
        currentMessageId: null,
        accumulatedContent: '',
        role: 'assistant',
      };

      expect(accumulator.currentMessageId).toBeNull();
    });

    it('should support user role', () => {
      const accumulator: DeltaAccumulator = {
        currentMessageId: 'msg-2',
        accumulatedContent: 'User input',
        role: 'user',
      };

      expect(accumulator.role).toBe('user');
    });
  });
});
