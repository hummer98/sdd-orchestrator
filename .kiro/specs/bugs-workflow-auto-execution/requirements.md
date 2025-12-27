# Requirements Document

## Introduction

本仕様は、SDD Orchestratorにおけるバグ修正ワークフローへの自動実行機能の追加を定義する。

現在、Specワークフロー（requirements → design → tasks → impl）には自動実行機能が実装されているが、Bugsワークフロー（report → analyze → fix → verify → deploy）は各フェーズを手動で実行する必要がある。本機能により、ユーザーはBugsワークフローでもSpec同様のワンクリック自動実行が可能になり、バグ修正プロセスの効率化が図られる。

## Requirements

### Requirement 1: 自動実行ボタン

**Objective:** 開発者として、Bugsワークフローでワンクリックで複数フェーズを連続実行したい。これにより、手動での繰り返し操作を削減し、バグ修正プロセスを効率化できる。

#### Acceptance Criteria

1. When ユーザーがバグを選択した状態で自動実行ボタンをクリックした場合, the BugWorkflowView shall 設定されたフェーズ許可に基づいて連続実行を開始する
2. When reportフェーズが完了済みの場合, the 自動実行 shall analyzeフェーズから開始する
3. While 自動実行が進行中の場合, the 自動実行ボタン shall 停止ボタンとして表示される
4. When 停止ボタンがクリックされた場合, the BugWorkflowView shall 現在実行中のAgentを停止し、自動実行を終了する
5. While 他のエージェントが実行中の場合, the 自動実行ボタン shall 無効化される
6. The BugWorkflowView shall 自動実行ボタンを「自動実行」ラベルと適切なアイコンで表示する

### Requirement 2: フェーズ許可設定

**Objective:** 開発者として、Bugsワークフローの自動実行時にどこまで進行させるか制御したい。これにより、レビューが必要なポイントで停止できる。

#### Acceptance Criteria

1. The BugWorkflowView shall デフォルトでanalyze, fix, verifyフェーズを自動実行の対象とする
2. When ユーザーがフェーズ許可設定を変更した場合, the 自動実行 shall 新しい設定に基づいて動作する
3. Where deployフェーズの自動実行が許可されている場合, the 自動実行 shall verifyフェーズ完了後にdeployフェーズも実行する
   > **注記**: 現時点で `/kiro:bug-deploy` コマンドは未実装のため、deployフェーズの自動実行は将来の拡張機能として扱う。初期実装ではdeployフェーズはスキップされる。
4. When 許可されたフェーズがすべて完了した場合, the 自動実行 shall 自動的に停止する
5. While 自動実行が一時停止中の場合, the BugWorkflowView shall 次の許可フェーズがないことを表示する

### Requirement 3: 自動実行進捗表示

**Objective:** 開発者として、Bugsワークフローの自動実行進捗をリアルタイムで確認したい。これにより、現在の状態を把握し、必要に応じて介入できる。

#### Acceptance Criteria

1. While 自動実行が実行中の場合, the BugAutoExecutionStatusDisplay shall 現在実行中のフェーズ名とスピナーアイコンを表示する
2. While 自動実行が一時停止中の場合, the BugAutoExecutionStatusDisplay shall 「Agent待機中」と一時停止アイコンを表示する
3. When 自動実行が完了した場合, the BugAutoExecutionStatusDisplay shall 「自動実行完了」とチェックアイコンを表示する
4. When 自動実行がエラーで停止した場合, the BugAutoExecutionStatusDisplay shall エラーメッセージと失敗したフェーズ名を表示する
5. The BugAutoExecutionStatusDisplay shall 自動実行がidle状態の場合は表示されない

### Requirement 4: フェーズ完了時の自動遷移

**Objective:** 開発者として、各フェーズ完了後に自動的に次のフェーズへ遷移してほしい。これにより、シームレスなバグ修正体験が得られる。

#### Acceptance Criteria

1. When analyzeフェーズが正常に完了した場合 and fixフェーズの自動実行が許可されている場合, the BugWorkflowView shall 自動的にfixフェーズを開始する
2. When fixフェーズが正常に完了した場合 and verifyフェーズの自動実行が許可されている場合, the BugWorkflowView shall 自動的にverifyフェーズを開始する
3. When verifyフェーズが正常に完了した場合 and deployフェーズの自動実行が許可されている場合, the BugWorkflowView shall 自動的にdeployフェーズを開始する
4. If フェーズがエラーで終了した場合, the 自動実行 shall 停止してエラー状態を表示する
5. When 次の許可フェーズがない場合, the 自動実行 shall 完了状態に遷移する

### Requirement 5: エラーハンドリングと再実行

**Objective:** 開発者として、自動実行中にエラーが発生した場合に適切に対処したい。これにより、問題を特定し、再実行できる。

#### Acceptance Criteria

1. When 自動実行中にAgentがエラーで終了した場合, the BugAutoExecutionStatusDisplay shall エラー状態を表示し、再実行ボタンを提供する
2. When 再実行ボタンがクリックされた場合, the BugWorkflowView shall 失敗したフェーズから自動実行を再開する
3. The BugAutoExecutionStatusDisplay shall リトライ回数を表示する
4. If 同一フェーズで3回連続してエラーが発生した場合, the 自動実行 shall 停止し、手動介入を促すメッセージを表示する
5. When エラー状態から停止ボタンがクリックされた場合, the 自動実行 shall idle状態にリセットする

### Requirement 6: UIの一貫性

**Objective:** 開発者として、BugsワークフローとSpecワークフローで一貫したUI/UX体験を得たい。これにより、学習コストを削減できる。

#### Acceptance Criteria

1. The BugWorkflowView shall Specワークフローの自動実行ボタンと同じスタイルとレイアウトを使用する
2. The BugAutoExecutionStatusDisplay shall Specワークフローの進捗表示と同じデザインパターンを使用する
3. When 自動実行中の場合, the BugPhaseItem shall 実行中フェーズを強調表示する（Specワークフローと同様）
4. The 停止/再実行ボタン shall Specワークフローと同じアイコンとラベルを使用する
5. While 自動実行中の場合, the 各フェーズの手動実行ボタン shall 無効化される（Specワークフローと同様）

### Requirement 7: 状態の永続化

**Objective:** 開発者として、アプリケーション再起動後も自動実行の設定を保持したい。これにより、毎回設定し直す手間を省ける。

#### Acceptance Criteria

1. The BugWorkflowView shall フェーズ許可設定を永続化する
2. When アプリケーションが再起動された場合, the BugWorkflowView shall 保存されたフェーズ許可設定を復元する
3. The フェーズ許可設定 shall プロジェクトごとに保存される
4. If 保存された設定が存在しない場合, the BugWorkflowView shall デフォルト設定（analyze, fix, verify許可）を使用する
