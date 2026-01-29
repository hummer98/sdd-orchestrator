# Agent Lifecycle Management - 理想形設計

## 1. 現状の問題分析

### 1.1 責務の分散

現在、エージェントのライフサイクル管理が複数のサービスに分散している：

```
┌─────────────────────────────────────────────────────────────────┐
│                      現状のアーキテクチャ                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AutoExecutionCoordinator          SpecManagerService           │
│  ├─ タイムアウト管理                ├─ プロセス起動 (spawn)       │
│  ├─ ワークフロー状態                ├─ プロセス停止 (kill)        │
│  └─ フェーズ遷移                   └─ 出力監視                   │
│           │                              │                      │
│           │ (状態のみ更新)                │ (プロセスのみ管理)    │
│           ▼                              ▼                      │
│  ┌─────────────────┐            ┌─────────────────┐            │
│  │  状態: error    │            │  プロセス: 実行中 │  ← 不整合！ │
│  └─────────────────┘            └─────────────────┘            │
│                                                                 │
│  AgentRecordService               handlers.ts                   │
│  ├─ ファイル永続化                 ├─ イベント転送               │
│  └─ PID生存確認                   └─ UI通知                     │
│      (起動時のみ使用)                  (stopAgent呼び出しなし)    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 根本的な問題

| 問題 | 説明 |
|------|------|
| **状態とプロセスの分離** | Coordinatorは状態のみ、SpecManagerはプロセスのみ管理 |
| **受動的な監視** | プロセス終了イベント待ちのみ、能動的ヘルスチェックなし |
| **不完全なクリーンアップ** | タイムアウト時にプロセス停止が行われない |
| **単一障害点の不在** | 誰もエージェントの生死に最終責任を持っていない |

---

## 2. 理想形の設計

### 2.1 設計原則

1. **Single Source of Truth (SSOT)**: エージェント状態は一箇所で管理
2. **単一責任**: ライフサイクル管理は一つのサービスが責任を持つ
3. **Defense in Depth**: 複数層の監視でプロセスリークを防止
4. **Graceful Degradation**: 段階的な停止処理

### 2.2 アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────────┐
│                      理想形のアーキテクチャ                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                  AgentLifecycleManager                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │ Spawner     │  │ Monitor     │  │ Terminator  │     │   │
│  │  │             │  │             │  │             │     │   │
│  │  │ - spawn()   │  │ - health    │  │ - graceful  │     │   │
│  │  │ - attach()  │  │ - timeout   │  │ - forceful  │     │   │
│  │  │             │  │ - watchdog  │  │ - cleanup   │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  │         │                │                │             │   │
│  │         └────────────────┼────────────────┘             │   │
│  │                          ▼                              │   │
│  │              ┌─────────────────────┐                    │   │
│  │              │   AgentRegistry     │                    │   │
│  │              │   (In-Memory SSOT)  │                    │   │
│  │              │                     │                    │   │
│  │              │ - agentId → Agent   │                    │   │
│  │              │ - state machine     │                    │   │
│  │              │ - process handle    │                    │   │
│  │              └─────────────────────┘                    │   │
│  │                          │                              │   │
│  │                          ▼                              │   │
│  │              ┌─────────────────────┐                    │   │
│  │              │  AgentRecordStore   │                    │   │
│  │              │  (Persistent)       │                    │   │
│  │              └─────────────────────┘                    │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│              ┌───────────┴───────────┐                         │
│              ▼                       ▼                         │
│    AutoExecutionCoordinator    SpecManagerService              │
│    (ワークフロー制御のみ)        (Spec操作のみ)                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 コンポーネント設計

#### 2.3.1 AgentLifecycleManager

エージェントのライフサイクル全体に責任を持つ中央サービス。

```typescript
interface AgentLifecycleManager {
  // === Spawning ===
  spawn(options: SpawnOptions): Promise<Result<AgentHandle, SpawnError>>;

  // === Monitoring ===
  getAgent(agentId: string): AgentHandle | undefined;
  getAllAgents(): AgentHandle[];
  isAlive(agentId: string): boolean;

  // === Termination ===
  stop(agentId: string, options?: StopOptions): Promise<Result<void, StopError>>;
  stopAll(): Promise<void>;

  // === Events ===
  on(event: 'spawned', handler: (agent: AgentHandle) => void): void;
  on(event: 'exited', handler: (agent: AgentHandle, reason: ExitReason) => void): void;
  on(event: 'timeout', handler: (agent: AgentHandle) => void): void;
  on(event: 'orphaned', handler: (agent: AgentHandle) => void): void;
}
```

#### 2.3.2 AgentHandle

個々のエージェントを表すオブジェクト。プロセスハンドルと状態を統合。

```typescript
interface AgentHandle {
  readonly agentId: string;
  readonly specId: string;
  readonly phase: string;
  readonly pid: number;
  readonly state: AgentState;
  readonly startedAt: Date;
  readonly lastActivityAt: Date;

