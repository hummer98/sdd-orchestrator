# Bug Fix: global-agent-display-issues

## Summary
Global Agent一覧で「実行時間が表示されない」と「削除しても再度表示される」2つの問題を修正

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| [GlobalAgentPanel.tsx](electron-sdd-manager/src/renderer/components/GlobalAgentPanel.tsx) | 実行時間表示ロジックを追加 |
| [channels.ts](electron-sdd-manager/src/main/ipc/channels.ts) | `DELETE_AGENT` IPCチャンネルを追加 |
| [handlers.ts](electron-sdd-manager/src/main/ipc/handlers.ts) | `deleteAgent` IPCハンドラを追加 |
| [specManagerService.ts](electron-sdd-manager/src/main/services/specManagerService.ts) | `deleteAgent`メソッドを追加 |
| [preload/index.ts](electron-sdd-manager/src/preload/index.ts) | `deleteAgent` APIを追加 |
| [electron.d.ts](electron-sdd-manager/src/renderer/types/electron.d.ts) | `deleteAgent`の型定義を追加 |
| [agentStore.ts](electron-sdd-manager/src/renderer/stores/agentStore.ts) | `removeAgent`をファイル削除対応に更新 |

### Code Changes

#### バグ1修正: GlobalAgentPanel.tsx - 実行時間表示追加

```diff
import { clsx } from 'clsx';
-import { useState } from 'react';
+import { useState, useEffect } from 'react';
+
+/**
+ * Format duration in milliseconds to "Xm Ys" or "Xs"
+ */
+function formatDuration(ms: number): string {
+  const totalSeconds = Math.floor(ms / 1000);
+  const minutes = Math.floor(totalSeconds / 60);
+  const seconds = totalSeconds % 60;
+  if (minutes > 0) {
+    return `${minutes}分${seconds}秒`;
+  }
+  return `${seconds}秒`;
+}
```

```diff
function GlobalAgentListItem(...) {
+  const isRunning = agent.status === 'running';
+
+  // Dynamic elapsed time for running agents
+  const [elapsed, setElapsed] = useState(() => {
+    return Date.now() - new Date(agent.startedAt).getTime();
+  });
+
+  useEffect(() => {
+    if (!isRunning) return;
+    const interval = setInterval(() => {
+      setElapsed(Date.now() - new Date(agent.startedAt).getTime());
+    }, 1000);
+    return () => clearInterval(interval);
+  }, [isRunning, agent.startedAt]);
+
+  const duration = isRunning
+    ? elapsed
+    : new Date(agent.lastActivityAt).getTime() - new Date(agent.startedAt).getTime();
```

```diff
          {statusConfig.label}
        </span>
+       <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
+         ({formatDuration(duration)}{isRunning && '...'})
+       </span>
```

#### バグ2修正: ファイル削除対応

1. **IPC Channel追加** (channels.ts)
```diff
  STOP_AGENT: 'ipc:stop-agent',
  RESUME_AGENT: 'ipc:resume-agent',
+ DELETE_AGENT: 'ipc:delete-agent',
  GET_AGENTS: 'ipc:get-agents',
```

2. **IPC Handler追加** (handlers.ts)
```diff
+  ipcMain.handle(
+    IPC_CHANNELS.DELETE_AGENT,
+    async (_event, specId: string, agentId: string) => {
+      const service = getSpecManagerService();
+      const result = await service.deleteAgent(specId, agentId);
+      if (!result.ok) {
+        throw new Error(`Failed to delete agent: ${result.error.type}`);
+      }
+    }
+  );
```

3. **Service Method追加** (specManagerService.ts)
```diff
+  async deleteAgent(specId: string, agentId: string): Promise<Result<void, AgentError>> {
+    // Validate agent exists and is not running
+    // Delete agent record file
+    await this.recordService.deleteRecord(specId, agentId);
+    // Remove from registry
+    this.registry.unregister(agentId);
+    return { ok: true, value: undefined };
+  }
```

4. **Store更新** (agentStore.ts)
```diff
-  removeAgent: (agentId: string) => {
+  removeAgent: async (agentId: string) => {
+    // Find specId for this agent
+    // Delete from file system
+    await window.electronAPI.deleteAgent(targetSpecId, agentId);
+    // Then remove from UI state
     set(...);
   },
```

## Implementation Notes
- `AgentListPanel.tsx`の実装パターンを`GlobalAgentPanel.tsx`に適用
- ファイル削除は`AgentRecordService.deleteRecord`を使用（既存実装を活用）
- 削除時はまずファイル削除、その後UIステートから削除（ファイル監視の`unlink`イベントで重複削除されても安全）
- running/hang状態のAgentは削除不可（UIと同様の制約）

## Breaking Changes
- [x] No breaking changes

`removeAgent`の戻り値型が`void`から`Promise<void>`に変更されたが、呼び出し箇所は全てawaitなしで使用可能。

## Rollback Plan
1. 変更ファイルを元に戻す
2. `npm run typecheck`で型エラーがないことを確認
3. `npm test -- --run GlobalAgentPanel agentStore`でテストパス確認

## Related Commits
- (未コミット) - バグ修正実装

## Test Results
```
✓ src/renderer/components/GlobalAgentPanel.test.tsx (15 tests) 147ms
✓ src/renderer/stores/agentStore.test.ts (50 tests) 113ms

Test Files  2 passed (2)
Tests       65 passed (65)
```
