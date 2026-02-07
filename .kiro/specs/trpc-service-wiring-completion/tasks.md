# Implementation Plan

## Tasks

- [x] 0. productionServices.ts の新規作成と handler.ts 統合
- [x] 0.1 `src/main/trpc/productionServices.ts` を新規作成する
  - `createProductionServices()` 関数のスケルトンを作成（`Partial<ContextServices>` を返す）
  - 必要に応じてファクトリ引数（`createNewWindow` 用の `createWindow` 関数参照）を受け取るシグネチャとする
  - _Requirements: 全配線タスクの前提_
  - _Verify: ファイルが存在し、TypeScriptコンパイルが通ること_

- [x] 0.2 `index.ts` の `createWindow()` から `createProductionServices()` を呼び出し `setupTRPCHandler` に渡す
  - `createProductionServices()` の返却値を `setupTRPCHandler(window, productionServices)` の `serviceOverrides` に渡す
  - `handler.ts` 側の既存 `eventBus`, `getInitialSelectResult`, `clearInitialSelectResult` とのマージを確認
  - _Requirements: 全配線タスクの前提_
  - _Verify: アプリ起動時に `setupTRPCHandler` が `serviceOverrides` を受け取ること_

- [x] 1. File・Project・Bug ドメインサービスの配線
- [x] 1.1 File ドメイン3サービスを配線する
  - `listProjectFiles`, `readProjectFile`, `writeProjectFile` を `createProductionServices()` に追加
  - `projectFileUtils` の各Core関数をラップしてサービスとして配線
  - _Requirements: 1.1, 1.2, 1.3_
  - _Method: projectFileUtils.listProjectFilesCore, projectFileUtils.readProjectFileCore, projectFileUtils.writeProjectFileCore_
  - _Verify: Grep "listProjectFilesCore|readProjectFileCore|writeProjectFileCore" in productionServices.ts_

- [x] 1.2 Project ドメイン2サービスを配線する
  - `showOpenDialog` を `BrowserWindow.getFocusedWindow()` フォールバック付きで配線
  - `createNewWindow` を `createWindow` 関数参照で配線
  - DD-003で決定されたウィンドウ参照解決パターンに従う
  - _Requirements: 2.1, 2.2_
  - _Method: BrowserWindow.getFocusedWindow, BrowserWindow.getAllWindows, dialog.showOpenDialog_
  - _Verify: Grep "showOpenDialog|createNewWindow" in productionServices.ts_

- [x] 1.3 Bug ドメイン7サービスを配線する
  - `bugsWatcherStart`, `bugsWatcherStop` を `bugsWatcherService` シングルトン参照で配線
  - `bugWorktreeCreate`, `bugWorktreeRemove`, `bugWorktreeAutoExecution`, `bugConvertToWorktree` を `bugWorkflowService` / `convertBugWorktreeService` 参照で配線
  - `validateWorktreeMainBranch` を `worktreeService` 参照で配線
  - DD-004のクロージャパターンを適用（プロジェクトパス依存サービス）
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  - _Method: bugsWatcherService, bugWorkflowService, convertBugWorktreeService, worktreeService_
  - _Verify: Grep "bugsWatcherService|bugWorkflowService|convertBugWorktreeService" in productionServices.ts_

- [x] 2. Spec・Agent ドメインサービスの配線
- [x] 2.1 Spec ドメイン1サービスを配線する
  - `confirmCommonCommands` を `commandInstallerService` 参照で配線
  - _Requirements: 4.1_
  - _Method: commandInstallerService_
  - _Verify: Grep "confirmCommonCommands" in productionServices.ts_

- [x] 2.2 Agent ドメイン5サービスを配線する
  - `agentStop` を `agentLifecycleSetup` 参照で配線
  - `agentGetLogs` を `logParserService` 参照で配線
  - `agentGetRunningCounts` を `agentRecordService` 参照で配線
  - `agentCheckFolderExists` を `fs.access` ラッパーで配線
  - `agentDeleteFolder` を `fs.rm` ラッパーで配線
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - _Method: agentLifecycleSetup, logParserService, agentRecordService_
  - _Verify: Grep "agentStop|agentGetLogs|agentGetRunningCounts|agentCheckFolderExists|agentDeleteFolder" in productionServices.ts_

- [x] 3. Git/Worktree ドメインサービスの配線
- [x] 3.1 Git基本操作4サービスを配線する
  - `gitGetStatus`, `gitGetDiff` を `GitService` 参照で配線
  - `gitWatchChanges`, `gitUnwatchChanges` を `GitService` 参照で配線
  - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - _Method: GitService_
  - _Verify: Grep "gitGetStatus|gitGetDiff|gitWatchChanges|gitUnwatchChanges" in productionServices.ts_

