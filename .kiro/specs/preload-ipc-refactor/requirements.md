# Requirements: handlers.ts ドメイン分割リファクタリング

## Decision Log

### ファイル分割の優先順位
- **Discussion**: `handlers.ts`（3,300行超）と`index.test.ts`（998行）のどちらを先に対応するか
- **Conclusion**: `handlers.ts`のリファクタリングを優先
- **Rationale**: `handlers.ts`はシステムの中枢であり、3,300行超と巨大。`index.test.ts`は約1,000行と管理可能なサイズに収まっている

### ディレクトリ構造
- **Discussion**: `ipc/domain/*Handlers.ts`（サブディレクトリ）vs `ipc/*Handlers.ts`（フラット）
- **Conclusion**: 既存パターン踏襲（`ipc/*Handlers.ts`フラット構造）
- **Rationale**: 既に`sshHandlers.ts`, `mcpHandlers.ts`等が`ipc/`直下に存在。一貫性を保ちファイル移動リスクを最小化

### handlers.ts の最終形態
- **Discussion**: 分割後の`handlers.ts`の役割
- **Conclusion**: オーケストレーターとして各ドメインの`register*Handlers()`を呼び出す
- **Rationale**: サービスのDIとregister関数の呼び出し順序制御に専念。`main.ts`を汚さない

### 依存注入パターン
- **Discussion**: サービス参照を各ファイルで直接importするか、register時に引数で渡すか
- **Conclusion**: register関数の引数でサービスを渡す形に統一
- **Rationale**: テスタビリティ向上と結合度低減。既存の`scheduleTaskHandlers`がこのパターンを採用

### 移行戦略
- **Discussion**: Big Bang（一度に全分割）vs Incremental（段階的）
- **Conclusion**: Incremental（段階的移行）
- **Rationale**: デグレリスクの最小化。小さいドメインから着手し、動作確認しながら進める

### テストファイル配置
- **Discussion**: テストファイルの配置場所
- **Conclusion**: Co-location（`*Handlers.test.ts`を同ディレクトリに配置）
- **Rationale**: 既存ファイル群と同じ構成を維持

### Remote UIへの影響
- **Discussion**: `handlers.ts`分割がWebSocket経由のRemote UIに影響するか
- **Conclusion**: Service自体のロジックを変更しない限り影響なし
- **Rationale**: ハンドラー分割は「IPCの口（インターフェース）」の整理であり、Serviceは共有される

## Introduction

`handlers.ts`（3,300行超）を機能ドメインごとに分割し、保守性・可読性・テスタビリティを向上させるリファクタリング。既存の`*Handlers.ts`パターン（`sshHandlers.ts`, `mcpHandlers.ts`等）を踏襲し、`handlers.ts`は各ドメインハンドラーのオーケストレーターとして再構成する。

## Requirements

### Requirement 1: ドメインハンドラーファイルの作成

**Objective:** As a 開発者, I want handlers.tsの機能をドメイン別ファイルに分割したい, so that コードの可読性と保守性が向上する

#### Acceptance Criteria

1. When handlers.ts から Config/設定 関連のハンドラーを分離する, the system shall `configHandlers.ts` を作成し、以下のチャンネルを移行する:
   - `GET_HANG_THRESHOLD`
   - `SET_HANG_THRESHOLD`
   - `LOAD_LAYOUT_CONFIG`
   - `SAVE_LAYOUT_CONFIG`
   - `RESET_LAYOUT_CONFIG`
   - `LOAD_SKIP_PERMISSIONS`
   - `SAVE_SKIP_PERMISSIONS`
   - `LOAD_PROJECT_DEFAULTS`
   - `SAVE_PROJECT_DEFAULTS`
   - `LOAD_PROFILE`

