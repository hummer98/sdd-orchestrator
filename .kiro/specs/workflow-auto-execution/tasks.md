## Tasks

- [x] 1. workflowStoreの自動実行状態管理拡張
- [x] 1.1 自動実行状態の型定義と初期状態を追加
  - `autoExecutionStatus`（idle/running/paused/completing/error/completed）を定義
  - `lastFailedPhase`、`failedRetryCount`、`executionSummary`のフィールドを追加
  - 初期状態でisAutoExecutingをfalseに設定
  - _Requirements: 7.4_

- [x] 1.2 状態更新アクションを実装
  - `setAutoExecutionStatus`、`setLastFailedPhase`アクションを追加
  - `incrementFailedRetryCount`、`resetFailedRetryCount`アクションを追加
  - `setExecutionSummary`アクションを追加
  - _Requirements: 7.1, 7.3_

- [x] 1.3 永続化設定でランタイム状態を除外
  - persist middlewareの`partialize`でisAutoExecuting、autoExecutionStatus等を除外
  - autoExecutionPermissions、validationOptionsは永続化を維持
  - アプリ起動時に自動実行状態がリセットされることを確認
  - _Requirements: 7.2, 7.4_

- [x] 2. NotificationServiceの作成
- [x] 2.1 (P) 通知サービスの基盤実装
  - 成功、エラー、情報通知を表示する機能を作成
  - 通知の自動消去タイミング管理を実装
  - 通知スタック管理（最大5件）を実装
  - _Requirements: 5.2, 5.3_

- [x] 2.2 (P) 完了サマリー通知機能を追加
  - 実行フェーズ一覧、バリデーション結果、所要時間を表示
  - エラー一覧があれば併せて表示
  - _Requirements: 5.4_

- [x] 3. AutoExecutionServiceの基盤実装
- [x] 3.1 サービスクラスの基本構造を作成
  - workflowStore、agentStore、specStoreとの連携を設定
  - electronAPI経由でのフェーズ実行呼び出しを準備
  - dispose時のクリーンアップ処理を実装
  - _Requirements: 2.1, 3.4_

- [x] 3.2 フェーズ順序定義と次フェーズ取得ロジックを実装
  - requirements -> design -> tasks -> impl -> inspection -> deploy の順序を定義
  - autoExecutionPermissionsに基づいて許可フェーズをフィルタリング
  - 現在フェーズから次の許可フェーズを特定する機能を実装
  - _Requirements: 2.1, 2.2_

- [x] 3.3 前提条件検証ロジックを実装
  - 前フェーズのapproved状態を検証する機能を追加
  - specDetailとspecJsonの利用可能性を確認
  - 検証結果を構造化して返却
  - _Requirements: 3.1, 3.4_

- [x] 4. 自動実行の開始・停止制御
- [x] 4.1 自動実行開始処理を実装
  - 開始時にworkflowStoreの状態をrunningに更新
  - 最初の許可フェーズを特定して実行を開始
  - 開始失敗時のエラーハンドリングを追加
  - _Requirements: 1.1, 2.1_

- [x] 4.2 自動実行停止処理を実装
  - 停止リクエストを受け付けて状態を更新
  - 実行中のAgentがあれば完了を待機してから停止
  - 即座中断ではなくグレースフル停止を実現
  - _Requirements: 1.2_

- [x] 4.3 再実行（リトライ）機能を実装
  - lastFailedPhaseから自動実行を再開
  - リトライ回数をインクリメントして追跡
  - _Requirements: 8.3_

- [x] 5. Agent完了検知と次フェーズ遷移
- [x] 5.1 agentStoreの状態変化を監視する仕組みを構築
  - subscribeを使ってAgent状態変化を検知
  - 対象specのAgentのみを監視対象とする
  - _Requirements: 6.1, 6.3_

- [x] 5.2 Agent完了時の次フェーズ遷移処理を実装
  - completed状態検知で次の許可フェーズへ遷移
  - failed状態検知でエラー処理を実行
  - currentAutoPhaseを更新して進捗を反映
  - _Requirements: 2.3, 6.2_

- [x] 5.3 タイムアウト処理を実装
  - 設定時間（デフォルト10分）を超過した場合にタイムアウトエラー
  - タイムアウト時は自動実行を停止し、ユーザーに通知
  - _Requirements: 6.4_

- [x] 5.4 同一specでのAgent実行中待機を実装
  - 他のAgentが実行中の場合は完了を待機
  - 待機中は状態をpausedに設定
  - _Requirements: 3.3_

