# Bug Fix: agent-record-json-corruption

## Summary
AgentRecordServiceにミューテックスとスロットリング機構を追加し、並行書き込みによるJSONファイル破損を防止。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| [agentRecordService.ts](electron-sdd-manager/src/main/services/agentRecordService.ts) | ミューテックス追加、スロットリングメソッド追加 |
| [specManagerService.ts](electron-sdd-manager/src/main/services/specManagerService.ts) | スロットリング版メソッドを使用、終了時にスロットル状態クリア |

### Code Changes

#### agentRecordService.ts - ミューテックス追加

```diff
+ /**
+  * Simple mutex implementation for per-agent locking
+  * Bug fix: agent-record-json-corruption
+  */
+ class AgentMutex {
+   private locks: Map<string, Promise<void>> = new Map();
+
+   async acquire(key: string): Promise<() => void> {
+     while (this.locks.has(key)) {
+       await this.locks.get(key);
+     }
+     let release: () => void;
+     const lockPromise = new Promise<void>((resolve) => {
+       release = resolve;
+     });
+     this.locks.set(key, lockPromise);
+     return () => {
+       this.locks.delete(key);
+       release!();
+     };
+   }
+ }
```

#### agentRecordService.ts - updateRecord修正

```diff
  async updateRecord(specId: string, agentId: string, update: AgentRecordUpdate): Promise<void> {
-   const record = await this.readRecord(specId, agentId);
-   if (!record) {
-     throw new Error(`Agent record not found: ${specId}/${agentId}`);
-   }
-   const updatedRecord: AgentRecord = {
-     ...record,
-     ...update,
-   };
-   await this.writeRecord(updatedRecord);
+   const key = this.getThrottleKey(specId, agentId);
+   const release = await this.mutex.acquire(key);
+   try {
+     const record = await this.readRecord(specId, agentId);
+     if (!record) {
+       throw new Error(`Agent record not found: ${specId}/${agentId}`);
+     }
+     const updatedRecord: AgentRecord = { ...record, ...update };
+     await this.writeRecord(updatedRecord);
+   } finally {
+     release();
+   }
  }
```

#### agentRecordService.ts - スロットリングメソッド追加

```diff
+ updateActivityThrottled(specId: string, agentId: string, update: AgentRecordUpdate): void {
+   // 1秒間隔でスロットリング
+   // 最後の更新から1秒以内なら遅延書き込み
+ }
+
+ clearThrottleState(specId: string, agentId: string): void {
+   // Agent終了時にスロットル状態をクリア
+ }
```

#### specManagerService.ts - スロットリング使用

```diff
  // handleAgentOutput内
- this.recordService.updateRecord(specId, agentId, {
-   lastActivityAt: new Date().toISOString(),
- }).catch(() => {});
+ this.recordService.updateActivityThrottled(specId, agentId, {
+   lastActivityAt: new Date().toISOString(),
+ });
```

#### specManagerService.ts - 終了時クリア

```diff
  private handleAgentExit(agentId: string, specId: string, code: number): void {
+   this.recordService.clearThrottleState(specId, agentId);
    // ...
  }
```

## Implementation Notes

1. **ミューテックス**: agentIdをキーとしたPromiseベースのロックで、同じAgentへの並行書き込みを防止
2. **スロットリング**: lastActivityAt更新を1秒間隔に制限し、書き込み頻度を大幅削減
3. **後方互換性**: 既存の`updateRecord`は内部でミューテックスを使用するため、呼び出し側の変更は最小限

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. `agentRecordService.ts`の変更を元に戻す（ミューテックス、スロットリング削除）
2. `specManagerService.ts`を元の`updateRecord`呼び出しに戻す

## Related Commits
- *コミット予定*