2. When handlers.ts から Install 関連のハンドラーを分離する, the system shall `installHandlers.ts` を作成し、以下のチャンネルを移行する:
   - `CHECK_SPEC_MANAGER_FILES`
   - `INSTALL_SPEC_MANAGER_COMMANDS`
   - `INSTALL_SPEC_MANAGER_SETTINGS`
   - `INSTALL_SPEC_MANAGER_ALL`
   - `FORCE_REINSTALL_SPEC_MANAGER_ALL`
   - `CHECK_CLAUDE_MD_EXISTS`
   - `INSTALL_CLAUDE_MD`
   - `CHECK_CC_SDD_WORKFLOW_STATUS`
   - `INSTALL_CC_SDD_WORKFLOW`
   - `CHECK_COMMANDSET_STATUS`
   - `INSTALL_COMMANDSET_BY_PROFILE`
   - `CHECK_AGENT_FOLDER_EXISTS`
   - `DELETE_AGENT_FOLDER`
   - `INSTALL_EXPERIMENTAL_DEBUG`
   - `CHECK_EXPERIMENTAL_TOOL_EXISTS`
   - `INSTALL_EXPERIMENTAL_GEMINI_DOC_REVIEW`
   - `CHECK_EXPERIMENTAL_GEMINI_DOC_REVIEW_EXISTS`
   - `GET_CLI_INSTALL_STATUS`
   - `INSTALL_CLI_COMMAND`
   - `CHECK_COMMANDSET_VERSIONS`
   - `CONFIRM_COMMON_COMMANDS`

3. When handlers.ts から File 関連のハンドラーを分離する, the system shall `fileHandlers.ts` を作成し、以下のチャンネルを移行する:
   - `SHOW_OPEN_DIALOG`
   - `READ_ARTIFACT`
   - `WRITE_ARTIFACT`
   - `WRITE_FILE`
   - `OPEN_IN_VSCODE`

4. When handlers.ts から Project 関連のハンドラーを分離する, the system shall `projectHandlers.ts` を作成し、以下のチャンネルを移行する:
   - `VALIDATE_KIRO_DIRECTORY`
   - `SET_PROJECT_PATH`
   - `SELECT_PROJECT`
   - `GET_RECENT_PROJECTS`
   - `ADD_RECENT_PROJECT`
   - `GET_APP_VERSION`
   - `GET_PLATFORM`
   - `GET_INITIAL_PROJECT_PATH`
   - `CREATE_NEW_WINDOW`
   - `GET_WINDOW_PROJECT`
   - `SET_WINDOW_PROJECT`
   - `GET_IS_E2E_TEST`
   - `SET_MOCK_ENV`
   - `GET_PROJECT_LOG_PATH`
   - `OPEN_LOG_IN_BROWSER`
   - `ADD_SHELL_PERMISSIONS`
   - `ADD_MISSING_PERMISSIONS`
   - `CHECK_REQUIRED_PERMISSIONS`

5. When handlers.ts から Spec 関連のハンドラーを分離する, the system shall `specHandlers.ts` を作成し、以下のチャンネルを移行する:
   - `READ_SPECS`
   - `READ_SPEC_JSON`
   - `CREATE_SPEC`
   - `UPDATE_APPROVAL`
   - `UPDATE_SPEC_JSON`
   - `SYNC_SPEC_PHASE`
   - `START_SPECS_WATCHER`
   - `STOP_SPECS_WATCHER`
   - `EXECUTE_SPEC_INIT`
   - `EXECUTE_SPEC_PLAN`
   - `EXECUTE`
   - `EXECUTE_DOCUMENT_REVIEW`
   - `EXECUTE_DOCUMENT_REVIEW_REPLY`
   - `EXECUTE_DOCUMENT_REVIEW_FIX`
   - `APPROVE_DOCUMENT_REVIEW`
   - `SKIP_DOCUMENT_REVIEW`
   - `EXECUTE_INSPECTION`
   - `EXECUTE_INSPECTION_FIX`
   - `SET_INSPECTION_AUTO_EXECUTION_FLAG`
   - `EXECUTE_ASK_PROJECT`
   - `EXECUTE_ASK_SPEC`
   - `EXECUTE_SPEC_MERGE`
   - `WORKTREE_IMPL_START`
   - `NORMAL_MODE_IMPL_START`
   - `START_IMPL`
   - `SYNC_DOCUMENT_REVIEW`
   - `EVENT_LOG_GET`
   - `PARSE_TASKS_FOR_PARALLEL`

6. When handlers.ts から Bug 関連のハンドラーを分離する, the system shall `bugHandlers.ts` を作成し、以下のチャンネルを移行する:
   - `READ_BUGS`
   - `READ_BUG_DETAIL`
   - `START_BUGS_WATCHER`
   - `STOP_BUGS_WATCHER`
   - `EXECUTE_BUG_CREATE`
   - `BUG_PHASE_UPDATE`

