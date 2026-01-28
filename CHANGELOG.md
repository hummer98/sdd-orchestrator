# CHANGELOG

## [0.53.1] - 2026-01-28

### Fixed
- .git/indexのみ監視してEMFILEエラーを回避
- ファイルツリーの視認性とデフォルト展開を改善
- GitFileWatcherServiceのシングルトン化でEMFILEエラーを修正

## [0.53.0] - 2026-01-28

### Added
- Gitステータス・Diff表示機能を追加
- Document ReviewのSKIP削除機能を実装
- Agentライフサイクル管理機能を実装
- worktree変換時にイベント履歴を発行
- Agent停止検知・復旧機能を実装

### Fixed
- sort by lastActivityAt instead of startedAt

### Changed
- .configディレクトリをgitignoreに追加
- document-review系コマンドのプロンプトを簡略化
- AutoExecutionPermissions をSSOT化しPermission Control E2Eテスト追加
- design.md肥大化対策の実装
- NOGO判定時に即座停止する自動実行動作を実装

## [0.52.1] - 2026-01-28

### Fixed
- improve agent completion detection and error handling

### Changed
- skipPermissionsフラグ処理の厳密化とバリデーション強化
- add safety permissions to deny list in settings
- 統合テスト/E2Eテストのドキュメント参照を改善


All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.52.0] - 2026-01-27

### Added
- **jj-merge-support**: jujutsuコマンド検出とプロジェクトバリデーション機能を追加
- **safari-websocket-stability**: Safari向けWebSocket接続安定性向上のためのPING/PONGハートビート機能を実装
- **release-auto-option**: リリースコマンドに自動実行オプション(--auto)を追加
- **metrics-file-based-tracking**: Agent実行履歴をファイルベースで追跡する機能を追加
- **remote-ui**: モバイル版にWorktree変換ボタンを追加
- **gemini**: Gemini版document-reviewコマンドをcc-sdd版と同等に更新

### Fixed
- **spec-merge**: 非標準ベースブランチのサポートとskipPermissionsフラグの厳密化
- **document-review**: fixStatus: applied状態で次のレビューラウンドに進めない問題を修正
- **auto-execution**: スペック自動実行時のフラグ汚染バグを修正
- **spec-workflow**: worktree環境でのディレクトリ認識を改善
- **bug-workflow**: worktree環境でのディレクトリ認識を改善
- **gemini**: enforce report file creation in document-review and reply commands
- **remote-ui**: スマホ版Spec詳細画面の重複フッター問題を修正
- **mobile**: モバイル版ワークフローフッターのセーフエリア対応

### Changed
- **refactor(jj-merge-support)**: テストファイルをtemplatesから適切な場所に移動
- **refactor**: 自動実行設定をspec.jsonをSSOTとして統一
- **style**: Remote UI Artifactエディターのボタンサイズを統一

### Documentation
- Electronレイアウト図の階層構造を修正

## [0.51.3] - 2026-01-26

### Fixed
- **electron**: Electron起動オプションとE2Eテストフィクスチャを更新

### Changed
- **agent-log**: Agentログヘッダーにengine tagを表示、engineIdを必須に変更

## [0.51.2] - 2026-01-26

### Fixed
- **document-review**: engineIdがrenderer層に伝播されない問題を修正
- **docs**: structure.mdのengineId伝播に関するドキュメントを更新

### Tests
- **document-review**: Gemini Document Review engineId伝播のテストを追加

## [0.51.1] - 2026-01-26

### Added
- **sdd**: 統合テスト戦略の強化とインターフェース変更の影響分析を義務化

### Fixed
- **test**: child_process mock in fileHandlers.test to prevent real VSCode launch

## [0.51.0] - 2026-01-26

### Added
- **remote-ui**: ドキュメントレビューのスキーマ選択APIを追加
- **llm-stream-log-parser**: LLMストリームログパーサーのリファクタリングと拡張
- **remote-ui-agent-store-init**: リモートUIにAgentStore初期化機能を追加
- **remote-dialog-tab-layout**: リモートアクセスダイアログにタブレイアウト機能を追加
- **worktree**: devブランチでもWorktree変換を許可

### Fixed
- **SchemeSelector**: ドロップダウンメニューの横オーバーフローを修正
- **autoExecution**: NOGOフェーズでスキップせず停止するように修正
- **buildClaudeArgs**: プロンプトの先頭が - の場合の unknown option エラーを防止
- **specsWatcherService**: spec-merge後のupdated_at無意味な更新を防止
- **ipc**: resolve require is not defined error in renderer IpcApiClient by using window.__STORES__
- **remote-ui**: SpecsViewにrunningAgentCountを追加
- **remote-ui**: スマホ版でフッターがURLバーの裏に隠れる問題を修正

### Changed
- **style**: ScheduleTaskSettingViewダイアログサイズを拡大
- **chore**: レイアウト設定の更新
- **docs**: GEMINI.md for Gemini CLI configuration追加

## [0.50.0] - 2026-01-25

### Added
- **llm-engine-abstraction**: LLMエンジン抽象化とプロジェクト単位設定機能を追加

### Fixed
- **gemini-document-review**: メニューイベントハンドラの欠落を修正
- **metrics**: resumeAgentでAI実行時間の計測が開始されないバグを修正

### Changed
- **steering**: テンプレートの整理

## [0.49.0] - 2026-01-25

### Added
- **runtime-agents-restructure**: エージェント記録・ログ管理のモジュール分離とマイグレーション機能を追加
- **document-review-phase**: SDDワークフローにドキュメントレビューフェーズを追加
- **sdd**: 統合テスト戦略をSDDプロセス全フェーズに組み込み

### Fixed
- **mcp-server-integration**: Main→Renderer状態同期の実装漏れを修正
- **UI**: リモートアクセスアイコンを常時表示し、オフ時はグレーアウト
- **test**: child_processモックの不備によるfileHandlers.testの失敗を修正

## [0.48.1] - 2026-01-25

### Fixed
- **bug-phase-update**: IPCハンドラーの二重登録を修正（起動時のUnhandledPromiseRejectionWarning解消）
- **release-smoke-test**: スモークテストでUnhandled promise rejectionをログファイルから検出するよう改善
- **unhandled-rejection-logging**: 未処理のPromise rejectionをログファイルに記録するハンドラーを追加

