# Implementation Plan

## Tasks

- [x] 1. AgentInfo型の拡張
- [x] 1.1 (P) AgentInfo型に実行コンテキストフィールドを追加
  - renderer/stores/agentStore.tsのAgentInfo型にexecutionMode、retryCountの2フィールドを追加
  - すべてoptionalフィールドとして定義し後方互換性を維持
  - executionModeは'auto' | 'manual'のユニオン型
  - retryCountはnumber型
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2. 派生値計算ロジックの実装
- [x] 2.1 ステータスマッピング関数を実装
  - mapAgentStatusToImplTaskStatus関数を作成
  - running→'running'、completed→'success'、error→'error'のマッピング
  - paused→'continuing'、stopped→'stalled'のマッピング
  - 未定義時はnullを返却
  - _Requirements: 3.2_

- [x] 2.2 派生値計算関数を実装
  - getSpecManagerExecution関数を作成しspecIdからSpecManagerExecutionStateを計算
  - agentStoreからspecIdに該当するagentを取得し、running状態のagentでフィルタ
  - isRunningはrunning agentの数が0より大きいかで判定
  - currentPhaseは最新のrunning agentのphaseを取得
  - implTaskStatusはmapAgentStatusToImplTaskStatusで変換
  - retryCount、executionModeをagentから取得
  - 複数agentが同一specで実行中の場合は最新のagentを使用（startedAtでソート）
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. specStoreFacadeの更新
- [x] 3.1 executeSpecManagerGenerationをagentStore経由に変更
  - executionMode引数を追加しagentInfoに設定
  - specManagerExecutionStoreへの書き込みを削除
  - agentStore.addAgent経由でagent情報を登録
  - _Requirements: 4.4, 2.3_

- [x] 3.2 updateImplTaskStatusをagent更新として実装
  - specManagerExecutionStoreへの書き込みを削除
  - 現在実行中のagentのstatusとretryCountを更新
  - _Requirements: 4.5_

- [x] 3.3 clearSpecManagerErrorをagent更新として実装
  - specManagerExecutionStoreへの書き込みを削除
  - agentStore.errorのクリア処理を呼び出し
  - _Requirements: 4.6_

- [x] 3.4 specManagerExecutionオブジェクトの形状を維持
  - useSpecStore()が返すspecManagerExecutionオブジェクトのインターフェースを維持（lastCheckResult除く）
  - getAggregatedState内でgetSpecManagerExecutionを呼び出して派生値を計算
  - 既存のUIコンポーネントが変更なしで動作することを確認
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 4. agentStoreのイベントリスナー修正
- [x] 4.1 setupEventListenersからspecManagerExecutionStore連携を削除
  - onAgentStatusChangeイベントハンドラからspecManagerExecutionStoreへの更新処理を削除
  - agent.status更新はagentStore内部で完結させる
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 5. specManagerExecutionStoreの廃止
- [x] 5.1 specManagerExecutionStore.tsファイルを削除
  - src/renderer/stores/spec/specManagerExecutionStore.tsを削除
  - 他ファイルからのimportが残っていないことを確認
  - _Requirements: 1.2_

- [x] 5.2 specManagerExecutionStore.test.tsファイルを削除
  - src/renderer/stores/spec/specManagerExecutionStore.test.tsを削除
  - _Requirements: 1.3_

- [x] 5.3 spec/types.tsから不要な型を削除
  - SpecManagerExecutionState型は派生値計算用に維持（インターフェース互換、lastCheckResult除く）
  - SpecManagerExecutionActions型からhandleCheckImplResultを削除
  - CheckImplResult型を削除
  - _Requirements: 1.4, 6.1_

- [x] 5.4 spec/index.tsのexportを更新
  - specManagerExecutionStoreのexportを削除
  - 必要に応じてexport構成を整理
  - _Requirements: 1.1_

- [x] 6. checkResult/ImplCompletionAnalyzerの廃止
- [x] 6.1 ImplCompletionAnalyzer.tsを削除
  - src/main/services/implCompletionAnalyzer.tsを削除
  - 他ファイルからのimportが残っていないことを確認
  - _Requirements: 6.2_

- [x] 6.2 ImplCompletionAnalyzer.test.tsを削除
  - src/main/services/implCompletionAnalyzer.test.tsを削除
  - _Requirements: 6.3_

- [x] 6.3 handleCheckImplResult()アクションを削除
  - specStoreFacadeからhandleCheckImplResultメソッドを削除
  - SpecManagerExecutionActions型からhandleCheckImplResultを削除
  - 呼び出し元の処理を削除
  - _Requirements: 6.4_

- [x] 6.4 WorkflowViewの完了タスク表示を削除
  - WorkflowViewから「完了したタスク: 1.1, 1.2」表示部分を削除
  - lastCheckResultを参照しているUIコードを削除
  - タスク完了状態の表示はTaskProgressのプログレスバーのみとする
  - _Requirements: 6.5, 6.6, 6.7_

- [x] 7. テストの更新
- [x] 7.1 specStoreFacade.test.tsを更新
  - specManagerExecutionStoreのモックを削除
  - agentStore経由の動作をテストするテストケースを追加
  - 派生値計算のテストを追加（isRunning、implTaskStatus、currentPhase）
  - executeSpecManagerGenerationがagentStoreを更新することを検証
  - handleCheckImplResult関連のテストを削除
  - _Requirements: 7.1_

