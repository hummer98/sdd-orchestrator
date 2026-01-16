# Bug Fix: auto-execution-ui-state-dependency

## Summary
Bug自動実行の状態管理をRenderer ProcessからMain Processに移行し、Spec自動実行（AutoExecutionCoordinator）と同一のアーキテクチャに統一した。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/services/bugAutoExecutionCoordinator.ts` | **新規作成** - Main ProcessでのBug自動実行の状態管理（SSoT） |
| `electron-sdd-manager/src/main/ipc/bugAutoExecutionHandlers.ts` | **新規作成** - Bug自動実行IPCハンドラー |
| `electron-sdd-manager/src/main/ipc/channels.ts` | Bug自動実行用IPCチャンネル定数追加 |
| `electron-sdd-manager/src/main/ipc/handlers.ts` | Bug自動実行ハンドラーのインポートと登録 |
| `electron-sdd-manager/src/preload/index.ts` | Bug自動実行用preload API追加 |
| `electron-sdd-manager/src/renderer/types/electron.d.ts` | Bug自動実行用型定義追加 |

### Code Changes

#### 1. BugAutoExecutionCoordinator（新規作成）
Main ProcessでBug自動実行の状態を一元管理するクラス。AutoExecutionCoordinatorと同様のパターンで実装。

```typescript
// bugPath単位での状態管理（並行実行対応）
export class BugAutoExecutionCoordinator extends EventEmitter {
  private readonly executionStates: Map<string, BugAutoExecutionState> = new Map();
  private readonly executionOptions: Map<string, BugAutoExecutionOptions> = new Map();

  // Public API
  async start(bugPath, bugName, options, lastCompletedPhase): Promise<Result<...>>
  async stop(bugPath): Promise<Result<...>>
  async retryFrom(bugPath, phase): Promise<Result<...>>

  // State Query
  getStatus(bugPath): BugAutoExecutionState | null
  getAllStatuses(): Map<string, BugAutoExecutionState>

  // Agent Integration
  setCurrentPhase(bugPath, phase, agentId?): void
  handleAgentCompleted(agentId, bugPath, status): Promise<void>
}
```

#### 2. IPC Channels追加
```diff
+ // Bug Auto Execution (bug fix: auto-execution-ui-state-dependency)
+ BUG_AUTO_EXECUTION_START: 'bug-auto-execution:start',
+ BUG_AUTO_EXECUTION_STOP: 'bug-auto-execution:stop',
+ BUG_AUTO_EXECUTION_STATUS: 'bug-auto-execution:status',
+ BUG_AUTO_EXECUTION_ALL_STATUS: 'bug-auto-execution:all-status',
+ BUG_AUTO_EXECUTION_RETRY_FROM: 'bug-auto-execution:retry-from',
+ BUG_AUTO_EXECUTION_RESET: 'bug-auto-execution:reset',
+ // Events (Main -> Renderer)
+ BUG_AUTO_EXECUTION_STATUS_CHANGED: 'bug-auto-execution:status-changed',
+ BUG_AUTO_EXECUTION_PHASE_STARTED: 'bug-auto-execution:phase-started',
+ BUG_AUTO_EXECUTION_PHASE_COMPLETED: 'bug-auto-execution:phase-completed',
+ BUG_AUTO_EXECUTION_ERROR: 'bug-auto-execution:error',
+ BUG_AUTO_EXECUTION_COMPLETED: 'bug-auto-execution:completed',
+ BUG_AUTO_EXECUTION_EXECUTE_PHASE: 'bug-auto-execution:execute-phase',
```

#### 3. Handler Registration
```diff
+ // Bug Auto Execution Handlers (bug fix: auto-execution-ui-state-dependency)
+ const bugCoordinator = getBugAutoExecutionCoordinator();
+ registerBugAutoExecutionHandlers(bugCoordinator);
+ logger.info('[handlers] Bug Auto Execution handlers registered');
```

## Implementation Notes

### 設計原則の遵守
- **SSOT**: Main ProcessのBugAutoExecutionCoordinatorが状態の唯一の真実の源泉
- **DRY**: AutoExecutionCoordinator（Spec用）と同一のアーキテクチャパターンを採用
- **関心の分離**: 状態管理（Main Process）とUI表示（Renderer Process）を分離

### アーキテクチャ
```
Renderer Process                   Main Process
┌─────────────────┐               ┌─────────────────────────┐
│ BugAutoExecution│   IPC Call    │ BugAutoExecution        │
│ Service         │──────────────▶│ Coordinator (SSoT)      │
│ (IPC Client)    │               │                         │
│                 │◀──────────────│                         │
│                 │   IPC Events  │                         │
└─────────────────┘               └─────────────────────────┘
```

### 今後の作業（Phase 2）
この修正はMain Process側のインフラ構築（Phase 1）のみを完了。
Renderer ProcessのBugAutoExecutionServiceをIPCクライアントとしてリファクタリングするには、以下の追加作業が必要:

1. `BugAutoExecutionService.ts`をIPC呼び出しベースに書き換え
2. イベントリスナーの接続
3. useBugAutoExecutionフックの更新

## Breaking Changes
- [x] No breaking changes

現行のBugAutoExecutionService（Renderer側）は変更なしで動作継続。
新しいMain Process側のCoordinatorは追加機能として提供され、段階的に移行可能。

## Rollback Plan
1. handlers.tsからBug Auto Execution関連のインポートと登録を削除
2. 以下のファイルを削除:
   - `src/main/services/bugAutoExecutionCoordinator.ts`
   - `src/main/ipc/bugAutoExecutionHandlers.ts`
3. channels.ts, preload/index.ts, electron.d.tsからBug Auto Execution関連のコードを削除

## Related Commits
- `9a86852` fix(auto-execution-ui-state-dependency): Bug自動実行の状態管理をMain Processに移行（Phase 1）
