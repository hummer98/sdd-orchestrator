# Requirements: tRPC Service Wiring Completion

## Decision Log

### スコープ: 全72サービス一括配線
- **Discussion**: 段階的（優先ドメイン単位）か一括かを検討
- **Conclusion**: 全72サービスを一括で配線する
- **Rationale**: 全て同じ `trpc-full-migration` の実装漏れであり、パターンも統一的。分割するメリットがなく、一括対応が最も効率的。配線完全性テストとの整合性のため、Req 1-9の66サービスに加え、autoExecution/Cloudflare/MCP/Schedule関連の6サービスもスコープに含める

### 再発防止: 配線完全性の自動検証テスト
- **Discussion**: 配線テストをこのSpecに含めるか、別Specにするか
- **Conclusion**: このSpecのスコープに含める
- **Rationale**: 66サービス配線と同時に検証テストを書くことで、将来のサービス追加時にも配線漏れを自動検出できる。インシデントレポートの再発防止策 #5, #6 を実現

### webSocketHandler の扱い
- **Discussion**: webSocketHandler.ts も同じDIパターンに統一するか検討
- **Conclusion**: スコープ外（tRPC productionServices.ts のみ対応）
- **Rationale**: webSocketHandlerは直接import/dynamic importで正常動作中。DI化は1000行超の大規模リファクタリングとなり、インシデント修正の範囲を超える。技術的負債として記録に留める

### 配線パターン
- **Discussion**: 66サービスの配線実装パターンをどうするか
- **Conclusion**: `productionServices.ts` を新規作成し、`createProductionServices()` 関数でドメイン単位のセクションとして72サービスを配線する
- **Rationale**: `handler.ts` の `setupTRPCHandler(window, serviceOverrides)` パターンを活用。`createProductionServices()` が返す `Partial<ContextServices>` を `serviceOverrides` として注入する。ファイルは新規作成が必要（masterブランチにも存在しない）

## Introduction

`trpc-full-migration` マージ（b2d39af8）で発生したDI配線実装漏れの残存問題を完全に解消する。`ContextServices` インターフェースの94プロパティのうち、`handler.ts` および `createDefaultServices()` で既に配線済みの22プロパティ（State/System/ServiceInstances/Config/Startup 19件 + selectProject/getIsE2ETest 2件 + eventBus 1件）を除く、残り72サービスを新規作成する `productionServices.ts` に配線する。72サービスにはrequiredプロパティのプロダクション実装差し替え5件（File 3 + Project 2: `showOpenDialog`, `createNewWindow`）とoptionalプロパティの配線67件を含む。併せて、配線完全性を自動検証するテストを追加し、将来のサービス追加時の配線漏れを防止する。

**関連インシデント**: `docs/incidents/2026-02-07-trpc-full-migration-startup-failure.md` Phase 3

**Remote UI対応**: 不要（webSocketHandlerは独自import経路で正常動作中、スコープ外）

## Requirements

### Requirement 1: File ドメインサービス配線（3サービス）

**Objective:** 開発者として、tRPCのfileルーター経由でプロジェクトファイル操作ができるようにしたい。ファイル一覧・読み取り・書き込みが正常動作するために。

#### Acceptance Criteria
1. When `file.listProjectFiles` が呼ばれた場合、the system shall `projectFileUtils.listProjectFilesCore()` の結果を返す
2. When `file.readProjectFile` が呼ばれた場合、the system shall `projectFileUtils.readProjectFileCore()` の結果を返す
3. When `file.writeProjectFile` が呼ばれた場合、the system shall `projectFileUtils.writeProjectFileCore()` を実行する

### Requirement 2: Project ドメインサービス配線（2サービス）

**Objective:** ユーザーとして、プロジェクト選択ダイアログと新規ウィンドウ作成が動作するようにしたい。

#### Acceptance Criteria
1. When `project.showOpenDialog` が呼ばれた場合、the system shall `electron.dialog.showOpenDialog()` を呼び出し、選択されたディレクトリパスを返す
2. When `project.createNewWindow` が呼ばれた場合、the system shall 新しいBrowserWindowを作成する

