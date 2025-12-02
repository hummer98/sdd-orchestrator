# Bug Analysis: agent-log-display-issue

## Summary
完了済みのAgent一覧をタップした際に、Agentログ欄に何も表示されない。これはログ読み込み機能が未実装であることが原因。

## Root Cause

### Technical Details
- **Location**:
  - [electron-sdd-manager/src/renderer/stores/agentStore.ts:106-108](electron-sdd-manager/src/renderer/stores/agentStore.ts#L106-L108) - `selectAgent`メソッド
  - [electron-sdd-manager/src/main/ipc/channels.ts](electron-sdd-manager/src/main/ipc/channels.ts) - IPCチャンネル定義
- **Component**: Agent状態管理 (agentStore) およびIPC通信
- **Trigger**: 完了済みAgentを一覧から選択した時

### 問題の詳細
1. **`selectAgent`の実装**が単に`selectedAgentId`を設定するだけ:
```typescript
selectAgent: (agentId: string | null) => {
  set({ selectedAgentId: agentId });
},
```

2. **ログ読み込みAPIが存在しない**:
   - `LogFileService.readLog()`はファイルからログを読み込む機能を持つ
   - しかし、これを呼び出すIPCチャンネル（例: `GET_AGENT_LOGS`）が未定義
   - `electronAPI`にもログ読み込みメソッドがない

3. **ログの流れ**:
   - 実行中Agent: `AGENT_OUTPUT`イベント → `appendLog()` → `logs`マップに追加
   - 完了済みAgent: ファイルにログは保存済み → **読み込み経路なし** → `logs`マップ空

## Impact Assessment
- **Severity**: Medium
- **Scope**: 完了済みAgentの履歴確認機能が完全に動作しない
- **Risk**: 既存の実行中Agentのログ表示には影響なし

## Related Code
```typescript
// agentStore.ts - 現在のselectAgent実装
selectAgent: (agentId: string | null) => {
  set({ selectedAgentId: agentId });
},

// LogFileService.ts - 利用可能だが呼び出されていない
async readLog(specId: string, agentId: string): Promise<LogEntry[]> {
  const filePath = this.getFilePath(specId, agentId);
  // ... ファイルからログを読み込む
}
```

## Proposed Solution

### Option 1: selectAgent時にログを自動読み込み（推奨）
- **Description**: `selectAgent`を拡張し、Agent選択時にIPCでログを取得
- **Pros**:
  - UIの変更が最小限
  - 必要な時のみログを読み込むため効率的
- **Cons**:
  - IPC追加が必要

### Recommended Approach

1. **IPCチャンネル追加**: `GET_AGENT_LOGS`を定義
2. **ハンドラー実装**: `LogFileService.readLog()`を呼び出し
3. **Preload/electronAPI追加**: `getAgentLogs(specId, agentId)`
4. **agentStore修正**: `selectAgent`でログを自動取得、または`loadAgentLogs`アクション追加

## Dependencies
- [electron-sdd-manager/src/main/ipc/channels.ts](electron-sdd-manager/src/main/ipc/channels.ts)
- [electron-sdd-manager/src/main/ipc/handlers.ts](electron-sdd-manager/src/main/ipc/handlers.ts)
- [electron-sdd-manager/src/preload/index.ts](electron-sdd-manager/src/preload/index.ts)
- [electron-sdd-manager/src/renderer/stores/agentStore.ts](electron-sdd-manager/src/renderer/stores/agentStore.ts)
- [electron-sdd-manager/src/renderer/types/electron.d.ts](electron-sdd-manager/src/renderer/types/electron.d.ts)

## Testing Strategy
1. アプリを起動し、何らかのAgentを実行して完了させる
2. 完了済みAgentを一覧から選択
3. ログ欄に保存されたログが表示されることを確認
4. ログのコピー・クリア機能が正常動作することを確認
