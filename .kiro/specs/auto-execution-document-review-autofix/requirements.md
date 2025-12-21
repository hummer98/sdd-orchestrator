# Requirements Document

## Introduction

本ドキュメントは、自動実行時のドキュメントレビューワークフロー改善に関する要件を定義する。現在のドキュメントレビューワークフローでは、document-review-reply実行後にユーザーが手動で次のアクションを選択する必要がある。本機能により、autofixオプションによる自動修正、全issue解決時の自動承認、およびimplフェーズへの自動進行を実現し、自動実行の継続性を向上させる。

## Requirements

### Requirement 1: Autofixオプション付与

**Objective:** 自動実行モードのユーザーとして、document-review-reply実行時に自動修正が適用されることを望む。これにより、レビューで指摘された問題が自動的に修正され、手動介入なしでワークフローが進行できる。

#### Acceptance Criteria

1. When 自動実行モードでdocument-review-replyが実行される, the AutoExecutionService shall `--autofix`オプションを付与してdocument-review-replyコマンドを実行する
2. When 非自動実行モード（手動実行）でdocument-review-replyが実行される, the system shall 従来どおり`--autofix`オプションなしでコマンドを実行する
3. The `executeDocumentReviewReply` IPC handler shall autofixパラメータを受け取り、コマンド引数に反映する機能を提供する

### Requirement 2: 全Issue解決時の自動承認

**Objective:** 自動実行モードのユーザーとして、document-review-reply完了後に全issueが解決された場合、自動的にドキュメントレビューが承認されることを望む。これにより、追加の手動承認なしでワークフローが継続できる。

#### Acceptance Criteria

1. When document-review-replyエージェントが完了する, the AutoExecutionService shall document-review-{round}-reply.mdファイルを解析して未解決issue数を取得する
2. If 未解決issue数（Fix Required）が0である, then the AutoExecutionService shall spec.jsonのdocumentReview.statusを`approved`に自動更新する
3. If 未解決issue数（Fix Required）が1以上である, then the AutoExecutionService shall statusを更新せず、従来どおりユーザー確認待ち状態（pendingReviewConfirmation）に移行する
4. The document-review-reply.mdファイル解析機能 shall `Fix Required: N`形式のサマリー行からissue数を正確に抽出する
5. If document-review-reply.mdファイルが存在しないまたは解析に失敗した場合, then the system shall 安全側に倒してユーザー確認待ち状態に移行する

### Requirement 3: 自動承認後のimplフェーズ自動進行

**Objective:** 自動実行モードのユーザーとして、ドキュメントレビューが承認された後、確認なしでimplフェーズに自動進行することを望む。これにより、完全な自動実行フローが実現できる。

#### Acceptance Criteria

1. When document-review-replyが完了し and documentReview.statusが`approved`である, the AutoExecutionService shall ユーザー確認プロンプト（pendingReviewConfirmation）をスキップしてimplフェーズへ自動進行する
2. When document-review-replyが完了し and documentReview.statusが`approved`でない, the AutoExecutionService shall 従来どおりpendingReviewConfirmation状態に移行してユーザーの選択を待つ
3. While implフェーズの自動実行許可（autoExecutionPermissions.impl）がfalseである, the AutoExecutionService shall 自動承認後もimplフェーズを実行せず、完了状態で停止する

### Requirement 4: UI状態表示

**Objective:** ユーザーとして、自動実行中のドキュメントレビュー状態を把握できることを望む。これにより、ワークフローの進行状況と結果を確認できる。

#### Acceptance Criteria

1. When ドキュメントレビューが自動承認される, the UI shall 承認された旨を通知で表示する
2. When ドキュメントレビューからimplフェーズへ自動進行する, the UI shall フェーズ遷移を反映して表示を更新する
3. While ドキュメントレビューの解析中である, the UI shall 処理中であることを示す表示を行う

### Requirement 5: エラーハンドリング

**Objective:** システム管理者として、自動実行中のドキュメントレビュー処理でエラーが発生した場合に適切に対処できることを望む。これにより、予期しない状況でもシステムが安全に動作する。

#### Acceptance Criteria

1. If document-review-reply.mdの解析でエラーが発生した場合, then the system shall エラーをログに記録し、ユーザー確認待ち状態にフォールバックする
2. If spec.jsonの更新でエラーが発生した場合, then the system shall エラーを通知し、自動実行を一時停止する
3. If implフェーズへの遷移でエラーが発生した場合, then the system shall エラーを通知し、現在の状態を保持する
4. The system shall すべてのエラーケースでログを出力し、デバッグ可能な情報を提供する
