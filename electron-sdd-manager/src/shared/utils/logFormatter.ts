/**
 * Log Formatter Utility
 * Parses Claude CLI stream-json output and formats it for structured display
 *
 * Task 1.1: Move to shared/utils and extend ParsedLogEntry type
 * Requirements: 1.3, 4.3 (no truncate)
 */

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

/**
 * Parsed log entry type for structured rendering
 * Requirements: 1.3 - Extended type definition for session/tool/toolResult/text/result
 */
export interface ParsedLogEntry {
  id: string;
  type: 'system' | 'assistant' | 'tool_use' | 'tool_result' | 'result' | 'text' | 'error' | 'input';
  timestamp?: number;
  // system/init
  session?: {
    cwd?: string;
    model?: string;
    version?: string;
  };
  // tool_use
  tool?: {
    name: string;
    toolUseId?: string;
    input?: Record<string, unknown>;
  };
  // tool_result
  toolResult?: {
    toolUseId: string;
    content: string;
    isError: boolean;
  };
  // text (assistant/user)
  text?: {
    content: string;
    role: 'assistant' | 'user';
  };
  // result
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

let idCounter = 0;

function generateId(): string {
  return `log-${Date.now()}-${++idCounter}`;
}

/**
 * Parse a single Claude stream-json line and return parsed entries
 */
function parseClaudeEvent(jsonLine: string): ParsedLogEntry[] {
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
              // Text content - no truncation (Requirement 4.3)
              const normalizedText = block.text.replace(/\\n/g, '\n');
              entries.push({
                id: generateId(),
                type: 'text',
                timestamp: Date.now(),
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
 * Parse raw log data (may contain multiple JSON lines) and return parsed entries
 * Requirements: 1.3 - Maintains parse functionality
 */
export function parseLogData(data: string): ParsedLogEntry[] {
  const entries: ParsedLogEntry[] = [];

  // Handle multiple JSONL lines
  const dataLines = data.split('\n').filter((l) => l.trim());

  for (const line of dataLines) {
    entries.push(...parseClaudeEvent(line));
  }

  return entries;
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

// Re-export for backward compatibility
export type { ClaudeEvent, ContentBlock };
