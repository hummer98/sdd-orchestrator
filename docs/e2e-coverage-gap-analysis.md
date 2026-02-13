# E2Eテストカバレッジ ギャップ分析レポート

_作成日: 2026-02-11_

## 1. サマリー

### 全体カバレッジ

| ステータス | UC数 | 割合 |
|-----------|------|------|
| Full | 46 | 50.5% |
| Partial | 22 | 24.2% |
| None | 16 | 17.6% |
| Skipped | 4 | 4.4% |
| N/A (自動プロセス) | 3 | 3.3% |
| **合計** | **91** | **100%** |

### カテゴリ別カバレッジ率

| カテゴリ | UC数 | Full | Partial | None | Skipped | N/A | カバレッジ率 |
|----------|------|------|---------|------|---------|-----|-------------|
| UC1: プロジェクト管理 | 8 | 2 | 0 | 3 | 3 | 0 | 25.0% |
| UC2: Spec ライフサイクル | 15 | 10 | 4 | 1 | 0 | 0 | 66.7% |
| UC3: Bug ワークフロー | 10 | 8 | 2 | 0 | 0 | 0 | 80.0% |
| UC4: エージェント管理 | 7 | 4 | 2 | 1 | 0 | 0 | 57.1% |
| UC5: プロジェクトファイル編集 | 7 | 1 | 1 | 5 | 0 | 0 | 14.3% |
| UC6: Git/VCS 操作 | 5 | 3 | 2 | 0 | 0 | 0 | 60.0% |
| UC7: リモートアクセス | 4 | 2 | 0 | 2 | 0 | 0 | 50.0% |
| UC8: ツール・設定 | 5 | 1 | 2 | 2 | 0 | 0 | 20.0% |
| UC9: スケジュール実行 | 6 | 3 | 3 | 0 | 0 | 0 | 50.0% |
| UC10: バックグラウンドプロセス | 10 | 4 | 2 | 1 | 0 | 3 | 40.0% |
| UC11: レイアウト・ナビゲーション | 8 | 6 | 1 | 1 | 0 | 0 | 75.0% |
| RUI: Remote UI固有 | 6 | 4 | 1 | 1 | 0 | 0 | 66.7% |

> **カバレッジ率** = (Full + Partial) / (合計 - N/A) × 100

---

## 2. カバレッジマトリクス

### UC1: プロジェクト管理

| UC ID | ユースケース名 | Electron E2E | Web E2E | ステータス | 補足 |
|-------|--------------|-------------|---------|-----------|------|
| UC1.1 | プロジェクト選択（フォルダ選択） | `startup-project-selection` `project-selection-basic` | — | Full | SDD_PROJECT_PATH経由の自動選択をテスト |
| UC1.2 | プロジェクト選択（パス入力） | `startup-project-selection` | — | Full | env var経由でパス入力相当の検証 |
| UC1.3 | 最近のプロジェクトから選択 | — | — | None | 最近のプロジェクトリスト未テスト |
| UC1.4 | プロジェクト切り替え（エージェント警告） | — | — | None | ProjectSwitchConfirmDialog未テスト |
| UC1.5 | VSCodeで開く | — | — | None | 外部プロセス起動、テスト困難 |
| UC1.6 | SSH リモートプロジェクト接続 | `ssh-workflow` | — | Skipped | `it.skip` — ダイアログ操作方法未実装 |
| UC1.7 | SSH ホスト鍵検証 | `ssh-workflow` | — | Skipped | `it.skip` — 認証ダイアログ操作方法未実装 |
| UC1.8 | SSH パスワード認証 | `ssh-workflow` | — | Skipped | `it.skip` — 認証ダイアログ操作方法未実装 |

### UC2: Spec ライフサイクル

