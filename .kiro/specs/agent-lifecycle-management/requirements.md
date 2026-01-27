# Requirements: Agent Lifecycle Management

## Decision Log

### 1. スコープの決定

- **Discussion**: 最小限の修正（タイムアウト時stopAgent呼び出し）のみか、AgentLifecycleManager導入を含むフル実装か検討。
- **Conclusion**: フル実装を採用。AgentLifecycleManager導入を含む理想形全体を実装する。
- **Rationale**: 根本的な設計問題（責務の分散、状態とプロセスの分離）を解決するには、部分的な修正では不十分。一元化されたライフサイクル管理が必要。

### 2. 状態管理アーキテクチャ

- **Discussion**: 既存の`agent-state-file-ssot`ではファイルをSSOTとしている。今回の設計でIn-Memory SSOTを導入することの影響を検討。
- **Conclusion**: 2層構造を採用。AgentRegistry（In-Memory）をランタイムのSSOTとし、AgentRecordStore（File）を永続化・リカバリソースとする。
- **Rationale**: In-Memoryはプロセスハンドルの保持と高速アクセスに必要。Fileは再起動時のリカバリに必要。両方の利点を活かす。

### 3. PID再利用問題への対策

- **Discussion**: 単純なPID生存確認（`kill(pid, 0)`）では、PIDが再利用された場合に誤判定する。
- **Conclusion**: プロセス開始時刻（`ps -p PID -o lstart`）をAgentRecordに記録し、PID + 開始時刻で同一性を検証する。
- **Rationale**: OSレベルでの同一性確認として標準的かつ信頼性が高い。アプリ再起動を跨いだ状態同期の正確性が向上する。

### 4. Graceful Shutdown猶予期間

- **Discussion**: タイムアウト後のSIGTERMからSIGKILLまでの猶予期間を検討。5秒、10秒、30秒の選択肢。
- **Conclusion**: 10秒を採用。
- **Rationale**: レスポンスと保存処理のバランス。Claude CLIが状態を保存する時間を確保しつつ、過度な待機を避ける。

### 5. Windows対応

- **Discussion**: `ps`コマンドによる開始時刻取得はmacOS/Linux専用。Windows対応の必要性を検討。
- **Conclusion**: Windows対応はOut of Scopeとする。
- **Rationale**: 現時点でSDD OrchestratorはmacOS/Linuxをターゲットとしており、Windows対応は将来の検討事項。

## Introduction

エージェントプロセスのライフサイクル管理を一元化し、現在発生している以下の問題を根本的に解決する：

1. **タイムアウト時にプロセスが停止されない**: AutoExecutionCoordinatorは状態のみ更新し、実際のプロセス停止が行われない
2. **アプリ停止中のエージェント終了が検知されない**: SDD Orchestrator再起動時に、停止中に終了したエージェントの状態が「実行中」のまま残る
3. **PID再利用による誤判定**: 同じPIDが別プロセスに再利用された場合、誤ってエージェントが生存していると判定する
4. **責務の分散**: ライフサイクル管理がCoordinator、SpecManagerService、handlers.tsに分散し、一貫した制御が困難

## Requirements

### Requirement 1: AgentLifecycleManager の導入

**Objective:** As a system, I want a centralized service for agent lifecycle management, so that agent state and process control are unified in a single source of truth.

#### Acceptance Criteria

1. `AgentLifecycleManager`クラスを新規作成し、エージェントのライフサイクル全体（起動、監視、停止）に責任を持たせる。
2. `AgentHandle`インターフェースを定義し、プロセスハンドル（ChildProcess）と論理的状態（AgentState）を統合する。
3. `AgentRegistry`（In-Memory）をランタイムのSSOTとして実装する。
4. 既存の`SpecManagerService`からプロセス管理ロジック（spawn、kill、onExit）を`AgentLifecycleManager`に移行する。
5. `AutoExecutionCoordinator`は`AgentLifecycleManager`を通じてエージェントを制御する。

### Requirement 2: AgentState 状態マシンの実装

**Objective:** As a developer, I want a clear state machine for agent lifecycle, so that state transitions are predictable and traceable.

#### Acceptance Criteria

1. AgentStateとして以下の状態を定義する：`spawning`, `running`, `timed_out`, `stopping`, `killing`, `completed`, `failed`, `stopped`, `interrupted`, `terminal`
2. 各状態からの有効な遷移を定義し、不正な遷移を防止する。
3. 状態遷移時にログを出力し、デバッグを容易にする。
4. `terminal`状態に達したエージェントはレジストリから削除され、レコードファイルのみ残る。

### Requirement 3: タイムアウト時のプロセス停止

**Objective:** As a user, I want timed-out agent processes to be automatically stopped, so that zombie processes don't accumulate.

#### Acceptance Criteria

1. When タイムアウトが発生した場合, the system shall 状態を`timed_out`に更新し、Graceful Shutdown処理を開始する。
2. Graceful Shutdown処理では、SIGTERMをプロセスに送信し、状態を`stopping`に更新する。
3. If プロセスが10秒以内に終了しない場合, then the system shall SIGKILLを送信し、状態を`killing`に更新する。
4. プロセス終了後、`checkProcessAlive()`で確実に終了したことを確認し、状態を`terminal`に更新する。
5. タイムアウト発生時、`events.jsonl`に`auto-execution:timeout`イベントを記録する。

