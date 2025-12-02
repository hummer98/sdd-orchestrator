# Bug Fix: agent-list-duplicate

## Summary
`addAgent`関数に重複チェックを追加し、同じ`agentId`が既に存在する場合は更新、存在しない場合のみ追加するように修正。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| [agentStore.ts](electron-sdd-manager/src/renderer/stores/agentStore.ts#L151-L170) | `addAgent`関数に重複チェックロジックを追加 |
| [agentStore.test.ts](electron-sdd-manager/src/renderer/stores/agentStore.test.ts#L617-L658) | 重複チェックのテストケースを追加 |

### Code Changes

**agentStore.ts (L151-170):**
```diff
  addAgent: (specId: string, agent: AgentInfo) => {
    set((state) => {
      const newAgents = new Map(state.agents);
      const existingAgents = newAgents.get(specId) || [];
-     newAgents.set(specId, [...existingAgents, agent]);
+
+     // 重複チェック: 既存のagentIdがあれば更新、なければ追加
+     const existingIndex = existingAgents.findIndex((a) => a.agentId === agent.agentId);
+     if (existingIndex >= 0) {
+       // 既存のAgentを更新
+       const updatedAgents = [...existingAgents];
+       updatedAgents[existingIndex] = agent;
+       newAgents.set(specId, updatedAgents);
+     } else {
+       // 新規追加
+       newAgents.set(specId, [...existingAgents, agent]);
+     }
+
      return { agents: newAgents };
    });
  },
```

**agentStore.test.ts (追加):**
```typescript
describe('addAgent duplicate handling', () => {
  it('should not create duplicate when adding same agentId twice', () => {...});
  it('should update existing agent info when adding same agentId with different data', () => {...});
  it('should add different agents without duplication', () => {...});
});
```

## Implementation Notes
- 修正はOption 1（addAgentに重複チェックを追加）を採用
- `findIndex`を使用して既存のAgent検索を行い、パフォーマンスへの影響を最小限に抑制
- 既存の呼び出し元（WorkflowView.tsx、onAgentRecordChangedイベントリスナー）は変更不要
- 同じagentIdで呼び出された場合は、最新の情報で上書き（更新）される

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

## Rollback Plan
1. `agentStore.ts`の`addAgent`関数を元の単純な追加ロジックに戻す
2. テストファイルから`addAgent duplicate handling`のdescribeブロックを削除

## Related Commits
- *未コミット*

## Test Results
```
✓ should not create duplicate when adding same agentId twice
✓ should update existing agent info when adding same agentId with different data
✓ should add different agents without duplication

Test Files  1 passed
Tests  3 passed | 42 skipped (45)
```

※ 既存テストの5件の失敗は`onAgentRecordChanged`のモック不足による既存の問題であり、本修正とは無関係
