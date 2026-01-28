/**
 * Gemini CLI Stream Log Parser
 * Parses Gemini CLI stream-json output to ParsedLogEntry format
 *
 * Task 3.1: Gemini Parser Implementation
 * Requirements: 1.2 (Gemini parser), 1.4 (event types), 5.2 (flat structure),
 *               5.3 (field mapping), 5.4 (init event), 5.5 (stats extraction)
 */

import type { LogStreamParser, ParsedLogEntry } from './parserTypes';

/**
 * Gemini event type definitions
 * Requirements: 5.2
 */
interface GeminiEvent {
  type: 'init' | 'message' | 'tool_use' | 'tool_result' | 'error' | 'result';
  timestamp?: string;
  session_id?: string;
  model?: string;
  cwd?: string;
  role?: 'user' | 'assistant';
  content?: string;
  delta?: boolean;
  tool_name?: string;
  tool_id?: string;
  parameters?: Record<string, unknown>;
  output?: string;
  status?: string;
  message?: string;
  stats?: {
    total_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
    duration_ms?: number;
    tool_calls?: number;
  };
}

let idCounter = 0;

function generateId(): string {
  return `gemini-${Date.now()}-${++idCounter}`;
}

/**
 * Parse a single Gemini stream-json line and return parsed entries
 * Requirements: 1.2, 1.4, 5.2, 5.3, 5.4, 5.5
 */
function parseLine(jsonLine: string): ParsedLogEntry[] {
  const entries: ParsedLogEntry[] = [];

  try {
    const event = JSON.parse(jsonLine) as GeminiEvent;

    switch (event.type) {
      case 'init':
        // Requirements: 5.4 - Map init to system type
        entries.push({
          id: generateId(),
          type: 'system',
          timestamp: Date.now(),
          engineId: 'gemini',
          session: {
            cwd: event.cwd,
            model: event.model,
            sessionId: event.session_id,
          },
        });
        break;

      case 'message':
        // Requirements: 5.2 - Handle flat structure
        if (event.content !== undefined) {
          const isUser = event.role === 'user';
          entries.push({
            id: generateId(),
            type: isUser ? 'input' : 'text',
            timestamp: Date.now(),
            engineId: 'gemini',
            text: {
              content: event.content,
              role: event.role || 'assistant',
            },
          });
        }
        break;

      case 'tool_use':
        // Requirements: 5.3 - Field mapping
        // tool_name -> name, tool_id -> toolUseId, parameters -> input
        entries.push({
          id: generateId(),
          type: 'tool_use',
          timestamp: Date.now(),
          engineId: 'gemini',
          tool: {
            name: event.tool_name || '',
            toolUseId: event.tool_id,
            input: event.parameters,
          },
        });
        break;

      case 'tool_result':
        // Requirements: 5.3 - Field mapping
        // tool_id -> toolUseId, output -> content
        entries.push({
          id: generateId(),
          type: 'tool_result',
          timestamp: Date.now(),
          engineId: 'gemini',
          toolResult: {
            toolUseId: event.tool_id || '',
            content: event.output || '',
            isError: event.status === 'error',
          },
        });
        break;

      case 'error':
        // Error event
        entries.push({
          id: generateId(),
          type: 'error',
          timestamp: Date.now(),
          engineId: 'gemini',
          result: {
            content: event.message || '',
            isError: true,
          },
        });
        break;

      case 'result':
        // Requirements: 5.5 - Stats extraction
        const isError = event.status === 'error';
        entries.push({
          id: generateId(),
          type: isError ? 'error' : 'result',
          timestamp: Date.now(),
          engineId: 'gemini',
          result: {
            content: event.message || '',
            isError,
            inputTokens: event.stats?.input_tokens,
            outputTokens: event.stats?.output_tokens,
            durationMs: event.stats?.duration_ms,
          },
        });
        break;
    }
  } catch {
    // JSON parse failure - handle gracefully
    const trimmed = jsonLine.trim();
    if (trimmed) {
      entries.push({
        id: generateId(),
        type: 'text',
        timestamp: Date.now(),
        engineId: 'gemini',
        text: {
          content: trimmed,
          role: 'assistant',
        },
      });
    }
  }

  return entries;
}

/**
 * Delta accumulator state for text consolidation
 * Requirements: 3.1
 */
interface DeltaState {
  role: 'assistant' | 'user' | null;
  content: string;
  id: string | null;
  timestamp: number | null;
}

/**
 * Create a text entry from accumulated delta state
 */
function createTextEntry(state: DeltaState): ParsedLogEntry {
  return {
    id: state.id || generateId(),
    type: state.role === 'user' ? 'input' : 'text',
    timestamp: state.timestamp || Date.now(),
    engineId: 'gemini',
    text: {
      content: state.content,
      role: state.role || 'assistant',
    },
  };
}

/**
 * Parse multiple JSONL lines with delta consolidation
 * Requirements: 1.2, 3.1, 3.2
 */
function parseData(data: string): ParsedLogEntry[] {
  const finalEntries: ParsedLogEntry[] = [];

  // Handle multiple JSONL lines
  const dataLines = data.split('\n').filter((l) => l.trim());

  // Delta accumulator for consolidating consecutive text messages
  const deltaState: DeltaState = {
    role: null,
    content: '',
    id: null,
    timestamp: null,
  };

  /**
   * Flush accumulated text to final entries if any exists
   */
  function flushDelta(): void {
    if (deltaState.content && deltaState.role) {
      finalEntries.push(createTextEntry(deltaState));
      // Reset state
      deltaState.role = null;
      deltaState.content = '';
      deltaState.id = null;
      deltaState.timestamp = null;
    }
  }

  for (const line of dataLines) {
    const lineEntries = parseLine(line);

    for (const entry of lineEntries) {
      // Check if this is a text entry that can be accumulated
      if ((entry.type === 'text' || entry.type === 'input') && entry.text) {
        const entryRole = entry.text.role;

        // If role matches current accumulator, append
        if (deltaState.role === entryRole) {
          deltaState.content += entry.text.content;
        } else {
          // Role changed - flush previous and start new accumulation
          flushDelta();
          deltaState.role = entryRole;
          deltaState.content = entry.text.content;
          deltaState.id = entry.id;
          deltaState.timestamp = entry.timestamp ?? null;
        }
      } else {
        // Non-text entry - flush accumulated text and add this entry
        flushDelta();
        finalEntries.push(entry);
      }
    }
  }

  // Flush any remaining accumulated text
  flushDelta();

  return finalEntries;
}

/**
 * Gemini CLI stream-json parser
 * Implements LogStreamParser interface
 * Requirements: 1.2, 1.4, 5.2, 5.3, 5.4, 5.5
 */
export const geminiParser: LogStreamParser = {
  parseLine,
  parseData,
};

// Re-export types
export type { GeminiEvent };