### Requirement 3: Bug ドメインサービス配線（7サービス）

**Objective:** ユーザーとして、バグのWorktree操作（作成・削除・自動実行・変換）とバグ監視が動作するようにしたい。

#### Acceptance Criteria
1. When `bug.watcherStart` が呼ばれた場合、the system shall バグディレクトリの監視を開始する
2. When `bug.watcherStop` が呼ばれた場合、the system shall バグディレクトリの監視を停止する
3. When `bug.worktreeCreate` が呼ばれた場合、the system shall `bugWorkflowService` 経由でバグWorktreeを作成する
4. When `bug.worktreeRemove` が呼ばれた場合、the system shall バグWorktreeを削除する
5. When `bug.worktreeAutoExecution` が呼ばれた場合、the system shall Worktreeモードでバグ自動実行を開始する
6. When `bug.convertToWorktree` が呼ばれた場合、the system shall 既存バグをWorktreeモードに変換する
7. When `bug.validateWorktreeMainBranch` が呼ばれた場合、the system shall プロジェクトがmain/masterブランチ上にあるか検証する

### Requirement 4: Spec ドメインサービス配線（1サービス）

**Objective:** ユーザーとして、コマンドセットインストール時の確認ダイアログが動作するようにしたい。

#### Acceptance Criteria
1. When `spec.confirmCommonCommands` が呼ばれた場合、the system shall ユーザーの選択（skip/overwrite）に基づきコマンドをインストールし結果を返す

### Requirement 5: Agent ドメインサービス配線（5サービス）

**Objective:** ユーザーとして、エージェントの停止・ログ取得・実行状態確認が動作するようにしたい。

#### Acceptance Criteria
1. When `agent.stop` が呼ばれた場合、the system shall 指定エージェントのプロセスを停止する
2. When `agent.getLogs` が呼ばれた場合、the system shall パース済みログエントリを返す
3. When `agent.getRunningCounts` が呼ばれた場合、the system shall Spec別の実行中エージェント数を返す
4. When `agent.checkFolderExists` が呼ばれた場合、the system shall `.claude/agents/kiro` フォルダの存在を確認する
5. When `agent.deleteFolder` が呼ばれた場合、the system shall `.claude/agents/kiro` フォルダを削除する

### Requirement 6: Git/Worktree ドメインサービス配線（13サービス）

**Objective:** ユーザーとして、Gitステータス確認・差分表示・Worktree操作が動作するようにしたい。

#### Acceptance Criteria
1. When `git.getStatus` が呼ばれた場合、the system shall `GitService` 経由でGitステータスを返す
2. When `git.getDiff` が呼ばれた場合、the system shall 指定ファイルの差分を返す
3. When `git.watchChanges` が呼ばれた場合、the system shall ファイル変更の監視を開始する
4. When `git.unwatchChanges` が呼ばれた場合、the system shall ファイル変更の監視を停止する
5. When `git.worktreeCheckMain` が呼ばれた場合、the system shall main/masterブランチ上かを返す
6. When `git.worktreeCreate` が呼ばれた場合、the system shall 新しいWorktreeを作成する
7. When `git.worktreeRemove` が呼ばれた場合、the system shall Worktreeを削除する
8. When `git.worktreeResolvePath` が呼ばれた場合、the system shall Worktree相対パスを絶対パスに変換する
9. When `git.worktreeImplStart` が呼ばれた場合、the system shall Worktreeモードで実装フェーズを開始する
10. When `git.normalModeImplStart` が呼ばれた場合、the system shall 通常モードで実装フェーズを開始する
11. When `git.worktreeRebaseFromMain` が呼ばれた場合、the system shall Worktreeをmainブランチからリベースする
12. When `git.convertCheck` が呼ばれた場合、the system shall Worktreeモードへの変換可否を返す
13. When `git.convertToWorktree` が呼ばれた場合、the system shall 通常SpecをWorktreeモードに変換する

### Requirement 7: Install ドメインサービス配線（12サービス）

**Objective:** ユーザーとして、コマンドセット・CLI・実験ツールのインストール関連機能が動作するようにしたい。

