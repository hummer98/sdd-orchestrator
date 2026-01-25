# Bug Report: bugs-watcher-not-initialized

## Overview
BugsListコンポーネントで新しいBugが追加されてもUIが更新されない。原因はRenderer側で`startWatching()`が呼ばれていないため、Main Processからのファイル変更イベントを受信できていない。

## Status
**Pending**

## Environment
- Date Reported: 2026-01-25T10:20:24Z
- Affected Component: BugList / useSharedBugStore
- Severity: Medium

## Steps to Reproduce
1. Electronアプリを起動し、プロジェクトを選択
2. BugsタブでBug一覧を表示
3. ターミナルから `/kiro:bug-create` でBugを新規作成
4. BugsListが更新されないことを確認（手動リロードが必要）

## Expected Behavior
新しいBugがファイルシステムに追加された際、BugsListが自動的に更新される

## Actual Behavior
新しいBugが追加されてもBugsListが更新されない。画面リロードまたはタブ切り替えが必要

## Error Messages / Logs
```
（エラーは発生しない - イベント購読が行われていないため）
```

## Related Files
- `electron-sdd-manager/src/renderer/components/BugList.tsx` - UI表示
- `electron-sdd-manager/src/shared/stores/bugStore.ts` - State管理（startWatching/stopWatching定義済み）
- `electron-sdd-manager/src/main/services/bugsWatcherService.ts` - Main Process側の監視

## Additional Context
- `useSharedBugStore`には`startWatching()`/`stopWatching()`メソッドが実装済み
- Main Process側の`BugsWatcherService`は正常に動作している
- SpecsListでは同様の監視が正常に機能している（参考実装として活用可能）