### Requirement 4: AgentRecord の拡張（プロセス開始時刻）

**Objective:** As a system, I want to record process start time, so that PID reuse can be detected accurately.

#### Acceptance Criteria

1. `AgentRecord`インターフェースに`processStartTime: string`フィールドを追加する。
2. エージェント起動時、`ps -p PID -o lstart`でOSレベルのプロセス開始時刻を取得し、レコードに保存する。
3. `getProcessStartTime(pid: number): string | null`関数を実装する。
4. `isSameProcess(pid: number, recordedStartTime: string): boolean`関数を実装し、PID + 開始時刻で同一性を検証する。
5. 既存のAgentRecordに`processStartTime`がない場合、後方互換性のためPIDのみで判定する（警告ログを出力）。

### Requirement 5: 起動時状態同期

**Objective:** As a user, I want agent states to be accurately synchronized on app restart, so that the UI reflects the true state of agents.

#### Acceptance Criteria

1. When SDD Orchestratorが起動した場合, the system shall 全AgentRecordを読み込み、プロセス状態を検証する。
2. If `checkProcessAlive(pid) === false` の場合, then the system shall ステータスを`interrupted`に更新し、`exitReason: 'exited_while_app_closed'`を記録する。
3. If `checkProcessAlive(pid) === true` かつ `processStartTime`が不一致の場合, then the system shall ステータスを`interrupted`に更新し、`exitReason: 'pid_reused'`を記録する。
4. If `checkProcessAlive(pid) === true` かつ `processStartTime`が一致する場合, then the system shall 「監視のみモード」でAgentRegistryに登録する。
5. 状態同期完了後、`agent-state-synced`イベントをUIに通知する。

### Requirement 6: 継続中プロセスの監視のみモード

**Objective:** As a system, I want to monitor reattached processes with limited capabilities, so that continued processes can be tracked and terminated if needed.

#### Acceptance Criteria

1. `ReattachedAgent`モードを実装し、以下の制限を明示する：
   - 可能: PID生存確認、強制終了（SIGKILL）
   - 不可: stdout/stderr受信、Graceful Shutdown
2. UIに「再接続済み（制限付き）」のステータスを表示する。
3. 再接続されたエージェントの停止は、SIGKILLのみ使用可能とする。
4. 再接続されたエージェントの実行時間は「不明」と表示する。

### Requirement 7: Watchdog（定期的ヘルスチェック）

**Objective:** As a system, I want periodic health checks, so that orphaned or zombie processes are detected even if exit events are missed.

#### Acceptance Criteria

1. `AgentWatchdog`を実装し、30秒間隔で全エージェントのヘルスチェックを実行する。
2. If 状態が`running`だがプロセスが存在しない場合, then the system shall 孤児エージェントとして検出し、状態を`interrupted`に更新し、`exitReason: 'orphaned'`を記録する。
3. If 状態が`terminal`だがプロセスが存在する場合, then the system shall ゾンビプロセスとして検出し、SIGKILLで強制終了する。
4. ヘルスチェック結果をログに出力する（異常検出時のみ）。
5. Watchdogの開始・停止をアプリのライフサイクルに連動させる。

### Requirement 8: 終了理由の分類とUI表示

**Objective:** As a user, I want to understand why an agent terminated, so that I can diagnose issues effectively.

#### Acceptance Criteria

1. `ExitReason`型を定義し、以下の理由を分類する：
   - 正常系: `completed`, `stopped_by_user`
   - 異常系（アプリ稼働中）: `failed`, `timed_out`, `crashed`
   - 異常系（アプリ停止中）: `exited_while_app_closed`, `pid_reused`
   - 特殊: `orphaned`, `unknown`
2. AgentRecordに`exitReason`フィールドを追加する。
3. UIにエージェントの終了理由を適切な形式で表示する：
   - 正常終了: 緑のチェックマーク
   - アプリ停止中の終了: 警告アイコン + 「アプリ停止中に終了」
   - 孤児検出: 警告アイコン + 「Watchdogにより検出」
4. 「アプリ停止中に終了」の場合、「終了理由は不明です」と補足表示する。

### Requirement 9: 3層監視の実装

**Objective:** As a system, I want defense-in-depth monitoring, so that agent processes are reliably tracked regardless of failure mode.

#### Acceptance Criteria

1. **Layer 1（イベント駆動）**: プロセスの`exit`/`error`イベントをリッスンし、即座に状態を更新する。
2. **Layer 2（タイムアウト監視）**: AutoExecutionCoordinatorレベルでの論理タイムアウトを検知し、`AgentLifecycleManager.stop()`を呼び出す。
3. **Layer 3（Watchdog）**: 定期的なPID + 開始時刻のポーリングで、Layer 1/2で検出できなかった異常を検出する。
4. 各層の検出イベントは重複して処理されないよう、状態マシンで制御する。

## Out of Scope

- Windows対応（`ps`コマンドの代替実装）
- Claude CLIセッションファイル（`~/.claude/projects/`）の活用
- Agent recordファイル破損時のリカバリ機構
- 複数マシンでの分散エージェント管理
- エージェントのリモートデバッグ機能

## Open Questions

- Claude CLIが独自にセッション情報を保持している場合、それを活用してより正確な終了状態を把握できる可能性がある。将来的に調査が必要。
