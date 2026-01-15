# Bug Fix: header-duplicate-spec-name

## Summary
ヘッダーのspec名二重表示を修正。`metadata.name`の表示を削除し、`feature_name`のみ表示するよう変更。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/App.tsx` | spec名表示を1つに統合 |

### Code Changes

```diff
 {/* Spec title in header */}
 {specDetail && specDetail.specJson && (
   <div className="ml-4 flex items-center gap-2">
     <span className="text-gray-400">/</span>
     <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
-      {specDetail.metadata.name}
-    </span>
-    <span className="text-sm text-gray-500">
-      {specDetail.specJson.feature_name || ''}
+      {specDetail.specJson.feature_name || specDetail.metadata.name}
     </span>
   </div>
 )}
```

## Implementation Notes
- `feature_name`を優先表示し、存在しない場合は`metadata.name`にフォールバック
- スタイルは元の`metadata.name`のスタイル（`text-lg font-semibold`）を維持

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
上記のdiffを逆に適用

## Related Commits
- *Pending commit*
