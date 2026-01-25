# Implementation Plan

## Tasks

- [x] 1. configHandlers.ts の作成と移行
- [x] 1.1 configHandlers.ts を新規作成し、設定関連ハンドラーを実装する
  - ConfigHandlersDependencies インターフェースを定義（configStore, layoutConfigService）
  - registerConfigHandlers 関数をエクスポート
  - GET_HANG_THRESHOLD, SET_HANG_THRESHOLD を移行
  - LOAD_LAYOUT_CONFIG, SAVE_LAYOUT_CONFIG, RESET_LAYOUT_CONFIG を移行
  - LOAD_SKIP_PERMISSIONS, SAVE_SKIP_PERMISSIONS を移行
  - LOAD_PROJECT_DEFAULTS, SAVE_PROJECT_DEFAULTS, LOAD_PROFILE を移行
  - _Requirements: 1.1, 2.1, 2.2, 4.1, 4.2_
  - _Method: registerConfigHandlers, ConfigHandlersDependencies_
  - _Verify: Grep "registerConfigHandlers" in configHandlers.ts_

- [x] 1.2 handlers.ts から configHandlers の移行済みコードを削除し、registerConfigHandlers を呼び出す
  - handlers.ts で configHandlers.ts をインポート
  - registerIpcHandlers 内で registerConfigHandlers を呼び出す
  - 移行済みハンドラーのコードを handlers.ts から削除
  - ビルドと型チェックで動作確認
  - _Requirements: 3.2, 5.2, 5.3_

- [x] 2. installHandlers.ts の作成と移行
- [x] 2.1 (P) installHandlers.ts を新規作成し、インストール関連ハンドラーを実装する
  - InstallHandlersDependencies インターフェースを定義
  - registerInstallHandlers 関数をエクスポート
  - spec-manager関連: CHECK_SPEC_MANAGER_FILES, INSTALL_SPEC_MANAGER_* を移行
  - CLAUDE.md関連: CHECK_CLAUDE_MD_EXISTS, INSTALL_CLAUDE_MD を移行
  - cc-sdd workflow関連: CHECK_CC_SDD_WORKFLOW_STATUS, INSTALL_CC_SDD_WORKFLOW を移行
  - commandset関連: CHECK_COMMANDSET_STATUS, INSTALL_COMMANDSET_BY_PROFILE を移行
  - agent folder関連: CHECK_AGENT_FOLDER_EXISTS, DELETE_AGENT_FOLDER を移行
  - experimental関連: INSTALL_EXPERIMENTAL_*, CHECK_EXPERIMENTAL_* を移行
  - CLI関連: GET_CLI_INSTALL_STATUS, INSTALL_CLI_COMMAND を移行
  - version関連: CHECK_COMMANDSET_VERSIONS, CONFIRM_COMMON_COMMANDS を移行
  - _Requirements: 1.2, 2.1, 2.2, 4.1, 4.2_
  - _Method: registerInstallHandlers, InstallHandlersDependencies_
  - _Verify: Grep "registerInstallHandlers" in installHandlers.ts_

- [x] 2.2 handlers.ts から installHandlers の移行済みコードを削除し、registerInstallHandlers を呼び出す
  - handlers.ts で installHandlers.ts をインポート
  - registerIpcHandlers 内で registerInstallHandlers を呼び出す
  - 移行済みハンドラーのコードを handlers.ts から削除
  - ビルドと型チェックで動作確認
  - _Requirements: 3.2, 5.2, 5.3_

- [x] 3. fileHandlers.ts の作成と移行
- [x] 3.1 (P) fileHandlers.ts を新規作成し、ファイル操作関連ハンドラーを実装する
  - FileHandlersDependencies インターフェースを定義（fileService, getCurrentProjectPath関数）
  - registerFileHandlers 関数をエクスポート
  - SHOW_OPEN_DIALOG を移行（Electron dialog API使用）
  - READ_ARTIFACT, WRITE_ARTIFACT, WRITE_FILE を移行
  - OPEN_IN_VSCODE を移行
  - _Requirements: 1.3, 2.1, 2.2, 4.1, 4.2_
  - _Method: registerFileHandlers, FileHandlersDependencies_
  - _Verify: Grep "registerFileHandlers" in fileHandlers.ts_