  // Process control
  readonly process: ChildProcess;

  // Timeout management
  readonly timeout: AgentTimeout;

  // Methods
  updateActivity(): void;
  writeStdin(data: string): void;
}
```

#### 2.3.3 AgentState（状態マシン）

明確な状態遷移を定義。

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    ▼                                         │
              ┌──────────┐                                    │
              │ spawning │                                    │
              └────┬─────┘                                    │
                   │ spawn success                            │
                   ▼                                          │
              ┌──────────┐    timeout     ┌───────────┐       │
              │ running  │───────────────▶│ timed_out │       │
              └────┬─────┘                └─────┬─────┘       │
                   │                            │             │
          ┌────────┼────────┐                   │ stop()      │
          │        │        │                   ▼             │
          ▼        ▼        ▼             ┌───────────┐       │
    ┌──────────┐ ┌────┐ ┌────────┐        │ stopping  │       │
    │completed │ │fail│ │stopped │        └─────┬─────┘       │
    └──────────┘ └────┘ └────────┘              │             │
          │        │        │                   │ grace period│
          │        │        │                   ▼             │
          │        │        │             ┌───────────┐       │
          │        │        │             │  killing  │───────┘
          │        │        │             └─────┬─────┘  retry
          └────────┴────────┴───────────────────┘
                           │
                           ▼
                     ┌──────────┐
                     │ terminal │ (cleanup complete)
                     └──────────┘
```

#### 2.3.4 Multi-Layer Monitoring

3層の監視で確実にプロセスを追跡。

```typescript
interface MonitoringStrategy {
  // Layer 1: Event-Driven (即座)
  // プロセスの exit/error イベントをリッスン
  onProcessExit(callback: (code: number) => void): void;

  // Layer 2: Activity Timeout (設定可能)
  // 最後のアクティビティからの経過時間を監視
  setActivityTimeout(ms: number): void;

  // Layer 3: Watchdog (フォールバック)
  // 定期的なPID生存確認（ポーリング）
  startWatchdog(intervalMs: number): void;
}
```

### 2.4 タイムアウト処理フロー

```
┌─────────────────────────────────────────────────────────────────┐
│                    タイムアウト処理フロー                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Timer fires                                                    │
│      │                                                          │
│      ▼                                                          │
│  ┌─────────────────────────────────────┐                        │
│  │ 1. State → timed_out               │                        │
│  │ 2. Emit 'timeout' event             │                        │
│  │ 3. Log to events.jsonl              │                        │
│  └─────────────────────────────────────┘                        │
│      │                                                          │
│      ▼                                                          │
│  ┌─────────────────────────────────────┐                        │
│  │ 4. Graceful Stop (SIGTERM)          │                        │
│  │    - State → stopping               │                        │
│  │    - Send SIGTERM to process        │                        │
│  │    - Start grace period timer       │                        │
│  └─────────────────────────────────────┘                        │
│      │                                                          │
│      ├─── Process exits within grace period                     │
│      │         │                                                │
│      │         ▼                                                │
│      │    ┌─────────────────────────────────────┐               │
│      │    │ 5a. Cleanup complete               │               │
│      │    │     - State → terminal             │               │
│      │    │     - Update record file           │               │
│      │    │     - Remove from registry         │               │
│      │    └─────────────────────────────────────┘               │
│      │                                                          │
│      └─── Grace period expires                                  │
│                │                                                │
│                ▼                                                │
│  ┌─────────────────────────────────────┐                        │
│  │ 5b. Force Kill (SIGKILL)            │                        │
│  │     - State → killing               │                        │
│  │     - Send SIGKILL to process       │                        │
│  │     - Verify process death          │                        │
│  └─────────────────────────────────────┘                        │
│                │                                                │
│                ▼                                                │
│  ┌─────────────────────────────────────┐                        │
│  │ 6. Final Cleanup                    │                        │
│  │    - checkProcessAlive() で確認     │                        │
│  │    - State → terminal               │                        │
│  │    - Update record file             │                        │
│  └─────────────────────────────────────┘                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.5 Watchdog（孤児プロセス検出）

定期的なヘルスチェックで、イベントを逃した場合のフォールバック。

```typescript
class AgentWatchdog {
  private readonly checkIntervalMs = 30_000; // 30秒

