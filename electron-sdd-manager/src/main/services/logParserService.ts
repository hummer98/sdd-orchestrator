/**
 * LogParserService
 * Parses agent log files to extract result subtype and assistant messages
 * Requirements: 2.1-2.3, 2.5-2.6
 */

import * as fs from 'fs/promises';

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
   * For ImplCompletionAnalyzer input
   *
   * @param logPath - Path to the log file
   * @returns Last assistant message text or error
   */
  async getLastAssistantMessage(logPath: string): Promise<Result<string, ParseError>> {
    const readResult = await this.readLogLines(logPath);
    if (!readResult.ok) {
      return readResult;
    }

    const messages = readResult.value;

    // Find all assistant messages and get the last one
    const assistantMessages = messages.filter(msg => msg.type === 'assistant');

    if (assistantMessages.length === 0) {
      return { ok: false, error: { type: 'NO_ASSISTANT_FOUND' } };
    }

    const lastAssistant = assistantMessages[assistantMessages.length - 1];

    // Extract text content from the message
    const text = this.extractTextFromMessage(lastAssistant.message);

    return { ok: true, value: text };
  }

  /**
   * Extract text content from an assistant message
   * Handles various message formats
   */
  private extractTextFromMessage(message: unknown): string {
    if (typeof message === 'string') {
      return message;
    }

    if (typeof message === 'object' && message !== null) {
      const msgObj = message as Record<string, unknown>;

      // Handle { content: [...] } format
      if (Array.isArray(msgObj.content)) {
        const textParts: string[] = [];
        for (const part of msgObj.content) {
          if (typeof part === 'object' && part !== null) {
            const partObj = part as Record<string, unknown>;
            if (partObj.type === 'text' && typeof partObj.text === 'string') {
              textParts.push(partObj.text);
            }
          } else if (typeof part === 'string') {
            textParts.push(part);
          }
        }
        return textParts.join('\n');
      }

      // Handle direct text field
      if (typeof msgObj.text === 'string') {
        return msgObj.text;
      }
    }

    // Fallback: stringify the message
    return JSON.stringify(message);
  }
}
