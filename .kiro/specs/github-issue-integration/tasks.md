# Implementation Plan

## Task 1. 型定義・インターフェース基盤
- [x] 1.1 (P) GitHub関連の共有型定義を作成する
  - GitHubIssue, GitHubLabel, GitHubUser, GitHubMilestone, GitHubComment, GitHubPullRequest, CIStatus等のドメイン型を定義
  - StatusLabel型（"triage" | "in-progress" | "in-review" | "changes-requested" | "done"）を定義
  - GitHubRepoInfo, GitHubApiError, IssueFilters, PRFilters, ConnectionStatus等のサービス型を定義
  - MergeMethod, CreateIssueInput, CreatePRInput等の入出力型を定義
  - _Requirements: 4.1_

## Task 2. GitHubCredentialService実装
- [x] 2.1 (P) PATの暗号化保存・取得サービスを実装する
  - Electron `safeStorage` APIを使用してPATを暗号化・復号する機能を実装
  - プロジェクトパスをキーとしたトークンのCRUD（store / get / remove / hasCredentials）を実装
  - GitHub Enterprise URLの保存・取得を実装
  - `electron-store` に暗号化済みトークンを永続化する
  - `safeStorage.isEncryptionAvailable()` の事前チェックを実装
  - _Requirements: 1.1, 1.2_
  - _Method: safeStorage.encryptString, safeStorage.decryptString, electron-store_
  - _Verify: Grep "safeStorage" in gitHubCredentialService_

- [x] 2.2 (P) GitHubCredentialServiceのユニットテストを作成する
  - safeStorage APIのモックを使用した暗号化・復号テスト
  - プロジェクト単位のトークン分離テスト
  - Enterprise URL保存・取得テスト
  - _Requirements: 1.2_

## Task 3. GitHubApiService実装
- [x] 3.1 GitHub REST API通信サービスを実装する（Task 2.1に依存）
  - Node.js `fetch` を使用したGitHub REST API v3通信を一元管理
  - GitHubCredentialServiceからPATを取得して認証ヘッダーを設定
  - GitHub Enterprise対応（カスタムbaseURL: `api.github.com` → `{enterprise-url}/api/v3`）
  - `git remote get-url origin` パースによるowner/repo自動検出
  - `X-RateLimit-Remaining` ヘッダー監視とレート制限エラーハンドリング
  - Result型によるエラー返却（AUTH_FAILED, NOT_FOUND, RATE_LIMIT, NETWORK_ERROR, REPO_DETECT_FAILED, VALIDATION_ERROR）
  - _Requirements: 1.3, 1.4_
  - _Method: fetch, GitHubCredentialService.getToken, git remote get-url_
  - _Verify: Grep "fetch|GitHubCredentialService" in gitHubApiService_

- [x] 3.2 Issue CRUD操作を実装する
  - Issue一覧取得（state, labels, assignee, milestoneフィルタ対応）
  - Issue詳細取得、コメント一覧取得
  - Issue作成（タイトル、本文、Label、assignee）
  - コメント投稿
  - _Requirements: 3.2, 3.3, 3.4_

- [x] 3.3 Label管理操作を実装する
  - `status:*` Labelの追加・削除（旧Label削除 + 新Label付与のアトミック更新）
  - `ensureStatusLabels`: 初回接続時にリポジトリのLabel一覧を確認し、不足分の `status:*` Labelを自動作成
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 3.4 Pull Request操作を実装する
  - PR一覧取得（state, head, baseフィルタ対応）
  - PR詳細取得
  - PR作成（`Closes #{number}` 自動挿入）
  - PRマージ（merge, squash, rebase方式選択）
  - CIステータス取得（`GET /repos/owner/repo/commits/{sha}/status`）
  - PRファイル一覧取得（`getPRFiles`: `GET /repos/{owner}/{repo}/pulls/{number}/files`）
  - _Requirements: 8.1, 8.3, 8.4, 8.5_

- [x] 3.5 接続テスト機能を実装する
  - `GET /user` による認証確認
  - 成功時はGitHubUser情報を返却、失敗時は明確なエラー情報を返却
  - _Requirements: 1.5, 1.6_

- [x] 3.6 GitHubApiServiceのユニットテストを作成する
  - fetch モックを使用したAPI通信テスト
  - owner/repo自動検出テスト
  - エラーハンドリングテスト（認証失敗、レート制限、ネットワークエラー）
  - Label自動作成テスト
  - _Requirements: 1.3, 1.4, 1.5_

