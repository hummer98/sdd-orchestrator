# Bug Analysis: agent-log-auto-select-rule

## Summary
Agentログエリアの自動選択ルールを変更する機能改善リクエスト。現在の実装では保存された選択状態の復元を優先しているが、要件では実行中Agentの自動選択を優先すべき。

## Root Cause

### Technical Details
- **Location**: `electron-sdd-manager/src/shared/stores/agentStore.ts:222-263` (`autoSelectAgentForSpec`)
- **Component**: SharedAgentStore (Agent状態管理)
- **Trigger**: Spec/Bug選択時にautoSelectAgentForSpecが呼び出される

### 問題点

現在の`autoSelectAgentForSpec`実装 (L222-263):
```typescript
autoSelectAgentForSpec: (specId: string) => {
  const state = get();

  // 1. 保存された選択状態を優先チェック ← 問題: これが最初
  const savedAgentId = state.selectedAgentIdBySpec.get(specId);
  if (savedAgentId) {
    const savedAgent = state.agents.get(savedAgentId);
    if (savedAgent) {
      set({ selectedAgentId: savedAgentId });
      return; // ← 実行中Agentがあっても保存状態を復元して終了
    }
  }

  // 2. 実行中Agentがある場合のみ自動選択
  const runningAgents = specAgents.filter((agent) => agent.status === 'running');
  if (runningAgents.length === 0) {
    return; // ← 実行中がなければ何もしない（nullを設定しない）
  }
  // 最新の実行中Agentを選択
}
```

**要件との差異**:

| 観点 | 現在の動作 | 要件 |
|------|-----------|------|
| 優先順位 | 保存状態 > 実行中Agent | 実行中Agent > 保存状態 |
| 実行中なし | 何もしない（前の選択を維持） | Agentログエリアを空にする |
| 未選択状態 | specIdベースの判定のみ | グローバルな実行中Agent自動選択 |

### 影響範囲

1. **specDetailStore.ts:49-52**: Spec選択時にautoSelectAgentForSpecを呼び出し
2. **bugStore.ts**: Bug選択時にautoSelectAgentForSpec未呼び出し（一貫性の問題）
3. **agentStore.ts (renderer)**: onAgentRecordChangedでの自動選択ロジック（L501-526）

## Impact Assessment
- **Severity**: Medium
- **Scope**: Spec/Bug選択時のAgentログ表示、実行中Agent監視
- **Risk**: 低（UI動作の改善、既存機能への影響は限定的）

## Related Code

### 現在のautoSelectAgentForSpec (shared/stores/agentStore.ts)
```typescript
// L222-263
autoSelectAgentForSpec: (specId: string) => {
  const state = get();

  // Check for saved selection (問題: 最優先になっている)
  const savedAgentId = state.selectedAgentIdBySpec.get(specId);
  if (savedAgentId) {
    const savedAgent = state.agents.get(savedAgentId);
    if (savedAgent) {
      set({ selectedAgentId: savedAgentId });
      return;
    }
  }

  // Get agents for this spec
  const specAgents = Array.from(state.agents.values()).filter(
    (agent) => agent.specId === specId
  );

  // Filter to running agents only
  const runningAgents = specAgents.filter((agent) => agent.status === 'running');

  if (runningAgents.length === 0) {
    return; // 問題: nullを設定していない
  }

  // Select the most recent running agent
  const sortedAgents = runningAgents.sort((a, b) => {
    const timeA = new Date(a.startedAt).getTime();
    const timeB = new Date(b.startedAt).getTime();
    return timeB - timeA;
  });

  const selectedAgentId = sortedAgents[0].id;
  // ...
}
```

## Proposed Solution

### Option 1: autoSelectAgentForSpecの修正（推奨）

SharedAgentStoreの`autoSelectAgentForSpec`を以下のロジックに変更:

```typescript
autoSelectAgentForSpec: (specId: string | null) => {
  const state = get();

  // Case 1: spec/bugが未選択（specId === null）
  if (specId === null) {
    // 全Agentから実行中のものを取得
    const allRunningAgents = Array.from(state.agents.values())
      .filter((agent) => agent.status === 'running');

    if (allRunningAgents.length === 0) {
      // 実行中なし → 選択をクリア（Agentログエリア空）
      set({ selectedAgentId: null });
      return;
    }

    // 最新の実行中Agentを選択
    const newest = allRunningAgents.sort((a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    )[0];
    set({ selectedAgentId: newest.id });
    return;
  }

  // Case 2: spec/bugが選択されている
  const specAgents = Array.from(state.agents.values())
    .filter((agent) => agent.specId === specId);

  const runningAgents = specAgents.filter((a) => a.status === 'running');

  if (runningAgents.length === 0) {
    // 実行中なし → 選択をクリア（Agentログエリア空）
    set({ selectedAgentId: null });
    return;
  }

  // 最新の実行中Agentを選択
  const newest = runningAgents.sort((a, b) =>
    new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  )[0];

  // per-spec状態も更新
  const newMap = new Map(state.selectedAgentIdBySpec);
  newMap.set(specId, newest.id);
  set({ selectedAgentId: newest.id, selectedAgentIdBySpec: newMap });
}
```

- **Pros**:
  - 要件を満たす
  - 実行中Agentの状態に基づく直感的な動作
  - selectedAgentIdBySpecキャッシュを廃止してシンプル化
- **Cons**:
  - 以前の選択状態が復元されなくなる（トレードオフ）

### Recommended Approach

**Option 1を採用**。理由:
1. 要件を完全に満たす
2. 実行中Agentの監視という主目的に沿った動作
3. 「保存された選択状態の復元」は実行中Agentがある場合は不要（ユーザーは実行状況を見たい）

## Dependencies
- `electron-sdd-manager/src/shared/stores/agentStore.ts`: autoSelectAgentForSpec修正
- `electron-sdd-manager/src/renderer/stores/spec/specDetailStore.ts`: 呼び出し側（変更不要）
- `electron-sdd-manager/src/renderer/stores/bugStore.ts`: autoSelectAgentForSpec呼び出し追加が必要

## Testing Strategy
1. **Unit Tests** (`shared/stores/agentStore.test.ts`):
   - spec未選択 + 実行中Agentあり → 最新の実行中Agent選択
   - spec未選択 + 実行中Agentなし → selectedAgentId = null
   - spec選択 + そのspecで実行中Agentあり → 最新の実行中Agent選択
   - spec選択 + そのspecで実行中Agentなし → selectedAgentId = null
   - 複数実行中Agent → startedAtが最新のものを選択

2. **Integration Tests**:
   - Spec選択時のAgentログパネル表示確認
   - Bug選択時のAgentログパネル表示確認
   - Agent完了時のAgentログパネル自動クリア確認
