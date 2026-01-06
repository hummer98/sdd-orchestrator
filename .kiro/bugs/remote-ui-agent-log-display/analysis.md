# Bug Analysis: remote-ui-agent-log-display

## Bug Summary
Remote UIでspec agentのアイテムを選択しても、そのAgentのログが表示されない。

## Root Cause

### 概要
Remote UIにはAgent選択時にログを読み込む機能が**実装されていない**。
Electron版のDesktop UIでは同機能が存在するが、Remote UIへの移植が行われていない。

### 詳細分析

#### Electron版（正常動作）のフロー
1. `AgentListPanel.tsx`でAgentをクリック
2. `agentStore.ts:118-134` の `selectAgent()` が呼ばれる
3. `selectAgent()`内で `loadAgentLogs()` を呼び出し
4. IPCチャンネル `GET_AGENT_LOGS` (`ipc/handlers.ts:787-796`) 経由でログ取得
5. 取得したログを `setLogs()` でストアに設定
6. LogViewer に表示

```typescript
// agentStore.ts:118-134
selectAgent: async (agentId: string | null) => {
  const { agents, setSelectedAgentId, clearLogs, loadAgentLogs, setLogs } = get();
  clearLogs();
  setSelectedAgentId(agentId);

  if (agentId) {
    const agent = agents.find((a) => a.id === agentId);
    if (agent) {
      // ★ ここでログを読み込む
      await state.loadAgentLogs(agent.specId, agentId);
    }
  }
}
```

#### Remote UI版（バグのある動作）のフロー
1. `components.js`の`SpecDetail`でAgentリストをクリック
2. `components.js:1054-1071` の `selectAgent()` が呼ばれる
3. **ログ読み込み処理が存在しない** ← バグの原因
4. ハイライト表示のみ実行

```javascript
// components.js:1054-1071
selectAgent(agentId) {
  this.currentAgentId = agentId;
  const agent = this.agents.find(a => a.id === agentId);

  // Enable input if agent is running
  const canSendInput = agent && agent.status === 'running';
  this.agentInputEl.disabled = !canSendInput;
  this.sendInputBtn.disabled = !canSendInput;

  // Highlight selected agent (UIのみ)
  this.agentListEl.querySelectorAll('[data-agent-id]').forEach(el => {
    if (el.dataset.agentId === agentId) {
      el.classList.add('bg-primary-50', 'dark:bg-primary-900/20');
    } else {
      el.classList.remove('bg-primary-50', 'dark:bg-primary-900/20');
    }
  });
  // ★ ログ読み込み処理がない
}
```

### 欠けている実装

1. **WebSocket メッセージタイプ `GET_AGENT_LOGS` または `SELECT_AGENT`**
   - `webSocketHandler.ts` に対応するハンドラがない

2. **Remote UI側のログ取得リクエスト送信**
   - `websocket.js` にログ取得用メソッドがない

3. **Remote UI側でのログ受信とLogViewerへの設定**
   - `app.js` にAGENT_LOGS受信ハンドラがない
   - `components.js` の `selectAgent()` でログ取得を呼び出していない

## Affected Files

| ファイル | 役割 | 変更必要性 |
|---------|------|-----------|
| `electron-sdd-manager/src/main/services/webSocketHandler.ts` | WebSocketメッセージルーティング | **要追加**: `SELECT_AGENT`ハンドラ |
| `electron-sdd-manager/src/main/remote-ui/websocket.js` | WebSocket通信管理 | **要追加**: `selectAgent()`メソッド |
| `electron-sdd-manager/src/main/remote-ui/components.js` | UIコンポーネント | **要修正**: `selectAgent()`でログ取得呼び出し |
| `electron-sdd-manager/src/main/remote-ui/app.js` | メインアプリ | **要追加**: `AGENT_LOGS`メッセージハンドラ |

## Impact Assessment

- **影響範囲**: Remote UIのみ（Desktop UIは影響なし）
- **重大度**: 中
  - 機能欠損だがワークアラウンド（Desktop UI利用）あり
  - リアルタイムログ（実行中Agent）は表示される
  - 過去のログのみ影響
- **ユーザー影響**: Remote UIから過去のAgentログを確認できない

## Proposed Solutions

### Option 1: SELECT_AGENTメッセージタイプ追加（推奨）

Electron版のIPCパターンをWebSocketに移植する。

**実装内容**:
1. `webSocketHandler.ts` に `SELECT_AGENT` ハンドラ追加
2. ハンドラ内でAgentログファイルを読み込み、`AGENT_LOGS`として返信
3. `websocket.js` に `selectAgent()` メソッド追加
4. `components.js` の `selectAgent()` からWebSocket経由でログ取得
5. `app.js` で `AGENT_LOGS` 受信時に `logViewer.setLogs()` 呼び出し

**メリット**: Desktop UIと同等の機能を実現
**デメリット**: 追加実装が必要

### Option 2: Spec選択時に全Agentログをプリロード

SELECT_SPEC時に関連する全Agentのログを送信する。

**メリット**: 実装がシンプル
**デメリット**: 不要なデータ転送、メモリ使用量増加

### 推奨
**Option 1** を推奨。Desktop UIと同じパターンを採用することで、一貫性のある実装となる。

## Next Steps

```
/kiro:bug-fix remote-ui-agent-log-display
```
