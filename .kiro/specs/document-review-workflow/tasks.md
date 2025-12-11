# Implementation Plan

## Task 1: 型定義とspec.json拡張

- [x] 1.1 (P) DocumentReviewState型とExtendedSpecJson型を定義
  - ドキュメントレビュー状態を表す型（rounds、status、currentRound、roundDetails）を作成
  - 既存のSpecJson型を拡張してdocumentReviewフィールドをオプショナルとして追加
  - RoundDetail型でラウンドごとの詳細情報（完了時刻、状態）を管理
  - documentReviewフィールドが存在しない場合の後方互換性を確保
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 1.2 (P) ReviewError型とレビュー関連定数を定義
  - エラー種別（PRECONDITION_FAILED、AGENT_ERROR、FILE_NOT_FOUND、ALREADY_RUNNING、ALREADY_APPROVED）の型を作成
  - レビューステータス（pending、in_progress、approved、skipped）の定数を定義
  - ラウンド詳細ステータス（review_complete、reply_complete、incomplete）の定数を定義
  - _Requirements: 8.1, 8.2_

## Task 2: DocumentReviewServiceの基盤実装

- [x] 2.1 レビュー開始条件の検証機能を実装
  - spec.jsonを読み込んでtasksフェーズの承認状態を確認
  - implフェーズが開始されていないことを検証
  - 必要なドキュメント（requirements.md、design.md、tasks.md）の存在を確認
  - documentReviewが既に承認済みでないことを検証
  - _Requirements: 1.1, 1.2, 1.4, 8.4_

- [x] 2.2 spec.jsonのdocumentReviewフィールド初期化・更新機能を実装
  - レビューワークフロー初回実行時にdocumentReviewフィールドを初期化（rounds: 0、status: "pending"）
  - ラウンド完了時にroundsカウントを増加
  - ステータス変更（in_progress、approved、skipped）時のフィールド更新
  - roundDetailsへのラウンド詳細情報の追加
  - _Requirements: 4.2, 5.5_

- [x] 2.3 ラウンド番号管理機能を実装
  - 現在のラウンド番号を取得（既存ファイルから算出）
  - 次のラウンド番号を計算（最大番号+1）
  - ラウンド番号は1から始まる連番を保証
  - _Requirements: 2.5, 4.1, 4.5_

## Task 3: エージェント実行機能の実装

- [x] 3.1 document-reviewエージェントコマンドを作成
  - SpecManagerServiceを通じてエージェントプロセスを起動
  - requirements.md、design.md、tasks.mdの全ファイルを読み込む指示を含める
  - steering文書（product.md、tech.md、structure.md）との整合性検証を指示
  - ドキュメント間の整合性（要件-デザイン対応、デザイン-タスク対応）の検証を指示
  - 指摘事項をdocument-review-{n}.mdに出力
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3.2 document-review-replyエージェントコマンドを作成
  - 別のエージェントインスタンスとして実行される設計
  - 対応するdocument-review-{n}.mdを読み込む指示を含める
  - 各指摘事項の妥当性を独立して評価する指示
  - 妥当と判断した場合は対象ドキュメント（requirements.md、design.md、tasks.md）を直接修正
  - 不適切と判断した場合は却下理由を記録
  - 結果をdocument-review-reply-{n}.mdに出力
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3.3 レビューラウンド実行フロー制御を実装
  - startReviewRound: document-reviewエージェントを起動
  - エージェント完了時にexecuteReplyAgentを呼び出し
  - document-review-replyエージェント完了時にcompleteRoundを呼び出し
  - 実行中状態の管理（currentRound設定、status: "in_progress"）
  - _Requirements: 1.1, 4.1, 4.3_

## Task 4: エラーハンドリングと再実行機能

- [x] 4.1 エージェントエラー処理を実装
  - document-reviewエージェントのエラーをログに記録しユーザーに通知
  - document-review-replyエージェントのエラー時に該当ラウンドを未完了（incomplete）としてマーク
  - エラー内容をNotificationStoreを通じてUI通知
  - _Requirements: 8.1, 8.2_

- [x] 4.2 ラウンド再実行機能を実装
  - 未完了または失敗したラウンドの再実行を許可
  - retryRound: 指定ラウンドのレビューまたはリプライから再実行
  - 再実行時は既存のレビューファイルを上書き
  - _Requirements: 8.3_

## Task 5: レビュー承認・スキップ機能

- [x] 5.1 レビュー承認機能を実装
  - ユーザーがレビュープロセスを承認した時にspec.jsonのdocumentReview.statusを"approved"に設定
  - 承認後は追加ラウンドの実行を禁止
  - ready_for_implementationフラグとの連携を確認
  - _Requirements: 4.4_