- [x] 3.2 handlers.ts から fileHandlers の移行済みコードを削除し、registerFileHandlers を呼び出す
  - handlers.ts で fileHandlers.ts をインポート
  - registerIpcHandlers 内で registerFileHandlers を呼び出す
  - 移行済みハンドラーのコードを handlers.ts から削除
  - ビルドと型チェックで動作確認
  - _Requirements: 3.2, 5.2, 5.3_

- [x] 4. projectHandlers.ts の作成と移行
- [x] 4.1 projectHandlers.ts を新規作成し、プロジェクト管理関連ハンドラーを実装する
  - ProjectHandlersDependencies インターフェースを定義
  - registerProjectHandlers 関数をエクスポート
  - プロジェクト選択・検証: VALIDATE_KIRO_DIRECTORY, SET_PROJECT_PATH, SELECT_PROJECT を移行
  - 履歴管理: GET_RECENT_PROJECTS, ADD_RECENT_PROJECT を移行
  - アプリ情報: GET_APP_VERSION, GET_PLATFORM, GET_INITIAL_PROJECT_PATH を移行
  - ウィンドウ管理: CREATE_NEW_WINDOW, GET_WINDOW_PROJECT, SET_WINDOW_PROJECT を移行
  - テスト用: GET_IS_E2E_TEST, SET_MOCK_ENV を移行
  - ログ関連: GET_PROJECT_LOG_PATH, OPEN_LOG_IN_BROWSER を移行
  - パーミッション: ADD_SHELL_PERMISSIONS, ADD_MISSING_PERMISSIONS, CHECK_REQUIRED_PERMISSIONS を移行
  - validateProjectPath, isProjectSelectionInProgress をこのファイルからエクスポート
  - _Requirements: 1.4, 2.1, 2.2, 4.1, 4.2, 6.2_
  - _Method: registerProjectHandlers, ProjectHandlersDependencies, validateProjectPath, isProjectSelectionInProgress_
  - _Verify: Grep "registerProjectHandlers|validateProjectPath" in projectHandlers.ts_

- [x] 4.2 handlers.ts から projectHandlers の移行済みコードを削除し、公開関数をre-exportする
  - handlers.ts で projectHandlers.ts をインポート
  - registerIpcHandlers 内で registerProjectHandlers を呼び出す
  - validateProjectPath, isProjectSelectionInProgress を handlers.ts から re-export
  - 移行済みハンドラーのコードを handlers.ts から削除
  - ビルドと型チェックで動作確認
  - _Requirements: 3.2, 5.2, 5.3, 6.1, 6.2_

- [x] 5. specHandlers.ts の作成と移行
- [x] 5.1 specHandlers.ts を新規作成し、Spec関連ハンドラーを実装する
  - SpecHandlersDependencies インターフェースを定義
  - registerSpecHandlers 関数をエクスポート
  - Spec CRUD: READ_SPECS, READ_SPEC_JSON, CREATE_SPEC を移行
  - Spec更新: UPDATE_APPROVAL, UPDATE_SPEC_JSON, SYNC_SPEC_PHASE を移行
  - Watcher: START_SPECS_WATCHER, STOP_SPECS_WATCHER を移行
  - 実行系: EXECUTE_SPEC_INIT, EXECUTE_SPEC_PLAN, EXECUTE を移行
  - ドキュメントレビュー: EXECUTE_DOCUMENT_REVIEW*, APPROVE_DOCUMENT_REVIEW, SKIP_DOCUMENT_REVIEW を移行
  - Inspection: EXECUTE_INSPECTION*, SET_INSPECTION_AUTO_EXECUTION_FLAG を移行
  - Ask系: EXECUTE_ASK_PROJECT, EXECUTE_ASK_SPEC を移行
  - マージ: EXECUTE_SPEC_MERGE を移行
  - 実装開始: WORKTREE_IMPL_START, NORMAL_MODE_IMPL_START, START_IMPL を移行
  - その他: SYNC_DOCUMENT_REVIEW, EVENT_LOG_GET, PARSE_TASKS_FOR_PARALLEL を移行
  - startSpecsWatcher, stopSpecsWatcher 関数をエクスポート
  - _Requirements: 1.5, 2.1, 2.2, 4.1, 4.2_
  - _Method: registerSpecHandlers, SpecHandlersDependencies, startSpecsWatcher, stopSpecsWatcher_
  - _Verify: Grep "registerSpecHandlers" in specHandlers.ts_

