# Implementation Plan

## Task 1: tasks.mdパーサー実装

- [ ] 1.1 (P) tasks.mdパーサーのコアロジック実装
  - Markdown形式のtasks.mdを解析してタスク構造を抽出する
  - チェックボックス形式のタスク項目（`- [ ]` / `- [x]`）を識別する
  - タスクID（1.1, 2.3等）とタイトルを抽出する
  - 親タスク・サブタスクの階層関係を判定する
  - _Requirements: 2.1_

- [ ] 1.2 (P) 並列実行マーカー(P)の検出と並列フラグ設定
  - タスク行内の`(P)`マークを検出する
  - 検出結果に基づいてisParallelフラグを設定する
  - 親タスクとサブタスクそれぞれで独立して(P)判定を行う
  - _Requirements: 2.2, 2.3_

- [ ] 1.3 タスクグループ化ロジックの実装
  - 連続する(P)マーク付きタスクを同一グループに分類する
  - 非(P)タスクを単独グループとして扱う
  - グループ順序をtasks.md内の出現順で決定する
  - グループ分類結果として、連続(P)→グループ、非(P)→単独グループの構造を返す
  - _Requirements: 2.4, 2.5, 3.1, 3.2, 3.3_

- [ ] 1.4 パーサーの単体テスト作成
  - 基本的なタスク解析テスト（タスクID、タイトル、完了状態）
  - (P)マーク検出テスト
  - グループ化ロジックテスト（連続(P)、非(P)、混在パターン）
  - エッジケーステスト（空ファイル、ネスト構造、特殊文字）
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3_

## Task 2: Main側IPCエンドポイント追加

- [ ] 2.1 IPCチャンネル定義の追加
  - PARSE_TASKS_FOR_PARALLELチャンネルを定義する（`ipc:parse-tasks-for-parallel`）
  - 既存のEXECUTE_TASK_IMPL、STOP_AGENT、AGENT_STATUS_CHANGEを活用確認
  - _Requirements: 2.1_

- [ ] 2.2 tasks.md解析IPCハンドラ実装
  - SpecManagerServiceにparseTasksForParallelメソッドを追加する
  - PARSE_TASKS_FOR_PARALLELハンドラを実装する
  - specId, featureNameからtasks.mdを読み込みパーサーを呼び出す
  - ParseResult型でグループ化されたタスク情報を返却する
  - _Requirements: 2.1, 2.4_

- [ ] 2.3 IPCハンドラの単体テスト作成
  - PARSE_TASKS_FOR_PARALLELハンドラのモックテスト
  - エラーケース（ファイル不在、パースエラー）のテスト
  - _Requirements: 2.1_

## Task 3: ParallelImplService実装

- [ ] 3.1 ParallelImplServiceのコア状態管理実装
  - ParallelImplState型の状態を管理するZustand storeを作成する
  - status、specId、featureName、currentGroupIndex、activeAgentIds、completedTasks、failedTasksを管理する
  - 状態遷移（idle→parsing→running→completed/error/cancelled）を実装する
  - _Requirements: 4.1, 5.1_

- [ ] 3.2 グループ内タスク並列起動ロジック実装
  - グループ内のタスクを並列で既存`executeTaskImpl` IPC経由でAgent起動する
  - MAX_CONCURRENT_SPECS=5の上限を適用する
  - 上限超過時のキューイング処理を実装する
  - taskIdとagentIdのマッピングを管理する
  - workflowStore.commandPrefixを使用してコマンドセットを選択する
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 3.3 Agent完了検知とグループ進行制御の実装
  - 既存`onAgentStatusChange`イベント経由でAgent完了を検知する
  - グループ内全タスク完了時に次グループへ自動進行する
  - 1回のボタン押下で全グループ完了まで継続する
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 3.4 エラーハンドリングの実装
  - Agent失敗ステータス検知時に失敗タスクIDを記録する
  - 失敗検知時に次グループへの進行を停止する
  - 実行中の他タスクは完了まで継続させる
  - ユーザーへエラー情報を通知する
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 3.5 キャンセル処理の実装
  - cancelParallelImpl()メソッドを実装する
  - 新規タスク起動を停止する
  - 既存`stopAgent` IPC経由で実行中Claudeセッションを終了する
  - 状態をcancelledに更新する
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 3.6 ParallelImplServiceの単体テスト作成
  - 状態遷移テスト
  - グループ進行ロジックテスト
  - エラーハンドリングテスト
  - キャンセル処理テスト
  - _Requirements: 4.1, 5.1, 6.1, 9.1_

## Task 4: preload API追加

- [ ] 4. preloadスクリプトにRenderer API追加
  - parseTasksForParallel APIを追加する（新規）
  - ElectronAPI型定義を更新する
  - 既存のexecuteTaskImpl、stopAgent、onAgentStatusChangeを活用（変更なし）
  - _Requirements: 2.1_

## Task 5: UIコンポーネント実装

- [ ] 5.1 (P) ParallelModeToggleコンポーネント実装
  - 「並列」スライド式トグルスイッチUIを実装する
  - OFF状態（デフォルト）: 逐次実装モード
  - ON状態: 並列実装モード
  - 無効状態（グレーアウト）: tasksフェーズ未承認時
  - 「実装開始」ボタンの右側に配置可能な小型デザインとする
  - 既存ImplPhasePanelのUIデザインと一貫したスタイルを適用する
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 5.2 ImplPhasePanelへの並列モードトグル統合
  - ImplPhasePanel内の「実装開始」ボタン横にParallelModeToggleを配置する
  - トグルON状態で実装開始ボタンクリック時に並列実装モードを起動する
  - トグルOFF状態で実装開始ボタンクリック時に既存の逐次実装モードを維持する
  - useLaunchingState()による実行中状態表示を維持する
  - _Requirements: 1.1, 1.5, 1.6, 8.1_