| UC ID | ユースケース名 | Electron E2E | Web E2E | ステータス | 補足 |
|-------|--------------|-------------|---------|-----------|------|
| UC2.1 | Spec作成（通常） | `spec-workflow` | `smartphone-spec-create` | Full | CreateSpecDialog、description入力、作成ボタン |
| UC2.2 | Spec作成（Worktree） | `spec-workflow` | `smartphone-spec-create` | Full | Worktreeモードスイッチ確認 |
| UC2.3 | Spec一覧表示・フィルタリング | `spec-workflow` `project-selection-basic` | `smartphone-spec` `smoke` | Full | 一覧、フィルター、ソート |
| UC2.4 | Spec選択・詳細表示 | `spec-workflow` `workflow-integration` | `smartphone-spec` `smoke` | Full | ArtifactEditor、WorkflowView表示 |
| UC2.5 | Requirements フェーズ実行 | `simple-auto-execution` `auto-execution-workflow` `workflow-integration` | `phase-execution` | Full | フェーズ実行・完了の完全テスト |
| UC2.6 | Design フェーズ実行 | `auto-execution-workflow` | `phase-execution` | Full | 自動実行内でDesign実行確認 |
| UC2.7 | Tasks フェーズ実行 | `auto-execution-workflow` | `phase-execution` | Full | 自動実行内でTasks実行確認 |
| UC2.8 | Implementation フェーズ実行 | `auto-execution-impl-flow` `auto-execution-impl-phase` `worktree-execution` | — | Full | Impl実行、TaskProgressView、worktreeモード |
| UC2.9 | フェーズ承認 | `auto-execution-workflow` `auto-execution-flow` | `auto-execution` | Full | 承認ボタン確認、spec.json更新 |
| UC2.10 | フェーズ却下（RejectDialog） | — | — | None | RejectDialogのUIクリックテストなし |
| UC2.11 | Spec Auto-Execution | `simple-auto-execution` `auto-execution-workflow` `auto-execution-permissions` | `auto-execution` `smartphone-auto-execution` | Full | 開始/停止、権限制御、フェーズ連携 |
| UC2.12 | Inspection フェーズ | `inspection-workflow` | — | Full | GO/NOGO、multi-round、autofix |
| UC2.13 | Spec Ask | `websocket-command-execution` | — | Partial | WebSocket経由のみ。UIクリック（spec-ask-button）テストなし |
| UC2.14 | Document Review | `document-review` `document-review-ui-states` `gemini-document-review` `auto-execution-document-review` | — | Full | レビュー開始/スキップ/承認、履歴表示、自動実行連携 |
| UC2.15 | Spec Worktreeマージ | `worktree-rebase-from-main` | — | Partial | Rebaseはテスト済み。マージ完了→Worktree削除の直接テストなし |

### UC3: Bug ワークフロー

| UC ID | ユースケース名 | Electron E2E | Web E2E | ステータス | 補足 |
|-------|--------------|-------------|---------|-----------|------|
| UC3.1 | Bug作成（通常） | `bug-workflow` | `bug-advanced` | Full | CreateBugDialog、description入力 |
| UC3.2 | Bug作成（Worktree） | `bugs-worktree-support` | `bug-advanced` | Full | Worktreeチェックボックス確認 |
| UC3.3 | Bug一覧表示 | `bug-workflow` `bugs-pane-integration` | `bug-management` | Full | 一覧表示、フェーズフィルタ、3ペイン連動 |
| UC3.4 | Analyze フェーズ実行 | `bugs-pane-integration` `bug-auto-execution` | `bug-management` | Full | ボタン表示、実行、analysis.md生成 |
| UC3.5 | Fix フェーズ実行 | `bugs-pane-integration` `bug-auto-execution` | `bug-management` | Full | ボタン表示、実行 |
| UC3.6 | Verify フェーズ実行 | `bug-auto-execution` | — | Full | 自動実行内で検証 |
| UC3.7 | Deploy/Merge フェーズ | `bugs-worktree-support` | — | Partial | Deployボタン `.skip` — `it.skip('should show Deploy button for completed bugs')` |
| UC3.8 | Bug Auto-Execution | `bug-auto-execution` | `bug-management` `bug-advanced` | Full | analyze → fix → verify連携、権限制御 |
| UC3.9 | Worktree変換 | `bugs-worktree-support` | `bug-advanced` | Full | 変換ボタン、worktreeバッジ |
| UC3.10 | Worktreeリベース | `worktree-rebase-from-main` | — | Partial | Bug worktreeリベースのテストは存在するが、成功/失敗シナリオのfixture依存部分がある |

### UC4: エージェント管理

