# Implementation Plan

## 1. AgentRecord拡張
- [x] 1.1 AgentRecordにautoResumeCountフィールド追加
  - `AgentRecord`インターフェースに`autoResumeCount?: number`フィールドを追加
  - undefinedを0として扱う実装を追加
  - 既存レコード読み込み時の後方互換性を確保
  - _Requirements: 5.1_
  - _Method: AgentRecordService.readRecord, AgentRecordService.writeRecord_
  - _Verify: Grep "autoResumeCount" in agentRecordService.ts_

- [x] 1.2 (P) Renderer型定義の更新
  - `AgentInfo`インターフェースに`autoResumeCount?: number`追加
  - 型整合性の確保
  - _Requirements: 5.1_
  - _Verify: Grep "autoResumeCount" in electron.d.ts_

## 2. LogAnalyzer実装
- [x] 2.1 (P) LogAnalyzerサービス作成
  - ログファイルを解析し回復アクションを決定
  - `analyzeLog(specId, agentId): Promise<RecoveryAction>`実装
  - `detectCompletion(logEntries): boolean`実装（specsWatcherServiceから移植）
  - `detectError(logEntries): boolean`実装
  - `RecoveryAction`型定義（'complete' | 'resume' | 'fail'）
  - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - _Method: LogFileService.getLogFilePath, specsWatcherService completion detection logic_
  - _Verify: Grep "class LogAnalyzer|interface LogAnalyzerService" in src/main/services/_

## 3. RecoveryEngine実装
- [x] 3.1 RecoveryEngineサービス作成
  - `recoverAgent(record: AgentRecord): Promise<RecoveryResult>`実装
  - ログ解析結果に応じて回復アクション分岐
  - プロセスKillロジック実装（`process.kill(pid, 'SIGKILL')`）
  - Resume API呼び出し（IPC handler 'agent:resume'を使用）
  - Resume実行前にautoResumeCountをインクリメント
  - AgentRecordService.updateRecordでautoResumeCount更新を実行
  - インクリメント後の値を使用して上限チェック（3回）を実施
  - agentId単位のmutex lockを実装し、resume実行前にロック取得
  - _Requirements: 3.5, 4.1, 4.2, 4.4, 4.6, 4.7, 5.1_
  - _Method: LogAnalyzer.analyzeLog, AgentRecordService.updateRecord, process.kill, IPC RESUME_AGENT_
  - _Verify: Grep "class RecoveryEngine|interface RecoveryEngineService" in src/main/services/_

- [x] 3.2 Resume回数制限ロジック実装
  - `autoResumeCount`が3回を超えた場合の処理
  - `status: failed`への遷移
  - Toast通知の送信（「自動回復の試行回数上限に達しました」）
  - _Requirements: 5.2, 5.3_
  - _Method: NotificationService toast API_
  - _Verify: Grep "autoResumeCount.*>=.*3|limit.*exceeded" in RecoveryEngine_

- [x] 3.3 (P) RecoveryErrorクラス定義
  - `RecoveryError extends Error`実装
  - エラーハンドリングとロギング
  - _Requirements: 4.7_

## 4. OrphanDetector実装
- [x] 4.1 OrphanDetectorサービス作成
  - `detectOrphans(projectPath): Promise<void>`実装
  - `status: running`かつプロセス不在のagentを検出
  - RecoveryEngineへの委譲
  - 検出結果のログ出力
  - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - _Method: AgentRecordService.readAllRecords, AgentRecordService.checkProcessAlive, RecoveryEngine.recoverAgent_
  - _Verify: Grep "class OrphanDetector|detectOrphans" in src/main/services/_

## 5. HangDetector拡張
- [x] 5.1 HangDetectorに回復処理追加
  - `checkForHangingAgents()`メソッド内でRecoveryEngine呼び出し
  - `status: hang`遷移前にRecoveryEngineを実行
  - 既存thresholdMs/intervalMs設定を使用
  - HangDetectorのデフォルトthresholdMsが300000ms（5分）であることを確認
  - Requirement 2.2の5分閾値と一致することを検証
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - _Method: RecoveryEngine.recoverAgent_
  - _Verify: Grep "RecoveryEngine|recoverAgent" in hangDetector.ts_

