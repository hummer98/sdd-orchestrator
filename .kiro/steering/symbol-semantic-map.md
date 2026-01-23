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
| **コードシンボル** | `Spec`, `SpecMetadata`, `SpecMetadataWithPhase`, `SpecDetail`, `SpecJson`, `SpecPhase` |
| **Store** | `specStore.ts`, `specListStore.ts`, `specDetailStore.ts`, `specStoreFacade.ts` |
| **Service** | `specManagerService.ts`, `specsWatcherService.ts`, `specWatcherService.ts`, `specSyncService.ts` |

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
| **Store** | `bugStore.ts`, `bugAutoExecutionStore.ts` |
| **Service** | `bugService.ts`, `bugWorkflowService.ts`, `bugsWatcherService.ts`, `convertBugWorktreeService.ts` |

### Agent（エージェント）

| 属性 | 定義 |
|-----|------|
| **定義** | SDDコマンドを実行するAIプロセス（Claude Code等） |
| **種類** | Spec Agent（Spec単位）、Global Agent（プロジェクト横断） |
| **コードシンボル** | `AgentProcess`, `AgentRecord`, `AgentRegistry` |
| **Store** | `agentStore.ts`, `agentStoreAdapter.ts`, `executionStore.ts` |
| **Service** | `agentProcess.ts`, `agentRegistry.ts`, `agentRecordService.ts`, `agentRecordWatcherService.ts` |

### Document Review（ドキュメントレビュー）

| 属性 | 定義 |
|-----|------|
| **定義** | Spec文書の整合性チェックと課題追跡・解決ワークフロー |
| **ラウンド** | レビュー→回答のサイクル。複数ラウンド可能 |
| **Scheme** | レビュー方式（`ai-reviewer`, `self-check` 等） |
| **コードシンボル** | `DocumentReview`, `DocumentReviewState`, `ReviewRound`, `ReviewIssue`, `ReviewerScheme` |
| **Service** | `documentReviewService.ts` |

### Auto Execution（自動実行）

| 属性 | 定義 |
|-----|------|
| **定義** | ワークフローフェーズを連続的に自動実行する機能 |
| **対象** | Spec（requirements→deploy）、Bug（analyze→fix→verify） |
| **ステータス** | `idle`, `running`, `paused`, `completing`, `error`, `completed` |
| **コードシンボル** | `AutoExecutionStatus`, `BugAutoExecutionStatus`, `AutoExecutionEventData` |
| **Store** | `autoExecutionStore.ts`（Spec用）, `bugAutoExecutionStore.ts`（Bug用） |
| **コンポーネント** | `AutoExecutionStatusDisplay`, `BugAutoExecutionStatusDisplay` |

### Parallel Execution（並列実行）

| 属性 | 定義 |
|-----|------|
| **定義** | 独立したタスクを複数のAgentで並列実行する機能 |
| **対象** | tasks.md内の `[parallel]` マーカー付きタスク |
| **コードシンボル** | `ParallelModeState`, `CachedParseResult` |
| **Store** | `parallelModeStore.ts` |
| **Service** | `parallelImplService.ts` |
| **コンポーネント** | `ParallelModeToggle`, `ImplPhasePanel` |

### Worktree（ワークツリー）

| 属性 | 定義 |
|-----|------|
| **定義** | Git Worktreeを使った分離された実装環境 |
| **用途** | mainブランチを汚さずにSpec/Bug実装を行う |
| **設定** | `spec.json` の `worktree` フィールド（`path`, `branch`, `created_at`, `enabled`） |
| **コードシンボル** | `WorktreeConfig`, `WithWorktree`, `hasWorktreePath`, `isImplStarted` |
| **Service** | `worktreeService.ts`, `convertWorktreeService.ts`, `convertBugWorktreeService.ts` |

### Event Log（イベントログ）

| 属性 | 定義 |
|-----|------|
| **定義** | Spec-levelのアクティビティ履歴（Agent実行、承認、フェーズ遷移等） |
| **格納場所** | `.kiro/specs/{feature-name}/events.jsonl` |
| **イベント種別** | `agent:*`, `auto-execution:*`, `approval:update`, `worktree:*`, `phase:transition`, `review:*`, `inspection:*` |
| **コードシンボル** | `EventType`, `EventLogEntry`, `EventLogInput`, `EventLogError` |
| **Service** | `eventLogService.ts` |
| **コンポーネント** | `EventLogViewerModal`, `EventLogListItem`, `EventLogButton` |

### Metrics（メトリクス）

| 属性 | 定義 |
|-----|------|
| **定義** | Spec/Project単位の開発時間・コスト追跡 |
| **追跡対象** | AI時間、Human時間、フェーズ別時間 |
| **コードシンボル** | `SpecMetrics`, `ProjectMetrics`, `PhaseMetrics` |
| **Store** | `metricsStore.ts` |
| **Service** | `metricsService.ts` |
| **コンポーネント** | `MetricsSummaryPanel`, `PhaseMetricsView`, `ProjectMetricsSummary` |

### Remote Access / Remote UI（リモートアクセス）

| 属性 | 定義 |
|-----|------|
| **定義** | モバイル等からElectronアプリをリモート操作する機能 |
| **構成** | HTTP/WebSocketサーバー、React Remote UI、Cloudflare Tunnel統合 |
| **コードシンボル** | `RemoteAccessState`, `TunnelStatus` |
| **Store** | `remoteAccessStore.ts` |
| **コンポーネント** | `RemoteAccessPanel`, `RemoteAccessDialog`, `CloudflareSettingsPanel`, `InstallCloudflaredDialog` |
| **Remote UIパス** | `electron-sdd-manager/src/remote-ui/` |

---

## Screen Layout Diagrams（画面レイアウト図）

### Electron Desktop App

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Header                                                                        │
│ ┌────────────────────────────────────────────────────────────────────────────┤
│ │ SDD Orchestrator / {ProjectName} [ProfileBadge] / {SpecName}    [⚙][VSCode]│
│ │                                                            SSHStatusIndicator│
└──────────────────────────────────────────────────────────────────────────────┘
┌─────────────────┬────────────────────────────────────────┬───────────────────┐
│ Left Sidebar    │ Main Area                              │ Right Sidebar     │
│ (leftPaneWidth) │ (flex-1)                               │ (rightPaneWidth)  │
│ 200-500px       │                                        │ 250-500px         │
├─────────────────┤                                        ├───────────────────┤
│ ProjectValida-  │ ┌────────────────────────────────────┐ │ AgentListPanel    │
│ tionPanel       │ │                                    │ │ (agentListHeight) │
├─────────────────┤ │                                    │ │ ┌───────────────┐ │
│ ErrorBanner     │ │  SpecPane / BugPane                │ │ │ AgentList     │ │
├─────────────────┤ │  ├─────────────────────────────────┤ │ │               │ │
│ DocsTabs        │ │  │ ArtifactEditor /                │ │ └───────────────┘ │
│ ┌─────┬───────┐ │ │  │ ArtifactPreview                 │ │===================│
│ │Specs│ Bugs  │ │ │  │                                 │ │ WorkflowView      │
│ └─────┴───────┘ │ │  │                                 │ │ ┌───────────────┐ │
├─────────────────┤ │  │                                 │ │ │ PhaseItem     │ │
│ SpecList /      │ │  │                                 │ │ │ (requirements)│ │
│ BugList         │ │  │                                 │ │ ├───────────────┤ │
│ ┌─────────────┐ │ │  │                                 │ │ │ PhaseItem     │ │
│ │ SpecListItem│ │ │  │                                 │ │ │ (design)      │ │
│ │             │ │ │  │                                 │ │ ├───────────────┤ │
│ │ BugListItem │ │ │  │                                 │ │ │ ...           │ │
│ └─────────────┘ │ │  │                                 │ │ └───────────────┘ │
│                 │ │  │                                 │ │ ImplPhasePanel    │
│                 │ │  │                                 │ │ TaskProgressView  │
│                 │ │  │                                 │ │ DocumentReview-   │
│                 │ │  │                                 │ │ Panel             │
│                 │ │  │                                 │ │ InspectionPanel   │
│=================│ │  └─────────────────────────────────┤ ├───────────────────┤
│ ProjectAgent-   │ └────────────────────────────────────┘ │ SpecWorkflow-     │
│ Panel           │                                        │ Footer            │
│ ┌─────────────┐ │                                        │ [自動実行]        │
│ │ AgentList   │ │                                        │                   │
│ └─────────────┘ │                                        │                   │
└─────────────────┴────────────────────────────────────────┴───────────────────┘
┌──────────────────────────────────────────────────────────────────────────────┐
│ Bottom Panel (bottomPaneHeight, 100px~)                                       │
│ ┌────────────────────────────────────────────────────────────────────────────┤
│ │ AgentLogPanel                                                              │
│ │ ┌──────────────────────────────────────────────────────────────────────────┤
│ │ │ LogEntryBlock, ToolUseBlock, ToolResultBlock, TextBlock...               │
│ │ └──────────────────────────────────────────────────────────────────────────┤
│ ├────────────────────────────────────────────────────────────────────────────┤
│ │ AgentInputPanel                                                            │
│ └────────────────────────────────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────────────────────────────┘
```

**主要コンポーネント対応:**
| エリア | コンポーネント | Store |
|-------|---------------|-------|
| Header | `App.tsx` (inline) | `projectStore`, `specStore` |
| Left Sidebar | `DocsTabs`, `SpecList`, `BugList`, `ProjectAgentPanel` | `specStore`, `bugStore`, `agentStore` |
| Main Area | `SpecPane`, `BugPane`, `ArtifactEditor` | `specStore`, `editorStore` |
| Right Sidebar | `AgentListPanel`, `WorkflowViewCore`, `PhaseItem` | `agentStore`, `workflowStore`, `autoExecutionStore` |
| Bottom | `AgentLogPanel`, `AgentInputPanel` | `executionStore` |

---

### Remote UI - Desktop/Tablet

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ DesktopLayout Header                                                          │
│ ┌────────────────────────────────────────────────────────────────────────────┤
│ │ SDD Orchestrator / {ProjectName} [ProfileBadge]              [接続状態]    │
└──────────────────────────────────────────────────────────────────────────────┘
┌─────────────────┬────────────────────────────────────────┬───────────────────┐
│ LeftSidebar     │ MainPanel                              │ RightSidebar      │
├─────────────────┤                                        ├───────────────────┤
│ ┌─────┬───────┐ │ ┌────────────────────────────────────┐ │ Agent一覧         │
│ │Specs│ Bugs  │+│ │                                    │ │ (agentListHeight) │
│ └─────┴───────┘ │ │  RemoteArtifactEditor              │ │ ┌───────────────┐ │
├─────────────────┤ │  (Spec選択時)                      │ │ │ AgentList     │ │
│ SpecsView /     │ │                                    │ │ └───────────────┘ │
│ BugsView        │ │  or                                │ │===================│
│ ┌─────────────┐ │ │                                    │ │ RemoteWorkflow-   │
│ │ SpecListItem│ │ │  BugDetailView                     │ │ View              │
│ │             │ │ │  (Bug選択時)                       │ │ ┌───────────────┐ │
│ │ BugListItem │ │ │                                    │ │ │ PhaseItem     │ │
│ └─────────────┘ │ │                                    │ │ │ (各フェーズ)  │ │
│                 │ │                                    │ │ └───────────────┘ │
│=================│ │                                    │ ├───────────────────┤
│ ProjectAgent-   │ │                                    │ │ SpecWorkflow-     │
│ Panel           │ │                                    │ │ Footer            │
│ [Ask] AgentList │ │                                    │ │ [自動実行]        │
└─────────────────┴────────────────────────────────────────┴───────────────────┘
┌──────────────────────────────────────────────────────────────────────────────┐
│ Footer (FooterContent)                                                        │
│ Agent logs will be displayed here... (TODO)                                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Remote UI専用コンポーネント:**
| エリア | コンポーネント | 備考 |
|-------|---------------|------|
| Root | `DesktopLayout` | `remote-ui/layouts/` |
| Left | `LeftSidebar`, `SpecsView`, `BugsView` | `remote-ui/views/` |
| Main | `MainPanel`, `RemoteArtifactEditor` | `remote-ui/components/` |
| Right | `RightSidebar`, `RemoteWorkflowView` | `remote-ui/views/` |
| Dialog | `CreateSpecDialogRemote`, `CreateBugDialogRemote` | `remote-ui/components/` |

---

### Remote UI - Smartphone (MobileLayout)

```
┌───────────────────────────┐
│ MobileLayout Header       │
│ SDD Orchestrator          │
├───────────────────────────┤
│                           │
│  Content Area             │
│  (activeTabに応じて切替)  │
│                           │
│  ┌─────────────────────┐  │
│  │ SpecsView           │  │   ← Specsタブ: 一覧
│  │ ┌─────────────────┐ │  │
│  │ │ SpecListItem    │ │  │
│  │ │ SpecListItem    │ │  │
│  │ └─────────────────┘ │  │
│  │                     │  │
│  │ or                  │  │
│  │                     │  │
│  │ SpecDetailView     │  │   ← Spec選択時: 詳細
│  │ + RemoteWorkflow-  │  │
│  │   View             │  │
│  └─────────────────────┘  │
│                           │
│                       [+] │  ← FAB (CreateSpec/Bug)
├───────────────────────────┤
│ Bottom Tab Navigation     │
│ ┌─────┬─────┬─────┬─────┐ │
│ │Specs│Bugs │Agent│Proj │ │
│ └─────┴─────┴─────┴─────┘ │
└───────────────────────────┘
```

**タブ別コンテンツ:**
| タブ | 一覧時 | 詳細時 |
|-----|-------|-------|
| Specs | `SpecsView` | `SpecDetailView` + `RemoteWorkflowView` |
| Bugs | `BugsView` | `BugDetailView` |
| Agent | `AgentView` | - |
| Project | `ProjectAgentView` | - |

**スマートフォン専用UI:**
- FAB (Floating Action Button): 右下固定、新規作成
- MobileLayout: 下部タブナビゲーション
- 一覧→詳細の画面遷移（戻るボタン付き）

---

## UI Component Mapping（UIコンポーネント対応表）

### アーキテクチャ

```
electron-sdd-manager/src/
├── renderer/components/   # Electron専用コンポーネント
├── shared/components/     # Electron/Remote UI共通コンポーネント
│   ├── agent/            # Agent関連（AgentLogPanel, LogEntryBlock等）
│   ├── bug/              # Bug関連（BugListItem）
│   ├── eventLog/         # イベントログ関連
│   ├── execution/        # 自動実行関連
│   ├── metrics/          # メトリクス表示
│   ├── project/          # プロジェクト関連（AskAgentDialog, SteeringSection）
│   ├── review/           # レビュー・Inspection関連
│   ├── spec/             # Spec一覧関連
│   ├── ui/               # 汎用UI（Button, Modal, Spinner等）
│   └── workflow/         # ワークフロー関連
└── remote-ui/components/ # Remote UI専用コンポーネント
```

### メイン画面構成

| 画面エリア | 役割 | コンポーネント | パス |
|-----------|------|---------------|------|
| プロジェクト選択 | 管理対象プロジェクトの選択・切替 | `ProjectSelectionView`, `RecentProjectList` | `renderer/components/` |
| Spec一覧 | Spec/Bugの一覧表示・選択 | `SpecList`, `SpecListItem`, `BugList`, `BugListItem` | `renderer/`, `shared/components/` |
| ワークフロービュー | SDDフェーズの進捗表示・操作 | `WorkflowViewCore`, `ElectronWorkflowView` | `shared/components/workflow/` |
| ドキュメントタブ | アーティファクトのプレビュー・編集 | `DocsTabs`, `ArtifactEditor`, `ArtifactPreview` | `renderer/components/` |
| ログパネル | Agent出力のリアルタイム表示 | `AgentLogPanel`, `LogEntryBlock`, `ToolUseBlock`, `ToolResultBlock` | `shared/components/agent/` |
| メトリクス表示 | 開発時間・コスト表示 | `MetricsSummaryPanel`, `PhaseMetricsView` | `shared/components/metrics/` |
| イベントログ | Spec活動履歴 | `EventLogViewerModal`, `EventLogButton` | `shared/components/eventLog/` |

### 操作系コンポーネント

| 概念 | 役割 | コンポーネント |
|-----|------|---------------|
| フェーズ実行 | 各フェーズのコマンド実行 | `PhaseItem`, `ImplPhasePanel` |
| 承認操作 | アーティファクトの承認/却下 | `ApprovalPanel`, `RejectDialog` |
| バリデーション | validate-gap/design/impl実行 | `ValidateOption` |
| Spec作成 | 新規Spec初期化 | `CreateSpecDialog`, `CreateSpecDialogRemote` |
| Bug作成 | 新規Bugレポート作成 | `CreateBugDialog`, `CreateBugDialogRemote` |
| Bugアクション | analyze/fix/verify実行 | `BugActionButtons` |
| Bugワークフロー | Bug修正フェーズ表示・操作 | `BugWorkflowView`, `BugPhaseItem`, `BugWorkflowFooter` |
| Specワークフローフッター | 自動実行ボタン等のワークフロー全体操作 | `SpecWorkflowFooter` |
| 並列実行 | 並列モード切替・実行 | `ParallelModeToggle` |
| リモートアクセス | サーバー起動・QRコード表示 | `RemoteAccessPanel`, `RemoteAccessDialog` |
| ドキュメントレビュー | レビュー操作・結果表示 | `DocumentReviewPanel`, `SchemeSelector` |
| Inspection | Inspection操作・結果表示 | `InspectionPanel` |

### 状態表示コンポーネント

| 概念 | 役割 | コンポーネント |
|-----|------|---------------|
| タスク進捗 | tasks.mdのタスク完了率 | `TaskProgressView` |
| Bug進捗 | Bugワークフロー進捗 | `BugProgressIndicator` |
| 自動実行状態 | AutoExecution進捗表示 | `AutoExecutionStatusDisplay`, `BugAutoExecutionStatusDisplay` |
| SSH接続状態 | リモート接続状態 | `SSHStatusIndicator` |
| Agent一覧 | 実行中/完了Agentの表示 | `AgentListPanel`, `AgentList`, `AgentListItem` |
| プロジェクトメトリクス | プロジェクト全体のメトリクス | `ProjectMetricsSummary` |
| バージョン状態 | アプリバージョン・更新通知 | `UpdateBanner`, `versionStatusStore` |

---

## Store Mapping（状態管理対応表）

### renderer/stores/（Electron専用）

| ドメイン | Store | 主な状態 |
|---------|-------|---------|
| プロジェクト | `projectStore` | `currentProject`, `recentProjects`, `kiroValidation` |
| Spec一覧 | `specStore`, `specListStore` | `specs`, `selectedSpec`, `sortBy`, `statusFilter` |
| Spec詳細 | `specDetailStore` | `specDetail`, `isLoading` |
| Spec統合 | `specStoreFacade` | 一覧+詳細の統合アクセス |
| Bug | `bugStore` | `bugs`, `selectedBug`, `bugDetail` |
| Agent | `agentStore`, `agentStoreAdapter` | `agents`, `selectedAgentId` |
| 自動実行 | `autoExecutionStore` | `status`, `currentPhase`, `permissions` |
| ワークフロー | `workflowStore` | ワークフロー状態 |
| エディタ | `editorStore` | `content`, `isDirty`, `currentArtifact` |
| 通知 | `notificationStore` | `notifications` |
| SSH接続 | `connectionStore` | `isConnected`, `remoteHost` |
| リモートアクセス | `remoteAccessStore` | `isRunning`, `url`, `tunnelUrl`, `clientCount` |
| メトリクス | `metricsStore` | `currentMetrics`, `projectMetrics` |
| バージョン | `versionStatusStore` | `currentVersion`, `latestVersion`, `updateAvailable` |

### shared/stores/（Electron + Remote UI共通）

| ドメイン | Store | 主な状態 |
|---------|-------|---------|
| Agent | `agentStore` | Remote UI用Agent状態 |
| Bug | `bugStore` | Remote UI用Bug状態 |
| Bug自動実行 | `bugAutoExecutionStore` | `status`, `currentPhase`, `permissions` |
| 並列モード | `parallelModeStore` | `parallelModeEnabled`, `parseResults` |
| Spec | `specStore` | Remote UI用Spec状態 |
| Agent実行 | `executionStore` | `isRunning`, `logs`, `currentCommand` |

### main/services/（Main Process設定Store）

| ドメイン | Store | 用途 |
|---------|-------|------|
| アプリ設定 | `configStore` | 永続化設定（electron-store） |
| Cloudflare設定 | `cloudflareConfigStore` | Tunnel Token等 |

---

## Service Mapping（サービス対応表）

### main/services/（Main Process）

| ドメイン | Service | 責務 |
|---------|---------|------|
| Spec管理 | `specManagerService` | Spec CRUD、フェーズ遷移 |
| Spec監視 | `specsWatcherService` | `.kiro/specs/` ファイル変更監視、phase自動更新 |
| Bug管理 | `bugService` | Bug CRUD、フェーズ判定 |
| Bugワークフロー | `bugWorkflowService` | Bug自動実行フロー管理 |
| Bug監視 | `bugsWatcherService` | `.kiro/bugs/` ファイル変更監視 |
| Agent実行 | `agentProcess` | Agentプロセス起動・監視 |
| Agent登録 | `agentRegistry` | 実行中Agent管理 |
| Agentレコード | `agentRecordService`, `agentRecordWatcherService` | Agent実行履歴管理・監視 |
| ファイル操作 | `fileService` | ファイル読み書き |
| ログ | `logParserService`, `logFileService`, `loggingService` | Agent出力解析、ログファイル管理 |
| ドキュメントレビュー | `documentReviewService` | レビューラウンド管理 |
| SSH | `sshConnectionService`, `sshAuthService`, `remoteAgentService` | SSH接続・認証・リモートAgent |
| Worktree | `worktreeService`, `convertWorktreeService`, `convertBugWorktreeService` | Git Worktree操作 |
| イベントログ | `eventLogService` | Specイベント記録 |
| メトリクス | `metricsService` | 開発時間計測・集計 |
| 並列実行 | `parallelImplService` | 並列タスク実行管理 |
| セッション復旧 | `sessionRecoveryService` | クラッシュ復旧 |
| レイアウト | `layoutConfigService` | ウィンドウレイアウト永続化 |
| バリデーション | `validationService` | プロジェクト検証 |
| パーミッション | `permissionsService` | ファイルパーミッション管理 |
| アクセストークン | `accessTokenService` | Remote Access認証トークン |
| CLIインストール | `cliInstallerService`, `commandInstallerService`, `experimentalToolsInstallerService` | CLI/コマンドインストール |
| コマンドセット | `commandsetVersionService` | プロファイルバージョン管理 |

### renderer/services/（Renderer Process）

| ドメイン | Service | 責務 |
|---------|---------|------|
| Spec監視 | `specWatcherService` | Renderer側Spec変更監視 |
| Spec同期 | `specSyncService` | Main-Renderer間Spec同期 |

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
| **Store** (Zustand) | 状態管理 | Zustand storeインスタンス |
| **Store** (Config) | Main Process | electron-storeによる永続化ストア |
| **Execution** | 自動実行 | AutoExecutionによる連続フェーズ実行 |
| **Execution** | Agent実行 | 単一Agentプロセスの実行 |
| **Worktree** (Git) | Git Worktree | 分離された作業ディレクトリ |
| **Worktree** (Mode) | spec.json | Worktreeモード設定フラグ |

### コマンドプレフィックス

| プレフィックス | 用途 |
|---------------|------|
| `/kiro:*` | Kiro互換SDDコマンド（デフォルト） |
| `/spec-manager:*` | spec-manager互換コマンド |

### UIアーキテクチャ用語

| 用語 | 意味 |
|-----|------|
| **Electron** | デスクトップアプリ本体 |
| **Remote UI** | WebSocketで接続するリモート操作用React UI |
| **Shared Components** | Electron/Remote UI両方で使用可能なコンポーネント |
| **Facade** | 複数Storeを統合するアダプターパターン |

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

_updated_at: 2026-01-24_
