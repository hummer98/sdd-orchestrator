# Bug Fix: tasks-md-editor-update-test

## Summary
tasks.md更新時のeditorStore同期を検証するE2Eテストケースを追加

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/e2e-wdio/file-watcher-ui-update.e2e.spec.ts` | tasks.mdの初期化とテストケースを追加 |

### Code Changes

#### 1. resetFixture()にtasks.md初期化を追加

```diff
  fs.writeFileSync(path.join(SPEC_DIR, 'requirements.md'), initialRequirements);

+  // tasks.mdの初期化
+  const initialTasks = `# Implementation Tasks
+
+## Overview
+<!-- Will be generated in /kiro:spec-tasks phase -->
+
+## Tasks
+<!-- Tasks will be listed here -->
+
+`;
+  fs.writeFileSync(path.join(SPEC_DIR, 'tasks.md'), initialTasks);

  // runtime/agents ディレクトリをクリーンアップ
```

#### 2. tasks.md用のテストケースを追加

```diff
+    /**
+     * tasks.md更新時のeditorStore同期テスト
+     * Bug: tasks-md-editor-update-test
+     */
+    it('should update editorStore.content when tasks.md changes', async () => {
+      // 1. プロジェクト選択
+      // 2. Spec選択
+      // 3. tasksタブに切り替え
+      // 4. 初期状態を確認
+      // 5. tasks.mdを直接更新（implプロセス中のタスク完了をシミュレート）
+      // 6. editorStore（実際のUI表示）が更新されるか確認
+      // 7. 結果を検証
+    });
```

## Implementation Notes

- 既存のrequirements.mdテストパターンを踏襲
- tasksタブへの切り替えを明示的に行い、editorStoreがtasksをロードした状態でテスト
- タスク完了マーク（`[x]`）を含むコンテンツで更新をシミュレート
- 約1秒（3イテレーション）でeditorStoreが更新されることを確認

## Test Results

```
File Watcher UI Update
  File Watcher Registration
    ✓ should have file watcher active after project selection

  Automatic UI Update via File Watcher (NO refreshSpecStore)
    ✓ should update requirements.md content in UI when file changes without manual refresh
    ✓ should update spec.json phase in UI when file changes without manual refresh

  Editor Content Update (Actual UI Display)
    ✓ should update editorStore.content when requirements.md changes
    ✓ should update editorStore.content when tasks.md changes

5 passing (13s)
```

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
テストケースの追加のみのため、該当コード部分を削除すれば元に戻せる

## Related Commits
- *コミット予定*
