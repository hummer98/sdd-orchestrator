# Bug Fix: global-agent-panel-log-mismatch

## Summary
AgentListPanelのuseEffectにグローバルエージェント選択時のスキップ条件を追加し、選択状態の上書きを防止

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| [AgentListPanel.tsx](electron-sdd-manager/src/renderer/components/AgentListPanel.tsx) | `getAgentById` を追加し、グローバルエージェント選択時はauto-selectをスキップ |
| [AgentListPanel.test.tsx](electron-sdd-manager/src/renderer/components/AgentListPanel.test.tsx) | すべてのモックに `getAgentById` を追加、新規テストケース追加 |

### Code Changes

**AgentListPanel.tsx:71** - `getAgentById` をストアから取得
```diff
- const { selectedAgentId, stopAgent, selectAgent, getAgentsForSpec, removeAgent, loadAgents, agents } = useAgentStore();
+ const { selectedAgentId, stopAgent, selectAgent, getAgentsForSpec, getAgentById, removeAgent, loadAgents, agents } = useAgentStore();
```

**AgentListPanel.tsx:94-120** - グローバルエージェント選択時のスキップ条件を追加
```diff
  useEffect(() => {
    if (!selectedSpec) return;

+   // Skip auto-select if a global agent is currently selected
+   // (Global agents have specId === '')
+   if (selectedAgentId) {
+     const currentAgent = getAgentById(selectedAgentId);
+     if (currentAgent && currentAgent.specId === '') return;
+   }
+
    // Get fresh agents list for the new spec
    const specAgents = getAgentsForSpec(selectedSpec.name)
      ...
-  }, [selectedSpec?.name, selectedAgentId, getAgentsForSpec, selectAgent]);
+  }, [selectedSpec?.name, selectedAgentId, getAgentsForSpec, getAgentById, selectAgent]);
```

**AgentListPanel.test.tsx** - 新規テストケース追加
```typescript
it('should not auto-select if a global agent is currently selected', () => {
  const globalAgent = { ...baseAgentInfo, agentId: 'global-agent-1', specId: '' };
  const specAgent = { ...baseAgentInfo, agentId: 'spec-agent-1', specId: 'spec-1' };
  // ... setup and render
  expect(mockSelectAgent).not.toHaveBeenCalled();
});
```

## Implementation Notes
- 分析で推奨されたOption 1（グローバルエージェント選択時のスキップ）を実装
- `getAgentById` を使用して現在選択中のエージェントの `specId` を確認
- `specId === ''` の場合はグローバルエージェントと判定し、auto-selectをスキップ
- 既存の自動選択ロジック（spec変更時）は維持

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. `AgentListPanel.tsx` の変更を revert
2. `AgentListPanel.test.tsx` のテストケース追加を revert

## Test Results
```
 Test Files  2 passed (2)
      Tests  40 passed (40)
```

## Related Commits
- *Pending commit*
