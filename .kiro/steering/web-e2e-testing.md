# Web E2E Testing Guide

Remote UIのPlaywright E2Eテスト実行ガイド。

**関連**: `.kiro/steering/e2e-testing.md`（WebdriverIO E2Eテスト）

---

## 概要

Web E2Eテストは、Remote UIをブラウザ経由でテストするためのPlaywright Standalone構成。
既存のWebdriverIO E2Eテスト（Electronアプリ全体のテスト）と並行して、Remote UI専用のテストレイヤーを提供する。

### テスト対象

| テスト種別 | フレームワーク | 対象 |
|-----------|--------------|------|
| Web E2E | Playwright | Remote UI（ブラウザ経由） |
| Electron E2E | WebdriverIO | Electronアプリ全体 |

---

## セットアップ

### 前提条件

1. Node.js 20+
2. Playwrightブラウザ（初回のみインストール）

```bash
cd electron-sdd-manager
npx playwright install chromium
```

### ビルド

テスト実行前にアプリをビルドする必要がある:

```bash
npm run build
```

### プロジェクト選択

Web E2Eテストは、Electronアプリがバックグラウンドで起動した状態でブラウザからRemote UIにアクセスする。プロジェクト選択は以下のいずれかの方法で行う：

1. **UI経由**: Electronアプリ起動後、ProjectSelectionViewから選択（推奨）
2. **テストコード**: `global-setup.ts`でZustandストア経由でプロジェクトを選択

```typescript
// global-setup.ts での例
const stores = (window as any).__STORES__;
await stores.projectStore.getState().selectProject('/path/to/project');
```

**理由**: メニューバーやダイアログ経由のプロジェクト選択は不安定なため、Zustandストア経由でのプログラマティック選択を推奨。

---

## テスト実行コマンド

```bash
# 基本実行（headless）
npm run test:web-e2e

# ブラウザ表示で実行（デバッグ用）
npm run test:web-e2e:headed

# Playwright UIモードで実行（対話的デバッグ）
npm run test:web-e2e:ui
```

### オプション

```bash
# 特定テストファイルのみ実行
npx playwright test smoke.spec.ts

# 特定テスト名でフィルタ
npx playwright test -g "should access Remote UI"

# デバッグモード
npx playwright test --debug
```

---

## テストシナリオ記述パターン

### 基本パターン

```typescript
import { test, expect } from '@playwright/test';
import { waitForConnection, waitForSpecList } from './helpers/remote-ui.helpers';

test.describe('Feature Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForConnection(page);
  });

  test('should display spec list', async ({ page }) => {
    await waitForSpecList(page);
    const specItems = page.locator('[data-testid^="remote-spec-item-"]');
    await expect(specItems.first()).toBeVisible();
  });
});
```

### ヘルパー関数の活用

| ヘルパー | 用途 |
|---------|------|
| `waitForConnection(page)` | WebSocket接続確立を待機 |
| `waitForSpecList(page)` | Spec一覧表示を待機 |
| `selectSpec(page, name)` | 特定Specを選択 |
| `switchToTab(page, 'bugs')` | タブ切り替え |

### セレクタパターン

Remote UIでは `data-testid` 属性を使用:

```typescript
// Spec一覧
page.locator('[data-testid="remote-spec-list"]')
page.locator('[data-testid^="remote-spec-item-"]')

// タブ
page.locator('[data-testid="remote-tab-specs"]')
page.locator('[data-testid="remote-tab-bugs"]')

// 状態表示
page.locator('[data-testid="remote-status-text"]')
```

---

## Mock Claude活用方法

### 概要

Web E2Eテストでは、実際のClaude APIを呼び出さずに `mock-claude.sh` を使用してワークフローをテストできる。

### 仕組み

1. `global-setup.ts` が Electron起動時に `E2E_MOCK_CLAUDE_COMMAND` 環境変数を設定
2. Electronアプリはこの環境変数を検出し、Mock Claude CLIを使用
3. Mock Claudeはフェーズに応じたMarkdownファイルを生成し、spec.jsonを更新

### ワークフローテスト例

```typescript
test('should execute requirements phase with Mock Claude', async ({ page }) => {
  // Select a spec
  await selectSpec(page, 'test-feature');

  // Click requirements phase button
  await page.click('[data-testid="remote-spec-next-action"]');

  // Wait for phase completion (Mock Claude generates files)
  await waitForPhaseGenerated(page, 'requirements');

  // Verify UI reflects the generated state
  const phaseTag = page.locator('[data-testid="remote-spec-phase-tag"]');
  await expect(phaseTag).toContainText('requirements-generated');
});
```

### Mock Claudeが生成するファイル

| フェーズ | 生成ファイル |
|---------|-------------|
| requirements | `requirements.md` |
| design | `design.md` |
| tasks | `tasks.md` |

---

## 既存E2E（WebdriverIO）との使い分け

### 使い分けの原則

