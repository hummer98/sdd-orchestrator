/**
 * Parser Types
 * Shared type definitions for LLM stream log parsers
 *
 * Task 1.1: ParsedLogEntry type extension and LogStreamParser interface
 * Requirements: 1.3 (extension point), 4.3 (engineId field)
 */

import type { LLMEngineId } from '@shared/registry';

/**
 * Extended ParsedLogEntry with engineId support
 * Requirements: 4.3 - engineId field for UI display name
 *
 * Backward compatible: engineId is optional, existing code continues to work
 */
export interface ParsedLogEntry {
  id: string;
  type: 'system' | 'assistant' | 'tool_use' | 'tool_result' | 'result' | 'text' | 'error' | 'input';
  timestamp?: number;
  /** LLM engine that produced this entry */
  engineId?: LLMEngineId;
  /** System/init session information */
  session?: {
    cwd?: string;
    model?: string;
    version?: string;
  };
  /** Tool use information */
  tool?: {
    name: string;
    toolUseId?: string;
    input?: Record<string, unknown>;
  };
  /** Tool result information */
  toolResult?: {
    toolUseId: string;
    content: string;
    isError: boolean;
  };
  /** Text content (assistant or user) */
  text?: {
    content: string;
    role: 'assistant' | 'user';
  };
  /** Result information */
  result?: {
    content: string;
    isError: boolean;
    costUsd?: number;
    durationMs?: number;
    numTurns?: number;
    inputTokens?: number;
    outputTokens?: number;
  };
}

/**
 * Log stream parser interface for engine-specific implementations
 * Requirements: 1.3 - Extension point for new parser implementations
 *
 * Each LLM engine (Claude, Gemini) implements this interface to provide
 * engine-specific parsing logic while outputting unified ParsedLogEntry format.
 */
export interface LogStreamParser {
  /**
   * Parse a single JSONL line
   * @param jsonLine - A single JSON line from stream output
   * @returns Array of parsed entries (may return 0, 1, or multiple entries)
   */
  parseLine(jsonLine: string): ParsedLogEntry[];

  /**
   * Parse multiple JSONL lines with delta accumulation
   * @param data - Raw data potentially containing multiple JSONL lines
   * @returns Array of parsed entries with delta fragments consolidated
   */
  parseData(data: string): ParsedLogEntry[];
}

/**
 * Delta accumulator for streaming fragment consolidation
 * Requirements: 3.1 - Consolidate delta fragments into single entries
 *
 * Used by parsers to accumulate streaming text fragments (delta: true)
 * and emit consolidated entries when a new message starts or stream ends.
 */
export interface DeltaAccumulator {
  /** ID of the message currently being accumulated, null if none */
  currentMessageId: string | null;
  /** Accumulated content from delta fragments */
  accumulatedContent: string;
  /** Role of the accumulated message */
  role: 'assistant' | 'user';
}
