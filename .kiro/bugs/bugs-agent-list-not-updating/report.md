# Bug Report: bugs-agent-list-not-updating

## Overview
Bugsワークフローでエージェントを実行（Fix等）しても、Bugsエージェント一覧が更新されない。agent-watcher-optimization機能でswitchWatchScopeのIPC連携が未実装のため、Bug選択時にエージェントディレクトリが監視されていない。

## Status
**Pending**

## Environment
- Date Reported: 2026-01-14T14:48:00+09:00
- Affected Component: AgentRecordWatcherService, IPC handlers
- Severity: Medium

## Steps to Reproduce
*To be documented*

1. Bugsタブを選択
2. バグを選択
3. Fixボタンを押してエージェントを実行
4. エージェント一覧が更新されないことを確認

## Expected Behavior
エージェント実行後、Bugsエージェント一覧にリアルタイムで反映される

## Actual Behavior
エージェント一覧が更新されない（多重起動防止は正常に動作）

## Error Messages / Logs
```
*To be captured*
```

## Related Files
- electron-sdd-manager/src/main/services/agentRecordWatcherService.ts
- electron-sdd-manager/src/main/ipc/handlers.ts
- electron-sdd-manager/src/main/ipc/channels.ts

## Additional Context
agent-watcher-optimizationのTask 4（SWITCH_AGENT_WATCH_SCOPE IPC連携）が未実装。Spec選択時も同様の問題が発生する可能性あり。
