# E2Eテスト標準

E2Eテスト（WebdriverIO + wdio-electron-service）のアーキテクチャと詳細な内容。

---

## テスト設計原則

### E2Eテストの目的

E2Eテストは**ユーザーが実際に行う操作とその結果を検証する**テストである。Electronバイナリを起動するのは、ユーザーと同じ環境で画面を操作するためであり、内部APIを呼び出すためではない。

### テスト種別の使い分け

| テスト種別 | 検証対象 | 手段 | ツール |
|-----------|---------|------|-------|
| **E2E** | ユーザーが見る画面・操作した結果 | UI操作（クリック、入力、待機） | WebdriverIO / Playwright |
| **Integration** | APIルートの存在・入出力・内部ロジック | 関数/ルーターの直接呼び出し | vitest |
| **Unit** | 個別関数・コンポーネントの振る舞い | 関数呼び出し・レンダリング | vitest |

### E2Eテストで行うこと

- **UI要素の操作**: クリック、テキスト入力、スクロール
- **UI要素の検証**: 表示されている、テキストが正しい、無効化されている
- **ユーザーフローの通し検証**: Spec選択 → フェーズ実行 → 結果表示
- **Electron固有の検証**: セキュリティ設定（`browser.electron.execute`経由）

### E2Eテストで行わないこと

- **API存在確認**: `typeof window.electronAPI.xxx === 'function'` → integration testで行う
- **API直接呼び出し**: `window.electronAPI.xxx()` や `window.__TRPC__.xxx.query()` → integration testで行う
- **内部ステート検証を主アサーションにする**: store状態の直接チェックはデバッグ用。アサーションはUIで行う

### セットアップとアサーションの区別

| 用途 | 許可される手段 | 例 |
|------|--------------|-----|
| **プロジェクト選択** | `SDD_PROJECT_PATH` 環境変数 | wdio.conf.tsのappEnv |
| **Spec選択** | UIクリック (`selectSpecViaUI`) | spec-list-itemをクリック |
| **テスト状態の読み取り** | `__STORES__.xxx.getState()` (補助的) | デバッグログ、条件分岐 |
| **アサーション** | **UI要素の状態のみ** | `expect(element.isExisting()).toBe(true)` |

> **原則**: テストのセットアップにプログラマティックな手段を使うのは許容される。しかし、**アサーション対象は常にユーザーが見る画面**でなければならない。

---

## フレームワークアーキテクチャ

### 技術スタック

| コンポーネント | 技術 | バージョン |
|--------------|------|-----------|
| テストランナー | WebdriverIO | 9.20.1 |
| Electronサービス | wdio-electron-service | 9.2.1 |
| フレームワーク | Mocha | - |
| Electron | 35.5.1 | - |
| Chromedriver | 自動管理 | - |

### WebdriverIO採用理由

PlaywrightではなくWebdriverIOを採用した理由:
- Chromedriver経由で`--remote-debugging-port`問題を回避
- Electron 26以上で自動Chromedriver管理
- Electron APIへの直接アクセス（`browser.electron.execute`）

### アーキテクチャ概要

```
WebdriverIO -> Chromedriver -> Electron App (開発版 or パッケージ版)
                                    |
                         Browser Window (Renderer)
```

---

## テスト設定

### wdio.conf.ts

```typescript
// 主要な設定ポイント
// デフォルトは開発版（npm run build の成果物）を使用（高速、開発時推奨）
// パッケージ済みアプリを使用する場合は E2E_USE_PACKAGED_APP=true を設定
const usePackagedApp = process.env.E2E_USE_PACKAGED_APP === 'true';
const appEntryPoint = path.join(projectRoot, 'dist/main/index.js');
const appBinaryPath = path.join(projectRoot, 'release/mac-arm64/SDD Orchestrator.app/.../SDD Orchestrator');

capabilities: [{
  browserName: 'electron',
  'wdio:electronServiceOptions': {
    ...(usePackagedApp ? { appBinaryPath } : { appEntryPoint }),
    appArgs: ['--e2e-test'],
  },
}],
services: ['electron'],
framework: 'mocha',
specs: ['./e2e-wdio/**/*.spec.ts'],
```

### 実行コマンド

```bash
# 開発版（デフォルト、高速）
npm run build && task electron:test:e2e

# パッケージ版（CI/リリース前検証用）
task electron:build && E2E_USE_PACKAGED_APP=true task electron:test:e2e
```

---

## テストファイル一覧

配置場所: `electron-sdd-manager/e2e-wdio/`

58のE2Eテストファイルが存在する。主要カテゴリ:

