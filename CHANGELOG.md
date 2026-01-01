# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.15.3] - 2026-01-02

### Fixed
- **InspectionState型統一**: InspectionState型をMultiRoundInspectionStateに統一し、型の一貫性を向上
- **E2Eテスト修正**: bug-auto-executionテストでMock CLIを正しく使用するよう修正
- **debounce処理改善**: debounce処理を改善し、複数ファイル変更イベントのドロップを解消

## [0.15.2] - 2026-01-02

### Fixed
- **ワークフロー右ペイン改善**: パネル間の矢印表示を追加し、ワークフローの進行をより視覚的に
- **Inspection完了後のタブ表示**: inspection完了後にタブが表示されない問題を修正
- **AgentInputPanel機能強化**: 入力履歴削除と複数行入力に対応

### Testing
- **E2Eテスト改善**: bug関連テストにタブ切り替えヘルパーを追加、layout-persistenceテストの安定化

## [0.15.1] - 2026-01-01

### Fixed
- **検査フェーズ重複表示解消**: 検査フェーズの重複表示を解消し、spec-inspectionコマンドを使用するように修正
- **ファイル監視ベースUI同期**: ファイル監視ベースの粒度細かいUI同期を実装
- **document-review自動連携**: document-review → document-review-reply をワンセットで実行するように修正
- **Bug新規作成ダイアログ修正**: Bug新規作成ダイアログのコマンド実行を修正

## [0.15.0] - 2025-12-27

### Added
- **Remote UIワークフロー機能強化**: WebSocket双方向通信とメッセージルーティングを実装
- **Remote UI用IPCチャンネル追加**: Remote UI操作用のIPCハンドラーを追加
- **Spec操作API追加**: SpecManagerServiceに仕様操作用APIメソッドを追加
- **Main Process自動実行基盤**: Main Process側への自動実行ロジック移行基盤を実装
- **Cloudflare Tunnel統合基盤**: Cloudflare Tunnel統合の基盤実装

### Fixed
- **Verify実行ボタンAgent表示**: Verify実行ボタンでAgentがAgent一覧に表示されない問題を修正
- **Spec切替時Agent選択**: Spec切替時にAgentがない場合は選択をクリア
- **自動承認修正**: 生成済み・未承認フェーズの自動承認を修正
- **inspection phase status**: inspection.passedによるステータス判定を修正

### Changed
- **タブ折り返し**: タブが多い場合に二行折り返しを可能に

### Documentation
- 新規仕様書追加（parallel-task-impl, remote-ui-workflow, spec-productivity-metrics）

## [0.14.0] - 2025-12-27

### Added
- **Cloudflare Tunnel統合機能**: Cloudflare Tunnelを使用したRemote UIアクセスを実装（Task 1-10）
- **Remote UI Agent一覧同期機能**: Remote UIでAgent一覧のリアルタイム同期をサポート

### Fixed
- **sdd-orchestrator.json profileフィールド**: profileフィールドをsdd-orchestrator.jsonに追加
- **spec-list未知phase表示**: 未知のphase値をそのまま表示するフォールバックを追加
- **spec-inspection NOGO対応**: NOGO判定時もspec.jsonを更新するよう修正
- **Remote UI Spec一覧ソート**: Spec一覧のソート順をElectron版と統一
- **Remote UI Bugs一覧表示**: Remote UIでBugs一覧が表示されない問題を修正
- **Remote UI Agent一覧表示**: Agent一覧の表示内容をElectron版と統一
- **Remote UI画面レイアウト**: Spec/Bug Detail画面のレイアウト構造を修正
- **Remote UI Closeボタン削除**: RemoteAccessDialogから不要なCloseボタンを削除
- **WorkflowView重複呼び出し**: document-review-replyの重複呼び出しを削除

### Changed
- **Remote UI hash-based routing**: Remote UIの画面遷移をhash-based routingに改善

### Documentation
- Cloudflare Tunnel設定ガイドを追加
- MCP操作手順書（operations.md）を追加
- 新規Spec作成時のRemote UI影響チェックをsteeringに追加

## [0.13.1] - 2025-12-27

### Added
- **Agentログコマンドライン表示**: Agentログの1行目にコマンドラインを表示
- **並行実行対応ExecutionContext**: 自動実行の並行処理に対応するためExecutionContextを導入
- **spec-inspectionコマンド変更**: inspection phaseのコマンドをspec-inspectionに変更

