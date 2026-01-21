# Bug Report: bug-artifact-content-not-displayed

## Overview
spec-path-ssot-refactor後、BugsタブでArtifact（report.md, analysis.md等）の内容が表示されない。タブ自体は存在するが、ファイルの中身が見れない状態。readArtifact IPCハンドラがresolveSpecPathのみを使用し、Bug用のresolveBugPath分岐が欠如しているため発生。

## Status
**Pending**

## Environment
- Date Reported: 2026-01-21T07:38:47Z
- Affected Component: ArtifactEditor / IPC handlers
- Severity: High (Bugs機能が使用不可)

## Steps to Reproduce
1. SDD Orchestratorを起動
2. Bugsタブを選択
3. 既存のバグを選択（例: agent-log-dynamic-import-issue）
4. Artifactタブ（report.md等）をクリック

## Expected Behavior
選択したバグのartifactファイル内容がエディタに表示される

## Actual Behavior
タブは表示されるが、エディタの中身が空（または読み込めない）

## Error Messages / Logs
```
"Spec not found: {bugName}" (Main Processログ)
```

## Related Files
- `electron-sdd-manager/src/main/ipc/handlers.ts:638` - resolveSpecPathのみ使用
- `electron-sdd-manager/src/renderer/stores/editorStore.ts:169` - readArtifact呼び出し
- `electron-sdd-manager/src/renderer/components/BugPane.tsx` - ArtifactEditor使用箇所
- `electron-sdd-manager/src/preload/index.ts:75` - readArtifact API定義

## Additional Context
- 原因: `39e7dcd feat(spec-path-ssot): IPC API nameベース移行` コミットで導入
- readArtifact APIにentityType ('spec' | 'bug') パラメータを追加し、Main側で適切なパス解決関数を使い分ける修正が必要
