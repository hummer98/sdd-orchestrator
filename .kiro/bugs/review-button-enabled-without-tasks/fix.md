# Bug Fix: review-button-enabled-without-tasks

## Summary
ドキュメントレビューパネルの「レビュー開始」ボタンを、tasks.mdが存在しない場合と自動実行中に無効化するよう修正

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/components/DocumentReviewPanel.tsx` | propsに`isAutoExecuting`と`hasTasks`を追加、`canStartReview`ロジックを更新 |
| `electron-sdd-manager/src/renderer/components/WorkflowView.tsx` | DocumentReviewPanelに新しいpropsを渡す |

### Code Changes

#### DocumentReviewPanel.tsx - Props Interface
```diff
 export interface DocumentReviewPanelProps {
   /** Current review state from spec.json */
   reviewState: DocumentReviewState | null;
   /** Whether review is currently executing (Agent running) */
   isExecuting: boolean;
+  /** Whether auto execution is running (global workflow auto execution) */
+  isAutoExecuting?: boolean;
+  /** Whether tasks.md exists and has content */
+  hasTasks?: boolean;
   /** Auto execution flag (run/pause/skip) */
   autoExecutionFlag?: DocumentReviewAutoExecutionFlag;
   // ... other props
 }
```

#### DocumentReviewPanel.tsx - Component Logic
```diff
 export function DocumentReviewPanel({
   reviewState,
   isExecuting,
+  isAutoExecuting = false,
+  hasTasks = true,
   autoExecutionFlag = 'run',
   // ... other props
 }: DocumentReviewPanelProps) {
   const rounds = reviewState?.rounds ?? 0;
-  // Review start button is enabled when not executing
-  const canStartReview = !isExecuting;
+  // Review start button is enabled when:
+  // - Not currently executing (document review agent running)
+  // - Not in auto execution mode (global workflow auto execution)
+  // - tasks.md exists
+  const canStartReview = !isExecuting && !isAutoExecuting && hasTasks;
```

#### WorkflowView.tsx - Props Passing
```diff
 <DocumentReviewPanel
   reviewState={documentReviewState}
   isExecuting={isReviewExecuting}
+  isAutoExecuting={workflowStore.isAutoExecuting}
+  hasTasks={!!specDetail?.artifacts.tasks?.content}
   autoExecutionFlag={workflowStore.documentReviewOptions.autoExecutionFlag}
   onStartReview={handleStartDocumentReview}
   // ... other props
 />
```

## Implementation Notes
- `isAutoExecuting`と`hasTasks`はオプショナルpropsとして追加し、後方互換性を維持
- デフォルト値: `isAutoExecuting = false`, `hasTasks = true`（既存の動作を維持）
- 3つの条件すべてを満たす場合のみボタンが有効化される

## Breaking Changes
- [x] No breaking changes

オプショナルpropsを使用しているため、既存のDocumentReviewPanelの使用箇所は変更不要。

## Rollback Plan
1. DocumentReviewPanel.tsxのpropsインターフェースから`isAutoExecuting`と`hasTasks`を削除
2. `canStartReview`のロジックを`!isExecuting`に戻す
3. WorkflowView.tsxから`isAutoExecuting`と`hasTasks` propsを削除

## Test Results
- `DocumentReviewPanel.test.tsx`: 19 tests passed
- `WorkflowView.test.tsx`: 17 tests passed
- TypeScript type check: passed

## Related Commits
- *Pending commit*