7. When handlers.ts から Agent 関連のハンドラーを分離する, the system shall `agentHandlers.ts` を作成し、以下のチャンネルを移行する:
   - `START_AGENT`
   - `STOP_AGENT`
   - `RESUME_AGENT`
   - `DELETE_AGENT`
   - `GET_AGENTS`
   - `GET_ALL_AGENTS`
   - `SEND_AGENT_INPUT`
   - `GET_AGENT_LOGS`
   - `SWITCH_AGENT_WATCH_SCOPE`
   - `GET_RUNNING_AGENT_COUNTS`

### Requirement 2: 依存注入パターンの統一

**Objective:** As a 開発者, I want 各ハンドラーファイルがサービスを引数で受け取るようにしたい, so that テスタビリティと結合度が改善される

#### Acceptance Criteria

1. When 新しいドメインハンドラーファイルを作成する, the system shall `register*Handlers(dependencies)` の形式で依存サービスを引数で受け取る関数をexportする
2. If ハンドラーがサービス（fileService, bugService等）を必要とする, then the system shall そのサービスをregister関数の引数として受け取る
3. When テストを書く, the system shall モックサービスを注入可能にする

### Requirement 3: handlers.ts のオーケストレーター化

**Objective:** As a 開発者, I want handlers.tsを各ドメインハンドラーの呼び出し元として再構成したい, so that エントリーポイントが明確になる

#### Acceptance Criteria

1. When 分割が完了した, the system shall `handlers.ts` は以下のみを担当する:
   - サービスインスタンスの生成（DI）
   - 各 `register*Handlers()` 関数の呼び出し
   - グローバル状態の管理（`currentProjectPath` 等）
2. The system shall `registerIpcHandlers()` 関数内で全てのドメインハンドラーを登録する
3. When 新しいドメインハンドラーを追加する, the system shall `handlers.ts` でimportし、registerIpcHandlers内で呼び出すだけで統合できる

### Requirement 4: 既存パターンとの整合性

**Objective:** As a 開発者, I want 既存の分割済みハンドラーと同じパターンで実装したい, so that コードベースの一貫性が保たれる

#### Acceptance Criteria

1. The system shall 既存の `mcpHandlers.ts`, `scheduleTaskHandlers.ts` 等と同じファイル命名規則を使用する
2. The system shall `register*Handlers` 関数のシグネチャを既存パターンに合わせる
3. When テストファイルを作成する, the system shall `*Handlers.test.ts` の命名規則に従う

### Requirement 5: 段階的移行とテスト

**Objective:** As a 開発者, I want 段階的に移行しながらテストで動作確認したい, so that デグレを防止できる

#### Acceptance Criteria

1. When 各ドメインを切り出す, the system shall 以下の順序で移行する:
   1. configHandlers（依存少、最初の候補）
   2. installHandlers（独立性高い）
   3. fileHandlers（基盤的機能）
   4. projectHandlers（プロジェクト管理）
   5. specHandlers（中核機能）
   6. bugHandlers（中核機能）
   7. agentHandlers（中核機能）
2. When 各ドメインを移行する, the system shall 既存テストが通過することを確認する
3. When 移行が完了する, the system shall `npm run build && npm run typecheck` が成功する

### Requirement 6: 公開関数の維持

**Objective:** As a 開発者, I want 外部から参照される関数を維持したい, so that 既存の呼び出し元に影響しない

#### Acceptance Criteria

1. The system shall 以下の公開関数を `handlers.ts` または適切なファイルからre-exportする:
   - `getCurrentProjectPath()`
   - `getAutoExecutionCoordinator()`
   - `selectProject()`
   - `setProjectPath()`
   - `setInitialProjectPath()`
   - `getInitialProjectPath()`
   - `getBugAgentEffectiveCwd()`
   - `isProjectSelectionInProgress()`
   - `validateProjectPath()`
2. If 関数を別ファイルに移動する, then the system shall `handlers.ts` からre-exportして後方互換性を維持する

## Out of Scope

- `index.test.ts` のテスト分割（`handlers.ts`リファクタリング後に別Specで対応）
- `channels.ts` のドメイン別分割（現状のグループ化コメントで十分）
- Remote UI側（`webSocketHandler.ts`）の変更（Serviceレイヤーは変更しないため影響なし）
- 新機能の追加（純粋なリファクタリングのみ）

## Open Questions

- `specHandlers.ts` と `bugHandlers.ts` のファイルサイズが大きくなる可能性がある。必要に応じてさらなる分割（例: `specExecutionHandlers.ts`）を検討するか？
- `handlers.ts` 内のヘルパー関数（`getErrorMessage` 等）は共通ユーティリティとして別ファイルに切り出すべきか？
