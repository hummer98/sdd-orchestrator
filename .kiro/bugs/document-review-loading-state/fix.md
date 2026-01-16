# Bug Fix: document-review-loading-state

## Summary
`completeRound()` メソッドに `status: 'pending'` を追加し、Review Agent完了後にローディング状態が正しくリセットされるよう修正。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/services/documentReviewService.ts` | `completeRound()` メソッドに `status: 'pending'` を追加 |

### Code Changes

```diff
  async completeRound(specPath: string, roundNumber: number): Promise<Result<void, ReviewError>> {
    return this.updateReviewState(specPath, {
+     status: 'pending',
      currentRound: undefined,
      roundDetail: {
        roundNumber,
        status: 'reply_complete',
        replyCompletedAt: new Date().toISOString(),
      },
    });
  }
```

## Implementation Notes

### 修正内容
- `completeRound()` はReply Agent完了後に呼び出されるメソッド
- 従来は `currentRound` と `roundDetail` のみ更新し、`status` フィールドを更新していなかった
- これにより `documentReview.status` が `'in_progress'` のまま残り、UIがローディング状態を維持していた

### 関連メソッドの確認
- `markReviewComplete()`: Review Agent完了時に呼び出される。Reply Agentの実行を待つため、`status: 'in_progress'` を維持するのは正しい動作
- `markRoundIncomplete()`: 既に `status: 'pending'` を正しく設定している（参考実装として活用）

### 状態遷移（修正後）
```
pending → startReviewRound() → in_progress → completeRound() → pending ✓
```

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

## Rollback Plan
`completeRound()` メソッドから `status: 'pending'` 行を削除する。

## Related Commits
- *To be added after commit*
