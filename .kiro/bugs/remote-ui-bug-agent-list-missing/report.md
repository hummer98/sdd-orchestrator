# Bug Report: remote-ui-bug-agent-list-missing

## Overview
Remote-UIのBug詳細ページにBug Agent一覧が表示されない。

Electron版ではBugPane内にAgentListPanelが表示され、Bug用のエージェント（specId=`bug:{bugName}`）を管理できる。
Remote-UIではアクションボタン（Analyze/Fix/Verify）のみでAgent一覧セクションが存在しない。

## Status
**Fixed**

## Environment
- Date Reported: 2026-01-07T13:30:00+09:00
- Affected Component: Remote-UI BugDetail
- Severity: Medium（Bug実行時のエージェント状態が確認できない）

## Steps to Reproduce
1. Remote-UIでプロジェクトに接続
2. Bugsタブを選択
3. 任意のBugを選択してBug詳細ページを開く
4. Agent一覧セクションが存在しないことを確認

## Expected Behavior
- Bug詳細ページにAgent一覧が表示される
- Bug用エージェント（specId=`bug:{bugName}`）でフィルタリングされた一覧
- Spec詳細と同様の操作（停止、ログ確認）が可能

## Actual Behavior
- Bug詳細ページにはアクションボタンとローディングインジケーターのみ
- Agent一覧セクションが存在しない
- 実行中のBugエージェントの状態が確認できない

## Error Messages / Logs
```
N/A (機能未実装)
```

## Related Files
- `electron-sdd-manager/src/renderer/components/BugPane.tsx:88-94` - Electron版BugAgent一覧
- `electron-sdd-manager/src/main/remote-ui/index.html:94-128` - Remote-UI Bug詳細（Agent一覧なし）
- `electron-sdd-manager/src/main/remote-ui/components.js:478-630` - BugDetailクラス

## Additional Context
Spec詳細ページには既にAgent一覧が実装されているため、同様のパターンで実装可能。
フィルタリングは `specId === \`bug:${bugName}\`` で行う。
