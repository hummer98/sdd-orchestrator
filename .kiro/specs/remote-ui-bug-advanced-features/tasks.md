# Implementation Plan

## Tasks

- [x] 1. WebSocket API・WorkflowController拡張（バックエンド）
- [x] 1.1 (P) Bug自動実行のWebSocketメッセージハンドラ実装
  - START_BUG_AUTO_EXECUTIONメッセージの処理ロジック実装
  - STOP_BUG_AUTO_EXECUTIONメッセージの処理ロジック実装
  - BugAutoPermissions（analyze/fix/verify）の検証とWorkflowControllerへの委譲
  - エラーハンドリング（INVALID_PAYLOAD, NOT_SUPPORTED）
  - _Requirements: 4.1, 4.2_

- [x] 1.2 (P) WorkflowControllerインターフェース拡張
  - startBugAutoExecutionメソッドをインターフェースに追加
  - stopBugAutoExecutionメソッドをインターフェースに追加
  - BugAutoPermissions型定義の追加
  - 既存BugAutoExecutionServiceとの連携実装
  - _Requirements: 4.3_

- [x] 2. WebSocketApiClient拡張（共有API層）
- [x] 2.1 createBugメソッド実装
  - CREATE_BUGメッセージ送信ロジック
  - BUG_CREATED/BUG_CREATE_ERRORレスポンスのハンドリング
  - Result型でのエラー返却
  - _Requirements: 5.1_
  - _Method: wrapRequest_

- [x] 2.2 Bug自動実行メソッド実装
  - startBugAutoExecution（パーミッション付きリクエスト送信）
  - stopBugAutoExecution（停止リクエスト送信）
  - 各種イベント（STARTED, STATUS, COMPLETED, ERROR, STOPPED）のイベントエミット登録
  - _Requirements: 5.2_
  - _Method: wrapRequest, on, emit_

- [x] 3. 共有ストア拡張
- [x] 3.1 (P) remoteBugStore拡張
  - createBugアクションの実装（ApiClient経由）
  - useWorktree状態の追加
  - setUseWorktreeアクションの追加
  - _Requirements: 5.3_

- [x] 3.2 (P) bugAutoExecutionStore WebSocketイベントリスナー設定
  - initBugAutoExecutionWebSocketListeners関数の実装
  - BUG_AUTO_EXECUTION_STATUSイベントでupdateFromMainProcess呼び出し
  - BUG_AUTO_EXECUTION_COMPLETEDイベントでsetCompletedState呼び出し
  - BUG_AUTO_EXECUTION_ERRORイベントでsetErrorState呼び出し
  - 購読解除のクリーンアップ関数返却
  - _Requirements: 5.4, 2.4_
  - _Method: on, updateFromMainProcess, setCompletedState, setErrorState_

- [x] 4. Bug作成UIコンポーネント（Remote UI）
- [x] 4.1 CreateBugButtonRemote実装
  - Desktop版: タブヘッダー右側ボタン
  - Smartphone版: 右下フローティングアクションボタン（FAB）
  - useDeviceTypeフックでのレイアウト切替
  - Lucide ReactのPlusアイコン使用
  - _Requirements: 1.1_

- [x] 4.2 CreateBugDialogRemote実装
  - バグ説明テキストエリア（必須フィールド）
  - Worktreeチェックボックス（remoteBugStore.useWorktreeと同期）
  - Desktop版: 標準モーダルダイアログ
  - Smartphone版: フルスクリーンモーダル
  - ローディング状態表示
  - エラー時のダイアログ内メッセージ表示
  - _Requirements: 1.2, 1.3, 1.4, 3.1_

- [x] 4.3 BugsTabへのBug作成ボタン統合
  - CreateBugButtonRemoteのBugsタブヘッダーへの配置
  - ダイアログ表示状態管理
  - Bug一覧更新（BUGS_UPDATEDイベント購読）
  - _Requirements: 1.1, 1.4_

- [x] 5. Bug自動実行UIコンポーネント（Remote UI）
- [x] 5.1 BugAutoExecutionPermissionsRemote実装
  - analyze/fix/verifyの3つのトグルスイッチ表示
  - デフォルトで全てON
  - トグル状態の親コンポーネントへの通知
  - _Requirements: 2.2_

