# Requirements: MCP Server Integration

## Decision Log

### トランスポート方式
- **Discussion**: MCPには stdio と HTTP/SSE の2つのトランスポート方式がある。stdioはプロセス起動型、HTTP/SSEは常駐型。
- **Conclusion**: HTTP/SSE方式を採用
- **Rationale**: Electronアプリが常駐していることを活かし、Remote UIと同様の発想でHTTPサーバーとして提供する方が自然。

### Resources vs Tools
- **Discussion**: MCPにはResources（読み取り専用データ、URI形式）とTools（実行可能なアクション）の2つのプリミティブがある。
- **Conclusion**: Tools中心で設計
- **Rationale**: AIエージェントは「ツールを呼び出す」パターンに最適化されており、動的に変わるSpec/Bug一覧はToolsの方が適切。

### マルチプロジェクト対応
- **Discussion**: SDD Orchestratorは複数プロジェクトに対応しているが、MCP経由でのアクセスをどう設計するか。
- **Conclusion**: 1サーバー = 1プロジェクト（Remote UIと同じ）
- **Rationale**: シンプルさを優先。必要に応じて将来拡張可能。

### ツール命名規則
- **Discussion**: ツールの命名規則とスコープ分離について。独立した`agent_*`プレフィックスか、スコープに統合するか。
- **Conclusion**: スコープ別プレフィックスで統一（`project_*`, `spec_*`, `bug_*`）
- **Rationale**: Agent操作もスコープに紐づくため、`spec_agent_*`, `bug_agent_*`の形式が一貫性がある。

### MCPサーバー起動制御
- **Discussion**: MCPサーバーの起動/停止を手動制御にするか、自動起動にするか。
- **Conclusion**: 自動起動（設定で無効化可能）
- **Rationale**: MCPの価値は「いつでも使える」こと。手動起動だと接続前に追加ステップが必要になる。不要な場合は設定でオフにできれば十分。

### MCPサーバーのデフォルトポート
- **Discussion**: MCPサーバーのデフォルトポート番号をどうするか。Remote UI（3000）との競合を避ける必要がある。
- **Conclusion**: ポート3001をデフォルトとして採用
- **Rationale**: Remote UIのデフォルトポート（3000）の次番号であり、覚えやすく競合しない。設定で変更可能。

### inspection-*ワイルドカード指定の実装
- **Discussion**: inspection-*の指定時に最新のみを返すか、一覧を返すか。
- **Conclusion**: 最新のinspectionを返す
- **Rationale**: ほとんどのユースケースでは最新のinspection結果が必要。一覧が必要な場合は将来的にspec_list_inspectionsツールで対応可能。

## Introduction

SDD OrchestratorにMCPサーバー機能を内蔵し、Claude Code（VSCodeプラグイン、CLI）やClaude DesktopなどのMCP対応クライアントから直接Spec/Bug操作を可能にする。Remote UIと同様の発想で、Electronアプリ内にHTTP/SSEベースのMCPサーバーを組み込む。

## Requirements

### Requirement 1: MCPサーバー基盤

**Objective:** 開発者として、SDD OrchestratorをMCPサーバーとして起動し、MCP対応クライアントから接続できるようにしたい。これにより、AIエージェントがスラッシュコマンドを使わずに直接SDD操作を行える。

#### Acceptance Criteria
1. When Electronアプリが起動している状態で、MCPサーバーが指定ポートでHTTP/SSE接続を受け付ける
2. When MCPクライアントが接続した場合、MCPプロトコルに準拠したハンドシェイクが完了する
3. The system shall MCPプロトコルバージョン互換性を検証し、非互換の場合はエラーを返す
4. If プロジェクトが選択されていない場合、then MCPツール呼び出しは適切なエラーを返す

### Requirement 2: プロジェクトスコープツール（project_*）

**Objective:** AIエージェントとして、プロジェクト全体の情報を取得し、Spec/Bug/Agentの一覧を把握したい。

#### Acceptance Criteria

##### project_get_info
1. When `project_get_info`が呼び出された場合、プロジェクトパス、名前、steering設定の有無を返す

##### project_list_specs
2. When `project_list_specs`が呼び出された場合、全Specの一覧（name, phase, hasWorktree等）を返す
3. If `filter`パラメータが指定された場合、then 条件に合致するSpecのみを返す

##### project_list_bugs
4. When `project_list_bugs`が呼び出された場合、全Bugの一覧（name, phase等）を返す
5. If `filter`パラメータが指定された場合、then 条件に合致するBugのみを返す

##### project_list_agents
6. When `project_list_agents`が呼び出された場合、実行中の全Agentの一覧と状態を返す

### Requirement 3: Specスコープツール（spec_*）

**Objective:** AIエージェントとして、特定のSpecに対して詳細取得、アーティファクト読み取り、承認、自動実行制御を行いたい。

#### Acceptance Criteria

##### spec_get
1. When `spec_get(name)`が呼び出された場合、spec.jsonの内容と各アーティファクトの存在有無を返す
2. If 指定されたSpecが存在しない場合、then 適切なエラーを返す