## Task 4. issueRouter tRPC実装
- [x] 4.1 Issue関連tRPCプロシージャを実装する（Task 3に依存）
  - Query: listIssues, getIssue, getIssueComments, testConnection, getConnectionStatus, detectRepoInfo
  - Mutation: createIssue（status:triage Label自動付与）, addIssueComment, updateStatusLabel
  - 全プロシージャにZodスキーマによる入出力バリデーションを定義
  - EventBus経由のリアルタイム通知（issueListUpdated, issueDetailUpdated, githubConnectionChanged）
  - _Requirements: 2.2, 2.4, 2.6, 3.2, 3.3, 4.2_

- [x] 4.2 PR関連tRPCプロシージャを実装する
  - Query: listPullRequests, getPullRequest, getPRCIStatus, getPRFiles
  - Mutation: createPullRequest（`Closes #{number}` 含む）, mergePullRequest（マージ方式選択）
  - EventBus経由のリアルタイム通知（prListUpdated）
  - マージ成功時にLabelを `status:done` に自動更新
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 4.3 認証・設定関連tRPCプロシージャを実装する
  - Mutation: setGitHubToken, removeGitHubToken, setEnterpriseUrl
  - トークン保存時にGitHubCredentialService経由で暗号化保存
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 4.4 実装モード開始プロシージャを実装する
  - Mutation: startImplementation（mode: "worktree" | "direct"）
  - Worktreeモード: `issue/{number}-{slug}` 形式のブランチを自動作成（既存worktreeService活用）
  - ダイレクトモード: カレントブランチ上でLabel更新のみ
  - 実装開始時にLabelを `status:in-progress` に自動更新
  - _Requirements: 5.1, 5.2, 5.4_

- [x] 4.5 issueRouterのユニットテストを作成する
  - `createTestContext` を使用したtRPCプロシージャテスト
  - GitHubApiServiceモックを使用
  - Issue作成 → Label自動付与フロー検証
  - PR作成 → マージ → Label更新フロー検証
  - _Requirements: 2.2, 3.2, 8.1_

## Task 5. scripts/gh-issue.sh 実装
- [x] 5.1 (P) GitHub API操作スクリプトを作成する
  - `gh` CLIを使用したサブコマンド形式のスクリプトを実装
  - `read <number>`: Issue本文+コメントをMarkdown形式で出力
  - `comment <number> <body>`: コメント投稿
  - `label <number> <action> <label>`: Label追加/削除
  - `list [--state open|closed] [--label ...]`: Issue一覧取得
  - `create <title> <body>`: Issue作成
  - `GITHUB_TOKEN` 環境変数優先、未設定時は `gh auth status` でフォールバック
  - GitHub Enterprise対応（`GH_HOST` 環境変数）
  - `git remote get-url origin` によるowner/repo自動検出
  - `gh` CLI未インストール時の明確なエラーメッセージ
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - _Method: gh api, gh issue, git remote get-url_
  - _Verify: Grep "gh api\|gh issue\|git remote" in gh-issue.sh_

## Task 6. issueStore（shared）実装
- [x] 6.1 Issue/PR状態管理のZustand storeを実装する（Task 4に依存）
  - Issue一覧・PR一覧のクライアントサイドキャッシュ
  - 選択中Issue/PR状態の管理
  - フィルタ状態の管理（state, labels, assignee, milestone）
  - vanillaClient経由でissueRouterを呼び出すアクション（loadIssues, loadMoreIssues, loadPullRequests, selectIssue, selectPR, refresh, checkConnection, reset）
  - ページネーション状態管理（hasMore, currentPage）: `loadIssues` で1ページ目を取得、`loadMoreIssues` で次ページを追加読み込み、取得件数 < per_page の場合 hasMore=false
  - ポーリング制御（60秒間隔、手動リフレッシュ対応、競合時は最新結果優先）
  - tRPC Subscription経由のリアルタイム更新通知受信
  - _Requirements: 2.2, 2.3, 2.5, 2.6, 9.1_

- [x] 6.2 issueStoreのユニットテストを作成する
  - フィルタ状態管理テスト
  - 選択状態管理テスト
  - ポーリング制御テスト（タイマーモック使用）
  - _Requirements: 2.2, 2.6_

## Task 7. Issue UIコンポーネント実装
- [x] 7.1 IssuePaneを実装する（Task 6に依存）
  - IssueListPanel + IssueDetailView + PRListView + PRDetailViewを統合するコンテナコンポーネント
  - Issue/PRのサブタブ切り替え機能
  - 既存BugPaneと同等の構造に準拠
  - _Requirements: 2.1_