### Fixed
- **RemoteWebサーバーUI修正**: 4つの問題を修正（詳細はコミットログ参照）

### Documentation
- Cloudflare Tunnel統合の仕様ドキュメント追加
- remote-ui TypeScript移行計画の追加
- spec-inspectionに検査ボタン統合要件を追加

## [0.13.0] - 2025-12-27

### Added
- **ArtifactEditor検索機能**: Cmd+F/Ctrl+Fでマークダウンエディタ内を検索可能に
  - SearchBar: 検索バーUI（大文字小文字区別オプション付き）
  - SearchHighlightLayer: 編集モードでの検索マッチハイライト
  - PreviewHighlightLayer: プレビューモードでの検索マッチハイライト
  - Enter/Shift+Enterでマッチ間を移動
- **Bugワークフロー自動実行機能**: Bugフェーズの連続自動実行をサポート
  - BugAutoExecutionService: analyze→fix→verifyの自動進行
  - BugAutoExecutionStatusDisplay: 自動実行状態の表示
  - workflowStoreに自動実行状態を追加
- **E2Eテスト追加**: RemoteAccessServer、install-dialogs、artifact-editor-search、bug-auto-executionのE2Eテスト

### Fixed
- **UI改善**: フィルタselect要素のテキスト色を修正
- **AgentListPanel統合**: SpecタブとBugsタブでAgentListPanelを統一
- **Agent自動選択スコープ修正**: タブ・プロジェクト切り替え時のAgent選択クリア
- **BugListItem表示統一**: SpecListItemと同じ表示スタイルに統一
- **BugArtifactEditor**: 存在するアーティファクトタブのみ表示
- **完了フェーズ実行ボタン非表示**: 完了したBugフェーズの実行ボタンを非表示
- **AgentLogパネル最大高さ制限削除**: 表示領域を拡大

### Changed
- **ドキュメント更新**: CLAUDE.mdにCommandset Installer説明追加
- **ロギング設計ドキュメント**: プロジェクト別ログ機能の説明を追加

## [0.12.0] - 2025-12-26

### Added
- **project-log-separation機能**: プロジェクトごとのログ分離機能を実装
- **--dangerously-skip-permissions オプション**: Agent実行時のパーミッションスキップオプションをサポート
- **spec-inspection機能**: spec-inspectionコマンドとエージェントを追加
- **bugs-pane UI**: バグワークフローUIコンポーネントとストアを追加

### Fixed
- **セッションIDラベル**: AgentLogPanelヘッダーにセッションIDラベルを追加
- **auto-execution設定の永続化**: spec.jsonへの自動実行設定の永続化を修正
- **タスク完了検出**: タスク完了検出をメインプロセス（specsWatcherService）に移動
- **ProjectAgentPanel**: プロジェクト未選択時に非表示に
- **implementation-in-progress状態**: システムから未使用状態を削除
- **セッションIDコピーボタン**: AgentLogPanelにセッションIDコピーボタンを追加
- **左ペイン重複表示**: 左ペインから重複プロジェクト表示UIを削除
- **CreateSpecDialog**: ダイアログを閉じた時にisCreating状態をリセット

### Changed
- **ready_for_implementation フィールド削除**: 未使用フィールドのリファクタリング

### Documentation
- symbol-semantic-mapとCLAUDE.mdを更新
- skill-reference.mdをSDDコマンド動作用に追加
- commandset-unified-installer用のdocument-review-2-replyを追加

## [0.11.2] - 2025-12-25

### Added
- **Auto-execution自動進行機能**: document-review自動承認とimplフェーズ自動進行を実装

### Documentation
- spec-scoped-auto-execution-state仕様を追加
- bugs-pane-integration仕様ドキュメントを追加

## [0.11.1] - 2025-12-25

### Fixed
- **Agent強制終了の改善**: Claudeプロセスがハングする問題を修正し、結果出力後に強制終了するように変更
- **強制終了されたAgentの状態管理**: 強制終了されたAgentを完了状態として適切に扱うように修正

### Documentation
- Claude CLIプロセスが終了しない問題の調査メモを追加

## [0.11.0] - 2025-12-25

