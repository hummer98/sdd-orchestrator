# Bug Fix: bugs-tab-empty-panel-display

## Summary
BugArtifactEditorのタブ表示ロジックをArtifactEditorと同等に修正し、存在するファイルのタブのみ表示するように変更。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| [BugArtifactEditor.tsx](electron-sdd-manager/src/renderer/components/BugArtifactEditor.tsx) | タブフィルタリング、空状態のフォールバック、自動タブ切り替えを追加 |
| [BugArtifactEditor.test.tsx](electron-sdd-manager/src/renderer/components/BugArtifactEditor.test.tsx) | 新仕様に合わせたテスト更新 |

### Code Changes

**1. useEffectのインポート追加**
```diff
- import { useState, useMemo } from 'react';
+ import { useState, useMemo, useEffect } from 'react';
```

**2. availableTabsフィルタリングの追加**
```diff
+ // Filter tabs to only show existing artifacts (matching ArtifactEditor behavior)
+ const availableTabs = useMemo((): TabConfig[] => {
+   if (!bugDetail?.artifacts) {
+     return [];
+   }
+   return TAB_CONFIGS.filter((tab) => {
+     const artifact = bugDetail.artifacts[tab.key];
+     return artifact !== null && artifact.exists;
+   });
+ }, [bugDetail?.artifacts]);
+
+ // If current activeTab doesn't exist, switch to first available tab
+ useEffect(() => {
+   if (availableTabs.length > 0 && !availableTabs.find((t) => t.key === activeTab)) {
+     setActiveTab(availableTabs[0].key);
+   }
+ }, [availableTabs, activeTab]);
```

**3. タブ0件時のフォールバック表示**
```diff
+ // If no artifacts exist, show placeholder
+ if (availableTabs.length === 0) {
+   return (
+     <div
+       data-testid="bug-artifact-editor"
+       className="flex items-center justify-center h-full text-gray-400"
+     >
+       表示可能なドキュメントがありません
+     </div>
+   );
+ }
```

**4. タブレンダリングをavailableTabsに変更**
```diff
- {TAB_CONFIGS.map((tab) => (
+ {availableTabs.map((tab) => (
```

## Implementation Notes
- ArtifactEditor.tsx:107-117のパターンを参考に実装
- `bugDetail.artifacts[tab.key]`がnullまたはexists: falseの場合、タブを非表示
- アクティブタブが存在しなくなった場合は自動的に最初の利用可能なタブに切り替え
- 全アーティファクトが存在しない場合は「表示可能なドキュメントがありません」を表示

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. `git revert <commit-hash>` で変更を元に戻す
2. テスト実行: `npx vitest run src/renderer/components/BugArtifactEditor.test.tsx`

## Related Commits
- *修正は未コミット*
