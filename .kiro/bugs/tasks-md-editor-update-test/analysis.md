# Bug Analysis: tasks-md-editor-update-test

## Summary
E2Eテストにtasks.md更新時のeditorStore同期テストが存在しない。requirements.mdのテストは追加済みだが、同じロジックがtasks.mdにも適用されるか検証されていない。

## Root Cause
**テストカバレッジの不足** - 新機能のテストが一部のアーティファクトタイプ（requirements.md）のみをカバーしており、他のアーティファクトタイプ（tasks.md）のテストが欠落している。

### Technical Details
- **Location**: [file-watcher-ui-update.e2e.spec.ts](electron-sdd-manager/e2e-wdio/file-watcher-ui-update.e2e.spec.ts)
- **Component**: E2Eテスト (ファイル監視→UI更新)
- **Trigger**: 該当テストケースが存在しないため、tasks.mdの更新がUIに反映されるか検証されていない

## Impact Assessment
- **Severity**: Low（テストカバレッジの問題、機能自体は実装済み）
- **Scope**: E2Eテストカバレッジのみ。実際のtasks.md更新処理は[specStore.ts:413](electron-sdd-manager/src/renderer/stores/specStore.ts#L413)で実装済み
- **Risk**: tasks.md更新時のeditorStore同期にリグレッションが発生しても検出できない

## Related Code
### 既存の実装（動作するはず）
```typescript
// specStore.ts:413-414
} else if (fileName === 'tasks.md') {
  get().updateArtifact('tasks');
}
```

### editorStore同期処理（specStore.ts:640-652）
```typescript
// Sync editorStore when the active tab matches the updated artifact
const { useEditorStore } = await import('./editorStore');
const editorState = useEditorStore.getState();
if (editorState.activeTab === artifact && !editorState.isDirty) {
  console.log('[specStore] Syncing editorStore with updated artifact:', artifact);
  await editorState.loadArtifact(selectedSpec.path, artifact);
}
```

### 既存テスト（requirements.mdのみ）
- [file-watcher-ui-update.e2e.spec.ts:364-457](electron-sdd-manager/e2e-wdio/file-watcher-ui-update.e2e.spec.ts#L364-L457) - requirements.mdのeditorStore更新テスト

## Proposed Solution

### Option 1: 既存テストを拡張してtasks.mdのテストケースを追加
- **Description**: `file-watcher-ui-update.e2e.spec.ts`に新しいテストケースを追加
- **Pros**:
  - 既存のテスト構造を再利用できる
  - 同じパターンなので実装が簡単
  - ヘルパー関数が既に存在
- **Cons**:
  - fixtureにtasks.mdを追加する必要がある

### Recommended Approach
**Option 1**を推奨。以下の変更が必要：

1. **fixtureの更新**
   - `electron-sdd-manager/e2e-wdio/fixtures/auto-exec-test/.kiro/specs/simple-feature/tasks.md` を追加
   - `resetFixture()`関数にtasks.mdのリセット処理を追加

2. **テストケースの追加**
   - `Editor Content Update (Actual UI Display)` describeブロックに新しいテストを追加
   - `should update editorStore.content when tasks.md changes`

## Dependencies
- 既存のテストヘルパー関数（`getEditorContent`, `waitForCondition`等）
- fixtureディレクトリ構造

## Testing Strategy
1. 既存のrequirements.mdテストがパスすることを確認
2. 新しいtasks.mdテストを追加して実行
3. tasks.mdファイル更新後、editorStore.contentが同期されることを検証

## Implementation Effort
- **変更ファイル**: 1ファイル（`file-watcher-ui-update.e2e.spec.ts`）
- **コード量**: 約60-80行（fixture更新 + テストケース）
- **複雑度**: 低（既存パターンの複製）