| 観点 | Web E2E (Playwright) | Electron E2E (WebdriverIO) |
|------|---------------------|---------------------------|
| **対象** | Remote UI（Web版） | Electronアプリ全体 |
| **テスト観点** | ブラウザからのアクセス | デスクトップUI操作 |
| **起動方式** | global-setup経由 | wdio-electron-service |
| **実行速度** | 軽量・高速 | フル機能テスト |

### いつWeb E2Eを使うか

- Remote UI固有の機能をテストする場合
- WebSocket接続・再接続のテスト
- モバイルUI表示のテスト
- CI/CDでの軽量テストが必要な場合

### いつElectron E2Eを使うか

- Electronメニュー操作のテスト
- IPC通信のテスト
- ネイティブダイアログのテスト
- Electron固有のセキュリティ設定確認

---

## トラブルシューティング

### Electronが起動しない

```
Error: Failed to start Electron
```

**解決策**:
1. アプリがビルドされているか確認: `npm run build`
2. 別のElectronプロセスが起動していないか確認: `pkill -f electron`
3. ポート8765が使用されていないか確認: `lsof -i :8765`

### Remote UIに接続できない

```
Error: Remote UI did not become ready
```

**解決策**:
1. Electronのログを確認: `tail -f logs/main.log`
2. タイムアウトを延長（`global-setup.ts` の `timeout` 値）
3. 手動でElectronを起動してRemote UIが動作するか確認

### テストがタイムアウトする

**解決策**:
1. ヘッドありモードで確認: `npm run test:web-e2e:headed`
2. Playwright UIモードでステップ実行: `npm run test:web-e2e:ui`
3. スクリーンショットを確認: `test-results/` ディレクトリ

### プロセスが残る

テスト失敗後にElectronプロセスが残る場合:

```bash
# Playwrightテスト用プロセスをクリーンアップ
pkill -f '\-\-playwright-test'

# E2Eテスト用プロセスをクリーンアップ
pkill -f '\-\-e2e-test'
```

### spec詳細が表示されない / undefinedエラー

```
Cannot read properties of undefined (reading 'name')
```

**原因**: `SpecDetailProvider`がWebSocketハンドラに設定されていない。

**解決策**:
1. `remoteAccessHandlers.ts`で`setupSpecDetailProvider(projectPath)`が呼ばれているか確認
2. `handlers.ts`のproject setup箇所で呼び出しを追加

```typescript
// handlers.ts
import { setupSpecDetailProvider } from './remoteAccessHandlers';

// プロジェクト設定時に呼び出す
setupSpecDetailProvider(projectPath);
```

### Strict Mode Violation（複数要素にマッチ）

```
locator resolved to 2 elements
```

**原因**: Desktop LayoutとMobile Layoutの両方に同じ`data-testid`を持つ要素が存在。

**解決策**: 親要素でスコープを絞る

```typescript
// ❌ 悪い例: 全体から検索
const bugsTab = page.locator('[data-testid="remote-tab-bugs"]');

// ✅ 良い例: Mobile専用の親要素でスコープ
const bottomTabBar = page.locator('[data-testid="mobile-bottom-tabs"]');
const bugsTab = bottomTabBar.locator('[data-testid="remote-tab-bugs"]');
```

---

## モバイルテストのパターン

### ビューポート設定

```typescript
const SMARTPHONE_VIEWPORT = { width: 375, height: 667 };

test.describe('Smartphone Tests', () => {
  test.use({ viewport: SMARTPHONE_VIEWPORT });
  // ...
});
```

### Mobile Layout固有のセレクタ

| 要素 | data-testid | 備考 |
|------|-------------|------|
| 底部タブバー | `mobile-bottom-tabs` | モバイルのみ表示 |
| Specタブ（底部） | `remote-tab-specs` | スコープで絞る |
| Bugsタブ（底部） | `remote-tab-bugs` | スコープで絞る |
| Spec詳細ビュー | `remote-spec-detail` | 共通 |

### 動作仕様の注意点

- **タブ切り替え時の選択状態**: Remote UIはタブ切り替え時にSpec選択状態を**保持する**
- Spec一覧に戻るには「Spec一覧に戻る」ボタンをクリックする必要がある

```typescript
// タブ切り替え後も詳細ビューが残る
await bugsTab.click();
await specsTab.click();
await expect(detailView).toBeVisible(); // 選択状態は保持される
```

---

## ディレクトリ構造

```
electron-sdd-manager/
├── playwright.config.ts          # Playwright設定
├── e2e-playwright/               # Playwrightテスト
│   ├── global-setup.ts           # Electron起動
│   ├── global-teardown.ts        # Electron停止
│   ├── helpers/                  # ヘルパー関数
│   │   ├── electron-launcher.ts  # Electron起動ヘルパー
│   │   └── remote-ui.helpers.ts  # Remote UI操作ヘルパー
│   ├── smoke.spec.ts             # Smoke Test（基本接続確認）
│   └── smartphone-spec.spec.ts   # スマートフォンUI Specテスト
├── e2e-wdio/                     # 既存WebdriverIOテスト
│   └── fixtures/                 # 共有テストフィクスチャ
├── playwright-report/            # テストレポート出力
└── test-results/                 # テスト結果（スクリーンショット等）
```

---

_updated_at: 2026-01-18_
