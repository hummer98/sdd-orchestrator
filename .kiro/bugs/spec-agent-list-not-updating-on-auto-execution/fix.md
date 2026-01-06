# Bug Fix: spec-agent-list-not-updating-on-auto-execution

## Summary
**構造的な修正**: `agentRecordWatcherService`のアーキテクチャを`specsWatcherService`/`bugsWatcherService`と統一。Watcher内でのファイル読み取りを廃止し、イベント情報のみをIPCで通知。レンダラー側で`loadAgents()`を呼び出してデータを取得する設計に変更。

## Root Cause Analysis

### 問題の本質
- `agentRecordWatcherService`が他のWatcherServiceと異なる設計パターンを採用していた
- Watcher内でファイル読み取りを行い、失敗時はIPC通知がスキップされるサイレント障害が発生
- リトライロジック（前回の修正）は対処療法であり、根本解決ではなかった

### 3つのWatcherService間のアーキテクチャ比較（修正前）

| Service | ファイル内容読み取り | IPC通知の条件 |
|---------|-------------------|--------------|
| `specsWatcherService` | **読み取らない** | 常に通知 |
| `bugsWatcherService` | **読み取らない** | 常に通知 |
| `agentRecordWatcherService` | **読み取る** | `event.record`が存在する場合のみ |

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/services/agentRecordWatcherService.ts` | `readRecord()`メソッドを削除、`handleEvent`をシンプル化 |
| `electron-sdd-manager/src/main/ipc/handlers.ts` | IPC通知を常に送信するように変更 |
| `electron-sdd-manager/src/renderer/stores/agentStore.ts` | `onAgentRecordChanged`でイベント情報のみ受け取り、`loadAgents()`を呼び出すように変更 |
| `electron-sdd-manager/src/preload/index.ts` | 型定義を更新 |
| `electron-sdd-manager/src/renderer/types/electron.d.ts` | 型定義を更新 |
| `electron-sdd-manager/src/renderer/stores/agentStore.test.ts` | 新しいアーキテクチャに対応したテストに修正 |
| `electron-sdd-manager/src/renderer/components/BugList.integration.test.tsx` | projectStoreモックを追加 |

### Code Changes

#### 1. `agentRecordWatcherService.ts` - ファイル読み取りを削除

```diff
 export type AgentRecordChangeEvent = {
   type: 'add' | 'change' | 'unlink';
   path: string;
   specId?: string;
   agentId?: string;
-  record?: AgentRecord;
 };

-  private async readRecord(filePath: string, retries = 3): Promise<AgentRecord | undefined> {
-    // ... file reading logic with retries
-  }

-  private async handleEvent(type: AgentRecordChangeEvent['type'], filePath: string): Promise<void> {
+  private handleEvent(type: AgentRecordChangeEvent['type'], filePath: string): void {
     // ...
-    let record: AgentRecord | undefined;
-    if (type !== 'unlink') {
-      record = await this.readRecord(filePath);
-    }

     const event: AgentRecordChangeEvent = {
       type,
       path: filePath,
       specId,
       agentId,
-      record,
     };
```

#### 2. `handlers.ts` - IPC通知を常に送信

```diff
   agentRecordWatcherService.onChange((event) => {
-    if (!window.isDestroyed() && event.record) {
-      // Send the full AgentInfo to renderer
-      const agentInfo: AgentInfo = { /* ... */ };
-      window.webContents.send(IPC_CHANNELS.AGENT_RECORD_CHANGED, event.type, agentInfo);
-    } else if (!window.isDestroyed() && event.type === 'unlink') {
-      // For unlink events, send just the IDs
-      window.webContents.send(IPC_CHANNELS.AGENT_RECORD_CHANGED, event.type, {
-        agentId: event.agentId,
-        specId: event.specId,
-      });
-    }
+    if (!window.isDestroyed()) {
+      // Always send event info - renderer will fetch full data if needed
+      window.webContents.send(IPC_CHANNELS.AGENT_RECORD_CHANGED, event.type, {
+        agentId: event.agentId,
+        specId: event.specId,
+      });
+    }
   });
```

#### 3. `agentStore.ts` - loadAgents()でデータ取得

```diff
   const cleanupRecordChanged = window.electronAPI.onAgentRecordChanged(
-    (type: 'add' | 'change' | 'unlink', agent: AgentInfo | { agentId?: string; specId?: string }) => {
+    (type: 'add' | 'change' | 'unlink', eventInfo: { agentId?: string; specId?: string }) => {
       if (type === 'unlink') {
         // ファイル削除時はAgentをストアから削除
-        const { agentId, specId } = agent as { agentId?: string; specId?: string };
         // ...
       } else {
-        // add/change時はAgentを追加/更新
-        const agentInfo = agent as AgentInfo;
-        get().addAgent(agentInfo.specId, agentInfo);
+        // add/change時はloadAgents()で全データを再取得
+        get().loadAgents().then(() => {
+          // 自動選択ロジック...
+        });
       }
     }
   );
```

## Implementation Notes

### 設計の根拠
1. **アーキテクチャ統一**: 3つのWatcherServiceを同じパターンで実装することで、コードの一貫性と保守性が向上
2. **ファイルタイミング問題の根本解決**: Watcher内でのファイル読み取りを廃止することで、書き込み中の読み取り失敗問題を完全に解消
3. **レンダラー側での制御**: データ取得をレンダラー側で行うことで、リトライやエラーハンドリングの柔軟性が向上

### 比較（修正後）

| Service | ファイル内容読み取り | IPC通知の条件 |
|---------|-------------------|--------------|
| `specsWatcherService` | **読み取らない** | 常に通知 |
| `bugsWatcherService` | **読み取らない** | 常に通知 |
| `agentRecordWatcherService` | **読み取らない** | 常に通知 |

## Breaking Changes
- [x] No breaking changes (型は互換性維持)

## Rollback Plan
1. 以下のファイルの変更をrevert:
   - `agentRecordWatcherService.ts`
   - `handlers.ts`
   - `agentStore.ts`
   - `preload/index.ts`
   - `electron.d.ts`
2. Electronアプリを再ビルド・再起動

## Test Results
```
Test Files  151 passed (151)
     Tests  3160 passed | 12 skipped (3172)
```

## Related Commits
- *To be added after commit*