- [x] 7.2 IssueListPanelとIssueListItemを実装する
  - Issue一覧のリスト表示
  - `status:` プレフィックス付きLabelの色分けバッジ表示（StatusLabelBadge）
  - Label、assignee、milestone等によるフィルタUI
  - 手動リフレッシュボタン
  - 「もっと読み込む」ボタンによるページネーション（per_page: 30、次ページ読み込み）
  - _Requirements: 2.2, 2.3, 2.5, 2.6_

- [x] 7.3 IssueDetailViewを実装する
  - Issue本文（Markdown表示）、コメント一覧、Label、assignee等の詳細表示
  - `status:` Label表示
  - 実装モード選択UI（Worktreeモード / ダイレクトモード）
  - PR作成ボタン（Worktreeモード時）
  - _Requirements: 2.4, 2.5, 5.3_

- [x] 7.4 CreateIssueDialogを実装する（Electron版）
  - タイトル、本文、Label、assigneeの入力フォーム
  - Spec作成と同様のモーダルダイアログ形式
  - 作成成功時に `status:triage` Labelが自動付与されることの表示
  - _Requirements: 3.1, 3.4_

## Task 8. PR UIコンポーネント実装
- [x] 8.1 PRListViewを実装する（Task 6に依存）
  - PR一覧のリスト表示（IssueListPanel内のサブタブとして表示）
  - state（open/closed/merged）、head、baseフィルタ
  - _Requirements: 8.2_

- [x] 8.2 PRDetailViewを実装する
  - `getPRFiles` Query呼び出しによるファイル変更リスト + patchベースdiff表示
  - CIステータス表示
  - マージ操作UI（merge, squash, rebase方式選択）
  - マージ成功時にIssueのLabelが `status:done` に更新されることの表示
  - _Requirements: 8.3, 8.4, 8.5_

## Task 9. GitHubSettingsSection実装
- [x] 9.1 ProjectPaneにGitHub連携設定セクションを追加する（Task 4.3に依存）
  - PAT入力フィールド（マスク表示）
  - GitHub Enterprise URL入力フィールド
  - git remoteからのowner/repo自動検出結果の表示
  - 接続テストボタンと結果表示（成功: ユーザー名表示、失敗: エラーメッセージ）
  - 接続ステータス表示（未設定 / 接続済み / エラー）
  - _Requirements: 1.1, 1.3, 1.5, 1.6, 12.1, 12.2, 12.3, 12.4_

## Task 10. Slash Commands実装
- [x] 10.1 (P) issue-analyzeコマンドテンプレートを作成する（Task 5.1と並行可能）
  - `gh-issue.sh read` でIssue本文+コメントを取得しコンテキストとして注入
  - 原因分析を実行するプロンプト構成
  - 完了時に実行結果サマリーをIssueコメントとして `gh-issue.sh comment` で自動投稿
  - 完了時にLabelを `status:in-progress` に `gh-issue.sh label` で自動更新
  - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - _Method: gh-issue.sh read, gh-issue.sh comment, gh-issue.sh label_
  - _Verify: Grep "gh-issue.sh" in issue-analyze.md_

- [x] 10.2 (P) issue-fixコマンドテンプレートを作成する
  - `gh-issue.sh read` でIssueコンテキストを取得
  - 分析結果に基づく修正を実行するプロンプト構成
  - 完了時に実行結果サマリーをIssueコメントとして投稿
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 10.3 (P) issue-verifyコマンドテンプレートを作成する
  - `gh-issue.sh read` でIssueコンテキストを取得
  - 修正の検証を実行するプロンプト構成
  - 完了時に検証結果をIssueコメントとして投稿
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 10.4 (P) issue-askコマンドテンプレートを作成する
  - `gh-issue.sh read` でIssueコンテキストを取得
  - 任意プロンプトをIssueコンテキスト付きで実行
  - 完了時に結果をIssueコメントとして投稿
  - _Requirements: 6.1, 6.2, 6.3_

## Task 11. Agent連携拡張
- [x] 11.1 Agent実行時のIssueコンテキスト自動注入を実装する（Task 6に依存）
  - issueStoreから選択中Issueの本文+コメントをAgentのコンテキストに自動注入
  - 既存のagentProcessを拡張し、Issueコンテキスト注入ロジックを追加
  - _Requirements: 9.1, 9.3_

