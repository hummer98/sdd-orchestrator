#!/usr/bin/env npx ts-node
/**
 * Agent出力ログフォーマッター
 * Claude CLIのstream-json出力を人間が読みやすい形式に変換
 *
 * Usage:
 *   npx ts-node scripts/format-logs.ts                  # agent-output.jsonlを表示
 *   npx ts-node scripts/format-logs.ts -n 100          # 最後の100行
 *   npx ts-node scripts/format-logs.ts -a              # 全て
 *   npx ts-node scripts/format-logs.ts -f logs/main.log # 別のファイル
 */

import * as fs from 'fs';
import * as readline from 'readline';

// ANSIカラーコード
const c = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
};

// Agent出力ログエントリ
interface AgentLogEntry {
  timestamp: string;
  agentId: string;
  stream: 'stdout' | 'stderr';
  data: string;
}

// Claude stream-jsonイベント
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
}

interface ContentBlock {
  type: string;
  text?: string;
  tool_use_id?: string;
  name?: string;
  input?: Record<string, unknown>;
  content?: string;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

function formatClaudeEvent(event: ClaudeEvent, verbose: boolean): string[] {
  const lines: string[] = [];

  switch (event.type) {
    case 'system':
      if (event.subtype === 'init') {
        lines.push(`${c.cyan}${c.bright}━━━ セッション開始 ━━━${c.reset}`);
        if (event.cwd) {
          lines.push(`${c.dim}📁 ${event.cwd}${c.reset}`);
        }
        if (event.session_id) {
          lines.push(`${c.dim}🔑 セッション: ${event.session_id.substring(0, 16)}...${c.reset}`);
        }
      }
      break;

    case 'assistant':
      if (event.message?.content) {
        for (const block of event.message.content) {
          if (block.type === 'text' && block.text) {
            lines.push(`${c.magenta}${c.bright}🤖 Claude:${c.reset}`);
            const text = block.text.replace(/\\n/g, '\n');
            const textLines = text.split('\n');
            const maxLines = verbose ? textLines.length : Math.min(15, textLines.length);
            for (let i = 0; i < maxLines; i++) {
              lines.push(`   ${textLines[i]}`);
            }
            if (!verbose && textLines.length > 15) {
              lines.push(`   ${c.dim}... (+${textLines.length - 15} 行)${c.reset}`);
            }
          } else if (block.type === 'tool_use' && block.name) {
            lines.push(`${c.yellow}${c.bright}🔧 ツール: ${block.name}${c.reset}`);
            if (block.input && verbose) {
              const inputStr = JSON.stringify(block.input, null, 2);
              const inputLines = inputStr.split('\n').slice(0, 10);
              for (const line of inputLines) {
                lines.push(`   ${c.dim}${line}${c.reset}`);
              }
            } else if (block.input) {
              // 簡易表示
              const keys = Object.keys(block.input);
              if (keys.length > 0) {
                const summary = keys.map(k => {
                  const v = block.input![k];
                  if (typeof v === 'string') {
                    return `${k}="${truncate(v, 30)}"`;
                  }
                  return `${k}=${typeof v}`;
                }).join(', ');
                lines.push(`   ${c.dim}${truncate(summary, 80)}${c.reset}`);
              }
            }
          }
        }
      }
      if (event.message?.usage) {
        const { input_tokens, output_tokens } = event.message.usage;
        if (input_tokens || output_tokens) {
          lines.push(`   ${c.dim}📊 tokens: in=${input_tokens || 0}, out=${output_tokens || 0}${c.reset}`);
        }
      }
      break;

    case 'user':
      if (event.message?.content) {
        for (const block of event.message.content) {
          if (block.tool_use_id) {
            lines.push(`${c.blue}📤 ツール結果 (${block.tool_use_id.substring(0, 12)}...)${c.reset}`);
            if (block.content && verbose) {
              const content = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);
              const contentLines = content.split('\n').slice(0, 10);
              for (const line of contentLines) {
                lines.push(`   ${c.dim}${truncate(line, 100)}${c.reset}`);
              }
            }
          }
        }
      }
      break;

    case 'result':
      if (event.is_error) {
        lines.push(`${c.red}${c.bright}❌ エラー${c.reset}`);
      } else {
        lines.push(`${c.green}${c.bright}✅ 完了${c.reset}`);
      }
      if (event.result) {
        const resultLines = event.result.split('\n').slice(0, verbose ? 20 : 5);
        for (const line of resultLines) {
          lines.push(`   ${line}`);
        }
      }
      if (event.cost_usd !== undefined) {
        lines.push(`   ${c.dim}💰 コスト: $${event.cost_usd.toFixed(4)}${c.reset}`);
      }
      if (event.duration_ms !== undefined) {
        lines.push(`   ${c.dim}⏱️ 実行時間: ${(event.duration_ms / 1000).toFixed(1)}秒${c.reset}`);
      }
      break;
  }

  return lines;
}