- [x] 6. 自動承認機能
- [x] 6.1 フェーズ間遷移時の自動承認処理を実装
  - 前フェーズがgenerated状態の場合に自動承認を実行
  - spec.jsonのapprovalsを更新
  - 自動承認できない場合は停止して手動介入を要求
  - _Requirements: 2.5, 3.2_

- [x] 7. バリデーション連携
- [x] 7.1 (P) バリデーション実行判定ロジックを実装
  - validationOptionsの設定を確認
  - 各フェーズ完了後に対応バリデーションを挿入
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 7.2 (P) バリデーション失敗時の処理を実装
  - バリデーション失敗で自動実行を停止
  - バリデーション結果をユーザーに表示
  - _Requirements: 4.4_

- [x] 8. 正常完了処理
- [x] 8.1 自動実行完了処理を実装
  - 全許可フェーズ完了時に状態をcompletedに更新
  - 自動実行ボタンを「自動実行」状態に戻す
  - _Requirements: 1.4_

- [x] 8.2 実行サマリー生成を実装
  - 実行したフェーズ一覧、バリデーション結果、所要時間を集計
  - エラー情報があれば含める
  - NotificationServiceで完了通知を表示
  - _Requirements: 5.4_

- [x] 9. エラーハンドリングとリカバリー
- [x] 9.1 エラーキャプチャと状態更新を実装
  - Agent実行エラー、バリデーションエラーをキャッチ
  - autoExecutionStatusをerrorに更新
  - lastFailedPhaseを記録
  - _Requirements: 8.1, 2.4_

- [x] 9.2 エラーログ記録機能を実装
  - エラー詳細をconsole.errorで出力
  - 実行履歴にエラー情報を追加
  - _Requirements: 8.4_

- [x] 9.3 連続失敗時のリトライ制限を実装
  - 同一フェーズでの連続失敗をカウント
  - 3回連続失敗で自動リトライを停止
  - 手動介入を促すメッセージを表示
  - _Requirements: 8.5_

- [x] 10. WorkflowViewの自動実行UI拡張
- [x] 10.1 自動実行ボタンのイベントハンドリングを実装
  - 「自動実行」ボタンクリックでAutoExecutionService.start()を呼び出し
  - 「停止」ボタンクリックでAutoExecutionService.stop()を呼び出し
  - ボタン状態をisAutoExecutingに連動
  - _Requirements: 1.1, 1.2_

- [x] 10.2 実行中フェーズのハイライト表示を実装
  - currentAutoPhaseに対応するフェーズをハイライト
  - CSSクラスまたはスタイルで視覚的に強調
  - _Requirements: 1.3_

- [x] 10.3 ローディングインジケーターを追加
  - 実行中フェーズにスピナーを表示
  - フェーズ間の待機状態も視覚化
  - _Requirements: 5.5_

- [x] 10.4 再実行ボタンを表示
  - エラー停止時に「再実行」ボタンを表示
  - クリックでAutoExecutionService.retryFrom()を呼び出し
  - _Requirements: 8.2_

- [x] 11. AutoExecutionStatusDisplayコンポーネント作成
- [x] 11.1 進捗・状態表示UIを実装
  - 現在のフェーズ名と全体進捗を表示
  - 自動実行状態（running/paused/error/completed）を視覚化
  - 失敗フェーズとリトライ回数を表示
  - _Requirements: 5.1_

- [x] 11.2 WorkflowViewへの組み込みと連携
  - workflowStoreの状態をsubscribe
  - 停止・再実行ボタンのハンドラを接続
  - 自動実行中のみ表示
  - _Requirements: 5.1, 5.5_

- [x] 12. 統合テストとE2Eテスト
- [x] 12.1 (P) AutoExecutionServiceの単体テストを作成
  - getNextPermittedPhaseのテスト
  - validatePreconditionsのテスト
  - start/stop/retryFromのテスト
  - _Requirements: 2.1, 2.2, 3.1, 3.4_

- [x] 12.2 (P) workflowStore拡張の単体テストを作成
  - 状態更新アクションのテスト
  - 永続化除外設定のテスト
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 12.3 フェーズ遷移の統合テストを作成
  - 自動実行開始から完了までの一連フロー
  - Agent完了検知から次フェーズ遷移
  - エラー発生時の停止と再実行
  - バリデーション有効時の挿入実行
  - _Requirements: 1.1, 1.2, 1.4, 2.3, 2.4, 4.1, 4.2, 4.3, 4.4, 6.3, 8.1, 8.3_

- [x] 12.4 E2Eテストを作成
  - 自動実行ボタンから複数フェーズ実行、完了通知表示
  - フェーズ失敗、エラー表示、再実行、成功完了
  - 中断、再開、完了
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 5.2, 5.3, 5.4, 5.5, 8.2, 8.3_
