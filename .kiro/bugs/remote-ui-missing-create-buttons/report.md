# Bug Report: remote-ui-missing-create-buttons

## Overview
Remote-UI版にSpec/Bug新規作成ボタンがない。

Electron版では以下のボタンが存在する:
- SpecListHeaderにPlusアイコン → CreateSpecDialogを開く
- BugPaneにPlusアイコン → CreateBugDialogを開く

Remote-UIではこれらの作成UIが完全に欠落しており、新規Spec/Bugの作成ができない。

## Status
**Pending**

## Environment
- Date Reported: 2026-01-07T13:00:00+09:00
- Affected Component: Remote-UI SpecList, BugList
- Severity: Medium（作成機能が使えない）

## Steps to Reproduce
*To be documented*

1. Remote-UIでプロジェクトに接続
2. Spec一覧またはBug一覧を確認
3. 新規作成ボタンが存在しないことを確認

## Expected Behavior
Remote-UIでもSpec/Bugの新規作成が可能

## Actual Behavior
新規作成ボタンが存在せず、作成機能が使えない

## Error Messages / Logs
```
N/A (機能未実装)
```

## Related Files
- `electron-sdd-manager/src/renderer/components/SpecListHeader.tsx` - Electron版Spec作成ボタン
- `electron-sdd-manager/src/renderer/components/CreateSpecDialog.tsx` - Electron版Spec作成ダイアログ
- `electron-sdd-manager/src/renderer/components/BugPane.tsx` - Electron版Bug作成ボタン
- `electron-sdd-manager/src/renderer/components/CreateBugDialog.tsx` - Electron版Bug作成ダイアログ
- `electron-sdd-manager/src/main/remote-ui/components.js` - Remote-UI UIコンポーネント

## Additional Context
実装にはWebSocket経由でのCREATE_SPEC/CREATE_BUGメッセージ処理が必要。
モバイルでの入力を考慮したシンプルなUI設計が望ましい。
