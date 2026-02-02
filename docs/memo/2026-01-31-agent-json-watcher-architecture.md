# Agent メタ情報（JSON）監視アーキテクチャ

作成日: 2026-01-31

## 概要

ProjectAgent、SpecsAgent、BugsAgent のメタ情報（JSONファイル）監視は、**カテゴリー別ファイル構造 + chokidar + IPC** の3層構造で実装されている。

## 前提：エージェントの分類

「ProjectAgent」「SpecsAgent」「BugsAgent」という名前のクラスは存在しない。代わりに、`AgentRecord` という統一的なデータ構造を持ち、`specId` フィールドでカテゴリーを判定する。

### AgentCategory 判定ロジック

`electron-sdd-manager/src/main/services/agentCategory.ts`:

| specId | カテゴリー | 説明 |
|--------|-----------|------|
| `''` (空文字) | `'project'` | ProjectAgent |
| `'bug:xxx'` | `'bugs'` | BugsAgent |
| その他 | `'specs'` | SpecsAgent |

## 監視対象ファイル構造

```
.kiro/runtime/agents/
├── project/
│   ├── agent-{id}.json          ← ProjectAgent
│   └── logs/agent-{id}.log
├── specs/{specId}/
│   ├── agent-{id}.json          ← SpecsAgent
│   └── logs/agent-{id}.log
└── bugs/{bugId}/
    ├── agent-{id}.json          ← BugsAgent
    └── logs/agent-{id}.log
```

## 3層監視アーキテクチャ

### 第1層：ファイルシステム監視（Main プロセス）

**主要サービス**: `AgentRecordWatcherService`
**ファイル**: `electron-sdd-manager/src/main/services/agentRecordWatcherService.ts`

#### Watcher インスタンス

```typescript
private _projectAgentWatcher: chokidar.FSWatcher | null = null;  // 常時起動
private _specWatcher: chokidar.FSWatcher | null = null;          // スコープ切り替え
private _bugWatcher: chokidar.FSWatcher | null = null;           // スコープ切り替え
```

#### Chokidar 設定

| オプション | 値 | 説明 |
|-----------|-----|------|
| `ignoreInitial` | `false` | 起動時に既存ファイルも処理 |
| `depth` | `0` | 直下のファイルのみ監視 |
| `awaitWriteFinish.stabilityThreshold` | `200ms` | 書き込み完了を待機 |
| `ignored` | `**/logs/**` | ログファイルは除外 |

#### 監視パターン

```typescript
const watchPaths = [
  path.join(agentsDir, 'specs/*/*.json'),
  path.join(agentsDir, 'bugs/*/*.json'),
  path.join(agentsDir, 'project/*.json'),
];
```

### 第2層：IPC通信（Main ↔ Renderer）

**ファイル**: `electron-sdd-manager/src/main/ipc/agentHandlers.ts`

#### 主要 IPC チャネル

| チャネル | 用途 |
|----------|------|
| `ipc:agent-record-changed` | ファイル変更通知 |
| `ipc:switch-agent-watch-scope` | スコープ切り替え |
| `ipc:get-running-agent-counts` | 実行中Agent数取得 |

#### イベント送信

```typescript
agentRecordWatcherService.onChange((event) => {
  window.webContents.send(IPC_CHANNELS.AGENT_RECORD_CHANGED, event.type, {
    agentId: event.agentId,
    specId: event.specId,
  });
});
```

### 第3層：UI更新反映（Renderer / Remote UI）

#### Electron版

**ファイル**: `electron-sdd-manager/src/renderer/stores/agentStoreAdapter.ts`

```typescript
const cleanupRecordChanged = window.electronAPI.onAgentRecordChanged(
  (type: 'add' | 'change' | 'unlink', eventInfo) => {
    if (type === 'unlink') {
      useSharedAgentStore.getState().removeAgent(agentId);
    } else {
      // add/change: facade層で全Agent再ロード
    }
  }
);
```

#### Remote UI（WebSocket版）

**ファイル**: `electron-sdd-manager/src/remote-ui/hooks/useAgentStoreInit.ts`

```typescript
apiClient.onAgentStatusChange((agentId, status) => {
  store.updateAgentStatus(agentId, status);
});
```

## 変更検知フロー（Electron版）

```
[ファイルシステム]
    ↓ agent-xxx.json 更新
chokidar.on('change')
    ↓
AgentRecordWatcherService.handleEvent('change', filePath)
    ↓ [debounce 100ms]
onChange() callback → AgentRecordChangeEvent
    ↓ [IPC Main → Renderer]
window.webContents.send(AGENT_RECORD_CHANGED, type, { agentId, specId })
    ↓
agentStoreAdapter.onAgentRecordChanged()
    ↓
useSharedAgentStore 更新
    ↓ [Zustand subscription]
React components re-render
    ↓
[UI更新完了]
```

## 変更検知フロー（Remote UI / WebSocket版）

