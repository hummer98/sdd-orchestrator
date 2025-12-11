# Requirements Document

## Project Description (Input)
tasks -> impl 間にdocument-review, document-review-replyのワークフローを必須にする機能。requirements -> tasksの間のすべてのドキュメント（requirements.md, design.md, tasks.md）についてSpecおよび既存仕様との整合性を保っているかの総合的な評価を実施し修正を提案する。過剰な指摘を防ぐため、document-review-replyを別のエージェントインスタンスとして実行し、指摘自体が妥当かを検証しつつ、必要であると判断した場合のみ修正を実施する。このプロセスを何度か繰り返してからimplに進む仕組み。

### 仕様詳細
- ワークフロー位置: `spec-tasks` 完了後、`spec-impl` 開始前に実行（タスク生成後の最終レビュー）
- レビュー対象: `requirements.md`, `design.md`, `tasks.md` の全体を総合レビュー
- 終了条件: document-review -> document-review-replyを1セットとし、「レビュープロセスの承認」で終了（回数制限なし）
- ファイル形式: `document-review-{n}.md` / `document-review-reply-{n}.md` （n は1始まり）
- 修正実行: `document-review-reply` 自体が修正を実行する
- spec-implとの連携: 最低限tasksがあれば実行可能（ブロックしない）
- スキップオプション: 自動実行フラグに「スキップ」を追加
- spec.json記録: `documentReview` フィールドを追加（既存フィールドはそのまま維持し、cc-sdd互換性を保持）

### spec.json拡張形式
```json
{
  "feature_name": "example-feature",
  "approvals": {
    "requirements": { "generated": true, "approved": true },
    "design": { "generated": true, "approved": true },
    "tasks": { "generated": true, "approved": true }
  },
  "documentReview": {
    "rounds": 2,
    "status": "approved"
  }
}
```
**Note**: 既存の`approvals`オブジェクト形式を維持し、`documentReview`フィールドを追加する。

## Introduction
本機能は、SDD (Spec-Driven Development) ワークフローにおいて、実装フェーズ（spec-impl）開始前にドキュメントの品質を担保するためのレビュープロセスを導入する。2つの独立したエージェント（document-reviewとdocument-review-reply）による対話的レビューにより、過剰な指摘を防ぎながら、仕様ドキュメント間の整合性と品質を確保する。

## Requirements

### Requirement 1: レビューワークフローの実行タイミング
**Objective:** As a 開発者, I want タスク生成後・実装開始前にドキュメントレビューを実行できる, so that 実装前に仕様の整合性問題を検出・修正できる

#### Acceptance Criteria
1. When spec-tasksフェーズが完了した時, the SDD Manager shall document-reviewワークフローを実行可能な状態にする
2. While spec-implが開始されていない状態では, the SDD Manager shall document-reviewラウンドの追加実行を許可する
3. When document-reviewがスキップオプション付きで実行された時, the SDD Manager shall レビュープロセスをスキップしてspec-implを開始可能にする
4. If tasksフェーズが未完了の場合, the SDD Manager shall document-reviewの実行を許可しない

### Requirement 2: Document-Review エージェントの実行
**Objective:** As a 開発者, I want 仕様ドキュメント全体の総合レビューを実行したい, so that requirements/design/tasks間の整合性問題を発見できる

#### Acceptance Criteria
1. When document-reviewエージェントが実行された時, the SDD Manager shall requirements.md、design.md、tasks.mdの全ファイルを読み込む
2. When document-reviewエージェントがレビューを完了した時, the SDD Manager shall 指摘事項をdocument-review-{n}.mdファイルに出力する
3. The document-reviewエージェント shall 各ドキュメント間の整合性（要件とデザインの対応、デザインとタスクの対応）を検証する
4. The document-reviewエージェント shall 既存のsteering文書（product.md、tech.md、structure.md）との整合性を検証する
5. When 新しいレビューラウンドが開始された時, the SDD Manager shall ファイル名のインデックス（n）を1増加させる

### Requirement 3: Document-Review-Reply エージェントの実行
**Objective:** As a 開発者, I want レビュー指摘の妥当性を検証し必要な修正のみを実行したい, so that 過剰な修正を防ぎながら品質を向上できる

