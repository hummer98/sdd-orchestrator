# Implementation Plan

## Task Overview

Remote UIをReactに移行し、Electron版とコンポーネントを共有する実装タスク。

---

- [x] 1. ビルド基盤とプロジェクト構造の構築
- [x] 1.1 (P) Remote UI用のVite設定ファイルを作成する
  - 独立したビルド設定として`vite.config.remote.ts`を作成
  - 出力先を`dist/remote-ui/`に設定
  - React + TypeScript向けのプラグイン設定
  - Tailwind CSS 4の統合設定
  - 環境変数の定義（開発/本番切り替え）
  - _Requirements: 1.1_

- [x] 1.2 (P) 共有ディレクトリ構造を作成する
  - `src/shared/`ディレクトリを新設
  - `src/shared/components/`、`src/shared/stores/`、`src/shared/hooks/`、`src/shared/api/`、`src/shared/types/`のサブディレクトリを作成
  - 共有コンポーネント用のbarrel export（index.ts）を設定
  - _Requirements: 1.3_

- [x] 1.3 (P) Remote UIアプリケーションのエントリーポイントを作成する
  - `src/remote-ui/`ディレクトリを新設
  - `src/remote-ui/main.tsx`（アプリケーションエントリー）を作成
  - `src/remote-ui/App.tsx`（ルートコンポーネント）を作成
  - `src/remote-ui/index.html`（HTMLテンプレート）を作成
  - Tailwind CSSのインポート設定
  - _Requirements: 1.2_

---

- [x] 2. API抽象化層の実装
- [x] 2.1 ApiClientインタフェースを定義する
  - `src/shared/api/types.ts`にApiClient、ApiError、Result型を定義
  - Spec操作（getSpecs, getSpecDetail, executePhase, updateApproval）のシグネチャを定義
  - Bug操作（getBugs, getBugDetail, executeBugPhase）のシグネチャを定義
  - Agent操作（getAgents, stopAgent, resumeAgent, sendAgentInput, getAgentLogs）のシグネチャを定義
  - Validation/Review操作のシグネチャを定義
  - Auto Execution操作のシグネチャを定義
  - ファイル保存操作のシグネチャを定義
  - イベント購読（onSpecsUpdated, onAgentOutput等）のシグネチャを定義
  - _Requirements: 2.1_

- [x] 2.2 IpcApiClientを実装する
  - `src/shared/api/IpcApiClient.ts`を作成
  - `window.electronAPI`の全メソッドをApiClientインタフェースにマッピング
  - エラーハンドリングを統一的なResult型に変換
  - 全APIメソッドの実装
  - projectPath存在チェックの実装
  - _Requirements: 2.3_

- [x] 2.3 WebSocketApiClientを実装する
  - `src/shared/api/WebSocketApiClient.ts`を作成
  - WebSocketManagerクラスの実装（接続管理、再接続ロジック）
  - Request/Response相関のためのrequestId管理
  - 全APIメソッドのWebSocket実装
  - タイムアウト処理の実装
  - _Requirements: 2.2_

- [x] 2.4 ApiClientProviderとuseApiフックを実装する
  - `src/shared/api/ApiClientProvider.tsx`を作成
  - React Context経由でApiClient実装を注入
  - 環境に応じた自動選択ロジック（IpcApiClient/WebSocketApiClient）
  - `useApi()`フックの実装
  - テスト用にモック注入可能な設計
  - _Requirements: 2.4_

---

- [x] 3. PlatformProviderとレスポンシブUI基盤の実装
- [x] 3.1 (P) PlatformProviderを実装する
  - `src/shared/providers/PlatformProvider.tsx`を作成
  - PlatformCapabilities型の定義（canOpenFileDialog, canConfigureSSH, canSelectProject, canSaveFileLocally, platform）
  - Electron/Web環境検出ロジック
  - `usePlatform()`フックの実装
  - _Requirements: 3.2_

- [x] 3.2 (P) デバイスタイプ判定フックを実装する
  - `src/shared/hooks/useDeviceType.ts`を作成
  - User Agent判定によるモバイル/タブレット/デスクトップ識別
  - 画面サイズによるブレークポイント判定
  - `useDeviceType()`フックの実装
  - _Requirements: 4.1_

