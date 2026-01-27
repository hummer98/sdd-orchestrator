# Implementation Plan: Agent Lifecycle Management

## Task Overview

本タスクリストはエージェントプロセスのライフサイクル管理を一元化するための実装計画である。以下の順序で段階的に実装を進める：

1. **基盤コンポーネント（Phase 1）**: ProcessUtils、AgentStateMachine、型定義
2. **コア管理（Phase 2）**: AgentRegistry、AgentHandle、AgentLifecycleManager
3. **監視システム（Phase 3）**: AgentWatchdog、3層監視の統合
4. **既存コード統合（Phase 4）**: SpecManagerService、AutoExecutionCoordinator等の連携
5. **UI表示更新（Phase 5）**: 終了理由、再接続ステータスの表示

---

## Tasks

- [x] 1. 型定義とユーティリティの実装
- [x] 1.1 (P) AgentState型とExitReason型を定義する
  - AgentState: spawning, running, timed_out, stopping, killing, completed, failed, stopped, interrupted, terminal
  - ExitReason: completed, stopped_by_user, failed, timed_out, crashed, exited_while_app_closed, pid_reused, orphaned, unknown
  - StopReason型（user_request, timeout, phase_complete, error）を定義
  - 既存のAgentRecordにprocessStartTimeとexitReasonフィールドを追加
  - _Requirements: 2.1, 4.1, 8.1, 8.2_

- [x] 1.2 (P) ProcessUtilsモジュールを実装する
  - getProcessStartTime(pid): `ps -p PID -o lstart`でOSレベルのプロセス開始時刻を取得
  - isSameProcess(pid, recordedStartTime): PID + 開始時刻で同一性検証
  - checkProcessAlive(pid): プロセス生存確認
  - macOS/Linux専用の実装（Windows未対応）
  - _Requirements: 4.2, 4.3, 4.4_
  - _Method: exec (child_process), ps -p PID -o lstart_
  - _Verify: Grep "ps.*-p.*-o.*lstart" in processUtils.ts_

- [x] 2. AgentStateMachineの実装
- [x] 2.1 AgentStateMachineクラスを実装する
  - VALID_TRANSITIONSマップで有効な状態遷移を定義
  - getCurrentState(): 現在の状態を返す
  - transition(nextState): 遷移を実行し、成功/失敗を返す
  - canTransition(nextState): 遷移可能かを判定
  - isTerminal(): terminal状態かを判定
  - 不正な遷移試行時にログ出力（警告レベル）
  - 状態遷移成功時にログ出力（info/debugレベル）
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 9.4_
  - _Method: VALID_TRANSITIONS, transition(), canTransition()_
  - _Verify: Grep "VALID_TRANSITIONS" in agentStateMachine.ts_

- [x] 3. AgentRegistryの実装
- [x] 3.1 AgentRegistryクラスを実装する
  - Map<string, AgentHandle>でIn-Memoryエージェント管理
  - register(handle): エージェント登録
  - unregister(agentId): エージェント登録解除
  - get(agentId): エージェント取得
  - getAll(): 全エージェント取得
  - getBySpec(specId): 指定specのエージェント取得
  - registerReattached(record): 再接続エージェント登録（制限付きモード）
  - clear(): 全エージェントクリア
  - _Requirements: 1.3, 5.4, 6.1_
  - _Method: Map, register(), registerReattached()_
  - _Verify: Grep "registerReattached" in agentRegistry.ts_

- [x] 4. AgentHandleの実装
- [x] 4.1 AgentHandleインターフェースと実装クラスを作成する
  - プロセスハンドル（ChildProcess）と論理的状態の統合
  - agentId, specId, phase, pid, sessionId, state, isReattached, startedAt, processStartTime, exitReason
  - onOutput(callback): 出力コールバック登録
  - onExit(callback): 終了コールバック登録
  - onError(callback): エラーコールバック登録
  - ReattachedAgentHandle: 再接続モード用の制限付き実装
  - _Requirements: 1.2, 6.1, 6.3_
  - _Method: AgentHandle interface, ReattachedAgentHandle class_
  - _Verify: Grep "ReattachedAgentHandle|isReattached" in agentHandle.ts_

- [x] 5. AgentLifecycleManagerの実装
- [x] 5.1 AgentLifecycleManagerの基本構造を実装する
  - シングルトンパターンで実装
  - AgentRegistry、AgentRecordStore、ProcessUtilsとの連携
  - EventEmitterパターンでイベント通知
  - _Requirements: 1.1, 1.3_
  - _Method: AgentLifecycleManager class, EventEmitter_
  - _Verify: Grep "class AgentLifecycleManager" in agentLifecycleManager.ts_

