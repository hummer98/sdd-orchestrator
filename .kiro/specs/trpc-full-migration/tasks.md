# Implementation Plan

## Task 1. tRPCコンテキスト拡張とサービスDI基盤
- [x] 1.1 tRPC Contextにサービスインスタンスを注入する仕組みを実装する
  - 既存の空コンテキストを拡張し、全ドメインサービスへのアクセスを`ctx.services.*`経由で提供する
  - コンテキスト生成時にサービスファクトリを受け取り、テスト時にモックサービスを注入可能にする
  - ハンドラ初期化（`handler.ts`）からコンテキストへのサービス渡しを設定する
  - handlers.tsの既存DIパターン（`getCurrentProjectPath()`ゲッター関数、`setProjectPath()`等のmutable state）をContext経由で提供する設計を含める
  - 既存system-router.test.tsの`createCaller({})`をモックContext付きに更新する
  - _Requirements: 1.1, 1.2, 1.3_
  - _Method: createContext, createIPCHandler_
  - _Verify: Grep "ctx.services" in context.ts_

- [x] 1.2 ルーターテスト用の共通テストヘルパーを作成する
  - テスト用モックサービスファクトリを実装し、各ルーターテストで共通利用できるようにする
  - tRPC callerを使用してルーターを直接テスト呼び出しするユーティリティを提供する
  - _Requirements: 1.4, 2.5, 3.6_
  - _Method: createTestContext, createCallerFactory_
  - _Verify: Grep "createTestContext" in __tests__/_

## Task 2. パイロット移行: systemルーター拡張とRenderer差し替え
- [x] 2.1 systemルーターに残りのシステム情報APIを追加する
  - `getAppVersion`, `getPlatform`, `getAppPath`, `getNodeEnv`の4プロシージャをsystemルーターに追加する
  - 各プロシージャにZodスキーマ（入力/出力）を定義する
  - 既存Serviceメソッド（`app.getVersion()`等）を`ctx.services`経由で呼び出す
  - _Requirements: 1.1, 1.2_
  - _Method: systemRouter, t.procedure.query_
  - _Verify: Grep "getAppVersion|getPlatform|getAppPath|getNodeEnv" in routers/system.ts_

- [x] 2.2 Renderer側のシステム情報取得をtRPCフックに置換する
  - `window.electronAPI.getAppVersion()`等の呼び出しを`trpc.system.getAppVersion.useQuery()`に変更する
  - 関連するStore/コンポーネント内の呼び出しを全て置換する
  - _Requirements: 1.3_
  - _Verify: Grep "trpc.system.getAppVersion" in renderer/_

- [x] 2.3 パイロット移行のレガシーコード削除と統合テスト
  - 移行した4チャンネルに対応するpreload APIエントリを削除する
  - system系チャンネルのMainプロセス側ハンドラは`projectHandlers.ts`内（行247-260）にあり、Task 4.4でprojectHandlers.ts全体を削除する際に一括削除する。Phase 1ではpreload/index.tsからのAPI削除のみ実施する
  - systemルーターの統合テストを作成し、全プロシージャの動作を検証する
  - Zodスキーマによるバリデーション（有効入力・無効入力）をテストする
  - _Requirements: 1.4, 1.5, 1.6_
  - _Verify: Grep "system.getAppVersion" in __tests__/system-router.test.ts_

## Task 3. Config/Settings移行
- [x] 3.1 (P) configルーターとZodスキーマを実装する
  - config routerに全22プロシージャ（RecentProjects、HangThreshold、LayoutConfig、SkipPermissions、ProjectDefaults、Profile、EngineConfig、ToolPath、VcsScheme、RemoteUiAutoStart）を定義する
  - 各プロシージャにZodスキーマ（入力/出力）を定義する
  - 既存configStore、layoutConfigService、toolPathResolverService等をコンテキスト経由で呼び出す
  - `router.ts`のappRouterにconfigルーターを登録する
  - _Requirements: 2.1, 2.2, 2.3_
  - _Method: configRouter, configStore, layoutConfigService_
  - _Verify: Grep "configRouter" in router.ts_

- [x] 3.2 Config関連のRenderer呼び出しをtRPCフックに置換する
  - 設定画面、RecentProjects表示、レイアウト管理等のコンポーネント/Storeで`window.electronAPI.*`をtRPCフックに変更する
  - IpcApiClient内のConfig関連メソッド呼び出し元をtRPCに移行する
  - Task 3.1のconfigルーター完了後に実施する
  - _Requirements: 2.2_
  - _Verify: Grep "trpc.config." in renderer/_

