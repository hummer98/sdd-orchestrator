# Bug Fix: agent-log-shows-selection-without-spec

## Summary
タブ切り替え時およびプロジェクト選択時に、Agent選択をクリアすることで、古いAgentログが表示され続ける問題を修正。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| [DocsTabs.tsx](electron-sdd-manager/src/renderer/components/DocsTabs.tsx) | タブ切り替え時に`selectAgent(null)`を呼び出し |
| [projectStore.ts](electron-sdd-manager/src/renderer/stores/projectStore.ts) | プロジェクト選択時に`selectAgent(null)`を呼び出し |
| [DocsTabs.test.tsx](electron-sdd-manager/src/renderer/components/DocsTabs.test.tsx) | Agent選択クリアのテストを追加 |

### Code Changes

#### DocsTabs.tsx
```diff
-import { useProjectStore, useSpecStore, useBugStore } from '../stores';
+import { useProjectStore, useSpecStore, useBugStore, useAgentStore } from '../stores';

 const { currentProject } = useProjectStore();
 const { clearSelectedSpec } = useSpecStore();
 const { clearSelectedBug } = useBugStore();
+const { selectAgent } = useAgentStore();

 /**
  * Handle tab change with mutual exclusion of selection state
  * Bug fix: bugs-tab-selection-not-updating
  * When switching tabs, clear the selection from the opposite store
  * to ensure App.tsx conditional rendering works correctly
+ * Bug fix: agent-log-shows-selection-without-spec
+ * Also clear agent selection to prevent stale agent logs from being displayed
  */
 const handleTabChange = (tabId: DocsTab) => {
   if (tabId === 'specs') {
     clearSelectedBug();
   } else {
     clearSelectedSpec();
   }
+  selectAgent(null);
   onTabChange(tabId);
 };
```

#### projectStore.ts
```diff
 import { useSpecStore } from './specStore';
 import { useBugStore } from './bugStore';
+import { useAgentStore } from './agentStore';

 // ... in selectProject function ...

 if (result.bugs) {
   useBugStore.getState().setBugs(result.bugs);
 }
+
+// Bug fix: agent-log-shows-selection-without-spec
+// Clear agent selection when switching projects to prevent stale agent logs
+useAgentStore.getState().selectAgent(null);
```

#### DocsTabs.test.tsx
```diff
+// Bug fix: agent-log-shows-selection-without-spec
+it('should clear agent selection when switching tabs', () => {
+  render(<DocsTabsWrapper />);
+
+  fireEvent.click(screen.getByTestId('tab-bugs'));
+
+  expect(mockSelectAgent).toHaveBeenCalledWith(null);
+});
```

## Implementation Notes
- 既存の`selectAgent(null)`関数を利用し、新たな関数の追加は不要
- タブ切り替え時は両タブへの切り替えでAgent選択をクリア（対称的な処理）
- プロジェクト選択時はSpec/Bug同期後、ファイルウォッチャー登録前にクリア

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

## Rollback Plan
1. DocsTabs.tsxから`selectAgent(null)`の呼び出しを削除
2. projectStore.tsから`useAgentStore`のインポートと`selectAgent(null)`の呼び出しを削除
3. DocsTabs.test.tsxから追加したテストケースを削除

## Test Results
- DocsTabs.test.tsx: 21 passed
- DocsTabs.integration.test.tsx: 16 passed

## Related Commits
- *To be committed*