- [x] 5.2 startAgentメソッドを実装する
  - プロセスをspawnし、状態をspawning→runningに遷移
  - AgentHandleを作成しAgentRegistryに登録
  - AgentRecordStoreにレコード保存
  - プロセス開始時刻（processStartTime）を取得・記録
  - agent-startedイベントを発行
  - Layer 1: exit/errorイベントのリスナー登録
  - _Requirements: 1.1, 1.4, 4.2, 9.1_
  - _Method: startAgent(), spawn, getProcessStartTime_
  - _Verify: Grep "startAgent|agent-started" in agentLifecycleManager.ts_

- [x] 5.3 stopAgentメソッドとGraceful Shutdownを実装する
  - 状態をtimed_out（タイムアウト時）またはstopping（ユーザー要求時）に遷移
  - SIGTERMをプロセスに送信
  - 10秒のグレース期間を設定
  - グレース期間超過時はSIGKILL送信、状態をkillingに遷移
  - プロセス終了後、checkProcessAlive()で確実に終了を確認
  - 状態をstopped→terminalに遷移
  - AgentRegistryから削除、AgentRecordStoreに最終状態を永続化
  - agent-stoppedイベントを発行
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - _Method: stopAgent(), SIGTERM, SIGKILL, 10s grace period_
  - _Verify: Grep "SIGTERM|SIGKILL|10.*sec|10000" in agentLifecycleManager.ts_

- [x] 5.4 killAgentメソッドを実装する
  - 即座にSIGKILLを送信（再接続エージェント用）
  - 状態をkilling→stopped→terminalに遷移
  - _Requirements: 6.3_
  - _Method: killAgent(), SIGKILL_
  - _Verify: Grep "killAgent" in agentLifecycleManager.ts_

- [x] 5.5 synchronizeOnStartupメソッドを実装する
  - 全AgentRecordを読み込み
  - 各レコードについてプロセス状態を検証
  - プロセス不在: status=interrupted, exitReason=exited_while_app_closed
  - PID再利用検出: status=interrupted, exitReason=pid_reused（processStartTime不一致）
  - プロセス継続: registerReattachedでAgentRegistryに登録
  - 後方互換性: processStartTimeがない場合はPIDのみで判定（警告ログ出力）
  - agent-state-syncedイベントを発行
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 4.5_
  - _Method: synchronizeOnStartup(), checkProcessAlive, isSameProcess_
  - _Verify: Grep "synchronizeOnStartup|agent-state-synced" in agentLifecycleManager.ts_

- [x] 6. AgentWatchdogの実装
- [x] 6.1 AgentWatchdogクラスを実装する
  - 30秒間隔でヘルスチェックを実行
  - start(): Watchdog開始
  - stop(): Watchdog停止
  - checkHealth(): 手動ヘルスチェック実行
  - アプリのready/will-quitイベントと連動
  - _Requirements: 7.1, 7.5, 9.3_
  - _Method: AgentWatchdog, setInterval(30000), start(), stop()_
  - _Verify: Grep "30000|30.*sec" in agentWatchdog.ts_

- [x] 6.2 孤児エージェント検出ロジックを実装する
  - 状態がrunningだがプロセスが存在しない場合を検出
  - 状態をinterruptedに更新、exitReason=orphanedを記録
  - 異常検出時のみログ出力
  - _Requirements: 7.2, 7.4_
  - _Method: checkHealth, orphaned detection_
  - _Verify: Grep "orphan|exitReason.*orphaned" in agentWatchdog.ts_

- [x] 6.3 ゾンビプロセス強制終了ロジックを実装する
  - 状態がterminalだがプロセスが存在する場合を検出
  - SIGKILLで強制終了
  - 異常検出時のみログ出力
  - _Requirements: 7.3, 7.4_
  - _Method: zombie detection, SIGKILL_
  - _Verify: Grep "zombie|terminal.*process.*exist" in agentWatchdog.ts_

