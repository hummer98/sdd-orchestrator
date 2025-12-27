# Implementation Plan

## Task Format Template

> **Parallel marker**: `(P)` indicates tasks that can be executed concurrently.

---

- [ ] 1. WebSocketハンドラ拡張（メッセージルーティング追加）
- [ ] 1.1 (P) フェーズ承認メッセージハンドラの実装
  - APPROVE_PHASEメッセージタイプの処理を追加
  - specId と phase（requirements/design/tasks）を受け取り、spec.jsonのapprovals.{phase}.approvedをtrueに更新
  - 処理成功時はSUCCESS応答、失敗時はERROR応答をクライアントに返却
  - フェーズが未生成（generated: false）の場合はPRECONDITION_FAILEDエラーを返却
  - _Requirements: 7.1, 7.6, 7.7_

- [ ] 1.2 (P) Document Review開始メッセージハンドラの実装
  - DOCUMENT_REVIEW_STARTメッセージタイプの処理を追加
  - specIdを受け取り、/kiro:document-reviewコマンドを実行
  - 実行開始時にDOCUMENT_REVIEW_STARTED応答を返却
  - 完了時にブロードキャストで全クライアントに通知
  - _Requirements: 7.2, 7.6, 7.7_

- [ ] 1.3 (P) Document Review Reply/Fixメッセージハンドラの実装
  - DOCUMENT_REVIEW_REPLYメッセージタイプの処理を追加
  - specId、roundNumber、autofix（オプション）を受け取る
  - autofixがtrueの場合は--autofixオプション付きでコマンド実行（Reply/Fixは同一メッセージタイプ、autofixフラグで区別）
  - 処理完了後にブロードキャストで状態更新を通知
  - _Requirements: 7.3, 7.5, 7.6_

- [ ] 1.4 (P) autoExecutionFlag更新メッセージハンドラの実装
  - UPDATE_AUTO_EXECUTION_FLAGメッセージタイプの処理を追加
  - specIdとflag（skip/run/pause）を受け取り、spec.jsonのautoExecution.documentReviewFlagを更新
  - 処理完了後にブロードキャストで全クライアントに通知
  - _Requirements: 7.4, 7.5, 7.6_

- [ ] 2. ブロードキャストイベント実装
- [ ] 2.1 (P) フェーズ承認ブロードキャストの実装
  - broadcastPhaseApprovedメソッドを追加
  - specIdとphase名を含むPHASE_APPROVEDイベントを全接続クライアントに送信
  - _Requirements: 8.1_

- [ ] 2.2 (P) Document Review更新ブロードキャストの実装
  - broadcastReviewUpdatedメソッドを追加
  - specIdとreviewState（ラウンド数、ステータス、詳細）を含むREVIEW_UPDATEDイベントを送信
  - _Requirements: 8.2_

- [ ] 2.3 (P) autoExecutionFlag更新ブロードキャストの実装
  - broadcastFlagUpdatedメソッドを追加
  - specIdとflag値を含むFLAG_UPDATEDイベントを送信
  - _Requirements: 8.3_

- [ ] 3. Remote UI WebSocketManager拡張
- [ ] 3.1 (P) フェーズ承認送信メソッドの追加
  - approvePhase(specId, phase)メソッドを追加
  - APPROVE_PHASEタイプのメッセージを送信
  - _Requirements: 1.2_

- [ ] 3.2 (P) Document Review操作送信メソッドの追加
  - executeDocumentReviewReply(specId, roundNumber, autofix)メソッドを追加
  - DOCUMENT_REVIEW_REPLYタイプのメッセージを送信
  - autofixパラメータで通常ReplyとFix（--autofix）を切り替え
  - _Requirements: 5.2, 5.3_

- [ ] 3.3 (P) autoExecutionFlag更新送信メソッドの追加
  - updateAutoExecutionFlag(specId, flag)メソッドを追加
  - UPDATE_AUTO_EXECUTION_FLAGタイプのメッセージを送信
  - _Requirements: 6.3_

- [ ] 3.4 ブロードキャストイベント受信処理の追加
  - PHASE_APPROVED、REVIEW_UPDATED、FLAG_UPDATEDイベントのハンドラを登録
  - 受信時に対応するUIコンポーネントの更新をトリガー
  - 依存: 2.1, 2.2, 2.3のブロードキャスト実装
  - _Requirements: 8.4_

- [ ] 4. ApprovalButtonコンポーネント実装
  - generatedステータスのフェーズに対して承認ボタンを表示
  - 未生成フェーズ（generated: false）ではボタンをdisabled状態にする
  - ボタンクリック時にWebSocketManager.approvePhaseを呼び出し
  - 承認処理中はローディングスピナーを表示し、ボタンを非活性化
  - 承認完了後は親コンポーネントに通知してUI更新をトリガー
  - 依存: 3.1のapprovePhaseメソッド
  - _Requirements: 1.1, 1.4, 1.5, 1.6_

- [ ] 5. SpecDetailコンポーネント拡張（次フェーズブロック機能）
- [ ] 5.1 getNextPhase関数の承認チェック追加
  - 現フェーズがgenerated状態だが未承認（approved: false）の場合、nullを返却
  - これにより次フェーズへの自動遷移をブロック
  - _Requirements: 2.2_

- [ ] 5.2 次フェーズボタンの非活性制御
  - 前フェーズが未承認の場合、次フェーズ実行ボタンをdisabled
  - ホバー時に「前フェーズの承認が必要です」ツールチップを表示
  - 依存: 5.1のgetNextPhase修正
  - _Requirements: 2.1, 2.3_

- [ ] 5.3 自動実行モードでの承認待ち表示
  - 自動実行がONかつ現フェーズが未承認の場合、「承認待ち」状態を表示
  - 自動実行を一時停止していることを視覚的に示す
  - 依存: 5.1のgetNextPhase修正
  - _Requirements: 2.4_

- [ ] 6. DocumentReviewStatusコンポーネント実装
- [ ] 6.1 レビュー状態表示の実装
  - 現在のラウンド番号と総ラウンド数を表示
  - ステータスバッジ（レビュー中、回答待ち、完了）を状態に応じて表示
  - in_progress状態では「レビュー中」、review_complete状態では「回答待ち」を強調、reply_complete状態では「完了」を表示
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 6.2 Start Reviewボタンの実装
  - Document Reviewセクションに「Start Review」ボタンを配置
  - ボタンクリック時にWebSocket経由でdocumentReviewStartリクエストを送信
  - レビュー対象ドキュメント（tasks.md等）が存在しない場合はボタンを非活性にし、理由を表示
  - 実行中はローディングインジケータを表示し、ボタンを非活性化
  - 依存: 1.2のハンドラ実装
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 6.3 Reply/Fixボタンの実装
  - review_complete状態の時に「Reply」と「Fix」ボタンを表示
  - 「Reply」クリック時はdocument-review-replyリクエストを送信
  - 「Fix」クリック時はdocument-review-reply --autofixリクエストを送信
  - 処理中は両ボタンを非活性にし、ローディング表示
  - 処理完了後にレビュー状態表示を更新
  - 依存: 3.2のsendメソッド実装
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 7. AutoExecutionFlagSelectorコンポーネント実装
  - skip/run/pauseの3つのオプションをドロップダウンまたはボタングループで提供
  - 現在の選択状態を視覚的にハイライト
  - 選択変更時にWebSocket経由でupdateAutoExecutionFlagリクエストを送信
  - 各オプションの説明ラベルを表示（skip: スキップ、run: 自動実行、pause: 一時停止）
  - 更新中はセレクタを一時的にdisabled
  - 依存: 3.3のupdateAutoExecutionFlagメソッド
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [ ] 8. 接続切断状態の表示と自動再接続
  - WebSocket接続が切断された場合、ReconnectOverlayを表示
  - 自動再接続を試行し、再接続中であることをユーザーに通知
  - 再接続成功後はOverlayを非表示にし、最新状態を取得
  - _Requirements: 8.5_

- [ ] 9. 統合テスト
- [ ] 9.1 (P) WebSocketハンドラのユニットテスト
  - handleApprovePhase、handleDocumentReviewStart、handleDocumentReviewReply、handleUpdateAutoExecutionFlagの各メソッドをモックテスト
  - 成功ケース、エラーケース（未生成フェーズ承認試行等）を網羅
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [ ] 9.2 (P) Remote UIコンポーネントの状態管理テスト
  - ApprovalButtonの状態遷移（idle→approving→approved）をテスト
  - DocumentReviewStatusのステータスバッジ表示切替をテスト
  - AutoExecutionFlagSelectorの選択状態反映をテスト
  - _Requirements: 1.1, 1.5, 3.1, 3.3, 6.1_

- [ ] 9.3 WebSocket統合テスト
  - フェーズ承認フロー（送信→処理→ブロードキャスト→UI更新）を検証
  - Document Review操作フロー（Start→Reply/Fix）を検証
  - Desktop UI操作後のRemote UI自動更新を確認
  - 依存: 全コンポーネント実装完了
  - _Requirements: 1.2, 1.3, 1.6, 5.6, 8.1, 8.2, 8.3, 8.4_