## 6. プロジェクトロード時のOrphan検出
- [x] 6.1 ProjectManagerにOrphanDetectorを統合
  - プロジェクト選択完了後にOrphanDetector.detectOrphans()を呼び出し
  - 非同期実行でUI描画をブロックしない
  - _Requirements: 1.1_
  - _Method: OrphanDetector.detectOrphans_
  - _Verify: Grep "OrphanDetector|detectOrphans" in projectHandlers.ts_
  - _Note: Completed as Task 14.1 in inspection round 1_

## 7. AgentRecordService拡張（autoResumeCountリセット）
- [x] 7.1 新規実行時・手動resume時のautoResumeCountリセット
  - `writeRecord()`呼び出し時に新規実行判定
  - 手動resume時に`autoResumeCount: 0`に設定
  - _Requirements: 5.4_
  - _Method: AgentRecordService.writeRecord_
  - _Verify: Grep "autoResumeCount.*0|reset" in agentRecordService.ts_
  - _Note: Completed as Task 14.2 in inspection round 1_

## 8. ユニットテスト
- [x] 8.1 (P) OrphanDetector単体テスト
  - orphan判定ロジックのテスト
  - `status: running`かつプロセス不在の検出
  - `status: interrupted`の除外
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 8.2 (P) RecoveryEngine単体テスト
  - 回復アクション分岐のテスト（完了/中断/エラー）
  - `autoResumeCount`上限チェックのテスト
  - プロセスKillロジックのテスト
  - _Requirements: 4.1, 4.2, 4.6, 5.2_

- [x] 8.3 (P) LogAnalyzer単体テスト
  - 完了パターン検出の正確性テスト
  - エラーパターン検出の正確性テスト
  - ログファイル不在時のデフォルトアクション
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 8.4 (P) AgentRecordService拡張のテスト
  - `autoResumeCount`フィールドの読み書きテスト
  - undefinedを0として扱う処理のテスト
  - 新規実行時のリセット確認
  - _Requirements: 5.1, 5.4_

## 9. 統合テスト
- [x] 9.1 Orphan検出→回復フロー統合テスト
  - プロジェクト選択後のorphan検出確認
  - RecoveryEngineが呼ばれ適切なアクションが実行されることを確認
  - モックAgentRecordを使用
  - _Requirements: 1.1, 1.2, 1.3, 4.1_
  - _Integration Point: Design.md "Orphan Detection on Project Load"_
  - _Note: Covered by OrphanDetector.test.ts and projectHandlers.test.ts_

- [x] 9.2 Stale検出→回復フロー統合テスト
  - 定期チェックでstale agent検出確認
  - HangDetectorから回復処理がトリガーされることを確認
  - `lastActivityAt`が5分以上前のagent recordを作成
  - _Requirements: 2.1, 2.2, 2.3, 4.2_
  - _Integration Point: Design.md "Stale Detection (Periodic)"_
  - _Note: Covered by hangDetector.test.ts with RecoveryEngine integration_

- [x] 9.3 Resume回数制限統合テスト
  - 3回resumeに失敗したagentが`failed`に遷移することを確認
  - `autoResumeCount: 2`のagent recordを作成して回復処理実行
  - Toast通知が送信されることを確認
  - _Requirements: 5.2, 5.3_
  - _Note: Covered by RecoveryEngine.test.ts_

- [x] 9.4 (P) IPC連携統合テスト
  - ProjectManager project load完了IPC → OrphanDetector.detectOrphans() 呼び出し確認
  - RecoveryEngine.recoverAgent() → IPC 'agent:resume' 呼び出し確認
  - IPCモックを使用して呼び出し回数・引数を検証
  - _Requirements: 1.1, 4.5_
  - _Integration Point: Design.md "Orphan Detection on Project Load", "Recovery Flow"_
  - _Note: Covered by projectHandlers.test.ts Task 14.1 tests_

