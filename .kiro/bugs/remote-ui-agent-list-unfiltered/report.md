# Bug Report: remote-ui-agent-list-unfiltered

## Overview
Remote-UIでは他のSpec/Bugのエージェントが表示されてしまう。

サーバー側（handlers.ts:431）では`specManagerService.getAllAgents()`で全エージェントを取得してRemote-UIに送信しているが、Remote-UI側（components.js:859）では受け取ったagentsをフィルタリングせずにそのまま表示している。

Electron版（AgentListPanel.tsx:95）では`getAgentsForSpec(specId)`で選択中のSpec/Bugに紐づくエージェントのみをフィルタリングしているため、この動作の差異が問題。

## Status
**Pending**

## Environment
- Date Reported: 2026-01-07T12:30:00+09:00
- Affected Component: Remote-UI Agent List
- Severity: Medium

## Steps to Reproduce
*To be documented*

1. Remote-UIでプロジェクトに接続
2. 複数のSpecで異なるエージェントを実行
3. 任意のSpecを選択してAgent一覧を確認

## Expected Behavior
選択中のSpec/Bugに紐づくエージェントのみが表示される

## Actual Behavior
全てのSpec/Bugのエージェントが混在して表示される

## Error Messages / Logs
```
*To be captured*
```

## Related Files
- `electron-sdd-manager/src/main/ipc/handlers.ts:431` - getAllAgents()で全エージェント取得
- `electron-sdd-manager/src/main/remote-ui/components.js:859` - updateAgentList()でフィルタリングなし
- `electron-sdd-manager/src/renderer/components/AgentListPanel.tsx:95` - Electron版の正しい実装

## Additional Context
修正案: Remote-UIの`updateAgentList`で、現在選択中のSpec/BugのIDに基づいてフィルタリングを追加する