- [x] 3.3 configHandlers.tsの削除と統合テスト
  - `configHandlers.ts`を物理削除する
  - preload/index.tsからConfig関連API（18エントリ）を削除する
  - configルーターの統合テストを作成する（全プロシージャ + エラーケース）
  - 既存`src/main/ipc/__tests__/configHandlers.test.ts`のテストケース・エッジケースを参照し、tRPCルーターテストに知識を引き継ぐ
  - _Requirements: 2.4, 2.5_
  - _Verify: Grep "configHandlers" should return 0 results_

## Task 4. Project/File移行
- [x] 4.1 (P) projectルーターとZodスキーマを実装する
  - project routerに全9プロシージャ（selectProject、showOpenDialog、validateKiroDirectory、getInitialProjectPath、setProjectPath、getWindowProject、setWindowProject、createNewWindow、getIsE2ETest）を定義する
  - Electron dialog APIとの連携、プロジェクト選択の排他制御を含める
  - `router.ts`のappRouterにprojectルーターを登録する
  - _Requirements: 3.1, 3.2, 3.3_
  - _Method: projectRouter, fileService, specManagerService_
  - _Verify: Grep "projectRouter" in router.ts_

- [x] 4.2 (P) fileルーターとZodスキーマを実装する
  - file routerに全11プロシージャ（readSpecs、readSpecJson、readArtifact、writeArtifact、listMarkdownFilesInSpec、writeFile、getArtifactPath、readFileContent、projectFileList、projectFileRead、projectFileWrite）を定義する
  - ファイル読み書きのZodスキーマにパスバリデーションを含める
  - `router.ts`のappRouterにfileルーターを登録する
  - _Requirements: 3.1, 3.2, 3.3_
  - _Method: fileRouter, fileService_
  - _Verify: Grep "fileRouter" in router.ts_

- [x] 4.3 Project/File関連のRenderer呼び出しをtRPCフックに置換する
  - プロジェクト選択UI、ファイル操作関連のコンポーネント/Storeで`window.electronAPI.*`をtRPCフックに変更する
  - projectStore、editorStore等のStore内呼び出しを全て置換する
  - Task 4.1, 4.2完了後に実施する
  - _Requirements: 3.2_
  - _Verify: Grep "trpc.project.|trpc.file." in renderer/_

- [x] 4.4 projectHandlers.ts, fileHandlers.ts, projectFileHandlers.tsの削除と統合テスト
  - `projectHandlers.ts`（14チャンネル）、`fileHandlers.ts`（7チャンネル）、`projectFileHandlers.ts`（4チャンネル）を物理削除する
  - preload/index.tsからProject/File関連APIを削除する
  - project/fileルーターの統合テストを作成する
  - 既存`src/main/ipc/__tests__/projectHandlers.test.ts`、`fileHandlers.test.ts`、`projectFileHandlers.test.ts`のテストケース・エッジケースを参照し、tRPCルーターテストに知識を引き継ぐ
  - _Requirements: 3.4, 3.5, 3.6_
  - _Verify: Grep "projectHandlers|fileHandlers|projectFileHandlers" should return 0 results_

## Task 5. Spec/Bug移行
- [x] 5.1 (P) specルーターとZodスキーマを実装する
  - spec routerに全27プロシージャ（create、updateApproval、updateSpecJson、syncSpecPhase、各種execute、eventLogGet、parseTasksForParallel、startImpl、checkSteeringFiles等）を定義する
  - Spec実行系mutationにはspecManagerServiceを呼び出す
  - `router.ts`のappRouterにspecルーターを登録する
  - _Requirements: 4.1, 4.2, 4.3_
  - _Method: specRouter, specManagerService_
  - _Verify: Grep "specRouter" in router.ts_

- [x] 5.2 (P) bugルーターとZodスキーマを実装する
  - bug routerに全12プロシージャ（readBugs、readBugDetail、startBugsWatcher、stopBugsWatcher、executeBugCreate、phaseUpdate、worktreeCreate、worktreeRemove、worktreeAutoExecution、convertToWorktree、getBugsWorktreeDefault、setBugsWorktreeDefault）を定義する
  - `router.ts`のappRouterにbugルーターを登録する
  - _Requirements: 4.1, 4.2, 4.3_
  - _Method: bugRouter, bugService_
  - _Verify: Grep "bugRouter" in router.ts_

