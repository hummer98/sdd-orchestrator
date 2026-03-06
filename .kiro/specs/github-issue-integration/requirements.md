# Requirements: GitHub Issue Integration

## Decision Log

### データソースとSSOT
- **Discussion**: Issueのワークフロー管理をローカルファイル（旧`.kiro/bugs/`）で行うか、GitHub APIをSSOTとするか
- **Conclusion**: GitHub API をSSOTとする。ローカルファイルでの二重管理は行わない
- **Rationale**: Issueは調査・議論・証跡といった会話型ワークフローであり、GitHubのIssue/PRが最適。ローカルファイルオリジンではマッチしない

### ワークフロー操作方式
- **Discussion**: すべてUI+API経由にするか、既存のSlash Commands駆動を維持するか
- **Conclusion**: ハイブリッド方式。UIはGitHub情報の可視化・GitHub固有操作に専念し、実作業（分析・修正・検証）はSlash Commandsで行う
- **Rationale**: Specワークフローと同じコマンド駆動の体験を維持。各フェーズで人間が判断を挟める。全UIにすると既存ワークフローから異質になる

### ステータス管理
- **Discussion**: Issue Stateのみ（Open/Closed）、GitHub Projects、Label
- **Conclusion**: GitHub Labelで管理。`status:` プレフィックス固定
- **Rationale**: GitHub UIでもSDD Orchestrator UIでも同じステータスが見える（SSOT）。API操作がシンプル

### GitHub APIスクリプト構成
- **Discussion**: 操作ごとに個別スクリプトか、1ファイルにまとめるか
- **Conclusion**: `scripts/gh-issue.sh` 1ファイル + サブコマンド形式
- **Rationale**: スクリプト分散を避ける。サブコマンド形式で拡張性を確保

### PRレビューUI
- **Discussion**: PRレビューコメント対応UIを作るか
- **Conclusion**: 不要。PR表示はdiff確認・マージ手段のみ
- **Rationale**: SDD Orchestrator内でInspection等により十分レビューされている前提。必要なら`issue-ask`で手動対応可能

### 既存Bugワークフロー
- **Discussion**: 既存Bug機能との共存か完全置換か
- **Conclusion**: 全廃止。UI、Store、tRPC、Service、CLI commands、templates、scriptsすべて削除
- **Rationale**: 使われていない機能を残す理由がない。Issue連携が上位互換

### CLIコマンド方針
- **Discussion**: Issue操作用CLIコマンドを新設するか
- **Conclusion**: `/kiro:issue-analyze`, `/kiro:issue-fix`, `/kiro:issue-verify`, `/kiro:issue-ask` を新設。旧`/kiro:bug-*`は全廃止
- **Rationale**: フェーズごとのゲート（人間レビュー）を維持するためコマンド駆動が必要

### Remote UI対応
- **Discussion**: この機能をRemote UIからも利用可能にするか
- **Conclusion**: 対応する
- **Rationale**: GitHub APIはMain processで実行されるため技術的に可能。リモートからのIssue確認・操作は有用

## Introduction

GitHub/GitHub Enterprise上のIssueおよびPull Requestと連携する新しいUIペインを導入する。既存のBugsペインを完全に置き換え、Issue一覧・詳細表示、ブランチ作成、AI実装、PR作成・マージの一気通貫ワークフローを提供する。データソースはGitHub API（SSOT）とし、実作業はSlash Commands経由で行い、UIはGitHub情報の可視化とGitHub固有操作に専念する。

## Requirements

### Requirement 1: GitHub認証・接続

**Objective:** ユーザーとして、GitHub/GitHub EnterpriseのPersonal Access Tokenを安全に設定・保存し、リポジトリに接続したい。

#### Acceptance Criteria
1. プロジェクト設定UIにGitHub PAT入力フィールドが存在すること
2. When PATが入力されたとき、the system shall Electron `safeStorage` APIを使用してOSキーチェーンにトークンを暗号化保存する
3. When GitHub Enterprise URLが入力されたとき、the system shall カスタムbaseURLでAPI接続を行う
4. When プロジェクトが選択されたとき、the system shall git remoteからGitHub owner/repoを自動検出する
5. If PATが無効または期限切れの場合、then the system shall 明確なエラーメッセージを表示し再設定を促す
6. The system shall 接続テスト機能を提供し、認証成功/失敗をUIに表示する

### Requirement 2: Issueペイン（旧Bugsペイン置換）