| UC ID | ユースケース名 | Electron E2E | Web E2E | ステータス | 補足 |
|-------|--------------|-------------|---------|-----------|------|
| UC4.1 | エージェントログ表示 | `agent-log-streaming` `parsed-log-entry-display` | `agent-log-remote` `smartphone-agent-log` | Full | ストリーミング、パース済みログ、engine tag、token表示 |
| UC4.2 | エージェント停止 | `auto-execution-workflow` | — | Partial | 自動実行停止ボタンテスト内で暗黙的。個別エージェント停止UIテストなし |
| UC4.3 | エージェント削除 | — | — | None | AgentListPanel内の削除ボタンテストなし |
| UC4.4 | エージェント入力送信（resume） | `agent-resume-log-display` | `project-agent-interaction` | Full | resume、ログ累積、stdin表示 |
| UC4.5 | 続行指示 | `agent-resume-log-display` | `project-agent-interaction` | Full | 空入力resume（続行ボタン） |
| UC4.6 | Project Ask | `websocket-command-execution` | `project-agent-interaction` | Partial | WebSocket経由テスト済み。UIの「Ask」ボタンクリック→AskAgentDialog→実行の直接テストなし |
| UC4.7 | Project Agent 起動 | `project-agent-startup` | `project-agent-interaction` | Full | 起動成功、エラーハンドリング |

### UC5: プロジェクトファイル編集

| UC ID | ユースケース名 | Electron E2E | Web E2E | ステータス | 補足 |
|-------|--------------|-------------|---------|-----------|------|
| UC5.1 | CLAUDE.md 編集 | — | — | None | CLAUDE.md選択・編集・保存テストなし |
| UC5.2 | Steering ファイル編集 | — | — | None | Steeringファイル選択・編集テストなし |
| UC5.3 | Docs ファイル閲覧 | `project-docs-viewer` | — | Full | .md/.pdf/.html表示、PdfViewer、HtmlViewer、iframe |
| UC5.4 | ファイル保存（Cmd+S） | — | — | None | Cmd+S保存テストなし |
| UC5.5 | 外部変更検知ダイアログ | — | — | None | ExternalChangeDialogテストなし |
| UC5.6 | 未保存変更ダイアログ | — | — | None | UnsavedChangesDialogテストなし |
| UC5.7 | Edit/Preview モード切替 | `mermaid-preview` | — | Partial | MermaidダイアグラムPreviewのみ。通常Markdown Edit/Preview切替テストなし |

### UC6: Git/VCS 操作

| UC ID | ユースケース名 | Electron E2E | Web E2E | ステータス | 補足 |
|-------|--------------|-------------|---------|-----------|------|
| UC6.1 | Git差分表示 | `git-diff-viewer` | — | Full | ファイルツリー、diff表示、モード切替、ステータスアイコン |
| UC6.2 | Worktree作成（Spec用） | `convert-spec-to-worktree` `impl-start-worktree` | — | Full | 変換ボタン表示条件、エラーハンドリング |
| UC6.3 | Worktreeマージ（Spec用） | — | — | Partial | tRPC呼び出しのみ。マージ完了→Worktree削除の一連テストなし |
| UC6.4 | Worktreeリベース（Spec用） | `worktree-rebase-from-main` | — | Full | 成功/up-to-date/コンフリクト解決/失敗の全シナリオ |
| UC6.5 | VCSスキーム選択 | `debatex-scheme` | — | Partial | debatexスキームのみ。Git/Jujutsu切替の完全テストなし |

### UC7: リモートアクセス

| UC ID | ユースケース名 | Electron E2E | Web E2E | ステータス | 補足 |
|-------|--------------|-------------|---------|-----------|------|
| UC7.1 | Remote UIサーバー起動/停止 | `remote-webserver` | — | Full | サーバー起動/停止/再起動、ステータス取得 |
| UC7.2 | QRコード表示 | `cloudflare-tunnel` | — | Partial | Tunnel用QRのみ。LAN URL用QR単独テストなし |
| UC7.3 | Cloudflare Tunnel設定 | `cloudflare-tunnel` | — | Full | Tunnel無効/有効、バイナリ不在時、接続フロー（環境依存テスト含む） |
| UC7.4 | MCP Server 起動/停止/設定 | — | — | None | MCP Server関連テストなし |

### UC8: ツール・設定

