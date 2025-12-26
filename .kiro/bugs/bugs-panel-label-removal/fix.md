# Bug Fix: bugs-panel-label-removal

## Summary
BugListコンポーネントから選択中バグのラベルエリアを削除し、アプリヘッダーにselectedBug表示を追加。Specタブと同様のUI統一を実現。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/components/BugList.tsx` | ラベルエリア（selectedBug表示 + BugActionButtons）を削除、未使用import削除 |
| `electron-sdd-manager/src/renderer/App.tsx` | ヘッダーにselectedBug表示を追加（Spec選択時と同等のUI） |
| `electron-sdd-manager/src/renderer/components/BugList.test.tsx` | 削除された機能のテストケースを削除 |

### Code Changes

#### BugList.tsx - ラベルエリア削除

```diff
- import { BugActionButtons } from './BugActionButtons';
+ // BugActionButtonsのimportを削除
```

```diff
-       {/* Selected bug action buttons */}
-       {selectedBug && (
-         <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
-           <div className="flex items-center justify-between">
-             <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
-               {selectedBug.name}
-             </span>
-             <BugActionButtons bug={selectedBug} compact />
-           </div>
-         </div>
-       )}
```

#### App.tsx - ヘッダーにselectedBug表示を追加

```diff
            {/* Spec title in header */}
            {specDetail && specDetail.specJson && (
              ...
            )}
+           {/* Bug title in header (when bug is selected and no spec is selected) */}
+           {selectedBug && !specDetail && (
+             <div className="ml-4 flex items-center gap-2">
+               <span className="text-gray-400">/</span>
+               <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
+                 {selectedBug.name}
+               </span>
+             </div>
+           )}
```

## Implementation Notes
- `selectedBug`はApp.tsxで既にimport済み（useBugStore）のため追加import不要
- Spec選択時はspecDetailが優先され、Bug表示は非表示（`!specDetail`条件）
- BugActionButtonsは現在BugWorkflowView内にあるため、個別の移動は不要

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. BugList.tsxに削除したラベルエリアを復元
2. App.tsxからselectedBug表示ブロックを削除
3. BugList.test.tsxの削除したテストを復元

## Related Commits
- *To be added after commit*
