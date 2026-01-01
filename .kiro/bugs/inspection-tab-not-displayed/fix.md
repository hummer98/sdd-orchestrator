# Bug Fix: inspection-tab-not-displayed

## Summary
`updateSpecJson()`を拡張し、spec.jsonにinspectionフィールドがある場合はinspection artifactも再読み込みするよう修正。これによりinspection完了後にタブが正しく表示される。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| [specStore.ts](electron-sdd-manager/src/renderer/stores/specStore.ts#L519-L582) | updateSpecJson関数にinspection artifact再読み込みロジックを追加 |

### Code Changes

```diff
  /**
   * Update only spec.json without reloading artifacts
   * Used when spec.json changes (phase, approvals, etc.)
+  * Bug fix: inspection-tab-not-displayed - Also reload inspection artifact when spec.json has inspection field
   */
  updateSpecJson: async () => {
    const { selectedSpec, specDetail } = get();

    if (!selectedSpec || !specDetail) {
      return;
    }

    try {
      console.log('[specStore] updateSpecJson: Updating spec.json only', selectedSpec.name);
      const specJson = await window.electronAPI.readSpecJson(selectedSpec.path);

-      // Update only specJson field, preserve artifacts
+      // Bug fix: inspection-tab-not-displayed
+      // Also reload inspection artifact if spec.json has inspection field
+      let updatedArtifacts = specDetail.artifacts;
+      if (specJson.inspection?.report_file) {
+        try {
+          const artifactPath = `${selectedSpec.path}/${specJson.inspection.report_file}`;
+          const content = await window.electronAPI.readArtifact(artifactPath);
+          updatedArtifacts = {
+            ...specDetail.artifacts,
+            inspection: { exists: true, updatedAt: null, content },
+          };
+          console.log('[specStore] updateSpecJson: Loaded inspection artifact', specJson.inspection.report_file);
+        } catch {
+          // File doesn't exist yet or read error - set to null
+          updatedArtifacts = {
+            ...specDetail.artifacts,
+            inspection: null,
+          };
+          console.log('[specStore] updateSpecJson: Inspection file not found', specJson.inspection.report_file);
+        }
+      }
+
+      // Update specJson field and optionally updated artifacts
      set({
        specDetail: {
          ...specDetail,
          specJson,
+          artifacts: updatedArtifacts,
        },
      });

      // Also update metadata in specs list
      await get().updateSpecMetadata(selectedSpec.name);
      // ...
```

## Implementation Notes
- inspection artifactの読み込みロジックは`selectSpec`内の`getInspectionArtifact`と同じパターンを使用
- ファイルが存在しない場合は`null`を設定（graceful degradation）
- 既存のartifactsを保持しつつinspectionのみを更新
- デバッグログを追加して読み込み状態を追跡可能に

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

## Rollback Plan
1. [specStore.ts](electron-sdd-manager/src/renderer/stores/specStore.ts#L535-L555) の追加コード（inspection artifact読み込み部分）を削除
2. `set()`呼び出しの`artifacts: updatedArtifacts`を削除

## Related Commits
- *To be added after commit*

## Test Results
- specStore.test.ts: 55 passed (55)
- TypeScript type check: passed
