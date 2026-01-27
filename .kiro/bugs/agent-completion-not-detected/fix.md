# Bug Fix: agent-completion-not-detected

## Summary
`kill()`メソッドからコールバック配列のクリア処理を削除し、`close`/`exit`イベントハンドラー内でのみクリアするように修正。これにより、Force kill時でも`exitCallback`が正常に呼び出され、agent recordのstatusが`completed`に更新されるようになった。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/services/agentProcess.ts` | `kill()`メソッドからコールバッククリア処理を削除 |
| `electron-sdd-manager/src/main/services/providerAgentProcess.ts` | `kill()`メソッドからコールバッククリア処理を削除 |

### Code Changes

**electron-sdd-manager/src/main/services/agentProcess.ts:168-175**
```diff
  kill(): void {
    this._isRunning = false;
    this.process.kill();
-   // Clear callback arrays to prevent memory leaks
-   this.outputCallbacks.length = 0;
-   this.exitCallbacks.length = 0;
-   this.errorCallbacks.length = 0;
+   // Note: Callback arrays are cleared in close/error event handlers
+   // to ensure exit callbacks are invoked before cleanup
  }
```

**electron-sdd-manager/src/main/services/providerAgentProcess.ts:134-147**
```diff
  kill(): void {
    logger.info('[ProviderAgentProcess] Killing process', {
      agentId: this.agentId,
      pid: this._pid,
    });
    this._isRunning = false;
    if (this.handle) {
      this.handle.kill('SIGTERM');
    }
-   // Clear callback arrays to prevent memory leaks
-   this.outputCallbacks.length = 0;
-   this.exitCallbacks.length = 0;
-   this.errorCallbacks.length = 0;
+   // Note: Callback arrays are cleared in exit event handler
+   // to ensure exit callbacks are invoked before cleanup
  }
```

## Implementation Notes

### 修正の理由
1. `process.kill()`は同期的にプロセスを終了しない。OSが非同期で`close`イベントを発火する
2. `kill()`で即座にコールバック配列をクリアすると、後続の`close`イベントで`exitCallbacks.forEach()`が空配列に対して実行される
3. `close`イベントは`kill()`後に必ず発火するため、そこでコールバッククリアすればメモリリーク防止の意図は維持される

### コールバッククリアの新しい責務
- **close イベントハンドラー**: コールバック呼び出し後にすべてのコールバック配列をクリア（agentProcess.ts:144-147）
- **error イベントハンドラー**: エラーコールバック呼び出し後にすべてのコールバック配列をクリア（agentProcess.ts:155-158）
- **exit イベントハンドラー** (ProviderAgentProcess): コールバック呼び出し後にすべてのコールバック配列をクリア（providerAgentProcess.ts:107-110）

### テスト結果
既存のユニットテストはすべてパス（32テスト）:
- `agentProcess.test.ts`: 17テスト
- `providerAgentProcess.test.ts`: 15テスト

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

## Rollback Plan
この修正は非破壊的な変更であり、ロールバックが必要な場合は以下の手順で実施可能:

1. `kill()`メソッドにコールバッククリア処理を復元
2. ただし、元のバグが再発するため、ロールバックではなく修正の改善を推奨

## Related Commits
- `9ea2ef8` ("SpecsWatcherのログ監視除外とAgentProcessのメモリリーク修正", 2026-01-25) - バグの原因となったコミット