```
[ファイルシステム] (Main process側)
    ↓ agent-xxx.json 更新
[Main process API]
    ↓
WebSocketHandler.broadcastAgentStatusChange()
    ↓ [WebSocket]
ws.send('AGENT_STATUS', { agentId, status, ... })
    ↓ [Browser]
WebSocketApiClient.onAgentStatusChange()
    ↓
useSharedAgentStore 更新
    ↓
[UI更新完了]
```

## Race Condition 対策

### Mutex + Throttle パターン

**ファイル**: `electron-sdd-manager/src/main/services/agentRecordService.ts`

```typescript
class AgentMutex {
  async acquire(key: string): Promise<() => void>
}

// 更新時の排他制御
async updateRecord(specId, agentId, update) {
  const release = await mutex.acquire(`${specId}/${agentId}`);
  try {
    // 更新処理
  } finally {
    release();
  }
}

// lastActivityAt更新のスロットリング（1秒ごと）
const ACTIVITY_UPDATE_THROTTLE_MS = 1000;
```

### デバウンス設定

| サービス | デバウンス時間 |
|----------|---------------|
| `AgentRecordWatcherService` | 100ms |
| `SpecsWatcherService` | 300ms |
| `BugsWatcherService` | 300ms |

## 監視スコープ最適化

パフォーマンス最適化として、カテゴリー別にスコープを切り替える設計：

- **projectAgentWatcher**: 常時起動（ProjectAgent常時表示のため）
- **specWatcher**: spec 選択時のみ起動
- **bugWatcher**: bug 選択時のみ起動

### スコープ切り替え

```typescript
switchWatchScopeWithCategory(category: 'specs' | 'bugs', entityId: string)
```

## Watcher 起動タイミング

### projectAgentWatcher の起動

**プロジェクト選択時**（`SELECT_PROJECT` IPC 成功後）に起動される。

#### 呼び出しチェーン

```
[Renderer] selectProject(path)
    ↓ [IPC]
projectHandlers.ts:188 - SELECT_PROJECT ハンドラー
    ↓
projectHandlers.ts:194 - selectProject(projectPath)
    ↓ [成功時]
projectHandlers.ts:202 - startAgentRecordWatcher(window, ...)
    ↓
agentHandlers.ts:362 - agentRecordWatcherService.start()
    ↓
agentRecordWatcherService.ts:162 - this._projectAgentWatcher = chokidar.watch(...)
```

#### コード抜粋

```typescript
// projectHandlers.ts:187-205
ipcMain.handle(IPC_CHANNELS.SELECT_PROJECT, async (event, projectPath) => {
  const result = await selectProject(projectPath);

  // Start file watchers on successful project selection
  if (result.success) {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      await startSpecsWatcher(window);
      startAgentRecordWatcher(window, deps.getCurrentProjectPath);  // ← ここ
      await startBugsWatcher(window);
    }
  }
  ...
});
```

### 全 Watcher の起動順序

プロジェクト選択成功時に以下の順で起動：

| 順序 | 関数 | 対象 |
|------|------|------|
| 1 | `startSpecsWatcher()` | spec 定義監視 |
| 2 | `startAgentRecordWatcher()` | Agent JSON 監視（projectAgentWatcher 含む） |
| 3 | `startBugsWatcher()` | bug 定義監視 |

### specWatcher / bugWatcher の起動

これらはプロジェクト選択時には起動せず、**UI で spec/bug を選択したとき**に `switchWatchScopeWithCategory()` で動的に起動される。

## Running Agent Counts（バッジ表示用）

### 用途

`ipc:get-running-agent-counts` は **SpecList / BugList のバッジ表示用**に使用される。各 spec/bug に対して実行中の Agent 数をバッジで表示するための軽量データ取得。

### 更新方式：イベント駆動（ポーリングではない）

#### 1. 初期ロード（IPC経由）

プロジェクト選択時に1回だけ IPC で取得：

```typescript
// projectStore.ts:277
// agent-watcher-optimization Task 5.1: Load lightweight running agent counts for badge display
useAgentStore.getState().loadRunningAgentCounts();
```

#### 2. 継続的更新（ローカル再計算）

Agent 状態変更時に `calculateRunningCounts()` でローカル再計算：

```typescript
function calculateRunningCounts(): Map<string, number> {
  const sharedState = useSharedAgentStore.getState();
  const counts = new Map<string, number>();

  for (const [specId, agents] of sharedState.agents.entries()) {
    const runningCount = agents.filter((a) => a.status === 'running').length;
    counts.set(specId, runningCount);
  }
  return counts;
}
```

### 再計算トリガー

| タイミング | トリガー |
|-----------|----------|
| Agent 起動後 | `startAgent()` 成功 |
| Agent 削除後 | `deleteAgent()` 成功 |
| ファイル削除イベント | `AGENT_RECORD_CHANGED` (unlink) |
| SharedStore 変更 | `useSharedAgentStore.subscribe()` |

### データフロー（継続的更新）