### Added
- **E2Eテストデバッグサポート**: AutoExecutionServiceのE2Eデバッグサポートとdata-testid属性を追加
- **bug-verify機能強化**: 検証完了後のコミット確認機能を追加
- **Remote UI強化**: WebSocket双方向同期とRemote UI機能を強化
- **auto-execution-completion-detection**: 自動実行完了検出仕様とE2Eテストを追加
- **document-review-reply改善**: --fix/--autofix時に修正内容をreply.mdに追記
- **UI自動補正オプション**: updated_atを更新しないオプションを追加
- **Mock Claude CLI**: E2Eテスト用のMock Claude CLIとwdio設定を追加

### Fixed
- **EPIPE/EIOエラー**: ダイアログ表示を抑止するよう修正
- **E2Eテスト分離**: テスト分離の強化とタイムアウト設定の調整
- **AutoExecutionServiceのレースコンディション**: 非同期処理の競合状態を修正
- **spec.jsonマイグレーション**: feature_nameを追加しマイグレーション問題を修正
- **fixtureのシンボリックリンクパス**: E2E fixtureのパスを修正
- **sdd-orchestrator.json形式**: fixtureをversion 2形式に修正

### Documentation
- CLAUDE.mdにdebugging.mdの説明を追加
- project-log-separation仕様ドキュメントを追加
- internal-webserver-syncのアーキテクチャメモを追加
- E2E自動実行テストの調査レポートを追加
- MCP経由でのプロジェクト選択方法をdebugging.mdに追加

## [0.10.0] - 2025-12-21

### Added
- **マルチウィンドウ機能**: WindowManagerサービスと状態永続化を実装し、複数ウィンドウの管理が可能に
- **マルチウィンドウE2Eテスト**: マルチウィンドウ機能のE2Eテストを追加
- **symbol-semantic-map.md**: コードシンボルとドメイン概念の対応表ドキュメントを追加

### Changed
- **GlobalAgentをProjectAgentにリネーム**: より明確な命名に変更
- **profile設定の統合**: profile設定をsdd-orchestrator.jsonに統合

### Fixed
- **コマンドセットインストール**: 既存ファイルを強制上書きするよう変更
- **Global Agentのファイル削除**: レジストリ未登録時に失敗する問題を修正
- **specファイル監視**: プロジェクト選択時に起動しない問題を修正
- **DocumentReviewPanel**: レビュー開始ボタンを適切に無効化
- **GlobalAgentPanel**: クリック時にAgentログが切り替わらない問題を修正

## [0.9.6] - 2025-12-21

### Fixed
- **SSOT準拠の修正**: specStoreのcurrentProjectPathをprojectStoreから参照するように修正し、Single Source of Truthアーキテクチャに準拠

## [0.9.5] - 2025-12-20

### Fixed
- **SSOTアーキテクチャへの統一**: projectStoreからspecs/bugsの二重管理を削除し、File as Single Source of Truthアーキテクチャに統一
- **Agent完了時のUI自動更新**: Agent完了時にspecDetailを自動更新し、UIを最新状態に維持
- **Agent状態の二重管理解消**: File as SSOTアーキテクチャにより状態管理を一元化
- **プロファイル別バリデーション統一**: レガシーREQUIRED_COMMANDSを削除し、プロファイル別バリデーションに統一

### Documentation
- Design Principlesセクションを追加（DRY, SSOT, KISS, YAGNI, 関心の分離）

## [0.9.4] - 2025-12-20

### Fixed
- **プロファイル別コマンドリストによるバリデーション修正**: プロファイルごとに異なるコマンドリストを使用してバリデーションを行うように修正

### Documentation
- profile-validation-mismatchバグ修正のドキュメントを追加

## [0.9.3] - 2025-12-20

### Added
- **GlobalAgentPanel常時表示化**: GlobalAgentPanelを常に表示するように変更し、リサイズ機能を追加

### Fixed
- **コマンドセットインストールのデフォルト変更**: コマンドセットインストールのデフォルトをcc-sddに変更
- **コマンドセットインストール時の設定追加**: settingsとパーミッションを自動追加するように修正

### Changed
- **validate-impl UIの改善**: validate-implオプションをUIから削除し、検査フェーズに統合

### Documentation
- MCP Server構想ドキュメントを追加