| UC ID | ユースケース名 | Electron E2E | Web E2E | ステータス | 補足 |
|-------|--------------|-------------|---------|-----------|------|
| UC8.1 | Commandset インストール | `install-dialogs` | — | Partial | tRPC IPCブリッジ確認のみ。UI操作（プロファイル選択→インストール→結果表示）テストなし |
| UC8.2 | sdd CLI インストール | `install-dialogs` | — | Partial | tRPC IPCブリッジ確認のみ。CliInstallDialogのUI操作テストなし |
| UC8.3 | プロジェクト設定ダイアログ | `debatex-scheme` | — | Partial | tRPCブリッジ確認のみ。ダイアログUI操作（設定変更→保存）テストなし |
| UC8.4 | Skip Permissions トグル | `permission-control` `auto-execution-permissions` | `auto-execution` | Full | デフォルト値、IPC boundary、CLI args生成 |
| UC8.5 | ツールパス設定 | — | — | None | ToolSettingsPanel未テスト |

### UC9: スケジュール実行

| UC ID | ユースケース名 | Electron E2E | Web E2E | ステータス | 補足 |
|-------|--------------|-------------|---------|-----------|------|
| UC9.1 | スケジュールタスク設定 | `schedule-task` | — | Full | ダイアログアクセス、タスク作成、フォーム表示、保存/キャンセル |
| UC9.2 | インターバル実行 | `schedule-task` | — | Partial | ScheduleTypeSelectorの存在確認のみ。実際のインターバル実行テストなし |
| UC9.3 | 週次実行 | `schedule-task` | — | Partial | ScheduleTypeSelectorの存在確認のみ。週次設定UIテストなし |
| UC9.4 | アイドル時実行 | `schedule-task` | — | Partial | ScheduleTypeSelectorの存在確認のみ。アイドル設定UIテストなし |
| UC9.5 | スケジュールタスク即時実行 | `schedule-task` | — | Full | 実行ボタン確認、クリック可能 |
| UC9.6 | スケジュールタスク削除 | `schedule-task` | — | Full | 削除確認ダイアログ、キャンセル/確認、CRUD統合 |

### UC10: バックグラウンドプロセス

| UC ID | ユースケース名 | Electron E2E | Web E2E | ステータス | 補足 |
|-------|--------------|-------------|---------|-----------|------|
| UC10.1 | Specファイル監視 | `file-watcher-ui-update` `worktree-spec-sync` | — | Full | requirements.md変更→UI更新、spec.json変更→UI同期 |
| UC10.2 | Bugファイル監視 | `bugs-file-watcher` | `bug-advanced` | Full | フォルダ作成/削除検知 |
| UC10.3 | Gitインデックス監視 | — | — | None | GitFileWatcher→UI更新テストなし |
| UC10.4 | プロジェクトファイル監視 | `file-watcher-root-monitoring` | — | Partial | ルートディレクトリ監視のみ。ExternalChangeDialog連携テストなし |
| UC10.5 | エージェントレコード監視 | `agent-log-streaming` | `agent-log-remote` | Full | エージェント一覧自動更新、ログストリーミング |
| UC10.6 | AgentWatchdog | — | — | N/A | 30秒間隔タイマー。E2Eテスト困難 |
| UC10.7 | HangDetector | — | — | N/A | 1分間隔タイマー。E2Eテスト困難 |
| UC10.8 | メトリクス記録 | `metrics-display` | — | Full | メトリクスパネル表示、AI/Human/Total time |
| UC10.9 | デスクトップ通知 | `agent-completion-notification` | — | Partial | アプリ内toast通知のみ。OS通知テスト困難 |
| UC10.10 | Auto-Execution遷移 | `auto-execution-document-review` `auto-execution-impl-flow` | — | Full | ドキュメントレビューループ、impl→inspection遷移 |

### UC11: レイアウト・ナビゲーション

