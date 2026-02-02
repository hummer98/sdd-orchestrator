# Remote UI ログ取得・ステート管理アーキテクチャ調査

**作成日**: 2026-02-01
**目的**: remote-ui（Desktop/Mobile）のログ取得方法とステート管理の現状把握と問題点の特定

---

## 1. アーキテクチャ全体概観

### 1.1 ステート管理の階層構造

```
┌─────────────────────────────────────────────────────────┐
│ Remote UI (Web) / Renderer (Desktop)                    │
├─────────────────────────────────────────────────────────┤
│ useAgentStoreInit (リモートUIとレンダラー共通)          │
│  ├─ Agent一覧のロード（初期化時）                       │
│  └─ WebSocket/IPC購読                                  │
├─────────────────────────────────────────────────────────┤
│ useAgentLogSubscription（共通Hook）                    │
│  └─ リアルタイムログストリーム受信＆ストア更新         │
├─────────────────────────────────────────────────────────┤
│ SharedAgentStore（shared/stores/agentStore.ts）        │
│  ├─ Map<specId, AgentInfo[]>: Agent一覧                │
│  ├─ Map<agentId, ParsedLogEntry[]>: ログ               │
│  ├─ ensureLogsLoaded(): 過去ログロード（初回）          │
│  ├─ addLog(): リアルタイムログ追加                      │
│  └─ 選択状態管理                                        │
├─────────────────────────────────────────────────────────┤
│ IpcApiClient (Electron) / WebSocketApiClient (Web)     │
│  ├─ getAgents(): Agent一覧API                          │
│  ├─ getAgentLogs(): 過去ログAPI                        │
│  ├─ onAgentLog(): リアルタイムログ購読                  │
│  └─ onAgentStatusChange(): ステータス変更購読          │
├─────────────────────────────────────────────────────────┤
│ Main Process (Electron only)                           │
│  ├─ LogFileService: ログファイルI/O                    │
│  ├─ LogParserService: ログ解析                         │
│  └─ LogStreamingService: リアルタイム配信              │
└─────────────────────────────────────────────────────────┘
```

### 1.2 データフロー概要

```
クリック（Spec/Bug/Agent選択）
  │
  ├─→ AgentLogPage/SpecDetailPage マウント
  │    │
  │    ├─→ useEffect（ensureLogsLoaded呼び出し）
  │    │    │
  │    │    └─→ SharedAgentStore.ensureLogsLoaded(apiClient, agentId)
  │    │         │
  │    │         ├─（Electron）→ IPC: getAgentLogs → Main Process
  │    │         └─（Remote UI）→ WebSocket: GET_AGENT_LOGS → Server
  │    │
  │    └─→ store.addLog()でローカルストアに格納
  │
  └─→ UI描画（過去ログ表示）
       │
       └─→ useAgentLogSubscription開始
            └─ apiClient.onAgentLog()購読
               └─→ store.addLog()でリアルタイム更新
```

---

## 2. 過去ログのローディング方法

### 2.1 クリック後の処理フロー

#### AgentLogPage.tsx

```typescript
export function AgentLogPage({ agent, apiClient }: AgentLogPageProps) {
  const logsMap = useSharedAgentStore((state) => state.logs);
  const logs = useMemo(() => logsMap.get(agent.agentId) ?? [], [logsMap, agent.agentId]);

  useEffect(() => {
    ensureLogsLoaded(apiClient, agent.agentId);
  }, [apiClient, agent.agentId]);
}
```

#### SpecDetailPage.tsx

```typescript
function SpecTabContent({ spec, onSelectAgent }) {
  const agentsMap = useSharedAgentStore((state) => state.agents);
  const agents = useMemo(() => agentsMap.get(spec.name) ?? [], [agentsMap, spec.name]);

  const handleSelectAgent = useCallback((agentId: string) => {
    const agent = agents.find((a) => a.agentId === agentId);
    if (agent) {
      useSharedAgentStore.getState().selectAgent(agentId);
      onSelectAgent?.(agent); // AgentLogPageへpush
    }
  }, [agents, onSelectAgent]);
}
```

### 2.2 Renderer側のステート管理

**ファイル**: `renderer/stores/agentStore.ts`

Renderer側は **SharedAgentStoreをラップしたFacade層** として実装：