| カテゴリ | 代表的なファイル | 概要 |
|---------|----------------|------|
| 基本起動・セキュリティ | `app-launch.spec.ts` | アプリ起動、contextIsolation、nodeIntegration |
| Specワークフロー | `spec-workflow.e2e.spec.ts` | Spec選択、WorkflowView、フェーズ実行 |
| Bugワークフロー | `bug-workflow.e2e.spec.ts`, `bug-auto-execution.e2e.spec.ts`, `bugs-*.e2e.spec.ts` | バグ作成、Analyze/Fix/Verify、自動実行、Worktree |
| 自動実行 | `auto-execution-*.e2e.spec.ts`, `simple-auto-execution.e2e.spec.ts` | 許可制御、フロー全通、ドキュメントレビュー連携、impl、resume |
| ワークフロー統合 | `workflow-integration.e2e.spec.ts` | Mock Claude使用の実ワークフロー統合テスト |
| ドキュメントレビュー | `document-review*.e2e.spec.ts`, `debatex-scheme.e2e.spec.ts`, `gemini-document-review.e2e.spec.ts` | レビュー、UI状態、各種scheme |
| Inspection | `inspection-workflow.e2e.spec.ts` | Inspection操作・結果表示 |
| エージェント | `agent-log-streaming.e2e.spec.ts`, `agent-completion-notification.e2e.spec.ts`, `agent-resume-log-display.e2e.spec.ts`, `project-agent-startup.e2e.spec.ts` | ログストリーミング、完了通知、Resume |
| Git差分 | `git-diff-viewer.e2e.spec.ts` | Git差分表示 |
| Worktree | `worktree-*.e2e.spec.ts`, `convert-spec-to-worktree.e2e.spec.ts`, `impl-start-worktree.e2e.spec.ts` | Worktree実行、rebase、sync |
| ファイル監視 | `file-watcher-*.e2e.spec.ts` | ルート監視、UI更新 |
| メトリクス | `metrics-display.e2e.spec.ts` | メトリクス表示 |
| スケジュール | `schedule-task.e2e.spec.ts` | スケジュールタスク |
| Remote/SSH | `ssh-workflow.e2e.spec.ts`, `remote-webserver.e2e.spec.ts`, `cloudflare-tunnel.e2e.spec.ts`, `websocket-command-execution.e2e.spec.ts` | SSH接続、Remote UIサーバー、Tunnel |
| UI全般 | `layout-persistence.e2e.spec.ts`, `install-dialogs.e2e.spec.ts`, `multi-window.e2e.spec.ts`, `mermaid-preview.e2e.spec.ts`, `parsed-log-entry-display.e2e.spec.ts`, `artifact-editor-search.e2e.spec.ts`, `additional-markdown-files.e2e.spec.ts`, `project-docs-viewer.e2e.spec.ts` | レイアウト、ダイアログ、マルチウィンドウ、Mermaid、検索 |
| 診断 | `diagnostic*.e2e.spec.ts`, `diag-main-process.e2e.spec.ts` | 診断ツール |
| プロジェクト選択 | `project-selection-basic.e2e.spec.ts`, `startup-project-selection.e2e.spec.ts` | プロジェクト選択フロー |
| パーミッション | `permission-control.e2e.spec.ts` | パーミッション制御 |
| ログ | `renderer-logging.e2e.spec.ts` | Rendererログ出力 |

---

## Mock Claude CLI

E2Eテストでは実際のClaude APIを呼び出さず、Mock Claude CLIを使用してワークフローをテストできます。

### 設定

`wdio.conf.ts` で自動的に設定されます：

```typescript
// Mock Claude CLI for E2E testing
const mockClaudePath = path.join(projectRoot, 'scripts/e2e-mock/mock-claude.sh');
process.env.E2E_MOCK_CLAUDE_COMMAND = mockClaudePath;
process.env.E2E_MOCK_CLAUDE_DELAY = '0.1';  // 応答遅延（秒）
```

### Mock Claudeの動作

`scripts/e2e-mock/mock-claude.sh` は以下を行います：

1. コマンド引数からフェーズを判定（requirements, design, tasks, impl等）
2. `stream-json`形式でモックレスポンスを出力
3. session_idを含むinitメッセージを返却
4. フェーズに応じた成功レスポンスを生成
5. **requirements/design/tasksフェーズでは実際のMarkdownファイルを生成**
6. **spec.jsonのapprovals.{phase}.generatedフラグとphaseを自動更新**

### ファイル生成機能（v2.0）

Mock Claudeはrequirements/design/tasksフェーズ実行時に、以下のファイルを自動生成します：

| フェーズ | 生成ファイル | spec.json更新 |
|---------|------------|---------------|
| requirements | `requirements.md` | `phase: "requirements-generated"`, `approvals.requirements.generated: true` |
| design | `design.md` | `phase: "design-generated"`, `approvals.design.generated: true` |
| tasks | `tasks.md` | `phase: "tasks-generated"`, `approvals.tasks.generated: true` |

これにより、自動実行フローの全通テストで以下が可能になります：
- spec.jsonの状態遷移を検証
- UIがspec.json変更に追従するかを検証
- 生成されたドキュメントがArtifactPreviewに表示されるかを検証

### 対応フェーズ

- `/kiro:spec-requirements`, `/kiro:spec-design`, `/kiro:spec-tasks`, `/kiro:spec-impl`
- `/kiro:validate-gap`, `/kiro:validate-design`, `/kiro:validate-impl`
- `/kiro:spec-status`, `/kiro:document-review`, `/kiro:document-review-reply`

### ストリーミング版 Mock Claude CLI

ログのインクリメンタル表示をテストするためのストリーミング版Mock Claude CLIも利用可能です。

**ファイル**: `scripts/e2e-mock/mock-claude-streaming.sh`

**特徴**:
- 各JSON行を遅延付きで出力（実際のストリーミング動作をシミュレート）
- `E2E_MOCK_STREAM_DELAY`環境変数で遅延時間を設定可能（デフォルト: 0.3秒）
- 通常のmock-claude.shと同じフェーズをサポート

**設定例**:

```typescript
// wdio.conf.ts でストリーミング版を使用
const mockClaudePath = path.join(projectRoot, 'scripts/e2e-mock/mock-claude-streaming.sh');
process.env.E2E_MOCK_CLAUDE_COMMAND = mockClaudePath;
process.env.E2E_MOCK_STREAM_DELAY = '0.3';  // 各行間の遅延（秒）
```

**出力形式**:

ストリーミング版は以下の順序でJSONLを出力します：
1. `system/init` - セッション初期化（cwd, model情報）
2. `assistant` - 複数の思考ステップ（遅延付きで順次出力）
3. `result/success` - 完了メッセージ

**使用シーン**:
- エージェントログのインクリメンタル表示テスト
- ストリーミングパーサー（logFormatter.ts）の動作検証
- リアルタイムログ更新UIの検証

---

## テスト用Fixture

### 配置場所

テスト目的別に複数のフィクスチャを使い分ける:

```
e2e-wdio/fixtures/
├── test-project/          # 汎用（Spec/Bugワークフロー）
├── auto-exec-test/        # 自動実行テスト
├── bug-auto-exec-test/    # Bug自動実行テスト
├── bugs-pane-test/        # Bugsパネルテスト
├── doc-review-ui-test/    # ドキュメントレビューUIテスト
├── document-review-test/  # ドキュメントレビューテスト
├── docs-viewer-test/      # ドキュメントビューアテスト
├── impl-test/             # 実装フェーズテスト
├── inspection-test/       # Inspectionテスト
├── mermaid-test/          # Mermaidプレビューテスト
├── resume-test/           # Agent Resumeテスト
├── tasks-approved-project/ # タスク承認済みプロジェクト
├── worktree-exec-test/    # Worktree実行テスト
└── worktree-spec-sync-test/ # Worktree Spec同期テスト
```

各フィクスチャは `.kiro/specs/` 配下にテスト対象のSpec構造を持つ:
```
{fixture}/
└── .kiro/
    └── specs/
        └── {feature}/
            ├── spec.json
            ├── requirements.md
            ├── design.md
            └── tasks.md
```

### 使用方法

テスト内でプロジェクトを開く：

**推奨: `SDD_PROJECT_PATH` 環境変数**（後述）を使用すること。

```typescript
// ❌ deprecated: selectProjectViaStore は Renderer→IPC→Main 経路で不安定
// import { selectProjectViaStore } from './helpers/auto-execution.helpers';
// await selectProjectViaStore(FIXTURE_PROJECT_PATH);

// ✅ 推奨: SDD_PROJECT_PATH 環境変数（下記参照）
```

**理由**: UIダイアログやメニューバー経由のプロジェクト選択は不安定。`selectProjectViaStore()` もRenderer→IPC→Main経路で同様に不安定なため deprecated。Main processで直接処理される `SDD_PROJECT_PATH` 環境変数を使用すること。

### SDD_PROJECT_PATH環境変数によるプロジェクト自動選択（推奨）

E2Eテスト起動時に特定のプロジェクトを自動的に選択した状態で開始できます：

```bash
# wdio.conf.tsで設定済み - appEnvに渡される
SDD_PROJECT_PATH="$(pwd)/e2e-wdio/fixtures/mermaid-test" npm run test:e2e -- --spec e2e-wdio/mermaid-preview.e2e.spec.ts
```

**仕組み**:
- `wdio.conf.ts`の`appEnv`で`SDD_PROJECT_PATH`を設定
- Main processの`index.ts`で環境変数を読み取り、`selectProject()`を呼び出し
- Renderer側の`loadInitialProject`は削除済み（Main processが一元管理）

**利点**:
- プロジェクト選択UIをスキップして直接テスト開始
- テストの安定性向上（UI操作の不確実性を排除）
- CI/CD環境での再現性向上

---

## テストファイル詳細

### app-launch.spec.ts

**目的**: 基本的なアプリケーション起動確認とセキュリティ設定の検証。

**テストスイート**:
1. **アプリケーション起動** (3テスト)
   - ウィンドウが正常に開く
   - メインウィンドウが表示される
   - ウィンドウタイトルが設定されている

2. **セキュリティ設定** (2テスト)
   - `contextIsolation: true`（必須）
   - `nodeIntegration: false`（必須）

3. **ウィンドウ動作** (3テスト)
   - 最小サイズ >= 800x600
   - ウィンドウがリサイズ可能
   - アプリケーションメニューが存在
   - `app.isPackaged: true`（E2Eはビルド済みバイナリで実行）

### spec-workflow.e2e.spec.ts

**目的**: SDDワークフロー全体 - Spec選択、WorkflowView、フェーズ実行。

**テストスイート**:
1. **SpecListコンポーネント** (5テスト)
   - コンポーネント存在確認（`[data-testid="spec-list"]`）
   - Specsタブがデフォルトで選択
   - 作成ボタンの存在
   - リストアイテムの表示
   - アイテム選択動作

2. **CreateSpecDialog** (3テスト)
   - ボタンクリックでダイアログが開く
   - 名前入力フィールドが存在
   - 説明入力フィールドが存在

3. **WorkflowView** (3テスト)
   - Spec選択時にコンポーネントが表示
   - フェーズボタンの表示

4. **PhaseExecutionPanel** (5テスト)
   - パネルの存在
   - Requirements/Design/Tasks/Implフェーズボタン
   - 自動実行ボタン

5. **AgentListPanel** (3テスト)
   - パネルとヘッダーの存在
   - 空状態の表示

6. **AgentLogPanel** (2テスト)
   - パネルとログコンテナの存在

7. **AgentInputPanel** (3テスト)
   - パネル、入力フィールド、送信ボタンの存在

8. **ApprovalPanel** (3テスト)
   - パネル構造
   - 承認/却下ボタン

9. **ArtifactPreview/TaskProgressView** (3テスト)
   - コンポーネントの存在
   - Markdownコンテンツ領域

10. **エージェントワークフローインフラ** (5テスト)
    - ウィンドウ状態の検証
    - IPCチャネル機能
    - メニューの存在

### bug-workflow.e2e.spec.ts

**目的**: バグ修正ワークフロー - バグ作成、Analyze/Fix/Verifyフェーズ。

**要件カバレッジ**: 1.1, 1.2, 2.1, 4.1, 4.4, 4.6, 5.2, 5.3, 5.4

**テストスイート**:
1. **DocsTabsタブ切り替え** (5テスト)
   - Specs/Bugsタブの存在
   - `aria-selected`属性の処理
   - タブクリックでパネル切り替え

2. **BugListコンポーネント** (3テスト)
   - Bugsタブでの表示
   - フェーズフィルターの存在
   - 空状態またはバグリストの表示

3. **CreateBugDialog** (8テスト)
   - 作成ボタンでダイアログが開く
   - 名前/説明入力フィールド
   - 名前が空の場合、作成ボタンが無効化
   - 入力後、作成ボタンが有効化
   - キャンセルでダイアログが閉じる
   - バックドロップクリックでダイアログが閉じる

