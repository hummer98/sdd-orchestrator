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
  - PARSE_TASKS_FOR_PARALLELチャンネルを定義する
  - EXECUTE_IMPL_TASKチャンネルを定義する
  - CANCEL_PARALLEL_IMPLチャンネルを定義する
  - ON_PARALLEL_IMPL_PROGRESSイベントチャンネルを定義する
  - _Requirements: 4.1_

- [ ] 2.2 tasks.md解析IPCハンドラ実装
  - SpecManagerServiceにparseTasksForParallelメソッドを追加する
  - PARSE_TASKS_FOR_PARALLELハンドラを実装する
  - specPathからtasks.mdを読み込みパーサーを呼び出す
  - ParseResult型でグループ化されたタスク情報を返却する
  - _Requirements: 2.1, 2.4_

- [ ] 2.3 タスク別実装起動IPCハンドラ実装
  - SpecManagerServiceにexecuteImplTaskメソッドを追加する
  - EXECUTE_IMPL_TASKハンドラを実装する
  - 指定されたtaskIdに対してAgent起動処理を実行する
  - workflowStore.commandPrefixを使用して/kiro:spec-implと/spec-manager:implを切り替える
  - AgentRegistryへの登録とagentIdの返却を行う
  - _Requirements: 4.1, 4.4_

- [ ] 2.4 キャンセルIPCハンドラ実装
  - SpecManagerServiceにcancelParallelImplメソッドを追加する
  - CANCEL_PARALLEL_IMPLハンドラを実装する
  - 指定specPathの並列実装をキャンセルするフラグを設定する
  - 実行中タスクの終了処理はParallelImplServiceで管理する
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 2.5 IPCハンドラの単体テスト作成
  - 各IPCハンドラのモックテスト
  - エラーケース（ファイル不在、パースエラー）のテスト
  - _Requirements: 2.1, 4.1, 9.1_

## Task 3: ParallelImplService実装

- [ ] 3.1 ParallelImplServiceのコア状態管理実装
  - ParallelImplState型の状態を管理するZustand storeを作成する
  - status、currentGroupIndex、activeTaskIds、completedTasks、failedTasksを管理する
  - 状態遷移（idle→parsing→running→completed/error/cancelled）を実装する
  - _Requirements: 4.1, 5.1_

- [ ] 3.2 グループ内タスク並列起動ロジック実装
  - グループ内のタスクを並列でIPC経由でAgent起動する
  - MAX_CONCURRENT_SPECS=5の上限を適用する
  - 上限超過時のキューイング処理を実装する
  - taskIdとagentIdのマッピングを管理する
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 3.3 Agent完了検知とグループ進行制御の実装
  - agentStore経由でAgent完了を検知する
  - グループ内全タスク完了時に次グループへ自動進行する
  - 1回のボタン押下で全グループ完了まで継続する
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 3.4 エラーハンドリングの実装
  - タスク失敗時に失敗タスクIDを記録する
  - 失敗検知時に次グループへの進行を停止する
  - 実行中の他タスクは完了まで継続させる
  - ユーザーへエラー情報を通知する
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 3.5 キャンセル処理の実装
  - cancelParallelImpl()メソッドを実装する
  - 新規タスク起動を停止する
  - 実行中Claudeセッションの終了処理を行う
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
  - parseTasksForParallel APIを追加する
  - executeImplTask APIを追加する
  - cancelParallelImpl APIを追加する
  - onParallelImplProgressイベントリスナーを追加する
  - ElectronAPI型定義を更新する
  - _Requirements: 4.1_

## Task 5: UIコンポーネント実装

- [ ] 5.1 (P) ParallelImplButtonコンポーネント実装
  - 「並列実装」ボタンUIを実装する
  - tasksフェーズ承認状態に応じた有効/無効表示を実装する
  - 実行中はスピナー表示に切り替える
  - 実行中はキャンセルボタンとして機能させる
  - 既存「実装」ボタンと一貫したデザインを適用する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.3_

- [ ] 5.2 PhaseExecutionPanelへの並列実装ボタン配置
  - 既存「実装」ボタンの隣にParallelImplButtonを配置する
  - gridレイアウト内での配置を調整する
  - _Requirements: 1.1_

- [ ] 5.3 UIコンポーネントの単体テスト作成
  - ParallelImplButtonの有効/無効状態テスト
  - 実行中表示テスト
  - ボタンクリックイベントテスト
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.3_

## Task 6: 統合テストとE2Eテスト

- [ ] 6.1 統合テスト作成
  - IPC経由のtasks.md解析テスト
  - 複数Agent起動とステータス同期テスト
  - エラー発生時のグループ停止テスト
  - _Requirements: 2.1, 4.1, 6.1_

- [ ] 6.2 E2Eテスト作成
  - 並列実装ボタンクリック→複数Agent起動確認
  - グループ完了→次グループ自動開始確認
  - キャンセルボタン→新規起動停止確認
  - _Requirements: 1.1, 4.1, 5.1, 9.1_

## Task 7: 既存機能との互換性確認

- [ ] 7. 既存実装ボタンの動作確認と互換性テスト
  - 既存「実装」ボタンが現行動作を維持することを確認する
  - 並列実装完了後にTaskProgressViewが正常表示されることを確認する
  - agentProcess、agentRegistryの既存インフラストラクチャとの整合性を確認する
  - _Requirements: 8.1, 8.2, 8.3_

## Task 8: AgentListPanelの動作確認

- [ ] 8. 並列実行時のAgentListPanel表示確認
  - 複数Claudeセッション起動時に全Agentが一覧表示されることを確認する
  - 各Agentの完了ステータスが正しく表示されることを確認する
  - 既存のagentStore経由の表示機能で対応可能なことを検証する
  - _Requirements: 7.1, 7.2, 7.4_
