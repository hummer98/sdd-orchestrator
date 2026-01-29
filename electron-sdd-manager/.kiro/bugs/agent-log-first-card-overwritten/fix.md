# Bug Fix: agent-log-first-card-overwritten

## Summary
`agent.command` フィールドをイミュータブル（不変）にし、`resumeAgent` で上書きしないように修正した。これにより、AgentLogPanelの先頭に表示される初回コマンドが、resume時に最新のコマンドで上書きされる問題を解決。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| electron-sdd-manager/src/main/services/specManagerService.ts | `resumeAgent` メソッド内で `command` フィールドを更新しないように修正（2箇所） |

### Code Changes

**electron-sdd-manager/src/main/services/specManagerService.ts:1524-1530**

```diff
       const updatedAgentInfo: AgentInfo = {
         ...agent,
         pid: process.pid,
         status: 'running',
         lastActivityAt: now,
-        command: `${command} ${args.join(' ')}`,
         executions: updatedExecutions,
       };
```

**electron-sdd-manager/src/main/services/specManagerService.ts:1539-1545**

```diff
       await this.recordService.updateRecord(agent.specId, agentId, {
         pid: process.pid,
         status: 'running',
         lastActivityAt: now,
-        command: `${command} ${args.join(' ')}`,
         executions: updatedExecutions,
         autoResumeCount: 0,
       });
```

## Implementation Notes

### 設計アプローチ
**Option 1: `command` フィールドをイミュータブルにする** を採用

- `agent.command` は **初回コマンドのみを記録** する（`startAgent` で1回だけセット）
- `resumeAgent` では `command` フィールドを更新しない（既存の値を保持）
- 最新のコマンドが必要な場合は `executions[executions.length - 1].prompt` を参照

### 根拠
1. **SSOT原則**: `command` = 初回コマンド（不変）、`executions` = 実行履歴（可変）として役割を明確化
2. **YAGNI原則**: 新しいフィールドを追加する必要がない
3. **最小変更**: `resumeAgent` で `command` を更新しないだけ（2箇所の削除のみ）
4. **既存UIとの互換性**: AgentLogPanel.tsx の変更不要
5. **デバッグ性**: `executions` 配列に全履歴が残るため、最新コマンドも確認可能

### 変更箇所の詳細
- **specManagerService.ts:1524-1530**: `updatedAgentInfo` オブジェクトから `command` フィールドの更新を削除
- **specManagerService.ts:1539-1545**: `recordService.updateRecord` の引数から `command` フィールドの更新を削除

### ビルド確認
- TypeScript コンパイル: 成功
- Vite ビルド（renderer, main, preload, remote-ui）: 成功
- 警告はあるが、全て既存の警告（dynamic import、chunk size）

## Breaking Changes
- [x] No breaking changes

`agent.command` は既存レコードでは引き続き初回コマンドが保持される。新規エージェント起動時も従来通り初回コマンドが記録される。既存の動作に変更なし。

## Rollback Plan
以下のいずれかの方法でロールバック可能：

1. Git revert:
   ```bash
   git revert <commit-hash>
   ```

2. 手動修正:
   - `specManagerService.ts:1529` に `command: \`${command} ${args.join(' ')}\`,` を追加
   - `specManagerService.ts:1544` に `command: \`${command} ${args.join(' ')}\`,` を追加

## Related Commits
*コミット後に追加予定*
