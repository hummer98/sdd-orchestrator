# Bug Fix: agent-selection-scope-mismatch

## Summary
Agent追加時の自動選択ロジックを修正し、現在選択中のspec/bugと一致する場合のみ自動選択するように変更。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `agentStore.ts` | onAgentRecordChangedイベントリスナーの自動選択ロジックを修正 |
| `agentStore.test.ts` | 自動選択スコープのテストケース7件を追加 |

### Code Changes

**agentStore.ts - 自動選択ロジックの修正**
```diff
 if (type === 'add') {
-  get().selectAgent(agentInfo.agentId);
+  // Project Agent（specId=''）は常に自動選択
+  if (agentInfo.specId === '') {
+    get().selectAgent(agentInfo.agentId);
+  } else {
+    // Spec/Bug Agentは選択中のspec/bugと一致する場合のみ自動選択
+    // Dynamic import to avoid circular dependency
+    import('./specStore').then(({ useSpecStore }) => {
+      const { selectedSpec } = useSpecStore.getState();
+      // Bug agents use 'bug:{bugName}' format
+      if (agentInfo.specId.startsWith('bug:')) {
+        import('./bugStore').then(({ useBugStore }) => {
+          const { selectedBug } = useBugStore.getState();
+          const expectedSpecId = selectedBug ? `bug:${selectedBug.name}` : '';
+          if (agentInfo.specId === expectedSpecId) {
+            get().selectAgent(agentInfo.agentId);
+          }
+        });
+      } else if (selectedSpec && agentInfo.specId === selectedSpec.name) {
+        get().selectAgent(agentInfo.agentId);
+      }
+    });
+  }
 }
```

## Implementation Notes

### 自動選択のルール
| Agent Type | 条件 | 自動選択 |
|------------|------|---------|
| Project Agent | specId === '' | 常に自動選択 |
| Spec Agent | specId === selectedSpec.name | 一致時のみ自動選択 |
| Bug Agent | specId === `bug:${selectedBug.name}` | 一致時のみ自動選択 |
| 不一致 | 上記以外 | 自動選択しない |

### Dynamic Import
- 循環依存を回避するため、specStoreとbugStoreはdynamic importを使用
- 非同期処理だが、自動選択の遅延はUX上問題なし

## Breaking Changes
- [x] No breaking changes

既存の動作は変更なし（Project Agentは引き続き常に自動選択）

## Rollback Plan
1. git revert でコミットを取り消し
2. 元の単純な自動選択ロジックに戻る

## Test Results
```
Test Files  1 passed (1)
     Tests  62 passed (62)
  Duration  1.09s
```

### 追加されたテストケース
1. `should auto-select Project Agent (specId="") regardless of selected spec`
2. `should auto-select agent when specId matches selected spec`
3. `should NOT auto-select agent when specId does not match selected spec`
4. `should NOT auto-select agent when no spec is selected`
5. `should auto-select Bug Agent when selected bug matches`
6. `should NOT auto-select Bug Agent when selected bug does not match`
7. `should still add agent to Map even when not auto-selected`

## Related Commits
- `bc60e26` fix(ui): unify AgentListPanel and fix agent auto-selection scope
- `3fcb758` test(agent): add unit tests for agent auto-selection scope fix
