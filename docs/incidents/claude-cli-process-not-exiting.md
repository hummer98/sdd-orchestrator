# Claude CLI プロセスが終了しない問題の調査

## 問題概要

SDD Orchestrator から `claude -p` コマンドを spawn した際、Claude CLI が `result` メッセージを出力した後もプロセスが終了せず、agent record の status が `running` のまま残る問題が発生。

## 発生状況

- **発生日時**: 2025-12-24
- **対象プロジェクト**: `/Users/yamamoto/git/Dear`
- **問題の agent**: `agent-1766589975084-c3ec308c` (tasks フェーズ)
- **Claude Code バージョン**: 2.0.72

## 調査結果

### 確認された事実

1. **ログに `result` が記録されている**
   ```json
   {"type":"result","subtype":"success","is_error":false,"duration_ms":115702}
   ```
   - タイムスタンプ: `2025-12-24T15:28:15.313Z`

2. **プロセスはまだ生きている**
   ```
   PID 54406: STAT=S (スリープ), ELAPSED=37分以上
   ```

3. **SDD Orchestrator のログに `Process closed` がない**
   - 他の agent は正常に `Process closed` が記録されている
   - この agent だけ `close` イベントが発火していない

4. **同じ spec の他のフェーズは正常終了**
   - requirements: 正常終了 → `completed`
   - design: 正常終了 → `completed`
   - tasks: **プロセス未終了** → `running` のまま

### 時系列

| 時刻 | イベント |
|------|----------|
| 15:26:15 | tasks agent 開始 |
| 15:28:15 | `result` メッセージ出力（ログに記録） |
| 15:28:15〜 | プロセスがスリープ状態で待機（終了しない） |
| 01:05〜 | 調査時点でもプロセス生存（37分以上経過） |

### MCP サーバー構成

全フェーズで同一の MCP 構成：
```json
[
  {"name": "line-miniapp-e2e-test", "status": "connected"},
  {"name": "nanobanana", "status": "connected"},
  {"name": "context7", "status": "connected"},
  {"name": "adb", "status": "connected"}
]
```

## 関連する GitHub Issues

### Claude Code の問題

1. **[Issue #1935: MCP servers not properly terminated](https://github.com/anthropics/claude-code/issues/1935)**
   - MCP サーバープロセスが Claude Code 終了後も孤立したプロセスとして残る
   - MCP プロトコルの graceful shutdown が正しく実行されていない可能性

2. **[Issue #771: Claude Code can't be spawned from node.js](https://github.com/anthropics/claude-code/issues/771)**
   - Node.js の spawn() から Claude CLI を実行するとハングする問題
   - `stdio: ['inherit', 'pipe', 'pipe']` + 環境変数設定で解決との報告
   - ただし Electron アプリでは `inherit` は使用不可（親 stdin がないため）

3. **[Issue #610: Print mode support MCP servers](https://github.com/anthropics/claude-code/issues/610)**
   - `-p` (print) モードで MCP サーバーが正しく動作しない問題
   - MCP を使用すると print モードが無視される可能性

### Node.js の問題

- **[Issue #2339: async spawn methods not closing stdin](https://github.com/nodejs/node/issues/2339)**
  - spawn された子プロセスの stdin が適切に閉じられない場合がある

## 現在の実装

### stdin の扱い（正しく実装済み）

`docs/technical-notes/claude-cli-stdin-handling.md` に記載の通り：

```typescript
// processProvider.ts
spawn(command, args, {
  stdio: ['pipe', 'pipe', 'pipe'],  // 全て pipe
  // ...
});

// 起動後すぐに stdin を閉じる
this.process.stdin?.end();
```

- `stdio: 'inherit'` は Electron アプリでは使用不可（親 stdin がない）
- 現在の実装は正しい

### 終了検出の仕組み

```typescript
// processProvider.ts - LocalProcessHandle
this.process.on('close', (code: number | null) => {
  this._isRunning = false;
  this.exitCallbacks.forEach((cb) => cb(code ?? -1));
});

// specManagerService.ts
process.onExit((code) => {
  const newStatus = code === 0 ? 'completed' : 'failed';
  this.registry.updateStatus(agentId, newStatus);
  this.recordService.updateRecord(specId, agentId, { status: newStatus });
});
```

## 根本原因の仮説

### 有力: Claude CLI の MCP クリーンアップ問題

Claude CLI が `result` を出力した後、MCP サーバーとの接続をクリーンアップできずにプロセスが終了しない。

**根拠**:
- 全フェーズで同じ MCP 構成なのに、特定のフェーズだけ終了しない
- Issue #1935 で MCP のクリーンアップ問題が報告されている
- プロセスは CPU 0% でスリープ状態 → 何かを待っている

### 可能性: タイミング依存のレースコンディション

requirements と design は終了できたが tasks は終了できなかった理由として、MCP サーバーの状態やタイミングが影響している可能性。

## 対策案

### 短期的対策

1. **result 検出後の強制終了**
   - `result` メッセージを検出したら、一定時間後に SIGTERM を送信
   - 実装箇所: `specManagerService.ts` の output コールバック内

2. **タイムアウト機構の追加**
   - `result` 受信後 N 秒経過してもプロセスが終了しない場合に kill

### 中期的対策

1. **MCP なしでのテスト**
   - MCP サーバーを無効化して再現するか確認
   - MCP が原因かどうかを切り分け

2. **Claude Code へのバグ報告**
   - 再現手順を整理して Issue を作成

### 参考: 強制終了の実装例

```typescript
// specManagerService.ts の output コールバック内
process.onOutput((stream, data) => {
  // result メッセージを検出
  if (stream === 'stdout' && data.includes('"type":"result"')) {
    // 5秒後にプロセスがまだ生きていたら強制終了
    setTimeout(() => {
      if (this.processes.has(agentId)) {
        logger.warn('[SpecManagerService] Force killing hanging process', { agentId });
        process.kill();
      }
    }, 5000);
  }
});
```

## 関連ファイル

- `electron-sdd-manager/src/main/services/agentProcess.ts` - プロセス起動
- `electron-sdd-manager/src/main/services/ssh/processProvider.ts` - ProcessHandle 実装
- `electron-sdd-manager/src/main/services/specManagerService.ts` - agent 管理
- `docs/technical-notes/claude-cli-stdin-handling.md` - stdin 処理の技術メモ

## 調査日

2025-12-25