4. **BugActionButtons** (4テスト)
   - Analyze/Fix/Verifyボタンの存在

5. **タブ状態保持** (1テスト)
   - 切り替え時に選択状態が維持される

### auto-execution.spec.ts

**目的**: 自動実行機能のテスト。

**要件カバレッジ**: 1.1-1.4, 5.1-5.5, 8.2, 8.3

**テストスイート**:
1. **自動実行ボタン** (1テスト)
   - ボタン表示の確認

2. **UI状態表示** (2テスト)
   - メインウィンドウの表示
   - 最小ウィンドウサイズ

3. **アプリケーション初期状態** (3テスト)
   - アプリケーション起動
   - セキュリティ設定（contextIsolation, nodeIntegration）

4. **IPC通信** (2テスト)
   - E2Eテストモード（isPackaged）
   - メニューの存在

5. **インフラテスト** (6テスト)
   - 複数フェーズ実行
   - エラーハンドリング
   - 中断/再開
   - 通知機能

### experimental-tools-installer.spec.ts

**目的**: メニューベースのツールインストール（Plan, Debug, Commit）。

**要件カバレッジ**: 1.3, 2.2-2.4, 3.3, 4.2-4.4

**テストスイート**:
1. **メニュー構造** (6テスト)
   - アプリケーションメニューが存在
   - ツールメニューが存在
   - 実験的ツールサブメニューが存在
   - Plan/Debug/Commitメニュー項目が存在

2. **プロジェクト未選択状態** (3テスト)
   - Plan/Debug/Commitメニューが無効化

3. **IPC/セキュリティ** (2テスト)
   - isPackaged = true
   - contextIsolation/nodeIntegrationチェック

4. **Renderer IPC通信** (7テスト)
   - `electronAPI`が定義されている
   - `installExperimentalPlan/Debug/Commit` APIが存在
   - `checkExperimentalToolExists` APIが存在
   - `onMenuInstallExperimental*`イベントリスナーが存在

### document-review.e2e.spec.ts

**目的**: ドキュメントレビューワークフロー - レビュー、スキップ、承認、履歴。

**要件カバレッジ**: 6.1-6.5, 7.1-7.5, 8.1-8.3

**テストスイート**:
1. **DocumentReviewPanel** (5テスト)
   - パネルの存在
   - 開始/スキップ/承認/履歴ボタン

2. **レビューステータス表示** (2テスト)
   - ステータスバッジ
   - ラウンドカウンター

3. **レビュー開始フロー** (2テスト)
   - 開始時にスピナー表示
   - 実行中はボタンが無効化

4. **スキップ/承認フロー** (4テスト)
   - ボタンのクリック可能性
   - ステータス更新

5. **ReviewHistoryView** (3テスト)
   - 履歴ビューの表示
   - 履歴ボタンの操作
   - ラウンドアイテムの表示

6. **自動実行連携** (2テスト)
   - AutoExecutionStatusDisplay
   - documentReviewOptionsパネル

### ssh-workflow.e2e.spec.ts

**目的**: SSH接続フロー - SSHConnectDialog、SSHAuthDialogの動作確認。

**要件カバレッジ**: 1.3, 1.4, 2.1, 2.2, 2.3

**テストスイート**:
1. **アプリケーション起動** (2テスト)
   - アプリケーション正常起動
   - メインウィンドウ表示

2. **SSHConnectDialogコンポーネント** (5テスト)
   - Renderer APIにSSH接続メソッド存在確認
   - URI入力フィールドの存在
   - 接続/キャンセル/閉じるボタンの存在

3. **SSHAuthDialogコンポーネント** (5テスト)
   - パスワード入力フィールドの存在
   - 送信/キャンセルボタンの存在
   - ホストキー検証時のフィンガープリント表示
   - 承認ボタンの存在

4. **セキュリティ設定** (2テスト)
   - contextIsolation/nodeIntegrationチェック

5. **アプリケーション安定性** (2テスト)
   - クラッシュ検知
   - リサイズ可能性確認

### layout-persistence.e2e.spec.ts

**目的**: レイアウト永続化 - ResizeHandle、レイアウト保存/復元の動作確認。

**テストスイート**:
1. **アプリケーション起動** (2テスト)
   - アプリケーション正常起動
   - メインウィンドウ表示

2. **ResizeHandleコンポーネント** (3テスト)
   - 水平/垂直リサイズハンドルの存在
   - カーソルスタイルの適用

3. **レイアウト設定IPC** (3テスト)
   - loadLayoutConfig/saveLayoutConfig APIの存在
   - resetLayoutConfig APIの存在
   - レイアウト設定読み込み動作

4. **ウィンドウリサイズ** (3テスト)
   - リサイズ可能性確認
   - 最小サイズ検証
   - ウィンドウ位置取得

5. **セキュリティ設定** (2テスト)
   - contextIsolation/nodeIntegrationチェック

6. **アプリケーション安定性** (1テスト)
   - クラッシュ検知

### install-dialogs.e2e.spec.ts

**目的**: CLI/CLAUDE.mdインストールダイアログの動作確認。

**テストスイート**:
1. **アプリケーション起動** (2テスト)
   - アプリケーション正常起動
   - メインウィンドウ表示

2. **CliInstallDialogコンポーネント** (5テスト)
   - installCliCommand APIの存在
   - ユーザー/システムディレクトリオプションの存在
   - インストール/閉じるボタンの存在

3. **ClaudeMdInstallDialogコンポーネント** (6テスト)
   - installClaudeMd APIの存在
   - 上書き/マージ/キャンセルボタンの存在
   - 閉じる/インストールボタンの存在

4. **メニュー関連IPC** (2テスト)
   - メニューからのイベント受信確認

5. **セキュリティ設定** (2テスト)
   - contextIsolation/nodeIntegrationチェック

6. **アプリケーション安定性** (2テスト)
   - クラッシュ検知
   - リサイズ可能性確認

