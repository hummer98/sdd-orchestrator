/**
 * useIncrementalLogParser Hook
 *
 * Incrementally parses log entries to avoid re-parsing all logs on each update.
 * Performance fix: Prevents UI blocking (rainbow spinner) when logs are large.
 *
 * Task 5.1: Added engineId parameter for LLM engine-specific parsing
 * Requirements: 2.2 (engineId propagation)
 *
 * Strategy:
 * - Track the last parsed log index
 * - Only parse new logs that haven't been processed yet
 * - Accumulate parsed entries in a stable reference
 */

import { useRef, useMemo } from 'react';
import { parseLogData, type ParsedLogEntry } from '@shared/utils/logFormatter';
import type { LogEntry } from '@shared/api/types';
import type { LLMEngineId } from '@shared/registry';

interface ParseCache {
  /** Last processed log count */
  lastLogCount: number;
  /** Last log ID to detect log replacement */
  lastLogIds: Set<string>;
  /** Accumulated parsed entries (excluding command) */
  parsedEntries: ParsedLogEntry[];
  /** Engine ID used for parsing (to detect changes) */
  engineId?: LLMEngineId;
}

/**
 * Incrementally parse logs, only processing new entries
 *
 * @param logs - Array of log entries
 * @param command - Optional command to show as first entry
 * @param engineId - Optional LLM engine ID for engine-specific parsing (Requirements: 2.2)
 * @returns Parsed log entries
 */
export function useIncrementalLogParser(
  logs: LogEntry[],
  command?: string,
  engineId?: LLMEngineId
): ParsedLogEntry[] {
  const cacheRef = useRef<ParseCache>({
    lastLogCount: 0,
    lastLogIds: new Set(),
    parsedEntries: [],
    engineId: undefined,
  });

  return useMemo(() => {
    const cache = cacheRef.current;
    const currentLogCount = logs.length;

    // Detect if logs were cleared/replaced (not just appended)
    // Check if first few logs are different from cached
    const logsWereReplaced = detectLogReplacement(logs, cache.lastLogIds);

    // Also reset if engineId changed
    const engineIdChanged = cache.engineId !== engineId;

    if (logsWereReplaced || engineIdChanged) {
      // Reset cache and parse all
      cache.lastLogCount = 0;
      cache.lastLogIds = new Set();
      cache.parsedEntries = [];
      cache.engineId = engineId;
    }

    // Parse only new logs (from lastLogCount to current length)
    const newLogs = logs.slice(cache.lastLogCount);

    for (const log of newLogs) {
      const parsed = parseLogEntry(log, engineId);
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
        engineId,
        session: {
          cwd: command,
        },
      });
    }

    entries.push(...cache.parsedEntries);

    return entries;
  }, [logs, command, engineId]);
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
 * @param log - Log entry to parse
 * @param engineId - Optional LLM engine ID for engine-specific parsing
 */
function parseLogEntry(log: LogEntry, engineId?: LLMEngineId): ParsedLogEntry[] {
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
      engineId,
      result: {
        content: log.data,
        isError: true,
      },
    });
    return entries;
  }

  // Parse stdout with engine-specific parser (Requirements: 2.2)
  const parsed = parseLogData(log.data, engineId);

  if (parsed.length === 0 && log.data.trim()) {
    // If no parsed output, show as text
    entries.push({
      id: `${log.id}-raw-${logIdx}`,
      type: 'text',
      engineId,
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