### Testing
- テストのモックとsettingsリストを更新

## [0.9.2] - 2025-12-20

### Added
- **Permission fix button**: Added "Fix" button to permission warning area for one-click permission repair

### Fixed
- **addMissingPermissions API**: Added new API to correctly apply missing permission fixes
- **Reply-undefined tab display**: Fixed issue where tabs displayed as "Reply-undefined"
- **Agent list initial load**: Fixed issue where agent list was not loaded on first display
- **Agent log parser tool display**: Improved tool display in agent log parser

### Testing
- **RemoteAccessServer port conflict**: Fixed port conflict issue in RemoteAccessServer tests

### Documentation
- Added bug report for validate-impl-send-button-disabled issue

## [0.9.1] - 2025-12-20

### Added
- **E2E test data-testid attributes**: Added data-testid attributes to components for E2E testing support
- **E2E test cases**: Added comprehensive E2E tests for SSH connection, layout persistence, and install dialog
- **ResizeHandle unit tests**: Added unit tests for ResizeHandle component
- **steering-e2e-testing command**: Added new command for E2E testing steering document generation

### Fixed
- **E2E session creation error**: Fixed ELECTRON_RUN_AS_NODE environment variable issue causing session creation failures in wdio-electron-service

### Documentation
- Added technical article on resolving wdio-electron-service session creation errors
- Added E2E testing standard documentation

## [0.9.0] - 2025-12-20

### Added
- **Experimental tools installer**: New menu feature to install experimental slash commands and agents
  - Plan command (`/plan`) for pre-implementation planning
  - Debug agent (`@debug`) for systematic troubleshooting
  - Commit command (`/commit`) for structured commit message generation
- **Pane layout persistence**: Window pane layout is now saved and restored across sessions

### Fixed
- **Claude Code permission format**: Updated permission format for compatibility
- **Profile switching**: Added confirmation dialog for agent folder deletion during profile switch
- **Global agent display**: Fixed execution time display and deletion functionality for global agents

### Changed
- **Debug agent integration**: Separated debugging info from CLAUDE.md into dedicated debug agent
- **Documentation updates**: Updated document-review workflow and steering file sync

## [0.8.0] - 2025-12-19

### Added
- **Command prefix support**: `executeSpecInit` now supports `commandPrefix` parameter for command set switching compatibility

### Changed
- **Improved validation display**: Kiro validation results are now displayed only when issues are detected (reduces visual noise)

### Fixed
- **electron:restart task**: Fixed issue where PROJECT argument was not passed correctly during restart
- **Global agent detection**: Fixed issue where global agents (`specId=''`) were not detected and displayed correctly
- **Dark mode textarea**: Fixed issue where text was invisible in dialog textareas when dark mode is enabled

## [0.7.2] - 2025-12-19

### Changed
- **Installation profiles**: Renamed installation profile identifiers to `cc-sdd`, `cc-sdd-agent`, `spec-manager` for better clarity
- **Project selection UX**: Removed validation success display to reduce visual noise

### Fixed
- **Agent resume behavior**: Fixed issue where `allowed-tools` settings were not respected during agent resume operations

## [0.7.1] - 2025-12-18

### Changed
- **Unified Installer Phase 2**: Consolidated Tools menu by removing legacy installer menu items
  - Removed: "spec-managerコマンドを再インストール..."
  - Removed: "CLAUDE.mdをインストール..."
  - Removed: "シェルコマンドの実行許可を追加..."
  - Removed: "cc-sdd Workflowをインストール..."
  - All functionality now accessible through "コマンドセットをインストール..." unified installer

### Fixed
- **sdd CLI command**: Fixed issue where project path was not passed correctly when launching from command line

## [0.7.0] - 2025-12-18

### Added
- **Commandset Unified Installer**: New unified installer architecture for managing command sets
  - `UnifiedCommandsetInstaller`: Core installer with dependency resolution
  - `CommandsetDefinitionManager`: Command set definition management
  - `DependencyResolver`: Dependency resolution between command sets
  - `SettingsFileManager`: settings.json read/write operations
  - `ProfileManager`: Installation profile management
  - `RollbackManager`: Rollback on installation failure
  - `UpdateManager`: Command set update detection
  - `ValidationService`: Pre/post installation validation
  - `LoggingService`: Operation logging
  - `CommandsetInstallDialog`: New installation UI component