```typescript
export const useAgentStore = create<AgentStore>()((set, get) => ({
  // SharedAgentStoreから状態を取得
  agents: getAgentsFromShared(),
  logs: getLogsFromShared(),

  // SharedAgentStoreの変更を購読して同期
  setupEventListeners: () => {
    const unsubscribeShared = useSharedAgentStore.subscribe(() => {
      set({
        agents: getAgentsFromShared(),
        selectedAgentId: useSharedAgentStore.getState().selectedAgentId,
        logs: getLogsFromShared(),
      });
    });
  },

  // ログロード（SharedAgentStoreへ委譲）
  ensureLogsLoaded: async (agentId: string) => {
    const apiClient = new IpcApiClient();
    await useSharedAgentStore.getState().ensureLogsLoaded(apiClient, agentId);
    set({ logs: getLogsFromShared() });
  },
}));
```

### 2.3 Main Process側のステート管理

**ファイル**: `main/services/logFileService.ts`

```typescript
async readLog(specId: string, agentId: string): Promise<LogEntry[]> {
  const filePath = this.getFilePath(specId, agentId);
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim() !== '');
  return lines.map((line) => JSON.parse(line) as LogEntry);
}
```

### 2.4 SharedAgentStore内のログロード実装

**ファイル**: `shared/stores/agentStore.ts`

```typescript
ensureLogsLoaded: async (apiClient: ApiClient, agentId: string) => {
  const agent = get().getAgentById(agentId);
  if (!agent) return;

  const existingLogs = get().logs.get(agentId) || [];
  const hasLogs = existingLogs.length > 0;
  const isRunning = agent.status === 'running';

  // ロード判定：!hasLogs || !isRunning
  const shouldLoad = !hasLogs || !isRunning;
  if (!shouldLoad) return; // Running && hasLogs → スキップ

  const result = await apiClient.getAgentLogs(agent.specId, agentId);
  if (!result.ok) return;

  // ID重複排除
  const existingIds = new Set(existingLogs.map((log) => log.id));
  for (const log of result.value) {
    if (!existingIds.has(log.id)) {
      get().addLog(agentId, log);
    }
  }
};
```

---

## 3. ログストリームの受信方法

### 3.1 共通フック: useAgentLogSubscription

**ファイル**: `shared/hooks/useAgentLogSubscription.ts`

```typescript
export function useAgentLogSubscription(apiClient: ApiClient | null): void {
  useEffect(() => {
    if (!apiClient) return;

    const cleanup = apiClient.onAgentLog((agentId, log) => {
      useSharedAgentStore.getState().addLog(agentId, log);
    });

    return cleanup;
  }, [apiClient]);
}
```

### 3.2 WebSocket通信（Remote UI）

**ファイル**: `shared/api/WebSocketApiClient.ts`

```typescript
onAgentLog(callback: (agentId: string, log: ParsedLogEntry) => void): () => void {
  return this.on('agent-log', (data) => {
    const payload = data as { agentId: string; log: ParsedLogEntry };
    callback(payload.agentId, payload.log);
  });
}

private handlePushMessage(message: WebSocketResponse): void {
  switch (message.type) {
    case 'AGENT_LOG':
      this.emit('agent-log', message.payload);
      break;
  }
}
```

### 3.3 IPC通信（Electron）

**ファイル**: `shared/api/IpcApiClient.ts`

```typescript
onAgentLog(callback: (agentId: string, log: ParsedLogEntry) => void): () => void {
  return window.electronAPI.onAgentLog((agentId, log) => {
    callback(agentId, log);
  });
}
```

### 3.4 Main Process内のリアルタイムログ配信

**ファイル**: `main/services/logStreamingService.ts`

```typescript
async processLogOutput(agentId: string, stream: 'stdout' | 'stderr', data: string): Promise<void> {
  const record = await this.agentRecordService.findRecordByAgentId(agentId);
  const engineId = record.engineId;

  const parsedEntries = unifiedParser.parseData(data, engineId);

  for (const entry of parsedEntries) {
    this.emitLog(agentId, entry); // IPC/WebSocket配信
  }
}
```

---

## 4. 共通化と個別実装の分析

### 4.1 共通化されている部分

| 項目 | 場所 | 説明 |
|------|------|------|
| Agent ストア | `shared/stores/agentStore.ts` | Zustand共通ストア |
| Agent Info型 | `shared/api/types.ts` | 統一型定義 |
| ログ型 | `shared/utils/parserTypes.ts` | ParsedLogEntry統一型 |
| ログ購読フック | `shared/hooks/useAgentLogSubscription.ts` | 共通フック |
| API インターフェース | `shared/api/types.ts` (ApiClient) | 統一インターフェース |