- [x] 11.2 Agent実行完了時のIssueコメント自動投稿を実装する
  - Agent実行完了時に実行サマリーをGitHub Issueコメントとして自動投稿
  - GitHubApiService.addIssueCommentを呼び出し
  - Agent実行中はIssueのLabelを `status:in-progress` に維持
  - _Requirements: 9.2, 9.4_

## Task 12. Remote UI対応
- [x] 12.1 WebSocketハンドラにIssue/PR関連メッセージタイプを追加する（Task 4に依存）
  - `GET_ISSUES`, `GET_ISSUE_DETAIL`, `GET_PULL_REQUESTS`, `CREATE_ISSUE`, `GET_GITHUB_CONNECTION_STATUS` メッセージタイプ追加
  - 既存webSocketHandler.tsのパターンに従い実装
  - WebSocketApiClientにIssue/PR APIメソッドを追加
  - _Requirements: 11.5_
  - _Method: webSocketHandler, WebSocketApiClient_
  - _Verify: Grep "GET_ISSUES\|GET_ISSUE_DETAIL\|GET_PULL_REQUESTS" in webSocketHandler.ts_

- [x] 12.2 Remote UI DesktopLayoutにIssuesタブを追加する（Task 7に依存）
  - BugsView → IssuesView に置換
  - shared componentsのIssueListPanel, IssueDetailViewを使用
  - Electron版と同等のレイアウト構成に準拠
  - `remote-ui/App.tsx`: Bug関連import削除、Issue関連import追加（Design Wiring Points準拠）
  - _Requirements: 11.1, 11.2, 11.4_

- [x] 12.3 Remote UI用Issue作成ダイアログを実装する
  - CreateIssueDialogRemote: WebSocketApiClient経由でIssue作成APIを呼び出し
  - Electron版CreateIssueDialogと同等のUI
  - _Requirements: 11.3_

## Task 13. 既存Bugワークフロー廃止
- [x] 13.1 RendererコンポーネントとRenderer型定義を削除する
  - `BugPane.tsx`, `BugActionButtons.tsx`, `BugWorkflowView.tsx`, `CreateBugDialog.tsx` および関連テストを物理削除
  - `renderer/types/bug.ts`, `renderer/types/bugJson.ts` を物理削除
  - _Requirements: 10.1, 10.10_

- [x] 13.2 SharedコンポーネントとShared Storeを削除する
  - `shared/components/bug/BugListContainer.tsx`, `shared/components/bug/BugListItem.tsx` および関連テストを物理削除
  - `shared/stores/bugStore.ts`, `shared/stores/bugAutoExecutionStore.ts` および関連テストを物理削除
  - _Requirements: 10.1, 10.2_

- [x] 13.3 tRPCルーターとMainサービスを削除する
  - `main/trpc/routers/bug.ts` および関連テストを物理削除
  - `main/services/bugService.ts`, `main/services/bugWorkflowService.ts`, `main/services/bugsWatcherService.ts`, `main/services/convertBugWorktreeService.ts`, `main/services/bugWorkflowInstaller.ts` および関連テストを物理削除
  - _Requirements: 10.3, 10.4_

- [x] 13.4 CLIコマンドとテンプレートを削除する
  - `resources/templates/commands/bug/bug-create.md`, `bug-analyze.md`, `bug-fix.md`, `bug-verify.md`, `bug-status.md`, `bug-merge.md` を物理削除
  - `resources/templates/settings/templates/bugs/` ディレクトリを物理削除
  - _Requirements: 10.5, 10.6_

- [x] 13.5 スクリプトを削除する
  - `resources/templates/scripts/create-bug-worktree.sh`, `resources/templates/scripts/merge-bug.sh` を物理削除
  - _Requirements: 10.7_

- [x] 13.6 Remote UI Bug関連ファイルを削除する
  - `BugsView.verify-sharing.test.tsx`, `BugDetailView.test.tsx`, `BugDetailPage.test.tsx`, `CreateBugDialogRemote.tsx` を物理削除
  - _Requirements: 10.1_

## Task 14. 結合・配線
- [x] 14.1 tRPCルーターとContextの配線を更新する（Task 4, 13.3に依存）
  - `router.ts`: `bugRouter` を `issueRouter` に置換
  - `context.ts`: `bugService` 削除、`gitHubApiService` / `gitHubCredentialService` を追加
  - `productionServices.ts`: Bug関連サービス初期化削除、GitHub関連サービス初期化追加
  - `helpers/test-helpers.ts`: `createMockServices` にGitHub関連モック追加
  - _Requirements: 10.3_
  - _Method: appRouter, ContextServices_
  - _Verify: Grep "issueRouter\|gitHubApiService\|gitHubCredentialService" in router.ts context.ts productionServices.ts_

