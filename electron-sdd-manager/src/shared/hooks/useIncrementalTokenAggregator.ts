/**
 * useIncrementalTokenAggregator Hook
 *
 * Incrementally aggregates token usage to avoid re-processing all logs on each update.
 * Performance fix: Prevents UI blocking (rainbow spinner) when logs are large.
 *
 * main-process-log-parser Task 10.9: Updated to work with ParsedLogEntry[]
 * Logs are now pre-parsed by Main process, so token data is in the usage field.
 *
 * Strategy:
 * - Track the last processed log index
 * - Only extract tokens from new logs
 * - Accumulate token counts incrementally
 */

import { useRef, useMemo } from 'react';
// main-process-log-parser Task 10.9: Changed LogEntry to ParsedLogEntry
import type { ParsedLogEntry } from '@shared/api/types';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

interface TokenCache {
  /** Last processed log count */
  lastLogCount: number;
  /** Last log ID to detect log replacement */
  lastLogIds: Set<string>;
  /** Accumulated input tokens */
  inputTokens: number;
  /** Accumulated output tokens */
  outputTokens: number;
}

/**
 * Incrementally aggregate token usage, only processing new entries
 *
 * main-process-log-parser Task 10.9: Updated to work with ParsedLogEntry[]
 *
 * @param logs - Array of pre-parsed log entries
 * @param enabled - Whether to calculate tokens (false returns undefined)
 * @returns Token usage or undefined if disabled
 */
export function useIncrementalTokenAggregator(
  logs: ParsedLogEntry[],
  enabled: boolean = true
): TokenUsage | undefined {
  const cacheRef = useRef<TokenCache>({
    lastLogCount: 0,
    lastLogIds: new Set(),
    inputTokens: 0,
    outputTokens: 0,
  });

  return useMemo(() => {
    if (!enabled) {
      return undefined;
    }

    const cache = cacheRef.current;
    const currentLogCount = logs.length;

    // Detect if logs were cleared/replaced
    const logsWereReplaced = detectLogReplacement(logs, cache.lastLogIds);

    if (logsWereReplaced) {
      // Reset cache
      cache.lastLogCount = 0;
      cache.lastLogIds = new Set();
      cache.inputTokens = 0;
      cache.outputTokens = 0;
    }

    // Process only new logs
    const newLogs = logs.slice(cache.lastLogCount);

    for (const log of newLogs) {
      const tokens = extractTokens(log);
      cache.inputTokens += tokens.inputTokens;
      cache.outputTokens += tokens.outputTokens;
      cache.lastLogIds.add(log.id);
    }

    // Update cache
    cache.lastLogCount = currentLogCount;

    return {
      inputTokens: cache.inputTokens,
      outputTokens: cache.outputTokens,
      totalTokens: cache.inputTokens + cache.outputTokens,
    };
  }, [logs, enabled]);
}

/**
 * Detect if logs were replaced (not just appended)
 * main-process-log-parser Task 10.9: Updated to work with ParsedLogEntry[]
 */
function detectLogReplacement(logs: ParsedLogEntry[], cachedLogIds: Set<string>): boolean {
  if (cachedLogIds.size === 0) {
    return false;
  }

  if (logs.length === 0) {
    return true;
  }

  return !cachedLogIds.has(logs[0].id);
}

/**
 * Extract token counts from a single pre-parsed log entry
 * main-process-log-parser Task 10.9: Updated to extract from ParsedLogEntry.result
 */
function extractTokens(log: ParsedLogEntry): { inputTokens: number; outputTokens: number } {
  // Token usage is now in the pre-parsed entry's result field
  // Only 'result' type entries have token usage
  if (log.type === 'result' && log.result) {
    return {
      inputTokens: log.result.inputTokens ?? 0,
      outputTokens: log.result.outputTokens ?? 0,
    };
  }

  return { inputTokens: 0, outputTokens: 0 };
}
