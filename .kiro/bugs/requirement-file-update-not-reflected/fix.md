# Bug Fix: requirement-file-update-not-reflected

## Summary
ファイル監視ベースの粒度細かいUI同期を実装。`refreshSpecs()`/`selectSpec()`の雑な呼び出しを廃止し、変更されたファイルのみを更新するようにした。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/stores/specStore.ts` | 粒度細かい更新メソッド追加、onSpecsChangedコールバック改善 |
| `electron-sdd-manager/src/renderer/components/WorkflowView.tsx` | Agent完了時のrefreshSpecs呼び出しを削除、handleApprovePhaseの修正 |
| `electron-sdd-manager/src/renderer/services/AutoExecutionService.ts` | 不要なselectSpec呼び出しを削除 |

### Code Changes

#### specStore.ts: 粒度細かい更新メソッド追加

```typescript
// 新規追加: ArtifactType定義
export type ArtifactType = 'requirements' | 'design' | 'tasks' | 'research';

// 新規追加: SpecActions interface
updateSpecJson: () => Promise<void>;
updateArtifact: (artifact: ArtifactType) => Promise<void>;
updateSpecMetadata: (specId: string) => Promise<void>;
```

#### specStore.ts: onSpecsChangedコールバック改善

```diff
- // Refresh specs list and detail if selected
- get().refreshSpecs();
+ // Granular update: Only update the changed file/field
+ const fileName = event.path.split('/').pop() || '';
+ if (fileName === 'spec.json') {
+   get().updateSpecJson();
+ } else if (fileName === 'requirements.md') {
+   get().updateArtifact('requirements');
+ } else if (fileName === 'design.md') {
+   get().updateArtifact('design');
+ } else if (fileName === 'tasks.md') {
+   get().updateArtifact('tasks');
+ } else if (fileName.startsWith('document-review-') || fileName.startsWith('inspection-')) {
+   get().updateSpecJson();
+ } else {
+   get().updateSpecJson();
+ }
```

#### WorkflowView.tsx: Agent完了時useEffect削除

```diff
- // Track previous runningPhases for detecting phase completion
- const prevRunningPhasesRef = useRef<Set<string>>(new Set());
-
- // Refresh specDetail when any agent phase completes
- useEffect(() => {
-   // ... Agent完了検知ロジック ...
-   refreshSpecs();
- }, [runningPhases, specDetail, refreshSpecs]);

+ // Bug fix: Removed Agent completion detection useEffect
+ // File watcher now handles granular UI updates via specStore.onSpecsChanged
```

#### WorkflowView.tsx: handleApprovePhase修正

```diff
await window.electronAPI.updateApproval(...);
- // Refresh spec detail
- useSpecStore.getState().selectSpec(specDetail.metadata);
+ // Note: File watcher will automatically trigger specStore.updateSpecJson()
```

#### AutoExecutionService.ts: 不要なselectSpec削除

3箇所の`selectSpec`呼び出しを削除:
- `updateSpecAutoExecutionState` (line 203)
- `autoApproveCompletedPhaseForContext` (line 1072-1074)
- `autoApprovePhase` (line 1107)

```diff
await window.electronAPI.updateApproval(...);
- await specStore.selectSpec(specDetail.metadata);
+ // Note: File watcher will automatically trigger specStore.updateSpecJson()
```

## Implementation Notes

### 設計方針
1. **ファイル監視イベントの粒度を活用**: Main Processで検知したファイル名に基づいて、Renderer側で適切な更新メソッドを呼び出す
2. **全ファイル再読み込みの廃止**: `selectSpec()`は全artifactを再読み込みするため、変更されたファイルのみを更新する粒度細かいメソッドに置き換え
3. **不要な手動更新の削除**: ファイル変更はすべてwatcher経由で検知されるため、IPCコール後の手動更新は不要

### 新規メソッド
- `updateSpecJson()`: spec.jsonのみ再読み込み、artifactは保持
- `updateArtifact(type)`: 特定のartifact（requirements, design, tasks, research）のみ再読み込み
- `updateSpecMetadata(specId)`: Spec一覧のメタデータのみ更新（選択されていないSpecの変更時）

### 監視対象ファイル
- `spec.json`: フェーズ、承認状態、各種設定
- `requirements.md`, `design.md`, `tasks.md`, `research.md`: Specアーティファクト
- `document-review-*.md`, `inspection-*.md`: レビュー・検査ファイル（spec.jsonで状態管理）

## Breaking Changes
- [x] No breaking changes

既存のAPIは変更なし。内部実装のみの変更。

## Rollback Plan
1. `specStore.ts`のonSpecsChangedを元の`get().refreshSpecs()`呼び出しに戻す
2. WorkflowView.tsxのAgent完了検知useEffectを復元
3. AutoExecutionService.tsの`selectSpec`呼び出しを復元
4. 新規追加した`updateSpecJson`, `updateArtifact`, `updateSpecMetadata`メソッドは残しても問題なし（未使用になるだけ）

## Test Results
- Unit tests: 3023 passed, 13 skipped
- Build: Success