- [x] 14.2 Rendererの配線を更新する（Task 7, 13.1に依存）
  - `App.tsx`: `BugPane` → `IssuePane` 置換、BugStore初期化削除
  - `renderer/stores/index.ts`: `useSharedBugStore` 削除、`useIssueStore` 追加
  - `renderer/stores/projectStore.ts`: bugs関連state削除
  - `renderer/stores/agentStore.ts`: `bug:{bugId}` パターン → `issue:{issueNumber}` パターンに置換
  - `renderer/components/index.ts`: Bug関連export削除、Issue関連export追加
  - `DocsTabs.tsx`: `DocsTab` 型から `'bugs'` 削除、`'issues'` 追加、Bugsタブ → Issuesタブ置換
  - `remote-ui/layouts/MobileLayout.tsx`: `MobileTab` 型から `'bugs'` 削除、`'issues'` 追加、TAB_CONFIG更新
  - _Requirements: 2.1, 10.1, 10.2_

- [x] 14.3 Shared層の配線を更新する
  - `shared/stores/index.ts`: bugStore / bugAutoExecutionStore export削除、issueStore export追加
  - `shared/api/types.ts`: BugMetadataWithPath等削除、Issue関連型追加
  - `shared/stores/agentStore.ts`: `bug:{bugId}` → `issue:{issueNumber}` パターン置換
  - _Requirements: 10.2, 10.10_

- [x] 14.4 Main Processの配線を更新する（Task 13.3に依存）
  - `helpers/projectSetup.ts`: Bug初期化ロジック削除
  - `helpers/watcherUtils.ts`: bugsWatcher関連削除
  - `routers/events.ts`: Bug関連Subscription削除、Issue関連Subscription追加
  - `routers/autoExecution.ts`: BugAutoExecution関連プロシージャ削除
  - `services/windowManager.ts`: bugStore参照削除
  - `services/remoteAccessSetup.ts`: bugsWatcher初期化削除
  - `services/webSocketHandler.ts`: Bug関連メッセージハンドラ削除（GET_BUGS, CREATE_BUG, GET_BUG_DETAIL, GET_BUG_AUTO_EXECUTION_STATUS, START_BUG_AUTO_EXECUTION, STOP_BUG_AUTO_EXECUTION）
  - _Requirements: 10.3, 10.4_

- [x] 14.5 設定ファイルとドキュメントテンプレートを更新する
  - `.kiro/sdd-orchestrator.json`: `commandsets.bug` エントリ削除
  - CLAUDE.mdテンプレート: Bug Fix Workflowセクション → Issue Workflowに置換、`/kiro:bug-*` → `/kiro:issue-*` コマンド説明に置換
  - _Requirements: 10.8, 10.9_

- [x] 14.7 Steeringドキュメントを更新する（Task 14.3と同時期に実行推奨）
  - `product.md`: Core Capability #4 "バグ修正ワークフロー" → "Issue連携ワークフロー"、Target Use Cases・ワークフローパターン更新
  - `structure.md`: `shared/components/bug/` → `issue/`、`bugStore` / `bugAutoExecutionStore` → `issueStore`、Agent Category `bug:{bugId}` → `issue:{issueNumber}`
  - `tech.md`: tRPCルーター一覧 `bug` → `issue`
  - **Note**: Task 14.3（Shared層配線更新）でagentStoreのパターン変更が行われるため、structure.mdの同時更新が望ましい
  - _Requirements: (steering maintenance)_

- [x] 14.6 旧 `/kiro:bug-*` コマンド群を廃止する
  - `bug-create`, `bug-analyze`, `bug-fix`, `bug-verify`, `bug-status`, `bug-merge` コマンドファイルが削除されていることを確認
  - 新 `/kiro:issue-*` コマンドがコマンドセットに登録されていることを確認
  - _Requirements: 6.5_

## Task 15. テスト
- [x] 15.1 Integration test: Issue CRUDフローを検証する（Task 14に依存）
  - issueRouter経由のIssue作成 → Label自動付与 → ステータス更新の一連フローを検証
  - GitHubApiServiceのHTTPレイヤーをモック、tRPC Contextは `createTestContext` を使用
  - EventBus経由のStore状態更新を `waitFor` パターンで検証
  - _Requirements: 2.2, 3.2, 3.3, 4.2_
  - _Integration Point: Design.md "Issue CRUD Flow"_

