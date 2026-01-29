# Bug Fix: agent-log-first-card-overwritten

## Summary
分析の結果、このバグは既に修正済みであることが判明しました。`specManagerService.ts`の`resumeAgent`メソッドにおいて、`command`フィールドの更新が既に削除されており、推奨ソリューション（Option 1: `command`フィールドをイミュータブルにする）が実装されています。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| なし | 既に修正済み |

### Code Changes
修正が必要な箇所は既に対応済みです。以下の2箇所で`command`フィールドの更新が削除されています。

**src/main/services/specManagerService.ts:1524-1530** (`updatedAgentInfo`):
```typescript
const updatedAgentInfo: AgentInfo = {
  ...agent,
  pid: process.pid,
  status: 'running',
  lastActivityAt: now,
  // command: `${command} ${args.join(' ')}`, ← この行が既に削除されている
  executions: updatedExecutions,
};
```

**src/main/services/specManagerService.ts:1539-1545** (`recordService.updateRecord`):
```typescript
await this.recordService.updateRecord(agent.specId, agentId, {
  pid: process.pid,
  status: 'running',
  lastActivityAt: now,
  // command: `${command} ${args.join(' ')}`, ← この行が既に削除されている
  executions: updatedExecutions,
  autoResumeCount: 0,
});
```

## Implementation Notes

### 既存実装の確認
現在の実装は、分析で推奨された「Option 1: `command`フィールドをイミュータブルにする」が既に適用されています。

**実装方針（既に実現済み）**:
- `agent.command`は**初回コマンドのみを記録**（`startAgent`で1回だけセット）
- `resumeAgent`では`command`フィールドを更新しない
- 最新のコマンドが必要な場合は`executions[executions.length - 1].prompt`を参照

### SSOT原則への準拠
- `command`: 初回コマンド（不変）
- `executions`: 実行履歴（可変）

この設計により、AgentLogPanelの先頭カードは常に初回コマンドを表示し、resume後も上書きされません。

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
修正不要のため、ロールバックプランも不要です。

## Related Commits
修正が既に適用されているコミットを特定するには追加調査が必要ですが、最新のコード（HEAD）では既に問題が解決されています。

## Next Steps
`/kiro:bug-verify agent-log-first-card-overwritten`を実行して、E2Eテストで修正を検証してください。