- [x] 5.2 BugWorkflowViewRemoteのAuto Execute機能追加
  - Auto Executeボタンの配置（Desktop: ヘッダー、SP: 固定ヘッダー）
  - 自動実行開始処理（startBugAutoExecution呼び出し）
  - 実行中フェーズのハイライト表示（currentAutoPhase）
  - Stopボタンへの切替と停止処理
  - 完了/エラー通知表示
  - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6_
  - _Method: startBugAutoExecution, stopBugAutoExecution_

- [x] 6. Worktree対応UI（Remote UI）
- [x] 6.1 Bug詳細ビューへのWorktreeチェックボックス追加
  - Desktop版: ワークフローヘッダー下に配置
  - Smartphone版: フェーズリスト上部に配置
  - bug.json.worktreeフィールドと同期
  - _Requirements: 3.2_

- [x] 6.2 BugListItemRemoteへのWorktreeバッジ表示
  - Worktreeモード実行中のBugにGitBranchアイコンバッジ表示
  - 既存shared/components/bug/BugListItemのworktree対応確認・活用
  - _Requirements: 3.3_

- [x] 6.3 フェーズ実行時のWorktree設定反映
  - executeBugPhaseリクエストへのuseWorktreeフラグ追加
  - WebSocketApiClient経由でのフラグ送信
  - _Requirements: 3.4_

- [x] 7. 統合・テスト
- [x] 7.1 Remote UI初期化時のWebSocketイベントリスナー登録統合
  - App.tsxまたはWebSocketProvider内でinitBugAutoExecutionWebSocketListeners呼び出し
  - クリーンアップ処理の実装
  - _Requirements: 2.4, 5.4_

- [x] 7.2 ユニットテスト実装
  - WebSocketHandler.handleStartBugAutoExecution/handleStopBugAutoExecutionテスト
  - WebSocketApiClient.createBug/startBugAutoExecution/stopBugAutoExecutionテスト
  - remoteBugStore.createBugテスト
  - _Requirements: 4.1, 4.2, 5.1, 5.2, 5.3_

- [x] 7.3 結合テスト実装
  - Bug作成フロー（ダイアログ入力→WebSocket送信→レスポンス→UI更新）
  - Bug自動実行フロー（開始→状態更新→イベント受信→UI反映）
  - Worktree設定フロー（チェック状態→フェーズ実行リクエスト反映）
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | Bugsタブに「新規バグ」ボタン表示 | 4.1, 4.3 | Feature |
| 1.2 | Bug作成ダイアログ表示 | 4.2 | Feature |
| 1.3 | WebSocket経由でBug作成 | 4.2 | Feature |
| 1.4 | 作成完了後UI更新 | 4.2, 4.3 | Feature |
| 2.1 | Bug詳細にAuto Executeボタン | 5.2 | Feature |
| 2.2 | フェーズパーミッショントグル | 5.1, 5.2 | Feature |
| 2.3 | WebSocket経由で自動実行開始 | 5.2 | Feature |
| 2.4 | 自動実行状態リアルタイム表示 | 3.2, 5.2, 7.1 | Feature |
| 2.5 | 自動実行停止 | 5.2 | Feature |
| 2.6 | 完了/エラー通知 | 5.2 | Feature |
| 3.1 | Bug作成ダイアログにWorktreeチェック | 4.2 | Feature |
| 3.2 | Bug詳細にWorktreeチェック | 6.1 | Feature |
| 3.3 | Worktreeバッジ表示 | 6.2 | Feature |
| 3.4 | Worktree設定をフェーズ実行に反映 | 6.3 | Feature |
| 4.1 | START_BUG_AUTO_EXECUTION handler | 1.1 | Infrastructure |
| 4.2 | STOP_BUG_AUTO_EXECUTION handler | 1.1 | Infrastructure |
| 4.3 | WorkflowController拡張 | 1.2 | Infrastructure |
| 5.1 | WebSocketApiClient.createBug | 2.1 | Infrastructure |
| 5.2 | WebSocketApiClient Bug自動実行 | 2.2 | Infrastructure |
| 5.3 | remoteBugStore.createBug, useWorktree | 3.1 | Infrastructure |
| 5.4 | bugAutoExecutionStore WebSocket対応 | 3.2 | Infrastructure |