## [0.48.0] - 2026-01-25

### Added
- **auto-execution-projectpath-fix**: projectPath引数による自動実行コマンド呼び出しを実装
- **prompt-worktree-support**: spec-plan/bug-createプロンプトにworktreeサポートを追加
- **impl-mode-toggle**: Implフェーズの実行モード切り替え機能を追加

### Fixed
- **bugs-watcher**: BugsListでファイル変更監視が開始されない問題を修正
- **preload-ipc-refactor**: マージで失われたEXECUTE_PROJECT_COMMANDハンドラーを復元
- **document-review**: schemeパラメータがexecute呼び出しに渡されない問題を修正
- **electron**: vite-plugin-electron起動時の不要な引数を削除

### Changed
- **refactor(preload-ipc-refactor)**: IPCハンドラーをドメイン別ファイルに分離
- **chore**: 不要なプレースホルダーファイルを削除

## [0.47.3] - 2026-01-25

### Fixed
- **build**: MCP SDKのサブパスエクスポート問題を解決（@rollup/plugin-node-resolveを導入してバンドルに完全に含める）

## [0.47.2] - 2026-01-25

### Fixed
- **build**: @modelcontextprotocol/sdkをバンドルに含めるよう修正（パッケージング後のモジュール解決エラーを修正）

## [0.47.1] - 2026-01-25

### Fixed
- **release-button-api-fix**: リリースボタンAPI修正とexecuteProjectCommand統一
- **test**: MCP SDK関連テストの修正

### Changed
- **refactor(mcp)**: 動的インポートを静的インポートに変更

## [0.47.0] - 2026-01-25

### Added
- **mcp-server-integration**: SDD OrchestratorにMCPサーバー機能を統合

### Fixed
- **build**: @modelcontextprotocol/sdkをexternalモジュールとして設定
- **SpecsWatcher**: ログ監視除外とAgentProcessのメモリリーク修正
- **metrics**: 全Spec Agentフェーズのメトリクス計測を有効化

### Changed
- **refactor**: Artifact定数を共通化しMain/Renderer間のハードコードを解消
- **refactor**: Worktree型定義をsharedに統合し重複を解消

### Tests
- テスト期待値を最新の実装に合わせて更新

### Documentation
- implementation-review の Worktree 型統合を解決済みセクションに移動

## [0.46.0] - 2026-01-25

### Added
- **mobile-layout-refine**: モバイルUI詳細ビューとナビゲーション改善
- **generate-release-command**: steering-releaseからgenerate-releaseへリネームとコマンド体系を統一

### Changed
- **refactor(docs)**: ドキュメント構造を整理しincidents/technical-notesカテゴリを追加
- **refactor**: verification.md を verification-commands.md にリネーム

## [0.45.0] - 2026-01-24

### Added
- **bugs-view-unification**: Electron/Remote UI間でBugsView統一
- **project-agent-release-footer**: ProjectAgentPanelにリリースフッターを追加

### Fixed
- **spec-inspection**: deploy-complete時のphase/updated_at更新をスキップ
- **bugs**: 空のバグディレクトリをスキップしてtoast警告を表示
- **metrics**: AI実行時間の計測をspecManagerService内で直接実行

### Chores
- テストコマンドをtaskに統一、steering整理

## [0.44.0] - 2026-01-24

### Added
- **spec-auto-impl**: spec-auto-implコマンドを追加し、全タスクの自動実行をサポート
- **e2e**: エージェントログストリーミングE2Eテストとストリーミング版Mockを追加
- **e2e**: setMockEnv APIでテスト中の動的モック設定をサポート
- **ui**: Headerにリモートサーバー稼働時のネットワークアイコンを追加
- **agent**: エージェント起動時のプロンプトをメタファイルに記録
- **kiro**: merge-helperスクリプトとタスク生成ルール改善
- **skill**: E2Eテスト記述Skill追加とテスト一覧更新
- **spec-merge**: squash-merge時に変更内容を分析してコミットメッセージを生成
- **auto-execution**: inspection実行時に--autofixフラグを使用

### Fixed
- **spec-merge**: 自動実行時にpermissions.deployをチェックするように修正
- **merge**: squash-merge後のブランチ削除で最初から-Dを使用
- **spec-inspection**: phase更新ステップ7を復帰
- **ui**: RecentProjectListのローディング中ボタン連続クリック防止
- **path**: resolveEntityPathでspec.json/bug.jsonの存在もチェック
- **workflow**: Renderer側のphase自動補正ロジックを削除
- **ui**: ProjectAgentPanelにスクロール機能を追加
- **ui**: AgentLogPanelのコピーボタンでログファイルパスをコピー

### Changed
- **refactor**: ImplPhasePanelからisImplStarted状態を削除

### Tests
- **e2e**: inspection/impl自動実行フローのテストを追加
- **agent**: resumeAgentのプロンプトログ追加テストを追加
- **bug**: executeBugPhaseテストの--allowedToolsフラグ形式を修正

### Chores
- 未使用のtemplates/commands/kiro/ディレクトリを削除

## [0.43.2] - 2026-01-24

### Fixed
- **remote-ui**: AgentStateInfoにcommandとsessionIdを追加（リモートUIでのログ表示に必要）
- **metrics**: startAgentでstatusCallbackを'running'で呼び出すよう修正
- **agent-log**: スクロールバック時の自動スクロール追従を抑制

### Performance
- **agent-log**: インクリメンタルパースでログ大量時のレインボーサークル問題を修正

### Documentation
- **steering**: symbol-semantic-mapを最新のコードベースに更新

## [0.43.1] - 2026-01-24

### Fixed
- **parallel**: parallelTaskInfoをspecDetailに統合し並列ボタン表示を修正

### Tests
- **cli-installer**: CLIインストーラーサービスのテストを追加
- **bug-auto-execution**: IPC通信とデータシリアライゼーションのテストを追加

## [0.43.0] - 2026-01-23

### Added
- **workflow**: ワークフローフェーズにInfo説明ダイアログを追加
- **workflow**: フェーズ説明定数（PHASE_DESCRIPTIONS等）を追加

