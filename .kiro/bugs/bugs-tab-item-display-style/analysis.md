# Bug Analysis: bugs-tab-item-display-style

## Summary
BugsタブのBugListItemは4段階進捗インジケータ（BugProgressIndicator）を表示しているが、SpecListItemのようにシンプルなフェーズバッジ（pill形式）で統一したい。進捗アイコン表示は不要。

## Root Cause
現在のBugListItemは`BugProgressIndicator`と`BugPhaseLabel`という2つのコンポーネントを使用してバグの状態を表示しているが、SpecListItemはシンプルな`<span>`タグでフェーズをバッジとして表示している。この設計の違いが表示スタイルの不統一を生んでいる。

### Technical Details
- **Location**: `electron-sdd-manager/src/renderer/components/BugListItem.tsx:106-108`
- **Component**: BugListItem
- **Trigger**: バグリストでアイテムが表示される際に、SpecListとは異なる進捗表示コンポーネントが使用されている

## Impact Assessment
- **Severity**: Low（UIの一貫性に関する問題）
- **Scope**: Bugsタブのリスト表示のみ
- **Risk**: 修正の副作用は低い（BugProgressIndicatorの削除はBugListItemのみで使用）

## Related Code

### 現在のBugListItem (問題箇所)
```tsx
{/* Row 2: Progress indicator, phase label, and update time */}
<div className="flex items-center gap-2">
  <BugProgressIndicator phase={bug.phase} compact />
  <BugPhaseLabel phase={bug.phase} />
  <span className="text-xs text-gray-400 ml-auto" title={tooltipDate}>
    {formattedDate}
  </span>
</div>
```

### SpecListItemのスタイル（目標）
```tsx
{/* 2行目: フェーズ、エージェント数、更新日時 */}
<div className="flex items-center gap-2">
  <span className={clsx('px-2 py-0.5 text-xs rounded-full', PHASE_COLORS[spec.phase])}>
    {PHASE_LABELS[spec.phase]}
  </span>
  <span className="text-xs text-gray-400" title={tooltipDate}>
    {formattedDate}
  </span>
</div>
```

## Proposed Solution

### Option 1: BugListItemをSpecListItem形式に統一
- Description: BugProgressIndicatorとBugPhaseLabelを削除し、SpecListItemと同じフェーズバッジ形式に変更
- Pros: UIの一貫性が向上、シンプルな実装
- Cons: 進捗の視覚的表現が減少（ただしユーザー要望により不要）

### Recommended Approach
Option 1を採用。BugListItemの2行目をSpecListItemと同様のフェーズバッジ形式に変更する。

**変更内容:**
1. `BugProgressIndicator`と`BugPhaseLabel`のインポートを削除
2. フェーズのラベルと色のマッピング定数を追加（PHASE_LABELS, PHASE_COLORS）
3. 2行目の表示をSpecListItemと同様のpill形式バッジに変更

## Dependencies
- `BugProgressIndicator` - BugListItem専用の場合は削除検討
- 既存のテスト（BugListItem.test.tsx）の更新が必要

## Testing Strategy
1. `BugListItem.test.tsx`の更新（BugProgressIndicatorの参照削除）
2. UIの目視確認（フェーズバッジが正しく表示されること）
3. フェーズごとの色が正しく適用されること
