/**
 * Log Formatter Utility for Remote UI
 * Parses Claude CLI stream-json output and formats it for human-readable display
 * Ported from logFormatter.ts for vanilla JS usage
 */

/**
 * Tool-specific icons
 */
const TOOL_ICONS = {
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

/**
 * Get icon for a tool
 * @param {string} toolName
 * @returns {string}
 */
function getToolIcon(toolName) {
  return TOOL_ICONS[toolName] || '🔧';
}

/**
 * Truncate string to max length
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
function truncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

/**
 * Get first meaningful line from content
 * @param {string} content
 * @param {number} maxLen
 * @returns {string}
 */
function getFirstMeaningfulLine(content, maxLen = 100) {
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

/**
 * Format tool content based on tool type
 * @param {string} name
 * @param {Object} input
 * @returns {string}
 */
function formatToolContent(name, input) {
  switch (name) {
    case 'Read':
    case 'Write':
      return input.file_path || '';
    case 'Edit':
    case 'MultiEdit':
      return input.file_path || '';
    case 'Bash': {
      const cmd = input.command || '';
      const desc = input.description || '';
      if (desc) {
        return desc;
      }
      return truncate(cmd, 80);
    }
    case 'Glob':
      return input.pattern || '';
    case 'Grep':
      return input.pattern || '';
    case 'Task':
      return input.description || '';
    default:
      return formatToolInput(input);
  }
}

/**
 * Format tool input for display
 * @param {Object} input
 * @returns {string}
 */
function formatToolInput(input) {
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
 * Parse a single Claude stream-json line and return formatted output
 * @param {string} jsonLine
 * @returns {Array<{type: string, icon: string, label: string, content: string, details?: string, color: string}>}
 */
function parseClaudeEvent(jsonLine) {
  const lines = [];

  try {
    const event = JSON.parse(jsonLine);

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
        // Cost and duration stats
        const stats = [];
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
    // JSON parse failure: handle incomplete or plain text
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
 * Parse raw log data (may contain multiple JSON lines) and return formatted output
 * @param {string} data
 * @returns {Array}
 */
function formatLogData(data) {
  const lines = [];
  const dataLines = data.split('\n').filter(l => l.trim());

  for (const line of dataLines) {
    lines.push(...parseClaudeEvent(line));
  }

  return lines;
}

/**
 * Get CSS class for log line color
 * @param {string} color
 * @returns {string}
 */
function getColorClass(color) {
  const colorMap = {
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
 * Get background CSS class for log line type
 * @param {string} type
 * @returns {string}
 */
function getBgClass(type) {
  const bgMap = {
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

// Export for browser use
window.LogFormatter = {
  formatLogData,
  parseClaudeEvent,
  getColorClass,
  getBgClass,
};