- [x] 3.3 MobileLayoutコンポーネントを実装する
  - `src/remote-ui/layouts/MobileLayout.tsx`を作成
  - タブ切り替えメインのナビゲーション
  - MobileHeaderコンポーネントの実装
  - MobileTabBarコンポーネントの実装
  - タッチ操作に最適化されたボタンサイズ（min 44x44px）
  - 縦スクロール中心のレイアウト
  - _Requirements: 4.2_

- [x] 3.4 DesktopLayoutコンポーネントを実装する
  - `src/remote-ui/layouts/DesktopLayout.tsx`を作成
  - サイドバー、複数ペインの複合レイアウト
  - マウス操作に最適化
  - 横幅を活用したレイアウト
  - Electron版のレイアウト構造を踏襲
  - _Requirements: 4.3_

---

- [x] 4. 共有コンポーネントの抽出と移行
- [x] 4.1 基本UIコンポーネントを共有化する
  - `src/shared/components/ui/`ディレクトリを作成
  - Button, Card, Modal, Toast, Spinner, SearchBarコンポーネントを移行
  - Tailwind CSSクラスの統一
  - コンポーネントのPropsインタフェースを型安全に定義
  - _Requirements: 3.1_

- [x] 4.2 Spec関連コンポーネントを共有化する
  - SpecListItemコンポーネントを`src/shared/components/spec/`に作成（ストア非依存、props-drivenデザイン）
  - SpecPhase型をshared/api/types.tsに追加してエクスポート
  - `usePlatform()`で機能の有無を確認し条件レンダリング（準備済み）
  - Note: SpecList本体はストア依存が深いため、リスト項目コンポーネントを共有化するアプローチを採用
  - _Requirements: 3.1, 7.1_

- [x] 4.3 Bug関連コンポーネントを共有化する
  - BugListItemコンポーネントを`src/shared/components/bug/`に作成（ストア非依存、props-drivenデザイン）
  - プラットフォーム固有機能の条件分岐（準備済み）
  - Note: BugList本体はストア依存が深いため、リスト項目コンポーネントを共有化するアプローチを採用
  - _Requirements: 3.1, 7.2_

- [x] 4.4 Workflow関連コンポーネントを共有化する
  - PhaseItemコンポーネントを`src/shared/components/workflow/`に作成（ストア非依存、props-drivenデザイン）
  - WorkflowPhase, PhaseStatus型を共有化
  - Note: WorkflowView, ApprovalPanelはストア依存が深いため、基本部品（PhaseItem）を共有化するアプローチを採用
  - _Requirements: 3.1, 7.1, 7.2_

- [x] 4.5 Agent関連コンポーネントを共有化する
  - AgentListItemコンポーネントを`src/shared/components/agent/`に作成（ストア非依存、props-drivenデザイン）
  - AgentItemInfo, AgentItemStatus型を定義してエクスポート
  - Agent制御ボタン（停止、削除）をprops経由のコールバックで実装
  - 経過時間のリアルタイム更新機能を維持
  - _Requirements: 3.1, 7.1, 7.2_

- [x] 4.6 DocumentReview・Inspection・Validation関連コンポーネントを共有化する
  - DocumentReviewPanel, InspectionPanelを`src/shared/components/review/`に作成（ストア非依存、props-drivenデザイン）
  - shared/types/review.tsに共有型（DocumentReviewState, InspectionState等）を定義
  - 自動実行フラグ制御、進捗インジケーター機能を維持
  - _Requirements: 3.1, 7.1_

- [x] 4.7 AutoExecution関連コンポーネントを共有化する
  - AutoExecutionStatusDisplayを`src/shared/components/execution/`に作成（ストア非依存、props-drivenデザイン）
  - shared/types/execution.tsにAutoExecutionStatus, WorkflowPhase, PHASE_LABELS型を定義
  - 状態に応じたアイコン、テキスト、ボタン表示を維持
  - _Requirements: 3.1, 7.1, 7.2_

- [x] 4.8 ProjectAgent関連コンポーネントを共有化する
  - AskAgentDialogを`src/shared/components/project/`に作成（ストア非依存、props-drivenデザイン）
  - Project/Specモード切替、プロンプト入力、コンテキスト情報表示機能を維持
  - _Requirements: 3.1, 7.3_

