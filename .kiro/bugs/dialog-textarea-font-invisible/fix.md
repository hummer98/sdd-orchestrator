# Bug Fix: dialog-textarea-font-invisible

## Summary
グローバルCSSでtextareaのデフォルトテキストカラーを設定し、ダークモードでテキストが見えない問題を修正

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/styles/index.css` | textarea要素のデフォルトテキストカラーを追加（ライト/ダーク両対応） |

### Code Changes

```diff
 .slide-in-from-right {
   animation-name: slide-in-from-right;
 }

+/* Default textarea text color for dark mode */
+/* Prevents invisible text when textarea has dark background */
+textarea {
+  color: #111827; /* gray-900 */
+}
+
+.dark textarea {
+  color: #f3f4f6; /* gray-100 */
+}
+
 /* Scrollbar styling */
```

## Implementation Notes
- Option 2（グローバルCSS設定）を採用
- Tailwindのgray-900（#111827）とgray-100（#f3f4f6）カラーを使用
- すべてのtextarea要素に適用されるため、将来の同様の問題を防止
- CreateBugDialogで既に設定されていた`text-gray-900 dark:text-gray-100`と同等の効果
- 個別コンポーネントで明示的に色を指定している場合は、そちらが優先される（より詳細なセレクタ）

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. `electron-sdd-manager/src/renderer/styles/index.css`から追加したCSSルール（52-60行目）を削除
2. 必要に応じて、個別コンポーネントに`text-gray-900 dark:text-gray-100`を追加

## Related Commits
- *To be added after commit*