- [x] 5.2 handlers.ts から specHandlers の移行済みコードを削除し、registerSpecHandlers を呼び出す
  - handlers.ts で specHandlers.ts をインポート
  - registerIpcHandlers 内で registerSpecHandlers を呼び出す
  - 移行済みハンドラーのコードを handlers.ts から削除
  - ビルドと型チェックで動作確認
  - _Requirements: 3.2, 5.2, 5.3_

- [x] 6. bugHandlers.ts の作成と移行
- [x] 6.1 (P) bugHandlers.ts を新規作成し、Bug関連ハンドラーを実装する
  - BugHandlersDependencies インターフェースを定義
  - registerBugHandlers 関数をエクスポート
  - Bug一覧・詳細: READ_BUGS, READ_BUG_DETAIL を移行
  - Watcher: START_BUGS_WATCHER, STOP_BUGS_WATCHER を移行
  - Bug操作: EXECUTE_BUG_CREATE, BUG_PHASE_UPDATE を移行
  - startBugsWatcher, stopBugsWatcher 関数をエクスポート
  - _Requirements: 1.6, 2.1, 2.2, 4.1, 4.2_
  - _Method: registerBugHandlers, BugHandlersDependencies, startBugsWatcher, stopBugsWatcher_
  - _Verify: Grep "registerBugHandlers" in bugHandlers.ts_

- [x] 6.2 handlers.ts から bugHandlers の移行済みコードを削除し、registerBugHandlers を呼び出す
  - handlers.ts で bugHandlers.ts をインポート
  - registerIpcHandlers 内で registerBugHandlers を呼び出す
  - 移行済みハンドラーのコードを handlers.ts から削除
  - ビルドと型チェックで動作確認
  - _Requirements: 3.2, 5.2, 5.3_

- [x] 7. agentHandlers.ts の作成と移行
- [x] 7.1 (P) agentHandlers.ts を新規作成し、Agent関連ハンドラーを実装する
  - AgentHandlersDependencies インターフェースを定義
  - registerAgentHandlers 関数をエクスポート
  - Agent制御: START_AGENT, STOP_AGENT, RESUME_AGENT, DELETE_AGENT を移行
  - Agent一覧: GET_AGENTS, GET_ALL_AGENTS を移行
  - Agent操作: SEND_AGENT_INPUT, GET_AGENT_LOGS を移行
  - Watcher: SWITCH_AGENT_WATCH_SCOPE, GET_RUNNING_AGENT_COUNTS を移行
  - startAgentRecordWatcher, stopAgentRecordWatcher 関数をエクスポート
  - _Requirements: 1.7, 2.1, 2.2, 4.1, 4.2_
  - _Method: registerAgentHandlers, AgentHandlersDependencies, startAgentRecordWatcher, stopAgentRecordWatcher_
  - _Verify: Grep "registerAgentHandlers" in agentHandlers.ts_

- [x] 7.2 handlers.ts から agentHandlers の移行済みコードを削除し、registerAgentHandlers を呼び出す
  - handlers.ts で agentHandlers.ts をインポート
  - registerIpcHandlers 内で registerAgentHandlers を呼び出す
  - 移行済みハンドラーのコードを handlers.ts から削除
  - ビルドと型チェックで動作確認
  - _Requirements: 3.2, 5.2, 5.3_