**Objective:** ユーザーとして、リポジトリのIssueをSDD Orchestrator上で一覧・詳細表示し、フィルタリングしたい。

#### Acceptance Criteria
1. The system shall 既存のBugsタブを「Issues」タブに置き換える
2. When Issuesタブが選択されたとき、the system shall リポジトリの全Open Issueを一覧表示する
3. The system shall Label、assignee、milestone等によるフィルタ機能を提供する
4. When Issueが選択されたとき、the system shall Issue本文、コメント、Label、assignee等の詳細を表示する
5. The system shall Issueのステータスを `status:` プレフィックス付きLabelで表示する
6. The system shall Issue一覧をポーリングまたは手動リフレッシュで最新状態に更新する

### Requirement 3: Issue作成

**Objective:** ユーザーとして、SDD Orchestrator UIからGitHub Issueを作成したい。

#### Acceptance Criteria
1. The system shall Spec作成と同様のインターフェースでIssue作成UIを提供する
2. When Issue作成が実行されたとき、the system shall GitHub APIでIssueを作成する
3. When Issue作成が成功したとき、the system shall `status:triage` Labelを自動付与する
4. The system shall タイトル、本文、Label、assigneeの入力をサポートする

### Requirement 4: ステータスLabel管理

**Objective:** システムとして、Issueのワークフローステータスを GitHub Labelで一元管理したい。

#### Acceptance Criteria
1. The system shall 以下の固定Label体系を使用する:
   - `status:triage` — 未着手・トリアージ待ち
   - `status:in-progress` — 実装中
   - `status:in-review` — PR作成済み
   - `status:changes-requested` — 修正要求あり
   - `status:done` — 完了
2. When Slash Commandでフェーズが進行したとき、the system shall 対応するLabelを自動更新する（旧Label削除 + 新Label付与）
3. If リポジトリに `status:*` Labelが存在しない場合、then the system shall 初回接続時に自動作成する

### Requirement 5: ブランチ作成・実装モード

**Objective:** ユーザーとして、Issueに対してWorktreeモードまたはダイレクトモードで実装を開始したい。

#### Acceptance Criteria
1. When Worktreeモードで実装開始されたとき、the system shall `issue/{number}-{slug}` 形式のブランチを自動作成する
2. When ダイレクトモードで実装開始されたとき、the system shall カレントブランチ上でそのまま修正を行う
3. The system shall 実装モードの選択UIを提供する
4. When ブランチが作成されたとき、the system shall Labelを `status:in-progress` に自動更新する

### Requirement 6: Slash Commands（Issue操作）

**Objective:** ユーザーとして、Slash Commandsで各フェーズの作業を指示し、人間レビューを挟みながら進めたい。

#### Acceptance Criteria
1. The system shall 以下のSlash Commandsを提供する:
   - `/kiro:issue-analyze [number]` — Issue内容を読み込み原因分析を実行
   - `/kiro:issue-fix [number]` — 分析結果に基づき修正を実行
   - `/kiro:issue-verify [number]` — 修正の検証を実行
   - `/kiro:issue-ask [number] "prompt"` — 任意プロンプトをIssueコンテキスト付きで実行
2. When Slash Commandが実行されたとき、the system shall `scripts/gh-issue.sh` 経由でIssue本文・コメントを取得しコンテキストとして注入する
3. When Slash Commandが完了したとき、the system shall 実行結果サマリーをIssueコメントとして自動投稿する
4. When Slash Commandが完了したとき、the system shall 対応する `status:*` Labelを自動更新する
5. The system shall 旧 `/kiro:bug-*` コマンド群を全廃止する

### Requirement 7: GitHub APIスクリプト

**Objective:** Slash Commandsから呼び出し可能な、GitHub API操作の統一スクリプトを提供したい。

#### Acceptance Criteria
1. The system shall `scripts/gh-issue.sh` を単一エントリポイントとして提供する
2. The system shall 以下のサブコマンドをサポートする:
   - `read <number>` — Issue本文+コメント取得
   - `comment <number> <body>` — コメント投稿
   - `label <number> <action> <label>` — Label追加/削除
   - `list [--state open|closed] [--label ...]` — 一覧取得
   - `create <title> <body>` — Issue作成
3. The system shall PATを環境変数 `GITHUB_TOKEN` から取得し、未設定時は `gh auth status` でフォールバックする
4. The system shall GitHub Enterprise URLに対応する（カスタムbaseURL）
5. The system shall git remote から owner/repo を自動検出する