- [x] 7.2 WorkflowView.specManager.test.tsを更新
  - specManagerExecutionStoreのモックをagentStoreのモックに変更
  - 統合後のUIコンポーネント動作をテスト
  - isRunning状態に応じたUI表示を検証
  - lastCheckResult表示関連のテストを削除
  - _Requirements: 7.2_

- [x] 7.3 agentStore.test.tsに派生値テストを追加
  - getAgentsForSpecの動作テストを追加
  - 複数agent実行時の派生値計算テストを追加
    - **同一specで2つ以上のagentがrunning時のisRunning計算テスト**（Req 3.4検証）
    - **異なるspecで同時実行時の状態分離確認テスト**（各specの状態が独立することを検証）
  - agent.status変更時のイベント処理テストを追加
  - _Requirements: 7.3_

- [x] 7.4 ImplCompletionAnalyzer関連のテストを削除
  - ImplCompletionAnalyzer.test.tsの削除確認（6.2で実施済み）
  - 他テストファイルでImplCompletionAnalyzerを参照している箇所を削除
  - specManagerService.specManager.test.tsからCheckImplResult関連のimport、mock、テストケースを削除
  - _Requirements: 7.4_

- [x] 8. ビルド検証と動作確認
- [x] 8.1 全テスト実行とビルド成功を確認
  - npm run testで全テストがパスすることを確認
  - npm run buildでビルドが成功することを確認
  - npm run typecheckで型エラーがないことを確認
  - _Requirements: 7.5_

- [x] 8.2 UIの動作確認
  - WorkflowViewでフェーズ実行時にisRunningが正しく表示されることを確認
  - agent完了時にUIが「実行中」表示を解除することを確認
  - 複数specで同時実行時に各specの状態が独立して管理されることを確認
  - TaskProgressのプログレスバーでタスク完了状態が正しく表示されることを確認
  - _Requirements: 5.2_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | agentStoreのみで実行状態を管理 | 5.4 | Infrastructure |
| 1.2 | specManagerExecutionStore.tsファイル削除 | 5.1 | Infrastructure |
| 1.3 | specManagerExecutionStore.test.tsファイル削除 | 5.2 | Infrastructure |
| 1.4 | spec/types.tsから不要型削除 | 5.3 | Infrastructure |
| 2.1 | executionModeフィールド追加 | 1.1 | Infrastructure |
| 2.2 | retryCountフィールド追加 | 1.1 | Infrastructure |
| 2.3 | agent作成時にexecutionMode設定 | 3.1 | Feature |
| 3.1 | isRunningをgetRunningAgentCountから導出 | 2.2 | Feature |
| 3.2 | implTaskStatusをagent.statusから導出 | 2.1, 2.2 | Feature |
| 3.3 | currentPhaseをrunning agentのphaseから取得 | 2.2 | Feature |
| 3.4 | 複数agent実行時に全agentの状態を考慮 | 2.2 | Feature |
| 4.1 | specManagerExecutionオブジェクトの形状維持（lastCheckResult除く） | 3.4 | Feature |
| 4.2 | isRunningがagentStoreから派生値を計算 | 3.4 | Feature |
| 4.3 | implTaskStatusがagentStoreから派生値を計算 | 3.4 | Feature |
| 4.4 | executeSpecManagerGenerationをagentStore経由で実行 | 3.1 | Feature |
| 4.5 | updateImplTaskStatusをagent更新として実装 | 3.2 | Feature |
| 4.6 | clearSpecManagerErrorをagent更新として実装 | 3.3 | Feature |
| 5.1 | onAgentStatusChange時にagent.statusを更新 | 4.1 | Feature |
| 5.2 | agent完了時にUIが実行中表示を解除 | 4.1, 8.2 | Feature |
| 5.3 | specManagerExecutionStoreへの連携処理を削除 | 4.1 | Infrastructure |
| 6.1 | CheckImplResult型を削除 | 5.3 | Infrastructure |
| 6.2 | ImplCompletionAnalyzer.tsを削除 | 6.1 | Infrastructure |
| 6.3 | ImplCompletionAnalyzer.test.tsを削除 | 6.2 | Infrastructure |
| 6.4 | handleCheckImplResult()アクションを削除 | 6.3 | Infrastructure |
| 6.5 | specManagerExecution.lastCheckResultを削除 | 5.3, 6.3 | Infrastructure |
| 6.6 | WorkflowViewの完了タスク表示を削除 | 6.4 | Feature |
| 6.7 | タスク完了状態の表示はTaskProgressのみ | 6.4, 8.2 | Feature |
| 7.1 | specStoreFacade.test.ts更新 | 7.1 | Testing |
| 7.2 | WorkflowView.specManager.test.ts更新 | 7.2 | Testing |
| 7.3 | agentStore.test.tsに派生値テスト追加 | 7.3 | Testing |
| 7.4 | ImplCompletionAnalyzer関連テスト削除 | 7.4 | Testing |
| 7.5 | 全テスト通過とビルド成功 | 8.1 | Testing |