### workflow-integration.e2e.spec.ts

**目的**: Mock Claude CLIを使用した実ワークフロー統合テスト。

**前提条件**:
- Mock Claude CLI が `wdio.conf.ts` で設定済み
- テスト用Fixture が `e2e-wdio/fixtures/test-project/` に配置

**テストスイート**:
1. **Mock Environment Setup** (3テスト)
   - E2E_MOCK_CLAUDE_COMMAND環境変数の確認
   - アプリケーションウィンドウの確認
   - Fixtureプロジェクトの存在確認

2. **Project Selection** (2テスト)
   - Zustandストア経由でのプロジェクト選択
   - SpecListへのSpec表示確認

3. **UI Elements for Workflow** (6テスト)
   - SpecListコンポーネント表示
   - WorkflowView表示
   - フェーズ実行パネル表示
   - 全フェーズアイテム表示
   - requirementsフェーズボタン
   - 自動実行ボタン

4. **Phase Execution Flow** (3テスト)
   - Mock Claudeでのrequirementsフェーズ実行
   - 実行中インジケータ表示
   - 実行完了の確認

5. **Agent Status Display** (2テスト)
   - ProjectAgentPanel表示
   - エージェントアイテム表示

6. **Multi-Phase Workflow** (2テスト)
   - 全フェーズボタンの正順表示
   - フェーズコネクタの表示

7. **Security Settings** (2テスト)
   - contextIsolation有効確認
   - nodeIntegration無効確認

8. **Application Stability** (3テスト)
   - クラッシュなし確認
   - 応答性確認
   - ウィンドウ表示確認

### auto-execution-flow.e2e.spec.ts

**目的**: 自動実行フローの全通テスト - 許可設定に基づく停止、spec.json更新、UI追従。

**前提条件**:
- Mock Claude CLI が `wdio.conf.ts` で設定済み（ファイル生成機能付き）
- テスト用Fixture が `e2e-wdio/fixtures/test-project/` に配置

**テスト観点**:
1. 自動実行設定に応じた停止位置
2. specドキュメント生成時のメインパネル更新
3. エージェント完了時のspec.json更新とUI追従
4. エージェント実行中のUI disable
5. 自動実行完了時のUIと内部ステート更新

**テストスイート**:
1. **Auto-execution Permission Control** (3テスト)
   - requirementsのみ許可時、requirementsで停止
   - requirements+design許可時、両方実行して停止
   - requirements+design+tasks許可時、全て実行して停止

2. **Document Generation and Panel Updates** (2テスト)
   - requirements.md生成後のパネル更新確認
   - 生成ファイルのArtifactPreview表示確認

3. **spec.json Update and UI Sync** (3テスト)
   - approvals.requirements.generated更新確認
   - generated状態での承認ボタン表示確認
   - 前フェーズ自動承認と次フェーズ継続の確認

4. **UI Disable During Execution** (3テスト)
   - 実行中の自動実行ボタン状態変化（→停止ボタン）
   - 実行中の他フェーズボタン無効化
   - 実行中インジケータ表示

5. **Completion State Updates** (4テスト)
   - autoExecutionStatus→completed設定確認
   - isAutoExecuting→false設定確認
   - 完了後の自動実行ボタン再有効化
   - 完了した全フェーズのUI表示確認

6. **Security and Stability** (3テスト)
   - contextIsolation有効確認
   - nodeIntegration無効確認
   - 自動実行中のクラッシュなし確認

### agent-log-streaming.e2e.spec.ts

**目的**: エージェントログのストリーミング表示テスト - ログのインクリメンタル表示、自動選択。

**前提条件**:
- Mock Claude CLI（ストリーミング版推奨）が設定済み
- テスト用Fixture が `e2e-wdio/fixtures/auto-exec-test/` に配置

**テスト観点**:
1. 自動実行ボタンクリックでエージェント起動
2. エージェント一覧の更新
3. 新規エージェント開始時のログビュー自動選択
4. ログのインクリメンタル表示（stream-json形式パース）
5. 実行中インジケータの表示

**テストスイート**:
1. **Auto-execution starts agent** (1テスト)
   - 自動実行ボタンクリックでエージェント起動確認

2. **Agent list updates** (1テスト)
   - エージェント開始時に`agent-list-panel`にアイテム追加確認

3. **Agent log auto-selection** (1テスト)
   - 新規エージェント開始時に`agent-log-panel`が自動表示

4. **Agent log streaming** (2テスト)
   - ログのインクリメンタル更新検出
   - stream-json形式のパースとシステム初期化メッセージ表示

5. **Running indicator** (1テスト)
   - `running-indicator`の表示確認

**使用するヘルパー関数**:
- `waitForRunningAgent()` - 実行中エージェントの待機
- `waitForAgentInStore()` - AgentStoreへのエージェント追加待機
- `debugGetAllAgents()` - デバッグ用全エージェント取得
- `logBrowserConsole()` - ブラウザコンソールログ出力

---

## 共通ヘルパー関数

E2Eテストで共通で使用するヘルパー関数は `e2e-wdio/helpers/` に集約されています。

### ヘルパーファイル

| ファイル | 用途 |
|---------|------|
| `auto-execution.helpers.ts` | 自動実行関連のヘルパー関数 |

### 使用方法

新しいE2Eテストファイルを作成する際は、共通ヘルパーをインポートして使用してください:

```typescript
import {
  selectProjectViaStore,
  selectSpecViaStore,
  setAutoExecutionPermissions,
  getAutoExecutionStatus,
  waitForCondition,
  refreshSpecStore,
  clearAgentStore,
  resetAutoExecutionService,
  resetSpecStoreAutoExecution,
  stopAutoExecution,
  waitForAgentInStore,
  waitForRunningAgent,
} from './helpers/auto-execution.helpers';
```

### 主要なヘルパー関数