- [x] 15.2 Integration test: PR作成・マージフローを検証する
  - PR作成（`Closes #{number}` 含む） → マージ → Issue Label `status:done` 更新の一連フローを検証
  - _Requirements: 8.1, 8.4, 8.5_
  - _Integration Point: Design.md "PR Creation and Merge Flow"_

- [x] 15.3 Integration test: Credential保存・接続テストフローを検証する
  - PAT入力 → safeStorage暗号化保存 → 復号 → 接続テスト の一連フローを検証
  - safeStorage APIモック使用
  - _Requirements: 1.2, 1.6_
  - _Integration Point: Design.md "Credential Flow"_

- [x] 15.4 Integration test: Agent+Issueコンテキスト注入を検証する
  - Agent実行時にissueStoreから選択中Issueのコンテキストが注入されることを検証
  - Agent完了時にIssueコメントが投稿されることを検証
  - agentProcess拡張のモックを使用
  - _Requirements: 9.1, 9.2_
  - _Integration Point: Design "Agent + Issue Context"_

- [x] 15.5 Integration test: WebSocketハンドラ経由のIssue操作を検証する（Task 12.1に依存）
  - WebSocketハンドラ（GET_ISSUES, GET_ISSUE_DETAIL, CREATE_ISSUE等）が正しくGitHubApiServiceに委譲されることを検証
  - WebSocketApiClientからのリクエスト → webSocketHandler → GitHubApiService（モック）のフローを検証
  - エラーレスポンスの伝播を検証
  - _Requirements: 11.5_
  - _Integration Point: Remote UI WebSocket経路_

- [x]* 15.6 E2Eテスト: Issue一覧表示・フィルタ操作を検証する
  - GitHubApiServiceモック環境でのIssue一覧表示を検証
  - フィルタ操作（Label, assignee）の動作を検証
  - _Requirements: 2.2, 2.3_

- [x]* 15.7 E2Eテスト: GitHub設定画面のPAT入力・接続テストを検証する
  - ProjectPane内のGitHub設定セクションの動作を検証
  - PAT入力、接続テストボタンの動作を検証
  - _Requirements: 1.1, 1.6, 12.1, 12.2_

- [x]* 15.8 E2Eテスト: DocsTabsのIssuesタブ切り替えを検証する
  - BugsタブがIssuesタブに置換されていることを検証
  - タブ切り替え時にIssuePaneが表示されることを検証
  - _Requirements: 2.1_

---

## Inspection Fixes

### Round 1 (2026-03-06)

- [x] 16.1 Fix: productionServices.tsにGitHubApiServiceとGitHubCredentialServiceの初期化を追加する
  - 関連: design-wiring-productionServices, wiring-productionServices
  - カテゴリ: design, integration
  - 修正内容: createProductionServices()内でGitHubApiServiceとGitHubCredentialServiceをインスタンス化し、ContextServicesに含める

- [x] 16.2 Fix: renderer/App.tsxにIssuePaneを統合する
  - 関連: design-wiring-renderer-App-IssuePane, usage-IssuePane-renderer, dead-code-issue-pane-renderer
  - カテゴリ: design, integration, code-quality
  - 修正内容: IssuePane importを追加し、activeTab === 'issues'時にIssuePaneをレンダリングする。CreateIssueDialogも統合する

- [x] 16.3 Fix: webSocketHandler.tsからBug関連ハンドラを削除する
  - 関連: design-cleanup-webSocketHandler, wiring-webSocketHandler-bug-removal
  - カテゴリ: design, integration
  - 修正内容: GET_BUGS, EXECUTE_BUG_PHASE, GET_BUG_DETAIL, BUG_AUTO_EXECUTION関連のcaseハンドラ、メソッド、BugDetailProviderインターフェースを削除

- [x] 16.4 Fix: shared/api/types.tsからBug関連型を削除する
  - 関連: design-cleanup-shared-api-types, wiring-shared-api-types-bug-cleanup
  - カテゴリ: design, integration
  - 修正内容: BugMetadata, BugDetail, BugAction, BugAutoExecutionState, BugAutoExecutionPermissions型、IApiClient上のBugメソッドを削除

- [x] 16.5 Fix: WebSocketApiClient.tsからBugメソッドを削除する
  - 関連: wiring-WebSocketApiClient-bug-cleanup, impact-residual-bug-websocket
  - カテゴリ: integration, code-quality
  - 修正内容: getBugs, getBugDetail, executeBugPhase, createBug, bugAutoExecution関連メソッド、イベントハンドラを削除