- [x] 5.3 Spec/Bug関連のRenderer呼び出しをtRPCフックに置換する
  - Spec一覧/詳細画面、Bug一覧/詳細画面、ワークフロー操作UIのコンポーネント/Storeで`window.electronAPI.*`をtRPCフックに変更する
  - shared/stores/specStore, bugStore内の呼び出しを全て置換する
  - Task 5.1, 5.2完了後に実施する
  - _Requirements: 4.2_
  - _Verify: Grep "trpc.spec.|trpc.bug." in renderer/ shared/_

- [x] 5.4 specHandlers.ts, bugHandlers.ts, bugWorktreeHandlers.ts, convertWorktreeHandlers.tsの削除と統合テスト
  - `specHandlers.ts`（25チャンネル）、`bugHandlers.ts`（7チャンネル）、`bugWorktreeHandlers.ts`（6チャンネル）、`convertWorktreeHandlers.ts`（2チャンネル）を物理削除する
  - handlers.ts内の`registerSteeringHandlers()`呼び出し（行610）と関数定義（行1019-1066）を削除する（4チャンネル: CHECK_STEERING_FILES, GENERATE_VERIFICATION_MD, CHECK_RELEASE_MD, GENERATE_RELEASE_MD はTask 5.1でspec routerに移行済み）
  - preload/index.tsからSpec/Bug関連APIを削除する
  - spec/bugルーターの統合テストを作成する
  - 既存`src/main/ipc/__tests__/specHandlers.test.ts`、`bugHandlers.test.ts`、`bugWorktreeHandlers.test.ts`、`convertWorktreeHandlers.test.ts`のテストケース・エッジケースを参照し、tRPCルーターテストに知識を引き継ぐ
  - _Requirements: 4.4, 4.5, 4.6_
  - _Verify: Grep "specHandlers|bugHandlers|bugWorktreeHandlers|convertWorktreeHandlers|registerSteeringHandlers" should return 0 results; `npm run build && npm run typecheck` pass_

## Task 6. Agent移行
- [x] 6.1 agentルーターとZodスキーマを実装する
  - agent routerに全11プロシージャ（start、stop、resume、delete、getAgents、getAllAgents、sendInput、getLogs、getRunningAgentCounts、checkFolderExists、deleteFolder）を定義する
  - Agent起動/停止系mutationにはagentProcess、agentRegistryを呼び出す
  - `router.ts`のappRouterにagentルーターを登録する
  - _Requirements: 5.1, 5.2, 5.3_
  - _Method: agentRouter, agentProcess, agentRegistry_
  - _Verify: Grep "agentRouter" in router.ts_

- [x] 6.2 Agent関連のRenderer呼び出しをtRPCフックに置換する
  - Agent一覧、操作パネル、ログ表示等のコンポーネント/Storeで`window.electronAPI.*`をtRPCフックに変更する
  - shared/stores/agentStore内の呼び出しを全て置換する
  - Task 6.1完了後に実施する
  - _Requirements: 5.2_
  - _Verify: Grep "trpc.agent." in renderer/ shared/_

- [x] 6.3 agentHandlers.tsの削除と統合テスト
  - `agentHandlers.ts`（10チャンネル）を物理削除する
  - preload/index.tsからAgent関連APIを削除する
  - agentルーターの統合テストを作成する
  - 既存`src/main/ipc/__tests__/agentHandlers.test.ts`のテストケース・エッジケースを参照し、tRPCルーターテストに知識を引き継ぐ
  - _Requirements: 5.4, 5.5_
  - _Verify: Grep "agentHandlers" should return 0 results; `npm run build && npm run typecheck` pass_

## Task 7. Auto Execution移行
- [x] 7.1 autoExecutionルーターとZodスキーマを実装する
  - autoExecution routerに全14プロシージャ（Spec系: start、stop、getStatus、getAllStatus、retryFrom、reset、setMockEnv、resetImplRetry / Bug系: bugStart、bugStop、bugGetStatus、bugGetAllStatus、bugRetryFrom、bugReset）を定義する
  - autoExecutionCoordinatorを呼び出すアダプター層として機能する
  - `router.ts`のappRouterにautoExecutionルーターを登録する
  - _Requirements: 6.1, 6.2, 6.3_
  - _Method: autoExecutionRouter, autoExecutionCoordinator_
  - _Verify: Grep "autoExecutionRouter" in router.ts_