| UC ID | ユースケース名 | Electron E2E | Web E2E | ステータス | 補足 |
|-------|--------------|-------------|---------|-----------|------|
| UC11.1 | タブ切替 | `bug-workflow` `bugs-pane-integration` | `smoke` `smartphone-spec` `workflow-integration` | Full | Specs/Bugs/Projectタブ、aria-selected属性 |
| UC11.2 | ペインリサイズ | `layout-persistence` | — | Full | ResizeHandle存在、カーソルスタイル、IPC |
| UC11.3 | レイアウトリセット | `layout-persistence` | — | Partial | `resetLayoutConfig` tRPC APIの存在確認のみ。メニュー経由のリセット操作テストなし |
| UC11.4 | ログ検索（SearchBar） | `artifact-editor-search` | — | Full | Ctrl+F、検索入力、マッチカウント、ナビゲーション、大文字小文字 |
| UC11.5 | キーボードショートカット | `git-diff-viewer` `artifact-editor-search` | — | Full | Ctrl+Shift+G（GitView切替）、Ctrl+F（検索）、矢印キー |
| UC11.6 | ウィンドウ管理 | `multi-window` | — | Full | ウィンドウ状態取得、フォーカス管理、マルチディスプレイ |
| UC11.7 | イベントログ表示 | `event-log` | — | Full | ボタン表示、モーダル開閉 |
| UC11.8 | レビュー履歴表示 | `document-review` | — | Full | ReviewHistoryView表示、ラウンドアイテム展開 |

### RUI: Remote UI固有

| UC ID | ユースケース名 | Electron E2E | Web E2E | ステータス | 補足 |
|-------|--------------|-------------|---------|-----------|------|
| RUI-1 | モバイルレイアウト | `remote-webserver` | `smartphone-spec` `smartphone-agent-log` | Full | ボトムタブ、接続ステータス |
| RUI-2 | Spec操作（Remote UI） | `remote-webserver` | `smartphone-spec` `smartphone-spec-create` `auto-execution` `phase-execution` | Full | 一覧、検索、選択、Ask、Auto-Execution |
| RUI-3 | Bug操作（Remote UI） | `remote-webserver` | `bug-management` `bug-advanced` | Full | 一覧、選択、Auto-Execution |
| RUI-4 | プロジェクトファイル編集（Remote UI） | — | — | None | CLAUDE.md/Steering表示・編集テストなし |
| RUI-5 | エージェントログ表示（Remote UI） | — | `agent-log-remote` `smartphone-agent-log` `remote-ui-project-agent-logs` | Full | ログ表示、ストリーミング、store統合 |
| RUI-6 | 再接続処理 | `remote-webserver` | — | Partial | `remote-webserver`にテスト存在するが一部`describe.skip`。Web E2E側のPlaywrightテストなし |

---

## 3. ギャップ一覧（優先度別）

### P1: Critical — コアワークフロー、カバレッジゼロ

| # | 対象UC | ギャップ内容 | 影響 |
|---|--------|------------|------|
| P1-1 | UC5.1, UC5.2 | CLAUDE.md / Steeringファイル編集テストなし | プロジェクト設定の中核機能。ファイル選択→Edit切替→編集→保存の一連フロー未検証 |
| P1-2 | UC5.4 | ファイル保存（Cmd+S）テストなし | 編集系機能の基本操作。dirty indicator消去の検証なし |
| P1-3 | UC5.5, UC5.6 | 外部変更検知ダイアログ / 未保存変更ダイアログ テストなし | データ損失防止の安全機能。ExternalChangeDialog（Reload/Ignore）、UnsavedChangesDialog未検証 |
| P1-4 | UC1.4 | プロジェクト切り替え（実行中エージェント警告）テストなし | プロジェクト切替時のデータ保護。ProjectSwitchConfirmDialog未検証 |
| P1-5 | UC4.3 | エージェント削除テストなし | エージェント管理の基本操作。AgentListPanel内の削除ボタンUI操作未検証 |
| P1-6 | UC8.3 | プロジェクト設定ダイアログ — tRPCブリッジ確認のみ | ProjectSettingsDialogのUI操作（設定変更→保存）テストなし |
| P1-7 | UC2.10 | フェーズ却下（RejectDialog） — テストなし | ワークフローの分岐パス。却下理由入力→spec.json記録→再実行の検証なし |
| P1-8 | RUI-4 | Remote UIプロジェクトファイル編集テストなし | Remote UIでのCLAUDE.md/Steering表示・編集。Web E2E側テストゼロ |

### P2: High — 重要だが頻度低め

