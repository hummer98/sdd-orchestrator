# Bug Analysis: review-button-enabled-without-tasks

## Summary
ドキュメントレビューパネルの「レビュー開始」ボタンが、tasks.mdが存在しない状態や自動実行中でも有効になってしまうバグ。

## Root Cause
ボタンの有効/無効ロジックが不十分。

### Technical Details
- **Location**: `electron-sdd-manager/src/renderer/components/DocumentReviewPanel.tsx:173-174`
- **Component**: DocumentReviewPanel
- **Trigger**: tasks.mdがまだ生成されていない仕様を選択した時、または自動実行中にDocumentReviewPanelを表示した時

### 問題のコード
```tsx
// DocumentReviewPanel.tsx:173-174
// Review start button is enabled when not executing
const canStartReview = !isExecuting;
```

現状のロジックは`isExecuting`（ドキュメントレビュー自体の実行中フラグ）のみをチェックしている。

## 欠落している条件

### 1. tasks.mdの存在チェック
- `WorkflowView.tsx`では`specDetail?.artifacts.tasks?.content`を使ってタスクをパースしているが、この情報はDocumentReviewPanelに渡されていない
- DocumentReviewPanelはtasks.mdの存在を認識できない

### 2. 自動実行中のチェック
- `workflowStore.isAutoExecuting`という状態が存在する（WorkflowView:234行目）
- しかしこの状態はDocumentReviewPanelの`isExecuting` propsには渡されていない
- `isReviewExecuting`（282-284行目）は`document-review`、`document-review-reply`、`document-review-fix`のみをチェック

## Impact Assessment
- **Severity**: Medium
- **Scope**: ドキュメントレビュー機能の利用者全員
- **Risk**: tasks.mdがない状態でレビューを開始するとエラーが発生する可能性

## Proposed Solution

### Option 1（推奨）: DocumentReviewPanelに追加propsを渡す
1. `hasTasks`または`canReview` propsを追加
2. WorkflowViewから`!!specDetail?.artifacts.tasks?.content`を渡す
3. 自動実行中の状態も渡す（`workflowStore.isAutoExecuting`または統合した`isExecuting`フラグ）

**変更箇所**:
- `DocumentReviewPanel.tsx`: propsインターフェースに`isAutoExecuting`と`hasTasks`を追加
- `WorkflowView.tsx`: 新しいpropsを渡す

### Option 2: DocumentReviewPanelにはisExecutingのみ渡し、呼び出し側で統合
WorkflowViewでisExecutingを拡張して渡す:
```tsx
const isReviewDisabled = isReviewExecuting || workflowStore.isAutoExecuting || !specDetail?.artifacts.tasks?.content;
```

**メリット**: DocumentReviewPanelの変更が最小限
**デメリット**: ロジックの意図がDocumentReviewPanelから見えにくくなる

### Recommended Approach
**Option 1を推奨**。理由：
- 関心の分離: DocumentReviewPanelが何故無効化されるか明確になる
- テスト容易性: 各条件を個別にテスト可能
- 保守性: 将来的に条件が増えても対応しやすい

## Dependencies
- `electron-sdd-manager/src/renderer/components/WorkflowView.tsx`
- `electron-sdd-manager/src/renderer/stores/workflowStore.ts`

## Testing Strategy
1. tasks.mdがない状態でDocumentReviewPanelを表示 → ボタンがdisabledであることを確認
2. 自動実行中にDocumentReviewPanelを表示 → ボタンがdisabledであることを確認
3. tasks.mdがあり、自動実行中でない場合 → ボタンがenabledであることを確認
4. 既存のテスト（`DocumentReviewPanel.test.tsx`）が通ることを確認