- [x] 3.2 Worktree操作9サービスを配線する
  - `worktreeCheckMain`, `worktreeCreate`, `worktreeRemove`, `worktreeResolvePath` を `worktreeService` 参照で配線
  - `worktreeImplStart`, `normalModeImplStart`, `worktreeRebaseFromMain` を `worktreeService` 参照で配線
  - `convertCheck`, `convertToWorktree` を `convertWorktreeService` 参照で配線
  - DD-004のクロージャパターンを適用（プロジェクトパス依存サービス）
  - _Requirements: 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 6.12, 6.13_
  - _Method: worktreeService, convertWorktreeService_
  - _Verify: Grep "worktreeCheckMain|worktreeCreate|worktreeRemove|convertCheck|convertToWorktree" in productionServices.ts_

- [x] 4. Install ドメインサービスの配線
- [x] 4.1 Install基本操作5サービスを配線する
  - `checkSpecManagerFiles` を `ProjectChecker` 参照で配線
  - `installCommands` を `CommandInstallerService` 参照で配線
  - `installByProfile` を `UnifiedCommandsetInstaller` 参照で配線
  - `installExperimentalTools` を `ExperimentalToolsInstallerService` 参照で配線
  - `checkVersions` を `CommandsetVersionService` 参照で配線
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - _Method: ProjectChecker, CommandInstallerService, UnifiedCommandsetInstaller, ExperimentalToolsInstallerService, CommandsetVersionService_
  - _Verify: Grep "checkSpecManagerFiles|installCommands|installByProfile|installExperimentalTools|checkVersions" in productionServices.ts_

- [x] 4.2 CLI・マイグレーション・jj関連7サービスを配線する
  - `getCliInstallStatus`, `installCliCommand`, `getManualInstallInstructions` を `cliInstallerService` 参照で配線
  - `checkMigrationNeeded` を `MigrationService` 参照で配線
  - `checkJjAvailability` を `toolPathResolverService` 参照で配線
  - `installJj` を `jjInstaller` 参照で配線
  - `ignoreJjInstall` を `layoutConfigService` 参照で配線
  - _Requirements: 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12_
  - _Method: cliInstallerService, MigrationService, toolPathResolverService, jjInstaller, layoutConfigService_
  - _Verify: Grep "getCliInstallStatus|installCliCommand|checkMigrationNeeded|checkJjAvailability|installJj|ignoreJjInstall" in productionServices.ts_

- [x] 5. Schedule・Misc ドメインサービスの配線
- [x] 5.1 Schedule ドメイン1サービスを配線する
  - `reportIdleTime` を `idleTimeTracker` 参照で配線
  - _Requirements: 8.1_
  - _Method: idleTimeTracker_
  - _Verify: Grep "reportIdleTime" in productionServices.ts_

- [x] 5.2 Misc ドメイン前半11サービスを配線する（VSCode・クリップボード・ログ・メトリクス・パーミッション）
  - `openInVscode` を `shell.openExternal` ラッパーで配線
  - `copyToClipboard` を `clipboard.writeText` ラッパーで配線
  - `logRenderer` を `projectLogger` 参照で配線
  - `recordHumanSession`, `getSpecMetrics`, `getProjectMetrics` を `metricsService` 参照で配線
  - `getProjectLogPath`, `openLogInBrowser` をログ関連サービスで配線
  - `addShellPermissions`, `addMissingPermissions`, `checkRequiredPermissions` を `permissionsService` 参照で配線
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11_
  - _Method: shell.openExternal, clipboard.writeText, projectLogger, metricsService, permissionsService_
  - _Verify: Grep "openInVscode|copyToClipboard|logRenderer|recordHumanSession|addShellPermissions" in productionServices.ts_

- [x] 5.3 Misc ドメイン後半11サービスを配線する（リモートサーバー・SSH）
  - `startRemoteServer`, `stopRemoteServer`, `getRemoteServerStatus`, `refreshAccessToken` を `remoteAccessSetup` 参照で配線
  - `sshConnect`, `sshDisconnect`, `sshGetStatus`, `sshGetConnectionInfo` を `sshConnectionService` 参照で配線
  - `sshGetRecentRemoteProjects`, `sshAddRecentRemoteProject`, `sshRemoveRecentRemoteProject` を `sshConnectionService` 参照で配線
  - _Requirements: 9.12, 9.13, 9.14, 9.15, 9.16, 9.17, 9.18, 9.19, 9.20, 9.21, 9.22_
  - _Method: remoteAccessSetup, sshConnectionService_
  - _Verify: Grep "startRemoteServer|stopRemoteServer|sshConnect|sshDisconnect|sshGetRecentRemoteProjects" in productionServices.ts_

