# Requirements Document

## Introduction

本ドキュメントは、自動実行時のドキュメントレビューワークフロー改善に関する要件を定義する。現在のドキュメントレビューワークフローでは、document-review-reply実行後に必ずユーザー確認待ち状態（`pendingReviewConfirmation`）に移行する。本機能により、autofixオプションによる自動修正、全issue解決時の自動承認、およびimplフェーズへの自動進行を実現し、自動実行の継続性を向上させる。

### Current State Analysis

現在の実装状態:
- `AutoExecutionService.handleDocumentReviewReplyCompleted`は常に`paused`+`pendingReviewConfirmation`を設定
- `executeDocumentReviewReply` IPCハンドラおよびSpecManagerServiceは`autofix`パラメータをサポートしていない
- document-review-replyテンプレートは`--autofix`オプションを既にサポート済み
- `auto-execution-completion-detection`仕様でIPC直接購読とAgentId追跡は実装済み

## Requirements

### Requirement 1: Autofixオプション対応

**Objective:** 自動実行モードのユーザーとして、document-review-reply実行時に自動修正が適用されることを望む。これにより、レビューで指摘された問題が自動的に修正され、手動介入なしでワークフローが進行できる。

#### Acceptance Criteria

1. The `executeDocumentReviewReply` IPC handler shall `autofix`パラメータを受け取り、コマンド引数に`--autofix`オプションを付与する機能を提供する
2. The `SpecManagerService.executeDocumentReviewReply` method shall `autofix?: boolean`オプションを受け取り、trueの場合はコマンドに`--autofix`フラグを追加する
3. When 自動実行モードでdocument-review-replyが実行される, the AutoExecutionService shall `autofix: true`を指定してexecuteDocumentReviewReplyを呼び出す
4. When 手動実行（非自動実行モード）でdocument-review-replyが実行される, the system shall 従来どおり`autofix`オプションなしでコマンドを実行する

### Requirement 2: 全Issue解決時の自動承認

**Objective:** 自動実行モードのユーザーとして、document-review-reply完了後に全issueが解決された場合、自動的にドキュメントレビューが承認されることを望む。これにより、追加の手動承認なしでワークフローが継続できる。

#### Acceptance Criteria

1. When document-review-replyエージェントが完了する and 自動実行モードである, the AutoExecutionService shall document-review-{round}-reply.mdファイルを解析して未解決issue数を取得する
2. The AutoExecutionService shall `Fix Required: N`形式のサマリー行から未解決issue数を正確に抽出するパース機能を実装する
3. If 未解決issue数（Fix Required）が0である, then the AutoExecutionService shall documentReviewを自動承認しpendingReviewConfirmation状態をスキップしてimplフェーズ判定に進む
4. If 未解決issue数（Fix Required）が1以上である, then the AutoExecutionService shall 従来どおりpendingReviewConfirmation状態に移行してユーザー確認を待つ
5. If document-review-reply.mdファイルが存在しない or 解析に失敗した場合, then the AutoExecutionService shall 安全側に倒してユーザー確認待ち状態にフォールバックする

### Requirement 3: 自動承認後のimplフェーズ自動進行

**Objective:** 自動実行モードのユーザーとして、ドキュメントレビューが自動承認された後、確認なしでimplフェーズに自動進行することを望む。これにより、完全な自動実行フローが実現できる。

#### Acceptance Criteria

1. When ドキュメントレビューが自動承認される and autoExecutionPermissions.implがtrueである, the AutoExecutionService shall ユーザー確認プロンプト（pendingReviewConfirmation）をスキップしてimplフェーズへ自動進行する
2. When ドキュメントレビューが自動承認される and autoExecutionPermissions.implがfalseである, the AutoExecutionService shall 完了状態で停止しimplフェーズを実行しない
3. While document-review-reply完了処理中である, the AutoExecutionService shall 自動承認判定を実行しその結果に基づいて次のアクションを決定する

### Requirement 4: 状態フロー制御

**Objective:** システムとして、自動実行中のドキュメントレビュー処理を正確に制御し、適切な状態遷移を行うことを保証する。

#### Acceptance Criteria

1. The AutoExecutionService.handleDocumentReviewReplyCompleted method shall 自動実行モード時に未解決issue数を確認してから状態遷移を決定するロジックを実装する
2. When 自動実行モードでない場合, the handleDocumentReviewReplyCompleted shall 従来どおり即座にpaused+pendingReviewConfirmation状態に移行する
3. The handleDocumentReviewReplyCompleted method shall specDetailからspec.jsonのパスを取得しdocument-review-reply.mdのパスを構築する
4. The AutoExecutionService shall reply.mdファイル読み取り用にelectronAPI.readArtifact IPCを使用する

### Requirement 5: UI状態表示

**Objective:** ユーザーとして、自動実行中のドキュメントレビュー状態を把握できることを望む。これにより、ワークフローの進行状況と結果を確認できる。

#### Acceptance Criteria

1. When ドキュメントレビューが自動承認される, the UI shall 承認された旨を通知で表示する
2. When ドキュメントレビューからimplフェーズへ自動進行する, the UI shall フェーズ遷移を反映して表示を更新する
3. While ドキュメントレビューreply.mdの解析中である, the AutoExecutionService shall 処理中であることをログに出力する

### Requirement 6: エラーハンドリング

**Objective:** システム管理者として、自動実行中のドキュメントレビュー処理でエラーが発生した場合に適切に対処できることを望む。これにより、予期しない状況でもシステムが安全に動作する。

#### Acceptance Criteria

1. If document-review-reply.mdの読み取りでエラーが発生した場合, then the AutoExecutionService shall エラーをログに記録しユーザー確認待ち状態にフォールバックする
2. If Response Summaryテーブルの解析でエラーが発生した場合, then the AutoExecutionService shall エラーをログに記録しユーザー確認待ち状態にフォールバックする
3. If documentReview承認処理（approveDocumentReview IPC）でエラーが発生した場合, then the AutoExecutionService shall エラーを通知しユーザー確認待ち状態にフォールバックする
4. The AutoExecutionService shall すべてのエラーケースでデバッグ可能な情報（ファイルパス、パースエラー詳細等）をログに出力する
