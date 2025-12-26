# Bug Analysis: document-review-default-cleanup

## Summary
グローバルデフォルト`DEFAULT_DOCUMENT_REVIEW_OPTIONS`（`'run'`）は実質的に使用されておらず、Spec選択時に`DEFAULT_SPEC_AUTO_EXECUTION_STATE`（`'skip'`）で上書きされる。コードの簡素化と、新規Specのデフォルト値を`'pause'`に変更する必要がある。

## Root Cause
workflowStoreに2つの異なるデフォルト値が存在し、実質的にグローバルデフォルトが死んだコードになっている。

### Technical Details
- **Location**:
  - `electron-sdd-manager/src/renderer/stores/workflowStore.ts:132-134` - グローバルデフォルト（`'run'`）
  - `electron-sdd-manager/src/renderer/types/index.ts:244` - Specデフォルト（`'skip'`）
- **Component**: workflowStore, SpecAutoExecutionState
- **Trigger**: Spec選択時に`syncFromSpecAutoExecution()`が呼ばれ、spec.jsonの値（またはデフォルト`'skip'`）で上書きされる

## Impact Assessment
- **Severity**: Low（機能的な問題はない）
- **Scope**: コードの明確性・保守性に影響
- **Risk**: なし（リファクタリングのみ）

## Related Code

### workflowStore.ts:132-134（削除対象）
```typescript
const DEFAULT_DOCUMENT_REVIEW_OPTIONS: DocumentReviewOptions = {
  autoExecutionFlag: 'run',  // 実質使用されていない
};
```

### types/index.ts:244（変更対象）
```typescript
export const DEFAULT_SPEC_AUTO_EXECUTION_STATE: SpecAutoExecutionState = {
  enabled: false,
  permissions: { ... },
  documentReviewFlag: 'skip',  // → 'pause'に変更
  validationOptions: { ... },
};
```

### データフロー
```
1. アプリ起動 → workflowStore初期化 (autoExecutionFlag = 'run')
                    ↓
2. Spec選択 → syncFromSpecAutoExecution() 実行
                    ↓
3. spec.jsonにautoExecutionがある → その値で上書き
   spec.jsonにautoExecutionがない → DEFAULT_SPEC_AUTO_EXECUTION_STATE ('skip') で上書き
```

## Proposed Solution

### Option 1: 完全削除アプローチ
- Description: `DEFAULT_DOCUMENT_REVIEW_OPTIONS`を完全に削除し、workflowStoreの初期値をインラインで定義
- Pros: 死んだコードを削除、シンプル化
- Cons: 特になし

### Option 2: SSoTアプローチ
- Description: workflowStoreの初期値を`DEFAULT_SPEC_AUTO_EXECUTION_STATE`から参照
- Pros: Single Source of Truthを実現
- Cons: 循環インポートの可能性

### Recommended Approach
**Option 1**を採用。以下の変更を行う：

1. `workflowStore.ts`: `DEFAULT_DOCUMENT_REVIEW_OPTIONS`定数を削除し、初期化時に直接`{ autoExecutionFlag: 'pause' }`を使用
2. `types/index.ts`: `DEFAULT_SPEC_AUTO_EXECUTION_STATE.documentReviewFlag`を`'skip'`から`'pause'`に変更
3. 関連テストの更新

## Dependencies
- `workflowStore.ts` - 初期値変更
- `types/index.ts` - デフォルト値変更
- `workflowStore.test.ts` - テスト更新
- `types/workflow.test.ts` - テスト更新（存在する場合）

## Testing Strategy
1. 既存のworkflowStore.test.tsでデフォルト値テストを更新
2. 新規Spec作成時のデフォルト値が`'pause'`になることを確認
3. 設定変更・永続化の動作確認
