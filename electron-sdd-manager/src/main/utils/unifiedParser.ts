/**
 * Unified Parser Facade
 * Task 1.1: Unified Parser Facade implementation
 * Requirements: 1.2, 1.3, 2.2
 *
 * Provides unified interface for parsing LLM-specific log formats
 * into ParsedLogEntry format, with automatic engineId-based parser selection.
 */

import { claudeParser } from '@shared/utils/claudeParser';
import { geminiParser } from '@shared/utils/geminiParser';
import type { LogStreamParser, ParsedLogEntry } from '@shared/utils/parserTypes';
import type { LLMEngineId } from '@shared/registry';

/**
 * Parser registry mapping engineId to parser implementation
 */
const PARSER_REGISTRY: Record<LLMEngineId, LogStreamParser> = {
  claude: claudeParser,
  gemini: geminiParser,
};

/**
 * Default parser when engineId is not specified or invalid
 * Requirement: 1.4 - Fallback to Claude for backward compatibility
 */
const DEFAULT_PARSER: LogStreamParser = claudeParser;

/**
 * Get parser for specified engineId with fallback
 *
 * @param engineId - LLM engine identifier (claude, gemini)
 * @returns LogStreamParser implementation for the engine
 *
 * Requirement: 1.3 - engineId-based parser selection
 * Requirement: 1.4 - Default to Claude when engineId is undefined
 */
function getParser(engineId?: LLMEngineId): LogStreamParser {
  if (!engineId) {
    console.warn('[unifiedParser] engineId not specified, falling back to Claude parser');
    return DEFAULT_PARSER;
  }

  const parser = PARSER_REGISTRY[engineId];
  if (!parser) {
    console.warn(`[unifiedParser] Unknown engineId '${engineId}', falling back to Claude parser`);
    return DEFAULT_PARSER;
  }

  return parser;
}

/**
 * Parse multiple JSONL lines with delta consolidation
 *
 * @param data - Raw data potentially containing multiple JSONL lines
 * @param engineId - LLM engine identifier
 * @returns Array of parsed entries with delta fragments consolidated
 *
 * Requirements:
 * - 1.1: Main process log parsing
 * - 1.3: engineId-based parser selection
 * - 2.1: Delta consolidation
 * - 2.2: Claude/Gemini support
 */
function parseData(data: string, engineId?: LLMEngineId): ParsedLogEntry[] {
  // Handle empty input
  if (!data.trim()) {
    return [];
  }

  const parser = getParser(engineId);

  try {
    return parser.parseData(data);
  } catch (error) {
    console.error('[unifiedParser] Parse failed, returning raw text entry', error);

    // Graceful degradation: return raw text entry
    return [
      {
        id: `unified-error-${Date.now()}`,
        type: 'text',
        timestamp: Date.now(),
        engineId: engineId || 'claude',
        text: {
          content: data.trim(),
          role: 'assistant',
        },
      },
    ];
  }
}

/**
 * Parse a single JSONL line
 *
 * @param line - A single JSON line from stream output
 * @param engineId - LLM engine identifier
 * @returns Array of parsed entries (may return 0, 1, or multiple entries)
 *
 * Requirements:
 * - 1.1: Main process log parsing
 * - 1.3: engineId-based parser selection
 */
function parseLine(line: string, engineId?: LLMEngineId): ParsedLogEntry[] {
  // Handle empty input
  if (!line.trim()) {
    return [];
  }

  const parser = getParser(engineId);

  try {
    return parser.parseLine(line);
  } catch (error) {
    console.error('[unifiedParser] Parse line failed, returning raw text entry', error);

    // Graceful degradation: return raw text entry
    return [
      {
        id: `unified-error-${Date.now()}`,
        type: 'text',
        timestamp: Date.now(),
        engineId: engineId || 'claude',
        text: {
          content: line.trim(),
          role: 'assistant',
        },
      },
    ];
  }
}

/**
 * Unified Parser Facade
 *
 * Implements LogStreamParser interface with automatic engineId-based
 * parser selection and fallback behavior.
 *
 * Requirements:
 * - 1.2: Existing parser reuse
 * - 1.3: engineId-based parser selection
 * - 1.4: Claude fallback for backward compatibility
 * - 2.2: Claude/Gemini support
 */
export const unifiedParser = {
  parseData,
  parseLine,
} as const;

// Export for testing
export { getParser };