### Fixed
- **workflow**: getSpecMetricsのレスポンス二重ラップを修正
- **editor**: worktreeモードでArtifact保存が正しく動作しない問題を修正
- **remote-ui**: ParallelModeToggleがRemote UIで表示されない問題を修正
- **agent**: `--disallowedTools`/`--allowedTools`が後続引数を消費するバグを修正

### Changed
- **chore**: deprecatedなWorkflowView.tsxと関連テストを削除

## [0.42.2] - 2026-01-23

### Fixed
- **agent**: `normalizeClaudeArgs`で`--disallowedTools`が結合されるバグを修正

## [0.42.1] - 2026-01-23

### Fixed
- **agent-log**: Zustand getSnapshot 無限ループによるクラッシュを修正

## [0.42.0] - 2026-01-23

### Added
- **metrics**: Human時間トラッキングにアクティビティ記録を追加
- **metrics**: メトリクスパネルに説明ダイアログを追加
- **remote-ui**: デスクトップ版メインパネルにArtifact編集機能を追加
- **remote-ui-create-buttons**: Create buttons機能をworktreeからマージ

### Fixed
- **agent-log**: stdin二重表示バグの再修正とテスト追加
- **agent-log**: エージェント起動時のログストリーム表示のレース条件を修正
- **cli**: AskUserQuestionをstream-jsonモードで無効化
- **ui**: Askボタンのアイコンを適切に修正
- **test**: テストモックを実装変更に追従

### Changed
- **refactor**: SpecDetailViewコンポーネントを削除
- **refactor**: 自動実行アイコンをBotに変更、worktreeラベル簡略化
- **refactor**: レイアウト設定をapp-wideに移行しデフォルトサイズを拡大
- **refactor**: WorkflowViewをElectron/Remote-UI間で統一

## [0.41.0] - 2026-01-23

### Added
- **spec-productivity-metrics**: Spec生産性メトリクス機能の実装（worktreeからマージ）
- **api**: ISpecWorkflowApi統一インターフェースを追加
- **e2e**: remote-ui.helpersにリトライロジックを追加
- **ask**: askフェーズの二重起動制限を解除
- **bug-workflow**: worktreeモード時にDeployラベルをMergeに変更
- **remote-ui**: DesktopLayoutにResizeHandle機能を追加
- **remote-ui**: 左サイドバー下部にProjectAgentパネルを追加
- **bug-create-dialog-unification**: バグ作成ダイアログの統一実装をworktreeからマージ

### Fixed
- **ipc**: metrics IPCハンドラーの二重登録を修正
- **agent-log**: ユーザー入力の二重表示を修正
- **bug-workflow**: bug-mergeをprojectPathで実行するよう修正
- **remote-ui**: Spec/Bug一覧のレート制限問題を修正
- **remote-ui**: RightSidebarのレイアウトをElectron版に準拠
- **bug-merge**: worktree内からbug.jsonを読むようにspec-mergeと統一
- **remote-access**: Remote AccessダイアログのURLにアクセストークンを含める
- **project-agent**: プロジェクト選択時に古いProjectAgentを自動選択する問題を修正

### Changed
- **refactor**: AgentLogPanelをElectron/Remote-UI間で共通化
- **refactor**: ResizeHandleコンポーネントを共通化
- **refactor**: ProjectAgentPanelを共通AgentListコンポーネントに統合
- **refactor**: SpecListをremote-uiとの共通化を見据えてリファクタ
- **refactor**: AgentListPanel/AgentViewのAgent一覧を共通コンポーネント化
- **refactor**: DesktopLayoutをElectron版に準拠するよう再構築
- **refactor**: SpecWorkflowFooterとworktreeユーティリティをsharedに共通化

### Testing
- **test**: SpecActionsViewの重複data-testid削除
- **test**: E2Eテスト用フィクスチャの更新
- **e2e**: 重複テストを共通モジュールに統合
- **e2e**: Document ReviewとInspectionのUI状態遷移テストを追加
- **test**: 削除/移動された機能の空スキップテストを削除
- **test**: 並列実行時にflakyなテストを削除
- **test**: テストとコンポーネントのtestid不一致を修正

### Chores
- **gitignore**: events.jsonlと.playwright-remote-portを除外

## [0.40.0] - 2026-01-23

### Added
- **merge-helper-scripts**: マージ操作用ヘルパースクリプトの実装
- **parallel-task-impl**: 並列タスク実行機能の実装

### Fixed
- **project-agent-no-response**: ProjectAgentのresumeが動作しない問題を修正
- **worktree**: --add-dirオプションによる親リポジトリ参照問題を修正
- **bug-auto-execution**: bug:プレフィックスのworktreeCwd自動解決を修正

## [0.39.0] - 2026-01-22

### Added
- **bug-worktree-spec-alignment**: Bug worktreeとSpec整合性機能の実装
- **create-spec-dialog-simplify**: Spec作成ダイアログの簡素化
- **e2e**: E2Eテスト用ゾンビElectronプロセスのクリーンアップ機能追加

### Fixed
- **specsWatcherService**: checkTaskCompletionがdeploy-completeを上書きしない問題を修正
- **bug-auto-execution**: worktreeモードで正しいcwdを使用するように修正
- **BugsWatcherService**: worktree変換後にBugsListが自動更新されない問題を修正
- **e2e**: __STORES__参照名をwindow公開名に修正
- **InspectionPanel**: GO/NOGOトグルボタンを復元

### Documentation
- spec-productivity-metricsの設計をagentStore/SSOT構造に整合

## [0.38.0] - 2026-01-22

### Added
- **prompts**: リファクタリング完遂のためのプロンプト改善
- **inspection-permission-unification**: Inspection Permission統一の実装
- **remote-ui-bug-advanced-features**: Remote UI Bug Advanced Featuresの実装
- **worktree-convert-spec-optimization**: Worktree Convert Spec最適化の実装

### Fixed
- **specs**: spec.jsonの壊れたJSON構文を修正
- **spec-inspection**: phase更新ステップの番号を6.5から7に変更
- **AgentProcess**: JSONL出力の行バッファリングを追加

### Changed
- **tests**: agentStore/sharedAgentStore SSOT構造に対応したテスト修正
- events.jsonlをgit追跡から除外