  async performHealthCheck(): Promise<void> {
    for (const agent of this.registry.getAllAgents()) {
      // 1. PID生存確認
      const isAlive = checkProcessAlive(agent.pid);

      // 2. 状態との整合性チェック
      if (agent.state === 'running' && !isAlive) {
        // プロセスが死んでいるが状態がrunning → 孤児検出
        this.handleOrphanedAgent(agent);
      }

      if (agent.state === 'terminal' && isAlive) {
        // 状態がterminalだがプロセスが生きている → ゾンビ検出
        this.handleZombieProcess(agent);
      }
    }
  }

  private handleOrphanedAgent(agent: AgentHandle): void {
    logger.warn('[Watchdog] Orphaned agent detected', { agentId: agent.agentId });
    this.registry.updateState(agent.agentId, 'interrupted');
    this.emit('orphaned', agent);
  }

  private handleZombieProcess(agent: AgentHandle): void {
    logger.error('[Watchdog] Zombie process detected', { agentId: agent.agentId, pid: agent.pid });
    process.kill(agent.pid, 'SIGKILL');
  }
}
```

---

## 3. アプリ停止中のエージェント終了検知

### 3.1 問題の定義

SDD Orchestratorが停止している間にエージェントプロセスが終了した場合：

```
┌─────────────────────────────────────────────────────────────────┐
│                    問題シナリオ                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Time ──────────────────────────────────────────────────────▶  │
│                                                                 │
│  SDD Orchestrator:  [起動中]     [停止]     [再起動]            │
│                        │           │           │                │
│  Agent Process:     [起動] ─────────────[終了]  │                │
│                                     ↑          │                │
│                              イベント受信不可   │                │
│                                                │                │
│  Agent Record:      status: running ──────────▶ ???             │
│                                                                 │
│  UI表示:            「実行中」────────────────▶「実行中」のまま   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 PID再利用問題

単純な `checkProcessAlive(pid)` では不十分：

```
┌─────────────────────────────────────────────────────────────────┐
│                    PID再利用シナリオ                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Agent起動: PID 12345, 開始時刻 10:00:00                     │
│  2. SDD Orchestrator停止                                        │
│  3. Agent終了: PID 12345 解放                                   │
│  4. 別プロセス起動: PID 12345 再利用, 開始時刻 11:30:00          │
│  5. SDD Orchestrator再起動                                      │
│  6. checkProcessAlive(12345) → true (別プロセス!)               │
│                                                                 │
│  誤判定: 「エージェントはまだ実行中」                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 解決策: プロセス開始時刻による照合

#### 3.3.1 AgentRecordの拡張

```typescript
interface AgentRecord {
  agentId: string;
  specId: string;
  phase: string;
  pid: number;
  processStartTime: string;  // ← 追加: OSレベルのプロセス開始時刻
  status: AgentStatus;
  startedAt: string;         // レコード作成時刻（既存）
  lastActivityAt: string;
  // ...
}
```

#### 3.3.2 プロセス開始時刻の取得

```typescript
/**
 * OSからプロセスの開始時刻を取得
 * PID再利用を検出するために使用
 */
function getProcessStartTime(pid: number): string | null {
  try {
    // macOS/Linux: ps コマンドで開始時刻を取得
    const result = execSync(`ps -p ${pid} -o lstart=`, { encoding: 'utf-8' });
    return result.trim() || null;
  } catch {
    return null; // プロセスが存在しない
  }
}

/**
 * PIDと開始時刻の両方で同一プロセスか検証
 */
