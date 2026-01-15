# Bug Report: agent-record-json-corruption

## Overview
AgentRecordService.updateRecordの並行呼び出しによりagent-*.jsonファイルが破損する。handleAgentOutputがfire-and-forgetでupdateRecordを呼び出すため、read-modify-writeパターンで競合状態が発生し、JSONファイル末尾にデータが二重追記される。

## Status
**Pending**

## Environment
- Date Reported: 2026-01-15T10:56:00+09:00
- Affected Component: electron-sdd-manager/src/main/services/agentRecordService.ts
- Severity: Medium

## Steps to Reproduce
*To be documented*

1. spec-implを実行（長時間実行されるタスク）
2. Agent出力が頻繁に発生する状況を作る
3. 完了後にagent-*.jsonファイルを確認

## Expected Behavior
agent-*.jsonファイルが正常なJSON形式を維持する

## Actual Behavior
JSONファイル末尾にデータが二重追記され、パースエラーが発生する

## Error Messages / Logs
```
壊れたJSON例:
{
  "agentId": "agent-xxx",
  ...
  "command": "claude -p ... /kiro:spec-impl bugs-worktree-support"
}o:spec-impl bugs-worktree-support"
}
```

## Related Files
- electron-sdd-manager/src/main/services/agentRecordService.ts (updateRecord: 265-278行)
- electron-sdd-manager/src/main/services/specManagerService.ts (handleAgentOutput: 703行)

## Additional Context
- updateRecordはread-modify-writeパターンで排他制御がない
- handleAgentOutputはawaitせずにupdateRecordを呼び出している
- 高頻度の出力時に複数のupdateRecordが並行実行される
