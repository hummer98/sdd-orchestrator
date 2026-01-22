/**
 * Log Formatter Utility
 * Re-exports from shared/utils/logFormatter for backward compatibility
 *
 * Task 1.1: logFormatterをsrc/shared/utils/へ移動
 * Requirements: 1.3
 */

// Re-export new API from shared
export {
  parseLogData,
  getColorClass as getColorClassNew,
  type ParsedLogEntry,
} from '@shared/utils/logFormatter';

// =============================================================================
// Legacy API (kept for backward compatibility with AgentLogPanel)
// =============================================================================

export interface FormattedLogLine {
  type: 'system' | 'assistant' | 'tool' | 'tool-result' | 'result' | 'text' | 'error' | 'input';
  icon: string;
  label: string;
  content: string;
  details?: string;
  color: 'cyan' | 'magenta' | 'yellow' | 'blue' | 'green' | 'red' | 'gray';
}

// Claude stream-json event types for legacy API
interface ClaudeEvent {
  type: 'system' | 'assistant' | 'user' | 'result';
  subtype?: string;
  session_id?: string;
  cwd?: string;
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
}

interface ContentBlock {
  type: string;
  text?: string;
  tool_use_id?: string;
  name?: string;
  input?: Record<string, unknown>;
  content?: string;
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

const TOOL_ICONS: Record<string, string> = {
  Read: '📖',
  Edit: '✏️',
  Write: '📝',
  MultiEdit: '✏️',
  Bash: '💻',
  Glob: '🔍',
  Grep: '🔎',
  Task: '📋',
  TaskOutput: '📋',
  WebFetch: '🌐',
  WebSearch: '🔎',
  TodoWrite: '✅',
  NotebookEdit: '📓',
};

function getToolIcon(toolName: string): string {
  return TOOL_ICONS[toolName] || '🔧';
}

function formatToolContent(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case 'Read':
    case 'Write':
      return (input.file_path as string) || '';
    case 'Edit':
    case 'MultiEdit':
      return (input.file_path as string) || '';
    case 'Bash': {
      const cmd = (input.command as string) || '';
      const desc = (input.description as string) || '';
      if (desc) {
        return `${desc}`;
      }
      return truncate(cmd, 80);
    }
    case 'Glob':
      return (input.pattern as string) || '';
    case 'Grep':
      return (input.pattern as string) || '';
    case 'Task':
      return (input.description as string) || '';
    default:
      return formatToolInput(input);
  }
}

function getFirstMeaningfulLine(content: string, maxLen: number = 100): string {
  const normalized = content.replace(/\\n/g, '\n');
  const lines = normalized.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.length > 5) {
      return truncate(trimmed, maxLen);
    }
  }
  return truncate(lines[0] || '', maxLen);
}

function formatToolInput(input: Record<string, unknown>): string {
  const keys = Object.keys(input);
  if (keys.length === 0) return '';

  return keys.map(k => {
    const v = input[k];
    if (typeof v === 'string') {
      return `${k}="${truncate(v, 40)}"`;
    }
    if (Array.isArray(v)) {
      return `${k}=[${v.length} items]`;
    }
    if (typeof v === 'object' && v !== null) {
      return `${k}={...}`;
    }
    return `${k}=${String(v)}`;
  }).join(', ');
}

/**
 * Parse a single Claude stream-json line (legacy API)
 * @deprecated Use parseLogData from @shared/utils/logFormatter instead
 */