function isSameProcess(pid: number, recordedStartTime: string): boolean {
  const currentStartTime = getProcessStartTime(pid);
  if (!currentStartTime) {
    return false; // プロセスが存在しない
  }
  return currentStartTime === recordedStartTime;
}
```

### 3.4 起動時の状態同期フロー

```
┌─────────────────────────────────────────────────────────────────┐
│                    起動時状態同期フロー                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SDD Orchestrator 起動                                          │
│      │                                                          │
│      ▼                                                          │
│  ┌─────────────────────────────────────┐                        │
│  │ 1. AgentRecordStore から全レコード読込 │                        │
│  │    (status === 'running' のもの)     │                        │
│  └─────────────────────────────────────┘                        │
│      │                                                          │
│      ▼                                                          │
│  ┌─────────────────────────────────────┐                        │
│  │ 2. 各レコードについてプロセス検証     │                        │
│  └─────────────────────────────────────┘                        │
│      │                                                          │
│      ├─── checkProcessAlive(pid) === false                      │
│      │         │                                                │
│      │         ▼                                                │
│      │    ┌─────────────────────────────────────┐               │
│      │    │ 3a. プロセス終了を検出              │               │
│      │    │     - status → 'interrupted'        │               │
│      │    │     - exitReason → 'app_was_closed' │               │
│      │    │     - detectedAt → now              │               │
│      │    └─────────────────────────────────────┘               │
│      │                                                          │
│      ├─── checkProcessAlive(pid) === true                       │
│      │    BUT processStartTime !== recordedStartTime            │
│      │         │                                                │
│      │         ▼                                                │
│      │    ┌─────────────────────────────────────┐               │
│      │    │ 3b. PID再利用を検出                │               │
│      │    │     - status → 'interrupted'        │               │
│      │    │     - exitReason → 'pid_reused'     │               │
│      │    │     - detectedAt → now              │               │
│      │    └─────────────────────────────────────┘               │
│      │                                                          │
│      └─── checkProcessAlive(pid) === true                       │
│           AND processStartTime === recordedStartTime            │
│                │                                                │
│                ▼                                                │
│           ┌─────────────────────────────────────┐               │
│           │ 3c. プロセス継続を確認              │               │
│           │     - AgentRegistry に登録          │               │
│           │     - 監視を再開                    │               │
│           │     - (プロセスハンドルは取得不可)   │               │
│           └─────────────────────────────────────┘               │
│                                                                 │
│      ▼                                                          │
│  ┌─────────────────────────────────────┐                        │
│  │ 4. UIに状態変更を通知               │                        │
│  │    - 'agent-state-synced' イベント   │                        │
│  └─────────────────────────────────────┘                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.5 継続中プロセスの再接続問題

SDD Orchestrator停止中もエージェントが動き続けている場合の課題：

```typescript
/**
 * 継続中プロセスの制限事項
 *
 * SDD Orchestratorを再起動した場合、継続中のエージェントプロセスに対して：
 *
 * ✅ 可能なこと:
 *   - PID生存確認 (checkProcessAlive)
 *   - 強制終了 (SIGKILL)
 *   - 状態の監視（ポーリングベース）
 *
 * ❌ 不可能なこと:
 *   - stdout/stderr の受信（パイプが切れている）
 *   - Graceful shutdown (SIGTERMへの応答を監視できない)
 *   - 出力ログの取得
 *
 * 対応策:
 *   - プロセスは「監視のみモード」で追跡
 *   - UIには「再接続済み（制限付き）」と表示
 *   - 停止時はSIGKILLのみ使用可能
 */
interface ReattachedAgent {
  mode: 'monitoring-only';
  capabilities: {
    canMonitor: true;
    canKill: true;
    canReceiveOutput: false;
    canGracefulStop: false;
  };
}
```

### 3.6 終了理由の分類

```typescript
type ExitReason =
  // 正常系
  | 'completed'           // 正常完了
  | 'stopped_by_user'     // ユーザーによる停止

  // 異常系（アプリ稼働中）
  | 'failed'              // エラーで終了
  | 'timed_out'           // タイムアウト
  | 'crashed'             // クラッシュ

  // 異常系（アプリ停止中）
  | 'exited_while_app_closed'  // アプリ停止中に終了（原因不明）
  | 'pid_reused'               // PID再利用検出（プロセスは終了している）

  // 特殊
  | 'orphaned'            // Watchdogによる検出
  | 'unknown';            // 判定不能
```

### 3.7 UI表示の設計

```
┌─────────────────────────────────────────────────────────────────┐
│                    UI表示パターン                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ケース1: 正常に実行中                                           │
│  ┌──────────────────────────────────────┐                       │
│  │ 🟢 requirements エージェント          │                       │
│  │    PID: 12345 | 実行時間: 5分30秒     │                       │
│  │    [停止]                             │                       │
│  └──────────────────────────────────────┘                       │
│                                                                 │
│  ケース2: アプリ停止中に終了（起動時検出）                        │
│  ┌──────────────────────────────────────┐                       │
│  │ ⚠️ requirements エージェント          │                       │
│  │    状態: アプリ停止中に終了           │                       │
│  │    検出: 2026-01-25 19:30:00          │                       │
│  │    ※終了理由は不明です                │                       │
│  │    [クリア] [ログを確認]              │                       │
│  └──────────────────────────────────────┘                       │
│                                                                 │
│  ケース3: 再接続（監視のみモード）                               │
│  ┌──────────────────────────────────────┐                       │
│  │ 🔵 requirements エージェント (再接続) │                       │
│  │    PID: 12345 | 実行時間: 不明        │                       │
│  │    ⚠️ 出力の取得は不可                │                       │
│  │    [強制終了]                         │                       │
│  └──────────────────────────────────────┘                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.8 Claude CLIセッションファイルの活用

Claude CLIは独自のセッション管理を行っている可能性がある。これを活用できれば、より正確な状態把握が可能：

```typescript
/**
 * Claude CLIのセッション情報を確認
 * ~/.claude/projects/<project-hash>/sessions/ などを参照
 */