## [0.37.1] - 2026-01-22

### Fixed
- **AgentLogPanel**: getSnapshot無限ループエラーを修正

## [0.37.0] - 2026-01-22

### Added
- **agent-store-unification**: Agent Store統一の実装をworktreeからマージ
- **agent-log-ui-improvement**: Agent Log UI改善を実装
- **common-commands-installer**: 共通コマンドインストーラーを追加
- **bugs-workflow-footer**: Bugsワークフローフッターを追加

### Fixed
- **spec-merge**: テンプレート側もworktree内spec.jsonを読むように修正

### Documentation
- agent-resume-cwd-mismatch バグ修正ドキュメントを追加

## [0.36.0] - 2026-01-21

### Added
- **agent-exit-robustness**: Agent終了処理の堅牢性向上

### Fixed
- **layoutConfigService**: saveLayoutConfig/saveProfileでsettingsフィールドを保持
- **spec-merge**: worktree側のspec.jsonを読むように修正

## [0.35.5] - 2026-01-21

### Added
- **spec-event-log**: イベントログ機能の実装をworktreeからマージ

### Fixed
- **spec-merge**: 関係ないファイルのステージングを防止

### Changed
- **spec-merge**: spec.json更新処理をworktree側に移動

## [0.35.4] - 2026-01-21

### Added
- **skill**: test-fixコマンドを追加（テスト実行と失敗時の自動解析・修正）

### Fixed
- **bug**: agentStoreの動的importを静的importに変更（Promise遅延によるレースコンディションを回避）
- **bug**: convertWorktreeHandlersにresolveSpecPathを追加
- **bug**: 自動実行フローにinspection/spec-mergeハンドラを追加
- **test**: specStoreFacade循環参照問題を解決
- **test**: e2eフィクスチャのフェーズ名を新命名規則に更新

### Removed
- **skill**: 非推奨のspec-managerコマンドを削除

### Documentation
- 調査・レビュードキュメントを追加

## [0.35.3] - 2026-01-21

### Fixed
- **bug**: START_IMPL/AUTO_EXECUTION_STARTにresolveSpecPathを追加
- **bug**: BugsタブでArtifactが表示されない問題を修正

### Documentation
- start-impl-path-resolution-missing verification完了

## [0.35.2] - 2026-01-21

### Fixed
- **worktree**: `getSpecWorktreeCwd()`がworktree内spec.jsonを見つけられないバグを修正

## [0.35.1] - 2026-01-21

### Changed
- **spec-path-ssot**: IPC API nameベース移行（pathフィールドからname基準へ）
- **spec-path-ssot**: SpecMetadata/BugMetadata型からpathフィールドを削除
- **spec-path-ssot**: UIコンポーネント・stores・servicesからpath依存を削除
- **spec-path-ssot**: Remote UI WebSocket APIをname基準に同期
- **spec-path-ssot**: Specs/BugsWatcherServiceを2段階監視対応に改善

### Tests
- グローバルモック設定とhandlerテストのunmock追加
- spec-path-ssotリファクタリングによる期待値・テストデータの修正
- テスト全体の安定性向上

### Documentation
- spec-path-ssot仕様ドキュメント追加とphase完了

## [0.35.0] - 2026-01-19

### Added
- **steering**: JIT読み込み方式でコンテキスト最適化を実装
- **convert-spec-to-worktree**: 通常SpecからWorktreeへの変換機能を実装
- **bugs-worktree-directory-mode**: Bug Worktreeのディレクトリ方式を実装
- **e2e**: worktree spec同期テスト用fixtureとE2Eテストを追加

### Fixed
- **spec-impl**: cc-sdd-agent版をサブエージェント委譲型に復元
- **tasks-checklist-false-positive**: Coverage Validation Checklistを再削除
- **agent**: CC_SDD_AGENTSにsteering-verificationを追加
- **worktree**: readSpecsでworktree内のspecも読み取るように修正
- **e2e**: fixtureのspec.jsonのphase名を正しい値に修正

### Changed
- **refactor**: SpecWorkflowFooterコンポーネントを独立化
- **refactor**: CreateBugDialogのWorktreeチェックボックスをスライドスイッチに統一
- **refactor**: ImplFlowFrameコンポーネントを削除

### Chores
- **e2e**: fixtureプロジェクトに.claudeと.kiro/settingsシンボリックリンクを追加

## [0.34.2] - 2026-01-19

### Added
- **worktree**: Spec作成時のworktree早期作成機能を実装
- **steering**: steering-release-integration merge実装（worktreeからの統合）

### Documentation
- **steering**: Electron Process Boundary Rulesを追加
- **bug**: 自動実行設定のリアルタイム反映バグの調査・修正ドキュメントを追加

## [0.34.1] - 2026-01-19

### Changed
- **agent**: skipPermissionsをMain Processで一元管理

## [0.34.0] - 2026-01-19

### Added
- **e2e**: Remote UI Bug高度な機能のPlaywrightテストを追加

### Fixed
- **electron**: Remote UI bugs broadcast & worktree symlink改善
- **settings**: skipPermissionsがRecentProjectsから選択時に読み込まれない問題を修正
- **agent**: recordToAgentInfoでcwdフィールドがマッピングされていない問題を修正

## [0.33.1] - 2026-01-19

### Added
- **worktree**: `--add-dir` オプションでworktreeモード時のsymlinkアクセスをサポート
- **e2e**: Electron動的ポートのPlaywright連携を実装
- **e2e**: Remote UIのフェーズ実行・ワークフロー統合テストを追加
- **e2e**: Remote UI自動実行機能のE2Eテストを追加
- **e2e**: Smartphone版Remote UIのSpec管理テストを追加
- **e2e**: Remote UI Bug管理機能のE2Eテストを追加

### Fixed
- **agent**: resumeAgentでworktree cwdが引き継がれない問題を修正
- **worktree**: specディレクトリをファイル単位symlinkに変更
- **remote-ui**: WebSocket経由のSpec詳細取得を修正
- **remote-ui**: WebSocketApiClientの自動実行メッセージタイプを修正

