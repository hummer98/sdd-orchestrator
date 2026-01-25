# Bug Analysis: document-review-scheme-not-passed

## Summary
`handleStartDocumentReview`関数で `scheme` パラメータが `window.electronAPI.execute()` に渡されておらず、レビュー方法の選択が無視されて常にClaude Codeが起動される。

## Root Cause

### Technical Details
- **Location**: `electron-sdd-manager/src/renderer/hooks/useElectronWorkflowState.ts:274-285`
- **Component**: `handleStartDocumentReview` ハンドラ
- **Trigger**: ドキュメントレビューパネルで「レビュー開始」ボタンをクリック

### 詳細分析

`documentReviewScheme` は129-131行目で正しく取得されている：
```typescript
const documentReviewScheme = useMemo((): ReviewerScheme => {
  return getResolvedScheme(useSpecDetailStore.getState());
}, [specJson]);
```

しかし、`handleStartDocumentReview`（274-285行目）では `scheme` が渡されていない：
```typescript
const handleStartDocumentReview = useCallback(async () => {
  if (!specDetail) return;

  await wrapExecution(async () => {
    await window.electronAPI.execute({
      type: 'document-review',
      specId: specDetail.metadata.name,
      featureName: specDetail.metadata.name,
      commandPrefix: workflowStore.commandPrefix,
      // scheme が欠落している！
    });
  });
}, [specDetail, workflowStore.commandPrefix, wrapExecution]);
```

バックエンド（`specManagerService.ts:1987-2045`）は `scheme` を正しく処理する実装になっている：
```typescript
case 'document-review': {
  const { scheme } = options;
  const engine = getReviewEngine(scheme);
  // scheme に基づいて適切なエンジンを選択
}
```

## Impact Assessment
- **Severity**: Medium
- **Scope**: ドキュメントレビュー機能を使用する全ユーザー
- **Risk**: Gemini CLI や debatex を選択しても Claude Code が起動されるため、マルチエンジンサポート機能が完全に無効化

## Related Code

### 修正が必要な箇所

**1. `useElectronWorkflowState.ts:274-285`** - `handleStartDocumentReview`

現在:
```typescript
await window.electronAPI.execute({
  type: 'document-review',
  specId: specDetail.metadata.name,
  featureName: specDetail.metadata.name,
  commandPrefix: workflowStore.commandPrefix,
});
```

修正後:
```typescript
await window.electronAPI.execute({
  type: 'document-review',
  specId: specDetail.metadata.name,
  featureName: specDetail.metadata.name,
  commandPrefix: workflowStore.commandPrefix,
  scheme: documentReviewScheme,
});
```

### 依存関係の追加

`handleStartDocumentReview` の `useCallback` 依存配列に `documentReviewScheme` を追加する必要がある。

## Proposed Solution

### Option 1: 単純修正（推奨）
`handleStartDocumentReview` に `scheme: documentReviewScheme` を追加し、依存配列を更新する。

- **Pros**: 最小限の変更、既存インターフェース（`ExecuteDocumentReview`）は既に `scheme` フィールドをサポート
- **Cons**: なし

### Recommended Approach
Option 1（単純修正）を採用。バックエンドのインターフェースと実装は既に `scheme` をサポートしているため、フロントエンドから値を渡すだけで修正完了。

## Dependencies
- `executeOptions.ts` の `ExecuteDocumentReview` インターフェース（変更不要、既に `scheme?: ReviewerScheme` を持つ）
- `specManagerService.ts` の execute ハンドラ（変更不要、既に scheme に基づく分岐を実装済み）

## Testing Strategy
1. Electronアプリを起動し、プロジェクトを選択
2. ドキュメントレビューパネルを開く
3. レビュー方法で「gemini-cli」を選択
4. レビューを開始し、Gemini CLIが起動されることを確認
5. 同様に「debatex」を選択してテスト
6. 「claude-code」を選択し、従来通りClaude Codeが起動されることを確認