```
agent-xxx.json 変更
    ↓ [chokidar]
AGENT_RECORD_CHANGED イベント
    ↓ [IPC]
agentStoreAdapter 受信
    ↓
SharedAgentStore 更新
    ↓ [Zustand subscribe]
calculateRunningCounts() 再計算
    ↓
runningAgentCounts 更新
    ↓
UI バッジ更新
```

### 設計意図

- **初回**: IPC で全カウント取得（フルデータより軽量）
- **以降**: ファイル変更イベント → SharedStore 更新 → ローカル再計算
- **ポーリングなし**: 完全にイベント駆動でリアルタイム更新

## 関連サービス

### spec/bug 定義ファイル監視

| サービス | 監視対象 |
|----------|----------|
| `SpecsWatcherService` | `.kiro/specs/` + ワークツリー |
| `BugsWatcherService` | `.kiro/bugs/` + ワークツリー |

### ワークツリー動的追加

`worktreeWatcherUtils.ts` でワークツリー追加を検知し、監視対象に動的追加：

```typescript
detectWorktreeAddition(basePath, dirPath) → entityName | null
```

## 主要ファイル一覧

| ファイル | 役割 |
|----------|------|
| `src/main/services/agentRecordWatcherService.ts` | Agent JSON 監視 (SSOT) |
| `src/main/services/agentRecordService.ts` | Agent Record CRUD操作 |
| `src/main/services/agentCategory.ts` | カテゴリー判定 |
| `src/main/services/specsWatcherService.ts` | spec定義監視 |
| `src/main/services/bugsWatcherService.ts` | bug定義監視 |
| `src/main/ipc/agentHandlers.ts` | IPC ハンドラー |
| `src/renderer/stores/agentStoreAdapter.ts` | Renderer側ストアアダプター |
| `src/remote-ui/hooks/useAgentStoreInit.ts` | Remote UI初期化 |

## 既知の問題点

### 1. カテゴリーパス定義が SSOT になっていない

`agentCategory.ts` が SSOT として意図されているが、実際にはパス構造が複数箇所にハードコードされている。

#### 分散箇所

| ファイル | 行 | 内容 |
|----------|-----|------|
| `agentCategory.ts` | 76-85 | `getCategoryBasePath()` - 正規の定義 |
| `agentRecordWatcherService.ts` | 157-159 | 監視パターンのハードコード |
| `agentRecordWatcherService.ts` | 100-120 | `extractIds()` でのパス解析 |

#### 問題のコード

```typescript
// agentRecordWatcherService.ts:157-159
const watchPaths = [
  path.join(agentsDir, 'specs/*/*.json'),    // ハードコード
  path.join(agentsDir, 'bugs/*/*.json'),     // ハードコード
  path.join(agentsDir, 'project/*.json'),    // ハードコード
];
```

#### 改善案

`agentCategory.ts` に監視パターン生成関数を追加して SSOT 化：

```typescript
export const CATEGORY_DIRS = {
  specs: 'specs',
  bugs: 'bugs',
  project: 'project',
} as const;

export function getWatchPatterns(agentsDir: string): string[] {
  return [
    path.join(agentsDir, `${CATEGORY_DIRS.specs}/*/*.json`),
    path.join(agentsDir, `${CATEGORY_DIRS.bugs}/*/*.json`),
    path.join(agentsDir, `${CATEGORY_DIRS.project}/*.json`),
  ];
}
```

### 2. カテゴリー判定が specId の文字列パターンに依存

`determineCategory()` は specId の文字列パターン（`bug:` プレフィックス）でカテゴリーを推測しており、設計が逆転している。

#### 現状（問題のあるコード）

```typescript
// agentCategory.ts:40-48
export function determineCategory(specId: string): AgentCategory {
  if (specId === '') {
    return 'project';
  }
  if (specId.startsWith('bug:')) {  // ← 文字列パターンに依存
    return 'bugs';
  }
  return 'specs';
}
```

#### 本来あるべき姿

カテゴリーが第一級の概念として `AgentRecord` に明示的に含まれるべき：

```typescript
interface AgentRecord {
  category: 'specs' | 'bugs' | 'project';  // カテゴリーが先
  entityId: string;  // spec名 or bug名 or '' (project)
  agentId: string;
  // ...
}
```

#### 歴史的経緯

元々カテゴリー分けがなく、すべてが `specId` で管理されていた時代の名残。後から bugs を追加する際に `bug:` プレフィックスという workaround を採用したと推測される。

### 3. specWatcher の ignoreInitial 設定

```typescript
// agentRecordWatcherService.ts:222-224
this._specWatcher = chokidar.watch(specDir, {
  ignoreInitial: true, // 既存ファイルはイベント発火しない
  ...
});
```

- ファイルを手動で移動しても、specWatcher はイベントを発火しない
- Agent一覧を更新するには spec の再選択またはアプリ再起動が必要

## まとめ

- **SSOT**: `AgentRecordWatcherService` が全カテゴリーの監視を統括
- **chokidar**: ファイルシステム監視の基盤
- **IPC/WebSocket**: Main-Renderer間通信
- **Zustand**: Renderer側の状態管理
- **デバウンス/Mutex/スロットル**: Race condition対策