#### Acceptance Criteria
1. When document-review-replyエージェントが実行された時, the SDD Manager shall 対応するdocument-review-{n}.mdファイルを読み込む
2. The document-review-replyエージェント shall 各指摘事項の妥当性を独立して評価する
3. When 指摘が妥当と判断された時, the document-review-replyエージェント shall 対象のドキュメント（requirements.md、design.md、またはtasks.md）を直接修正する
4. When 指摘が不適切と判断された時, the document-review-replyエージェント shall 修正を行わず却下理由を記録する
5. When document-review-replyが完了した時, the SDD Manager shall 結果をdocument-review-reply-{n}.mdファイルに出力する
6. The document-review-replyエージェント shall document-reviewエージェントとは別のエージェントインスタンスとして実行される

### Requirement 4: レビューラウンドの管理
**Objective:** As a 開発者, I want レビューラウンドを複数回実行して収束するまで繰り返したい, so that ドキュメント品質が十分なレベルに達するまで改善できる

#### Acceptance Criteria
1. The SDD Manager shall document-review → document-review-replyの1セットを1ラウンドとしてカウントする
2. When レビューラウンドが完了した時, the SDD Manager shall spec.jsonのdocumentReview.roundsフィールドを更新する
3. While レビュープロセスが承認されていない状態では, the SDD Manager shall 追加のレビューラウンドの実行を許可する
4. When ユーザーがレビュープロセスを承認した時, the SDD Manager shall spec.jsonのdocumentReview.statusを"approved"に設定する
5. The SDD Manager shall レビューラウンド数に上限を設けない

### Requirement 5: spec.json拡張とcc-sdd互換性
**Objective:** As a システム管理者, I want spec.jsonにレビュー状態を記録しつつ既存互換性を維持したい, so that 既存のcc-sddワークフローに影響を与えない

#### Acceptance Criteria
1. The SDD Manager shall spec.jsonにdocumentReviewフィールドを追加する
2. The SDD Manager shall 既存のrequirements、design、tasksフィールドをそのまま維持する
3. When documentReviewフィールドが存在しない場合, the SDD Manager shall 既存のcc-sddワークフローとして動作する
4. The documentReviewフィールド shall rounds（数値）とstatus（文字列）のプロパティを持つ
5. When レビューワークフローが初めて実行された時, the SDD Manager shall documentReviewフィールドを初期化する（rounds: 0, status: "pending"）

### Requirement 6: UIでのレビュー状態表示
**Objective:** As a 開発者, I want レビューの進行状況をUIで確認したい, so that 現在のレビュー状態と履歴を把握できる

#### Acceptance Criteria
1. When Specが選択された時, the SDD Manager shall レビューラウンド数と現在のステータスを表示する
2. The SDD Manager shall document-review-{n}.mdとdocument-review-reply-{n}.mdファイルの内容を閲覧可能にする
3. When 複数のレビューラウンドが存在する時, the SDD Manager shall 全ラウンドの履歴を時系列で表示する
4. The SDD Manager shall レビュープロセスの承認ボタンを提供する
5. Where スキップオプションが有効な場合, the SDD Manager shall スキップボタンを表示する

### Requirement 7: 自動実行との統合
**Objective:** As a 開発者, I want 自動実行モードでもレビューワークフローを制御したい, so that CI/CD環境でも適切にレビューを実行できる

#### Acceptance Criteria
1. When 自動実行モードが有効な時, the SDD Manager shall spec-tasks完了後に自動的にdocument-reviewを実行する
2. When 自動実行モードでdocument-reviewが完了した時, the SDD Manager shall 自動的にdocument-review-replyを実行する
3. Where スキップフラグが設定されている場合, the SDD Manager shall レビューワークフロー全体をスキップする
4. The SDD Manager shall 自動実行設定にdocumentReviewのスキップオプションを追加する
5. If 自動実行モードでレビューが完了した時, the SDD Manager shall 次のラウンドを実行するか承認するかをユーザーに確認する

### Requirement 8: エラーハンドリング
**Objective:** As a 開発者, I want レビュープロセス中のエラーを適切に処理したい, so that 問題発生時に復旧できる

#### Acceptance Criteria
1. If document-reviewエージェントの実行中にエラーが発生した時, the SDD Manager shall エラー内容をログに記録しユーザーに通知する
2. If document-review-replyエージェントの実行中にエラーが発生した時, the SDD Manager shall 該当ラウンドを未完了としてマークする
3. When エラーが発生したラウンドがある時, the SDD Manager shall そのラウンドの再実行を許可する
4. If ドキュメントファイル（requirements.md等）が存在しない時, the SDD Manager shall エラーメッセージを表示しレビューを中断する