### 4.2 個別実装されている部分

| 項目 | Renderer | Remote UI | 説明 |
|------|----------|-----------|------|
| APIクライアント | IpcApiClient (IPC) | WebSocketApiClient (WS) | 通信方式の違い |
| Agent ストア | useAgentStore (Facade) | useSharedAgentStore直接 | RendererはFacade層 |
| イベントリスナー | IPC + agentStoreAdapter | WebSocket購読 | リスニング方式の違い |

### 4.3 複雑度マトリックス

```
┌────────────────────────────┬─────────────────┬────────────────┐
│ 機能                        │ Electron        │ Remote UI      │
├────────────────────────────┼─────────────────┼────────────────┤
│ Agent一覧ロード            │ IPC + Facade    │ WebSocket      │
│ 過去ログロード             │ IPC + Facade    │ WebSocket      │
│ リアルタイムログ購読       │ IPC + Hook      │ WebSocket Hook │
│ ステータス変更購読         │ IPC + Adapter   │ WebSocket      │
│ Agent選択状態管理          │ 2ストア同期     │ 1ストア        │
│ ログID重複排除             │ Shared層        │ Shared層       │
└────────────────────────────┴─────────────────┴────────────────┘
```

---

## 5. 問題点と不整合

### 5.1 Agent選択状態の多重管理 🔴

**現状**:
- `useAgentStore.selectedAgentId` (Renderer)
- `useSharedAgentStore.selectedAgentId` (共通)
- `useSharedAgentStore.selectedAgentIdBySpec` (Spec別)

**問題**: 同じ情報が2つのストアに存在し、同期が必要

**ファイル**:
- `renderer/stores/agentStore.ts` (L272-285)
- `shared/stores/agentStore.ts` (L398-408)

### 5.2 ログロード判定ロジックの複雑性 🔴

**現状コード**:
```typescript
const shouldLoad = !hasLogs || !isRunning;
```

**問題シナリオ**:
1. AgentLogPageマウント直後、ensureLogsLoaded()呼び出し
2. Agentはまだrunning
3. IPC onAgentLog()ハンドラがまだ接続されていない
4. **ログが一部喪失される可能性**

### 5.3 Log IDの重複排除メカニズムの不透明性 🟡

**不明確な点**:
- ParsedLogEntryのIDはどこで生成されるのか？
- ファイルログ vs リアルタイムログのID互換性は？
- タイムスタンプソートとID重複排除の順序は正しいか？

```typescript
// タイムスタンプでソート
getLogsForAgent: (agentId: string) => {
  const logs = get().logs.get(agentId) || [];
  return [...logs].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
},
```

**問題**: タイムスタンプの型が`optional`のため、`undefined`の扱いに注意必要

### 5.4 IPCハンドラの設定タイミング 🟡

**ファイル**: `renderer/stores/agentStore.ts` (L531-610)

**問題**:
1. **3つの購読レイヤー**: Adapter + FileWatcher + SharedStore Subscribe
2. **循環更新の可能性**: SharedStore更新 → Facade同期 → 再度API呼び出し？
3. **タイミング依存**: setupEventListeners()がいつ呼び出されるか明確でない

### 5.5 WebSocket再接続時のログギャップ 🟡

**ファイル**: `shared/api/WebSocketApiClient.ts` (L349-356)

```typescript
private async reconnect(): Promise<void> {
  await this.connect();
  this.emit('reconnected', undefined); // 誰が処理？
}
```

**問題**:
1. 再接続後のログ補充処理がない
2. WebSocket disconnect中のログ喪失の補償がない
3. reconnectedイベントを誰が処理するのか不明

---

## 6. 推奨対応

### 6.1 即時対応（High Priority）

| # | 課題 | 対策案 |
|---|------|--------|
| 1 | Agent選択状態の多重管理 | SharedAgentStoreに統一、Facade段階的廃止 |
| 2 | ログ重複排除の脆弱性 | ID生成ルールの明確化、テスト強化 |
| 3 | WebSocket再接続時のログギャップ | reconnectedイベントでensureLogsLoaded再実行 |

### 6.2 中期対応（Medium Priority）

| # | 課題 | 対策案 |
|---|------|--------|
| 4 | IPCハンドラの複雑さ | 購読レイヤーの統合・簡潔化 |
| 5 | Race condition（実行中Agent） | shouldLoadロジックの見直し |
| 6 | Facadeの価値不明 | Sharedストア直使用への移行検討 |

