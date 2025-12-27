# Implementation Plan

## Tasks

- [x] 1. workflowStoreにBug自動実行設定を追加
- [x] 1.1 (P) Bug自動実行許可設定の型定義と状態追加
  - BugAutoExecutionPermissions型（analyze, fix, verify, deploy）を定義
  - BugAutoExecutionStatus型（idle, running, paused, error, completed）を定義
  - BugAutoExecutionState型を定義（isAutoExecuting, currentAutoPhase, autoExecutionStatus等）
  - デフォルト設定（analyze, fix, verify許可、deploy無効）を定義
  - _Requirements: 2.1, 7.4_

- [x] 1.2 (P) 許可設定のアクションとセレクタ実装
  - toggleBugAutoPermission()アクションを追加
  - setBugAutoExecutionPermissions()アクションを追加
  - getBugAutoExecutionPermissions()セレクタを追加
  - _Requirements: 2.2_

- [x] 1.3 許可設定の永続化実装
  - persist middlewareでBug自動実行設定をlocalStorageに保存
  - プロジェクトパスをキーに含めてプロジェクト単位で保存
  - partializeで永続化対象を指定
  - アプリ再起動時に設定を復元
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 2. BugAutoExecutionServiceの実装
- [x] 2.1 サービス基盤の実装
  - シングルトンパターンでBugAutoExecutionServiceを作成
  - IPC経由でAgentステータス変更を監視するリスナー登録
  - タイムアウト管理（デフォルト10分）を実装
  - dispose()メソッドでリソース解放を実装
  - _Requirements: 1.1_

- [x] 2.2 自動実行開始ロジックの実装
  - start()メソッドで現在のBug進捗から開始フェーズを決定
  - getLastCompletedPhase()で最後の完了フェーズを取得
  - getNextPermittedPhase()で次の許可フェーズを取得
  - reportフェーズ完了済みの場合はanalyzeから開始
  - selectedBugが存在しない場合はfalseを返却
  - _Requirements: 1.1, 1.2, 2.3_

- [x] 2.3 フェーズ完了時の自動遷移ロジック実装
  - handleAgentCompleted()でフェーズ完了を処理
  - analyze完了後、fix許可時はfixを開始
  - fix完了後、verify許可時はverifyを開始
  - verify完了後、deploy許可時はdeployを開始
  - 次の許可フェーズがない場合は完了状態に遷移
  - **注記**: deployフェーズは `/kiro:bug-deploy` コマンドが未実装のため、現時点ではスキップ（verifyで完了扱い）
  - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [x] 2.4 停止とエラーハンドリングの実装
  - stop()メソッドで現在実行中のAgentを停止
  - handleAgentFailed()でエラー発生時にerror状態に遷移
  - retryFrom()で失敗フェーズから再実行
  - リトライ回数を管理し、3回連続エラーで停止
  - 最大リトライ超過時に手動介入メッセージを表示
  - _Requirements: 1.4, 4.4, 5.2, 5.4, 5.5_

- [x] 3. BugAutoExecutionStatusDisplayコンポーネントの実装
- [x] 3.1 (P) コンポーネント基盤の実装
  - Props駆動のプレゼンテーショナルコンポーネントとして作成
  - status, currentPhase, lastFailedPhase, retryCount, onRetry, onStopをPropsで受け取る
  - 既存AutoExecutionStatusDisplayと同じデザインパターンを適用
  - idle状態の場合はnullを返却して非表示
  - _Requirements: 3.5, 6.2_

- [x] 3.2 (P) 各状態の表示ロジック実装
  - running状態：現在実行中のフェーズ名とスピナーアイコンを表示
  - paused状態：「Agent待機中」と一時停止アイコンを表示
  - completed状態：「自動実行完了」とチェックアイコンを表示
  - error状態：エラーメッセージと失敗したフェーズ名を表示
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3.3 (P) 再実行・停止ボタンの実装
  - error状態で再実行ボタンを表示
  - リトライ回数を表示
  - 停止ボタンをSpec同様のアイコンとラベルで表示
  - onRetry, onStopハンドラを接続
  - _Requirements: 5.1, 5.3, 6.4_

- [x] 4. BugWorkflowViewの自動実行機能拡張
- [x] 4.1 自動実行ボタンの追加
  - 「自動実行」ラベルと適切なアイコンでボタンを表示
  - Specワークフローの自動実行ボタンと同じスタイルとレイアウトを使用
  - 自動実行中は停止ボタンとして表示
  - クリック時にBugAutoExecutionService.start()を呼び出し
  - _Requirements: 1.1, 1.3, 1.6, 6.1_

- [x] 4.2 ボタンの有効/無効制御
  - selectedBugがnullの場合はボタンを無効化
  - 他のエージェント実行中は自動実行ボタンを無効化
  - isAutoExecuteDisabledフラグを計算して適用
  - _Requirements: 1.5_

- [x] 4.3 BugAutoExecutionStatusDisplayの統合
  - BugWorkflowViewにBugAutoExecutionStatusDisplayを配置
  - BugAutoExecutionServiceの状態をPropsとして渡す
  - 再実行・停止ハンドラを接続
  - _Requirements: 2.5_

- [x] 5. BugPhaseItemの自動実行対応拡張
- [x] 5.1 (P) Props拡張とスタイル対応
  - isAutoExecuting Propを追加
  - isAutoExecutingPhase Propを追加
  - 自動実行中のフェーズをリング表示で強調
  - Specワークフローと同様の視覚的フィードバック
  - _Requirements: 6.3_

- [x] 5.2 (P) 手動実行ボタンの無効化制御
  - 自動実行中は全フェーズの手動実行ボタンを無効化
  - canExecuteフラグにisAutoExecuting条件を追加
  - _Requirements: 6.5_

- [x] 6. 統合テストとE2Eテスト
- [x] 6.1 ユニットテストの実装
  - BugAutoExecutionService.start()の開始フェーズ決定ロジック
  - BugAutoExecutionService.getNextPermittedPhase()の次フェーズ取得
  - BugAutoExecutionService.handleAgentCompleted()のフェーズ遷移
  - workflowStore.toggleBugAutoPermission()の許可設定トグル
  - BugAutoExecutionStatusDisplayの各状態表示切り替え
  - _Requirements: 1.2, 2.2, 4.1, 4.2, 4.3_

- [x] 6.2 統合テストの実装
  - 自動実行開始からanalyze完了、fix開始への連鎖フロー
  - エラー発生からerror状態遷移、再実行、継続のフロー
  - フェーズ許可設定変更から動作反映のフロー
  - _Requirements: 4.4, 5.2, 2.2_

- [x] 6.3 E2Eテストの実装
  - 自動実行ボタンの表示確認
  - 自動実行開始後の停止ボタン表示確認
  - Mock Claude CLIを使用した自動実行フロー全通テスト
  - フェーズ許可設定UIの操作確認
  - _Requirements: 1.1, 1.3, 2.2, 3.1_
