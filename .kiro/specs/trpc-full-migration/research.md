# Research & Design Decisions: tRPC Full Migration

## Summary

- **Feature**: `trpc-full-migration`
- **Discovery Scope**: Complex Integration（既存219 IPCチャンネルの完全移行）
- **Key Findings**:
  - electron-trpc 0.7.1はQueries, Mutations, Subscriptionsを完全サポートしており、WebSocket不要でIPC経由のSubscriptionが可能
  - 既存のIPC基盤は19ハンドラファイル・219チャンネル・2,771行のpreloadコードで構成されており、ドメイン別に分離済み
  - tRPC infrastructure基盤（trpc-infrastructure Spec）が実装済みで、systemルーター、クライアント、プロバイダーが動作中

## Research Log

### electron-trpc Subscription対応

- **Context**: Req 8（イベント通知移行）でSubscriptionをIPC経由で使用可能か
- **Sources Consulted**: [electron-trpc公式サイト](https://electron-trpc.dev/)、[GitHub jsonnull/electron-trpc](https://github.com/jsonnull/electron-trpc)、[npm electron-trpc](https://www.npmjs.com/package/electron-trpc)
- **Findings**:
  - electron-trpc 0.7.1は「Full support for queries, mutations, and subscriptions」と明記
  - @trpc/server 10.xの`observable()`ヘルパーを使用してSubscriptionを実装
  - IPC経由でSubscriptionが動作するため、別途WebSocketサーバーの構築は不要
  - ContextIsolation環境で動作確認済み
- **Implications**: 既存の`BrowserWindow.webContents.send()` + `ipcRenderer.on()`パターンをtRPC Subscriptionに置換可能。Remote UIのWebSocket通信には影響しない

### 既存IPCハンドラファイル構成

- **Context**: 移行規模と移行順序の決定
- **Sources Consulted**: コードベース調査（Grep/Glob）
- **Findings**:

| ハンドラファイル | チャンネル数 | ドメイン |
|----------------|-----------|---------|
| `handlers.ts` | オーケストレーター + webContents.send 5個（Agent系: AGENT_OUTPUT, AGENT_STATUS_CHANGE, AGENT_LOG, AGENT_EXIT_ERROR, AGENT_START_ERROR） | 全体統括 |
| `configHandlers.ts` | 18 | 設定管理 |
| `projectHandlers.ts` | 14 | プロジェクト管理 |
| `fileHandlers.ts` | 7 | ファイル操作 |
| `projectFileHandlers.ts` | 4 | プロジェクトファイル |
| `specHandlers.ts` | 25 | Spec管理 |
| `bugHandlers.ts` | 7 | Bug管理 |
| `bugWorktreeHandlers.ts` | 6 | Bug Worktree |
| `agentHandlers.ts` | 10 | Agent管理 |
| `autoExecutionHandlers.ts` | 13 (safeHandle 8 + イベント通知 5) | 自動実行 |
| `bugAutoExecutionHandlers.ts` | 12 (safeHandle 6 + イベント通知 6) | Bug自動実行 |
| `gitHandlers.ts` | 6 | Git操作 |
| `worktreeHandlers.ts` | 7 | Worktree |
| `worktreeImplHandlers.ts` | 0（ユーティリティ） | Worktree実装ヘルパー |
| `convertWorktreeHandlers.ts` | 2 | Worktree変換 |
| `cloudflareHandlers.ts` | 11 | Cloudflare |
| `installHandlers.ts` | 17 | インストール |
| `mcpHandlers.ts` | 6 | MCP Server |
| `scheduleTaskHandlers.ts` | 10 | スケジュール |
| `metricsHandlers.ts` | 4 | メトリクス |
| `remoteAccessHandlers.ts` | 5 (safeHandle 4 + イベント通知 1) | Remote Access |
| `sshHandlers.ts` | 7 (+1イベント通知) | SSH |
| `clipboardHandlers.ts` | 1 | Clipboard |
| `startImplPhase.ts` | 1 | Impl Phase |

- **Implications**: 移行はドメイン単位で実施可能。ハンドラファイルとルーターファイルが1:1対応

### Renderer側のwindow.electronAPI使用状況

- **Context**: 移行のRenderer側影響範囲の把握
- **Sources Consulted**: コードベースGrep
- **Findings**:
  - `src/shared/api/IpcApiClient.ts`: 44メソッド（76呼び出し）
  - `src/renderer/`: 554呼び出し（60ファイル）
  - `src/shared/stores/`: 一部Store内に直接呼び出しあり
  - 合計: 約630箇所の`window.electronAPI`参照
- **Implications**: 全箇所をtRPCフックに段階的に置換する必要がある。IpcApiClient.tsの44メソッドが中間レイヤーとして機能しているため、まずIpcApiClient内部をtRPCに変更し、最終的にIpcApiClient自体を削除する選択肢もあるが、DD-005で直接フック使用を選択

### tRPCバージョン互換性

- **Context**: 現在のプロジェクトのtRPCバージョンと互換性確認
- **Sources Consulted**: package.json、npm
- **Findings**:
  - @trpc/server: 10.45.4
  - @trpc/client: 10.45.4
  - @trpc/react-query: 10.45.4
  - electron-trpc: 0.7.1
  - @tanstack/react-query: 4.43.0
  - すべてtRPC v10系で統一済み
- **Implications**: バージョンの不整合なし。tRPC v11への移行は本Spec範囲外

### Remote UI影響分析

- **Context**: Remote UIはWebSocketApiClientを使用しており、tRPC移行の影響を受けるか
- **Sources Consulted**: コードベース調査
- **Findings**:
  - Remote UIは`WebSocketApiClient`を使用し、`webSocketHandler.ts`経由でMainプロセスと通信
  - `IpcApiClient`の削除はRemote UIに影響しない（WebSocketApiClientは独立）
  - `ApiClient`インターフェース（`types.ts`）はWebSocketApiClient用に残す
  - tRPC over WebSocketの導入はScope外
- **Implications**: Remote UIの既存動作に影響なし。ただし、`ApiClient`インターフェースから「Electron IPC前提」のメソッドを整理する必要あり

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| A: ルーター直接Service呼び出し | ルーターがServiceメソッドを直接呼ぶ | 最小限の変更、既存テスト再利用 | ルーターがServiceに密結合 | 選択 (DD-002) |
| B: 中間Service層導入 | tRPC用の新しいService層を追加 | 関心分離 | 不要な抽象層、コード重複 | 却下 |
| C: IpcApiClient内部置換 | IpcApiClientの内部をtRPCに変更 | 段階的移行が容易 | 抽象層の存在意義喪失 | 却下 (DD-005) |

## Design Decisions

### Decision: Subscription実装パターン

- **Context**: Main→Renderer通知をtRPC Subscriptionでどう実装するか
- **Alternatives Considered**:
  1. EventEmitter + observable() wrapper
  2. 専用のイベントバス
- **Selected Approach**: EventEmitter + observable() wrapper
- **Rationale**:
  - 既存のServiceイベント発火パターンを変更せず、ルーター側でwrapする
  - tRPC標準の`observable()`がEventEmitterとの統合を容易にする
  - テスト時にEventEmitterを直接制御可能
- **Trade-offs**: ルーター内にSubscriptionのboilerplateが増えるが、パターンが統一されているため保守性は維持
- **Follow-up**: Subscription接続のライフサイクル管理（BrowserWindowクローズ時のcleanup）を検証

### Decision: Context拡張によるDI

- **Context**: handlers.tsが担っていたDI（Service初期化・注入）の移行先
- **Alternatives Considered**:
  1. tRPC Context経由で注入
  2. モジュールレベルのシングルトン
  3. Dependency Injection Container
- **Selected Approach**: tRPC Context経由で注入
- **Rationale**:
  - tRPCの標準パターンに準拠
  - テスト時にカスタムContextでモックサービスを注入可能
  - handlers.tsの既存パターン（関数引数によるDI）に近い
- **Trade-offs**: Context型が大きくなるが、TypeScriptの型推論で管理可能
- **Follow-up**: Context生成のパフォーマンス影響を検証（リクエストごとにContext生成）

### Decision: 移行順序（依存関係順）

- **Context**: 19ハンドラファイルの移行順序
- **Alternatives Considered**:
  1. 依存少ない順（参照系 → 複雑系）
  2. 使用頻度順（頻繁に使われるAPI優先）
  3. コード量順（少ないファイルから）
- **Selected Approach**: 依存少ない順（参照系 → 複雑系）
- **Rationale**:
  - パイロット移行で「ルーター実装 → UI差し替え → レガシー削除」のサイクルを確立
  - 参照系APIは副作用がなく、移行リスクが最小
  - ノウハウを蓄積してからAgent/Subscriptionなどの複雑な部分に着手
- **Trade-offs**: ユーザーが最も多く使う機能（Spec管理等）の移行が後半になる
- **Follow-up**: パイロット移行のRetrospectvieを実施し、後続ドメインの移行方針を微調整

## ドメイン別チャンネルマッピング

### system router（Req 1 拡張）

| Legacy Channel | tRPC Procedure | Type | Notes |
|---------------|---------------|------|-------|
| GET_APP_VERSION | system.getAppVersion | query | channels.ts定義済み |
| GET_PLATFORM | system.getPlatform | query | channels.ts定義済み |
| GET_NODE_ENV | system.getNodeEnv | query | 新規追加プロシージャ（channels.tsに未定義、tRPCで新規提供） |
| _(新規)_ | system.getAppPath | query | 新規追加プロシージャ（channels.tsに未定義、`app.getAppPath()`を提供） |

**注**: `GET_INITIAL_PROJECT_PATH`は`projectHandlers.ts`で処理されるため、project routerに配置（下記参照）。

### config router（Req 2）

| Legacy Channel | tRPC Procedure | Type | 出自ハンドラ |
|---------------|---------------|------|-------------|
| GET_RECENT_PROJECTS | config.getRecentProjects | query | projectHandlers.ts |
| ADD_RECENT_PROJECT | config.addRecentProject | mutation | projectHandlers.ts |
| GET_HANG_THRESHOLD | config.getHangThreshold | query | configHandlers.ts |
| SET_HANG_THRESHOLD | config.setHangThreshold | mutation | configHandlers.ts |
| LOAD_LAYOUT_CONFIG | config.loadLayoutConfig | query | configHandlers.ts |
| SAVE_LAYOUT_CONFIG | config.saveLayoutConfig | mutation | configHandlers.ts |
| RESET_LAYOUT_CONFIG | config.resetLayoutConfig | mutation | configHandlers.ts |
| LOAD_SKIP_PERMISSIONS | config.loadSkipPermissions | query | configHandlers.ts |
| SAVE_SKIP_PERMISSIONS | config.saveSkipPermissions | mutation | configHandlers.ts |
| LOAD_PROJECT_DEFAULTS | config.loadProjectDefaults | query | configHandlers.ts |
| SAVE_PROJECT_DEFAULTS | config.saveProjectDefaults | mutation | configHandlers.ts |
| LOAD_PROFILE | config.loadProfile | query | configHandlers.ts |
| LOAD_ENGINE_CONFIG | config.loadEngineConfig | query | configHandlers.ts |
| SAVE_ENGINE_CONFIG | config.saveEngineConfig | mutation | configHandlers.ts |
| GET_AVAILABLE_LLM_ENGINES | config.getAvailableLlmEngines | query | configHandlers.ts |
| GET_TOOL_STATUSES | config.getToolStatuses | query | configHandlers.ts |
| SET_TOOL_PATH | config.setToolPath | mutation | configHandlers.ts |
| RESOLVE_TOOL | config.resolveTool | query | configHandlers.ts |
| VCS_SCHEME_GET | config.getVcsScheme | query | handlers.ts |
| VCS_SCHEME_SET | config.setVcsScheme | mutation | handlers.ts |
| LOAD_REMOTE_UI_AUTO_START | config.loadRemoteUiAutoStart | query | configHandlers.ts |
| SAVE_REMOTE_UI_AUTO_START | config.saveRemoteUiAutoStart | mutation | configHandlers.ts |

**注**: config routerの22プロシージャの内訳: configHandlers.ts由来18 + projectHandlers.ts由来2（RECENT_PROJECTS） + handlers.ts由来2（VCS_SCHEME）。`SETTINGS_BUGS_WORKTREE_DEFAULT_GET`/`SET`は`bugWorktreeHandlers.ts`で定義されているため、bug routerの移行対象（Req 4参照）。

### project router（Req 3）

| Legacy Channel | tRPC Procedure | Type |
|---------------|---------------|------|
| SELECT_PROJECT | project.selectProject | mutation |
| SET_PROJECT_PATH | project.setProjectPath | mutation |
| SHOW_OPEN_DIALOG | project.showOpenDialog | mutation |
| VALIDATE_KIRO_DIRECTORY | project.validateKiroDirectory | query |
| GET_INITIAL_PROJECT_PATH | project.getInitialProjectPath | query |
| GET_WINDOW_PROJECT | project.getWindowProject | query |
| SET_WINDOW_PROJECT | project.setWindowProject | mutation |
| CREATE_NEW_WINDOW | project.createNewWindow | mutation |
| GET_IS_E2E_TEST | project.getIsE2ETest | query |

### file router（Req 3）

| Legacy Channel | tRPC Procedure | Type |
|---------------|---------------|------|
| READ_SPECS | file.readSpecs | query |
| READ_SPEC_JSON | file.readSpecJson | query |
| READ_ARTIFACT | file.readArtifact | query |
| WRITE_ARTIFACT | file.writeArtifact | mutation |
| LIST_MARKDOWN_FILES_IN_SPEC | file.listMarkdownFilesInSpec | query |
| WRITE_FILE | file.writeFile | mutation |
| GET_ARTIFACT_PATH | file.getArtifactPath | query |
| READ_FILE_CONTENT | file.readFileContent | query |
| PROJECT_FILE_LIST | file.projectFileList | query |
| PROJECT_FILE_READ | file.projectFileRead | query |
| PROJECT_FILE_WRITE | file.projectFileWrite | mutation |

### spec router（Req 4）

| Legacy Channel | tRPC Procedure | Type |
|---------------|---------------|------|
| CREATE_SPEC | spec.create | mutation |
| UPDATE_APPROVAL | spec.updateApproval | mutation |
| UPDATE_SPEC_JSON | spec.updateSpecJson | mutation |
| SYNC_SPEC_PHASE | spec.syncSpecPhase | mutation |
| SYNC_DOCUMENT_REVIEW | spec.syncDocumentReview | mutation |
| START_SPECS_WATCHER | spec.startSpecsWatcher | mutation |
| STOP_SPECS_WATCHER | spec.stopSpecsWatcher | mutation |
| EXECUTE | spec.execute | mutation |
| EXECUTE_SPEC_INIT | spec.executeSpecInit | mutation |
| EXECUTE_SPEC_PLAN | spec.executeSpecPlan | mutation |
| EXECUTE_DOCUMENT_REVIEW | spec.executeDocumentReview | mutation |
| EXECUTE_DOCUMENT_REVIEW_REPLY | spec.executeDocumentReviewReply | mutation |
| EXECUTE_DOCUMENT_REVIEW_FIX | spec.executeDocumentReviewFix | mutation |
| APPROVE_DOCUMENT_REVIEW | spec.approveDocumentReview | mutation |
| EXECUTE_INSPECTION | spec.executeInspection | mutation |
| EXECUTE_INSPECTION_FIX | spec.executeInspectionFix | mutation |
| SET_INSPECTION_AUTO_EXECUTION_FLAG | spec.setInspectionAutoExecutionFlag | mutation |
| EXECUTE_ASK_SPEC | spec.executeAskSpec | mutation |
| EXECUTE_SPEC_MERGE | spec.executeSpecMerge | mutation |
| EVENT_LOG_GET | spec.getEventLog | query |
| PARSE_TASKS_FOR_PARALLEL | spec.parseTasksForParallel | query |
| START_IMPL | spec.startImpl | mutation |
| EXECUTE_PROJECT_COMMAND | spec.executeProjectCommand | mutation |
| CONFIRM_COMMON_COMMANDS | spec.confirmCommonCommands | mutation |
| CHECK_STEERING_FILES | spec.checkSteeringFiles | query |
| GENERATE_VERIFICATION_MD | spec.generateVerificationMd | mutation |
| CHECK_RELEASE_MD | spec.checkReleaseMd | query |
| GENERATE_RELEASE_MD | spec.generateReleaseMd | mutation |

### bug router（Req 4）

| Legacy Channel | tRPC Procedure | Type |
|---------------|---------------|------|
| READ_BUGS | bug.readBugs | query |
| READ_BUG_DETAIL | bug.readBugDetail | query |
| START_BUGS_WATCHER | bug.startBugsWatcher | mutation |
| STOP_BUGS_WATCHER | bug.stopBugsWatcher | mutation |
| EXECUTE_BUG_CREATE | bug.executeBugCreate | mutation |
| BUG_PHASE_UPDATE | bug.phaseUpdate | mutation |
| BUG_WORKTREE_CREATE | bug.worktreeCreate | mutation |
| BUG_WORKTREE_REMOVE | bug.worktreeRemove | mutation |
| BUG_WORKTREE_AUTO_EXECUTION | bug.worktreeAutoExecution | mutation |
| BUG_CONVERT_TO_WORKTREE | bug.convertToWorktree | mutation |
| SETTINGS_BUGS_WORKTREE_DEFAULT_GET | bug.getBugsWorktreeDefault | query |
| SETTINGS_BUGS_WORKTREE_DEFAULT_SET | bug.setBugsWorktreeDefault | mutation |

### agent router（Req 5）

| Legacy Channel | tRPC Procedure | Type |
|---------------|---------------|------|
| START_AGENT | agent.start | mutation |
| STOP_AGENT | agent.stop | mutation |
| RESUME_AGENT | agent.resume | mutation |
| DELETE_AGENT | agent.delete | mutation |
| GET_AGENTS | agent.getAgents | query |
| GET_ALL_AGENTS | agent.getAllAgents | query |
| SEND_AGENT_INPUT | agent.sendInput | mutation |
| GET_AGENT_LOGS | agent.getLogs | query |
| GET_RUNNING_AGENT_COUNTS | agent.getRunningAgentCounts | query |
| CHECK_AGENT_FOLDER_EXISTS | agent.checkFolderExists | query |
| DELETE_AGENT_FOLDER | agent.deleteFolder | mutation |

### autoExecution router（Req 6）

| Legacy Channel | tRPC Procedure | Type |
|---------------|---------------|------|
| AUTO_EXECUTION_START | autoExecution.start | mutation |
| AUTO_EXECUTION_STOP | autoExecution.stop | mutation |
| AUTO_EXECUTION_STATUS | autoExecution.getStatus | query |
| AUTO_EXECUTION_ALL_STATUS | autoExecution.getAllStatus | query |
| AUTO_EXECUTION_RETRY_FROM | autoExecution.retryFrom | mutation |
| AUTO_EXECUTION_RESET | autoExecution.reset | mutation |
| SET_MOCK_ENV | autoExecution.setMockEnv | mutation |
| AUTO_EXECUTION_RESET_IMPL_RETRY | autoExecution.resetImplRetry | mutation |
| BUG_AUTO_EXECUTION_START | autoExecution.bugStart | mutation |
| BUG_AUTO_EXECUTION_STOP | autoExecution.bugStop | mutation |
| BUG_AUTO_EXECUTION_STATUS | autoExecution.bugGetStatus | query |
| BUG_AUTO_EXECUTION_ALL_STATUS | autoExecution.bugGetAllStatus | query |
| BUG_AUTO_EXECUTION_RETRY_FROM | autoExecution.bugRetryFrom | mutation |
| BUG_AUTO_EXECUTION_RESET | autoExecution.bugReset | mutation |

### git router（Req 7）

| Legacy Channel | tRPC Procedure | Type |
|---------------|---------------|------|
| GIT_GET_STATUS | git.getStatus | query |
| GIT_GET_DIFF | git.getDiff | query |
| GIT_WATCH_CHANGES | git.watchChanges | mutation |
| GIT_UNWATCH_CHANGES | git.unwatchChanges | mutation |
| WORKTREE_CHECK_MAIN | git.worktreeCheckMain | query |
| WORKTREE_CREATE | git.worktreeCreate | mutation |
| WORKTREE_REMOVE | git.worktreeRemove | mutation |
| WORKTREE_RESOLVE_PATH | git.worktreeResolvePath | query |
| WORKTREE_IMPL_START | git.worktreeImplStart | mutation |
| NORMAL_MODE_IMPL_START | git.normalModeImplStart | mutation |
| WORKTREE_REBASE_FROM_MAIN | git.worktreeRebaseFromMain | mutation |
| CONVERT_CHECK | git.convertCheck | query |
| CONVERT_TO_WORKTREE | git.convertToWorktree | mutation |

### events router（Req 8）

全イベント通知チャンネルをSubscriptionに移行。以下はpreload/index.ts実測34リスナーとdesign.md eventsRouter Subscription定義の1:1マッピング。

| # | preload ipcRenderer.on リスナー | tRPC Subscription | 備考 |
|---|-------------------------------|-------------------|------|
| 1 | AGENT_OUTPUT | events.onAgentOutput | |
| 2 | AGENT_STATUS_CHANGE | events.onAgentStatusChange | |
| 3 | AGENT_LOG | events.onAgentLog | |
| 4 | AGENT_EXIT_ERROR | events.onAgentExitError | |
| 5 | AGENT_START_ERROR | events.onAgentStartError | |
| 6 | AGENT_RECORD_CHANGED | events.onAgentRecordChanged | |
| 7 | PROJECT_SELECTED | events.onProjectSelected | |
| 8 | SPECS_CHANGED | events.onSpecsChanged | |
| 9 | BUGS_CHANGED | events.onBugsChanged | |
| 10 | AUTO_EXECUTION_STATUS_CHANGED | events.onAutoExecutionStatusChanged | |
| 11 | AUTO_EXECUTION_PHASE_COMPLETED | events.onAutoExecutionPhaseCompleted | |
| 12 | AUTO_EXECUTION_ERROR | events.onAutoExecutionError | |
| 13 | AUTO_EXECUTION_COMPLETED | events.onAutoExecutionCompleted | |
| 14 | BUG_AUTO_EXECUTION_STATUS_CHANGED | events.onBugAutoExecutionStatusChanged | |
| 15 | BUG_AUTO_EXECUTION_PHASE_COMPLETED | events.onBugAutoExecutionPhaseCompleted | |
| 16 | BUG_AUTO_EXECUTION_ERROR | events.onBugAutoExecutionError | |
| 17 | BUG_AUTO_EXECUTION_COMPLETED | events.onBugAutoExecutionCompleted | |
| 18 | BUG_AUTO_EXECUTION_EXECUTE_PHASE | events.onBugAutoExecutionExecutePhase | |
| 19 | REMOTE_SERVER_STATUS_CHANGED | events.onRemoteServerStatusChanged | |
| 20 | REMOTE_CLIENT_COUNT_CHANGED | events.onRemoteClientCountChanged | |
| 21 | CLOUDFLARE_TUNNEL_STATUS_CHANGED | events.onCloudflareTunnelStatusChanged | |
| 22 | GIT_CHANGES_DETECTED | events.onGitChangesDetected | |
| 23 | PROJECT_FILE_CHANGED | events.onProjectFileChanged | |
| 24 | SCHEDULE_TASK_STATUS_CHANGED | events.onScheduleTaskStatusChanged | |
| 25 | MCP_STATUS_CHANGED | events.onMcpStatusChanged | |
| 26 | `ssh:status-changed` | events.onSshStatusChanged | カスタムチャンネル名（IPC_CHANNELS定数外） |
| 27 | MENU_OPEN_PROJECT | events.onMenuOpenProject | |
| 28 | MENU_RESET_LAYOUT | events.onMenuResetLayout | |
| 29 | MENU_INSTALL_CLI_COMMAND | events.onMenuInstallCli | |
| 30 | MENU_INSTALL_COMMANDSET | events.onMenuInstallCommandset | |
| 31 | MENU_INSTALL_EXPERIMENTAL_DEBUG | events.onMenuInstallExperimentalDebug | |
| 32 | MENU_INSTALL_EXPERIMENTAL_GEMINI_DOC_REVIEW | events.onMenuInstallExperimentalGemini | |
| 33 | MENU_SET_COMMAND_PREFIX | events.onMenuSetCommandPrefix | |
| 34 | MENU_TOGGLE_REMOTE_SERVER | events.onMenuToggleRemoteServer | |

**preloadにリスナー無し、design.md定義に含むSubscription**（Main側でbroadcast/sendされるが現在preloadで未受信）:

| tRPC Subscription | Main側送信元 | 備考 |
|-------------------|-------------|------|
| events.onAutoExecutionPhaseStarted | autoExecutionHandlers.ts:360 | broadcastToRenderers |
| events.onBugAutoExecutionPhaseStarted | bugAutoExecutionHandlers.ts:229 | broadcastToRenderers |
| events.onMetricsUpdated | metricsHandlers.ts:136 | webContents.send |

**注**: `MENU_NEW_WINDOW`はchannels.tsに定義のみでMain側send呼び出しが存在しない未使用チャンネルのため、Subscription定義から除外。

### cloudflare router（Req 9）

| Legacy Channel | tRPC Procedure | Type |
|---------------|---------------|------|
| CLOUDFLARE_GET_SETTINGS | cloudflare.getSettings | query |
| CLOUDFLARE_SET_TUNNEL_TOKEN | cloudflare.setTunnelToken | mutation |
| CLOUDFLARE_REFRESH_ACCESS_TOKEN | cloudflare.refreshAccessToken | mutation |
| CLOUDFLARE_ENSURE_ACCESS_TOKEN | cloudflare.ensureAccessToken | mutation |
| CLOUDFLARE_CHECK_BINARY | cloudflare.checkBinary | query |
| CLOUDFLARE_SET_PUBLISH_TO_CLOUDFLARE | cloudflare.setPublishToCloudflare | mutation |
| CLOUDFLARE_SET_CLOUDFLARED_PATH | cloudflare.setCloudflaredPath | mutation |
| CLOUDFLARE_START_TUNNEL | cloudflare.startTunnel | mutation |
| CLOUDFLARE_STOP_TUNNEL | cloudflare.stopTunnel | mutation |
| CLOUDFLARE_GET_TUNNEL_STATUS | cloudflare.getTunnelStatus | query |

### install router（Req 9）

| Legacy Channel | tRPC Procedure | Type |
|---------------|---------------|------|
| CHECK_SPEC_MANAGER_FILES | install.checkSpecManagerFiles | query |
| INSTALL_SPEC_MANAGER_COMMANDS | install.installSpecManagerCommands | mutation |
| INSTALL_SPEC_MANAGER_SETTINGS | install.installSpecManagerSettings | mutation |
| INSTALL_SPEC_MANAGER_ALL | install.installSpecManagerAll | mutation |
| FORCE_REINSTALL_SPEC_MANAGER_ALL | install.forceReinstallSpecManagerAll | mutation |
| INSTALL_CLI_COMMAND | install.installCliCommand | mutation |
| GET_CLI_INSTALL_STATUS | install.getCliInstallStatus | query |
| CHECK_COMMANDSET_STATUS | install.checkCommandsetStatus | query |
| INSTALL_COMMANDSET_BY_PROFILE | install.installCommandsetByProfile | mutation |
| INSTALL_EXPERIMENTAL_DEBUG | install.installExperimentalDebug | mutation |
| CHECK_EXPERIMENTAL_TOOL_EXISTS | install.checkExperimentalToolExists | query |
| INSTALL_EXPERIMENTAL_GEMINI_DOC_REVIEW | install.installExperimentalGeminiDocReview | mutation |
| CHECK_EXPERIMENTAL_GEMINI_DOC_REVIEW_EXISTS | install.checkExperimentalGeminiDocReviewExists | query |
| CHECK_COMMANDSET_VERSIONS | install.checkCommandsetVersions | query |
| CHECK_MIGRATION_NEEDED | install.checkMigrationNeeded | query |
| ACCEPT_MIGRATION | install.acceptMigration | mutation |
| DECLINE_MIGRATION | install.declineMigration | mutation |
| CHECK_JJ_AVAILABILITY | install.checkJjAvailability | query |
| INSTALL_JJ | install.installJj | mutation |
| IGNORE_JJ_INSTALL | install.ignoreJjInstall | mutation |

### mcp router（Req 9）

| Legacy Channel | tRPC Procedure | Type |
|---------------|---------------|------|
| MCP_START | mcp.start | mutation |
| MCP_STOP | mcp.stop | mutation |
| MCP_GET_STATUS | mcp.getStatus | query |
| MCP_GET_SETTINGS | mcp.getSettings | query |
| MCP_SET_ENABLED | mcp.setEnabled | mutation |
| MCP_SET_PORT | mcp.setPort | mutation |

### schedule router（Req 9）

| Legacy Channel | tRPC Procedure | Type |
|---------------|---------------|------|
| SCHEDULE_TASK_GET_ALL | schedule.getAll | query |
| SCHEDULE_TASK_GET | schedule.get | query |
| SCHEDULE_TASK_CREATE | schedule.create | mutation |
| SCHEDULE_TASK_UPDATE | schedule.update | mutation |
| SCHEDULE_TASK_DELETE | schedule.delete | mutation |
| SCHEDULE_TASK_EXECUTE_IMMEDIATELY | schedule.executeImmediately | mutation |
| SCHEDULE_TASK_GET_QUEUE | schedule.getQueue | query |
| SCHEDULE_TASK_GET_RUNNING | schedule.getRunning | query |
| SCHEDULE_TASK_REPORT_IDLE_TIME | schedule.reportIdleTime | mutation |

### misc router（Req 9）

| Legacy Channel | tRPC Procedure | Type |
|---------------|---------------|------|
| OPEN_IN_VSCODE | misc.openInVscode | mutation |
| COPY_TO_CLIPBOARD | misc.copyToClipboard | mutation |
| LOG_RENDERER | misc.logRenderer | mutation |
| RECORD_HUMAN_SESSION | misc.recordHumanSession | mutation |
| GET_SPEC_METRICS | misc.getSpecMetrics | query |
| GET_PROJECT_METRICS | misc.getProjectMetrics | query |
| GET_PROJECT_LOG_PATH | misc.getProjectLogPath | query |
| OPEN_LOG_IN_BROWSER | misc.openLogInBrowser | mutation |
| ADD_SHELL_PERMISSIONS | misc.addShellPermissions | mutation |
| ADD_MISSING_PERMISSIONS | misc.addMissingPermissions | mutation |
| CHECK_REQUIRED_PERMISSIONS | misc.checkRequiredPermissions | query |
| START_REMOTE_SERVER | misc.startRemoteServer | mutation |
| STOP_REMOTE_SERVER | misc.stopRemoteServer | mutation |
| GET_REMOTE_SERVER_STATUS | misc.getRemoteServerStatus | query |
| REFRESH_ACCESS_TOKEN | misc.refreshAccessToken | mutation |

### SSH関連（misc routerに統合）

SSH関連のチャンネルは`sshHandlers.ts`と`sshChannels.ts`にて定義。Remote UIとは関連しないが、Electron専用機能のため`misc`ルーターに含める。

| Legacy Channel | tRPC Procedure | Type |
|---------------|---------------|------|
| SSH_CONNECT | misc.sshConnect | mutation |
| SSH_DISCONNECT | misc.sshDisconnect | mutation |
| SSH_GET_STATUS | misc.sshGetStatus | query |
| SSH_GET_CONNECTION_INFO | misc.sshGetConnectionInfo | query |
| SSH_GET_RECENT_REMOTE_PROJECTS | misc.sshGetRecentRemoteProjects | query |
| SSH_ADD_RECENT_REMOTE_PROJECT | misc.sshAddRecentRemoteProject | mutation |
| SSH_REMOVE_RECENT_REMOTE_PROJECT | misc.sshRemoveRecentRemoteProject | mutation |
| SSH_STATUS_CHANGED | events.onSshStatusChanged | subscription |

**注**: `SSH_VALIDATE_URI`、`SSH_PARSE_URI`はチャンネル定義のみでハンドラ未登録のため、移行対象外。

## Risks & Mitigations

- **Risk 1: Subscription接続のライフサイクル管理** - electron-trpcがBrowserWindowクローズ時に自動でcleanupするかの検証が必要。Mitigation: パイロット移行段階で検証し、必要なら手動cleanup実装
- **Risk 2: Remote UIへの間接的影響** - IpcApiClient削除に伴い、ApiClientインターフェースの変更がWebSocketApiClientに波及する可能性。Mitigation: ApiClientインターフェースは維持し、IpcApiClient固有メソッドのみ削除
- **Risk 3: 移行期間中のデグレ** - レガシー/tRPC共存期間にバグが入る可能性。Mitigation: 各ドメイン移行後に統合テスト・E2Eテスト実行

## References

- [electron-trpc公式サイト](https://electron-trpc.dev/) - IPC over tRPCの概要、使用方法
- [electron-trpc GitHub](https://github.com/jsonnull/electron-trpc) - ソースコード、Issue、Subscription実装例
- [tRPC Subscriptions](https://trpc.io/docs/subscriptions) - tRPC v10 Subscription API ドキュメント
- [electron-trpc npm](https://www.npmjs.com/package/electron-trpc) - バージョン履歴（v0.7.1が最新）
- [trpc-infrastructure Spec](/.kiro/specs/trpc-infrastructure/) - 基盤実装の設計・実装詳細
