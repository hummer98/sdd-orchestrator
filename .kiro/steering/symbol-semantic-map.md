# Symbol-Semantic Map

コード上のシンボルと仕様・ドメイン概念の対応表。AIとの認識ズレを防ぎ、一貫したコミュニケーションを実現する。

## Core Domain Concepts（ドメイン概念）

### Project（プロジェクト）

| 属性 | 定義 |
|-----|------|
| **定義** | SDDワークフローを適用する対象のコードベース。ローカルまたはSSH経由のリモートディレクトリ |
| **識別子** | ディレクトリパス（例: `/Users/yamamoto/git/my-app`） |
| **構成要素** | `.kiro/` ディレクトリ（steering, specs, bugs）を含む |
| **コードシンボル** | `currentProject`, `projectPath`, `ProjectState` |
| **Store** | `projectStore.ts` |

### Spec / Specification（仕様）

| 属性 | 定義 |
|-----|------|
| **定義** | 1つの機能に対するSDD文書のセット。Requirements, Design, Tasksの3つのアーティファクトで構成 |
| **別名** | Feature（機能）と1:1対応 |
| **識別子** | Feature名（例: `user-authentication`）、`.kiro/specs/{feature-name}/` に格納 |
| **ライフサイクル** | `initialized` → `requirements-generated` → `design-generated` → `tasks-generated` → `implementation-complete` → `inspection-complete` → `deploy-complete` |
| **コードシンボル** | `Spec`, `SpecMetadata`, `SpecDetail`, `SpecJson`, `SpecPhase` |
| **Store** | `specStore.ts` |
| **Service** | `specManagerService.ts` |

### Artifact（アーティファクト）

| 属性 | 定義 |
|-----|------|
| **定義** | Specを構成する個別の文書ファイル |
| **種類** | `requirements.md`, `design.md`, `tasks.md`, `research.md`（オプショナル） |
| **コードシンボル** | `ArtifactInfo`, `artifacts` |

### Phase（フェーズ）

| 属性 | 定義 |
|-----|------|
| **定義** | SDDワークフローの各段階 |
| **SDD Phase** | `requirements` → `design` → `tasks` → `impl` → `inspection` → `deploy` |
| **Phase Status** | `pending`（未着手）, `generated`（生成済）, `approved`（承認済） |
| **コードシンボル** | `WorkflowPhase`, `PhaseStatus`, `Phase` |

### Steering（ステアリング）

| 属性 | 定義 |
|-----|------|
| **定義** | プロジェクト全体に適用されるAIへのガイダンス。プロジェクトメモリとして機能 |
| **格納場所** | `.kiro/steering/` |
| **デフォルトファイル** | `product.md`, `tech.md`, `structure.md` |
| **コードシンボル** | `SteeringFile`, `hasSteering` |

### Bug（バグ）

| 属性 | 定義 |
|-----|------|
| **定義** | 軽量バグ修正ワークフローの対象。フルSDDプロセス不要な小規模修正 |
| **格納場所** | `.kiro/bugs/{bug-name}/` |
| **ライフサイクル** | `reported` → `analyzed` → `fixed` → `verified` |
| **アーティファクト** | `report.md`, `analysis.md`, `fix.md`, `verification.md` |
| **コードシンボル** | `Bug`, `BugMetadata`, `BugDetail`, `BugPhase`, `BugAction` |
| **Store** | `bugStore.ts` |
| **Service** | `bugService.ts` |

### Agent（エージェント）

| 属性 | 定義 |
|-----|------|
| **定義** | SDDコマンドを実行するAIプロセス（Claude Code等） |
| **種類** | Spec Agent（Spec単位）、Global Agent（プロジェクト横断） |
| **コードシンボル** | `AgentProcess`, `AgentRecord`, `AgentRegistry` |
| **Store** | `agentStore.ts`（暗黙）, `executionStore.ts` |
| **Service** | `agentProcess.ts`, `agentRegistry.ts` |

### Document Review（ドキュメントレビュー）

| 属性 | 定義 |
|-----|------|
| **定義** | Spec文書の整合性チェックと課題追跡・解決ワークフロー |
| **ラウンド** | レビュー→回答のサイクル。複数ラウンド可能 |
| **コードシンボル** | `DocumentReview`, `ReviewRound`, `ReviewIssue` |
| **Service** | `documentReviewService.ts` |

---

## UI Component Mapping（UIコンポーネント対応表）

### メイン画面構成

| 画面エリア | 役割 | コンポーネント | パス |
|-----------|------|---------------|------|
| プロジェクト選択 | 管理対象プロジェクトの選択・切替 | `ProjectSelector` | `components/ProjectSelector.tsx` |
| Spec一覧 | Spec/Bugの一覧表示・選択 | `SpecList`, `BugList` | `components/SpecList.tsx`, `components/BugList.tsx` |
| ワークフロービュー | SDDフェーズの進捗表示・操作 | `WorkflowView` | `components/WorkflowView.tsx` |
| ドキュメントタブ | アーティファクトのプレビュー・編集 | `DocsTabs`, `ArtifactEditor` | `components/DocsTabs.tsx` |
| ログパネル | Agent出力のリアルタイム表示 | `LogPanel`, `AgentLogPanel` | `components/LogPanel.tsx` |

### 操作系コンポーネント

| 概念 | 役割 | コンポーネント |
|-----|------|---------------|
| フェーズ実行 | 各フェーズのコマンド実行 | `PhaseExecutionPanel`, `PhaseItem` |
| 承認操作 | アーティファクトの承認/却下 | `ApprovalPanel`, `RejectDialog` |
| バリデーション | validate-gap/design/impl実行 | `ValidateOption` |
| Spec作成 | 新規Spec初期化 | `CreateSpecDialog` |
| Bug作成 | 新規Bugレポート作成 | `CreateBugDialog` |
| Bugアクション | analyze/fix/verify実行 | `BugActionButtons` |
| Bugワークフロー | Bug修正の5フェーズ表示・操作 | `BugWorkflowView`, `BugPhaseItem` |
| Bugドキュメント | Bugアーティファクトのタブ表示 | `BugArtifactEditor` |

### 状態表示コンポーネント

| 概念 | 役割 | コンポーネント |
|-----|------|---------------|
| タスク進捗 | tasks.mdのタスク完了率 | `TaskProgressView` |
| Bug進捗 | Bugワークフロー進捗 | `BugProgressIndicator` |
| SSH接続状態 | リモート接続状態 | `SSHStatusIndicator` |
| Agent一覧 | 実行中/完了Agentの表示 | `AgentListPanel` |

---

## Store Mapping（状態管理対応表）

| ドメイン | Store | 主な状態 |
|---------|-------|---------|
| プロジェクト | `projectStore` | `currentProject`, `recentProjects`, `kiroValidation` |
| Spec | `specStore` | `specs`, `selectedSpec`, `specDetail`, `specManagerExecution` |
| Bug | `bugStore` | `bugs`, `selectedBug`, `bugDetail` |
| Agent実行 | `executionStore` | `isRunning`, `logs`, `currentCommand` |
| ワークフロー | `workflowStore` | ワークフロー状態 |
| エディタ | `editorStore` | `content`, `isDirty`, `currentArtifact` |
| 通知 | `notificationStore` | `notifications` |
| SSH接続 | `connectionStore` | `isConnected`, `remoteHost` |

---

## Service Mapping（サービス対応表）

| ドメイン | Service | 責務 |
|---------|---------|------|
| Spec管理 | `specManagerService` | Spec CRUD、フェーズ遷移 |
| Bug管理 | `bugService` | Bug CRUD、フェーズ判定 |
| Agent実行 | `agentProcess` | Agentプロセス起動・監視 |
| Agent登録 | `agentRegistry` | 実行中Agent管理 |
| ファイル操作 | `fileService` | ファイル読み書き |
| コマンド実行 | `commandService` | CLIコマンド実行 |
| ドキュメントレビュー | `documentReviewService` | レビューラウンド管理 |
| SSH | `ssh/sshConnectionService` | SSH接続管理 |
| ログ | `logParserService`, `logBuffer` | Agent出力解析・バッファリング |

---

## Terminology Clarification（用語の明確化）

### 紛らわしい用語

| 用語 | 文脈 | 意味 |
|-----|------|------|
| **Task** (SDD) | `tasks.md` 内 | Specの実装タスク（チェックリスト形式） |
| **Task** (Todo) | TodoWriteツール | AIの作業追跡用タスク |
| **Phase** (Workflow) | SDDワークフロー | requirements/design/tasks/impl/inspection/deploy |
| **Phase** (Spec) | SpecPhase型 | Specの状態（initialized, requirements-generated, ...） |
| **Feature** | Spec名 | 機能名。Specと1:1対応 |
| **Project** | SDD Orchestrator | 管理対象のコードベース |
| **Project** | 一般 | 開発プロジェクト全体を指すこともある |

### コマンドプレフィックス

| プレフィックス | 用途 |
|---------------|------|
| `/kiro:*` | Kiro互換SDDコマンド（デフォルト） |
| `/spec-manager:*` | spec-manager互換コマンド |

---

---

## SpecPhase Values（Specフェーズ値の詳細）

`SpecPhase` 型は以下の値を持つ：

| 値 | 意味 | 遷移条件 |
|---|------|---------|
| `initialized` | 初期化済み | spec-initで作成時 |
| `requirements-generated` | 要件定義生成済み | requirements.md生成後 |
| `design-generated` | 設計生成済み | design.md生成後 |
| `tasks-generated` | タスク生成済み | tasks.md生成後 |
| `implementation-complete` | 実装完了 | 全タスク完了時（自動検出） |
| `inspection-complete` | 検査完了 | InspectionでGO判定時（自動検出） |
| `deploy-complete` | デプロイ完了 | deploy_completed: true設定時（自動検出） |

**自動検出の仕組み**: `SpecsWatcherService` がファイル変更を監視し、以下のタイミングでphaseを自動更新：
- `tasks.md` 変更時: 全タスク完了で `implementation-complete` に遷移
- `spec.json` 変更時:
  - `inspection.roundDetails[-1].passed: true` で `inspection-complete` に遷移
  - `deploy_completed: true` で `deploy-complete` に遷移

---

_updated_at: 2026-01-04_
