# Claude CLI 非インタラクティブモード自動化ガイド

プログラムからClaude CLIを起動し、自動化するための包括的なリファレンス。

## 目次

1. [基本的なCLIオプション](#1-基本的なcliオプション)
2. [パーミッション指定方法](#2-パーミッション指定方法)
3. [stream-json出力のパース方法](#3-stream-json出力のパース方法)
4. [実装パターン](#4-実装パターン)
5. [トラブルシューティング](#5-トラブルシューティング)

---

## 1. 基本的なCLIオプション

### 1.1 必須フラグ

```bash
claude -p --output-format stream-json "プロンプト"
```

| フラグ | 説明 | 必須 |
|--------|------|:----:|
| `-p`, `--print` | 非インタラクティブ（print）モード | ✅ |
| `--output-format stream-json` | JSONL形式で出力（機械処理向け） | ✅ |
| `--verbose` | 詳細情報を出力（session_id取得に必要） | 推奨 |

### 1.2 よく使うオプション

| オプション | 説明 | 例 |
|-----------|------|-----|
| `--resume <session-id>` | 既存セッションを再開 | `--resume abc-123-def` |
| `--max-turns <n>` | 最大ターン数を制限 | `--max-turns 50` |
| `--model <model>` | 使用モデルを指定 | `--model claude-sonnet-4-5-20250929` |
| `--add-file <path>` | 追加ファイルを読み込み | `-a context.md` |
| `--cwd <dir>` | 作業ディレクトリを指定 | `--cwd /path/to/project` |

### 1.3 ツール制限オプション

| オプション | 説明 | 注意点 |
|-----------|------|--------|
| `--allowedTools "Tool1,Tool2"` | 許可ツールのホワイトリスト | ⚠️ `bypassPermissions`モードでは無視されるバグあり |
| `--disallowedTools "Tool1,Tool2"` | 禁止ツールのブラックリスト | ⚠️ MCPツールには効かないバグあり |
| `--tools "Tool1,Tool2"` | 利用可能ツールの制限 | `""` で全無効、`"default"` で全有効 |

### 1.4 コマンドライン例

```bash
# 基本的な実行
claude -p --verbose --output-format stream-json "タスクの説明"

# スラッシュコマンドの実行
claude -p --verbose --output-format stream-json "/kiro:spec-requirements my-feature"

# セッションのresume
claude -p --verbose --output-format stream-json --resume <session-id> "続きのプロンプト"

# ツールを制限して実行
claude -p --verbose --output-format stream-json \
  --allowedTools "Read,Write,Edit,Glob,Grep" \
  "ファイルを読んで要約して"

# 最大ターン数を指定
claude -p --verbose --output-format stream-json --max-turns 30 "複雑なタスク"
```

---

## 2. パーミッション指定方法

### 2.1 Permission Mode 一覧

| Mode | 権限プロンプト | 動作 | 非インタラクティブ適性 |
|------|--------------|------|:--------------------:|
| `default` | 表示（応答必要） | 都度確認 | ❌ |
| `acceptEdits` | Edit自動承認 | 編集のみ自動許可 | ⚠️ |
| `plan` | 読み取りのみ | Write/Edit禁止 | ✅ |
| `dontAsk` | 自動deny | 許可されていないツールは拒否 | ✅ |
| `bypassPermissions` | スキップ | 全ツール許可 | ✅ |

### 2.2 CLIコマンドラインでの指定

```bash
# Permission modeを指定
claude -p --permission-mode dontAsk "タスク"

# 全権限をバイパス（危険）
claude -p --permission-mode bypassPermissions "タスク"

# 完全スキップ（最も危険、コンテナ内推奨）
claude -p --dangerously-skip-permissions "タスク"
```

#### 組み合わせパターン

```bash
# 推奨: dontAsk + allowedTools（ホワイトリスト方式）
claude -p --permission-mode dontAsk \
  --allowedTools "Read,Write,Edit,Glob,Grep" \
  "タスク"

# 代替: bypassPermissions + disallowedTools（ブラックリスト方式）
# ※ --allowedToolsがbypassPermissionsで効かないバグの回避策
claude -p --permission-mode bypassPermissions \
  --disallowedTools "Bash" \
  "タスク"
```

### 2.3 Subagent（Task Tool）での指定

Subagentは`.claude/agents/`ディレクトリ内のMarkdownファイルで定義する。

#### エージェント定義ファイルの構造

```yaml
# .claude/agents/kiro/spec-design-agent.md
---
name: spec-design-agent
description: Create technical design documents
model: sonnet
permissionMode: bypassPermissions  # ← 権限モード
tools: Read, Write, Edit, Grep, Glob, WebSearch, WebFetch  # ← 使用可能ツール
---

エージェントへの指示内容...
```

#### フィールド説明

| フィールド | 説明 | 値の例 |
|-----------|------|--------|
| `permissionMode` | サブエージェントの権限モード | `dontAsk`, `bypassPermissions` |
| `tools` | 使用可能ツールのホワイトリスト | `Read, Write, Edit, Glob` |
| `disallowedTools` | 使用禁止ツール | `Bash, WebFetch` |
| `model` | 使用モデル | `sonnet`, `opus`, `haiku` |

#### 権限継承の動作

| 親プロセス permissionMode | エージェント定義 permissionMode | 結果 |
|--------------------------|-------------------------------|------|
| `default` | `dontAsk` | ❌ 権限プロンプト発生（応答不可） |
| `default` | `bypassPermissions` | ✅ 成功 |
| `dontAsk` | `dontAsk` | ❌ 自動deny |
| `bypassPermissions` | `dontAsk` | ✅ 成功（親が優先） |

**重要**: `dontAsk` + `tools`の組み合わせでは**Write/Bashが常に失敗する**。
サブエージェントでファイル操作が必要な場合は `permissionMode: bypassPermissions` を使用すること。

### 2.4 Skill / Slash Commands での指定

`.claude/commands/`ディレクトリ内のMarkdownファイルで定義する。

#### コマンド定義ファイルの構造

```yaml
# .claude/commands/kiro/spec-requirements.md
---
name: spec-requirements
description: Generate EARS-format requirements
allowed-tools: Read, Task
permissionMode: plan
---

コマンドの実行手順...
```

#### フィールド説明

| フィールド | 説明 | 値の例 |
|-----------|------|--------|
| `allowed-tools` | 許可するツール | `Read, Write, Task, Bash(git:*)` |
| `permissionMode` | 権限モード | `plan`, `dontAsk` |
| `tools` | 利用可能ツールの制限 | `Read, Glob, Grep` |
| `disallowedTools` | 禁止ツール | `Bash, WebFetch` |

#### Bashコマンドのパターン指定

```yaml
allowed-tools: |
  Read
  Write
  Bash(npm run:*)     # プレフィックスマッチ
  Bash(git * main)    # グロブマッチ
  Bash(task:*)        # taskコマンド全般
```

**注意**: `Bash(*)` は全コマンドにマッチ**しない**。全Bashを許可するには `Bash` と記述する。

### 2.5 settings.json での指定

設定ファイルの優先順位（高→低）:

1. **Managed** (`/Library/Application Support/ClaudeCode/managed-settings.json`) - 企業ポリシー
2. **CLI引数** (`--allowedTools`, `--permission-mode`)
3. **Local Project** (`.claude/settings.local.json`) - 個人用
4. **Shared Project** (`.claude/settings.json`) - チーム共有
5. **User** (`~/.claude/settings.json`) - グローバル

#### 設定ファイルの構造

```json
{
  "permissions": {
    "deny": [
      "Bash(rm -rf /)",
      "Bash(sudo:*)",
      "Read(.env)",
      "Read(.env.*)"
    ],
    "allow": [
      "Bash(npm run:*)",
      "Bash(git:*)",
      "Read(./src/**)",
      "Edit(./src/**)"
    ],
    "ask": [
      "Bash(curl:*)"
    ]
  }
}
```

#### ルール評価順序

```
1. deny（最優先、必ずブロック）
2. ask（確認プロンプト表示）
3. allow（自動許可）
```

**重要**: 同じツールに `deny` と `allow` が存在する場合、**deny が常に優先**される。

---

## 3. stream-json出力のパース方法

### 3.1 出力形式

`--output-format stream-json` 指定時、stdoutにJSONL（1行1JSONオブジェクト）が出力される。

```jsonl
{"type":"system","subtype":"init","session_id":"abc-123-def","cwd":"/path/to/project","tools":["Read","Write"]}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"処理を開始します"}]}}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","id":"toolu_01","name":"Read","input":{"file_path":"/path/to/file"}}]}}
{"type":"user","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_01","content":"file contents..."}]}}
{"type":"result","subtype":"success","duration_ms":5000,"session_id":"abc-123-def"}
```

### 3.2 メッセージタイプ一覧

| type | subtype | 説明 | 主要フィールド |
|------|---------|------|---------------|
| `system` | `init` | 初期化メッセージ | `session_id`, `cwd`, `tools` |
| `assistant` | - | Claudeの応答 | `message.content[]` |
| `user` | - | ツール結果等 | `message.content[]` |
| `result` | `success` | 正常完了 | `duration_ms`, `session_id` |
| `result` | `error_max_turns` | ターン上限到達 | `duration_ms` |
| `result` | `error_during_execution` | 実行エラー | `error` |

### 3.3 system/init メッセージの構造

```json
{
  "type": "system",
  "subtype": "init",
  "session_id": "abc-123-def-456-ghi",
  "cwd": "/Users/username/project",
  "tools": ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
  "mcp_servers": [
    {"name": "electron", "status": "connected"}
  ]
}
```

**重要**: `session_id` は**最初の `system/init` メッセージ**に含まれる。resume機能に必要。

### 3.4 assistant メッセージの構造

```json
{
  "type": "assistant",
  "message": {
    "role": "assistant",
    "content": [
      {
        "type": "text",
        "text": "ファイルを読み込みます。"
      },
      {
        "type": "tool_use",
        "id": "toolu_01abc",
        "name": "Read",
        "input": {
          "file_path": "/path/to/file.md"
        }
      }
    ]
  }
}
```

#### content要素のタイプ

| type | 説明 | 主要フィールド |
|------|------|---------------|
| `text` | テキスト応答 | `text` |
| `tool_use` | ツール呼び出し | `id`, `name`, `input` |
| `thinking` | 思考プロセス（extended thinking有効時） | `thinking` |

### 3.5 result メッセージの構造

```json
{
  "type": "result",
  "subtype": "success",
  "is_error": false,
  "duration_ms": 115702,
  "session_id": "abc-123-def",
  "num_turns": 15,
  "cost_usd": 0.0523
}
```

| subtype | 説明 |
|---------|------|
| `success` | 正常完了 |
| `error_max_turns` | `--max-turns` の上限に到達 |
| `error_during_execution` | 実行中にエラー発生 |

### 3.6 パース実装例

#### TypeScript/Node.js

```typescript
interface StreamMessage {
  type: 'system' | 'assistant' | 'user' | 'result';
  subtype?: 'init' | 'success' | 'error_max_turns' | 'error_during_execution';
  session_id?: string;
  message?: {
    role: string;
    content: ContentBlock[];
  };
  duration_ms?: number;
  is_error?: boolean;
}

interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

function parseStreamLine(line: string): StreamMessage | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as StreamMessage;
  } catch {
    // JSON解析エラーは無視（部分的なデータの可能性）
    return null;
  }
}

// session_id抽出
function extractSessionId(data: string): string | null {
  const lines = data.split('\n').filter(line => line.trim());

  for (const line of lines) {
    const parsed = parseStreamLine(line);
    if (parsed?.type === 'system' && parsed.subtype === 'init' && parsed.session_id) {
      return parsed.session_id;
    }
  }
  return null;
}

// ストリーミング処理
function handleStream(process: ChildProcess): void {
  let buffer = '';

  process.stdout?.on('data', (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');

    // 最後の行は不完全な可能性があるので保持
    buffer = lines.pop() || '';

    for (const line of lines) {
      const message = parseStreamLine(line);
      if (!message) continue;

      switch (message.type) {
        case 'system':
          if (message.subtype === 'init') {
            console.log('Session ID:', message.session_id);
          }
          break;
        case 'assistant':
          handleAssistantMessage(message);
          break;
        case 'result':
          console.log(`Completed: ${message.subtype}, ${message.duration_ms}ms`);
          break;
      }
    }
  });
}

function handleAssistantMessage(message: StreamMessage): void {
  for (const block of message.message?.content || []) {
    if (block.type === 'text') {
      process.stdout.write(block.text || '');
    } else if (block.type === 'tool_use') {
      console.log(`Tool: ${block.name}`, block.input);
    }
  }
}
```

#### Python

```python
import json
import subprocess
from typing import Iterator, Optional, TypedDict, Any

class StreamMessage(TypedDict, total=False):
    type: str
    subtype: str
    session_id: str
    message: dict
    duration_ms: int
    is_error: bool

def parse_stream_line(line: str) -> Optional[StreamMessage]:
    """1行のJSONLをパース"""
    line = line.strip()
    if not line:
        return None
    try:
        return json.loads(line)
    except json.JSONDecodeError:
        return None

def stream_claude(prompt: str, **kwargs) -> Iterator[StreamMessage]:
    """Claude CLIをストリーミング実行"""
    args = [
        'claude', '-p',
        '--verbose',
        '--output-format', 'stream-json',
    ]

    if 'permission_mode' in kwargs:
        args.extend(['--permission-mode', kwargs['permission_mode']])

    if 'max_turns' in kwargs:
        args.extend(['--max-turns', str(kwargs['max_turns'])])

    args.append(prompt)

    process = subprocess.Popen(
        args,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        stdin=subprocess.PIPE,
        text=True
    )

    # stdinを即座に閉じる（重要）
    process.stdin.close()

    for line in process.stdout:
        message = parse_stream_line(line)
        if message:
            yield message

    process.wait()

def extract_session_id(messages: list[StreamMessage]) -> Optional[str]:
    """session_idを抽出"""
    for msg in messages:
        if msg.get('type') == 'system' and msg.get('subtype') == 'init':
            return msg.get('session_id')
    return None

# 使用例
if __name__ == '__main__':
    session_id = None

    for message in stream_claude("Hello, Claude!", permission_mode="dontAsk"):
        if message['type'] == 'system' and message.get('subtype') == 'init':
            session_id = message.get('session_id')
            print(f"Session: {session_id}")

        elif message['type'] == 'assistant':
            for block in message.get('message', {}).get('content', []):
                if block.get('type') == 'text':
                    print(block.get('text', ''), end='')

        elif message['type'] == 'result':
            print(f"\nCompleted: {message.get('subtype')}")
```

---

## 4. 実装パターン

### 4.1 プロセス起動の基本パターン

```typescript
import { spawn } from 'child_process';

function spawnClaude(prompt: string, options: ClaudeOptions = {}): ChildProcess {
  const args = [
    '-p',
    '--verbose',
    '--output-format', 'stream-json',
  ];

  if (options.permissionMode) {
    args.push('--permission-mode', options.permissionMode);
  }

  if (options.maxTurns) {
    args.push('--max-turns', String(options.maxTurns));
  }

  if (options.resume) {
    args.push('--resume', options.resume);
  }

  if (options.allowedTools?.length) {
    args.push('--allowedTools', options.allowedTools.join(','));
  }

  args.push(prompt);

  const process = spawn('claude', args, {
    cwd: options.cwd || process.cwd(),
    shell: false,
    stdio: ['pipe', 'pipe', 'pipe'],  // 全てpipe
    env: {
      ...process.env,
      // 必要に応じて環境変数を設定
    }
  });

  // 重要: stdinを即座に閉じる
  process.stdin?.end();

  return process;
}
```

### 4.2 stdinの扱い

**重要**: `claude -p` はstdinが閉じられるまで待機する。プロセス起動後は必ず `stdin.end()` を呼ぶこと。

```typescript
// ❌ 間違い: stdinを閉じない
const process = spawn('claude', args);
// プロセスがハングする

// ✅ 正しい: stdinを即座に閉じる
const process = spawn('claude', args, {
  stdio: ['pipe', 'pipe', 'pipe']
});
process.stdin?.end();
```

### 4.3 タイムアウト処理

```typescript
function spawnWithTimeout(prompt: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const process = spawnClaude(prompt);
    let output = '';
    let resultReceived = false;

    const timeout = setTimeout(() => {
      if (!resultReceived) {
        process.kill('SIGTERM');
        reject(new Error('Process timeout'));
      }
    }, timeoutMs);

    process.stdout?.on('data', (chunk) => {
      output += chunk.toString();

      // resultメッセージを検出したらタイムアウトをクリア
      if (output.includes('"type":"result"')) {
        resultReceived = true;
        clearTimeout(timeout);
      }
    });

    process.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
}
```

### 4.4 セッション再開（resume）

```typescript
class ClaudeSession {
  private sessionId: string | null = null;

  async run(prompt: string): Promise<string> {
    const args: string[] = [];

    if (this.sessionId) {
      args.push('--resume', this.sessionId);
    }

    const output = await this.execute(prompt, args);

    // 初回実行時にsession_idを保存
    if (!this.sessionId) {
      this.sessionId = extractSessionId(output);
    }

    return output;
  }

  async continue(prompt: string): Promise<string> {
    if (!this.sessionId) {
      throw new Error('No session to continue');
    }
    return this.run(prompt);
  }
}
```

---

## 5. トラブルシューティング

### 5.1 よくある問題

#### プロセスがハングする

**原因**: stdinが閉じられていない

```typescript
// 修正
process.stdin?.end();
```

#### プロセスが終了しない

**原因**: MCPサーバーのクリーンアップ問題

```typescript
// result検出後に強制終了
process.stdout?.on('data', (data) => {
  if (data.toString().includes('"type":"result"')) {
    setTimeout(() => {
      if (process.exitCode === null) {
        process.kill('SIGTERM');
      }
    }, 5000);
  }
});
```

#### パーミッションエラー

**原因**: `dontAsk` モードでツールが自動deny

```bash
# 修正: bypassPermissions を使用
claude -p --permission-mode bypassPermissions "タスク"
```

#### --allowedTools が効かない

**原因**: `bypassPermissions` モードでのバグ

```bash
# 回避策: disallowedTools でブラックリスト方式を使用
claude -p --permission-mode bypassPermissions \
  --disallowedTools "Bash,WebFetch" \
  "タスク"
```

### 5.2 デバッグ方法

#### 詳細ログの確認

```bash
# stderrも確認
claude -p --verbose --output-format stream-json "タスク" 2>&1
```

#### 権限設定の確認

```bash
# Claude Code内で確認
claude
> /permissions
```

#### プロセス状態の確認

```bash
# 実行中のclaudeプロセスを確認
ps aux | grep claude

# プロセスの詳細
lsof -p <PID>
```

### 5.3 既知のバグ一覧

| バグ | 影響 | 回避策 |
|------|------|--------|
| `--allowedTools` が `bypassPermissions` で無視 | ホワイトリストが機能しない | `--disallowedTools` でブラックリスト方式を使用 |
| `--disallowedTools` がMCPツールに効かない | MCPツールがブロックできない | Agent定義のtoolsフィールドで制御 |
| サブエージェント権限継承問題 | Task機能が使えない | `permissionMode: bypassPermissions` を使用 |
| `dontAsk` + `tools` でWrite失敗 | ファイル書き込み不可 | `bypassPermissions` を使用 |

---

## 参考リンク

### 公式ドキュメント

- [CLI Reference - Claude Code Docs](https://docs.anthropic.com/en/docs/claude-code/cli-usage)
- [Settings - Claude Code Docs](https://code.claude.com/docs/en/settings)
- [Subagents - Claude Code Docs](https://code.claude.com/docs/en/sub-agents)
- [Slash Commands - Claude Code Docs](https://code.claude.com/docs/en/slash-commands)

### プロジェクト内関連ドキュメント

- [stream-mode-session-id-retrieval.md](./stream-mode-session-id-retrieval.md) - session_id取得の詳細
- [claude-cli-stdin-handling.md](./claude-cli-stdin-handling.md) - stdin処理
- [claude-code-permissions-analysis.md](./claude-code-permissions-analysis.md) - 権限システム詳細
- [claude-code-subagent-permission-inheritance.md](./claude-code-subagent-permission-inheritance.md) - サブエージェント権限継承

---

**作成日**: 2026-01-29