- [x] 7.2 Auto Execution関連のRenderer呼び出しをtRPCフックに置換する
  - Auto Execution制御UI、ステータス表示のコンポーネント/Storeで`window.electronAPI.*`をtRPCフックに変更する
  - Task 7.1完了後に実施する
  - _Requirements: 6.2_
  - _Verify: Grep "trpc.autoExecution." in renderer/ shared/_

- [x] 7.3 autoExecutionHandlers.ts, bugAutoExecutionHandlers.tsの削除と統合テスト
  - `autoExecutionHandlers.ts`（13チャンネル）、`bugAutoExecutionHandlers.ts`（12チャンネル）を物理削除する
  - preload/index.tsからAutoExecution関連APIを削除する
  - autoExecutionルーターの統合テストを作成する
  - 既存`src/main/ipc/__tests__/autoExecutionHandlers.test.ts`、`bugAutoExecutionHandlers.test.ts`のテストケース・エッジケースを参照し、tRPCルーターテストに知識を引き継ぐ
  - _Requirements: 6.4, 6.5_
  - _Verify: Grep "autoExecutionHandlers|bugAutoExecutionHandlers" should return 0 results; `npm run build && npm run typecheck` pass_

## Task 8. Git/Worktree移行
- [x] 8.1 gitルーターとZodスキーマを実装する
  - git routerに全13プロシージャ（getStatus、getDiff、watchChanges、unwatchChanges、worktreeCheckMain、worktreeCreate、worktreeRemove、worktreeResolvePath、worktreeImplStart、normalModeImplStart、worktreeRebaseFromMain、convertCheck、convertToWorktree）を定義する
  - worktreeService、gitServiceを呼び出す
  - `router.ts`のappRouterにgitルーターを登録する
  - _Requirements: 7.1, 7.2, 7.3_
  - _Method: gitRouter, worktreeService, gitService_
  - _Verify: Grep "gitRouter" in router.ts_

- [x] 8.2 Git/Worktree関連のRenderer呼び出しをtRPCフックに置換する
  - Git差分表示、Worktree管理UIのコンポーネント/Storeで`window.electronAPI.*`をtRPCフックに変更する
  - shared/components/git/GitView.tsxの呼び出しを置換する
  - Task 8.1完了後に実施する
  - _Requirements: 7.2_
  - _Verify: Grep "trpc.git." in renderer/ shared/_

- [x] 8.3 gitHandlers.ts, worktreeHandlers.ts, worktreeImplHandlers.tsの削除と統合テスト
  - `gitHandlers.ts`（6チャンネル）、`worktreeHandlers.ts`（7チャンネル）、`worktreeImplHandlers.ts`（ユーティリティファイル、チャンネル登録なし）を物理削除する
  - preload/index.tsからGit/Worktree関連APIを削除する
  - gitルーターの統合テストを作成する
  - 既存`src/main/ipc/__tests__/gitHandlers.test.ts`、`worktreeHandlers.test.ts`、`worktreeImplHandlers.test.ts`のテストケース・エッジケースを参照し、tRPCルーターテストに知識を引き継ぐ
  - _Requirements: 7.4, 7.5_
  - _Verify: Grep "gitHandlers|worktreeHandlers|worktreeImplHandlers" should return 0 results; `npm run build && npm run typecheck` pass_

## Task 9. イベント通知（Subscription）移行
- [x] 9.1 eventsルーターとSubscriptionプロシージャを実装する
  - events routerに全Subscriptionプロシージャを定義する（Agent系6個、Spec/Bug系3個、AutoExecution系5個、BugAutoExecution系6個、Server/Tunnel系3個、File系2個、ScheduleTask系1個、MCP系1個、Metrics系1個、SSH系1個、Menu系7個 = 合計36個）
  - `observable()`ヘルパーを使い、既存EventEmitter/コールバックをSubscriptionに変換する
  - 各SubscriptionにZodスキーマ（入力/出力）を定義する
  - `router.ts`のappRouterにeventsルーターを登録する
  - electron-trpc SubscriptionのBrowserWindowクローズ時cleanup動作を検証する（observable内のunsubscribe関数が正しく呼ばれること、EventEmitterリスナーが解除されることをテストで確認）
  - _Requirements: 8.1, 8.2_
  - _Method: eventsRouter, observable, EventEmitter_
  - _Verify: Grep "eventsRouter" in router.ts_

