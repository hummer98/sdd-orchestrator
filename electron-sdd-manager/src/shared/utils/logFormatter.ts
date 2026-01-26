/**
 * Log Formatter Utility
 * Facade for engine-specific stream log parsers
 *
 * Task 4.1: Facade pattern with engineId-based parser selection
 * Requirements: 2.2 (engineId selection), 2.3 (fallback to Claude)
 */

import type { LLMEngineId } from '@shared/registry';
import { claudeParser } from './claudeParser';
import { geminiParser } from './geminiParser';
import type { ParsedLogEntry, LogStreamParser } from './parserTypes';

// Re-export ParsedLogEntry from parserTypes for backward compatibility
export type { ParsedLogEntry } from './parserTypes';

/**
 * Get the appropriate parser for the given engine ID
 * Requirements: 2.2, 2.3
 * @param engineId - LLM engine ID (defaults to 'claude' for backward compatibility)
 */
function getParser(engineId?: LLMEngineId): LogStreamParser {
  switch (engineId) {
    case 'gemini':
      return geminiParser;
    case 'claude':
    default:
      // Requirements: 2.3 - Default to Claude parser for backward compatibility
      return claudeParser;
  }
}

/**
 * Parse raw log data with engine-specific parser
 * Requirements: 2.2 (engineId selection), 2.3 (fallback)
 *
 * @param data - Raw JSONL data
 * @param engineId - LLM engine ID (defaults to 'claude' for backward compatibility)
 * @returns Array of parsed log entries
 */
export function parseLogData(data: string, engineId?: LLMEngineId): ParsedLogEntry[] {
  const parser = getParser(engineId);
  return parser.parseData(data);
}

/**
 * Get CSS class for entry type (theme-aware)
 * Requirements: 7.1, 7.2, 7.3 - Dark/Light theme support with proper contrast
 */
export function getColorClass(
  type: ParsedLogEntry['type'],
  variant: 'text' | 'bg' | 'border' = 'text'
): string {
  const colorMap: Record<ParsedLogEntry['type'], { text: string; bg: string; border: string }> = {
    system: {
      text: 'text-cyan-600 dark:text-cyan-400',
      bg: 'bg-cyan-50 dark:bg-cyan-900/20',
      border: 'border-cyan-200 dark:border-cyan-700',
    },
    assistant: {
      text: 'text-fuchsia-600 dark:text-fuchsia-400',
      bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/20',
      border: 'border-fuchsia-200 dark:border-fuchsia-700',
    },
    tool_use: {
      text: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-700',
    },
    tool_result: {
      text: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-700',
    },
    result: {
      text: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-700',
    },
    text: {
      text: 'text-fuchsia-600 dark:text-fuchsia-400',
      bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/10',
      border: 'border-fuchsia-200 dark:border-fuchsia-700',
    },
    error: {
      text: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-700',
    },
    input: {
      text: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-700',
    },
  };

  const colors = colorMap[type] || colorMap.text;
  return colors[variant];
}

// Re-export types from claudeParser for backward compatibility
export type { ClaudeEvent, ContentBlock } from './claudeParser';