### 6.3 推奨修正例

#### WebSocket再接続時のログ補充

```typescript
// Remote UI App.tsx で
useEffect(() => {
  const cleanup = apiClient.on('reconnected', async () => {
    const agentId = useSharedAgentStore.getState().selectedAgentId;
    if (agentId) {
      await useSharedAgentStore.getState().ensureLogsLoaded(apiClient, agentId);
    }
  });
  return cleanup;
}, [apiClient]);
```

#### ログロード判定の修正

```typescript
// 常に一度は過去ログを読み込む（runningチェック不要）
const shouldLoad = !hasLogs;
```

---

## 7. コード量統計

| モジュール | ファイル | 行数 | 責務 |
|-----------|---------|------|------|
| SharedAgentStore | agentStore.ts | ~489 | Agent/Log SSOT |
| Renderer Facade | renderer/stores/agentStore.ts | ~690 | IPC統合、ローカル状態 |
| IpcApiClient | shared/api/IpcApiClient.ts | ~600+ | IPC通信層 |
| WebSocketApiClient | shared/api/WebSocketApiClient.ts | ~1500+ | WebSocket通信層 |
| LogFileService | main/services/logFileService.ts | ~250+ | ログファイルI/O |
| LogStreamingService | main/services/logStreamingService.ts | ~250+ | リアルタイムログ配信 |
| useAgentLogSubscription | shared/hooks/useAgentLogSubscription.ts | ~58 | 共通購読フック |

**合計**: 約4,500行

---

## 8. 結論

Remote UIのログ取得とステート管理は **Zustand共有ストア + ApiClient抽象化** で実装されており、**基本設計は良好**。

主な改善点:
1. **Agent選択状態の多重管理** → 単一SSOT化
2. **ログ重複排除の脆弱性** → ID生成ルール明確化
3. **WebSocket再接続時のギャップ** → イベント処理追加
4. **IPC複雑性** → 購読レイヤー統合

これらは機能するが非効率なため、段階的改善が可能。

---

## 9. 問題点の解消方法（詳細）

### 9.1 Agent選択状態の多重管理 🔴

#### 現状の問題

```
Renderer:
  useAgentStore.selectedAgentId ← SharedAgentStore.selectedAgentId（同期処理が必要）

Remote UI:
  SharedAgentStore.selectedAgentId（直接使用）
```

Facade層（`renderer/stores/agentStore.ts`）がSharedAgentStoreを購読して同期しているが、
これにより状態の二重管理と同期オーバーヘッドが発生。

#### 解消方法

**方針**: Renderer側もSharedAgentStoreを直接使用し、Facade層を段階的に廃止

**Step 1: Facade固有の状態を分離（影響範囲: 小）**

```typescript
// renderer/stores/agentLocalStore.ts（新規）
// Facade固有の状態のみを管理
export const useAgentLocalStore = create<AgentLocalState>()((set, get) => ({
  // Renderer固有の状態
  skipPermissions: new Map<string, boolean>(),
  runningAgentCounts: new Map<string, number>(),

  // これらのみFacadeで管理
  setSkipPermissions: (agentId: string, skip: boolean) => {...},
  calculateRunningCounts: () => {...},
}));
```

**Step 2: コンポーネントをSharedAgentStore直接使用に移行（影響範囲: 中）**

```typescript
// Before（Facade経由）
const agents = useAgentStore((state) => state.getAgentsForSpec(specId));
const selectedAgentId = useAgentStore((state) => state.selectedAgentId);

// After（SharedAgentStore直接）
const agents = useSharedAgentStore((state) => state.getAgentsForSpec(specId));
const selectedAgentId = useSharedAgentStore((state) => state.selectedAgentId);
```

**Step 3: Facade層を削除（影響範囲: 大）**

- `renderer/stores/agentStore.ts` を削除
- 全importを `@shared/stores/agentStore` に変更
- `agentStoreAdapter.ts` のIPC購読を `App.tsx` に移動

**移行チェックリスト**:
- [ ] AgentLocalStore作成
- [ ] skipPermissions/runningAgentCountsの移行
- [ ] コンポーネントのimport変更（約20ファイル）
- [ ] Facade削除
- [ ] E2Eテスト確認

---

### 9.2 ログロード判定ロジックの脆弱性 🔴

