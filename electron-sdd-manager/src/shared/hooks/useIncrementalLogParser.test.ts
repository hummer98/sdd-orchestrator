/**
 * useIncrementalLogParser Hook Tests
 *
 * TDD: Tests for incremental log parsing to avoid re-parsing all logs on each update.
 * Performance fix: Rainbow spinner issue when logs are large.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIncrementalLogParser } from './useIncrementalLogParser';
import type { LogEntry } from '@shared/api/types';
import * as logFormatter from '@shared/utils/logFormatter';

// Mock parseLogData to track call count
vi.mock('@shared/utils/logFormatter', async () => {
  const actual = await vi.importActual('@shared/utils/logFormatter');
  return {
    ...actual,
    parseLogData: vi.fn((data: string) => (actual as typeof logFormatter).parseLogData(data)),
  };
});

describe('useIncrementalLogParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createLog = (id: string, text: string, timestamp: number): LogEntry => ({
    id,
    stream: 'stdout',
    data: `{"type":"assistant","message":{"content":[{"type":"text","text":"${text}"}]}}`,
    timestamp,
  });

  describe('Basic parsing', () => {
    it('should parse logs and return parsed entries', () => {
      const logs: LogEntry[] = [
        createLog('log-1', 'Hello', 1000),
        createLog('log-2', 'World', 2000),
      ];

      const { result } = renderHook(() => useIncrementalLogParser(logs));

      expect(result.current).toHaveLength(2);
      expect(result.current[0].type).toBe('text');
      expect(result.current[1].type).toBe('text');
    });

    it('should return empty array for empty logs', () => {
      const { result } = renderHook(() => useIncrementalLogParser([]));
      expect(result.current).toHaveLength(0);
    });
  });

  describe('Incremental parsing (performance)', () => {
    it('should only parse NEW logs when logs are appended', () => {
      const initialLogs: LogEntry[] = [
        createLog('log-1', 'First', 1000),
        createLog('log-2', 'Second', 2000),
      ];

      const { result, rerender } = renderHook(
        ({ logs }) => useIncrementalLogParser(logs),
        { initialProps: { logs: initialLogs } }
      );

      // Initial render parses all logs
      expect(logFormatter.parseLogData).toHaveBeenCalledTimes(2);
      expect(result.current).toHaveLength(2);

      vi.clearAllMocks();

      // Append new log
      const updatedLogs: LogEntry[] = [
        ...initialLogs,
        createLog('log-3', 'Third', 3000),
      ];

      rerender({ logs: updatedLogs });

      // Should only parse the NEW log, not re-parse all
      expect(logFormatter.parseLogData).toHaveBeenCalledTimes(1);
      expect(result.current).toHaveLength(3);
    });

    it('should NOT re-parse existing logs when many logs are appended', () => {
      // Start with 100 logs
      const initialLogs: LogEntry[] = Array.from({ length: 100 }, (_, i) =>
        createLog(`log-${i}`, `Message ${i}`, i * 1000)
      );

      const { result, rerender } = renderHook(
        ({ logs }) => useIncrementalLogParser(logs),
        { initialProps: { logs: initialLogs } }
      );

      expect(logFormatter.parseLogData).toHaveBeenCalledTimes(100);
      expect(result.current).toHaveLength(100);

      vi.clearAllMocks();

      // Append 5 new logs
      const newLogs: LogEntry[] = Array.from({ length: 5 }, (_, i) =>
        createLog(`log-${100 + i}`, `New Message ${i}`, (100 + i) * 1000)
      );
      const updatedLogs = [...initialLogs, ...newLogs];

      rerender({ logs: updatedLogs });

      // Should only parse 5 new logs, not 105
      expect(logFormatter.parseLogData).toHaveBeenCalledTimes(5);
      expect(result.current).toHaveLength(105);
    });

    it('should handle log replacement (clear and new logs)', () => {
      const initialLogs: LogEntry[] = [
        createLog('log-1', 'First', 1000),
        createLog('log-2', 'Second', 2000),
      ];

      const { result, rerender } = renderHook(
        ({ logs }) => useIncrementalLogParser(logs),
        { initialProps: { logs: initialLogs } }
      );

      vi.clearAllMocks();

      // Completely different logs (simulating clear + new agent)
      const newLogs: LogEntry[] = [
        createLog('new-log-1', 'New First', 5000),
      ];

      rerender({ logs: newLogs });

      // Should parse the new log
      expect(logFormatter.parseLogData).toHaveBeenCalledTimes(1);
      expect(result.current).toHaveLength(1);
    });
  });

  describe('stdin filtering', () => {
    it('should filter out stdin logs', () => {
      const logs: LogEntry[] = [
        { id: 'stdin-1', stream: 'stdin', data: 'user input', timestamp: 1000 },
        createLog('log-1', 'Response', 2000),
      ];

      const { result } = renderHook(() => useIncrementalLogParser(logs));

      // Should only have 1 entry (stdin filtered out)
      expect(result.current).toHaveLength(1);
    });
  });

  describe('stderr handling', () => {
    it('should parse stderr as error entries', () => {
      const logs: LogEntry[] = [
        { id: 'stderr-1', stream: 'stderr', data: 'Error message', timestamp: 1000 },
      ];

      const { result } = renderHook(() => useIncrementalLogParser(logs));

      expect(result.current).toHaveLength(1);
      expect(result.current[0].type).toBe('error');
    });
  });

  describe('Command line entry', () => {
    it('should prepend command as system entry when provided', () => {
      const logs: LogEntry[] = [
        createLog('log-1', 'Response', 1000),
      ];
      const command = 'claude -p "/kiro:spec-requirements"';

      const { result } = renderHook(() => useIncrementalLogParser(logs, command));

      expect(result.current).toHaveLength(2);
      expect(result.current[0].type).toBe('system');
      expect(result.current[0].session?.cwd).toBe(command);
    });

    it('should not duplicate command entry on re-render', () => {
      const logs: LogEntry[] = [createLog('log-1', 'Response', 1000)];
      const command = 'claude -p "/kiro:spec-requirements"';

      const { result, rerender } = renderHook(
        ({ logs, cmd }) => useIncrementalLogParser(logs, cmd),
        { initialProps: { logs, cmd: command } }
      );

      expect(result.current).toHaveLength(2);

      // Rerender with same props
      rerender({ logs, cmd: command });

      // Should still have 2 entries, not duplicated
      expect(result.current).toHaveLength(2);
    });
  });
});
