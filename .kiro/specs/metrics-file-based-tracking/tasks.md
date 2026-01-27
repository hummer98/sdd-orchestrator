# Implementation Plan

## Task Format Template

タスクは以下の構造で記述する:
- **Major task**: 機能的な単位でグループ化
- **Sub-task**: 1-3時間で完了可能な実装単位
- **(P)**: 並列実行可能なタスク

---

## Tasks

- [x] 1. Agent Record型定義の拡張
- [x] 1.1 ExecutionEntry型とAgentRecord型の拡張
  - `ExecutionEntry`インタフェースを定義（startedAt, endedAt?, prompt）
  - `AgentRecord`型に`executions?: ExecutionEntry[]`フィールドを追加
  - `AgentInfo`型に同様のフィールドを追加
  - `AgentRecordUpdate`型に`executions`フィールドを追加
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. startAgent時の実行履歴初期化
- [x] 2.1 startAgentでexecutions配列を初期化
  - Agent起動時に`executions`配列を作成し、開始時刻とプロンプトを記録
  - writeRecord呼び出しに`executions`フィールドを追加
  - _Requirements: 2.1_
  - _Method: writeRecord_
  - _Verify: Grep "executions:" in specManagerService.ts startAgent section_

- [x] 2.2 startAgent内のstartAiSession呼び出しを削除
  - `metricsService.startAiSession()`呼び出しを削除
  - _Requirements: 2.2_
  - _Verify: Grep "startAiSession" should NOT match in specManagerService.ts_

- [x] 3. handleAgentExit時のメトリクス記録
- [x] 3.1 handleAgentExitでexecutionsにendedAtを記録
  - Agent recordを読み取り、最後のexecutionsエントリに終了時刻を設定
  - updateRecordで更新
  - _Requirements: 3.1_
  - _Method: readRecord, updateRecord_

- [x] 3.2 handleAgentExitでmetrics.jsonlに書き込み
  - `MetricsService.recordAiSessionFromFile` を使用してAIメトリクスレコードを書き込み
  - 開始時刻、終了時刻、経過時間（ms）を計算して記録
  - _Requirements: 3.2_
  - _Method: MetricsService.recordAiSessionFromFile_
  - _Verify: Grep "recordAiSessionFromFile" in handleAgentExit section_

- [x] 3.3 executions不在時の警告ログ出力（要修正）
  - `executions`配列が存在しない、または最後のエントリに`startedAt`がない場合は警告ログを出力
  - メトリクス記録をスキップする（レガシー `endAiSession` へのフォールバックを削除）
  - _Requirements: 3.3_
  - _Verify: Grep "executions missing" in specManagerService.ts_

- [x] 3.4 handleAgentExit内のendAiSession呼び出しを削除
  - `metricsService.endAiSession()`呼び出し（フォールバック用）を完全に削除
  - _Requirements: 3.4_
  - _Verify: Grep "endAiSession" should NOT match in specManagerService.ts_

- [x] 4. resumeAgent時の実行履歴追加
- [x] 4.1 resumeAgentでexecutions配列に新エントリを追加
  - 既存recordを読み取り、executions配列に新しいエントリ（開始時刻、プロンプト）を追加
  - updateRecordで更新
  - _Requirements: 4.1_
  - _Method: readRecord, updateRecord_
  - _Verify: Grep "executions" in resumeAgent section_

- [x] 4.2 resumeAgent内のstartAiSession呼び出しを削除
  - `metricsService.startAiSession()`呼び出しを削除
  - _Requirements: 4.2_
  - _Verify: Grep "startAiSession" should NOT match in resumeAgent section_

- [x] 5. MetricsServiceのオンメモリ管理廃止
- [x] 5.1 (P) MetricsServiceからAIセッション関連メソッドを削除
  - `startAiSession()`メソッドを削除
  - `endAiSession()`メソッドを削除
  - `getActiveAiSession()`メソッドを削除
  - `getAllActiveAiSessions()`メソッドを削除
  - 関連する内部型定義（InternalAiSession等）を削除
  - _Requirements: 5.1_

- [x] 5.2 (P) MetricsServiceからactiveAiSessionsフィールドを削除
  - `activeAiSessions` Mapフィールドを削除
  - `getSessionKey()`ヘルパーメソッドを削除
  - _Requirements: 5.2_

- [x] 5.3 (P) setProjectPathからactiveAiSessions.clear()を削除
  - `this.activeAiSessions.clear()`呼び出しを削除
  - _Requirements: 5.3_
  - _Verify: Grep "activeAiSessions" should NOT match in metricsService.ts_

