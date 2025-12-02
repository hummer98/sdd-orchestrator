# Bug Fix: agent-log-display-issue

## Summary
完了済みAgentを選択した際にログファイルから履歴を読み込む機能を実装

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| [electron-sdd-manager/src/main/ipc/channels.ts](electron-sdd-manager/src/main/ipc/channels.ts) | `GET_AGENT_LOGS` IPCチャンネルを追加 |
| [electron-sdd-manager/src/main/ipc/handlers.ts](electron-sdd-manager/src/main/ipc/handlers.ts) | ログ読み込みハンドラーを実装、`setProjectPath`でLogFileServiceを初期化 |
| [electron-sdd-manager/src/preload/index.ts](electron-sdd-manager/src/preload/index.ts) | `getAgentLogs` APIを追加 |
| [electron-sdd-manager/src/renderer/types/electron.d.ts](electron-sdd-manager/src/renderer/types/electron.d.ts) | `getAgentLogs`の型定義を追加 |
| [electron-sdd-manager/src/renderer/stores/agentStore.ts](electron-sdd-manager/src/renderer/stores/agentStore.ts) | `selectAgent`を非同期化、`loadAgentLogs`アクションを追加 |
| [electron-sdd-manager/src/renderer/stores/agentStore.test.ts](electron-sdd-manager/src/renderer/stores/agentStore.test.ts) | ログ読み込みテストを追加 |

### Code Changes

**channels.ts - IPCチャンネル追加**
```diff
  GET_ALL_AGENTS: 'ipc:get-all-agents',
  SEND_AGENT_INPUT: 'ipc:send-agent-input',
+ GET_AGENT_LOGS: 'ipc:get-agent-logs',
```

**handlers.ts - ログ読み込みハンドラー**
```diff
+ // Agent Logs Handler (Bug fix: agent-log-display-issue)
+ ipcMain.handle(
+   IPC_CHANNELS.GET_AGENT_LOGS,
+   async (_event, specId: string, agentId: string) => {
+     const logFileService = getDefaultLogFileService();
+     const logs = await logFileService.readLog(specId, agentId);
+     return logs;
+   }
+ );
```

**agentStore.ts - selectAgentとloadAgentLogs**
```diff
- selectAgent: (agentId: string | null) => {
+ selectAgent: async (agentId: string | null) => {
    set({ selectedAgentId: agentId });
+   if (agentId) {
+     const state = get();
+     const existingLogs = state.logs.get(agentId);
+     if (!existingLogs || existingLogs.length === 0) {
+       const agent = state.getAgentById(agentId);
+       if (agent) {
+         await state.loadAgentLogs(agent.specId, agentId);
+       }
+     }
+   }
  },
+
+ loadAgentLogs: async (specId: string, agentId: string) => {
+   const logs = await window.electronAPI.getAgentLogs(specId, agentId);
+   const logEntries = logs.map((log, index) => ({
+     id: `${agentId}-${index}-${log.timestamp}`,
+     stream: log.stream,
+     data: log.data,
+     timestamp: new Date(log.timestamp).getTime(),
+   }));
+   set((state) => {
+     const newLogs = new Map(state.logs);
+     newLogs.set(agentId, logEntries);
+     return { logs: newLogs };
+   });
+ },
```

## Implementation Notes
- Agent選択時に既存のログがキャッシュされていない場合のみファイルから読み込む
- 実行中Agentはリアルタイムでログを受信するため、既存動作に影響なし
- エラーは非致命的として処理（コンソールログのみ、UIエラー表示なし）

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

## Rollback Plan
1. `channels.ts`から`GET_AGENT_LOGS`を削除
2. `handlers.ts`からハンドラーを削除
3. `preload/index.ts`から`getAgentLogs`を削除
4. `electron.d.ts`から型定義を削除
5. `agentStore.ts`の`selectAgent`を同期メソッドに戻す
6. テストファイルの変更を元に戻す

## Related Commits
- *To be created after verification*
