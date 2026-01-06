# Bug Fix: remote-ui-agent-log-display

## Summary
Remote UIでAgent選択時にログを読み込む機能を実装。Electron版と同等の動作を実現。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/services/webSocketHandler.ts` | `SELECT_AGENT`メッセージハンドラとAgentLogsProvider追加 |
| `electron-sdd-manager/src/main/ipc/remoteAccessHandlers.ts` | `setupAgentLogsProvider()`関数追加 |
| `electron-sdd-manager/src/main/ipc/handlers.ts` | `setupAgentLogsProvider()`呼び出し追加 |
| `electron-sdd-manager/src/main/remote-ui/websocket.js` | `selectAgent()`メソッド追加 |
| `electron-sdd-manager/src/main/remote-ui/components.js` | `selectAgent()`でログ取得呼び出し追加 |
| `electron-sdd-manager/src/main/remote-ui/app.js` | `AGENT_LOGS`メッセージハンドラ追加 |

### Code Changes

#### 1. webSocketHandler.ts - AgentLogsProvider インターフェースと SELECT_AGENT ハンドラ

```diff
+ /**
+  * Log entry from log file (matching LogFileService format)
+  */
+ export interface LogFileEntry {
+   readonly timestamp: string;
+   readonly stream: 'stdout' | 'stderr';
+   readonly data: string;
+ }
+
+ /**
+  * Agent logs provider interface for reading agent log files
+  */
+ export interface AgentLogsProvider {
+   readLog(specId: string, agentId: string): Promise<LogFileEntry[]>;
+ }

+ case 'SELECT_AGENT':
+   await this.handleSelectAgent(client, message);
+   break;

+ private agentLogsProvider: AgentLogsProvider | null = null;

+ setAgentLogsProvider(provider: AgentLogsProvider): void {
+   this.agentLogsProvider = provider;
+ }

+ private async handleSelectAgent(client: ClientInfo, message: WebSocketMessage): Promise<void> {
+   // Agent選択時にログファイルを読み込んでAGENT_LOGSメッセージとして返信
+ }
```

#### 2. remoteAccessHandlers.ts - AgentLogsProvider設定関数

```diff
+ import { getDefaultLogFileService } from '../services/logFileService';

+ export function createAgentLogsProvider(): AgentLogsProvider {
+   return {
+     readLog: async (specId: string, agentId: string) => {
+       const logFileService = getDefaultLogFileService();
+       return logFileService.readLog(specId, agentId);
+     },
+   };
+ }

+ export function setupAgentLogsProvider(): void {
+   const server = getRemoteAccessServer();
+   const wsHandler = server.getWebSocketHandler();
+   if (wsHandler) {
+     const agentLogsProvider = createAgentLogsProvider();
+     wsHandler.setAgentLogsProvider(agentLogsProvider);
+   }
+ }
```

#### 3. handlers.ts - 初期化時の呼び出し追加

```diff
- import { setupStateProvider, setupWorkflowController, getRemoteAccessServer } from './remoteAccessHandlers';
+ import { setupStateProvider, setupWorkflowController, setupAgentLogsProvider, getRemoteAccessServer } from './remoteAccessHandlers';

  setupStateProvider(projectPath, getSpecsForRemote, getBugsForRemote, getAgentsForRemote);
  setupWorkflowController(specManagerService);
+ setupAgentLogsProvider();
```

#### 4. websocket.js - selectAgent メソッド追加

```diff
+ selectAgent(specId, agentId) {
+   return this.send({
+     type: 'SELECT_AGENT',
+     payload: { specId, agentId },
+   });
+ }
```

#### 5. components.js - selectAgent() でログ取得呼び出し

```diff
  selectAgent(agentId) {
    this.currentAgentId = agentId;
    const agent = this.agents.find(a => a.id === agentId);
    // ... existing UI update code ...

+   // Bug fix: Load agent logs from server
+   if (agent && this.currentSpec) {
+     const specId = agent.specId || this.currentSpec.feature_name;
+     wsManager.selectAgent(specId, agentId);
+   }
  }
```

#### 6. app.js - AGENT_LOGS メッセージハンドラ

```diff
+ wsManager.on('AGENT_LOGS', (payload) => {
+   this.handleAgentLogs(payload);
+ });

+ handleAgentLogs(payload) {
+   const { specId, agentId, logs } = payload || {};
+   if (!logs || !Array.isArray(logs)) return;
+
+   const logEntries = logs.map(log => ({
+     timestamp: new Date(log.timestamp).getTime(),
+     stream: log.stream,
+     data: log.data,
+     type: log.stream === 'stderr' ? 'error' : 'agent',
+   }));
+
+   this.logViewer.setLogs(logEntries);
+ }
```

## Implementation Notes

- Electron版のIPC `GET_AGENT_LOGS` パターンをWebSocketに移植
- `LogFileService` を再利用してログファイル読み込み
- Remote UIでAgent選択時にサーバーへ `SELECT_AGENT` を送信
- サーバーはログファイルを読み込み `AGENT_LOGS` として返信
- クライアントは受信したログを `LogViewer.setLogs()` で表示

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

## Rollback Plan
1. 追加したコードを削除
2. handlers.ts の import から `setupAgentLogsProvider` を削除
3. handlers.ts の呼び出しから `setupAgentLogsProvider()` を削除

## Related Commits
- (this fix)

## Data Flow

```
[Remote UI - Agent Click]
       |
       v
[components.js selectAgent()]
       |
       v
[websocket.js selectAgent() -> SELECT_AGENT message]
       |
       v
[webSocketHandler.ts handleSelectAgent()]
       |
       v
[LogFileService.readLog()]
       |
       v
[AGENT_LOGS response message]
       |
       v
[app.js handleAgentLogs()]
       |
       v
[LogViewer.setLogs() -> Display logs]
```