- [x] 9.2 Renderer側のイベント受信をtRPC Subscriptionフックに置換する
  - Main側の`webContents.send()`呼び出し箇所（約40箇所、22ファイル）に対応するRenderer側のイベント受信をtRPC Subscriptionに移行する
  - 実装着手前にMain側webContents.send呼び出し箇所の現状マッピングを実施し、移行対象を確定する
  - Store内のipcRendererリスナーをSubscriptionフックのコールバックに移行する
  - 既存の`BrowserWindow.webContents.send()`呼び出しを削除または整理する
  - Task 9.1完了後に実施する
  - _Requirements: 8.3, 8.4_
  - _Verify: Grep "useSubscription" in renderer/; Grep "webContents.send" should return 0 results_

- [x] 9.3 Subscriptionの統合テストを作成する
  - EventEmitter発火時にSubscription経由でデータが配信されることを検証する
  - `waitFor`パターンを使用し、固定sleepを回避する
  - 主要イベント（Agent出力、Spec変更、AutoExecution状態変更）を優先的にテストする
  - _Requirements: 8.5_
  - _Verify: Grep "useSubscription|observable" in __tests__/events-router.test.ts; `npm run build && npm run typecheck` pass_

## Task 10. その他ドメイン移行
- [x] 10.1 (P) cloudflareルーターとZodスキーマを実装する
  - cloudflare routerに全10プロシージャを定義する
  - `router.ts`のappRouterにcloudflareルーターを登録する
  - _Requirements: 9.1, 9.2_
  - _Method: cloudflareRouter, cloudflareService_
  - _Verify: Grep "cloudflareRouter" in router.ts_

- [x] 10.2 (P) installルーターとZodスキーマを実装する
  - install routerに全20プロシージャ（checkSpecManagerFiles、installSpecManagerCommands、各種install/check系）を定義する
  - `router.ts`のappRouterにinstallルーターを登録する
  - _Requirements: 9.1, 9.2_
  - _Method: installRouter, installerServices_
  - _Verify: Grep "installRouter" in router.ts_

- [x] 10.3 (P) mcpルーターとZodスキーマを実装する
  - mcp routerに全6プロシージャ（start、stop、getStatus、getSettings、setEnabled、setPort）を定義する
  - `router.ts`のappRouterにmcpルーターを登録する
  - _Requirements: 9.1, 9.2_
  - _Method: mcpRouter, mcpServerService_
  - _Verify: Grep "mcpRouter" in router.ts_

- [x] 10.4 (P) scheduleルーターとZodスキーマを実装する
  - schedule routerに全9プロシージャ（getAll、get、create、update、delete、executeImmediately、getQueue、getRunning、reportIdleTime）を定義する
  - `router.ts`のappRouterにscheduleルーターを登録する
  - _Requirements: 9.1, 9.2_
  - _Method: scheduleRouter, scheduleTaskService_
  - _Verify: Grep "scheduleRouter" in router.ts_

- [x] 10.5 (P) miscルーターとZodスキーマを実装する
  - misc routerに全22プロシージャ（misc 15: openInVscode、copyToClipboard、logRenderer、recordHumanSession、各種metrics/permissions/remoteServer等 + SSH関連7: sshConnect、sshDisconnect、sshGetStatus、sshGetConnectionInfo、sshGetRecentRemoteProjects、sshAddRecentRemoteProject、sshRemoveRecentRemoteProject）を定義する
  - `router.ts`のappRouterにmiscルーターを登録する
  - _Requirements: 9.1, 9.2_
  - _Method: miscRouter_
  - _Verify: Grep "miscRouter" in router.ts_

- [x] 10.6 その他ドメインのRenderer呼び出しをtRPCフックに置換する
  - Cloudflare Tunnel設定UI、インストール管理UI、MCP設定UI、スケジュールタスクUI、その他機能のコンポーネント/Storeで`window.electronAPI.*`をtRPCフックに変更する
  - remoteAccessStore、connectionStore、versionStatusStore等のStore内呼び出しを全て置換する
  - Task 10.1〜10.5完了後に実施する
  - _Requirements: 9.1_
  - _Verify: Grep "trpc.cloudflare.|trpc.install.|trpc.mcp.|trpc.schedule.|trpc.misc." in renderer/ shared/_

