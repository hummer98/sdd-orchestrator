# Bug Fix: spec-json-to-workflowstore-sync-missing

## Summary
spec.json選択時に`autoExecution`設定（permissions, documentReviewFlag, validationOptions）がworkflowStoreに同期されるよう修正。これにより、spec切替時にUIと実際の自動実行動作が一致するようになった。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/stores/spec/specDetailStore.ts` | `selectSpec()`内でworkflowStoreへの同期処理を追加 |

### Code Changes

`specDetailStore.ts` の `selectSpec()` 関数内、`specDetail` 構築後に以下の同期処理を追加：

```diff
      const specDetail: SpecDetail = {
        metadata: spec,
        specJson,
        artifacts: { ... },
        taskProgress,
      };

+     // Bug fix: spec-json-to-workflowstore-sync-missing
+     // Sync autoExecution settings from spec.json to workflowStore
+     // This ensures UI reflects the spec-scoped settings when switching specs
+     if (specJson.autoExecution) {
+       const { useWorkflowStore } = await import('../workflowStore');
+       const wf = useWorkflowStore.getState();
+       if (specJson.autoExecution.permissions) {
+         wf.setAutoExecutionPermissions(specJson.autoExecution.permissions);
+       }
+       if (specJson.autoExecution.documentReviewFlag) {
+         wf.setDocumentReviewOptions({
+           autoExecutionFlag: specJson.autoExecution.documentReviewFlag,
+         });
+       }
+       if (specJson.autoExecution.validationOptions) {
+         wf.setValidationOptions(specJson.autoExecution.validationOptions);
+       }
+       console.log('[specDetailStore] Synced autoExecution settings to workflowStore:', { ... });
+     }

      if (silent) {
        set({ selectedSpec: spec, specDetail });
      } else {
```

## Implementation Notes

### 動的インポート
循環依存を避けるため、workflowStoreは動的インポート（`await import()`）を使用。これはanalysis.mdの推奨アプローチに従っている。

### 同期タイミング
- `specDetail`構築後、`set()`の直前で同期
- silent modeでも同期処理は実行（refresh時も設定が反映される）

### 同期対象
1. **permissions**: フェーズ別自動実行許可設定
2. **documentReviewFlag**: ドキュメントレビューの自動実行フラグ（run/pause/skip）
3. **validationOptions**: バリデーションオプション

## Breaking Changes
- [x] No breaking changes

既存の動作を壊すことなく、spec.jsonからの読み込み方向の同期を追加しただけ。

## Rollback Plan
1. `specDetailStore.ts`から追加した同期処理ブロック（lines 131-154）を削除
2. 変更前の状態に戻るが、UIと実際の動作の乖離が再発する

## Related Commits
- *コミット後に更新*
