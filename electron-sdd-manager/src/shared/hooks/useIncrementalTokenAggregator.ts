/**
 * useIncrementalTokenAggregator Hook
 *
 * Incrementally aggregates token usage to avoid re-processing all logs on each update.
 * Performance fix: Prevents UI blocking (rainbow spinner) when logs are large.
 *
 * Strategy:
 * - Track the last processed log index
 * - Only extract tokens from new logs
 * - Accumulate token counts incrementally
 */

import { useRef, useMemo } from 'react';
import type { LogEntry } from '@shared/api/types';

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

interface ClaudeEvent {
  type?: string;
  message?: {
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
    };
  };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

/**
 * Incrementally aggregate token usage, only processing new entries
 *
 * @param logs - Array of log entries
 * @param enabled - Whether to calculate tokens (false returns undefined)
 * @returns Token usage or undefined if disabled
 */
export function useIncrementalTokenAggregator(
  logs: LogEntry[],
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
 */
function detectLogReplacement(logs: LogEntry[], cachedLogIds: Set<string>): boolean {
  if (cachedLogIds.size === 0) {
    return false;
  }

  if (logs.length === 0) {
    return true;
  }

  return !cachedLogIds.has(logs[0].id);
}

/**
 * Extract token counts from a single log entry
 */
function extractTokens(log: LogEntry): { inputTokens: number; outputTokens: number } {
  let inputTokens = 0;
  let outputTokens = 0;

  // Only process stdout logs
  if (log.stream !== 'stdout') {
    return { inputTokens, outputTokens };
  }

  // Parse multiple JSON lines
  const lines = log.data.split('\n').filter((l) => l.trim());

  for (const line of lines) {
    try {
      const event = JSON.parse(line) as ClaudeEvent;

      // Check message.usage (assistant type)
      if (event.message?.usage) {
        inputTokens += event.message.usage.input_tokens || 0;
        outputTokens += event.message.usage.output_tokens || 0;
      }

      // Check top-level usage (result type)
      if (event.usage) {
        inputTokens += event.usage.input_tokens || 0;
        outputTokens += event.usage.output_tokens || 0;
      }
    } catch {
      // Ignore invalid JSON
    }
  }

  return { inputTokens, outputTokens };
}
