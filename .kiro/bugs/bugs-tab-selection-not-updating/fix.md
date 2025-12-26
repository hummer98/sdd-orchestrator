# Bug Fix: bugs-tab-selection-not-updating

## Summary
タブ切り替え時に相互排他的な選択状態クリアを追加し、Bugsタブ選択時にSpecの選択状態が残る問題を修正

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/components/DocsTabs.tsx` | タブ切り替え時に反対側のストアの選択をクリアする`handleTabChange`関数を追加 |
| `electron-sdd-manager/src/renderer/components/DocsTabs.test.tsx` | `useSpecStore`/`useBugStore`のモック追加と新規テストケース2件追加 |

### Code Changes

#### DocsTabs.tsx - Import追加
```diff
-import { useProjectStore } from '../stores';
+import { useProjectStore, useSpecStore, useBugStore } from '../stores';
```

#### DocsTabs.tsx - handleTabChange関数追加
```diff
 export function DocsTabs({ className }: DocsTabsProps): React.ReactElement {
   const [activeTab, setActiveTab] = useState<DocsTab>('specs');
   const [isCreateSpecDialogOpen, setIsCreateSpecDialogOpen] = useState(false);
   const [isCreateBugDialogOpen, setIsCreateBugDialogOpen] = useState(false);
   const { currentProject } = useProjectStore();
+  const { clearSelectedSpec } = useSpecStore();
+  const { clearSelectedBug } = useBugStore();
+
+  /**
+   * Handle tab change with mutual exclusion of selection state
+   * Bug fix: bugs-tab-selection-not-updating
+   * When switching tabs, clear the selection from the opposite store
+   * to ensure App.tsx conditional rendering works correctly
+   */
+  const handleTabChange = (tabId: DocsTab) => {
+    if (tabId === 'specs') {
+      clearSelectedBug();
+    } else {
+      clearSelectedSpec();
+    }
+    setActiveTab(tabId);
+  };
```

#### DocsTabs.tsx - onClick変更
```diff
-onClick={() => setActiveTab(config.id)}
+onClick={() => handleTabChange(config.id)}
```

## Implementation Notes
- 既存の`clearSelectedSpec()`と`clearSelectedBug()`を活用し、最小限の変更で修正
- App.tsxの条件分岐（`selectedSpec ? ... : selectedBug ? ...`）が正しく動作するようになった
- タブ切り替え時に以前の選択が失われるが、これは期待される動作

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. DocsTabs.tsxの`handleTabChange`関数を削除
2. `onClick`を元の`setActiveTab(config.id)`に戻す
3. import文から`useSpecStore, useBugStore`を削除

## Related Commits
- 未コミット（修正完了、検証待ち）

## Test Results
- DocsTabs.test.tsx: 20/20 パス
- 新規テストケース追加:
  - `should clear spec selection when switching to Bugs tab`
  - `should clear bug selection when switching to Specs tab`