- [x] 5.4 (P) 維持すべきメソッドの確認
  - `recordHumanSession()`が存在し正常動作することを確認
  - `startSpecLifecycle()`が存在し正常動作することを確認
  - `completeSpecLifecycle()`が存在し正常動作することを確認
  - `getMetricsForSpec()`が存在し正常動作することを確認
  - `getProjectMetrics()`が存在し正常動作することを確認
  - `setProjectPath()`が正常動作することを確認（activeAiSessions.clear()以外）
  - _Requirements: 5.4_

- [x] 6. recordServiceの対応確認
- [x] 6.1 (P) writeRecordがexecutionsを書き込めることを確認
  - 既存のwriteRecord実装がexecutionsフィールドを含むJSONを正しく書き込むことをテストで検証
  - _Requirements: 6.1_

- [x] 6.2 (P) updateRecordがexecutionsを更新できることを確認
  - 既存のupdateRecord実装がexecutionsフィールドの更新（配列へのpush含む）を正しく処理することをテストで検証
  - _Requirements: 6.2_

- [x] 6.3 (P) readRecordがexecutionsを読み取れることを確認
  - 既存のreadRecord実装がexecutionsフィールドを含むJSONを正しく読み取ることをテストで検証
  - _Requirements: 6.3_

- [x] 7. テスト実装
- [x] 7.1 specManagerServiceのstartAgent関連テストを追加
  - writeRecord呼び出し時にexecutions[0]が含まれることを検証
  - startAiSession呼び出しが存在しないことを検証
  - _Requirements: 2.1, 2.2_

- [x] 7.2 specManagerServiceのhandleAgentExit関連テストを追加
  - executions存在時にmetrics.jsonlに書き込まれることを検証
  - executions不在時に警告ログが出力されることを検証
  - endAiSession呼び出しが存在しないことを検証
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 7.3 specManagerServiceのresumeAgent関連テストを追加
  - updateRecord呼び出し時にexecutionsが追加されることを検証
  - startAiSession呼び出しが存在しないことを検証
  - _Requirements: 4.1, 4.2_

- [x] 7.4 (P) MetricsServiceのテストを更新
  - 削除されたメソッドのテストを削除
  - setProjectPathテストからactiveAiSessions関連のアサーションを削除
  - 維持されるメソッドのテストが通ることを確認
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 7.5 (P) AgentRecordServiceのexecutions関連テストを追加
  - writeRecordでexecutionsが正しく書き込まれることを検証
  - updateRecordでexecutionsが正しく更新されることを検証
  - readRecordでexecutionsが正しく読み取れることを検証
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 8. 統合テスト
- [x] 8.1 Agent lifecycleの統合テスト
  - startAgent → handleAgentExitでexecutionsが正しく更新されることを検証
  - metrics.jsonlに正しいレコードが書き込まれることを検証
  - _Requirements: 2.1, 3.1, 3.2_
  - _Integration Point: Design.md "Agent Start Flow", "Agent Exit Flow"_

- [x] 8.2 Agent resumeの統合テスト
  - resumeAgentでexecutionsに新エントリが追加されることを検証
  - その後のhandleAgentExitで新エントリのendedAtが記録されることを検証
  - _Requirements: 4.1, 3.1_
  - _Integration Point: Design.md "Agent Resume Flow"_

---

## Inspection Fixes

### Round 2 (2026-01-27)

- [x] 9.1 MetricsService: ActiveAiSessionインポート削除
  - 関連: Task 5.1, Requirement 5.1
  - ファイル: `electron-sdd-manager/src/main/services/metricsService.ts` (line 21-22)
  - `ActiveAiSession`をインポートリストから削除
  - _Method: Edit_
  - _Verify: Grep "ActiveAiSession" should NOT match in metricsService.ts_

- [x] 9.2 MetricsService: activeAiSessionsフィールド削除
  - 関連: Task 5.2, Requirement 5.2
  - ファイル: `electron-sdd-manager/src/main/services/metricsService.ts` (line 61)
  - `private activeAiSessions: Map<string, InternalAiSession> = new Map();`を削除
  - _Method: Edit_
  - _Verify: Grep "activeAiSessions" should NOT match in metricsService.ts_