- [x] 10.7 その他ドメインのレガシーハンドラ削除と統合テスト
  - `cloudflareHandlers.ts`、`installHandlers.ts`、`mcpHandlers.ts`、`scheduleTaskHandlers.ts`、`metricsHandlers.ts`、`remoteAccessHandlers.ts`、`sshHandlers.ts`、`clipboardHandlers.ts`、`startImplPhase.ts`を物理削除する
  - handlers.ts内の`registerUnmigratedProjectHandlers()`（行837-928）と`registerUnmigratedFileHandlers()`（行930-980）の呼び出し（行509, 516）と関数定義を削除する（全7チャンネルはTask 4.1/4.2/10.5でtRPCルーターに移行済み）
  - preload/index.tsから対応するAPIを削除する
  - 各ルーターの統合テストを作成する
  - 既存`src/main/ipc/__tests__/`の対応テストファイル（cloudflareHandlers.test.ts、installHandlers.test.ts、mcpHandlers.test.ts、scheduleTaskHandlers.test.ts、metricsHandlers.test.ts、remoteAccessHandlers.test.ts、sshHandlers.test.ts等）のテストケース・エッジケースを参照し、tRPCルーターテストに知識を引き継ぐ
  - _Requirements: 9.3, 9.4_
  - _Verify: Grep "cloudflareHandlers|installHandlers|mcpHandlers|scheduleTaskHandlers|metricsHandlers|remoteAccessHandlers|sshHandlers|clipboardHandlers|startImplPhase|registerUnmigratedProjectHandlers|registerUnmigratedFileHandlers" should return 0 results; `npm run build && npm run typecheck` pass_

## Task 11. レガシーIPC基盤の完全撤廃
- [x] 11.1 preload/index.tsからelectronAPI関連コードを削除する
  - `contextBridge.exposeInMainWorld('electronAPI', ...)`を削除する
  - tRPC用の`exposeElectronTRPC()`のみを残す
  - preload/index.tsを最小限の内容にする
  - _Requirements: 10.1, 10.5_
  - _Verify: Grep "exposeInMainWorld.*electronAPI" should return 0 results_

- [x] 11.2 channels.ts, handlers.ts, ipcUtils.ts, sshChannels.ts、およびユーティリティファイルを物理削除する
  - `src/main/ipc/channels.ts` を削除する
  - `src/main/ipc/handlers.ts` を削除する
  - `src/main/ipc/ipcUtils.ts` を削除する
  - `src/main/ipc/sshChannels.ts` を削除する
  - `src/main/ipc/projectFileUtils.ts` を削除する（tRPCルーター側にロジック移行済みの場合）、または `src/main/trpc/helpers/` に移動する
  - `src/main/ipc/projectUtils.ts` を削除する（同上）
  - `src/main/ipc/watcherUtils.ts` を削除する（同上）
  - `src/main/ipc/worktreeUtils.ts` を削除する（同上）
  - main/index.tsからのhandlers.ts importを削除する
  - _Requirements: 10.2, 10.3_
  - _Verify: Grep "channels.ts|handlers.ts|ipcUtils.ts|sshChannels.ts|projectFileUtils.ts|projectUtils.ts|watcherUtils.ts|worktreeUtils.ts" in src/main/ipc/ should return 0 results_

- [x] 11.3 electron.d.tsのレガシーAPI型定義を削除する
  - `src/renderer/types/electron.d.ts` を物理削除する
  - `window.electronAPI`のTypeScript型宣言が完全に削除されていることを確認する
  - _Requirements: 10.4_
  - _Verify: Grep "electron.d.ts" should return 0 results_

- [x] 11.4 `window.electronAPI`参照の全削除とIpcApiClient.tsの物理削除
  - 実装着手前にWebSocketApiClientが提供するメソッド一覧とApiClientインターフェースの現状を照合し、削除予定のメソッドがWebSocketApiClientで使用されていないことを確認する
  - Renderer/Remote UI全体から`window.electronAPI`の参照を全て削除する
  - `src/shared/api/IpcApiClient.ts` を物理削除する
  - IpcApiClientとWebSocketApiClientのメソッドセット差分を確認し、ApiClientインターフェースからIpcApiClient固有メソッド（例: 同期メソッド`getProjectPath()`）を削除してWebSocketApiClient実装に合わせて整理する
  - _Requirements: 10.6_
  - _Verify: Grep "window.electronAPI" should return 0 results_

