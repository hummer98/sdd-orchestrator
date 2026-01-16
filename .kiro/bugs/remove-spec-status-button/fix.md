# Bug Fix: remove-spec-status-button

## Summary
spec-statusボタンおよび関連するすべてのコード（IPCチャンネル、ハンドラー、サービスメソッド、テスト）を完全に削除した。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/components/WorkflowView.tsx` | `handleSpecStatus`コールバックとspec-statusボタンUI、未使用import `RefreshCw`を削除 |
| `electron-sdd-manager/src/main/ipc/channels.ts` | `EXECUTE_SPEC_STATUS`チャンネル定義を削除 |
| `electron-sdd-manager/src/preload/index.ts` | `executeSpecStatus`プリロード関数を削除 |
| `electron-sdd-manager/src/main/ipc/handlers.ts` | `EXECUTE_SPEC_STATUS`のIPCハンドラーを削除 |
| `electron-sdd-manager/src/renderer/types/electron.d.ts` | `executeSpecStatus`型定義を削除 |
| `electron-sdd-manager/src/main/services/specManagerService.ts` | `SPEC_STATUS_COMMANDS`定数と`executeSpecStatus`メソッドを削除 |
| `electron-sdd-manager/src/renderer/components/WorkflowView.test.tsx` | spec-status関連の2テストを削除 |
| `electron-sdd-manager/src/renderer/components/WorkflowView.integration.test.tsx` | `executeSpecStatus`テストを削除 |
| `electron-sdd-manager/src/test/setup.ts` | `executeSpecStatus`モックを削除 |
| `electron-sdd-manager/src/main/services/specManagerService.test.ts` | `executeSpecStatus`テストを削除 |

### Code Changes

**WorkflowView.tsx - handleSpecStatusコールバック削除:**
```diff
-  const handleSpecStatus = useCallback(async () => {
-    if (!specDetail) return;
-
-    try {
-      await window.electronAPI.executeSpecStatus(
-        specDetail.metadata.name,
-        specDetail.metadata.name,
-        workflowStore.commandPrefix
-      );
-    } catch (error) {
-      notify.error(error instanceof Error ? error.message : 'spec-statusの実行に失敗しました');
-    }
-  }, [specDetail, workflowStore.commandPrefix]);
```

**WorkflowView.tsx - ボタンUI削除:**
```diff
-        <button
-          onClick={handleSpecStatus}
-          className={clsx(
-            'flex items-center justify-center gap-2 px-4 py-2 rounded',
-            'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
-            'hover:bg-gray-300 dark:hover:bg-gray-600',
-            'font-medium transition-colors'
-          )}
-        >
-          <RefreshCw className="w-4 h-4" />
-          spec-status
-        </button>
```

**channels.ts - チャンネル定義削除:**
```diff
   // Phase Execution (high-level commands)
   EXECUTE_PHASE: 'ipc:execute-phase',
-  EXECUTE_SPEC_STATUS: 'ipc:execute-spec-status',
   EXECUTE_TASK_IMPL: 'ipc:execute-task-impl',
```

**specManagerService.ts - 定数とメソッド削除:**
```diff
-/** spec-status コマンドマッピング */
-const SPEC_STATUS_COMMANDS: Record<CommandPrefix, string> = {
-  kiro: '/kiro:spec-status',
-  'spec-manager': '/spec-manager:status',
-};
-
-  async executeSpecStatus(specId: string, featureName: string, commandPrefix: CommandPrefix = 'kiro'): Promise<Result<AgentInfo, AgentError>> {
-    const slashCommand = SPEC_STATUS_COMMANDS[commandPrefix];
-    logger.info('[SpecManagerService] executeSpecStatus called', { specId, featureName, commandPrefix, slashCommand });
-
-    return this.startAgent({
-      specId,
-      phase: 'status',
-      command: getClaudeCommand(),
-      args: buildClaudeArgs({ command: `${slashCommand} ${featureName}` }),
-      group: 'doc',
-    });
-  }
```

## Implementation Notes
- 削除対象のコードは10ファイルに跨っていたが、すべて独立した機能のため副作用なし
- 他のコンポーネントやサービスからの参照がないことを確認済み
- テスト（3900件）が全てパスすることを確認
- TypeScriptコンパイルエラーがないことを確認

## Breaking Changes
- [x] Breaking changes (documented below)

spec-statusボタンが削除されるため、UIからspec-status機能は使用できなくなる。ただし、CLIから直接`/kiro:spec-status`コマンドは引き続き使用可能。

## Rollback Plan
1. git revert で当該コミットを取り消す
2. 各ファイルの削除された部分を復元する

## Related Commits
- *To be filled after commit*
