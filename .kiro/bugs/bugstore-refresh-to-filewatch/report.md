# Bug Report: bugstore-refresh-to-filewatch

## Overview
bugStoreのonBugsChangedハンドラがFile Watchイベントの内容（type, bugName）を無視して毎回refreshBugs()で全件リフレッシュしている。これによりBug自動実行中にファイル変更が発生するとselectedBugがクリアされ、次のフェーズ実行時に「No bug selected」エラーが発生する。

## Status
**Pending**

## Environment
- Date Reported: 2026-01-12T12:05:00Z
- Affected Component: electron-sdd-manager/src/renderer/stores/bugStore.ts
- Severity: High

## Steps to Reproduce
1. Electronアプリでバグを選択
2. BugWorkflowViewから「自動実行」ボタンをクリック
3. analyzeフェーズが実行され、analysis.mdが作成される
4. File Watcherがchangeイベントを発火
5. bugStore.refreshBugs()が呼ばれ、全件再取得
6. selectedBug.pathとの照合に失敗し、clearSelectedBug()が呼ばれる
7. fixフェーズ実行時に「No bug selected」エラー

## Expected Behavior
File Watchイベントを適切に処理し、selectedBugを維持したままバグ詳細のみ更新する

## Actual Behavior
毎回refreshBugs()で全件リフレッシュし、selectedBugがクリアされる

## Error Messages / Logs
```
[2026-01-12T11:35:33.721Z] [ERROR] [renderer] フェーズ "fix" でエラーが発生しました: No bug selected {"specId":"git-worktree-support"}
```

## Related Files
- electron-sdd-manager/src/renderer/stores/bugStore.ts:171-174 (onBugsChangedハンドラ)
- electron-sdd-manager/src/renderer/stores/bugStore.ts:126-155 (refreshBugs実装)
- electron-sdd-manager/src/main/services/bugsWatcherService.ts (File Watcher実装)

## Additional Context
BugsChangeEventには`type`（add/change/unlink等）と`bugName`が含まれているが、現在の実装はこれを完全に無視している。本来あるべき実装：
- `add`: 新規バグを追加
- `change`: 該当バグの詳細のみ更新
- `unlink`/`unlinkDir`: 該当バグを削除（selectedBugが削除されたバグの場合のみclearSelectedBug）

これはsessionid-parse-chunk-splitバグ修正時に発見された副次的な問題。