### Requirement 8: Pull Request連携

**Objective:** ユーザーとして、Issue起点のPull Requestを作成し、diff確認・マージを行いたい。

#### Acceptance Criteria
1. When Worktreeモードの実装完了後、the system shall `Closes #{number}` を含むPR descriptionでPull Requestを自動作成する
2. The system shall PR一覧をIssueペイン内に表示する
3. When PRが選択されたとき、the system shall 変更diff、CIステータスを表示する
4. The system shall UIからPRのマージ操作を提供する
5. When PRがマージされたとき、the system shall 関連IssueのLabelを `status:done` に更新する

### Requirement 9: Agent連携

**Objective:** システムとして、Issue内容をAgentに渡し、実行結果をIssueに記録したい。

#### Acceptance Criteria
1. When Agent実行時にIssueが選択されているとき、the system shall Issue本文+コメントをAgentのコンテキストに自動注入する
2. When Agent実行が完了したとき、the system shall 実行サマリーをIssueコメントとして自動投稿する
3. The system shall 既存のAgent起動UIを使用し、Issueコンテキスト注入を追加する形式とする
4. While Agent実行中、the system shall 対応IssueのLabelを `status:in-progress` に維持する

### Requirement 10: 既存Bugワークフロー廃止

**Objective:** 既存のBugsペインおよび関連コンポーネントを完全に削除し、Issue連携に置き換えたい。

#### Acceptance Criteria
1. The system shall 以下のRendererコンポーネントを削除する: BugPane, BugList, BugWorkflowView, BugListItem
2. The system shall 以下のStoreを削除する: useSharedBugStore, useBugAutoExecutionStore
3. The system shall Bug tRPCルーター（12プロシージャ）を削除する
4. The system shall Main Processサービスを削除する: BugService, BugsWatcherService, watcherUtils内のBugs部分
5. The system shall CLIコマンドを削除する: bug-create, bug-analyze, bug-fix, bug-verify, bug-status, bug-merge
6. The system shall テンプレートを削除する: `.kiro/settings/templates/bugs/`
7. The system shall スクリプトを削除する: `create-bug-worktree.sh`, `merge-bug.sh`
8. The system shall `.kiro/sdd-orchestrator.json` のbugプリセットエントリを削除する
9. The system shall CLAUDE.mdのBug Fix (Lightweight Workflow) セクションを削除し、Issue連携の説明に置き換える
10. The system shall 型定義を削除する: bug.ts, bugJson.ts, bugAutoExecution.ts

### Requirement 11: Remote UI対応

**Objective:** Remote UIからもIssue/PR機能を利用可能にしたい。

#### Acceptance Criteria
1. The system shall Issue一覧・詳細表示をRemote UIのDesktopLayoutで提供する
2. The system shall Remote UIからIssueの閲覧・フィルタリングを可能にする
3. The system shall Remote UIからのIssue作成を可能にする
4. The system shall Remote UIのDesktopLayoutをElectron版と同等のレイアウトに準拠させる
5. The system shall WebSocketApiClient経由でIssue/PR APIを呼び出す

### Requirement 12: プロジェクト設定

**Objective:** ユーザーとして、プロジェクトごとにGitHub連携設定を管理したい。

#### Acceptance Criteria
1. The system shall ProjectPaneにGitHub連携設定セクションを追加する
2. The system shall PAT設定、GitHub Enterprise URL設定のUIを提供する
3. When プロジェクトが選択されたとき、the system shall git remoteからGitHub owner/repoを自動検出し表示する
4. The system shall 接続ステータス（未設定/接続済み/エラー）をUIに表示する

## Out of Scope

- GitHub Projectsとの連携（カンバンボード等）
- PRレビューコメント対応UI（inspection + issue-askで代替）
- GitHub Actions / CI設定・管理
- 複数リポジトリの同時管理
- OAuth / GitHub App認証
- Labelカスタマイズ（`status:` プレフィックスは固定）
- Issueテンプレート管理
- GitHub Discussions連携

## Open Questions

- ダイレクトモードでの実装時、PR作成は任意とするか、完了時に自動提案するか

## Resolved Questions

- `scripts/gh-issue.sh` は `gh` CLI依存にするか → **`gh` CLI使用**（Design Decision DD-005）。UIからの操作はNode.js直接HTTPを使用し、`gh` CLI非依存
- Issueリストのポーリング間隔 → **60秒ポーリング + 手動リフレッシュ**（design.md issueStore定義）