### Documentation
- 技術検討・調査メモを追加（debatex統合、Gemini CLI検討、デッドコード分析等）
- E2Eテストカバレッジ分析ドキュメントを更新
- Web E2Eテストガイドにモバイルテストパターンを追加

### Changed
- **kiro**: spec-requirementsにRemote UI影響確認ステップを追加
- **kiro**: steering/verification.mdとspec-inspection検証コマンド定義を追加
- **kiro**: tasksテンプレートを簡素化（Method/Verifyフィールド削除）

## [0.33.0] - 2026-01-18

### Added
- **impl-start-unification**: impl開始ロジックをMain Processに統合
- **debatex-document-review**: debatex統合とプロジェクトデフォルトscheme設定の実装
- **spec-prompts**: タスク実装方法の検証機能を追加
- **debug**: MCP互換のZustandストアデバッグAPIを追加
- **steering-verification**: verification.md生成とspec-inspection統合

### Fixed
- **steering-verification**: verification.md生成ボタンでProject Agentを起動
- **SpecDetail**: worktree情報のオプショナルフィールドを条件表示

### Changed
- コマンドセットテンプレートにタスク実装方法検証機能を反映

### Style
- 実行中インジケーターのサイズをボタンと統一

### Documentation
- 開発環境でのログパス記述を修正

## [0.32.0] - 2026-01-18

### Added
- **worktree-mode-spec-scoped**: WorktreeConfigにenabledフィールドを追加し、workflowStoreからworktreeモード状態を削除
- **investigation-mode Skill整備**: investigation-mode Skillの正式整備

### Fixed
- **gemini-document-review SchemeSelector配置**: SchemeSelector配置を要件通りDocumentReviewPanel内に修正

### Changed
- **SchemeSelector選択状態表示**: 選択中項目をチェックマークで表示するUIに改善
- **自動実行指示アイコン統一**: 自動実行指示アイコンをPauseに統一

### Documentation
- Skill移行検討ドキュメントを議論結論に基づき更新
- CLAUDE.mdのSkill化整理

## [0.31.2] - 2026-01-18

### Added
- **agent-launch-optimistic-ui**: worktreeからの実装マージ機能

### Fixed
- **spec-merge phase更新**: マージ完了時にphaseをdeploy-completeに更新する手順を追加
- **.kiro/logsをgitignore**: ログファイルを追跡対象から除外

### Changed
- **renderer/shared統合**: renderer/shared間の重複コンポーネントを統合
- **spec-merge投機的更新**: spec.jsonをマージ前に投機的更新する方式に変更
- **worktree準備処理統合**: spec-merge worktree準備処理を1ライナーに統合

## [0.31.1] - 2026-01-17

### Added
- **worktree自動コミット機能**: spec未コミット時の自動コミットとマージ前準備処理
- **specシンボリックリンク**: worktreeへのspec全体のシンボリックリンク作成

### Fixed
- **spec-merge自動コミット**: worktree内の未コミット変更を自動コミットするStep追加
- **impl-panel重複表示**: 実行中ローディング表示の重複を解消
- **remote-ui data-testid**: data-testidの複合値をシングル値に修正

### Changed
- **停止アイコン統一**: 自動実行停止アイコンをBanからPauseに統一
- **パネルアイコン削除**: DocumentReviewPanel/InspectionPanelのタイトル横アイコンを削除

## [0.31.0] - 2026-01-17

### Added
- **execute*メソッド統一**: execute*メソッド群を統一しExecuteOptions Union型を導入
- **investigation-mode Skill化**: investigation-modeをSkillにマイグレーション
- **AgentIcon/AgentBranchIconコンポーネント**: エージェントアイコン表示を統一

### Changed
- **SpecManagerStatusDisplayコンポーネント削除**: workflow-viewからコンポーネントを削除しUIを簡素化

## [0.30.2] - 2026-01-17

### Added
- **Gemini CLI/debatex対応**: ドキュメントレビューのscheme切替機能を実装

### Fixed
- **停止ボタン修正**: Bug自動実行の停止ボタンが機能しない問題を修正
- **worktree checkout問題修正**: checkout完了前にAgentが起動する問題を修正
- **DocumentReviewPanelボタン表示**: 最新ラウンドのfixStatusを基準にボタン表示を判定
- **TypeScript型定義復元**: v0.30.1以降に欠落した型定義を復元

### Changed
- **Agent実行中インジケーター統一**: Bot + animate-pulseに統一

## [0.30.1] - 2026-01-17

### Added
- **Fix Tasksの連番形式**: spec-inspection --fixで追加されるFIX-N形式のタスクIDに対応

### Changed
- **worktreeパス変更**: worktreeパスをプロジェクト内部（.kiro/worktrees/）に変更
- **worktree判定関数統一**: hasWorktreePath関数に統一してworktree判定を一元化

### Fixed
- **AutoExecutionStatusDisplay冗長表示**: WorkflowViewのAutoExecutionStatusDisplay冗長表示を削除
- **onBugAutoExecutionExecutePhaseリスナー欠落**: Bug自動実行のフェーズ実行リスナーを追加
- **SpecListのworktreeバッジ表示条件**: worktreeバッジの表示条件を修正
- **worktreeモードでのClaude CLI cwd**: worktreeモードでClaude CLIのcwdを正しく設定
- **spec-impl updated_at更新**: 実行開始時にupdated_atを更新する指示を追加
- **inspection --fixモード仕様**: --fixモードでfixedAt更新を強調
- **サブエージェントpermissionMode**: サブエージェントにpermissionMode: bypassPermissionsを追加

### Removed
- **プロジェクト固有表現削除**: コマンドセットからプロジェクト固有表現を削除

## [0.30.0] - 2026-01-17

### Added
- **ImplFlowFrame責務分離**: ImplFlowFrameの責務分離とUI階層構造の修正を実装

### Changed
- **実験的ツール整理**: 削除済みのplan/commitコマンド関連コードを削除

## [0.29.0] - 2026-01-16

### Added
- **Worktree実行フローUI**: worktreeモード選択UIと実装開始フローの実装
- **Bug自動実行状態管理**: Bug毎の自動実行状態管理を実装
- **ドキュメントレビュー状態表示**: SpecListItemのフェーズバッジにドキュメントレビュー状態を表示

