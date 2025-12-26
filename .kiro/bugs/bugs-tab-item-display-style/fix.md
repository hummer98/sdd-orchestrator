# Bug Fix: bugs-tab-item-display-style

## Summary
BugListItemの進捗インジケータをSpecListItemと同様のシンプルなフェーズバッジ（pill形式）に変更

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/components/BugListItem.tsx` | BugProgressIndicatorをフェーズバッジに置き換え |
| `electron-sdd-manager/src/renderer/components/BugListItem.test.tsx` | テストを新しいバッジ形式に更新 |

### Code Changes

**BugListItem.tsx - インポートとフェーズ定数の変更:**
```diff
- import type { BugMetadata } from '../types';
- import { BugProgressIndicator, BugPhaseLabel } from './BugProgressIndicator';
+ import type { BugMetadata, BugPhase } from '../types';
+
+ const PHASE_LABELS: Record<BugPhase, string> = {
+   reported: '報告済',
+   analyzed: '分析済',
+   fixed: '修正済',
+   verified: '検証済',
+ };
+
+ const PHASE_COLORS: Record<BugPhase, string> = {
+   reported: 'bg-red-100 text-red-700',
+   analyzed: 'bg-yellow-100 text-yellow-700',
+   fixed: 'bg-blue-100 text-blue-700',
+   verified: 'bg-green-100 text-green-700',
+ };
```

**BugListItem.tsx - 2行目の表示変更:**
```diff
- {/* Row 2: Progress indicator, phase label, and update time */}
- <div className="flex items-center gap-2">
-   <BugProgressIndicator phase={bug.phase} compact />
-   <BugPhaseLabel phase={bug.phase} />
-   <span className="text-xs text-gray-400 ml-auto" title={tooltipDate}>
-     {formattedDate}
-   </span>
- </div>
+ {/* Row 2: Phase badge and update time */}
+ <div className="flex items-center gap-2">
+   <span
+     className={clsx(
+       'px-2 py-0.5 text-xs rounded-full',
+       PHASE_COLORS[bug.phase]
+     )}
+   >
+     {PHASE_LABELS[bug.phase]}
+   </span>
+   <span className="text-xs text-gray-400" title={tooltipDate}>
+     {formattedDate}
+   </span>
+ </div>
```

## Implementation Notes
- SpecListItemと同様のpill形式フェーズバッジを採用
- フェーズごとに異なる背景色・文字色を設定（reported: 赤、analyzed: 黄、fixed: 青、verified: 緑）
- BugProgressIndicatorとBugPhaseLabelのインポートを削除（コンポーネント自体は他で使用される可能性があるため残存）
- テストを日本語ラベルに更新

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. `BugProgressIndicator`と`BugPhaseLabel`のインポートを復元
2. 2行目の表示を元のコンポーネント使用形式に戻す
3. テストを英語ラベルに戻す

## Related Commits
- *未コミット（修正完了後にコミット予定）*