| 関数 | 説明 |
|-----|------|
| `selectProjectViaStore(path)` | **deprecated** - `SDD_PROJECT_PATH` 環境変数を使用すること |
| `selectSpecViaUI(specName)` | **推奨** - UIクリックでSpecを選択 |
| `selectSpecViaStore(specId)` | **非推奨** - tRPC IPC完了しない問題あり。`selectSpecViaUI` を使用 |
| `setAutoExecutionPermissions(permissions)` | 自動実行許可設定を更新（セットアップ用） |
| `getAutoExecutionStatus()` | 現在選択中のSpecの自動実行状態を取得 |
| `waitForCondition(condition, timeout, interval, label)` | 条件が満たされるまで待機 |
| `refreshSpecStore()` | Specストアを更新 |
| `clearAgentStore()` | Agentストアをクリア |
| `resetAutoExecutionService()` | AutoExecutionServiceをリセット |
| `resetSpecStoreAutoExecution()` | Specストアの自動実行状態をリセット |
| `stopAutoExecution()` | 現在の自動実行を停止 |
| `waitForAgentInStore(specName, timeout)` | AgentStoreにエージェントが追加されるまで待機 |
| `waitForRunningAgent(specName, timeout)` | 実行中エージェントが現れるまで待機 |
| `debugGetAllAgents()` | デバッグ用：AgentStoreの全エージェントを取得 |
| `logBrowserConsole()` | デバッグ用：ブラウザコンソールログを出力 |
| `resetAutoExecutionCoordinator()` | AutoExecutionCoordinatorをリセット |

### 重要な注意点

**ローカル関数を作成せず、共通ヘルパーを使用してください。**

共通ヘルパーは以下のメリットがあります:
- 新しいstore API（`specStore.getAutoExecutionRuntime`）を使用
- 重複コードの削減
- メンテナンス性の向上
- API変更時の一括更新が可能

テスト固有のヘルパー関数（例: `readSpecJson`、`resetFixture`）はテストファイル内に定義しても問題ありません。

---

## MCP/デバッグ用Zustandストアアクセス

### `window.__STORES__` グローバルオブジェクト

Zustandストアは `window.__STORES__` 経由でグローバルに公開されており、MCP（Electron MCP Server）やDevToolsからアクセス可能。

**重要**: MCP の `eval` コマンドはCSPにより失敗することが多い。`__STORES__` 経由のアクセスを優先して試すこと。

### 利用可能なストア

| ストア名 | 主要なステート |
|----------|---------------|
| `project` | `projectPath`, `kiroValidation` |
| `spec` | `specs`, `selectedSpecId`, `selectedSpec` |
| `bug` | `bugs`, `selectedBugId` |
| `agent` | `agents`, `logs` |
| `workflow` | `autoExecutionPermissions`, `commandPrefix` |
| `editor` | `openFiles`, `activeFile` |
| `notification` | `notifications` |
| `connection` | `connectionStatus`, `connectionInfo` |
| `remoteAccess` | `isServerRunning`, `serverUrl` |
| `versionStatus` | `installedVersion`, `hasUpdate` |

### MCP経由でのアクセス例

```javascript
// ステート取得（推奨 - evalより先に試す）
command: "eval"
args: { "code": "window.__STORES__.spec.getState()" }

// 特定フィールドの取得
command: "eval"
args: { "code": "window.__STORES__.spec.getState().selectedSpecId" }

// ステート更新
command: "eval"
args: { "code": "window.__STORES__.spec.setState({ selectedSpecId: 'feature-auth' })" }

// 複数ストアの状態を一括確認
command: "eval"
args: { "code": "({ project: window.__STORES__.project.getState().projectPath, spec: window.__STORES__.spec.getState().selectedSpecId })" }
```

### WebdriverIO E2Eテストでのアクセス例

```typescript
// browser.execute経由でストアにアクセス
const specState = await browser.execute(() => {
  return window.__STORES__.spec.getState();
});

// 特定のフィールドを取得
const selectedSpecId = await browser.execute(() => {
  return window.__STORES__.spec.getState().selectedSpecId;
});

// ストアを更新
await browser.execute((specId) => {
  window.__STORES__.spec.setState({ selectedSpecId: specId });
}, 'feature-auth');
```

### evalが失敗する場合の対処

1. **まず`__STORES__`を試す** - CSPに影響されにくい
2. **`get_page_structure`でUI状態を確認** - DOM経由での確認
3. **`click_by_selector`でUI操作** - 直接的なDOM操作

詳細は `.kiro/steering/operations.md` を参照。

---

## 共通テストパターン

### 要素選択

```typescript
// data-testid属性を使用
const element = await $('[data-testid="spec-list"]');

// 存在確認（真偽値を返す）
const exists = await element.isExisting();

// タイムアウト付きで要素を待機
await element.waitForExist({ timeout: 3000 }).catch(() => false);
```

### Electron APIアクセス

```typescript
// メインプロセスで実行
const result = await browser.electron.execute((electron) => {
  return electron.BrowserWindow.getAllWindows().length > 0;
});

// アプリ状態にアクセス
const isPackaged = await browser.electron.execute((electron) => {
  return electron.app.isPackaged;
});
```

### 条件付きテスト

```typescript
// オプション要素のガードパターン
if (await element.isExisting()) {
  await element.click();
  // ... アサーション
}
```

### プレビュー領域のスクロール

Mermaidダイアグラムなど、表示領域外の要素を検証する場合はスクロールが必要：

```typescript
// 方法1: 特定要素までスクロール
await browser.execute(() => {
  const target = document.querySelector('[data-testid="mermaid-diagram"]');
  if (target) {
    target.scrollIntoView({ behavior: 'instant', block: 'center' });
  }
});

// 方法2: スクロール可能なコンテナを直接操作
await browser.execute(() => {
  const container = document.querySelector('.markdown-body')?.closest('.overflow-auto');
  if (container) {
    container.scrollTop += 500;
  }
});

// 方法3: waitForFunctionでスクロール後の要素表示を待機
await browser.waitUntil(async () => {
  return await browser.execute(() => {
    const el = document.querySelector('[data-testid="mermaid-diagram"]');
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= window.innerHeight;
  });
}, { timeout: 10000, timeoutMsg: 'Element not visible in viewport' });
```

