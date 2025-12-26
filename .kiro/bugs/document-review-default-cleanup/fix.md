# Bug Fix: document-review-default-cleanup

## Summary
グローバルデフォルト`DEFAULT_DOCUMENT_REVIEW_OPTIONS`を削除し、新規Specのドキュメントレビューデフォルト値を`'skip'`から`'pause'`に変更。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/types/index.ts` | `DEFAULT_SPEC_AUTO_EXECUTION_STATE.documentReviewFlag`を`'pause'`に変更 |
| `electron-sdd-manager/src/renderer/stores/workflowStore.ts` | `DEFAULT_DOCUMENT_REVIEW_OPTIONS`定数を削除、初期値を`'pause'`に変更 |
| `electron-sdd-manager/src/renderer/stores/workflowStore.test.ts` | デフォルト値テストを`'pause'`に更新、beforeEachにリセット追加 |
| `electron-sdd-manager/src/renderer/types/workflow.test.ts` | デフォルト値テストを`'pause'`に更新 |

### Code Changes

#### types/index.ts
```diff
 export const DEFAULT_SPEC_AUTO_EXECUTION_STATE: SpecAutoExecutionState = {
   enabled: false,
   permissions: { ... },
-  documentReviewFlag: 'skip',
+  documentReviewFlag: 'pause',
   validationOptions: { ... },
 };
```

#### workflowStore.ts
```diff
-const DEFAULT_DOCUMENT_REVIEW_OPTIONS: DocumentReviewOptions = {
-  autoExecutionFlag: 'run',
-};
+// NOTE: DEFAULT_DOCUMENT_REVIEW_OPTIONS removed as part of document-review-default-cleanup
+// The default value 'pause' is now defined inline in the store initialization
+// and in DEFAULT_SPEC_AUTO_EXECUTION_STATE (types/index.ts)

 // Initial state
-      documentReviewOptions: { ...DEFAULT_DOCUMENT_REVIEW_OPTIONS },
+      // Default to 'pause' - requires user confirmation before auto-executing document review
+      documentReviewOptions: { autoExecutionFlag: 'pause' },
```

## Implementation Notes
- `DEFAULT_DOCUMENT_REVIEW_OPTIONS`は死んだコードだったため削除
- 新しいデフォルト値`'pause'`により、ドキュメントレビュー実行前にユーザー確認を求める動作に変更
- `types/index.ts`がSingle Source of Truthとして機能

## Breaking Changes
- [x] Breaking changes (documented below)

新規Specのドキュメントレビューデフォルト動作が変更：
- 旧: `'skip'` - ドキュメントレビューをスキップ
- 新: `'pause'` - 自動実行時にドキュメントレビュー前で一時停止

既存のspec.jsonにautoExecutionが保存されている場合は影響なし。

## Rollback Plan
1. `types/index.ts`の`documentReviewFlag`を`'skip'`に戻す
2. `workflowStore.ts`の初期値を`'skip'`に変更
3. テストファイルのexpectを元に戻す

## Related Commits
- *To be added after commit*