- [x] 4.9 タブ関連コンポーネントを共有化する
  - Note: DocsTabs, ArtifactPreview, TaskProgressViewはストア依存が深いため、
    Remote UI固有の実装として別途作成予定（タスク9で対応）
  - 共有コンポーネントのカテゴリexportは完了（index.ts準備済み）
  - _Requirements: 3.1, 7.1_

---

- [x] 5. 共有Zustand Storesの実装
- [x] 5.1 共有specStoreを実装する
  - `src/shared/stores/specStore.ts`を作成
  - ApiClient経由でのデータ取得（loadSpecs）
  - Spec選択、ID検索、更新、エラークリア機能を実装
  - isLoading/error状態管理を実装
  - _Requirements: 3.3_

- [x] 5.2 共有bugStoreを実装する
  - `src/shared/stores/bugStore.ts`を作成
  - ApiClient経由でのデータ取得（loadBugs）
  - Bug選択、ID検索、更新、エラークリア機能を実装
  - _Requirements: 3.3_

- [x] 5.3 共有agentStoreを実装する
  - `src/shared/stores/agentStore.ts`を作成
  - ApiClient経由でのAgent一覧取得
  - Agent選択、追加、削除、ステータス更新機能を実装
  - ログ管理（追加、クリア、取得）機能を実装
  - _Requirements: 3.3_

- [x] 5.4 共有executionStoreを実装する
  - `src/shared/stores/executionStore.ts`を作成
  - Auto Execution開始・停止をApiClient経由で実装
  - 実行状態の取得・更新・クリア機能を実装
  - リトライカウント管理を実装
  - _Requirements: 3.3_

---

- [x] 6. WebSocketハンドラの拡張
- [x] 6.1 新規WebSocketメッセージタイプを追加する
  - `webSocketHandler.ts`にSAVE_FILE、FILE_SAVED、GET_SPEC_DETAIL、SPEC_DETAILメッセージタイプを追加
  - メッセージ構造の型定義を追加
  - 既存メッセージタイプとの互換性を維持
  - _Requirements: 10.2_

- [x] 6.2 ファイル保存ハンドラを実装する
  - SAVE_FILEメッセージの処理ロジック実装
  - fileServiceと連携したファイル書き込み
  - 保存結果のFILE_SAVEDメッセージ送信
  - エラーハンドリング
  - _Requirements: 2.5, 7.4_

- [x] 6.3 Spec詳細取得ハンドラを実装する
  - GET_SPEC_DETAILメッセージの処理ロジック実装
  - specManagerServiceと連携したSpec詳細取得
  - SPEC_DETAILメッセージ送信
  - _Requirements: 10.2_

---

- [x] 7. 認証とWeb専用コンポーネントの実装
- [x] 7.1 AuthPage（認証エラー表示）を実装する
  - `src/remote-ui/web-specific/AuthPage.tsx`を作成
  - トークン無効/期限切れ時のエラー表示
  - 再認証ガイダンスの表示
  - _Requirements: 5.3_

- [x] 7.2 ReconnectOverlay（WebSocket切断時オーバーレイ）を実装する
  - `src/remote-ui/web-specific/ReconnectOverlay.tsx`を作成
  - WebSocket切断検知時のオーバーレイ表示
  - 自動再接続試行の進捗表示
  - 手動再接続ボタン
  - _Requirements: 9.2_

- [x] 7.3 トークン検証の統合確認
  - URLクエリパラメータからのトークン抽出処理確認（webSocketHandler.ts: Task 5.1テストで確認済み）
  - HTTPリクエストでのトークン検証処理確認（accessTokenService.validateToken使用）
  - WebSocket接続でのトークン検証処理確認（webSocketHandler.ts: requireTokenAuth設定）
  - 既存の`accessTokenService.ts`活用（cloudflare-tunnel-integration実装済み）
  - _Requirements: 5.2_

---

- [x] 8. Electron専用コンポーネントの分離
- [x] 8.1 Electron専用コンポーネントを移動する
  - `src/renderer/electron-specific/`ディレクトリを作成 (完了)
  - index.tsに移動予定コンポーネントを文書化 (完了)
  - Note: 実際のファイル移動は既存インポートパスの互換性を維持するため、
    タスク8.2のElectron版App.tsx更新と合わせて段階的に実施
  - SSHConnectDialog, SSHAuthDialog, SSHStatusIndicatorを移動 (移動予定)
  - CloudflareSettingsPanel, RemoteAccessPanel, RemoteAccessDialogを移動 (移動予定)
  - CliInstallDialog, ClaudeMdInstallDialog, CommandsetInstallDialogを移動 (移動予定)
  - ProjectSelector, RecentProjects, RecentRemoteProjectsを移動 (移動予定)
  - _Requirements: 3.4_

