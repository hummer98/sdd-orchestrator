# Agent Status Update アーキテクチャの問題点

作成日: 2026-01-31

## 概要

Agent プロセス完了から UI 更新までのフローを調査した結果、アーキテクチャ上の問題点が複数発見された。現在は動作しているが、保守性・一貫性の観点から改善が必要。

## 現状のフロー

### 正常系（SpecManagerService 経由）

```
[Agent プロセス完了]
    ↓ ChildProcess.on('exit', code)

[SpecManagerService.handleAgentExit()] (specManagerService.ts:1138-1144)
    ↓
    │ 1. Exit code 判定: code === 0 ? 'completed' : 'failed'
    │ 2. statusCallbacks.forEach(cb => cb(agentId, newStatus))
    ↓

[handlers.ts:1149]
    ↓ window.webContents.send(AGENT_STATUS_CHANGE, agentId, status)

[IPC Main → Renderer]
    ↓

[agentStoreAdapter.onAgentStatusChange()] (agentStoreAdapter.ts:232-237)
    ↓ useSharedAgentStore.getState().updateAgentStatus(agentId, status)

[Zustand subscription → React re-render]
    ↓

[UI更新完了] ✓
```

### 並行して発火する別ルート（ファイル監視経由）

```
[Agent プロセス完了]
    ↓
[AgentRecordService.updateRecord()] - JSONファイル更新
    ↓
[chokidar ファイル変更検知]
    ↓ 'change' イベント

[AgentRecordWatcherService.handleEvent()]
    ↓ [debounce 100ms]

[agentHandlers.ts:351-360]
    ↓ window.webContents.send(AGENT_RECORD_CHANGED, 'change', { agentId, specId })

[IPC Main → Renderer]
    ↓

[agentStoreAdapter.onAgentRecordChanged()] (agentStoreAdapter.ts:240-261)
    ↓
    │ type === 'change' の場合:
    │ console.log('...delegating to facade');
    │ ← 実際には何もしない！
    ↓

[UI更新されない] ✗
```

## 発見された問題点

### 問題1: 冗長な通知パス

**現状**: Agent 完了時に 2 つの IPC チャネルが発火する

| チャネル | ソース | 用途 |
|----------|--------|------|
| `AGENT_STATUS_CHANGE` | SpecManagerService.statusCallbacks | ステータス変更通知 |
| `AGENT_RECORD_CHANGED` | chokidar (ファイル監視) | ファイル変更通知 |

**問題点**:
- 同じイベント（Agent 完了）に対して 2 つのパスが存在
- `AGENT_RECORD_CHANGED` の 'change' イベントは何もしない
- 責務が不明確

### 問題2: デッドコード（AGENT_RECORD_CHANGED の change ハンドラー）

**ファイル**: `electron-sdd-manager/src/renderer/stores/agentStoreAdapter.ts:255-259`

```typescript
} else {
  // add/change - reload agents
  // Note: Full reload is delegated to the Facade layer which handles
  // store-specific behaviors like auto-selection
  console.log('[agentStoreAdapter] Agent record add/change event - delegating to facade');
}
```

**問題点**:
- コメントには「Facade 層に委譲」と書かれているが、実際の委譲コードがない
- ログを出力するだけで、何も実行しない
- 'unlink' イベントのみが実際に処理される

**影響**:
- ファイル変更経由での UI 更新が機能しない
- 現在は `AGENT_STATUS_CHANGE` ルートがあるため問題が顕在化していない

### 問題3: 複数の SSOT（Single Source of Truth）

**現状**: Agent 状態が 2 箇所で管理されている

| 場所 | 管理方式 | ファイル |
|------|----------|----------|
| SpecManagerService | インメモリ（Map） | specManagerService.ts |
| JSON ファイル | ファイルベース | .kiro/runtime/agents/\*\*/agent-\*.json |

**問題点**:
- 同期の責務が不明確
- どちらが「真実」かが状況依存
- アプリ再起動時は JSON が真実、実行中は SpecManagerService が真実

### 問題4: 2 つのシステムの責務境界が曖昧

**現状**: Agent ライフサイクル管理に 2 つのシステムが存在

| システム | 責務 | 使用場面 |
|----------|------|----------|
| SpecManagerService | Agent 起動・実行・完了 | START_AGENT IPC |
| AgentLifecycleManager | Agent 停止・再アタッチ | STOP_AGENT IPC（優先） |

**問題点**:

1. **起動と停止で異なるシステムを使用**:
   - 起動: `SpecManagerService.startAgent()`
   - 停止: `AgentLifecycleManager.stopAgent()` 優先

2. **AgentLifecycleManager 経由で停止した場合の不整合**:
   - JSON ファイルは更新される
   - しかし `SpecManagerService.statusCallbacks` は呼ばれない可能性
   - UI 更新が `AGENT_RECORD_CHANGED` 経由になるが、これは何もしない

3. **コード箇所**:

```typescript
// agentHandlers.ts:151-191
ipcMain.handle(IPC_CHANNELS.STOP_AGENT, async (_event, agentId: string) => {
  // Try AgentLifecycleManager first (if initialized)
  const lifecycleManager = getAgentLifecycleManager();
  if (lifecycleManager) {
    const agent = lifecycleManager.getAgent(agentId);
    if (agent) {
      // AgentLifecycleManager 経由で停止
      // → SpecManagerService.statusCallbacks は呼ばれない
    }
  }
  // Fallback to SpecManagerService
  const service = getSpecManagerService();
  const result = await service.stopAgent(agentId);
});
```

## 現在動作している理由

1. **通常の Agent 完了**: SpecManagerService 経由のため `AGENT_STATUS_CHANGE` が発火し UI 更新される
2. **Agent 停止**: 多くの場合 SpecManagerService にフォールバックするか、または `AGENT_STATUS_CHANGE` が別途発火

## 潜在的なリスク

1. **AgentLifecycleManager が優先される状況での UI 更新漏れ**
2. **将来の機能追加時の混乱**（どちらのシステムを使うべきか不明確）
3. **デッドコードの存在による保守性低下**
4. **2 つの SSOT による状態不整合の可能性**

## 推奨される改善

### 短期的改善

1. **デッドコードの修正または削除**:
   - `agentStoreAdapter.ts` の 'change' イベントハンドラーを実装するか削除
   - 「Facade 層に委譲」のコメントを実装するか削除

2. **責務の明確化**:
   - どちらのシステムが Agent 状態の SSOT かを文書化
   - 両システムの使い分けガイドラインを作成

### 中長期的改善

1. **SSOT の統一**:
   - JSON ファイルを唯一の真実とし、インメモリ状態はキャッシュとして扱う
   - または、インメモリ状態を真実とし、JSON はバックアップとして扱う

2. **通知パスの統一**:
   - `AGENT_STATUS_CHANGE` または `AGENT_RECORD_CHANGED` のどちらかに統一
   - 冗長なパスを削除

3. **システムの統合または分離**:
   - SpecManagerService と AgentLifecycleManager の責務を明確に分離
   - または、1 つのシステムに統合

### 問題5: HangDetector が起動されていない

**現状**: HangDetector は実装されているが、どこからも `start()` が呼ばれていない

**実装ファイル**: `electron-sdd-manager/src/main/services/hangDetector.ts`

**設計上の機能**:
- 1分間隔でチェック（`intervalMs: 60000`）
- 5分間 `lastActivityAt` が更新されないエージェントを「ハング」と判定（`thresholdMs: 300000`）
- RecoveryEngine を使って自動回復を試行
- 回復失敗時は `hang` 状態に遷移

**問題点**:
- `hangDetector.start()` がコードベース内のどこからも呼ばれていない
- `agentLifecycleSetup.ts` で AgentWatchdog は作成・起動されるが、HangDetector は作成すらされていない
- 結果として、長時間応答のないエージェントの検出・回復が機能していない

**影響**:
- ログファイルが長時間更新されないエージェントが UI 上「実行中」のまま残る
- ユーザーが手動で状態を確認・停止する必要がある

### 問題6: AgentWatchdog の監視対象の制限

**現状**: AgentWatchdog はインメモリの AgentRegistry に登録されたエージェントのみ監視

**実装ファイル**: `electron-sdd-manager/src/main/services/agentWatchdog.ts`

```typescript
async checkHealth(): Promise<HealthCheckResult> {
  const agents = this.registry.getAll(); // ← インメモリのみ
  // ...
}
```

**問題点**:
1. **アプリ再起動後の問題**:
   - 再起動時に `synchronizeOnStartup()` で reattach されたエージェントのみが監視対象
   - reattach に失敗したエージェント（PID 不一致など）は監視対象外

