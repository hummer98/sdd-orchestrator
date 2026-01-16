# Bug Fix: remove-auto-skip-settings

## Summary
自動実行ワークフローにおけるdocument-reviewとinspectionのスキップ設定（`skip`オプション）を削除し、これらのフローを必須化した。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| src/shared/types/review.ts | DocumentReviewAutoExecutionFlag, InspectionAutoExecutionFlagから'skip'を削除、INSPECTION_PROGRESS_INDICATOR_STATEから'skip-scheduled'を削除 |
| src/renderer/types/index.ts | DocumentReviewFlag, InspectionAutoExecutionFlagから'skip'を削除 |
| src/renderer/types/inspection.ts | 同上、getInspectionProgressIndicatorState関数の更新 |
| src/renderer/components/DocumentReviewPanel.tsx | skip関連のロジック削除（getNextAutoExecutionFlag, renderProgressIndicator等） |
| src/renderer/components/InspectionPanel.tsx | 同上 |
| src/shared/components/review/DocumentReviewPanel.tsx | 共有版コンポーネントからskip関連ロジック削除 |
| src/shared/components/review/InspectionPanel.tsx | 同上 |
| src/renderer/stores/workflowStore.ts | DocumentReviewAutoExecutionFlagから'skip'を削除 |
| src/main/services/autoExecutionCoordinator.ts | DocumentReviewFlagから'skip'削除、tasksフェーズ完了時のskipチェック削除 |
| src/remote-ui/views/SpecActionsView.tsx | inspectionFlag計算からskipを削除 |
| src/main/services/autoExecutionCoordinator.test.ts | テストの期待値を更新 |
| src/renderer/types/inspection.test.ts | skip関連テストの削除・更新 |
| src/preload/index.ts | documentReviewFlag, setInspectionAutoExecutionFlagの型定義からskipを削除 |
| src/renderer/hooks/useAutoExecution.ts | AutoExecutionOptions.documentReviewFlagからskipを削除 |
| src/main/ipc/handlers.ts | SET_INSPECTION_AUTO_EXECUTION_FLAGハンドラの型からskipを削除 |
| src/main/services/webSocketHandler.ts | AutoExecutionOptionsWS.documentReviewFlagからskipを削除 |
| src/main/services/specManagerService.ts | setInspectionAutoExecutionFlagの型からskipを削除 |
| src/renderer/types/electron.d.ts | autoExecutionStart.documentReviewFlag, setInspectionAutoExecutionFlagの型からskipを削除 |
| src/main/ipc/autoExecutionHandlers.test.ts | テストのdocumentReviewFlag: 'skip' → 'run'に更新 |
| src/shared/components/review/DocumentReviewPanel.test.tsx | skip関連テストの削除・更新 |
| src/shared/components/review/InspectionPanel.test.tsx | skip関連テストの削除・更新 |
| src/renderer/components/DocumentReviewPanel.test.tsx | skip関連テストの削除・更新 |
| src/renderer/components/InspectionPanel.test.tsx | skip関連テストの削除・更新 |
| src/renderer/stores/workflowStore.test.ts | skip関連テストの削除・更新 |
| src/renderer/types/workflow.test.ts | documentReviewFlagの期待値から'skip'を削除 |
| src/main/services/specManagerService.test.ts | documentReviewFlag: 'skip' → 'run'に更新 |

### Code Changes

**型定義の変更（例：src/shared/types/review.ts）:**
```diff
- export type DocumentReviewAutoExecutionFlag = 'run' | 'pause' | 'skip';
+ export type DocumentReviewAutoExecutionFlag = 'run' | 'pause';
```

**進捗インジケーター状態の変更:**
```diff
export const INSPECTION_PROGRESS_INDICATOR_STATE = {
  CHECKED: 'checked',
  UNCHECKED: 'unchecked',
  EXECUTING: 'executing',
-  SKIP_SCHEDULED: 'skip-scheduled',
} as const;
```

**autoExecutionCoordinator.tsのskipチェック削除:**
```diff
- if (currentPhase === 'tasks' && options.documentReviewFlag !== 'skip') {
+ if (currentPhase === 'tasks') {
```

**フラグトグルロジックの変更:**
```diff
function getNextAutoExecutionFlag(current: DocumentReviewAutoExecutionFlag) {
  switch (current) {
    case 'run':
      return 'pause';
    case 'pause':
-      return 'skip';
-    case 'skip':
      return 'run';
  }
}
```

## Implementation Notes
- document-reviewとinspectionは自動実行時に必ず実行される（skipオプション削除）
- UIでの選択肢は`run`と`pause`の2つのみ
- `skipDocumentReview` IPC APIは別用途（レビュー完了状態を'skipped'にする）のため残存
- 既存のspec.jsonに`skip`が設定されていた場合は型エラーとなる可能性あり

## Breaking Changes
- [x] Breaking changes (documented below)

**Breaking changes:**
- `DocumentReviewAutoExecutionFlag`型から`'skip'`が削除
- `InspectionAutoExecutionFlag`型から`'skip'`が削除
- `InspectionProgressIndicatorState`型から`'skip-scheduled'`が削除
- 既存のspec.jsonで`autoExecution.documentReviewFlag: 'skip'`を設定していた場合、TypeScriptの型チェックエラーが発生

## Rollback Plan
1. このコミットをrevertする
2. 型定義に`'skip'`を再追加
3. UIコンポーネントにskip関連ロジックを再追加
4. autoExecutionCoordinator.tsのskipチェックを復元

## Related Commits
- *To be added after commit*
