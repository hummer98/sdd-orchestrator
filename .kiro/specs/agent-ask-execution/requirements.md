# Requirements Document

## Introduction

本機能は、Project Agent一覧とSpec Agent一覧のヘッダに「新規実行」ボタンを追加し、ユーザーが任意のプロンプトでAgentを自由に起動できる機能を提供する。コンテキスト付与用のSkill（/kiro:project-ask, /kiro:spec-ask）を作成し、Project AgentにはSteering files、Spec AgentにはSteering files + Spec filesをコンテキストとして付与する。Agentログは既存の形式に統合され、phaseラベルは「ask」を使用する。

## Scope

- **Remote UI対応**: 必要
- **対象操作**:
  - Desktop UI: 「新規実行」ボタンとプロンプト入力ダイアログ
  - Remote UI: WebSocket経由での同等操作（「新規実行」ボタンとプロンプト入力）
- **追加コンポーネント**:
  - WebSocketハンドラ: ask実行リクエストの送受信
  - Remote UI側: AskAgentDialogコンポーネント、対応するstores

## Requirements

### Requirement 1: UI - 新規実行ボタンの追加

**Objective:** As a ユーザー, I want Project Agent一覧とSpec Agent一覧のヘッダに「新規実行」ボタンを表示させたい, so that 任意のプロンプトでAgentを起動する操作を開始できる

#### Acceptance Criteria

1. The SDD Orchestrator shall display a "新規実行" button in the Project Agent list header
2. When a Spec is selected, the SDD Orchestrator shall display a "新規実行" button in the Spec Agent list header
3. While no project is selected, the SDD Orchestrator shall disable the Project Agent "新規実行" button
4. While no Spec is selected, the SDD Orchestrator shall not display the Spec Agent "新規実行" button
5. When the "新規実行" button is clicked, the SDD Orchestrator shall open the AskAgentDialog

### Requirement 2: UI - プロンプト入力ダイアログ

**Objective:** As a ユーザー, I want プロンプト入力ダイアログでAgentへの指示を入力したい, so that カスタムプロンプトでAgentを実行できる

#### Acceptance Criteria

1. When AskAgentDialog is opened, the SDD Orchestrator shall display a text area for prompt input
2. The SDD Orchestrator shall display a "実行" button in the AskAgentDialog
3. The SDD Orchestrator shall display a "キャンセル" button in the AskAgentDialog
4. While the prompt input is empty, the SDD Orchestrator shall disable the "実行" button
5. When the "実行" button is clicked, the SDD Orchestrator shall close the dialog and start Agent execution
6. When the "キャンセル" button is clicked, the SDD Orchestrator shall close the dialog without any action
7. The AskAgentDialog shall indicate whether it is for Project Agent or Spec Agent

### Requirement 3: Skill - project-ask コマンドの作成

**Objective:** As a 開発者, I want /kiro:project-ask スラッシュコマンドを使用したい, so that Steering filesをコンテキストとして含んだ状態でAgentを実行できる

#### Acceptance Criteria

1. The SDD Orchestrator shall provide a `/kiro:project-ask` slash command in `.claude/commands/kiro/`
2. When `/kiro:project-ask` is invoked, the Agent shall receive all Steering files (`.kiro/steering/*.md`) as context
3. The `/kiro:project-ask` command shall accept a user-provided prompt as an argument
4. The Agent execution log shall use "ask" as the phase label

### Requirement 4: Skill - spec-ask コマンドの作成

**Objective:** As a 開発者, I want /kiro:spec-ask スラッシュコマンドを使用したい, so that Steering files + Spec filesをコンテキストとして含んだ状態でAgentを実行できる

#### Acceptance Criteria

1. The SDD Orchestrator shall provide a `/kiro:spec-ask` slash command in `.claude/commands/kiro/`
2. When `/kiro:spec-ask` is invoked, the Agent shall receive all Steering files (`.kiro/steering/*.md`) as context
3. When `/kiro:spec-ask` is invoked, the Agent shall receive all Spec files for the specified feature (`.kiro/specs/{feature}/*.md`) as context
4. The `/kiro:spec-ask` command shall accept a feature name and a user-provided prompt as arguments
5. The Agent execution log shall use "ask" as the phase label

### Requirement 5: Agent実行とログ統合

**Objective:** As a ユーザー, I want Ask実行のAgentログを既存のAgent一覧で確認したい, so that 実行結果を他のAgent実行と同じ方法で追跡できる

#### Acceptance Criteria

1. When an Ask Agent is started, the SDD Orchestrator shall register it in the AgentRegistry
2. The SDD Orchestrator shall display Ask Agent executions in the Agent list panel with phase label "ask"
3. The SDD Orchestrator shall stream Ask Agent output to the AgentLogPanel in real-time
4. When an Ask Agent completes, the SDD Orchestrator shall update the Agent status in the list
5. If an Ask Agent execution fails, the SDD Orchestrator shall display an error notification
6. The SDD Orchestrator shall save Ask Agent logs to the existing agent log directory (`.kiro/specs/{specId}/logs/` or `.kiro/logs/`)

### Requirement 6: Remote UI対応 - WebSocketハンドラ

**Objective:** As a リモートユーザー, I want Remote UIからもAsk機能を使用したい, so that ブラウザからプロジェクトやSpecに関する質問をAgentに投げられる

#### Acceptance Criteria

1. The SDD Orchestrator shall provide a WebSocket handler for `ask:project` requests
2. The SDD Orchestrator shall provide a WebSocket handler for `ask:spec` requests
3. When a `ask:project` request is received via WebSocket, the SDD Orchestrator shall execute `/kiro:project-ask` with the provided prompt
4. When a `ask:spec` request is received via WebSocket, the SDD Orchestrator shall execute `/kiro:spec-ask` with the provided feature name and prompt
5. The SDD Orchestrator shall broadcast Agent execution status updates to connected Remote UI clients

### Requirement 7: Remote UI対応 - UIコンポーネント

**Objective:** As a リモートユーザー, I want Remote UIで「新規実行」ボタンとプロンプト入力を使用したい, so that Desktop UIと同等の操作ができる

#### Acceptance Criteria

1. When a project is selected in Remote UI, the Remote UI shall display a "新規実行" button in the Project Agent list header (プロジェクト未選択時はボタンを非表示)
2. When a Spec is selected in Remote UI, the Remote UI shall display a "新規実行" button in the Spec Agent list header
3. When the "新規実行" button is clicked in Remote UI, the Remote UI shall open the AskAgentDialog
4. When the "実行" button is clicked in Remote UI AskAgentDialog, the Remote UI shall send a WebSocket request to start Agent execution
5. The Remote UI shall display Ask Agent execution status in the Agent list panel
6. The Remote UI shall stream Ask Agent output in the AgentLogPanel via WebSocket
