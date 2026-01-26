/**
 * Claude CLI Stream Log Parser
 * Parses Claude CLI stream-json output to ParsedLogEntry format
 *
 * Task 2.1: Claude Parser Implementation
 * Requirements: 1.1 (Claude parser), 1.4 (event types), 5.1 (nested structure)
 */

import type { LogStreamParser, ParsedLogEntry } from './parserTypes';

// Claude stream-json event type definitions
interface ClaudeEvent {
  type: 'system' | 'assistant' | 'user' | 'result';
  subtype?: string;
  session_id?: string;
  cwd?: string;
  version?: string;
  message?: {
    role?: string;
    model?: string;
    content?: ContentBlock[];
    stop_reason?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
    };
  };
  result?: string;
  cost_usd?: number;
  duration_ms?: number;
  is_error?: boolean;
  num_turns?: number;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

interface ContentBlock {
  type: string;
  text?: string;
  id?: string;           // tool_use ID
  tool_use_id?: string;  // tool_result ID reference
  name?: string;         // tool name for tool_use
  input?: Record<string, unknown>;
  content?: string;      // tool_result content
  is_error?: boolean;    // tool_result error flag
}

let idCounter = 0;

function generateId(): string {
  return `claude-${Date.now()}-${++idCounter}`;
}

/**
 * Parse a single Claude stream-json line and return parsed entries
 * Requirements: 1.1, 1.4, 5.1
 */
function parseLine(jsonLine: string): ParsedLogEntry[] {
  const entries: ParsedLogEntry[] = [];

  try {
    const event = JSON.parse(jsonLine) as ClaudeEvent;

    switch (event.type) {
      case 'system':
        if (event.subtype === 'init') {
          entries.push({
            id: generateId(),
            type: 'system',
            timestamp: Date.now(),
            engineId: 'claude',
            session: {
              cwd: event.cwd,
              model: event.message?.model,
              version: event.version,
            },
          });
        }
        break;

      case 'assistant':
        if (event.message?.content) {
          for (const block of event.message.content) {
            if (block.type === 'text' && block.text) {
              // Normalize escaped newlines
              const normalizedText = block.text.replace(/\\n/g, '\n');
              entries.push({
                id: generateId(),
                type: 'text',
                timestamp: Date.now(),
                engineId: 'claude',
                text: {
                  content: normalizedText,
                  role: 'assistant',
                },
              });
            } else if (block.type === 'tool_use' && block.name) {
              entries.push({
                id: generateId(),
                type: 'tool_use',
                timestamp: Date.now(),
                engineId: 'claude',
                tool: {
                  name: block.name,
                  toolUseId: block.id,
                  input: block.input,
                },
              });
            }
          }
        }
        break;

      case 'user':
        if (event.message?.content) {
          for (const block of event.message.content) {
            if (block.tool_use_id && block.type === 'tool_result') {
              entries.push({
                id: generateId(),
                type: 'tool_result',
                timestamp: Date.now(),
                engineId: 'claude',
                toolResult: {
                  toolUseId: block.tool_use_id,
                  content: block.content || '',
                  isError: block.is_error ?? false,
                },
              });
            } else if (block.type === 'text' && block.text) {
              // User input text
              const normalizedText = block.text.replace(/\\n/g, '\n');
              entries.push({
                id: generateId(),
                type: 'input',
                timestamp: Date.now(),
                engineId: 'claude',
                text: {
                  content: normalizedText,
                  role: 'user',
                },
              });
            }
          }
        }
        break;

      case 'result':
        entries.push({
          id: generateId(),
          type: event.is_error ? 'error' : 'result',
          timestamp: Date.now(),
          engineId: 'claude',
          result: {
            content: event.result?.replace(/\\n/g, '\n') || '',
            isError: event.is_error ?? false,
            costUsd: event.cost_usd,
            durationMs: event.duration_ms,
            numTurns: event.num_turns,
            inputTokens: event.usage?.input_tokens,
            outputTokens: event.usage?.output_tokens,
          },
        });
        break;
    }
  } catch {
    // JSON parse failure - handle gracefully
    const trimmed = jsonLine.trim();
    if (trimmed) {
      // Return as text entry for graceful degradation
      entries.push({
        id: generateId(),
        type: 'text',
        timestamp: Date.now(),
        engineId: 'claude',
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
    engineId: 'claude',
    text: {
      content: state.content,
      role: state.role || 'assistant',
    },
  };
}

/**
 * Parse multiple JSONL lines with delta consolidation
 * Requirements: 1.1, 3.1, 3.2
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
 * Claude CLI stream-json parser
 * Implements LogStreamParser interface
 * Requirements: 1.1, 1.4, 5.1
 */
export const claudeParser: LogStreamParser = {
  parseLine,
  parseData,
};

// Re-export types for backward compatibility
export type { ClaudeEvent, ContentBlock };
