# Implementation Plan

## Tasks

- [x] 1. Autofixオプション対応
- [x] 1.1 (P) SpecManagerServiceにautofixオプションを追加
  - executeDocumentReviewReplyメソッドの引数にautofixオプションを追加する
  - autofix=trueの場合、agent起動コマンドに`--autofix`を付与する
  - デフォルト値はfalseとし、後方互換性を維持する
  - _Requirements: 1.2_

- [x] 1.2 (P) IPCハンドラにautofixパラメータを追加
  - EXECUTE_DOCUMENT_REVIEW_REPLY IPCチャンネルにautofixパラメータを追加する
  - Renderer側からMain側へautofixフラグを橋渡しする
  - preloadのelectronAPI型定義を更新する
  - _Requirements: 1.1_

- [x] 1.3 AutoExecutionServiceでautofix付きreply実行
  - 自動実行モードでdocument-review-reply実行時にautofix:trueを指定する
  - 非自動実行モードでは従来どおりautofixなしで実行する
  - _Requirements: 1.3, 1.4_

- [x] 2. Reply.md解析機能
- [x] 2.1 (P) DocumentReviewServiceにparseReplyFileメソッドを追加
  - document-review-{roundNumber}-reply.mdファイルを読み込む
  - Response SummaryテーブルからFix Required数を抽出する正規表現パターンを実装する
  - 各Severity行のFix Required列の数値を合計してfixRequiredCountを算出する
  - Result型でエラーをハンドリングし、FILE_NOT_FOUND/PARSE_ERRORを返す
  - _Requirements: 2.2_

- [x] 2.2 (P) parseReplyFile用IPCチャンネルを追加
  - PARSE_REPLY_FILE IPCチャンネルを新規定義する
  - specPathとroundNumberを受け取り、ParseReplyResultを返す
  - preloadのelectronAPI型定義を更新する
  - _Requirements: 2.1_

- [x] 3. 自動承認とimplフェーズ自動進行
- [x] 3.1 AutoExecutionServiceのreply完了ハンドラを拡張
  - reply完了時にparseReplyFile IPCを呼び出してFix Required数を取得する
  - specDetailからspec.jsonパスを取得しreply.mdのパスを構築する
  - fixRequiredCount===0の場合、自動承認処理に進む
  - fixRequiredCount>0の場合、pendingReviewConfirmation状態に移行する
  - 解析失敗時は安全側に倒してpendingReviewConfirmation状態にフォールバックする
  - _Requirements: 2.1, 2.3, 2.4, 2.5, 4.1, 4.3_

- [x] 3.2 自動承認後のimplフェーズ自動進行を実装
  - documentReview.statusがapprovedになった後、impl許可を確認する
  - autoExecutionPermissions.implがtrueの場合、implフェーズを自動実行する
  - autoExecutionPermissions.implがfalseの場合、完了状態で停止する
  - 非自動実行モードの場合は従来どおりpendingReviewConfirmation状態に移行する
  - _Requirements: 3.1, 3.2, 3.3, 4.2_

- [x] 4. UI状態表示とエラーハンドリング
- [x] 4.1 (P) 自動承認通知の表示
  - ドキュメントレビューが自動承認された際に成功通知を表示する
  - notificationStoreのnotify.successを使用する
  - implフェーズへの自動進行時にフェーズ遷移を通知する
  - _Requirements: 5.1, 5.2_

- [x] 4.2 (P) 解析中のログ出力
  - reply.md解析中であることをログに出力する
  - workflowStoreのsetAutoExecutionStatusを使用して状態を適切に管理する
  - 解析完了後に適切な状態に遷移する
  - _Requirements: 5.3_

- [x] 4.3 エラーハンドリングとログ出力
  - reply.md読み取りエラー時はログに記録し、pendingReviewConfirmationにフォールバックする
  - Response Summaryテーブル解析エラー時はログに記録し、pendingReviewConfirmationにフォールバックする
  - approveDocumentReview IPC呼び出しエラー時はエラーを通知し、pendingReviewConfirmationにフォールバックする
  - 全エラーケースでloggerを使用してデバッグ情報（ファイルパス、パースエラー詳細等）を出力する
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 5. 電子APIファイル読み取り対応
- [x] 5.1 readArtifact IPCを使用したファイル読み取り
  - AutoExecutionServiceでwindow.electronAPI.readArtifactを使用してreply.mdを読み取る
  - Main側でDocumentReviewService.parseReplyFileを呼び出してFix Required数を返却する
  - _Requirements: 4.4_

- [x] 6. テストとインテグレーション
- [x] 6.1 (P) ユニットテストの作成
  - DocumentReviewService.parseReplyFileの正常系テスト（Fix Required数抽出）を作成する
  - DocumentReviewService.parseReplyFileの異常系テスト（ファイル不存在、フォーマット不正）を作成する
  - AutoExecutionService.handleDocumentReviewReplyCompletedの条件分岐テストを作成する
  - SpecManagerService.executeDocumentReviewReplyのautofixオプション付与テストを作成する
  - _Requirements: 2.2, 2.5_

- [x] 6.2 統合テストとE2Eテストの作成
  - IPC通信（PARSE_REPLY_FILE、EXECUTE_DOCUMENT_REVIEW_REPLY）の結合テストを作成する
  - reply完了から自動承認までのワークフローテストを作成する
  - エラーフォールバック時のUI表示テストを作成する
  - _Requirements: 6.1, 6.2, 6.3_
