# Bug Fix: document-review-scheme-not-passed

## Summary
`handleStartDocumentReview` 関数に `scheme: documentReviewScheme` パラメータを追加し、ドキュメントレビュー方法の選択がバックエンドに正しく渡されるように修正。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/hooks/useElectronWorkflowState.ts` | `handleStartDocumentReview` に `scheme` パラメータを追加、useCallback 依存配列に `documentReviewScheme` を追加 |

### Code Changes

```diff
  const handleStartDocumentReview = useCallback(async () => {
    if (!specDetail) return;

    await wrapExecution(async () => {
      await window.electronAPI.execute({
        type: 'document-review',
        specId: specDetail.metadata.name,
        featureName: specDetail.metadata.name,
        commandPrefix: workflowStore.commandPrefix,
+       scheme: documentReviewScheme,
      });
    });
- }, [specDetail, workflowStore.commandPrefix, wrapExecution]);
+ }, [specDetail, workflowStore.commandPrefix, wrapExecution, documentReviewScheme]);
```

## Implementation Notes
- `documentReviewScheme` は既に129-131行目で `useMemo` を使って `getResolvedScheme()` から取得されていた
- バックエンドの `ExecuteDocumentReview` インターフェースは既に `scheme?: ReviewerScheme` フィールドをサポートしていた
- バックエンドの `specManagerService.ts` も既に `scheme` に基づくエンジン選択ロジックを実装済みだった
- フロントエンドから値を渡すだけで修正が完了

### 関連ハンドラの確認結果
- `handleExecuteDocumentReviewReply`: バックエンドが常に Claude Code を使用（`getClaudeCommand()`）するため、現時点では `scheme` 対応不要
- `handleApplyDocumentReviewFix`: 同上

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

## Rollback Plan
`useElectronWorkflowState.ts` の変更を revert する：
```bash
git checkout HEAD -- electron-sdd-manager/src/renderer/hooks/useElectronWorkflowState.ts
```

## Related Commits
- *To be added after commit*