#### 現状の問題

```typescript
// shared/stores/agentStore.ts
const shouldLoad = !hasLogs || !isRunning;
// Running && hasLogs → APIスキップ
```

**問題シナリオ**:
1. AgentLogPage表示
2. useEffect内でensureLogsLoaded()呼び出し
3. 同時にuseAgentLogSubscription開始
4. **タイミング次第でIPC購読開始前のログを取得できない**

#### 解消方法

**方針A: 常にAPIから取得（シンプル・推奨）**

```typescript
// shared/stores/agentStore.ts
ensureLogsLoaded: async (apiClient: ApiClient, agentId: string) => {
  const agent = get().getAgentById(agentId);
  if (!agent) return;

  const existingLogs = get().logs.get(agentId) || [];

  // 変更: Running状態に関係なく、ログがなければロード
  // ID重複排除があるため、二重取得しても問題なし
  if (existingLogs.length > 0) {
    console.log('[ensureLogsLoaded] Logs already exist, skipping');
    return;
  }

  const result = await apiClient.getAgentLogs(agent.specId, agentId);
  // ... 以下同じ
};
```

**方針B: 購読開始を待ってからロード（確実だが複雑）**

```typescript
// AgentLogPage.tsx
useEffect(() => {
  // 1. まずリアルタイム購読を開始
  const cleanup = apiClient.onAgentLog((id, log) => {
    if (id === agent.agentId) {
      useSharedAgentStore.getState().addLog(id, log);
    }
  });

  // 2. 購読開始後に過去ログをロード
  ensureLogsLoaded(apiClient, agent.agentId);

  return cleanup;
}, [apiClient, agent.agentId]);
```

**推奨**: 方針Aを採用。シンプルでID重複排除により安全。

---

### 9.3 WebSocket再接続時のログギャップ 🔴

#### 現状の問題

```typescript
// WebSocketApiClient.ts
private async reconnect(): Promise<void> {
  await this.connect();
  this.emit('reconnected', undefined); // イベント発火のみ
}
```

`reconnected`イベントを発火するが、処理するコードがない。
切断中に発生したログは永久に失われる。

#### 解消方法

**Step 1: App.tsxでreconnectedイベントをハンドリング**

```typescript
// remote-ui/App.tsx
function App() {
  const apiClient = useApiClient();

  // WebSocket再接続時のログ補充
  useEffect(() => {
    if (!apiClient) return;

    const handleReconnected = async () => {
      console.log('[App] WebSocket reconnected, refreshing logs...');

      // 選択中のAgentのログを再取得
      const state = useSharedAgentStore.getState();
      const selectedAgentId = state.selectedAgentId;

      if (selectedAgentId) {
        // キャッシュをクリアして強制再取得
        state.clearLogsForAgent(selectedAgentId);
        await state.ensureLogsLoaded(apiClient, selectedAgentId);
      }

      // Agent一覧も更新（ステータス変更があった可能性）
      await state.loadAgents(apiClient);
    };

    const cleanup = apiClient.on('reconnected', handleReconnected);
    return cleanup;
  }, [apiClient]);

  // ...
}
```

**Step 2: SharedAgentStoreにclearLogsForAgentを追加**

```typescript
// shared/stores/agentStore.ts
clearLogsForAgent: (agentId: string) => {
  const newLogs = new Map(get().logs);
  newLogs.delete(agentId);
  set({ logs: newLogs });
},
```

**Step 3: WebSocketApiClientにonメソッドを公開**

```typescript
// shared/api/WebSocketApiClient.ts
// 既存のprivate onを公開
public on(type: string, listener: (...args: unknown[]) => void): () => void {
  if (!this.eventListeners.has(type)) {
    this.eventListeners.set(type, new Set());
  }
  const listeners = this.eventListeners.get(type)!;
  listeners.add(listener);
  return () => listeners.delete(listener);
}
```

---

### 9.4 Log ID重複排除メカニズムの不透明性 🟡

#### 現状の問題

ID生成は各パーサーで行われている:

```typescript
// claudeParser.ts
let idCounter = 0;
function generateId(): string {
  return `claude-${Date.now()}-${++idCounter}`;
}

// geminiParser.ts
function generateId(): string {
  return `gemini-${Date.now()}-${++idCounter}`;
}
```

**問題点**:
1. プロセス再起動でidCounterがリセット → ID衝突の可能性
2. ファイルログ読み込み時も同じ関数でID生成 → 毎回異なるID
3. リアルタイムログとファイルログで同じエントリに異なるIDが付く