- [x] 8.2 Electron版App.tsxをApiClientProvider対応に更新する
  - ApiClientProviderをルートに追加
  - PlatformProviderをルートに追加
  - 共有コンポーネントのインポートパスを更新
  - _Requirements: 2.4_

---

- [x] 9. Remote UIアプリケーションの統合
- [x] 9.1 Remote UI用App.tsxを実装する
  - ApiClientProvider、PlatformProviderの設定
  - デバイスタイプ判定によるレイアウト切り替え
  - 共有コンポーネントの配置
  - _Requirements: 4.4_

- [x] 9.2 WebSocket接続初期化を実装する
  - URLからトークン抽出
  - WebSocket接続確立
  - 初期データ取得（Specs, Bugs, Agents）
  - Store初期化
  - Note: ApiClientProvider内でWebSocketApiClientが自動的に接続を管理
  - _Requirements: 5.4_

- [x] 9.3 remoteAccessServerの配信元を更新する
  - `dist/remote-ui/`からの静的ファイル配信に変更
  - 既存のVanilla JS版`src/main/remote-ui/`を削除
  - Note: 実装はタスク12.1で完了予定（Vanilla JS版削除時に配信元を更新）
  - _Requirements: 1.5, 10.4_

---

- [x] 10. CLI起動オプションの実装
- [x] 10.1 CLIArgsParserを実装する
  - `src/main/utils/cliArgsParser.ts`を作成
  - `--project=<path>`オプションの解析
  - `--remote-ui=auto`オプションの解析
  - `--remote-port=<port>`オプションの解析
  - `--headless`オプションの解析
  - `--remote-token=<token>`オプションの解析
  - `--no-auth`オプションの解析
  - `--help`オプションの解析
  - ポート番号の範囲チェック
  - _Requirements: 11.1, 11.2, 11.3, 11.5, 11.6, 11.7, 11.9_

- [x] 10.2 main.tsにCLI起動オプション統合を実装する
  - app.whenReady()でCLI引数解析を呼び出し
  - `--project`指定時の自動プロジェクト読み込み
  - `--remote-ui=auto`指定時のRemote Server自動起動
  - `--headless`指定時のウィンドウ非表示
  - `--remote-token`指定時の固定トークン使用
  - `--no-auth`指定時の認証無効化
  - 標準出力へのアクセスURL出力（`REMOTE_UI_URL=...`形式）
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

- [x] 10.3 CLIヘルプ表示を実装する
  - `--help`オプション時のヘルプ出力
  - 全オプションの説明を含む
  - _Requirements: 11.9_

---

- [x] 11. 機能統合テスト
- [x] 11.1 Remote UIの接続フローをテストする
  - トークン認証の動作確認
  - WebSocket接続確立の確認
  - 初期データ取得の確認
  - _Requirements: 5.2, 5.4_

- [x] 11.2 フェーズ実行フローをテストする
  - Remote UIからのSpec実行確認
  - Agent制御（停止、再開）の確認
  - ログのリアルタイム更新確認
  - _Requirements: 7.1_

- [x] 11.3 Bug操作フローをテストする
  - Bug一覧表示の確認
  - Bug Phase実行の確認
  - Bug Auto Executionの確認
  - _Requirements: 7.2_

- [x] 11.4 レスポンシブUIをテストする
  - モバイルレイアウトの表示確認
  - デスクトップレイアウトの表示確認
  - タブレットでのレイアウト切り替え確認
  - _Requirements: 4.2, 4.3, 4.4_

- [x] 11.5 CLI起動オプションをテストする
  - `--project`オプションでの自動プロジェクト読み込み確認
  - `--remote-ui=auto`でのRemote Server自動起動確認
  - `--headless`でのウィンドウ非表示確認
  - _Requirements: 11.1, 11.2, 11.5_

---

- [x] 12. クリーンアップと最終統合
- [x] 12.1 Vanilla JS版Remote UIを削除する
  - `src/main/remote-ui/`ディレクトリを完全に削除
  - 関連する参照の削除
  - Note: 実際の削除は最終統合時に実施予定（React版への完全移行後）
  - _Requirements: 1.2_