async function checkClaudeSessionState(sessionId: string): Promise<SessionState | null> {
  // TODO: Claude CLIのセッションファイル構造を調査
  // セッションの完了状態、最後のメッセージなどを取得できる可能性
  return null;
}
```

---

## 4. 実装計画

### Phase 0: AgentRecord拡張（前提条件）

1. `AgentRecord` に `processStartTime` フィールド追加
2. `getProcessStartTime(pid)` 関数実装
3. `isSameProcess(pid, startTime)` 関数実装

### Phase 1: AgentLifecycleManager導入

1. `AgentLifecycleManager` クラスを新規作成
2. 既存の `SpecManagerService` からプロセス管理ロジックを移行
3. `AgentHandle` で状態とプロセスを統合

### Phase 2: タイムアウト処理の統合

1. `AutoExecutionCoordinator` のタイムアウトを `AgentLifecycleManager` に移行
2. Graceful shutdown → Force kill のフローを実装
3. `execution-error` イベントで自動的に `stop()` を呼び出し

### Phase 3: 起動時状態同期 & Watchdog導入

1. 起動時状態同期フローの実装
   - 全AgentRecordの読み込み
   - プロセス生存確認 + 開始時刻照合
   - 状態の更新（interrupted, pid_reused, 継続中）
2. 継続中プロセスの「監視のみモード」実装
3. 定期的なWatchdogヘルスチェック
4. UIへの状態変更通知

### Phase 4: テスト・安定化

1. ユニットテスト（状態遷移、タイムアウト）
2. E2Eテスト（実際のプロセス起動・停止）
3. 異常系テスト（クラッシュ、ネットワーク断など）

---

## 5. 現行コードへの最小限の修正案

理想形への完全移行前に、現在の問題を解決する最小限の修正：

### 5.1 タイムアウト時のプロセス停止

```typescript
// autoExecutionHandlers.ts
coordinator.on('execution-error', async (specPath: string, error: AutoExecutionError) => {
  broadcastToRenderers(IPC_CHANNELS.AUTO_EXECUTION_ERROR, { specPath, error });

  // === 追加: タイムアウト時にエージェントを停止 ===
  if (error.type === 'TIMEOUT') {
    const state = coordinator.getState(specPath);
    if (state?.currentAgentId) {
      const service = getSpecManagerService();
      await service.stopAgent(state.currentAgentId);
      logger.info('[handlers] Agent stopped due to timeout', {
        specPath,
        agentId: state.currentAgentId
      });
    }
  }
});
```

### 5.2 coordinatorにagentId保持

```typescript
// autoExecutionCoordinator.ts
interface AutoExecutionState {
  // ... existing fields
  currentAgentId?: string;  // 追加
}

setCurrentPhase(specPath: string, phase: WorkflowPhase, agentId?: string): void {
  const state = this.executionStates.get(specPath);
  if (state) {
    state.currentPhase = phase;
    state.currentAgentId = agentId;  // 追加
    // ...
  }
}
```

---

## 6. まとめ

| 観点 | 現状 | 理想形 |
|------|------|--------|
| 責任の所在 | 分散（誰も最終責任なし） | AgentLifecycleManager が一元管理 |
| 状態管理 | 状態とプロセスが分離 | AgentHandle で統合 |
| 監視方式 | イベント駆動のみ | イベント + タイムアウト + Watchdog |
| タイムアウト処理 | 状態更新のみ | Graceful → Force kill |
| 孤児検出 | 起動時のみ（PIDのみ） | 起動時 + 定期的（PID + 開始時刻） |
| PID再利用対策 | なし | プロセス開始時刻で照合 |
| 継続中プロセス | 未対応 | 監視のみモードで再接続 |
| UI表示 | 実行中のまま残る | 適切な終了理由を表示 |

### 設計の核心

1. **プロセス同一性の検証**: PID + プロセス開始時刻で確実に同一プロセスか判定
2. **起動時状態同期**: アプリ停止中の変化を検出し、状態を正しく更新
3. **終了理由の分類**: 「なぜ終了したか」をUIに適切に表示
4. **制限付き再接続**: stdout/stderrは取得不可だが、監視・終了は可能