#### 解消方法

**方針: コンテンツベースのハッシュIDに変更**

```typescript
// shared/utils/logIdGenerator.ts（新規）
import { createHash } from 'crypto';

/**
 * ログエントリの内容からユニークIDを生成
 * 同じ内容なら同じIDになるため、重複排除が確実に機能
 */
export function generateLogId(entry: {
  timestamp?: number;
  type?: string;
  message?: unknown;
  engineId?: string;
}): string {
  const content = JSON.stringify({
    timestamp: entry.timestamp,
    type: entry.type,
    message: entry.message,
    engineId: entry.engineId,
  });

  const hash = createHash('sha256')
    .update(content)
    .digest('hex')
    .substring(0, 16);

  return `log-${hash}`;
}
```

```typescript
// claudeParser.ts（修正）
import { generateLogId } from './logIdGenerator';

function parseLine(jsonLine: string): ParsedLogEntry[] {
  // ...
  const entry: ParsedLogEntry = {
    type: 'system',
    timestamp: Date.now(),
    engineId: 'claude',
    // ...
  };
  entry.id = generateLogId(entry); // コンテンツベースID
  entries.push(entry);
}
```

**メリット**:
- 同一ログエントリは常に同一ID
- ファイル読み込みとリアルタイムで同じID
- プロセス再起動の影響なし

**デメリット**:
- ハッシュ計算のオーバーヘッド（軽微）
- 完全に同一のログが重複排除される（意図した動作）

---

### 9.5 IPCハンドラの複雑さ 🟡

#### 現状の問題

```
Renderer側の購読レイヤー:
1. agentStoreAdapter.ts → IPC イベント購読
2. FileWatcher → onAgentRecordChanged
3. SharedAgentStore.subscribe → Facadeへの同期
```

3つの購読レイヤーが絡み合い、デバッグが困難。

#### 解消方法

**方針: 購読レイヤーの統合**

**Step 1: agentStoreAdapterをシンプル化**

```typescript
// renderer/stores/agentStoreAdapter.ts
// Before: 複数のIPC購読とストア更新を混在

// After: IPC購読のみ、ストア更新はSharedAgentStoreに委譲
export function setupAgentEventListeners(apiClient: ApiClient): () => void {
  const cleanups: Array<() => void> = [];

  // Agent追加
  cleanups.push(
    window.electronAPI.onAgentAdded((specId, agent) => {
      useSharedAgentStore.getState().addAgent(specId, agent);
    })
  );

  // ステータス変更
  cleanups.push(
    window.electronAPI.onAgentStatusChanged((agentId, status) => {
      useSharedAgentStore.getState().updateAgentStatus(agentId, status);
    })
  );

  // ログ追加（useAgentLogSubscriptionと統合検討）
  cleanups.push(
    apiClient.onAgentLog((agentId, log) => {
      useSharedAgentStore.getState().addLog(agentId, log);
    })
  );

  return () => cleanups.forEach(fn => fn());
}
```

**Step 2: App.tsxで一元管理**

```typescript
// renderer/App.tsx
function App() {
  const apiClient = useMemo(() => new IpcApiClient(), []);

  useEffect(() => {
    // 一箇所でイベント購読を管理
    const cleanup = setupAgentEventListeners(apiClient);
    return cleanup;
  }, [apiClient]);

  // useAgentLogSubscriptionは不要（上記に統合）
  // Facadeのsubscribeも不要（SharedAgentStore直接使用）
}
```

---

## 10. 実装優先順位

| 優先度 | 問題 | 解消方法 | 工数 | リスク |
|--------|------|----------|------|--------|
| 🔴 1 | WebSocket再接続ギャップ | reconnectedイベント処理追加 | 小 | 低 |
| 🔴 2 | ログロード判定 | shouldLoadロジック簡略化 | 小 | 低 |
| 🟡 3 | Log ID重複排除 | コンテンツベースハッシュID | 中 | 中 |
| 🟡 4 | IPCハンドラ複雑さ | 購読レイヤー統合 | 中 | 中 |
| 🟠 5 | Agent選択状態多重管理 | Facade廃止 | 大 | 高 |

**推奨アプローチ**:
1. まず #1, #2 を実装（即効性高い）
2. #3 を実装（根本的解決）
3. #4, #5 は中長期で段階的に実施
