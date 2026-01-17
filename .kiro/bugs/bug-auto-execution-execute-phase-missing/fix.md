# Bug Fix: bug-auto-execution-execute-phase-missing

## Summary

`bugAutoExecutionStore.ts` の `initBugAutoExecutionIpcListeners` 関数に欠落していた `onBugAutoExecutionExecutePhase` イベントリスナーを追加し、Bug自動実行でagentが正しく起動されるように修正した。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/shared/stores/bugAutoExecutionStore.ts` | `onBugAutoExecutionExecutePhase` リスナーとagent起動ロジックを追加 |
| `electron-sdd-manager/src/shared/stores/bugAutoExecutionStore.test.ts` | 新しいリスナーのテストを追加（2件） |

### Code Changes

#### bugAutoExecutionStore.ts

```diff
   // Req 2.4: Listen for error events
   const unsubscribeError = window.electronAPI.onBugAutoExecutionError?.(...);

+  // Bug fix: bug-auto-execution-execute-phase-missing
+  // Listen for execute phase events (Main Process requests agent execution)
+  // This was missing during migration from BugAutoExecutionService to bugAutoExecutionStore
+  const unsubscribeExecutePhase = window.electronAPI.onBugAutoExecutionExecutePhase?.(
+    async (data: { bugPath: string; phase: string; bugName: string }) => {
+      const { BUG_PHASE_COMMANDS } = await import('../../renderer/types/bug');
+      const phase = data.phase as BugWorkflowPhase;
+      const commandTemplate = BUG_PHASE_COMMANDS[phase];
+
+      if (!commandTemplate) {
+        console.error(`[BugAutoExecutionStore] No command for phase ${phase}`);
+        return;
+      }
+
+      const fullCommand = `${commandTemplate} ${data.bugName}`;
+
+      try {
+        await window.electronAPI.startAgent(
+          `bug:${data.bugName}`,
+          phase,
+          'claude',
+          [fullCommand],
+          undefined,
+          undefined
+        );
+        console.log(`[BugAutoExecutionStore] Agent started for phase ${phase}`);
+      } catch (error) {
+        console.error(`[BugAutoExecutionStore] Failed to execute phase ${phase}`, error);
+      }
+    }
+  );

   // Store cleanup functions
   if (unsubscribeStatus) ipcCleanupFunctions.push(unsubscribeStatus);
   if (unsubscribePhase) ipcCleanupFunctions.push(unsubscribePhase);
   if (unsubscribeCompleted) ipcCleanupFunctions.push(unsubscribeCompleted);
   if (unsubscribeError) ipcCleanupFunctions.push(unsubscribeError);
+  if (unsubscribeExecutePhase) ipcCleanupFunctions.push(unsubscribeExecutePhase);
```

#### bugAutoExecutionStore.test.ts

- `executePhaseCallback` と `mockUnsubscribeExecutePhase` を追加
- `onBugAutoExecutionExecutePhase` と `startAgent` のモックを追加
- 既存テスト（リスナー登録、クリーンアップ）に新しいリスナーのアサーションを追加
- 新規テスト2件追加:
  - `should call startAgent when execute phase event is received`
  - `should not call startAgent for report phase (no command)`

## Implementation Notes

- 削除前の `BugAutoExecutionService.handleExecutePhase` ロジックをそのまま移植
- `bugPath` によるフィルタリングは削除（storeはグローバルなので全てのイベントを処理）
- dynamic import (`await import('../../renderer/types/bug')`) は元のコードを踏襲

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

## Rollback Plan
```bash
git revert <commit-hash>
```

## Test Results
```
Test Files  1 passed (1)
     Tests  34 passed (34)  # 32 → 34 (2件追加)
```

## Related Commits
- 原因コミット: `40a9953` (feat(bug-auto-execution): Bug毎の自動実行状態管理を実装)