### Changed
- **Remote UI完全移行**: vanillaJS版Remote UIを削除しReact版に完全移行
- **Bug workflowリファクタ**: bug workflow worktree対応とテンプレート簡略化

### Fixed
- **ProjectAgentPanel簡素化**: ヘッダ折り畳み機能を削除
- **自動実行状態リセット**: spec.json の autoExecution.enabled を完了/停止時にリセット
- **DocumentReviewPanel表示**: 冗長なラウンド表示を削除
- **Worktree型修正**: ExecFunction型をNode.js execのシグネチャに修正
- **UTCタイムスタンプルール**: CLAUDE.mdに集約
- **タブ選択状態維持**: タブ切り替え時に選択状態を維持

## [0.28.0] - 2026-01-16

### Added
- **BugWorkflowService追加**: Bug Workflowに自動実行worktree対応を追加
- **Rendererログ統合**: RendererプロセスのログをMainプロセスに統合し、ログ管理を一元化
- **fixStatusフィールド移行**: fixApplied から fixStatus への移行を実施
- **spec.json updated_at更新**: アーティファクト生成時にupdated_atを自動更新
- **Bugs worktree対応**: Requirement 12追加と自動実行worktree対応

### Fixed
- **Remote UI SpecActionsView**: fixStatusフィールドに対応
- **E2Eテスト修正**: beforeAll/afterAllをbefore/afterに修正（Mochaとの互換性）
- **Agentログ自動選択ルール**: Agentログエリアの自動選択ルールを改善
- **Bug自動実行IPC移行**: BugAutoExecutionServiceをIPCクライアントパターンに移行
- **IPC契約不整合修正**: worktree作成エラーの原因となるIPC契約不整合を修正
- **spec-statusボタン削除**: spec-statusボタンと関連コードを完全削除
- **自動実行UI状態依存**: Bug自動実行の状態管理をMain Processに移行（Phase 1）
- **自動スキップ設定削除**: 自動実行のdocument-review/inspectionスキップオプションを削除
- **document-review loading状態**: completeRound()でstatusをpendingに更新

### Changed
- **gitignore更新**: playwright-report/とtest-results/を除外

### Documentation
- **技術ノート追加**: 状態管理統一リファクタリング計画
- **技術ノート追加**: Electron IPC改善とtRPC移行計画
- **E2Eテスト失敗分析**: 失敗分析メモを追加

## [0.27.0] - 2026-01-15

### Added
- **ヘッダープロファイルバッジ表示機能**: ヘッダーにプロファイルバッジ表示機能を追加
- **Git Worktree対応強化**: Impl開始UIの2ボタン分岐を実装し、worktreeを使用した分離開発をサポート
- **Verification Commands検証ステップ**: spec-implにVerification Commands検証ステップを追加

### Fixed
- **ヘッダーspec名二重表示修正**: ヘッダーのspec名二重表示を修正
- **Bug選択時のAgent watcherスコープ**: Bug選択時のAgent watcherスコープ引数を修正
- **vite.configエイリアス追加**: vite.config.tsに@shared, @remote-uiエイリアス追加

### Changed
- **agentStore統合**: specManagerExecutionStoreを廃止しagentStoreに統合

### Testing
- **worktree E2Eテスト**: worktree実装開始ボタンのE2Eテストを追加

### Documentation
- **Entry Point Connection必須ルール**: Entry Point Connection必須ルールとDead Code Detection強化
- **data-testid命名規則**: data-testid命名規則をoperations.mdに追記

## [0.26.0] - 2026-01-14

### Added
- **Agent状態SSOTリファクタリング**: AgentRecordServiceをエージェント状態の単一の真実の源（SSOT）に変更し、状態管理を一元化
- **Agent監視の最適化**: Agent監視の最適化とSpec単位スコープ切り替え機能を実装し、パフォーマンスを向上
- **/commitコマンド正式化**: /commitコマンドを正式コマンドに昇格し、--check-branchオプションを追加

### Fixed
- **spec-inspection言語設定対応**: spec-inspection agentの出力言語をspec.json.languageに従うよう修正
- **spec.json構文修正**: spec.jsonの不正なJSON構文を修正
- **Bug/Spec選択時のAgent監視スコープ切り替え**: Bug/Spec選択時にエージェント監視スコープを正しく切り替えるよう修正
- **タスク進捗計算修正**: タスク進捗計算でChecklistが誤カウントされる問題（false positive）を修正
- **自動実行停止ボタン修正**: 自動実行停止ボタンがMain Process状態消失時に機能しない問題を修正
- **未承認フェーズの自動実行修正**: 未承認フェーズがある状態での自動実行が何も起きない問題を修正
- **SpecListItemクリック時の問題修正**: 存在しないタブが一瞬表示される問題を修正
- **Spec/プロジェクト切り替え時の表示修正**: 古いコンテンツが一瞬表示される問題を修正
- **inspection/deploy-complete状態修正**: SpecListItemクリック時にinspection/deploy-completeがダウングレードされる問題を修正
- **SpecListItemスピナー修正**: クリック時にリスト全体がスピナーになる問題を修正
- **N+1 IPC問題修正**: loadSpecs/refreshSpecs削除でN+1 IPC問題を修正
- **specJsonMap一括読み込み**: specJsonMapをMain processで一括読み込みして返すよう修正
- **phase表示修正**: selectProject後にloadSpecJsonsを呼び出してphase表示を修正

### Changed
- **validate-gap/validate-design機能削除**: 未使用のvalidate-gap/validate-design機能を削除しコードベースを簡素化

### Testing
- **モックパターン修正**: spec-metadata-ssot-refactorのモックパターンとインターフェース構造を修正
- **テスト修正**: loadSpecs/refreshSpecs削除に伴うテスト修正

### Documentation
- **PROJECT引数ドキュメント追加**: PROJECT引数によるプロジェクト選択済み起動方法をドキュメントに追加

## [0.25.0] - 2026-01-13

### Added
- **Web E2Eテスト基盤**: Playwrightを使用したWeb E2Eテスト基盤を実装
- **Worktree UI表示機能**: Git worktree情報をSpec詳細画面に表示（Task 11-13）