- [x] 9.3 MetricsService: getSessionKeyメソッド削除
  - 関連: Task 5.1, Requirement 5.1
  - ファイル: `electron-sdd-manager/src/main/services/metricsService.ts` (line 72-74)
  - `getSessionKey()`メソッド全体を削除
  - _Method: Edit_
  - _Verify: Grep "getSessionKey" should NOT match in metricsService.ts_

- [x] 9.4 MetricsService: startAiSessionメソッド削除
  - 関連: Task 5.1, Requirement 5.1
  - ファイル: `electron-sdd-manager/src/main/services/metricsService.ts` (line 100-114)
  - `startAiSession()`メソッド全体を削除
  - _Method: Edit_
  - _Verify: Grep "startAiSession" should NOT match in metricsService.ts_

- [x] 9.5 MetricsService: endAiSessionメソッド削除
  - 関連: Task 5.1, Requirement 5.1
  - ファイル: `electron-sdd-manager/src/main/services/metricsService.ts` (line 116-152)
  - `endAiSession()`メソッド全体を削除
  - _Method: Edit_
  - _Verify: Grep "endAiSession" should NOT match in metricsService.ts_

- [x] 9.6 MetricsService: getActiveAiSessionメソッド削除
  - 関連: Task 5.1, Requirement 5.1
  - ファイル: `electron-sdd-manager/src/main/services/metricsService.ts` (line 154-168)
  - `getActiveAiSession()`メソッド全体を削除
  - _Method: Edit_
  - _Verify: Grep "getActiveAiSession" should NOT match in metricsService.ts_

- [x] 9.7 MetricsService: getAllActiveAiSessionsメソッド削除
  - 関連: Task 5.1, Requirement 5.1
  - ファイル: `electron-sdd-manager/src/main/services/metricsService.ts` (line 170-179)
  - `getAllActiveAiSessions()`メソッド全体を削除
  - _Method: Edit_
  - _Verify: Grep "getAllActiveAiSessions" should NOT match in metricsService.ts_

- [x] 9.8 MetricsService: setProjectPathからactiveAiSessions.clear()削除
  - 関連: Task 5.3, Requirement 5.3
  - ファイル: `electron-sdd-manager/src/main/services/metricsService.ts` (line 83)
  - `this.activeAiSessions.clear();`を削除
  - _Method: Edit_
  - _Verify: Grep "activeAiSessions" should NOT match in metricsService.ts_

- [x] 9.9 MetricsService: recordAiSessionFromFile()実装
  - 関連: Task 3.2, Requirement 3.2
  - ファイル: `electron-sdd-manager/src/main/services/metricsService.ts`
  - design.md "3.2 handleAgentExitでmetrics.jsonl書き込み"に基づき実装
  - メソッドシグネチャ: `async recordAiSessionFromFile(specId: string, phase: AgentPhase, start: string, end: string): Promise<void>`
  - metrics.jsonlにAIメトリクスレコードを書き込む
  - _Method: Write new method_
  - _Verify: Grep "recordAiSessionFromFile" in metricsService.ts_

- [x] 9.10 specManagerService.startAgent: executions初期化実装
  - 関連: Task 2.1, Requirement 2.1
  - ファイル: `electron-sdd-manager/src/main/services/specManagerService.ts`
  - design.md "specManagerService.startAgent"に基づき実装
  - writeRecord呼び出しに`executions: [{ startedAt: now, prompt: effectivePrompt || '' }]`を追加
  - _Method: Edit writeRecord call_
  - _Verify: Grep "executions:" in specManagerService.ts startAgent section_

- [x] 9.11 specManagerService.startAgent: startAiSession呼び出し削除
  - 関連: Task 2.2, Requirement 2.2
  - ファイル: `electron-sdd-manager/src/main/services/specManagerService.ts` (line 1018付近)
  - `metricsService.startAiSession()`呼び出しを削除
  - _Method: Edit_
  - _Verify: Grep "startAiSession" should NOT match in specManagerService.ts_

- [x] 9.12 specManagerService.resumeAgent: executions追加実装
  - 関連: Task 4.1, Requirement 4.1
  - ファイル: `electron-sdd-manager/src/main/services/specManagerService.ts`
  - design.md "specManagerService.resumeAgent"に基づき実装
  - 既存recordを読み取り、`executions`配列に新エントリを追加
  - updateRecord呼び出しで`executions`を更新
  - _Method: Edit resumeAgent method_
  - _Verify: Grep "executions" in specManagerService.ts resumeAgent section_

