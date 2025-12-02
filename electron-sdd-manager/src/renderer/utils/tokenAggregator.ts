/**
 * Token Aggregator
 * Aggregates token usage from log entries
 */

import type { LogEntry } from '../types';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
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
 * Aggregate token usage from log entries
 * Parses Claude stream-json format and sums up token counts
 */
export function aggregateTokens(logs: LogEntry[]): TokenUsage {
  let inputTokens = 0;
  let outputTokens = 0;

  for (const log of logs) {
    // Only process stdout logs
    if (log.stream !== 'stdout') {
      continue;
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
  }

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
  };
}
