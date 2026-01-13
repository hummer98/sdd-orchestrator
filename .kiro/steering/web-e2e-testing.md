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
│   └── smoke.spec.ts             # Smoke Test
├── e2e-wdio/                     # 既存WebdriverIOテスト
│   └── fixtures/                 # 共有テストフィクスチャ
├── playwright-report/            # テストレポート出力
└── test-results/                 # テスト結果（スクリーンショット等）
```

---

_updated_at: 2026-01-13_
