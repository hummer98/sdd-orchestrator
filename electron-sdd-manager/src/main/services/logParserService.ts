/**
 * LogParserService
 * Parses agent log files to extract result subtype and assistant messages
 * Requirements: 2.1-2.3, 2.5-2.6
 * main-process-log-parser Task 10.6: Unified parser integration for multi-engine support
 */

import * as fs from 'fs/promises';
import { unifiedParser } from '../utils/unifiedParser';
import type { ParsedLogEntry } from '@shared/utils/parserTypes';
import type { LLMEngineId } from '@shared/registry';

/**
 * Result subtype from log analysis
 * - success: Agent completed successfully
 * - error_max_turns: Agent reached maximum turn limit
 * - error_during_execution: Agent encountered an error during execution
 * - no_result: No result line found in log
 */
export type ResultSubtype =
  | 'success'
  | 'error_max_turns'
  | 'error_during_execution'
  | 'no_result';

/**
 * Parse error types
 */
export type ParseError =
  | { type: 'NO_RESULT_FOUND' }
  | { type: 'NO_ASSISTANT_FOUND' }
  | { type: 'FILE_READ_ERROR'; message: string };

/**
 * Result type for error handling
 */
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Log entry wrapper structure (outer JSON)
 */
interface LogWrapper {
  timestamp: string;
  stream: 'stdout' | 'stderr';
  data: string;
}

/**
 * Agent message structure (inner JSON)
 */
interface AgentMessage {
  type: string;
  subtype?: string;
  is_error?: boolean;
  message?: unknown;
  [key: string]: unknown;
}

/**
 * Service for parsing agent log files
 */
export class LogParserService {
  /**
   * Parse a single log line into an AgentMessage
   * Handles the double-JSON structure (wrapper + data)
   */
  private parseLogLine(line: string): AgentMessage | null {
    if (!line.trim()) return null;

    try {
      const wrapper: LogWrapper = JSON.parse(line);
      const message: AgentMessage = JSON.parse(wrapper.data);
      return message;
    } catch {
      // Not valid JSON, skip this line
      return null;
    }
  }

