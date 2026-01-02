# Bug Fix: document-review-panel-update-issues

## Summary

ファイル監視時にdocument-review/inspection/tasksファイルの変更を検出した際、専用の同期メソッドを呼び出すように修正。これにより、UIがリアルタイムで正しく更新されるようになった。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/stores/specStore.ts` | 3つの新規syncメソッド追加、ファイル監視ハンドラ更新 |
| `electron-sdd-manager/src/renderer/stores/specStore.test.ts` | テストを新しいsyncメソッドに対応するよう更新 |

### Code Changes

#### 1. 新規syncメソッドの追加 (specStore.ts)

```typescript
// Interface追加
syncDocumentReviewState: () => Promise<void>;
syncInspectionState: () => Promise<void>;
syncTaskProgress: () => Promise<void>;
```

#### 2. syncDocumentReviewState実装

```typescript
syncDocumentReviewState: async () => {
  const { selectedSpec, specDetail } = get();
  if (!selectedSpec || !specDetail) return;

  // Sync file system state to spec.json
  await window.electronAPI.syncDocumentReview(selectedSpec.path);
  // Re-read spec.json to get current state
  const specJson = await window.electronAPI.readSpecJson(selectedSpec.path);
  set({ specDetail: { ...specDetail, specJson } });
}
```

#### 3. syncInspectionState実装

```typescript
syncInspectionState: async () => {
  const { selectedSpec, specDetail } = get();
  if (!selectedSpec || !specDetail) return;

  const specJson = await window.electronAPI.readSpecJson(selectedSpec.path);
  // Load inspection artifact if exists
  const reportFile = getLatestInspectionReportFile(specJson.inspection);
  // ... artifact loading logic
  set({ specDetail: { ...specDetail, specJson, artifacts: updatedArtifacts } });
}
```

#### 4. syncTaskProgress実装

```typescript
syncTaskProgress: async () => {
  const { selectedSpec, specDetail } = get();
  if (!selectedSpec || !specDetail) return;

  // Calculate task progress from tasks.md content
  // Auto-fix phase if all tasks complete
  set({ specDetail: { ...specDetail, specJson, taskProgress } });
}
```

#### 5. ファイル監視ハンドラの更新

```diff
- } else if (fileName.startsWith('document-review-') || fileName.startsWith('inspection-')) {
-   console.log('[specStore] Document review/inspection file changed, updating spec.json:', fileName);
-   get().updateSpecJson();
+ } else if (fileName.startsWith('document-review-')) {
+   console.log('[specStore] Document review file changed, syncing documentReview state:', fileName);
+   get().syncDocumentReviewState();
+ } else if (fileName.startsWith('inspection-')) {
+   console.log('[specStore] Inspection file changed, syncing inspection state:', fileName);
+   get().syncInspectionState();

  } else if (fileName === 'tasks.md') {
    get().updateArtifact('tasks');
+   get().syncTaskProgress();  // Also sync task progress
  }
```

## Implementation Notes

- **関心の分離**: 各同期処理を独立したメソッドに分離し、責務を明確化
- **パフォーマンス**: ファイル監視時は必要な同期処理のみ実行（全体リロードを避ける）
- **スコープ制限**: `selectSpec()`のリファクタリングは行わず、既存ロジックはそのまま維持（スコープクリープ回避）
- **後方互換性**: 新しいメソッドを追加するだけで、既存のAPIは変更なし

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

## Rollback Plan
1. `specStore.ts`の変更を元に戻す（syncメソッド削除、ファイル監視ハンドラを元に戻す）
2. `specStore.test.ts`のテストを元に戻す

## Related Commits
- *To be added after commit*

## Test Results
```
Test Files  1 passed (1)
     Tests  58 passed (58)
```
