# Requirements Document

## Introduction

本ドキュメントは、SDD ManagerのWorkflowViewにおける自動実行機能の要件を定義する。この機能は、ユーザーが「自動実行」ボタンを押した際に、許可されたフェーズを順番に自動実行し、SDDワークフロー全体を効率化することを目的とする。

現在、WorkflowViewには各フェーズの個別実行機能とUI、およびworkflowStoreによる自動実行許可設定の管理機能が実装されている。本仕様では、これらの既存基盤を活用し、許可されたフェーズを順次自動実行するロジックを追加実装する。

## Requirements

### Requirement 1: 自動実行制御

**Objective:** ユーザーとして、自動実行の開始・停止を制御したい。これにより、ワークフロー全体を効率的に進められ、必要に応じて中断できる。

#### Acceptance Criteria

1. When ユーザーが自動実行ボタンをクリックする, the WorkflowView shall 自動実行を開始し、ボタンを「停止」状態に切り替える
2. When ユーザーが停止ボタンをクリックする, the WorkflowView shall 自動実行を即座に中断し、現在実行中のフェーズがあれば完了を待ってから停止する
3. While 自動実行が進行中, the WorkflowView shall 現在実行中のフェーズをハイライト表示する
4. When 自動実行が最後の許可フェーズを完了する, the WorkflowView shall 自動実行を正常終了し、ボタンを「自動実行」状態に戻す

### Requirement 2: フェーズ順次実行

**Objective:** システムとして、許可されたフェーズを定義された順序で実行したい。これにより、SDDワークフローの依存関係を尊重した自動化が実現できる。

#### Acceptance Criteria

1. When 自動実行が開始される, the AutoExecutionService shall workflowStoreのautoExecutionPermissionsに基づいて許可フェーズを特定する
2. When 次のフェーズを実行する, the AutoExecutionService shall requirements -> design -> tasks -> impl -> inspection -> deploy の順序を遵守する
3. When あるフェーズの実行が完了する, the AutoExecutionService shall 次の許可フェーズへ自動的に遷移する
4. If フェーズの実行に失敗する, then the AutoExecutionService shall 自動実行を停止し、エラー状態を表示する
5. While フェーズ間の遷移中, the AutoExecutionService shall 前フェーズの承認状態を確認し、必要であれば自動承認を行う

### Requirement 3: 実行前提条件の検証

**Objective:** システムとして、各フェーズの実行前に前提条件を検証したい。これにより、不正な状態でのフェーズ実行を防止できる。

#### Acceptance Criteria

1. When フェーズを自動実行する前, the AutoExecutionService shall 前フェーズがapproved状態であることを検証する
2. If 前フェーズがapproved状態でない, then the AutoExecutionService shall 当該フェーズの自動承認を試行するか、自動実行を停止する
3. When 同じspecで他のAgentが実行中, the AutoExecutionService shall 実行中のAgentの完了を待機する
4. The AutoExecutionService shall specDetailとspecJsonが利用可能な場合にのみ自動実行を開始する

### Requirement 4: バリデーション連携

**Objective:** ユーザーとして、自動実行中にバリデーションを挿入したい。これにより、品質を確保しながら自動化できる。

#### Acceptance Criteria

1. When validationOptionsでgapバリデーションが有効, the AutoExecutionService shall requirements完了後にvalidate-gapを実行する
2. When validationOptionsでdesignバリデーションが有効, the AutoExecutionService shall design完了後にvalidate-designを実行する
3. When validationOptionsでimplバリデーションが有効, the AutoExecutionService shall impl完了後にvalidate-implを実行する
4. When バリデーションが失敗する, the AutoExecutionService shall 自動実行を停止し、ユーザーに確認を求める

### Requirement 5: 実行状態の通知

**Objective:** ユーザーとして、自動実行の進行状況をリアルタイムで把握したい。これにより、処理状況を確認しながら他の作業ができる。

#### Acceptance Criteria

1. While 自動実行が進行中, the WorkflowView shall 現在のフェーズ名と進捗状況を表示する
2. When フェーズが正常に完了する, the NotificationService shall 成功通知を表示する
3. If フェーズ実行中にエラーが発生する, then the NotificationService shall エラー内容を詳細に表示する
4. When 自動実行が完了する, the NotificationService shall 完了通知と実行結果サマリーを表示する
5. The WorkflowView shall 実行中のフェーズに対してローディングインジケーターを表示する

### Requirement 6: Agent完了検知

**Objective:** システムとして、各フェーズを担当するAgentの完了を正確に検知したい。これにより、次フェーズへの確実な遷移が可能になる。

#### Acceptance Criteria

1. When Agentがフェーズ実行を開始する, the AgentStore shall 当該Agentをrunning状態として追跡する
2. When Agentの実行が完了する, the AgentStore shall Agent状態をcompleted/failedに更新する
3. The AutoExecutionService shall agentStoreの状態変化を監視し、Agent完了時に次フェーズへ遷移する
4. If Agentがタイムアウトする, then the AutoExecutionService shall タイムアウトエラーとして処理し、自動実行を停止する

### Requirement 7: 設定の永続化との連携

**Objective:** ユーザーとして、自動実行許可設定がセッション間で保持されることを期待する。これにより、毎回の設定作業が不要になる。

#### Acceptance Criteria

1. The workflowStore shall autoExecutionPermissionsをlocalStorageに永続化する
2. When アプリケーションが起動する, the workflowStore shall 保存された自動実行許可設定を復元する
3. When ユーザーがフェーズの自動実行許可をトグルする, the workflowStore shall 変更を即座に永続化する
4. The workflowStore shall isAutoExecutingフラグは永続化せず、起動時にfalseとして初期化する

### Requirement 8: エラーリカバリー

**Objective:** システムとして、自動実行中のエラーから適切にリカバリーしたい。これにより、一時的な問題で全体が停止することを防げる。

#### Acceptance Criteria

1. If Agent実行中にエラーが発生する, then the AutoExecutionService shall エラーをキャプチャし、自動実行を停止する
2. When 自動実行がエラーで停止する, the WorkflowView shall 「再実行」ボタンを表示する
3. When ユーザーが再実行ボタンをクリックする, the AutoExecutionService shall 失敗したフェーズから自動実行を再開する
4. The AutoExecutionService shall エラー発生時に詳細なログを記録する
5. If 連続して同じフェーズで失敗する, then the AutoExecutionService shall 自動リトライを制限し、手動介入を要求する

