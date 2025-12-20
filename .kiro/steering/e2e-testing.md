# E2Eテスト標準

E2Eテスト（WebdriverIO + wdio-electron-service）のアーキテクチャと詳細な内容。

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
WebdriverIO -> Chromedriver -> Electron App (ビルド済みバイナリ)
                                    |
                         Browser Window (Renderer)
```

---

## テスト設定

### wdio.conf.ts

```typescript
// 主要な設定ポイント
capabilities: [{
  browserName: 'electron',
  'wdio:electronServiceOptions': {
    appBinaryPath: './release/mac-arm64/SDD Orchestrator.app/.../SDD Orchestrator',
    appArgs: ['--e2e-test'],
  },
}],
services: ['electron'],
framework: 'mocha',
specs: ['./e2e-wdio/**/*.spec.ts'],
```

### 実行コマンド

```bash
task electron:test:e2e   # 事前に `task electron:build` が必要
```

---

## テストファイル一覧

配置場所: `electron-sdd-manager/e2e-wdio/`

| ファイル | 目的 | テスト数 |
|---------|------|---------|
| `app-launch.spec.ts` | 基本的なアプリ起動とセキュリティ | 8 |
| `spec-workflow.e2e.spec.ts` | Spec選択とワークフローUI | 42 |
| `bug-workflow.e2e.spec.ts` | バグ作成とワークフロー | 38 |
| `auto-execution.spec.ts` | 自動実行機能 | 14 |
| `experimental-tools-installer.spec.ts` | メニューとツールインストール | 26 |
| `document-review.e2e.spec.ts` | ドキュメントレビューワークフロー | 32 |
| `ssh-workflow.e2e.spec.ts` | SSH接続フロー | 18 |
| `layout-persistence.e2e.spec.ts` | レイアウト永続化 | 14 |
| `install-dialogs.e2e.spec.ts` | CLI/CLAUDE.mdインストールダイアログ | 18 |

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

### Browser APIアクセス（Renderer）

```typescript
// Rendererプロセスで実行
const hasAPI = await browser.execute(() => {
  return typeof window.electronAPI !== 'undefined';
});
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

## 既知の制限事項

1. **メニュー操作**: MCP electronツールではネイティブメニューを直接操作できない
2. **プロジェクトコンテキスト**: 一部のテストは実際のプロジェクト選択が必要（「インフラテスト」としてマーク）
3. **エージェント実行**: 完全なエージェントワークフローテストはインフラ確認のみ（実際の実行なし）
4. **ビルド済みバイナリ必須**: テストはパッケージ済みアプリで実行（事前に`task electron:build`が必要）

---

## テストデータセレクタリファレンス

### コアUIコンポーネント

| コンポーネント | data-testid |
|--------------|-------------|
| Specリスト | `spec-list`, `spec-list-items` |
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
| フェーズボタン | `phase-button-requirements`, `-design`, `-tasks`, `-impl` |
| 自動実行 | `auto-execution-button` |
| エージェントパネル | `agent-list-panel`, `agent-log-panel`, `agent-input-panel` |

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

---

## カバレッジ評価

### 現状の統計

| 指標 | 数値 |
|-----|-----|
| E2Eテストファイル | 9 |
| E2Eテストケース | 約210 |
| ユニットテストファイル | 114 |
| コンポーネント数 | 44 |
| data-testid付きコンポーネント | 44 |

### 総合評価

**現状: 「スモークテストレベル - 基盤は整っているが実動作テストが不足」**

```
UIコンポーネント存在確認: ████████░░ 80%
セキュリティ/安定性:     ██████████ 100%
実ワークフロー動作:      ██░░░░░░░░ 20%
エラーハンドリング:      ███░░░░░░░ 30%
```

### 十分にカバーされている領域

- ✅ 基本動作・セキュリティ設定
- ✅ UIコンポーネント存在確認
- ✅ メニュー構成
- ✅ IPC API存在確認
- ✅ セキュリティ検証（contextIsolation, nodeIntegration）
- ✅ アプリケーション安定性（クラッシュ検知）
- ✅ SSH接続ダイアログ（SSHConnectDialog, SSHAuthDialog）
- ✅ レイアウト永続化（ResizeHandle, レイアウト保存/復元）
- ✅ インストールダイアログ（CliInstallDialog, ClaudeMdInstallDialog）

### 改善が必要な領域

| 領域 | 問題点 | 優先度 |
|-----|--------|-------|
| 実ワークフロー実行 | フェーズ実行、Agent起動が「インフラ確認」のみ | 高 |
| プロジェクト選択後の動作 | 多くのテストがプロジェクト未選択状態 | 高 |
| エラーケース | エラー発生時のUI動作テストが少ない | 中 |

### 推奨改善アクション

1. **高優先度**
   - プロジェクトを開いた状態でのワークフロー実行テスト追加
   - Spec/Bug作成→保存→表示の一連フローテスト
   - フェーズボタンクリック→Agent起動→完了の動作確認

2. **中優先度**
   - エラー発生時のUI表示・リカバリーテスト

### 結論

現在のE2Eテストは**リリース前の最低限の品質保証（スモークテスト）**としては機能するが、
**本番品質保証**や**リグレッション防止**には実ワークフローのテスト追加が必要。

特に以下のシナリオがテストされていない:
- 実際のプロジェクトを開いてSpecを作成・編集する一連の流れ
- Agentを起動して成果物を生成するワークフロー
- エラー発生時のユーザーへのフィードバック

---

_更新日: 2025-12-20_