- [x] 5.2 スキップ機能を実装
  - スキップオプション付きで実行された場合、レビュープロセスをスキップ
  - spec.jsonのdocumentReview.statusを"skipped"に設定
  - スキップ後はspec-implを開始可能にする
  - _Requirements: 1.3_

## Task 6: UIコンポーネントの実装

- [x] 6.1 (P) DocumentReviewPanelコンポーネントを実装
  - レビューラウンド数を表示
  - レビュー開始ボタン（isExecuting === false の時に有効）
  - 進行インジケーター（タイトル左側に配置、要件定義/設計/タスクパネルと同様の形式）
    - チェック済: rounds >= 1（✓ アイコン、緑）
    - チェック無し: rounds === 0 かつ 非実行中（○ アイコン、グレー）
    - 実行中: isExecuting === true または status === 'in_progress'（スピナー、青）
    - スキップ予定: 自動実行フラグが 'skip'（→ アイコン、黄）
  - 自動実行フラグ制御UI（タイトル右側に配置、要件定義/設計/タスクパネルと同様の形式）
    - 実行（run）: 自動実行時にレビューを実行
    - 一時停止（pause）: タスク終了時に一時停止
    - スキップ（skip）: レビューをスキップして実装タスクに進む
  - 実行中状態の表示（スピナー、進捗メッセージ）
  - **Note**: 承認ボタン・履歴ボタンは不要（レビューファイルはArtifactEditorのタブで表示）
  - _Requirements: 6.1, 6.4, 6.5, 6.6, 6.7_

- [x] 6.2 (P) ArtifactEditorにレビューファイルタブを追加
  - document-review-{n}.mdとdocument-review-{n}-reply.mdをタブとして表示
  - tasksタブの右側に数字順で配置（Review-1, Reply-1, Review-2, Reply-2, ...）
  - roundDetailsのstatusに基づいてタブを動的に生成
  - _Requirements: 6.2, 6.3_

- [x] 6.3 WorkflowViewへのレビューパネル統合
  - tasksフェーズ後、implフェーズ前にDocumentReviewPanelを配置
  - DocumentReviewServiceとの接続（onStartReview）
  - specStoreからのレビュー状態参照
  - レビュー中は他のフェーズ/タスク実行を禁止（runningPhasesで制御）
  - _Requirements: 6.1, 6.8_

## Task 7: 自動実行との統合

- [x] 7.1 WorkflowStoreにdocumentReviewOptionsを追加
  - skip: 自動実行時にレビューをスキップするフラグ
  - autoReply: 自動的にreplyまで実行するフラグ（デフォルト: true）
  - setDocumentReviewOptionsメソッドの実装
  - _Requirements: 7.4_

- [x] 7.4 (P) DocumentReviewSettingsPanelコンポーネントを実装
  - 「ドキュメントレビューをスキップ」チェックボックス
  - 「レビュー完了後に自動でリプライを実行」チェックボックス
  - workflowStore.documentReviewOptionsとの連携
  - workflowStore.setDocumentReviewOptionsの呼び出し
  - WorkflowViewへの統合（自動実行設定セクションに配置）
  - _Requirements: 7.4_

- [x] 7.2 AutoExecutionServiceにレビューワークフローを統合
  - spec-tasks完了後に自動的にdocument-reviewを実行
  - skipフラグがtrueの場合はレビューをバイパス
  - autoReplyがtrueの場合、document-review完了後に自動でdocument-review-replyを実行
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 7.3 自動実行完了時のユーザー確認を実装
  - レビューラウンド完了後、次のラウンドを実行するか承認するかの確認ダイアログを表示
  - ユーザーの選択に基づいて次のアクションを実行
  - 自動実行モードでも人間の介入ポイントを確保
  - _Requirements: 7.5_

## Task 8: 統合テスト

- [x] 8.1 DocumentReviewServiceの単体テスト
  - canStartReview: 前提条件判定ロジックのテスト
  - getNextRoundNumber: ラウンド番号計算のテスト
  - approveReview/skipReview: 状態更新のテスト
  - エラーケース（ファイル不存在、既に承認済み等）のテスト
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 8.2 E2Eテスト
  - レビュー開始ボタン押下からエージェント実行、結果表示までのフロー
  - 複数ラウンド実行から承認までのフロー
  - 自動実行フラグ制御UIの動作確認（実行/一時停止/スキップの切替）
  - エラー発生時のリカバリーフロー
  - **テスト実行方針**:
    - UIインタラクション検証: WebdriverIOによるUI操作テスト
    - エージェント実行: モックサービス（MockSpecManagerService）で代替し、固定レスポンスを返却
    - ファイル生成確認: テスト用specディレクトリに対して実際のファイル生成を検証
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 8.1, 8.2, 8.3_
