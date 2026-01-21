# Bug Fix: bug-artifact-content-not-displayed

## Summary
`readArtifact` APIに`entityType`パラメータを追加し、Bug用のパス解決（`resolveBugPath`）をサポート。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/preload/index.ts` | readArtifact APIに entityType パラメータ追加 |
| `electron-sdd-manager/src/main/ipc/handlers.ts` | entityType に応じて resolveSpecPath/resolveBugPath を使い分け |
| `electron-sdd-manager/src/renderer/types/electron.d.ts` | readArtifact 型定義更新 |
| `electron-sdd-manager/src/renderer/stores/editorStore.ts` | loadArtifact に entityType パラメータ追加 |
| `electron-sdd-manager/src/renderer/components/ArtifactEditor.tsx` | entityType prop 追加 |
| `electron-sdd-manager/src/renderer/components/BugPane.tsx` | entityType="bug" を渡す |

### Code Changes

**preload/index.ts**
```diff
- readArtifact: (specName: string, filename: string) =>
-   ipcRenderer.invoke(IPC_CHANNELS.READ_ARTIFACT, specName, filename),
+ readArtifact: (name: string, filename: string, entityType: 'spec' | 'bug' = 'spec') =>
+   ipcRenderer.invoke(IPC_CHANNELS.READ_ARTIFACT, name, filename, entityType),
```

**handlers.ts**
```diff
  ipcMain.handle(
    IPC_CHANNELS.READ_ARTIFACT,
-   async (_event, specName: string, filename: string) => {
+   async (_event, name: string, filename: string, entityType: 'spec' | 'bug' = 'spec') => {
      // ...
-     const specPathResult = await fileService.resolveSpecPath(currentProjectPath, specName);
+     const pathResult = entityType === 'bug'
+       ? await fileService.resolveBugPath(currentProjectPath, name)
+       : await fileService.resolveSpecPath(currentProjectPath, name);
```

**BugPane.tsx**
```diff
  <ArtifactEditor
    tabs={BUG_TABS}
    baseName={selectedBug.name}
    placeholder="バグを選択してエディターを開始"
    artifacts={artifacts}
    testId="bug-artifact-editor"
+   entityType="bug"
  />
```

## Implementation Notes
- `entityType` のデフォルト値は `'spec'` で、既存のSpec用コードは変更不要
- SSOTを維持: パス解決ロジックはMain Process側に一元化
- 後方互換性あり: 既存のreadArtifact呼び出しはそのまま動作

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. 修正した6ファイルを元に戻す
2. または git revert でコミットを取り消し

## Related Commits
- Introduced by: `39e7dcd feat(spec-path-ssot): IPC API nameベース移行`

## Test Results
- TypeScript型チェック: PASS
- editorStore.test.ts: PASS (45 tests)
- ArtifactEditor.test.tsx: PASS (15 tests)
- BugPane.test.tsx: PASS (10 tests)
