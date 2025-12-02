# Bug Analysis: agent-list-duplicate

## Summary
Agent一覧で同じAgentが複数回表示されるバグ。`addAgent`関数に重複チェックがなく、複数の呼び出し元から同じAgentが追加される可能性がある。

## Root Cause
`agentStore.ts`の`addAgent`関数が単純に配列に追加するだけで、既存のAgentIDとの重複チェックを行っていない。

### Technical Details
- **Location**: [agentStore.ts:151-158](electron-sdd-manager/src/renderer/stores/agentStore.ts#L151-L158)
- **Component**: `agentStore` (Zustand store)
- **Trigger**: 以下の2つのパターンで重複が発生する
  1. **イベントリスナーの二重追加**: `onAgentRecordChanged`で`add`イベント発生時に`addAgent`を呼び出すが、`WorkflowView.tsx`でAgent起動直後にも`addAgent`を呼び出している。ファイル監視が先にイベントを発火すると、手動追加と合わせて2回追加される。
  2. **changeイベントでの追加**: `onAgentRecordChanged`で`change`イベント時にも`addAgent`を呼び出しているため、ステータス更新のたびにAgentが追加される。

### 問題の流れ
```
1. WorkflowView: executePhase() → window.electronAPI.executePhase()
2. Main process: Agentを起動、JSONファイルを作成
3. agentRecordWatcherService: ファイル変更を検知 → 'add'イベントを送信
4. WorkflowView: executePhaseの戻り値を受け取り → addAgent()を呼び出し
5. agentStore: onAgentRecordChangedイベント受信 → addAgent()を呼び出し
→ 同じAgentが2回追加される

さらに、Agent実行中:
6. Main process: ステータス更新、JSONファイルを更新
7. agentRecordWatcherService: ファイル変更を検知 → 'change'イベントを送信
8. agentStore: onAgentRecordChangedで'change'時もaddAgent()を呼び出し
→ 同じAgentがさらに追加される
```

## Impact Assessment
- **Severity**: Medium
- **Scope**: Agent一覧を表示するすべての画面（SpecのAgent管理）
- **Risk**:
  - UI上の混乱（同じAgentが複数表示される）
  - 操作の重複（同じAgentに対して複数回操作が行われる可能性）
  - メモリ使用量の軽微な増加

## Related Code
```typescript
// agentStore.ts:151-158 - 重複チェックなしの追加
addAgent: (specId: string, agent: AgentInfo) => {
  set((state) => {
    const newAgents = new Map(state.agents);
    const existingAgents = newAgents.get(specId) || [];
    newAgents.set(specId, [...existingAgents, agent]);  // ← 重複チェックなし
    return { agents: newAgents };
  });
},

// agentStore.ts:355-361 - changeイベントでもaddAgentを呼び出し
} else {
  // add/change時はAgentを追加/更新
  const agentInfo = agent as AgentInfo;
  if (agentInfo.agentId && agentInfo.specId) {
    get().addAgent(agentInfo.specId, agentInfo);  // ← changeでも追加してしまう
  }
}
```

## Proposed Solution

### Option 1: addAgentに重複チェックを追加（推奨）
- Description: `addAgent`関数内で既存のagentIdをチェックし、存在する場合は更新、存在しない場合のみ追加
- Pros:
  - 最小限の変更で修正可能
  - 呼び出し元を変更する必要がない
  - どこから呼び出されても安全に動作
- Cons:
  - 若干のパフォーマンスオーバーヘッド（既存Agent検索）

### Option 2: addAgentとupdateAgentを分離
- Description: `onAgentRecordChanged`で`change`イベント時は`updateAgent`を呼び出す
- Pros: 意図が明確になる
- Cons: 変更箇所が多くなる

### Option 3: WorkflowViewからのaddAgent呼び出しを削除
- Description: イベントリスナー経由のみでAgentを追加
- Pros: 追加経路を一本化
- Cons: UIの応答性が低下する可能性

### Recommended Approach
**Option 1** を推奨。`addAgent`関数に重複チェックを追加し、既に同じ`agentId`が存在する場合は情報を更新するように変更する。これにより、すべての呼び出し元で安全に動作し、既存のコードへの影響を最小限に抑えられる。

```typescript
addAgent: (specId: string, agent: AgentInfo) => {
  set((state) => {
    const newAgents = new Map(state.agents);
    const existingAgents = newAgents.get(specId) || [];

    // 重複チェック: 既存のagentIdがあれば更新、なければ追加
    const existingIndex = existingAgents.findIndex(a => a.agentId === agent.agentId);
    if (existingIndex >= 0) {
      // 既存のAgentを更新
      const updatedAgents = [...existingAgents];
      updatedAgents[existingIndex] = agent;
      newAgents.set(specId, updatedAgents);
    } else {
      // 新規追加
      newAgents.set(specId, [...existingAgents, agent]);
    }

    return { agents: newAgents };
  });
},
```

## Dependencies
- `electron-sdd-manager/src/renderer/stores/agentStore.ts` - 修正対象

## Testing Strategy
1. **単体テスト**: `agentStore.test.ts`に重複追加のテストケースを追加
   - 同じagentIdで2回`addAgent`を呼び出し、1つしか存在しないことを確認
   - `addAgent`で更新された情報が反映されることを確認
2. **E2Eテスト**: Agentを起動し、Agent一覧に重複がないことを確認
3. **手動テスト**: 実際にspecを選択し、Agent実行後に一覧を確認
