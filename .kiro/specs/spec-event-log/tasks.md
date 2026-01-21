# Implementation Plan

## Task 1. イベントログのデータ構造と型定義
- [x] 1.1 (P) イベントログのTypeScript型定義を作成
  - EventType、EventLogEntryBase、各イベント種別の追加フィールド型を定義
  - Discriminated Unionパターンでイベント種別ごとの型安全性を確保
  - EventLogInput型（timestamp自動付与用）を定義
  - _Requirements: 4.1, 4.2, 4.3_

## Task 2. EventLogServiceの実装
- [x] 2.1 イベントログサービスの基盤を実装
  - Main ProcessにEventLogServiceを作成
  - logEvent関数でイベントをJSON Lines形式で追記
  - readEvents関数でイベントログファイルを読み取り、新しい順でソート
  - ファイルが存在しない場合の自動作成処理
  - ファイル書き込みエラー時は内部でログ出力のみ（呼び出し元に影響させない）
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 6.1, 6.2, 6.4_

## Task 3. イベント記録の統合
- [x] 3.1 (P) Agent関連イベントの記録を実装
  - agentProcessのコールバックにEventLogService呼び出しを追加
  - Agent開始時（agent:start）、正常終了時（agent:complete）、失敗時（agent:fail）を記録
  - agentId、phase、command、exitCode、errorMessage等の詳細情報を含める
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 3.2 (P) 自動実行関連イベントの記録を実装
  - autoExecutionCoordinatorにEventLogService呼び出しを追加
  - 自動実行開始時（auto-execution:start）、終了時（complete/fail/stop）を記録
  - status、startPhase、endPhase、errorMessage等の詳細情報を含める
  - _Requirements: 1.4, 1.5_

- [x] 3.3 (P) Worktree関連イベントの記録を実装
  - worktreeServiceにEventLogService呼び出しを追加
  - Worktree作成時（worktree:create）、マージ時（worktree:merge）、削除時（worktree:delete）を記録
  - worktreePath、branch等の詳細情報を含める
  - _Requirements: 1.6, 1.7_

- [x] 3.4 (P) レビュー・Inspection関連イベントの記録を実装
  - documentReviewServiceにレビュー開始/完了イベントを追加
  - specManagerServiceにInspection開始/完了イベントを追加
  - roundNumber、result等の詳細情報を含める
  - _Requirements: 1.8, 1.9_

- [x] 3.5 (P) 承認・Phase遷移イベントの記録を実装
  - 承認操作（approval:update）のイベント記録を追加
  - Phase遷移（phase:transition）のイベント記録を追加
  - 既存のupdateApproval、updateSpecJsonFromPhase処理に統合
  - _Requirements: 1.10, 1.11_

## Task 4. IPC/WebSocket APIの実装
- [x] 4.1 IPC APIの実装
  - channels.tsにEVENT_LOG_GETチャンネルを追加
  - handlers.tsにイベントログ取得ハンドラを実装
  - preloadにAPI公開を追加
  - _Requirements: 5.4_

- [x] 4.2 WebSocket APIの実装
  - webSocketHandler.tsにevent-log:getメッセージハンドラを追加
  - EventLogService.readEventsを呼び出してレスポンス返却
  - _Requirements: 5.3_

## Task 5. イベントログビューアUIの実装
- [x] 5.1 (P) EventLogButtonコンポーネントを実装
  - 履歴アイコンボタン（Lucide ReactのHistory使用）を作成
  - クリック時にモーダル開閉状態を制御
  - 常時表示（イベント有無に関わらず）
  - _Requirements: 3.1, 3.2_

- [x] 5.2 EventLogListItemコンポーネントを実装
  - イベント種別ごとのアイコン・色分けを実装
  - タイムスタンプのローカル時間表示
  - メッセージと詳細情報の表示
  - _Requirements: 3.5, 3.6_

- [x] 5.3 EventLogViewerModalコンポーネントを実装
  - モーダルダイアログのオープン/クローズ制御
  - ApiClient経由でイベントログを取得
  - 時系列で表示（新しいイベントが上）
  - 空状態時の「イベントなし」メッセージ表示
  - ローディング/エラー状態の表示
  - _Requirements: 3.3, 3.4, 3.7, 5.1, 5.2_