function parseAndFormatAgentOutput(entry: AgentLogEntry, verbose: boolean): string[] {
  const lines: string[] = [];
  const time = formatTime(entry.timestamp);

  // stderrは赤色で表示
  if (entry.stream === 'stderr') {
    lines.push(`${c.dim}${time}${c.reset} ${c.red}[stderr]${c.reset} ${truncate(entry.data, 100)}`);
    return lines;
  }

  // JSONLデータの場合、各行をパース
  const dataLines = entry.data.split('\n').filter(l => l.trim());

  for (const dataLine of dataLines) {
    try {
      const event = JSON.parse(dataLine) as ClaudeEvent;
      const eventLines = formatClaudeEvent(event, verbose);
      if (eventLines.length > 0) {
        // 最初の行にタイムスタンプを追加
        if (eventLines.length > 0) {
          eventLines[0] = `${c.dim}${time}${c.reset} ${eventLines[0]}`;
        }
        lines.push(...eventLines);
      }
    } catch {
      // JSONでない場合はそのまま表示
      if (dataLine.trim()) {
        lines.push(`${c.dim}${time}${c.reset} ${dataLine}`);
      }
    }
  }

  return lines;
}

// 従来のログファイル形式（main.log）のパーサー
function parseMainLogLine(line: string): { timestamp: string; level: string; source: string; message: string } | null {
  const match = line.match(
    /^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\] \[(\w+)\] (?:\[(\w+)\] )?(.+)$/
  );
  if (!match) return null;
  return {
    timestamp: match[1],
    level: match[2],
    source: match[3] || '',
    message: match[4],
  };
}

async function processAgentLogFile(filePath: string, options: { verbose: boolean; tail: number }): Promise<void> {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const lines: string[] = [];
  for await (const line of rl) {
    lines.push(line);
  }

  const targetLines = options.tail > 0 ? lines.slice(-options.tail) : lines;

  for (const line of targetLines) {
    if (!line.trim()) continue;

    try {
      const entry = JSON.parse(line) as AgentLogEntry;
      const formatted = parseAndFormatAgentOutput(entry, options.verbose);
      for (const f of formatted) {
        console.log(f);
      }
    } catch {
      // JSONL形式でない場合は従来のログとして処理
      const parsed = parseMainLogLine(line);
      if (parsed) {
        const time = formatTime(parsed.timestamp);
        const levelColor = parsed.level === 'ERROR' ? c.red : parsed.level === 'WARN' ? c.yellow : parsed.level === 'DEBUG' ? c.gray : c.green;
        console.log(`${c.dim}${time}${c.reset} ${levelColor}${parsed.level}${c.reset} ${c.cyan}[${parsed.source}]${c.reset} ${parsed.message}`);
      } else {
        console.log(c.dim + line + c.reset);
      }
    }
  }
}

function showHelp(): void {
  console.log(`
${c.bright}Agent出力ログフォーマッター${c.reset}

Claude CLIのstream-json出力を人間が読みやすい形式で表示します。

${c.bright}使い方:${c.reset}
  npx ts-node scripts/format-logs.ts [オプション]

${c.bright}オプション:${c.reset}
  -f, --file PATH   ログファイルのパス（デフォルト: logs/agent-output.jsonl）
  -n, --lines N     最後のN行を表示（デフォルト: 50）
  -a, --all         全ての行を表示
  -v, --verbose     詳細表示（ツール入力、結果など）
  -h, --help        このヘルプを表示

${c.bright}例:${c.reset}
  npx ts-node scripts/format-logs.ts                    # 最新50件
  npx ts-node scripts/format-logs.ts -n 100             # 最新100件
  npx ts-node scripts/format-logs.ts -a -v              # 全て詳細表示
  npx ts-node scripts/format-logs.ts -f logs/main.log   # main.logを表示

${c.bright}ログファイル:${c.reset}
  logs/agent-output.jsonl  - Agent出力（Claude CLIのstream-json）
  logs/main.log            - アプリケーションログ
  logs/electron-dev.log    - Electron開発ログ
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  let filePath = './logs/agent-output.jsonl';
  let verbose = false;
  let tail = 50;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-v' || arg === '--verbose') {
      verbose = true;
    } else if (arg === '-n' || arg === '--lines') {
      tail = parseInt(args[++i], 10) || 50;
    } else if (arg === '-a' || arg === '--all') {
      tail = 0;
    } else if (arg === '-f' || arg === '--file') {
      filePath = args[++i];
    } else if (arg === '-h' || arg === '--help') {
      showHelp();
      return;
    }
  }

  if (!fs.existsSync(filePath)) {
    console.error(`${c.red}エラー: ファイルが見つかりません: ${filePath}${c.reset}`);
    console.log(`${c.dim}ヒント: Agentを一度実行すると logs/agent-output.jsonl が作成されます${c.reset}`);
    process.exit(1);
  }

  console.log(`${c.dim}ログファイル: ${filePath}${c.reset}`);
  console.log(`${c.dim}${'─'.repeat(70)}${c.reset}\n`);

  await processAgentLogFile(filePath, { verbose, tail });
}

main().catch(console.error);
