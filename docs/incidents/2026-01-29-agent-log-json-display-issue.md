# [Resolved] AgentログがJSON形式で表示される問題

> **Status:** Resolved
> **Root Cause:** main-process-log-parser機能の統合ミス
> **Resolution:** `agentStoreAdapter.ts`に`onAgentLog`リスナーを追加

## 発見日
2026-01-29

## 概要
最近の変更以降、Agentログパネルでログがパースされずに生のJSON形式で表示される。本来はテキスト、ツール使用、結果などが整形されて表示されるべきだが、`{"type":"assistant","message":...}` のようなJSON文字列がそのまま表示されている。

## 症状
- AgentLogPanelで、パース済みのテキストではなく生のJSON行が表示される
- ツール使用やツール結果の構造化表示が機能しない
- Remote UIでは正常に表示される可能性がある（WebSocket経由は`AGENT_LOG`を使用）

## 根本原因

### main-process-log-parser機能の統合ミス

コミット `352716c` (feat(main-process-log-parser)) で以下の統合が不完全だった：

#### 設計意図（design.md, requirements.md）
```
REQ-3.1: onAgentLog IPCチャンネルは ParsedLogEntry を送信
Renderer側は onAgentLog リスナーで addLog() を呼び出す
```

#### 実際の実装状況

| コンポーネント | 状態 | 詳細 |
|--------------|------|-----|
| Main Process (handlers.ts) | ✅ 正常 | `AGENT_LOG`チャンネルでパース済み`ParsedLogEntry`を送信 |
| Preload (index.ts) | ✅ 正常 | `onAgentLog` APIを公開 |
| IpcApiClient.ts | ✅ 正常 | `onAgentLog`メソッドを実装 |
| **agentStoreAdapter.ts** | ❌ 未統合 | `onAgentOutput`（生データ）を使用 |

### 問題の詳細

`agentStoreAdapter.ts:259-269` の `setupAgentEventListeners`:

```typescript
// 現状: 生データを受信して単純変換
const cleanupOutput = window.electronAPI.onAgentOutput(
  (agentId: string, stream: 'stdout' | 'stderr', data: string) => {
    const entry: LogEntry = {
      id: `${Date.now()}-...`,
      stream,
      data,  // ← 生のJSON文字列がそのまま入る
      timestamp: Date.now(),
    };
    useSharedAgentStore.getState().addLog(agentId, toParsedLogEntry(entry));
  }
);
```

`toParsedLogEntry` 関数（line 29-39）:
```typescript
function toParsedLogEntry(logEntry: LogEntry): ParsedLogEntry {
  return {
    id: logEntry.id,
    type: logEntry.stream === 'stdin' ? 'input' : 'text',
    timestamp: logEntry.timestamp,
    text: {
      content: logEntry.data,  // ← JSON文字列がパースされずにそのまま設定
      role: logEntry.stream === 'stdin' ? 'user' : 'assistant',
    },
  };
}
```

### 本来あるべき実装

```typescript
// 正しい実装: パース済みデータを受信
const cleanupLog = window.electronAPI.onAgentLog(
  (agentId: string, parsedLog: ParsedLogEntry) => {
    useSharedAgentStore.getState().addLog(agentId, parsedLog);
  }
);
```

## データフロー比較

### 現状（問題あり）
```
Agent Process
    ↓ stdout (JSON line)
Main Process
    ↓ AGENT_OUTPUT (raw data)
Renderer (agentStoreAdapter)
    ↓ toParsedLogEntry (no parsing)
agentStore.addLog
    ↓
UI: JSON文字列が表示される
```

### 本来の設計
```
Agent Process
    ↓ stdout (JSON line)
Main Process
    ↓ LogStreamingService.processLogOutput
    ↓ unifiedParser.parseData
    ↓ AGENT_LOG (ParsedLogEntry)
Renderer (agentStoreAdapter)
    ↓ onAgentLog listener
agentStore.addLog
    ↓
UI: 整形されたログが表示される
```

## 影響範囲
- Electron Renderer内のAgentLogPanel
- すべてのAgent実行時のログ表示
- Spec/Bug両方のワークフロー

## 関連コミット
- `352716c` - feat(main-process-log-parser): メインプロセスでのログパース処理を実装
- `6243622` - fix(remote-ui): WebSocketでAGENT_LOGメッセージを処理してログ逐次更新を修正

## 関連ファイル

### Main Process（正常）
- `src/main/ipc/handlers.ts:1079` - `AGENT_LOG`チャンネルで`ParsedLogEntry`を送信
- `src/main/services/logStreamingService.ts` - ログパース・配信サービス
- `src/main/utils/unifiedParser.ts` - Claude/Gemini統合パーサー

### Preload（正常）
- `src/preload/index.ts:283-298` - `onAgentLog` API定義

### Renderer（問題箇所）
- `src/renderer/stores/agentStoreAdapter.ts:259-269` - **`onAgentOutput`を使用（要修正）**
- `src/shared/api/IpcApiClient.ts:487-492` - `onAgentLog`実装済み（未使用）

### 設計ドキュメント
- `.kiro/specs/main-process-log-parser/design.md`
- `.kiro/specs/main-process-log-parser/requirements.md`
- `.kiro/specs/main-process-log-parser/inspection-2.md` - 「✅ CONNECTED」と誤記載

## 修正方針

`agentStoreAdapter.ts` の `setupAgentEventListeners` で:

1. `onAgentLog` リスナーを追加してパース済みログを受信
2. `onAgentOutput` は後方互換性のため残すか、削除を検討

```typescript
// 追加: パース済みログを受信
const cleanupLog = window.electronAPI.onAgentLog(
  (agentId: string, parsedLog: ParsedLogEntry) => {
    useSharedAgentStore.getState().addLog(agentId, parsedLog);
  }
);

// 既存の onAgentOutput は削除または stdin専用に変更
```

## 検証方法
1. Electronアプリを起動
2. 任意のSpecでAgentを実行
3. AgentLogPanelでログがテキスト形式で表示されることを確認
4. ツール使用・結果が構造化表示されることを確認

## 解決

### 修正内容

`agentStoreAdapter.ts`の`setupAgentEventListeners`関数に`onAgentLog`リスナーを追加：

```typescript
// Bug fix: agent-log-json-display-issue
// main-process-log-parser integration: Listen for parsed log entries from Main process
// This receives ParsedLogEntry directly, no conversion needed
const cleanupLog = window.electronAPI.onAgentLog(
  (agentId: string, parsedLog: ParsedLogEntry) => {
    console.log('[agentStoreAdapter] Received parsed agent log', { agentId, type: parsedLog.type });
    useSharedAgentStore.getState().addLog(agentId, parsedLog);
  }
);
```

### 変更ファイル
- `src/renderer/stores/agentStoreAdapter.ts` - `onAgentLog`リスナー追加
- `src/renderer/stores/agentStoreAdapter.test.ts` - 4つのテストケース追加

### テスト結果
```
 ✓ src/renderer/stores/agentStoreAdapter.test.ts (24 tests) 13ms
 Test Files  1 passed (1)
 Tests  24 passed (24)
```

## 教訓
- Inspection reportで「✅ CONNECTED」と記載されていても、実際のコードレビューが必要
- 複数のIPCチャンネル（`AGENT_OUTPUT` / `AGENT_LOG`）の移行時は、すべての消費側の更新を確認
- E2Eテストでログ表示内容の検証を追加すべき
- TDDで修正することで、確実に機能をテストできる
