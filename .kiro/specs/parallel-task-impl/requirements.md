# Requirements Document

## Introduction

本ドキュメントは、SDD Orchestratorにおける「並列実装」機能の要件を定義する。この機能は、tasks.mdの(P)マークを解析し、並列実行可能なタスクをグループ化して、複数のClaudeセッションで同時に実装を進めることを目的とする。

## Requirements

### Requirement 1: 並列実装ボタンの配置

**Objective:** As a 開発者, I want implフェーズに「並列実装」ボタンを配置したい, so that 通常の逐次実装と並列実装を選択できる

#### Acceptance Criteria
1. When ユーザーがSpecを選択する, the WorkflowView shall implフェーズセクション（TaskProgressViewの上部）に「並列実装」ボタンを表示する
2. While tasksフェーズが承認済みである, the 並列実装ボタン shall 有効な状態で表示される
3. If tasksフェーズが未承認である, then the 並列実装ボタン shall 無効化された状態で表示される
4. The 並列実装ボタン shall 既存のUIデザインと一貫したスタイルで表示される

### Requirement 2: tasks.mdパーサー（taskParallelParser）

**Objective:** As a システム, I want tasks.mdを解析して(P)マーク付きタスクを識別したい, so that 並列実行可能なタスクをグループ化できる

#### Acceptance Criteria
1. When tasks.mdが読み込まれる, the taskParallelParser shall 全タスクを解析して(P)マーク有無を判定する
2. When タスクに(P)マークが付与されている, the taskParallelParser shall 該当タスクを並列実行可能としてマークする
3. When 親タスクに(P)がなくサブタスクに(P)がある, the taskParallelParser shall サブタスク単位で並列実行可能としてマークする
4. The taskParallelParser shall タスクを依存関係に基づいて実行グループに分類する
5. When 連続する(P)マーク付きタスクが存在する, the taskParallelParser shall 同一グループとして分類する

### Requirement 3: タスクグループ化ロジック

**Objective:** As a システム, I want (P)マーク付きタスクを論理的なグループに分類したい, so that 依存関係を考慮した並列実行が可能になる

#### Acceptance Criteria
1. When タスク1.1(P), 1.2(P), 2.1, 2.2(P), 2.3(P)が存在する, the グループ化ロジック shall グループ1: [1.1, 1.2], グループ2: [2.1], グループ3: [2.2, 2.3]に分類する
2. The グループ化ロジック shall 非(P)タスクを単独グループとして扱う
3. The グループ化ロジック shall タスクの順序に基づいてグループ順序を決定する

### Requirement 4: 並列Claudeセッション起動

**Objective:** As a システム, I want グループ内タスクを複数のClaudeセッションで並列実行したい, so that 実装時間を短縮できる

#### Acceptance Criteria
1. When 並列実装ボタンがクリックされる, the システム shall 最初のグループのタスクに対して並列でClaudeセッションを起動する
2. While 並列セッションが実行中である, the システム shall MAX_CONCURRENT_SPECS=5の上限を適用する
3. When グループ内のタスク数がMAX_CONCURRENT_SPECSを超える, the システム shall 上限までのタスクを先に起動し、完了次第残りを起動する
4. The システム shall /kiro:spec-implと/spec-manager:impl両方のコマンドセットに対応する

### Requirement 5: グループ間の自動進行

**Objective:** As a システム, I want 現在のグループが完了したら次のグループに自動的に進行したい, so that ユーザーの介入なく全タスクを実装できる

#### Acceptance Criteria
1. When 現在のグループの全タスクが正常完了する, the システム shall 次のグループの並列実行を自動的に開始する
2. When 1回のボタン押下で開始された並列実装, the システム shall 全グループ完了まで自動進行する
3. While 自動進行中である, the 並列実装ボタン shall 実行中状態を表示する

### Requirement 6: エラーハンドリング

**Objective:** As a システム, I want タスク失敗時に適切にハンドリングしたい, so that 問題を特定し修正できる

#### Acceptance Criteria
1. If グループ内のタスクが失敗した, then the システム shall 失敗したタスクを記録する
2. If グループ内のタスクが失敗した, then the システム shall 次のグループに進まず実行を停止する
3. While タスク失敗により停止した, the システム shall 失敗したタスクの情報をユーザーに表示する
4. When 実行が停止した, the システム shall 他の実行中タスクは完了まで継続する

### Requirement 7: 進捗表示

**Objective:** As a 開発者, I want 並列実行中のタスク進捗を確認したい, so that 実行状況を把握できる

#### Acceptance Criteria
1. While 並列実装が実行中である, the AgentListPanel shall 各タスクに対応するAgentを表示する
2. When 複数のClaudeセッションが起動される, the AgentListPanel shall 全てのアクティブなAgentを一覧表示する
3. The 並列実装ボタン自体 shall 実行中はスピナーまたは進行状態を表示する
4. When グループ内の全タスクが完了する, the AgentListPanel shall 各Agentの完了ステータスを表示する

### Requirement 8: 既存機能との互換性

**Objective:** As a システム, I want 既存の「実装」ボタンの動作を維持したい, so that 従来の逐次実装ワークフローも利用可能である

#### Acceptance Criteria
1. The 既存「実装」ボタン shall 現行の動作を変更なく維持する
2. The 並列実装機能 shall 既存のagentProcess, agentRegistryインフラストラクチャを活用する
3. When 並列実装完了後, the TaskProgressView shall 通常と同様にタスク完了状態を表示する

### Requirement 9: キャンセル機能

**Objective:** As a 開発者, I want 並列実装実行中にキャンセルしたい, so that 必要に応じて実行を中断できる

#### Acceptance Criteria
1. While 並列実装が実行中である, the システム shall キャンセル操作を受け付ける
2. When キャンセルが要求される, the システム shall 新規タスクの起動を停止する
3. When キャンセルが要求される, the システム shall 実行中のClaudeセッションを終了する