### Changed
- **SpecMetadata SSOTリファクタリング**: SpecMetadata SSOT原則に基づくリファクタリングを実施

### Fixed
- **Bugsワークフロー進捗更新**: 競合状態によるBugsワークフロー進捗更新問題を修正
- **Inspection自動実行フラグ**: Inspection自動実行フラグの変更が正しく反映されるよう修正
- **自動実行NOGOフェーズ**: 自動実行でNOGOフェーズをスキップせず停止するよう修正

### Testing
- **SpecDetailコンポーネントテスト**: Worktree情報表示のユニットテストを追加

## [0.24.0] - 2026-01-13

### Added
- **Remote UIビュー統合とタブ切り替え**: Task 13でRemote UIのビュー統合とタブ切り替え機能を実装
- **cc-sddカスタムプロンプトコマンド**: project-ask, spec-ask, spec-mergeコマンドを追加
- **要件追跡性とカバレッジ検証**: spec-traceability機能で要件追跡性とカバレッジ検証を強化

### Fixed
- **executeSpecMerge API追加**: git-worktree-supportのexecuteSpecMergeをElectronAPIに追加

## [0.23.0] - 2026-01-12

### Added
- **Git Worktree分離開発機能**: Git worktreeを使用した分離開発機能を実装し、Spec単位でのブランチ分離開発をサポート
- **BugList実行中エージェント数表示**: BugListに実行中エージェント数のバッジを追加

### Fixed
- **spec-impl bypassPermissions対応**: サブエージェントにpermissionMode: bypassPermissionsを追加
- **bugStore差分更新問題修正**: File Watchイベントの差分更新によるselectedBugクリア問題を修正
- **executeBugPhase allowedTools対応**: CLIにallowedToolsを渡すよう修正
- **sessionIdパースチャンク分割対応**: specManagerServiceのsessionIdパースがチャンク分割に対応
- **document-review autofix修正**: autofix適用後にapprovedを設定しないよう修正
- **spec-planタイムスタンプ取得修正**: タイムスタンプ取得にdateコマンドを使用

### Testing
- document-review autofix後のループ継続検証テストとモックCLIを追加

## [0.22.1] - 2026-01-12

### Fixed
- **AgentLogPanel白画面修正**: Zustandセレクタの無限ループによる白画面問題を修正

## [0.22.0] - 2026-01-12

### Added
- **Document Review自動ループ機能**: Document Reviewの自動ループ実行機能を追加し、レビュー→修正→再レビューのサイクルを自動化
- **Logging Compliance検査**: document-reviewにLogging Compliance検査機能を追加
- **ステアリングテンプレート追加**: logging.md/debugging.mdステアリングテンプレートを追加

### Fixed
- **検索マッチ自動スクロール**: 検索マッチ位置への自動スクロールとタブ切替時のクリア処理を追加
- **Design Decisionsセクション復元**: design-templateのDesign Decisionsセクションを復元
- **requirements-template復元**: Decision Log/Out of Scope/Open Questionsセクションを復元
- **skipPermissions永続化**: skipPermissions設定のプロジェクト毎永続化を修正
- **自動実行デフォルト値**: 自動実行許可設定のデフォルト値をGOに変更
- **AgentLogPanelリアルタイム表示**: 新規Agent追加時のリアルタイムログ表示を修正
- **AutoExecutionCoordinator**: impl NOGO時のdocument-review完了後の状態を修正
- **WorkflowView FIX-Nパース**: spec-inspection --fix で追加されるFIX-N形式のタスクIDをパース対応
- **spec-inspection --fix修正**: --fixオプションで既存レポートを参照するよう修正

### Testing
- 削除されたPlanコマンド関連のE2Eテストを削除

## [0.21.0] - 2026-01-11

### Added
- **ロギングステアリングガイドライン**: プロジェクト別のロギング設定・運用ガイドラインをステアリングドキュメントとして追加

### Fixed
- **document-review parseReplyFile廃止**: parseReplyFileを廃止しspec.jsonベースのステータス確認に変更
- **spec-inspection --fixモード修正**: spec-inspection --fixモードでサブエージェント呼び出しとfixedAt更新を実装

### Documentation
- Electron/Web機能比較ドキュメントを追加
- stream-mode session-id取得方法を追加

### Testing
- document-review E2Eテストとfixturesの更新

## [0.20.1] - 2026-01-11

### Fixed
- **コマンドセットインストール時の.kiro/bugsディレクトリ作成**: コマンドセットインストール時に.kiro/bugsディレクトリが存在しない場合自動作成するよう修正
- **Watcherの存在しないディレクトリ監視問題**: Watcherが存在しないディレクトリを監視できない問題を修正

## [0.20.0] - 2026-01-10

### Added
- **Remote UIのReact移行と共有アーキテクチャ実装**: Remote UIをReactに移行し、Electron版と共有アーキテクチャを実現

### Fixed
- **Zustandセレクタパターンの修正**: agent-log-textfield-inactiveバグを修正（AgentLogPanelのTextField非活性問題）
- **auto-execution E2Eテストの修正**: E2Eテストの安定性を改善

## [0.19.1] - 2026-01-07

### Fixed
- **起動時の白画面問題を修正**: IPCハンドラー未登録（cloudflare:get-settings）と未実装コード参照（installExperimentalPlan）の問題を修正
- **Inspectionタブ表示修正**: 最新のInspectionタブのみ表示される問題を修正し、全ラウンドのタブを表示するよう改善

### Documentation
- AI設計原則の他プロジェクト適用ガイドを追加

## [0.19.0] - 2026-01-07

### Added
- **spec-planコマンド追加**: spec-managerプロファイルに対話型要件生成コマンド（spec-plan）を追加
- **CC_SDD_COMMANDS拡張**: cc-sddプロファイルにspec-planコマンドを追加

### Changed
- **実験的/planコマンド削除**: 実験的ツールから/planコマンドを削除（spec-planに統合）

## [0.18.0] - 2026-01-07

### Added
- **対話型要件生成コマンド**: spec-planによる対話的な要件生成ワークフローを追加
- **CreateSpecDialogプランニングボタン**: Spec作成ダイアログに「プランニングで開始」ボタンを追加
- **rendererログ出力**: rendererプロセスのログをmainプロセス経由でファイル出力するよう改善

