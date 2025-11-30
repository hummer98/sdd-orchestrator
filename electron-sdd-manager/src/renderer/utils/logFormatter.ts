/**
 * Log Formatter Utility
 * Parses Claude CLI stream-json output and formats it for human-readable display
 */

// Claude stream-jsonイベントの型定義
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
  text?: string;          // type: "text" の場合のテキスト内容
  tool_use_id?: string;   // type: "tool_result" の場合のツールID
  name?: string;          // type: "tool_use" の場合のツール名
  input?: Record<string, unknown>;  // type: "tool_use" の場合の入力
  content?: string;       // type: "tool_result" の場合の結果
}

export interface FormattedLogLine {
  type: 'system' | 'assistant' | 'tool' | 'tool-result' | 'result' | 'text' | 'error';
  icon: string;
  label: string;
  content: string;
  details?: string;
  color: 'cyan' | 'magenta' | 'yellow' | 'blue' | 'green' | 'red' | 'gray';
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

function getFirstMeaningfulLine(content: string, maxLen: number = 100): string {
  // エスケープされた改行を実際の改行に変換
  const normalized = content.replace(/\\n/g, '\n');
  // 最初の非空行を取得
  const lines = normalized.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.length > 5) {
      return truncate(trimmed, maxLen);
    }
  }
  // 見つからない場合は最初の行
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
 * Parse a single Claude stream-json line and return formatted output
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
              // エスケープされた改行を実際の改行に変換
              const normalizedText = block.text.replace(/\\n/g, '\n');
              // テキストを行ごとに分割
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
                icon: '🔧',
                label: block.name,
                content: block.input ? formatToolInput(block.input) : '',
                color: 'yellow',
              });
            }
          }
        }
        // トークン使用量
        if (event.message?.usage) {
          const { input_tokens, output_tokens } = event.message.usage;
          if (input_tokens || output_tokens) {
            lines.push({
              type: 'system',
              icon: '📊',
              label: 'tokens',
              content: `入力: ${input_tokens || 0}, 出力: ${output_tokens || 0}`,
              color: 'gray',
            });
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
              // ユーザー入力/プロンプトの表示
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
          // 完了ログは常にすべて表示
          lines.push({
            type: 'result',
            icon: '✅',
            label: '完了',
            content: event.result?.replace(/\\n/g, '\n') || '',
            color: 'green',
          });
        }
        // コストと実行時間
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
    // JSONパース失敗時：長いテキストは省略して表示
    const trimmed = jsonLine.trim();
    if (trimmed) {
      // 不完全なJSONの場合、意味のある部分だけ抽出
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        // 不完全なJSONは省略表示
        lines.push({
          type: 'text',
          icon: '📄',
          label: 'データ',
          content: truncate(trimmed.replace(/\\n/g, ' ').replace(/\s+/g, ' '), 100),
          color: 'gray',
        });
      } else {
        // プレーンテキスト：最初の意味のある部分を表示
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
 */
export function formatLogData(data: string): FormattedLogLine[] {
  const lines: FormattedLogLine[] = [];

  // 複数のJSONL行を処理
  const dataLines = data.split('\n').filter(l => l.trim());

  for (const line of dataLines) {
    lines.push(...parseClaudeEvent(line));
  }

  return lines;
}

/**
 * Get CSS class for log line color
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
 * Get background CSS class for log line type
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
  };
  return bgMap[type] || '';
}
