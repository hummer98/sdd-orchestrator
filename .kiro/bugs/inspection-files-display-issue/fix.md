# Bug Fix: inspection-files-display-issue

## Summary
Inspectionタブが最新1件のみ表示される問題を修正し、全ラウンドをDocument Reviewタブと同様に表示するように変更。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/components/SpecPane.tsx` | inspectionTabsロジックを全ラウンド表示に修正 |

### Code Changes

```diff
- import { getLatestInspectionReportFile, normalizeInspectionState } from '../types/inspection';
+ import { normalizeInspectionState } from '../types/inspection';
```

```diff
  // Build inspection tabs from spec.json inspection field (InspectionState)
  // Bug fix: inspection-state-data-model - normalize inspection state before use
+ // Bug fix: inspection-files-display-issue - show all inspection rounds (not just latest)
  const inspectionTabs = useMemo((): TabInfo[] => {
    const inspection = normalizeInspectionState(specDetail?.specJson?.inspection);
-   const reportFile = getLatestInspectionReportFile(inspection);
-   if (!reportFile) {
+   if (!inspection?.rounds || inspection.rounds.length === 0) {
      return [];
    }

-   const match = reportFile.match(/inspection-(\d+)\.md/);
-   if (!match) {
-     return [];
-   }
-
-   const n = parseInt(match[1], 10);
-   return [{
-     key: `inspection-${n}` as ArtifactType,
-     label: `Inspection-${n}`,
-   }];
+   // Sort by round number and create tabs for all rounds
+   const sortedRounds = [...inspection.rounds].sort((a, b) => a.number - b.number);
+   return sortedRounds.map(round => ({
+     key: `inspection-${round.number}` as ArtifactType,
+     label: `Inspection-${round.number}`,
+   }));
  }, [specDetail?.specJson?.inspection]);
```

## Implementation Notes
- Document Reviewタブと同様のパターンを採用
- `getLatestInspectionReportFile`関数のimportを削除（不要になった）
- ラウンド番号でソートして昇順表示
- 既存のテストは全てパス（10 tests passed）

## Breaking Changes
- [x] No breaking changes

既存の動作を拡張するのみで、後方互換性を維持。

## Rollback Plan
1. `SpecPane.tsx`の`inspectionTabs`を元のロジックに戻す
2. `getLatestInspectionReportFile`のimportを復元

## Related Commits
- *Pending commit*

## Test Results
```
 ✓ src/renderer/components/SpecPane.test.tsx > SpecPane > When no spec is selected > should show placeholder message
 ✓ src/renderer/components/SpecPane.test.tsx > SpecPane > When no spec is selected > should NOT render ArtifactEditor
 ✓ src/renderer/components/SpecPane.test.tsx > SpecPane > When no spec is selected > should NOT render AgentListPanel
 ✓ src/renderer/components/SpecPane.test.tsx > SpecPane > When no spec is selected > should NOT render WorkflowView
 ✓ src/renderer/components/SpecPane.test.tsx > SpecPane > When a spec is selected > should render ArtifactEditor
 ✓ src/renderer/components/SpecPane.test.tsx > SpecPane > When a spec is selected > should render AgentListPanel
 ✓ src/renderer/components/SpecPane.test.tsx > SpecPane > When a spec is selected > should render WorkflowView
 ✓ src/renderer/components/SpecPane.test.tsx > SpecPane > When a spec is selected > should render horizontal resize handle
 ✓ src/renderer/components/SpecPane.test.tsx > SpecPane > When a spec is selected > should render vertical resize handle
 ✓ src/renderer/components/SpecPane.test.tsx > SpecPane > When a spec is selected > should NOT show placeholder message

 Test Files  1 passed (1)
      Tests  10 passed (10)
```

TypeScript: No errors