- [x] 16.6 Fix: events.tsからBugAutoExecution Subscriptionを削除する
  - 関連: impact-residual-bug-events
  - カテゴリ: code-quality
  - 修正内容: bugAutoExecution関連スキーマ（4つ）とonBugAutoExecution* subscription procedures（4つ）を削除

- [x] 16.7 Fix: autoExecution.tsからBugスキーマを削除する
  - 関連: impact-residual-bug-autoexecution
  - カテゴリ: code-quality
  - 修正内容: bugAutoExecutionPermissionsSchema, bugAutoExecutionOptionsSchema, bugStartInputSchema, bugStopInputSchemaを削除

- [x] 16.8 Fix: workflowStore.tsからbugAutoExecutionPermissionsを削除する
  - 関連: impact-residual-bug-workflowstore
  - カテゴリ: code-quality
  - 修正内容: BugAutoExecutionPermissions型、bugAutoExecutionPermissions stateフィールド、関連アクション（set/get/toggle）を削除

- [x] 16.9 Fix: CLAUDE.mdテンプレートのBug Fixセクションを置換する
  - 関連: req-10.9
  - カテゴリ: requirements
  - 修正内容: Bug Fix (Lightweight Workflow)セクションを削除し、Issue Workflowの説明に置換

- [x] 16.10 Fix: IssuePane.tsxのTODOプレースホルダーを実装する
  - 関連: placeholder-IssuePane-todo-1~4
  - カテゴリ: integration
  - 修正内容: startImplementation, createPullRequest, mergePullRequest, CreateIssueDialogの4つのTODOを実装

- [x] 16.11 Fix: GitHubSettingsSectionをindex.tsからexportしProjectPaneに統合する
  - 関連: dead-code-github-settings-section, import-GitHubSettingsSection
  - カテゴリ: integration
  - 修正内容: shared/components/issue/index.tsにGitHubSettingsSection exportを追加、ProjectPaneまたは適切な場所にimport・レンダリング

- [x] 16.12 Fix: agentIssueIntegrationを本番コードに統合する
  - 関連: dead-code-agent-issue-integration
  - カテゴリ: code-quality
  - 修正内容: agentIssueIntegrationの関数を適切な呼び出し元（agentProcess、webSocketHandler等）に接続する

- [x] 16.13 Fix: GitHubApiServiceにProjectLoggerによるログ出力を追加する
  - 関連: logging-github-api-service
  - カテゴリ: code-quality
  - 修正内容: AUTH_FAILED、RATE_LIMIT、NETWORK_ERRORのログ出力を追加。レート制限残数のログ出力

