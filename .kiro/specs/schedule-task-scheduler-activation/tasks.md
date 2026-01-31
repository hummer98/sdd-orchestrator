# Implementation Plan

## Task 1: Agent起動ラッパー関数の実装

- [x] 1.1 (P) startScheduleAgentWrapper関数の実装
  - SpecManagerService.startAgentを呼び出してAgentを起動するラッパー関数を作成
  - specId=''（プロジェクトレベル）、phase='schedule-{taskName}'でAgent起動
  - プロンプトをargsとして渡す
  - 成功時にagentIdを含む結果を返却
  - 失敗時にエラーログを記録し、エラー結果を返却
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - _Method: SpecManagerService.startAgent_
  - _Verify: Grep "startAgent" in scheduleTaskHandlers.ts_

## Task 2: Worktree作成ラッパー関数の実装

- [x] 2.1 (P) createScheduleWorktreeWrapper関数の実装
  - WorktreeServiceを使用してworktreeを作成するラッパー関数を作成
  - 命名規則 `schedule/{task-name}/{suffix}` に従う
  - suffixMode='auto'の場合は日時ベースのsuffix（YYYYMMDD-HHmmss）を自動生成
  - suffixMode='custom'の場合はユーザー指定suffix+日時を使用
  - 成功時にabsolutePathを含む結果を返却
  - 失敗時にエラーログを記録し、エラー結果を返却
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - _Method: WorktreeService.createEntityWorktree_
  - _Verify: Grep "createEntityWorktree" in scheduleTaskHandlers.ts_

## Task 3: 依存関係注入とスケジューラー自動開始

- [x] 3.1 initScheduleTaskCoordinatorの修正
  - getIdleTimeMs依存関係を`idleTimeTracker.getIdleTimeMs()`を返すように修正
  - startScheduleAgent依存関係にTask 1で作成したラッパー関数を注入
  - createScheduleWorktree依存関係にTask 2で作成したラッパー関数を注入
  - initialize()の後にstartScheduler()を呼び出す
  - プロジェクト変更時に既存スケジューラーを停止してから新規開始（既存disposeScheduleTaskCoordinator呼び出しで対応済みを確認）
  - _Requirements: 1.1, 1.3, 2.1, 3.1, 4.1_
  - _Depends on: Task 1.1, Task 2.1_

## Task 4: 統合テストの実装

- [x] 4.1 統合テスト: スケジューラー自動開始フロー
  - initScheduleTaskCoordinator呼び出し後にstartSchedulerが実行されることを検証
  - jest.useFakeTimersで1分経過をシミュレート
  - checkScheduleConditionsとprocessQueueが順番に実行されることを検証
  - _Requirements: 5.1_
  - _Depends on: Task 3.1_

- [x] 4.2 統合テスト: アイドル条件タスク
  - アイドル条件付きタスクを設定
  - idleTimeTracker経由でアイドル時間を設定
  - idleMinutes経過後にキューに追加されることを検証
  - Agent起動が呼び出されることを検証
  - _Requirements: 5.2_

- [x] 4.3 統合テスト: Workflowモードworktree作成
  - workflowMode有効なタスクを設定
  - タスク実行時にworktree作成が呼び出されることを検証
  - 作成されたworktreeパスがAgentに渡されることを検証
  - _Requirements: 5.3_

- [x] 4.4 統合テスト: 回避ルール動作
  - 'wait'回避ルールでキューに残留することを検証
  - 'skip'回避ルールでキューから削除されることを検証
  - 回避条件解除後に実行されることを検証
  - _Requirements: 5.4_

## Task 5: 既存テストの確認と修正

- [x] 5.1 既存ユニットテストの確認
  - 既存のscheduleTaskCoordinator.test.tsを確認
  - 依存関係注入の変更による影響がないことを確認
  - 必要に応じてモックを更新
  - _Requirements: 1.2, 1.4, 2.2, 2.3, 2.4_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | initScheduleTaskCoordinatorでstartScheduler呼び出し | 3.1 | Feature |
| 1.2 | 1分間隔でcheckScheduleConditionsとprocessQueue実行 | 5.1 | Verification |
| 1.3 | プロジェクト変更時に既存スケジューラー停止 | 3.1 | Feature |
| 1.4 | アプリ終了時にdisposeでスケジューラー停止 | 5.1 | Verification |
| 2.1 | getIdleTimeMsがidleTimeTracker.getIdleTimeMs()を返す | 3.1 | Feature |
| 2.2 | Rendererアクティビティ報告でlastActivityTime更新 | 5.1 | Verification |
| 2.3 | checkScheduleConditionsで正確なアイドル時間取得 | 5.1 | Verification |
| 2.4 | アイドル条件タスクがidleMinutes満たした時点でキュー追加 | 5.1 | Verification |
| 3.1 | startScheduleAgentがSpecManagerService.startAgent使用 | 1.1, 3.1 | Feature |
| 3.2 | specId='', phase='schedule-{taskName}'でAgent起動 | 1.1 | Feature |
| 3.3 | プロンプトをAgentに渡す | 1.1 | Feature |
| 3.4 | Agent起動成功時にagentId返却 | 1.1 | Feature |
| 3.5 | Agent起動失敗時にエラーログとエラー結果返却 | 1.1 | Feature |
| 4.1 | createScheduleWorktreeがWorktreeService使用 | 2.1, 3.1 | Feature |
| 4.2 | 命名規則schedule/{task-name}/{suffix}に従う | 2.1 | Feature |
| 4.3 | suffixMode='auto'で日時ベースsuffix自動生成 | 2.1 | Feature |
| 4.4 | suffixMode='custom'でユーザー指定suffix+日時 | 2.1 | Feature |
| 4.5 | 成功時にabsolutePathを返却 | 2.1 | Feature |
| 4.6 | 失敗時にエラーログとタスク実行中止 | 2.1 | Feature |
| 5.1 | 統合テストでフルフロー検証 | 4.1 | Integration Test |
| 5.2 | アイドル条件タスク動作検証 | 4.2 | Integration Test |
| 5.3 | workflowモードworktree作成検証 | 4.3 | Integration Test |
| 5.4 | 回避ルール動作検証 | 4.4 | Integration Test |