| # | 対象UC | ギャップ内容 | 影響 |
|---|--------|------------|------|
| P2-1 | UC7.4 | MCP Server 起動/停止/設定テストなし | リモートアクセス機能の一部。MCPタブUI操作、ポート変更、`claude mcp add`表示未検証 |
| P2-2 | UC8.5 | ツールパス設定テストなし | ToolSettingsPanel内のパス手動入力・ステータス更新未検証 |
| P2-3 | UC2.13, UC4.6 | Spec Ask / Project Ask — UIクリックテストなし | `websocket-command-execution`でWebSocket経由テスト済みだが、UIボタン（`spec-ask-button` / `project-ask-button`）→AskAgentDialog→プロンプト入力→実行の直接テストなし |
| P2-4 | UC8.1, UC8.2 | Commandset/CLIインストール — tRPCブリッジ確認のみ | `install-dialogs`でIPC確認のみ。プロファイル選択→インストール→結果表示のUI操作テストなし |
| P2-5 | UC6.5 | VCSスキーム選択 — debatexスキームのみ | Git/Jujutsu切替のDropdown操作テストなし |
| P2-6 | RUI-6 | WebSocket再接続テストなし（Web E2E側） | `remote-webserver`で一部テスト済みだがPlaywright側で再接続テストゼロ |
| P2-7 | UC1.3 | 最近のプロジェクト選択テストなし | ProjectSelectionViewの最近リスト表示・クリック選択未検証 |

### P3: Medium — Edge case / 補完

| # | 対象UC | ギャップ内容 | 影響 |
|---|--------|------------|------|
| P3-1 | UC1.6-1.8 | SSH全テスト `.skip` 状態 | `ssh-workflow.e2e.spec.ts`: SSHConnectDialog/SSHAuthDialogのUI操作テストがスキップ |
| P3-2 | UC5.7 | Edit/Previewトグル — Mermaidのみ | `mermaid-preview`でMermaidプレビューテスト済み。通常MarkdownのEdit↔Preview切替テストなし |
| P3-3 | UC10.3 | Gitインデックス監視テストなし | GitFileWatcher→onGitChange→GitViewファイルツリー自動更新の検証なし |
| P3-4 | UC11.3 | レイアウトリセット — メニュー経由未テスト | `layout-persistence`でtRPC API存在確認のみ。メニュー > 表示 > レイアウトリセットの操作テストなし |
| P3-5 | UC7.2 | QRコード表示 — 単独テストなし | `cloudflare-tunnel`でTunnel用QRテスト済み。LAN URL用QR単独表示テストなし |
| P3-6 | UC6.3 | Spec Worktreeマージ — 直接テストなし | `worktree-rebase-from-main`でリベースはテスト済み。`executeSpecMerge`→マージ完了→Worktree削除テストなし |
| P3-7 | UC3.7 | Bug Deploy — `.skip`状態 | `bugs-worktree-support`: `it.skip('should show Deploy button for completed bugs')` |
| P3-8 | UC9.2-9.4 | スケジュール実行タイプ — UI確認のみ | ScheduleTypeSelectorの存在確認のみ。各タイプ（インターバル/週次/アイドル）の設定UIテストなし |

### P4: Low / テスト困難

| # | 対象UC | ギャップ内容 | 理由 |
|---|--------|------------|------|
| P4-1 | UC1.5 | VSCodeで開く | 外部プロセス起動。テスト環境でVSCode存在を保証できない |
| P4-2 | UC10.6, UC10.7 | AgentWatchdog / HangDetector | 30秒/1分間隔タイマー。E2E待機時間が非現実的 |
| P4-3 | UC10.9 | デスクトップ通知（OS API） | OS通知APIのモック困難。アプリ内toast通知は`agent-completion-notification`でテスト済み |

---

## 4. 推奨アクション

### P1 対応（最優先）

| # | 追加テストファイル | 対象UC | 概要 |
|---|-------------------|--------|------|
| 1 | `project-file-editing.e2e.spec.ts` | UC5.1, UC5.2, UC5.4 | CLAUDE.md選択→Edit切替→編集→Cmd+S保存→dirty indicator消去。Steeringファイル同様 |
| 2 | `file-change-dialogs.e2e.spec.ts` | UC5.5, UC5.6 | ExternalChangeDialog（Reload/Ignore）、UnsavedChangesDialog（続行/キャンセル）のUI操作テスト |
| 3 | `project-switch-warning.e2e.spec.ts` | UC1.4 | プロジェクト切替時のProjectSwitchConfirmDialog表示・確認・キャンセルテスト |
| 4 | `agent-delete.e2e.spec.ts` | UC4.3 | 停止/完了エージェントの削除ボタンクリック→一覧から消去テスト |
| 5 | `project-settings-dialog.e2e.spec.ts` | UC8.3 | ProjectSettingsDialog開閉、レビュースキーム変更、LLMエンジン変更、保存テスト |
| 6 | `phase-rejection.e2e.spec.ts` | UC2.10 | generatedフェーズの却下ボタン→RejectDialog→理由入力→却下→pendingに戻るテスト |
| 7 | `remote-ui-project-files.spec.ts` (Playwright) | RUI-4 | Remote UIでCLAUDE.md/Steeringファイルの表示・編集・保存テスト |

