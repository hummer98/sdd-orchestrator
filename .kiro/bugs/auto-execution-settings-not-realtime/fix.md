# Bug Fix: auto-execution-settings-not-realtime

## Summary
`getOptions()` メソッドを変更し、毎回 `spec.json` から最新の `permissions` と `documentReviewFlag` を読み直すように修正。これにより自動実行中のGO/NOGO設定変更がリアルタイムで反映されるようになった。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/services/autoExecutionCoordinator.ts` | `getOptions()` メソッドを修正し、キャッシュではなく `spec.json` から最新設定を読み直すように変更 |

### Code Changes

```diff
   /**
    * 保存されたオプションを取得
+   * spec.json から最新の permissions と documentReviewFlag を読み直す
+   * (Bug fix: auto-execution-settings-not-realtime)
    * @param specPath specのパス
    * @returns オプション or undefined
    */
   getOptions(specPath: string): AutoExecutionOptions | undefined {
-    return this.executionOptions.get(specPath);
+    const cached = this.executionOptions.get(specPath);
+    if (!cached) {
+      return undefined;
+    }
+
+    // spec.json から最新の設定を読み直す
+    try {
+      const specJsonPath = require('path').join(specPath, 'spec.json');
+      const content = require('fs').readFileSync(specJsonPath, 'utf-8');
+      const specJson = JSON.parse(content);
+
+      if (specJson.autoExecution) {
+        return {
+          permissions: specJson.autoExecution.permissions ?? cached.permissions,
+          documentReviewFlag: specJson.autoExecution.documentReviewFlag ?? cached.documentReviewFlag,
+          timeoutMs: cached.timeoutMs,
+          commandPrefix: cached.commandPrefix,
+          approvals: specJson.approvals ?? cached.approvals,
+        };
+      }
+    } catch (err) {
+      logger.warn('[AutoExecutionCoordinator] Failed to read spec.json, using cached options', { specPath, error: err });
+    }
+
+    // フォールバック: キャッシュを返す
+    return cached;
   }
```

## Implementation Notes

- 既存の `approvals` 読み直しパターン（L672-685）と同様のアプローチを採用
- SSOT原則に従い、`spec.json` を唯一の真実の源とする
- `spec.json` 読み取り失敗時はキャッシュにフォールバックし、ログに警告を出力
- `timeoutMs` と `commandPrefix` は実行開始時に決定される設定であり、キャッシュを維持

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
`getOptions()` メソッドを元の単純なキャッシュ返却に戻す：
```typescript
getOptions(specPath: string): AutoExecutionOptions | undefined {
  return this.executionOptions.get(specPath);
}
```

## Related Commits
- *To be added after commit*
