# Bug Analysis: global-agent-display-issues

## Summary
Global Agent一覧で2つの問題が発生している：
1. 実行時間が表示されない
2. 削除しても再度表示される

## Root Cause

### バグ1: 実行時間が表示されない
- **Location**: [GlobalAgentPanel.tsx:192-273](electron-sdd-manager/src/renderer/components/GlobalAgentPanel.tsx#L192-L273)
- **Component**: `GlobalAgentListItem`コンポーネント
- **Trigger**: `GlobalAgentListItem`に実行時間（duration）表示のロジックが実装されていない

`AgentListPanel.tsx`の`AgentListItem`（行205-291）では、以下のロジックで実行時間を計算・表示している：
```typescript
// Dynamic elapsed time for running agents
const [elapsed, setElapsed] = useState(() => {
  return Date.now() - new Date(agent.startedAt).getTime();
});

useEffect(() => {
  if (!isRunning) return;
  const interval = setInterval(() => {
    setElapsed(Date.now() - new Date(agent.startedAt).getTime());
  }, 1000);
  return () => clearInterval(interval);
}, [isRunning, agent.startedAt]);

// Calculate duration
const duration = isRunning
  ? elapsed
  : new Date(agent.lastActivityAt).getTime() - new Date(agent.startedAt).getTime();
```

しかし、`GlobalAgentPanel.tsx`の`GlobalAgentListItem`にはこのロジックが存在しない。

### バグ2: 削除しても再度表示される
- **Location**: [agentStore.ts:258-279](electron-sdd-manager/src/renderer/stores/agentStore.ts#L258-L279)
- **Component**: `removeAgent`アクション
- **Trigger**: UIストアからの削除のみで、ファイルシステムのレコードが削除されない

`removeAgent`はUIストア（Zustand）から以下を削除する：
- `agents` Mapからのagent情報
- `logs` Mapからのログ情報
- 選択状態のリセット

しかし、ファイルシステム上のAgent Record（`.kiro/runtime/agents/{specId}/{agentId}.json`）は削除されない。

`AgentRecordWatcherService`がファイルを監視しているため、次のいずれかのタイミングで削除したAgentが再度追加される：
1. アプリ再起動時（`loadAgents`によるファイル読み込み）
2. ファイル監視の`add`イベント発火時

**欠落しているIPC API**:
- `preload/index.ts`に`deleteAgent`/`removeAgent`のAPIが存在しない
- `agentRecordService.ts`には`deleteRecord`メソッドが存在するが、IPC経由で呼び出せない

## Impact Assessment
- **Severity**: Medium
- **Scope**: Global Agent一覧を使用する全ユーザー
- **Risk**: 機能的な問題のみで、データ破損リスクはない

## Related Code

### バグ1の関連コード（AgentListPanel.tsx - 正しく実装されている例）
```typescript
// 行212-224
const [elapsed, setElapsed] = useState(() => {
  return Date.now() - new Date(agent.startedAt).getTime();
});

useEffect(() => {
  if (!isRunning) return;
  const interval = setInterval(() => {
    setElapsed(Date.now() - new Date(agent.startedAt).getTime());
  }, 1000);
  return () => clearInterval(interval);
}, [isRunning, agent.startedAt]);
```

### バグ2の関連コード（agentStore.ts - ファイル削除が欠落）
```typescript
// 行258-279
removeAgent: (agentId: string) => {
  set((state) => {
    // ... UIストアからのみ削除
    // ファイルシステム削除のAPI呼び出しがない
  });
},
```

## Proposed Solution

### Option 1: 両方のバグを修正（推奨）
- Description: GlobalAgentListItemに実行時間表示を追加し、removeAgent時にファイルも削除するIPCを追加
- Pros: 完全な修正、コードの一貫性向上
- Cons: 2つの異なる領域の変更が必要

### Option 2: バグ1のみ修正
- Description: GlobalAgentListItemの表示問題のみ修正
- Pros: 変更範囲が小さい
- Cons: 削除問題が残る

### Recommended Approach
Option 1を推奨。具体的な修正内容：

**バグ1の修正**:
1. `GlobalAgentListItem`に`elapsed`ステートと`useEffect`を追加
2. `formatDuration`関数を共通化またはインポート
3. 実行時間の表示を追加

**バグ2の修正**:
1. `IPC_CHANNELS`に`DELETE_AGENT`を追加
2. `handlers.ts`に`deleteAgent`ハンドラを追加（`agentRecordService.deleteRecord`を呼び出す）
3. `preload/index.ts`に`deleteAgent` APIを追加
4. `agentStore.ts`の`removeAgent`でIPC呼び出しを追加

## Dependencies
- [agentRecordService.ts](electron-sdd-manager/src/main/services/agentRecordService.ts) - `deleteRecord`メソッドは既に存在
- [agentRecordWatcherService.ts](electron-sdd-manager/src/main/services/agentRecordWatcherService.ts) - ファイル削除時に`unlink`イベント発火

## Testing Strategy
1. **バグ1のテスト**:
   - Global Agentを起動して実行時間が表示されることを確認
   - 完了後も正しい実行時間が表示されることを確認

2. **バグ2のテスト**:
   - Global Agentを削除してUIから消えることを確認
   - アプリ再起動後も削除状態が維持されることを確認
   - `.kiro/runtime/agents/`内のJSONファイルが削除されていることを確認
