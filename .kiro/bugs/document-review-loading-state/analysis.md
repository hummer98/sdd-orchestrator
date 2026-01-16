# Bug Analysis: document-review-loading-state

## Summary
DocumentReviewPanelのローディング表示が、Agent終了後も `status === 'in_progress'` の条件により継続する可能性がある。`completeRound()` メソッドが `status` フィールドを更新しないため、staleな状態が残存する。

## Root Cause
ローディング表示条件と状態更新ロジックの不整合が原因。

### Technical Details
- **Location**:
  - `electron-sdd-manager/src/shared/components/review/DocumentReviewPanel.tsx:69`
  - `electron-sdd-manager/src/main/services/documentReviewService.ts:461-469`
- **Component**: DocumentReviewPanel + DocumentReviewService
- **Trigger**: Review Agentが完了した後、`completeRound()` が呼ばれるが、`status` が `'in_progress'` のまま残る

### 詳細な問題の流れ
1. `startReviewRound()` (400行目) が `status: 'in_progress'` を設定
2. Agent実行完了後、`completeRound()` (461行目) が呼ばれる
3. `completeRound()` は `currentRound` を `undefined` にし、`roundDetail.status` を `'reply_complete'` に更新
4. **しかし、`documentReview.status` は `'in_progress'` のまま変更されない**
5. UIコンポーネントは `reviewState?.status === 'in_progress'` を条件に含むため、ローディングが継続

### 問題のコード

**documentReviewService.ts:461-469**
```typescript
async completeRound(specPath: string, roundNumber: number): Promise<Result<void, ReviewError>> {
  return this.updateReviewState(specPath, {
    currentRound: undefined,  // ← currentRoundは更新される
    roundDetail: {
      roundNumber,
      status: 'reply_complete',
      replyCompletedAt: new Date().toISOString(),
    },
    // ❌ status: 'pending' が設定されていない
  });
}
```

**DocumentReviewPanel.tsx:68-70**
```typescript
// Priority 2: Executing (status === 'in_progress' or isExecuting)
if (isExecuting || reviewState?.status === 'in_progress') {
  return 'executing';  // ← staleな status により誤って実行中と判定される
}
```

## Impact Assessment
- **Severity**: Medium
- **Scope**: DocumentReviewPanelを使用する全てのUI（Electron版・Remote UI版）
- **Risk**:
  - ローディング表示が永続化する可能性
  - 追加のレビューラウンド開始ができなくなる可能性（UXへの影響）
  - データ整合性には影響なし（表示のみの問題）

## Related Code
**状態遷移の期待値**:
```
pending → startReviewRound() → in_progress → completeRound() → pending（または別の状態）
```

**現在の動作**:
```
pending → startReviewRound() → in_progress → completeRound() → in_progress（変更されない）❌
```

## Proposed Solution

### Option 1: completeRound() で status を明示的に更新（推奨）
- **Description**: `completeRound()` メソッドで `status: 'pending'` を設定する
- **Pros**:
  - 最小限の変更で問題を解決
  - 状態遷移が明確になる
  - 既存のロジックと一貫性がある
- **Cons**:
  - なし

```typescript
async completeRound(specPath: string, roundNumber: number): Promise<Result<void, ReviewError>> {
  return this.updateReviewState(specPath, {
    status: 'pending',  // ← 追加
    currentRound: undefined,
    roundDetail: {
      roundNumber,
      status: 'reply_complete',
      replyCompletedAt: new Date().toISOString(),
    },
  });
}
```

### Option 2: UI側のローディング条件を `isExecuting` のみに変更
- **Description**: `getProgressIndicatorState()` で `status === 'in_progress'` 条件を削除
- **Pros**:
  - `isExecuting` propsが信頼できる情報源として機能する
- **Cons**:
  - `status` フィールドの意味が曖昧になる
  - 他の箇所で `status: 'in_progress'` を参照している場合に影響

### Recommended Approach
**Option 1** を推奨。根本原因（状態更新の欠落）を直接修正するアプローチであり、データの整合性を保証する。

## Dependencies
- `documentReviewService.ts` の `completeRound()` メソッド
- `markReviewComplete()` も同様の問題がある可能性（要確認）
- `markRoundIncomplete()` は正しく `status: 'pending'` を設定している（482行目）

## Testing Strategy
1. **単体テスト**: `completeRound()` 呼び出し後に `status` が `'pending'` になることを確認
2. **E2Eテスト**: Document Review完了後にローディング表示が停止することを確認
3. **手動テスト**:
   - Document Review開始 → Agent完了 → ローディング停止を確認
   - spec.json の `documentReview.status` が正しく更新されることを確認