### P2 対応（高優先）

| # | 追加テストファイル | 対象UC | 概要 |
|---|-------------------|--------|------|
| 8 | `mcp-server.e2e.spec.ts` | UC7.4 | MCPタブ表示、Server有効/無効切替、ポート変更、`claude mcp add`コマンド表示テスト |
| 9 | `ask-agent-dialog.e2e.spec.ts` | UC2.13, UC4.6 | Spec Ask / Project Askボタンクリック→AskAgentDialog→プロンプト入力→実行→エージェント起動テスト |
| 10 | `install-dialog-ui.e2e.spec.ts` | UC8.1, UC8.2 | CommandsetInstallDialog: プロファイル選択→インストール→結果表示。CliInstallDialog: インストール先選択→実行 |
| 11 | `tool-path-settings.e2e.spec.ts` | UC8.5 | ToolSettingsPanelのパス入力・ステータス更新テスト |
| 12 | `vcs-scheme-toggle.e2e.spec.ts` | UC6.5 | VcsSchemeSelectorのGit/Jujutsu切替Dropdown操作テスト |
| 13 | `recent-projects.e2e.spec.ts` | UC1.3 | 最近のプロジェクトリスト表示・選択・順序更新テスト |
| 14 | `remote-ui-reconnect.spec.ts` (Playwright) | RUI-6 | WebSocket切断→ReconnectOverlay表示→自動再接続テスト |

### P3 対応（中優先）

| # | 追加テストファイル / 修正 | 対象UC | 概要 |
|---|--------------------------|--------|------|
| 15 | `ssh-workflow.e2e.spec.ts` の`.skip`解除 | UC1.6-1.8 | SSHConnect/AuthDialogのUI操作テスト実装 |
| 16 | `edit-preview-toggle.e2e.spec.ts` | UC5.7 | 通常MarkdownのEdit↔Preview切替テスト（Mermaid以外） |
| 17 | `schedule-type-settings.e2e.spec.ts` | UC9.2-9.4 | インターバル/週次/アイドルの各設定UIテスト |
| 18 | `worktree-merge.e2e.spec.ts` | UC6.3 | Worktreeマージ完了→Worktree削除→Specフラグ解除テスト |
| 19 | `bugs-worktree-support.e2e.spec.ts`の`.skip`解除 | UC3.7 | Deployボタン表示テスト実装 |

---

## 5. 実施結果（2026-02-11）

### 作成したテストファイル

#### P1 対応（7ファイル全完了）

| # | テストファイル | ステータス | 備考 |
|---|--------------|-----------|------|
| 1 | `project-file-editing.e2e.spec.ts` | ✅ 完了 | MDEditor textarea DOM操作でReact入力を実現 |
| 2 | `file-change-dialogs.e2e.spec.ts` | ✅ 完了 | ExternalChangeDialog。UnsavedChangesDialogはトリガー未実装のため対象外 |
| 3 | `project-switch-warning.e2e.spec.ts` | ✅ 完了 | `__STORES__.connection.setState()`でダイアログをトリガー |
| 4 | `agent-delete.e2e.spec.ts` | ✅ 完了 | mock Claude CLIでエージェント実行→完了後に削除フロー |
| 5 | `project-settings-dialog.e2e.spec.ts` | ✅ 完了 | engine/VCS/docReview設定UIテスト |
| 6 | `phase-rejection.e2e.spec.ts` | ✅ 完了 | RejectDialog: reason入力→バリデーション→却下 |
| 7 | `remote-ui-project-files.spec.ts` (Playwright) | ✅ 完了 | ProjectViewタブ遷移、Steering Files表示 |

#### P2 対応（7ファイル全完了）