- [x] 11.5 TypeScriptコンパイルと全テストの通過を確認する
  - `npm run build` と `npm run typecheck` が成功することを確認する
  - `npm run build:remote` が成功することを確認する（Remote UI側のWebSocketApiClientがApiClientインターフェース変更の影響を受けていないこと）
  - `vitest run` で全統合テストがpassすることを確認する
  - 型エラーや未使用importが残っていないことを確認する
  - _Requirements: 10.7, 10.8_
  - _Verify: Grep "electronAPI|ipcRenderer.on" should return 0 results; `npm run build:remote` pass_

## Task 12. E2Eテスト・人間テストチェックリスト
- [~] 12.1 自動化可能なE2EテストをSmoke Test/Critical Pathで作成する (スキップ: E2Eに重大な問題があるため本specでは省略)
  - アプリケーション起動 → メイン画面表示（Smoke Test）のE2Eテストを作成/更新する
  - プロジェクト選択 → エージェント実行開始（Critical Path）のE2Eテストを作成する
  - Remote UI接続・操作のE2Eテストを作成する
  - _Requirements: 11.1, 11.2_
  - _Verify: Grep "smoke|criticalPath" in e2e/_

- [~] 12.2 人間によるテストチェックリストを文書化する (スキップ: 同上)
  - ファイル選択ダイアログ動作、ドラッグ&ドロップ、メニューバー操作、ウィンドウ操作の手動テスト項目を定義する
  - テスト手順と期待結果を明記する
  - _Requirements: 11.1, 11.3_

## Task 13. ドキュメント更新
- [x] 13.1 (P) `.kiro/steering/tech.md`のIPC設計パターンセクションをtRPCに更新する
  - 「IPC設計パターン」セクションをtRPCルーターベースの設計に書き換える
  - tRPC Context DI、ルーター構成、Subscriptionパターンを記載する
  - 「Remote UI アーキテクチャ」セクション内のIpcApiClient記述も更新対象に含める
  - _Requirements: 12.1_

- [x] 13.2 (P) `.kiro/steering/structure.md`のディレクトリ構造をtRPCを反映して更新する
  - `src/main/ipc/`セクションを削除し、`src/main/trpc/`構造に置き換える
  - スキーマ、ルーター、テストのディレクトリ構成を記載する
  - 「Electron Process Boundary Rules」セクションの正しい実装パターンに、vanillaClientを使ったStore実装パターン（DD-006準拠）を追加する
  - _Requirements: 12.2_

- [~] 13.3 `docs/future-concepts/trpc-migration-plan.md`に完了ステータスを追記する (スキップ: ファイルが存在しない)
  - 各フェーズの完了日時と結果を記録する
  - _Requirements: 12.3_

- [x] 13.4 新規開発者向けのtRPC API追加手順を文書化する (tech.mdに記載済み)
  - 新しいAPIを追加する際の手順（Zodスキーマ定義 → ルーター実装 → テスト → Renderer統合）を記載する
  - _Requirements: 12.4_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | GET_APP_VERSION等4チャンネルtRPC移行 | 2.1 | Feature |