#### Acceptance Criteria
1. When `install.checkSpecManagerFiles` が呼ばれた場合、the system shall `ProjectChecker` でコマンド/設定ファイルの存在を確認する
2. When `install.installCommands` が呼ばれた場合、the system shall `CommandInstallerService` でコマンドをインストールする
3. When `install.installByProfile` が呼ばれた場合、the system shall `UnifiedCommandsetInstaller` でプロファイルベースのインストールを実行する
4. When `install.installExperimentalTools` が呼ばれた場合、the system shall `ExperimentalToolsInstallerService` で実験ツールをインストールする
5. When `install.checkVersions` が呼ばれた場合、the system shall `CommandsetVersionService` でバージョンを確認する
6. When `install.getCliInstallStatus` が呼ばれた場合、the system shall CLIのインストール状態を返す
7. When `install.installCliCommand` が呼ばれた場合、the system shall CLIコマンドをインストールする
8. When `install.getManualInstallInstructions` が呼ばれた場合、the system shall 手動インストール手順を返す
9. When `install.checkMigrationNeeded` が呼ばれた場合、the system shall `MigrationService` でマイグレーション要否を確認する
10. When `install.checkJjAvailability` が呼ばれた場合、the system shall jjツールの利用可否を返す
11. When `install.installJj` が呼ばれた場合、the system shall jjをインストールする
12. When `install.ignoreJjInstall` が呼ばれた場合、the system shall jjインストール無視フラグを設定する

### Requirement 8: Schedule ドメインサービス配線（1サービス）

**Objective:** ユーザーとして、Rendererからのアイドル時間レポートが動作するようにしたい。

#### Acceptance Criteria
1. When `schedule.reportIdleTime` が呼ばれた場合、the system shall `idleTimeTracker` に最終アクティビティ時刻を記録する

### Requirement 9: Misc・AutoExecution・Cloudflare・MCP・Schedule 追加サービス配線（28サービス）

**Objective:** ユーザーとして、VSCode連携・クリップボード・ログ・メトリクス・リモートサーバー・SSH操作・自動実行・Cloudflare・MCP・スケジュールタスク管理が動作するようにしたい。

