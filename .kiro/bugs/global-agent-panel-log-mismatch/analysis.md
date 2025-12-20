# Bug Analysis: global-agent-panel-log-mismatch

## Summary
GlobalAgentPanelでグローバルエージェントをクリックしても、AgentLogPanelにそのログが表示されない。クリック直後にAgentListPanelのuseEffectが発火し、選択状態を上書きしてしまうことが原因。

## Root Cause

### Technical Details
- **Location**: [AgentListPanel.tsx:94-113](electron-sdd-manager/src/renderer/components/AgentListPanel.tsx#L94-L113)
- **Component**: AgentListPanel の useEffect
- **Trigger**: `selectedAgentId` が依存配列に含まれており、選択変更のたびに発火

### 競合シーケンス

1. ユーザーがGlobalAgentPanelでグローバルエージェントをクリック
2. `selectAgent('global-agent-id')` が呼ばれる
3. `selectedAgentId` が 'global-agent-id' に変更される
4. **AgentListPanelのuseEffectが発火**（`selectedAgentId` が依存配列に含まれているため）
5. `selectedSpec` が存在し、そのspecにエージェントがいる場合、**そちらのエージェントを選択** → **選択が上書きされる**
6. 結果: AgentLogPanelはspec側のエージェントログを表示

### 問題のコード

```typescript
// AgentListPanel.tsx:94-113
useEffect(() => {
  if (!selectedSpec) return;

  const specAgents = getAgentsForSpec(selectedSpec.name)...;

  // この条件が問題: グローバルエージェントを選択した場合でも
  // specAgentsには含まれないため、条件を通過してしまう
  const currentSelectedAgent = specAgents.find(a => a.agentId === selectedAgentId);
  if (currentSelectedAgent) return; // グローバルエージェントは見つからない

  // specAgentsがあれば、そちらを選択してしまう
  if (specAgents.length > 0) {
    selectAgent(specAgents[0].agentId); // ← ここでグローバルエージェントの選択が上書きされる
  }
}, [selectedSpec?.name, selectedAgentId, getAgentsForSpec, selectAgent]);
```

## Impact Assessment
- **Severity**: Medium
- **Scope**: GlobalAgentPanel経由でエージェントを選択するすべてのユーザー操作に影響
- **Risk**: 修正は局所的だが、自動選択ロジックの変更によりUXへの影響を考慮する必要あり

## Related Code
- [GlobalAgentPanel.tsx:161](electron-sdd-manager/src/renderer/components/GlobalAgentPanel.tsx#L161) - `selectAgent` 呼び出し
- [agentStore.ts:111-127](electron-sdd-manager/src/renderer/stores/agentStore.ts#L111-L127) - `selectAgent` 実装
- [AgentListPanel.tsx:94-113](electron-sdd-manager/src/renderer/components/AgentListPanel.tsx#L94-L113) - 問題のuseEffect

## Proposed Solution

### Option 1: グローバルエージェント選択時はuseEffectをスキップ（推奨）
- Description: `selectedAgentId` に対応するエージェントが**グローバルエージェント**（specId=''）の場合、自動選択をスキップする
- Pros: 最小限の変更で問題を解決、既存の自動選択ロジックを維持
- Cons: `getAgentById` を呼び出す追加コストがあるが軽微

```typescript
useEffect(() => {
  if (!selectedSpec) return;

  // 現在選択中のエージェントがグローバルエージェントならスキップ
  if (selectedAgentId) {
    const currentAgent = getAgentById(selectedAgentId);
    if (currentAgent && currentAgent.specId === '') return;
  }

  // ...既存ロジック
}, [selectedSpec?.name, selectedAgentId, getAgentsForSpec, selectAgent, getAgentById]);
```

### Option 2: 依存配列から `selectedAgentId` を削除
- Description: useEffectの依存配列から `selectedAgentId` を削除し、spec変更時のみ発火
- Pros: シンプルな変更
- Cons: 一部の自動選択シナリオが動作しなくなる可能性

### Recommended Approach
**Option 1** を推奨。グローバルエージェント選択時のみスキップすることで、既存のUXを維持しつつバグを解決できる。

## Dependencies
- [agentStore.ts](electron-sdd-manager/src/renderer/stores/agentStore.ts) - `getAgentById` メソッドの利用

## Testing Strategy
1. プロジェクトを選択した状態で、specにエージェントがいる場合
2. GlobalAgentPanelでグローバルエージェントをクリック
3. AgentLogPanelにグローバルエージェントのログが表示されることを確認
4. spec側のエージェントをクリックした場合も正常に切り替わることを確認