| 1.2 | Zodスキーマ定義（system） | 2.1 | Feature |
| 1.3 | Rendererフック置換（system） | 2.2 | Feature |
| 1.4 | 統合テスト（system） | 1.2, 2.3 | Integration Test |
| 1.5 | レガシーハンドラ削除（system） | 2.3 | Cleanup |
| 1.6 | preload API削除（system） | 2.3 | Cleanup |
| 2.1 | config router作成 | 3.1 | Feature |
| 2.2 | Config全チャンネル移行 | 3.1, 3.2 | Feature |
| 2.3 | Zodスキーマ（config） | 3.1 | Feature |
| 2.4 | configHandlers.ts削除 | 3.3 | Cleanup |
| 2.5 | 統合テスト（config） | 1.2, 3.3 | Integration Test |
| 3.1 | project/file router作成 | 4.1, 4.2 | Feature |
| 3.2 | Project/File全チャンネル移行 | 4.1, 4.2, 4.3 | Feature |
| 3.3 | Zodスキーマ（project/file） | 4.1, 4.2 | Feature |
| 3.4 | projectHandlers/fileHandlers削除 | 4.4 | Cleanup |
| 3.5 | projectFileHandlers削除 | 4.4 | Cleanup |
| 3.6 | 統合テスト（project/file） | 1.2, 4.4 | Integration Test |
| 4.1 | spec/bug router作成 | 5.1, 5.2 | Feature |
| 4.2 | Spec/Bug全チャンネル移行 | 5.1, 5.2, 5.3 | Feature |
| 4.3 | Zodスキーマ（spec/bug） | 5.1, 5.2 | Feature |
| 4.4 | specHandlers/bugHandlers/worktreeHandlers削除 | 5.4 | Cleanup |
| 4.5 | convertWorktreeHandlers削除 | 5.4 | Cleanup |
| 4.6 | 統合テスト（spec/bug） | 5.4 | Integration Test |
| 5.1 | agent router作成 | 6.1 | Feature |
| 5.2 | Agent全チャンネル移行 | 6.1, 6.2 | Feature |
| 5.3 | Zodスキーマ（agent） | 6.1 | Feature |
| 5.4 | agentHandlers.ts削除 | 6.3 | Cleanup |
| 5.5 | 統合テスト（agent） | 6.3 | Integration Test |
| 6.1 | autoExecution router作成 | 7.1 | Feature |
| 6.2 | AutoExecution全チャンネル移行 | 7.1, 7.2 | Feature |
| 6.3 | Zodスキーマ（autoExecution） | 7.1 | Feature |
| 6.4 | autoExecution/bugAutoExecutionHandlers削除 | 7.3 | Cleanup |
| 6.5 | 統合テスト（autoExecution） | 7.3 | Integration Test |
| 7.1 | git router作成 | 8.1 | Feature |
| 7.2 | Git/Worktree全チャンネル移行 | 8.1, 8.2 | Feature |
| 7.3 | Zodスキーマ（git） | 8.1 | Feature |
| 7.4 | gitHandlers/worktreeHandlers削除 | 8.3 | Cleanup |
| 7.5 | 統合テスト（git） | 8.3 | Integration Test |
| 8.1 | tRPC Subscription設定 | 9.1 | Feature |
| 8.2 | 全イベント通知移行 | 9.1 | Feature |
| 8.3 | ipcRenderer.onリスナー削除 | 9.2 | Cleanup |
| 8.4 | Subscriptionフック使用 | 9.2 | Feature |
| 8.5 | 統合テスト（events） | 9.3 | Integration Test |
| 9.1 | 残りドメイン全移行 | 10.1, 10.2, 10.3, 10.4, 10.5, 10.6 | Feature |
| 9.2 | Zodスキーマ（残りドメイン） | 10.1, 10.2, 10.3, 10.4, 10.5 | Feature |
| 9.3 | 対応ハンドラ削除 | 10.7 | Cleanup |
| 9.4 | 統合テスト（残りドメイン） | 10.7 | Integration Test |
| 10.1 | preload/index.ts削除/最小化 | 11.1 | Cleanup |
| 10.2 | channels.ts削除 | 11.2 | Cleanup |
| 10.3 | handlers.ts・全ドメインハンドラ削除 | 11.2 | Cleanup |
| 10.4 | electron.d.ts型定義削除 | 11.3 | Cleanup |
| 10.5 | contextBridge削除 | 11.1 | Cleanup |
| 10.6 | window.electronAPI参照全削除 | 11.4 | Cleanup |
| 10.7 | TypeScript/テストpass | 11.5 | Integration Test |
| 10.8 | 全統合テストpass | 11.5 | Integration Test |
| 11.1 | E2E/人間テストチェックリスト | 12.1, 12.2 | Feature |
| 11.2 | 自動化可能項目のE2Eテスト | 12.1 | Integration Test |
| 11.3 | 人間テスト項目文書化 | 12.2 | Feature |
| 12.1 | tech.md更新 | 13.1 | Infrastructure |
| 12.2 | structure.md更新 | 13.2 | Infrastructure |
| 12.3 | 計画書ステータス更新 | 13.3 | Infrastructure |
| 12.4 | tRPC API追加手順文書化 | 13.4 | Infrastructure |