- **Command template reorganization**: Restructured command templates into new directory structure
  - `kiro/` → `bug/`, `cc-sdd-agent/`, `cc-sdd/`, `document-review/`
  - Added new `cc-sdd/` command set for simplified SDD workflow
- **Technical documentation**: Added technical note on Claude Code subagent permission inheritance issue

### Changed
- Updated README with project setup instructions, document review, and bug fix workflow documentation
- Updated existing installers to use new template paths

## [0.6.2] - 2025-12-17

### Added
- **Project name display in header**: Added project name and VSCode launch button to application header
- **Current directory support for sdd command**: The `sdd` command now opens current directory when no argument is provided

### Changed
- **Unified workflow terminology**: Integrated Bug Workflow into CC-SDD Workflow with consistent naming
- **Refactored document review panel**: Removed redundant loading indicators for cleaner UI
- **Improved auto-execution control**: Replaced `ready_for_implementation` flag with `documentReview.status`-based logic
  - Auto-execution now properly waits for document review approval before implementation phase
  - Manual execution via `/kiro:spec-impl` remains flexible (only checks tasks approval)
  - Removed redundant flag from spec.json schema

### Fixed
- Implementation phase precondition checking in auto-execution workflow

## [0.6.1] - 2025-12-15

### Added
- **Permissions check display**: Project selection screen now displays permissions check results
  - Visual feedback when permissions are missing (warning message with list)
  - Success message when all permissions are configured
  - Helps users understand what permissions need to be added

### Changed
- **Optimized logging**: Reduced log noise by only logging when issues are detected
  - Permissions check logs only when permissions are missing
  - Spec-manager file check logs only when files are missing
  - Normal operations now run silently

### Fixed
- Removed unused variable in App.tsx

## [0.6.0] - 2025-12-15

### Added
- **Automatic permissions check on project selection**: Project selection now automatically checks for required permissions in `settings.local.json`
  - New `permissionsCheck` state in `projectStore` to track permission status
  - Graceful handling when permissions check fails - project selection continues
  - Three new test cases covering permissions check scenarios
- **Release automation command**: New `/release` slash command to automate the version release process
  - Automated version bumping, changelog updates, building, and GitHub release creation

### Changed
- Enhanced project selection workflow with permissions validation
- Added `checkRequiredPermissions()` API method to ElectronAPI interface

## [0.5.0] - 2025-01-15

### Added
- **Automatic permissions addition**: CC-SDD Workflow installation now automatically adds required permissions to `.claude/settings.local.json`
  - Basic tool permissions: `Read(**), Edit(**), Write(**), Glob(**), Grep(**), WebSearch, WebFetch, Bash(**)`
  - 14 SlashCommand permissions for kiro namespace commands
- **Permission checking system**: New `checkRequiredPermissions()` and `addPermissionsToProject()` functions in `permissionsService.ts`
- **Resource path utilities**: Centralized resource path management in `resourcePaths.ts` to handle production/development environment differences
- **Automatic spec.json migration**: Old format spec.json files are automatically migrated to the new CC-SDD format
- **Settings file installation**: CC-SDD Workflow installer now installs settings files to `.kiro/settings/`

### Fixed
- **Template not found in production**: Fixed resource path resolution by using `process.resourcesPath` instead of `app.getAppPath()`
- **Missing extraResources**: Added `resources` directory to `package.json` extraResources for proper packaging
- **Requirements generation flag**: Fixed incorrect `requirements.generated` flag during spec.json migration
- **REQUIRED_COMMANDS namespace**: Updated from `spec-manager` to `kiro` namespace (14 commands)

### Changed
- Version bumped to 0.5.0
- Centralized all resource path resolution through `resourcePaths.ts` utility functions
- Updated `commandInstallerService.ts`, `permissionsService.ts`, and `cliInstallerService.ts` to use centralized path utilities

## [0.4.0] - 2025-01-14

### Added
- Initial CC-SDD Workflow installation feature
- Project checker for slash commands and settings
- CLI installer service

### Fixed
- Various bug fixes and stability improvements

## [0.3.4] - 2025-01-13

### Added
- Initial release with basic SDD Orchestrator functionality