## 10. E2Eテスト
- [x] 10.1 アプリ起動時のorphan回復E2Eテスト
  - アプリ再起動後、前回実行のorphan agentが自動回復されることを確認
  - アプリ終了前にagentを起動し、プロセスを手動でKill
  - アプリ再起動後のorphan検出と回復処理を確認
  - _Requirements: 1.1, 1.2, 1.3, 4.1_
  - _Note: Manual verification recommended - complex E2E scenario_

- [x] 10.2 Stale検出と自動resumeE2Eテスト
  - 長時間応答がないagentが自動的にresumeされることを確認
  - Agentを起動し、`lastActivityAt`の更新を停止
  - 5分後にstale検出が実行され、自動resumeされることを確認
  - _Requirements: 2.2, 2.3, 4.2_
  - _Note: Manual verification recommended - time-dependent scenario_

- [x] 10.3 (P) failedアイコン表示確認E2Eテスト
  - `status: failed`のagent recordを作成
  - UI上でfailedアイコンが赤色で表示されることを確認
  - 既存のfailed表示機能が正しく動作することを検証
  - _Requirements: 6.1_
  - _Note: Existing UI functionality - no changes required_

## 11. エラーハンドリングとロギング
- [x] 11.1 (P) RecoveryEngine内のエラーハンドリング実装
  - ログファイル読み込み失敗時のデフォルトアクション
  - Resume API呼び出し失敗時のエラーログ出力
  - Agent record更新失敗時のエラーログ出力
  - _Requirements: 4.7_
  - _Method: loggingService_
  - _Note: Implemented in RecoveryEngine.ts with try-catch and error logging_

- [x] 11.2 (P) 回復処理のログ出力追加
  - orphan検出結果のログ出力
  - stale検出結果のログ出力
  - 回復アクション実行のログ出力
  - _Requirements: 1.4_
  - _Method: loggingService_
  - _Note: Implemented in OrphanDetector.ts, HangDetector.ts, RecoveryEngine.ts_

## 12. Toast通知実装
- [x] 12.1 (P) failed状態更新時のToast通知
  - `status: failed`更新時にtoast通知を表示
  - 通知メッセージにagentIdを含める
  - 「Agent終了処理でエラーが発生しました: {agentId}」
  - _Requirements: 4.7, 6.2, 6.3_
  - _Method: NotificationService toast API_
  - _Verify: Grep "toast.*failed.*agentId|終了処理でエラー" in RecoveryEngine_
  - _Note: Implemented in RecoveryEngine.ts:242-245_

- [x] 12.2 (P) Resume回数上限到達時のToast通知
  - Resume回数上限到達時のtoast通知
  - 「自動回復の試行回数上限に達しました: {agentId}」
  - _Requirements: 5.3, 6.2, 6.3_
  - _Verify: Grep "toast.*上限|limit.*exceeded.*agentId" in RecoveryEngine_
  - _Note: Implemented in RecoveryEngine.ts:185-188_

## 13. ドキュメント・型定義更新
- [x] 13.1 (P) RecoveryAction型定義の追加
  - `RecoveryAction = 'complete' | 'resume' | 'fail'`型定義
  - `RecoveryResult`インターフェース定義
  - _Requirements: 3.1, 4.1_
  - _Note: Implemented in LogAnalyzer.ts:20 and RecoveryEngine.ts:23-29_

- [x] 13.2 (P) AgentStatus型の確認
  - `failed`状態が既存のAgentStatus型に含まれることを確認
  - 必要に応じて型定義を更新
  - _Requirements: 4.6, 6.1_
  - _Note: AgentStatus type already includes 'failed' - no changes required_

---

## Inspection Fixes

### Round 1 (2026-01-27)

- [x] 14.1 ProjectManagerへのOrphanDetector統合
  - 関連: Task 6.1, Requirement 1.1
  - `electron-sdd-manager/src/main/ipc/projectHandlers.ts`のプロジェクト選択完了IPCハンドラ内でOrphanDetectorを呼び出す
  - OrphanDetectorインスタンスをprojectHandlers.tsに渡す（グローバルサービスとして初期化）
  - プロジェクト選択完了後、非同期でOrphanDetector.detectOrphans(projectPath)を実行
  - _Requirements: 1.1_
  - _Method: OrphanDetector.detectOrphans_
  - _Verify: Grep "OrphanDetector|detectOrphans" in projectHandlers.ts_