- [x] 9.13 specManagerService.resumeAgent: startAiSession呼び出し削除
  - 関連: Task 4.2, Requirement 4.2
  - ファイル: `electron-sdd-manager/src/main/services/specManagerService.ts`
  - `metricsService.startAiSession()`呼び出しを削除
  - _Method: Edit_
  - _Verify: Grep "startAiSession" should NOT match in specManagerService.ts resumeAgent section_

- [x] 9.14 specManagerService.handleAgentExit: executions読み取りとendedAt記録実装
  - 関連: Task 3.1, Requirement 3.1
  - ファイル: `electron-sdd-manager/src/main/services/specManagerService.ts`
  - design.md "specManagerService.handleAgentExit"に基づき実装
  - readRecordでAgent recordを読み取り
  - 最後の`executions`エントリに`endedAt`を記録
  - updateRecordで更新
  - _Method: Edit handleAgentExit method_
  - _Verify: Grep "executions" in specManagerService.ts handleAgentExit section_

- [x] 9.15 specManagerService.handleAgentExit: metrics.jsonl書き込み実装
  - 関連: Task 3.2, Requirement 3.2
  - ファイル: `electron-sdd-manager/src/main/services/specManagerService.ts`
  - design.md "specManagerService.handleAgentExit"に基づき実装
  - `executions`から開始・終了時刻を取得
  - 経過時間（ms）を計算
  - `MetricsService.recordAiSessionFromFile()`を呼び出し
  - _Method: Edit handleAgentExit method_
  - _Verify: Grep "recordAiSessionFromFile" in specManagerService.ts handleAgentExit section_

- [x] 9.16 specManagerService.handleAgentExit: executions不在時の警告ログ実装
  - 関連: Task 3.3, Requirement 3.3
  - ファイル: `electron-sdd-manager/src/main/services/specManagerService.ts`
  - `executions`配列が存在しない、または最後のエントリに`startedAt`がない場合は警告ログを出力
  - メトリクス記録をスキップ
  - _Method: Edit handleAgentExit method_
  - _Verify: Grep "executions missing" in specManagerService.ts_

- [x] 9.17 specManagerService.handleAgentExit: endAiSession呼び出し削除
  - 関連: Task 3.4, Requirement 3.4
  - ファイル: `electron-sdd-manager/src/main/services/specManagerService.ts`
  - `metricsService.endAiSession()`呼び出しを削除
  - _Method: Edit_
  - _Verify: Grep "endAiSession" should NOT match in specManagerService.ts_

- [x] 9.18 テスト実行: 既存テストの検証
  - 関連: Task 7.1-7.5
  - すべての修正完了後、既存テストを実行してPASSすることを確認
  - _Method: Bash (task electron:test)_
  - _Verify: All tests pass_

- [x] 9.19 テスト実行: 統合テストの検証
  - 関連: Task 8.1-8.2
  - Agent lifecycle統合テスト実行
  - Agent resume統合テスト実行
  - _Method: Bash (task electron:test)_
  - _Verify: Integration tests pass_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | Agent recordにexecutionsフィールド追加 | 1.1 | Infrastructure |
| 1.2 | startedAtからexecutions[0].startedAtへの移行 | 1.1 | Infrastructure |
| 1.3 | 型定義にexecutionsフィールド含む | 1.1 | Infrastructure |
| 2.1 | startAgent時にexecutions初期化 | 2.1 | Feature |
| 2.2 | startAiSession呼び出し削除 | 2.2 | Feature |
| 3.1 | handleAgentExit時にendedAt記録 | 3.1 | Feature |
| 3.2 | metrics.jsonl書き込み | 3.2 | Feature |
| 3.3 | executions不在時の警告ログ | 3.3 | Feature |
| 3.4 | endAiSession呼び出し削除 | 3.4 | Feature |
| 4.1 | resumeAgent時にexecutions追加 | 4.1 | Feature |
| 4.2 | resumeAgent内startAiSession削除 | 4.2 | Feature |
| 5.1 | MetricsServiceからstartAiSession等削除 | 5.1 | Feature |
| 5.2 | MetricsServiceからactiveAiSessions削除 | 5.2 | Feature |
| 5.3 | setProjectPathからclear()削除 | 5.3 | Feature |
| 5.4 | recordHumanSession等の維持 | 5.4 | Feature |
| 6.1 | writeRecordがexecutions書き込み | 6.1 | Feature |
| 6.2 | updateRecordがexecutions更新 | 6.2 | Feature |
| 6.3 | readRecordがexecutions読み取り | 6.3 | Feature |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 1.1), not container tasks (e.g., 1)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks