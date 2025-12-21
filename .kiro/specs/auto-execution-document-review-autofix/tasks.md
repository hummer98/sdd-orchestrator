# Implementation Plan

## Tasks

- [ ] 1. Autofixオプション対応
- [ ] 1.1 (P) SpecManagerServiceにautofixオプションを追加
  - executeDocumentReviewReplyメソッドの引数にautofixオプションを追加する
  - autofix=trueの場合、agent起動コマンドに`--autofix`を付与する
  - デフォルト値はfalseとし、後方互換性を維持する
  - _Requirements: 1.1, 1.3_

- [ ] 1.2 (P) IPCハンドラにautofixパラメータを追加
  - EXECUTE_DOCUMENT_REVIEW_REPLY IPCチャンネルにautofixパラメータを追加する
  - Renderer側からMain側へautofixフラグを橋渡しする
  - preloadのelectronAPI型定義を更新する
  - _Requirements: 1.3_

- [ ] 1.3 AutoExecutionServiceでautofix付きreply実行
  - 自動実行モードでdocument-review-reply実行時に--autofixオプションを付与する
  - 非自動実行モードでは従来どおりautofixなしで実行する
  - _Requirements: 1.1, 1.2_

- [ ] 2. Reply.md解析機能
- [ ] 2.1 (P) DocumentReviewServiceにparseReplyFileメソッドを追加
  - document-review-{roundNumber}-reply.mdファイルを読み込む
  - Response SummaryテーブルからFix Required数を抽出する正規表現パターンを実装する
  - 各Severity行のFix Required列の数値を合計してfixRequiredCountを算出する
  - Result型でエラーをハンドリングし、FILE_NOT_FOUND/PARSE_ERRORを返す
  - _Requirements: 2.1, 2.4, 2.5_

- [ ] 2.2 (P) parseReplyFile用IPCチャンネルを追加
  - PARSE_REPLY_FILE IPCチャンネルを新規定義する
  - specPathとroundNumberを受け取り、ParseReplyResultを返す
  - preloadのelectronAPI型定義を更新する
  - _Requirements: 2.1_

- [ ] 3. 自動承認とimplフェーズ自動進行
- [ ] 3.1 AutoExecutionServiceのreply完了ハンドラを拡張
  - reply完了時にparseReplyFile IPCを呼び出してFix Required数を取得する
  - fixRequiredCount===0の場合、自動承認処理に進む
  - fixRequiredCount>0の場合、pendingReviewConfirmation状態に移行する
  - 解析失敗時は安全側に倒してpendingReviewConfirmation状態に移行する
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [ ] 3.2 自動承認後のimplフェーズ自動進行を実装
  - documentReview.statusがapprovedになった後、impl許可を確認する
  - autoExecutionPermissions.implがtrueの場合、implフェーズを自動実行する
  - autoExecutionPermissions.implがfalseの場合、完了状態で停止する
  - statusがapprovedでない場合はpendingReviewConfirmation状態を維持する
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 4. UI状態表示とエラーハンドリング
- [ ] 4.1 (P) 自動承認通知の表示
  - ドキュメントレビューが自動承認された際に成功通知を表示する
  - notificationStoreのnotify.successを使用する
  - implフェーズへの自動進行時にフェーズ遷移を通知する
  - _Requirements: 4.1, 4.2_

- [ ] 4.2 (P) 解析中のUI状態表示
  - reply.md解析中はautoExecutionStatusを'running'に設定する
  - workflowStoreのsetAutoExecutionStatusを使用する
  - 解析完了後に適切な状態に遷移する
  - _Requirements: 4.3_

- [ ] 4.3 エラーハンドリングとログ出力
  - reply.md解析エラー時はログに記録し、pendingReviewConfirmationにフォールバックする
  - spec.json更新エラー時はエラーを通知し、自動実行を一時停止する
  - impl遷移エラー時はエラーを通知し、現在の状態を保持する
  - 全エラーケースでloggerを使用してデバッグ情報を出力する
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 5. テストとインテグレーション
- [ ] 5.1 (P) ユニットテストの作成
  - DocumentReviewService.parseReplyFileの正常系・異常系テストを作成する
  - AutoExecutionService.handleDocumentReviewReplyCompletedの条件分岐テストを作成する
  - SpecManagerService.executeDocumentReviewReplyのautofixオプション付与テストを作成する
  - _Requirements: 2.4, 2.5_

- [ ] 5.2 統合テストとE2Eテストの作成
  - IPC通信（PARSE_REPLY_FILE、EXECUTE_DOCUMENT_REVIEW_REPLY）の結合テストを作成する
  - reply完了から自動承認までのワークフローテストを作成する
  - エラーフォールバック時のUI表示テストを作成する
  - _Requirements: 5.1, 5.2, 5.3_