2. **SpecManagerService 経由で起動されたエージェント**:
   - SpecManagerService.startAgent() で起動されたエージェントは AgentRegistry に登録されない場合がある
   - 問題4 の「2つのシステム」問題と関連

3. **JSON ファイルとの不整合**:
   - JSON ファイル上は `running` でも、AgentRegistry に登録されていなければ監視されない
   - 問題3 の「複数の SSOT」問題と関連

**影響**:
- プロセスが死んでいるのに JSON 上は `running` のままになるケースがある
- UI はファイル監視経由で状態を取得するが、問題2 により 'change' イベントは何もしない
- 結果として UI が更新されない

### 問題5・6 と他の問題の関連図

```
[問題3: 複数のSSOT]
     │
     ├── インメモリ (SpecManagerService, AgentRegistry)
     │        │
     │        └──→ [問題6: AgentWatchdog の監視対象制限]
     │                    │
     │                    └── 登録されていないエージェントは監視されない
     │
     └── JSON ファイル (.kiro/runtime/agents/**/agent-*.json)
              │
              ├──→ [問題5: HangDetector 未起動]
              │            │
              │            └── lastActivityAt ベースの検出が機能しない
              │
              └──→ [問題2: AGENT_RECORD_CHANGED の change ハンドラー]
                           │
                           └── ファイル変更を検知しても UI 更新されない

結果: エージェントがハングしても UI が更新されない
```

## 潜在的なリスク

1. **AgentLifecycleManager が優先される状況での UI 更新漏れ**
2. **将来の機能追加時の混乱**（どちらのシステムを使うべきか不明確）
3. **デッドコードの存在による保守性低下**
4. **2 つの SSOT による状態不整合の可能性**
5. **長時間ハングしたエージェントの自動検出・回復が機能しない**
6. **アプリ再起動後、一部のエージェントが監視対象から漏れる**

## 推奨される改善

### 短期的改善

1. **デッドコードの修正または削除**:
   - `agentStoreAdapter.ts` の 'change' イベントハンドラーを実装するか削除
   - 「Facade 層に委譲」のコメントを実装するか削除

2. **責務の明確化**:
   - どちらのシステムが Agent 状態の SSOT かを文書化
   - 両システムの使い分けガイドラインを作成

3. **HangDetector の有効化**:
   - `agentLifecycleSetup.ts` で HangDetector を作成・起動
   - RecoveryEngine との連携を設定
   - 依存関係: AgentRecordService, LogAnalyzer, 通知コールバック, 再開コールバック

### 中長期的改善

1. **SSOT の統一**:
   - JSON ファイルを唯一の真実とし、インメモリ状態はキャッシュとして扱う
   - または、インメモリ状態を真実とし、JSON はバックアップとして扱う

2. **通知パスの統一**:
   - `AGENT_STATUS_CHANGE` または `AGENT_RECORD_CHANGED` のどちらかに統一
   - 冗長なパスを削除

3. **システムの統合または分離**:
   - SpecManagerService と AgentLifecycleManager の責務を明確に分離
   - または、1 つのシステムに統合

4. **監視対象の統一**:
   - AgentWatchdog が JSON ファイルベースで全エージェントを監視するように変更
   - または、HangDetector に監視を一本化

## 関連ファイル

| ファイル | 役割 |
|----------|------|
| `src/main/services/specManagerService.ts` | Agent 起動・実行管理 |
| `src/main/services/agentLifecycleManager.ts` | Agent ライフサイクル管理 |
| `src/main/services/agentRecordWatcherService.ts` | JSON ファイル監視 |
| `src/main/services/agentWatchdog.ts` | 30秒周期のヘルスチェック（インメモリ） |
| `src/main/services/hangDetector.ts` | 5分閾値のハング検出（未使用） |
| `src/main/services/stale-recovery/RecoveryEngine.ts` | 自動回復エンジン |
| `src/main/services/stale-recovery/LogAnalyzer.ts` | ログ分析による回復判定 |
| `src/main/services/agentLifecycleSetup.ts` | ライフサイクルコンポーネント初期化 |
| `src/main/ipc/agentHandlers.ts` | Agent 関連 IPC ハンドラー |
| `src/main/ipc/handlers.ts` | 一般 IPC ハンドラー（statusCallbacks 登録） |
| `src/renderer/stores/agentStoreAdapter.ts` | Renderer 側 IPC アダプター |

## 関連ドキュメント

- [Agent メタ情報監視アーキテクチャ](./2026-01-31-agent-json-watcher-architecture.md)