**注意**: `browser.execute()`内ではJSの戻り値が`0`や`false`の場合でも正常動作。戻り値の真偽チェックには注意。

---

## Remote UIテスト（Playwrightとの併用）

Remote UIのテストではPlaywrightを併用してブラウザ側のテストを行います。

### セットアップ

```typescript
import { chromium, Browser, BrowserContext, Page } from 'playwright';

let playwrightBrowser: Browser;
let playwrightContext: BrowserContext;
let remotePage: Page;

async function initPlaywright(): Promise<void> {
  playwrightBrowser = await chromium.launch({ headless: true });
  playwrightContext = await playwrightBrowser.newContext({
    viewport: { width: 1280, height: 800 },  // デスクトップサイズ
  });
  remotePage = await playwrightContext.newPage();
}
```

### デスクトップ/モバイルレイアウトの切り替え

Remote UIはビューポートサイズでレイアウトが変わります：
- **デスクトップ**: width >= 1024px → `DesktopAppContent`
- **タブレット**: 768px <= width < 1024px
- **モバイル**: width < 768px → `MobileAppContent`

```typescript
// モバイルレイアウトでテストする場合
playwrightContext = await playwrightBrowser.newContext({
  viewport: { width: 375, height: 667 },  // iPhone SE サイズ
});
```

### test-idの違い（デスクトップ vs モバイル）

| 機能 | デスクトップ | モバイル |
|-----|------------|---------|
| Spec詳細表示 | `remote-artifact-editor` | `remote-spec-detail` |
| Specリスト | `remote-spec-list` | `remote-spec-list` |
| Specアイテム | `remote-spec-item-{name}` | `remote-spec-item-{name}` |

**両対応のセレクタ**:
```typescript
// デスクトップとモバイル両方に対応
await remotePage.waitForSelector(
  '[data-testid="remote-artifact-editor"], [data-testid="remote-spec-detail"]',
  { timeout: 10000 }
);
```

### Remote UIでのスクロール

```typescript
// Playwrightでのスクロール
await remotePage.evaluate(() => {
  const container = document.querySelector('.markdown-body')?.closest('[class*="overflow"]');
  if (container) {
    container.scrollTop += 500;
  }
});

// 要素が表示されるまでスクロール
await remotePage.locator('[data-testid="mermaid-diagram"]').scrollIntoViewIfNeeded();
```

---

## セキュリティアサーション

すべてのテストファイルにセキュリティ検証を含む:

```typescript
// 必須: contextIsolationが有効
expect(contextIsolation).toBe(true);

// 必須: nodeIntegrationが無効
expect(nodeIntegration).toBe(false);
```

---

## 安定性アサーション

すべてのテストファイルに安定性チェックを含む:

```typescript
// クラッシュなし
expect(!windows[0].webContents.isCrashed()).toBe(true);

// リサイズ可能
expect(windows[0].isResizable()).toBe(true);
```

---

## アンチパターン: Zustandストア経由のSpec選択

### 問題

`selectSpecViaStore()` を使用してE2Eテスト内でSpecを選択すると、`specDetail` が `null` のまま完了し、`workflow-view` が描画されない問題がある。

**根本原因**: `browser.executeAsync` 内で `specStore.selectSpec(spec)` を呼び出すと、内部のtRPC IPCコールが正常に完了しない。`selectSpec` は成功を返すが、`specDetail` は `null`、`isDetailLoading` は `false`、`error` は `null` のままになる。

### 診断結果

```json
{"error":null,"isDetailLoading":false,"specDetail":null,"success":true}
```

### 推奨パターン

```typescript
// ❌ アンチパターン: ストア直接操作
import { selectSpecViaStore } from './helpers/auto-execution.helpers';
await selectSpecViaStore(SPEC_NAME);  // specDetail が null のまま

// ✅ 推奨: UIクリックによるSpec選択
import { selectSpecViaUI } from './helpers/auto-execution.helpers';
await selectSpecViaUI(SPEC_NAME);  // React の正常なレンダリングパイプラインで処理
```

### なぜUIクリックが安定するか

UIクリックは `SpecListItem` の `onClick` → `selectSpec()` を通常のReactコンポーネントライフサイクル内で実行する。tRPCレスポンスはReactの正常なレンダリングパイプラインで処理されるため、`specDetail` が正しく設定される。

一方、`browser.executeAsync` 内での `selectSpec()` はRendererプロセス内の非同期IPC処理が正常に完了しないため、レスポンスが失われる。

### 適用範囲

**ストア直接操作がアンチパターンになるケース**:
- `selectSpec()` - tRPC IPCを内部で使用する非同期操作
- `selectProject()` - 同様にIPC経由の非同期操作（`selectProjectViaStore` は deprecated）

**ストア直接操作が安全なケース**:
- `getState()` による状態読み取り（同期操作）
- `setState()` による直接的な状態設定（IPC不要）
- `clearAgentStore()` など純粋なローカル状態操作

---

## 既知の制限事項

1. **メニュー操作**: MCP electronツールではネイティブメニューを直接操作できない
2. **プロジェクトコンテキスト**: 一部のテストは実際のプロジェクト選択が必要（「インフラテスト」としてマーク）
3. **エージェント実行**: 完全なエージェントワークフローテストはインフラ確認のみ（実際の実行なし）
4. **ビルド必須**: テスト実行前に `npm run build`（開発版）または `task electron:build`（パッケージ版）が必要

---

## テストデータセレクタリファレンス

### コアUIコンポーネント