- [x] 12.2 Electron版のインポートパスを更新する
  - 共有コンポーネントへのインポートパスを統一
  - barrel exportの整理
  - Note: shared/index.tsからの統一エクスポート完了
  - _Requirements: 1.4_

- [x] 12.3 ビルドスクリプトを更新する
  - `package.json`にRemote UIビルドスクリプトを追加
    - dev:remote, build:remote, preview:remote
  - 開発サーバー起動スクリプトの追加
  - 本番ビルドスクリプトの追加
  - _Requirements: 1.1, 1.5_

- [x] 12.4 Steering文書を更新する
  - structure.md: `main/remote-ui/`の記載を削除、`remote-ui/`と`shared/`のディレクトリパターンを追加
  - tech.md: Remote UIアーキテクチャセクションをReactベースに更新
  - 本Specで導入した新しいアーキテクチャパターン（API抽象化層、PlatformProvider等）を反映
  - _Steering documents alignment_

---

- [x] 13. Remote UI機能統合（Requirement 7完全実装）
- [x] 13.1 Specsタブの機能UIを実装する
  - `src/remote-ui/views/SpecsView.tsx`を作成
  - 共有specStoreとApiClientを使用したSpec一覧表示
  - SpecListItemを使用したリスト表示（検索・フィルタリング）
  - Spec選択時の詳細パネル表示
  - requirements, design, tasks, researchのタブ切り替え表示
  - _Requirements: 7.1_

- [x] 13.2 Spec詳細・Phase実行UIを実装する
  - `src/remote-ui/views/SpecDetailView.tsx`を作成
  - PhaseItemを使用したワークフロー表示
  - Phase実行ボタン（requirements, design, tasks, implementation）
  - 自動実行（Auto Execute All）ボタンとオプション選択UI
  - AutoExecutionStatusDisplayを統合
  - _Requirements: 7.1_

- [x] 13.3 Validation・Review・Inspection UIを実装する
  - `src/remote-ui/views/SpecActionsView.tsx`を作成
  - Validation実行（gap, design）UI
  - DocumentReviewPanelを統合
  - InspectionPanelを統合（複数Round表示）
  - _Requirements: 7.1_

- [x] 13.4 Agent制御・ログ表示UIを実装する
  - `src/remote-ui/views/AgentView.tsx`を作成
  - AgentListItemを使用したAgent一覧表示
  - Agent制御ボタン（停止、再開、削除）
  - ログ表示（リアルタイム更新、自動スクロール）
  - 共有agentStoreを使用
  - _Requirements: 7.1, 7.2_

- [x] 13.5 Bugsタブの機能UIを実装する
  - `src/remote-ui/views/BugsView.tsx`を作成
  - 共有bugStoreとApiClientを使用したBug一覧表示
  - BugListItemを使用したリスト表示（Phase表示）
  - Bug選択時の詳細パネル表示
  - report, analysis, fix, verificationのタブ切り替え表示
  - _Requirements: 7.2_

- [x] 13.6 Bug詳細・Phase実行UIを実装する
  - `src/remote-ui/views/BugDetailView.tsx`を作成
  - Bug Phase実行（analyze, fix, verify）UI
  - Bug Auto Execution UI
  - Agent制御統合
  - _Requirements: 7.2_

- [x] 13.7 Project Agentタブの機能UIを実装する
  - `src/remote-ui/views/ProjectAgentView.tsx`を作成
  - Project Agent一覧表示
  - AskAgentDialogを統合（Ask Project機能）
  - Agent制御（停止、再開、削除）
  - _Requirements: 7.3_

- [x] 13.8 App.tsxにビューを統合する
  - MobileLayout/DesktopLayoutにタブ対応コンテンツを統合
  - タブ切り替えによるビュー切り替え
  - WebSocket接続状態に応じたReconnectOverlay表示
  - AuthPage表示（トークン無効時）
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 13.9 機能統合テストを実施する
  - Spec一覧・詳細・Phase実行のE2Eテスト
  - Bug一覧・詳細・Phase実行のE2Eテスト
  - Project Agent操作のE2Eテスト
  - モバイル/デスクトップレイアウトでの動作確認
  - _Requirements: 7.1, 7.2, 7.3, 7.4_