### Fixed
- **Remote UI Spec一覧改善**: 実行中Agent件数バッジとPhaseバッジを追加
- **Remote UI Agent一覧フィルタリング**: 選択中のSpec/Bugでエージェント一覧をフィルタリング
- **Remote UI Spec/Bug作成ボタン**: (+)ボタンとダイアログを追加
- **Remote UI エージェントログ表示**: Remote UIでエージェントログを表示できるよう修正
- **specsWatcher inspection判定**: GO判定を新フォーマットに対応
- **コマンドセットインストーラー**: インストール後に必須ディレクトリを自動作成

### Documentation
- バグレポート追加（commandset-install-missing-dirs, remote-ui-spec-list-display-gaps）
- discord-bot-integration Spec追加（設計フェーズ完了）

## [0.17.2] - 2026-01-06

### Added
- **Design Decisionsセクション**: spec-designにDesign Decisionsセクションを追加

### Fixed
- **bug-workflow Deployフェーズ**: DeployフェーズでbugNameを/commitに渡すよう修正
- **agentRecordWatcherService**: アーキテクチャをspecsWatcher/bugsWatcherと統一
- **bugStore SSOT**: refreshBugsがprojectStore.currentProjectを参照するよう修正

## [0.17.1] - 2026-01-05

### Fixed
- **bugsディレクトリ監視修正**: bugsディレクトリが存在しない場合のファイル監視を修正

## [0.17.0] - 2026-01-04

### Added
- **Ask Agent機能**: Ask Agentによるカスタムプロンプト実行機能を追加（spec-ask, project-ask）

### Changed
- **ワークフローフェーズ名変更**: DeployフェーズをCommitに名称変更

### Fixed
- **spec-inspection直接実行型**: cc-sddプロファイルのspec-inspectionをagent非依存の直接実行型に変更

### Documentation
- spec-inspection型定義をテンプレートと同期しプロファイル情報を改善

## [0.16.2] - 2026-01-04

### Fixed
- **resumeAgent skipPermissions対応**: resumeAgentにskipPermissionsパラメータを追加し、Agent再開時の権限確認をスキップ可能に

### Changed
- **deploy_completedフラグ廃止**: deploy_completedフラグを廃止し、phase: 'deploy-complete'に統一

### Documentation
- Specコミット時にドキュメントディレクトリも含める指示を追加
- メモおよび今後の構想を追加

## [0.16.1] - 2026-01-04

### Fixed
- **自動実行フェーズ完了時の承認処理**: フェーズ完了時の自動承認と前フェーズ承認チェックを追加
- **spec.json選択時の設定同期**: spec.json選択時にautoExecution設定をworkflowStoreに同期
- **tasksフェーズ完了後のDocument Reviewワークフロー**: tasksフェーズ完了後のDocument Reviewワークフローを実装
- **自動実行の途中再開**: 完了済みフェーズをスキップする機能を復元
- **E2Eテストゾンビプロセス**: E2Eテスト終了時のゾンビプロセスクリーンアップを追加

### Changed
- **設計ドキュメント検証強化**: spec-designの設計ドキュメント内部一貫性検証を強化

### Testing
- **自動実行E2Eテスト**: 自動実行系のE2Eテストを拡充
- **途中再開シナリオテスト**: 自動実行の途中再開シナリオのE2Eテストを追加
- **resume-testフィクスチャ更新**: resume-testフィクスチャを自動実行テスト用に更新

## [0.16.0] - 2026-01-04

### Added
- **マルチフェーズ自動実行**: 複数フェーズの連続自動実行機能を実装
- **コマンドセットバージョン検出**: コマンドセットのバージョン検出・更新通知機能を追加
- **E2Eテスト分離機能**: E2Eテストの分離機能を追加し、テスト実行を安定化

### Fixed
- **IPCイベント同期**: IPCイベントをspecStoreに同期するSSoTパターンを実装
- **InspectionState簡素化**: InspectionStateデータ構造を簡素化し責務を明確化
- **Inspection/Deploy完了時のphase自動更新**: 検査・デプロイ完了時にspec.jsonのphaseを自動更新

### Changed
- **SpecStoreリファクタリング**: SpecStoreを責務別に分割しFacadeパターンで統合
- **レガシー実行システム削除**: ExecutionStore/CommandServiceを削除

### Testing
- **E2Eテスト改善**: マルチフェーズ自動実行のE2Eテストを追加・修正
- **Bugワークフローテスト**: フェーズコマンド実行時のbug名引数検証テストを追加

### Documentation
- マルチフェーズ自動実行のアーキテクチャ分析を追加

## [0.15.6] - 2026-01-03

### Fixed
- **/commitコマンド引数サポート**: /commit コマンドに引数サポートを追加
- **Claude CLIベースフラグ統一**: Claude CLIベースフラグの統一処理を追加
- **ファイル監視状態同期**: ファイル監視時にdocumentReview/inspection/tasks状態を同期

### Changed
- **documentReviewリファクタリング**: roundsフィールドを廃止しroundDetailsに統一
- **AutoExecutionService削除**: 非推奨のAutoExecutionServiceを削除
- **WorkflowView簡素化**: WorkflowView/specStoreから非推奨AutoExecutionService参照を削除

### Documentation
- READMEにプロファイル詳細セクションを追加
- AI設計判断の原則をsteeringに追加
- READMEのToDoセクションに今後の開発計画を追加

## [0.15.5] - 2026-01-02

### Fixed
- **ファイル監視時editorStore同期**: ファイル監視時にeditorStoreを同期してUI表示を更新
- **cc-sddプロファイルspec-inspection修正**: cc-sddプロファイルのspec-inspectionをSubagent委譲型に変更
- **Deployボタン有効化修正**: phaseStatusesにinspectionを含めてDeployボタンを正しく有効化

### Changed
- **README刷新**: READMEを刷新し設計思想セクションを追加

### Testing
- **E2Eテスト追加**: tasks.md更新時のeditorStore同期テストを追加

## [0.15.4] - 2026-01-02

### Fixed
- **旧形式spec.json後方互換性**: 旧形式のspec.json inspectionに対する後方互換性を追加

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
