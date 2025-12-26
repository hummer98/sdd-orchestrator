# Bug Analysis: agent-selection-scope-mismatch

## Status: **FIXED** (コード修正済み、テスト未実施)

## Summary
Agent追加時の自動選択ロジックがspec IDを考慮せず、全てのagent追加イベントで無条件に自動選択を実行してしまう問題。

## Root Cause
`agentStore.ts`の`onAgentRecordChanged`イベントリスナーにおいて、新規agent追加時（`type === 'add'`）に、現在選択中のspec IDと追加されたagentのspec IDを比較せずに自動選択を実行していた。

### Technical Details
- **Location**: `electron-sdd-manager/src/renderer/stores/agentStore.ts:423-448`
- **Component**: AgentStore (Zustand store)
- **Trigger**: ファイル監視によるagentレコード追加イベント

## Applied Fix
修正コード（適用済み）:
```typescript
if (type === 'add') {
  // Project Agent（specId=''）は常に自動選択
  if (agentInfo.specId === '') {
    get().selectAgent(agentInfo.agentId);
  } else {
    // Spec/Bug Agentは選択中のspec/bugと一致する場合のみ自動選択
    // Dynamic import to avoid circular dependency
    import('./specStore').then(({ useSpecStore }) => {
      const { selectedSpec } = useSpecStore.getState();
      // Bug agents use 'bug:{bugName}' format
      if (agentInfo.specId.startsWith('bug:')) {
        import('./bugStore').then(({ useBugStore }) => {
          const { selectedBug } = useBugStore.getState();
          const expectedSpecId = selectedBug ? `bug:${selectedBug.name}` : '';
          if (agentInfo.specId === expectedSpecId) {
            get().selectAgent(agentInfo.agentId);
          }
        });
      } else if (selectedSpec && agentInfo.specId === selectedSpec.name) {
        get().selectAgent(agentInfo.agentId);
      }
    });
  }
}
```

## Fix Summary
| Agent種別 | 条件 | 動作 |
|-----------|------|------|
| Project Agent (specId='') | 常時 | 自動選択 |
| Spec Agent | 選択中Specと一致 | 自動選択 |
| Spec Agent | 選択中Specと不一致 | Mapへの追加のみ |
| Bug Agent (specId='bug:*') | 選択中Bugと一致 | 自動選択 |
| Bug Agent | 選択中Bugと不一致 | Mapへの追加のみ |

## Impact Assessment
- **Severity**: Medium
- **Scope**: 複数のspecを同時に操作する場合のUX低下
- **Risk**: 低（表示上の問題のみ）

## Dependencies
- `specStore.ts`: selectedSpec状態を参照（dynamic import）
- `bugStore.ts`: selectedBug状態を参照（dynamic import）

## Remaining Tasks
1. **ユニットテスト追加**: `agentStore.test.ts`に以下のテストケースを追加
   - 選択中のspecと同じspecIdのagent追加 → 自動選択される
   - 選択中のspecと異なるspecIdのagent追加 → 自動選択されない
   - spec未選択時のagent追加 → 自動選択されない
   - Project Agent（specId=''）追加 → 常に自動選択される
   - Bug Agent（選択中Bugと一致）→ 自動選択される
   - Bug Agent（選択中Bugと不一致）→ 自動選択されない

2. **手動テスト**:
   - Spec Aを選択した状態でSpec Bのagentを起動 → Spec Aの表示が維持される
   - Spec Aのagentを起動した場合は自動選択されることを確認
