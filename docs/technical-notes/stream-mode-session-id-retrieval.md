# Stream Modeでのsession-id取得方法

Claude CLIの`stream-json`出力形式を使用して、エージェントプロセスからsession-idを取得する方法。

## 概要

- **目的**: 各エージェントプロセスのsession-idを取得し、セッションのresume機能を実現
- **出力形式**: `--output-format stream-json`（JSONL形式）
- **取得タイミング**: プロセス起動直後の`system/init`メッセージから抽出

## Claude CLIへの渡し方

### 基本フラグ

```typescript
const CLAUDE_CLI_BASE_FLAGS = ['-p', '--verbose', '--output-format', 'stream-json'] as const;
```

### コマンドライン例

```bash
# 基本的な実行
claude -p --verbose --output-format stream-json "タスクの説明"

# スラッシュコマンドの実行
claude -p --verbose --output-format stream-json "/kiro:spec-requirements my-feature"

# セッションのresume
claude -p --verbose --output-format stream-json --resume <session-id> "続きのプロンプト"

# allowedToolsを指定してresume
claude -p --verbose --output-format stream-json --allowedTools Read Write --resume <session-id> "続きのプロンプト"
```

### プログラムからの実行

```typescript
import { spawn } from 'child_process';

// プロセス起動
const process = spawn('claude', [
  '-p',
  '--verbose',
  '--output-format', 'stream-json',
  '/kiro:spec-requirements my-feature'
], {
  cwd: workingDirectory,
  shell: false,
  stdio: ['pipe', 'pipe', 'pipe'],  // 全てpipe
});

// 重要: stdinを即座に閉じる（claude -pの仕様）
process.stdin?.end();
```

## stream-json出力形式

### 出力の流れ

Claude CLIは`--output-format stream-json`指定時、stdoutにJSONL（1行1 JSONオブジェクト）を出力する。

```
{"type":"system","subtype":"init","session_id":"abc-123-def","cwd":"/path/to/project"}
{"type":"assistant","message":{"role":"assistant","content":[...]}}
{"type":"user","message":{"role":"user","content":"..."}}
{"type":"result","subtype":"success","duration_ms":5000,"session_id":"abc-123-def"}
```

### メッセージタイプ一覧

| type | subtype | 説明 | session_id |
|------|---------|------|------------|
| `system` | `init` | 初期化メッセージ | ✅ 含む |
| `assistant` | - | Claudeの応答 | - |
| `user` | - | ユーザー入力 | - |
| `result` | `success` / `error_max_turns` / `error_during_execution` | 実行完了 | ✅ 含む |

### system/initメッセージの構造

```json
{
  "type": "system",
  "subtype": "init",
  "session_id": "abc-123-def-456-ghi",
  "cwd": "/Users/username/project"
}
```

**重要**: `session_id`は**最初の`system/init`メッセージ**に含まれる。このメッセージはプロセス起動直後に出力される。

## session-id抽出の実装

### 基本的な抽出ロジック

```typescript
function extractSessionId(data: string): string | null {
  // JSONL形式なので行ごとに処理
  const lines = data.split('\n').filter(line => line.trim());

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);

      // system/initメッセージからsession_idを抽出
      if (parsed.type === 'system' && parsed.subtype === 'init' && parsed.session_id) {
        return parsed.session_id;
      }
    } catch {
      // JSON解析エラーは無視（部分的なデータの可能性）
    }
  }

  return null;
}
```

### プロジェクトでの実装例

```typescript
// electron-sdd-manager/src/main/services/specManagerService.ts

private parseAndUpdateSessionId(agentId: string, specId: string, data: string): void {
  // 既にsessionIdを取得済みならスキップ
  const agent = this.registry.get(agentId);
  if (agent?.sessionId) {
    return;
  }

  try {
    const lines = data.split('\n').filter((line) => line.trim());
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        // system/initメッセージをチェック
        if (parsed.type === 'system' && parsed.subtype === 'init' && parsed.session_id) {
          // レジストリを更新
          this.registry.updateSessionId(agentId, parsed.session_id);

          // 永続化（AgentRecord）
          this.recordService.updateRecord(specId, agentId, {
            sessionId: parsed.session_id,
          });

          return;
        }
      } catch {
        // Not valid JSON, skip
      }
    }
  } catch (err) {
    // Parsing error, ignore
  }
}
```

## session-idの保存と利用

### 保存場所

| 保存先 | 用途 | 永続性 |
|--------|------|--------|
| AgentRegistry（インメモリ） | 実行中のエージェント管理 | プロセス終了で消失 |
| AgentRecord（ファイル） | resume機能用 | 永続 |

### AgentRecordファイル

保存先: `.kiro/agents/{specId}/{agentId}.json`

```json
{
  "agentId": "impl-abc123",
  "specId": "my-feature",
  "phase": "impl",
  "pid": 12345,
  "sessionId": "abc-123-def-456-ghi",
  "status": "running",
  "startedAt": "2025-01-07T12:00:00.000Z",
  "lastActivityAt": "2025-01-07T12:05:00.000Z",
  "command": "/kiro:spec-impl my-feature"
}
```

### セッションのresume

取得したsession-idを使ってセッションを再開できる：

```typescript
function buildResumeArgs(sessionId: string, prompt: string): string[] {
  return [
    '-p',
    '--verbose',
    '--output-format', 'stream-json',
    '--resume', sessionId,
    prompt
  ];
}

// 使用例
const args = buildResumeArgs('abc-123-def', '続けてください');
// => ['-p', '--verbose', '--output-format', 'stream-json', '--resume', 'abc-123-def', '続けてください']
```

## 注意点

### 1. stdinの即時クローズ

`claude -p`はstdinが閉じられるまで待機する。プロセス起動後は必ず`stdin.end()`を呼ぶこと。

```typescript
const process = spawn('claude', args, { stdio: ['pipe', 'pipe', 'pipe'] });
process.stdin?.end();  // 必須
```

詳細: [claude-cli-stdin-handling.md](./claude-cli-stdin-handling.md)

### 2. 部分的なJSONデータ

ストリーミングでは1回のdataイベントで完全なJSONが来るとは限らない。行単位での処理と適切なエラーハンドリングが必要。

### 3. session-idは最初の1回のみ

`system/init`メッセージは1セッションで1回しか出力されない。取得後は以降の解析をスキップして効率化する。

### 4. resultメッセージにもsession_idが含まれる

実行完了時の`result`メッセージにも`session_id`が含まれる。バックアップとして利用可能。

## 関連ファイル

- `electron-sdd-manager/src/main/services/specManagerService.ts` - session-id抽出ロジック
- `electron-sdd-manager/src/main/services/agentRegistry.ts` - インメモリ管理
- `electron-sdd-manager/src/main/services/agentRecordService.ts` - 永続化
- `electron-sdd-manager/src/main/services/agentProcess.ts` - プロセス管理

## 参考リンク

- [CLI reference - Claude Code Docs](https://docs.anthropic.com/en/docs/claude-code/cli-usage)
- [claude-cli-stdin-handling.md](./claude-cli-stdin-handling.md) - stdin処理の詳細

## 日付

2025-01-07
