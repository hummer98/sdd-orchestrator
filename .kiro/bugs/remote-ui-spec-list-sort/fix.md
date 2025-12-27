# Bug Fix: remote-ui-spec-list-sort

## Summary
remote-uiのSpecListコンポーネントにソートロジックを追加し、Electron版と同じ表示順（updatedAt降順＝最新更新順）に統一

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| [components.js](electron-sdd-manager/src/main/remote-ui/components.js) | SpecList.update()にソートロジックを追加、sortSpecs()メソッドを新規追加 |

### Code Changes

```diff
  /**
   * Update specs list
+  * Sorts by updatedAt descending (newest first) to match Electron version
   * @param {Array} specs
   */
  update(specs) {
-   this.specs = specs || [];
+   this.specs = this.sortSpecs(specs || []);
    this.render();
  }

+ /**
+  * Sort specs by updatedAt descending (newest first)
+  * Matches Electron version's default sort behavior (specStore.getSortedFilteredSpecs)
+  * @param {Array} specs
+  * @returns {Array}
+  */
+ sortSpecs(specs) {
+   return [...specs].sort((a, b) => {
+     const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
+     const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
+     return dateB - dateA; // Descending order (newest first)
+   });
+ }
```

## Implementation Notes
- Electron版の`specStore.getSortedFilteredSpecs()`と同じデフォルトソート（updatedAt降順）を実装
- `sortSpecs()`メソッドを追加し、元の配列を変更しないよう`[...specs]`でコピーしてからソート
- `updatedAt`がない場合は0として扱い、常に末尾に表示
- 既存の`update()`メソッドの呼び出し元への変更は不要

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. `components.js`を修正前の状態に戻す
2. `update()`メソッドを元の実装に戻す:
   ```javascript
   update(specs) {
     this.specs = specs || [];
     this.render();
   }
   ```
3. `sortSpecs()`メソッドを削除

## Related Commits
- *Pending verification*