#### Acceptance Criteria
1. When `misc.openInVscode` が呼ばれた場合、the system shall 指定パスをVSCodeで開く
2. When `misc.copyToClipboard` が呼ばれた場合、the system shall テキストをシステムクリップボードにコピーする
3. When `misc.logRenderer` が呼ばれた場合、the system shall RendererのログをMainプロセスのロガーに転送する
4. When `misc.recordHumanSession` が呼ばれた場合、the system shall 人間の作業セッションをメトリクスとして記録する
5. When `misc.getSpecMetrics` が呼ばれた場合、the system shall Spec別の集計メトリクスを返す
6. When `misc.getProjectMetrics` が呼ばれた場合、the system shall プロジェクト全体の集計メトリクスを返す
7. When `misc.getProjectLogPath` が呼ばれた場合、the system shall プロジェクトログファイルのパスを返す
8. When `misc.openLogInBrowser` が呼ばれた場合、the system shall ログディレクトリをシステムファイルブラウザで開く
9. When `misc.addShellPermissions` が呼ばれた場合、the system shall settings.local.jsonにシェル権限を追加する
10. When `misc.addMissingPermissions` が呼ばれた場合、the system shall 不足している権限を追加する
11. When `misc.checkRequiredPermissions` が呼ばれた場合、the system shall 必要な権限の存在を確認する
12. When `misc.startRemoteServer` が呼ばれた場合、the system shall リモートアクセスサーバーを起動する
13. When `misc.stopRemoteServer` が呼ばれた場合、the system shall リモートアクセスサーバーを停止する
14. When `misc.getRemoteServerStatus` が呼ばれた場合、the system shall サーバーの実行状態を返す
15. When `misc.refreshAccessToken` が呼ばれた場合、the system shall アクセストークンを再生成する
16. When `misc.sshConnect` が呼ばれた場合、the system shall SSH接続を確立する
17. When `misc.sshDisconnect` が呼ばれた場合、the system shall SSH接続を切断する
18. When `misc.sshGetStatus` が呼ばれた場合、the system shall SSH接続状態を返す
19. When `misc.sshGetConnectionInfo` が呼ばれた場合、the system shall SSH接続情報を返す
20. When `misc.sshGetRecentRemoteProjects` が呼ばれた場合、the system shall 最近のリモートプロジェクト一覧を返す
21. When `misc.sshAddRecentRemoteProject` が呼ばれた場合、the system shall プロジェクトを最近の一覧に追加する
22. When `misc.sshRemoveRecentRemoteProject` が呼ばれた場合、the system shall プロジェクトを最近の一覧から削除する
23. When `autoExecution.start/stop/getStatus/getAllStatuses/retryFrom/resetAll/resetImplRetryCount` が呼ばれた場合、the system shall `autoExecutionCoordinator` 経由でSpec自動実行を制御する
24. When `autoExecution.bugStart/bugStop/bugGetStatus/bugGetAllStatuses/bugRetryFrom/bugResetAll` が呼ばれた場合、the system shall `bugAutoExecutionCoordinator` 経由でBug自動実行を制御する
25. When Cloudflareルーターの各プロシージャが呼ばれた場合、the system shall `cloudflareService` 経由でトンネル設定・バイナリチェック・トンネル管理を行う
26. When MCPルーターの各プロシージャが呼ばれた場合、the system shall `mcpServerService` 経由でMCPサーバーの起動・停止・状態取得を行う
27. When `schedule.getAllTasks/getTask/createTask/updateTask/deleteTask` が呼ばれた場合、the system shall `scheduleTaskService` 経由でスケジュールタスクのCRUD操作を行う
28. When `schedule.executeImmediately/getQueue/getRunning` が呼ばれた場合、the system shall `scheduleTaskCoordinator` 経由でタスク実行制御を行う

### Requirement 10: 配線完全性の自動検証テスト

**Objective:** 開発者として、`productionServices.ts` が `ContextServices` の全プロパティを配線していることを自動的に検証したい。将来のサービス追加時に配線漏れを即座に検出するために。

#### Acceptance Criteria
1. The system shall `productionServices.ts` が返すキーセットと `ContextServices` の全プロパティ名が一致することを検証するテストを持つ
2. If `ContextServices` に新しいプロパティが追加されたが `productionServices.ts` に配線されていない場合、then the system shall テストが失敗する
3. The system shall `createMockServices()` のキーセットと `productionServices.ts` のキーセットの差分を検出するテストを持つ
4. When テストが失敗した場合、the system shall 未配線のサービス名を明示的にエラーメッセージに含める

### Requirement 11: 既存テストとの回帰互換性

**Objective:** 開発者として、66サービス追加後も既存の847テストが全てパスすることを保証したい。

#### Acceptance Criteria
1. When 全66サービスが配線された後、the system shall 既存の全tRPCルーターテスト（847テスト）がパスする
2. The system shall TypeScriptコンパイルが成功する（`npm run typecheck`）
3. The system shall ビルドが成功する（`npm run build`）

## Out of Scope

- **webSocketHandler.ts のDI化**: 独自のdynamic importパターンで正常動作中。大規模リファクタリングとなるため別Specで対応
- **ContextServices インターフェースの型整理**: `Record<string, unknown>` を具体型に変更する等の改善は別途
- **ルーター側の防御パターン変更**: `if (!ctx.services.X) throw` パターンの維持/削除は別Specで検討
- **新規サービスの追加**: 既存の72サービスの配線のみ。新規機能は含まない

## Open Questions

- 一部サービス（`bugWorktreeCreate`, `worktreeImplStart` 等）はプロジェクトパスの状態に依存する。`productionServices.ts` で配線する際、遅延初期化（lazy getter）パターンが必要になる可能性がある → 設計フェーズで具体化
- `showOpenDialog` と `createNewWindow` は `BrowserWindow` インスタンスへの参照が必要。`handler.ts` のwindowパラメータとの関係を設計フェーズで整理
