# Bug Analysis: bug-auto-execution-execute-phase-missing

## Summary

`bug-auto-execution-per-bug-state` Spec実装時（コミット `40a9953`）に `BugAutoExecutionService` を削除し `bugAutoExecutionStore` に移行した際、`onBugAutoExecutionExecutePhase` イベントリスナーが移行されなかった。このリスナーはMain ProcessからRenderer Processへのフェーズ実行トリガーを処理し、実際にClaude agentを起動する責務を持っていた。

## Root Cause

**移行漏れ**: 削除前の `BugAutoExecutionService` は5種類のIPCイベントリスナーを登録していたが、移行後の `bugAutoExecutionStore` は4種類のみ登録している。

### Technical Details
- **Location**: `electron-sdd-manager/src/shared/stores/bugAutoExecutionStore.ts:339-396`
- **Component**: `initBugAutoExecutionIpcListeners` 関数
- **Trigger**: Bug自動実行ボタン押下 → Main Processが `BUG_AUTO_EXECUTION_EXECUTE_PHASE` イベントを発火 → Renderer側にリスナーがないため無視される

### 削除前のコード (BugAutoExecutionService.ts)
```typescript
// 5種類のIPCイベントリスナーを登録
const cleanupExecutePhase = window.electronAPI.onBugAutoExecutionExecutePhase(
  (data: { bugPath: string; phase: string; bugName: string }) => {
    this.handleExecutePhase(data.bugPath, data.phase as BugWorkflowPhase, data.bugName);
  }
);
this.cleanupFunctions.push(cleanupExecutePhase);
```

```typescript
private async handleExecutePhase(bugPath: string, phase: BugWorkflowPhase, bugName: string): Promise<void> {
  const { BUG_PHASE_COMMANDS } = await import('../types/bug');
  const commandTemplate = BUG_PHASE_COMMANDS[phase];
  const fullCommand = `${commandTemplate} ${bugName}`;

  // Execute agent
  await window.electronAPI.startAgent(
    `bug:${bugName}`,
    phase,
    'claude',
    [fullCommand],
    undefined,
    undefined
  );
}
```

### 移行後のコード (bugAutoExecutionStore.ts:339-396)
```typescript
// 4種類のIPCイベントリスナーのみ登録
const unsubscribeStatus = window.electronAPI.onBugAutoExecutionStatusChanged?.(...);
const unsubscribePhase = window.electronAPI.onBugAutoExecutionPhaseCompleted?.(...);
const unsubscribeCompleted = window.electronAPI.onBugAutoExecutionCompleted?.(...);
const unsubscribeError = window.electronAPI.onBugAutoExecutionError?.(...);
// ❌ onBugAutoExecutionExecutePhase が欠落
```

## Impact Assessment
- **Severity**: Critical
- **Scope**: Bug自動実行機能が完全に動作しない（UIは「自動実行中」と表示されるが、agentは起動されない）
- **Risk**: 低（修正は局所的で他コンポーネントへの影響なし）

## Related Code

### Main Process側（正常動作）
```typescript
// bugAutoExecutionHandlers.ts:240-242
coordinator.on('execute-next-phase', (bugPath, phase, context) => {
  broadcastToRenderers(IPC_CHANNELS.BUG_AUTO_EXECUTION_EXECUTE_PHASE, { bugPath, phase, bugName: context.bugName });
});
```

### Preload側（正常動作）
```typescript
// preload/index.ts:1754-1761
onBugAutoExecutionExecutePhase: (callback) => {
  const handler = (_event, data) => callback(data);
  ipcRenderer.on(IPC_CHANNELS.BUG_AUTO_EXECUTION_EXECUTE_PHASE, handler);
  return () => ipcRenderer.removeListener(IPC_CHANNELS.BUG_AUTO_EXECUTION_EXECUTE_PHASE, handler);
}
```

## Proposed Solution

### Recommended Approach

`bugAutoExecutionStore.ts` の `initBugAutoExecutionIpcListeners` 関数に `onBugAutoExecutionExecutePhase` リスナーを追加する。

**追加コード**:
```typescript
// Listen for execute phase events (Main Process requests agent execution)
const unsubscribeExecutePhase = window.electronAPI.onBugAutoExecutionExecutePhase?.(
  async (data: { bugPath: string; phase: string; bugName: string }) => {
    const { BUG_PHASE_COMMANDS } = await import('../../renderer/types/bug');
    const phase = data.phase as BugWorkflowPhase;
    const commandTemplate = BUG_PHASE_COMMANDS[phase];

    if (!commandTemplate) {
      console.error(`[BugAutoExecutionStore] No command for phase ${phase}`);
      return;
    }

    const fullCommand = `${commandTemplate} ${data.bugName}`;

    try {
      await window.electronAPI.startAgent(
        `bug:${data.bugName}`,
        phase,
        'claude',
        [fullCommand],
        undefined,
        undefined
      );
      console.log(`[BugAutoExecutionStore] Agent started for phase ${phase}`);
    } catch (error) {
      console.error(`[BugAutoExecutionStore] Failed to execute phase ${phase}`, error);
    }
  }
);

if (unsubscribeExecutePhase) ipcCleanupFunctions.push(unsubscribeExecutePhase);
```

### 設計原則チェック
1. **SSOT違反なし**: 状態の重複なし、Main Processが実行制御のSSoT
2. **手動同期なし**: IPCイベント駆動のリアクティブパターン
3. **適切な配置**: agent起動ロジックはRenderer側（electronAPI経由）が適切

## Dependencies
- `window.electronAPI.onBugAutoExecutionExecutePhase` (preload/index.ts)
- `window.electronAPI.startAgent` (preload/index.ts)
- `BUG_PHASE_COMMANDS` (renderer/types/bug.ts)

## Testing Strategy
1. **ユニットテスト**: `bugAutoExecutionStore.test.ts` に `onBugAutoExecutionExecutePhase` リスナーのテスト追加
2. **手動テスト**: Bug自動実行ボタン押下 → Agent一覧にagentが表示されることを確認
3. **E2Eテスト**: 既存の `bug-auto-execution.e2e.spec.ts` が通過することを確認
