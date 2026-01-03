# Bug Fix: legacy-execution-store-cleanup

## Summary
レガシー実行システム（ExecutionStore、PhaseExecutionPanel、LogPanel、CommandService）を完全に削除し、コードベースをクリーンアップしました。

## Changes Made

### Files Deleted
| File | Type | Description |
|------|------|-------------|
| `src/renderer/stores/executionStore.ts` | Store | 未使用のレガシー実行Store |
| `src/renderer/stores/executionStore.test.ts` | Test | executionStoreのテスト |
| `src/renderer/components/PhaseExecutionPanel.tsx` | Component | 未使用のフェーズ実行パネル |
| `src/renderer/components/PhaseExecutionPanel.test.tsx` | Test | PhaseExecutionPanelのテスト |
| `src/renderer/components/LogPanel.tsx` | Component | 未使用のログパネル（AgentLogPanelに置換済み） |
| `src/main/services/commandService.ts` | Service | レガシーコマンド実行サービス |
| `src/main/services/commandService.test.ts` | Test | commandServiceのテスト |

### Files Modified
| File | Change Description |
|------|-------------------|
| `src/renderer/stores/index.ts` | executionStoreのimport/export/STORES公開を削除 |
| `src/renderer/components/index.ts` | PhaseExecutionPanel、LogPanelのexportを削除 |
| `src/main/ipc/handlers.ts` | CommandService import、インスタンス、EXECUTE_COMMAND/CANCEL_EXECUTIONハンドラを削除 |
| `src/main/ipc/channels.ts` | EXECUTE_COMMAND、CANCEL_EXECUTION、COMMAND_OUTPUT、COMMAND_COMPLETEチャンネル定義を削除 |
| `src/preload/index.ts` | executeCommand、cancelExecution、onCommandOutput APIを削除、CommandOutputEvent importを削除 |
| `src/renderer/types/index.ts` | ExecutionResult、CommandOutputEvent型を削除 |
| `src/renderer/types/electron.d.ts` | executeCommand、cancelExecution、onCommandOutput型宣言を削除、未使用importを削除 |

### Code Changes

#### stores/index.ts
```diff
-import { useExecutionStore } from './executionStore';
-export { useExecutionStore } from './executionStore';
-(window as any).__STORES__ = {
-  ...
-  executionStore: useExecutionStore,
-  ...
-};
```

#### components/index.ts
```diff
-export { PhaseExecutionPanel } from './PhaseExecutionPanel';
-export { LogPanel } from './LogPanel';
```

#### ipc/channels.ts
```diff
-  // Command Execution
-  EXECUTE_COMMAND: 'ipc:execute-command',
-  CANCEL_EXECUTION: 'ipc:cancel-execution',
-  COMMAND_OUTPUT: 'ipc:command-output',
-  COMMAND_COMPLETE: 'ipc:command-complete',
```

#### ipc/handlers.ts
```diff
-import { CommandService } from '../services/commandService';
-const commandService = new CommandService();
-
-  // Command Execution Handlers
-  ipcMain.handle(
-    IPC_CHANNELS.EXECUTE_COMMAND,
-    async (event, command: string, workingDirectory: string) => { ... }
-  );
-
-  ipcMain.handle(IPC_CHANNELS.CANCEL_EXECUTION, async () => { ... });
```

#### preload/index.ts
```diff
-import type { Phase, CommandOutputEvent, SelectProjectResult } from '../renderer/types';
+import type { Phase, SelectProjectResult } from '../renderer/types';

-  // Command Execution
-  executeCommand: (command: string, workingDirectory: string) =>
-    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_COMMAND, command, workingDirectory),
-
-  cancelExecution: () => ipcRenderer.invoke(IPC_CHANNELS.CANCEL_EXECUTION),
-
-  onCommandOutput: (callback: (event: CommandOutputEvent) => void): (() => void) => { ... },
```

## Implementation Notes
- 段階的削除アプローチ（Phase 1: Rendererコンポーネント → Phase 2: Store → Phase 3: IPC層）を採用
- 各Phase完了後にビルドの成功を確認
- 現在のアーキテクチャ（WorkflowView + AgentLogPanel + SpecManagerExecutionStore）に影響なし

## Test Results
- **Build**: ✅ 成功
- **Unit Tests**: ✅ 150 test files, 3090 tests passed

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. Gitで該当コミットをrevertする
2. 削除されたファイルは全てGit履歴から復元可能

## Related Commits
- *Commit pending*