- [x] 5.4 AutoExecution・Cloudflare・MCP・Schedule追加6サービスを配線する
  - `autoExecutionCoordinator` を `AutoExecutionCoordinator` シングルトン参照で配線
  - `bugAutoExecutionCoordinator` を `BugAutoExecutionCoordinator` シングルトン参照で配線
  - `cloudflareService` を `CloudflareService` シングルトン参照で配線
  - `mcpServerService` を `McpServerService` シングルトン参照で配線
  - `scheduleTaskService` を `ScheduleTaskService` シングルトン参照で配線
  - `scheduleTaskCoordinator` を `ScheduleTaskCoordinator` シングルトン参照で配線
  - _Requirements: 9.23, 9.24, 9.25, 9.26, 9.27, 9.28_
  - _Method: AutoExecutionCoordinator, BugAutoExecutionCoordinator, CloudflareService, McpServerService, ScheduleTaskService, ScheduleTaskCoordinator_
  - _Verify: Grep "autoExecutionCoordinator|bugAutoExecutionCoordinator|cloudflareService|mcpServerService|scheduleTaskService|scheduleTaskCoordinator" in productionServices.ts_

- [x] 6. 配線完全性テストの実装
- [x] 6.1 productionServicesのキーセットとContextServicesプロパティの一致を検証するテストを追加する
  - **前提**: `createMockServices()` (test-helpers.ts) に `confirmCommonCommands` のモック定義を追加する（現在欠落）
  - `createProductionServices()` が返すキーセットと `ContextServices` の全プロパティ名が一致することを検証
  - 新プロパティが追加されたが配線されていない場合にテストが失敗すること
  - エラーメッセージに未配線のサービス名を明示的に含めること
  - _Requirements: 10.1, 10.2, 10.4_
  - _Verify: Grep "ContextServices|createProductionServices" in productionServices.test.ts_

- [x] 6.2 createMockServicesとproductionServicesのキーセット差分検出テストを追加する
  - `createMockServices()` のキーセットと `createProductionServices()` のキーセットの差分を検出
  - 差分がある場合に未配線サービス名をエラーメッセージに含めること
  - _Requirements: 10.3, 10.4_
  - _Verify: Grep "createMockServices" in productionServices.test.ts_

- [x] 7. 回帰検証
- [x] 7.1 TypeScriptコンパイルとビルドの成功を確認する
  - `npm run typecheck` が成功すること
  - `npm run build` が成功すること
  - _Requirements: 11.2, 11.3_

- [x] 7.2 既存テストスイートの全パスを確認する
  - `npm run test:run` で既存847テストが全てパスすること
  - 新規追加した配線完全性テストもパスすること
  - _Requirements: 11.1_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | listProjectFiles配線 | 1.1 | Feature |