- [x] 16.14 Fix: 残存Bug関連コードをクリーンアップする
  - 関連: impact-residual-bug-e2eshim, impact-residual-bug-mobiletest
  - カテゴリ: code-quality
  - 修正内容: E2EShim.tsのbugAutoExecutionスタブ削除、MobileAppContent.test.tsxのbugAutoExecutionStoreモック削除

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | PAT入力フィールド | 2.1, 4.3, 9.1 | Infrastructure, Feature |
| 1.2 | safeStorage暗号化保存 | 2.1, 2.2, 4.3, 15.3 | Infrastructure, Integration Test |
| 1.3 | GitHub Enterprise URL対応 | 3.1, 4.3, 9.1 | Infrastructure, Feature |
| 1.4 | git remoteからowner/repo自動検出 | 3.1, 3.6 | Infrastructure |
| 1.5 | 無効PAT時のエラー表示 | 3.5, 3.6, 9.1 | Infrastructure, Feature |
| 1.6 | 接続テスト機能 | 3.5, 9.1, 15.3, 15.7 | Feature, Integration Test, E2E |
| 2.1 | BugsタブをIssuesタブに置換 | 7.1, 14.2, 15.8 | Feature, Wiring, E2E |
| 2.2 | Open Issue一覧表示 | 4.1, 6.1, 7.2, 15.1, 15.6 | Feature, Integration Test, E2E |
| 2.3 | Label/assignee/milestoneフィルタ | 6.1, 7.2, 15.6 | Feature, E2E |
| 2.4 | Issue詳細表示 | 4.1, 7.3 | Feature |
| 2.5 | status: Label表示 | 6.1, 7.2, 7.3 | Feature |
| 2.6 | ポーリング/手動リフレッシュ | 4.1, 6.1, 6.2, 7.2 | Feature |
| 3.1 | Issue作成UI | 7.4 | Feature |
| 3.2 | GitHub API経由でIssue作成 | 3.2, 4.1, 4.5, 15.1 | Infrastructure, Feature, Integration Test |
| 3.3 | status:triage Label自動付与 | 3.2, 4.1, 15.1 | Infrastructure, Feature, Integration Test |
| 3.4 | タイトル・本文・Label・assignee入力 | 3.2, 7.4 | Infrastructure, Feature |
| 4.1 | 固定Label体系 | 1.1, 3.3 | Infrastructure |
| 4.2 | Label自動更新 | 3.3, 4.1, 15.1 | Infrastructure, Feature, Integration Test |
| 4.3 | Label自動作成 | 3.3 | Infrastructure |
| 5.1 | Worktreeモードブランチ作成 | 4.4 | Feature |
| 5.2 | ダイレクトモード | 4.4 | Feature |
| 5.3 | 実装モード選択UI | 7.3 | Feature |
| 5.4 | ブランチ作成時Label更新 | 4.4 | Feature |
| 6.1 | issue-analyze, issue-fix, issue-verify, issue-ask | 10.1, 10.2, 10.3, 10.4 | Feature |
| 6.2 | gh-issue.sh経由コンテキスト注入 | 10.1, 10.2, 10.3, 10.4 | Feature |
| 6.3 | 実行結果をIssueコメントに投稿 | 10.1, 10.2, 10.3, 10.4 | Feature |
| 6.4 | Label自動更新 | 10.1 | Feature |
| 6.5 | 旧bug-*コマンド全廃止 | 13.4, 14.6 | Cleanup |
| 7.1 | gh-issue.sh単一エントリポイント | 5.1 | Feature |
| 7.2 | サブコマンド（read, comment, label, list, create） | 5.1 | Feature |
| 7.3 | PAT取得（環境変数 or safeStorage） | 5.1 | Feature |
| 7.4 | GitHub Enterprise URL対応 | 5.1 | Feature |
| 7.5 | git remote自動検出 | 5.1 | Feature |
| 8.1 | PR自動作成 | 3.4, 4.2, 15.2 | Infrastructure, Feature, Integration Test |
| 8.2 | PR一覧表示 | 4.2, 8.1 | Feature |
| 8.3 | PR diff・CIステータス表示 | 4.2, 8.2 | Feature |
| 8.4 | PRマージUI | 3.4, 4.2, 8.2, 15.2 | Feature, Integration Test |
| 8.5 | マージ時Label更新 | 3.4, 4.2, 15.2 | Feature, Integration Test |
| 9.1 | Issueコンテキスト自動注入 | 6.1, 11.1, 15.4 | Feature, Integration Test |
| 9.2 | Agent結果をIssueコメント投稿 | 11.2, 15.4 | Feature, Integration Test |
| 9.3 | 既存Agent起動UI使用 | 11.1 | Feature |
| 9.4 | Agent実行中のLabel維持 | 11.2 | Feature |
| 10.1 | Rendererコンポーネント削除 | 13.1, 13.6, 14.2 | Cleanup, Wiring |
| 10.2 | Store削除 | 13.2, 14.2, 14.3 | Cleanup, Wiring |
| 10.3 | tRPCルーター削除 | 13.3, 14.1, 14.4 | Cleanup, Wiring |
| 10.4 | Mainサービス削除 | 13.3, 14.4 | Cleanup, Wiring |
| 10.5 | CLIコマンド削除 | 13.4 | Cleanup |
| 10.6 | テンプレート削除 | 13.4 | Cleanup |
| 10.7 | スクリプト削除 | 13.5 | Cleanup |
| 10.8 | sdd-orchestrator.jsonのbugプリセット削除 | 14.5 | Cleanup |
| 10.9 | CLAUDE.md Bug Fixセクション置換 | 14.5 | Wiring |
| 10.10 | 型定義削除 | 13.1, 14.3 | Cleanup |
| 11.1 | Remote UI Issue一覧・詳細 | 12.2 | Feature |
| 11.2 | Remote UIフィルタリング | 12.2 | Feature |
| 11.3 | Remote UI Issue作成 | 12.3 | Feature |
| 11.4 | DesktopLayout準拠 | 12.2 | Feature |
| 11.5 | WebSocketApiClient経由呼び出し | 12.1, 15.5 | Infrastructure, Integration Test |
| 12.1 | ProjectPaneにGitHub設定追加 | 9.1 | Feature |
| 12.2 | PAT・Enterprise URL設定UI | 9.1 | Feature |
| 12.3 | git remoteからowner/repo自動検出表示 | 9.1 | Feature |
| 12.4 | 接続ステータス表示 | 9.1 | Feature |
