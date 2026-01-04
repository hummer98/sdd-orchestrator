# Bug Analysis: spec-json-to-workflowstore-sync-missing

## Summary
spec.json選択時に `autoExecution` 設定（documentReviewFlag, permissions, validationOptions）がworkflowStoreに同期されないため、UIと実際の自動実行動作が乖離する。

## Root Cause

### Technical Details
- **Location**: `electron-sdd-manager/src/renderer/stores/spec/specDetailStore.ts:28-135`
- **Component**: specDetailStore.selectSpec()
- **Trigger**: spec選択時にspec.jsonの`autoExecution`フィールドがworkflowStoreに反映されない

`selectSpec()` は spec.json を読み込み `specDetail` を構築するが、`specJson.autoExecution` の値を `workflowStore` に同期する処理が存在しない。

```typescript
// specDetailStore.ts:36
const specJson = await window.electronAPI.readSpecJson(spec.path);

// specJson.autoExecution の値がここに含まれているが...
// workflowStore への同期処理がない！

const specDetail: SpecDetail = {
  metadata: spec,
  specJson,  // autoExecution はここに保持される
  // ...
};
```

一方、workflowStoreには同期用メソッドが定義済みだが、未使用：
- `setAutoExecutionPermissions()` (workflowStore.ts:385)
- `setDocumentReviewOptions()` (workflowStore.ts:389)
- `setValidationOptions()` (workflowStore.ts:398)

## Impact Assessment
- **Severity**: High
- **Scope**: 全ての自動実行機能に影響
- **Risk**:
  - UIが表示するフラグと実際の動作が乖離
  - spec切替時に前specの設定が残る
  - E2Eテストで `setDocumentReviewFlag('run')` が効かない

## Related Code

### 書き込み方向（workflowStore → spec.json）は実装済み
```typescript
// workflowStore.ts:30-60
async function persistSettingsToSpec(): Promise<void> {
  const autoExecutionState: SpecAutoExecutionState = {
    enabled: true,
    permissions: { ...workflowState.autoExecutionPermissions },
    documentReviewFlag: workflowState.documentReviewOptions.autoExecutionFlag,
    validationOptions: { ...workflowState.validationOptions },
  };
  await window.electronAPI.updateSpecJson(specDetail.metadata.path, {
    autoExecution: autoExecutionState,
  });
}
```

### 読み込み方向（spec.json → workflowStore）が未実装
```typescript
// 必要だが存在しない処理:
// selectSpec() の中で:
if (specJson.autoExecution) {
  workflowStore.setAutoExecutionPermissions(specJson.autoExecution.permissions);
  workflowStore.setDocumentReviewOptions({
    autoExecutionFlag: specJson.autoExecution.documentReviewFlag
  });
  workflowStore.setValidationOptions(specJson.autoExecution.validationOptions);
}
```

## Proposed Solution

### Option 1: specDetailStore.selectSpec() 内で同期
- Description: selectSpec() で specJson 読み込み後に workflowStore を更新
- Pros: シンプル、変更箇所が1箇所
- Cons: specDetailStore が workflowStore に依存

### Option 2: useEffect で specDetail 変更を監視
- Description: WorkflowView などで specDetail.specJson.autoExecution を監視して同期
- Pros: Store間の疎結合を維持
- Cons: 複数箇所での監視が必要になる可能性

### Recommended Approach
**Option 1** を推奨。specDetailStore.selectSpec() の最後で workflowStore への同期を追加。

修正箇所: `specDetailStore.ts:131-135` 付近
```typescript
// specDetail 構築後、set() の前に追加:
if (specJson.autoExecution) {
  const { useWorkflowStore } = await import('../workflowStore');
  const wf = useWorkflowStore.getState();
  if (specJson.autoExecution.permissions) {
    wf.setAutoExecutionPermissions(specJson.autoExecution.permissions);
  }
  if (specJson.autoExecution.documentReviewFlag) {
    wf.setDocumentReviewOptions({
      autoExecutionFlag: specJson.autoExecution.documentReviewFlag
    });
  }
  if (specJson.autoExecution.validationOptions) {
    wf.setValidationOptions(specJson.autoExecution.validationOptions);
  }
}
```

## Dependencies
- workflowStore.ts の同期メソッド（既存）
- specDetailStore.ts の selectSpec アクション

## Testing Strategy
1. 既存のE2Eテスト `auto-execution-document-review.e2e.spec.ts` が pass することを確認
2. spec切替時に autoExecution 設定が正しく反映されることを確認
3. LocalStorage の値より spec.json の値が優先されることを確認