| 1.2 | readProjectFile配線 | 1.1 | Feature |
| 1.3 | writeProjectFile配線 | 1.1 | Feature |
| 2.1 | showOpenDialog配線 | 1.2 | Feature |
| 2.2 | createNewWindow配線 | 1.2 | Feature |
| 3.1 | bugsWatcherStart配線 | 1.3 | Feature |
| 3.2 | bugsWatcherStop配線 | 1.3 | Feature |
| 3.3 | bugWorktreeCreate配線 | 1.3 | Feature |
| 3.4 | bugWorktreeRemove配線 | 1.3 | Feature |
| 3.5 | bugWorktreeAutoExecution配線 | 1.3 | Feature |
| 3.6 | bugConvertToWorktree配線 | 1.3 | Feature |
| 3.7 | validateWorktreeMainBranch配線 | 1.3 | Feature |
| 4.1 | confirmCommonCommands配線 | 2.1 | Feature |
| 5.1 | agentStop配線 | 2.2 | Feature |
| 5.2 | agentGetLogs配線 | 2.2 | Feature |
| 5.3 | agentGetRunningCounts配線 | 2.2 | Feature |
| 5.4 | agentCheckFolderExists配線 | 2.2 | Feature |
| 5.5 | agentDeleteFolder配線 | 2.2 | Feature |
| 6.1 | gitGetStatus配線 | 3.1 | Feature |
| 6.2 | gitGetDiff配線 | 3.1 | Feature |
| 6.3 | gitWatchChanges配線 | 3.1 | Feature |
| 6.4 | gitUnwatchChanges配線 | 3.1 | Feature |
| 6.5 | worktreeCheckMain配線 | 3.2 | Feature |
| 6.6 | worktreeCreate配線 | 3.2 | Feature |
| 6.7 | worktreeRemove配線 | 3.2 | Feature |
| 6.8 | worktreeResolvePath配線 | 3.2 | Feature |
| 6.9 | worktreeImplStart配線 | 3.2 | Feature |
| 6.10 | normalModeImplStart配線 | 3.2 | Feature |
| 6.11 | worktreeRebaseFromMain配線 | 3.2 | Feature |
| 6.12 | convertCheck配線 | 3.2 | Feature |
| 6.13 | convertToWorktree配線 | 3.2 | Feature |
| 7.1 | installProjectChecker配線 | 4.1 | Feature |
| 7.2 | installCommandInstallerService配線 | 4.1 | Feature |
| 7.3 | installUnifiedCommandsetInstaller配線 | 4.1 | Feature |
| 7.4 | installExperimentalToolsInstaller配線 | 4.1 | Feature |
| 7.5 | installCommandsetVersionService配線 | 4.1 | Feature |
| 7.6 | installGetCliInstallStatus配線 | 4.2 | Feature |
| 7.7 | installInstallCliCommand配線 | 4.2 | Feature |
| 7.8 | installGetManualInstallInstructions配線 | 4.2 | Feature |
| 7.9 | installMigrationService配線 | 4.2 | Feature |
| 7.10 | installCheckJjAvailability配線 | 4.2 | Feature |
| 7.11 | installInstallJj配線 | 4.2 | Feature |
| 7.12 | installIgnoreJjInstall配線 | 4.2 | Feature |
| 8.1 | reportIdleTime配線 | 5.1 | Feature |
| 9.1 | openInVscode配線 | 5.2 | Feature |
| 9.2 | copyToClipboard配線 | 5.2 | Feature |
| 9.3 | logRenderer配線 | 5.2 | Feature |
| 9.4 | recordHumanSession配線 | 5.2 | Feature |
| 9.5 | getSpecMetrics配線 | 5.2 | Feature |
| 9.6 | getProjectMetrics配線 | 5.2 | Feature |
| 9.7 | getProjectLogPath配線 | 5.2 | Feature |
| 9.8 | openLogInBrowser配線 | 5.2 | Feature |
| 9.9 | addShellPermissions配線 | 5.2 | Feature |
| 9.10 | addMissingPermissions配線 | 5.2 | Feature |
| 9.11 | checkRequiredPermissions配線 | 5.2 | Feature |
| 9.12 | startRemoteServer配線 | 5.3 | Feature |
| 9.13 | stopRemoteServer配線 | 5.3 | Feature |
| 9.14 | getRemoteServerStatus配線 | 5.3 | Feature |
| 9.15 | refreshAccessToken配線 | 5.3 | Feature |
| 9.16 | sshConnect配線 | 5.3 | Feature |
| 9.17 | sshDisconnect配線 | 5.3 | Feature |
| 9.18 | sshGetStatus配線 | 5.3 | Feature |
| 9.19 | sshGetConnectionInfo配線 | 5.3 | Feature |
| 9.20 | sshGetRecentRemoteProjects配線 | 5.3 | Feature |
| 9.21 | sshAddRecentRemoteProject配線 | 5.3 | Feature |
| 9.22 | sshRemoveRecentRemoteProject配線 | 5.3 | Feature |
| 9.23 | autoExecutionCoordinator配線 | 5.4 | Feature |
| 9.24 | bugAutoExecutionCoordinator配線 | 5.4 | Feature |
| 9.25 | cloudflareService配線 | 5.4 | Feature |
| 9.26 | mcpServerService配線 | 5.4 | Feature |
| 9.27 | scheduleTaskService配線 | 5.4 | Feature |
| 9.28 | scheduleTaskCoordinator配線 | 5.4 | Feature |
| 10.1 | 配線キーセット一致テスト | 6.1 | Integration Test |
| 10.2 | 新プロパティ追加時の検出 | 6.1 | Integration Test |
| 10.3 | mockServicesキーセット一致テスト | 6.2 | Integration Test |
| 10.4 | エラーメッセージの明示性 | 6.1, 6.2 | Integration Test |
| 11.1 | 既存テスト回帰 | 7.2 | Regression |
| 11.2 | TypeScriptコンパイル | 7.1 | Regression |
| 11.3 | ビルド成功 | 7.1 | Regression |