## Task 6. UIの統合
- [x] 6.1 SpecWorkflowFooterにイベントログボタンを統合
  - 自動実行ボタンの横にEventLogButtonを配置
  - モーダル状態管理とEventLogViewerModalの組み込み
  - _Requirements: 3.1, 3.2, 3.3_

## Task 7. テストの実装
- [x] 7.1 (P) EventLogServiceの単体テストを実装
  - logEvent関数のファイル追記テスト
  - readEvents関数のJSON Lines解析テスト
  - ファイル不存在時の自動作成テスト
  - エラー時の非影響テスト
  - _Requirements: 6.1, 6.2, 6.4_

- [x] 7.2 (P) UIコンポーネントの単体テストを実装
  - EventLogListItemのイベント種別ごとの表示テスト
  - EventLogViewerModalの状態表示テスト
  - _Requirements: 3.5, 3.6, 3.7_

- [x] 7.3 E2Eテストを実装
  - イベントログボタンの表示確認
  - モーダルの開閉操作
  - Agent実行後のイベント表示確認
  - _Requirements: 3.1, 3.2, 3.3_

---

## Inspection Fixes

### Round 1 (2026-01-21)

- [x] 8.1 WorkflowViewにイベントログ機能を統合
  - 関連: Task 6.1, Requirement 3.1, 3.3
  - WorkflowView.tsx にイベントログモーダルの状態管理を追加
  - onShowEventLog ハンドラを実装してSpecWorkflowFooterに渡す
  - EventLogViewerModal コンポーネントをWorkflowView内に組み込む
  - ApiClient経由でイベントログを取得する処理を実装
  - _Requirements: 3.1, 3.3, 5.1, 5.2_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | Agent開始時のイベント記録 | 3.1 | Feature |
| 1.2 | Agent正常終了時のイベント記録 | 3.1 | Feature |
| 1.3 | Agent失敗時のイベント記録 | 3.1 | Feature |
| 1.4 | 自動実行開始時のイベント記録 | 3.2 | Feature |
| 1.5 | 自動実行終了時のイベント記録 | 3.2 | Feature |
| 1.6 | Worktree作成時のイベント記録 | 3.3 | Feature |
| 1.7 | Worktree削除/マージ時のイベント記録 | 3.3 | Feature |
| 1.8 | ドキュメントレビュー開始/完了記録 | 3.4 | Feature |
| 1.9 | Inspection開始/完了記録 | 3.4 | Feature |
| 1.10 | 承認操作の記録 | 3.5 | Feature |
| 1.11 | Phase遷移の記録 | 3.5 | Feature |
| 2.1 | events.jsonlへの保存 | 2.1 | Feature |
| 2.2 | JSON Lines形式 | 2.1 | Feature |
| 2.3 | UTCタイムスタンプ | 2.1 | Feature |
| 2.4 | イベント種別 | 2.1 | Feature |
| 2.5 | 詳細情報 | 2.1 | Feature |
| 2.6 | ファイル自動作成 | 2.1 | Feature |
| 3.1 | フッターボタン配置 | 5.1, 6.1 | Feature |
| 3.2 | 常時ボタン表示 | 5.1, 6.1 | Feature |
| 3.3 | モーダル表示 | 5.3, 6.1 | Feature |
| 3.4 | 時系列表示（新しい順） | 5.3 | Feature |
| 3.5 | タイムスタンプ/種別/詳細表示 | 5.2 | Feature |
| 3.6 | 視覚的区別 | 5.2 | Feature |
| 3.7 | 空状態メッセージ | 5.3 | Feature |
| 4.1 | 基本フィールド定義 | 1.1 | Infrastructure |
| 4.2 | イベント種別追加フィールド | 1.1 | Infrastructure |
| 4.3 | イベント種別定義 | 1.1 | Infrastructure |
| 5.1 | Sharedコンポーネント実装 | 5.3 | Feature |
| 5.2 | Electron/RemoteUI共通UI | 5.3 | Feature |
| 5.3 | WebSocket API対応 | 4.2 | Feature |
| 5.4 | IPC API対応 | 4.1 | Feature |
| 6.1 | Main Process実装 | 2.1, 7.1 | Feature |
| 6.2 | 一元管理 | 2.1, 7.1 | Feature |
| 6.3 | 既存サービスからの呼び出し | 3.1, 3.2, 3.3, 3.4, 3.5 | Feature |
| 6.4 | エラー時の非影響 | 2.1, 7.1 | Feature |
