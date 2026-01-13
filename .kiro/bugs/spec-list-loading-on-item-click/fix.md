# Bug Fix: spec-list-loading-on-item-click

## Summary
`isLoading`を`isLoading`（リスト用）と`isDetailLoading`（詳細パネル用）に分離し、SpecListItemクリック時にリスト全体がスピナー表示になる問題を修正。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/stores/spec/types.ts` | `SpecStoreState`に`isDetailLoading`プロパティを追加 |
| `electron-sdd-manager/src/renderer/stores/spec/specStoreFacade.ts` | `getAggregatedState()`で`isLoading`と`isDetailLoading`を分離 |

### Code Changes

**types.ts** - `isDetailLoading`プロパティ追加:
```diff
 export interface SpecStoreState
   extends SpecListState,
     Omit<SpecDetailState, 'isLoading' | 'error'>,
     AutoExecutionState {
   readonly isWatching: boolean;
   readonly specManagerExecution: SpecManagerExecutionState;
+  /**
+   * Bug fix: spec-list-loading-on-item-click
+   * Separate loading state for detail panel to prevent list from showing spinner
+   * when selecting a spec item
+   */
+  readonly isDetailLoading: boolean;
 }
```

**specStoreFacade.ts** - ローディング状態の分離:
```diff
-    // SpecDetailStore state (merged isLoading/error from list store)
+    // SpecDetailStore state
+    // Bug fix: spec-list-loading-on-item-click
+    // Separated isLoading (list) from isDetailLoading (detail panel)
+    // to prevent SpecList from showing spinner when selecting a spec
     selectedSpec: detailState.selectedSpec,
     specDetail: detailState.specDetail,
-    isLoading: listState.isLoading || detailState.isLoading,
+    isLoading: listState.isLoading,
+    isDetailLoading: detailState.isLoading,
     error: listState.error || detailState.error,
```

## Implementation Notes
- `SpecList.tsx`は変更不要。既存の`isLoading`参照がそのままリスト用ローディング状態を参照する
- `isDetailLoading`は詳細パネル（SpecDetail等）で必要に応じて使用可能
- 後方互換性を維持（既存コードは`isLoading`をリスト用として継続使用）

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. `types.ts`から`isDetailLoading`プロパティを削除
2. `specStoreFacade.ts`の`getAggregatedState()`を元の統合ロジックに戻す

## Related Commits
- （コミット予定）