  /**
   * Read and parse all lines from a log file
   */
  private async readLogLines(logPath: string): Promise<Result<AgentMessage[], ParseError>> {
    try {
      const content = await fs.readFile(logPath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim() !== '');
      const messages: AgentMessage[] = [];

      for (const line of lines) {
        const message = this.parseLogLine(line);
        if (message) {
          messages.push(message);
        }
      }

      return { ok: true, value: messages };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'FILE_READ_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Parse result subtype from log file
   * Requirements: 2.1-2.3, 2.5-2.6
   *
   * @param logPath - Path to the log file
   * @returns Result subtype or error
   */
  async parseResultSubtype(logPath: string): Promise<Result<ResultSubtype, ParseError>> {
    const readResult = await this.readLogLines(logPath);
    if (!readResult.ok) {
      return readResult;
    }

    const messages = readResult.value;

    // Find the result line
    const resultMessage = messages.find(msg => msg.type === 'result');

    if (!resultMessage) {
      return { ok: true, value: 'no_result' };
    }

    // Determine subtype
    if (resultMessage.subtype) {
      // Valid subtypes
      const validSubtypes: ResultSubtype[] = ['success', 'error_max_turns', 'error_during_execution'];
      if (validSubtypes.includes(resultMessage.subtype as ResultSubtype)) {
        return { ok: true, value: resultMessage.subtype as ResultSubtype };
      }
    }

    // Fallback: use is_error field
    if (resultMessage.is_error) {
      return { ok: true, value: 'error_during_execution' };
    }

    return { ok: true, value: 'success' };
  }

  /**
   * Get the result line as a JSON string
   * For ImplCompletionAnalyzer input
   *
   * @param logPath - Path to the log file
   * @returns Result line JSON string or error
   */
  async getResultLine(logPath: string): Promise<Result<string, ParseError>> {
    const readResult = await this.readLogLines(logPath);
    if (!readResult.ok) {
      return readResult;
    }

    const messages = readResult.value;

    // Find the result line
    const resultMessage = messages.find(msg => msg.type === 'result');

    if (!resultMessage) {
      return { ok: false, error: { type: 'NO_RESULT_FOUND' } };
    }

    return { ok: true, value: JSON.stringify(resultMessage) };
  }

  /**
   * Get the last assistant message from the log
   * main-process-log-parser Task 10.6: Uses unified parser for multi-engine support
   *
   * The method collects all consecutive text entries from the last assistant "turn"
   * and combines them into a single string. This preserves the original behavior where
   * an assistant message with multiple text parts is returned as a combined string.
   *
   * @param logPath - Path to the log file
   * @param engineId - Optional engine ID (defaults to auto-detection or Claude)
   * @returns Last assistant message text or error
   */
  async getLastAssistantMessage(logPath: string, engineId?: LLMEngineId): Promise<Result<string, ParseError>> {
    const parsedResult = await this.readAndParseLogFile(logPath, engineId);
    if (!parsedResult.ok) {
      return parsedResult;
    }

    const parsedEntries = parsedResult.value;

    // Find all text entries with role='assistant'
    const assistantTextIndices: number[] = [];
    parsedEntries.forEach((entry, index) => {
      if (entry.type === 'text' && entry.text?.role === 'assistant') {
        assistantTextIndices.push(index);
      }
    });

    if (assistantTextIndices.length === 0) {
      return { ok: false, error: { type: 'NO_ASSISTANT_FOUND' } };
    }

    // Find the last "group" of consecutive assistant text entries
    // A group is considered to be from the same assistant message turn
    const groupTexts: string[] = [];

    // Walk backwards from the last assistant entry to collect consecutive entries
    for (let i = assistantTextIndices.length - 1; i >= 0; i--) {
      const idx = assistantTextIndices[i];
      // Check if this entry is part of the same group (consecutive or nearly consecutive)
      // For simplicity, we collect all entries from the last continuous block
      if (i === assistantTextIndices.length - 1 || assistantTextIndices[i + 1] - idx <= 1) {
        groupTexts.unshift(parsedEntries[idx].text?.content || '');
      } else {
        // Non-consecutive, we've collected the last group
        break;
      }
    }

    // Return combined text from the last group
    return { ok: true, value: groupTexts.join('\n') };
  }

  /**
   * Read log file and parse with unified parser
   * main-process-log-parser Task 10.6: Engine-agnostic log parsing
   *
   * @param logPath - Path to the log file
   * @param engineId - Optional engine ID (defaults to auto-detection or Claude)
   * @returns Parsed log entries or error
   */
  private async readAndParseLogFile(logPath: string, engineId?: LLMEngineId): Promise<Result<ParsedLogEntry[], ParseError>> {
    try {
      const content = await fs.readFile(logPath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim() !== '');
      const parsedEntries: ParsedLogEntry[] = [];

      // Detect engineId from first system entry if not provided
      let detectedEngineId = engineId;

      for (const line of lines) {
        try {
          // Parse the wrapper JSON
          const wrapper: LogWrapper = JSON.parse(line);

          // Skip stderr (only parse stdout for assistant messages)
          if (wrapper.stream === 'stderr') continue;

          // Parse the inner data with unified parser
          const entries = unifiedParser.parseLine(wrapper.data, detectedEngineId);

          // If we found a system entry and haven't detected engineId yet, use it
          if (!detectedEngineId && entries.length > 0) {
            const systemEntry = entries.find(e => e.type === 'system');
            if (systemEntry?.engineId) {
              detectedEngineId = systemEntry.engineId;
            }
          }

          parsedEntries.push(...entries);
        } catch {
          // Not valid JSON, skip this line
        }
      }

      return { ok: true, value: parsedEntries };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'FILE_READ_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  // main-process-log-parser Task 10.6: extractTextFromMessage removed
  // Text extraction is now handled by the unified parser (ParsedLogEntry.text.content)
}