- [ ] 5.3 UIコンポーネントの単体テスト作成
  - ParallelModeToggleの有効/無効状態テスト
  - トグル状態切り替えテスト
  - 実装開始ボタンとの連携テスト
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

## Task 6: 統合テストとE2Eテスト

- [ ] 6.1 統合テスト作成
  - IPC経由のtasks.md解析テスト
  - 複数Agent起動とステータス同期テスト
  - エラー発生時のグループ停止テスト
  - _Requirements: 2.1, 4.1, 6.1_

- [ ] 6.2 E2Eテスト作成
  - 並列モードトグルON→実装開始→複数Agent起動確認
  - グループ完了→次グループ自動開始確認
  - キャンセル操作→新規起動停止確認
  - _Requirements: 1.1, 1.5, 4.1, 5.1, 9.1_

## Task 7: 既存機能との互換性確認

- [ ] 7. 既存実装ボタンの動作確認と互換性テスト
  - 並列モードトグルOFF時に既存「実装開始」ボタンが現行動作を維持することを確認する
  - 並列実装完了後にTaskProgressViewが正常表示されることを確認する
  - 既存のexecuteTaskImpl、startAgent、agentRecordServiceインフラストラクチャとの整合性を確認する
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

## Task 8: 進捗表示の動作確認

- [ ] 8. 並列実行時のAgentListPanel表示確認
  - 複数Claudeセッション起動時に全Agentが一覧表示されることを確認する
  - 各Agentの完了ステータスが正しく表示されることを確認する
  - 既存のagentStore経由の表示機能で対応可能なことを検証する
  - 実装開始ボタンの実行中スピナー表示がuseLaunchingState()で正常動作することを確認する
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | 並列トグルの配置 | 5.1, 5.2 | Feature |
| 1.2 | tasksフェーズ承認時の有効表示 | 5.1, 5.3 | Feature |
| 1.3 | tasks未承認時の無効表示 | 5.1, 5.3 | Feature |
| 1.4 | 既存UIとの一貫性 | 5.1, 5.3 | Feature |
| 1.5 | トグルON+実装開始→並列実行 | 5.2, 6.2 | Feature |
| 1.6 | トグルOFF+実装開始→逐次実行 | 5.2, 5.3 | Feature |
| 2.1 | tasks.md解析 | 1.1, 2.1, 2.2, 2.3, 4 | Infrastructure |
| 2.2 | (P)マーク判定 | 1.2, 1.4 | Infrastructure |
| 2.3 | サブタスク単位の(P)判定 | 1.2, 1.4 | Infrastructure |
| 2.4 | 依存関係グループ分類 | 1.3, 2.2 | Infrastructure |
| 2.5 | 連続(P)同一グループ | 1.3, 1.4 | Infrastructure |
| 3.1 | グループ化例 | 1.3, 1.4 | Infrastructure |
| 3.2 | 非(P)単独グループ | 1.3, 1.4 | Infrastructure |
| 3.3 | タスク順序によるグループ順序 | 1.3, 1.4 | Infrastructure |
| 4.1 | 並列Claudeセッション起動 | 3.2, 6.1, 6.2 | Feature |
| 4.2 | MAX_CONCURRENT_SPECS制限 | 3.2 | Infrastructure |
| 4.3 | 上限超過時のキューイング | 3.2 | Infrastructure |
| 4.4 | specManagerService拡張 | 3.2 | Infrastructure |
| 4.5 | startAgent呼び出し | 3.2 | Infrastructure |
| 5.1 | グループ完了→次グループ自動開始 | 3.3, 6.1 | Feature |
| 5.2 | 1回のボタン押下で全グループ完了 | 3.3, 6.2 | Feature |
| 5.3 | 自動進行中の実行中状態表示 | 3.3 | Feature |
| 6.1 | タスク失敗の記録 | 3.4 | Infrastructure |
| 6.2 | 失敗時の進行停止 | 3.4 | Infrastructure |
| 6.3 | 失敗タスク情報表示 | 3.4 | Feature |
| 6.4 | 他タスクは完了まで継続 | 3.4 | Infrastructure |
| 7.1 | AgentListPanel表示 | 8 | Feature |
| 7.2 | 全アクティブAgent一覧 | 8 | Feature |
| 7.3 | 実行中スピナー表示 | 5.2, 8 | Feature |
| 7.4 | 完了ステータス表示 | 8 | Feature |
| 8.1 | トグルOFF時の既存動作維持 | 5.2, 7 | Feature |
| 8.2 | 既存インフラ活用 | 7 | Infrastructure |
| 8.3 | TaskProgressView正常表示 | 7 | Feature |
| 8.4 | 既存startImpl API拡張 | 5.2, 7 | Infrastructure |
| 9.1 | キャンセル操作受付 | 3.5, 6.2 | Feature |
| 9.2 | 新規タスク起動停止 | 3.5 | Infrastructure |
| 9.3 | 実行中セッション終了 | 3.5 | Infrastructure |