- [x] 7. 既存サービスとの統合
- [x] 7.1 SpecManagerServiceからプロセス管理ロジックを移行する
  - プロセスのspawn処理をAgentLifecycleManager.startAgentに委譲
  - handleAgentExit処理をAgentLifecycleManagerのイベントリスナーに移行
  - 既存のstartAgent/stopAgentメソッドを削除または委譲に変更
  - _Requirements: 1.4_
  - _Method: Delegate to AgentLifecycleManager.startAgent()_
  - _Verify: Grep "agentLifecycleManager.startAgent" in specManagerService.ts_

- [x] 7.2 AutoExecutionCoordinatorのタイムアウト処理を連携する
  - タイムアウト検知時にAgentLifecycleManager.stopAgent(agentId, 'timeout')を呼び出し
  - events.jsonlにauto-execution:timeoutイベントを記録
  - _Requirements: 1.5, 3.1, 3.5, 9.2_
  - _Method: Call AgentLifecycleManager.stopAgent(agentId, 'timeout')_
  - _Verify: Grep "stopAgent.*timeout|auto-execution:timeout" in autoExecutionCoordinator.ts_

- [x] 7.3 IPCハンドラをAgentLifecycleManager経由に変更する
  - handlers.tsのstopAgent処理をAgentLifecycleManager経由に変更
  - agentHandlers.tsのエージェント操作をAgentLifecycleManager経由に変更
  - _Requirements: 1.5_
  - _Method: Route through AgentLifecycleManager_
  - _Verify: Grep "agentLifecycleManager" in handlers.ts, agentHandlers.ts_

- [x] 7.4 main/index.tsにAgentWatchdogのライフサイクル連動を追加する
  - app.on('ready')でAgentWatchdog.start()
  - app.on('will-quit')でAgentWatchdog.stop()
  - app起動時にAgentLifecycleManager.synchronizeOnStartup()を呼び出し
  - _Requirements: 7.5, 5.1_
  - _Method: app.on('ready'), app.on('will-quit')_
  - _Verify: Grep "watchdog.start|watchdog.stop|synchronizeOnStartup" in index.ts_

- [x] 8. AgentRecordServiceの拡張
- [x] 8.1 AgentRecordServiceにprocessStartTimeとexitReasonフィールドを追加する
  - createRecord時にprocessStartTimeを設定
  - 終了時にexitReasonを設定
  - 後方互換性: 既存レコードにフィールドがない場合の処理
  - _Requirements: 4.1, 8.2_
  - _Method: Extend AgentRecord interface_
  - _Verify: Grep "processStartTime|exitReason" in agentRecordService.ts_

- [x] 9. UI表示の更新
- [x] 9.1 (P) agentStoreに再接続ステータスと終了理由の状態を追加する
  - isReattachedフラグ
  - exitReasonフィールド
  - agent-state-syncedイベントのハンドリング
  - _Requirements: 6.2, 8.3_
  - _Method: Add isReattached, exitReason to agent state_
  - _Verify: Grep "isReattached|exitReason" in agentStore.ts_

- [x] 9.2 (P) AgentListItemに再接続ステータスを表示する
  - 「再接続済み（制限付き）」のステータス表示
  - 再接続エージェントの実行時間を「不明」と表示
  - _Requirements: 6.2, 6.4_
  - _Method: Conditional rendering based on isReattached_
  - _Verify: Grep "reattach|制限付き|不明" in AgentListItem.tsx_

- [x] 9.3 (P) AgentListItemに終了理由を表示する
  - 正常終了: 緑のチェックマーク
  - アプリ停止中の終了: 警告アイコン + 「アプリ停止中に終了」
  - 孤児検出: 警告アイコン + 「Watchdogにより検出」
  - 「アプリ停止中に終了」の場合、「終了理由は不明です」と補足表示
  - _Requirements: 8.3, 8.4_
  - _Method: Conditional rendering based on exitReason_
  - _Verify: Grep "exitReason|アプリ停止中|Watchdog|警告" in AgentListItem.tsx_

- [x] 10. テストの実装
- [x] 10.1 (P) AgentStateMachineのユニットテストを作成する
  - 全状態遷移パターンの検証
  - 不正遷移の拒否検証
  - terminal状態への遷移検証
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 10.2 (P) ProcessUtilsのユニットテストを作成する
  - getProcessStartTimeの動作検証
  - isSameProcessの同一性検証
  - checkProcessAliveの生存確認検証
  - _Requirements: 4.2, 4.3, 4.4_

- [x] 10.3 (P) AgentRegistryのユニットテストを作成する
  - CRUD操作の検証
  - reattachedモードの検証
  - _Requirements: 1.3, 6.1_