| # | テストファイル | ステータス | 備考 |
|---|--------------|-----------|------|
| 8 | `mcp-server-settings.e2e.spec.ts` | ✅ 完了 | MCP indicator→RemoteAccessDialog→MCPタブ→設定パネル |
| 9 | `ask-agent-dialog.e2e.spec.ts` | ✅ 完了 | spec-ask-button→AskAgentDialog→入力→バリデーション |
| 10 | `cli-install-dialog.e2e.spec.ts` | ✅ 完了 | メニューイベントでダイアログ開閉。location選択UI |
| 11 | `tool-path-settings.e2e.spec.ts` | ✅ 完了 | RemoteAccessDialog→ツールタブ→tool-rowリスト |
| 12 | `vcs-scheme-ui.e2e.spec.ts` | ✅ 完了 | VcsSchemeSelector dropdown操作テスト（debatexとは別） |
| 13 | `recent-projects.e2e.spec.ts` | ✅ 完了 | プロジェクト選択後に戻り→最近のプロジェクトリスト確認 |
| 14 | `remote-ui-reconnect.spec.ts` (Playwright) | ✅ 完了 | ページリロード後の再接続・ステータスインジケータ |

#### P3 対応（2/5完了、3つは前提条件不足で見送り）

| # | テストファイル / 修正 | ステータス | 備考 |
|---|---------------------|-----------|------|
| 15 | `ssh-workflow.e2e.spec.ts` skip解除 | ❌ 見送り | `setIsSSHConnectDialogOpen(true)`がコードベースに存在せず、ダイアログopen trigger自体が未実装 |
| 16 | `edit-preview-toggle.e2e.spec.ts` | ✅ 完了 | Edit/Previewモード切替、MDEditorツールバー表示制御 |
| 17 | `schedule-type-settings.e2e.spec.ts` | ✅ 完了 | Fixed/Conditional切替、interval/weekly/idle各設定UI |
| 18 | `worktree-merge.e2e.spec.ts` | ❌ 見送り | 実gitリポジトリが必要。fixtureでは不十分 |
| 19 | `bugs-worktree-support.e2e.spec.ts` skip解除 | ❌ 見送り | fixture内に完了済みbug phase + worktreeフィールドが必要 |

### Fixture追加

- `e2e-wdio/fixtures/project-file-test/` — CLAUDE.md, steering files, spec付きの新fixture

### wdio.conf.ts変更

追加したfixture override:
- `'agent-delete': 'auto-exec-test'`
- `'edit-preview-toggle': 'project-file-test'`
- `'file-change-dialogs': 'project-file-test'`
- `'project-file-editing': 'project-file-test'`
- `'schedule-type-settings': 'auto-exec-test'`

### 数値サマリー

| 項目 | 数 |
|------|---|
| 新規Electron E2Eテスト | 13ファイル |
| 新規Playwright E2Eテスト | 2ファイル |
| 新規fixture | 1ディレクトリ |
| 見送り（前提条件不足） | 3件 |
| 対応ユースケース数 | 約20 UC |

---

## 6. 参照ファイル

### ユースケースカタログ
- `docs/usecases.md` — 91ユースケースの完全カタログ

### Electron E2E テスト（58ファイル）
- `electron-sdd-manager/e2e-wdio/*.e2e.spec.ts`

### Web E2E テスト（16ファイル）
- `electron-sdd-manager/e2e-playwright/*.spec.ts`

### Skippedテスト一覧

| ファイル | スキップ内容 | 理由 |
|---------|-------------|------|
| `ssh-workflow.e2e.spec.ts` | SSHConnectDialog, SSHAuthDialog UI | ダイアログ操作方法未実装 |
| `remote-webserver.e2e.spec.ts` | Bugsワークフロー4テスト、Specsタブ2テスト、ログビューア | getBugs未実装、他テストでカバー済み、WebSocket状態問題 |
| `auto-execution-intermediate-artifacts.e2e.spec.ts` | フェーズアイコン更新テスト | 1件skip |
| `bugs-worktree-support.e2e.spec.ts` | Deployボタン、worktreeインジケータ、Toolsメニュー | 3件skip |
| `impl-start-worktree.e2e.spec.ts` | worktree変換テスト | 1件skip |
| `convert-spec-to-worktree.e2e.spec.ts` | worktree変換フローテスト | 1件skip |
| `cloudflare-tunnel.e2e.spec.ts` | Tunnel接続統合テスト（環境依存） | cloudflaredバイナリ不在時skip |
