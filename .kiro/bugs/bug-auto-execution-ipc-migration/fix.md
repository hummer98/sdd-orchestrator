# Bug Fix: bug-auto-execution-ipc-migration

## Summary
BugAutoExecutionServiceをRenderer Processでのローカル状態管理から、Main ProcessのBugAutoExecutionCoordinatorを使用するIPCクライアントパターンに書き換え。これにより、Spec自動実行（useAutoExecution）と同じアーキテクチャに統一。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `src/renderer/services/BugAutoExecutionService.ts` | IPCクライアントパターンに全面書き換え |
| `src/renderer/services/BugAutoExecutionService.test.ts` | IPC呼び出しに対応したテストに更新 |

### Code Changes

**Before: Renderer Processでのローカル状態管理**
```typescript
// BugAutoExecutionService.ts (修正前)
export class BugAutoExecutionService {
  private state: BugAutoExecutionState = { ...DEFAULT_BUG_AUTO_EXECUTION_STATE };

  start(): boolean {
    // ローカルで状態を更新
    this.state = {
      isAutoExecuting: true,
      currentAutoPhase: firstPhase,
      autoExecutionStatus: 'running',
      ...
    };
    // 直接エージェントを起動
    this.executePhase(firstPhase);
    return true;
  }
}
```

**After: IPCクライアントパターン**
```typescript
// BugAutoExecutionService.ts (修正後)
export class BugAutoExecutionService {
  private cachedState: BugAutoExecutionState = { ...DEFAULT_BUG_AUTO_EXECUTION_STATE };
  private cleanupFunctions: (() => void)[] = [];

  constructor() {
    this.setupIPCListeners();  // IPCイベントリスナーを設定
  }

  async start(): Promise<boolean> {
    // Main ProcessにIPC呼び出し
    const result = await window.electronAPI.bugAutoExecutionStart({
      bugPath,
      bugName: selectedBug.name,
      options: { permissions, timeoutMs: DEFAULT_TIMEOUT_MS },
      lastCompletedPhase,
    });
    // 状態はMain Processからのイベントで更新
    return result.ok;
  }
}
```

### Key Changes

1. **ローカル状態管理を削除**
   - `this.state` → `this.cachedState` (Main Processからの状態をキャッシュ)
   - 状態の真実の源泉はMain ProcessのBugAutoExecutionCoordinator

2. **IPCメソッド呼び出し追加**
   - `start()` → `window.electronAPI.bugAutoExecutionStart()`
   - `stop()` → `window.electronAPI.bugAutoExecutionStop()`
   - `retryFrom()` → `window.electronAPI.bugAutoExecutionRetryFrom()`

3. **IPCイベントリスナー追加**
   - `onBugAutoExecutionStatusChanged` - 状態変更通知
   - `onBugAutoExecutionPhaseCompleted` - フェーズ完了通知
   - `onBugAutoExecutionCompleted` - 実行完了通知
   - `onBugAutoExecutionError` - エラー通知
   - `onBugAutoExecutionExecutePhase` - フェーズ実行要求

4. **テスト更新**
   - 同期メソッドからasyncメソッドへの対応
   - IPCモックの追加
   - Phase command executionテストをIPC communicationテストに変更

## Implementation Notes

### アーキテクチャ変更
```
Renderer Process                   Main Process
┌─────────────────┐               ┌─────────────────────────┐
│ BugAutoExecution│   IPC Call    │ BugAutoExecution        │
│ Service         │──────────────▶│ Coordinator (SSoT)      │
│ (IPC Client)    │               │                         │
│                 │◀──────────────│ state-changed events    │
│                 │   IPC Events  │                         │
└─────────────────┘               └─────────────────────────┘
```

### 設計原則の遵守
- **SSOT**: Main ProcessのBugAutoExecutionCoordinatorが状態の唯一の源泉
- **関心の分離**: Renderer=UI操作・表示、Main=ビジネスロジック
- **DRY**: useAutoExecution.tsと同じIPCクライアントパターン
- **一貫性**: Spec自動実行と同じアーキテクチャ

## Breaking Changes
- [x] Breaking changes (documented below)

### API変更
- `start()`: `boolean` → `Promise<boolean>` (非同期に変更)
- `retryFrom()`: `boolean` → `Promise<boolean>` (非同期に変更)

呼び出し側でawaitが必要になるが、既存のUI（BugWorkflowView.tsx）は既にawaitを使用しているため影響なし。

## Rollback Plan
1. `git revert <commit-hash>`でコミットを取り消し
2. または、git diffから修正前のコードを復元

## Test Results
```
 ✓ src/renderer/services/BugAutoExecutionService.test.ts (35 tests) 8ms
 Test Files  1 passed (1)
      Tests  35 passed (35)
```

## Related Commits
- Phase 1: `475a61c` fix(auto-execution-ui-state-dependency): Bug自動実行の状態管理をMain Processに移行