| コンポーネント | data-testid |
|--------------|-------------|
| Specリスト | `spec-list`, `spec-list-items`, `spec-item-{name}` |
| Bugリスト | `bug-list`, `bug-list-items` |
| タブ | `tab-specs`, `tab-bugs`, `docs-tabs` |
| パネル | `tabpanel-specs`, `tabpanel-bugs` |
| 作成ボタン | `create-button` |
| ダイアログ | `create-spec-dialog`, `create-bug-dialog` |

### ワークフローコンポーネント

| コンポーネント | data-testid |
|--------------|-------------|
| ワークフロービュー | `workflow-view` |
| フェーズパネル | `phase-execution-panel` |
| フェーズアイテム | `phase-item-{phase}` (例: `phase-item-requirements`) |
| フェーズボタン | `phase-button-{phase}` (例: `phase-button-requirements`) |
| 承認して実行ボタン | `phase-button-approve-and-execute-{phase}` |
| 自動実行 | `auto-execute-button` |
| フェーズコネクタ | `phase-connector` |
| 進捗アイコン | `progress-icon-executing`, `-generated`, `-approved`, `-pending` |
| エージェントパネル | `agent-list-panel`, `agent-log-panel`, `agent-input-panel` |
| エージェント実行インジケータ | `running-indicator` |
| エージェントアイテム | `agent-item-{id}` |

### レビューコンポーネント

| コンポーネント | data-testid |
|--------------|-------------|
| レビューパネル | `document-review-panel` |
| レビューボタン | `review-start-button`, `-skip-button`, `-approve-button` |
| 履歴 | `review-history-button`, `review-history-view` |
| ステータス | `review-status-badge`, `review-round-counter` |

### SSH接続コンポーネント

| コンポーネント | data-testid |
|--------------|-------------|
| SSH接続ダイアログ | `ssh-connect-dialog`, `ssh-connect-dialog-backdrop` |
| URI入力 | `ssh-uri-input` |
| エラー表示 | `ssh-uri-error` |
| ボタン | `ssh-connect-submit-button`, `ssh-connect-cancel-button`, `ssh-connect-close-button` |
| 認証ダイアログ | `ssh-auth-password-dialog`, `ssh-auth-hostkey-dialog`, `ssh-auth-dialog-backdrop` |
| 認証入力 | `ssh-auth-input` |
| 認証ボタン | `ssh-auth-submit-button`, `ssh-auth-cancel-button`, `ssh-auth-accept-button`, `ssh-auth-close-button` |
| ホストキー情報 | `ssh-auth-fingerprint`, `ssh-auth-message` |

### レイアウトコンポーネント

| コンポーネント | data-testid |
|--------------|-------------|
| リサイズハンドル | `resize-handle-horizontal`, `resize-handle-vertical` |

### インストールダイアログコンポーネント

| コンポーネント | data-testid |
|--------------|-------------|
| CLIインストールダイアログ | `cli-install-dialog`, `cli-install-dialog-backdrop` |
| CLIインストールオプション | `cli-install-location-user`, `cli-install-location-system` |
| CLIインストールボタン | `cli-install-submit-button`, `cli-install-close-button` |
| CLIインストール結果 | `cli-install-result` |
| CLAUDE.mdインストールダイアログ | `claudemd-install-dialog`, `claudemd-install-dialog-backdrop` |
| CLAUDE.mdインストールボタン | `claudemd-install-overwrite-button`, `claudemd-install-merge-button`, `claudemd-install-cancel-button` |
| CLAUDE.md新規インストール | `claudemd-install-submit-button`, `claudemd-install-new-cancel-button`, `claudemd-install-close-button` |
| CLAUDE.mdエラー | `claudemd-install-error` |

### Git差分コンポーネント

| コンポーネント | data-testid |
|--------------|-------------|
| GitView全体 | `git-view` |
| ファイルツリー | `git-file-tree` |
| Diffビューア | `git-diff-viewer` |
| 表示モード切替 | `view-mode-artifacts`, `view-mode-git-diff` |
| Diffモード切替 | `diff-mode-toggle` |

---

## カバレッジ評価

### 現状の統計

| 指標 | 数値 |
|-----|-----|
| WebdriverIO E2Eテストファイル | 58 |
| Playwright Web E2Eテストファイル | 16 |
| ユニットテストファイル（main/services） | 90+ |

### 総合評価

**現状の課題**: 多くのテストがAPI直接呼び出しやコンポーネント存在確認に留まっており、ユーザー操作ベースのE2Eテストとして不十分。

### 改善が必要な領域

| 領域 | 問題点 | 優先度 |
|-----|--------|-------|
| **API直接呼び出しの排除** | `window.electronAPI` / `window.__TRPC__` を使ったテストはintegration testに移行 | 高 |
| **UI操作ベースへの移行** | コンポーネント存在確認だけでなく、ユーザーフローを通しで検証 | 高 |
| エラーケース | エラー発生時のUI動作テストが少ない | 中 |
| 複数フェーズ連続実行 | requirements→design→tasks の連続実行テスト | 中 |

### 既にカバーされているE2Eテスト

- ✅ セキュリティ設定（contextIsolation, nodeIntegration）
- ✅ アプリケーション安定性（クラッシュ検知）
- ✅ ワークフロー統合テスト（Mock Claude使用、UI操作ベース）
- ✅ Git差分表示（UI操作ベース）
- ✅ マルチウィンドウ機能

### integration testに移行すべきテスト

以下はE2Eテストとして不適切であり、vitestによるintegration testに移行すべき:

- API存在確認（`typeof window.electronAPI.xxx === 'function'`）
- API直接呼び出しによるデータ取得/更新
- IPC通信チャネルの確認

### 結論

Mock Claude CLIの導入により、**実際のClaude APIを呼び出さずにワークフローのUI動作検証**が可能。
テストの品質向上には、API直接呼び出しからUI操作ベースへの移行が最優先課題。

---

_更新日: 2026-02-11_
