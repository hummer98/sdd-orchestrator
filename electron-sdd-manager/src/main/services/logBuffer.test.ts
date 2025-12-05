/**
 * LogBuffer Unit Tests
 * TDD: Testing ring buffer log storage functionality
 * Requirements: 4.2 - ログ履歴の保持と配信
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LogBuffer, LogEntry } from './logBuffer';

describe('LogBuffer', () => {
  let logBuffer: LogBuffer;

  beforeEach(() => {
    // Default: 100 entries max
    logBuffer = new LogBuffer({ maxEntries: 100 });
  });

  describe('add', () => {
    it('should add a log entry', () => {
      const entry: LogEntry = {
        timestamp: Date.now(),
        agentId: 'agent-1',
        stream: 'stdout',
        data: 'Test log message',
        type: 'info',
      };

      logBuffer.add(entry);

      const entries = logBuffer.getAll();
      expect(entries).toHaveLength(1);
      expect(entries[0]).toEqual(entry);
    });

    it('should preserve entry properties', () => {
      const timestamp = Date.now();
      const entry: LogEntry = {
        timestamp,
        agentId: 'agent-123',
        stream: 'stderr',
        data: 'Error message',
        type: 'error',
      };

      logBuffer.add(entry);

      const entries = logBuffer.getAll();
      expect(entries[0].timestamp).toBe(timestamp);
      expect(entries[0].agentId).toBe('agent-123');
      expect(entries[0].stream).toBe('stderr');
      expect(entries[0].data).toBe('Error message');
      expect(entries[0].type).toBe('error');
    });

    it('should handle all log types', () => {
      const types: LogEntry['type'][] = ['info', 'warning', 'error', 'agent'];

      types.forEach((type, i) => {
        logBuffer.add({
          timestamp: Date.now() + i,
          agentId: `agent-${i}`,
          stream: 'stdout',
          data: `Message ${i}`,
          type,
        });
      });

      const entries = logBuffer.getAll();
      expect(entries).toHaveLength(4);
      expect(entries.map((e) => e.type)).toEqual(types);
    });

    it('should handle both stdout and stderr streams', () => {
      logBuffer.add({
        timestamp: Date.now(),
        agentId: 'agent-1',
        stream: 'stdout',
        data: 'stdout message',
        type: 'info',
      });

      logBuffer.add({
        timestamp: Date.now() + 1,
        agentId: 'agent-1',
        stream: 'stderr',
        data: 'stderr message',
        type: 'error',
      });

      const entries = logBuffer.getAll();
      expect(entries[0].stream).toBe('stdout');
      expect(entries[1].stream).toBe('stderr');
    });
  });

  describe('FIFO behavior', () => {
    it('should maintain insertion order', () => {
      for (let i = 0; i < 5; i++) {
        logBuffer.add({
          timestamp: Date.now() + i,
          agentId: 'agent-1',
          stream: 'stdout',
          data: `Message ${i}`,
          type: 'info',
        });
      }

      const entries = logBuffer.getAll();
      expect(entries[0].data).toBe('Message 0');
      expect(entries[4].data).toBe('Message 4');
    });

    it('should discard oldest entries when limit is exceeded', () => {
      const smallBuffer = new LogBuffer({ maxEntries: 5 });

      // Add 10 entries to a buffer with capacity 5
      for (let i = 0; i < 10; i++) {
        smallBuffer.add({
          timestamp: Date.now() + i,
          agentId: 'agent-1',
          stream: 'stdout',
          data: `Message ${i}`,
          type: 'info',
        });
      }

      const entries = smallBuffer.getAll();
      expect(entries).toHaveLength(5);
      // Should contain the 5 most recent entries (5-9)
      expect(entries[0].data).toBe('Message 5');
      expect(entries[4].data).toBe('Message 9');
    });

    it('should handle exactly maxEntries correctly', () => {
      for (let i = 0; i < 100; i++) {
        logBuffer.add({
          timestamp: Date.now() + i,
          agentId: 'agent-1',
          stream: 'stdout',
          data: `Message ${i}`,
          type: 'info',
        });
      }

      const entries = logBuffer.getAll();
      expect(entries).toHaveLength(100);
      expect(entries[0].data).toBe('Message 0');
      expect(entries[99].data).toBe('Message 99');
    });

    it('should correctly shift when one over limit', () => {
      for (let i = 0; i < 101; i++) {
        logBuffer.add({
          timestamp: Date.now() + i,
          agentId: 'agent-1',
          stream: 'stdout',
          data: `Message ${i}`,
          type: 'info',
        });
      }

      const entries = logBuffer.getAll();
      expect(entries).toHaveLength(100);
      expect(entries[0].data).toBe('Message 1');
      expect(entries[99].data).toBe('Message 100');
    });
  });

  describe('getAll', () => {
    it('should return empty array when no entries', () => {
      const entries = logBuffer.getAll();
      expect(entries).toEqual([]);
      expect(entries).toHaveLength(0);
    });

    it('should return a copy of entries (immutable)', () => {
      logBuffer.add({
        timestamp: Date.now(),
        agentId: 'agent-1',
        stream: 'stdout',
        data: 'Test message',
        type: 'info',
      });

      const entries1 = logBuffer.getAll();
      const entries2 = logBuffer.getAll();

      // Should be different array instances
      expect(entries1).not.toBe(entries2);
      // But with same content
      expect(entries1).toEqual(entries2);
    });

    it('should return readonly entries', () => {
      logBuffer.add({
        timestamp: Date.now(),
        agentId: 'agent-1',
        stream: 'stdout',
        data: 'Test message',
        type: 'info',
      });

      const entries = logBuffer.getAll();

      // TypeScript should prevent modification, but we test runtime behavior
      // The returned array is a copy, so modifications don't affect the buffer
      (entries as LogEntry[]).push({
        timestamp: Date.now(),
        agentId: 'agent-2',
        stream: 'stdout',
        data: 'Injected',
        type: 'info',
      });

      expect(logBuffer.getAll()).toHaveLength(1);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      for (let i = 0; i < 10; i++) {
        logBuffer.add({
          timestamp: Date.now() + i,
          agentId: 'agent-1',
          stream: 'stdout',
          data: `Message ${i}`,
          type: 'info',
        });
      }

      expect(logBuffer.getAll()).toHaveLength(10);

      logBuffer.clear();

      expect(logBuffer.getAll()).toHaveLength(0);
    });

    it('should allow adding entries after clear', () => {
      logBuffer.add({
        timestamp: Date.now(),
        agentId: 'agent-1',
        stream: 'stdout',
        data: 'Before clear',
        type: 'info',
      });

      logBuffer.clear();

      logBuffer.add({
        timestamp: Date.now(),
        agentId: 'agent-2',
        stream: 'stdout',
        data: 'After clear',
        type: 'info',
      });

      const entries = logBuffer.getAll();
      expect(entries).toHaveLength(1);
      expect(entries[0].data).toBe('After clear');
    });
  });

  describe('size', () => {
    it('should return 0 for empty buffer', () => {
      expect(logBuffer.size()).toBe(0);
    });

    it('should return correct count', () => {
      for (let i = 0; i < 50; i++) {
        logBuffer.add({
          timestamp: Date.now() + i,
          agentId: 'agent-1',
          stream: 'stdout',
          data: `Message ${i}`,
          type: 'info',
        });
      }

      expect(logBuffer.size()).toBe(50);
    });

    it('should not exceed maxEntries', () => {
      for (let i = 0; i < 200; i++) {
        logBuffer.add({
          timestamp: Date.now() + i,
          agentId: 'agent-1',
          stream: 'stdout',
          data: `Message ${i}`,
          type: 'info',
        });
      }

      expect(logBuffer.size()).toBe(100);
    });
  });

  describe('custom configuration', () => {
    it('should respect custom maxEntries', () => {
      const smallBuffer = new LogBuffer({ maxEntries: 10 });

      for (let i = 0; i < 20; i++) {
        smallBuffer.add({
          timestamp: Date.now() + i,
          agentId: 'agent-1',
          stream: 'stdout',
          data: `Message ${i}`,
          type: 'info',
        });
      }

      expect(smallBuffer.size()).toBe(10);
      expect(smallBuffer.getAll()[0].data).toBe('Message 10');
    });

    it('should handle maxEntries of 1', () => {
      const tinyBuffer = new LogBuffer({ maxEntries: 1 });

      tinyBuffer.add({
        timestamp: Date.now(),
        agentId: 'agent-1',
        stream: 'stdout',
        data: 'First',
        type: 'info',
      });

      tinyBuffer.add({
        timestamp: Date.now() + 1,
        agentId: 'agent-1',
        stream: 'stdout',
        data: 'Second',
        type: 'info',
      });

      expect(tinyBuffer.size()).toBe(1);
      expect(tinyBuffer.getAll()[0].data).toBe('Second');
    });
  });

  describe('edge cases', () => {
    it('should handle empty data string', () => {
      logBuffer.add({
        timestamp: Date.now(),
        agentId: 'agent-1',
        stream: 'stdout',
        data: '',
        type: 'info',
      });

      expect(logBuffer.size()).toBe(1);
      expect(logBuffer.getAll()[0].data).toBe('');
    });

    it('should handle large data strings', () => {
      const largeData = 'x'.repeat(100000);

      logBuffer.add({
        timestamp: Date.now(),
        agentId: 'agent-1',
        stream: 'stdout',
        data: largeData,
        type: 'info',
      });

      expect(logBuffer.getAll()[0].data).toBe(largeData);
    });

    it('should handle special characters in data', () => {
      const specialData = '{"json": true}\n\t\r\0';

      logBuffer.add({
        timestamp: Date.now(),
        agentId: 'agent-1',
        stream: 'stdout',
        data: specialData,
        type: 'info',
      });

      expect(logBuffer.getAll()[0].data).toBe(specialData);
    });

    it('should handle unicode in data', () => {
      const unicodeData = 'Hello ! Unicode test';

      logBuffer.add({
        timestamp: Date.now(),
        agentId: 'agent-1',
        stream: 'stdout',
        data: unicodeData,
        type: 'agent',
      });

      expect(logBuffer.getAll()[0].data).toBe(unicodeData);
    });
  });
});