- [x] 10.4 (P) AgentLifecycleManagerのユニットテストを作成する
  - startAgent、stopAgent、synchronizeOnStartupの検証
  - Graceful Shutdownのタイムアウト検証
  - イベント発行の検証
  - _Requirements: 1.1, 3.2, 3.3, 5.1, 5.2, 5.3_

- [x] 10.5 (P) AgentWatchdogのユニットテストを作成する
  - ヘルスチェックロジックの検証
  - 孤児検出の検証
  - ゾンビ強制終了の検証
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 10.6 統合テストを作成する
  - AutoExecutionCoordinator + AgentLifecycleManager: タイムアウト時のstop連携
  - SpecManagerService + AgentLifecycleManager: プロセス起動委譲
  - AgentWatchdog + AgentRegistry: 孤児検出フロー
  - _Requirements: 1.4, 1.5, 9.1, 9.2, 9.3_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | AgentLifecycleManagerクラス新規作成 | 5.1 | Feature |
| 1.2 | AgentHandleインターフェース定義 | 4.1 | Feature |
| 1.3 | AgentRegistry In-Memory SSOT | 3.1, 5.1 | Feature |
| 1.4 | SpecManagerServiceからの移行 | 7.1 | Integration |
| 1.5 | AutoExecutionCoordinatorの連携 | 7.2, 7.3 | Integration |
| 2.1 | AgentState状態定義 | 1.1, 2.1 | Feature |
| 2.2 | 有効な遷移の定義 | 2.1 | Feature |
| 2.3 | 状態遷移ログ出力 | 2.1 | Feature |
| 2.4 | terminal状態のレジストリ削除 | 2.1, 5.3 | Feature |
| 3.1 | タイムアウト時のtimed_out遷移 | 5.3, 7.2 | Feature |
| 3.2 | Graceful Shutdown SIGTERM | 5.3 | Feature |
| 3.3 | 10秒後SIGKILL | 5.3 | Feature |
| 3.4 | 終了確認とterminal遷移 | 5.3 | Feature |
| 3.5 | auto-execution:timeoutイベント記録 | 7.2 | Feature |
| 4.1 | processStartTimeフィールド追加 | 1.1, 8.1 | Feature |
| 4.2 | プロセス開始時刻取得 | 1.2, 5.2 | Feature |
| 4.3 | getProcessStartTime関数 | 1.2 | Feature |
| 4.4 | isSameProcess関数 | 1.2 | Feature |
| 4.5 | 後方互換性（警告ログ） | 5.5 | Feature |
| 5.1 | 起動時AgentRecord読み込み | 5.5, 7.4 | Feature |
| 5.2 | プロセス不在時のinterrupted更新 | 5.5 | Feature |
| 5.3 | PID再利用時のinterrupted更新 | 5.5 | Feature |
| 5.4 | プロセス継続時の監視モード登録 | 5.5 | Feature |
| 5.5 | agent-state-syncedイベント通知 | 5.5 | Feature |
| 6.1 | ReattachedAgentモード実装 | 3.1, 4.1 | Feature |
| 6.2 | UI再接続ステータス表示 | 9.1, 9.2 | Feature |
| 6.3 | SIGKILL限定の停止 | 4.1, 5.4 | Feature |
| 6.4 | 実行時間「不明」表示 | 9.2 | Feature |
| 7.1 | AgentWatchdog 30秒間隔 | 6.1 | Feature |
| 7.2 | 孤児エージェント検出 | 6.2 | Feature |
| 7.3 | ゾンビプロセス強制終了 | 6.3 | Feature |
| 7.4 | ヘルスチェックログ出力 | 6.2, 6.3 | Feature |
| 7.5 | Watchdogライフサイクル連動 | 6.1, 7.4 | Integration |
| 8.1 | ExitReason型定義 | 1.1 | Feature |
| 8.2 | exitReasonフィールド追加 | 1.1, 8.1 | Feature |
| 8.3 | UI終了理由表示 | 9.1, 9.3 | Feature |
| 8.4 | アプリ停止中終了の補足表示 | 9.3 | Feature |
| 9.1 | Layer 1 イベント駆動監視 | 5.2 | Feature |
| 9.2 | Layer 2 タイムアウト監視 | 7.2 | Feature |
| 9.3 | Layer 3 Watchdog監視 | 6.1, 6.2, 6.3 | Feature |
| 9.4 | 重複処理防止 | 2.1 | Feature |