export function parseClaudeEvent(jsonLine: string): FormattedLogLine[] {
  const lines: FormattedLogLine[] = [];

  try {
    const event = JSON.parse(jsonLine) as ClaudeEvent;

    switch (event.type) {
      case 'system':
        if (event.subtype === 'init') {
          lines.push({
            type: 'system',
            icon: '🚀',
            label: 'セッション開始',
            content: event.cwd ? `作業ディレクトリ: ${event.cwd}` : '',
            color: 'cyan',
          });
        }
        break;

      case 'assistant':
        if (event.message?.content) {
          for (const block of event.message.content) {
            if (block.type === 'text' && block.text) {
              const normalizedText = block.text.replace(/\\n/g, '\n');
              const textLines = normalizedText.split('\n');
              const maxLines = Math.min(15, textLines.length);

              lines.push({
                type: 'assistant',
                icon: '🤖',
                label: 'Claude',
                content: textLines.slice(0, maxLines).join('\n'),
                details: textLines.length > maxLines ? `(+${textLines.length - maxLines} 行)` : undefined,
                color: 'magenta',
              });
            } else if (block.type === 'tool_use' && block.name) {
              lines.push({
                type: 'tool',
                icon: getToolIcon(block.name),
                label: block.name,
                content: block.input ? formatToolContent(block.name, block.input) : '',
                color: 'yellow',
              });
            }
          }
        }
        break;

      case 'user':
        if (event.message?.content) {
          for (const block of event.message.content) {
            if (block.tool_use_id && block.type === 'tool_result') {
              const content = block.content;
              let preview = '';
              if (typeof content === 'string') {
                preview = getFirstMeaningfulLine(content, 100);
              }
              lines.push({
                type: 'tool-result',
                icon: '📤',
                label: 'ツール結果',
                content: preview || '(結果あり)',
                color: 'blue',
              });
            } else if (block.type === 'text' && block.text) {
              const normalizedText = block.text.replace(/\\n/g, '\n');
              const textLines = normalizedText.split('\n');
              const maxLines = Math.min(10, textLines.length);
              lines.push({
                type: 'system',
                icon: '📝',
                label: 'プロンプト',
                content: textLines.slice(0, maxLines).join('\n'),
                details: textLines.length > maxLines ? `(+${textLines.length - maxLines} 行)` : undefined,
                color: 'cyan',
              });
            }
          }
        }
        break;

      case 'result':
        if (event.is_error) {
          lines.push({
            type: 'error',
            icon: '❌',
            label: 'エラー',
            content: event.result?.replace(/\\n/g, '\n') || '',
            color: 'red',
          });
        } else {
          lines.push({
            type: 'result',
            icon: '✅',
            label: '完了',
            content: event.result?.replace(/\\n/g, '\n') || '',
            color: 'green',
          });
        }
        const stats: string[] = [];
        if (event.cost_usd !== undefined) {
          stats.push(`💰 $${event.cost_usd.toFixed(4)}`);
        }
        if (event.duration_ms !== undefined) {
          stats.push(`⏱️ ${(event.duration_ms / 1000).toFixed(1)}秒`);
        }
        if (event.num_turns !== undefined) {
          stats.push(`🔄 ${event.num_turns}ターン`);
        }
        if (stats.length > 0) {
          lines.push({
            type: 'system',
            icon: '📈',
            label: '統計',
            content: stats.join('  '),
            color: 'gray',
          });
        }
        break;
    }
  } catch {
    const trimmed = jsonLine.trim();
    if (trimmed) {
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const toolResultMatch = trimmed.match(/"type"\s*:\s*"tool_result"/);
        if (toolResultMatch) {
          const fileMatch = trimmed.match(/"filePath"\s*:\s*"([^"]+)"/);
          const fileName = fileMatch ? fileMatch[1].split('/').pop() : null;
          lines.push({
            type: 'tool-result',
            icon: '📤',
            label: 'ツール結果',
            content: fileName ? `${fileName} の内容` : '(結果あり)',
            color: 'blue',
          });
        } else {
          lines.push({
            type: 'text',
            icon: '📄',
            label: 'データ',
            content: truncate(trimmed.replace(/\\n/g, ' ').replace(/\s+/g, ' '), 100),
            color: 'gray',
          });
        }
      } else {
        const preview = getFirstMeaningfulLine(trimmed, 100);
        if (preview) {
          lines.push({
            type: 'text',
            icon: '📝',
            label: '',
            content: preview,
            color: 'gray',
          });
        }
      }
    }
  }

  return lines;
}

/**
 * Parse raw log data (legacy API)
 * @deprecated Use parseLogData from @shared/utils/logFormatter instead
 */
export function formatLogData(data: string): FormattedLogLine[] {
  const lines: FormattedLogLine[] = [];
  const dataLines = data.split('\n').filter(l => l.trim());

  for (const line of dataLines) {
    lines.push(...parseClaudeEvent(line));
  }

  return lines;
}

/**
 * Get CSS class for log line color (legacy API)
 * @deprecated Use getColorClass from @shared/utils/logFormatter instead
 */
export function getColorClass(color: FormattedLogLine['color']): string {
  const colorMap: Record<FormattedLogLine['color'], string> = {
    cyan: 'text-cyan-400',
    magenta: 'text-fuchsia-400',
    yellow: 'text-yellow-400',
    blue: 'text-blue-400',
    green: 'text-green-400',
    red: 'text-red-400',
    gray: 'text-gray-500',
  };
  return colorMap[color] || 'text-gray-300';
}

/**
 * Get background CSS class for log line type (legacy API)
 */
export function getBgClass(type: FormattedLogLine['type']): string {
  const bgMap: Record<FormattedLogLine['type'], string> = {
    system: '',
    assistant: 'bg-fuchsia-900/10',
    tool: 'bg-yellow-900/10',
    'tool-result': 'bg-blue-900/10',
    result: 'bg-green-900/10',
    text: '',
    error: 'bg-red-900/20',
    input: 'bg-blue-900/20',
  };
  return bgMap[type] || '';
}