##### spec_get_artifact
3. When `spec_get_artifact(name, artifact)`が呼び出された場合、指定アーティファクトの内容を返す
4. The system shall 以下のartifact種類をサポートする: requirements, design, tasks, inspection-*, document-review, reply
5. If 指定されたアーティファクトが存在しない場合、then 適切なエラーを返す

##### spec_create
6. When `spec_create(name, description?)`が呼び出された場合、新規Specディレクトリとspec.jsonを作成する
7. If 同名のSpecが既に存在する場合、then エラーを返す

##### spec_approve
8. When `spec_approve(name, phase)`が呼び出された場合、指定フェーズの承認フラグを更新する
9. The system shall 全フェーズ（requirements, design, tasks）の承認操作をサポートする

##### spec_start_execution / spec_stop_execution
10. When `spec_start_execution(name)`が呼び出された場合、該当Specの自動実行を開始する
11. When `spec_stop_execution(name)`が呼び出された場合、該当Specの自動実行を停止する

##### spec_get_execution_status
12. When `spec_get_execution_status(name)`が呼び出された場合、自動実行の状態を返す

##### spec_agent_stop / spec_agent_get_logs
13. When `spec_agent_stop(name)`が呼び出された場合、該当Spec実行中のAgentを停止する
14. When `spec_agent_get_logs(name, lines?)`が呼び出された場合、該当Spec実行中のAgentログを返す

### Requirement 4: Bugスコープツール（bug_*）

**Objective:** AIエージェントとして、特定のBugに対して詳細取得、アーティファクト読み取り、フェーズ更新、自動実行制御を行いたい。

#### Acceptance Criteria

##### bug_get
1. When `bug_get(name)`が呼び出された場合、bug.jsonの内容と各アーティファクトの存在有無を返す
2. If 指定されたBugが存在しない場合、then 適切なエラーを返す

##### bug_get_artifact
3. When `bug_get_artifact(name, artifact)`が呼び出された場合、指定アーティファクトの内容を返す
4. The system shall 以下のartifact種類をサポートする: bug, analysis, fix, verify
5. If 指定されたアーティファクトが存在しない場合、then 適切なエラーを返す

##### bug_create
6. When `bug_create(name, description)`が呼び出された場合、新規Bugディレクトリとbug.jsonを作成する
7. If 同名のBugが既に存在する場合、then エラーを返す

##### bug_update_phase
8. When `bug_update_phase(name, phase)`が呼び出された場合、Bugのフェーズを更新する

##### bug_start_execution / bug_stop_execution
9. When `bug_start_execution(name)`が呼び出された場合、該当Bugの自動実行を開始する
10. When `bug_stop_execution(name)`が呼び出された場合、該当Bugの自動実行を停止する

##### bug_get_execution_status
11. When `bug_get_execution_status(name)`が呼び出された場合、自動実行の状態を返す

##### bug_agent_stop / bug_agent_get_logs
12. When `bug_agent_stop(name)`が呼び出された場合、該当Bug実行中のAgentを停止する
13. When `bug_agent_get_logs(name, lines?)`が呼び出された場合、該当Bug実行中のAgentログを返す

### Requirement 5: Remote UIとの共存

**Objective:** 運用者として、MCPサーバーとRemote UIを同時に利用できるようにしたい。

#### Acceptance Criteria
1. The system shall MCPサーバーとRemote UIサーバーを同時に起動できる
2. If 同一ポートでの起動が要求された場合、then 適切なエラーメッセージを表示する
3. The system shall MCPサーバーのポート設定をRemote UIとは独立して設定できる

### Requirement 6: MCPサーバー設定UI

**Objective:** 開発者として、MCPサーバーの有効/無効を設定画面から切り替え、Claude CLIへの登録コマンドを簡単にコピーしたい。

#### Acceptance Criteria

##### 自動起動と設定
1. When Electronアプリが起動した場合、MCPサーバー設定が有効であればMCPサーバーを自動起動する
2. The system shall 設定画面にMCPサーバー専用セクションを表示する
3. When MCPサーバー有効/無効スライドがオフに切り替えられた場合、MCPサーバーを停止する
4. When MCPサーバー有効/無効スライドがオンに切り替えられた場合、MCPサーバーを起動する
5. The system shall MCPサーバーのポート番号を設定画面で変更できる

##### Claude CLI登録コマンドのコピー
6. The system shall 設定画面に`claude mcp add`コマンドを表示する
7. The system shall コマンドにプロジェクトパスを含める（例: `claude mcp add sdd-orchestrator --url http://localhost:3001 --project /path/to/project`）
8. When コピーボタンがクリックされた場合、`claude mcp add`コマンドをクリップボードにコピーする

##### ステータス表示
9. The system shall ヘッダーまたはフッターにMCPサーバーの稼働状態インジケータを表示する
10. The system shall Remote UIではMCPサーバーのステータス表示のみを行う（設定変更はDesktop専用）

## Out of Scope

- stdioトランスポート方式のサポート（HTTP/SSEのみ）
- MCPのResources機能（Toolsのみ提供）
- マルチプロジェクト対応（1サーバー = 1プロジェクト）
- MCP経由でのプロジェクト切り替え
- 認証・認可機構（ローカル利用を想定）

## Open Questions

（すべて解決済み - Decision Logを参照）
