/**
 * useIncrementalLogParser Hook
 *
 * Incrementally parses log entries to avoid re-parsing all logs on each update.
 * Performance fix: Prevents UI blocking (rainbow spinner) when logs are large.
 *
 * Strategy:
 * - Track the last parsed log index
 * - Only parse new logs that haven't been processed yet
 * - Accumulate parsed entries in a stable reference
 */

import { useRef, useMemo } from 'react';
import { parseLogData, type ParsedLogEntry } from '@shared/utils/logFormatter';
import type { LogEntry } from '@shared/api/types';

interface ParseCache {
  /** Last processed log count */
  lastLogCount: number;
  /** Last log ID to detect log replacement */
  lastLogIds: Set<string>;
  /** Accumulated parsed entries (excluding command) */
  parsedEntries: ParsedLogEntry[];
}

/**
 * Incrementally parse logs, only processing new entries
 *
 * @param logs - Array of log entries
 * @param command - Optional command to show as first entry
 * @returns Parsed log entries
 */
export function useIncrementalLogParser(
  logs: LogEntry[],
  command?: string
): ParsedLogEntry[] {
  const cacheRef = useRef<ParseCache>({
    lastLogCount: 0,
    lastLogIds: new Set(),
    parsedEntries: [],
  });

  return useMemo(() => {
    const cache = cacheRef.current;
    const currentLogCount = logs.length;

    // Detect if logs were cleared/replaced (not just appended)
    // Check if first few logs are different from cached
    const logsWereReplaced = detectLogReplacement(logs, cache.lastLogIds);

    if (logsWereReplaced) {
      // Reset cache and parse all
      cache.lastLogCount = 0;
      cache.lastLogIds = new Set();
      cache.parsedEntries = [];
    }

    // Parse only new logs (from lastLogCount to current length)
    const newLogs = logs.slice(cache.lastLogCount);

    for (const log of newLogs) {
      const parsed = parseLogEntry(log);
      cache.parsedEntries.push(...parsed);
      cache.lastLogIds.add(log.id);
    }

    // Update cache
    cache.lastLogCount = currentLogCount;

    // Build final result with command entry if provided
    const entries: ParsedLogEntry[] = [];

    if (command) {
      entries.push({
        id: 'command-line',
        type: 'system',
        session: {
          cwd: command,
        },
      });
    }

    entries.push(...cache.parsedEntries);

    return entries;
  }, [logs, command]);
}

/**
 * Detect if logs were replaced (not just appended)
 * This happens when logs are cleared or a different agent is selected
 */
function detectLogReplacement(logs: LogEntry[], cachedLogIds: Set<string>): boolean {
  if (cachedLogIds.size === 0) {
    return false; // No cache yet
  }

  if (logs.length === 0) {
    return true; // Logs were cleared
  }

  // Check if first log exists in cache
  // If not, logs were replaced
  return !cachedLogIds.has(logs[0].id);
}

/**
 * Parse a single log entry
 */
function parseLogEntry(log: LogEntry): ParsedLogEntry[] {
  const entries: ParsedLogEntry[] = [];
  const logIdx = 0; // Index within single log

  if (log.stream === 'stdin') {
    // Skip stdin - displayed via user event from stdout
    return entries;
  }

  if (log.stream === 'stderr') {
    // stderr is always shown as error
    entries.push({
      id: `${log.id}-stderr-${logIdx}`,
      type: 'error',
      result: {
        content: log.data,
        isError: true,
      },
    });
    return entries;
  }

  // Parse stdout as Claude stream-json
  const parsed = parseLogData(log.data);

  if (parsed.length === 0 && log.data.trim()) {
    // If no parsed output, show as text
    entries.push({
      id: `${log.id}-raw-${logIdx}`,
      type: 'text',
      text: {
        content: log.data,
        role: 'assistant',
      },
    });
  } else {
    parsed.forEach((entry, entryIdx) => {
      entries.push({
        ...entry,
        id: `${log.id}-${logIdx}-${entryIdx}`,
      });
    });
  }

  return entries;
}