- [x] 8. handlers.ts のオーケストレーター化と最終整理
- [x] 8.1 handlers.ts をオーケストレーターとして最終整理する
  - サービスインスタンスの生成とDI管理に集中
  - グローバル状態管理（currentProjectPath, specManagerService等）を維持
  - 全ドメインハンドラーのregister関数呼び出しを registerIpcHandlers に集約
  - 不要なコードを削除し、200-300行程度に縮小
  - _Requirements: 3.1, 3.3_

- [x] 8.2 公開関数のre-export構成を確認・整理する
  - getCurrentProjectPath, getAutoExecutionCoordinator の維持確認
  - selectProject, setProjectPath の維持確認
  - setInitialProjectPath, getInitialProjectPath の維持確認
  - getBugAgentEffectiveCwd の維持確認
  - validateProjectPath, isProjectSelectionInProgress のre-export確認
  - 既存の呼び出し元（main.ts等）が影響を受けないことを確認
  - _Requirements: 6.1, 6.2_

- [x] 9. 最終検証とテスト確認
- [x] 9.1 全体のビルドと型チェックを実行する
  - `npm run build && npm run typecheck` が成功することを確認
  - 全ドメインハンドラーが正しく登録されていることを確認
  - _Requirements: 5.3_

- [x] 9.2 既存テストの通過を確認する
  - ユニットテストが全て通過することを確認
  - 既存の動作に影響がないことを確認
  - _Requirements: 5.2_

- [x] 9.3 各ドメインハンドラーのユニットテストを追加する
  - configHandlers.test.ts: 設定読み書きのモック検証
  - installHandlers.test.ts: インストール処理のモック検証
  - fileHandlers.test.ts: ファイル操作のモック検証
  - projectHandlers.test.ts: プロジェクト選択・検証のモック検証
  - specHandlers.test.ts: Spec操作のモック検証
  - bugHandlers.test.ts: Bug操作のモック検証
  - agentHandlers.test.ts: Agent操作のモック検証
  - _Requirements: 2.3, 4.3_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | Config関連ハンドラー分離 | 1.1 | Feature |
| 1.2 | Install関連ハンドラー分離 | 2.1 | Feature |
| 1.3 | File関連ハンドラー分離 | 3.1 | Feature |
| 1.4 | Project関連ハンドラー分離 | 4.1 | Feature |
| 1.5 | Spec関連ハンドラー分離 | 5.1 | Feature |
| 1.6 | Bug関連ハンドラー分離 | 6.1 | Feature |
| 1.7 | Agent関連ハンドラー分離 | 7.1 | Feature |
| 2.1 | register*Handlers形式での依存注入 | 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1 | Feature |
| 2.2 | サービス引数受け取り | 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1 | Feature |
| 2.3 | モックサービス注入可能 | 9.3 | Feature |
| 3.1 | handlers.tsのオーケストレーター化 | 8.1 | Feature |
| 3.2 | registerIpcHandlers内での全ハンドラー登録 | 1.2, 2.2, 3.2, 4.2, 5.2, 6.2, 7.2 | Feature |
| 3.3 | 新ドメインハンドラー統合容易性 | 8.1 | Feature |
| 4.1 | 既存ファイル命名規則準拠 | 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1 | Feature |
| 4.2 | register関数シグネチャ統一 | 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1 | Feature |
| 4.3 | テストファイル命名規則 | 9.3 | Feature |
| 5.1 | 段階的移行順序 | 1.1→2.1→3.1→4.1→5.1→6.1→7.1 | Feature |
| 5.2 | 既存テスト通過確認 | 1.2, 2.2, 3.2, 4.2, 5.2, 6.2, 7.2, 9.2 | Feature |
| 5.3 | ビルド・型チェック成功 | 1.2, 2.2, 3.2, 4.2, 5.2, 6.2, 7.2, 9.1 | Feature |
| 6.1 | 公開関数のre-export維持 | 4.2, 8.2 | Feature |
| 6.2 | 関数移動時のre-export | 4.1, 4.2, 8.2 | Feature |