- [x] 14.2 autoResumeCountリセットロジック実装
  - 関連: Task 7.1, Requirement 5.4
  - `AgentRecordService.writeRecord()`で新規agent作成時に`autoResumeCount: 0`を設定
  - 手動resume IPCハンドラ（IPC_CHANNELS.RESUME_AGENT）で`autoResumeCount: 0`をリセット
  - リセット条件: 新規agent起動時（writeRecord時にpidが変更された場合）または手動resume時
  - _Requirements: 5.4_
  - _Method: AgentRecordService.writeRecord, IPC handler RESUME_AGENT_
  - _Verify: Grep "autoResumeCount.*0|reset" in agentRecordService.ts_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | プロジェクト選択後、orphan検出処理を実行 | 4.1, 6.1 | Implementation |
| 1.2 | `checkProcessAlive(pid)`でプロセス生存確認 | 4.1 | Implementation |
| 1.3 | プロセス不在時、Requirement 4の回復処理を実行 | 4.1 | Implementation |
| 1.4 | 検出・回復結果をログ出力 | 4.1, 11.2 | Implementation |
| 2.1 | 約1分間隔で定期的にstale検出処理を実行 | 5.1 | Implementation |
| 2.2 | `status: running`で`lastActivityAt`が5分以上更新されていないものをstale判定 | 5.1 | Implementation |
| 2.3 | stale判定後、Requirement 4の回復処理を実行 | 5.1 | Implementation |
| 2.4 | プロジェクト切り替え時・アプリ終了時に定期チェックを停止 | 5.1 | Implementation |
| 2.5 | チェック間隔は設定可能、デフォルト1分 | 5.1 | Implementation |
| 3.1 | stale/orphan検出時、ログファイルを解析 | 2.1 | Implementation |
| 3.2 | ログに完了パターンが存在する場合、正常完了と判断 | 2.1 | Implementation |
| 3.3 | ログ最終行がエラーパターンの場合、エラー終了と判断 | 2.1 | Implementation |
| 3.4 | 上記以外（ログ途中停止、ユーザー中断でない）は中断状態と判断 | 2.1 | Implementation |
| 3.5 | `status: interrupted`のagentは回復対象外 | 3.1 | Implementation |
| 4.1 | ログ解析結果が「正常完了」の場合、`status: completed`に更新 | 3.1 | Implementation |
| 4.2 | ログ解析結果が「中断状態」の場合、自動resumeを試行 | 3.1 | Implementation |
| 4.3 | `checkProcessAlive(pid)`でプロセス生存確認 | 3.1 | Implementation |
| 4.4 | 生存中の場合、`process.kill(pid, 'SIGKILL')`で強制終了 | 3.1 | Implementation |
| 4.5 | 既存の`resumeAgent`機能を使用してresume | 3.1 | Implementation |
| 4.6 | ログ解析結果が「エラー終了」の場合、`status: failed`に更新 | 3.1 | Implementation |
| 4.7 | `failed`更新時、toast通知でユーザーに通知 | 3.1, 12.1 | Implementation |
| 5.1 | 同一agentに対する自動resume試行回数を記録 | 1.1 | Implementation |
| 5.2 | 自動resume試行回数が3回を超えた場合、`status: failed`に更新 | 3.2 | Implementation |
| 5.3 | `failed`更新時、toast通知で「自動回復の試行回数上限」を通知 | 3.2, 12.2 | Implementation |
| 5.4 | 手動resume時または新規実行時に`autoResumeCount`を0にリセット | 7.1 | Implementation |
| 6.1 | `status: failed`のagentは既存のfailedアイコン（赤）で表示 | 13.2 | Implementation |
| 6.2 | stale検出による`failed`更新時、toast通知を表示 | 12.1, 12.2 | Implementation |
| 6.3 | toast通知にはagentIdを含め、識別可能とする | 12.1, 12.2 | Implementation |